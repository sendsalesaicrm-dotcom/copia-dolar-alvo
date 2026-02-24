import React, { useEffect, useState } from 'react';
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
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Registrando os elementos do Chart.js
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

interface ExchangeRateChartProps {
  currency?: string;
  setCurrency?: (currency: string) => void;
}

export const ExchangeRateChart: React.FC<ExchangeRateChartProps> = ({
  currency: externalCurrency,
  setCurrency: externalSetCurrency
}) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('1m');

  // Use local state only if props are not provided (fallback)
  const [localCurrency, setLocalCurrency] = useState('USD-BRL');
  const currency = externalCurrency || localCurrency;
  const setCurrency = externalSetCurrency || setLocalCurrency;

  const [variation, setVariation] = useState<{ diff: number; percent: number } | null>(null);

  const ranges = [
    { label: '1D', value: '1d', days: 2 },
    { label: '5D', value: '5d', days: 5 },
    { label: '1M', value: '1m', days: 30 },
    { label: '1A', value: '1y', days: 365 },
    { label: '5A', value: '5y', days: 1825 },
  ];

  const currencies = [
    { label: 'USD: Dólar', value: 'USD-BRL', color: 'rgb(239, 96, 55)', bgColor: 'rgba(239, 96, 55, 0.2)' },
    { label: 'EUR: Euro', value: 'EUR-BRL', color: 'rgb(239, 96, 55)', bgColor: 'rgba(239, 96, 55, 0.2)' },
    { label: 'BTC: Bitcoin', value: 'BTC-BRL', color: 'rgb(239, 96, 55)', bgColor: 'rgba(239, 96, 55, 0.2)' },
    { label: 'ETH: Ethereum', value: 'ETH-BRL', color: 'rgb(239, 96, 55)', bgColor: 'rgba(239, 96, 55, 0.2)' },
  ];

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        let labels: string[] = [];
        let values: number[] = [];

        if (range === '1d') {
          // Intraday data from sequential endpoint
          const response = await fetch(`https://economia.awesomeapi.com.br/${currency}/1000`);
          const data = await response.json();

          const sortedData = [...data].reverse();

          // Filter for records from TODAY (since midnight)
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const filteredData = sortedData.filter((item: any) => {
            const itemDate = new Date(item.timestamp * 1000);
            return itemDate >= today;
          });

          // If few data points for today (market just opened or weekend), show last ~100 points
          const finalData = filteredData.length > 5 ? filteredData : sortedData.slice(-100);

          labels = finalData.map((item: any) => {
            const date = new Date(item.timestamp * 1000);
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          });
          values = finalData.map((item: any) => parseFloat(item.ask));
        } else {
          // Historical daily data
          const selectedRange = ranges.find(r => r.value === range);
          const days = selectedRange ? selectedRange.days : 30;

          const response = await fetch(`https://economia.awesomeapi.com.br/json/daily/${currency}/${days}`);
          const data = await response.json();

          const sortedData = [...data].reverse();
          labels = sortedData.map((item: any) => {
            const date = new Date(item.timestamp * 1000);
            if (range === '1y' || range === '5y') {
              return date.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' });
            }
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          });
          values = sortedData.map((item: any) => parseFloat(item.ask));
        }

        // Calcular variação
        if (values.length >= 2) {
          const first = values[0];
          const last = values[values.length - 1];
          const diff = last - first;
          const percent = (diff / first) * 100;
          setVariation({ diff, percent });
        }

        const currentCurrency = currencies.find(c => c.value === currency) || currencies[0];

        setChartData({
          labels,
          datasets: [
            {
              label: `Cotação ${currentCurrency.label} (R$)`,
              data: values,
              borderColor: currentCurrency.color,
              backgroundColor: (context: any) => {
                const ctx = context.chart.ctx;
                const chart = context.chart;
                const { chartArea } = chart;

                if (!chartArea) return null;

                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                const color = currentCurrency.color;

                // Extrair as cores do rgb(...)
                const rgb = color.match(/\d+/g);
                if (rgb) {
                  const [r, g, b] = rgb;
                  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.4)`); // Mais forte no topo
                  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);   // Transparente na base
                } else {
                  gradient.addColorStop(0, currentCurrency.bgColor);
                  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                }

                return gradient;
              },
              fill: true,
              tension: 0.4, // Um pouco mais suave
              pointRadius: 0,
              pointHoverRadius: 6,
              borderWidth: 3, // Linha mais grossa para destaque
            },
          ],
        });
      } catch (error) {
        console.error("Erro ao buscar histórico:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, [range, currency]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(20, 20, 19, 0.95)',
        titleColor: '#f6f6f6',
        bodyColor: '#e5e5e5',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          label: function (context: any) {
            const val = context.parsed.y;
            const isBtc = currency === 'BTC-BRL';
            return ' R$ ' + val.toLocaleString('pt-BR', {
              minimumFractionDigits: isBtc ? 0 : 3,
              maximumFractionDigits: isBtc ? 0 : 3
            });
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 7,
          font: { size: 11 },
          color: (context: any) => {
            // Se o fundo for laranja/escuro (modo dark ou bg-orange), usamos branco. 
            // Mas o usuário quer PRETO no modo claro (onde o fundo do card agora é cinza claro #f6f6f6)
            const isDark = document.documentElement.classList.contains('dark');
            return isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(32, 29, 23, 0.7)';
          }
        }
      },
      y: {
        grid: {
          color: (context: any) => {
            const isDark = document.documentElement.classList.contains('dark');
            return isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
          }
        },
        ticks: {
          font: { size: 11 },
          color: (context: any) => {
            const isDark = document.documentElement.classList.contains('dark');
            return isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(32, 29, 23, 0.7)';
          },
          callback: function (value: any) {
            const isBtc = currency === 'BTC-BRL';
            if (isBtc && value >= 1000) {
              return 'R$ ' + (value / 1000).toFixed(0) + 'k';
            }
            return 'R$ ' + value.toFixed(isBtc ? 0 : 2);
          }
        }
      }
    }
  };

  const selectedCurrencyLabel = currencies.find(c => c.value === currency)?.label || 'Moeda';

  return (
    <div className="w-full bg-card rounded-2xl shadow-lg p-6 sm:p-8 border border-border">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 items-center text-center sm:text-left">
          <div className="flex flex-col items-center sm:items-start">
            <h2 className="text-xl font-bold text-card-foreground">Histórico de Cotações</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-3 items-center sm:items-start">
              {variation && (
                <div className={`flex items-center text-sm font-bold ${variation.percent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {variation.percent >= 0 ? '▲' : '▼'} {Math.abs(variation.percent).toFixed(2)}%
                  <span className="ml-1 font-medium opacity-80">(R$ {Math.abs(variation.diff).toLocaleString('pt-BR', { maximumFractionDigits: 2 })})</span>
                </div>
              )}
            </div>
          </div>

          {/* Seletor de Moeda */}
          <div className="w-full sm:w-auto">
            {/* Desktop: Buttons */}
            <div className="hidden sm:flex bg-muted/20 p-1 rounded-xl w-fit border border-border backdrop-blur-sm">
              {currencies.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCurrency(c.value)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${currency === c.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-card-foreground/70 hover:text-card-foreground hover:bg-card-foreground/5'
                    }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Mobile: Select Dropdown */}
            <div className="block sm:hidden w-full">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-bold text-card-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1.25rem'
                }}
              >
                {currencies.map((c) => (
                  <option key={c.value} value={c.value} className="bg-card text-card-foreground font-medium">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Seletor de Range */}
        <div className="flex bg-muted/20 p-1 rounded-xl w-fit self-end border border-border">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${range === r.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-card-foreground/70 hover:text-card-foreground hover:bg-card-foreground/5'
                }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[320px] w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-sm text-card-foreground animate-pulse">Obtendo dados...</p>
            </div>
          </div>
        ) : chartData ? (
          <Line options={options} data={chartData} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Não foi possível carregar os dados históricos de {selectedCurrencyLabel}.
          </div>
        )}
      </div>
    </div>
  );
};
