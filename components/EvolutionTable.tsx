import React from 'react';
import type { AnnualData } from '../types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
};

export const EvolutionTable: React.FC<{ data: AnnualData[] }> = ({ data }) => {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-foreground mb-4">Evolução Anual do Patrimônio</h3>
      {/* Adicionando overflow-x-auto para rolagem horizontal em mobile */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ano
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Investido
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Juros Acumulados
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Saldo Acumulado
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {data.map((item) => (
              <tr key={item.year} className="hover:bg-muted/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{item.year}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatCurrency(item.totalInvested)}</td>
                {/* Usando a cor primária (laranja) para destaque positivo */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary font-medium">{formatCurrency(item.totalInterest)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-bold">{formatCurrency(item.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};