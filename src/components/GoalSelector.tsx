import React from 'react';
import type { FinancialGoal } from '../../types';
import { ChevronDown } from 'lucide-react';

interface GoalSelectorProps {
  goals: FinancialGoal[];
  selectedGoalId: string | null;
  onSelectGoal: (goalId: string | null) => void;
}

export const GoalSelector: React.FC<GoalSelectorProps> = ({ goals, selectedGoalId, onSelectGoal }) => {
  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  const placeholder = goals.length === 0 ? 'Nenhuma meta cadastrada' : 'Selecione uma meta';

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onSelectGoal(value === 'all' ? null : value);
  };

  return (
    <div className="relative w-full max-w-xs">
      <select
        value={selectedGoalId || 'all'}
        onChange={handleSelectChange}
        className="appearance-none block w-full pl-4 pr-10 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-ring focus:border-ring sm:text-sm cursor-pointer border-input"
        disabled={goals.length === 0}
      >
        <option value="all">{placeholder}</option>
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );
};