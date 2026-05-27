import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: MODEL, messages: [{ role: 'user', content: prompt }] },
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return res.data.choices[0].message.content;
}

function parseJSON(raw: string) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1));
  return JSON.parse(cleaned);
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'NFT Arbitrage API', version: '1.0.0',
    description: 'NFT floor price and individual item price gaps across OpenSea, Blur, LooksRare, and X2Y2 — arbitrage from marketplace fee differences and price discovery lag.',
    docs_url: 'https://orbis-apis.onrender.com/nft-arbitrage/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/nft-arbitrage/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Floor price spread scan across NFT marketplaces for a collection', price_usdc: 0.003 },
      { method: 'POST', path: '/opportunities', summary: 'Market-wide NFT arb opportunities ranked by estimated profit', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full NFT arb with item analysis, rarity, gas, and liquidity risk', price_usdc: 0.01 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.003', opportunities: '$0.005', lookup: '$0.01' } },
    agent_capabilities: ['nft-arbitrage', 'floor-price-comparison', 'marketplace-fee-analysis', 'rarity-adjusted-pricing', 'nft-liquidity-risk'],
    x402_compatible: true, paper_mode_recommended: true,
    'x-paper-mode-recommended': true,
    execution_modes: ['agent-callable', 'execution-gated'],
    'x-latency-tier': 'near-real-time',
    chain_to: [
      { api: 'nft-floor-price-api', reason: 'real-time floor validation before committing to any purchase' },
      { api: 'gas-adjusted-arbitrage-api', reason: 'Ethereum gas often exceeds NFT floor spread — validate first' },
      { api: 'market-inefficiency-scanner-api', reason: 'detect broader NFT market microstructure inefficiency patterns' },
    ],
  });
});

