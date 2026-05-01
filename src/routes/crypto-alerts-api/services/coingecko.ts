import axios from 'axios';
import { logger } from '../logger';

const BASE = 'https://api.coingecko.com/api/v3';
const cache = new Map<string, { data: any; ts: number }>();
const TTL = 2 * 60 * 1000; // 2 min cache for alerts

async function cachedGet(url: string, params?: any): Promise<any> {
  const key = url + JSON.stringify(params || {});
  const c = cache.get(key);
  if (c && Date.now() - c.ts < TTL) return c.data;
  const res = await axios.get(url, { params, timeout: 8000 });
  cache.set(key, { data: res.data, ts: Date.now() });
  return res.data;
}

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  ARB: 'arbitrum', OP: 'optimism', AVAX: 'avalanche-2', MATIC: 'matic-network',
  LINK: 'chainlink', UNI: 'uniswap', DOGE: 'dogecoin', SUI: 'sui',
  APT: 'aptos', SEI: 'sei-network', PEPE: 'pepe', WIF: 'dogwifcoin',
  BONK: 'bonk', JUP: 'jupiter', EIGEN: 'eigenlayer', TIA: 'celestia',
};

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export async function getPrice(symbol: string): Promise<PriceData | null> {
  const id = COINGECKO_IDS[symbol.toUpperCase()];
  if (!id) return null;
  try {
    const data = await cachedGet(`${BASE}/coins/markets`, {
      vs_currency: 'usd', ids: id, per_page: 1, page: 1,
    });
    const coin = data[0];
    if (!coin) return null;
    return {
      symbol: symbol.toUpperCase(),
      price: coin.current_price,
      change24h: coin.price_change_24h || 0,
      changePercent24h: coin.price_change_percentage_24h || 0,
      high24h: coin.high_24h || 0,
      low24h: coin.low_24h || 0,
      volume24h: coin.total_volume || 0,
    };
  } catch (err: any) {
    logger.warn({ err: err.message, symbol }, 'price fetch failed');
    return null;
  }
}

export async function getMultiplePrices(symbols: string[]): Promise<Map<string, PriceData>> {
  const result = new Map<string, PriceData>();
  const ids = symbols.map(s => COINGECKO_IDS[s.toUpperCase()]).filter(Boolean);
  if (ids.length === 0) return result;
  try {
    const data = await cachedGet(`${BASE}/coins/markets`, {
      vs_currency: 'usd', ids: ids.join(','), per_page: 50, page: 1,
    });
    for (const coin of data) {
      const symbol = Object.keys(COINGECKO_IDS).find(k => COINGECKO_IDS[k] === coin.id);
      if (symbol) {
        result.set(symbol, {
          symbol,
          price: coin.current_price,
          change24h: coin.price_change_24h || 0,
          changePercent24h: coin.price_change_percentage_24h || 0,
          high24h: coin.high_24h || 0,
          low24h: coin.low_24h || 0,
          volume24h: coin.total_volume || 0,
        });
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'multi price fetch failed');
  }
  return result;
}
