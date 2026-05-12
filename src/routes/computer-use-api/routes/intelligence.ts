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
  res.json({ name: 'Computer Use API', info: '/computer-use/info', openapi: '/computer-use/openapi.json', health: 'ok' });
});

router.post('/analyze-screen', async (req: Request, res: Response) => {
  const { screen_description, objective, app_context, os, previous_steps = [] } = req.body;
  if (!screen_description) return res.status(400).json({ error: 'screen_description is required' });
  if (!objective) return res.status(400).json({ error: 'objective is required' });
  try {
    const raw = await callClaude(`Analyze this screen state and provide intelligent next action recommendations. Identify interactive elements, current app state, and the best action to take toward the objective.

Screen description: "${screen_description}"
Objective: "${objective}"
App context: "${app_context || 'not provided'}"
OS: "${os || 'not specified'}"
Previous steps: ${JSON.stringify(previous_steps)}

Return concise JSON:
{
  "current_state": "string",
  "app_detected": "string",
  "screen_type": "dialog|form|menu|document|browser|terminal|desktop|error",
  "interactive_elements": [{ "element_type": "button|input|checkbox|dropdown|link", "label": "string", "location_hint": "string", "likely_action": "string" }],
  "recommended_next_action": { "action": "click|type|scroll|keypress|wait|screenshot", "target": "string", "value": "string or null", "reason": "string" },
  "objective_progress": "string",
  "blockers": ["string"],
  "confidence_per_section": { "screen_type": 0-1, "interactive_elements": 0-1, "recommended_next_action": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/generate-automation', async (req: Request, res: Response) => {
  const { task_description, application, os, constraints = [], user_skill_level } = req.body;
  if (!task_description) return res.status(400).json({ error: 'task_description is required' });
  if (!application) return res.status(400).json({ error: 'application is required' });
  try {
    const raw = await callClaude(`Generate a complete automation script/steps for this desktop task. Provide detailed, executable steps with error handling and validation.

Task description: "${task_description}"
Application: "${application}"
OS: "${os || 'not specified'}"
Constraints: ${JSON.stringify(constraints)}
User skill level: "${user_skill_level || 'intermediate'}"

Return concise JSON:
{
  "task_description": "string",
  "application": "string",
  "automation_steps": [{ "step_number": number, "action": "string", "target": "string", "value": "string or null", "wait_after_ms": number, "verify": "string", "error_handling": "string" }],
  "total_steps": number,
  "estimated_duration_seconds": number,
  "prerequisites": ["string"],
  "risk_assessment": "low|medium|high",
  "reversible": true|false,
  "rollback_steps": ["string"] or null,
  "confidence_per_section": { "automation_steps": 0-1, "risk_assessment": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/find-element', async (req: Request, res: Response) => {
  const { element_description, screen_context, element_type, search_area, fallback_strategies = [] } = req.body;
  if (!element_description) return res.status(400).json({ error: 'element_description is required' });
  if (!screen_context) return res.status(400).json({ error: 'screen_context is required' });
  try {
    const raw = await callClaude(`Determine how to locate this UI element on screen. Provide multiple locator strategies ranked by reliability.

Element description: "${element_description}"
Screen context: "${screen_context}"
Element type: "${element_type || 'not specified'}"
Search area: "${search_area || 'full screen'}"
Fallback strategies: ${JSON.stringify(fallback_strategies)}

Return concise JSON:
{
  "element_found": true|false,
  "locator_strategies": [{ "strategy": "text|aria_label|class|id|position|image", "locator": "string", "confidence": 0-1, "requires_scroll": true|false }],
  "element_description": "string",
  "closest_match": "string",
  "disambiguation_needed": true|false,
  "disambiguation_question": "string or null",
  "fallback_if_not_found": "string",
  "confidence_per_section": { "locator_strategies": 0-1, "element_found": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/workflow-detect', async (req: Request, res: Response) => {
  const { steps_taken, goal_context, app, outcome } = req.body;
  if (!steps_taken) return res.status(400).json({ error: 'steps_taken is required' });
  if (!goal_context) return res.status(400).json({ error: 'goal_context is required' });
  try {
    const raw = await callClaude(`Analyze this sequence of user actions to detect the underlying workflow pattern. Identify the goal, classify the workflow type, and suggest optimizations.

Steps taken: ${JSON.stringify(steps_taken.slice(0, 50))}
Goal context: "${goal_context}"
App: "${app || 'not specified'}"
Outcome: "${outcome || 'not provided'}"

Return concise JSON:
{
  "workflow_detected": "string",
  "workflow_type": "data_entry|navigation|form_filling|file_management|communication|research|custom",
  "goal_inferred": "string",
  "pattern_confidence": 0-1,
  "automation_potential": "high|medium|low",
  "optimizations": [{ "current_steps": ["string"], "optimized_steps": ["string"], "time_saved_pct": number }],
  "reusable_components": [{ "component": "string", "description": "string" }],
  "similar_workflows": ["string"],
  "confidence_per_section": { "workflow_type": 0-1, "optimizations": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/error-detect', async (req: Request, res: Response) => {
  const { screen_description, expected_state, app_context, error_history = [], severity_threshold } = req.body;
  if (!screen_description) return res.status(400).json({ error: 'screen_description is required' });
  if (!expected_state) return res.status(400).json({ error: 'expected_state is required' });
  try {
    const raw = await callClaude(`Detect UI errors, unexpected states, and anomalies by comparing current screen state to expected state. Classify errors and recommend recovery actions.

Screen description: "${screen_description}"
Expected state: "${expected_state}"
App context: "${app_context || 'not provided'}"
Error history: ${JSON.stringify(error_history)}
Severity threshold: "${severity_threshold || 'medium'}"

Return concise JSON:
{
  "error_detected": true|false,
  "error_type": "dialog|crash|freeze|unexpected_navigation|form_validation|permission|timeout|none",
  "severity": "critical|high|medium|low",
  "error_description": "string",
  "divergence_from_expected": "string",
  "recovery_actions": [{ "action": "string", "priority": "high|medium|low", "risk": "safe|caution|risky" }],
  "auto_recoverable": true|false,
  "escalation_needed": true|false,
  "confidence_per_section": { "error_type": 0-1, "recovery_actions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/accessibility-audit', async (req: Request, res: Response) => {
  const { screen_description, application, wcag_level, focus_areas = [] } = req.body;
  if (!screen_description) return res.status(400).json({ error: 'screen_description is required' });
  if (!application) return res.status(400).json({ error: 'application is required' });
  try {
    const raw = await callClaude(`Audit this application screen for accessibility issues. Identify WCAG violations, missing labels, poor contrast, keyboard traps, and screen reader issues.

Screen description: "${screen_description}"
Application: "${application}"
WCAG level: "${wcag_level || 'AA'}"
Focus areas: ${JSON.stringify(focus_areas)}

Return concise JSON:
{
  "accessibility_score": 0-100,
  "wcag_level_met": "string",
  "violations": [{ "criterion": "string", "severity": "critical|serious|moderate|minor", "description": "string", "element": "string", "fix": "string" }],
  "warnings": ["string"],
  "passing_criteria": ["string"],
  "keyboard_navigation": "good|adequate|poor",
  "screen_reader_compatibility": "good|adequate|poor",
  "color_contrast_issues": number,
  "recommendations": [{ "recommendation": "string", "impact": "high|medium|low" }],
  "confidence_per_section": { "violations": 0-1, "accessibility_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/task-planner', async (req: Request, res: Response) => {
  const { goal, current_context, available_apps = [], constraints = [], time_limit_minutes } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  if (!current_context) return res.status(400).json({ error: 'current_context is required' });
  try {
    const raw = await callClaude(`Plan a complete multi-step computer task to achieve the given goal. Break it into phases, identify required apps, and sequence actions for maximum efficiency.

Goal: "${goal}"
Current context: "${current_context}"
Available apps: ${JSON.stringify(available_apps)}
Constraints: ${JSON.stringify(constraints)}
Time limit (minutes): ${time_limit_minutes || 'none'}

Return concise JSON:
{
  "goal": "string",
  "plan_id": "string (uuid-style)",
  "phases": [{ "phase_number": number, "name": "string", "objective": "string", "steps": [{ "step": "string", "app": "string", "action_type": "string", "estimated_seconds": number }], "success_criteria": "string" }],
  "total_phases": number,
  "total_estimated_minutes": number,
  "required_apps": ["string"],
  "dependencies": [{ "phase": number, "depends_on": [number] }],
  "risk_factors": [{ "risk": "string", "mitigation": "string" }],
  "confidence_per_section": { "phases": 0-1, "risk_factors": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { desktop_action, system_context, risk_threshold, requires_admin, affects_files } = req.body;
  if (!desktop_action) return res.status(400).json({ error: 'desktop_action is required' });
  if (!system_context) return res.status(400).json({ error: 'system_context is required' });
  try {
    const raw = await callClaude(`Evaluate whether this desktop/computer action is safe to execute. Assess system impact, reversibility, and permission requirements.

Desktop action: "${desktop_action}"
System context: "${system_context}"
Risk threshold: ${risk_threshold ?? 0.7}
Requires admin: ${requires_admin ?? 'unknown'}
Affects files: ${affects_files ?? 'unknown'}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "risk_score": 0-1,
  "requires_admin": true|false,
  "affects_system_files": true|false,
  "reversible": true|false,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "recommended_action": "proceed|run_as_admin|confirm_first|sandbox_first|cancel",
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/click', async (req: Request, res: Response) => {
  const { target, screen_context } = req.body;
  if (!target) return res.status(400).json({ error: 'target is required' });
  if (!screen_context) return res.status(400).json({ error: 'screen_context is required' });
  try {
    const raw = await callClaude(`Generate precise click action instructions for this UI target. Screen context: "${screen_context.slice(0, 1000)}" Target: "${target}"

Return concise JSON:
{
  "action": "click",
  "target": "string",
  "click_type": "single|double|right",
  "locator_primary": "string",
  "locator_fallbacks": ["string"],
  "coordinates_hint": "string or null",
  "pre_click_steps": ["string"],
  "post_click_verification": "string",
  "expected_outcome": "string",
  "risk_level": "safe|caution|destructive",
  "undo_possible": true|false,
  "confidence": 0-1,
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/type', async (req: Request, res: Response) => {
  const { field_target, text, screen_context } = req.body;
  if (!field_target) return res.status(400).json({ error: 'field_target is required' });
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Generate type/input action instructions for this field. Screen context: "${screen_context || 'not provided'}" Field target: "${field_target}" Text to type: "${text.slice(0, 500)}"

Return concise JSON:
{
  "action": "type",
  "field_target": "string",
  "text": "string",
  "locator": "string",
  "clear_first": true|false,
  "type_method": "direct|clipboard_paste|slow_type",
  "pre_type_steps": ["string"],
  "post_type_verification": "string",
  "expected_field_state": "string",
  "sensitive_data": true|false,
  "confidence": 0-1,
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/keypress', async (req: Request, res: Response) => {
  const { action_goal, screen_context } = req.body;
  if (!action_goal) return res.status(400).json({ error: 'action_goal is required' });
  try {
    const raw = await callClaude(`Generate the optimal keyboard shortcut or keypress sequence to accomplish this goal. Screen context: "${screen_context || 'not provided'}" Action goal: "${action_goal}"

Return concise JSON:
{
  "action": "keypress",
  "key_sequence": ["string"],
  "shortcut_notation": "string",
  "os_variants": { "windows": "string", "mac": "string", "linux": "string" },
  "modifier_keys": ["string"],
  "hold_sequence": true|false,
  "pre_keypress_steps": ["string"],
  "post_keypress_verification": "string",
  "expected_outcome": "string",
  "alternative_method": "string",
  "confidence": 0-1,
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/open-app', async (req: Request, res: Response) => {
  const { app_name, target_state } = req.body;
  if (!app_name) return res.status(400).json({ error: 'app_name is required' });
  try {
    const raw = await callClaude(`Generate instructions to open this application and navigate to the target state. Application: "${app_name}" Target state: "${target_state || 'home/default view'}"

Return concise JSON:
{
  "app_name": "string",
  "launch_instructions": [{ "step": number, "action": "string", "method": "shortcut|taskbar|start_menu|spotlight|terminal|dock", "value": "string" }],
  "os_variants": { "windows": ["string"], "mac": ["string"], "linux": ["string"] },
  "navigation_to_target": ["string"],
  "estimated_load_time_seconds": number,
  "verify_open": "string",
  "expected_initial_screen": "string",
  "common_issues": [{ "issue": "string", "fix": "string" }],
  "confidence": 0-1,
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/run-desktop-task', async (req: Request, res: Response) => {
  const { task, app, starting_state } = req.body;
  if (!task) return res.status(400).json({ error: 'task is required' });
  if (!app) return res.status(400).json({ error: 'app is required' });
  try {
    const raw = await callClaude(`Generate a complete, executable desktop task plan. Application: "${app}" Starting state: "${starting_state || 'app closed'}" Task: "${task}"

Return concise JSON:
{
  "task_id": "string (uuid-style)",
  "task": "string",
  "app": "string",
  "total_actions": number,
  "estimated_duration_seconds": number,
  "actions": [{ "step": number, "action_type": "open_app|click|type|keypress|scroll|wait|screenshot|verify", "target": "string", "value": "string or null", "locator": "string or null", "wait_after_ms": number, "verify": "string", "on_failure": "retry|skip|abort" }],
  "success_criteria": ["string"],
  "risk_assessment": "low|medium|high",
  "reversible": true|false,
  "rollback_steps": ["string"],
  "pre_execution_checks": ["string"],
  "confidence_per_section": { "actions": 0-1, "risk": 0-1 },
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
