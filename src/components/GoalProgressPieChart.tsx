import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { FinancialGoal } from '../../types';

// Register Chart.js components required for Pie/Doughnut charts
ChartJS.register(ArcElement, Tooltip, Legend);

interface GoalProgressPieChartProps {
  goal: FinancialGoal;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
};

export const GoalProgressPieChart: React.FC<GoalProgressPieChartProps> = ({ goal }) => {
    const achieved = Math.min(goal.current_amount, goal.target_amount);
    const remaining = Math.max(0, goal.target_amount - goal.current_amount);
    const isCompleted = achieved >= goal.target_amount;

    // Fetch colors from CSS variables
    const rootStyle = getComputedStyle(document.documentElement);
    const chart1Color = rootStyle.getPropertyValue('--color-chart-1').trim(); // Primary color for achieved
    const mutedColor = rootStyle.getPropertyValue('--color-muted').trim(); // Muted color for remaining
    const foregroundColor = rootStyle.getPropertyValue('--color-foreground').trim();
    const cardColor = rootStyle.getPropertyValue('--color-card').trim();

    const data = {
        labels: ['Alcançado', 'Restante'],
        datasets: [
            {
                data: [achieved, remaining],
                backgroundColor: [chart1Color, mutedColor],
                borderColor: cardColor, // Use card background for border to make segments pop
                borderWidth: 5,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%', // Doughnut style
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: foregroundColor,
                    font: {
                        size: 14,
                    },
                    padding: 20,
                },
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        return `${label}: ${formatCurrency(value)}`;
                    }
                }
            }
        },
    };
    
    const completionPercentage = (goal.current_amount / goal.target_amount) * 100;
    const displayPercentage = Math.min(100, completionPercentage).toFixed(1);

    return (
        <div className="relative h-[300px] w-full flex items-center justify-center">
            <Pie data={data} options={options} />
            {/* Center Text for Sophistication */}
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-foreground">{displayPercentage}%</span>
                <span className="text-sm text-muted-foreground mt-1">{isCompleted ? 'Meta Concluída' : 'Progresso'}</span>
            </div>
        </div>
    );
};