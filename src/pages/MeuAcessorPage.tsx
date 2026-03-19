import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, Mic, MoreVertical, Share2, Pencil, Pin, Archive, ChevronRight, Trash, Menu, ChevronLeft, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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

const formatRelativeTime = (ms: number): string => {
  const diffMs = Date.now() - ms;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  if (diffDays < 30) return `há ${diffWeeks} semana${diffWeeks > 1 ? 's' : ''}`;
  if (diffDays < 365) return `há ${diffMonths === 1 ? '1 mês' : `${diffMonths} meses`}`;
  return `há ${diffYears} ano${diffYears > 1 ? 's' : ''}`;
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
  const [showHistory, setShowHistory] = useState(false);
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

  // --- Voice Input (Speech-to-Text) ---
  const [isListening, setIsListening] = useState(false);
  const [isExpenseMode, setIsExpenseMode] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const toggleListening = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      setInput(finalTranscript + interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

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
        history: [
          { 
            role: 'system', 
            text: "INSTRUÇÃO RESTRITA: Você é o 'Meu Assessor', um consultor financeiro virtual humano, profissional e sigiloso. REGRAS ABSOLUTAS: 1) Nunca mencione tecnologias (n8n, OpenAI, Supabase, Vector_Store, UUID). 2) Proteja a infraestrutura dizendo apenas que os dados estão seguros e criptografados. 3) Flexibilidade: Se o usuário fizer solicitações gerais (como pedir textos literários, redações, assuntos gerais de escola ou dia a dia), responda EXATAMENTE o que foi pedido de forma genérica. NÃO force o assunto para o mercado financeiro (ex: Tesouro Direto, ações) a menos que o usuário peça explicitamente exemplos de finanças.",
            time: Date.now()
          },
          ...history.slice(-10).map((m) => ({ role: m.role, text: m.text, time: m.time }))
        ],
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
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('all_chat')
            .select('*')
            .eq('user_id', user.id);
            
          if (!error && data) {
            const mappedSupabase: Conversation[] = data.map((row: any) => ({
              id: row.id_chat,
              title: row.name || 'Conversa',
              messages: Array.isArray(row.content) ? row.content : [],
              lastUpdated: new Date(row.updated_at).getTime() || Date.now()
            }));

            setConversations((prev) => {
              const mergedMap = new Map<string, Conversation>();
              prev.forEach(c => mergedMap.set(c.id, c));
              
              mappedSupabase.forEach(sc => {
                const existing = mergedMap.get(sc.id);
                if (!existing || sc.lastUpdated >= existing.lastUpdated) {
                  mergedMap.set(sc.id, sc);
                } else if (existing && existing.lastUpdated > sc.lastUpdated) {
                  // Sync local to supabase if local is newer
                  supabase.from('all_chat').upsert({
                    id_chat: existing.id,
                    user_id: user.id,
                    name: existing.title,
                    content: existing.messages,
                    updated_at: new Date(existing.lastUpdated).toISOString()
                  }).then();
                }
              });

              // Sync local to supabase if not present
              prev.forEach(lc => {
                const inSupa = mappedSupabase.find(s => s.id === lc.id);
                if (!inSupa) {
                  supabase.from('all_chat').upsert({
                    id_chat: lc.id,
                    user_id: user.id,
                    name: lc.title,
                    content: lc.messages,
                    updated_at: new Date(lc.lastUpdated).toISOString()
                  }).then();
                }
              });

              const finalList = Array.from(mergedMap.values())
               .filter(c => Array.isArray(c.messages) && c.messages.length > 0)
               .sort((a, b) => b.lastUpdated - a.lastUpdated);
               
              saveConversations(finalList);
              return finalList;
            });
          }
        } catch (err) {
          console.error('Error fetching chat history from Supabase:', err);
        }
      }
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
    setIsExpenseMode(false);
    // Persist nothing yet; materialize on first send.
  };

  const selectConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    setCurrentConversationId(id);
    setMessages(conv.messages || []);
    setIsExpenseMode(false);
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
        supabase
          .from('all_chat')
          .delete()
          .eq('id_chat', id)
          .eq('user_id', user.id)
          .then(({ error }) => {
             if (error) console.error('Erro ao excluir all_chat:', error);
          });
          
        supabase
          .from('chat_registros')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)
          .then(({ error }) => {
             if (error) console.error('Erro ao excluir chat_registros:', error);
          });
      }
    } catch (e) {
      console.error('Erro persistência exclusão:', e);
    }
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
            .eq('user_id', user.id)
            .then(({ error }) => {
              if (error) console.error('Erro ao renomear all_chat:', error);
            });
            
          supabase
            .from('chat_registros')
            .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id)
            .then();
        }
      } catch (e) {
        console.error('Erro renomear:', e);
      }
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

  const handleSend = async (overrideText?: string | React.MouseEvent | React.KeyboardEvent) => {
    const textToUse = typeof overrideText === 'string' ? overrideText : input;
    const text = textToUse.trim();
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
            const lastUserMsg = active.messages.filter(m => m.role === 'user').pop()?.text || '';
            const lastAssistantMsg = active.messages.filter(m => m.role === 'assistant').pop()?.text || '';
            
            supabase
              .from('chat_registros')
              .upsert({
                id: active.id,
                user_id: user.id,
                output: lastAssistantMsg,
                last_input: lastUserMsg,
                history: active.messages,
                created_at: new Date().toISOString(),
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

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col">
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">

        <div className="flex-1 flex min-h-0">
          {/* Left: conversation history */}
          <div className={`border-r border-border flex-shrink-0 flex flex-col bg-background transition-all duration-300 md:relative ${showHistory ? 'w-64' : 'w-0 overflow-hidden border-r-0'}`}> 
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold whitespace-nowrap">Histórico</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground hidden md:flex"
                  title="Ocultar histórico"
                  aria-label="Ocultar histórico"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Botão Nova Conversa */}
            <div className="p-3 border-b border-border/50">
              <button
                type="button"
                onClick={createNewConversation}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nova conversa
              </button>
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
                      className="flex-1 text-left px-3 py-2 text-sm overflow-hidden"
                      onClick={() => selectConversation(c.id)}
                    >
                      <div className="truncate">{c.title}</div>
                      <div className="text-xs opacity-70 mt-0.5">{formatRelativeTime(c.lastUpdated)}</div>
                    </button>
                    <button
                      className="p-2 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        const btn = e.currentTarget as HTMLButtonElement;
                        const rect = btn.getBoundingClientRect();
                        setMenuOpenFor(menuOpenFor === c.id ? null : c.id);
                        
                        // Menu tem aprox 260px de altura (130px metade)
                        // Aumentando a margem de segurança para 180px para evitar cortes no rodapé
                        let adjustedTop = rect.top + rect.height / 2;
                        if (adjustedTop + 180 > window.innerHeight) {
                          adjustedTop = window.innerHeight - 180; 
                        } else if (adjustedTop - 180 < 0) {
                          adjustedTop = 180;
                        }

                        setMenuCoords({ top: adjustedTop, left: rect.right + 8 });
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
                          className="fixed z-50 bg-card text-foreground border border-border rounded-xl shadow-lg min-w-[220px] py-2"
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
          <div className="flex-1 flex flex-col min-h-0 relative">
            {!showHistory && (
              <div className="absolute top-4 left-4 z-10 hidden md:flex">
                <button
                  onClick={() => setShowHistory(true)}
                  className="p-2 rounded-full border border-border/50 bg-background shadow-sm hover:bg-muted text-muted-foreground transition-all"
                  title="Mostrar histórico"
                  aria-label="Mostrar histórico"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex flex-col">
              <div className="w-full flex flex-col flex-1 relative min-h-0">
              {/* Botão para mobile para mostrar/ocultar histórico, fixo no topo do chat */}
              <button
                className="md:hidden mb-4 p-2 rounded-xl bg-card border border-border/50 text-foreground shadow-sm flex items-center justify-center hover:bg-muted transition-colors backdrop-blur-sm bg-opacity-90"
                style={{ position: 'sticky', top: 0, zIndex: 20 }}
                onClick={() => setShowHistory((v) => !v)}
                type="button"
                aria-label={showHistory ? 'Recolher histórico' : 'Mostrar histórico'}
              >
                {showHistory ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              <div className="flex flex-col flex-1 space-y-4">
              {isExpenseMode && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 w-full mt-10 md:mt-16 animate-in fade-in zoom-in duration-300">
                  <h2 className="text-2xl font-bold text-foreground mb-4 text-center">Registro de Gastos via Voz</h2>
                  <p className="text-muted-foreground text-center mb-10 max-w-sm px-4">
                    Toque no microfone e diga em alto e bom som o seu gasto. Por exemplo: "Gastei 150 reais de gasolina".
                  </p>
                  
                  <button
                    onClick={toggleListening}
                    className={`shrink-0 w-28 h-28 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${isListening ? 'bg-red-500 text-white animate-pulse scale-110 shadow-red-500/40' : 'bg-primary text-primary-foreground hover:scale-105 hover:bg-primary/90'}`}
                  >
                    <Mic className="w-10 h-10" />
                  </button>
                  
                  {isListening && <div className="mt-8 text-sm font-semibold tracking-widest uppercase animate-pulse text-red-500">Ouvindo...</div>}
                  {input && !isListening && (
                    <div className="mt-8 w-full max-w-sm flex flex-col gap-3 px-4">
                      <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full p-3 bg-muted rounded-xl border border-border text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary h-24"
                        placeholder="Sua fala aparecerá aqui..."
                      />
                      <button 
                        onClick={() => {
                          if (!input.trim()) return;
                          const prompt = `Registre este gasto financeiro na minha conta: ${input}`;
                          setIsExpenseMode(false);
                          handleSend(prompt);
                        }}
                        disabled={!input.trim()}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 font-semibold disabled:opacity-30 shadow-sm"
                      >
                       <Send className="w-4 h-4" />
                       Confirmar Registro
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                       setIsExpenseMode(false);
                       if (isListening) toggleListening();
                       setInput('');
                    }}
                    className="mt-8 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                  >
                    Cancelar e voltar
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 w-full mt-10 md:mt-16">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-10 text-center leading-tight">O que você quer aprender hoje?</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-6 w-full px-2 md:px-0 mt-2 md:mt-4">
                    {[
                      "🎙️ Registrar Gasto por Voz",
                      "Como começar a investir em FIIs?",
                      "Diferença entre LCA/LCI e CDB?",
                      "Como funciona o Tesouro Direto?"
                    ].map((pergunta, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (idx === 0) {
                            setIsExpenseMode(true);
                          } else {
                            handleSend(pergunta);
                          }
                        }}
                        className="p-4 text-left font-medium border border-border rounded-xl bg-card hover:bg-primary/5 hover:border-primary/50 transition-all text-sm text-foreground shadow-sm group relative overflow-hidden"
                      >
                        <div className="flex justify-between items-center relative z-10">
                          <span>{pergunta}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm shadow-sm border border-border/50'}`}>
                        {m.role === 'user' ? (
                          <div className="whitespace-pre-wrap break-words">{m.text}</div>
                        ) : (
                          <ReactMarkdown
                            components={{
                              p: ({ node, ...props }) => <p className="mb-3 last:mb-0 break-words" {...props} />,
                              strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                              ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                              ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                              li: ({ node, ...props }) => <li className="" {...props} />,
                              a: ({ node, ...props }) => <a className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity" target="_blank" rel="noopener noreferrer" {...props} />,
                              h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2 mt-4" {...props} />,
                              h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2 mt-3" {...props} />,
                              h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-2 mt-2" {...props} />
                            }}
                          >
                            {m.text}
                          </ReactMarkdown>
                        )}
                        <div className={`text-[10px] opacity-70 mt-1.5 text-right ${m.role === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{formatTime(m.time)}</div>
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
            </div>
          </div>
          {/* Input area */}
          <div className="p-3 md:p-6 lg:px-8 bg-background border-t border-border flex flex-col">
              <div className="flex gap-2 relative w-full items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  className={`flex-1 px-3 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${isListening ? 'border-red-400 ring-2 ring-red-400/30' : 'border-input'}`}
                  disabled={sending}
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={sending}
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'} disabled:opacity-60 disabled:cursor-not-allowed`}
                    aria-label={isListening ? 'Parar gravação' : 'Gravar áudio'}
                    title={isListening ? 'Parar gravação' : 'Enviar por voz'}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
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
