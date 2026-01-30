import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
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

  const loadConversations = (): Conversation[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
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

  useEffect(() => {
    const init = async () => {
      // Try Supabase first
      try {
        const { data, error } = await supabase
          .from('chat_registros')
          .select('*')
          .eq('user_id', user?.id ?? null)
          .order('updated_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapRow = (row: any): Conversation => {
            const id = row.id ?? crypto.randomUUID();
            const title = row.title ?? row.titulo ?? 'Conversa';
            const lastUpdated = Number(new Date(row.updated_at ?? row.last_updated ?? Date.now()).getTime());
            const msgsRaw = row.messages ?? row.mensagens ?? [];
            const messages: Msg[] = Array.isArray(msgsRaw)
              ? msgsRaw.map((m: any) => ({
                  id: m.id ?? crypto.randomUUID(),
                  role: m.role === 'assistant' ? 'assistant' : 'user',
                  text: String(m.text ?? m.conteudo ?? ''),
                  time: Number(m.time ?? m.hora ?? Date.now()),
                }))
              : [];
            return { id, title, lastUpdated, messages };
          };
          const convs = (data as any[]).map(mapRow);
          setConversations(convs);
          setCurrentConversationId(convs[0].id);
          setMessages(convs[0].messages || []);
          saveConversations(convs);
          return;
        }
      } catch (e) {
        console.warn('Falha ao carregar do Supabase, usando localStorage.', e);
      }

      // Fallback to local storage
      const list = loadConversations();
      if (list.length === 0) {
        const firstId = crypto.randomUUID();
        const first: Conversation = { id: firstId, title: 'Conversa', lastUpdated: Date.now(), messages: [] };
        setConversations([first]);
        setCurrentConversationId(firstId);
        setMessages([]);
        saveConversations([first]);
      } else {
        const sorted = [...list].sort((a, b) => b.lastUpdated - a.lastUpdated);
        setConversations(sorted);
        setCurrentConversationId(sorted[0].id);
        setMessages(sorted[0].messages || []);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Read-only refresh from Supabase
  const refreshFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_registros')
        .select('*')
        .eq('user_id', user?.id ?? null)
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapRow = (row: any): Conversation => {
          const id = row.id ?? crypto.randomUUID();
          const title = row.title ?? row.titulo ?? 'Conversa';
          const lastUpdated = Number(new Date(row.updated_at ?? row.last_updated ?? Date.now()).getTime());
          const msgsRaw = row.messages ?? row.mensagens ?? [];
          const messages: Msg[] = Array.isArray(msgsRaw)
            ? msgsRaw.map((m: any) => ({
                id: m.id ?? crypto.randomUUID(),
                role: m.role === 'assistant' ? 'assistant' : 'user',
                text: String(m.text ?? m.conteudo ?? ''),
                time: Number(m.time ?? m.hora ?? Date.now()),
              }))
            : [];
          return { id, title, lastUpdated, messages };
        };
        const convs = (data as any[]).map(mapRow);
        setConversations(convs);
        setCurrentConversationId(convs[0]?.id ?? null);
        setMessages(convs[0]?.messages || []);
        saveConversations(convs);
      }
    } catch (e) {
      console.warn('Falha ao consultar o Supabase.', e);
    }
  };

  const createNewConversation = () => {
    const id = crypto.randomUUID();
    const title = `Conversa ${conversations.length + 1}`;
    const conv: Conversation = { id, title, lastUpdated: Date.now(), messages: [] };
    const list = [conv, ...conversations];
    setConversations(list);
    setCurrentConversationId(id);
    setMessages([]);
    saveConversations(list);
    // Persistir no Supabase (melhor-esforço)
    try {
      supabase
        .from('chat_registros')
        .upsert({
          id,
          user_id: user?.id ?? null,
          title,
          messages: [],
          updated_at: new Date().toISOString(),
        });
    } catch {}
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
        const newId = crypto.randomUUID();
        const conv: Conversation = { id: newId, title: 'Conversa', lastUpdated: Date.now(), messages: [] };
        saveConversations([conv]);
        setCurrentConversationId(newId);
        setMessages([]);
        return [conv];
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
      supabase.from('chat_registros').delete().eq('id', id).eq('user_id', user?.id ?? null);
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
        supabase
          .from('chat_registros')
          .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user?.id ?? null);
      } catch {}
      return updated;
    });
    setMenuOpenFor(null);
  };

  // Close the menu when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuOpenFor) return;
      const container = document.querySelector(`[data-menu-id="${menuOpenFor}"]`);
      if (!container) {
        setMenuOpenFor(null);
        return;
      }
      const target = e.target as Node | null;
      if (target && !container.contains(target)) {
        setMenuOpenFor(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpenFor]);

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
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text, time: now() };
    setMessages((m) => [...m, userMsg]);
    // Update current conversation with user message
    if (currentConversationId) {
      setConversations((list) => {
        const updated = list.map((c) =>
          c.id === currentConversationId ? { ...c, messages: [...(c.messages || []), userMsg], lastUpdated: Date.now() } : c
        );
        saveConversations(updated);
        // Persistir conversa ativa (melhor-esforço)
        try {
          const active = updated.find((c) => c.id === currentConversationId);
          if (active) {
            supabase
              .from('chat_registros')
              .upsert({
                id: active.id,
                user_id: user?.id ?? null,
                title: active.title,
                messages: active.messages,
                updated_at: new Date().toISOString(),
              });
          }
        } catch {}
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
    if (currentConversationId) {
      setConversations((list) => {
        const updated = list.map((c) =>
          c.id === currentConversationId ? { ...c, messages: [...(c.messages || []), botMsg], lastUpdated: Date.now() } : c
        );
        saveConversations(updated);
        // Persistir conversa ativa (melhor-esforço)
        try {
          const active = updated.find((c) => c.id === currentConversationId);
          if (active) {
            supabase
              .from('chat_registros')
              .upsert({
                id: active.id,
                user_id: user?.id ?? null,
                title: active.title,
                messages: active.messages,
                updated_at: new Date().toISOString(),
              });
          }
        } catch {}
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
        <div className="px-4 py-3 border-b border-border text-sm text-muted-foreground flex items-center justify-between">
          <span>Converse com seu acessor virtual sobre cofrinhos, metas e aportes.</span>
          {!webhookUrl && (
            <span className="ml-2 text-xs text-destructive">(Webhook não configurado: defina VITE_WEBWEBHOOK_URL_N8N no .env.local)</span>
          )}
        </div>
        <div className="flex-1 flex min-h-0">
          {/* Left: conversation history */}
          <div className="w-64 border-r border-border flex-shrink-0 flex flex-col">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">Histórico</span>
              <button
                type="button"
                onClick={createNewConversation}
                className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80"
              >Novo</button>
              <button
                type="button"
                onClick={refreshFromSupabase}
                className="ml-2 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80"
                title="Atualizar do Supabase"
              >Atualizar</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">Nenhuma conversa</div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`relative flex items-center justify-between border-b border-border ${c.id === currentConversationId ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' : 'hover:bg-muted'}`}
                    data-menu-id={c.id}
                  >
                    <button
                      className="flex-1 text-left px-3 py-2 text-sm"
                      onClick={() => selectConversation(c.id)}
                    >
                      <div className="truncate">{c.title}</div>
                      <div className="text-xs opacity-70">{formatTime(c.lastUpdated)}</div>
                    </button>
                    <div className="relative">
                      <button
                        className="p-2 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); setMenuOpenFor(menuOpenFor === c.id ? null : c.id); }}
                        aria-label="Mais opções"
                        title="Opções"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuOpenFor === c.id && (
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-lg z-10 min-w-[220px] py-2">
                          <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); /* TODO: implement share */ setMenuOpenFor(null); }}
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
                          <div className="px-3">
                            <div className="border-t border-border my-2" />
                          </div>
                          <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); /* TODO: implement move to project submenu */ setMenuOpenFor(null); }}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Mover para o projeto
                            <ChevronRight className="w-4 h-4 ml-auto opacity-70" />
                          </button>
                          <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); /* TODO: implement pin chat */ setMenuOpenFor(null); }}
                          >
                            <Pin className="w-4 h-4 mr-2" />
                            Fixar chat
                          </button>
                          <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); /* TODO: implement archive chat */ setMenuOpenFor(null); }}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Arquivar
                          </button>
                          <div className="px-3">
                            <div className="border-t border-border my-2" />
                          </div>
                          <button
                            className="flex items-center w-full text-left px-3 py-2 text-sm hover:bg-muted text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                          >
                            <Trash className="w-4 h-4 mr-2" />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Right: active chat */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
