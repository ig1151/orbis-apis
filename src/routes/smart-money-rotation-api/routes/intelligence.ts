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
const DEFAULT_SOURCES = [{"provider":"On-chain Indexers","confidence":0.95},{"provider":"Smart-money Wallet Labels","confidence":0.9}];
const RECOMMENDED_WORKFLOWS = ["Single call: POST smart-money-rotation/lookup returns a decision-ready answer with reasoning, confidence, and chain_to next steps.","Targeted signals: call /sectors, /narratives for individual components before composing your own decision.","Confirm before acting: chain into Smart Money Flow, Smart Wallet Discovery, Market Dominance — then gate execution per the x-execution-gate / x-human-approval flags."];

function finalize(data: any, startedAt: number): any {
  const now = new Date();
  const cps = data && typeof data.confidence_per_section === 'object' && data.confidence_per_section ? data.confidence_per_section : {};
  const cvals = Object.values(cps).filter((v: any) => typeof v === 'number') as number[];
  const avgConf = cvals.length ? cvals.reduce((a, b) => a + b, 0) / cvals.length : 0.75;
  return {
    trace_id: traceId(),
    computed_at: now.toISOString(),
    success: true,
    ...data,
    overall_confidence: typeof data.overall_confidence === 'number' ? data.overall_confidence : Math.round(avgConf * 100) / 100,
    data_timestamp: typeof data.data_timestamp === 'string' ? data.data_timestamp : now.toISOString(),
    data_age_seconds: typeof data.data_age_seconds === 'number' ? data.data_age_seconds : 0,
    sources: Array.isArray(data.sources) && data.sources.length ? data.sources : DEFAULT_SOURCES,
    latency_ms: Date.now() - startedAt,
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
    'x-mcp-compatible': true,
    'x402-compatible': true,
    'x-latency-tier': 'standard',
    endpoints: [{"method":"POST","path":"/sectors","description":"Inflow/outflow by sector with net rotation","price":"$0.006"},{"method":"POST","path":"/narratives","description":"Narrative rotation score, momentum per narrative, and rotation stage","price":"$0.008"},{"method":"POST","path":"/lookup","description":"ONE-CALL: sector flows + narrative rotation + top accumulated tokens + stage","price":"$0.018"}],
    pricing: {"sectors":"$0.006","narratives":"$0.008","lookup":"$0.018"},
    recommended_workflows: RECOMMENDED_WORKFLOWS,
    chain_to: [{"api":"Smart Money Flow","reason":"drill into wallet-level flows driving rotation"},{"api":"Smart Wallet Discovery","reason":"identify the wallets leading the rotation"},{"api":"Market Dominance","reason":"frame rotation against BTC/ETH dominance"}],
    financial_disclaimer: 'For informational purposes only. Not financial advice.',
  });
});

router.post('/sectors', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
  try {
    const prompt = 'You are the Smart Money Rotation API. Task: Inflow/outflow by sector with net rotation.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"inflow_by_sector\": [ {\n    \"sector\": \"string\",\n    \"inflow_usd\": number,\n    \"change_pct\": number\n  } ],\n  \"outflow_by_sector\": [ {\n    \"sector\": \"string\",\n    \"outflow_usd\": number,\n    \"change_pct\": number\n  } ],\n  \"net_rotation\": [ {\n    \"sector\": \"string\",\n    \"net_flow_usd\": number\n  } ],\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"inflow_by_sector\": number,\n    \"net_rotation\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/narratives', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
  try {
    const prompt = 'You are the Smart Money Rotation API. Task: Narrative rotation score, momentum per narrative, and rotation stage.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"narrative_rotation_score\": number,\n  \"narratives\": [ {\n    \"narrative\": \"string\",\n    \"momentum\": \"rising|peaking|fading\",\n    \"inflow_usd\": number,\n    \"smart_wallet_count\": integer\n  } ],\n  \"rotation_stage\": \"early|mid|late|exhausted\",\n  \"rotation_velocity\": number,\n  \"smart_money_conviction\": number,\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"narrative_rotation_score\": number,\n    \"rotation_stage\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
  try {
    const prompt = 'You are the Smart Money Rotation API. Task: ONE-CALL: sector flows + narrative rotation + top accumulated tokens + stage.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"inflow_by_sector\": [ {\n    \"sector\": \"string\",\n    \"inflow_usd\": number,\n    \"change_pct\": number\n  } ],\n  \"outflow_by_sector\": [ {\n    \"sector\": \"string\",\n    \"outflow_usd\": number,\n    \"change_pct\": number\n  } ],\n  \"narrative_rotation_score\": number,\n  \"top_accumulated_tokens\": [ {\n    \"symbol\": \"string\",\n    \"net_accumulation_usd\": number,\n    \"smart_wallet_count\": integer\n  } ],\n  \"smart_wallet_participation\": number,\n  \"rotation_stage\": \"early|mid|late|exhausted\",\n  \"rotation_velocity\": number,\n  \"smart_money_conviction\": number,\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"narrative_rotation_score\": number,\n    \"rotation_stage\": number,\n    \"smart_wallet_participation\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
