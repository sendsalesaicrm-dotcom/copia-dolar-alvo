import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../src/context/AuthContext';
import { supabase } from '../src/lib/supabase';
import { showError } from '../src/utils/toast';
import { CofrinhoProgressPieChart } from '../src/components/CofrinhoProgressPieChart';
import { ExchangeRateChart } from '../components/ExchangeRateChart';
import { FlapQuickView } from '../src/components/FlapQuickView';

import type { FinancialGoal, MetaTabuleiro, GridValor } from '../types';

interface CurrencyQuote {
  code: string;
  codein: string;
  name: string;
  bid: string;
  pctChange: string;
  create_date: string;
}

const CofrinhoDataContext = React.createContext<any>(null);

const useCofrinhoData = () => {
  const context = React.useContext(CofrinhoDataContext);
  if (!context) throw new Error('useCofrinhoData must be used within a CofrinhoDataProvider');
  return context;
};

const CofrinhoDataProvider: React.FC<{ children: React.ReactNode, values: any }> = ({ children, values }) => {
  return (
    <CofrinhoDataContext.Provider value={values}>
      {children}
    </CofrinhoDataContext.Provider>
  );
};

function RenderCofrinhoContent() {
  const { cofrinhos, selectedCofrinhoId, setSelectedCofrinhoId, selectedCofrinho, cofrinhoProgress } = useCofrinhoData();

  return (
    <>
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
              cofrinhos.map((m: any) => (
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
            <div className="flex-1 min-h-[250px] flex items-center justify-center">
              <div className="w-full">
                <CofrinhoProgressPieChart objetivo={cofrinhoProgress.objetivo} totalMarcado={cofrinhoProgress.totalMarcado} />
              </div>
            </div>

            <div className="space-y-4">
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
                <div className="flex justify-between py-2.5 border-b border-border/50">
                  <span className="text-card-foreground/60 font-medium">Data Final:</span>
                  <span className="font-bold text-card-foreground">{selectedCofrinho.data_fim ? new Date(selectedCofrinho.data_fim).toLocaleDateString('pt-BR') : '-'}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-border/50">
                  <span className="text-card-foreground/60 font-medium">Meta Total:</span>
                  <span className="font-bold text-card-foreground">
                    $ {cofrinhoProgress.objetivo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-card-foreground/60 font-medium">Acumulado:</span>
                  <span className="font-bold text-card-foreground text-emerald-500">
                    $ {cofrinhoProgress.totalMarcado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
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
    </>
  );
}

const CurrencyCard = ({
  label,
  quote,
  selected,
  onClick,
  updatedAt
}: {
  label: string,
  quote?: CurrencyQuote,
  selected?: boolean,
  onClick?: () => void,
  updatedAt?: string
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
          {isPositive ? '▲' : '▼'} {Math.abs(parseFloat(quote.pctChange)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
        </p>
      </div>
      <div className="mt-auto pt-2 border-t border-border/10">
        <p className={`text-[9px] font-medium ${selected ? 'text-white/60' : 'text-card-foreground/40'}`}>
          Atualizado às {updatedAt || (quote.create_date ? quote.create_date.split(' ')[1] : '')}
        </p>
      </div>
    </div>
  );
};



const DashboardPage: React.FC = () => {
  const [cotacoes, setCotacoes] = useState<Record<string, CurrencyQuote> | null>(null);
  const [activeCurrency, setActiveCurrency] = useState('USD-BRL');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const fetchCotacoes = async () => {
      try {
        const response = await fetch('https://blobgpedbfdjweiyxbzu.supabase.co/functions/v1/cotacoes', {
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsb2JncGVkYmZkandlaXl4Ynp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjE3NzQsImV4cCI6MjA4NzA5Nzc3NH0.j84fRavzFlfsxVma-f0axr1X8xw22grywqITifugI6g`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        setCotacoes(data);
        setLastUpdated(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.error('Erro ao atualizar cotações:', err);
      }
    };
    fetchCotacoes();
    const intervalo = setInterval(fetchCotacoes, 60000);
    return () => clearInterval(intervalo);
  }, []);

  const { user, profile, loading: authLoading } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const fetchGoals = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return data as FinancialGoal[];
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setLoadingGoals(true);
      fetchGoals(user.id).then(fetchedGoals => {
        setGoals(fetchedGoals);
        if (fetchedGoals.length > 0) setSelectedGoalId(prevId => prevId || fetchedGoals[0].id);
      }).finally(() => setLoadingGoals(false));
    }
  }, [user, authLoading, fetchGoals]);

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
    if (error) return [];
    return data as MetaTabuleiro[];
  }, []);

  const fetchGrid = useCallback(async (metaId: string) => {
    const { data, error } = await supabase
      .from('grid_valores')
      .select('id, meta_id, valor, marcado, posicao, data_prevista')
      .eq('meta_id', metaId)
      .order('posicao', { ascending: true });
    if (error) return [];
    return data as GridValor[];
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      fetchCofrinhos(user.id).then((data) => {
        setCofrinhos(data);
        setSelectedCofrinhoId((prev) => prev ?? (data[0]?.id ?? null));
      });
    }
  }, [user, authLoading, fetchCofrinhos]);

  useEffect(() => {
    if (selectedCofrinhoId) fetchGrid(selectedCofrinhoId).then(setGridCofrinho);
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
        const diff = Math.ceil((new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, diff);
      }
    } catch { }
    return { objetivo, totalMarcado, remainingInstallments, daysRemaining };
  }, [selectedCofrinho, gridCofrinho]);

  const [currentSlide, setCurrentSlide] = useState(0);

  const handleDragEnd = (_: any, info: any) => {
    const maxSlide = profile?.use_flap_strategy ? 2 : 1;
    if (info.offset.x < -50 && currentSlide < maxSlide) setCurrentSlide(prev => prev + 1);
    else if (info.offset.x > 50 && currentSlide > 0) setCurrentSlide(prev => prev - 1);
  };

  const cofrinhoValues = { cofrinhos, selectedCofrinhoId, setSelectedCofrinhoId, selectedCofrinho, cofrinhoProgress };

  return (
    <CofrinhoDataProvider values={cofrinhoValues}>
      <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="hidden lg:grid lg:grid-cols-[1fr_350px] gap-8 items-stretch">
          <div className="flex flex-col gap-8">
            <ExchangeRateChart
              currency={activeCurrency}
              setCurrency={setActiveCurrency}
              currentQuote={cotacoes ? cotacoes[activeCurrency.replace('-', '')] : undefined}
            />
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4">
              <CurrencyCard label="USD: Dólar" quote={cotacoes?.USDBRL} selected={activeCurrency === 'USD-BRL'} onClick={() => setActiveCurrency('USD-BRL')} updatedAt={lastUpdated} />
              <CurrencyCard label="BTC: Bitcoin" quote={cotacoes?.BTCBRL} selected={activeCurrency === 'BTC-BRL'} onClick={() => setActiveCurrency('BTC-BRL')} updatedAt={lastUpdated} />
              <CurrencyCard label="EUR: Euro" quote={cotacoes?.EURBRL} selected={activeCurrency === 'EUR-BRL'} onClick={() => setActiveCurrency('EUR-BRL')} updatedAt={lastUpdated} />
              <CurrencyCard label="ETH: Ethereum" quote={cotacoes?.ETHBRL} selected={activeCurrency === 'ETH-BRL'} onClick={() => setActiveCurrency('ETH-BRL')} updatedAt={lastUpdated} />
            </div>
            {profile?.use_flap_strategy && <FlapQuickView />}
          </div>
          <div className="bg-card rounded-2xl shadow-sm p-6 border border-border flex flex-col h-full">
            <RenderCofrinhoContent />
          </div>
        </div>

        <div className="lg:hidden flex flex-col gap-6">
          <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={handleDragEnd} className="relative w-full overflow-hidden">
            <AnimatePresence mode="wait">
              {currentSlide === 0 ? (
                <motion.div key="slide0" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }} className="flex flex-col gap-8">
                  <ExchangeRateChart
                    currency={activeCurrency}
                    setCurrency={setActiveCurrency}
                    currentQuote={cotacoes ? cotacoes[activeCurrency.replace('-', '')] : undefined}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <CurrencyCard label="USD: Dólar" quote={cotacoes?.USDBRL} selected={activeCurrency === 'USD-BRL'} onClick={() => setActiveCurrency('USD-BRL')} updatedAt={lastUpdated} />
                    <CurrencyCard label="BTC: Bitcoin" quote={cotacoes?.BTCBRL} selected={activeCurrency === 'BTC-BRL'} onClick={() => setActiveCurrency('BTC-BRL')} updatedAt={lastUpdated} />
                    <CurrencyCard label="EUR: Euro" quote={cotacoes?.EURBRL} selected={activeCurrency === 'EUR-BRL'} onClick={() => setActiveCurrency('EUR-BRL')} updatedAt={lastUpdated} />
                    <CurrencyCard label="ETH: Ethereum" quote={cotacoes?.ETHBRL} selected={activeCurrency === 'ETH-BRL'} onClick={() => setActiveCurrency('ETH-BRL')} updatedAt={lastUpdated} />
                  </div>
                </motion.div>
              ) : currentSlide === 1 ? (
                <motion.div key="slide1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }} className="bg-card rounded-2xl shadow-sm p-6 border border-border min-h-[500px]">
                  <RenderCofrinhoContent />
                </motion.div>
              ) : (
                <motion.div key="slide2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }} className="min-h-[300px] flex items-center">
                  <FlapQuickView />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <div className="flex justify-center gap-3 mt-4">
            <button onClick={() => setCurrentSlide(0)} className={`w-3 h-3 rounded-full transition-all duration-300 ${currentSlide === 0 ? 'bg-primary scale-125' : 'bg-muted-foreground/30'}`} />
            <button onClick={() => setCurrentSlide(1)} className={`w-3 h-3 rounded-full transition-all duration-300 ${currentSlide === 1 ? 'bg-primary scale-125' : 'bg-muted-foreground/30'}`} />
            {profile?.use_flap_strategy && (
              <button onClick={() => setCurrentSlide(2)} className={`w-3 h-3 rounded-full transition-all duration-300 ${currentSlide === 2 ? 'bg-primary scale-125' : 'bg-muted-foreground/30'}`} />
            )}
          </div>
        </div>
      </div>
    </CofrinhoDataProvider>
  );
};

export default DashboardPage;