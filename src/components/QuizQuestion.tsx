import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { Question, Answer } from '../lib/suitability';

interface QuizQuestionProps {
  question: Question;
  selectedScore: number | null;
  onSelectAnswer: (score: number) => void;
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({ question, selectedScore, onSelectAnswer }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-foreground mb-4">
        {question.id}. {question.text}
      </h3>
      
      <div className="space-y-4">
        {question.answers.map((answer: Answer) => {
          const isSelected = selectedScore === answer.score;
          return (
            <button
              key={answer.score}
              onClick={() => onSelectAnswer(answer.score)}
              className={`w-full text-left p-4 rounded-lg border transition-all duration-200 flex items-center justify-between ${
                isSelected
                  ? 'bg-primary/10 border-primary text-primary font-medium shadow-md'
                  : 'bg-card border-border hover:bg-muted/50 text-foreground'
              }`}
            >
              <span className="flex-1">{answer.text}</span>
              {isSelected && <CheckCircle className="w-5 h-5 ml-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};