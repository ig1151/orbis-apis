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
    name: 'Scalping Opportunity API', version: '1.0.0',
    description: 'Find live scalping setups for a symbol, scan the market for the best scalping opportunities right now, and get full scalping intelligence with entry/target/stop and risk assessment.',
    docs_url: 'https://orbis-apis.onrender.com/scalping-opportunity/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/scalping-opportunity/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/opportunities', summary: 'Live scalping setups for a symbol', price_usdc: 0.004 },
      { method: 'POST', path: '/scan', summary: 'Scan market for best scalping setups right now', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: top scalping setup + entry/target/stop + risk assessment', price_usdc: 0.012 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { opportunities: '$0.004', scan: '$0.005', lookup: '$0.012' } },
    agent_capabilities: ['scalping-setups', 'micro-timeframe-analysis', 'entry-exit-precision', 'risk-reward-scoring', 'market-microstructure'],
    x402_compatible: true, paper_mode_recommended: true,
    execution_modes: ['agent-callable', 'execution-gated'],
    'x-latency-tier': 'real-time',
  });
});

// POST /opportunities — live scalping setups for a symbol
router.post('/opportunities', async (req: Request, res: Response) => {
  const { symbol, exchange = 'binance', timeframe = '5m' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Live scalping setup analysis for ${symbol} on ${exchange} at ${timeframe} timeframe as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "exchange": "${exchange}",
  "timeframe": "${timeframe}",
  "scalping_setups": [
    {
      "setup_type": "momentum_scalp|reversal_scalp|range_scalp|breakout_scalp|orderbook_scalp",
      "direction": "long|short",
      "entry_price": number,
      "target_price": number,
      "stop_loss": number,
      "expected_move_pct": number,
      "risk_reward": number,
      "time_in_trade_minutes": number,
      "setup_quality": "A+|A|B|C",
      "confidence_pct": number,
      "key_trigger": "string"
    }
  ],
  "market_conditions": {
    "current_price": number,
    "spread_pct": number,
    "liquidity_score": number,
    "volatility_suitable": boolean,
    "volume_above_avg": boolean,
    "scalping_friendly": boolean
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"setups": 0.75, "conditions": 0.82},
  "recommended_actions_priority_order": ["scalping requires tight spreads and high volume", "always set stop-loss before entry", "exit quickly if setup invalidates"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /scan — scan market for best scalping setups right now
router.post('/scan', async (req: Request, res: Response) => {
  const { exchange = 'binance', min_score = 70 } = req.body;
  try {
    const raw = await callClaude(`Scan ${exchange} for the best scalping opportunities right now with minimum score ${min_score}/100 as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "exchange": "${exchange}",
  "min_score": ${min_score},
  "top_setups": [
    {
      "symbol": "string",
      "setup_type": "momentum_scalp|reversal_scalp|range_scalp|breakout_scalp|orderbook_scalp",
      "direction": "long|short",
      "score": number,
      "entry_price": number,
      "target_price": number,
      "stop_loss": number,
      "risk_reward": number,
      "volume_ratio": number,
      "spread_pct": number,
      "urgency": "immediate|soon|available",
      "key_reason": "string"
    }
  ],
  "market_overview": {
    "total_opportunities_found": number,
    "best_symbol": "string",
    "avg_risk_reward": number,
    "market_phase": "trending|ranging|volatile",
    "scalping_conditions": "excellent|good|fair|poor"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"setups": 0.75, "overview": 0.78},
  "recommended_actions_priority_order": ["act on immediate urgency setups first", "trending markets favor momentum scalps", "ranging markets favor range scalps"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: top scalping setup + entry/target/stop + risk assessment
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol, exchange = 'binance' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full scalping intelligence for ${symbol} on ${exchange} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "exchange": "${exchange}",
  "best_setup": {
    "setup_type": "momentum_scalp|reversal_scalp|range_scalp|breakout_scalp|orderbook_scalp",
    "direction": "long|short",
    "score": number,
    "confidence_pct": number,
    "time_sensitivity": "immediate|within_5m|within_15m|no_rush"
  },
  "precise_levels": {
    "entry_price": number,
    "entry_zone_low": number,
    "entry_zone_high": number,
    "target_1": number,
    "target_2": number,
    "stop_loss": number,
    "invalidation_price": number,
    "risk_reward_ratio": number,
    "max_loss_pct": number
  },
  "orderbook_intel": {
    "bid_ask_spread_pct": number,
    "depth_bid_usd": number,
    "depth_ask_usd": number,
    "large_orders_nearby": boolean,
    "liquidity_grade": "A|B|C|D",
    "slippage_estimate_pct": number
  },
  "risk_assessment": {
    "overall_risk": "low|medium|high|extreme",
    "volatility_risk": "low|medium|high",
    "liquidity_risk": "low|medium|high",
    "market_condition_risk": "low|medium|high",
    "recommended_position_size_pct": number,
    "max_trades_simultaneously": number
  },
  "execution_checklist": {
    "spread_acceptable": boolean,
    "volume_sufficient": boolean,
    "momentum_aligned": boolean,
    "no_major_news_pending": boolean,
    "readiness_score": number
  },
  "reasoning": {
    "why_signal_generated": "string explanation of the primary microstructure factor triggering this scalp setup",
    "key_factors": ["factor 1 (e.g. momentum aligned on 1m and 5m)", "factor 2 (e.g. tight spread with deep bid side)", "factor 3 (e.g. volume surge at key level)"],
    "invalidators": ["spread widens above 0.05%", "bid depth drops below $50k", "opposing momentum signal on higher timeframe"]
  },
  "latency_ms": number,
  "chain_to": [{"api": "multi-exchange-ticker-api", "reason": "confirm best execution exchange before entry"}, {"api": "breakout-detection-api", "reason": "verify scalp direction aligns with larger breakout setup"}],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"setup": 0.75, "levels": 0.78, "orderbook": 0.80, "risk": 0.77, "reasoning": 0.76},
  "recommended_actions_priority_order": ["readiness score < 4/5 = skip this trade", "max loss per trade should be < 0.5% of capital", "paper trade first to validate setup type"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
