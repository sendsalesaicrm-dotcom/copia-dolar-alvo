import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, MoreVertical, Share2, Pencil, Pin, Archive, ChevronRight, Trash } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type Msg = { id: string; role: 'user' | 'assistant'; text: string; time: number };
type Conversation = { id: string; title: string; lastUpdated: number; messages: Msg[] };

const now = () => Date.now();

const formatTime = (ms: number): string => {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const suggestReply = (input: string): string => {
  const q = input.toLowerCase();
  if (q.includes('cofrinho')) {
    return 'Posso ajudar com seu Cofrinho: criar, excluir, entender o progresso, ou marcar aportes. O que você deseja fazer?';
  }
  if (q.includes('meta') || q.includes('objetivo')) {
    return 'Para metas, posso explicar o progresso, parcelas restantes e prazos. Qual meta você tem em mente?';
  }
  if (q.includes('ajuda') || q.includes('help')) {
    return 'Claro! Você pode me pedir para: criar um cofrinho, calcular aportes, entender parcelas restantes, ou configurar sua conta.';
  }
  return 'Entendi. Poderia me dar um pouco mais de contexto para eu te ajudar melhor?';
};

const MeuAcessorPage: React.FC = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [showHistory, setShowHistory] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // md breakpoint do Tailwind
    }
    return true;
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typingPhraseIndex, setTypingPhraseIndex] = useState(0);
  const [typingDots, setTypingDots] = useState('');
  const phraseIntervalRef = useRef<number | null>(null);
  const dotsIntervalRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Read webhook URL from env. Vite only exposes VITE_* by default.
  const webhookUrl = (import.meta as any).env?.VITE_WEBWEBHOOK_URL_N8N || (import.meta as any).env?.WEBWEBHOOK_URL_N8N;
  const { user, profile } = useAuth();
  const userDisplayName = useMemo(() => {
    const parts = [profile?.first_name, profile?.last_name].filter(Boolean);
    const full = parts.join(' ').trim();
    return full || profile?.email || user?.email || 'Usuário';
  }, [profile?.first_name, profile?.last_name, profile?.email, user?.email]);

  const callWebhook = async (text: string, history: Msg[]): Promise<string> => {
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      // Not configured
      return suggestReply(text);
    }
    try {
      const payload = {
        input: text,
        history: history.slice(-10).map((m) => ({ role: m.role, text: m.text, time: m.time })),
        user: {
          id: user?.id ?? null,
          name: userDisplayName,
        },
      };
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'cors',
      });

      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        // Try to extract a plain text string from various shapes (object/array)
        const extractReply = (d: any): string | undefined => {
          if (!d) return undefined;
          if (typeof d === 'string') return d;
          if (Array.isArray(d)) {
            for (const item of d) {
              const found = extractReply(item);
              if (found) return found;
            }
            return undefined;
          }
          if (typeof d === 'object') {
            const keys = ['output', 'reply', 'message', 'text', 'answer'];
            for (const k of keys) {
              const found = extractReply(d[k]);
              if (found) return found;
            }
            if (d.data) return extractReply(d.data);
          }
          return undefined;
        };

        const clean = (s: string): string => {
          let t = s.trim();
          // If wrapped in quotes (e.g., "..."), unquote safely
          if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
            try { t = JSON.parse(t); } catch { t = t.slice(1, -1); }
          }
          // Unescape common sequences
          t = t.replace(/\\"/g, '"').replace(/\\n/g, '\n');
          return t;
        };

        const candidate = extractReply(data);
        if (typeof candidate === 'string' && candidate.trim()) return clean(candidate);
        // No usable text found
        return 'Sem conteúdo retornado pelo webhook.';
      }
      // If server returned plain text
      const txt = await res.text();
      return (txt || 'Sem conteúdo retornado pelo webhook.').replace(/^\s*"|"\s*$/g, '');
    } catch (err: any) {
      console.error('Webhook error:', err);
      return 'Não consegui falar com o webhook agora. Tente novamente em instantes.';
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  // Storage helpers for conversation history
  const storageKey = useMemo(() => `meu_acessor_conversations_${user?.id || 'anon'}`, [user?.id]);
  const anonStorageKey = 'meu_acessor_conversations_anon';

  const loadConversations = (): Conversation[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [];
      // Filter out empty conversations (no messages)
      return list.filter((c: Conversation) => Array.isArray(c.messages) && c.messages.length > 0);
    } catch {
      return [];
    }
  };

  const saveConversations = (list: Conversation[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch {
      // ignore storage errors
    }
  };

  const loadFromKey = (key: string): Conversation[] => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [];
      return list.filter((c: Conversation) => Array.isArray(c.messages) && c.messages.length > 0);
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      // 1) If user just logged in, migrate anon storage
      if (user?.id) {
        const userList = loadConversations();
        const anonList = loadFromKey(anonStorageKey);
        if (userList.length === 0 && anonList.length > 0) {
          saveConversations(anonList);
          try { localStorage.removeItem(anonStorageKey); } catch {}
        }
      }

      // 2) Local-first: show conversations from current storage
      const localList = loadConversations();
      if (localList.length > 0) {
        const sorted = [...localList].sort((a, b) => b.lastUpdated - a.lastUpdated);
        setConversations(sorted);
        setCurrentConversationId(null); // Não seleciona nenhuma conversa por padrão
        setMessages([]); // Mostra tela de nova conversa
      } else {
        setConversations([]);
        setCurrentConversationId(null);
        setMessages([]);
      }

      // 3) If authenticated, merge Supabase conversations
      // (Removido: leitura de chat_registros)
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, user?.id]);

  // Read-only refresh from Supabase
  // (Removido: refreshFromSupabase)

  const createNewConversation = () => {
    // Do not create a local empty conversation entry.
    // Just clear current selection and prepare for first message.
    setCurrentConversationId(null);
    setMessages([]);
    // Persist nothing yet; materialize on first send.
  };

  const selectConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    setCurrentConversationId(id);
    setMessages(conv.messages || []);
  };

  const deleteConversation = (id: string) => {
    const ok = window.confirm('Excluir esta conversa? Esta ação não pode ser desfeita.');
    if (!ok) return;
    setConversations((list) => {
      const filtered = list.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        // Do not auto-create an empty conversation; leave state empty.
        saveConversations([]);
        setCurrentConversationId(null);
        setMessages([]);
        return [];
      }
      saveConversations(filtered);
      if (id === currentConversationId) {
        const next = filtered[0];
        setCurrentConversationId(next.id);
        setMessages(next.messages || []);
      }
      return filtered;
    });
    setMenuOpenFor(null);
    // Excluir no Supabase (melhor-esforço)
    try {
      if (user?.id) {
        supabase.from('all_chat').delete().eq('id_chat', id).eq('user_id', user.id);
      }
    } catch {}
  };

  const renameConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    const currentTitle = conv?.title || 'Conversa';
    const newTitle = window.prompt('Renomear conversa', currentTitle);
    if (!newTitle || !newTitle.trim()) {
      setMenuOpenFor(null);
      return;
    }
    setConversations((list) => {
      const updated = list.map((c) => (c.id === id ? { ...c, title: newTitle.trim(), lastUpdated: Date.now() } : c));
      saveConversations(updated);
      // Atualizar no Supabase (melhor-esforço)
      try {
        if (user?.id) {
          supabase
            .from('all_chat')
            .update({ name: newTitle.trim(), updated_at: new Date().toISOString() })
            .eq('id_chat', id)
            .eq('user_id', user.id);
        }
      } catch {}
      return updated;
    });
    setMenuOpenFor(null);
  };

  // Close menu on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpenFor(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const typingPhrases = useMemo(() => ['elaborando resposta', 'pensando', 'escrevendo','Refletindo'], []);

  useEffect(() => {
    if (sending) {
      phraseIntervalRef.current = window.setInterval(() => {
        setTypingPhraseIndex((i) => (i + 1) % typingPhrases.length);
      }, 2000);
      dotsIntervalRef.current = window.setInterval(() => {
        setTypingDots((d) => (d.length >= 3 ? '' : d + '.'));
      }, 500);
    } else {
      if (phraseIntervalRef.current) {
        clearInterval(phraseIntervalRef.current);
        phraseIntervalRef.current = null;
      }
      if (dotsIntervalRef.current) {
        clearInterval(dotsIntervalRef.current);
        dotsIntervalRef.current = null;
      }
      setTypingDots('');
      setTypingPhraseIndex(0);
    }
    return () => {
      if (phraseIntervalRef.current) {
        clearInterval(phraseIntervalRef.current);
        phraseIntervalRef.current = null;
      }
      if (dotsIntervalRef.current) {
        clearInterval(dotsIntervalRef.current);
        dotsIntervalRef.current = null;
      }
    };
  }, [sending, typingPhrases.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    // Se não houver conversa ativa, cria uma agora (local), e só persiste no Supabase ao salvar a primeira mensagem
    let activeId = currentConversationId;
    if (!activeId) {
      activeId = crypto.randomUUID();
      // Gera título dinâmico baseado no input do usuário
      let title = input.trim();
      if (title.length > 32) title = title.slice(0, 32) + '...';
      // Se o input for vazio, usa fallback
      if (!title) title = `Conversa ${conversations.length + 1}`;
      const conv: Conversation = { id: activeId, title, lastUpdated: Date.now(), messages: [] };
      const list = [conv, ...conversations];
      setConversations(list);
      setCurrentConversationId(activeId);
      // Do not persist empty conversation yet; will persist after first message is added.
    }
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text, time: now() };
    setMessages((m) => [...m, userMsg]);
    // Update current conversation with user message
    if (activeId) {
      setConversations((list) => {
        const updated = list.map((c) =>
          c.id === activeId ? { ...c, messages: [...(c.messages || []), userMsg], lastUpdated: Date.now() } : c
        );
        saveConversations(updated);
        // Persistir conversa ativa (melhor-esforço) apenas se autenticado
        try {
          const active = updated.find((c) => c.id === activeId);
          if (active && user?.id) {
            supabase
              .from('all_chat')
              .upsert({
                id_chat: active.id,
                user_id: user.id,
                name: active.title,
                content: JSON.parse(JSON.stringify(active.messages)),
                updated_at: new Date().toISOString(),
              })
              .then(({ error }) => { if (error) console.error('Erro all_chat:', error); });
          }
        } catch (e) {
          console.error('Erro persistência:', e);
        }
        return updated;
      });
    }
    setInput('');

    // Prefer webhook, fallback to local suggestion when not configured or failing
    const replyText = await callWebhook(text, [...messages, userMsg]);
    // Small delay to keep UX smooth
    await new Promise((r) => setTimeout(r, 150));
    const botMsg: Msg = { id: crypto.randomUUID(), role: 'assistant', text: replyText, time: now() };
    setMessages((m) => [...m, botMsg]);
    // Update current conversation with assistant message
    if (activeId) {
      setConversations((list) => {
        const updated = list.map((c) =>
          c.id === activeId ? { ...c, messages: [...(c.messages || []), botMsg], lastUpdated: Date.now() } : c
        );
        saveConversations(updated);
        // Persistir conversa ativa (melhor-esforço) apenas se autenticado
        try {
          const active = updated.find((c) => c.id === activeId);
          if (active && user?.id) {
            supabase
              .from('chat_registros')
              .upsert({
                id: active.id,
                user_id: user.id,
                title: active.title,
                messages: active.messages,
                updated_at: new Date().toISOString(),
              })
              .then(({ error }) => { if (error) console.error('Erro chat_registros:', error); });
            // Mirror into all_chat table
            supabase
              .from('all_chat')
              .upsert({
                id_chat: active.id,
                user_id: user.id,
                name: active.title,
                content: JSON.parse(JSON.stringify(active.messages)),
                updated_at: new Date().toISOString(),
              })
              .then(({ error }) => { if (error) console.error('Erro all_chat:', error); });
          }
        } catch (e) {
          console.error('Erro persistência:', e);
        }
        return updated;
      });
    }
    setSending(false);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full h-full">
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-full">

        <div className="flex-1 flex min-h-0">
          {/* Left: conversation history */}
          <div className={`w-64 border-r border-border flex-shrink-0 flex flex-col bg-background transition-all duration-300 md:relative ${showHistory ? '' : 'hidden md:flex'}`}> 
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">Histórico</span>
              <button
                type="button"
                onClick={createNewConversation}
                className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80"
              >Novo</button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {conversations.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">Nenhuma conversa</div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`relative flex items-center justify-between border-b border-border ${c.id === currentConversationId ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' : 'hover:bg-muted'}`}
                  >
                    <button
                      className="flex-1 text-left px-3 py-2 text-sm"
                      onClick={() => selectConversation(c.id)}
                    >
                      <div className="truncate">{c.title}</div>
                      <div className="text-xs opacity-70">{formatTime(c.lastUpdated)}</div>
                    </button>
                    <button
                      className="p-2 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        const btn = e.currentTarget as HTMLButtonElement;
                        const rect = btn.getBoundingClientRect();
                        setMenuOpenFor(menuOpenFor === c.id ? null : c.id);
                        setMenuCoords({ top: rect.top + rect.height / 2, left: rect.right + 8 });
                        setMenuAnchorEl(btn);
                      }}
                      aria-label="Mais opções"
                      title="Opções"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpenFor === c.id && menuCoords && createPortal(
                      <>
                        {/* backdrop to close on outside click */}
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpenFor(null)} />
                        <div
                          className="fixed z-50 bg-card border border-border rounded-xl shadow-lg min-w-[220px] py-2"
                          style={{ top: menuCoords.top, left: menuCoords.left, transform: 'translateY(-50%)' }}
                        >
                          <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); /* TODO: share */ setMenuOpenFor(null); }}
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Compartilhar
                          </button>
                          <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); renameConversation(c.id); }}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Renomear
                          </button>
                          <div className="px-3"><div className="border-t border-border my-2" /></div>
                          <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); /* TODO: move to project */ setMenuOpenFor(null); }}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Mover para o projeto
                            <ChevronRight className="w-4 h-4 ml-auto opacity-70" />
                          </button>
                          <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); /* TODO: pin chat */ setMenuOpenFor(null); }}
                          >
                            <Pin className="w-4 h-4 mr-2" />
                            Fixar chat
                          </button>
                          <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); /* TODO: archive chat */ setMenuOpenFor(null); }}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Arquivar
                          </button>
                          <div className="px-3"><div className="border-t border-border my-2" /></div>
                          <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm hover:bg-muted text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                          >
                            <Trash className="w-4 h-4 mr-2" />
                            Excluir
                          </button>
                        </div>
                      </>,
                      document.body
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Right: active chat */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Botão para mobile para mostrar/ocultar histórico, fixo no topo do chat */}
              <button
                className="md:hidden w-full mb-4 px-3 py-1 rounded bg-muted text-xs font-semibold border border-border"
                style={{ position: 'sticky', top: 0, zIndex: 10 }}
                onClick={() => setShowHistory((v) => !v)}
                type="button"
                aria-label={showHistory ? 'Recolher histórico' : 'Mostrar histórico'}
              >
                {showHistory ? 'Ocultar histórico' : 'Mostrar histórico'}
              </button>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full pt-16">
                  <h2 className="text-2xl font-bold text-foreground mb-4 text-center">O que você quer aprender hoje?</h2>
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}>
                        {m.text}
                        <div className="text-xs opacity-70 mt-1 text-right">{formatTime(m.time)}</div>
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed bg-muted text-foreground rounded-bl-sm italic animate-pulse">
                        {typingPhrases[typingPhraseIndex]} {typingDots}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Digite sua mensagem..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#E35C02' }}
                  aria-label="Enviar"
                >
                  <Send className="w-4 h-4" />
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeuAcessorPage;
