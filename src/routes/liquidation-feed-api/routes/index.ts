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
    api: "Liquidation Feed API",
    version: '1.0.0',
    mount: "/liquidation-feed",
    human_approval_required: true,
    x_agent_callable: true,
    x_mcp_compatible: true,
    pricing: { model: 'per_call', unit_cost_usd: 0.008, tier: 'platform', tier_label: 'Platform Intelligence', description: 'Real-time DeFi liquidation event feed and alerting', },
    endpoints: ["/recent", "/asset/:symbol", "/alert-config"],
    recommended_actions_priority_order: ["/recent", "/asset/:symbol", "/alert-config"],
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

// Get recent liquidation events
router.get('/recent', (req: Request, res: Response) => {
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.set("x-trace-id", buildRuntime(req).trace_id);
  res.set("x-execution-id", buildRuntime(req).execution_id);
  res.json({ ...buildRuntime(req), success: true, liquidations: 'liquidations_value', total_volume_usd: 'total_volume_usd_value', updated_at: 'updated_at_value', human_approval_required: true, computed_at: new Date().toISOString() });
});

// Liquidations for a specific asset
router.get('/asset/:symbol', (req: Request, res: Response) => {
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.set("x-trace-id", buildRuntime(req).trace_id);
  res.set("x-execution-id", buildRuntime(req).execution_id);
  res.json({ ...buildRuntime(req), success: true, symbol: 'symbol_value', liquidations: 'liquidations_value', volume_24h_usd: 'volume_24h_usd_value', dominant_protocol: 'dominant_protocol_value', human_approval_required: true, computed_at: new Date().toISOString() });
});

// Configure liquidation alert thresholds
router.post('/alert-config', (req: Request, res: Response) => {
  const schema = Joi.object({ asset: Joi.string().optional(), threshold_usd: Joi.string().optional(), chain: Joi.string().optional(), webhook_url: Joi.string().optional(), });
  const { error } = schema.validate(req.body, { allowUnknown: false });
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.set("x-trace-id", buildRuntime(req).trace_id);
  res.set("x-execution-id", buildRuntime(req).execution_id);
  res.json({ ...buildRuntime(req), success: true, alert_id: 'alert_id_value', active: 'active_value', threshold_usd: 0, human_approval_required: true, computed_at: new Date().toISOString() });
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

export default router;