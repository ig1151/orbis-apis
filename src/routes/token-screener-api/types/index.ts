export interface Token {
  rank: number;
  symbol: string;
  name: string;
  coingeckoId: string;
  price: number;
  marketCap: number;
  volume24h: number;
  volumeMarketCapRatio: number;
  change1h: number | null;
  change24h: number;
  change7d: number | null;
  high24h: number;
  low24h: number;
  ath: number | null;
  athChangePercent: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  category: string | null;
  momentumScore: number; // 0-100
  signals: string[];
}

export interface ScreenerResult {
  filter: string;
  count: number;
  tokens: Token[];
  generatedAt: string;
}

export interface OpportunityResult {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  momentumScore: number;
  opportunityType: string;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
}
