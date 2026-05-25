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
  res.json({ name: 'Impermanent Loss API', openapi: '/impermanent-loss/openapi.json', health: 'ok' });
});

// POST /calculate
router.post('/calculate', async (req: Request, res: Response) => {
  const { token_a, token_b, entry_price_a, entry_price_b, current_price_a, current_price_b, liquidity_usd } = req.body;
  if (!token_a || !token_b || entry_price_a == null || entry_price_b == null || current_price_a == null || current_price_b == null) {
    return res.status(400).json({ error: 'token_a, token_b, entry_price_a, entry_price_b, current_price_a, current_price_b are required' });
  }
  try {
    const raw = await callClaude(`Calculate impermanent loss for a liquidity pool position as of ${new Date().toISOString()}:
Token A: ${token_a}, entry price: $${entry_price_a}, current price: $${current_price_a}
Token B: ${token_b}, entry price: $${entry_price_b}, current price: $${current_price_b}
Liquidity deposited: ${liquidity_usd ? '$' + liquidity_usd : 'not specified'}
Use the standard constant product AMM formula (x*y=k). Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "pair": "${token_a}/${token_b}",
  "entry": {"price_a": ${entry_price_a}, "price_b": ${entry_price_b}, "ratio": number},
  "current": {"price_a": ${current_price_a}, "price_b": ${current_price_b}, "ratio": number},
  "price_change": {"token_a_pct": number, "token_b_pct": number},
  "impermanent_loss": {
    "pct": number (negative, e.g. -3.45),
    "usd": number or null,
    "vs_hodl_usd": number or null,
    "explanation": "string"
  },
  "hodl_value_usd": number or null,
  "lp_value_usd": number or null,
  "break_even_fees_needed_usd": number or null,
  "recommendation": "hold|exit|monitor",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "confidence_per_section": {"impermanent_loss": 0.95, "recommendation": 0.78},
  "recommended_actions_priority_order": ["compare IL vs accrued fees to decide exit", "check pool APY to assess fee offset", "exit if IL exceeds fee income significantly"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /simulate
router.post('/simulate', async (req: Request, res: Response) => {
  const { token_a, token_b, entry_price_a, entry_price_b, scenarios, liquidity_usd } = req.body;
  if (!token_a || !token_b || entry_price_a == null || entry_price_b == null) {
    return res.status(400).json({ error: 'token_a, token_b, entry_price_a, entry_price_b are required' });
  }
  try {
    const raw = await callClaude(`Simulate impermanent loss scenarios for ${token_a}/${token_b} LP position as of ${new Date().toISOString()}:
Entry price A: $${entry_price_a}, Entry price B: $${entry_price_b}
Liquidity: ${liquidity_usd ? '$' + liquidity_usd : 'not specified'}
Scenarios to simulate: ${JSON.stringify(scenarios || ['-50%', '-25%', '0%', '+25%', '+50%', '+100%', '+200%'])} price change for token A relative to token B.
Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "pair": "${token_a}/${token_b}",
  "scenarios": [
    {
      "price_change_pct": number,
      "il_pct": number,
      "il_usd": number or null,
      "lp_value_usd": number or null,
      "hodl_value_usd": number or null,
      "fee_needed_to_break_even_usd": number or null
    }
  ],
  "summary": "string",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "confidence_per_section": {"scenarios": 0.95},
  "recommended_actions_priority_order": ["use scenarios to set exit thresholds", "calculate daily fee income vs IL rate", "consider concentrated liquidity ranges to reduce IL"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { token_a, token_b, entry_price_a, entry_price_b, current_price_a, current_price_b, liquidity_usd } = req.body;
  if (!token_a || !token_b || entry_price_a == null || entry_price_b == null || current_price_a == null || current_price_b == null) {
    return res.status(400).json({ error: 'token_a, token_b, entry_price_a, entry_price_b, current_price_a, current_price_b are required' });
  }
  try {
    const raw = await callClaude(`Full impermanent loss analysis for ${token_a}/${token_b} LP position as of ${new Date().toISOString()}:
Entry: A=$${entry_price_a}, B=$${entry_price_b}. Current: A=$${current_price_a}, B=$${current_price_b}. Liquidity: ${liquidity_usd ? '$' + liquidity_usd : 'unspecified'}
Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "pair": "${token_a}/${token_b}",
  "impermanent_loss": {"pct": number, "usd": number or null, "explanation": "string"},
  "position": {"lp_value_usd": number or null, "hodl_value_usd": number or null, "net_vs_hodl_usd": number or null},
  "scenarios": [
    {"label": "string", "price_change_pct": number, "il_pct": number}
  ],
  "break_even_fee_needed_usd": number or null,
  "recommendation": "hold|exit|monitor",
  "financial_disclaimer": "For informational purposes only. Not financial advice.",
  "confidence_per_section": {"impermanent_loss": 0.95, "position": 0.90, "scenarios": 0.92},
  "recommended_actions_priority_order": ["compare current IL vs earned fees", "run scenario to set price-based exit triggers", "exit recommendation is net-of-fees assessment"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
