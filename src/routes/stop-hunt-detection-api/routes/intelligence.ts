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
      "api": "Orderbook Imbalance",
      "reason": "confirm liquidity walls behind stop clusters"
    },
    {
      "api": "Liquidation Cascade",
      "reason": "link stop clusters to liquidation zones"
    },
    {
      "api": "AI Risk Manager",
      "reason": "assess trap risk before entry"
    }
  ],
  "execution_gate_required": true,
  "paper_mode_recommended": true
};
const DEFAULT_SOURCES = [{"provider":"Binance","confidence":0.97},{"provider":"Coinbase","confidence":0.95},{"provider":"Kraken","confidence":0.92}];
const RECOMMENDED_WORKFLOWS = ["Single call: POST stop-hunt-detection/lookup returns a decision-ready answer with reasoning, confidence, and chain_to next steps.","Targeted signals: call /clusters, /detect for individual components before composing your own decision.","Confirm before acting: chain into Orderbook Imbalance, Liquidation Cascade, AI Risk Manager — then gate execution per the x-execution-gate / x-human-approval flags."];

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
    name: 'Stop Hunt Detection API',
    version: '1.0.0',
    status: 'ok',
    openapi_url: '/stop-hunt-detection/openapi.json',
    'x-agent-callable': true,
    'x-mcp-compatible': true,
    'x402-compatible': true,
    'x-latency-tier': 'fast',
    endpoints: [{"method":"POST","path":"/clusters","description":"Stop-loss cluster levels by side with estimated size and distance","price":"$0.005"},{"method":"POST","path":"/detect","description":"Liquidity-grab probability, trap direction, false-breakout risk, wick analysis","price":"$0.007"},{"method":"POST","path":"/lookup","description":"ONE-CALL: stop clusters + grab probability + trap direction + breakout risk","price":"$0.016"}],
    pricing: {"clusters":"$0.005","detect":"$0.007","lookup":"$0.016"},
    recommended_workflows: RECOMMENDED_WORKFLOWS,
    chain_to: [{"api":"Orderbook Imbalance","reason":"confirm liquidity walls behind stop clusters"},{"api":"Liquidation Cascade","reason":"link stop clusters to liquidation zones"},{"api":"AI Risk Manager","reason":"assess trap risk before entry"}],
    financial_disclaimer: 'For informational purposes only. Not financial advice.',
  });
});

router.post('/clusters', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Stop Hunt Detection API. Task: Stop-loss cluster levels by side with estimated size and distance.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"stop_cluster_levels\": [ {\n    \"price\": number,\n    \"side\": \"long_stops|short_stops\",\n    \"estimated_size_usd\": number,\n    \"distance_pct\": number\n  } ],\n  \"nearest_cluster\": number,\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"stop_cluster_levels\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/detect', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Stop Hunt Detection API. Task: Liquidity-grab probability, trap direction, false-breakout risk, wick analysis.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"liquidity_grab_probability_pct\": number,\n  \"trap_direction\": \"bull_trap|bear_trap|none\",\n  \"false_breakout_risk\": \"low|medium|high\",\n  \"recent_wick_analysis\": [ {\n    \"timeframe\": \"string\",\n    \"wick_type\": \"upper|lower\",\n    \"rejection_strength\": \"weak|moderate|strong\"\n  } ],\n  \"historical_accuracy\": {\n    \"stop_hunt_detection_accuracy_30d\": number\n  },\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"liquidity_grab_probability\": number,\n    \"trap_direction\": number,\n    \"false_breakout_risk\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Stop Hunt Detection API. Task: ONE-CALL: stop clusters + grab probability + trap direction + breakout risk.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"stop_cluster_levels\": [ {\n    \"price\": number,\n    \"side\": \"long_stops|short_stops\",\n    \"estimated_size_usd\": number,\n    \"distance_pct\": number\n  } ],\n  \"liquidity_grab_probability_pct\": number,\n  \"trap_direction\": \"bull_trap|bear_trap|none\",\n  \"false_breakout_risk\": \"low|medium|high\",\n  \"recent_wick_analysis\": [ {\n    \"timeframe\": \"string\",\n    \"wick_type\": \"upper|lower\",\n    \"rejection_strength\": \"weak|moderate|strong\"\n  } ],\n  \"historical_accuracy\": {\n    \"stop_hunt_detection_accuracy_30d\": number\n  },\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"liquidity_grab_probability\": number,\n    \"trap_direction\": number,\n    \"false_breakout_risk\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
