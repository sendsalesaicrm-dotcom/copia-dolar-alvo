import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FlapMonthlyData } from './FlapComparison';

interface FlapEvolutionTableProps {
    data: FlapMonthlyData[];
}

export const FlapEvolutionTable: React.FC<FlapEvolutionTableProps> = ({ data }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = data.slice(startIndex, startIndex + itemsPerPage);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const formatPercent = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value / 100);
    };

    return (
        <div className="mt-12 bg-card rounded-3xl shadow-xl border border-border overflow-hidden">
            <div className="p-8 border-b border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-foreground">Detalhamento Mensal</h3>
                    <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-widest">Evolução da Carteira Antifrágil</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/10 text-blue-500 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tighter border border-blue-500/20">
                        Página {currentPage} de {totalPages}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Mês</th>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Valor Inicial</th>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Valor + Aporte</th>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Valor Bruto Antifrágil</th>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">% Acumulada</th>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-primary uppercase tracking-[0.2em]">Rendimento Real (Líquido)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {currentData.map((item) => (
                            <tr key={item.month} className="hover:bg-muted/30 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-foreground">
                                    <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        {item.month}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-medium">
                                    {formatCurrency(item.initialValue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-foreground font-bold italic">
                                    {formatCurrency(item.valuePlusContribution)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-foreground font-bold">
                                    {formatCurrency(item.grossValue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-xs font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md">
                                        {formatPercent(item.accumulatedYield)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm font-black text-[#ef6037] group-hover:scale-105 transition-transform inline-block">
                                        {formatCurrency(item.netValue)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="p-6 border-t border-border bg-muted/5 flex items-center justify-center gap-6">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl bg-card border border-border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors group"
                    >
                        <ChevronLeft className="w-5 h-5 text-foreground group-hover:-translate-x-0.5 transition-transform" />
                    </button>

                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === i + 1
                                    ? 'bg-primary text-primary-foreground shadow-lg scale-110'
                                    : 'hover:bg-muted text-muted-foreground'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl bg-card border border-border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors group"
                    >
                        <ChevronRight className="w-5 h-5 text-foreground group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            )}
        </div>
    );
};
