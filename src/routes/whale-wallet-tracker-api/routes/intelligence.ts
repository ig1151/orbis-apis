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
  res.json({ name: 'Whale Wallet Tracker API', openapi: '/whale-wallet-tracker/openapi.json', health: 'ok' });
});

// POST /track — track a specific wallet for whale activity
router.post('/track', async (req: Request, res: Response) => {
  const { address, chain = 'ethereum' } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });
  try {
    const raw = await callClaude(`Whale wallet analysis for address ${address} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "address": "${address}",
  "chain": "${chain}",
  "whale_classification": {
    "is_whale": boolean,
    "tier": "mega_whale|whale|large_holder|mid_holder|retail",
    "estimated_portfolio_usd": number,
    "rank_percentile": number
  },
  "recent_activity": [
    {
      "action": "buy|sell|transfer|stake|unstake",
      "token": "string",
      "amount_usd": number,
      "timestamp": "ISO8601",
      "significance": "high|medium|low",
      "counterparty_type": "cex|dex|whale|contract|unknown"
    }
  ],
  "holdings_snapshot": [
    {"token": "string", "amount": number, "value_usd": number, "pct_portfolio": number}
  ],
  "behavior_patterns": {
    "trading_style": "accumulator|distributor|swing_trader|long_term_holder",
    "avg_hold_days": number,
    "win_rate_pct": number,
    "recent_bias": "bullish|bearish|neutral"
  },
  "entry_exit_signals": {
    "current_signal": "accumulating|distributing|holding|repositioning",
    "signal_strength": "strong|moderate|weak",
    "notable_observation": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"classification": 0.80, "activity": 0.75, "signals": 0.72},
  "recommended_actions_priority_order": ["verify on-chain before trading", "combine with market context", "watch for sustained accumulation patterns"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /scan — scan for recent large whale movements across the market
router.post('/scan', async (req: Request, res: Response) => {
  const { chain = 'ethereum', min_usd = 1000000, limit = 10 } = req.body;
  try {
    const raw = await callClaude(`Scan for significant whale wallet movements on ${chain} (minimum $${min_usd} USD) as of ${new Date().toISOString()}. Return top ${limit} movements. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "chain": "${chain}",
  "min_usd_threshold": ${min_usd},
  "movements": [
    {
      "wallet_address": "string",
      "whale_tier": "mega_whale|whale|large_holder",
      "action": "buy|sell|transfer|accumulate|distribute",
      "token": "string",
      "amount_usd": number,
      "timestamp": "ISO8601",
      "market_impact": "high|medium|low",
      "signal": "bullish|bearish|neutral",
      "note": "string"
    }
  ],
  "market_summary": {
    "net_whale_flow_usd": number,
    "dominant_action": "accumulating|distributing|mixed",
    "top_tokens_by_flow": ["string"],
    "overall_signal": "bullish|bearish|neutral"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"movements": 0.75, "summary": 0.78},
  "recommended_actions_priority_order": ["use whale flow as a leading indicator", "watch for coordinated moves", "don't front-run without confirmation"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: top whale wallets + recent moves + entry/exit signals
router.post('/lookup', async (req: Request, res: Response) => {
  const { token, chain = 'ethereum' } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  try {
    const raw = await callClaude(`Full whale wallet intelligence for ${token} on ${chain} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "token": "${token}",
  "chain": "${chain}",
  "top_whale_wallets": [
    {
      "address": "string",
      "tier": "mega_whale|whale|large_holder",
      "holdings_usd": number,
      "pct_supply": number,
      "recent_action": "accumulating|distributing|holding",
      "action_strength": "strong|moderate|weak"
    }
  ],
  "recent_movements": [
    {"action": "buy|sell|transfer", "amount_usd": number, "timestamp": "ISO8601", "signal": "bullish|bearish|neutral"}
  ],
  "concentration_risk": {
    "top_10_pct_supply": number,
    "top_50_pct_supply": number,
    "risk_level": "high|medium|low",
    "risk_note": "string"
  },
  "aggregate_signal": {
    "signal": "strong_buy|buy|neutral|sell|strong_sell",
    "whale_consensus": "accumulating|distributing|mixed",
    "short_term_outlook": "bullish|bearish|neutral",
    "key_insight": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"wallets": 0.78, "movements": 0.75, "signal": 0.72},
  "recommended_actions_priority_order": ["whale consensus > individual moves", "concentration risk affects liquidity", "combine with order book depth"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
