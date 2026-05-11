import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate } from '../middleware/validate';
import { getTokenBySymbol } from '../data/unlocks';
import { getCoinData } from '../services/coingecko';
import { tavilySearch } from '../services/tavily';
import { callAI } from '../services/ai';
import { logger } from '../logger';
import { ImpactForecast } from '../types';

// ── Universal Runtime Envelope ────────────────────────────────────────────────
function buildRuntime(req: any, overrides: Record<string, any> = {}) {
  const now          = Date.now();
  const trace_id     = req.headers?.['x-trace-id']     || `trace_${now}_${Math.random().toString(36).slice(2,8)}`;
  const execution_id = req.headers?.['x-execution-id'] || `exec_${now}_${Math.random().toString(36).slice(2,8)}`;
  const session_id   = req.body?.session_id || req.query?.session_id || req.headers?.['x-session-id'] || `session_${now}`;
  const request_id   = `req_${now}_${Math.random().toString(36).slice(2,8)}`;
  const unit         = 0.01;
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


const router = Router();

const schema = Joi.object({
  symbol: Joi.string().required(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.get('/', validate(schema), async (req: Request, res: Response): Promise<void> => {
  const symbol = (req.query.symbol as string).toUpperCase();
  const dateFilter = req.query.date as string | undefined;

  try {
    const tokenData = getTokenBySymbol(symbol);
    if (!tokenData) {
      res.status(404).json({ error: `Token "${symbol}" not found`, hint: 'Supported: ARB, OP, APT, SUI, STRK, SEI, EIGEN, ZK, BLUR, PYTH' });
      return;
    }

    const now = new Date();
    let targetUnlock = tokenData.unlocks.find((u) => dateFilter ? u.date === dateFilter : new Date(u.date) >= now);

    if (!targetUnlock) {
      res.status(404).json({ error: 'No upcoming unlock found for this token', symbol });
      return;
    }

    const [coinData, searchResults] = await Promise.all([
      getCoinData(tokenData.coingeckoId),
      tavilySearch(`${symbol} token unlock ${targetUnlock.date} sell pressure impact`, 4),
    ]);

    const price = coinData?.current_price || null;
    const circulatingSupply = coinData?.circulating_supply || null;
    const tokensUnlocked = targetUnlock.amount * 1e6;
    const estimatedUsdValue = price ? Math.round(tokensUnlocked * price) : null;
    const percentOfCirculating = circulatingSupply ? Math.round((tokensUnlocked / circulatingSupply) * 10000) / 100 : null;
    const percentOfTotal = (targetUnlock.amount / tokenData.totalSupply) * 100;

    // Sell pressure score
    let sellPressureScore = 20;
    const isHighRisk = ['Team', 'Investors', 'Core Contributors', 'Early Contributors', 'Private Sales'].some(
      (r) => targetUnlock!.recipient.toLowerCase().includes(r.toLowerCase())
    );
    if (isHighRisk) sellPressureScore += 30;
    if (percentOfTotal >= 5) sellPressureScore += 25;
    else if (percentOfTotal >= 2) sellPressureScore += 15;
    else if (percentOfTotal >= 1) sellPressureScore += 8;
    if (targetUnlock.vestingType === 'cliff') sellPressureScore += 15;
    if (percentOfCirculating && percentOfCirculating >= 5) sellPressureScore += 10;
    sellPressureScore = Math.min(100, sellPressureScore);

    let sellPressureRisk: ImpactForecast['sellPressureRisk'] = 'LOW';
    if (sellPressureScore >= 75) sellPressureRisk = 'CRITICAL';
    else if (sellPressureScore >= 50) sellPressureRisk = 'HIGH';
    else if (sellPressureScore >= 30) sellPressureRisk = 'MEDIUM';

    const newsContext = searchResults.map((r) => r.content).join('\n').slice(0, 1500);

    const aiPrompt = `You are a crypto market analyst specializing in token unlock events.

Token: ${symbol} (${tokenData.name})
Unlock date: ${targetUnlock.date}
Tokens unlocking: ${(tokensUnlocked / 1e6).toFixed(1)}M ${symbol} ($${estimatedUsdValue ? (estimatedUsdValue / 1e6).toFixed(1) + 'M' : 'unknown'})
Recipient: ${targetUnlock.recipient}
Unlock type: ${targetUnlock.vestingType}
% of total supply: ${percentOfTotal.toFixed(2)}%
% of circulating supply: ${percentOfCirculating !== null ? percentOfCirculating + '%' : 'unknown'}
Sell pressure score: ${sellPressureScore}/100 (${sellPressureRisk})
Current price: $${price || 'unknown'}
News context: ${newsContext.slice(0, 800)}

Respond ONLY in this JSON format (no markdown):
{
  "priceImpactEstimate": "string (e.g. '-5% to -15% in 7 days post-unlock')",
  "recommendation": "string (1 sentence — what traders should do)",
  "aiAnalysis": "string (2 sentences — analysis of this specific unlock event)"
}`;

    const aiResponse = await callAI(aiPrompt);
    let parsed: any;
    try {
      parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { priceImpactEstimate: 'Unable to estimate', recommendation: aiResponse.slice(0, 200), aiAnalysis: aiResponse.slice(0, 300) };
    }

    const result: ImpactForecast = {
      symbol,
      unlockDate: targetUnlock.date,
      tokensUnlocked,
      estimatedUsdValue,
      percentOfCirculating,
      recipient: targetUnlock.recipient,
      sellPressureScore,
      sellPressureRisk,
      priceImpactEstimate: parsed.priceImpactEstimate,
      recommendation: parsed.recommendation,
      aiAnalysis: parsed.aiAnalysis,
      analyzedAt: new Date().toISOString(),
    };

    logger.info({ symbol, unlockDate: targetUnlock.date, sellPressureScore, sellPressureRisk }, 'unlocks/impact');
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message, symbol }, 'unlocks/impact error');
    res.status(500).json({ error: 'Failed to analyze unlock impact', details: err.message });
  }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["market:read", "market:signal", "market:analyze"];
const EXECUTION_AUTHORITY: string = "medium";
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
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "fetch_market_data", "compute_signals", "rank_outputs", "finalize"], meta || {});
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
