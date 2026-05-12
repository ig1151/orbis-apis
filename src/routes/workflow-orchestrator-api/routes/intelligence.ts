import { Router, Request, Response } from 'express';
import axios from 'axios';
import { buildRuntime } from '../../../shared/ai';

// ── Universal Runtime Envelope ────────────────────────────────────────────────


const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model: MODEL, messages: [{ role: 'user', content: prompt }] },
    { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
  );
  return res.data.choices[0].message.content;
}

function parseJSON(raw: string) {
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Workflow Orchestrator API', info: '/workflow-orchestrator/info', openapi: '/workflow-orchestrator/openapi.json', health: 'ok' });
});

router.post('/build', async (req, res) => { req.url = '/build-workflow'; (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
router.post('/build-workflow', async (req: Request, res: Response) => {
  const { goal, available_apis = [], constraints, context, max_steps } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  try {
    const raw = await callClaude(`Build a multi-step agent workflow from this goal. Goal: "${goal}" Available APIs: ${JSON.stringify(available_apis)} Constraints: ${JSON.stringify(constraints || {})} Context: "${context || 'none'}" Max steps: ${max_steps || 'unlimited'}

Return concise JSON:
{
  "workflow_id": "string",
  "goal": "string",
  "steps": [{ "step_number": number, "api": "string", "endpoint": "string", "purpose": "string", "inputs_from_prev": ["string"], "outputs_to_next": ["string"], "estimated_cost": number, "estimated_ms": number }],
  "total_steps": number,
  "estimated_total_cost": number,
  "estimated_total_ms": number,
  "parallel_opportunities": [{ "steps": [number], "reason": "string" }],
  "critical_path": [number],
  "fallback_strategies": [{ "step": number, "fallback": "string" }],
  "confidence_per_section": { "steps": 0-1, "cost_estimate": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execute-workflow', async (req: Request, res: Response) => {
  const { workflow_id, steps, dry_run } = req.body;
  if (!workflow_id) return res.status(400).json({ error: 'workflow_id is required' });
  if (!steps) return res.status(400).json({ error: 'steps is required' });
  try {
    const raw = await callClaude(`Execute a multi-step workflow with result tracking. Workflow ID: "${workflow_id}" Dry run: ${dry_run || false}

Steps: ${JSON.stringify(steps)}

Return concise JSON:
{
  "workflow_id": "string",
  "execution_id": "string",
  "dry_run": true|false,
  "status": "completed|partial|failed",
  "steps_executed": number,
  "steps_total": number,
  "results": [{ "step_number": number, "api": "string", "status": "success|failed|skipped", "output_summary": "string", "error": "string" }],
  "overall_output": {},
  "execution_time_ms": number,
  "total_cost": number,
  "next_steps": ["string"],
  "confidence_per_section": { "results": 0-1, "overall_output": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/retry-failed-step', async (req: Request, res: Response) => {
  const { workflow_id, execution_id, failed_step, error_message, attempt_number, max_attempts } = req.body;
  if (!workflow_id) return res.status(400).json({ error: 'workflow_id is required' });
  if (!execution_id) return res.status(400).json({ error: 'execution_id is required' });
  if (failed_step === undefined) return res.status(400).json({ error: 'failed_step is required' });
  if (!error_message) return res.status(400).json({ error: 'error_message is required' });
  try {
    const raw = await callClaude(`Determine retry strategy for a failed workflow step. Workflow ID: "${workflow_id}" Execution ID: "${execution_id}" Failed step: ${failed_step} Error: "${error_message}" Attempt: ${attempt_number || 1} Max attempts: ${max_attempts || 3}

Return concise JSON:
{
  "workflow_id": "string",
  "failed_step": number,
  "retry_recommended": true|false,
  "strategy": "immediate|backoff|alternative|skip|abort",
  "delay_ms": number,
  "max_attempts": number,
  "alternative_step": { "api": "string", "endpoint": "string", "reason": "string" } | null,
  "root_cause_analysis": "string",
  "prevention_tips": ["string"],
  "escalation_required": true|false,
  "confidence_per_section": { "strategy": 0-1, "root_cause": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/parallel-execution', async (req: Request, res: Response) => {
  const { workflow_id, parallel_branches, merge_strategy } = req.body;
  if (!workflow_id) return res.status(400).json({ error: 'workflow_id is required' });
  if (!parallel_branches) return res.status(400).json({ error: 'parallel_branches is required' });
  try {
    const raw = await callClaude(`Plan and execute parallel workflow branches. Workflow ID: "${workflow_id}" Merge strategy: "${merge_strategy || 'all_complete'}"

Parallel branches: ${JSON.stringify(parallel_branches)}

Return concise JSON:
{
  "workflow_id": "string",
  "branches_planned": number,
  "execution_plan": [{ "branch_id": "string", "steps": number, "estimated_ms": number, "dependencies": ["string"] }],
  "merge_strategy": "first_complete|all_complete|majority|weighted",
  "expected_speedup": number,
  "resource_contention": [{ "resource": "string", "branches": ["string"], "resolution": "string" }],
  "merge_logic": "string",
  "estimated_total_ms": number,
  "confidence_per_section": { "execution_plan": 0-1, "resource_contention": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/cost-estimator', async (req: Request, res: Response) => {
  const { workflow_steps, runs_per_month, context } = req.body;
  if (!workflow_steps) return res.status(400).json({ error: 'workflow_steps is required' });
  try {
    const raw = await callClaude(`Estimate cost and time for a workflow before execution. Runs per month: ${runs_per_month || 1} Context: "${context || 'none'}"

Workflow steps: ${JSON.stringify(workflow_steps)}

Return concise JSON:
{
  "per_run_cost": number,
  "per_run_time_ms": number,
  "monthly_cost": number,
  "cost_breakdown": [{ "step": "string", "api": "string", "endpoint": "string", "cost_per_call": number, "calls": number, "subtotal": number }],
  "optimization_opportunities": [{ "change": "string", "savings_per_run": number, "tradeoff": "string" }],
  "cost_tier": "ultra_low|low|medium|high",
  "roi_indicators": [{ "metric": "string", "expected_value": "string" }],
  "confidence_per_section": { "cost_breakdown": 0-1, "optimization": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/workflow-health', async (req: Request, res: Response) => {
  const { workflow_id, execution_history = [], current_status, metrics } = req.body;
  if (!workflow_id) return res.status(400).json({ error: 'workflow_id is required' });
  try {
    const raw = await callClaude(`Analyze health and status of a workflow. Workflow ID: "${workflow_id}" Current status: "${current_status || 'unknown'}" Metrics: ${JSON.stringify(metrics || {})}

Execution history (last 10): ${JSON.stringify(execution_history.slice(0, 10))}

Return concise JSON:
{
  "workflow_id": "string",
  "health_score": number,
  "status": "healthy|degraded|critical|unknown",
  "success_rate": number,
  "avg_execution_time_ms": number,
  "failure_patterns": [{ "pattern": "string", "frequency": number, "impact": "high|medium|low" }],
  "bottlenecks": [{ "step": "string", "avg_ms": number, "recommendation": "string" }],
  "alerts": [{ "severity": "critical|warning|info", "message": "string", "action": "string" }],
  "trend": "improving|stable|degrading",
  "confidence_per_section": { "health_score": 0-1, "failure_patterns": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { workflow_context, intended_workflow, resource_constraints } = req.body;
  if (!workflow_context) return res.status(400).json({ error: 'workflow_context is required' });
  if (!intended_workflow) return res.status(400).json({ error: 'intended_workflow is required' });
  try {
    const raw = await callClaude(`Gate workflow execution based on readiness and constraints. Intended workflow: "${intended_workflow}" Resource constraints: ${JSON.stringify(resource_constraints || {})}

Workflow context: ${JSON.stringify(workflow_context)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": number,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "risk_score": number,
  "recommended_action": "string",
  "chain_to": ["string"],
  "resource_check": { "sufficient": true|false, "missing": ["string"] },
  "retry_after": "string" | null,
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/run-workflow', async (req: Request, res: Response) => {
  const { goal, context, available_apis = [], dry_run } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  try {
    const raw = await callClaude(`Build and execute a complete multi-step workflow in one call. Goal: "${goal}" Context: "${context || 'none'}" Available APIs: ${JSON.stringify(available_apis)} Dry run: ${dry_run || false}

Return concise JSON:
{
  "workflow_id": "string",
  "goal": "string",
  "built_steps": number,
  "execution_id": "string",
  "status": "completed|partial|failed",
  "step_results": [{ "step": number, "api": "string", "status": "success|failed|skipped", "summary": "string" }],
  "final_output": {},
  "total_cost": number,
  "total_time_ms": number,
  "success_rate": number,
  "next_workflow_suggestions": ["string"],
  "confidence_per_section": { "step_results": 0-1, "final_output": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
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
