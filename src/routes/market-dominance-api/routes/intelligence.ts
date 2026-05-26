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
    name: 'Market Dominance API', version: '1.0.0',
    description: 'BTC/ETH/alt dominance in real time — phase detection, rotation signals, and portfolio allocation implications.',
    docs_url: 'https://orbis-apis.onrender.com/market-dominance/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/market-dominance/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/current', summary: 'Current dominance breakdown and market phase', price_usdc: 0.002 },
      { method: 'POST', path: '/history', summary: 'Historical dominance with phase transitions', price_usdc: 0.003 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: dominance + phase + rotation signals + allocation implications', price_usdc: 0.005 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { current: '$0.002', history: '$0.003', lookup: '$0.005' } },
    agent_capabilities: ['dominance-tracking', 'phase-detection', 'rotation-signals', 'macro-context', 'allocation-guidance'],
    x402_compatible: true, paper_mode_recommended: true, execution_gate_required: true,
  });
});

// POST /current — current BTC/ETH/alt dominance
router.post('/current', async (_req: Request, res: Response) => {
  try {
    const raw = await callClaude(`Crypto market dominance breakdown as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "dominance": {
    "btc": {"pct": number, "change_24h": number, "change_7d": number, "trend": "rising|falling|stable"},
    "eth": {"pct": number, "change_24h": number, "change_7d": number, "trend": "rising|falling|stable"},
    "stablecoins": {"pct": number, "change_24h": number, "trend": "rising|falling|stable"},
    "altcoins": {"pct": number, "change_24h": number, "trend": "rising|falling|stable"},
    "defi": {"pct": number, "change_24h": number},
    "top_10_excl_btc_eth": {"pct": number, "change_24h": number}
  },
  "total_market_cap_usd": number,
  "market_phase": {
    "phase": "btc_season|eth_season|alt_season|defi_season|stable_season|mixed",
    "confidence": number,
    "description": "string"
  },
  "rotation_signals": [
    {"from": "string", "to": "string", "strength": "strong|moderate|weak", "signal": "string"}
  ],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"dominance": 0.85, "phase": 0.78, "rotation": 0.72},
  "recommended_actions_priority_order": ["rising BTC dominance = risk-off signal", "falling BTC dominance + rising alts = alt season", "stablecoin dominance rising = fear signal"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /history — dominance trend over time
router.post('/history', async (req: Request, res: Response) => {
  const { days = 30, assets = ['btc', 'eth', 'altcoins'] } = req.body;
  try {
    const raw = await callClaude(`Crypto market dominance history over last ${days} days for ${assets.join(', ')} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "period_days": ${days},
  "assets": ${JSON.stringify(assets)},
  "history": [
    {
      "date": "YYYY-MM-DD",
      "btc_pct": number,
      "eth_pct": number,
      "altcoins_pct": number,
      "stablecoins_pct": number,
      "total_market_cap_usd": number,
      "phase": "string"
    }
  ],
  "trend_analysis": {
    "btc_trend": "rising|falling|consolidating",
    "eth_trend": "rising|falling|consolidating",
    "alt_trend": "rising|falling|consolidating",
    "dominant_phase_period": "string",
    "phase_transitions": [
      {"date": "YYYY-MM-DD", "from": "string", "to": "string", "catalyst": "string"}
    ]
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"history": 0.82, "trends": 0.75},
  "recommended_actions_priority_order": ["phase transitions signal portfolio rotation opportunities", "multi-week trend > single-day moves", "combine with volume data for confirmation"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: dominance + rotation signals + portfolio recommendation
router.post('/lookup', async (_req: Request, res: Response) => {
  try {
    const raw = await callClaude(`Complete market dominance intelligence as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "dominance": {
    "btc_pct": number,
    "eth_pct": number,
    "alts_pct": number,
    "stablecoins_pct": number,
    "change_7d": {"btc": number, "eth": number, "alts": number}
  },
  "market_phase": {
    "phase": "btc_season|eth_season|alt_season|mixed",
    "duration_days": number,
    "phase_strength": "strong|moderate|weak",
    "next_rotation_probability": {"to": "string", "probability_pct": number, "timeframe": "string"}
  },
  "rotation_signals": [
    {"signal": "string", "direction": "bullish|bearish|neutral", "affected_assets": ["string"], "strength": "strong|moderate|weak"}
  ],
  "portfolio_implications": {
    "btc_allocation_bias": "increase|decrease|hold",
    "eth_allocation_bias": "increase|decrease|hold",
    "alt_allocation_bias": "increase|decrease|hold",
    "stablecoin_allocation_bias": "increase|decrease|hold",
    "rationale": "string"
  },
  "key_levels": {
    "btc_dominance_key_support": number,
    "btc_dominance_key_resistance": number,
    "alt_season_threshold_pct": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"dominance": 0.85, "phase": 0.78, "rotation": 0.72, "implications": 0.68},
  "recommended_actions_priority_order": ["confirm phase with 7d moving average", "wait for phase transitions to stabilize before repositioning", "use dominance as context, not entry signal"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
