import axios from 'axios';
import { logger } from '../logger';
import { PredictionSignal } from '../types';

export async function getPredictionSignal(query: string): Promise<PredictionSignal | null> {
  const baseUrl = process.env.PREDICTION_MARKET_API_URL || 'https://prediction-market-api-g0xb.onrender.com';
  try {
    const res = await axios.get(`${baseUrl}/v1/markets/signal`, {
      params: { q: query },
      timeout: 20000,
    });
    return res.data.data as PredictionSignal;
  } catch (err: any) {
    logger.warn({ err: err.message, query }, 'Prediction signal fetch failed');
    return null;
  }
}
