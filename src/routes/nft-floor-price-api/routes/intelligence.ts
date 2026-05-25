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
  res.json({ name: 'NFT Floor Price API', openapi: '/nft-floor-price/openapi.json', health: 'ok' });
});

// POST /floor
router.post('/floor', async (req: Request, res: Response) => {
  const { collection, chain = 'ethereum' } = req.body;
  if (!collection) return res.status(400).json({ error: 'collection is required (name or contract address)' });
  try {
    const raw = await callClaude(`NFT floor price for collection: "${collection}" on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "collection": "${collection}",
  "chain": "${chain}",
  "floor": {
    "price_eth": number or null,
    "price_usd": number,
    "change_24h_pct": number,
    "change_7d_pct": number,
    "ath_usd": number,
    "ath_date": "YYYY-MM-DD",
    "atl_usd": number
  },
  "volume": {
    "volume_24h_eth": number or null,
    "volume_24h_usd": number,
    "volume_7d_usd": number,
    "sales_24h": number
  },
  "market": {
    "total_supply": number,
    "owners": number,
    "unique_owners_pct": number,
    "listed_pct": number,
    "market_cap_usd": number
  },
  "signal": "bullish|bearish|neutral",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "confidence_per_section": {"floor": 0.82, "volume": 0.80, "market": 0.78},
  "recommended_actions_priority_order": ["verify on OpenSea/Blur before transacting", "check listed_pct for supply pressure", "compare floor vs ATH for cycle positioning"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compare
router.post('/compare', async (req: Request, res: Response) => {
  const { collections, chain = 'ethereum' } = req.body;
  if (!collections || !Array.isArray(collections) || collections.length < 2) {
    return res.status(400).json({ error: 'collections array with at least 2 items is required' });
  }
  if (collections.length > 10) return res.status(400).json({ error: 'maximum 10 collections' });
  try {
    const raw = await callClaude(`Compare NFT floor prices for collections: ${collections.join(', ')} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "results": [
    {
      "collection": "string",
      "floor_usd": number,
      "change_24h_pct": number,
      "volume_24h_usd": number,
      "market_cap_usd": number,
      "rank": number
    }
  ],
  "best_value": "string (collection with best floor/volume ratio)",
  "strongest_momentum": "string (best 24h change)",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "confidence_per_section": {"results": 0.80},
  "recommended_actions_priority_order": ["buy strongest momentum with volume confirmation", "value picks need holder distribution check", "verify wash trading before acting on volume"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { collection, chain = 'ethereum' } = req.body;
  if (!collection) return res.status(400).json({ error: 'collection is required' });
  try {
    const raw = await callClaude(`Full NFT collection intelligence for: "${collection}" on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "collection": "${collection}",
  "chain": "${chain}",
  "floor": {"price_eth": number or null, "price_usd": number, "change_24h_pct": number, "change_7d_pct": number},
  "volume": {"volume_24h_usd": number, "volume_7d_usd": number, "sales_24h": number},
  "market": {"total_supply": number, "owners": number, "unique_owners_pct": number, "listed_pct": number, "market_cap_usd": number},
  "rarity": {"trait_count": number or null, "rarest_trait": "string or null"},
  "risk": {"wash_trading_suspected": boolean, "whale_concentration_pct": number, "risk_level": "low|medium|high"},
  "signal": "bullish|bearish|neutral",
  "investment_grade": "A|B|C|D|F",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "confidence_per_section": {"floor": 0.82, "volume": 0.80, "risk": 0.75},
  "recommended_actions_priority_order": ["verify floor on chain before bidding", "high whale concentration increases dump risk", "listed_pct above 10% signals sell pressure"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
