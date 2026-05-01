import { Pool } from './defillama';

// ── Risk Scoring 1–5 ───────────────────────────────────────────────────────
export function scoreRisk(pool: Pool): number {
  let score = 1;

  // TVL — lower TVL = higher risk
  if (pool.tvlUsd < 100_000)       score += 2;
  else if (pool.tvlUsd < 500_000)  score += 1;

  // APY — extremely high APY = higher risk
  if ((pool.apy || 0) > 200)       score += 2;
  else if ((pool.apy || 0) > 50)   score += 1;

  // IL risk from DeFiLlama
  if (pool.ilRisk === 'high')       score += 1;
  else if (pool.ilRisk === 'medium') score += 0.5;

  // Exposure — multi-asset = higher IL risk
  if (pool.exposure === 'multi')    score += 0.5;

  // Reward tokens — farming rewards = more complex risk
  if (pool.rewardTokens && pool.rewardTokens.length > 2) score += 0.5;

  // Stablecoin = lower risk
  if (pool.stablecoin) score = Math.max(1, score - 1);

  return Math.min(5, Math.round(score));
}

// ── Impermanent Loss Estimate ──────────────────────────────────────────────
// Uses 7d IL from DeFiLlama if available, otherwise estimates from exposure
export function estimateIL(pool: Pool): {
  estimate7d: number | null;
  category: string;
  description: string;
} {
  if (pool.stablecoin || pool.symbol?.toLowerCase().includes('usdc') || pool.symbol?.toLowerCase().includes('usdt')) {
    return { estimate7d: 0, category: 'none', description: 'Stablecoin pair — no impermanent loss' };
  }

  if (pool.il7d !== null && pool.il7d !== undefined) {
    const abs = Math.abs(pool.il7d);
    const category = abs < 0.5 ? 'low' : abs < 2 ? 'medium' : 'high';
    return {
      estimate7d: Math.round(pool.il7d * 100) / 100,
      category,
      description: `${abs.toFixed(2)}% IL over last 7 days`,
    };
  }

  // Estimate from exposure type
  if (pool.exposure === 'single') {
    return { estimate7d: null, category: 'none', description: 'Single asset — no impermanent loss' };
  }
  if (pool.exposure === 'multi') {
    return { estimate7d: null, category: 'medium', description: 'Multi-asset LP — moderate IL risk' };
  }

  return { estimate7d: null, category: 'unknown', description: 'IL data unavailable' };
}

// ── Format pool for response ───────────────────────────────────────────────
export function formatPool(pool: any) {
  const risk = scoreRisk(pool);
  const labels = ['', 'low', 'low-medium', 'medium', 'high', 'very high'];
  return {
    poolId: pool.pool,
    protocol: pool.project,
    chain: pool.chain,
    symbol: pool.symbol,
    apy: Math.round((pool.apy || 0) * 100) / 100,
    apyBase: pool.apyBase !== null ? Math.round((pool.apyBase || 0) * 100) / 100 : null,
    apyReward: pool.apyReward !== null ? Math.round((pool.apyReward || 0) * 100) / 100 : null,
    apyMean30d: pool.apyMean30d !== null ? Math.round((pool.apyMean30d || 0) * 100) / 100 : null,
    tvlUSD: Math.round(pool.tvlUsd),
    riskScore: risk,
    riskLabel: labels[risk] || 'unknown',
    ilRisk: pool.ilRisk || (pool.stablecoin ? 'none' : pool.exposure === 'single' ? 'none' : 'unknown'),
    stablecoin: pool.stablecoin || false,
    exposure: pool.exposure || null,
    poolMeta: pool.poolMeta || null,
  };
}
