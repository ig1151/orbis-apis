import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { fetchAllPools, fetchPool } from './defillama';
import { scoreRisk, estimateIL, formatPool } from './analytics';

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'yield-farming-api', timestamp: new Date().toISOString() });
});

// ── top yields ─────────────────────────────────────────────────────────────
router.get('/yields/top', async (req: Request, res: Response) => {
  const schema = Joi.object({
    limit:   Joi.number().integer().min(1).max(50).default(10),
    minTvl:  Joi.number().min(0).default(1_000_000),
    maxRisk: Joi.number().integer().min(1).max(5).default(5),
    chain:   Joi.string().optional(),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const pools = await fetchAllPools();
    let filtered = pools
      .filter(p => p.tvlUsd >= value.minTvl)
      .filter(p => !value.chain || p.chain?.toLowerCase() === value.chain.toLowerCase())
      .map(p => ({ ...p, riskScore: scoreRisk(p) }))
      .filter(p => p.riskScore <= value.maxRisk)
      .sort((a, b) => (b.apy || 0) - (a.apy || 0))
      .slice(0, value.limit);

    res.json({
      timestamp: new Date().toISOString(),
      count: filtered.length,
      pools: filtered.map(formatPool),
    });
  } catch (err: any) {
    console.error('[top]', err.message);
    res.status(502).json({ error: 'Failed to fetch yields', detail: err.message });
  }
});

// ── search ─────────────────────────────────────────────────────────────────
router.get('/yields/search', async (req: Request, res: Response) => {
  const schema = Joi.object({
    token:    Joi.string().optional(),
    chain:    Joi.string().optional(),
    protocol: Joi.string().optional(),
    limit:    Joi.number().integer().min(1).max(50).default(10),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });
  if (!value.token && !value.chain && !value.protocol) {
    return res.status(400).json({ error: 'At least one of token, chain, or protocol is required' });
  }

  try {
    const pools = await fetchAllPools();
    let filtered = pools.filter(p => {
      const sym = (p.symbol || '').toLowerCase();
      const ch  = (p.chain || '').toLowerCase();
      const proj = (p.project || '').toLowerCase();
      if (value.token    && !sym.includes(value.token.toLowerCase()))    return false;
      if (value.chain    && ch  !== value.chain.toLowerCase())           return false;
      if (value.protocol && !proj.includes(value.protocol.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (b.apy || 0) - (a.apy || 0))
    .slice(0, value.limit);

    res.json({
      timestamp: new Date().toISOString(),
      query: value,
      count: filtered.length,
      pools: filtered.map(p => ({ ...formatPool(p), riskScore: scoreRisk(p) })),
    });
  } catch (err: any) {
    console.error('[search]', err.message);
    res.status(502).json({ error: 'Failed to search yields', detail: err.message });
  }
});

// ── single pool ────────────────────────────────────────────────────────────
router.get('/yields/pool/:poolId', async (req: Request, res: Response) => {
  const { poolId } = req.params;
  if (!poolId) return res.status(400).json({ error: 'poolId is required' });

  try {
    const pool = await fetchPool(poolId);
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const riskScore = scoreRisk(pool);
    const il = estimateIL(pool);

    res.json({
      timestamp: new Date().toISOString(),
      ...formatPool(pool),
      riskScore,
      riskLabel: riskLabel(riskScore),
      impermanentLoss: il,
    });
  } catch (err: any) {
    console.error('[pool]', err.message);
    res.status(502).json({ error: 'Failed to fetch pool', detail: err.message });
  }
});

// ── by chain ───────────────────────────────────────────────────────────────
router.get('/yields/chains', async (_req: Request, res: Response) => {
  try {
    const pools = await fetchAllPools();
    const chainMap: Record<string, { count: number; totalTvl: number; maxApy: number; avgApy: number; apySum: number }> = {};

    for (const p of pools) {
      const ch = p.chain || 'unknown';
      if (!chainMap[ch]) chainMap[ch] = { count: 0, totalTvl: 0, maxApy: 0, avgApy: 0, apySum: 0 };
      chainMap[ch].count++;
      chainMap[ch].totalTvl += p.tvlUsd || 0;
      chainMap[ch].apySum += p.apy || 0;
      if ((p.apy || 0) > chainMap[ch].maxApy) chainMap[ch].maxApy = p.apy || 0;
    }

    const chains = Object.entries(chainMap)
      .map(([chain, d]) => ({
        chain,
        poolCount: d.count,
        totalTvlUSD: Math.round(d.totalTvl),
        maxApy: Math.round(d.maxApy * 100) / 100,
        avgApy: Math.round((d.apySum / d.count) * 100) / 100,
      }))
      .sort((a, b) => b.totalTvlUSD - a.totalTvlUSD)
      .slice(0, 30);

    res.json({ timestamp: new Date().toISOString(), chains });
  } catch (err: any) {
    console.error('[chains]', err.message);
    res.status(502).json({ error: 'Failed to fetch chain data', detail: err.message });
  }
});

// ── stablecoins ────────────────────────────────────────────────────────────
router.get('/yields/stable', async (req: Request, res: Response) => {
  const schema = Joi.object({ limit: Joi.number().integer().min(1).max(50).default(10) });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const pools = await fetchAllPools();
    const stables = ['usdc', 'usdt', 'dai', 'frax', 'usde', 'susd', 'tusd', 'busd', 'lusd', 'crvusd', 'gusd'];
    const filtered = pools
      .filter(p => {
        const sym = (p.symbol || '').toLowerCase();
        return stables.some(s => sym.includes(s));
      })
      .filter(p => p.tvlUsd >= 500_000)
      .sort((a, b) => (b.apy || 0) - (a.apy || 0))
      .slice(0, value.limit);

    res.json({
      timestamp: new Date().toISOString(),
      count: filtered.length,
      pools: filtered.map(p => ({
        ...formatPool(p),
        riskScore: scoreRisk(p),
        ilRisk: 'none',
      })),
    });
  } catch (err: any) {
    console.error('[stable]', err.message);
    res.status(502).json({ error: 'Failed to fetch stablecoin yields', detail: err.message });
  }
});

function riskLabel(score: number): string {
  if (score === 1) return 'low';
  if (score === 2) return 'low-medium';
  if (score === 3) return 'medium';
  if (score === 4) return 'high';
  return 'very high';
}

// ── strategy ───────────────────────────────────────────────────────────────
router.get('/yields/strategy', async (req: Request, res: Response) => {
  const schema = Joi.object({
    risk:    Joi.string().valid('conservative', 'moderate', 'aggressive').default('moderate'),
    capital: Joi.number().min(0).optional(),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const pools = await fetchAllPools();
    const { buildStrategy } = await import('./strategy');
    const result = await buildStrategy(pools, value.risk, value.capital || null);
    res.json({ timestamp: new Date().toISOString(), risk_profile: value.risk, ...result });
  } catch (err: any) {
    console.error('[strategy]', err.message);
    res.status(502).json({ error: 'Failed to build strategy', detail: err.message });
  }
});

router.post('/yields/top', async (req, res) => {
  const schema2 = Joi.object({ limit: Joi.number().integer().min(1).max(50).default(10), minTvl: Joi.number().min(0).default(1_000_000), maxRisk: Joi.number().integer().min(1).max(5).default(5), chain: Joi.string().optional() });
  const { error, value } = schema2.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const pools = await fetchAllPools();
    const filtered = pools.filter(p => p.tvlUsd >= value.minTvl).filter(p => !value.chain || p.chain?.toLowerCase() === value.chain.toLowerCase()).map(p => ({ ...p, riskScore: scoreRisk(p) })).filter(p => p.riskScore <= value.maxRisk).sort((a, b) => (b.apy || 0) - (a.apy || 0)).slice(0, value.limit);
    res.json({ timestamp: new Date().toISOString(), count: filtered.length, pools: filtered.map(formatPool) });
  } catch (err: any) { res.status(502).json({ error: 'Failed to fetch yields', detail: err.message }); }
});
router.post('/yields/search', async (req, res) => {
  const schema2 = Joi.object({ token: Joi.string().optional(), chain: Joi.string().optional(), protocol: Joi.string().optional(), limit: Joi.number().integer().min(1).max(50).default(10) });
  const { error, value } = schema2.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  if (!value.token && !value.chain && !value.protocol) return res.status(400).json({ error: 'At least one of token, chain, or protocol is required' });
  try {
    const pools = await fetchAllPools();
    const filtered = pools.filter(p => { const sym = (p.symbol || '').toLowerCase(); const ch = (p.chain || '').toLowerCase(); const proj = (p.project || '').toLowerCase(); if (value.token && !sym.includes(value.token.toLowerCase())) return false; if (value.chain && ch !== value.chain.toLowerCase()) return false; if (value.protocol && !proj.includes(value.protocol.toLowerCase())) return false; return true; }).sort((a, b) => (b.apy || 0) - (a.apy || 0)).slice(0, value.limit);
    res.json({ timestamp: new Date().toISOString(), query: value, count: filtered.length, pools: filtered.map(p => ({ ...formatPool(p), riskScore: scoreRisk(p) })) });
  } catch (err: any) { res.status(502).json({ error: 'Failed to search yields', detail: err.message }); }
});
router.post('/yields/strategy', async (req, res) => {
  const schema2 = Joi.object({ risk: Joi.string().valid('conservative', 'moderate', 'aggressive').default('moderate'), capital: Joi.number().min(0).optional() });
  const { error, value } = schema2.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const pools = await fetchAllPools();
    const { buildStrategy } = await import('./strategy');
    const result = await buildStrategy(pools, value.risk, value.capital || null);
    res.json({ timestamp: new Date().toISOString(), risk_profile: value.risk, ...result });
  } catch (err: any) { res.status(502).json({ error: 'Failed to build strategy', detail: err.message }); }
});
