import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, User, Wallet, Globe, Building2, LineChart, BookOpen, Briefcase, HelpCircle, Star, Sun, Moon, Palette } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { showSuccess, showError } from '../utils/toast';

const questions = [
  {
    key: 'age_range',
    title: 'Qual sua faixa de idade?',
    subtitle: 'Precisamos saber para adequar o perfil de risco.',
    icon: User,
    options: [
      'Abaixo de 18 anos', 'De 18 a 24 anos', 'De 25 a 34 anos',
      'De 35 a 44 anos', 'De 45 a 54 anos', 'De 55 a 64 anos',
      'De 65 a 74 anos', '75 anos ou mais'
    ],
  },
  {
    key: 'monthly_income',
    title: 'Qual é a sua faixa de renda mensal hoje?',
    subtitle: 'Isso nos ajuda a calcular aportes ideais e metas.',
    icon: Wallet,
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
    subtitle: 'Conta um pouco sobre sua exposição cambial.',
    icon: Globe,
    options: [
      'Sim, somente em dólar', 'Sim, em real e dólar', 'Ainda não, mas quero ter'
    ],
  },
  {
    key: 'has_broker_account',
    title: 'Você tem conta em corretoras?',
    subtitle: 'Contas em corretoras nacionais ou internacionais.',
    icon: Building2,
    options: [
      'Sim', 'Não'
    ],
  },
  {
    key: 'current_investments',
    title: 'Atualmente, onde você mais investe?',
    subtitle: 'Selecione a opção que mais define sua carteira atual.',
    icon: LineChart,
    options: [
      'CDB ou CDI', 'Renda fixa', 'Dólar', 'Diversifico minha carteira', 'Ainda não invisto em nada'
    ],
  },
  {
    key: 'international_knowledge',
    title: 'Entende de investimento internacional?',
    subtitle: 'Como você avalia o seu conhecimento atual.',
    icon: BookOpen,
    options: [
      'Nada', 'O básico', 'Intermediário', 'Avançado'
    ],
  },
  {
    key: 'profession',
    title: 'Qual é a sua profissão?',
    subtitle: 'Para entendermos melhor o seu momento de vida.',
    icon: Briefcase,
    options: [
      'Médico', 'Advogado', 'Engenheiro', 'Gestor/Administrador', 'Empresário/empreendedor', 'Outro'
    ],
  },
  {
    key: 'biggest_difficulty',
    title: 'Qual é a sua principal dificuldade hoje?',
    subtitle: 'Descreva qual é o seu maior desafio financeiro hoje em dia.',
    icon: HelpCircle,
    type: 'textarea'
  },
  {
    key: 'biggest_dream',
    title: 'Qual é o seu maior sonho?',
    subtitle: 'Que sonho você quer alcançar através dos investimentos?',
    icon: Star,
    type: 'textarea'
  }
];