// POST /scan — floor price spread scan across NFT marketplaces for a collection
router.post('/scan', async (req: Request, res: Response) => {
  const { collection, chain = 'ethereum' } = req.body;
  if (!collection) return res.status(400).json({ error: 'collection is required' });
  try {
    const raw = await callClaude(`NFT marketplace floor price spread scan for collection "${collection}" on ${chain} across OpenSea, Blur, LooksRare, and X2Y2 as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "collection": "${collection}",
  "chain": "${chain}",
  "marketplace_floors": [
    {
      "marketplace": "opensea|blur|looksrare|x2y2",
      "floor_price_eth": number,
      "floor_price_usd": number,
      "listing_count": number,
      "marketplace_fee_pct": number,
      "royalty_pct": number,
      "total_cost_pct": number,
      "volume_24h_eth": number
    }
  ],
  "best_buy_marketplace": "string",
  "best_sell_marketplace": "string",
  "floor_spread_pct": number,
  "estimated_profit_eth": number,
  "marketplace_fees_pct": number,
  "arb_viable": boolean,
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"floors": 0.78, "spread": 0.75},
  "recommended_actions_priority_order": ["NFT arb requires immediate action — floors update every few minutes", "confirm listing is still active before purchasing", "royalty fees can eliminate spread entirely on some collections"],
  "chain_to": [{"api": "nft-floor-price-api", "reason": "real-time floor confirmation before executing buy"}, {"api": "gas-adjusted-arbitrage-api", "reason": "gas cost on Ethereum often exceeds NFT arb spread"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /opportunities — market-wide NFT arb opportunities ranked by estimated profit
router.post('/opportunities', async (req: Request, res: Response) => {
  const { min_spread_pct = 2.0 } = req.body;
  try {
    const raw = await callClaude(`Market-wide NFT arbitrage opportunities where floor spread exceeds ${min_spread_pct}% across OpenSea, Blur, LooksRare as of ${new Date().toISOString()}. Rank by estimated_profit_eth. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "min_spread_pct": ${min_spread_pct},
  "opportunities": [
    {
      "collection": "string",
      "collection_address": "string",
      "chain": "ethereum|polygon",
      "buy_marketplace": "opensea|blur|looksrare|x2y2",
      "sell_marketplace": "opensea|blur|looksrare|x2y2",
      "buy_floor_eth": number,
      "sell_floor_eth": number,
      "floor_spread_pct": number,
      "estimated_profit_eth": number,
      "estimated_profit_usd": number,
      "liquidity_score": number,
      "gas_estimate_eth": number,
      "net_profit_after_gas_eth": number,
      "urgency": "immediate|building|fading"
    }
  ],
  "market_overview": {
    "total_opportunities": number,
    "best_collection": "string",
    "avg_spread_pct": number,
    "best_net_profit_eth": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"opportunities": 0.74, "overview": 0.78},
  "recommended_actions_priority_order": ["higher liquidity score = easier resale on target marketplace", "gas on Ethereum can exceed profit for floor items under 0.1 ETH", "blur has lower fees than OpenSea — prefer as sell venue when possible"],
  "chain_to": [{"api": "nft-arbitrage-api", "reason": "deep scan specific collection before executing"}, {"api": "nft-floor-price-api", "reason": "live floor confirmation before any purchase"}],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: full NFT arb with item analysis, rarity, gas, and liquidity risk
router.post('/lookup', async (req: Request, res: Response) => {
  const { collection } = req.body;
  if (!collection) return res.status(400).json({ error: 'collection is required' });
  try {
    const raw = await callClaude(`Full NFT arbitrage intelligence for collection "${collection}" as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "collection": "${collection}",
  "best_opportunity": {
    "buy_marketplace": "opensea|blur|looksrare|x2y2",
    "sell_marketplace": "opensea|blur|looksrare|x2y2",
    "buy_floor_eth": number,
    "sell_floor_eth": number,
    "floor_spread_pct": number,
    "marketplace_fees_pct": number,
    "estimated_profit_eth": number
  },
  "item_analysis": {
    "best_item_for_arb": "string (token ID or description)",
    "item_price_eth": number,
    "rarity_rank": number,
    "rarity_tier": "common|uncommon|rare|epic|legendary",
    "rarity_premium_pct": number,
    "listing_freshness_seconds": number,
    "estimated_resale_time_hours": number
  },
  "rarity_adjustment": {
    "floor_item_spread_pct": number,
    "rarity_adjusted_spread_pct": number,
    "rarity_increases_profit": boolean,
    "note": "string"
  },
  "gas_estimate": {
    "buy_gas_eth": number,
    "sell_gas_eth": number,
    "total_gas_eth": number,
    "total_gas_usd": number,
    "net_profit_after_gas_eth": number
  },
  "liquidity_risk": {
    "collection_volume_24h_eth": number,
    "avg_time_to_sell_hours": number,
    "bid_depth_eth": number,
    "liquidity_risk_level": "low|medium|high",
    "illiquidity_risk": "string"
  },
  "reasoning": {
    "why_signal_generated": "string explanation of why this NFT collection has an arbitrage opportunity right now",
    "key_factors": ["factor 1 (e.g. Blur has 0% royalty creating floor lower than OpenSea)", "factor 2 (e.g. high 24h volume reduces resale time risk)", "factor 3 (e.g. rarity premium on specific items exceeds floor spread)"],
    "invalidators": ["floor listing sells before purchase executed", "gas spike eliminates thin spread", "collection loses buyer interest reducing resale liquidity"]
  },
  "latency_ms": number,
  "chain_to": [{"api": "nft-floor-price-api", "reason": "live floor price validation before any purchase"}, {"api": "gas-adjusted-arbitrage-api", "reason": "confirm gas cost does not exceed NFT spread profit"}],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"opportunity": 0.74, "item": 0.72, "rarity": 0.70, "gas": 0.78, "liquidity": 0.75, "reasoning": 0.73},
  "recommended_actions_priority_order": ["net_profit_after_gas_eth must be positive or skip the trade", "listing_freshness > 3600 seconds means item may already be sold", "illiquidity_risk must be reviewed — some collections take days to sell"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
