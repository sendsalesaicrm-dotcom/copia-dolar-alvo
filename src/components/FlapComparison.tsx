import React, { useMemo, useState } from 'react';
import { TrendingUp, ArrowUpRight, ShieldCheck, Globe, DollarSign } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FlapEvolutionTable } from './FlapEvolutionTable';
import { AntifragileEvolutionTable } from './AntifragileEvolutionTable';
import { simulateAntifragilePortfolio } from '../utils/finance';

interface FlapProps {
    initialInvestment: number;
    monthlyContribution: number;
    years: number;
    cdiAnnual: number;
    usdRate?: number;
    dollarization?: number;
    appreciation?: number;
    spotRate?: number;
}

export interface FlapMonthlyData {
    month: number;
    initialValue: number;
    valuePlusContribution: number;
    grossValue: number;
    accumulatedYield: number;
    netValue: number;
}

export const FlapComparison: React.FC<FlapProps> = ({
    initialInvestment,
    monthlyContribution,
    years,
    cdiAnnual,
    usdRate = 0.08,
    dollarization = 0.50,
    appreciation = 0.05,
    spotRate = 5.00
}) => {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<'simples' | 'antifragil'>('simples');

    // --- Simulação 1: Apenas BRL ---
    const projection = useMemo(() => {
        const totalMonths = (years || 1) * 12;
        const monthlyRate = Math.pow(1 + cdiAnnual, 1 / 12) - 1;

        let currentGrossBalance = initialInvestment;
        const monthlyData: FlapMonthlyData[] = [];

        const getIRRate = (month: number) => {
            if (month <= 6) return 0.225;
            if (month <= 12) return 0.20;
            if (month <= 23) return 0.175;
            return 0.15;
        };

        for (let i = 1; i <= totalMonths; i++) {
            const initialOfMonth = currentGrossBalance;
            const currentAporte = i === 1 ? 0 : monthlyContribution;
            const valueWithAporte = initialOfMonth + currentAporte;

            const grossValueAtEnd = valueWithAporte * (1 + monthlyRate);
            const totalCashInvested = initialInvestment + ((i - 1) * monthlyContribution);

            const totalGrossProfit = grossValueAtEnd - totalCashInvested;
            const irRate = getIRRate(i);
            const netBalanceSnapshot = totalCashInvested + (totalGrossProfit * (1 - irRate));

            monthlyData.push({
                month: i,
                initialValue: initialOfMonth,
                valuePlusContribution: valueWithAporte,
                grossValue: grossValueAtEnd,
                accumulatedYield: ((grossValueAtEnd / totalCashInvested) - 1) * 100,
                netValue: netBalanceSnapshot
            });

            currentGrossBalance = grossValueAtEnd;
        }

        const totalInvestedFinal = initialInvestment + ((totalMonths - 1) * monthlyContribution);
        const finalGross = currentGrossBalance;
        const finalIR = getIRRate(totalMonths);
        const finalNet = totalInvestedFinal + ((finalGross - totalInvestedFinal) * (1 - finalIR));

        return {
            finalValue: finalNet,
            totalInvested: totalInvestedFinal,
            totalProfit: finalNet - totalInvestedFinal,
            yield: ((finalNet / totalInvestedFinal) - 1) * 100,
            monthlyData
        };
    }, [initialInvestment, monthlyContribution, years, cdiAnnual]);

    // --- Simulação 2: Carteira Antifrágil (Motor Financeiro Externo) ---
    const antifragileProjection = useMemo(() => {
        return simulateAntifragilePortfolio({
            initialAmountBrl: initialInvestment,
            monthlyContributionBrl: monthlyContribution,
            annualRateBrl: cdiAnnual,
            annualRateUsd: usdRate,
            dollarizationPercentage: dollarization,
            dollarAppreciationRate: appreciation,
            currentDollarRate: spotRate,
            years: years || 1
        });
    }, [initialInvestment, monthlyContribution, years, cdiAnnual, usdRate, dollarization, appreciation, spotRate]);

    const formatCurrency = (value: number, currencyType: 'BRL' | 'USD' = 'BRL') => {
        return new Intl.NumberFormat(currencyType === 'BRL' ? 'pt-BR' : 'en-US', {
            style: 'currency',
            currency: currencyType
        }).format(value);
    };

    const formatDynamicValue = (value: number, currencyType: 'BRL' | 'USD' = 'BRL') => {
        const absValue = Math.abs(value);
        if (absValue >= 1000000000) {
            return new Intl.NumberFormat(currencyType === 'BRL' ? 'pt-BR' : 'en-US', {
                style: 'currency',
                currency: currencyType,
                notation: 'compact',
                maximumFractionDigits: 1
            }).format(value);
        }
        return formatCurrency(value, currencyType);
    };

    const getFontSizeClass = (value: number, defaultSize: string, smallSize: string) => {
        const absValue = Math.abs(value);
        return absValue >= 1000000 ? smallSize : defaultSize;
    };

    return (
        <div className="space-y-8">
            {/* --- Renderização Simples (BRL) --- */}
            {activeTab === 'simples' && (
                <div className={`relative overflow-hidden p-8 rounded-[2.5rem] shadow-2xl transition-all duration-500 ${theme === 'dark' ? 'bg-[#1a1a14] border border-white/5' : 'bg-[#ef6037] text-white'}`}>
                    <div className="relative z-10">
                        {/* Header: Icon + Title + Pill */}
                        <div className="flex items-center justify-between mb-12 text-white">
                            <div className="flex items-center gap-4 text-white">
                                <div className={`p-2.5 rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-white/20 border-white/30'}`}>
                                    <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight leading-none text-white">Projeção Tradicional</h3>
                                    <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Evolução com base 100% no Brasil</p>
                                </div>
                            </div>
                        </div>

                        {/* Main Values */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                            <div className="space-y-3">
                                <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>Patrimônio em {years} anos</p>
                                <div className="flex items-center gap-4">
                                    <p className={`font-black text-white tracking-tighter leading-none transition-all ${getFontSizeClass(projection.finalValue, 'text-5xl sm:text-6xl', 'text-4xl sm:text-5xl')}`}>
                                        {formatDynamicValue(projection.finalValue, 'BRL')}
                                    </p>
                                    <ArrowUpRight className={`w-8 h-8 transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1 ${theme === 'dark' ? 'text-white/40 group-hover:text-white' : 'text-white/40 group-hover:text-white'}`} />
                                </div>
                            </div>

                            <div className="md:text-right space-y-3">
                                <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>Lucro Líquido Brasil</p>
                                <div className="flex flex-col md:items-end">
                                    <p className={`font-black tracking-tight text-white transition-all ${getFontSizeClass(projection.totalProfit, 'text-4xl sm:text-5xl', 'text-3xl sm:text-4xl')}`}>
                                        +{formatDynamicValue(projection.totalProfit, 'BRL')}
                                    </p>
                                    <p className={`text-[10px] font-bold italic mt-2 ${theme === 'dark' ? 'text-white/40' : 'text-white/50'}`}>Já descontado IR sobre o lucro</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Info Box */}
                        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-8 pt-10 border-t ${theme === 'dark' ? 'border-white/5' : 'border-white/20'}`}>
                            <div className="flex flex-col gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>Total Investido</span>
                                <span className="text-xl font-bold text-white">{formatCurrency(projection.totalInvested, 'BRL')}</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>Rentabilidade Total</span>
                                <span className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-white'}`}>{projection.yield.toFixed(2)}%</span>
                            </div>
                            <div className="flex flex-col gap-2 sm:items-end">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>Taxa Base (CDI)</span>
                                <span className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-white'}`}>{(cdiAnnual * 100).toFixed(2)}% a.a.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Renderização Híbrida (Antifrágil) --- */}
            {activeTab === 'antifragil' && (
                <div className={`relative overflow-hidden p-8 rounded-[2.5rem] shadow-2xl transition-all duration-500 ${theme === 'dark' ? 'bg-[#1a1a14] border border-[#ef6037]/20 text-white' : 'bg-[#ef6037] text-white'}`}>
                    <div className="relative z-10">
                        {/* Header: Icon + Title + Pill */}
                        <div className="flex items-center justify-between mb-12 text-white">
                            <div className="flex items-center gap-4 text-white">
                                <div className="p-2.5 rounded-xl shadow-lg border bg-white/20 border-white/30">
                                    <Globe className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight leading-none text-white">Carteira Antifrágil</h3>
                                    <p className="text-sm font-medium mt-1 text-white/80">Projeção Híbrida: BRL & USD Reinvestido</p>
                                </div>
                            </div>
                        </div>

                        {/* Main Values - Visão Tripla */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                            {/* Total Equivalente (em BRL) */}
                            <div className="space-y-3 md:col-span-3 border-b border-white/20 pb-8 relative">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">Equivalente Global em Reais</p>
                                <div className="flex items-center gap-4">
                                    <p className={`font-black text-white tracking-tighter leading-none ${getFontSizeClass(antifragileProjection.equivalentTotalBrl, 'text-6xl sm:text-7xl', 'text-5xl sm:text-6xl')}`}>
                                        {formatDynamicValue(antifragileProjection.equivalentTotalBrl, 'BRL')}
                                    </p>
                                    <ArrowUpRight className="w-10 h-10 text-white/50" />
                                </div>
                                <p className="text-[10px] font-bold italic mt-2 text-white/60">Soma da Carteira BR + Carteira US convertida no Câmbio Projetado</p>
                            </div>

                            {/* BRL Restante */}
                            <div className="space-y-3 pt-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-white/50"></div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">Fração Brasil (BRL)</p>
                                </div>
                                <p className={`font-black text-white tracking-tighter transition-all ${getFontSizeClass(antifragileProjection.finalPatrimonyBrl, 'text-4xl', 'text-3xl')}`}>
                                    {formatDynamicValue(antifragileProjection.finalPatrimonyBrl, 'BRL')}
                                </p>
                            </div>

                            {/* Separador visual invisível só pra espaçar no grid caso a tela estique */}
                            <div className="hidden md:flex justify-center items-center">
                                <div className="h-16 w-px bg-white/20"></div>
                            </div>

                            {/* USD Dollarizado */}
                            <div className="space-y-3 pt-4 md:text-right">
                                <div className="flex items-center gap-2 md:justify-end">
                                    <DollarSign className="w-3 h-3 text-white/70" />
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">Fração Americana (USD)</p>
                                </div>
                                <p className={`font-black text-white tracking-tighter transition-all ${getFontSizeClass(antifragileProjection.finalPatrimonyUsd, 'text-4xl', 'text-3xl')}`}>
                                    {formatDynamicValue(antifragileProjection.finalPatrimonyUsd, 'USD')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Seletor de Abas --- */}
            <div className="flex justify-center my-8">
                <div className="bg-muted/50 p-1 rounded-2xl flex items-center shadow-inner">
                    <button
                        onClick={() => setActiveTab('simples')}
                        className={`px-8 py-3 rounded-xl font-black text-sm transition-all duration-300 ${activeTab === 'simples'
                            ? 'bg-[#ef6037] text-white shadow-md shadow-[#ef6037]/20'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Projeção Nacional (BRL)
                    </button>
                    <button
                        onClick={() => setActiveTab('antifragil')}
                        className={`px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all duration-300 ${activeTab === 'antifragil'
                            ? 'bg-[#ef6037] text-white shadow-md shadow-[#ef6037]/20'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Aceleração Antifrágil (BRL + USD)
                    </button>
                </div>
            </div>

            {/* --- Tabelas de Evolução --- */}
            {activeTab === 'simples' && (
                <FlapEvolutionTable data={projection.monthlyData} />
            )}
            {activeTab === 'antifragil' && (
                <AntifragileEvolutionTable data={antifragileProjection.annualData} spotRate={spotRate} />
            )}
        </div>
    );
};
