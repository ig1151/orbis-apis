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
  res.json({ name: 'Top Movers API', openapi: '/top-movers/openapi.json', health: 'ok' });
});

// POST /gainers
router.post('/gainers', async (req: Request, res: Response) => {
  const { limit = 10, timeframe = '24h', min_market_cap_usd = 0 } = req.body;
  try {
    const raw = await callClaude(`Top ${limit} crypto gainers in the last ${timeframe} as of ${new Date().toISOString()}, min market cap $${min_market_cap_usd}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "timeframe": "${timeframe}",
  "gainers": [
    {
      "rank": number,
      "symbol": "string",
      "name": "string",
      "price_usd": number,
      "change_pct": number,
      "volume_24h_usd": number,
      "market_cap_usd": number,
      "category": "layer1|layer2|defi|meme|nft|other",
      "signal": "bullish|neutral",
      "momentum": "accelerating|steady|fading"
    }
  ],
  "market_context": "string",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"gainers": 0.82},
  "recommended_actions_priority_order": ["verify with exchange data before trading", "check volume to confirm momentum", "assess category for sector rotation signals"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /losers
router.post('/losers', async (req: Request, res: Response) => {
  const { limit = 10, timeframe = '24h', min_market_cap_usd = 0 } = req.body;
  try {
    const raw = await callClaude(`Top ${limit} crypto losers in the last ${timeframe} as of ${new Date().toISOString()}, min market cap $${min_market_cap_usd}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "timeframe": "${timeframe}",
  "losers": [
    {
      "rank": number,
      "symbol": "string",
      "name": "string",
      "price_usd": number,
      "change_pct": number,
      "volume_24h_usd": number,
      "market_cap_usd": number,
      "category": "layer1|layer2|defi|meme|nft|other",
      "signal": "bearish|neutral",
      "recovery_likelihood": "high|medium|low",
      "possible_cause": "string"
    }
  ],
  "market_context": "string",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"losers": 0.82},
  "recommended_actions_priority_order": ["check if decline is sector-wide or isolated", "look for capitulation signals on high volume", "avoid catching falling knives without confirmation"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /trending
router.post('/trending', async (req: Request, res: Response) => {
  const { limit = 10 } = req.body;
  try {
    const raw = await callClaude(`Top ${limit} trending crypto coins right now as of ${new Date().toISOString()} (by search volume, social mentions, on-chain activity). Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "trending": [
    {
      "rank": number,
      "symbol": "string",
      "name": "string",
      "price_usd": number,
      "change_pct_24h": number,
      "trend_score": number (0-100),
      "trend_drivers": ["social_volume|search_spike|on_chain_activity|exchange_listing|news"],
      "category": "string",
      "risk_level": "low|medium|high"
    }
  ],
  "narrative": "string (what's driving today's trends)",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"trending": 0.80},
  "recommended_actions_priority_order": ["validate trend with volume data", "check token trust before interacting", "high risk tokens need extra due diligence"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup (ONE-CALL: gainers + losers + trending)
router.post('/lookup', async (req: Request, res: Response) => {
  const { limit = 5, timeframe = '24h' } = req.body;
  try {
    const raw = await callClaude(`Full market movers snapshot as of ${new Date().toISOString()}: top ${limit} gainers, losers, and trending in ${timeframe}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "timeframe": "${timeframe}",
  "gainers": [{"rank": number, "symbol": "string", "change_pct": number, "price_usd": number, "momentum": "string"}],
  "losers": [{"rank": number, "symbol": "string", "change_pct": number, "price_usd": number, "recovery_likelihood": "string"}],
  "trending": [{"rank": number, "symbol": "string", "trend_score": number, "trend_drivers": ["string"]}],
  "market_sentiment": "risk_on|risk_off|mixed",
  "sector_rotation": "string (which categories are leading/lagging)",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"gainers": 0.82, "losers": 0.82, "trending": 0.78},
  "recommended_actions_priority_order": ["use sentiment for macro positioning", "cross-check gainers with token-trust", "sector rotation hints at next movers"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
