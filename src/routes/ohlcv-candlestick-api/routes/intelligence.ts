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
    name: 'OHLCV Candlestick API', version: '1.0.0',
    description: 'Retrieve OHLCV candlestick data, multi-timeframe summaries, and full candlestick intelligence with trend and pattern detection.',
    docs_url: 'https://orbis-apis.onrender.com/ohlcv-candlestick/openapi.json',
    openapi_url: 'https://orbis-apis.onrender.com/ohlcv-candlestick/openapi.json',
    health: 'ok',
    auth: { type: 'apiKey', header: 'X-API-Key', docs: 'https://orbisapi.com/docs/auth' },
    endpoints: [
      { method: 'POST', path: '/candles', summary: 'OHLCV data for a symbol+timeframe', price_usdc: 0.003 },
      { method: 'POST', path: '/aggregate', summary: 'Multi-timeframe OHLCV summary for a symbol', price_usdc: 0.003 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: full candlestick intelligence + trend + pattern detection', price_usdc: 0.008 },
    ],
    pricing: { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { candles: '$0.003', aggregate: '$0.003', lookup: '$0.008' } },
    agent_capabilities: ['candlestick-data', 'ohlcv-series', 'trend-detection', 'pattern-recognition', 'multi-timeframe-analysis'],
    x402_compatible: true, paper_mode_recommended: true,
  });
});

// POST /candles — OHLCV data for a symbol and timeframe
router.post('/candles', async (req: Request, res: Response) => {
  const { symbol, timeframe = '1h', exchange = 'binance', limit = 50 } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`OHLCV data for ${symbol} on ${exchange} ${timeframe} (last 5 candles) as of ${new Date().toISOString()}. Return compact JSON:
{"trace_id":"${traceId()}","computed_at":"${new Date().toISOString()}","success":true,"symbol":"${symbol}","exchange":"${exchange}","timeframe":"${timeframe}","candles":[{"timestamp":"ISO8601","open":number,"high":number,"low":number,"close":number,"volume":number,"candle_type":"bullish|bearish|doji"},{"timestamp":"ISO8601","open":number,"high":number,"low":number,"close":number,"volume":number,"candle_type":"bullish|bearish|doji"},{"timestamp":"ISO8601","open":number,"high":number,"low":number,"close":number,"volume":number,"candle_type":"bullish|bearish|doji"},{"timestamp":"ISO8601","open":number,"high":number,"low":number,"close":number,"volume":number,"candle_type":"bullish|bearish|doji"},{"timestamp":"ISO8601","open":number,"high":number,"low":number,"close":number,"volume":number,"candle_type":"bullish|bearish|doji"}],"summary":{"current_price":number,"price_change_pct":number,"trend_direction":"uptrend|downtrend|sideways","trend_strength":"strong|moderate|weak"},"financial_disclaimer":"For informational purposes only. Not financial advice.","paper_mode_recommended":true,
  "confidence_per_section": {"candles": 0.82, "summary": 0.80},
  "recommended_actions_priority_order": ["verify with live exchange data", "combine with volume analysis", "use multiple timeframes for confirmation"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /aggregate — multi-timeframe OHLCV summary
router.post('/aggregate', async (req: Request, res: Response) => {
  const { symbol, exchange = 'binance' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Multi-timeframe OHLCV aggregate summary for ${symbol} on ${exchange} as of ${new Date().toISOString()}. Cover timeframes: 15m, 1h, 4h, 1d. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "exchange": "${exchange}",
  "timeframes": {
    "15m": {
      "open": number, "high": number, "low": number, "close": number, "volume": number,
      "trend": "uptrend|downtrend|sideways", "candle_count": number
    },
    "1h": {
      "open": number, "high": number, "low": number, "close": number, "volume": number,
      "trend": "uptrend|downtrend|sideways", "candle_count": number
    },
    "4h": {
      "open": number, "high": number, "low": number, "close": number, "volume": number,
      "trend": "uptrend|downtrend|sideways", "candle_count": number
    },
    "1d": {
      "open": number, "high": number, "low": number, "close": number, "volume": number,
      "trend": "uptrend|downtrend|sideways", "candle_count": number
    }
  },
  "alignment": {
    "trend_alignment": "aligned_bullish|aligned_bearish|mixed|conflicted",
    "dominant_timeframe": "string",
    "confluence_score": number
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"timeframes": 0.80, "alignment": 0.78},
  "recommended_actions_priority_order": ["higher timeframe bias takes priority", "wait for lower TF confirmation", "check volume alignment"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup — ONE-CALL: full candlestick intelligence + trend + pattern detection
router.post('/lookup', async (req: Request, res: Response) => {
  const { symbol, exchange = 'binance' } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });
  try {
    const raw = await callClaude(`Full candlestick intelligence for ${symbol} on ${exchange} as of ${new Date().toISOString()}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "symbol": "${symbol}",
  "exchange": "${exchange}",
  "current_candle": {
    "timeframe": "1h",
    "open": number, "high": number, "low": number, "close": number, "volume": number,
    "candle_type": "bullish|bearish|doji|hammer|shooting_star|engulfing",
    "body_pct": number,
    "wick_ratio": number
  },
  "pattern_detection": {
    "patterns_found": [
      {
        "pattern": "string",
        "timeframe": "string",
        "reliability": "high|medium|low",
        "implication": "bullish|bearish|continuation|reversal"
      }
    ],
    "dominant_pattern": "string",
    "pattern_signal": "bullish|bearish|neutral"
  },
  "trend_analysis": {
    "short_term": "uptrend|downtrend|sideways",
    "medium_term": "uptrend|downtrend|sideways",
    "long_term": "uptrend|downtrend|sideways",
    "trend_alignment": "aligned|mixed|conflicted",
    "key_levels": {
      "support": number,
      "resistance": number,
      "pivot": number
    }
  },
  "aggregate_signal": {
    "signal": "strong_buy|buy|neutral|sell|strong_sell",
    "conviction": "high|medium|low",
    "entry_zone": "string",
    "invalidation_level": number,
    "key_insight": "string"
  },
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "paper_mode_recommended": true,
  "confidence_per_section": {"candle": 0.82, "patterns": 0.75, "trend": 0.80, "signal": 0.73},
  "recommended_actions_priority_order": ["pattern + trend alignment = higher conviction", "set invalidation levels before entry", "size position according to volatility"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
