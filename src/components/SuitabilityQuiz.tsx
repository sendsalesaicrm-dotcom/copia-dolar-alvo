import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Loader2, ArrowRight } from 'lucide-react';
import { QuizQuestion } from './QuizQuestion';
import { QUIZ_QUESTIONS, determineProfile } from '../lib/suitability';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { showError, showSuccess, showLoading, dismissToast } from '../utils/toast';
import { CongratulationsModal } from './CongratulationsModal';
import type { SuitabilityProfile } from '../lib/suitability';

interface SuitabilityQuizProps {
    onQuizCompleted: () => void;
}

export const SuitabilityQuiz: React.FC<SuitabilityQuizProps> = ({ onQuizCompleted }) => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate(); // Initialize useNavigate
  const [currentStep, setCurrentStep] = useState(0); // 0 to N-1
  const [answers, setAnswers] = useState<number[]>(new Array(QUIZ_QUESTIONS.length).fill(0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalResultProfile, setFinalResultProfile] = useState<SuitabilityProfile | null>(null);
  const [showModal, setShowModal] = useState(false);

  const totalSteps = QUIZ_QUESTIONS.length;
  const currentQuestion = QUIZ_QUESTIONS[currentStep];
  const currentAnswerScore = answers[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const isAnswerSelected = currentAnswerScore > 0;

  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  const handleCloseModal = useCallback(async () => {
    setShowModal(false);
    
    // 1. Refresh the profile context to get the new suitability data
    await refreshProfile();
    
    // 2. Notify the parent component (SuitabilityPage) to re-check the status
    onQuizCompleted(); 

    // 3. Explicitly navigate to the suitability page to ensure full state reset/re-render
    navigate('/suitability');

  }, [onQuizCompleted, refreshProfile, navigate]);

  const handleSelectAnswer = (score: number) => {
    const newAnswers = [...answers];
    newAnswers[currentStep] = score;
    setAnswers(newAnswers);
  };

  const calculateAndSubmit = async () => {
    if (!user) return;

    const totalScore = answers.reduce((sum, score) => sum + score, 0);
    const profile = determineProfile(totalScore);

    setIsSubmitting(true);
    const toastId = showLoading('Finalizando teste...');

    try {
      // 1. Update the database
      const { error } = await supabase
        .from('profiles')
        .update({
          suitability_score: totalScore,
          investor_profile: profile,
          last_suitability_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Seu perfil de investidor foi salvo com sucesso!');
      
      setFinalResultProfile(profile);
      setShowModal(true); // Show congratulations modal

    } catch (error) {
      dismissToast(toastId);
      console.error('Suitability submission error:', error);
      showError('Falha ao salvar o resultado do teste.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!isAnswerSelected) return;

    if (isLastStep) {
      calculateAndSubmit();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  return (
    <div className="space-y-8">
      {/* Progress Bar */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Pergunta {currentStep + 1} de {totalSteps}
        </p>
        <div className="w-full bg-muted rounded-full h-2.5">
          <div 
            className="h-2.5 rounded-full bg-primary transition-all duration-500" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <QuizQuestion
        question={currentQuestion}
        selectedScore={currentAnswerScore}
        onSelectAnswer={handleSelectAnswer}
      />

      {/* Navigation Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleNext}
          disabled={!isAnswerSelected || isSubmitting}
          className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition-all duration-300 flex items-center justify-center min-w-[150px]"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : isLastStep ? (
            'Finalizar Teste'
          ) : (
            <>
              Próxima Pergunta <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </button>
      </div>
      
      {/* Congratulations Modal */}
      {finalResultProfile && (
        <CongratulationsModal 
          profile={finalResultProfile} 
          isOpen={showModal} 
          onClose={handleCloseModal} 
        />
      )}
    </div>
  );
};