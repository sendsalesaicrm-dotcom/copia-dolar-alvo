import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Settings, Calculator, Goal, CheckCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import type { UserProfile } from '../../types';

// Define the steps and their corresponding paths
const ONBOARDING_STEPS = [
  { id: 1, path: '/settings', title: '1. Configurar Perfil', icon: Settings, description: 'Preencha seu nome e sobrenome nas configurações.' },
  { id: 2, path: '/suitability', title: '2. Teste de Investidor', icon: Calculator, description: 'Complete o teste de Suitability para definir seu perfil de risco.' },
  { id: 3, path: '/goals', title: '3. Criar Primeira Meta', icon: Goal, description: 'Adicione sua primeira meta financeira para começar a planejar.' },
];

interface OnboardingModalProps {
    profile: UserProfile;
    refreshProfile: () => Promise<void>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ profile, refreshProfile }) => {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const checkGoalsCount = useCallback(async (userId: string) => {
    const { count, error } = await supabase
      .from('financial_goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching goals count:', error);
      return 0;
    }
    return count || 0;
  }, []);

  const finalizeOnboarding = async () => {
    if (profile.onboarding_completed || isCompleting) return;

    setIsCompleting(true);
    const toastId = showLoading('Finalizando onboarding...');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', profile.id);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Onboarding concluído! Bem-vindo(a) ao Dolar Alvo.');
      await refreshProfile(); // Update context
      // No need to navigate, as the modal will disappear and the user stays on the current page (Dashboard)
    } catch (error) {
      dismissToast(toastId);
      console.error('Onboarding finalization error:', error);
      showError('Falha ao finalizar o onboarding.');
    } finally {
      setIsCompleting(false);
    }
  };

  const checkStatus = useCallback(async () => {
    if (!profile || profile.onboarding_completed) {
        setIsLoadingStatus(false);
        return;
    }

    let step = 0;
    
    // Step 1: Profile Check (Name/Last Name filled)
    const profileCompleted = !!profile.first_name && !!profile.last_name && profile.first_name.trim() !== '' && profile.last_name.trim() !== '';
    if (profileCompleted) {
        step = 1;
    } else {
        setCurrentStepIndex(0);
        setIsLoadingStatus(false);
        return;
    }

    // Step 2: Suitability Check
    const suitabilityCompleted = !!profile.investor_profile;
    if (suitabilityCompleted) {
        step = 2;
    } else {
        setCurrentStepIndex(1);
        setIsLoadingStatus(false);
        return;
    }

    // Step 3: Goals Check
    const count = await checkGoalsCount(profile.id);
    const goalsCompleted = count > 0;

    if (goalsCompleted) {
        step = 3;
    } else {
        setCurrentStepIndex(2);
        setIsLoadingStatus(false);
        return;
    }

    // If all steps are completed, finalize onboarding
    if (step === 3) {
        await finalizeOnboarding();
    }
    setIsLoadingStatus(false);
  }, [profile, checkGoalsCount, finalizeOnboarding]);

  useEffect(() => {
    // Check status whenever the profile changes
    checkStatus();
  }, [checkStatus]); 

  const handleSkip = () => {
    // We don't allow skipping the modal, but we allow closing it if the user is on the dashboard
    // and needs to access the sidebar/topbar. However, since the goal is to enforce onboarding,
    // we should only allow navigation to the required steps.
    // For now, we keep the skip button but it only closes the modal, forcing the user to see it again.
    navigate('/');
  };

  if (profile.onboarding_completed || isCompleting || isLoadingStatus) {
    return null;
  }
  
  // If the user is on an onboarding route, the AppLayout prevents the modal from showing.
  // If the user is on a non-onboarding route (like / or /planner), the modal shows.
  
  const currentStep = ONBOARDING_STEPS[currentStepIndex];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border p-6 space-y-6">
        
        <div className="flex justify-between items-center border-b border-border pb-3">
            <h2 className="text-2xl font-bold text-primary">Primeiros Passos</h2>
            {/* Removed Skip button to enforce completion, but kept the X for closing if needed */}
            <button onClick={handleSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center">
                <X className="w-4 h-4" />
            </button>
        </div>

        <p className="text-muted-foreground">
            Para começar a usar o Wealth Planner, complete estas 3 etapas obrigatórias:
        </p>

        {/* Step List */}
        <div className="space-y-3">
            {ONBOARDING_STEPS.map((step, index) => {
                const isDone = index < currentStepIndex;
                const isActive = index === currentStepIndex;
                
                return (
                    <div 
                        key={step.id} 
                        className={`flex items-center p-3 rounded-lg transition-colors ${
                            isDone ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 
                            isActive ? 'bg-primary/10 border border-primary/50' : 
                            'bg-muted/50 text-muted-foreground'
                        }`}
                    >
                        {isDone ? (
                            <CheckCircle className="w-5 h-5 mr-3" />
                        ) : (
                            <step.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : ''}`} />
                        )}
                        <div className="flex-1">
                            <p className={`font-semibold ${isDone ? 'line-through' : ''}`}>{step.title}</p>
                            <p className="text-xs">{step.description}</p>
                        </div>
                        {!isDone && (
                            <button
                                onClick={() => navigate(step.path)}
                                className={`ml-4 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                    isActive 
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                }`}
                            >
                                Ir Agora
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
        
        {/* Action Button for the current step */}
        {currentStep && (
            <button
                onClick={() => navigate(currentStep.path)}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-colors mt-4"
            >
                {`Continuar: ${currentStep.title}`}
            </button>
        )}
      </div>
    </div>
  );
};