export interface Answer {
  text: string;
  score: 1 | 2 | 3;
}

export interface Question {
  id: number;
  text: string;
  answers: Answer[];
}

export type SuitabilityProfile = 'Conservador' | 'Moderado' | 'Agressivo';

export const DAYS_BLOCKED = 90;

export const QUIZ_QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'Qual é seu objetivo principal ao investir?',
    answers: [
      { score: 1, text: 'Preservar meu patrimônio com segurança.' },
      { score: 2, text: 'Equilibrar segurança e retorno.' },
      { score: 3, text: 'Maximizar retornos no longo prazo, aceitando riscos.' },
    ],
  },
  {
    id: 2,
    text: 'Como você reage quando seus investimentos caem 10% em um mês?',
    answers: [
      { score: 1, text: 'Fico inseguro e penso em vender.' },
      { score: 2, text: 'Fico desconfortável, mas espero recuperar.' },
      { score: 3, text: 'Vejo como oportunidade para comprar mais.' },
    ],
  },
  {
    id: 3,
    text: 'Qual é seu horizonte de investimento?',
    answers: [
      { score: 1, text: 'Menos de 1 ano.' },
      { score: 2, text: 'Entre 1 e 5 anos.' },
      { score: 3, text: 'Mais de 5 anos.' },
    ],
  },
  {
    id: 4,
    text: 'Qual é seu nível de experiência com investimentos?',
    answers: [
      { score: 1, text: 'Baixo: renda fixa ou produtos simples.' },
      { score: 2, text: 'Médio: já investi moderadamente em renda variável.' },
      { score: 3, text: 'Alto: ações, FIIs, multimercado, cripto etc.' },
    ],
  },
  {
    id: 5,
    text: 'Quanto de volatilidade você aceita no seu patrimônio?',
    answers: [
      { score: 1, text: 'Quase nenhuma.' },
      { score: 2, text: 'Alguma volatilidade moderada.' },
      { score: 3, text: 'Alta volatilidade sem preocupação.' },
    ],
  },
  {
    id: 6,
    text: 'Quanto do seu patrimônio você aceitaria colocar em investimentos de risco?',
    answers: [
      { score: 1, text: 'Até 10%.' },
      { score: 2, text: 'Entre 10% e 30%.' },
      { score: 3, text: 'Acima de 30%.' },
    ],
  },
  {
    id: 7,
    text: 'O que você faria se seus investimentos caíssem 20% em 3 meses?',
    answers: [
      { score: 1, text: 'Venderia para reduzir perdas.' },
      { score: 2, text: 'Manteria parte, avaliando antes de agir.' },
      { score: 3, text: 'Manteria ou aumentaria, pensando no longo prazo.' },
    ],
  },
];

export const determineProfile = (totalScore: number): SuitabilityProfile => {
  if (totalScore >= 7 && totalScore <= 12) {
    return 'Conservador';
  }
  if (totalScore >= 13 && totalScore <= 18) {
    return 'Moderado';
  }
  if (totalScore >= 19 && totalScore <= 21) {
    return 'Agressivo';
  }
  // Should not happen if quiz is completed correctly
  return 'Conservador'; 
};

/**
 * Calculates the date when the user can retake the quiz.
 * @param lastDate ISO date string of the last quiz completion.
 * @returns Formatted date string.
 */
export const getNextRetakeDate = (lastDate: string): string => {
    const last = new Date(lastDate);
    last.setDate(last.getDate() + DAYS_BLOCKED);
    
    return last.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};