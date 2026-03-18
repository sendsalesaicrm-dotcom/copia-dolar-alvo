import React, { useState, useEffect, useRef } from 'react';
import { Bell, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NewsItem {
  id: string;
  manchete: string;
  url_noticia: string;
  fonte: string;
  created_at: string;
}

export const NewsNotification: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastRead, setLastRead] = useState<Date | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      let currentUserId = userId;
      let currentLastRead = lastRead;

      if (!currentUserId) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          currentUserId = authData.user.id;
          setUserId(authData.user.id);
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('news_last_read_at')
            .eq('id', authData.user.id)
            .single();
            
          if (profile?.news_last_read_at) {
            currentLastRead = new Date(profile.news_last_read_at);
            setLastRead(currentLastRead);
          }
        }
      }

      const { data, error } = await supabase
        .from('news_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      let newsArray: NewsItem[] = data || [];
      const validNews = newsArray.filter(item => item && item.manchete && item.url_noticia);
      
      setNews(validNews);
      
      if (validNews.length > 0) {
        if (currentLastRead) {
          const unreads = validNews.filter(n => new Date(n.created_at) > currentLastRead!).length;
          setUnreadCount(unreads);
        } else {
          setUnreadCount(validNews.length);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar notícias:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime Subscription
    const channel = supabase.channel('public:news_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'news_feed' }, (payload) => {
        const newNews = payload.new as NewsItem;
        if (newNews && newNews.manchete && newNews.url_noticia) {
          setNews(prev => [newNews, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleDropdown = async () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    
    if (willOpen && unreadCount > 0 && userId) {
      setUnreadCount(0);
      const now = new Date();
      setLastRead(now);
      
      await supabase
        .from('profiles')
        .update({ news_last_read_at: now.toISOString() })
        .eq('id', userId);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-muted-foreground hover:text-foreground focus:outline-none focus:text-foreground rounded-full hover:bg-muted transition-colors"
        aria-label="Notificações de Notícias"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white ring-2 ring-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
            <h3 className="font-semibold text-sm">Últimas Notícias (Dólar)</h3>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                loadData();
              }}
              className="text-muted-foreground hover:text-primary p-1 rounded-md transition-colors"
              title="Atualizar"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2">
            {loading && news.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                <span className="text-sm">Buscando notícias...</span>
              </div>
            ) : news.length > 0 ? (
              <div className="space-y-1">
                {news.map((item) => {
                  const isNew = lastRead ? new Date(item.created_at) > lastRead : true;
                  return (
                  <a
                    key={item.id}
                    href={item.url_noticia}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block p-3 rounded-lg transition-colors group ${isNew ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted'}`}
                  >
                    <h4 className={`text-sm font-medium transition-colors line-clamp-2 leading-snug mb-1 ${isNew ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                      {item.manchete}
                    </h4>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">
                        {item.fonte || 'Notícia'}
                      </span>
                      {isNew && <span className="text-[10px] font-semibold text-primary">Novo</span>}
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                )})}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-center px-4">
                <Bell className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm">Nenhuma notícia recente encontrada nas últimas 24 horas.</p>
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-border bg-muted/10">
            <a 
              href="https://news.google.com/search?q=dolar" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full text-center text-xs text-muted-foreground hover:text-primary py-1"
            >
              Ver todas no Google News
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
