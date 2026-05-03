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

export default router;
