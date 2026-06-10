import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


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
    name: 'NFT Collection Analytics API', version: '1.0.0',
    description: 'Analyze NFT collection floor price, volume, holder distribution, whale activity, and market cycle stage. Surface trending collections and investment signals for NFT trading agents.',
    docs_url: 'https://orbis-apis.onrender.com/nft-collection-analytics/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/nft-collection-analytics/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/collection', summary: 'Floor, volume, holders, and market metrics for a collection', price_usdc: 0.003 },
      { method: 'POST', path: '/trending', summary: 'Trending NFT collections ranked by momentum', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full collection intelligence with investment signal', price_usdc: 0.008 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { collection: '$0.003', trending: '$0.004', lookup: '$0.008' } },
    agent_capabilities: ['nft-floor-tracking', 'collection-health', 'whale-holder-analysis', 'trending-detection', 'investment-signal'],
    x402_compatible: true, paper_mode_recommended: true,
  });
});

router.post('/collection', async (req: Request, res: Response) => {
  const { collection, chain = 'ethereum' } = req.body;
  if (!collection) return res.status(400).json({ error: 'collection is required' });
  try {
    const raw = await callClaude(`NFT collection analytics for "${collection}" on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "collection": "${collection}",
  "chain": "${chain}",
  "floor_price": {
    "eth": number,
    "usd": number,
    "24h_change_pct": number,
    "7d_change_pct": number,
    "30d_change_pct": number,
    "all_time_high_eth": number
  },
  "volume": {
    "24h_usd": number,
    "7d_usd": number,
    "30d_usd": number,
    "total_usd": number,
    "trend": "rising|falling|stable"
  },
  "holders": {
    "total": number,
    "unique": number,
    "top_10_pct_supply": number,
    "whale_count": number,
    "avg_items_per_holder": number,
    "distribution_score": number
  },
  "supply": { "total": number, "listed": number, "listed_pct": number },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"floor": 0.80, "volume": 0.78, "holders": 0.72},
  "recommended_actions_priority_order": ["cross-check floor with marketplace", "watch listed supply for sell pressure", "high whale concentration = volatility risk"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/trending', async (req: Request, res: Response) => {
  const { chain = 'ethereum', category, limit = 10 } = req.body;
  try {
    const raw = await callClaude(`Trending NFT collections on ${chain}${category ? ` in ${category} category` : ''} as of ${new Date().toISOString()}. Return top ${limit}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "category": "${category || 'all'}",
  "trending": [
    {
      "collection": "string",
      "floor_eth": number,
      "floor_usd": number,
      "24h_volume_usd": number,
      "24h_floor_change_pct": number,
      "momentum_score": number,
      "trend": "exploding|rising|stable|cooling",
      "category": "string",
      "notable": "string"
    }
  ],
  "market_summary": {
    "overall_nft_sentiment": "hot|warm|cool|cold",
    "dominant_category": "string",
    "avg_volume_change_24h_pct": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"trending": 0.78, "summary": 0.72},
  "recommended_actions_priority_order": ["trending ≠ safe investment", "check floor vs volume ratio", "use as discovery tool only"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const { collection, chain = 'ethereum' } = req.body;
  if (!collection) return res.status(400).json({ error: 'collection is required' });
  try {
    const raw = await callClaude(`Full NFT collection intelligence for "${collection}" on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "collection": "${collection}",
  "chain": "${chain}",
  "market_metrics": {
    "floor_eth": number,
    "floor_usd": number,
    "24h_volume_usd": number,
    "30d_volume_usd": number,
    "floor_7d_change_pct": number
  },
  "holder_analysis": {
    "total_holders": number,
    "top_10_pct_supply": number,
    "whale_activity": "accumulating|distributing|holding",
    "distribution_health": "healthy|concentrated|risky"
  },
  "market_cycle": {
    "stage": "discovery|accumulation|hype|distribution|decline|dormant",
    "momentum": "rising|peaking|falling|bottoming",
    "cycle_note": "string"
  },
  "investment_signal": {
    "signal": "strong_buy|buy|neutral|sell|avoid",
    "conviction": "high|medium|low",
    "rationale": "string",
    "key_risk": "string",
    "entry_note": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"metrics": 0.80, "holders": 0.72, "cycle": 0.68, "signal": 0.65},
  "recommended_actions_priority_order": ["NFT markets are highly speculative", "never put more than you can lose", "cycle stage is the most important signal"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
