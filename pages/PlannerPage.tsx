import React, { useState, useCallback, useMemo } from 'react';
import { useTheme } from '../src/context/ThemeContext';
import { Input } from '../components/Input';
import { EvolutionTable } from '../components/EvolutionTable';
import type { ProjectionResult, AnnualData } from '../types';
import {
  Plus,
  Target,
  TrendingUp,
  Wallet,
  Calendar,
  Percent,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  LineChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const BRL_RATE = 4.50;

// Helpers para formatação de moeda (USD com formato numérico PT-BR)
const formatToUSD = (value: string | number) => {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  const cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return '';
  const numericValue = parseInt(cleanValue, 10) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

const parseUSDToNumber = (value: string) => {
  if (!value) return 0;
  const numericString = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(numericString);
};

const formatCurrency = (value: number, currency: 'USD' | 'BRL' = 'USD') => {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };
  const locale: 'en-US' | 'pt-BR' = currency === 'USD' ? 'pt-BR' : 'pt-BR';
  // Note: Using pt-BR for both to keep the "," as decimal separator as per user preference in other screens
  return new Intl.NumberFormat('pt-BR', options).format(value);
};

const DashboardCard = ({ title, value, subValue, description, icon, variant = 'default', trend }: any) => {
  const isPrimary = variant === 'primary';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-2xl shadow-sm border transition-all duration-300 ${isPrimary
        ? 'bg-primary border-primary text-white'
        : 'bg-card border-border text-card-foreground'
        }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-xl ${isPrimary ? 'bg-white/20' : 'bg-primary/10'}`}>
          {React.cloneElement(icon, { className: `w-5 h-5 ${isPrimary ? 'text-white' : 'text-primary'}` })}
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isPrimary ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className={`text-[11px] font-black uppercase tracking-wider mb-1 ${isPrimary ? 'text-white/70' : 'text-muted-foreground'}`}>
          {title}
        </h3>
        <p className={`text-2xl font-black truncate ${isPrimary ? 'text-white' : 'text-foreground'}`}>
          {value}
        </p>
        {(subValue || description) && (
          <div className="mt-2 space-y-1">
            {subValue && <p className={`text-xs font-bold ${isPrimary ? 'text-white/80' : 'text-primary'}`}>{subValue}</p>}
            {description && <p className={`text-[10px] leading-tight ${isPrimary ? 'text-white/60' : 'text-muted-foreground'}`}>{description}</p>}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const PlannerPage: React.FC = () => {
  const { theme } = useTheme();
  const [goal, setGoal] = useState(formatToUSD(300000));
  const [contribution, setContribution] = useState(formatToUSD(200));
  const [rate, setRate] = useState('11');
  const [term, setTerm] = useState('20');
  const [results, setResults] = useState<ProjectionResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const [errors, setErrors] = useState({
    goal: '',
    contribution: '',
    rate: '',
    term: '',
  });

  const contributionInBrl = useMemo(() => {
    const numericContribution = parseUSDToNumber(contribution);
    if (!numericContribution || numericContribution <= 0) return '';
    return `Aprox. ${formatCurrency(numericContribution * BRL_RATE, 'BRL')}`;
  }, [contribution]);

  const validateInputs = () => {
    const newErrors = { goal: '', contribution: '', rate: '', term: '' };
    let isValid = true;
    const numericGoal = parseUSDToNumber(goal);
    const numericContribution = parseUSDToNumber(contribution);
    if (numericGoal <= 0 || isNaN(numericGoal)) { newErrors.goal = 'A meta deve ser um valor positivo.'; isValid = false; }
    if (numericContribution < 0 || isNaN(numericContribution)) { newErrors.contribution = 'O aporte deve ser um valor positivo.'; isValid = false; }
    if (parseFloat(rate) <= 0 || !rate) { newErrors.rate = 'A taxa deve ser positiva.'; isValid = false; }
    if (parseInt(term, 10) <= 0 || !term) { newErrors.term = 'O prazo deve ser positivo.'; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  const calculateProjection = useCallback(() => {
    if (!validateInputs()) {
      setResults(null);
      setShowResults(false);
      return;
    }

    const P = parseUSDToNumber(contribution);
    const targetGoal = parseUSDToNumber(goal);
    const annualRate = parseFloat(rate);
    const years = parseInt(term, 10);

    // Cálculo da Taxa Simples Mensal (i)
    const i = (annualRate / 100) / 12;
    const n = years * 12;

    // Formula 1: Valor Futuro (Juros Simples com aportes mensais)
    const totalInvestedFinal = P * n;
    const totalInterestFinal = P * i * (n * (n + 1) / 2);
    const futureValue = totalInvestedFinal + totalInterestFinal;

    // Formula 2: Aporte Necessário
    const requiredContribution = targetGoal / (n + i * (n * (n + 1) / 2));

    const annualData: AnnualData[] = [];
    for (let m = 0; m <= n; m++) {
      if (m === 0 || m % 12 === 0 || m === n) {
        const totalInvested = P * m;
        const totalInterest = P * i * (m * (m + 1) / 2);
        const currentBalance = totalInvested + totalInterest;
        const year = Math.ceil(m / 12);

        if (!annualData.find(d => d.year === year)) {
          annualData.push({
            year,
            balance: currentBalance,
            totalInvested,
            totalInterest,
          });
        }
      }
    }

    setResults({
      futureValue,
      requiredContribution,
      annualData,
    });
    setShowResults(true);
  }, [goal, contribution, rate, term]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculateProjection();
  };

  const chartData = useMemo(() => {
    if (!results) return null;
    return {
      labels: results.annualData.map(d => `Ano ${d.year}`),
      datasets: [
        {
          label: 'Patrimônio Total',
          data: results.annualData.map(d => d.balance),
          borderColor: '#ef6037',
          backgroundColor: 'rgba(239, 96, 55, 0.1)',
          fill: true,
          tension: 0.1,
          pointRadius: 4,
          pointBackgroundColor: '#ef6037',
          borderWidth: 3,
        },
        {
          label: 'Contribuição Líquida',
          data: results.annualData.map(d => d.totalInvested),
          borderColor: theme === 'dark' ? '#8a8a83' : '#e5e5e5',
          borderDash: [5, 5],
          tension: 0,
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        }
      ]
    };
  }, [results, theme]);

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: { family: 'Plus Jakarta Sans', size: 10, weight: 'bold' as const },
          color: theme === 'dark' ? '#f6f6f6' : '#201d17',
        }
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#2a2721' : '#ffffff',
        titleColor: theme === 'dark' ? '#f6f6f6' : '#201d17',
        bodyColor: theme === 'dark' ? '#f6f6f6' : '#201d17',
        borderColor: '#ef6037',
        borderWidth: 1,
        padding: 12,
        titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' as const },
        bodyFont: { family: 'Plus Jakarta Sans', size: 14, weight: 'black' as const },
        callbacks: {
          label: (context) => ` $ ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: theme === 'dark' ? '#8a8a83' : '#5a5a5a',
          font: { size: 10, weight: 'bold' as const }
        }
      },
      y: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: theme === 'dark' ? '#8a8a83' : '#5a5a5a',
          font: { size: 10, weight: 'bold' as const },
          callback: (value) => `$ ${Number(value).toLocaleString('pt-BR', { notation: 'compact' })}`
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">
        {/* Sidebar Parameters */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card rounded-2xl shadow-sm p-6 border border-border h-fit sticky top-8"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-black text-foreground">Parâmetros</h2>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Ajuste seu planejamento</p>
            </div>
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-[9px] font-black uppercase whitespace-nowrap">
              Juros Simples
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="goal"
              label="Patrimônio Dólar em USD($)"
              labelClassName="text-center"
              className="text-center bg-background/50 font-bold"
              value={goal}
              onChange={(e) => setGoal(formatToUSD(e.target.value))}
              placeholder="300.000,00"
              error={errors.goal}
              icon={<Target className="w-4 h-4" />}
              type="text"
            />
            <Input
              id="contribution"
              label="Aporte Mensal Dólar USD($)"
              labelClassName="text-center"
              className="text-center bg-background/50 font-bold"
              value={contribution}
              onChange={(e) => setContribution(formatToUSD(e.target.value))}
              placeholder="200,00"
              error={errors.contribution}
              icon={<PiggyBank className="w-4 h-4" />}
              type="text"
              helperText={contributionInBrl}
            />
            <Input
              id="rate"
              label="Taxa de Juros Anual (%)"
              labelClassName="text-center"
              className="text-center bg-background/50 font-bold"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="11"
              error={errors.rate}
              icon={<Percent className="w-4 h-4" />}
              type="number"
            />
            <Input
              id="term"
              label="Prazo (anos)"
              labelClassName="text-center"
              className="text-center bg-background/50 font-bold"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="20"
              error={errors.term}
              icon={<Calendar className="w-4 h-4" />}
              type="number"
            />

            <button
              type="submit"
              className="w-full mt-4 py-4 bg-primary text-primary-foreground font-black rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest active:scale-95"
            >
              <BarChart3 className="w-5 h-5" />
              Calcular Projeção
            </button>
          </form>
        </motion.div>

        {/* Main Dashboard Area */}
        <div className="space-y-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {!showResults ? (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full min-h-[400px] flex flex-col items-center justify-center bg-card/30 rounded-2xl border-2 border-dashed border-border p-12 text-center"
              >
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <TrendingUp className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="text-xl font-black text-foreground/40">Sua Projeção Avançada</h3>
                <p className="text-sm text-muted-foreground/60 max-w-xs mt-2 font-medium">Preencha os parâmetros e clique no botão para visualizar a evolução do seu patrimônio.</p>
              </motion.div>
            ) : (
              results && (
                <div key="results" className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                  >
                    <DashboardCard
                      title="Total Investido"
                      value={formatCurrency(parseUSDToNumber(contribution) * (parseInt(term, 10) * 12))}
                      subValue={`Aprox. ${formatCurrency(parseUSDToNumber(contribution) * (parseInt(term, 10) * 12) * BRL_RATE, 'BRL')}`}
                      description="Valor total aplicado no período"
                      icon={<Wallet />}
                    />
                    <DashboardCard
                      title="Juros Acumulados"
                      value={formatCurrency(results.futureValue - (parseUSDToNumber(contribution) * (parseInt(term, 10) * 12)))}
                      subValue={`+${(((results.futureValue / (parseUSDToNumber(contribution) * (parseInt(term, 10) * 12))) - 1) * 100).toFixed(1)}% de retorno`}
                      description="Rentabilidade simples acumulada"
                      icon={<TrendingUp />}
                      trend="Crescimento estável"
                    />
                    <DashboardCard
                      variant="primary"
                      title="Saldo Projetado"
                      value={formatCurrency(results.futureValue)}
                      subValue={`Aprox. ${formatCurrency(results.futureValue * BRL_RATE, 'BRL')}`}
                      description={`Valor estimado em ${term} anos`}
                      icon={<BarChart3 />}
                    />
                  </motion.div>

                  {/* Chart Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card rounded-2xl shadow-sm p-6 border border-border"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <div>
                        <h2 className="text-2xl font-black text-foreground">Acúmulo de Patrimônio</h2>
                        <p className="text-sm text-muted-foreground">Projeção para os próximos {term} anos baseada em juros simples.</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-2 bg-background/50 border border-border px-4 py-2 rounded-xl">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <span className="text-[10px] font-black uppercase text-foreground/70">Projeção Linear</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[400px] w-full relative">
                      {chartData && <Line data={chartData} options={chartOptions} />}
                    </div>
                  </motion.div>

                  {/* Detailed Table */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden"
                  >
                    <EvolutionTable data={results.annualData} />
                  </motion.div>
                </div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PlannerPage;