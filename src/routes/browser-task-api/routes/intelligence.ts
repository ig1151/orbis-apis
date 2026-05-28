import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';
import { buildRuntime } from '../../../shared/ai';

// ── Universal Runtime Envelope ────────────────────────────────────────────────


const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${err}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content ?? '';
}

function parseJSON(raw: string): unknown {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  if (start !== -1) {
    let depth = 0, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error(`Cannot parse as JSON: ${raw.slice(0, 100)}`);
  } catch {
    return { raw };
  }
}

function successMeta(startMs: number) {
  return {
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startMs,
    version: '2.0.0',
    provider: 'orbis-browser-task',
  };
}

// ─── POST /autofill ───────────────────────────────────────────────────────────

const autofillSchema = Joi.object({
  page_context: Joi.string().min(1).max(5000).required(),
  field_data: Joi.object().required(),
  form_type: Joi.string().valid('checkout', 'signup', 'contact', 'search', 'custom').optional(),
  smart_fill: Joi.boolean().optional(),
});

router.post('/autofill', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = autofillSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: error.details[0].message },
      meta: successMeta(start),
    });
  }

  const task_id = 'af_' + uuidv4().replace(/-/g, '').slice(0, 18);

  try {
    const prompt = `Generate step-by-step autofill instructions for this web form. Map provided data to form fields intelligently, handle edge cases, and validate the mapping.

Form context:
${value.page_context}

Data to fill:
${JSON.stringify(value.field_data, null, 2)}

${value.form_type ? `Form type: ${value.form_type}` : ''}
${value.smart_fill !== undefined ? `Smart fill: ${value.smart_fill}` : ''}

Return a JSON object with exactly these fields:
- fill_instructions: array of {field_selector: string, field_label: string, value: string, action: "type"|"select"|"check"|"upload", confidence: number (0-1)}
- unmapped_fields: array of {field: string, reason: string}
- validation_checks: array of {field: string, rule: string}
- estimated_completion_rate: number (0-1)
- warnings: array of strings
- recommended_actions_priority_order: array of strings
- privacy: {data_stored: false, retention: "none"}
- confidence_per_section: object with section names as keys and confidence numbers as values

Only return valid JSON, no markdown.`;

    const raw = await callClaude(prompt);
    const result = parseJSON(raw) as Record<string, unknown>;

    logger.info({ task_id, form_type: value.form_type }, 'Autofill complete');

    return res.json({
      success: true,
      data: {
        task_id,
        ...result,
        privacy: { data_stored: false, retention: 'none' },
        metadata: { latency_ms: Date.now() - start },
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Autofill failed';
    return res.status(500).json({
      success: false,
      error: { code: 'AUTOFILL_FAILED', type: 'intelligence_error', message, retryable: true },
      meta: successMeta(start),
    });
  }
});

// ─── POST /click-path ─────────────────────────────────────────────────────────

const clickPathSchema = Joi.object({
  goal: Joi.string().min(1).max(500).required(),
  page_context: Joi.string().min(1).max(5000).required(),
  starting_url: Joi.string().uri().optional(),
  constraints: Joi.array().items(Joi.string()).optional(),
  max_steps: Joi.number().integer().min(1).max(50).optional(),
});

router.post('/click-path', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = clickPathSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: error.details[0].message },
      meta: successMeta(start),
    });
  }

  const task_id = 'cp_' + uuidv4().replace(/-/g, '').slice(0, 18);

  try {
    const prompt = `Generate an optimal click path to achieve this goal on this page. Provide step-by-step instructions with selectors, actions, and validation checks.

Goal: ${value.goal}

Page context:
${value.page_context}

${value.starting_url ? `Starting URL: ${value.starting_url}` : ''}
${value.constraints?.length ? `Constraints (avoid these): ${value.constraints.join(', ')}` : ''}
${value.max_steps ? `Maximum steps: ${value.max_steps}` : ''}

Return a JSON object with exactly these fields:
- steps: array of {step_number: number, action: "click"|"scroll"|"hover"|"wait"|"type"|"navigate", target: string, value: string or null, verification: string, fallback: string}
- total_steps: number
- estimated_duration_seconds: number
- risk_points: array of {step: number, risk: string, mitigation: string}
- success_criteria: array of strings
- confidence_per_section: object with section names as keys and confidence numbers as values
- recommended_actions_priority_order: array of strings
- privacy: {data_stored: false, retention: "none"}

Only return valid JSON, no markdown.`;

    const raw = await callClaude(prompt);
    const result = parseJSON(raw) as Record<string, unknown>;

    logger.info({ task_id, goal: value.goal }, 'Click-path complete');

    return res.json({
      success: true,
      data: {
        task_id,
        ...result,
        privacy: { data_stored: false, retention: 'none' },
        metadata: { latency_ms: Date.now() - start },
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Click-path generation failed';
    return res.status(500).json({
      success: false,
      error: { code: 'CLICK_PATH_FAILED', type: 'intelligence_error', message, retryable: true },
      meta: successMeta(start),
    });
  }
});

// ─── POST /capture-structured-data ───────────────────────────────────────────

const captureStructuredDataSchema = Joi.object({
  page_content: Joi.string().min(1).max(50000).required(),
  data_schema: Joi.object().required(),
  extraction_hints: Joi.array().items(Joi.string()).optional(),
  fallback_values: Joi.object().optional(),
});

router.post('/capture-structured-data', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = captureStructuredDataSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: error.details[0].message },
      meta: successMeta(start),
    });
  }

  const task_id = 'csd_' + uuidv4().replace(/-/g, '').slice(0, 17);

  try {
    const prompt = `Extract structured data from this page content according to the target schema. Handle missing fields gracefully and validate extracted values.

Target schema:
${JSON.stringify(value.data_schema, null, 2)}

${value.extraction_hints?.length ? `Extraction hints: ${value.extraction_hints.join('; ')}` : ''}
${value.fallback_values ? `Fallback values for missing fields: ${JSON.stringify(value.fallback_values)}` : ''}

Page content:
${value.page_content}

Return a JSON object with exactly these fields:
- extracted_data: object matching the provided schema
- extraction_confidence: number (0-1)
- fields_extracted: number
- fields_missing: array of strings (field names not found)
- fields_defaulted: array of {field: string, default_used: string}
- data_quality_issues: array of {field: string, issue: string}
- confidence_per_section: object with section names as keys and confidence numbers as values
- recommended_actions_priority_order: array of strings
- privacy: {data_stored: false, retention: "none"}

Only return valid JSON, no markdown.`;

    const raw = await callClaude(prompt);
    const result = parseJSON(raw) as Record<string, unknown>;

    logger.info({ task_id }, 'Capture-structured-data complete');

    return res.json({
      success: true,
      data: {
        task_id,
        ...result,
        privacy: { data_stored: false, retention: 'none' },
        metadata: { latency_ms: Date.now() - start },
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Structured data capture failed';
    return res.status(500).json({
      success: false,
      error: { code: 'CAPTURE_STRUCTURED_DATA_FAILED', type: 'intelligence_error', message, retryable: true },
      meta: successMeta(start),
    });
  }
});

// ─── POST /screenshot-analysis ────────────────────────────────────────────────

const screenshotAnalysisSchema = Joi.object({
  screenshot_description: Joi.string().min(1).max(5000).required(),
  analysis_goal: Joi.string().min(1).max(500).required(),
  context: Joi.string().max(2000).optional(),
  extract_elements: Joi.array().items(Joi.string()).optional(),
  check_for: Joi.array().items(Joi.string()).optional(),
});

router.post('/screenshot-analysis', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = screenshotAnalysisSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: error.details[0].message },
      meta: successMeta(start),
    });
  }

  const task_id = 'sa_' + uuidv4().replace(/-/g, '').slice(0, 18);

  try {
    const prompt = `Analyze this screenshot description for the specified goal. Identify UI elements, detect issues, extract information, and suggest actions.

Screenshot description:
${value.screenshot_description}

Analysis goal: ${value.analysis_goal}

${value.context ? `Additional context: ${value.context}` : ''}
${value.extract_elements?.length ? `Elements to find: ${value.extract_elements.join(', ')}` : ''}
${value.check_for?.length ? `Check for: ${value.check_for.join(', ')}` : ''}

Return a JSON object with exactly these fields:
- analysis_result: string (overall analysis narrative)
- elements_found: array of {element_type: string, description: string, location_hint: string, actionable: boolean}
- issues_detected: array of {issue: string, severity: "critical"|"high"|"medium"|"low", recommended_fix: string}
- extracted_information: object (key-value pairs of any information extracted)
- suggested_actions: array of {action: string, priority: "high"|"medium"|"low", selector_hint: string}
- page_type: string
- confidence_per_section: object with section names as keys and confidence numbers as values
- recommended_actions_priority_order: array of strings
- privacy: {data_stored: false, retention: "none"}

Only return valid JSON, no markdown.`;

    const raw = await callClaude(prompt);
    const result = parseJSON(raw) as Record<string, unknown>;

    logger.info({ task_id, analysis_goal: value.analysis_goal }, 'Screenshot-analysis complete');

    return res.json({
      success: true,
      data: {
        task_id,
        ...result,
        privacy: { data_stored: false, retention: 'none' },
        metadata: { latency_ms: Date.now() - start },
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Screenshot analysis failed';
    return res.status(500).json({
      success: false,
      error: { code: 'SCREENSHOT_ANALYSIS_FAILED', type: 'intelligence_error', message, retryable: true },
      meta: successMeta(start),
    });
  }
});

// ─── POST /execution-gate ─────────────────────────────────────────────────────

const executionGateSchema = Joi.object({
  browser_action: Joi.string().min(1).max(1000).required(),
  page_context: Joi.string().min(1).max(5000).required(),
  risk_threshold: Joi.number().min(0).max(1).optional(),
  requires_auth: Joi.boolean().optional(),
  irreversible: Joi.boolean().optional(),
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = executionGateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: error.details[0].message },
      meta: successMeta(start),
    });
  }

  const task_id = 'eg_' + uuidv4().replace(/-/g, '').slice(0, 18);

  try {
    const prompt = `Evaluate whether this browser action is safe to execute. Check for irreversibility, authentication requirements, and potential negative outcomes.

Browser action to evaluate:
${value.browser_action}

Page context:
${value.page_context}

${value.risk_threshold !== undefined ? `Risk threshold (reject if risk_score exceeds this): ${value.risk_threshold}` : ''}
${value.requires_auth !== undefined ? `Requires authentication: ${value.requires_auth}` : ''}
${value.irreversible !== undefined ? `Caller flagged as irreversible: ${value.irreversible}` : ''}

Return a JSON object with exactly these fields:
- execute: boolean (whether this action should be allowed to proceed)
- confidence: number (0-1, confidence in this assessment)
- risk_score: number (0-1, overall risk level)
- irreversible: boolean (whether this action cannot be undone)
- blocking_flags: array of strings (specific reasons blocking execution)
- warnings: array of strings (non-blocking concerns)
- recommended_action: "proceed"|"confirm_first"|"abort"|"alternative_approach"
- safer_alternative: string or null (description of a safer way to achieve the goal)
- chain_to: array of strings (suggested follow-up actions if proceeding)
- privacy: {data_stored: false, retention: "none"}

Only return valid JSON, no markdown.`;

    const raw = await callClaude(prompt);
    const result = parseJSON(raw) as Record<string, unknown>;

    logger.info({ task_id, recommended_action: (result as Record<string, unknown>).recommended_action }, 'Execution-gate complete');

    return res.json({
      success: true,
      data: {
        task_id,
        ...result,
        privacy: { data_stored: false, retention: 'none' },
        metadata: { latency_ms: Date.now() - start },
      },
      meta: successMeta(start),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Execution gate evaluation failed';
    return res.status(500).json({
      success: false,
      error: { code: 'EXECUTION_GATE_FAILED', type: 'intelligence_error', message, retryable: true },
      meta: successMeta(start),
    });
  }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["productivity:read", "productivity:generate", "productivity:execute"];
const EXECUTION_AUTHORITY: string = "low";
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
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "generate_content", "score_quality", "apply_tone", "finalize"], meta || {});
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
