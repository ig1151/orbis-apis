import axios from 'axios';
import { logger } from '../logger';
import { FundingSignal } from '../types';

export async function getFundingSignal(symbol: string): Promise<FundingSignal | null> {
  const baseUrl = process.env.FUNDING_RATE_API_URL || 'https://funding-rate-api.onrender.com';
  try {
    const res = await axios.get(`${baseUrl}/v1/rates/signal`, {
      params: { symbol },
      timeout: 15000,
    });
    return res.data.data as FundingSignal;
  } catch (err: any) {
    logger.warn({ err: err.message, symbol }, 'Funding signal fetch failed');
    return null;
  }
}
