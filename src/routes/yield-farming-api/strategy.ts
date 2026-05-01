import axios from 'axios';
import { Pool } from './defillama';
import { scoreRisk } from './analytics';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export interface StrategyOpportunity {
  poolId: string;
  protocol: string;
  chain: string;
  symbol: string;
  apy: number;
  tvlUSD: number;
  risk: string;
  liquidity: string;
  strategy: string;
  reason: string;
  confidence: number;
}

export async function buildStrategy(
  pools: Pool[],
  riskProfile: string,
  capital: number | null
): Promise<{
  best_opportunities: StrategyOpportunity[];
  market_context: string;
  recommended_approach: string;
  confidence: number;
}> {
  const minTvl = capital ? Math.min(capital * 10, 1_000_000) : 1_000_000;
  const maxRisk = riskProfile === 'conservative' ? 2 : riskProfile === 'moderate' ? 3 : 5;

  const candidates = pools
    .filter(p => p.tvlUsd >= minTvl)
    .filter(p => (p.apy || 0) > 1 && (p.apy || 0) < 500)
    .map(p => ({ ...p, riskScore: scoreRisk(p) }))
    .filter(p => p.riskScore <= maxRisk)
    .sort((a, b) => {
      const scoreA = (a.apy || 0) / a.riskScore;
      const scoreB = (b.apy || 0) / b.riskScore;
      return scoreB - scoreA;
    })
    .slice(0, 5);

  if (candidates.length === 0) {
    return {
      best_opportunities: [],
      market_context: 'No suitable opportunities found for the given risk profile.',
      recommended_approach: riskProfile,
      confidence: 0,
    };
  }

  const poolSummary = candidates.map(p =>
    `${p.project} | ${p.chain} | ${p.symbol} | APY: ${p.apy?.toFixed(2)}% | TVL: $${Math.round(p.tvlUsd / 1000)}k | Risk: ${p.riskScore}/5 | IL: ${p.ilRisk || 'unknown'} | Stablecoin: ${p.stablecoin}`
  ).join('\n');

  const prompt = `You are a DeFi yield strategy expert. Analyze these top yield farming opportunities for a ${riskProfile} investor${capital ? ` with $${capital.toLocaleString()} to deploy` : ''}:

${poolSummary}

For each pool provide a one-line reason why it fits the strategy. Then provide:
- market_context: one sentence on current yield market conditions
- recommended_approach: one of conservative/moderate/aggressive

Respond ONLY in this JSON format, no markdown:
{
  "opportunities": [
    {"symbol": "...", "protocol": "...", "strategy": "...", "reason": "...", "confidence": 0.0}
  ],
  "market_context": "...",
  "recommended_approach": "..."
}`;

  let aiResponse: any = null;
  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      },
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` }, timeout: 20000 }
    );
    const text = res.data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    aiResponse = JSON.parse(clean);
  } catch (err: any) {
    console.error('[strategy AI]', err.message);
  }

  const aiMap: Record<string, any> = {};
  if (aiResponse?.opportunities) {
    for (const o of aiResponse.opportunities) {
      aiMap[`${o.protocol}-${o.symbol}`] = o;
    }
  }

  const riskLabels = ['', 'low', 'low-medium', 'medium', 'high', 'very high'];
  const liquidityLabel = (tvl: number) =>
    tvl > 50_000_000 ? 'very high' : tvl > 10_000_000 ? 'high' : tvl > 1_000_000 ? 'medium' : 'low';

  const strategyLabel = (p: any) => {
    if (p.stablecoin) return 'stablecoin farming';
    if (p.exposure === 'single') return 'single asset staking';
    if ((p.apyReward || 0) > (p.apyBase || 0)) return 'incentivized LP farming';
    return 'liquidity provision';
  };

  const best_opportunities: StrategyOpportunity[] = candidates.map(p => {
    const key = `${p.project}-${p.symbol}`;
    const ai = aiMap[key] || {};
    return {
      poolId: p.pool,
      protocol: p.project,
      chain: p.chain,
      symbol: p.symbol,
      apy: Math.round((p.apy || 0) * 100) / 100,
      tvlUSD: Math.round(p.tvlUsd),
      risk: riskLabels[scoreRisk(p)] || 'unknown',
      liquidity: liquidityLabel(p.tvlUsd),
      strategy: strategyLabel(p),
      reason: ai.reason || `${p.apy?.toFixed(1)}% APY with ${riskLabels[scoreRisk(p)]} risk on ${p.chain}`,
      confidence: ai.confidence || Math.round((1 - (scoreRisk(p) - 1) / 5) * 100) / 100,
    };
  });

  return {
    best_opportunities,
    market_context: aiResponse?.market_context || 'Yield opportunities available across multiple chains.',
    recommended_approach: aiResponse?.recommended_approach || riskProfile,
    confidence: Math.round(best_opportunities.reduce((s, o) => s + o.confidence, 0) / best_opportunities.length * 100) / 100,
  };
}
