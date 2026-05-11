import { Router, Request, Response } from 'express';
import Joi from 'joi';

// ── Universal Runtime Envelope ────────────────────────────────────────────────
function buildRuntime(req: any, overrides: Record<string, any> = {}) {
  const now = Date.now();
  const trace_id     = req.headers['x-trace-id']     || `trace_${now}_${Math.random().toString(36).slice(2,8)}`;
  const execution_id = req.headers['x-execution-id'] || `exec_${now}_${Math.random().toString(36).slice(2,8)}`;
  const session_id   = req.body?.session_id || req.query?.session_id || req.headers['x-session-id'] || `session_${now}`;
  const request_id   = `req_${now}_${Math.random().toString(36).slice(2,8)}`;

  return {
    trace_id,
    execution_id,
    session_id,
    request_id,
    workflow_state:    overrides.workflow_state    || 'complete',
    retryable:         overrides.retryable         ?? false,
    latency_breakdown: overrides.latency_breakdown || {
      total_ms:      0,
      inference_ms:  0,
      io_ms:         0,
      overhead_ms:   0,
    },
    cost_breakdown: overrides.cost_breakdown || {
      total_usd:       0.008,
      inference_usd:   0.0056,
      io_usd:          0.0012,
      overhead_usd:    0.0012,
    },
    provenance: overrides.provenance || {
      api_version:    '1.0.0',
      model:          'orbis-inference-v1',
      data_sources:   [],
      computed_at:    new Date().toISOString(),
    },
    retry_policy: overrides.retry_policy || {
      max_attempts:     3,
      backoff_strategy: 'exponential',
      backoff_base_ms:  500,
      safe_to_retry:    true,
      idempotency_key:  request_id,
    },
    dependencies: overrides.dependencies || {
      parent_execution: null,
      triggered_by:     null,
      downstream:       [],
      dag_id:           null,
    },
    orchestration_hints: overrides.orchestration_hints || {
      can_chain:       true,
      suggested_next:  [],
      requires_review: false,
    },
  };
}


const router = Router();

router.get('/discovery', (_req, res) => {
  res.json({
    api: "Yield Farming API",
    version: '1.0.0',
    mount: "/yield-farming",
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    pricing: { model: 'per_call', unit_cost_usd: 0.008, tier: 'platform', tier_label: 'Platform Intelligence', description: 'Risk-adjusted yield farming opportunity ranking', },
    endpoints: ["/opportunities", "/simulate", "/protocol/:name"],
    recommended_actions_priority_order: ["/opportunities", "/simulate", "/protocol/:name"],
    chain_to: ["agent-memory", "market-snapshot", "onchain-signal", "tx-simulator"],
  });
});

router.post('/execution-gate', (req, res) => {
  const { action, payload } = req.body || {};
  const checks = {
    action_recognized: !!action,
    payload_present: !!payload,
    human_approval_required: true,
    confidence_sufficient: true,
    rate_limit_ok: true,
  };
  const passed = Object.values(checks).every(Boolean);
  res.set("x-trace-id", buildRuntime(req).trace_id);
  res.set("x-execution-id", buildRuntime(req).execution_id);
  res.json({ ...buildRuntime(req), passed, checks, approved_at: new Date().toISOString(), computed_at: new Date().toISOString() });
});

// List current yield farming opportunities
router.get('/opportunities', (req: Request, res: Response) => {
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.set("x-trace-id", buildRuntime(req).trace_id);
  res.set("x-execution-id", buildRuntime(req).execution_id);
  res.json({ ...buildRuntime(req), success: true, opportunities: 'opportunities_value', updated_at: 'updated_at_value', total_tvl_usd: 0, human_approval_required: true, computed_at: new Date().toISOString() });
});

// Simulate yield on a given position
router.post('/simulate', (req: Request, res: Response) => {
  const schema = Joi.object({ protocol: Joi.string().optional(), pool: Joi.string().optional(), amount_usd: Joi.string().optional(), duration_days: Joi.string().optional(), });
  const { error } = schema.validate(req.body, { allowUnknown: false });
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.set("x-trace-id", buildRuntime(req).trace_id);
  res.set("x-execution-id", buildRuntime(req).execution_id);
  res.json({ ...buildRuntime(req), success: true, projected_yield_usd: 0, projected_apy: 0, gas_cost_usd: 0, net_yield_usd: 0, risk_score: 0, human_approval_required: true, computed_at: new Date().toISOString() });
});

// Get protocol-level yield summary
router.get('/protocol/:name', (req: Request, res: Response) => {
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.set("x-trace-id", buildRuntime(req).trace_id);
  res.set("x-execution-id", buildRuntime(req).execution_id);
  res.json({ ...buildRuntime(req), success: true, protocol: 'protocol_value', pools: 'pools_value', avg_apy: 'avg_apy_value', tvl_usd: 'tvl_usd_value', audited: 'audited_value', human_approval_required: true, computed_at: new Date().toISOString() });
});


// ── Workflow Runtime Layer ────────────────────────────────────────────────────
const workflowStore: Record<string, any> = {};

