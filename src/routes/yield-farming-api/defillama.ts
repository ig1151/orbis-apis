import axios from 'axios';

const YIELDS_API = 'https://yields.llama.fi';

export interface Pool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  apyMean30d: number | null;
  volumeUsd1d: number | null;
  il7d: number | null;
  ilRisk: string | null;
  stablecoin: boolean;
  exposure: string | null;
  underlyingTokens: string[] | null;
  rewardTokens: string[] | null;
  poolMeta: string | null;
  outlier: boolean;
}

let poolCache: Pool[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchAllPools(): Promise<Pool[]> {
  const now = Date.now();
  if (poolCache && now - cacheTime < CACHE_TTL) return poolCache;

  const res = await axios.get(`${YIELDS_API}/pools`, { timeout: 20000 });
  poolCache = res.data.data as Pool[];
  cacheTime = now;
  return poolCache;
}

export async function fetchPool(poolId: string): Promise<Pool | null> {
  const pools = await fetchAllPools();
  return pools.find(p => p.pool === poolId) || null;
}
