import React, { useState, useCallback, useMemo } from 'react';
import { useTheme } from '../src/context/ThemeContext';
import { Input } from '../components/Input';
import { ResultCard } from '../components/ResultCard';
import { EvolutionTable } from '../components/EvolutionTable';
import type { ProjectionResult, AnnualData } from '../types';

// Icons for inputs
const GoalIcon = ({ colorClass }: { colorClass: string }) => <span className={colorClass}>$</span>;
const ContributionIcon = ({ colorClass }: { colorClass: string }) => <span className={colorClass}>$</span>;
const RateIcon = ({ colorClass }: { colorClass: string }) => <span className={colorClass}>%</span>;
const TermIcon = ({ colorClass }: { colorClass: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
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
  const locale: 'en-US' | 'pt-BR' = currency === 'USD' ? 'en-US' : 'pt-BR';
  return new Intl.NumberFormat(locale, options).format(value);
};

const PlannerPage: React.FC = () => {
  const { theme } = useTheme();
  const iconColorClass = theme === 'dark' ? 'text-white' : 'text-muted-foreground';

  const [goal, setGoal] = useState(formatToUSD(300000));
  const [contribution, setContribution] = useState(formatToUSD(200));
  const [rate, setRate] = useState('11');
  const [term, setTerm] = useState('20');
  const [results, setResults] = useState<ProjectionResult | null>(null);
  const [errors, setErrors] = useState({
    goal: '',
    contribution: '',
    rate: '',
    term: '',
  });

  const contributionInBrl = useMemo(() => {
    const numericContribution = parseUSDToNumber(contribution);
    if (!numericContribution || numericContribution <= 0) {
      return '';
    }
    return `Aprox. ${formatCurrency(numericContribution * BRL_RATE, 'BRL')}`;
  }, [contribution]);

  const validateInputs = () => {
    const newErrors = { goal: '', contribution: '', rate: '', term: '' };
    let isValid = true;

    const numericGoal = parseUSDToNumber(goal);
    const numericContribution = parseUSDToNumber(contribution);

    if (numericGoal <= 0 || isNaN(numericGoal)) {
      newErrors.goal = 'A meta deve ser um valor positivo.';
      isValid = false;
    }
    if (numericContribution < 0 || isNaN(numericContribution)) {
      newErrors.contribution = 'O aporte deve ser um valor positivo.';
      isValid = false;
    }
    if (parseFloat(rate) <= 0 || !rate) {
      newErrors.rate = 'A taxa de juros deve ser um valor positivo.';
      isValid = false;
    }
    if (parseInt(term, 10) <= 0 || !term) {
      newErrors.term = 'O prazo deve ser um valor positivo.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const calculateProjection = useCallback(() => {
    if (!validateInputs()) {
      setResults(null);
      return;
    }

    const P = parseUSDToNumber(contribution);
    const targetGoal = parseUSDToNumber(goal);
    const annualRate = parseFloat(rate);
    const years = parseInt(term, 10);

    // Cálculo da Taxa Equivalente Mensal (i)
    const annualRateDecimal = annualRate / 100;
    // i = (1 + R_anual)^(1/12) - 1
    const i = Math.pow(1 + annualRateDecimal, 1 / 12) - 1;

    const n = years * 12;

    // Formula 1: Future Value (using ** operator)
    // VF = P * [((1 + i)^n - 1) / i]
    const futureValue = P * ((((1 + i) ** n) - 1) / i);

    // Formula 2: Required Contribution (using ** operator)
    // P = VF * [i / ((1 + i)^n - 1)]
    const requiredContribution = targetGoal * (i / (((1 + i) ** n) - 1));

    // Annual Data
    const annualData: AnnualData[] = [];
    for (let m = 1; m <= n; m++) {
      if (m % 12 === 0 || m === n) {
        // Recalculate balance for the specific month 'm'
        const currentBalance = P * ((((1 + i) ** m) - 1) / i);
        const year = Math.ceil(m / 12);
        const totalInvested = P * m;
        const totalInterest = currentBalance - totalInvested;

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
  }, [goal, contribution, rate, term]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    calculateProjection();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="bg-card rounded-2xl shadow-xl p-5 sm:p-10 border border-border">
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
            Planejador de Patrimônio
          </h1>
          <p className="mt-3 text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Calcule o futuro do seu patrimônio em dólar com juros compostos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grid ajustado para 2 colunas em sm e 4 em lg */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Input
              id="goal"
              label="Patrimônio Dólar em USD($)"
              value={goal}
              onChange={(e) => setGoal(formatToUSD(e.target.value))}
              placeholder="300.000,00"
              error={errors.goal}
              icon={<GoalIcon colorClass={iconColorClass} />}
              type="text"
            />
            <Input
              id="contribution"
              label="Aporte Mensal Dólar USD($)"
              value={contribution}
              onChange={(e) => setContribution(formatToUSD(e.target.value))}
              placeholder="200,00"
              error={errors.contribution}
              icon={<ContributionIcon colorClass={iconColorClass} />}
              type="text"
              helperText={contributionInBrl}
            />
            <Input
              id="rate"
              label="Taxa de Juros Anual (%)"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="11"
              error={errors.rate}
              icon={<RateIcon colorClass={iconColorClass} />}
              type="number"
            />
            <Input
              id="term"
              label="Prazo (anos)"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="20"
              error={errors.term}
              icon={<TermIcon colorClass={iconColorClass} />}
              type="number"
            />
          </div>
          <div className="flex justify-center pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto px-12 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md border border-input hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-75 transition-transform transform hover:scale-[1.02]"
            >
              Calcular Projeção
            </button>
          </div>
        </form>

        {results && (
          <div className="mt-10 pt-8 border-t border-border">
            {/* Grid ajustado para 1 coluna em mobile e 2 em md */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResultCard
                title="Valor Final Projetado"
                value={formatCurrency(results.futureValue)}
                subValue={`Aprox. ${formatCurrency(results.futureValue * BRL_RATE, 'BRL')}`}
                description={`Com aportes de ${formatCurrency(parseUSDToNumber(contribution))} (aprox. ${formatCurrency(parseUSDToNumber(contribution) * BRL_RATE, 'BRL')}) por mês, você terá este valor.`}
                textColorClass="text-green-600 dark:text-green-400"
              />
              <ResultCard
                title="Aporte Necessário"
                value={formatCurrency(results.requiredContribution)}
                subValue={`Aprox. ${formatCurrency(results.requiredContribution * BRL_RATE, 'BRL')}`}
                description={`Para atingir sua meta de ${formatCurrency(parseUSDToNumber(goal))} no prazo definido.`}
                textColorClass="text-blue-600 dark:text-blue-400"
              />
            </div>
            <EvolutionTable data={results.annualData} />
          </div>
        )}
      </div>


    </div>
  );
};

export default PlannerPage;