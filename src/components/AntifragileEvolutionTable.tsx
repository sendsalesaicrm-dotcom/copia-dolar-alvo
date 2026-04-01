import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { AntifragileAnnualData } from '../../types';

interface AntifragileEvolutionTableProps {
    data: AntifragileAnnualData[];
    spotRate: number;
    usdRate?: number; // Adicionada a taxa USD dinâmica
}

export const AntifragileEvolutionTable: React.FC<AntifragileEvolutionTableProps> = ({ data, spotRate, usdRate = 0.08 }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [copied, setCopied] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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

    const toggleRow = (year: number) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(year)) {
                next.delete(year);
            } else {
                next.add(year);
            }
            return next;
        });
    };

    const handleCopy = () => {
        const headers = [
            'Ano',
            'Total Investido BRL',
            'Lucro Gerado no Ano',
            'Dolarizado (Saque)',
            'Retido no Brasil',
            'Lucro Acumulado Retido',
            'Saldo Patrimônio BRL',
            'Saldo Patrimônio USD',
        ];
        const rows = data.map(item => [
            item.year,
            formatCurrencyBrl(item.totalInvestedBrl),
            formatCurrencyBrl(item.yearlyGeneratedProfitBrl),
            formatCurrencyBrl(item.extractedForDollarization),
            formatCurrencyBrl(item.yearlyGeneratedProfitBrl - item.extractedForDollarization),
            formatCurrencyBrl(item.netProfitBrl),
            formatCurrencyBrl(item.balanceBrl),
            formatCurrencyUsd(item.balanceUsd),
        ]);
        const tsv = [headers, ...rows].map(r => r.join('\t')).join('\n');
        navigator.clipboard.writeText(tsv).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="mt-12 bg-card rounded-3xl shadow-xl border border-border overflow-hidden w-full">
            {/* Cabeçalho do Card */}
            <div className="p-6 sm:p-8 border-b border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg sm:text-xl font-black text-foreground">Detalhamento Anual</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 uppercase font-bold tracking-widest">Evolução Multimoedas</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCopy}
                        title="Copiar tabela"
                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tighter border transition-all duration-300 ${
                            copied
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : 'bg-muted/50 text-muted-foreground border-border hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30'
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
                                Copiar
                            </>
                        )}
                    </button>
                    <div className="bg-[#ef6037]/10 text-[#ef6037] px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tighter border border-[#ef6037]/20">
                        Pág {currentPage} de {totalPages}
                    </div>
                </div>
            </div>

            {/* Tabela Responsiva Flexbox */}
            <div className="w-full flex flex-col">
                {/* Cabeçalho da Tabela */}
                <div className="flex items-center w-full px-3 sm:px-6 py-3 sm:py-4 bg-muted/50 border-b border-border">
                    <div className="w-8 sm:w-12 shrink-0"></div>
                    <div className="w-10 sm:w-16 shrink-0 text-left text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ano</div>
                    {/* Esconde a coluna de Investido no mobile para evitar aperto */}
                    <div className="hidden sm:block flex-1 text-left text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Investido</div>
                    <div className="flex-1 text-right text-[9px] sm:text-[10px] font-black text-[#ef6037] uppercase tracking-[0.2em]">Saldo BRL</div>
                    <div className="flex-1 text-right text-[9px] sm:text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Saldo USD</div>
                </div>

                {/* Corpo da Tabela */}
                <div className="flex flex-col w-full divide-y divide-border bg-card">
                    {currentData.map((item) => {
                        const isExpanded = expandedRows.has(item.year);
                        
                        return (
                            <div key={item.year} className="flex flex-col w-full group">
                                {/* Linha Principal (Sempre Visível) */}
                                <div 
                                    onClick={() => toggleRow(item.year)}
                                    className={`flex items-center w-full px-3 sm:px-6 py-3 sm:py-4 cursor-pointer transition-colors hover:bg-muted/30 ${isExpanded ? 'bg-muted/10' : ''}`}
                                >
                                    <div className="w-8 sm:w-12 shrink-0 flex justify-start sm:justify-center">
                                        {isExpanded ? 
                                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 transition-transform" /> : 
                                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-foreground transition-transform" />
                                        }
                                    </div>
                                    <div className="w-10 sm:w-16 shrink-0 flex items-center">
                                        <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${isExpanded ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                            {item.year}
                                        </span>
                                    </div>
                                    <div className="hidden sm:block flex-1 text-xs sm:text-sm font-medium text-muted-foreground">
                                        {formatCurrencyBrl(item.totalInvestedBrl)}
                                    </div>
                                    <div className="flex-1 text-right text-[11px] sm:text-sm font-black text-[#ef6037] tracking-tighter sm:tracking-normal">
                                        {formatCurrencyBrl(item.balanceBrl)}
                                    </div>
                                    <div className="flex-1 text-right text-[11px] sm:text-sm font-black text-emerald-500 tracking-tighter sm:tracking-normal">
                                        {formatCurrencyUsd(item.balanceUsd)}
                                    </div>
                                </div>

                                {/* Linha Expandida (Detalhes e Memória de Cálculo) */}
                                {isExpanded && (
                                    <div className="w-full bg-muted/5 border-t border-border/50 px-4 sm:px-8 py-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                                            
                                            {/* Bloco Brasil */}
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-[#ef6037] mb-3 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef6037]"></span>
                                                    Detalhamento Brasil
                                                </h4>
                                                <div className="space-y-2.5 text-xs">
                                                    {/* Mostra o Investido no mobile já que está escondido na linha principal */}
                                                    <div className="flex justify-between sm:hidden text-muted-foreground border-b border-border/30 pb-2 mb-2">
                                                        <span>Total Investido:</span>
                                                        <span className="font-bold text-foreground">{formatCurrencyBrl(item.totalInvestedBrl)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-muted-foreground">
                                                        <span>Lucro Gerado no Ano:</span>
                                                        <span className="font-medium text-foreground">{formatCurrencyBrl(item.yearlyGeneratedProfitBrl)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-emerald-500/70">
                                                        <span>Dolarizado (Saque):</span>
                                                        <span className="font-medium">-{formatCurrencyBrl(item.extractedForDollarization)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[#ef6037]/80 border-b border-border/50 pb-2">
                                                        <span>Retido no Brasil:</span>
                                                        <span className="font-medium">+{formatCurrencyBrl(item.yearlyGeneratedProfitBrl - item.extractedForDollarization)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-foreground pt-1">
                                                        <span className="font-bold">Lucro Acumulado Retido:</span>
                                                        <span className="font-black italic">{formatCurrencyBrl(item.netProfitBrl)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bloco Estados Unidos (Memória de Cálculo) */}
                                            <div className="space-y-4 bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-sm">
                                                <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-emerald-500 mb-3 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    Memória de Cálculo USD
                                                </h4>
                                                <div className="space-y-2.5 text-xs">
                                                    <div className="flex justify-between text-muted-foreground">
                                                        <span>Saldo Anterior:</span>
                                                        <span className="font-medium text-foreground">{formatCurrencyUsd(item.previousUsdBalance || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-emerald-500">
                                                        {/* AQUI ESTÁ A MUDANÇA: Exibe o percentual de forma dinâmica */}
                                                        <span>+ Rendimento ({(usdRate * 100).toFixed(1).replace('.0', '')}%):</span>
                                                        <span className="font-bold">+{formatCurrencyUsd(item.usdInterestEarned || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-emerald-500 border-b border-border/50 pb-2">
                                                        <span>+ Novo Aporte:</span>
                                                        <span className="font-bold">+{formatCurrencyUsd(item.usdBoughtThisYear || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-foreground pt-1">
                                                        <span className="font-bold">Saldo Final do Ano:</span>
                                                        <span className="font-black text-emerald-500">{formatCurrencyUsd(item.balanceUsd)}</span>
                                                    </div>
                                                    <div className="text-[9px] sm:text-[10px] text-muted-foreground italic text-right pt-2 opacity-60">
                                                        (Câmbio na compra: {formatCurrencyBrl(item.exchangeRateUsed || 0)})
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
                <div className="p-4 sm:p-6 border-t border-border bg-muted/5 flex items-center justify-center gap-6">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl bg-card border border-border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors group"
                    >
                        <ChevronLeft className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                    <span className="text-[10px] sm:text-xs font-black text-muted-foreground tracking-widest uppercase">
                        {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl bg-card border border-border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors group"
                    >
                        <ChevronRight className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                </div>
            )}
        </div>
    );
};