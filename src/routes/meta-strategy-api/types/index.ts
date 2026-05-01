export interface SymbolResult {
  symbol: string;
  decision: string;
  signalScore: number;
  confidence: number;
  riskLevel: string;
  invalidatedIf: string | null;
  action: {
    bias: string;
    suggestedSize: string;
    timeframe: string;
    stopLossHint: string | null;
  };
  reasoning: string;
  keyFactors: string[];
  price: number | null;
  changePercent24h: number | null;
  rank: number;
}

export interface MetaScanResult {
  scannedSymbols: string[];
  scannedCount: number;
  successCount: number;
  topOpportunity: SymbolResult | null;
  ranked: SymbolResult[];
  buySignals: SymbolResult[];
  sellSignals: SymbolResult[];
  holdSignals: SymbolResult[];
  marketBias: 'RISK_ON' | 'RISK_OFF' | 'MIXED' | 'NEUTRAL';
  portfolioNarrative: string;
  bestBuy: SymbolResult | null;
  bestSell: SymbolResult | null;
  analyzedAt: string;
}
