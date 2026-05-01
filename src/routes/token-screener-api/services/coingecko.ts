import axios from 'axios';
import { logger } from '../logger';
import { Token } from '../types';

const BASE = 'https://api.coingecko.com/api/v3';
const cache = new Map<string, { data: any; ts: number }>();
const TTL = 3 * 60 * 1000; // 3 min cache

async function cachedGet(url: string, params?: any): Promise<any> {
  const key = url + JSON.stringify(params || {});
  const c = cache.get(key);
  if (c && Date.now() - c.ts < TTL) return c.data;
  const res = await axios.get(url, { params, timeout: 12000 });
  cache.set(key, { data: res.data, ts: Date.now() });
  return res.data;
}

function computeMomentumScore(coin: any): number {
  let score = 50;

  // Price momentum
  const change24h = coin.price_change_percentage_24h || 0;
  const change7d = coin.price_change_percentage_7d_in_currency || 0;

  if (change24h > 10) score += 20;
  else if (change24h > 5) score += 12;
  else if (change24h > 2) score += 6;
  else if (change24h < -10) score -= 20;
  else if (change24h < -5) score -= 12;
  else if (change24h < -2) score -= 6;

  if (change7d > 20) score += 15;
  else if (change7d > 10) score += 8;
  else if (change7d < -20) score -= 15;
  else if (change7d < -10) score -= 8;

  // Volume momentum
  const volMarketCapRatio = coin.total_volume / coin.market_cap;
  if (volMarketCapRatio > 0.5) score += 15;
  else if (volMarketCapRatio > 0.2) score += 8;
  else if (volMarketCapRatio < 0.02) score -= 10;

  // ATH proximity (if near ATH = strong momentum)
  const athChange = coin.ath_change_percentage || -100;
  if (athChange > -5) score += 10;
  else if (athChange > -15) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getSignals(coin: any): string[] {
  const signals: string[] = [];
  const change24h = coin.price_change_percentage_24h || 0;
  const change7d = coin.price_change_percentage_7d_in_currency || 0;
  const volRatio = coin.total_volume / coin.market_cap;
  const athChange = coin.ath_change_percentage || -100;

  if (change24h > 10) signals.push('🚀 Strong 24h surge');
  if (change24h < -10) signals.push('📉 Sharp 24h drop');
  if (change7d > 20) signals.push('📈 7d breakout');
  if (change7d < -20) signals.push('⚠️ 7d downtrend');
  if (volRatio > 0.3) signals.push('🔥 Volume spike');
  if (athChange > -5) signals.push('🏆 Near all-time high');
  if (athChange < -80) signals.push('💎 Deep discount from ATH');
  if (volRatio < 0.02) signals.push('😴 Low volume');

  return signals;
}

export async function getTopTokens(limit = 100, category?: string): Promise<Token[]> {
  try {
    const params: any = {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: Math.min(limit, 250),
      page: 1,
      sparkline: false,
      price_change_percentage: '1h,24h,7d',
    };
    if (category) params.category = category;

    const data = await cachedGet(`${BASE}/coins/markets`, params);

    return data.map((coin: any, index: number): Token => ({
      rank: index + 1,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      coingeckoId: coin.id,
      price: coin.current_price,
      marketCap: coin.market_cap,
      volume24h: coin.total_volume,
      volumeMarketCapRatio: Math.round((coin.total_volume / coin.market_cap) * 10000) / 10000,
      change1h: coin.price_change_percentage_1h_in_currency || null,
      change24h: coin.price_change_percentage_24h || 0,
      change7d: coin.price_change_percentage_7d_in_currency || null,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      ath: coin.ath || null,
      athChangePercent: coin.ath_change_percentage || null,
      circulatingSupply: coin.circulating_supply || null,
      totalSupply: coin.total_supply || null,
      category: category || null,
      momentumScore: computeMomentumScore(coin),
      signals: getSignals(coin),
    }));
  } catch (err: any) {
    logger.error({ err: err.message }, 'getTopTokens error');
    return [];
  }
}

export async function getCategories(): Promise<Array<{ id: string; name: string; market_cap_change_24h: number }>> {
  try {
    const data = await cachedGet(`${BASE}/coins/categories`, { order: 'market_cap_change_24h_desc' });
    return data.slice(0, 20).map((c: any) => ({
      id: c.id,
      name: c.name,
      market_cap_change_24h: c.market_cap_change_24h || 0,
    }));
  } catch (err: any) {
    logger.error({ err: err.message }, 'getCategories error');
    return [];
  }
}
