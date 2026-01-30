import React from 'react';
import { Trash2, Edit, Clock, CheckCircle } from 'lucide-react';
import type { FinancialGoal } from '../../types';

interface GoalCardProps {
  goal: FinancialGoal;
  onDelete: (id: string) => void;
  onEdit: (goal: FinancialGoal) => void; 
}

const BRL_RATE = 4.50;

const formatCurrency = (value: number, currency: 'USD' | 'BRL' = 'USD') => {
    const options = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    };
    const locale = currency === 'USD' ? 'en-US' : 'pt-BR';
    return new Intl.NumberFormat(locale, options).format(value);
};

const calculateGoalMetrics = (goal: FinancialGoal) => {
    const remainingAmount = goal.target_amount - goal.current_amount;
    const completionPercentage = (goal.current_amount / goal.target_amount) * 100;
    
    let estimatedTimeMonths = 0;
    let estimatedTimeDisplay = 'Meta Atingida!';
    let isCompleted = false;

    if (remainingAmount <= 0) {
        isCompleted = true;
        estimatedTimeDisplay = 'Concluída!';
    } else if (goal.monthly_contribution > 0) {
        estimatedTimeMonths = remainingAmount / goal.monthly_contribution;
        const years = Math.floor(estimatedTimeMonths / 12);
        const months = Math.ceil(estimatedTimeMonths % 12);
        
        if (years > 0) {
            estimatedTimeDisplay = `${years} ano${years > 1 ? 's' : ''} e ${months} mês${months !== 1 ? 'es' : ''}`;
        } else {
            estimatedTimeDisplay = `${months} mês${months !== 1 ? 'es' : ''}`;
        }
    } else {
        estimatedTimeDisplay = 'Aporte necessário.';
    }

    return {
        remainingAmount,
        completionPercentage: Math.min(100, completionPercentage),
        estimatedTimeDisplay,
        isCompleted,
    };
};

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onDelete, onEdit }) => {
    const { remainingAmount, completionPercentage, estimatedTimeDisplay, isCompleted } = calculateGoalMetrics(goal);
    
    const progressColor = isCompleted ? 'bg-green-500' : 'bg-primary';
    const textColor = isCompleted ? 'text-green-500' : 'text-primary';

    const currentAmountBRL = formatCurrency(goal.current_amount * BRL_RATE, 'BRL');

    return (
        <div className="p-5 bg-card rounded-xl shadow-lg border border-border flex flex-col justify-between transition-shadow hover:shadow-xl">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-foreground truncate">{goal.name}</h3>
                <div className="flex space-x-2">
                    {/* Edit button */}
                    <button 
                        onClick={() => onEdit(goal)} 
                        className="p-1 text-muted-foreground hover:text-accent-foreground rounded-full transition-colors"
                        aria-label="Editar meta"
                    >
                        <Edit className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => onDelete(goal.id)} 
                        className="p-1 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                        aria-label="Excluir meta"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-sm font-medium text-muted-foreground mb-1">
                    <span>Progresso</span>
                    <span className={textColor}>{completionPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                    <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${progressColor}`} 
                        style={{ width: `${completionPercentage}%` }}
                    ></div>
                </div>
                {/* Total Investido (Current Amount) */}
                <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium">Aportado: </span>
                    <span className="font-semibold text-foreground">{formatCurrency(goal.current_amount)}</span>
                    <span className="ml-1">({currentAmountBRL})</span>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col">
                    <span className="text-muted-foreground">Alvo Total</span>
                    <span className="font-semibold text-foreground">
                        {formatCurrency(goal.target_amount)}
                        <span className="text-xs text-muted-foreground block">
                            {formatCurrency(goal.target_amount * BRL_RATE, 'BRL')}
                        </span>
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-muted-foreground">Aporte Mensal</span>
                    <span className="font-semibold text-foreground">
                        {formatCurrency(goal.monthly_contribution)}
                        <span className="text-xs text-muted-foreground block">
                            {formatCurrency(goal.monthly_contribution * BRL_RATE, 'BRL')}
                        </span>
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-muted-foreground">Valor Restante</span>
                    <span className={`font-semibold ${remainingAmount > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                        {formatCurrency(Math.max(0, remainingAmount))}
                        <span className="text-xs text-muted-foreground block">
                            {formatCurrency(Math.max(0, remainingAmount) * BRL_RATE, 'BRL')}
                        </span>
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-muted-foreground">Tempo Estimado</span>
                    <span className="font-semibold text-foreground flex items-center">
                        {isCompleted ? (
                            <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                        ) : (
                            <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                        )}
                        {estimatedTimeDisplay}
                    </span>
                </div>
            </div>
        </div>
    );
};