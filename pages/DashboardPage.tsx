import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { supabase } from '../src/lib/supabase';
import { showError } from '../src/utils/toast';
import { GoalProgressPieChart } from '../src/components/GoalProgressPieChart';
import { CofrinhoProgressPieChart } from '../src/components/CofrinhoProgressPieChart';
import { GoalSelector } from '../src/components/GoalSelector';
import type { FinancialGoal, MetaTabuleiro, GridValor } from '../types';

const DashboardPage: React.FC = () => {
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
    } catch {}
    return { objetivo, totalMarcado, remainingInstallments, daysRemaining };
  }, [selectedCofrinho, gridCofrinho]);

  // No spinner during navigation/data loading.
  // The UI below already handles empty/partial state safely.

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Dashboard</h1>
        <p className="text-muted-foreground mb-8">Visão geral da sua evolução financeira.</p>

        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">Progresso da Meta</h2>
                <GoalSelector 
                    goals={goals} 
                    selectedGoalId={selectedGoalId} 
                    onSelectGoal={setSelectedGoalId} 
                />
            </div>

            <div className="p-4 border border-border rounded-xl">
                {goals.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        <p>Nenhuma meta financeira cadastrada. Crie uma na seção "Metas".</p>
                    </div>
                ) : selectedGoal ? (
                    <GoalProgressPieChart goal={selectedGoal} />
                ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        <p>Selecione uma meta para visualizar o progresso.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Cofrinho Progress */}
        <div className="mt-8 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-foreground">Progresso do Cofrinho</h2>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Selecionar Cofrinho</label>
              <select
                value={selectedCofrinhoId ?? ''}
                onChange={(e) => setSelectedCofrinhoId(e.target.value || null)}
                className="px-3 py-2 border rounded-lg bg-background text-foreground border-input"
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

          <div className="p-4 border border-border rounded-xl">
            {cofrinhos.length === 0 || !selectedCofrinho || !cofrinhoProgress ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>Crie um cofrinho para visualizar o progresso aqui.</p>
              </div>
            ) : (
              <>
                <CofrinhoProgressPieChart objetivo={cofrinhoProgress.objetivo} totalMarcado={cofrinhoProgress.totalMarcado} />
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div>
                    Dias restantes para completar o período: <span className="text-foreground font-semibold">{cofrinhoProgress.daysRemaining ?? '-'}</span>
                  </div>
                  <div>
                    Parcelas restantes: <span className="text-foreground font-semibold">{cofrinhoProgress.remainingInstallments}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <footer className="text-center mt-8 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Dolar Alvo. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default DashboardPage;