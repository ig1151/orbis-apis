import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../store';
import { logger } from '../logger';
import { AutopilotSession } from '../types';
import { getNextRun } from '../scheduler';

const router = Router();

const portfolioAssetSchema = Joi.object({
  asset: Joi.string().uppercase().min(2).max(10).required(),
  value: Joi.number().positive().required(),
  weight: Joi.number().min(0).max(1).required(),
});

const createSchema = Joi.object({
  portfolio: Joi.array().items(portfolioAssetSchema).min(1).max(20).required(),
  strategy: Joi.string().valid('news_momentum', 'trend_following', 'risk_adjusted').required(),
  risk_tolerance: Joi.string().valid('low', 'medium', 'high').default('medium'),
  assets: Joi.array().items(Joi.string().uppercase()).max(10).optional(),
  webhook_url: Joi.string().uri().optional(),
  alert_on_hold: Joi.boolean().default(false),
});

const updateSchema = Joi.object({
  portfolio: Joi.array().items(portfolioAssetSchema).min(1).max(20).optional(),
  strategy: Joi.string().valid('news_momentum', 'trend_following', 'risk_adjusted').optional(),
  risk_tolerance: Joi.string().valid('low', 'medium', 'high').optional(),
  assets: Joi.array().items(Joi.string().uppercase()).max(10).optional(),
  webhook_url: Joi.string().uri().optional(),
  alert_on_hold: Joi.boolean().optional(),
});

// POST /v1/autopilot — create session
router.post('/', async (req: Request, res: Response) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) {
    res.status(400).json({ error: 'Validation failed', details: error.details[0].message });
    return;
  }

  const session: AutopilotSession = {
    id: uuidv4(),
    portfolio: value.portfolio,
    strategy: value.strategy,
    risk_tolerance: value.risk_tolerance,
    assets: value.assets,
    webhook_url: value.webhook_url,
    alert_on_hold: value.alert_on_hold,
    status: 'active',
    created_at: new Date().toISOString(),
    next_run: getNextRun(),
    run_count: 0,
  };

  store.create(session);
  logger.info({ id: session.id, strategy: session.strategy }, 'Autopilot session created');

  res.status(201).json({
    id: session.id,
    status: session.status,
    strategy: session.strategy,
    risk_tolerance: session.risk_tolerance,
    webhook_enabled: !!session.webhook_url,
    alert_on_hold: session.alert_on_hold,
    created_at: session.created_at,
    next_run: session.next_run,
    message: 'Autopilot session active — runs every 5 minutes',
  });
});

// GET /v1/autopilot/:id — get session
router.get('/:id', (req: Request, res: Response) => {
  const session = store.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
});

// GET /v1/autopilot/:id/history — get decision history
router.get('/:id/history', (req: Request, res: Response) => {
  const session = store.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const records = store.getHistory(req.params.id, limit);
  res.json({ id: req.params.id, count: records.length, history: records });
});

// PATCH /v1/autopilot/:id — pause or resume
router.patch('/:id', (req: Request, res: Response) => {
  const session = store.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const { status } = req.body;
  if (!['active', 'paused'].includes(status)) {
    res.status(400).json({ error: 'status must be active or paused' });
    return;
  }
  const next_run = status === 'active' ? getNextRun() : undefined;
  store.update(req.params.id, { status, next_run });
  logger.info({ id: req.params.id, status }, 'Autopilot session updated');
  res.json({ id: req.params.id, status, next_run });
});

// POST /v1/autopilot/:id/update — update session config
router.post('/:id/update', (req: Request, res: Response) => {
  const session = store.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    res.status(400).json({ error: 'Validation failed', details: error.details[0].message });
    return;
  }
  store.update(req.params.id, value);
  logger.info({ id: req.params.id }, 'Autopilot session config updated');
  const updated = store.get(req.params.id);
  res.json({ id: req.params.id, message: 'Session updated', session: updated });
});

// DELETE /v1/autopilot/:id — stop session
router.delete('/:id', (req: Request, res: Response) => {
  const session = store.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  store.delete(req.params.id);
  logger.info({ id: req.params.id }, 'Autopilot session stopped');
  res.json({ id: req.params.id, status: 'stopped', message: 'Session deleted' });
});


