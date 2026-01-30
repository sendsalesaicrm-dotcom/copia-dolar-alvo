import React from 'react';
import { CheckCircle, X } from 'lucide-react';
import type { SuitabilityProfile } from '../lib/suitability';

interface CongratulationsModalProps {
  profile: SuitabilityProfile;
  isOpen: boolean;
  onClose: () => void;
}

const getProfileColor = (profile: SuitabilityProfile) => {
  switch (profile) {
    case 'Conservador':
      return 'text-green-500';
    case 'Moderado':
      return 'text-blue-500';
    case 'Agressivo':
      return 'text-red-500';
    default:
      return 'text-primary';
  }
};

export const CongratulationsModal: React.FC<CongratulationsModalProps> = ({ profile, isOpen, onClose }) => {
  if (!isOpen) return null;

  const colorClass = getProfileColor(profile);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border p-8 text-center space-y-6 transform scale-100 transition-transform duration-300">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors" aria-label="Fechar">
            <X className="w-6 h-6 text-muted-foreground" />
        </button>

        <CheckCircle className={`w-16 h-16 mx-auto ${colorClass}`} />
        
        <h2 className="text-3xl font-extrabold text-foreground">Parabéns!</h2>
        
        <p className="text-lg text-muted-foreground">
            Seu novo perfil de investidor é:
        </p>
        
        <p className={`text-5xl font-black ${colorClass} animate-pulse`}>
            {profile}
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};