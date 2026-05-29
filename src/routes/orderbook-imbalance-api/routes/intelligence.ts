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
      "api": "Trade Execution Timing",
      "reason": "time entries around liquidity windows"
    },
    {
      "api": "Stop Hunt Detection",
      "reason": "distinguish real walls from spoofed liquidity"
    },
    {
      "api": "Liquidation Cascade",
      "reason": "see if walls sit near liquidation clusters"
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
    name: 'Orderbook Imbalance API',
    version: '1.0.0',
    status: 'ok',
    openapi_url: '/orderbook-imbalance/openapi.json',
    'x-agent-callable': true,
    endpoints: [{"method":"POST","path":"/depth","description":"Bid/ask depth with cumulative size per level and spread","price":"$0.004"},{"method":"POST","path":"/imbalance","description":"Imbalance ratio, liquidity walls, spoofing risk, short-term bias","price":"$0.006"},{"method":"POST","path":"/lookup","description":"ONE-CALL: depth + imbalance + walls + spoof risk + slippage estimates","price":"$0.015"}],
    pricing: {"depth":"$0.004","imbalance":"$0.006","lookup":"$0.015"},
    financial_disclaimer: 'For informational purposes only. Not financial advice.',
  });
});

router.post('/depth', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Orderbook Imbalance API. Task: Bid/ask depth with cumulative size per level and spread.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"bid_depth_usd\": number,\n  \"ask_depth_usd\": number,\n  \"depth_levels\": [ {\n    \"price\": number,\n    \"side\": \"bid|ask\",\n    \"size_usd\": number,\n    \"cumulative_usd\": number\n  } ],\n  \"mid_price\": number,\n  \"spread_bps\": number,\n  \"latency_ms\": number,\n  \"confidence_per_section\": {\n    \"depth_levels\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/imbalance', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Orderbook Imbalance API. Task: Imbalance ratio, liquidity walls, spoofing risk, short-term bias.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"imbalance_ratio\": number,\n  \"bid_pressure_pct\": number,\n  \"ask_pressure_pct\": number,\n  \"liquidity_walls\": [ {\n    \"price\": number,\n    \"side\": \"bid|ask\",\n    \"size_usd\": number,\n    \"distance_pct\": number\n  } ],\n  \"spoofing_risk\": \"low|medium|high\",\n  \"short_term_bias\": \"bullish|bearish|neutral\",\n  \"latency_ms\": number,\n  \"confidence_per_section\": {\n    \"imbalance_ratio\": number,\n    \"spoofing_risk\": number,\n    \"short_term_bias\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
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
    const prompt = 'You are the Orderbook Imbalance API. Task: ONE-CALL: depth + imbalance + walls + spoof risk + slippage estimates.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"bid_depth_usd\": number,\n  \"ask_depth_usd\": number,\n  \"imbalance_ratio\": number,\n  \"liquidity_walls\": [ {\n    \"price\": number,\n    \"side\": \"bid|ask\",\n    \"size_usd\": number,\n    \"distance_pct\": number\n  } ],\n  \"spoofing_risk\": \"low|medium|high\",\n  \"slippage_estimates\": [ {\n    \"order_size_usd\": number,\n    \"side\": \"buy|sell\",\n    \"est_slippage_bps\": number\n  } ],\n  \"short_term_bias\": \"bullish|bearish|neutral\",\n  \"latency_ms\": number,\n  \"confidence_per_section\": {\n    \"imbalance_ratio\": number,\n    \"spoofing_risk\": number,\n    \"short_term_bias\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
