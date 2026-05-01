export interface Market {
  id: string;
  question: string;
  slug: string;
  category: string | null;
  outcomes: string[];
  outcomePrices: number[]; // probability 0-1
  volume24h: number;
  volumeTotal: number;
  liquidity: number;
  spread: number | null;
  endDate: string | null;
  active: boolean;
  closed: boolean;
  resolutionSource: string | null;
  description: string | null;
}

export interface MarketDetail extends Market {
  conditionId: string | null;
  tags: string[];
  relatedMarkets: Market[];
}

export interface MarketSignal {
  marketId: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  impliedProbability: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  signal: 'STRONG_YES' | 'YES' | 'UNCERTAIN' | 'NO' | 'STRONG_NO';
  narrative: string;
  keyFactors: string[];
  tradingImplication: string;
  analyzedAt: string;
}
