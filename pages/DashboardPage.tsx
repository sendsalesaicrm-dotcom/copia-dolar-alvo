import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { supabase } from '../src/lib/supabase';
import { showError } from '../src/utils/toast';
import { CofrinhoProgressPieChart } from '../src/components/CofrinhoProgressPieChart';
import { ExchangeRateChart } from '../components/ExchangeRateChart';
import type { FinancialGoal, MetaTabuleiro, GridValor } from '../types';

// import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'; 

interface CurrencyQuote {
  code: string;      // Ex: USD
  codein: string;    // Ex: BRL
  name: string;      // Ex: Dólar Americano/Real Brasileiro
  bid: string;       // Compra
  pctChange: string; // Variação %
  create_date: string; // Data de criação
}

const CurrencyCard = ({
  label,
  quote,
  selected,
  onClick
}: {
  label: string,
  quote?: CurrencyQuote,
  selected?: boolean,
  onClick?: () => void
}) => {
  if (!quote) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border flex items-center justify-center h-24">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPositive = !quote.pctChange.startsWith('-');

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-3 sm:p-4 border transition-all cursor-pointer flex flex-col shadow-sm relative overflow-hidden ${selected
        ? 'bg-primary border-primary text-white scale-[1.02]'
        : 'bg-card border-border text-card-foreground hover:border-primary/50'
        }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className={`text-[10px] uppercase tracking-wider font-bold ${selected ? 'text-white/70' : 'text-card-foreground/50'}`}>
            {label}
          </p>
          <h3 className={`text-xl font-black mt-1 ${selected ? 'text-white' : 'text-card-foreground'}`}>
            R$ {parseFloat(quote.bid).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
        </div>
      </div>
      <div className="mt-1">
        <p className={`text-[11px] font-bold flex items-center ${selected
          ? 'text-white'
          : (isPositive ? 'text-emerald-500' : 'text-red-500')
          }`}>
          {isPositive ? '▲' : '▼'} {quote.pctChange}%
        </p>
      </div>
      <div className="mt-auto pt-2 border-t border-border/10">
        <p className={`text-[9px] font-medium ${selected ? 'text-white/60' : 'text-card-foreground/40'}`}>
          Atualizado às {quote.create_date.split(' ')[1]}
        </p>
      </div>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  // Estado para múltiplas moedas
  const [cotacoes, setCotacoes] = useState<Record<string, CurrencyQuote> | null>(null);
  const [activeCurrency, setActiveCurrency] = useState('USD-BRL');

  useEffect(() => {
    const fetchCotacoes = async () => {
      try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL');
        const data = await response.json();
        setCotacoes(data);
      } catch (err) {
        console.error('Erro ao atualizar cotações:', err);
      }
    };
    fetchCotacoes();
    const intervalo = setInterval(fetchCotacoes, 30000);
    return () => clearInterval(intervalo);
  }, []);
  const { user, loading: authLoading } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const fetchGoals = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching goals:', error);
      showError('Erro ao carregar metas financeiras para o dashboard.');
      return [];
    }
    return data as FinancialGoal[];
  }, []);

  // Effect to fetch initial goals
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (user) {
      setLoadingGoals(true);
      fetchGoals(user.id).then(fetchedGoals => {
        setGoals(fetchedGoals);
        if (fetchedGoals.length > 0) {
          // Select the first goal by default, but only if no goal is currently selected
          setSelectedGoalId(prevId => prevId || fetchedGoals[0].id);
        } else {
          setSelectedGoalId(null);
        }
      }).finally(() => {
        setLoadingGoals(false);
      });
    } else {
      setLoadingGoals(false);
      setGoals([]);
      setSelectedGoalId(null);
    }
  }, [user, authLoading, fetchGoals]);

  // Effect for Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard_goals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_goals',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newGoal = payload.new as FinancialGoal | null;
          const oldGoal = payload.old as FinancialGoal | null;

          setGoals(prevGoals => {
            if (payload.eventType === 'INSERT' && newGoal) {
              return [...prevGoals, newGoal];
            } else if (payload.eventType === 'UPDATE' && newGoal) {
              return prevGoals.map(goal => (goal.id === newGoal.id ? newGoal : goal));
            } else if (payload.eventType === 'DELETE' && oldGoal) {
              return prevGoals.filter(goal => goal.id !== oldGoal.id);
            }
            return prevGoals;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  // ===== Cofrinho progress (metas tipo 'tabuleiro') =====
  const [cofrinhos, setCofrinhos] = useState<MetaTabuleiro[]>([]);
  const [selectedCofrinhoId, setSelectedCofrinhoId] = useState<string | null>(null);
  const [gridCofrinho, setGridCofrinho] = useState<GridValor[]>([]);

  const fetchCofrinhos = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('metas')
      .select('id, user_id, nome, objetivo_total, status, frequencia, data_inicio, data_fim, created_at')
      .eq('user_id', userId)
      .eq('tipo', 'tabuleiro')
      .not('objetivo_total', 'is', null)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching cofrinhos:', error);
      return [] as MetaTabuleiro[];
    }
    return (data ?? []) as MetaTabuleiro[];
  }, []);

  const fetchGrid = useCallback(async (metaId: string) => {
    const { data, error } = await supabase
      .from('grid_valores')
      .select('id, meta_id, valor, marcado, posicao, data_prevista')
      .eq('meta_id', metaId)
      .order('posicao', { ascending: true });
    if (error) {
      console.error('Error fetching grid for cofrinho:', error);
      return [] as GridValor[];
    }
    return (data ?? []) as GridValor[];
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCofrinhos([]);
      setSelectedCofrinhoId(null);
      setGridCofrinho([]);
      return;
    }
    fetchCofrinhos(user.id).then((data) => {
      setCofrinhos(data);
      setSelectedCofrinhoId((prev) => prev ?? (data[0]?.id ?? null));
    });
  }, [user, authLoading, fetchCofrinhos]);

  useEffect(() => {
    if (!selectedCofrinhoId) {
      setGridCofrinho([]);
      return;
    }
    fetchGrid(selectedCofrinhoId).then(setGridCofrinho);
  }, [selectedCofrinhoId, fetchGrid]);

  const selectedCofrinho = useMemo(() => cofrinhos.find(c => c.id === selectedCofrinhoId) ?? null, [cofrinhos, selectedCofrinhoId]);
  const cofrinhoProgress = useMemo(() => {
    if (!selectedCofrinho) return null;
    const objetivo = Number(selectedCofrinho.objetivo_total);
    const totalMarcado = gridCofrinho.filter(g => g.marcado).reduce((sum, g) => sum + Number(g.valor), 0);
    const remainingInstallments = gridCofrinho.filter(g => !g.marcado).length;
    let daysRemaining: number | null = null;
    try {
      if (selectedCofrinho.data_fim) {
        const end = new Date(selectedCofrinho.data_fim);
        const today = new Date();
        const startDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
        const diff = Math.ceil((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, diff);
      }
    } catch { }
    return { objetivo, totalMarcado, remainingInstallments, daysRemaining };
  }, [selectedCofrinho, gridCofrinho]);

  // No spinner during navigation/data loading.
  // The UI below already handles empty/partial state safely.

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-stretch">
        {/* Lado Esquerdo: Gráfico + Grid de Moedas */}
        <div className="flex flex-col gap-8">
          <div className="w-full">
            <ExchangeRateChart currency={activeCurrency} setCurrency={setActiveCurrency} />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4">
            <CurrencyCard
              label="USD: Dólar"
              quote={cotacoes?.USDBRL}
              selected={activeCurrency === 'USD-BRL'}
              onClick={() => setActiveCurrency('USD-BRL')}
            />
            <CurrencyCard
              label="BTC: Bitcoin"
              quote={cotacoes?.BTCBRL}
              selected={activeCurrency === 'BTC-BRL'}
              onClick={() => setActiveCurrency('BTC-BRL')}
            />
            <CurrencyCard
              label="EUR: Euro"
              quote={cotacoes?.EURBRL}
              selected={activeCurrency === 'EUR-BRL'}
              onClick={() => setActiveCurrency('EUR-BRL')}
            />
            <CurrencyCard
              label="ETH: Ethereum"
              quote={cotacoes?.ETHBRL}
              selected={activeCurrency === 'ETH-BRL'}
              onClick={() => setActiveCurrency('ETH-BRL')}
            />
          </div>
        </div>

        {/* Lado Direito: Cofrinho Progress (Esticado para alinhar a base) */}
        <div className="bg-card rounded-2xl shadow-sm p-6 sm:p-8 border border-border flex flex-col h-full">
          <div className="flex flex-col gap-4 mb-6">
            <h2 className="text-xl font-bold text-card-foreground">Progresso do Cofrinho</h2>
            <div className="w-full">
              <label className="block text-[10px] uppercase tracking-wider font-bold text-card-foreground/50 mb-1.5 ml-1">Selecionar Cofrinho</label>
              <select
                value={selectedCofrinhoId ?? ''}
                onChange={(e) => setSelectedCofrinhoId(e.target.value || null)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-card-foreground text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none shadow-sm font-medium"
              >
                {cofrinhos.length === 0 ? (
                  <option value="">Nenhum cofrinho</option>
                ) : (
                  cofrinhos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome ?? 'Cofrinho'}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {cofrinhos.length === 0 || !selectedCofrinho || !cofrinhoProgress ? (
              <div className="flex-1 flex items-center justify-center text-center p-8 border-2 border-dashed border-border/50 rounded-2xl">
                <p className="text-sm text-card-foreground/50">Crie um cofrinho para visualizar o progresso aqui.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full space-y-8">
                {/* O gráfico dentro agora ocupa o espaço central */}
                <div className="flex-1 min-h-[300px] flex items-center justify-center">
                  <div className="w-full">
                    <CofrinhoProgressPieChart objetivo={cofrinhoProgress.objetivo} totalMarcado={cofrinhoProgress.totalMarcado} />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Info do tipo de aporte e período */}
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex justify-between py-2.5 border-b border-border/50">
                      <span className="text-card-foreground/60 font-medium">Frequência:</span>
                      <span className="font-bold text-card-foreground uppercase tracking-tight">
                        {(() => {
                          switch (selectedCofrinho.frequencia) {
                            case 'diaria': return 'Diário';
                            case 'semanal': return 'Semanal';
                            case 'mensal': return 'Mensal';
                            default: return '-';
                          }
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5 border-b border-border/50">
                      <span className="text-card-foreground/60 font-medium">Data de Início:</span>
                      <span className="font-bold text-card-foreground">{selectedCofrinho.data_inicio ? new Date(selectedCofrinho.data_inicio).toLocaleDateString('pt-BR') : '-'}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-card-foreground/60 font-medium">Data Final:</span>
                      <span className="font-bold text-card-foreground">{selectedCofrinho.data_fim ? new Date(selectedCofrinho.data_fim).toLocaleDateString('pt-BR') : '-'}</span>
                    </div>
                  </div>

                  <div className="pt-2 grid grid-cols-2 gap-4">
                    <div className="bg-card-foreground/[0.03] p-4 rounded-2xl border border-border/50 flex flex-col justify-center">
                      <p className="text-[10px] text-card-foreground/50 uppercase font-black mb-1">DIAS RESTANTES</p>
                      <p className="text-2xl font-black text-[#ef6037]">{cofrinhoProgress.daysRemaining ?? '0'}</p>
                    </div>
                    <div className="bg-card-foreground/[0.03] p-4 rounded-2xl border border-border/50 flex flex-col justify-center">
                      <p className="text-[10px] text-card-foreground/50 uppercase font-black mb-1">PARCELAS</p>
                      <p className="text-2xl font-black text-[#ef6037]">{cofrinhoProgress.remainingInstallments}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;