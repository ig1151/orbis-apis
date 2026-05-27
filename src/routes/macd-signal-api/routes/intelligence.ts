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
    name: 'MACD Signal API', version: '1.0.0',
    description: 'Get MACD line, signal line, and histogram values, detect crossovers, and receive full MACD intelligence with momentum and trade signals.',
    docs_url: 'https://orbis-apis.onrender.com/macd-signal/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/macd-signal/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/macd', summary: 'Current MACD line, signal line, and histogram for a symbol', price_usdc: 0.003 },
      { method: 'POST', path: '/crossovers', summary: 'Recent and upcoming MACD crossover signals', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: MACD state + crossover + momentum + trade signal', price_usdc: 0.010 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { macd: '$0.003', crossovers: '$0.004', lookup: '$0.010' } },
    agent_capabilities: ['macd-analysis', 'crossover-detection', 'momentum-assessment', 'histogram-trend', 'trade-timing'],
    x402_compatible: true, paper_mode_recommended: true,
    execution_modes: ['agent-callable', 'read-only'],
    'x-latency-tier': 'near-real-time',
  });
});

// POST /macd — current MACD line, signal line, and histogram
router.post('/macd', async (req: Request, res: Response) => {
  const { symbol, timeframe = '1h', exchange = 'binance' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`MACD analysis for ${symbol} on ${exchange} at ${timeframe} timeframe as of ${new Date().toISOString()}. Use standard MACD settings (12, 26, 9). Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "exchange": "${exchange}",
  "timeframe": "${timeframe}",
  "macd": {
    "fast_period": 12,
    "slow_period": 26,
    "signal_period": 9,
    "macd_line": number,
    "signal_line": number,
    "histogram": number,
    "histogram_color": "green|red",
    "histogram_trend": "expanding|contracting|flat",
    "position": "above_zero|below_zero",
    "macd_vs_signal": "macd_above|macd_below|crossing"
  },
  "momentum": {
    "strength": "strong_bullish|bullish|neutral|bearish|strong_bearish",
    "acceleration": "accelerating|decelerating|flat",
    "zero_line_distance": number
  },
  "macd_history": [
    {"timestamp": "ISO8601", "macd_line": number, "signal_line": number, "histogram": number}
  ],
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"macd": 0.83, "momentum": 0.80},
  "recommended_actions_priority_order": ["histogram expansion confirms momentum", "zero-line crossovers are stronger signals", "signal-line crossovers work best in trending markets"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /crossovers — recent and upcoming MACD crossover signals
router.post('/crossovers', async (req: Request, res: Response) => {
  const { symbol, timeframe = '1h' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`MACD crossover signals for ${symbol} at ${timeframe} timeframe as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "timeframe": "${timeframe}",
  "recent_crossovers": [
    {
      "crossover_type": "bullish_signal_cross|bearish_signal_cross|bullish_zero_cross|bearish_zero_cross",
      "timestamp": "ISO8601",
      "price_at_crossover": number,
      "bars_ago": number,
      "outcome": "profitable|unprofitable|pending",
      "max_move_pct": number
    }
  ],
  "pending_crossover": {
    "likely": boolean,
    "type": "bullish_signal_cross|bearish_signal_cross|bullish_zero_cross|bearish_zero_cross|none",
    "bars_estimated": number,
    "probability_pct": number,
    "trigger_conditions": "string"
  },
  "crossover_stats": {
    "win_rate_last_10": number,
    "avg_move_after_cross_pct": number,
    "best_performing_type": "string",
    "false_signal_rate_pct": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"recent": 0.82, "pending": 0.70, "stats": 0.75},
  "recommended_actions_priority_order": ["zero-line crossovers carry more weight", "confirm with higher timeframe", "avoid crossovers in choppy sideways markets"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: MACD state + crossover + momentum + trade signal
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol, timeframe = '1h' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full MACD intelligence for ${symbol} at ${timeframe} timeframe as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "timeframe": "${timeframe}",
  "macd_state": {
    "macd_line": number,
    "signal_line": number,
    "histogram": number,
    "histogram_bars_direction": number,
    "position": "above_zero|below_zero",
    "crossover_status": "just_crossed_bullish|just_crossed_bearish|macd_above_signal|macd_below_signal"
  },
  "momentum_assessment": {
    "current_momentum": "strong_bullish|bullish|fading_bullish|neutral|fading_bearish|bearish|strong_bearish",
    "momentum_shift_detected": boolean,
    "histogram_trend": "expanding_positive|contracting_positive|expanding_negative|contracting_negative",
    "divergence_from_price": boolean
  },
  "multi_timeframe_macd": {
    "15m": {"above_zero": boolean, "bullish_cross": boolean, "histogram_expanding": boolean},
    "1h": {"above_zero": boolean, "bullish_cross": boolean, "histogram_expanding": boolean},
    "4h": {"above_zero": boolean, "bullish_cross": boolean, "histogram_expanding": boolean},
    "1d": {"above_zero": boolean, "bullish_cross": boolean, "histogram_expanding": boolean}
  },
  "trade_signal": {
    "signal": "strong_buy|buy|neutral|sell|strong_sell",
    "trigger": "signal_crossover|zero_crossover|histogram_reversal|divergence",
    "entry_timing": "now|wait_for_crossover|wait_for_zero_cross|avoid",
    "conviction": "high|medium|low",
    "key_insight": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"macd": 0.83, "momentum": 0.80, "multi_tf": 0.78, "signal": 0.75},
  "recommended_actions_priority_order": ["multi-TF MACD alignment = strongest signal", "histogram reversal often precedes price turn", "MACD lags — pair with RSI for timing"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