// ── Agent Decision Engine Endpoints (v2) ──────────────────────────────────
import axios from 'axios';

// ── Universal Runtime Envelope ────────────────────────────────────────────────
function buildRuntime(req: any, overrides: Record<string, any> = {}) {
  const now          = Date.now();
  const trace_id     = req.headers?.['x-trace-id']     || `trace_${now}_${Math.random().toString(36).slice(2,8)}`;
  const execution_id = req.headers?.['x-execution-id'] || `exec_${now}_${Math.random().toString(36).slice(2,8)}`;
  const session_id   = req.body?.session_id || req.query?.session_id || req.headers?.['x-session-id'] || `session_${now}`;
  const request_id   = `req_${now}_${Math.random().toString(36).slice(2,8)}`;
  const unit         = 0.015;
  return {
    trace_id, execution_id, session_id, request_id,
    workflow_state:    overrides.workflow_state    || 'complete',
    retryable:         overrides.retryable         ?? false,
    latency_breakdown: overrides.latency_breakdown || { total_ms: 0, inference_ms: 0, io_ms: 0, overhead_ms: 0 },
    cost_breakdown:    overrides.cost_breakdown    || {
      total_usd:     unit,
      inference_usd: Math.round(unit * 0.70 * 1e6) / 1e6,
      io_usd:        Math.round(unit * 0.15 * 1e6) / 1e6,
      overhead_usd:  Math.round(unit * 0.15 * 1e6) / 1e6,
    },
    provenance: overrides.provenance || {
      api_version: '1.0.0', model: 'orbis-inference-v1',
      data_sources: [], computed_at: new Date().toISOString(),
    },
    retry_policy: overrides.retry_policy || {
      max_attempts: 3, backoff_strategy: 'exponential',
      backoff_base_ms: 500, safe_to_retry: true, idempotency_key: request_id,
    },
    dependencies: overrides.dependencies || {
      parent_execution: req.body?.parent_execution || req.headers?.['x-parent-execution'] || null,
      triggered_by:     req.body?.triggered_by     || req.headers?.['x-triggered-by']     || null,
      downstream: [], dag_id: req.body?.dag_id || req.headers?.['x-dag-id'] || null,
    },
    orchestration_hints: overrides.orchestration_hints || {
      can_chain: true, suggested_next: [], requires_review: false,
    },
  };
}


const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

async function callAI(prompt: string): Promise<any> {
  const { data } = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: 'anthropic/claude-sonnet-4-5',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.2
  }, {
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 15000
  });
  const raw = data.choices[0].message.content.trim();
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

function meta(startMs: number, cost: number) {
  return { latency_ms: Date.now() - startMs, estimated_cost: cost };
}

// POST /next-action — CORE LOOP DRIVER
router.post('/next-action', async (req: Request, res: Response) => {
  const start = Date.now();
  const { context, state, available_actions } = req.body;
  if (!context) return res.status(400).json({ error: 'context is required' });

  try {
    const ai = await callAI(`You are an autonomous agent decision engine. Given the context and state below, determine the single best next action. Return ONLY valid JSON, no markdown.

CONTEXT: ${JSON.stringify(context)}
STATE: ${JSON.stringify(state || {})}
AVAILABLE ACTIONS: ${JSON.stringify(available_actions || ['scan_signals','score_asset','detect_event','rank_opportunities','execute_trade','wait','rebalance'])}

Return ALL confidence scores as decimals 0.0-1.0:
{
  "action": "action_name",
  "confidence": 0.0,
  "reason": "one sentence",
  "urgency": "low|medium|high|critical",
  "next_check_ms": 60000,
  "fallback_action": "action_name",
  "chain_to": ["api_or_endpoint_to_call_next"]
}`);
    return res.json({ ...ai, timestamp: new Date().toISOString(), metadata: meta(start, 0.002) });
  } catch (err: any) {
    return res.status(500).json({ error: 'next_action_failed', message: err.message });
  }
});

