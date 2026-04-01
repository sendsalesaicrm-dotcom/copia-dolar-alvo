import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FlapMonthlyData } from './FlapComparison';

interface FlapEvolutionTableProps {
    data: FlapMonthlyData[];
}

export const FlapEvolutionTable: React.FC<FlapEvolutionTableProps> = ({ data }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [copied, setCopied] = useState(false);
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

    const handleCopy = () => {
        const headers = ['Mês', 'Valor Inicial', 'Valor + Aporte', 'Valor Bruto', '% Acumulada', 'Rendimento Real (Líquido)'];
        const rows = data.map(item => [
            item.month,
            formatCurrency(item.initialValue),
            formatCurrency(item.valuePlusContribution),
            formatCurrency(item.grossValue),
            formatPercent(item.accumulatedYield),
            formatCurrency(item.netValue),
        ]);
        const tsv = [headers, ...rows].map(r => r.join('\t')).join('\n');
        navigator.clipboard.writeText(tsv).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="mt-12 bg-card rounded-3xl shadow-xl border border-border overflow-hidden">
            <div className="p-8 border-b border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-foreground">Detalhamento Mensal</h3>
                    <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-widest">Projeção Tradicional (Apenas BRL)</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCopy}
                        title="Copiar tabela completa (Excel/Sheets)"
                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tighter border transition-all duration-300 ${
                            copied
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : 'bg-muted/50 text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                        }`}
                    >
                        {copied ? (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Copiado!
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <rect x="9" y="9" width="13" height="13" rx="2" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </svg>
                                Copiar Tabela
                            </>
                        )}
                    </button>
                    <div className="bg-[#ef6037]/10 text-[#ef6037] px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tighter border border-[#ef6037]/20">
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
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Valor Bruto</th>
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
                                    <span className="text-xs font-black text-[#ef6037] bg-[#ef6037]/10 px-2 py-1 rounded-md">
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
