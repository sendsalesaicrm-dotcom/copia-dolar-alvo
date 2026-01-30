import React, { useState, useEffect } from 'react';
import { X, Loader2, DollarSign, Target, TrendingUp, Plus } from 'lucide-react';
import { Input } from '../../components/Input';
import { supabase } from '../lib/supabase';
import { showError, showSuccess, showLoading, dismissToast } from '../utils/toast';
import type { FinancialGoal } from '../../types';

interface GoalEditModalProps {
  goal: FinancialGoal | null;
  isOpen: boolean;
  onClose: () => void;
  onGoalUpdated: (updatedGoal: FinancialGoal) => void;
}

export const GoalEditModal: React.FC<GoalEditModalProps> = ({ goal, isOpen, onClose, onGoalUpdated }) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [manualContribution, setManualContribution] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ name: '', targetAmount: '', monthlyContribution: '', manualContribution: '' });

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTargetAmount(String(goal.target_amount));
      setMonthlyContribution(String(goal.monthly_contribution));
      setManualContribution('');
      setErrors({ name: '', targetAmount: '', monthlyContribution: '', manualContribution: '' });
    }
  }, [goal]);

  if (!isOpen || !goal) return null;

  const validate = (isManualAporte: boolean) => {
    const newErrors = { name: '', targetAmount: '', monthlyContribution: '', manualContribution: '' };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'O nome da meta é obrigatório.';
      isValid = false;
    }
    
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      newErrors.targetAmount = 'O valor alvo deve ser positivo.';
      isValid = false;
    }

    const contribution = parseFloat(monthlyContribution);
    if (isNaN(contribution) || contribution < 0) {
      newErrors.monthlyContribution = 'A contribuição mensal deve ser zero ou positiva.';
      isValid = false;
    }

    if (isManualAporte) {
        const manual = parseFloat(manualContribution);
        if (isNaN(manual) || manual <= 0) {
            newErrors.manualContribution = 'O aporte deve ser um valor positivo.';
            isValid = false;
        }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(false)) return;

    setLoading(true);
    const toastId = showLoading('Atualizando meta...');

    try {
      const updatedData = {
        name: name.trim(),
        target_amount: parseFloat(targetAmount),
        monthly_contribution: parseFloat(monthlyContribution),
      };

      const { data, error } = await supabase
        .from('financial_goals')
        .update(updatedData)
        .eq('id', goal.id)
        .select()
        .single();

      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Meta atualizada com sucesso!');
      onGoalUpdated(data as FinancialGoal);
      onClose(); // Fechar o modal após o sucesso

    } catch (error) {
      dismissToast(toastId);
      console.error('Goal update error:', error);
      showError('Falha ao atualizar a meta.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualAporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(true)) return;

    const aporteValue = parseFloat(manualContribution);
    if (aporteValue <= 0) return;

    setLoading(true);
    const toastId = showLoading('Registrando aporte...');

    try {
      // Calculate new current amount based on the goal object passed via props
      const newCurrentAmount = goal.current_amount + aporteValue;

      const { data, error } = await supabase
        .from('financial_goals')
        .update({ current_amount: newCurrentAmount })
        .eq('id', goal.id)
        .select()
        .single();

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(`Aporte de $${aporteValue.toFixed(2)} registrado com sucesso!`);
      onGoalUpdated(data as FinancialGoal);
      setManualContribution(''); // Clear manual input after success

    } catch (error) {
      dismissToast(toastId);
      console.error('Manual contribution error:', error);
      showError('Falha ao registrar o aporte manual.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">Editar Meta: {goal.name}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Fechar">
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
            
            {/* Seção 1: Aporte Manual */}
            <div className="p-4 bg-muted rounded-lg border border-border space-y-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-primary" />
                    Aporte Manual
                </h3>
                <form onSubmit={handleManualAporte} className="flex items-end space-x-3">
                    <div className="flex-1">
                        <Input
                            id="manual-contribution"
                            label="Valor do Aporte ($)"
                            value={manualContribution}
                            onChange={(e) => setManualContribution(e.target.value)}
                            placeholder="1000"
                            icon={<DollarSign className="w-5 h-5 text-muted-foreground" />}
                            type="number"
                            error={errors.manualContribution}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center h-10"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            'Aportar'
                        )}
                    </button>
                </form>
            </div>

            {/* Seção 2: Edição da Meta */}
            <form onSubmit={handleUpdate} className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground">Configurações da Meta</h3>
                <Input
                    id="edit-goal-name"
                    label="Nome da Meta"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Aposentadoria"
                    icon={<Target className="w-5 h-5 text-muted-foreground" />}
                    error={errors.name}
                />
                <Input
                    id="edit-target-amount"
                    label="Valor Alvo ($)"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="100000"
                    icon={<DollarSign className="w-5 h-5 text-muted-foreground" />}
                    type="number"
                    error={errors.targetAmount}
                />
                <Input
                    id="edit-monthly-contribution"
                    label="Aporte Mensal ($)"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    placeholder="500"
                    icon={<TrendingUp className="w-5 h-5 text-muted-foreground" />}
                    type="number"
                    error={errors.monthlyContribution}
                />
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                        'Salvar Meta'
                    )}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};