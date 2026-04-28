export interface PortfolioAsset {
  asset: string;
  value: number;
  weight?: number;
}

export interface NewsArticle {
  title: string;
  source?: string;
  published_at?: string;
  body?: string;
}

export interface CryptoAgentConfig {
  baseUrls?: {
    unifiedDecision?: string;
    marketSignal?: string;
    newsImpact?: string;
    portfolioRebalance?: string;
    marketTrigger?: string;
    strategyExecution?: string;
  };
  timeout?: number;
}

export interface DecideOptions {
  portfolio: PortfolioAsset[];
  risk_tolerance: 'low' | 'medium' | 'high';
  news?: NewsArticle[];
  primary_asset?: string;
}

export interface NewsImpactOptions {
  asset: string;
  topic?: string;
  articles: NewsArticle[];
}

export interface RebalanceOptions {
  portfolio: PortfolioAsset[];
  strategy: 'risk_adjusted' | 'equal_weight' | 'momentum_tilt';
  risk_tolerance: 'low' | 'medium' | 'high';
  constraints?: {
    max_single_asset?: number;
    min_trade_size?: number;
    exclude_assets?: string[];
  };
  cash_buffer?: number;
}

export interface TriggerConditions {
  min_impact_score?: number;
  max_impact_score?: number;
  action_bias?: string | string[];
  sentiment?: string | string[];
  min_confidence?: number;
  event_types?: string[];
  impact_horizon?: string | string[];
  freshness?: string | string[];
  forbid_risk_warning?: boolean;
  require_risk_warning?: boolean;
}

export interface TriggerOptions {
  asset: string;
  conditions: TriggerConditions;
  context: {
    news_impact?: Record<string, unknown>;
    market_signal?: Record<string, unknown>;
  };
}

// Strategy Execution types
export type StrategyName = 'news_momentum' | 'trend_following' | 'risk_adjusted';
export type RiskTolerance = 'low' | 'medium' | 'high';

export interface ExecuteStrategyOptions {
  portfolio: PortfolioAsset[];
  strategy: StrategyName;
  risk_tolerance?: RiskTolerance;
  assets?: string[];
}

export interface StrategyAction {
  asset: string;
  action: 'buy' | 'sell' | 'hold';
  amount: number;
  confidence: number;
}

export interface StrategyResult {
  strategy: StrategyName;
  decision: string;
  confidence: number;
  actions: StrategyAction[];
  reasoning: string[];
  sources: string[];
  latency_ms: number;
  timestamp: string;
}

export interface BacktestResult {
  strategy: StrategyName;
  backtest_scenarios: Array<{ scenario: string } & StrategyResult>;
  timestamp: string;
}

export interface StrategyDefinition {
  name: StrategyName;
  description: string;
  parameters: string[];
  risk_levels: RiskTolerance[];
}
