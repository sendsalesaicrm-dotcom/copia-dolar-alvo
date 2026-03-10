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
    ChevronRight,
    DollarSign,
    Globe,
    History,
    X
} from 'lucide-react';
import { useTheme } from '../src/context/ThemeContext';
import { FlapComparison } from '../src/components/FlapComparison';
import { PurchasingPowerChart } from '../src/components/PurchasingPowerChart';
import { Input } from '../components/Input';
import { dollarHistory } from '../src/utils/dollarHistory';

const FlapPage: React.FC = () => {
    const { theme } = useTheme();
    const [initialInvestment, setInitialInvestment] = useState('180.000,00');
    const [monthlyContribution, setMonthlyContribution] = useState('10.000,00');
    const [years, setYears] = useState('1');
    const [cdiAnnual, setCdiAnnual] = useState('14.85');
    const [annualRateUsd, setAnnualRateUsd] = useState('8.00');
    const [dollarizationPercentage, setDollarizationPercentage] = useState('50');
    const [dollarAppreciation, setDollarAppreciation] = useState('5.00');
    const [currentDollar, setCurrentDollar] = useState('5.00');
    const [hasSimulated, setHasSimulated] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    React.useEffect(() => {
        const fetchCotacao = async () => {
            try {
                const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
                const data = await response.json();
                if (data && data.USDBRL && data.USDBRL.bid) {
                    const bid = parseFloat(data.USDBRL.bid);
                    const formattedBid = bid.toFixed(2);
                    setCurrentDollar(formattedBid);
                    setActiveSimulation(prev => ({ ...prev, spotRate: bid }));
                }
            } catch (error) {
                console.error('Erro ao buscar cotação do dólar:', error);
            }
        };
        fetchCotacao();
        const intervalo = setInterval(fetchCotacao, 60000);
        return () => clearInterval(intervalo);
    }, []);

    // Estado que controla os valores REAIS da simulação (só muda no clique)
    const [activeSimulation, setActiveSimulation] = useState({
        initial: 180000,
        monthly: 10000,
        years: 1,
        cdi: 14.85,
        usdRate: 8.00,
        dollarization: 50,
        appreciation: 5.00,
        spotRate: 5.00
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
        const newSimulation = {
            initial: parseToNumber(initialInvestment),
            monthly: parseToNumber(monthlyContribution),
            years: yearsNum || 1,
            cdi: parseFloat(cdiAnnual) || 0,
            usdRate: parseFloat(annualRateUsd) || 0,
            dollarization: parseFloat(dollarizationPercentage) || 0,
            appreciation: parseFloat(dollarAppreciation) || 0,
            spotRate: parseFloat(currentDollar) || 5.00
        };

        if (isNaN(yearsNum) || yearsNum < 1) {
            setYears('1');
            setActiveSimulation(newSimulation);
            return;
        }

        setActiveSimulation(newSimulation);
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
                            label="Taxa BRL (CDI %)"
                            className="text-lg font-black bg-muted/30 border-none focus:ring-2 focus:ring-primary/20"
                            value={cdiAnnual}
                            onChange={(e) => setCdiAnnual(e.target.value)}
                            icon={<Percent className="w-4 h-4" />}
                            type="number"
                            placeholder="14.85"
                        />

                        <div className="flex flex-col relative">
                            <Input
                                id="usdRate"
                                label="Taxa USD (%)"
                                className="text-lg font-black bg-muted/30 border-none focus:ring-2 focus:ring-primary/20"
                                value={annualRateUsd}
                                onChange={(e) => setAnnualRateUsd(e.target.value)}
                                icon={<Globe className="w-4 h-4" />}
                                type="number"
                                placeholder="8.00"
                            />
                            <button
                                onClick={(e) => { e.preventDefault(); setShowHistoryModal(true); }}
                                type="button"
                                className="absolute top-[calc(100%+6px)] left-2 z-10 text-[11px] font-black text-[#ef6037] hover:text-[#d35430] hover:underline transition-all flex items-center gap-1"
                            >
                                <History className="w-3.5 h-3.5" />
                                Ver Histórico (1994)
                            </button>
                        </div>

                        <Input
                            id="dollarization"
                            label="% Dolarização do Lucro"
                            className="text-lg font-black bg-muted/30 border-none focus:ring-2 focus:ring-primary/20"
                            value={dollarizationPercentage}
                            onChange={(e) => setDollarizationPercentage(e.target.value)}
                            icon={<ShieldCheck className="w-4 h-4" />}
                            type="number"
                            placeholder="50"
                        />

                        <Input
                            id="appreciation"
                            label="Apreciação Dólar a.a (%)"
                            className="text-lg font-black bg-muted/30 border-none focus:ring-2 focus:ring-primary/20"
                            value={dollarAppreciation}
                            onChange={(e) => setDollarAppreciation(e.target.value)}
                            icon={<TrendingUp className="w-4 h-4" />}
                            type="number"
                            placeholder="5.00"
                        />

                        <Input
                            id="spotRate"
                            label="Cotação Dólar Atual (R$)"
                            className="text-lg font-black bg-muted/50 border-none opacity-70 cursor-not-allowed"
                            value={currentDollar}
                            onChange={(e) => setCurrentDollar(e.target.value)}
                            icon={<DollarSign className="w-4 h-4" />}
                            type="number"
                            placeholder="5.00"
                            readOnly
                            disabled
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
                        className="space-y-8"
                    >
                        <FlapComparison
                            initialInvestment={activeSimulation.initial}
                            monthlyContribution={activeSimulation.monthly}
                            years={activeSimulation.years}
                            cdiAnnual={activeSimulation.cdi / 100}
                            usdRate={activeSimulation.usdRate / 100}
                            dollarization={activeSimulation.dollarization / 100}
                            appreciation={activeSimulation.appreciation / 100}
                            spotRate={activeSimulation.spotRate}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <PurchasingPowerChart />
                        </motion.div>
                    </motion.div>
                )}
            </div>

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col rounded-3xl shadow-2xl ${theme === 'dark' ? 'bg-[#1a1a14] border border-white/10' : 'bg-white'}`}
                    >
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-foreground">Desvalorização Histórica (Real vs Dólar)</h3>
                                <p className="text-sm text-muted-foreground mt-1 font-medium">Dados desde a criação do Plano Real em 1994</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>
                        <div className={`p-6 overflow-y-auto flex-1 space-y-6 ${theme === 'dark' ? 'custom-scrollbar' : ''}`}>
                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-primary/10 rounded-xl mt-0.5">
                                        <History className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground mb-1">Por que usamos 8% de projeção?</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Se calcularmos a Taxa de Crescimento Anual Composta (CAGR) real de 1994 a 2026, o crescimento real do dólar foi de aproximadamente <strong className="text-foreground">5,86% ao ano</strong>. A taxa de <strong className="text-primary">8% ao ano</strong> utilizada nas projeções é uma métrica conservadora de mercado (Regra de Bolso), que considera o histórico do <strong>diferencial de inflação</strong> entre o Brasil (IPCA) e os EUA (CPI), para garantir cenários mais robustos no longo prazo.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase font-black text-muted-foreground tracking-wider border-b border-border">
                                    <tr>
                                        <th className="pb-3 text-center">Ano</th>
                                        <th className="pb-3 text-center">Taxa de Câmbio (R$)</th>
                                        <th className="pb-3 text-center">Variação Anual</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {dollarHistory.filter((row: any) => row.ano !== 'Ano').map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 font-bold text-foreground text-center">{row.ano}</td>
                                            <td className="py-3 font-medium text-foreground text-center">R$ {parseFloat(row.cambio).toFixed(2)}</td>
                                            <td className={`py-3 font-bold text-center ${row.variacao > 0 ? 'text-red-500' : row.variacao < 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                                {row.variacao ? (row.variacao * 100).toFixed(2) + '%' : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default FlapPage;
