import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { showSuccess, showError } from '../utils/toast';

const questions = [
  {
    key: 'age_range',
    title: 'Qual sua faixa de idade?',
    options: [
      'Abaixo de 18 anos', 'De 18 a 24 anos', 'De 25 a 34 anos',
      'De 35 a 44 anos', 'De 45 a 54 anos', 'De 55 a 64 anos',
      'De 65 a 74 anos', '75 anos ou mais'
    ],
  },
  {
    key: 'monthly_income',
    title: 'Qual é a sua faixa de renda individual mensal hoje?',
    options: [
      'De R$ 2.501 a R$ 4.000', 'De R$ 4.001 a R$ 6.000',
      'De R$ 6.001 a R$ 10.000', 'De R$ 10.001 a R$ 15.000',
      'De R$ 15.001 a R$ 25.000', 'Acima de R$ 30.000',
      'Prefiro não responder'
    ],
  },
  {
    key: 'has_dollar_portfolio',
    title: 'Você já tem uma carteira em dólar?',
    options: [
      'Sim, somente em dólar', 'Sim, em real e dólar', 'Ainda não, mas quero ter'
    ],
  },
  {
    key: 'has_broker_account',
    title: 'Você tem conta em corretoras?',
    options: [
      'Sim', 'Não'
    ],
  },
  {
    key: 'current_investments',
    title: 'Atualmente, onde você mais inviste?',
    options: [
      'CDB ou CDI', 'Renda fixa', 'Dólar', 'Diversifico minha carteira', 'Ainda não invisto em nada'
    ],
  },
  {
    key: 'international_knowledge',
    title: 'Quanto você entende de investimento internacional?',
    options: [
      'Nada', 'O básico', 'Intermediário', 'Avançado'
    ],
  },
  {
    key: 'profession',
    title: 'Qual é a sua profissão?',
    options: [
      'Médico', 'Advogado', 'Engenheiro', 'Gestor/Administrador', 'Empresário/empreendedor', 'Outro'
    ],
  }
];

const OnboardingPage: React.FC = () => {
    const { profile, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    const [responses, setResponses] = useState<Record<string, string>>({
        age_range: '',
        monthly_income: '',
        has_dollar_portfolio: '',
        has_broker_account: '',
        current_investments: '',
        international_knowledge: '',
        profession: '',
        biggest_difficulty: '',
        biggest_dream: '',
    });

    const isComplete = () => {
        return (
            responses.age_range !== '' &&
            responses.monthly_income !== '' &&
            responses.has_dollar_portfolio !== '' &&
            responses.has_broker_account !== '' &&
            responses.current_investments !== '' &&
            responses.international_knowledge !== '' &&
            responses.profession !== '' &&
            responses.biggest_difficulty.trim() !== '' &&
            responses.biggest_dream.trim() !== ''
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isComplete() || !profile) {
            showError('Por favor, preencha todas as respostas antes de continuar.');
            return;
        }

        setSubmitting(true);
        try {
            // Insert into the new user_onboarding table
            const { error: insertError } = await supabase.from('user_onboarding').insert({
                id: profile.id,
                ...responses
            });

            if (insertError) {
                console.error("Erro insert", insertError);
                throw new Error('Falha ao salvar respostas do onboarding.');
            }

            // Update user profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ onboarding_completed: true })
                .eq('id', profile.id);

            if (updateError) {
                console.error("Erro update", updateError);
                throw new Error('Falha ao atualizar status do perfil.');
            }

            await refreshProfile();
            showSuccess('Formulário enviado com sucesso!');
            navigate('/suitability');

        } catch (error: any) {
            console.error(error);
            showError(error.message || 'Houve um erro no processo. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Conhecendo o seu Perfil</h1>
                    <p className="text-lg text-muted-foreground">
                        Responda as perguntas abaixo para personalizarmos a sua experiência e as suas recomendações.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-12">
                    {questions.map((q, qIndex) => (
                        <motion.div 
                            key={q.key} 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: qIndex * 0.1 }}
                            className="bg-card rounded-3xl p-8 border border-border shadow-xl relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <span className="text-8xl font-black">{qIndex + 1}</span>
                            </div>
                            
                            <h3 className="text-xl font-bold mb-6 text-foreground relative z-10 flex items-center gap-3">
                                {q.title}
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                                {q.options.map((option) => {
                                    const isSelected = responses[q.key] === option;
                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setResponses(prev => ({ ...prev, [q.key]: option }))}
                                            className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center justify-between border ${
                                                isSelected
                                                    ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                                    : 'bg-muted/30 border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <span className="font-semibold">{option}</span>
                                            {isSelected && <CheckCircle2 className="w-5 h-5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ))}

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-3xl p-8 border border-border shadow-xl space-y-6"
                    >
                        <h3 className="text-xl font-bold text-foreground">Abertas</h3>
                        
                        <div className="space-y-2">
                             <label className="text-sm font-semibold text-foreground">Qual é a sua principal dificuldade com investimentos hoje?</label>
                             <textarea 
                                value={responses.biggest_difficulty}
                                onChange={(e) => setResponses(prev => ({...prev, biggest_difficulty: e.target.value}))}
                                className="w-full bg-muted/30 border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-foreground resize-none h-32"
                                placeholder="Nos conte qual é o seu maior desafio..."
                             />
                        </div>

                        <div className="space-y-2">
                             <label className="text-sm font-semibold text-foreground">Qual é o seu maior sonho em relação aos seus investimentos?</label>
                             <textarea 
                                value={responses.biggest_dream}
                                onChange={(e) => setResponses(prev => ({...prev, biggest_dream: e.target.value}))}
                                className="w-full bg-muted/30 border-none rounded-xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-foreground resize-none h-32"
                                placeholder="Que sonho você quer alcançar investindo?"
                             />
                        </div>
                    </motion.div>

                    <div className="flex justify-end pt-8">
                        <button
                            type="submit"
                            disabled={submitting || !isComplete()}
                            className="bg-primary text-primary-foreground px-10 py-4 rounded-full font-black flex items-center gap-3 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-xl shadow-primary/20"
                        >
                            {submitting ? 'Salvando...' : 'FINALIZAR E CONTINUAR'}
                            {!submitting && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OnboardingPage;
