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
      "reason": "map where squeezed positions get liquidated"
    },
    {
      "api": "Open Interest Intelligence",
      "reason": "validate divergence with OI direction"
    },
    {
      "api": "AI Trade Confidence",
      "reason": "grade the squeeze setup before entry"
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
    name: 'Funding Rate Divergence API',
    version: '1.0.0',
    status: 'ok',
    openapi_url: '/funding-rate-divergence/openapi.json',
    'x-agent-callable': true,
    endpoints: [{"method":"POST","path":"/rates","description":"Funding rates by exchange with annualized rate and next funding window","price":"$0.004"},{"method":"POST","path":"/divergence","description":"Spot/perp basis divergence with historical percentile and crowding score","price":"$0.007"},{"method":"POST","path":"/lookup","description":"ONE-CALL: funding by exchange + divergence + crowding + squeeze probability","price":"$0.015"}],
    pricing: {"rates":"$0.004","divergence":"$0.007","lookup":"$0.015"},
    financial_disclaimer: 'For informational purposes only. Not financial advice.',
  });
});

router.post('/rates', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Funding Rate Divergence API. Task: Funding rates by exchange with annualized rate and next funding window.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"funding_by_exchange\": [ {\n    \"exchange\": \"string\",\n    \"funding_rate_pct\": number,\n    \"next_funding_in_min\": integer,\n    \"annualized_pct\": number\n  } ],\n  \"aggregate_funding_pct\": number,\n  \"regime\": \"positive|negative|neutral\",\n  \"confidence_per_section\": {\n    \"funding_by_exchange\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/divergence', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Funding Rate Divergence API. Task: Spot/perp basis divergence with historical percentile and crowding score.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"spot_perp_basis\": number,\n  \"basis_pct\": number,\n  \"historical_percentile\": number,\n  \"divergence_signal\": \"converging|diverging|extreme\",\n  \"crowding_score\": number,\n  \"long_short_bias\": \"long_crowded|short_crowded|balanced\",\n  \"confidence_per_section\": {\n    \"divergence_signal\": number,\n    \"crowding_score\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
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
    const prompt = 'You are the Funding Rate Divergence API. Task: ONE-CALL: funding by exchange + divergence + crowding + squeeze probability.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"funding_by_exchange\": [ {\n    \"exchange\": \"string\",\n    \"funding_rate_pct\": number,\n    \"annualized_pct\": number\n  } ],\n  \"historical_percentile\": number,\n  \"spot_perp_basis\": number,\n  \"crowding_score\": number,\n  \"squeeze_probability_pct\": number,\n  \"long_short_bias\": \"long_crowded|short_crowded|balanced\",\n  \"squeeze_direction\": \"long_squeeze|short_squeeze|none\",\n  \"confidence_per_section\": {\n    \"squeeze_probability\": number,\n    \"crowding_score\": number,\n    \"long_short_bias\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
