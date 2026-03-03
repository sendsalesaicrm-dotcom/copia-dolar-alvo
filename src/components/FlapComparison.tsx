import React, { useMemo } from 'react';
import { TrendingUp, Wallet, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FlapEvolutionTable } from './FlapEvolutionTable';

interface FlapProps {
    initialInvestment: number;
    monthlyContribution: number;
    years: number;
    cdiAnnual: number; // Ex: 0.1485 para 14.85%
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
    cdiAnnual
}) => {
    const { theme } = useTheme();

    const projection = useMemo(() => {
        const totalMonths = (years || 1) * 12;
        const monthlyRate = Math.pow(1 + cdiAnnual, 1 / 12) - 1;

        let currentGrossBalance = initialInvestment;
        const monthlyData: FlapMonthlyData[] = [];

        // Tabela Regressiva de IR baseada em meses para bater com a planilha
        const getIRRate = (month: number) => {
            if (month <= 6) return 0.225;  // Mês 1 a 6: 22,5%
            if (month <= 12) return 0.20;  // Mês 7 a 12: 20%
            if (month <= 23) return 0.175; // Mês 13 a 23: 17,5%
            return 0.15;                  // Mês 24 em diante: 15%
        };

        for (let i = 1; i <= totalMonths; i++) {
            const initialOfMonth = currentGrossBalance;

            // Mês 1 não tem aporte extra
            const currentAporte = i === 1 ? 0 : monthlyContribution;
            const valueWithAporte = initialOfMonth + currentAporte;

            // Juros compostos mensais
            const grossValueAtEnd = valueWithAporte * (1 + monthlyRate);

            // Capital que saiu do bolso
            const totalCashInvested = initialInvestment + ((i - 1) * monthlyContribution);

            // Lucro Bruto acumulado para cálculo do IR
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

            // A planilha reinveste o valor BRUTO para o mês seguinte
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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDynamicValue = (value: number) => {
        const absValue = Math.abs(value);
        if (absValue >= 1000000000) { // Billions: > 10 digits (roughly)
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
                maximumFractionDigits: 1
            }).format(value);
        }
        return formatCurrency(value);
    };

    const getFontSizeClass = (value: number, defaultSize: string, smallSize: string) => {
        const absValue = Math.abs(value);
        return absValue >= 1000000 ? smallSize : defaultSize;
    };

    return (
        <div className="space-y-8">
            <div className={`relative overflow-hidden p-8 rounded-[2.5rem] shadow-2xl transition-all duration-500 ${theme === 'dark' ? 'bg-[#1a1a14] border border-white/5' : 'bg-[#ef6037] text-white'}`}>
                <div className="relative z-10">
                    {/* Header: Icon + Title + Pill */}
                    <div className="flex items-center justify-between mb-12 text-white">
                        <div className="flex items-center gap-4 text-white">
                            <div className={`p-2.5 rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-white/20 border-white/30'}`}>
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tight leading-none text-white">Projeção Antifrágil</h3>
                                <p className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Estratégia 100% do CDI</p>
                            </div>
                        </div>
                        <div className={`hidden sm:flex px-6 py-2 backdrop-blur-sm rounded-full border ${theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-white/20 border-white/10'}`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-white'}`}>Seguro e Rentável</span>
                        </div>
                    </div>

                    {/* Main Values */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                        <div className="space-y-3">
                            <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>Patrimônio em {years} anos</p>
                            <div className="flex items-center gap-4">
                                <p className={`font-black text-white tracking-tighter leading-none transition-all ${getFontSizeClass(projection.finalValue, 'text-5xl sm:text-6xl', 'text-4xl sm:text-5xl')}`}>
                                    {formatDynamicValue(projection.finalValue)}
                                </p>
                                <ArrowUpRight className={`w-8 h-8 transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1 ${theme === 'dark' ? 'text-white/40 group-hover:text-white' : 'text-white/40 group-hover:text-white'}`} />
                            </div>
                        </div>

                        <div className="md:text-right space-y-3">
                            <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>Lucro Líquido Real</p>
                            <div className="flex flex-col md:items-end">
                                <p className={`font-black tracking-tight text-white transition-all ${getFontSizeClass(projection.totalProfit, 'text-4xl sm:text-5xl', 'text-3xl sm:text-4xl')}`}>
                                    +{formatDynamicValue(projection.totalProfit)}
                                </p>
                                <p className={`text-[10px] font-bold italic mt-2 ${theme === 'dark' ? 'text-white/40' : 'text-white/50'}`}>Já descontado 15% de IR sobre o lucro</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Info Box */}
                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-8 pt-10 border-t ${theme === 'dark' ? 'border-white/5' : 'border-white/20'}`}>
                        <div className="flex flex-col gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>Total Investido</span>
                            <span className="text-xl font-bold text-white">{formatCurrency(projection.totalInvested)}</span>
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

            {/* Monthly Evolution Table */}
            <FlapEvolutionTable data={projection.monthlyData} />
        </div>
    );
};
