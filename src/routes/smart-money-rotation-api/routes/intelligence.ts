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
      "api": "Smart Money Flow",
      "reason": "drill into wallet-level flows driving rotation"
    },
    {
      "api": "Smart Wallet Discovery",
      "reason": "identify the wallets leading the rotation"
    },
    {
      "api": "Market Dominance",
      "reason": "frame rotation against BTC/ETH dominance"
    }
  ],
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
    name: 'Smart Money Rotation API',
    version: '1.0.0',
    status: 'ok',
    openapi_url: '/smart-money-rotation/openapi.json',
    'x-agent-callable': true,
    endpoints: [{"method":"POST","path":"/sectors","description":"Inflow/outflow by sector with net rotation","price":"$0.006"},{"method":"POST","path":"/narratives","description":"Narrative rotation score, momentum per narrative, and rotation stage","price":"$0.008"},{"method":"POST","path":"/lookup","description":"ONE-CALL: sector flows + narrative rotation + top accumulated tokens + stage","price":"$0.018"}],
    pricing: {"sectors":"$0.006","narratives":"$0.008","lookup":"$0.018"},
    financial_disclaimer: 'For informational purposes only. Not financial advice.',
  });
});

router.post('/sectors', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
  try {
    const prompt = 'You are the Smart Money Rotation API. Task: Inflow/outflow by sector with net rotation.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"inflow_by_sector\": [ {\n    \"sector\": \"string\",\n    \"inflow_usd\": number,\n    \"change_pct\": number\n  } ],\n  \"outflow_by_sector\": [ {\n    \"sector\": \"string\",\n    \"outflow_usd\": number,\n    \"change_pct\": number\n  } ],\n  \"net_rotation\": [ {\n    \"sector\": \"string\",\n    \"net_flow_usd\": number\n  } ],\n  \"confidence_per_section\": {\n    \"inflow_by_sector\": number,\n    \"net_rotation\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/narratives', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
  try {
    const prompt = 'You are the Smart Money Rotation API. Task: Narrative rotation score, momentum per narrative, and rotation stage.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"narrative_rotation_score\": number,\n  \"narratives\": [ {\n    \"narrative\": \"string\",\n    \"momentum\": \"rising|peaking|fading\",\n    \"inflow_usd\": number,\n    \"smart_wallet_count\": integer\n  } ],\n  \"rotation_stage\": \"early|mid|late|exhausted\",\n  \"confidence_per_section\": {\n    \"narrative_rotation_score\": number,\n    \"rotation_stage\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/lookup', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
  try {
    const prompt = 'You are the Smart Money Rotation API. Task: ONE-CALL: sector flows + narrative rotation + top accumulated tokens + stage.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"inflow_by_sector\": [ {\n    \"sector\": \"string\",\n    \"inflow_usd\": number,\n    \"change_pct\": number\n  } ],\n  \"outflow_by_sector\": [ {\n    \"sector\": \"string\",\n    \"outflow_usd\": number,\n    \"change_pct\": number\n  } ],\n  \"narrative_rotation_score\": number,\n  \"top_accumulated_tokens\": [ {\n    \"symbol\": \"string\",\n    \"net_accumulation_usd\": number,\n    \"smart_wallet_count\": integer\n  } ],\n  \"smart_wallet_participation\": number,\n  \"rotation_stage\": \"early|mid|late|exhausted\",\n  \"confidence_per_section\": {\n    \"narrative_rotation_score\": number,\n    \"rotation_stage\": number,\n    \"smart_wallet_participation\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
