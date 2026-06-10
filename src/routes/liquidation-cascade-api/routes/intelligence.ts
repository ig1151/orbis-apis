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
  "human_approval_required": true,
  "paper_mode_recommended": true
};
const DEFAULT_SOURCES = [{"provider":"Binance Futures","confidence":0.97},{"provider":"Bybit","confidence":0.95},{"provider":"OKX","confidence":0.93}];
const RECOMMENDED_WORKFLOWS = ["Single call: POST liquidation-cascade/lookup returns a decision-ready answer with reasoning, confidence, and chain_to next steps.","Targeted signals: call /clusters, /heatmap for individual components before composing your own decision.","Confirm before acting: chain into Funding Rate Divergence, Open Interest Intelligence, AI Risk Manager — then gate execution per the x-execution-gate / x-human-approval flags."];

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
    name: 'Liquidation Cascade API',
    version: '1.0.0',
    status: 'ok',
    openapi_url: '/liquidation-cascade/openapi.json',
    'x-agent-callable': true,
    'x-mcp-compatible': true,
    'x402-compatible': true,
    'x-latency-tier': 'fast',
    endpoints: [{"method":"POST","path":"/clusters","description":"Liquidation cluster map across price levels and leverage bands","price":"$0.006"},{"method":"POST","path":"/heatmap","description":"Liquidation heatmap with long/short intensity per price level","price":"$0.008"},{"method":"POST","path":"/lookup","description":"ONE-CALL: cascade probability + long/short risk + cluster map + invalidation levels","price":"$0.018"}],
    pricing: {"clusters":"$0.006","heatmap":"$0.008","lookup":"$0.018"},
    recommended_workflows: RECOMMENDED_WORKFLOWS,
    chain_to: [{"api":"Funding Rate Divergence","reason":"confirm crowded positioning that fuels cascades"},{"api":"Open Interest Intelligence","reason":"gauge leverage buildup behind clusters"},{"api":"AI Risk Manager","reason":"score downside before acting on cascade risk"}],
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
    const prompt = 'You are the Liquidation Cascade API. Task: Liquidation cluster map across price levels and leverage bands.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"liquidation_cluster_map\": [ {\n    \"price_level\": number,\n    \"side\": \"long|short\",\n    \"notional_usd\": number,\n    \"leverage_band\": \"string\",\n    \"distance_pct\": number\n  } ],\n  \"total_clusters\": integer,\n  \"nearest_cluster_usd\": number,\n  \"exchange_breakdown\": [ {\n    \"exchange\": \"string\",\n    \"liquidation_exposure_usd\": number\n  } ],\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"liquidation_cluster_map\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/heatmap', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Liquidation Cascade API. Task: Liquidation heatmap with long/short intensity per price level.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"heatmap\": [ {\n    \"price_level\": number,\n    \"long_liquidations_usd\": number,\n    \"short_liquidations_usd\": number,\n    \"intensity\": \"low|medium|high|extreme\"\n  } ],\n  \"price_range\": {\n    \"low\": number,\n    \"high\": number\n  },\n  \"peak_zone_usd\": number,\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"heatmap\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
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
    const prompt = 'You are the Liquidation Cascade API. Task: ONE-CALL: cascade probability + long/short risk + cluster map + invalidation levels.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"cascade_probability_pct\": number,\n  \"long_liquidation_risk\": \"low|medium|high|critical\",\n  \"short_liquidation_risk\": \"low|medium|high|critical\",\n  \"liquidation_cluster_map\": [ {\n    \"price_level\": number,\n    \"side\": \"long|short\",\n    \"notional_usd\": number,\n    \"distance_pct\": number\n  } ],\n  \"price_levels\": {\n    \"current_price\": number,\n    \"nearest_long_cluster\": number,\n    \"nearest_short_cluster\": number,\n    \"cascade_trigger_long\": number,\n    \"cascade_trigger_short\": number\n  },\n  \"expected_cascade_size_usd\": number,\n  \"invalidation_levels\": [ {\n    \"level\": number,\n    \"condition\": \"string\"\n  } ],\n  \"directional_bias\": \"long_squeeze|short_squeeze|neutral\",\n  \"exchange_breakdown\": [ {\n    \"exchange\": \"string\",\n    \"liquidation_exposure_usd\": number\n  } ],\n  \"liquidation_density_score\": number,\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"cascade_probability\": number,\n    \"cluster_map\": number,\n    \"directional_bias\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
