import React, { useMemo } from 'react';
import { TrendingUp, Wallet, ArrowUpRight, ShieldCheck } from 'lucide-react';
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

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden p-8 bg-[#ef6037] dark:bg-[#1a1a1a] text-white rounded-2xl shadow-xl border border-white/5 group transition-all duration-500">
                {/* Decorative elements are hidden for a cleaner look as requested, but the background now switches per theme */}

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 border border-white/40 dark:bg-[#ef6037]/20 dark:border-[#ef6037]/50 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-white dark:text-[#ef6037]" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tight">Projeção Antifrágil</h3>
                                <p className="text-sm text-white/80 dark:text-[#ef6037]/80 font-medium">Estratégia 100% do CDI</p>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 dark:bg-[#ef6037]/10 dark:border-[#ef6037]/30 rounded-full">
                            <ShieldCheck className="w-4 h-4 text-white dark:text-[#ef6037]" />
                            <span className="text-xs font-bold text-white dark:text-[#ef6037] uppercase tracking-wider">Seguro e Rentável</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-2">
                            <p className="text-sm font-semibold uppercase tracking-widest text-white/60">Patrimônio em {years} anos</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl sm:text-5xl font-black text-white leading-none">
                                    {formatCurrency(projection.finalValue)}
                                </p>
                                <ArrowUpRight className="w-6 h-6 text-white group-hover:text-green-300 dark:text-green-400 animate-pulse transition-colors" />
                            </div>
                        </div>

                        <div className="md:text-right space-y-2">
                            <p className="text-sm font-semibold uppercase tracking-widest text-white/60">Lucro Líquido Real</p>
                            <p className="text-3xl font-black text-white dark:text-[#ef6037]">
                                +{formatCurrency(projection.totalProfit)}
                            </p>
                            <p className="text-xs font-medium text-white/40 italic">Já descontado 15% de IR sobre o lucro</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-white/10">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Total Investido</span>
                            <span className="text-lg font-bold text-white/80">{formatCurrency(projection.totalInvested)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Rentabilidade Total</span>
                            <span className="text-lg font-bold text-white dark:text-[#ef6037]">{projection.yield.toFixed(2)}%</span>
                        </div>
                        <div className="flex flex-col gap-1 sm:items-end">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Taxa Base (CDI)</span>
                            <span className="text-lg font-bold text-white dark:text-[#ef6037]">{(cdiAnnual * 100).toFixed(2)}% a.a.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Evolution Table */}
            <FlapEvolutionTable data={projection.monthlyData} />
        </div>
    );
};
