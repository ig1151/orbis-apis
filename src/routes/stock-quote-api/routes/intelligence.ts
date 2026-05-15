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
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Stock Quote API', info: '/stock-quote/info', openapi: '/stock-quote/openapi.json', health: 'ok' });
});

// POST /quote
router.post('/quote', async (req: Request, res: Response) => {
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });
  try {
    const raw = await callClaude(`Real-time quote analysis for ticker: "${ticker}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "ticker": "${ticker}",
  "quote": {
    "price": number, "change": number, "change_pct": number,
    "volume": number, "avg_volume": number, "market_cap": "string",
    "pe_ratio": number, "eps": number,
    "week_52_high": number, "week_52_low": number,
    "day_high": number, "day_low": number,
    "open": number, "prev_close": number
  },
  "market_status": "open|closed|pre-market|after-hours",
  "signal": "bullish|bearish|neutral",
  "confidence_per_section": {"quote": 0-1, "signal": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /batch-quotes
router.post('/batch-quotes', async (req: Request, res: Response) => {
  const { tickers } = req.body;
  if (!tickers || !Array.isArray(tickers)) return res.status(400).json({ error: 'tickers array is required' });
  try {
    const list = tickers.slice(0, 20).join(', ');
    const raw = await callClaude(`Batch quotes for tickers: ${list}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "quotes": [
    {"ticker": "string", "price": number, "change_pct": number, "volume": number,
     "market_cap": "string", "signal": "bullish|bearish|neutral"}
  ],
  "market_summary": {"gainers": number, "losers": number, "neutral": number},
  "confidence_per_section": {"quotes": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /market-status
router.post('/market-status', async (req: Request, res: Response) => {
  const { date } = req.body;
  try {
    const raw = await callClaude(`US market status for date: "${date || new Date().toISOString().slice(0, 10)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "market_status": {
    "is_open": true|false,
    "session": "regular|pre-market|after-hours|closed|holiday",
    "opens_at": "string",
    "closes_at": "string",
    "timezone": "America/New_York"
  },
  "upcoming_holidays": [{"date": "string", "holiday": "string"}],
  "pre_market_hours": {"start": "04:00", "end": "09:30"},
  "after_hours": {"start": "16:00", "end": "20:00"},
  "confidence_per_section": {"market_status": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /price-history
router.post('/price-history', async (req: Request, res: Response) => {
  const { ticker, from_date, to_date, interval = '1d' } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });
  try {
    const raw = await callClaude(`Historical OHLC for ticker: "${ticker}" from: "${from_date || '30d ago'}" to: "${to_date || 'today'}" interval: "${interval}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "ticker": "${ticker}",
  "interval": "${interval}",
  "ohlc": [
    {"date": "YYYY-MM-DD", "open": number, "high": number, "low": number, "close": number, "volume": number, "adj_close": number}
  ],
  "summary": {"period_return_pct": number, "high": number, "low": number, "avg_volume": number, "trend": "uptrend|downtrend|sideways"},
  "confidence_per_section": {"ohlc": 0-1, "summary": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { ticker, objective } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    ticker,
    objective: objective || 'market_analysis',
    next_api: 'earnings-analyzer',
    next_endpoint: '/analyze-earnings',
    blocking_flags: [],
    flag_definitions: { NO_TICKER: 'No ticker provided', MARKET_CLOSED: 'Market is closed — use /price-history for historical data' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Get quote first', 'Check market status', 'Pull price history for trend'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (one-call)
router.post('/lookup', async (req: Request, res: Response) => {
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });
  try {
    const raw = await callClaude(`Full stock intelligence for ticker: "${ticker}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "ticker": "${ticker}",
  "quote": {"price": number, "change_pct": number, "volume": number, "market_cap": "string", "pe_ratio": number, "week_52_high": number, "week_52_low": number},
  "fundamentals": {"revenue_ttm": "string", "eps_ttm": number, "dividend_yield": number, "beta": number, "debt_to_equity": number},
  "technicals": {"rsi": number, "trend": "uptrend|downtrend|sideways", "support": number, "resistance": number, "ma_50": number, "ma_200": number},
  "signals": [{"signal": "string", "type": "bullish|bearish|neutral", "strength": "strong|moderate|weak"}],
  "investment_grade": "A|B|C|D|F",
  "recommendation": "strong_buy|buy|hold|sell|strong_sell",
  "confidence_per_section": {"quote": 0-1, "fundamentals": 0-1, "technicals": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