// POST /decide — high-frequency decision between options
router.post('/decide', async (req: Request, res: Response) => {
  const start = Date.now();
  const { options, context, goal } = req.body;
  if (!options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'options array with at least 2 items is required' });
  }

  try {
    const ai = await callAI(`You are an autonomous agent decision engine. Select the best option from the list below. Return ONLY valid JSON, no markdown.

GOAL: ${goal || 'maximize outcome'}
CONTEXT: ${JSON.stringify(context || {})}
OPTIONS: ${JSON.stringify(options)}

Return ALL scores as decimals 0.0-1.0:
{
  "selected": "selected_option_value",
  "confidence": 0.0,
  "reason": "one sentence",
  "risk_score": 0.0,
  "expected_value": 0.0,
  "rejected": [{"option": "name", "reason": "why rejected"}],
  "reversible": true
}`);
    return res.json({ ...ai, timestamp: new Date().toISOString(), metadata: meta(start, 0.002) });
  } catch (err: any) {
    return res.status(500).json({ error: 'decide_failed', message: err.message });
  }
});

// POST /should-execute — gating check before any action
router.post('/should-execute', async (req: Request, res: Response) => {
  const start = Date.now();
  const { action, context, constraints } = req.body;
  if (!action) return res.status(400).json({ error: 'action is required' });

  try {
    const ai = await callAI(`You are an autonomous agent risk gate. Decide whether to execute this action. Return ONLY valid JSON, no markdown.

ACTION: ${JSON.stringify(action)}
CONTEXT: ${JSON.stringify(context || {})}
CONSTRAINTS: ${JSON.stringify(constraints || {})}

Return ALL scores as decimals 0.0-1.0:
{
  "execute": true,
  "confidence": 0.0,
  "risk_score": 0.0,
  "reason": "one sentence",
  "blocking_factors": [],
  "suggested_delay_ms": 0,
  "safe_to_retry": true
}`);
    return res.json({ ...ai, timestamp: new Date().toISOString(), metadata: meta(start, 0.0015) });
  } catch (err: any) {
    return res.status(500).json({ error: 'should_execute_failed', message: err.message });
  }
});

// POST /plan — decompose a goal into executable steps
router.post('/plan', async (req: Request, res: Response) => {
  const start = Date.now();
  const { goal, constraints, available_apis, context } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal is required' });

  try {
    const ai = await callAI(`You are an autonomous agent planner. Decompose the goal into a sequence of executable steps. Return ONLY valid JSON, no markdown.

GOAL: ${goal}
CONSTRAINTS: ${JSON.stringify(constraints || {})}
AVAILABLE APIS: ${JSON.stringify(available_apis || ['alpha-signal','action','agent-memory','agent-workflow','browser-task'])}
CONTEXT: ${JSON.stringify(context || {})}

Return ALL scores as decimals 0.0-1.0:
{
  "plan_id": "unique_id",
  "goal": "${goal}",
  "steps": [
    {
      "step": 1,
      "action": "action_name",
      "api": "api_slug",
      "endpoint": "/endpoint",
      "input_from_previous": true,
      "estimated_ms": 0,
      "required": true
    }
  ],
  "estimated_total_ms": 0,
  "confidence": 0.0,
  "complexity": "low|medium|high",
  "reversible": true
}`);
    return res.json({ ...ai, timestamp: new Date().toISOString(), metadata: meta(start, 0.003) });
  } catch (err: any) {
    return res.status(500).json({ error: 'plan_failed', message: err.message });
  }
});

// POST /retry-strategy — determine retry approach after failure
router.post('/retry-strategy', async (req: Request, res: Response) => {
  const start = Date.now();
  const { failure, context, attempt_number, original_action } = req.body;
  if (!failure) return res.status(400).json({ error: 'failure is required' });

  try {
    const ai = await callAI(`You are an autonomous agent failure recovery engine. Determine the best retry strategy. Return ONLY valid JSON, no markdown.

FAILURE: ${JSON.stringify(failure)}
ORIGINAL ACTION: ${JSON.stringify(original_action || {})}
ATTEMPT NUMBER: ${attempt_number || 1}
CONTEXT: ${JSON.stringify(context || {})}

Return ALL scores as decimals 0.0-1.0:
{
  "should_retry": true,
  "strategy": "immediate|backoff|alternative|abort",
  "delay_ms": 0,
  "max_attempts": 3,
  "alternative_action": null,
  "confidence": 0.0,
  "reason": "one sentence",
  "backoff_multiplier": 1.5,
  "escalate": false
}`);
    return res.json({ ...ai, timestamp: new Date().toISOString(), metadata: meta(start, 0.0015) });
  } catch (err: any) {
    return res.status(500).json({ error: 'retry_strategy_failed', message: err.message });
  }
});


