import axios from 'axios';

const BASE = 'https://api.coingecko.com/api/v3';
const cache: Record<string, { data: any; time: number }> = {};
const TTL = 10 * 60 * 1000;

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  if (cache[key] && now - cache[key].time < TTL) return cache[key].data;
  const data = await fetcher();
  cache[key] = { data, time: now };
  return data;
}

const SYMBOL_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  NEAR: 'near',
  APT: 'aptos',
  OP: 'optimism',
  ARB: 'arbitrum',
  SUI: 'sui',
  INJ: 'injective-protocol',
};

export async function getCoinData(id: string) {
  return cached(`coin:${id}`, async () => {
    const res = await axios.get(`${BASE}/coins/${id}`, {
      params: { localization: false, tickers: false, market_data: true, community_data: false, developer_data: false },
      timeout: 10000,
    });
    return res.data;
  });
}

export async function resolveId(token: string): Promise<string> {
  const upper = token.toUpperCase();
  if (SYMBOL_MAP[upper]) return SYMBOL_MAP[upper];
  try {
    await getCoinData(token.toLowerCase());
    return token.toLowerCase();
  } catch {
    const res = await axios.get(`${BASE}/search`, { params: { query: token }, timeout: 8000 });
    const coins = res.data.coins;
    if (!coins || coins.length === 0) throw new Error(`Token not found: ${token}`);
    return coins[0].id;
  }
}

export function extractTokenomics(data: any) {
  const md = data.market_data || {};
  const circulating = md.circulating_supply || 0;
  const total = md.total_supply || circulating;
  const max = md.max_supply || null;
  const price = md.current_price?.usd || 0;
  const marketCap = md.market_cap?.usd || 0;
  const fdv = md.fully_diluted_valuation?.usd || null;
  const inflationRate = max && circulating ? Math.round(((total - circulating) / circulating) * 100 * 100) / 100 : null;
  const circulatingPct = max
    ? Math.round((circulating / max) * 10000) / 100
    : total ? Math.round((circulating / total) * 10000) / 100 : null;
  const fdvToMcap = fdv && marketCap ? Math.round((fdv / marketCap) * 100) / 100 : null;
  return {
    name: data.name,
    symbol: data.symbol?.toUpperCase(),
    circulating: Math.round(circulating),
    total: Math.round(total),
    max: max ? Math.round(max) : null,
    circulatingPct,
    inflationRate,
    price,
    marketCap,
    fullyDilutedValuation: fdv,
    fdvToMcapRatio: fdvToMcap,
    categories: data.categories || [],
    genesisDate: data.genesis_date || null,
  };
}
