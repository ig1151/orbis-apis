import axios from 'axios';
import { logger } from '../logger';

export interface StrategyResult {
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
  signals: {
    price: {
      price: number;
      changePercent24h: number;
    } | null;
  };
}

export async function getStrategySignal(symbol: string, _predictionQuery?: string): Promise<StrategyResult | null> {
  const baseUrl = process.env.STRATEGY_API_URL || 'https://orbis-apis.onrender.com';
  try {
    const res = await axios.post(`${baseUrl}/strategy-signal/generate`, { symbol, timeframe: '1d' }, { timeout: 30000 });
    const d = res.data;
    return {
      symbol,
      decision:      d.signal    ?? 'HOLD',
      signalScore:   Math.round((d.confidence ?? 0.5) * 10),
      confidence:    d.confidence ?? 0.5,
      riskLevel:     (d.confidence ?? 0.5) >= 0.7 ? 'low' : (d.confidence ?? 0.5) >= 0.4 ? 'medium' : 'high',
      invalidatedIf: null,
      action: {
        bias:          d.direction  ?? 'neutral',
        suggestedSize: '1-2%',
        timeframe:     '1d',
        stopLossHint:  d.stop_loss  ?? null,
      },
      reasoning:   d.reasoning   ?? '',
      keyFactors:  d.key_factors  ?? [],
      signals:     { price: null },
    };
  } catch (err: any) {
    logger.warn({ err: err.message, symbol }, 'Strategy signal fetch failed');
    return null;
  }
}