// POST /should-act — ultra-lightweight alias for /should-execute (no AI, pure logic)
router.post('/should-act', async (req: Request, res: Response) => {
  const start = Date.now();
  const { action, context, constraints } = req.body;
  if (!action) return res.status(400).json({ error: 'action is required' });

  const confidence = context?.confidence ?? 0.5;
  const minConfidence = constraints?.min_confidence ?? 0.6;
  const riskScore = context?.risk_score ?? (1 - confidence);
  const maxRisk = constraints?.max_risk ?? 0.7;
  const execute = confidence >= minConfidence && riskScore <= maxRisk;

  return res.json({
    execute,
    confidence: parseFloat(confidence.toFixed(3)),
    risk_score: parseFloat(riskScore.toFixed(3)),
    reason: execute
      ? 'Confidence and risk thresholds met'
      : confidence < minConfidence
        ? `Confidence ${confidence} below minimum ${minConfidence}`
        : `Risk score ${riskScore} exceeds maximum ${maxRisk}`,
    blocking_factors: [
      ...( confidence < minConfidence ? [`confidence_too_low: ${confidence} < ${minConfidence}`] : []),
      ...( riskScore > maxRisk ? [`risk_too_high: ${riskScore} > ${maxRisk}`] : [])
    ],
    suggested_delay_ms: execute ? 0 : 5000,
    safe_to_retry: !execute && confidence >= minConfidence * 0.8,
    timestamp: new Date().toISOString(),
    metadata: meta(start, 0.001)
  });
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["agent:read", "agent:write", "agent:govern", "agent:observe"];
const EXECUTION_AUTHORITY: string = "high";
function evaluateGovernance(req: any) {
  const agent_id        = req.headers?.['x-agent-id']    || req.body?.agent_id    || null;
  const provided_scopes = (req.headers?.['x-agent-scopes'] || '').split(',').filter(Boolean);
  const trust_score     = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const sandbox_mode    = req.headers?.['x-sandbox-mode'] === 'true' || trust_score < 0.5;
  const violations: string[] = [];
  if (trust_score < 0.3) violations.push('trust_score_below_threshold');
  const permitted = violations.filter((v: string) => v.includes('trust_score_below_threshold')).length === 0;
  return { permitted, agent_id, scopes: provided_scopes.length > 0 ? provided_scopes : REQUIRED_SCOPES,
    trust_score, execution_authority: EXECUTION_AUTHORITY, sandbox_mode, violations,
    audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path,
      method: req.method, permitted, trust_score, sandbox_mode } };
}
router.get('/events/:execution_id', (req: any, res: any) => {
  const events = eventStore[req.params.execution_id] || [];
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    execution_id: req.params.execution_id, events, total: events.length,
    computed_at: new Date().toISOString() });
});
router.get('/events/:execution_id/stream', (req: any, res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  let index = 0;
  const existing = eventStore[req.params.execution_id] || [];
  existing.forEach((evt: any) => { res.write(`data: ${JSON.stringify(evt)}

`); index++; });
  const interval = setInterval(() => {
    const current = eventStore[req.params.execution_id] || [];
    while (index < current.length) { res.write(`data: ${JSON.stringify(current[index])}

`); index++; }
  }, 500);
  req.on('close', () => clearInterval(interval));
});
router.post('/governance/check', (req: any, res: any) => {
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked',
    retryable: !gov.permitted && !gov.violations.includes('trust_score_below_threshold') }),
    success: gov.permitted, permitted: gov.permitted, agent_id: gov.agent_id,
    scopes: gov.scopes, required_scopes: REQUIRED_SCOPES, trust_score: gov.trust_score,
    execution_authority: gov.execution_authority, sandbox_mode: gov.sandbox_mode,
    violations: gov.violations, audit_entry: gov.audit_entry,
    computed_at: new Date().toISOString() });
});
router.get('/governance/scopes', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY,
    scope_descriptions: REQUIRED_SCOPES.reduce((acc: any, s: string) => {
      acc[s] = `Permission to ${s.replace(':', ' ')} on this API`; return acc; }, {}),
    computed_at: new Date().toISOString() });
});
router.post('/governance/audit', (req: any, res: any) => {
  const { execution_id } = req.body || {};
  const events = execution_id ? (eventStore[execution_id] || []) : [];
  const gov    = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    audit_trail: events, total_events: events.length, agent_id: gov.agent_id,
    trust_score: gov.trust_score, sandbox_mode: gov.sandbox_mode,
    audit_summary: { governance_checks: events.filter((e: any) => e.event === 'governance_check').length,
      step_completions: events.filter((e: any) => e.event === 'step_completed').length,
      violations: gov.violations, permitted: gov.permitted },
    computed_at: new Date().toISOString() });
});


