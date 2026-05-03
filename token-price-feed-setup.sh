#!/bin/bash
set -e

API_NAME="token-price-feed"
BASE="src/routes/$API_NAME"

mkdir -p "$BASE/routes"
mkdir -p "$BASE/services"

cat > "$BASE/services/priceService.ts" << 'EOF'
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

export interface TokenPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  last_updated: string;
}

export interface MultiPriceResult {
  [symbol: string]: {
    usd: number;
    usd_24h_change: number;
    usd_market_cap: number;
    usd_24h_vol: number;
    last_updated_at: number;
  };
}

export async function getTokenPrice(coinId: string): Promise<TokenPrice> {
  const { data } = await axios.get(`${COINGECKO_BASE}/coins/markets`, {
    params: {
      vs_currency: 'usd',
      ids: coinId,
      order: 'market_cap_desc',
      per_page: 1,
      page: 1,
      sparkline: false,
    },
    timeout: 8000,
  });

  if (!data || data.length === 0) {
    throw new Error(`Token not found: ${coinId}`);
  }

  return data[0];
}

export async function getMultipleTokenPrices(coinIds: string[]): Promise<MultiPriceResult> {
  const { data } = await axios.get(`${COINGECKO_BASE}/simple/price`, {
    params: {
      ids: coinIds.join(','),
      vs_currencies: 'usd',
      include_market_cap: true,
      include_24hr_vol: true,
      include_24hr_change: true,
      include_last_updated_at: true,
    },
    timeout: 8000,
  });

  return data;
}

export async function getTokensByChain(chain: string, limit: number = 10): Promise<TokenPrice[]> {
  const platformId = CHAIN_MAP[chain.toLowerCase()];
  if (!platformId) {
    throw new Error(`Unsupported chain: ${chain}. Supported: ${Object.keys(CHAIN_MAP).join(', ')}`);
  }

  const { data } = await axios.get(`${COINGECKO_BASE}/coins/markets`, {
    params: {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: Math.min(limit, 50),
      page: 1,
      sparkline: false,
    },
    timeout: 10000,
  });

  return data;
}

export async function getTrendingTokens(): Promise<any[]> {
  const { data } = await axios.get(`${COINGECKO_BASE}/search/trending`, {
    timeout: 8000,
  });

  return (data.coins || []).map((c: any) => ({
    id: c.item.id,
    symbol: c.item.symbol,
    name: c.item.name,
    market_cap_rank: c.item.market_cap_rank,
    price_btc: c.item.price_btc,
  }));
}
EOF

cat > "$BASE/routes/price.ts" << 'EOF'
import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { getTokenPrice, getMultipleTokenPrices, getTokensByChain, getTrendingTokens } from '../services/priceService';

const router = Router();

router.get('/price/:coinId', async (req: Request, res: Response) => {
  const { coinId } = req.params;
  if (!coinId || coinId.length > 100) {
    res.status(400).json({ error: 'Invalid coinId' });
    return;
  }
  try {
    const price = await getTokenPrice(coinId.toLowerCase());
    res.json({ success: true, data: price });
  } catch (err: any) {
    console.log(`[token-price-feed] price error: ${err.message}`);
    if (err.message?.includes('not found')) {
      res.status(404).json({ error: err.message });
    } else {
      res.status(502).json({ error: 'Failed to fetch price data', detail: err.message });
    }
  }
});

router.get('/multi', async (req: Request, res: Response) => {
  const schema = Joi.object({ ids: Joi.string().max(500).required() });
  const { error, value } = schema.validate(req.query);
  if (error) {
    res.status(400).json({ error: 'Validation failed', detail: error.details[0].message });
    return;
  }
  const ids = value.ids.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  if (ids.length === 0 || ids.length > 25) {
    res.status(400).json({ error: 'Provide between 1 and 25 coin IDs' });
    return;
  }
  try {
    const prices = await getMultipleTokenPrices(ids);
    res.json({ success: true, count: Object.keys(prices).length, data: prices });
  } catch (err: any) {
    console.log(`[token-price-feed] multi error: ${err.message}`);
    res.status(502).json({ error: 'Failed to fetch prices', detail: err.message });
  }
});

router.get('/chain/:chain', async (req: Request, res: Response) => {
  const { chain } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  try {
    const tokens = await getTokensByChain(chain, limit);
    res.json({ success: true, chain, count: tokens.length, data: tokens });
  } catch (err: any) {
    console.log(`[token-price-feed] chain error: ${err.message}`);
    if (err.message?.includes('Unsupported chain')) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(502).json({ error: 'Failed to fetch chain tokens', detail: err.message });
    }
  }
});

router.get('/trending', async (_req: Request, res: Response) => {
  try {
    const trending = await getTrendingTokens();
    res.json({ success: true, count: trending.length, data: trending });
  } catch (err: any) {
    console.log(`[token-price-feed] trending error: ${err.message}`);
    res.status(502).json({ error: 'Failed to fetch trending tokens', detail: err.message });
  }
});

export default router;
EOF

echo "✅ token-price-feed files created successfully"
