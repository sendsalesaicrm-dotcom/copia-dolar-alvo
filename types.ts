export interface AnnualData {
  year: number;
  balance: number;
  totalInvested: number;
  totalInterest: number;
}

export interface ProjectionResult {
  futureValue: number;
  requiredContribution: number;
  annualData: AnnualData[];
}

export type Theme = 'light' | 'dark';

export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  first_name: string | null; // New field
  last_name: string | null;  // New field
  avatar_url: string | null;
  theme: Theme;
  // New fields for Suitability
  suitability_score: number | null;
  investor_profile: 'Conservador' | 'Moderado' | 'Agressivo' | null;
  last_suitability_at: string | null; // ISO date string
  // New field for Onboarding
  onboarding_completed: boolean;
  deletion_scheduled_at: string | null;
}

export interface FinancialGoal {
  id: string;
  user_id: string;
  created_at: string;
  name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
}

export type FrequenciaMeta = 'diaria' | 'semanal' | 'mensal';

export interface MetaCaixinha {
  id: string;
  user_id: string;
  nome_meta: string;
  valor_objetivo: number;
  frequencia: FrequenciaMeta;
  data_inicio: string;
  data_fim: string;
  created_at: string;
}

export interface AporteGerado {
  id: string;
  meta_id: string;
  valor_sugerido: number;
  data_prevista: string; // YYYY-MM-DD
  status_pago: boolean;
  created_at: string;
}

export type MetaStatus = 'ativa' | 'pausada' | 'concluida';

export interface MetaTabuleiro {
  id: string;
  user_id: string;
  nome: string | null;
  objetivo_total: number;
  status: MetaStatus;
  frequencia?: FrequenciaMeta;
  data_inicio?: string;
  data_fim?: string;
  created_at: string;
}

export interface GridValor {
  id: string;
  meta_id: string;
  valor: number;
  marcado: boolean;
  posicao: number;
  data_prevista?: string; // YYYY-MM-DD
}