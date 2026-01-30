import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { SuitabilityQuiz } from '../components/SuitabilityQuiz';
import { SuitabilityBlockerModal } from '../components/SuitabilityBlockerModal';
import { DAYS_BLOCKED, getNextRetakeDate } from '../lib/suitability';

const SuitabilityPage: React.FC = () => {
  const { profile, loading: authLoading, refreshProfile } = useAuth();
  const [canTakeQuiz, setCanTakeQuiz] = useState(false);
  const [nextRetakeDate, setNextRetakeDate] = useState<string | null>(null);
  const [showBlocker, setShowBlocker] = useState(false);
  const [quizKey, setQuizKey] = useState(0); // Key to force remount/reset quiz state

  const checkSuitabilityStatus = useCallback(() => {
    if (!profile || !profile.last_suitability_at) {
      setCanTakeQuiz(true);
      setShowBlocker(false);
      return;
    }

    const lastDate = new Date(profile.last_suitability_at);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - DAYS_BLOCKED);

    if (lastDate < ninetyDaysAgo) {
      // Last quiz was more than 90 days ago
      setCanTakeQuiz(true);
      setShowBlocker(false);
    } else {
      // Blocked
      setCanTakeQuiz(false);
      setNextRetakeDate(getNextRetakeDate(profile.last_suitability_at));
      setShowBlocker(false); 
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading) {
      checkSuitabilityStatus();
    }
  }, [authLoading, checkSuitabilityStatus]);

  const handleQuizCompleted = () => {
    // When the quiz is completed (and the modal is closed by the user), 
    // we refresh the profile and force a re-check of the status.
    refreshProfile().then(() => {
        // Force re-check status after profile refresh
        checkSuitabilityStatus();
    });
  };

  // No spinner during navigation/auth loading.

  // If the user has a profile and is blocked, we show the blocked message immediately.
  const isBlocked = profile && profile.last_suitability_at && !canTakeQuiz;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Perfil de Investidor (Suitability)</h1>
          <p className="mt-2 text-md text-muted-foreground">
            Responda às perguntas para determinar seu perfil de risco: Conservador, Moderado ou Agressivo.
          </p>
        </div>

        {canTakeQuiz ? (
          <SuitabilityQuiz key={quizKey} onQuizCompleted={handleQuizCompleted} />
        ) : (
          <div className="p-8 text-center bg-muted/50 rounded-xl border border-dashed border-border text-muted-foreground">
            <p className="font-medium">Seu perfil atual é: <span className="text-primary">{profile?.investor_profile || 'Não definido'}</span></p>
            {isBlocked && nextRetakeDate && (
                <p className="mt-2">Você precisa esperar para refazer o teste. Próxima data: <span className="font-semibold text-primary">{nextRetakeDate}</span></p>
            )}
            {!isBlocked && <p className="mt-2">Carregando status...</p>}
          </div>
        )}
      </div>
      
      {/* Removed Blocker Modal logic as the blocked message is now inline */}

      <footer className="text-center mt-8 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Dolar Alvo. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SuitabilityPage;