export interface ExchangeRate {
  exchange: string;
  symbol: string;
  rate: number; // annualized %
  rate8h: number; // 8h rate %
  interval: '1h' | '4h' | '8h';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  updatedAt: string;
}

export interface FundingRateNow {
  symbol: string;
  rates: ExchangeRate[];
  averageRate: number;
  maxRate: number;
  minRate: number;
  overallSentiment: 'STRONGLY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONGLY_BEARISH';
  updatedAt: string;
}

export interface ArbitrageOpportunity {
  symbol: string;
  longExchange: string;
  shortExchange: string;
  longRate: number;
  shortRate: number;
  spreadAnnualized: number;
  spread8h: number;
  profitableAfterFees: boolean;
}

export interface FundingCompare {
  symbol: string;
  exchanges: ExchangeRate[];
  arbitrageOpportunities: ArbitrageOpportunity[];
  updatedAt: string;
}

export interface ExtremeRate {
  symbol: string;
  exchange: string;
  rate: number;
  rate8h: number;
  direction: 'LONG_HEAVY' | 'SHORT_HEAVY';
}

export interface FundingSignal {
  symbol: string;
  averageRate: number;
  ratesByExchange: Record<string, number>;
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  signalScore: number; // -100 to +100
  narrative: string;
  keyInsight: string;
  recommendation: string;
  analyzedAt: string;
}
