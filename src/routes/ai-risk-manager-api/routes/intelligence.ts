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
      "api": "Position Sizing",
      "reason": "translate risk score into a sized order"
    },
    {
      "api": "AI Portfolio Hedging",
      "reason": "hedge concentrated exposure flagged here"
    },
    {
      "api": "Liquidation Cascade",
      "reason": "stress-test against cascade scenarios"
    }
  ],
  "execution_gate_required": true,
  "human_approval_required": true,
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
    name: 'AI Risk Manager API',
    version: '1.0.0',
    status: 'ok',
    openapi_url: '/ai-risk-manager/openapi.json',
    'x-agent-callable': true,
    endpoints: [{"method":"POST","path":"/trade","description":"Pre-trade risk score with max loss, volatility, and position adjustment","price":"$0.006"},{"method":"POST","path":"/portfolio","description":"Portfolio health score with exposure breakdown and rebalancing actions","price":"$0.010"},{"method":"POST","path":"/lookup","description":"ONE-CALL: trade + portfolio risk with full exposure and adjustment plan","price":"$0.020"}],
    pricing: {"trade":"$0.006","portfolio":"$0.010","lookup":"$0.020"},
    financial_disclaimer: 'For informational purposes only. Not financial advice.',
  });
});

router.post('/trade', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["symbol","side","size_usd"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the AI Risk Manager API. Task: Pre-trade risk score with max loss, volatility, and position adjustment.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"risk_score\": number,\n  \"max_loss_estimate\": {\n    \"usd\": number,\n    \"pct\": number\n  },\n  \"volatility_context\": {\n    \"atr_pct\": number,\n    \"regime\": \"low|normal|elevated|extreme\"\n  },\n  \"correlation_risk\": \"low|medium|high\",\n  \"recommended_position_adjustment\": {\n    \"action\": \"reduce|hold|increase|close\",\n    \"suggested_size_pct\": number,\n    \"rationale\": \"string\"\n  },\n  \"confidence_per_section\": {\n    \"risk_score\": number,\n    \"volatility_context\": number,\n    \"recommended_position_adjustment\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/portfolio', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
    for (const f of ["positions"]) {
      if (req.body[f] === undefined || req.body[f] === null) return res.status(400).json({ error: 'bad_request', message: 'Missing required field: ' + f, trace_id: traceId() });
    }
  try {
    const prompt = 'You are the AI Risk Manager API. Task: Portfolio health score with exposure breakdown and rebalancing actions.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"portfolio_health_score\": number,\n  \"exposure_breakdown\": [ {\n    \"asset\": \"string\",\n    \"weight_pct\": number,\n    \"risk_contribution_pct\": number\n  } ],\n  \"correlation_risk\": \"low|medium|high\",\n  \"max_loss_estimate\": {\n    \"usd\": number,\n    \"pct\": number\n  },\n  \"recommended_position_adjustment\": [ {\n    \"asset\": \"string\",\n    \"action\": \"reduce|hold|increase|close\",\n    \"target_weight_pct\": number\n  } ],\n  \"confidence_per_section\": {\n    \"portfolio_health_score\": number,\n    \"exposure_breakdown\": number,\n    \"recommended_position_adjustment\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ]\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

router.post('/lookup', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad_request', message: 'JSON body required', trace_id: traceId() });
  try {
    const prompt = 'You are the AI Risk Manager API. Task: ONE-CALL: trade + portfolio risk with full exposure and adjustment plan.\n'
      + 'Inputs: ' + JSON.stringify(req.body) + '\n'
      + 'As of ' + new Date().toISOString() + ', return ONLY valid JSON (no prose, no markdown) matching this exact shape, filling realistic, decision-oriented values:\n'
      + "{\n  \"risk_score\": number,\n  \"portfolio_health_score\": number,\n  \"max_loss_estimate\": {\n    \"usd\": number,\n    \"pct\": number\n  },\n  \"volatility_context\": {\n    \"atr_pct\": number,\n    \"regime\": \"low|normal|elevated|extreme\"\n  },\n  \"correlation_risk\": \"low|medium|high\",\n  \"exposure_breakdown\": [ {\n    \"asset\": \"string\",\n    \"weight_pct\": number,\n    \"risk_contribution_pct\": number\n  } ],\n  \"recommended_position_adjustment\": [ {\n    \"asset\": \"string\",\n    \"action\": \"reduce|hold|increase|close\",\n    \"target_weight_pct\": number\n  } ],\n  \"confidence_per_section\": {\n    \"risk_score\": number,\n    \"portfolio_health_score\": number,\n    \"recommended_position_adjustment\": number\n  },\n  \"recommended_actions_priority_order\": [ \"string\" ],\n  \"reasoning\": {\n    \"why_signal_generated\": \"string\",\n    \"key_factors\": [ \"string\" ],\n    \"invalidators\": [ \"string\" ]\n  }\n}";
    const raw = await callClaude(prompt);
    res.json(finalize(parseJSON(raw)));
  } catch (e: any) {
    res.status(500).json({ error: 'internal_error', message: e.message, trace_id: traceId() });
  }
});

export default router;