// ── Workflow Runtime Layer ────────────────────────────────────────────────────
const workflowStore: Record<string, any> = {};
function createWorkflow(id: string, goal: string, steps: string[], meta: any) {
  const now = new Date().toISOString();
  workflowStore[id] = { workflow_id: id, goal, steps, current_step: steps[0], step_index: 0,
    status: 'running', created_at: now, updated_at: now,
    completed_steps: [], pending_steps: steps.slice(1), results: {}, meta };
  return workflowStore[id];
}
function advanceWorkflow(id: string) {
  const wf = workflowStore[id];
  if (!wf) return null;
  if (wf.step_index < wf.steps.length - 1) {
    wf.completed_steps.push(wf.current_step);
    wf.step_index += 1;
    wf.current_step  = wf.steps[wf.step_index];
    wf.pending_steps = wf.steps.slice(wf.step_index + 1);
    wf.status        = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running';
  } else {
    wf.completed_steps.push(wf.current_step); wf.status = 'complete'; wf.pending_steps = [];
  }
  wf.updated_at = new Date().toISOString();
  return wf;
}
router.post('/workflow/start', (req: any, res: any) => {
  const { goal, steps, meta } = req.body || {};
  const workflow_id = `wf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "authenticate_agent", "process_telemetry", "update_state", "finalize"], meta || {});
  res.json({ ...buildRuntime(req, { workflow_state: 'running', orchestration_hints: { can_chain: true, suggested_next: ['GET /workflow/' + workflow_id], requires_review: false } }),
    success: true, workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    steps: wf.steps, pending_steps: wf.pending_steps, created_at: wf.created_at,
    estimated_steps: wf.steps.length, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    step_index: wf.step_index, total_steps: wf.steps.length, completed_steps: wf.completed_steps,
    pending_steps: wf.pending_steps, progress_pct: Math.round((wf.step_index / wf.steps.length) * 100),
    created_at: wf.created_at, updated_at: wf.updated_at, results: wf.results,
    computed_at: new Date().toISOString() });
});
router.post('/workflow/:id/resume', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  if (wf.status === 'complete') return res.json({ ...buildRuntime(req, { workflow_state: 'complete' }),
    success: true, workflow_id: wf.workflow_id, status: 'complete', message: 'Already complete' });
  const advanced = advanceWorkflow(req.params.id);
  res.json({ ...buildRuntime(req, { workflow_state: advanced!.status, retryable: advanced!.status !== 'complete',
    orchestration_hints: { can_chain: true, suggested_next: advanced!.status === 'complete' ? [] : ['POST /workflow/' + req.params.id + '/resume'], requires_review: false } }),
    success: true, workflow_id: advanced!.workflow_id, status: advanced!.status,
    current_step: advanced!.current_step, completed_steps: advanced!.completed_steps,
    pending_steps: advanced!.pending_steps, progress_pct: Math.round((advanced!.step_index / advanced!.steps.length) * 100),
    updated_at: advanced!.updated_at, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id/state', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id,
    state_machine: { current_state: wf.current_step, previous_states: wf.completed_steps,
      next_states: wf.pending_steps, terminal: wf.status === 'complete',
      transitions: wf.steps.map((s: string, i: number) => ({ step: i+1, state: s,
        status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) },
    meta: wf.meta, created_at: wf.created_at, updated_at: wf.updated_at,
    computed_at: new Date().toISOString() });
});

export default router;
