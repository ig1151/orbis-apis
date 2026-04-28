export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalResponse {
  asset: string;
  decision: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  confidence: number;
  risk: 'low' | 'medium' | 'high';
  action: string;
  verdict: 'proceed' | 'proceed_with_caution' | 'wait' | 'avoid';
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: 'strong' | 'moderate' | 'weak';
  volatility: 'high' | 'medium' | 'low';
  factors: {
    rsi: number;
    macd: string;
    volume_spike: boolean;
    ma_crossover: string;
    price_change_1d: number;
    price_change_7d: number;
    price_change_30d: number;
  };
  reasons: string[];
}