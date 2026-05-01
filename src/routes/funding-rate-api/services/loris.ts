import axios from 'axios';
import { logger } from '../logger';

const LORIS_URL = 'https://api.loris.tools/funding';
const CACHE_TTL_MS = 60 * 1000;

let cache: { data: any; timestamp: number } | null = null;

export interface LorisData {
  symbols: string[];
  exchanges: {
    exchange_names: Array<{ name: string; display: string }>;
    exchanges: string[];
  };
  funding_rates: Record<string, Record<string, number>>;
  oi_rankings: Record<string, string>;
  timestamp: string;
}

export async function getLorisFundingData(): Promise<LorisData | null> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const res = await axios.get(LORIS_URL, { timeout: 10000 });
    cache = { data: res.data, timestamp: now };
    logger.info({ exchanges: res.data.exchanges?.exchanges?.length, symbols: res.data.symbols?.length }, 'Loris data refreshed');
    return res.data;
  } catch (err: any) {
    logger.error({ err: err.message }, 'Loris fetch error');
    return cache?.data || null;
  }
}

export function convertRate(rawRate: number, interval: '1h' | '4h' | '8h'): { rate8h: number; annualized: number } {
  // Loris rates are multiplied by 10,000 for precision (e.g. 8 = 0.0008%)
  const ratePct = rawRate / 10000;
  const intervalsPerDay = interval === '1h' ? 24 : interval === '4h' ? 6 : 3;
  const rate8h = ratePct * (8 / (24 / intervalsPerDay));
  const annualized = Math.round(rate8h * 3 * 365 * 100) / 100;
  return { rate8h: Math.round(rate8h * 100000) / 100000, annualized };
}

const HOURLY_EXCHANGES = new Set(['hyperliquid', 'extended', 'vest', 'lighter', 'drift', 'bluefin', 'paradex']);
const FOUR_HOUR_EXCHANGES = new Set(['phemex']);

export function getInterval(exchange: string): '1h' | '4h' | '8h' {
  if (HOURLY_EXCHANGES.has(exchange.toLowerCase())) return '1h';
  if (FOUR_HOUR_EXCHANGES.has(exchange.toLowerCase())) return '4h';
  return '8h';
}