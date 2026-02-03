import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { showError, showLoading, dismissToast, showSuccess } from '../utils/toast';
import { GoalForm } from '../components/GoalForm';
import { GoalCard } from '../components/GoalCard';
import { GoalEditModal } from '../components/GoalEditModal';
import type { FinancialGoal } from '../../types';

const FinancialGoalsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  
  const fetchGoals = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching goals:', error);
      showError('Erro ao carregar metas financeiras.');
      return [];
    }
    return data as FinancialGoal[];
  }, []);

  // Effect to fetch initial goals
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    fetchGoals(user.id).then(fetchedGoals => {
      setGoals(fetchedGoals);
    }).finally(() => {
      setLoading(false);
    });
    
  }, [user, authLoading, fetchGoals]);

  // Effect for Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('goals_changes')
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

          if (payload.eventType === 'INSERT' && newGoal) {
            setGoals(prevGoals => [...prevGoals, newGoal]);
          } else if (payload.eventType === 'UPDATE' && newGoal) {
            setGoals(prevGoals => 
              prevGoals.map(goal => (goal.id === newGoal.id ? newGoal : goal))
            );
          } else if (payload.eventType === 'DELETE' && oldGoal) {
            setGoals(prevGoals => prevGoals.filter(goal => goal.id !== oldGoal.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


  const handleGoalCreated = (newGoal: FinancialGoal) => {
    // Realtime handles the state update for INSERT events
    // We keep this function for local form reset/success handling if needed, 
    // but the state update is now managed by the subscription.
  };

  const handleGoalUpdated = (updatedGoal: FinancialGoal) => {
    // Realtime handles the state update for UPDATE events
    // We keep this function for local modal closing/success handling if needed.
  };

  const handleEditGoal = (goal: FinancialGoal) => {
    setSelectedGoal(goal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGoal(null);
  };

  const handleDeleteGoal = async (goalId: string) => {
    const confirmDelete = window.confirm('Tem certeza que deseja excluir esta meta?');
    if (!confirmDelete) return;

    const toastId = showLoading('Excluindo meta...');

    const { error } = await supabase
      .from('financial_goals')
      .delete()
      .eq('id', goalId);

    dismissToast(toastId);

    if (error) {
      console.error('Delete error:', error);
      showError('Falha ao excluir a meta.');
    } else {
      showSuccess('Meta excluída com sucesso.');
      // Realtime handles the state update for DELETE events
    }
  };

  // No spinner during navigation/data loading.

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Gestão de Metas Financeiras</h1>
        <p className="mt-2 text-md text-muted-foreground">Defina, acompanhe e alcance seus objetivos de poupança.</p>
      </div>

      <div className="mb-10">
        <GoalForm onGoalCreated={handleGoalCreated} />
      </div>

      <h2 className="text-2xl font-semibold text-foreground mb-4 border-b border-border pb-2">Minhas Metas ({goals.length})</h2>
      
      {goals.length === 0 ? (
        <div className="p-8 text-center bg-muted/50 rounded-xl border border-dashed border-border text-muted-foreground">
            <p>Você ainda não tem metas cadastradas. Comece adicionando uma acima!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <GoalCard 
              key={goal.id} 
              goal={goal} 
              onDelete={handleDeleteGoal} 
              onEdit={handleEditGoal} 
            />
          ))}
        </div>
      )}

      {/* Modal de Edição */}
      <GoalEditModal
        goal={selectedGoal}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onGoalUpdated={handleGoalUpdated}
      />
    </div>
  );
};

export default FinancialGoalsPage;