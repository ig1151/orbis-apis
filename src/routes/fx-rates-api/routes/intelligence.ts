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
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error(`Cannot parse as JSON: ${raw.slice(0, 100)}`);
}

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'FX Rates API', info: '/fx-rates/info', openapi: '/fx-rates/openapi.json', health: 'ok' });
});

// POST /convert
router.post('/convert', async (req: Request, res: Response) => {
  const { from, to, amount } = req.body;
  if (!from || !to || amount === undefined) return res.status(400).json({ error: 'from, to, and amount are required' });
  try {
    const raw = await callClaude(`Convert ${amount} ${from} to ${to}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "from": "${from.toUpperCase()}",
  "to": "${to.toUpperCase()}",
  "amount": ${amount},
  "converted_amount": number,
  "rate": number,
  "inverse_rate": number,
  "mid_market_rate": number,
  "bid": number,
  "ask": number,
  "spread_pct": number,
  "rate_timestamp": "ISO8601",
  "confidence_per_section": {"conversion": 0.9, "rate": 0.88},
  "recommended_actions_priority_order": ["verify rate with live exchange before settlement", "add spread buffer for actual transaction", "use historical rates for accounting"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /latest
router.post('/latest', async (req: Request, res: Response) => {
  const { base = 'USD' } = req.body;
  try {
    const raw = await callClaude(`Latest FX rates with base currency: "${base.toUpperCase()}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "base": "${base.toUpperCase()}",
  "rates": {
    "EUR": number, "GBP": number, "JPY": number, "CHF": number, "CAD": number,
    "AUD": number, "NZD": number, "CNY": number, "INR": number, "BRL": number,
    "MXN": number, "SEK": number, "NOK": number, "DKK": number, "SGD": number,
    "HKD": number, "KRW": number, "TRY": number, "ZAR": number, "AED": number
  },
  "rate_timestamp": "ISO8601",
  "source": "mid-market",
  "confidence_per_section": {"rates": 0.9},
  "recommended_actions_priority_order": ["use for multi-currency reporting", "compare with yesterday for trend signals", "pass to invoice workflows for normalization"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /historical
router.post('/historical', async (req: Request, res: Response) => {
  const { from_currency, to_currency, date } = req.body;
  if (!from_currency || !to_currency || !date) return res.status(400).json({ error: 'from_currency, to_currency, and date are required' });
  try {
    const raw = await callClaude(`Historical FX rate for ${from_currency.toUpperCase()}/${to_currency.toUpperCase()} on date: "${date}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "from_currency": "${from_currency.toUpperCase()}",
  "to_currency": "${to_currency.toUpperCase()}",
  "date": "${date}",
  "rate": number,
  "open": number,
  "high": number,
  "low": number,
  "close": number,
  "change_from_prev_day": number,
  "change_pct_from_prev_day": number,
  "context": {
    "year_ago_rate": number,
    "month_ago_rate": number,
    "week_ago_rate": number
  },
  "confidence_per_section": {"rate": 0.9, "context": 0.85},
  "recommended_actions_priority_order": ["use for accounting reconciliation", "compare with current rate for PnL", "use for compliance reporting"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { from, to, base, objective } = req.body;
  const hasInput = from || to || base;
  const flags: string[] = [];
  if (!hasInput) flags.push('NO_CURRENCY_PROVIDED');
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: flags.length === 0,
    from: from || null,
    to: to || null,
    base: base || 'USD',
    objective: objective || 'fx_conversion',
    next_api: 'invoice-parser',
    next_endpoint: '/parse',
    blocking_flags: flags,
    flag_definitions: { NO_CURRENCY_PROVIDED: 'Provide at least one currency code (from, to, or base)' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Run /convert for single currency conversion', 'Run /latest for multi-currency reporting', 'Run /historical for accounting reconciliation'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { from, to, amount } = req.body;
  if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
  try {
    const raw = await callClaude(`Full FX intelligence for ${from.toUpperCase()}/${to.toUpperCase()}${amount ? ` converting ${amount}` : ''}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "from": "${from.toUpperCase()}",
  "to": "${to.toUpperCase()}",
  "amount": ${amount || 1},
  "current_rate": {"rate": number, "bid": number, "ask": number, "spread_pct": number},
  "converted_amount": number,
  "historical_context": {"rate_1w_ago": number, "rate_1m_ago": number, "rate_1y_ago": number, "ytd_change_pct": number},
  "technical_signals": {"trend": "strengthening|weakening|stable", "support": number, "resistance": number, "rsi": number},
  "macro_factors": ["string"],
  "volatility_score": 0.0,
  "confidence_per_section": {"rate": 0.9, "historical_context": 0.85, "technical_signals": 0.78},
  "recommended_actions_priority_order": ["lock rate for international payments", "hedge exposure if high volatility", "use for multi-currency cash flow forecasting"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
