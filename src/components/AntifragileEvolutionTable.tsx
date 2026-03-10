import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AntifragileAnnualData } from '../../types';

interface AntifragileEvolutionTableProps {
    data: AntifragileAnnualData[];
    spotRate: number;
}

export const AntifragileEvolutionTable: React.FC<AntifragileEvolutionTableProps> = ({ data, spotRate }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = data.slice(startIndex, startIndex + itemsPerPage);

    const formatCurrencyBrl = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const formatCurrencyUsd = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    return (
        <div className="mt-12 bg-card rounded-3xl shadow-xl border border-border overflow-hidden">
            <div className="p-8 border-b border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-foreground">Detalhamento Anual (Multimoedas)</h3>
                    <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-widest">Evolução da Carteira Antifrágil</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-[#ef6037]/10 text-[#ef6037] px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tighter border border-[#ef6037]/20">
                        Página {currentPage} de {totalPages}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ano</th>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Investido BRL</th>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Lucro Líquido BRL</th>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Dolarizado (Saque)</th>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-primary uppercase tracking-[0.2em]">Saldo Patrimônio BRL</th>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Saldo Patrimônio USD</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {currentData.map((item) => (
                            <tr key={item.year} className="hover:bg-muted/30 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-foreground">
                                    <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        {item.year}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-medium">
                                    {formatCurrencyBrl(item.totalInvestedBrl)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-foreground font-bold italic">
                                    {formatCurrencyBrl(item.netProfitBrl)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                                        -{formatCurrencyBrl(item.extractedForDollarization)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-[#ef6037]">
                                    {formatCurrencyBrl(item.balanceBrl)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-emerald-500">
                                    {formatCurrencyUsd(item.balanceUsd)}
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
                        <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                    <span className="text-xs font-black text-muted-foreground tracking-widest uppercase">
                        {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl bg-card border border-border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors group"
                    >
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                </div>
            )}
        </div>
    );
};
