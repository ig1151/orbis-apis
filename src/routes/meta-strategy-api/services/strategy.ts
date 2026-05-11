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

export async function getStrategySignal(symbol: string, predictionQuery?: string): Promise<StrategyResult | null> {
  const baseUrl = process.env.STRATEGY_API_URL || 'https://orbis-apis.onrender.com';
  try {
    const res = await axios.get(`${baseUrl}/strategy-signal`, {
      params: { symbol, ...(predictionQuery ? { predictionQuery } : {}) },
      timeout: 30000,
    });
    return res.data.data as StrategyResult;
  } catch (err: any) {
    logger.warn({ err: err.message, symbol }, 'Strategy signal fetch failed');
    return null;
  }
}