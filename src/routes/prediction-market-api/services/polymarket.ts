import axios from 'axios';
import { logger } from '../logger';
import { Market } from '../types';

const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const CACHE_TTL_MS = 2 * 60 * 1000;

const cache = new Map<string, { data: any; ts: number }>();

async function cachedGet(url: string, params?: any): Promise<any> {
  const key = url + JSON.stringify(params || {});
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const res = await axios.get(url, {
    params,
    timeout: 12000,
    headers: { 'Accept': 'application/json' },
  });
  cache.set(key, { data: res.data, ts: Date.now() });
  return res.data;
}

function parseMarket(raw: any): Market {
  let outcomes: string[] = [];
  let outcomePrices: number[] = [];

  try {
    if (typeof raw.outcomes === 'string') outcomes = JSON.parse(raw.outcomes);
    else if (Array.isArray(raw.outcomes)) outcomes = raw.outcomes;
  } catch { outcomes = ['Yes', 'No']; }

  try {
    if (typeof raw.outcomePrices === 'string') outcomePrices = JSON.parse(raw.outcomePrices).map(Number);
    else if (Array.isArray(raw.outcomePrices)) outcomePrices = raw.outcomePrices.map(Number);
  } catch { outcomePrices = [0.5, 0.5]; }

  return {
    id: raw.id || raw.conditionId || '',
    question: raw.question || '',
    slug: raw.slug || '',
    category: raw.category || null,
    outcomes,
    outcomePrices,
    volume24h: parseFloat(raw.volume24hr || raw.volume24h || '0'),
    volumeTotal: parseFloat(raw.volume || raw.volumeNum || '0'),
    liquidity: parseFloat(raw.liquidity || raw.liquidityNum || '0'),
    spread: raw.spread ? parseFloat(raw.spread) : null,
    endDate: raw.endDate || raw.end_date_iso || null,
    active: raw.active !== false,
    closed: raw.closed === true,
    resolutionSource: raw.resolutionSource || null,
    description: raw.description || null,
  };
}

async function fetchAllActive(limit = 200): Promise<any[]> {
  const data = await cachedGet(`${GAMMA_BASE}/markets`, {
    active: true,
    closed: false,
    limit,
    order: 'volume',
    ascending: false,
  });
  return Array.isArray(data) ? data : data.markets || data.data || [];
}

export async function getTrendingMarkets(limit = 10, category?: string): Promise<Market[]> {
  try {
    const params: any = {
      active: true,
      closed: false,
      order: 'volume24hr',
      ascending: false,
      limit,
    };
    if (category) params.category = category;
    const data = await cachedGet(`${GAMMA_BASE}/markets`, params);
    const markets = Array.isArray(data) ? data : data.markets || data.data || [];
    return markets.map(parseMarket);
  } catch (err: any) {
    logger.error({ err: err.message }, 'Polymarket trending error');
    return [];
  }
}

export async function searchMarkets(query: string, limit = 10): Promise<Market[]> {
  try {
    const markets = await fetchAllActive(300);
    const words = query.toLowerCase().split(' ').filter((w) => w.length > 1);

    // Score each market
    const scored = markets.map((m: any) => {
      const question = (m.question || '').toLowerCase();
      const slug = (m.slug || '').toLowerCase();
      const desc = (m.description || '').toLowerCase();
      let score = 0;
      for (const word of words) {
        if (question.includes(word)) score += 3;
        if (slug.includes(word)) score += 2;
        if (desc.includes(word)) score += 1;
      }
      return { m, score };
    });

    const filtered = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => parseMarket(s.m));

    return filtered;
  } catch (err: any) {
    logger.error({ err: err.message, query }, 'Polymarket search error');
    return [];
  }
}

export async function getMarketById(id: string): Promise<Market | null> {
  try {
    const markets = await fetchAllActive(300);
    const found = markets.find((m: any) =>
      m.slug === id || m.id === id || (m.slug || '').includes(id.toLowerCase())
    );
    return found ? parseMarket(found) : null;
  } catch (err: any) {
    logger.error({ err: err.message, id }, 'Polymarket getMarket error');
    return null;
  }
}

export async function getMarketsByCategory(category: string, limit = 10): Promise<Market[]> {
  try {
    const data = await cachedGet(`${GAMMA_BASE}/markets`, {
      active: true,
      closed: false,
      category,
      order: 'volume',
      ascending: false,
      limit,
    });
    const markets = Array.isArray(data) ? data : data.markets || data.data || [];
    return markets.map(parseMarket);
  } catch (err: any) {
    logger.error({ err: err.message, category }, 'Polymarket category error');
    return [];
  }
}