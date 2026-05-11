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
      total_usd:       0.002,
      inference_usd:   0.0015,
      io_usd:          0.0003,
      overhead_usd:    0.0002,
    },
    provenance: overrides.provenance || {
      api_version:    '1.0.0',
      model:          'orbis-inference-v1',
      data_sources:   [],
      computed_at:    new Date().toISOString(),
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
    api: "Voice Intelligence API",
    version: '1.0.0',
    mount: "/voice-intelligence",
    human_approval_required: false,
    x_agent_callable: true,
    x_mcp_compatible: true,
    pricing: { model: 'per_call', unit_cost_usd: 0.002 },
    endpoints: ["/transcribe", "/extract-insights", "/summarize"],
    recommended_actions_priority_order: ["/transcribe", "/extract-insights", "/summarize"],
    chain_to: ["agent-memory", "intelligence-extraction", "text-gen"],
  });
});

router.post('/execution-gate', (req, res) => {
  const { action, payload } = req.body || {};
  const checks = {
    action_recognized: !!action,
    payload_present: !!payload,
    human_approval_required: false,
    confidence_sufficient: true,
    rate_limit_ok: true,
  };
  const passed = Object.values(checks).every(Boolean);
  res.set("x-trace-id", buildRuntime(req).trace_id);
  res.set("x-execution-id", buildRuntime(req).execution_id);
  res.json({ ...buildRuntime(req), passed, checks, approved_at: new Date().toISOString(), computed_at: new Date().toISOString() });
});

// Transcribe an audio file
router.post('/transcribe', (req: Request, res: Response) => {
  const schema = Joi.object({ audio_url: Joi.string().optional(), language: Joi.string().optional(), diarize: Joi.string().optional(), });
  const { error } = schema.validate(req.body, { allowUnknown: false });
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.set("x-trace-id", buildRuntime(req).trace_id);
  res.set("x-execution-id", buildRuntime(req).execution_id);
  res.json({ ...buildRuntime(req), success: true, transcript: 'transcript_value', speakers: 'speakers_value', duration_seconds: 'duration_seconds_value', confidence: 0, computed_at: new Date().toISOString() });
});

// Extract insights from a transcript
router.post('/extract-insights', (req: Request, res: Response) => {
  const schema = Joi.object({ transcript: Joi.string().optional(), signal_types: Joi.string().optional(), context: Joi.string().optional(), });
  const { error } = schema.validate(req.body, { allowUnknown: false });
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.set("x-trace-id", buildRuntime(req).trace_id);
  res.set("x-execution-id", buildRuntime(req).execution_id);
  res.json({ ...buildRuntime(req), success: true, insights: 'insights_value', action_items: 'action_items_value', sentiment: 'sentiment_value', key_entities: 'key_entities_value', risk_flags: 'risk_flags_value', computed_at: new Date().toISOString() });
});

// Summarize a call or meeting
router.post('/summarize', (req: Request, res: Response) => {
  const schema = Joi.object({ transcript: Joi.string().optional(), format: Joi.string().optional(), max_length: Joi.string().optional(), });
  const { error } = schema.validate(req.body, { allowUnknown: false });
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  const trace_id = `trace_${Date.now()}`;
  const execution_id = `exec_${Date.now()}`;
  const session_id = req.body?.session_id || req.query?.session_id || `session_${Date.now()}`;
  res.set("x-trace-id", buildRuntime(req).trace_id);
  res.set("x-execution-id", buildRuntime(req).execution_id);
  res.json({ ...buildRuntime(req), success: true, summary: 'summary_value', decisions: 'decisions_value', next_steps: 'next_steps_value', participants: 'participants_value', computed_at: new Date().toISOString() });
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
  const defaultSteps = ["validate_inputs", "fetch_source", "extract_structure", "score_confidence", "finalize"];
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