import React, { useState } from 'react';
import { DollarSign, Target, TrendingUp, Loader2 } from 'lucide-react';
import { Input } from '../../components/Input';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { showError, showSuccess, showLoading, dismissToast } from '../utils/toast';
import type { FinancialGoal } from '../../types';

interface GoalFormProps {
  onGoalCreated: (newGoal: FinancialGoal) => void;
}

export const GoalForm: React.FC<GoalFormProps> = ({ onGoalCreated }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ name: '', targetAmount: '', currentAmount: '', monthlyContribution: '' });

  const validate = () => {
    const newErrors = { name: '', targetAmount: '', currentAmount: '', monthlyContribution: '' };
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

    const current = parseFloat(currentAmount);
    if (isNaN(current) || current < 0) {
      newErrors.currentAmount = 'O valor atual deve ser zero ou positivo.';
      isValid = false;
    } else if (current > target) {
        newErrors.currentAmount = 'O valor atual não pode ser maior que o alvo.';
        isValid = false;
    }

    const contribution = parseFloat(monthlyContribution);
    if (isNaN(contribution) || contribution < 0) {
      newErrors.monthlyContribution = 'A contribuição mensal deve ser zero ou positiva.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setMonthlyContribution('');
    setErrors({ name: '', targetAmount: '', currentAmount: '', monthlyContribution: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !validate()) return;

    setLoading(true);
    const toastId = showLoading('Criando meta...');

    try {
      const newGoalData = {
        user_id: user.id,
        name: name.trim(),
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount),
        monthly_contribution: parseFloat(monthlyContribution),
      };

      // Ensure we use .insert(data).select() to get the newly created record
      const { data, error } = await supabase
        .from('financial_goals')
        .insert(newGoalData)
        .select()
        .single();

      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Meta criada com sucesso!');
      onGoalCreated(data as FinancialGoal);
      resetForm();

    } catch (error) {
      dismissToast(toastId);
      console.error('Goal creation error:', error);
      showError('Falha ao criar a meta. Verifique se todos os campos estão corretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-card rounded-xl shadow-md border border-border">
      <h2 className="text-2xl font-semibold text-foreground mb-4">Criar Nova Meta</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="goal-name"
          label="Nome da Meta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Aposentadoria, Carro Novo"
          icon={<Target className="w-5 h-5 text-muted-foreground" />}
          error={errors.name}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            id="target-amount"
            label="Valor Alvo ($)"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="100000"
            icon={<DollarSign className="w-5 h-5 text-muted-foreground" />}
            type="number"
            error={errors.targetAmount}
          />
          <Input
            id="current-amount"
            label="Valor Atual ($)"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            placeholder="5000"
            icon={<DollarSign className="w-5 h-5 text-muted-foreground" />}
            type="number"
            error={errors.currentAmount}
          />
          <Input
            id="monthly-contribution"
            label="Aporte Mensal ($)"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
            placeholder="500"
            icon={<TrendingUp className="w-5 h-5 text-muted-foreground" />}
            type="number"
            error={errors.monthlyContribution}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 transition-all duration-300 flex items-center justify-center"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            'Adicionar Meta'
          )}
        </button>
      </form>
    </div>
  );
};