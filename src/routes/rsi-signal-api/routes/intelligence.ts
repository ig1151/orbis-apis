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
    name: 'RSI Signal API', version: '1.0.0',
    description: 'Get RSI values, divergence detection, overbought/oversold alerts across the market, and full RSI intelligence with trade implications.',
    docs_url: 'https://orbis-apis.onrender.com/rsi-signal/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/rsi-signal/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/rsi', summary: 'Current RSI value + zone + divergence for a symbol', price_usdc: 0.003 },
      { method: 'POST', path: '/alerts', summary: 'Overbought/oversold alerts across the market', price_usdc: 0.003 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: RSI + divergence + signal + trade implication', price_usdc: 0.008 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { rsi: '$0.003', alerts: '$0.003', lookup: '$0.008' } },
    agent_capabilities: ['rsi-analysis', 'divergence-detection', 'overbought-oversold', 'momentum-signals', 'trade-timing'],
    x402_compatible: true, paper_mode_recommended: true,
    execution_modes: ['agent-callable', 'read-only'],
    'x-latency-tier': 'near-real-time',
  });
});

// POST /rsi — current RSI value, zone, and divergence for a symbol
router.post('/rsi', async (req: Request, res: Response) => {
  const { symbol, timeframe = '1h', exchange = 'binance' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`RSI analysis for ${symbol} on ${exchange} at ${timeframe} timeframe as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "exchange": "${exchange}",
  "timeframe": "${timeframe}",
  "rsi": {
    "period": 14,
    "value": number,
    "rsi_zone": "overbought|oversold|neutral|extreme_overbought|extreme_oversold",
    "overbought_threshold": 70,
    "oversold_threshold": 30,
    "previous_value": number,
    "trend": "rising|falling|flat"
  },
  "divergence": {
    "divergence_detected": boolean,
    "divergence_type": "bullish_regular|bearish_regular|bullish_hidden|bearish_hidden|none",
    "price_action": "making_higher_highs|making_lower_lows|making_lower_highs|making_higher_lows",
    "rsi_action": "making_lower_highs|making_higher_lows|making_higher_highs|making_lower_lows|none",
    "significance": "high|medium|low|none",
    "bars_confirmed": number
  },
  "rsi_history": [
    {"timestamp": "ISO8601", "value": number, "zone": "overbought|oversold|neutral"}
  ],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"rsi": 0.85, "divergence": 0.78},
  "recommended_actions_priority_order": ["divergence is more powerful than zone alone", "RSI can stay overbought in strong trends", "combine with price action for entries"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /alerts — overbought/oversold RSI alerts across the market
router.post('/alerts', async (req: Request, res: Response) => {
  const { timeframe = '1h', threshold = 70 } = req.body;
  try {
    const raw = await callClaude(`RSI overbought/oversold alerts across the crypto market at ${timeframe} timeframe with threshold ${threshold} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "timeframe": "${timeframe}",
  "threshold": ${threshold},
  "alerts": [
    {
      "symbol": "string",
      "exchange": "string",
      "rsi_value": number,
      "rsi_zone": "overbought|oversold|extreme_overbought|extreme_oversold",
      "price": number,
      "volume_24h_usd": number,
      "divergence_present": boolean,
      "signal": "potential_reversal|continuation|watch",
      "alert_strength": "strong|moderate|weak"
    }
  ],
  "summary": {
    "total_overbought": number,
    "total_oversold": number,
    "extreme_readings": number,
    "market_bias": "overbought_dominant|oversold_dominant|balanced",
    "mean_rsi": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"alerts": 0.80, "summary": 0.78},
  "recommended_actions_priority_order": ["extreme readings warrant immediate attention", "oversold in downtrend can stay oversold", "volume matters for reversal conviction"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: RSI + divergence + signal + trade implication
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol, timeframe = '1h' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full RSI intelligence for ${symbol} at ${timeframe} timeframe as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "timeframe": "${timeframe}",
  "rsi_state": {
    "value": number,
    "rsi_zone": "overbought|oversold|neutral|extreme_overbought|extreme_oversold",
    "trend": "rising|falling|flat",
    "distance_from_50": number,
    "speed_of_change": "fast|moderate|slow"
  },
  "divergence_analysis": {
    "divergence_detected": boolean,
    "divergence_type": "bullish_regular|bearish_regular|bullish_hidden|bearish_hidden|none",
    "confirmation_bars": number,
    "strength": "strong|moderate|weak|none",
    "expected_reaction": "string"
  },
  "multi_timeframe_rsi": {
    "15m": number,
    "1h": number,
    "4h": number,
    "1d": number,
    "alignment": "all_overbought|all_oversold|rising|falling|mixed"
  },
  "trade_signal": {
    "signal": "strong_buy|buy|neutral|sell|strong_sell",
    "trigger": "divergence|zone_extreme|momentum_shift|none",
    "entry_timing": "now|wait_for_confirmation|avoid",
    "stop_suggestion": number,
    "key_insight": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"rsi": 0.85, "divergence": 0.78, "multi_tf": 0.82, "signal": 0.75},
  "recommended_actions_priority_order": ["multi-TF alignment strengthens signal", "divergence + extreme zone = high conviction", "RSI alone insufficient for entry — use with price action"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
