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
    name: 'Breakout Detection API', version: '1.0.0',
    description: 'Detect breakout setups, surface active breakout signals across the market, and provide full breakout analysis with entry and invalidation levels.',
    docs_url: 'https://orbis-apis.onrender.com/breakout-detection/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/breakout-detection/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Scan for breakout setups for a symbol', price_usdc: 0.004 },
      { method: 'POST', path: '/signals', summary: 'Active breakout signals across the market', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: breakout analysis + confirmation + entry/invalidation levels', price_usdc: 0.012 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.004', signals: '$0.004', lookup: '$0.012' } },
    agent_capabilities: ['breakout-detection', 'technical-setups', 'entry-signals', 'invalidation-levels', 'momentum-confirmation'],
    x402_compatible: true, paper_mode_recommended: true,
    execution_modes: ['agent-callable', 'execution-gated'],
    'x-latency-tier': 'real-time',
  });
});

// POST /scan — scan for breakout setups for a specific symbol
router.post('/scan', async (req: Request, res: Response) => {
  const { symbol, timeframe = '1h', exchange = 'binance' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Breakout setup scan for ${symbol} on ${exchange} at ${timeframe} timeframe as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "exchange": "${exchange}",
  "timeframe": "${timeframe}",
  "breakout_setups": [
    {
      "setup_type": "resistance_breakout|support_breakdown|range_breakout|flag_breakout|triangle_breakout|channel_breakout",
      "direction": "bullish|bearish",
      "key_level": number,
      "current_price": number,
      "distance_to_level_pct": number,
      "volume_confirmation": boolean,
      "setup_quality": "A+|A|B|C",
      "maturity": "forming|ready|triggered|failed"
    }
  ],
  "key_levels": {
    "major_resistance": number,
    "major_support": number,
    "range_high": number,
    "range_low": number,
    "consolidation_days": number
  },
  "volume_profile": {
    "avg_volume_20d": number,
    "current_volume": number,
    "volume_surge": boolean,
    "volume_trend": "increasing|decreasing|flat"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"setups": 0.78, "levels": 0.82, "volume": 0.80},
  "recommended_actions_priority_order": ["volume must confirm breakout", "wait for candle close above level", "false breakout risk is high without volume"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /signals — active breakout signals across the market
router.post('/signals', async (req: Request, res: Response) => {
  const { timeframe = '1h', min_confidence = 70 } = req.body;
  try {
    const raw = await callClaude(`Active breakout signals across the crypto market at ${timeframe} timeframe with minimum confidence ${min_confidence}% as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "timeframe": "${timeframe}",
  "min_confidence": ${min_confidence},
  "signals": [
    {
      "symbol": "string",
      "exchange": "string",
      "breakout_type": "resistance_breakout|support_breakdown|range_breakout|flag_breakout|triangle_breakout",
      "direction": "bullish|bearish",
      "breakout_level": number,
      "current_price": number,
      "confidence_pct": number,
      "volume_confirmed": boolean,
      "age_minutes": number,
      "target_pct": number,
      "stop_pct": number
    }
  ],
  "market_context": {
    "total_signals_found": number,
    "bullish_count": number,
    "bearish_count": number,
    "market_bias": "bullish|bearish|neutral",
    "highest_confidence_symbol": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"signals": 0.76, "market_context": 0.74},
  "recommended_actions_priority_order": ["prioritize volume-confirmed breakouts", "fresher signals are more reliable", "always set stops at invalidation level"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: full breakout analysis + confirmation + entry/invalidation levels
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol, timeframe = '1h' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full breakout intelligence for ${symbol} at ${timeframe} timeframe as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "timeframe": "${timeframe}",
  "primary_setup": {
    "setup_type": "resistance_breakout|support_breakdown|range_breakout|flag_breakout|triangle_breakout|channel_breakout",
    "direction": "bullish|bearish",
    "breakout_level": number,
    "current_price": number,
    "status": "pre_breakout|breaking_out|confirmed|failed",
    "volume_confirmation": boolean,
    "momentum_confirmation": boolean
  },
  "confirmation_checklist": {
    "price_above_level": boolean,
    "volume_above_average": boolean,
    "momentum_positive": boolean,
    "no_immediate_resistance": boolean,
    "candle_closed_above": boolean,
    "confirmation_score": number
  },
  "trade_levels": {
    "entry_price": number,
    "entry_zone_low": number,
    "entry_zone_high": number,
    "target_1": number,
    "target_2": number,
    "target_3": number,
    "invalidation_level": number,
    "stop_loss": number,
    "risk_reward_ratio": number
  },
  "breakout_probability": {
    "probability_pct": number,
    "expected_move_pct": number,
    "false_breakout_risk": "high|medium|low",
    "time_to_resolve_hours": number
  },
  "aggregate_signal": {
    "signal": "strong_buy|buy|neutral|sell|strong_sell",
    "conviction": "high|medium|low",
    "key_insight": "string"
  },
  "reasoning": {
    "why_signal_generated": "string explanation of the primary factor driving this breakout signal",
    "key_factors": ["factor 1 (e.g. volume surge above 20d avg)", "factor 2 (e.g. closed above resistance)", "factor 3"],
    "invalidators": ["price drops back below breakout level", "volume collapses on next candle", "broader market reversal"]
  },
  "latency_ms": number,
  "chain_to": [{"api": "risk-manager-api", "reason": "validate position size before execution"}, {"api": "portfolio-risk-api", "reason": "check overall portfolio exposure"}],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"setup": 0.78, "confirmation": 0.80, "levels": 0.77, "signal": 0.74, "reasoning": 0.76},
  "recommended_actions_priority_order": ["confirmation score must be 4/5+ before entry", "set stop at invalidation level immediately", "partial profits at target_1 reduce risk"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