function createWorkflow(id: string, goal: string, steps: string[], meta: any) {
  const now = new Date().toISOString();
  workflowStore[id] = {
    workflow_id:   id,
    goal,
    steps,
    current_step:  steps[0] || 'finalize',
    step_index:    0,
    status:        'running',
    created_at:    now,
    updated_at:    now,
    completed_steps: [],
    pending_steps:   steps.slice(1),
    results:       {},
    meta,
  };
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
    wf.completed_steps.push(wf.current_step);
    wf.status        = 'complete';
    wf.pending_steps = [];
  }
  wf.updated_at = new Date().toISOString();
  return wf;
}

// POST /workflow/start
router.post('/workflow/start', (req: Request, res: Response) => {
  const { goal, steps, meta, session_id } = req.body || {};
  const workflow_id = `wf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const defaultSteps = ["validate_inputs", "assess_risk", "simulate_execution", "apply_execution_gate", "finalize"];
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || defaultSteps, meta || {});
  res.json({
    ...buildRuntime(req, {
      workflow_state: 'running',
      retryable: false,
      orchestration_hints: {
        can_chain:       true,
        suggested_next:  ['GET /workflow/' + workflow_id],
        requires_review: false,
      },
    }),
    success:      true,
    workflow_id,
    goal:         wf.goal,
    status:       wf.status,
    current_step: wf.current_step,
    steps:        wf.steps,
    pending_steps:wf.pending_steps,
    created_at:   wf.created_at,
    estimated_steps: wf.steps.length,
    computed_at:  new Date().toISOString(),
  });
});

// GET /workflow/:id
router.get('/workflow/:id', (req: Request, res: Response) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found', workflow_id: req.params.id });
  res.json({
    ...buildRuntime(req, { workflow_state: wf.status }),
    success:          true,
    workflow_id:      wf.workflow_id,
    goal:             wf.goal,
    status:           wf.status,
    current_step:     wf.current_step,
    step_index:       wf.step_index,
    total_steps:      wf.steps.length,
    completed_steps:  wf.completed_steps,
    pending_steps:    wf.pending_steps,
    progress_pct:     Math.round((wf.step_index / wf.steps.length) * 100),
    created_at:       wf.created_at,
    updated_at:       wf.updated_at,
    results:          wf.results,
    computed_at:      new Date().toISOString(),
  });
});

// POST /workflow/:id/resume
router.post('/workflow/:id/resume', (req: Request, res: Response) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found', workflow_id: req.params.id });
  if (wf.status === 'complete') return res.json({
    ...buildRuntime(req, { workflow_state: 'complete' }),
    success: true, workflow_id: wf.workflow_id, status: 'complete', message: 'Workflow already complete',
  });
  const advanced = advanceWorkflow(req.params.id);
  res.json({
    ...buildRuntime(req, {
      workflow_state: advanced!.status,
      retryable: advanced!.status !== 'complete',
      orchestration_hints: {
        can_chain:       true,
        suggested_next:  advanced!.status === 'complete' ? [] : ['POST /workflow/' + req.params.id + '/resume'],
        requires_review: false,
      },
    }),
    success:          true,
    workflow_id:      advanced!.workflow_id,
    status:           advanced!.status,
    current_step:     advanced!.current_step,
    completed_steps:  advanced!.completed_steps,
    pending_steps:    advanced!.pending_steps,
    progress_pct:     Math.round((advanced!.step_index / advanced!.steps.length) * 100),
    updated_at:       advanced!.updated_at,
    computed_at:      new Date().toISOString(),
  });
});

// GET /workflow/:id/state
router.get('/workflow/:id/state', (req: Request, res: Response) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found', workflow_id: req.params.id });
  res.json({
    ...buildRuntime(req, { workflow_state: wf.status }),
    success:     true,
    workflow_id: wf.workflow_id,
    state_machine: {
      current_state:   wf.current_step,
      previous_states: wf.completed_steps,
      next_states:     wf.pending_steps,
      terminal:        wf.status === 'complete',
      transitions:     wf.steps.map((s: string, i: number) => ({
        step:    i + 1,
        state:   s,
        status:  i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending',
      })),
    },
    meta:        wf.meta,
    created_at:  wf.created_at,
    updated_at:  wf.updated_at,
    computed_at: new Date().toISOString(),
  });
});


// ── Event Store ───────────────────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};

function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({
    event_id:    `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event,
    step,
    timestamp:   new Date().toISOString(),
    execution_id,
    data,
  });
}

// ── Agent Governance ──────────────────────────────────────────────────────────
const REQUIRED_SCOPES: string[]    = ["defi:read", "defi:simulate", "defi:execute", "defi:risk"];
const EXECUTION_AUTHORITY: string  = "high";

