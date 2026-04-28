export interface PortfolioAsset {
  asset: string;
  value: number;
}

export interface NewsArticle {
  title: string;
  source?: string;
  published_at?: string;
  body?: string;
}

export interface DecideRequest {
  portfolio: PortfolioAsset[];
  risk_tolerance: 'low' | 'medium' | 'high';
  news?: NewsArticle[];
  primary_asset?: string;
}

export interface MarketContext {
  asset: string;
  decision: string;
  confidence: number;
  risk: string;
  trend: string;
  momentum: string;
  factors: Record<string, any>;
}

export interface NewsContext {
  sentiment: string;
  impact_score: number;
  action_bias: string;
  confidence: number;
  event_type: string;
  drivers: string[];
  risk_warning: string | null;
}

export interface PortfolioContext {
  health_score: number;
  rebalance_score: number;
  trigger: boolean;
  current_allocations: Record<string, number>;
  target_allocations: Record<string, number>;
  actions: any[];
}

export interface DecideAction {
  asset: string;
  action: 'buy' | 'sell' | 'hold' | 'watch';
  amount_usd?: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DecideResponse {
  primary_asset: string;
  final_decision: string;
  confidence: number;
  urgency: 'high' | 'medium' | 'low';
  summary: string;
  market_context: MarketContext | null;
  news_context: NewsContext | null;
  portfolio_context: PortfolioContext | null;
  actions: DecideAction[];
  signals_used: string[];
  analyzedAt: string;
}
