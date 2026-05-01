import axios from 'axios';
import { logger } from '../logger';

const BASE_URL = 'https://api.coingecko.com/api/v3';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const cache: Map<string, { data: any; timestamp: number }> = new Map();

async function cachedGet(url: string, params?: Record<string, any>): Promise<any> {
  const key = url + JSON.stringify(params || {});
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  const res = await axios.get(url, { params, timeout: 10000 });
  cache.set(key, { data: res.data, timestamp: Date.now() });
  return res.data;
}

export interface CoinCategory {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  volume_24h: number;
  top_3_coins: string[];
}

export async function getCategories(): Promise<CoinCategory[]> {
  try {
    return await cachedGet(`${BASE_URL}/coins/categories`, { order: 'market_cap_change_24h_desc' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'CoinGecko categories error');
    return [];
  }
}

export async function getCoinsByCategory(categoryId: string, limit = 5): Promise<Array<{ id: string; symbol: string; name: string; price_change_percentage_24h: number }>> {
  try {
    const data = await cachedGet(`${BASE_URL}/coins/markets`, {
      vs_currency: 'usd',
      category: categoryId,
      order: 'market_cap_desc',
      per_page: limit,
      page: 1,
    });
    return data.map((c: any) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      price_change_percentage_24h: c.price_change_percentage_24h,
    }));
  } catch (err: any) {
    logger.error({ err: err.message, categoryId }, 'CoinGecko coins by category error');
    return [];
  }
}
