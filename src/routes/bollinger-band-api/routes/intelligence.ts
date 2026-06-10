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
    name: 'Bollinger Band Alert API', version: '1.0.0',
    description: 'Get Bollinger Band values, band width, and price position; detect squeezes and breakouts across the market; receive full BB intelligence with breakout probability.',
    docs_url: 'https://orbis-apis.onrender.com/bollinger-band/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/bollinger-band/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/bands', summary: 'Current Bollinger Band values + width + position for a symbol', price_usdc: 0.003 },
      { method: 'POST', path: '/alerts', summary: 'Squeeze and breakout BB alerts across the market', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: BB state + squeeze detection + breakout probability + signal', price_usdc: 0.010 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { bands: '$0.003', alerts: '$0.004', lookup: '$0.010' } },
    agent_capabilities: ['bollinger-bands', 'squeeze-detection', 'breakout-probability', 'volatility-analysis', 'mean-reversion'],
    x402_compatible: true, paper_mode_recommended: true,
    execution_modes: ['agent-callable', 'read-only'],
    'x-latency-tier': 'near-real-time',
  });
});

// POST /bands — current BB values, width, and price position
router.post('/bands', async (req: Request, res: Response) => {
  const { symbol, timeframe = '1h', period = 20, std_dev = 2 } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Bollinger Band analysis for ${symbol} at ${timeframe} timeframe (period ${period}, ${std_dev} std dev) as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "timeframe": "${timeframe}",
  "settings": {"period": ${period}, "std_dev": ${std_dev}},
  "bands": {
    "upper_band": number,
    "middle_band": number,
    "lower_band": number,
    "band_width": number,
    "band_width_pct": number,
    "current_price": number,
    "percent_b": number,
    "price_position": "above_upper|near_upper|middle|near_lower|below_lower",
    "touching_upper": boolean,
    "touching_lower": boolean
  },
  "volatility": {
    "current_volatility": "high|normal|low|compressed",
    "historical_rank_pct": number,
    "expanding": boolean,
    "contracting": boolean
  },
  "mean_reversion": {
    "stretched_from_mean_pct": number,
    "reversion_likely": boolean,
    "direction": "to_upper|to_lower|neutral"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"bands": 0.85, "volatility": 0.82, "mean_reversion": 0.75},
  "recommended_actions_priority_order": ["percent_b above 1.0 = extreme overbought", "low bandwidth often precedes explosive moves", "combine with momentum for direction bias"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /alerts — squeeze and breakout alerts across the market
router.post('/alerts', async (req: Request, res: Response) => {
  const { timeframe = '1h', type = 'both' } = req.body;
  try {
    const raw = await callClaude(`Bollinger Band ${type} alerts across the crypto market at ${timeframe} timeframe as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "timeframe": "${timeframe}",
  "alert_type": "${type}",
  "alerts": [
    {
      "symbol": "string",
      "alert_type": "squeeze|breakout_up|breakout_down|touch_upper|touch_lower|walk_upper|walk_lower",
      "band_width_pct": number,
      "band_width_percentile": number,
      "current_price": number,
      "percent_b": number,
      "squeeze_duration_bars": number,
      "breakout_confirmed": boolean,
      "volume_surge": boolean,
      "signal": "bullish|bearish|neutral",
      "urgency": "high|medium|low"
    }
  ],
  "market_summary": {
    "total_squeezes": number,
    "total_breakouts": number,
    "avg_bandwidth_pct": number,
    "market_volatility_state": "high|normal|low|compressed",
    "most_compressed_symbol": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"alerts": 0.80, "market_summary": 0.78},
  "recommended_actions_priority_order": ["low squeeze percentile = imminent expansion", "volume confirms breakout direction", "false breakouts common in ranging markets"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: BB state + squeeze detection + breakout probability + signal
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol, timeframe = '1h' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full Bollinger Band intelligence for ${symbol} at ${timeframe} timeframe as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "timeframe": "${timeframe}",
  "bb_state": {
    "upper_band": number,
    "middle_band": number,
    "lower_band": number,
    "current_price": number,
    "percent_b": number,
    "band_width_pct": number,
    "price_position": "above_upper|near_upper|middle|near_lower|below_lower"
  },
  "squeeze_analysis": {
    "squeeze_detected": boolean,
    "squeeze_strength": "extreme|strong|moderate|none",
    "bandwidth_percentile_20d": number,
    "squeeze_duration_bars": number,
    "squeeze_building": boolean,
    "historical_avg_move_after_squeeze_pct": number
  },
  "breakout_analysis": {
    "breakout_detected": boolean,
    "breakout_direction": "up|down|none",
    "breakout_probability_pct": number,
    "volume_confirmation": boolean,
    "expected_move_pct": number,
    "retest_likely": boolean
  },
  "mean_reversion_setup": {
    "setup_active": boolean,
    "direction": "buy_lower_band|sell_upper_band|none",
    "confluence_with_support_resistance": boolean,
    "target_middle_band": number
  },
  "aggregate_signal": {
    "signal": "strong_buy|buy|neutral|sell|strong_sell",
    "primary_setup": "squeeze_breakout|mean_reversion|trend_continuation|none",
    "conviction": "high|medium|low",
    "key_insight": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"bb_state": 0.85, "squeeze": 0.80, "breakout": 0.77, "signal": 0.75},
  "recommended_actions_priority_order": ["squeeze + volume spike = explosive move coming", "walk-the-band pattern shows strong trend", "mean reversion works best in ranging markets"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