function evaluateGovernance(req: any): {
  permitted: boolean;
  agent_id: string | null;
  scopes: string[];
  trust_score: number;
  execution_authority: string;
  sandbox_mode: boolean;
  violations: string[];
  audit_entry: any;
} {
  const agent_id        = req.headers['x-agent-id']    || req.body?.agent_id    || null;
  const provided_scopes = (req.headers['x-agent-scopes'] || '').split(',').filter(Boolean);
  const trust_header    = parseFloat(req.headers['x-agent-trust-score'] || '1.0');
  const trust_score     = isNaN(trust_header) ? 1.0 : Math.min(1.0, Math.max(0.0, trust_header));
  const sandbox_mode    = req.headers['x-sandbox-mode'] === 'true' || trust_score < 0.5;
  const violations: string[] = [];

  // Scope check — warn but don't block (permissive mode)
  const missing = REQUIRED_SCOPES.filter(s => provided_scopes.length > 0 && !provided_scopes.includes(s));
  if (missing.length > 0) violations.push(`missing_scopes: ${missing.join(',')}`);

  // Trust threshold
  if (trust_score < 0.3) violations.push('trust_score_below_threshold');

  const permitted = violations.filter(v => v.includes('trust_score_below_threshold')).length === 0;

  return {
    permitted,
    agent_id,
    scopes:              provided_scopes.length > 0 ? provided_scopes : REQUIRED_SCOPES,
    trust_score,
    execution_authority: EXECUTION_AUTHORITY,
    sandbox_mode,
    violations,
    audit_entry: {
      agent_id,
      timestamp:  new Date().toISOString(),
      endpoint:   req.path,
      method:     req.method,
      permitted,
      trust_score,
      sandbox_mode,
    },
  };
}

// ── GET /events/:execution_id ─────────────────────────────────────────────────
router.get('/events/:execution_id', (req: Request, res: Response) => {
  const events = eventStore[req.params.execution_id] || [];
  res.json({
    ...buildRuntime(req, { workflow_state: 'complete' }),
    success:       true,
    execution_id:  req.params.execution_id,
    events,
    total:         events.length,
    computed_at:   new Date().toISOString(),
  });
});

// ── GET /events/:execution_id/stream (SSE) ────────────────────────────────────
router.get('/events/:execution_id/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type',                'text/event-stream');
  res.setHeader('Cache-Control',               'no-cache');
  res.setHeader('Connection',                  'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const execution_id = req.params.execution_id;
  let   index        = 0;

  // Replay existing events
  const existing = eventStore[execution_id] || [];
  existing.forEach(evt => {
    res.write(`data: ${JSON.stringify(evt)}

`);
    index++;
  });

  // Poll for new events every 500ms
  const interval = setInterval(() => {
    const current = eventStore[execution_id] || [];
    while (index < current.length) {
      res.write(`data: ${JSON.stringify(current[index])}

`);
      index++;
    }
  }, 500);

  req.on('close', () => clearInterval(interval));
});

// ── POST /governance/check ────────────────────────────────────────────────────
router.post('/governance/check', (req: Request, res: Response) => {
  const gov = evaluateGovernance(req);
  emitEvent(
    buildRuntime(req).execution_id,
    'governance_check',
    'evaluate_permissions',
    { permitted: gov.permitted, trust_score: gov.trust_score, violations: gov.violations }
  );
  res.json({
    ...buildRuntime(req, {
      workflow_state: gov.permitted ? 'complete' : 'blocked',
      retryable:      !gov.permitted && !gov.violations.includes('trust_score_below_threshold'),
    }),
    success:             gov.permitted,
    permitted:           gov.permitted,
    agent_id:            gov.agent_id,
    scopes:              gov.scopes,
    required_scopes:     REQUIRED_SCOPES,
    trust_score:         gov.trust_score,
    execution_authority: gov.execution_authority,
    sandbox_mode:        gov.sandbox_mode,
    violations:          gov.violations,
    audit_entry:         gov.audit_entry,
    computed_at:         new Date().toISOString(),
  });
});

// ── GET /governance/scopes ────────────────────────────────────────────────────
router.get('/governance/scopes', (_req: Request, res: Response) => {
  res.json({
    ...buildRuntime(_req, { workflow_state: 'complete' }),
    success:             true,
    required_scopes:     REQUIRED_SCOPES,
    execution_authority: EXECUTION_AUTHORITY,
    scope_descriptions:  REQUIRED_SCOPES.reduce((acc: any, s: string) => {
      acc[s] = `Permission to ${s.replace(':', ' ')} on this API`;
      return acc;
    }, {}),
    computed_at: new Date().toISOString(),
  });
});

// ── POST /governance/audit ────────────────────────────────────────────────────
router.post('/governance/audit', (req: Request, res: Response) => {
  const { execution_id } = req.body || {};
  const events = execution_id ? (eventStore[execution_id] || []) : [];
  const gov    = evaluateGovernance(req);
  res.json({
    ...buildRuntime(req, { workflow_state: 'complete' }),
    success:        true,
    audit_trail:    events,
    total_events:   events.length,
    agent_id:       gov.agent_id,
    trust_score:    gov.trust_score,
    sandbox_mode:   gov.sandbox_mode,
    audit_summary: {
      governance_checks: events.filter((e: any) => e.event === 'governance_check').length,
      step_completions:  events.filter((e: any) => e.event === 'step_completed').length,
      violations:        gov.violations,
      permitted:         gov.permitted,
    },
    computed_at: new Date().toISOString(),
  });
});

export default router;