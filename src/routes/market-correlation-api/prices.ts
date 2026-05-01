import axios from 'axios';

const cache: Record<string, { data: number[]; time: number }> = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function cached(key: string, fetcher: () => Promise<number[]>): Promise<number[]> {
  const now = Date.now();
  if (cache[key] && now - cache[key].time < CACHE_TTL) return cache[key].data;
  const data = await fetcher();
  cache[key] = { data, time: now };
  return data;
}

export async function fetchYahooPrices(ticker: string, days: number = 90): Promise<number[]> {
  return cached(`yahoo:${ticker}:${days}`, async () => {
    const now = Math.floor(Date.now() / 1000);
    const from = now - days * 24 * 60 * 60;
    const res = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`, {
      params: { period1: from, period2: now, interval: '1d', includePrePost: false },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });
    const closes: number[] = res.data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    return closes.filter((c: number | null) => c !== null && !isNaN(c));
  });
}

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
};

export async function fetchCryptoPrices(asset: string, days: number = 90): Promise<number[]> {
  return cached(`coingecko:${asset}:${days}`, async () => {
    const id = COINGECKO_IDS[asset.toUpperCase()];
    if (!id) throw new Error(`Unknown crypto asset: ${asset}`);
    const res = await axios.get(`https://api.coingecko.com/api/v3/coins/${id}/market_chart`, {
      params: { vs_currency: 'usd', days, interval: 'daily' },
      timeout: 10000,
    });
    return (res.data.prices as [number, number][]).map(([, price]) => price);
  });
}
