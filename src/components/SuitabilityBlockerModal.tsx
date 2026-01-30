import React from 'react';
import { Clock } from 'lucide-react';

interface SuitabilityBlockerModalProps {
  nextRetakeDate: string;
  onClose: () => void;
}

export const SuitabilityBlockerModal: React.FC<SuitabilityBlockerModalProps> = ({ nextRetakeDate, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border p-8 text-center space-y-6">
        <Clock className="w-12 h-12 text-primary mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">Você já respondeu seu teste de suitability recentemente.</h2>
        <p className="text-muted-foreground">
          Para garantir a validade do seu perfil, você poderá refazer o teste a partir de: 
          <span className="font-semibold text-primary block mt-1">{nextRetakeDate}</span>
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-colors"
        >
          Entendi
        </button>
      </div>
    </div>
  );
};