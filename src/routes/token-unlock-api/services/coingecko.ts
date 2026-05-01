import axios from 'axios';
import { logger } from '../logger';

const BASE_URL = 'https://api.coingecko.com/api/v3';
const cache = new Map<string, { data: any; ts: number }>();
const TTL = 10 * 60 * 1000;

async function cachedGet(url: string, params?: any): Promise<any> {
  const key = url + JSON.stringify(params || {});
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) return cached.data;
  const res = await axios.get(url, { params, timeout: 10000 });
  cache.set(key, { data: res.data, ts: Date.now() });
  return res.data;
}

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  circulating_supply: number;
  total_supply: number;
  price_change_percentage_24h: number;
}

export async function getCoinData(coingeckoId: string): Promise<CoinData | null> {
  try {
    const data = await cachedGet(`${BASE_URL}/coins/markets`, {
      vs_currency: 'usd',
      ids: coingeckoId,
      per_page: 1,
      page: 1,
    });
    return data[0] || null;
  } catch (err: any) {
    logger.error({ err: err.message, coingeckoId }, 'CoinGecko fetch error');
    return null;
  }
}

export async function getMultipleCoins(ids: string[]): Promise<Map<string, CoinData>> {
  const result = new Map<string, CoinData>();
  if (ids.length === 0) return result;
  try {
    const data = await cachedGet(`${BASE_URL}/coins/markets`, {
      vs_currency: 'usd',
      ids: ids.join(','),
      per_page: 50,
      page: 1,
    });
    for (const coin of data) {
      result.set(coin.id, coin);
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'CoinGecko multi fetch error');
  }
  return result;
}
