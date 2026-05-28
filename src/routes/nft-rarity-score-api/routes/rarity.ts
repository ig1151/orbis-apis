import { Router, Request, Response } from 'express';
import { callAI, parseAIJson, buildRuntime } from '../../../shared/ai';

export const nftRarityScoreRouter = Router();

// GET /nft-rarity-score/score?contract=0x...&tokenId=1234
nftRarityScoreRouter.get('/score', async (req: Request, res: Response) => {
  const { contract, tokenId, collection } = req.query as Record<string, string>;
  if (!tokenId) return res.status(400).json({ success: false, error: 'tokenId is required' });

  const prompt = `You are an NFT rarity scoring engine. Calculate detailed rarity for:
Contract: ${contract || 'unknown'}
Token ID: ${tokenId}
Collection hint: ${collection || 'not provided'}

Return a JSON object:
{
  "token_id": "${tokenId}",
  "contract": "${contract || 'unknown'}",
  "collection_name": "string",
  "rarity": {
    "score": number (0-1000, higher = rarer),
    "rank": number (estimated rank in collection),
    "total_supply": number,
    "percentile": number (top X% e.g. 2.5 means top 2.5%),
    "tier": "Legendary" | "Epic" | "Rare" | "Uncommon" | "Common",
    "methodology": "trait_normalization_v2"
  },
  "traits": [
    {
      "trait_type": "string",
      "value": "string",
      "trait_count": number (how many in collection have this),
      "rarity_pct": number (% of collection with this trait),
      "rarity_score": number (contribution to total score),
      "is_none": boolean
    }
  ],
  "trait_summary": {
    "total_traits": number,
    "rarest_trait": "trait_type: value",
    "rarest_trait_pct": number,
    "trait_count_bonus": number
  },
  "price_impact": {
    "floor_price_eth": number,
    "rarity_premium_pct": number (how much above floor this rarity commands),
    "estimated_value_eth": number,
    "comparable_sales": [
      { "token_id": "string", "price_eth": number, "sold_at": "ISO date" }
    ]
  },
  "confidence": 0.0-1.0
}`;

  try {
    const raw = await callAI(prompt, undefined, 2000);
    const data = parseAIJson(raw);
    return res.json({ success: true, data, meta: { runtime: buildRuntime(req) } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /nft-rarity-score/batch?contract=0x...&tokenIds=1,2,3
nftRarityScoreRouter.get('/batch', async (req: Request, res: Response) => {
  const { contract, tokenIds, collection } = req.query as Record<string, string>;
  if (!tokenIds) return res.status(400).json({ success: false, error: 'tokenIds (comma-separated) required' });
  const ids = tokenIds.split(',').slice(0, 20);

  const prompt = `You are an NFT rarity engine. Score these ${ids.length} tokens from collection: ${collection || contract || 'unknown'}.
Token IDs: ${ids.join(', ')}

Return JSON:
{
  "collection": "${collection || contract || 'unknown'}",
  "results": [
    {
      "token_id": "string",
      "rarity_score": number,
      "rank": number,
      "tier": "Legendary" | "Epic" | "Rare" | "Uncommon" | "Common",
      "rarest_trait": "string",
      "estimated_value_eth": number
    }
  ],
  "sorted_by_rarity": ["token_id array from rarest to most common"],
  "confidence": 0.0-1.0
}`;

  try {
    const raw = await callAI(prompt, undefined, 2000);
    const data = parseAIJson(raw);
    return res.json({ success: true, data, meta: { runtime: buildRuntime(req) } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

nftRarityScoreRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'NFT Rarity Score',
    version: '1.0.0',
    description: 'On-demand rarity scoring for any NFT token ID',
    endpoints: [
      { path: '/score', method: 'GET', params: ['contract', 'tokenId', 'collection'] },
      { path: '/batch', method: 'GET', params: ['contract', 'tokenIds', 'collection'] }
    ]
  });
});

nftRarityScoreRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    api: 'nft-rarity-score',
    version: '1.1.0',
    description: 'On-demand rarity scoring for any NFT token ID',
    x402_supported: true,
    x_latency_tier: 'standard',
    pricing: { tier: 'standard', unit_cost_usd: 0.008 },
    auth: { type: 'ApiKey', header: 'x-api-key' },
    endpoints: [
      { path: '/score', method: 'GET', billable: true, params: ['tokenId', 'contract', 'collection'] },
      { path: '/batch', method: 'GET', billable: true, params: ['tokenIds', 'contract', 'collection'] },
      { path: '/lookup', method: 'GET', billable: true, params: ['tokenId', 'contract', 'collection'], description: 'One-call rarity + valuation intelligence' }
    ],
    chain_to: [
      { api: 'nft-sniper-alert', reason: 'check if this token is listed below rarity-adjusted value' },
      { api: 'nft-arbitrage', reason: 'find cross-marketplace pricing given rarity premium' }
    ],
    execution_notes: 'Rarity scores are estimates based on trait distribution. Verify against Rarity.tools or Rarity Sniper for production.'
  });
});

nftRarityScoreRouter.get('/lookup', async (req: Request, res: Response) => {
  const { tokenId, contract, collection } = req.query as Record<string, string>;
  if (!tokenId) return res.status(400).json({ success: false, error: 'tokenId is required' });

  const prompt = `You are an NFT rarity and valuation intelligence engine. Full one-call analysis for token ${tokenId} from ${collection || contract || 'unknown collection'}.

Return ONLY JSON:
{
  "token_id": "${tokenId}",
  "collection": "${collection || 'unknown'}",
  "contract": "${contract || 'unknown'}",
  "analyzed_at": "ISO timestamp",
  "rarity": {
    "score": number (0-1000),
    "rank": number,
    "total_supply": number,
    "percentile": number,
    "tier": "Legendary|Epic|Rare|Uncommon|Common"
  },
  "traits": [
    { "trait_type": "string", "value": "string", "rarity_pct": number, "rarity_score": number, "is_none": boolean }
  ],
  "valuation": {
    "floor_price_eth": number,
    "rarity_premium_pct": number,
    "fair_value_eth": number,
    "last_sale_eth": number | null,
    "comparable_sales": [
      { "token_id": "string", "price_eth": number, "sold_at": "ISO date", "rarity_rank": number }
    ]
  },
  "reasoning": {
    "why_this_rarity": "explanation of key traits driving rarity",
    "risk_factors": ["liquidity risk", "collection floor declining", etc.],
    "invalidators": ["conditions that would reduce value estimate"]
  },
  "recommended_actions_priority_order": [
    { "action": "string", "reason": "string", "urgency": "immediate|high|medium|low" }
  ],
  "confidence_per_section": {
    "rarity": number,
    "valuation": number,
    "comparable_sales": number,
    "overall": number
  },
  "chain_to": [
    { "api": "nft-sniper-alert", "reason": "check if listed below fair value", "params": { "collection": "${collection || 'unknown'}" } },
    { "api": "nft-arbitrage", "reason": "find best marketplace to sell given rarity premium" }
  ],
  "latency_metadata": {
    "data_freshness": "simulated",
    "recommended_refresh_seconds": 3600,
    "latency_tier": "standard"
  }
}`;

  try {
    const raw = await callAI(prompt, undefined, 2000);
    const data = parseAIJson(raw);
    return res.json({ success: true, data, meta: { runtime: buildRuntime(req) } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
