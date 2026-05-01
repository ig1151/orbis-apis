import axios from 'axios';
import { logger } from '../logger';

const BASE = 'https://api.coingecko.com/api/v3';
const cache = new Map<string, { data: any; ts: number }>();
const TTL = 10 * 60 * 1000;

async function cachedGet(url: string, params?: any): Promise<any> {
  const key = url + JSON.stringify(params || {});
  const c = cache.get(key);
  if (c && Date.now() - c.ts < TTL) return c.data;
  const res = await axios.get(url, { params, timeout: 8000 });
  cache.set(key, { data: res.data, ts: Date.now() });
  return res.data;
}

// Get price for a token by contract address
export async function getTokenPriceByContract(contractAddress: string, chain = 'ethereum'): Promise<number | null> {
  const platformMap: Record<string, string> = {
    ethereum: 'ethereum',
    base: 'base',
    arbitrum: 'arbitrum-one',
    polygon: 'polygon-pos',
    optimism: 'optimistic-ethereum',
    bsc: 'binance-smart-chain',
  };
  const platform = platformMap[chain.toLowerCase()] || 'ethereum';
  try {
    const data = await cachedGet(`${BASE}/simple/token_price/${platform}`, {
      contract_addresses: contractAddress.toLowerCase(),
      vs_currencies: 'usd',
    });
    const price = data[contractAddress.toLowerCase()]?.usd;
    return price || null;
  } catch (err: any) {
    logger.warn({ err: err.message, contractAddress }, 'token price fetch failed');
    return null;
  }
}

export async function getEthPriceFromCoinGecko(): Promise<number | null> {
  try {
    const data = await cachedGet(`${BASE}/simple/price`, { ids: 'ethereum', vs_currencies: 'usd' });
    return data.ethereum?.usd || null;
  } catch {
    return null;
  }
}
