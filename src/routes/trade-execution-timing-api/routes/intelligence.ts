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
      "reason": "confirm live depth in the chosen window"
    },
    {
      "api": "Position Sizing",
      "reason": "match order size to forecast liquidity"
    },
    {
      "api": "Stop Hunt Detection",
      "reason": "avoid executing into a liquidity grab"
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
    name: 'Trade Execution Timing API',
    version: '1.0.0',
    status: 'ok',
    openapi_url: '/trade-execution-timing/openapi.json',
    'x-agent-callable': true,
    endpoints: [{"method":"POST","path":"/window","description":"Best execution window with avoid-until and urgency score","price":"$0.005"},{"method":"POST","path":"/forecast","description":"Spread, slippage, volatility, and liquidity forecasts over the horizon","price":"$0.008"},{"method":"POST","path":"/lookup","description":"ONE-CALL: best window + spread/slippage/volatility forecast + urgency","price":"$0.018"}],
    pricing: {"window":"$0.005","forecast":"$0.008","lookup":"$0.018"},
    financial_disclaimer: 'For informational purposes only. Not financial advice.',
  });
});

router.post('/window', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Trade Execution Timing API. Task: Best execution window with avoid-until and urgency score.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"best_execution_window\": {\n    \"start\": \"string\",\n    \"end\": \"string\",\n    \"score\": number\n  },\n  \"avoid_until\": \"string\",\n  \"urgency_score\": number,\n  \"latency_ms\": number,\n  \"confidence_per_section\": {\n    \"best_execution_window\": number,\n    \"urgency_score\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/forecast', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Trade Execution Timing API. Task: Spread, slippage, volatility, and liquidity forecasts over the horizon.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"spread_forecast\": [ {\n    \"time\": \"string\",\n    \"spread_bps\": number\n  } ],\n  \"slippage_forecast\": [ {\n    \"order_size_usd\": number,\n    \"est_slippage_bps\": number\n  } ],\n  \"volatility_forecast\": [ {\n    \"time\": \"string\",\n    \"expected_vol_pct\": number\n  } ],\n  \"liquidity_window\": {\n    \"best_time\": \"string\",\n    \"depth_usd\": number\n  },\n  \"latency_ms\": number,\n  \"confidence_per_section\": {\n    \"spread_forecast\": number,\n    \"slippage_forecast\": number,\n    \"volatility_forecast\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
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
    const prompt = 'You are the Trade Execution Timing API. Task: ONE-CALL: best window + spread/slippage/volatility forecast + urgency.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"best_execution_window\": {\n    \"start\": \"string\",\n    \"end\": \"string\",\n    \"score\": number\n  },\n  \"spread_forecast\": [ {\n    \"time\": \"string\",\n    \"spread_bps\": number\n  } ],\n  \"slippage_forecast\": [ {\n    \"order_size_usd\": number,\n    \"est_slippage_bps\": number\n  } ],\n  \"volatility_forecast\": [ {\n    \"time\": \"string\",\n    \"expected_vol_pct\": number\n  } ],\n  \"liquidity_window\": {\n    \"best_time\": \"string\",\n    \"depth_usd\": number\n  },\n  \"avoid_until\": \"string\",\n  \"urgency_score\": number,\n  \"latency_ms\": number,\n  \"confidence_per_section\": {\n    \"best_execution_window\": number,\n    \"urgency_score\": number,\n    \"liquidity_window\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
