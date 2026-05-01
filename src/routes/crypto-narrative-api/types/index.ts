export interface Narrative {
  name: string;
  slug: string;
  description: string;
  momentumScore: number; // 0-100
  trend: 'SURGING' | 'RISING' | 'STABLE' | 'DECLINING' | 'FADING';
  catalysts: string[];
  topTokens: string[];
  searchVolumeTrend: 'UP' | 'FLAT' | 'DOWN';
  timeframe: string;
  analyzedAt: string;
}

export interface NarrativeDetail extends Narrative {
  summary: string;
  bullCase: string;
  bearCase: string;
  keyRisks: string[];
  relatedNarratives: string[];
  sources: string[];
}

export interface NarrativeCompare {
  narratives: Array<{
    name: string;
    momentumScore: number;
    trend: string;
    catalysts: string[];
    topTokens: string[];
  }>;
  winner: string;
  aiAnalysis: string;
  timeframe: string;
  analyzedAt: string;
}

export interface TokenNarratives {
  token: string;
  narratives: Array<{
    name: string;
    fit: 'STRONG' | 'MODERATE' | 'WEAK';
    reason: string;
  }>;
  primaryNarrative: string | null;
  aiSummary: string;
  analyzedAt: string;
}
