import { Router, Request, Response } from 'express';
import { callAI, parseAIJson, buildRuntime } from '../../../shared/ai';

export const nftSniperAlertRouter = Router();

// GET /nft-sniper-alert/listings?collection=boredapeyachtclub&maxDiscount=20&limit=10
nftSniperAlertRouter.get('/listings', async (req: Request, res: Response) => {
  const collection = (req.query.collection as string) || '';
  const maxDiscountPct = parseFloat(req.query.maxDiscount as string) || 15;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);
  const chain = (req.query.chain as string) || 'ethereum';

  if (!collection) return res.status(400).json({ success: false, error: 'collection is required' });

  const prompt = `You are an NFT sniper detection system. Find below-floor listings for: "${collection}" on ${chain}.

Generate ${limit} sniper opportunities (listings priced below floor or at significant discount).

Return JSON:
{
  "collection": "${collection}",
  "chain": "${chain}",
  "floor_price_eth": number,
  "floor_price_usd": number,
  "scan_timestamp": "ISO timestamp",
  "sniper_listings": [
    {
      "token_id": "string",
      "marketplace": "OpenSea" | "Blur" | "X2Y2" | "LooksRare" | "Reservoir",
      "listing_price_eth": number,
      "listing_price_usd": number,
      "floor_price_eth": number,
      "discount_pct": number (positive = below floor),
      "rarity_rank": number,
      "rarity_tier": "Legendary" | "Epic" | "Rare" | "Uncommon" | "Common",
      "rarity_adjusted_value_eth": number,
      "last_sale_eth": number | null,
      "last_sale_date": "ISO date" | null,
      "seller_address": "0x...",
      "seller_history": "long_term_holder" | "flipper" | "new_seller" | "unknown",
      "listing_age_minutes": number,
      "flip_potential_eth": number (estimated profit after 2.5% fees),
      "flip_potential_usd": number,
      "confidence_score": number (0-100),
      "snipe_urgency": "critical" | "high" | "medium" | "low",
      "listing_url": "https://..."
    }
  ],
  "summary": {
    "opportunities_found": number,
    "avg_discount_pct": number,
    "best_flip_eth": number,
    "total_capital_needed_eth": number,
    "market_sentiment": "hot" | "normal" | "cold"
  },
  "confidence": 0.0-1.0
}

Only include listings with discount >= ${maxDiscountPct}% below floor OR rarity-adjusted value significantly above list price.`;

  try {
    const raw = await callAI(prompt, undefined, 2000);
    const data = parseAIJson(raw);
    return res.json({ success: true, data, meta: { runtime: buildRuntime(req) } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /nft-sniper-alert/watchlist?collections=bayc,azuki&threshold=5
nftSniperAlertRouter.get('/watchlist', async (req: Request, res: Response) => {
  const collections = ((req.query.collections as string) || '').split(',').filter(Boolean);
  const threshold = parseFloat(req.query.threshold as string) || 5;

  if (!collections.length) return res.status(400).json({ success: false, error: 'collections required (comma-separated)' });

  const prompt = `NFT sniper watchlist scan for collections: ${collections.join(', ')}
Minimum discount threshold: ${threshold}%

Return JSON:
{
  "scan_timestamp": "ISO timestamp",
  "alerts": [
    {
      "collection": "string",
      "token_id": "string",
      "marketplace": "string",
      "discount_pct": number,
      "price_eth": number,
      "floor_eth": number,
      "urgency": "critical" | "high" | "medium",
      "alert_reason": "string"
    }
  ],
  "total_alerts": number,
  "critical_alerts": number,
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

nftSniperAlertRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'NFT Sniper Alert',
    version: '1.0.0',
    description: 'Detect below-floor listings and instant flip opportunities',
    endpoints: [
      { path: '/listings', method: 'GET', params: ['collection', 'maxDiscount', 'limit', 'chain'] },
      { path: '/watchlist', method: 'GET', params: ['collections', 'threshold'] }
    ]
  });
});

nftSniperAlertRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    api: 'nft-sniper-alert',
    version: '1.1.0',
    description: 'Below-floor listing detection and instant flip opportunity scoring',
    x402_supported: true,
    x_latency_tier: 'real-time',
    x_execution_gate_required: true,
    x_human_approval_required: true,
    pricing: { tier: 'platform', unit_cost_usd: 0.015 },
    auth: { type: 'ApiKey', header: 'x-api-key' },
    endpoints: [
      { path: '/listings', method: 'GET', billable: true, params: ['collection', 'maxDiscount', 'limit', 'chain'] },
      { path: '/watchlist', method: 'GET', billable: true, params: ['collections', 'threshold'] },
      { path: '/lookup', method: 'GET', billable: true, params: ['contract', 'tokenId', 'collection'], description: 'One-call sniper intelligence for a specific token' }
    ],
    chain_to: [
      { api: 'nft-rarity-score', reason: 'validate rarity-adjusted fair value before sniping' },
      { api: 'nft-arbitrage', reason: 'find best resale marketplace after snipe' },
      { api: 'nft-volume-heatmap', reason: 'confirm liquidity window before executing' }
    ],
    execution_notes: 'EXECUTION GATE REQUIRED. Human approval recommended before executing snipe transactions. Prices change in seconds.'
  });
});

nftSniperAlertRouter.get('/lookup', async (req: Request, res: Response) => {
  const { contract, tokenId, collection } = req.query as Record<string, string>;
  if (!tokenId) return res.status(400).json({ success: false, error: 'tokenId is required' });

  const prompt = `You are an elite NFT sniper intelligence system. Full one-call sniper analysis for token ${tokenId} from ${collection || contract || 'unknown'}.

Return ONLY JSON:
{
  "token_id": "${tokenId}",
  "collection": "${collection || 'unknown'}",
  "analyzed_at": "ISO timestamp",
  "listing": {
    "marketplace": "OpenSea|Blur|X2Y2|LooksRare",
    "current_price_eth": number,
    "floor_price_eth": number,
    "discount_pct": number,
    "listing_age_minutes": number,
    "seller_type": "long_term_holder|flipper|new_seller|unknown"
  },
  "rarity_analysis": {
    "rarity_rank": number,
    "rarity_tier": "Legendary|Epic|Rare|Uncommon|Common",
    "rarity_adjusted_fair_value_eth": number,
    "discount_vs_fair_value_pct": number
  },
  "flip_analysis": {
    "estimated_resale_price_eth": number,
    "estimated_flip_window_hours": number,
    "gross_profit_eth": number,
    "net_profit_eth": number,
    "roi_pct": number,
    "capital_required_eth": number,
    "sell_probability_pct": number
  },
  "comparable_sales": [
    { "token_id": "string", "price_eth": number, "sold_at": "ISO date", "days_to_sell": number }
  ],
  "liquidity_risk": {
    "score": "low|medium|high",
    "avg_days_to_sell": number,
    "collection_daily_volume_eth": number,
    "bid_depth_eth": number
  },
  "urgency": {
    "level": "immediate|high|medium|monitor",
    "expires_estimate_minutes": number,
    "competing_snipers_estimated": number
  },
  "reasoning": {
    "why_opportunity_exists": "string",
    "risk_factors": ["string array"],
    "invalidators": ["conditions that make this snipe not worth it"]
  },
  "recommended_actions_priority_order": [
    { "action": "string", "reason": "string", "urgency": "immediate|high|medium|low" }
  ],
  "confidence_per_section": {
    "listing": number,
    "rarity": number,
    "flip_analysis": number,
    "liquidity": number,
    "overall": number
  },
  "chain_to": [
    { "api": "nft-rarity-score", "reason": "get full trait breakdown to validate premium", "params": { "tokenId": "${tokenId}", "contract": "${contract || ''}" } },
    { "api": "nft-arbitrage", "reason": "find best marketplace to flip after purchase" }
  ],
  "execution_gate": {
    "required": true,
    "human_approval_recommended": true,
    "auto_execute_safe": false,
    "reason": "NFT purchases are irreversible on-chain. Price may change before execution."
  },
  "latency_metadata": {
    "data_freshness": "simulated",
    "recommended_refresh_seconds": 30,
    "latency_tier": "real-time"
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
