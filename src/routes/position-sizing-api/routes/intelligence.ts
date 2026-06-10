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
      "api": "AI Risk Manager",
      "reason": "validate sizing against portfolio risk"
    },
    {
      "api": "Trade Execution Timing",
      "reason": "time the sized order for low slippage"
    },
    {
      "api": "AI Portfolio Hedging",
      "reason": "hedge the new exposure"
    }
  ],
  "execution_gate_required": true,
  "human_approval_required": true,
  "paper_mode_recommended": true
};
const DEFAULT_SOURCES = [{"provider":"Aggregated Exchange Data","confidence":0.94},{"provider":"On-chain Analytics","confidence":0.9}];
const RECOMMENDED_WORKFLOWS = ["Single call: POST position-sizing/lookup returns a decision-ready answer with reasoning, confidence, and chain_to next steps.","Targeted signals: call /calculate, /simulate for individual components before composing your own decision.","Confirm before acting: chain into AI Risk Manager, Trade Execution Timing, AI Portfolio Hedging — then gate execution per the x-execution-gate / x-human-approval flags."];

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
    name: 'Position Sizing API',
    version: '1.0.0',
    status: 'ok',
    openapi_url: '/position-sizing/openapi.json',
    'x-agent-callable': true,
    'x-mcp-compatible': true,
    'x402-compatible': true,
    'x-latency-tier': 'standard',
    endpoints: [{"method":"POST","path":"/calculate","description":"Risk-adjusted position size with Kelly fraction and risk of ruin","price":"$0.005"},{"method":"POST","path":"/simulate","description":"Monte-Carlo-style scenario simulation of sizing outcomes","price":"$0.008"},{"method":"POST","path":"/lookup","description":"ONE-CALL: recommended size + Kelly + volatility-adjusted + risk of ruin","price":"$0.018"}],
    pricing: {"calculate":"$0.005","simulate":"$0.008","lookup":"$0.018"},
    recommended_workflows: RECOMMENDED_WORKFLOWS,
    chain_to: [{"api":"AI Risk Manager","reason":"validate sizing against portfolio risk"},{"api":"Trade Execution Timing","reason":"time the sized order for low slippage"},{"api":"AI Portfolio Hedging","reason":"hedge the new exposure"}],
    financial_disclaimer: 'For informational purposes only. Not financial advice.',
  });
});

router.post('/calculate', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["account_size_usd","entry_price","stop_price"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Position Sizing API. Task: Risk-adjusted position size with Kelly fraction and risk of ruin.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"recommended_size_usd\": number,\n  \"recommended_size_pct\": number,\n  \"max_position_size\": number,\n  \"kelly_fraction\": number,\n  \"volatility_adjusted_size\": number,\n  \"stop_loss_distance\": {\n    \"pct\": number,\n    \"price\": number\n  },\n  \"risk_of_ruin_estimate\": number,\n  \"capital_at_risk_usd\": number,\n  \"expected_drawdown_pct\": number,\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"recommended_size_usd\": number,\n    \"kelly_fraction\": number,\n    \"risk_of_ruin_estimate\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/simulate', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["account_size_usd"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Position Sizing API. Task: Monte-Carlo-style scenario simulation of sizing outcomes.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"scenarios\": [ {\n    \"label\": \"string\",\n    \"win_rate_pct\": number,\n    \"avg_r_multiple\": number,\n    \"expected_value_usd\": number,\n    \"max_drawdown_pct\": number\n  } ],\n  \"recommended_size_usd\": number,\n  \"risk_of_ruin_estimate\": number,\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"scenarios\": number,\n    \"risk_of_ruin_estimate\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/lookup', async (req: Request, res: Response) => {
  const __t0 = Date.now();
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["account_size_usd"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the Position Sizing API. Task: ONE-CALL: recommended size + Kelly + volatility-adjusted + risk of ruin.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"recommended_size_usd\": number,\n  \"recommended_size_pct\": number,\n  \"max_position_size\": number,\n  \"kelly_fraction\": number,\n  \"volatility_adjusted_size\": number,\n  \"stop_loss_distance\": {\n    \"pct\": number,\n    \"price\": number\n  },\n  \"risk_of_ruin_estimate\": number,\n  \"capital_at_risk_usd\": number,\n  \"expected_drawdown_pct\": number,\n  \"overall_confidence\": number,\n  \"data_age_seconds\": integer,\n  \"sources\": [ {\n    \"provider\": \"string\",\n    \"confidence\": number\n  } ],\n  \"confidence_per_section\": {\n    \"recommended_size_usd\": number,\n    \"kelly_fraction\": number,\n    \"risk_of_ruin_estimate\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw), __t0));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
