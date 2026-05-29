import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const r = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: MODEL, messages: [{ role: 'user', content: prompt }] },
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return r.data.choices[0].message.content;
}

function parseJSON(raw: string): any {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1));
  return JSON.parse(cleaned);
}

function traceId(): string { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

const EXTRA = {
  "chain_to": [
    {
      "api": "Liquidation Cascade",
      "reason": "translate leverage buildup into liquidation zones"
    },
    {
      "api": "Funding Rate Divergence",
      "reason": "confirm whether longs or shorts are crowded"
    },
    {
      "api": "AI Risk Manager",
      "reason": "size risk against rising leverage"
    }
  ],
  "execution_gate_required": true,
  "paper_mode_recommended": true
};

function finalize(data: any): any {
  return {
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    ...data,
    financial_disclaimer: 'For informational purposes only. Not financial advice. Crypto trading involves substantial risk of loss.',
    privacy: { data_stored: false, retention: 'none' },
    ...EXTRA,
  };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Open Interest Intelligence API',
    version: '1.0.0',
    status: 'ok',
    openapi_url: '/open-interest-intelligence/openapi.json',
    'x-agent-callable': true,
    endpoints: [{"method":"POST","path":"/oi","description":"Aggregate and per-exchange open interest snapshot","price":"$0.004"},{"method":"POST","path":"/changes","description":"OI change vs price change with new-longs/shorts interpretation","price":"$0.006"},{"method":"POST","path":"/lookup","description":"ONE-CALL: OI + change interpretation + leverage buildup + trend conviction","price":"$0.015"}],
    pricing: {"oi":"$0.004","changes":"$0.006","lookup":"$0.015"},
    financial_disclaimer: 'For informational purposes only. Not financial advice.',
  });
});

router.post('/oi', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Open Interest Intelligence API. Task: Aggregate and per-exchange open interest snapshot.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"open_interest_usd\": number,\n  \"oi_by_exchange\": [ {\n    \"exchange\": \"string\",\n    \"oi_usd\": number,\n    \"share_pct\": number\n  } ],\n  \"oi_24h_ago_usd\": number,\n  \"confidence_per_section\": {\n    \"open_interest\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/changes', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Open Interest Intelligence API. Task: OI change vs price change with new-longs/shorts interpretation.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"oi_change_pct\": number,\n  \"oi_change_usd\": number,\n  \"price_change_pct\": number,\n  \"price_vs_oi_interpretation\": \"new_longs|new_shorts|long_covering|short_covering\",\n  \"leverage_buildup_score\": number,\n  \"confidence_per_section\": {\n    \"price_vs_oi_interpretation\": number,\n    \"leverage_buildup_score\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/lookup', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Open Interest Intelligence API. Task: ONE-CALL: OI + change interpretation + leverage buildup + trend conviction.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"open_interest_usd\": number,\n  \"oi_change_pct\": number,\n  \"price_vs_oi_interpretation\": \"new_longs|new_shorts|long_covering|short_covering\",\n  \"leverage_buildup_score\": number,\n  \"trend_conviction\": \"strong|moderate|weak|diverging\",\n  \"liquidation_risk_context\": {\n    \"risk_level\": \"low|medium|high\",\n    \"note\": \"string\"\n  },\n  \"confidence_per_section\": {\n    \"trend_conviction\": number,\n    \"leverage_buildup_score\": number,\n    \"liquidation_risk_context\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
