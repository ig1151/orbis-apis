export interface FundingSignal {
  symbol: string;
  fundingRate: number;
  trend: string;
  sentiment: string;
  signalScore: number;
  actionBias: string;
  confidence: number;
  arbitrageOpportunity: boolean;
  narrative: string;
  recommendation: string;
}

export interface PredictionSignal {
  event: string;
  probability: number;
  trend: string;
  confidence: number;
  actionBias: string;
  drivers: string[];
  recommendation: string;
}

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  marketCap: number | null;
  volume24h: number | null;
  high24h: number | null;
  low24h: number | null;
  priceSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface StrategyDecision {
  symbol: string;
  decision: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  signalScore: number;
  reasoning: string;
  keyFactors: string[];
  risks: string[];
  riskLevel: 'low' | 'medium' | 'high';
  invalidatedIf: string | null;
  action: {
    bias: string;
    suggestedSize: 'large' | 'moderate' | 'small' | 'none';
    timeframe: string;
    stopLossHint: string | null;
  };
  signals: {
    funding: FundingSignal | null;
    prediction: PredictionSignal | null;
    price: PriceData | null;
  };
  pipeline: {
    fundingApiCalled: boolean;
    predictionApiCalled: boolean;
    priceApiCalled: boolean;
  };
  analyzedAt: string;
}