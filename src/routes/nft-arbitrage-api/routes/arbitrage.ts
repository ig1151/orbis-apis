import { Router, Request, Response } from 'express';
import { callAI, parseAIJson, buildRuntime } from '../../../shared/ai';

export const nftArbitrageRouter = Router();

// GET /nft-arbitrage/opportunities?collection=boredapeyachtclub&minProfit=0.1
nftArbitrageRouter.get('/opportunities', async (req: Request, res: Response) => {
  const collection = (req.query.collection as string) || '';
  const minProfit = parseFloat(req.query.minProfit as string) || 0.05;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 25);

  if (!collection) return res.status(400).json({ success: false, error: 'collection is required' });

  const prompt = `NFT arbitrage for "${collection}" across OpenSea, Blur, X2Y2. Min profit ${minProfit} ETH. Return 3 opportunities as compact JSON:
{"collection":"${collection}","scan_timestamp":"ISO timestamp","marketplaces_scanned":["OpenSea","Blur","X2Y2"],"opportunities":[{"token_id":"string","rarity_rank":number,"buy_side":{"marketplace":"Blur|OpenSea|X2Y2","price_eth":number,"listing_age_minutes":number},"sell_side":{"marketplace":"OpenSea|Blur","expected_price_eth":number,"estimated_sell_time_hours":number},"economics":{"net_profit_eth":number,"net_profit_usd":number,"roi_pct":number,"capital_required_eth":number,"gas_cost_eth":number},"risk":{"overall_risk":"low|medium|high","risk_notes":"string"},
      "opportunity_score": number (0-100),
      "urgency": "immediate" | "high" | "medium" | "monitor",
      "expires_estimate_minutes": number | null
    }
  ],
  "market_overview": {
    "opensea_floor_eth": number,
    "blur_floor_eth": number,
    "x2y2_floor_eth": number,
    "best_buy_marketplace": "string",
    "best_sell_marketplace": "string",
    "avg_spread_pct": number,
    "total_arb_volume_available_eth": number
  },
  "summary": {
    "total_opportunities": number,
    "avg_net_profit_eth": number,
    "best_opportunity_profit_eth": number,
    "total_capital_needed_eth": number,
    "market_efficiency": "inefficient" | "moderate" | "efficient"
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

// GET /nft-arbitrage/market-spread?collections=bayc,azuki,pudgy
nftArbitrageRouter.get('/market-spread', async (req: Request, res: Response) => {
  const collections = ((req.query.collections as string) || 'boredapeyachtclub,azuki,pudgy-penguins').split(',');

  const prompt = `NFT cross-marketplace floor spread analysis for: ${collections.join(', ')}
Return JSON:
{
  "scan_timestamp": "ISO timestamp",
  "spreads": [
    {
      "collection": "string",
      "opensea_floor_eth": number,
      "blur_floor_eth": number,
      "x2y2_floor_eth": number,
      "max_spread_eth": number,
      "max_spread_pct": number,
      "best_buy": "marketplace name",
      "best_sell": "marketplace name",
      "arb_viable": boolean,
      "estimated_net_profit_eth": number (after fees)
    }
  ],
  "most_inefficient_market": "collection name",
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

nftArbitrageRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'NFT Arbitrage',
    version: '1.0.0',
    description: 'Find same NFTs priced differently across OpenSea, Blur, and X2Y2',
    endpoints: [
      { path: '/opportunities', method: 'GET', params: ['collection', 'minProfit', 'limit'] },
      { path: '/market-spread', method: 'GET', params: ['collections'] }
    ]
  });
});

nftArbitrageRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    api: 'nft-arbitrage',
    version: '1.1.0',
    description: 'Cross-marketplace NFT arbitrage: find price discrepancies across OpenSea, Blur, X2Y2',
    x402_supported: true,
    x_latency_tier: 'real-time',
    x_execution_gate_required: true,
    x_human_approval_required: true,
    pricing: { tier: 'platform', unit_cost_usd: 0.015 },
    auth: { type: 'ApiKey', header: 'x-api-key' },
    endpoints: [
      { path: '/opportunities', method: 'GET', billable: true, params: ['collection', 'minProfit', 'limit'] },
      { path: '/market-spread', method: 'GET', billable: true, params: ['collections'] },
      { path: '/lookup', method: 'GET', billable: true, params: ['contract', 'tokenId', 'collection'], description: 'One-call arb intelligence for a specific token' }
    ],
    chain_to: [
      { api: 'nft-rarity-score', reason: 'validate rarity premium before arb execution' },
      { api: 'nft-sniper-alert', reason: 'combine sniper + arb for maximum alpha' },
      { api: 'nft-volume-heatmap', reason: 'time arb execution during peak liquidity' }
    ],
    execution_notes: 'EXECUTION GATE REQUIRED. Cross-marketplace arb requires gas on both legs. Prices shift in seconds. Human approval strongly recommended.'
  });
});

nftArbitrageRouter.get('/lookup', async (req: Request, res: Response) => {
  const { contract, tokenId, collection } = req.query as Record<string, string>;
  if (!tokenId) return res.status(400).json({ success: false, error: 'tokenId is required' });

  const prompt = `You are an elite NFT cross-marketplace arbitrage engine. Full one-call arb analysis for token ${tokenId} from ${collection || contract || 'unknown'}.

Return ONLY JSON:
{
  "token_id": "${tokenId}",
  "collection": "${collection || 'unknown'}",
  "analyzed_at": "ISO timestamp",
  "best_route": {
    "buy_marketplace": "OpenSea|Blur|X2Y2|LooksRare",
    "buy_price_eth": number,
    "sell_marketplace": "OpenSea|Blur|X2Y2|LooksRare",
    "sell_price_eth": number,
    "route_confidence": number (0-100)
  },
  "all_marketplace_prices": [
    { "marketplace": "string", "floor_eth": number, "token_listed": boolean, "token_price_eth": number | null, "fee_pct": number }
  ],
  "economics": {
    "gross_profit_eth": number,
    "buy_fee_eth": number,
    "sell_fee_eth": number,
    "creator_royalty_eth": number,
    "gas_buy_eth": number,
    "gas_sell_eth": number,
    "net_profit_eth": number,
    "net_profit_usd": number,
    "roi_pct": number,
    "capital_required_eth": number,
    "breakeven_sell_price_eth": number
  },
  "execution": {
    "expected_execution_time_minutes": number,
    "sell_probability_pct": number,
    "liquidity_confidence": "high|medium|low",
    "slippage_risk": "low|medium|high",
    "optimal_gas_gwei": number,
    "urgency": "immediate|high|medium|monitor"
  },
  "reasoning": {
    "why_opportunity_exists": "string",
    "risk_factors": ["string array"],
    "invalidators": ["conditions that kill this arb"]
  },
  "recommended_actions_priority_order": [
    { "action": "string", "reason": "string", "urgency": "immediate|high|medium|low" }
  ],
  "confidence_per_section": {
    "pricing": number,
    "economics": number,
    "execution": number,
    "overall": number
  },
  "chain_to": [
    { "api": "nft-rarity-score", "reason": "confirm rarity premium justifies arb spread", "params": { "tokenId": "${tokenId}" } },
    { "api": "nft-volume-heatmap", "reason": "time execution during peak liquidity window" }
  ],
  "execution_gate": {
    "required": true,
    "human_approval_recommended": true,
    "auto_execute_safe": false,
    "reason": "Cross-marketplace arb involves 2 irreversible on-chain transactions. Price can change between legs."
  },
  "latency_metadata": {
    "data_freshness": "simulated",
    "recommended_refresh_seconds": 15,
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
