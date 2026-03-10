import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { dollarHistory } from '../utils/dollarHistory';

export const PurchasingPowerChart: React.FC = () => {
    const { theme } = useTheme();

    // Processa os dados históricos para gerar a Série de Poder de Compra do Real
    const chartData = useMemo(() => {
        // Remove a primeira linha que pode ser cabeçalho ('Ano')
        const validHistory = dollarHistory.filter(item => item.ano !== 'Ano' && item.cambio);

        // Base: 1994, com R$ 100 hipotéticos
        let baseReais = 100;
        const initialDol = validHistory[0].cambio as number; // Em 1994, US$ 1,00 = R$ 1,00

        return validHistory.map((item) => {
            const cambio = parseFloat(item.cambio as string);

            // O Poder de Compra é inversamente proporcional à valorização do Dólar 
            // Se R$ 1,00 comprava US$ 1,00 em 1994, agora ele compra US$ (1 / cambio)
            // Em percentual relativo ao início (100%):
            const purchasingPower = (initialDol / cambio) * 100;

            return {
                ano: String(item.ano),
                usdValue: cambio,
                brlPower: purchasingPower // Percentual do poder de compra original
            };
        });
    }, []);

    // Formatação de tooltip customizada
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const usdData = payload.find((p: any) => p.dataKey === 'usdValue');
            const brlData = payload.find((p: any) => p.dataKey === 'brlPower');

            return (
                <div className={`p-4 rounded-xl border shadow-xl ${theme === 'dark' ? 'bg-[#1a1a1a] border-white/10 text-white' : 'bg-white border-border text-foreground'}`}>
                    <p className="font-black text-lg mb-2">{label}</p>

                    <div className="space-y-3">
                        {usdData && (
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#ef6037]"></div>
                                    <span className="text-sm font-medium opacity-80">Cotação do Dólar</span>
                                </div>
                                <span className="font-black text-[#ef6037]">
                                    R$ {usdData.value.toFixed(2)}
                                </span>
                            </div>
                        )}

                        {brlData && (
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <span className="text-sm font-medium opacity-80">Poder de Compra (R$)</span>
                                </div>
                                <span className="font-black text-red-500">
                                    {brlData.value.toFixed(1)}%
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-[10px] opacity-60 text-center font-medium">100% = Poder de compra do Real em 1994</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`w-full p-8 rounded-[2.5rem] shadow-xl ${theme === 'dark' ? 'bg-[#1a1a14] border border-white/5' : 'bg-white border border-border'}`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                <div>
                    <h3 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-foreground'}`}>
                        O Efeito Tesoura do Câmbio
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                        A linha laranja mostra a escalada histórica do dólar frente ao real. A área vermelha ilustra como o <strong>Poder de Compra</strong> da nossa moeda derrete na mesma proporção desde a criação do Plano Real (1994).
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                    <TrendingDown className="w-8 h-8 text-red-500" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500/80">
                            Desvalorização Acumulada
                        </p>
                        <p className="text-2xl font-black text-red-500">
                            -81.8%
                        </p>
                    </div>
                </div>
            </div>

            <div className="h-[400px] w-full mt-8">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorUsd" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef6037" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef6037" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorBrl" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                        />
                        <XAxis
                            dataKey="ano"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme === 'dark' ? '#888' : '#888', fontSize: 12, fontWeight: 600 }}
                            dy={10}
                            minTickGap={20}
                        />
                        <YAxis
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#ef6037', fontSize: 12, fontWeight: 700 }}
                            tickFormatter={(value) => `R$ ${value}`}
                            dx={-10}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#ef4444', fontSize: 12, fontWeight: 700 }}
                            tickFormatter={(value) => `${value}%`}
                            dx={10}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value) => {
                                return <span className="text-xs font-bold uppercase tracking-wider ml-1">{value === 'usdValue' ? 'Cotação USD (R$)' : 'Poder de Compra do Real (%)'}</span>
                            }}
                        />
                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="usdValue"
                            stroke="#ef6037"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorUsd)"
                            activeDot={{ r: 6, fill: '#ef6037', stroke: theme === 'dark' ? '#1a1a1a' : '#fff', strokeWidth: 2 }}
                        />
                        <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="brlPower"
                            stroke="#ef4444"
                            strokeWidth={0}
                            fillOpacity={1}
                            fill="url(#colorBrl)"
                            activeDot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
