import { UserPlan } from "./auth-store";

export type FeatureKey = 
  | 'RADAR_VIRAL' 
  | 'GANCHOS_VIRAIS' 
  | 'CALENDARIO_CONTEUDO' 
  | 'SHEY_AI' 
  | 'ANALISE_CONCORRENTE' 
  | 'SCRIBE' 
  | 'MENTORIAS' 
  | 'API_ACCESS' 
  | 'PROJECT_MANAGEMENT';

interface PlanPermissions {
  features: FeatureKey[];
  limits?: Record<string, number>;
}

const PLAN_PERMISSIONS: Record<UserPlan, PlanPermissions> = {
  TRIAL: {
    features: ['RADAR_VIRAL', 'GANCHOS_VIRAIS', 'CALENDARIO_CONTEUDO', 'SHEY_AI', 'ANALISE_CONCORRENTE', 'SCRIBE'],
    limits: {
      radar_viral: 3,
      ganchos_mensais: 20,
    }
  },
  BETA: {
    features: ['RADAR_VIRAL', 'GANCHOS_VIRAIS', 'CALENDARIO_CONTEUDO', 'SHEY_AI', 'ANALISE_CONCORRENTE', 'SCRIBE', 'MENTORIAS', 'API_ACCESS', 'PROJECT_MANAGEMENT'],
    limits: {
      radar_viral: -1,
      ganchos_mensais: -1,
      scribe_minutos: -1,
    }
  },
  START: {
    features: ['RADAR_VIRAL', 'GANCHOS_VIRAIS', 'CALENDARIO_CONTEUDO'],
    limits: {
      radar_viral: 2,
      ganchos_mensais: -1,
    }
  },
  PRO: {
    features: ['RADAR_VIRAL', 'GANCHOS_VIRAIS', 'CALENDARIO_CONTEUDO', 'SHEY_AI', 'ANALISE_CONCORRENTE', 'SCRIBE'],
    limits: {
      scribe_minutos: -1,
    }
  },
  CEO: {
    features: ['RADAR_VIRAL', 'GANCHOS_VIRAIS', 'CALENDARIO_CONTEUDO', 'SHEY_AI', 'ANALISE_CONCORRENTE', 'SCRIBE', 'MENTORIAS', 'API_ACCESS', 'PROJECT_MANAGEMENT'],
  }
};

export function hasFeature(plan: UserPlan, feature: FeatureKey): boolean {
  return PLAN_PERMISSIONS[plan].features.includes(feature);
}

export function getPlanName(plan: UserPlan): string {
  switch (plan) {
    case 'TRIAL': return 'TESTE GRÁTIS (3 DIAS)';
    case 'BETA': return 'BETA (GRÁTIS)';
    case 'START': return 'START';
    case 'PRO': return 'PRO';
    case 'CEO': return 'CEO UNLIMITED';
  }
}
