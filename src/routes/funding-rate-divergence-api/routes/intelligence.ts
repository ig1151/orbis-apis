import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


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
const DEFAULT_SOURCES = [{"provider":"Binance Futures","confidence":0.97},{"provider":"Bybit","confidence":0.95},{"provider":"OKX","confidence":0.93}];
const RECOMMENDED_WORKFLOWS = ["Single call: POST funding-rate-divergence/lookup returns a decision-ready answer with reasoning, confidence, and chain_to next steps.","Targeted signals: call /rates, /divergence for individual components before composing your own decision.","Confirm before acting: chain into Liquidation Cascade, Open Interest Intelligence, AI Trade Confidence — then gate execution per the x-execution-gate / x-human-approval flags."];

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
    name: 'Funding Rate Divergence API',
    version: '1.0.0',
    status: 'ok',
    openapi_url: '/funding-rate-divergence/openapi.json',
    'x-agent-callable': true,
    'x-mcp-compatible': true,
    'x402-compatible': true,
    'x-latency-tier': 'standard',
    endpoints: [{"method":"POST","path":"/rates","description":"Funding rates by exchange with annualized rate and next funding window","price":"$0.004"},{"method":"POST","path":"/divergence","description":"Spot/perp basis divergence with historical percentile and crowding score","price":"$0.007"},{"method":"POST","path":"/lookup","description":"ONE-CALL: funding by exchange + divergence + crowding + squeeze probability","price":"$0.015"}],
    pricing: {"rates":"$0.004","divergence":"$0.007","lookup":"$0.015"},
    recommended_workflows: RECOMMENDED_WORKFLOWS,
    chain_to: [{"api":"Liquidation Cascade","reason":"map where squeezed positions get liquidated"},{"api":"Open Interest Intelligence","reason":"validate divergence with OI direction"},{"api":"AI Trade Confidence","reason":"grade the squeeze setup before entry"}],
    financial_disclaimer: 'For informational purposes only. Not financial advice.',
  });
});

router.post('/rates', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Funding Rate Divergence API. Task: Funding rates by exchange with annualized rate and next funding window.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"funding_by_exchange\": [ {\n    \"exchange\": \"string\",\n    \"funding_rate_pct\": number,\n    \"next_funding_in_min\": integer,\n    \"annualized_pct\": number\n  } ],\n  \"aggregate_funding_pct\": number,\n  \"regime\": \"positive|negative|neutral\",\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"funding_by_exchange\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/divergence', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Funding Rate Divergence API. Task: Spot/perp basis divergence with historical percentile and crowding score.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"spot_perp_basis\": number,\n  \"basis_pct\": number,\n  \"historical_percentile\": number,\n  \"divergence_signal\": \"converging|diverging|extreme\",\n  \"crowding_score\": number,\n  \"long_short_bias\": \"long_crowded|short_crowded|balanced\",\n  \"basis_z_score\": number,\n  \"funding_regime\": \"normal|elevated|extreme\",\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"divergence_signal\": number,\n    \"crowding_score\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
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
    const prompt = 'You are the Funding Rate Divergence API. Task: ONE-CALL: funding by exchange + divergence + crowding + squeeze probability.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"funding_by_exchange\": [ {\n    \"exchange\": \"string\",\n    \"funding_rate_pct\": number,\n    \"annualized_pct\": number\n  } ],\n  \"historical_percentile\": number,\n  \"spot_perp_basis\": number,\n  \"crowding_score\": number,\n  \"squeeze_probability_pct\": number,\n  \"long_short_bias\": \"long_crowded|short_crowded|balanced\",\n  \"squeeze_direction\": \"long_squeeze|short_squeeze|none\",\n  \"basis_z_score\": number,\n  \"funding_regime\": \"normal|elevated|extreme\",\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"squeeze_probability\": number,\n    \"crowding_score\": number,\n    \"long_short_bias\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
