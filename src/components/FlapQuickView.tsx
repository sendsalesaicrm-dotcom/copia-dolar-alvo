import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const FlapQuickView: React.FC = () => {
    const navigate = useNavigate();

    return (
        <motion.div
            whileHover={{ scale: 1.01 }}
            className="group relative overflow-hidden p-6 bg-[#ef6037] dark:bg-[#1a1a1a] rounded-2xl shadow-lg border border-white/5 cursor-pointer"
            onClick={() => navigate('/flap')}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-24 h-24 text-yellow-500" />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-white/20 border border-white/40 dark:bg-[#ef6037]/20 dark:border-[#ef6037]/50 rounded-lg">
                            <Zap className="w-5 h-5 text-white dark:text-[#ef6037]" />
                        </div>
                        <h3 className="text-lg font-black text-white tracking-tight uppercase">Estratégia Antifrágil</h3>
                    </div>

                    <p className="text-white/70 text-sm font-medium leading-relaxed max-w-[80%]">
                        Veja quanto seu patrimônio pode render com nossa estratégia otimizada de CDI.
                    </p>
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white/50 dark:text-[#ef6037]/60 uppercase tracking-widest">Rentabilidade</span>
                        <span className="text-xl font-black text-white">100% CDI</span>
                    </div>
                    <div className="flex items-center gap-2 text-white dark:text-[#ef6037] font-bold text-xs uppercase tracking-wider group-hover:gap-3 transition-all">
                        Simular
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
