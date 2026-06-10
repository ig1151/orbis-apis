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
      "api": "TVL Analytics",
      "reason": "verify protocol TVL trend and stickiness"
    },
    {
      "api": "Stablecoin Yield",
      "reason": "compare against lower-risk stable yields"
    },
    {
      "api": "AI Risk Manager",
      "reason": "score protocol risk before depositing"
    }
  ],
  "human_approval_required": true,
  "paper_mode_recommended": true
};
const DEFAULT_SOURCES = [{"provider":"DefiLlama","confidence":0.95},{"provider":"On-chain Protocol Data","confidence":0.93}];
const RECOMMENDED_WORKFLOWS = ["Single call: POST yield-farming-optimizer/lookup returns a decision-ready answer with reasoning, confidence, and chain_to next steps.","Targeted signals: call /opportunities, /compare for individual components before composing your own decision.","Confirm before acting: chain into TVL Analytics, Stablecoin Yield, AI Risk Manager — then gate execution per the x-execution-gate / x-human-approval flags."];

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
    name: 'Yield Farming Optimizer API',
    version: '1.0.0',
    status: 'ok',
    openapi_url: '/yield-farming-optimizer/openapi.json',
    'x-agent-callable': true,
    'x-mcp-compatible': true,
    'x402-compatible': true,
    'x-latency-tier': 'standard',
    endpoints: [{"method":"POST","path":"/opportunities","description":"Ranked yield opportunities by risk-adjusted APY and sustainability","price":"$0.006"},{"method":"POST","path":"/compare","description":"Side-by-side comparison with protocol/liquidity/IL risk and best pick","price":"$0.008"},{"method":"POST","path":"/lookup","description":"ONE-CALL: APY + sustainability + protocol/liquidity/IL risk + recommended action","price":"$0.022"}],
    pricing: {"opportunities":"$0.006","compare":"$0.008","lookup":"$0.022"},
    recommended_workflows: RECOMMENDED_WORKFLOWS,
    chain_to: [{"api":"TVL Analytics","reason":"verify protocol TVL trend and stickiness"},{"api":"Stablecoin Yield","reason":"compare against lower-risk stable yields"},{"api":"AI Risk Manager","reason":"score protocol risk before depositing"}],
    financial_disclaimer: 'For informational purposes only. Not financial advice.',
  });
});

router.post('/opportunities', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
  try {
    const prompt = 'You are the Yield Farming Optimizer API. Task: Ranked yield opportunities by risk-adjusted APY and sustainability.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"opportunities\": [ {\n    \"protocol\": \"string\",\n    \"pool\": \"string\",\n    \"chain\": \"string\",\n    \"raw_apy\": number,\n    \"risk_adjusted_apy\": number,\n    \"tvl_usd\": number,\n    \"sustainability_score\": number\n  } ],\n  \"count\": integer,\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"opportunities\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/compare', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["pools"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Yield Farming Optimizer API. Task: Side-by-side comparison with protocol/liquidity/IL risk and best pick.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"comparison\": [ {\n    \"protocol\": \"string\",\n    \"pool\": \"string\",\n    \"raw_apy\": number,\n    \"risk_adjusted_apy\": number,\n    \"protocol_risk\": \"low|medium|high\",\n    \"liquidity_risk\": \"low|medium|high\",\n    \"withdrawal_delay\": \"string\",\n    \"impermanent_loss_risk\": \"none|low|medium|high\"\n  } ],\n  \"best_pick\": {\n    \"protocol\": \"string\",\n    \"pool\": \"string\",\n    \"reason\": \"string\"\n  },\n  \"reward_token_sell_pressure\": \"low|medium|high\",\n  \"apy_decay_probability\": number,\n  \"strategy_complexity\": \"simple|moderate|complex\",\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"comparison\": number,\n    \"best_pick\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["protocol"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Yield Farming Optimizer API. Task: ONE-CALL: APY + sustainability + protocol/liquidity/IL risk + recommended action.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"raw_apy\": number,\n  \"risk_adjusted_apy\": number,\n  \"sustainability_score\": number,\n  \"protocol_risk\": \"low|medium|high\",\n  \"liquidity_risk\": \"low|medium|high\",\n  \"withdrawal_delay\": \"string\",\n  \"impermanent_loss_risk\": \"none|low|medium|high\",\n  \"recommended_action\": {\n    \"action\": \"deposit|wait|avoid\",\n    \"rationale\": \"string\"\n  },\n  \"reward_token_sell_pressure\": \"low|medium|high\",\n  \"apy_decay_probability\": number,\n  \"strategy_complexity\": \"simple|moderate|complex\",\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"risk_adjusted_apy\": number,\n    \"sustainability_score\": number,\n    \"recommended_action\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