const OnboardingPage: React.FC = () => {
    const { profile, refreshProfile } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    
    // Step 0 indicates Theme Selection.
    // Step 1 to questions.length indicate questions.
    const [currentStep, setCurrentStep] = useState(0);
    const totalSteps = questions.length;

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

    const handleNext = () => {
        if (currentStep <= totalSteps) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const isCurrentStepValid = () => {
        if (currentStep === 0) return true; // Theme is always chosen via ThemeContext default
        
        const qIndex = currentStep - 1;
        const q = questions[qIndex];
        
        const answer = responses[q.key];
        if (q.type === 'textarea') {
            return answer && answer.trim() !== '';
        }
        return answer !== '';
    };

    const handleSubmit = async () => {
        if (!profile) return;
        setSubmitting(true);
        try {
            const { error: insertError } = await supabase.from('user_onboarding').insert({
                id: profile.id,
                ...responses
            });

            if (insertError) {
                console.error("Erro insert", insertError);
                throw new Error('Falha ao salvar respostas do onboarding.');
            }

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

    // Calculate progress (excluding step 0 from logic to make it cleaner)
    const renderProgressBar = () => {
        if (currentStep === 0) return null;
        
        return (
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-10 w-full overflow-hidden">
                {questions.map((_, i) => {
                    const stepNumber = i + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;

                    return (
                        <div 
                            key={i} 
                            className={`h-1.5 rounded-full transition-all duration-500 ease-in-out ${
                                isCompleted ? 'w-4 sm:w-12 bg-primary' :
                                isCurrent ? 'w-8 sm:w-16 bg-primary relative overflow-hidden' :
                                'w-4 sm:w-8 bg-border'
                            }`}
                        >
                            {isCurrent && (
                                <div className="absolute top-0 left-0 h-full w-1/3 bg-white/30 rounded-full animate-waving-progress"></div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderThemeStep = () => {
        return (
            <div className="space-y-10">
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-6 mx-auto text-primary">
                        <Palette className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight leading-tight text-foreground">Como você prefere o visual?</h1>
                    <p className="text-muted-foreground text-lg">Escolha o seu tema. Você poderá alterar isso depois nas configurações.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-4 ${
                            theme === 'dark' 
                            ? 'bg-primary/5 border-primary text-foreground' 
                            : 'bg-card border-border hover:border-primary/50 text-muted-foreground'
                        }`}
                    >
                        <Moon className={`w-12 h-12 ${theme === 'dark' ? 'text-primary' : ''}`} />
                        <span className="font-bold text-lg">Dark Mode</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${theme === 'dark' ? 'border-primary' : 'border-border'}`}>
                            {theme === 'dark' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-4 ${
                            theme === 'light' 
                            ? 'bg-primary/5 border-primary text-foreground' 
                            : 'bg-card border-border hover:border-primary/50 text-muted-foreground'
                        }`}
                    >
                        <Sun className={`w-12 h-12 ${theme === 'light' ? 'text-primary' : ''}`} />
                        <span className="font-bold text-lg">Clean Mode</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${theme === 'light' ? 'border-primary' : 'border-border'}`}>
                            {theme === 'light' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                        </div>
                    </button>
                </div>
            </div>
        );
    };

    const renderQuestionStep = () => {
        const qIndex = currentStep - 1;
        const q = questions[qIndex];
        const Icon = q.icon;

        return (
            <div className="space-y-6">
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-6 mx-auto text-primary">
                        <Icon className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight leading-tight text-foreground">{q.title}</h1>
                    {q.subtitle && <p className="text-muted-foreground text-lg">{q.subtitle}</p>}
                </div>

                {q.type === 'textarea' ? (
                    <div className="space-y-4">
                        <textarea 
                            value={responses[q.key]}
                            onChange={(e) => setResponses(prev => ({...prev, [q.key]: e.target.value}))}
                            className="w-full bg-card border-2 border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl p-5 transition-all text-foreground resize-none min-h-[160px] text-lg outline-none"
                            placeholder="Sua resposta aqui..."
                        />
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {q.options?.map((option) => {
                            const isSelected = responses[q.key] === option;
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                        setResponses(prev => ({ ...prev, [q.key]: option }));
                                        // Auto advance removed as per user request to explicitly click NEXT
                                    }}
                                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 ease-out flex items-center gap-4 ${
                                        isSelected
                                            ? 'bg-primary/5 border-primary text-foreground'
                                            : 'bg-card border-border hover:border-primary/50 hover:bg-muted/50 text-foreground'
                                    }`}
                                >
                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                                    }`}>
                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                                    </div>
                                    <span className="font-semibold text-lg">{option}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 selection:bg-primary selection:text-primary-foreground">
            
            <div className="w-full max-w-2xl bg-card rounded-[2rem] p-6 sm:p-12 shadow-2xl relative overflow-hidden border border-border">
                {/* Decorative Element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full mix-blend-multiply filter blur-[128px] opacity-20 -z-10 animate-pulse pointer-events-none"></div>

                {/* Progress Indicators */}
                {renderProgressBar()}

                {/* Content Area with smooth transition */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {currentStep === 0 ? renderThemeStep() : renderQuestionStep()}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Footer */}
                <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className={`flex items-center gap-2 px-4 py-3 rounded-full font-bold transition-all ${
                            currentStep === 0 
                            ? 'opacity-0 pointer-events-none' 
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Voltar
                    </button>

                    <button
                        onClick={currentStep === totalSteps ? handleSubmit : handleNext}
                        disabled={submitting || !isCurrentStepValid()}
                        className="bg-primary text-primary-foreground px-8 py-3.5 rounded-full font-bold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-primary/25"
                    >
                        {currentStep === totalSteps ? (
                            submitting ? 'Enviando...' : 'Finalizar'
                        ) : (
                            'Avançar'
                        )}
                        {!submitting && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;

