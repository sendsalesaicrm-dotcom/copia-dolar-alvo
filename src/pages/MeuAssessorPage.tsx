import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, Mic, MoreVertical, Share2, Pencil, Pin, Archive, ChevronRight, Trash, Menu, ChevronLeft, Plus, Bot, Sparkles, TrendingUp, BookOpen, Wallet, Mic as MicIcon } from 'lucide-react';
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

const MeuAssessorPage: React.FC = () => {
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
      const todayISO = new Date().toISOString().split('T')[0]; // e.g. "2026-03-27"
      const payload = {
        input: text,
        history: [
          { 
            role: 'system', 
            text: `INSTRUÇÃO RESTRITA: Você é o 'Meu Assessor', um consultor financeiro virtual humano, profissional e sigiloso. REGRAS ABSOLUTAS: 1) Nunca mencione tecnologias (n8n, OpenAI, Supabase, Vector_Store, UUID). 2) Proteja a infraestrutura dizendo apenas que os dados estão seguros e criptografados. 3) Flexibilidade: Se o usuário fizer solicitações gerais (como pedir textos literários, redações, assuntos gerais de escola ou dia a dia), responda EXATAMENTE o que foi pedido de forma genérica. NÃO force o assunto para o mercado financeiro (ex: Tesouro Direto, ações) a menos que o usuário peça explicitamente exemplos de finanças. REGRA DE DATA (CRÍTICA): A data de hoje é ${todayISO}. Sempre que o usuário mencionar uma data específica ao registrar um gasto ou ganho (ex: "no dia 15/01/2026", "semana passada", "em fevereiro", "ontem"), você DEVE usar essa data mencionada no campo expense_date ou income_date ao salvar no banco de dados — NUNCA use a data de hoje se o usuário informou uma data diferente. Se nenhuma data for mencionada, use a data de hoje (${todayISO}).`,
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
          if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
            try { t = JSON.parse(t); } catch { t = t.slice(1, -1); }
          }
          t = t.replace(/\\"/g, '"').replace(/\\n/g, '\n');
          return t;
        };

        const candidate = extractReply(data);
        if (typeof candidate === 'string' && candidate.trim()) return clean(candidate);
        return 'Sem conteúdo retornado pelo webhook.';
      }
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
  const storageKey = useMemo(() => `meu_assessor_conversations_${user?.id || 'anon'}`, [user?.id]);
  const anonStorageKey = 'meu_assessor_conversations_anon';

  const loadConversations = (): Conversation[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [];
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
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('all_chat')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

          if (!error && data) {
            const supabaseList: Conversation[] = data
              .map((row: any) => ({
                id: row.id_chat,
                title: row.name || 'Conversa',
                messages: Array.isArray(row.content) ? row.content : [],
                lastUpdated: new Date(row.updated_at).getTime() || Date.now()
              }))
              .filter((c: Conversation) => Array.isArray(c.messages) && c.messages.length > 0);

            saveConversations(supabaseList);
            setConversations(supabaseList);
            setCurrentConversationId(null);
            setMessages([]);
          } else {
            const localList = loadConversations();
            setConversations(localList);
            setCurrentConversationId(null);
            setMessages([]);
          }
        } catch (err) {
          console.error('Error fetching chat history from Supabase:', err);
          const localList = loadConversations();
          setConversations(localList);
          setCurrentConversationId(null);
          setMessages([]);
        }
      } else {
        const localList = loadConversations();
        setConversations(localList);
        setCurrentConversationId(null);
        setMessages([]);
      }
    };
    init();
  }, [storageKey, user?.id]);

  const createNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setIsExpenseMode(false);
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
      try {
        if (user?.id) {
          supabase
            .from('all_chat')
            .update({ name: newTitle.trim(), updated_at: new Date().toISOString() })
            .eq('id_chat', id)
            .eq('user_id', user.id)
            .then(({ error }) => { if (error) console.error('Erro ao renomear all_chat:', error); });
            
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
    let activeId = currentConversationId;
    if (!activeId) {
      activeId = crypto.randomUUID();
      let title = input.trim();
      if (title.length > 32) title = title.slice(0, 32) + '...';
      if (!title) title = `Conversa ${conversations.length + 1}`;
      const conv: Conversation = { id: activeId, title, lastUpdated: Date.now(), messages: [] };
      const list = [conv, ...conversations];
      setConversations(list);
      setCurrentConversationId(activeId);
    }
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text, time: now() };
    setMessages((m) => [...m, userMsg]);
    if (activeId) {
      setConversations((list) => {
        const updated = list.map((c) =>
          c.id === activeId ? { ...c, messages: [...(c.messages || []), userMsg], lastUpdated: Date.now() } : c
        );
        saveConversations(updated);
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

    const replyText = await callWebhook(text, [...messages, userMsg]);
    await new Promise((r) => setTimeout(r, 150));
    const botMsg: Msg = { id: crypto.randomUUID(), role: 'assistant', text: replyText, time: now() };
    setMessages((m) => [...m, botMsg]);
    if (activeId) {
      setConversations((list) => {
        const updated = list.map((c) =>
          c.id === activeId ? { ...c, messages: [...(c.messages || []), botMsg], lastUpdated: Date.now() } : c
        );
        saveConversations(updated);
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
    <div className="w-full h-full min-h-0 flex flex-col relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/2 via-transparent to-orange-500/2 pointer-events-none" />

      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-xl overflow-hidden flex flex-col flex-1 min-h-0 relative z-10">

        <div className="flex-1 flex min-h-0">
          {/* Left: conversation history */}
          <div className={`border-r border-border flex-shrink-0 flex flex-col bg-background transition-all duration-300 md:relative ${showHistory ? 'w-64' : 'w-0 overflow-hidden border-r-0'}`}>
            <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-r from-sidebar-accent/50 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Histórico</span>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground hidden md:flex transition-colors"
                  title="Ocultar histórico"
                  aria-label="Ocultar histórico"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3 border-b border-border/50">
              <button
                type="button"
                onClick={createNewConversation}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary/80 transition-all duration-200 font-semibold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                Nova conversa
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Nenhuma conversa ainda</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Comece uma nova conversa!</p>
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`group relative flex items-center justify-between rounded-xl transition-all duration-200 ${
                      c.id === currentConversationId
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-md'
                        : 'hover:bg-muted/80'
                    }`}
                  >
                    <button
                      className="flex-1 text-left px-3 py-2.5 text-sm overflow-hidden"
                      onClick={() => selectConversation(c.id)}
                    >
                      <div className="truncate font-medium">{c.title}</div>
                      <div className="text-xs opacity-60 mt-0.5">{formatRelativeTime(c.lastUpdated)}</div>
                    </button>
                    <button
                      className="p-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        const btn = e.currentTarget as HTMLButtonElement;
                        const rect = btn.getBoundingClientRect();
                        setMenuOpenFor(menuOpenFor === c.id ? null : c.id);

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
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpenFor(null)} />
                        <div
                          className="fixed z-50 bg-card text-foreground border border-border/50 rounded-xl shadow-2xl min-w-[240px] py-2 animate-in fade-in zoom-in-95 duration-200"
                          style={{ top: menuCoords.top, left: menuCoords.left, transform: 'translateY(-50%)' }}
                        >
                          <div className="px-3 py-2 border-b border-border/50 mb-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opções</p>
                          </div>
                          <button
                            className="flex items-center w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 transition-colors group"
                            onClick={(e) => { e.stopPropagation(); /* TODO: share */ setMenuOpenFor(null); }}
                          >
                            <Share2 className="w-4 h-4 mr-3 text-muted-foreground group-hover:text-foreground" />
                            <span>Compartilhar</span>
                          </button>
                          <button
                            className="flex items-center w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 transition-colors group"
                            onClick={(e) => { e.stopPropagation(); renameConversation(c.id); }}
                          >
                            <Pencil className="w-4 h-4 mr-3 text-muted-foreground group-hover:text-foreground" />
                            <span>Renomear</span>
                          </button>
                          <div className="my-1 border-t border-border/50" />
                          <button
                            className="flex items-center w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 transition-colors group"
                            onClick={(e) => { e.stopPropagation(); /* TODO: move to project */ setMenuOpenFor(null); }}
                          >
                            <Archive className="w-4 h-4 mr-3 text-muted-foreground group-hover:text-foreground" />
                            <span>Mover para o projeto</span>
                            <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                          </button>
                          <button
                            className="flex items-center w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 transition-colors group"
                            onClick={(e) => { e.stopPropagation(); /* TODO: pin chat */ setMenuOpenFor(null); }}
                          >
                            <Pin className="w-4 h-4 mr-3 text-muted-foreground group-hover:text-foreground" />
                            <span>Fixar chat</span>
                          </button>
                          <button
                            className="flex items-center w-full text-left px-4 py-2.5 text-sm hover:bg-muted/80 transition-colors group"
                            onClick={(e) => { e.stopPropagation(); /* TODO: archive chat */ setMenuOpenFor(null); }}
                          >
                            <Archive className="w-4 h-4 mr-3 text-muted-foreground group-hover:text-foreground" />
                            <span>Arquivar</span>
                          </button>
                          <div className="my-1 border-t border-border/50" />
                          <button
                            className="flex items-center w-full text-left px-4 py-2.5 text-sm hover:bg-destructive/10 transition-colors group text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                          >
                            <Trash className="w-4 h-4 mr-3" />
                            <span>Excluir conversa</span>
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
                  className="p-2.5 rounded-xl border border-border/50 bg-card shadow-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105"
                  title="Mostrar histórico"
                  aria-label="Mostrar histórico"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            )}
            {/* Mobile Header (Fixed) */}
            <div className="md:hidden flex-none p-4 pb-2 z-20">
              <button
                className="w-full p-2.5 rounded-xl bg-card border border-border/50 text-foreground shadow-sm flex items-center justify-center hover:bg-muted/80 transition-all duration-200"
                onClick={() => setShowHistory((v) => !v)}
                type="button"
                aria-label={showHistory ? 'Recolher histórico' : 'Mostrar histórico'}
              >
                {showHistory ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                <span className="ml-2 text-sm font-medium">{showHistory ? 'Voltar' : 'Histórico'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 md:p-6 lg:p-8 flex flex-col pt-0 md:pt-6 lg:pt-8">
              <div className="w-full flex flex-col flex-1 relative min-h-0">
              
              <div className="flex flex-col flex-1 space-y-4">
              {isExpenseMode && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 w-full px-4 animate-zoom-in">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-red-500/5 mb-4 shadow-lg shadow-red-500/20">
                      <MicIcon className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                      Registro de Gastos por <span className="text-red-500">Voz</span>
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base max-w-sm mx-auto leading-relaxed">
                      Toque no microfone e diga o seu gasto em voz alta.
                      <br />
                      <span className="text-muted-foreground/70 italic">Ex: "Gastei 150 reais de gasolina"</span>
                    </p>
                  </div>

                  <div className="relative">
                    {isListening && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse" />
                      </>
                    )}
                    <button
                      onClick={toggleListening}
                      className={`relative shrink-0 w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
                        isListening
                          ? 'bg-gradient-to-br from-red-500 to-red-600 text-white scale-110 shadow-red-500/50'
                          : 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground hover:scale-105 shadow-primary/30'
                      }`}
                    >
                      <Mic className={`w-10 h-10 ${isListening ? 'animate-pulse' : ''}`} />
                    </button>
                  </div>

                  {isListening && (
                    <div className="mt-8 flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-6 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                        <span className="w-1 h-5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                        <span className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }} />
                      </div>
                      <span className="ml-2 text-sm font-semibold uppercase tracking-wider text-red-500">Ouvindo...</span>
                    </div>
                  )}

                  {input && !isListening && (
                    <div className="mt-8 w-full max-w-md flex flex-col gap-3 px-4 animate-in slide-in-from-bottom-4 duration-300">
                      <div className="relative">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                          Seu gasto
                        </label>
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          className="w-full p-4 pr-4 bg-card rounded-xl border-2 border-border/50 focus:border-primary/50 text-foreground text-sm resize-none focus:outline-none transition-all duration-200 placeholder:text-muted-foreground/50"
                          placeholder="Sua fala aparecerá aqui..."
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!input.trim()) return;
                            const prompt = `Registre este gasto financeiro na minha conta: ${input}`;
                            setIsExpenseMode(false);
                            handleSend(prompt);
                          }}
                          disabled={!input.trim()}
                          className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl flex items-center justify-center gap-2 font-semibold disabled:opacity-50 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 disabled:shadow-none"
                        >
                          <Send className="w-4 h-4" />
                          Confirmar Registro
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setIsExpenseMode(false);
                      if (isListening) toggleListening();
                      setInput('');
                    }}
                    className="mt-8 px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-all duration-200"
                  >
                    Cancelar e voltar
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 w-full px-4">
                  <div className="text-center mb-8 animate-slide-up">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4 shadow-lg">
                      <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">
                      Olá, <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">{userDisplayName.split(' ')[0]}</span>!
                    </h2>
                    <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">
                      Sou seu assessor virtual. Como posso te ajudar hoje?
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-4xl mx-auto">
                    {[
                      {
                        label: "Registrar Gasto por Voz",
                        icon: <MicIcon className="w-5 h-5" />,
                        gradient: "from-violet-500/10 to-purple-500/10",
                        iconBg: "bg-violet-500/20",
                        action: () => setIsExpenseMode(true)
                      },
                      {
                        label: "Investir em FIIs",
                        icon: <TrendingUp className="w-5 h-5" />,
                        gradient: "from-emerald-500/10 to-green-500/10",
                        iconBg: "bg-emerald-500/20",
                        action: () => handleSend("Como começar a investir em FIIs?")
                      },
                      {
                        label: "LCA/LCI vs CDB",
                        icon: <BookOpen className="w-5 h-5" />,
                        gradient: "from-blue-500/10 to-cyan-500/10",
                        iconBg: "bg-blue-500/20",
                        action: () => handleSend("Diferença entre LCA/LCI e CDB?")
                      },
                      {
                        label: "Tesouro Direto",
                        icon: <Wallet className="w-5 h-5" />,
                        gradient: "from-orange-500/10 to-amber-500/10",
                        iconBg: "bg-orange-500/20",
                        action: () => handleSend("Como funciona o Tesouro Direto?")
                      }
                    ].map((sugestao, idx) => (
                      <button
                        key={idx}
                        onClick={sugestao.action}
                        className={`group relative p-4 rounded-2xl border border-border/50 bg-gradient-to-br ${sugestao.gradient} hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 overflow-hidden`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative z-10 flex flex-col items-center text-center gap-3">
                          <div className={`w-12 h-12 rounded-xl ${sugestao.iconBg} flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300`}>
                            {sugestao.icon}
                          </div>
                          <span className="text-sm font-medium text-foreground">{sugestao.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground/70">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ou digite sua própria pergunta abaixo</span>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m, idx) => (
                    <div
                      key={m.id}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                      style={{ animationDelay: `${idx * 50}ms`, animationDuration: '0.3s' }}
                    >
                      <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        m.role === 'user'
                          ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md shadow-primary/20'
                          : 'bg-card text-foreground rounded-bl-md border border-border/50 shadow-md'
                      }`}>
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
                        <div className={`text-[10px] mt-2 text-right ${m.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>
                          {formatTime(m.time)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start animate-slide-up">
                      <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-card border border-border/50 shadow-md">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-xs text-muted-foreground italic capitalize">
                            {typingPhrases[typingPhraseIndex]}{typingDots}
                          </span>
                        </div>
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
          <div className="p-4 md:p-6 lg:px-8 bg-gradient-to-t from-background to-background/50 border-t border-border/50">
            <div className="flex gap-2 relative w-full items-end max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Digite sua pergunta..."
                  rows={1}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border-2 bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 transition-all duration-200 resize-none ${
                    isListening
                      ? 'border-red-400/50 bg-red-500/5'
                      : 'border-border/50 hover:border-border focus:border-primary/50'
                  } ${sending ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={sending}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={sending}
                    className={`absolute right-2 bottom-2 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      isListening
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                        : 'bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-label={isListening ? 'Parar gravação' : 'Gravar áudio'}
                    title={isListening ? 'Parar gravação' : 'Enviar por voz'}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 disabled:shadow-none transition-all duration-200 disabled:cursor-not-allowed bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 active:scale-95 disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-500"
                aria-label="Enviar"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeuAssessorPage;
