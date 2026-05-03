import axios from 'axios';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

const CHAIN_MAP: Record<string, string> = {
  ethereum: 'ethereum',
  eth: 'ethereum',
  solana: 'solana',
  sol: 'solana',
  base: 'base',
  polygon: 'polygon-pos',
  matic: 'polygon-pos',
  arbitrum: 'arbitrum-one',
  avalanche: 'avalanche',
  avax: 'avalanche',
  bsc: 'binance-smart-chain',
};

export async function getTokenPrice(coinId: string): Promise<any> {
  const { data } = await axios.get(`${COINGECKO_BASE}/coins/markets`, {
    params: { vs_currency: 'usd', ids: coinId, order: 'market_cap_desc', per_page: 1, page: 1, sparkline: false },
    timeout: 8000,
  });
  if (!data || data.length === 0) throw new Error(`Token not found: ${coinId}`);
  return data[0];
}

export async function getMultipleTokenPrices(coinIds: string[]): Promise<any> {
  const { data } = await axios.get(`${COINGECKO_BASE}/simple/price`, {
    params: { ids: coinIds.join(','), vs_currencies: 'usd', include_market_cap: true, include_24hr_vol: true, include_24hr_change: true, include_last_updated_at: true },
    timeout: 8000,
  });
  return data;
}

export async function getTokensByChain(chain: string, limit: number = 10): Promise<any[]> {
  const platformId = CHAIN_MAP[chain.toLowerCase()];
  if (!platformId) throw new Error(`Unsupported chain: ${chain}. Supported: ${Object.keys(CHAIN_MAP).join(', ')}`);
  const { data } = await axios.get(`${COINGECKO_BASE}/coins/markets`, {
    params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: Math.min(limit, 50), page: 1, sparkline: false },
    timeout: 10000,
  });
  return data;
}

export async function getTrendingTokens(): Promise<any[]> {
  const { data } = await axios.get(`${COINGECKO_BASE}/search/trending`, { timeout: 8000 });
  return (data.coins || []).map((c: any) => ({
    id: c.item.id,
    symbol: c.item.symbol,
    name: c.item.name,
    market_cap_rank: c.item.market_cap_rank,
    price_btc: c.item.price_btc,
  }));
}
