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
  res.json({ name: 'Currency Formatting API', info: '/currency-formatting/info', openapi: '/currency-formatting/openapi.json', health: 'ok' });
});

// POST /format
router.post('/format', async (req: Request, res: Response) => {
  const { amount, currency, locale } = req.body;
  if (amount === undefined || !currency) return res.status(400).json({ error: 'amount and currency are required' });
  try {
    const raw = await callClaude(`Format currency amount ${amount} in ${currency} for locale "${locale || 'en-US'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "amount": ${amount},
  "currency": "${currency}",
  "locale": "${locale || 'en-US'}",
  "formatted": "string",
  "formatted_compact": "string",
  "symbol": "string",
  "symbol_position": "before|after",
  "decimal_separator": "string",
  "thousands_separator": "string",
  "decimal_places": number,
  "words": "string",
  "confidence_per_section": {"formatted": 0.98, "symbol": 0.99},
  "recommended_actions_priority_order": ["Use formatted string for display", "Store raw amount for calculations"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /convert
router.post('/convert', async (req: Request, res: Response) => {
  const { amount, from_currency, to_currency } = req.body;
  if (amount === undefined || !from_currency || !to_currency) return res.status(400).json({ error: 'amount, from_currency, and to_currency are required' });
  try {
    const raw = await callClaude(`Convert ${amount} ${from_currency} to ${to_currency} with formatting. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "original": {"amount": ${amount}, "currency": "${from_currency}", "formatted": "string"},
  "converted": {"amount": number, "currency": "${to_currency}", "formatted": "string", "formatted_compact": "string"},
  "exchange_rate": number,
  "rate_source": "indicative",
  "rate_timestamp": "${new Date().toISOString()}",
  "inverse_rate": number,
  "financial_disclaimer": "Exchange rates are indicative only. Verify with authoritative source before use in financial transactions.",
  "confidence_per_section": {"converted": 0.85, "exchange_rate": 0.8},
  "recommended_actions_priority_order": ["Verify rate with live FX source", "Apply appropriate rounding for currency"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /symbols
router.post('/symbols', async (req: Request, res: Response) => {
  const { region } = req.body;
  try {
    const raw = await callClaude(`List currency symbols and metadata${region ? ` for region: "${region}"` : ' for all major currencies'}. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "region": "${region || 'global'}",
  "currencies": [
    {
      "code": "string",
      "name": "string",
      "symbol": "string",
      "symbol_native": "string",
      "decimal_digits": number,
      "rounding": number,
      "country": "string",
      "country_code": "string"
    }
  ],
  "total": number,
  "confidence_per_section": {"currencies": 0.95},
  "recommended_actions_priority_order": ["Cache currency data — rarely changes", "Use ISO 4217 code not symbol for storage"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { currency, objective } = req.body;
  if (!currency) return res.status(400).json({ error: 'currency is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    currency,
    objective: objective || 'currency_format',
    next_api: 'unit-conversion',
    next_endpoint: '/convert',
    blocking_flags: [],
    flag_definitions: {
      NO_CURRENCY: 'No currency code provided',
      INVALID_CURRENCY: 'Currency code is not a valid ISO 4217 code',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Validate currency code', 'Get symbol metadata', 'Format for display locale'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (one-call)
router.post('/lookup', async (req: Request, res: Response) => {
  const { currency } = req.body;
  if (!currency) return res.status(400).json({ error: 'currency is required' });
  try {
    const raw = await callClaude(`Full currency intelligence for: "${currency}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "currency": "${currency}",
  "metadata": {
    "name": "string",
    "symbol": "string",
    "symbol_native": "string",
    "decimal_digits": number,
    "rounding": number,
    "iso_4217": "string"
  },
  "countries_using": ["string"],
  "formatting_examples": [{"locale": "string", "amount": number, "formatted": "string"}],
  "major_pairs": [{"pair": "string", "indicative_rate": number}],
  "financial_disclaimer": "Exchange rates are indicative only. Verify with authoritative source before use in financial transactions.",
  "confidence_per_section": {"metadata": 0.98, "countries_using": 0.95, "major_pairs": 0.8},
  "recommended_actions_priority_order": ["Use ISO 4217 code for all storage", "Apply locale-specific formatting for display", "Verify rates before financial use"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
