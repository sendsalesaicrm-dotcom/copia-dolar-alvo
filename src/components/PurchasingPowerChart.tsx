import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { dollarHistory } from '../utils/dollarHistory';

export const PurchasingPowerChart: React.FC = () => {
    const { theme } = useTheme();

    // Processa os dados históricos para gerar a Série de Variação Acumulada
    const chartData = useMemo(() => {
        // Remove a primeira linha que pode ser cabeçalho ('Ano')
        const validHistory = dollarHistory.filter(item => item.ano !== 'Ano' && item.cambio);

        const initialDol = validHistory[0].cambio as number; // Em 1994, US$ 1,00 = R$ 1,00

        return validHistory.map((item) => {
            const cambio = parseFloat(item.cambio as string);

            // Valorização do Dólar: ((Atual / Inicial) - 1) * 100
            const usdValorization = ((cambio / initialDol) - 1) * 100;

            // Desvalorização do Real: ((Inicial / Atual) - 1) * 100
            const brlDevaluation = ((initialDol / cambio) - 1) * 100;

            return {
                ano: String(item.ano),
                usdValorization: usdValorization,
                brlDevaluation: brlDevaluation,
                cambioSpot: cambio
            };
        });
    }, []);

    const usdSummary = chartData[chartData.length - 1]?.usdValorization ?? 0;
    const brlSummary = chartData[chartData.length - 1]?.brlDevaluation ?? 0;

    // Formatação de tooltip customizada
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const usdData = payload.find((p: any) => p.dataKey === 'usdValorization');
            const brlData = payload.find((p: any) => p.dataKey === 'brlDevaluation');
            const cambio = payload[0].payload.cambioSpot;

            return (
                <div className={`p-4 rounded-xl border shadow-xl min-w-[220px] ${theme === 'dark' ? 'bg-[#1a1a1a] border-white/10 text-white' : 'bg-white border-border text-foreground'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <p className="font-black text-lg">{label}</p>
                        <p className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded">R$ {cambio.toFixed(2)}</p>
                    </div>

                    <div className="space-y-3">
                        {usdData && (
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
                                    <span className="text-sm font-medium opacity-80">Alto do Dólar</span>
                                </div>
                                <span className="font-black text-[#22c55e]">
                                    +{usdData.value.toFixed(1)}%
                                </span>
                            </div>
                        )}

                        {brlData && (
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                                    <span className="text-sm font-medium opacity-80">Queda do Real</span>
                                </div>
                                <span className="font-black text-[#ef4444]">
                                    {brlData.value.toFixed(1)}%
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`w-full p-8 rounded-[2.5rem] shadow-xl ${theme === 'dark' ? 'bg-[#1a1a14] border border-white/5' : 'bg-white border border-border'}`}>
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 mb-8">
                <div className="flex-1">
                    <h3 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-foreground'}`}>
                        Evolução do Dólar vs Perda de Poder de Compra do Real
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                        A linha verde mostra a valorização histórica do Dólar frente ao Real a partir do zero. A linha vermelha ilustra como o <strong>Poder de Compra</strong> da nossa moeda derrete rumo ao assoalho negativo (limitado a -100%) desde 1994.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center gap-4 bg-[#22c55e]/10 p-4 rounded-2xl border border-[#22c55e]/20">
                        <TrendingUp className="w-8 h-8 text-[#22c55e]" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#22c55e]/80">
                                Valorização do Dólar
                            </p>
                            <p className="text-2xl font-black text-[#22c55e]">
                                +{usdSummary.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-[#ef4444]/10 p-4 rounded-2xl border border-[#ef4444]/20">
                        <TrendingDown className="w-8 h-8 text-[#ef4444]" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#ef4444]/80">
                                Desvalorização do Real
                            </p>
                            <p className="text-2xl font-black text-[#ef4444]">
                                {brlSummary.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-[450px] w-full mt-8">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 20, right: 20, left: 10, bottom: 0 }}
                    >
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
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme === 'dark' ? '#888' : '#888', fontSize: 12, fontWeight: 600 }}
                            tickFormatter={(value) => `${value}%`}
                            dx={-10}
                            domain={['auto', 'auto']}
                        />
                        {/* Linha do Zero (Referência) */}
                        <CartesianGrid
                            horizontalPoints={[0]}
                            stroke={theme === 'dark' ? '#555' : '#ccc'}
                            strokeDasharray="4 4"
                        />

                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value) => {
                                return <span className="text-xs font-bold uppercase tracking-wider ml-1">{value === 'usdValorization' ? 'Valorização do Dólar (+%)' : 'Desvalorização do Real (-%)'}</span>
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="usdValorization"
                            stroke="#22c55e"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
                            activeDot={{ r: 6, fill: '#22c55e', stroke: theme === 'dark' ? '#1a1a1a' : '#fff', strokeWidth: 2 }}
                            isAnimationActive={true}
                        />
                        <Line
                            type="monotone"
                            dataKey="brlDevaluation"
                            stroke="#ef4444"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
                            activeDot={{ r: 6, fill: '#ef4444', stroke: theme === 'dark' ? '#1a1a1a' : '#fff', strokeWidth: 2 }}
                            isAnimationActive={true}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
