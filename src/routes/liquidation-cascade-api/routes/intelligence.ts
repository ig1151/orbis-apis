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
      "api": "Funding Rate Divergence",
      "reason": "confirm crowded positioning that fuels cascades"
    },
    {
      "api": "Open Interest Intelligence",
      "reason": "gauge leverage buildup behind clusters"
    },
    {
      "api": "AI Risk Manager",
      "reason": "score downside before acting on cascade risk"
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
    name: 'Liquidation Cascade API',
    version: '1.0.0',
    status: 'ok',
    openapi_url: '/liquidation-cascade/openapi.json',
    'x-agent-callable': true,
    endpoints: [{"method":"POST","path":"/clusters","description":"Liquidation cluster map across price levels and leverage bands","price":"$0.006"},{"method":"POST","path":"/heatmap","description":"Liquidation heatmap with long/short intensity per price level","price":"$0.008"},{"method":"POST","path":"/lookup","description":"ONE-CALL: cascade probability + long/short risk + cluster map + invalidation levels","price":"$0.018"}],
    pricing: {"clusters":"$0.006","heatmap":"$0.008","lookup":"$0.018"},
    financial_disclaimer: 'For informational purposes only. Not financial advice.',
  });
});

router.post('/clusters', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Liquidation Cascade API. Task: Liquidation cluster map across price levels and leverage bands.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"liquidation_cluster_map\": [ {\n    \"price_level\": number,\n    \"side\": \"long|short\",\n    \"notional_usd\": number,\n    \"leverage_band\": \"string\",\n    \"distance_pct\": number\n  } ],\n  \"total_clusters\": integer,\n  \"nearest_cluster_usd\": number,\n  \"confidence_per_section\": {\n    \"liquidation_cluster_map\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/heatmap', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Liquidation Cascade API. Task: Liquidation heatmap with long/short intensity per price level.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"heatmap\": [ {\n    \"price_level\": number,\n    \"long_liquidations_usd\": number,\n    \"short_liquidations_usd\": number,\n    \"intensity\": \"low|medium|high|extreme\"\n  } ],\n  \"price_range\": {\n    \"low\": number,\n    \"high\": number\n  },\n  \"peak_zone_usd\": number,\n  \"confidence_per_section\": {\n    \"heatmap\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
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
    const prompt = 'You are the Liquidation Cascade API. Task: ONE-CALL: cascade probability + long/short risk + cluster map + invalidation levels.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"cascade_probability_pct\": number,\n  \"long_liquidation_risk\": \"low|medium|high|critical\",\n  \"short_liquidation_risk\": \"low|medium|high|critical\",\n  \"liquidation_cluster_map\": [ {\n    \"price_level\": number,\n    \"side\": \"long|short\",\n    \"notional_usd\": number,\n    \"distance_pct\": number\n  } ],\n  \"price_levels\": {\n    \"current_price\": number,\n    \"nearest_long_cluster\": number,\n    \"nearest_short_cluster\": number,\n    \"cascade_trigger_long\": number,\n    \"cascade_trigger_short\": number\n  },\n  \"expected_cascade_size_usd\": number,\n  \"invalidation_levels\": [ {\n    \"level\": number,\n    \"condition\": \"string\"\n  } ],\n  \"directional_bias\": \"long_squeeze|short_squeeze|neutral\",\n  \"confidence_per_section\": {\n    \"cascade_probability\": number,\n    \"cluster_map\": number,\n    \"directional_bias\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
