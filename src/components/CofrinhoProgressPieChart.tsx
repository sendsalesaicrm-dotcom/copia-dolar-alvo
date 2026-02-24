import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CofrinhoProgressPieChartProps {
  objetivo: number;
  totalMarcado: number;
}

const formatCurrencyBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const CofrinhoProgressPieChart: React.FC<CofrinhoProgressPieChartProps> = ({ objetivo, totalMarcado }) => {
  const achieved = Math.min(totalMarcado, objetivo);
  const remaining = Math.max(0, objetivo - totalMarcado);

  const rootStyle = getComputedStyle(document.documentElement);
  const chart1Color = rootStyle.getPropertyValue('--color-chart-1').trim();
  const mutedColor = rootStyle.getPropertyValue('--color-muted').trim();
  const foregroundColor = rootStyle.getPropertyValue('--color-foreground').trim();
  const cardColor = rootStyle.getPropertyValue('--color-card').trim();

  const data = {
    labels: ['Marcado', 'Restante'],
    datasets: [
      {
        data: [achieved, remaining],
        backgroundColor: [chart1Color, mutedColor],
        borderColor: cardColor,
        borderWidth: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: foregroundColor,
          font: { size: 14 },
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${formatCurrencyBRL(value)}`;
          },
        },
      },
    },
  };

  const pct = objetivo > 0 ? Math.min(100, (totalMarcado / objetivo) * 100) : 0;

  return (
    <div className="relative h-[300px] w-full flex items-center justify-center">
      <Pie data={data} options={options} />
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold text-card-foreground">{pct.toFixed(1)}%</span>
        <span className="text-sm text-card-foreground/70 mt-1">Progresso</span>
      </div>
    </div>
  );
};
