import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Wallet,
    PiggyBank,
    Calendar,
    Percent,
    ArrowRight,
    ShieldCheck,
    Zap,
    ChevronRight
} from 'lucide-react';
import { useTheme } from '../src/context/ThemeContext';
import { FlapComparison } from '../src/components/FlapComparison';
import { Input } from '../components/Input';

const FlapPage: React.FC = () => {
    const { theme } = useTheme();
    const [initialInvestment, setInitialInvestment] = useState('180.000,00');
    const [monthlyContribution, setMonthlyContribution] = useState('10.000,00');
    const [years, setYears] = useState('1');
    const [cdiAnnual, setCdiAnnual] = useState('14.85');
    const [hasSimulated, setHasSimulated] = useState(false);

    // Estado que controla os valores REAIS da simulação (só muda no clique)
    const [activeSimulation, setActiveSimulation] = useState({
        initial: 180000,
        monthly: 10000,
        years: 1,
        cdi: 14.85
    });

    const formatToCurrencyNumber = (value: string) => {
        const cleanValue = value.replace(/\D/g, '');
        if (!cleanValue) return '';
        const numericValue = parseInt(cleanValue, 10) / 100;
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numericValue);
    };

    const parseToNumber = (value: string) => {
        if (!value) return 0;
        const numericString = value.replace(/\./g, '').replace(',', '.');
        return parseFloat(numericString);
    };

    const handleInitialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInitialInvestment(formatToCurrencyNumber(e.target.value));
    };

    const handleMonthlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMonthlyContribution(formatToCurrencyNumber(e.target.value));
    };

    const handleExplore = () => {
        const yearsNum = parseInt(years);
        if (isNaN(yearsNum) || yearsNum < 1) {
            setYears('1');
            setActiveSimulation({
                initial: parseToNumber(initialInvestment),
                monthly: parseToNumber(monthlyContribution),
                years: 1,
                cdi: parseFloat(cdiAnnual) || 0
            });
            return;
        }

        setActiveSimulation({
            initial: parseToNumber(initialInvestment),
            monthly: parseToNumber(monthlyContribution),
            years: yearsNum,
            cdi: parseFloat(cdiAnnual) || 0
        });
        setHasSimulated(true);
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
            {/* Header Section */}
            <div className="mb-12">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-center"
                >
                    <h1 className={`text-4xl md:text-5xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-[#ef6037]'}`}>
                        Carteira Antifrágil
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl font-medium mx-auto">
                        Projete o crescimento do seu patrimônio com a nossa estratégia otimizada de CDI.
                        Simule aportes, prazos e veja o poder do juro composto trabalhando para você.
                    </p>
                </motion.div>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Simulator Controls - Now at the Top */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-3xl shadow-xl border border-border p-8"
                >
                    <div className="flex flex-col items-center justify-center text-center gap-3 mb-10">
                        <div className="p-3 bg-primary/10 rounded-2xl shadow-sm border border-primary/5">
                            <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-foreground tracking-tight">Simulador</h2>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Ajuste os valores abaixo</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        <Input
                            id="initial"
                            label="Investimento Inicial (R$)"
                            className="text-lg font-black bg-muted/30 border-none focus:ring-2 focus:ring-primary/20"
                            value={initialInvestment}
                            onChange={handleInitialChange}
                            icon={<Wallet className="w-4 h-4" />}
                            type="text"
                            placeholder="0,00"
                        />

                        <Input
                            id="monthly"
                            label="Aporte Mensal (R$)"
                            className="text-lg font-black bg-muted/30 border-none focus:ring-2 focus:ring-primary/20"
                            value={monthlyContribution}
                            onChange={handleMonthlyChange}
                            icon={<PiggyBank className="w-4 h-4" />}
                            type="text"
                            placeholder="0,00"
                        />

                        <Input
                            id="years"
                            label="Anos"
                            className="text-lg font-black bg-muted/30 border-none focus:ring-2 focus:ring-primary/20"
                            value={years}
                            onChange={(e) => setYears(e.target.value)}
                            icon={<Calendar className="w-4 h-4" />}
                            type="number"
                            placeholder="1"
                            min="1"
                        />

                        <Input
                            id="cdi"
                            label="CDI Anual (%)"
                            className="text-lg font-black bg-muted/30 border-none focus:ring-2 focus:ring-primary/20"
                            value={cdiAnnual}
                            onChange={(e) => setCdiAnnual(e.target.value)}
                            icon={<Percent className="w-4 h-4" />}
                            type="number"
                            placeholder="11.15"
                        />
                    </div>

                    <div className="mt-8 flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[#ef6037] mb-1">
                                <ChevronRight className="w-3 h-3 text-[#ef6037]" />
                                Dica de Especialista
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                Aportes mensais constantes são mais eficazes do que grandes aportes únicos devido ao efeito dos juros sobre juros.
                            </p>
                        </div>

                        <button
                            onClick={handleExplore}
                            className="w-full md:w-auto h-full px-8 py-4 bg-[#ef6037] text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all group shadow-lg shadow-[#ef6037]/20"
                        >
                            EXPLORAR ESTRATÉGIA
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </motion.div>

                {/* Main Results Area */}
                {hasSimulated && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <FlapComparison
                            initialInvestment={activeSimulation.initial}
                            monthlyContribution={activeSimulation.monthly}
                            years={activeSimulation.years}
                            cdiAnnual={activeSimulation.cdi / 100}
                        />
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default FlapPage;
