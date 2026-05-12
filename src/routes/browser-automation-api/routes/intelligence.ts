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

function parseJSON(raw: string) { const cleaned = raw.replace(/```json|```/g, "").trim(); const match = cleaned.match(/\{[\s\S]*\}/); if (!match) throw new Error("No JSON found"); return JSON.parse(match[0]); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Browser Automation API', slug: 'browser-automation', version: '1.0.0', endpoints: ['/open','/click','/type','/extract','/upload','/download','/wait','/screenshot','/session','/run-workflow','/execution-gate','/replan-workflow','/evaluate-state','/resume-workflow'], docs: '/browser-automation/info', openapi: '/browser-automation/openapi.json', mcp_compatible: true });
});

router.post('/open', async (req: Request, res: Response) => {
  const { url, session_id, browser_context, wait_for, proxy } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  try {
    const raw = await callClaude(`Generate browser session open instructions for this URL. Plan viewport configuration, load strategy, initial state capture, and session initialization steps.
URL: "${url}" Session ID: "${session_id}" Browser context: ${JSON.stringify(browser_context || {})} Wait for: "${wait_for || 'load'}" Proxy: "${proxy || 'none'}"

Return concise JSON:
{
  "session_id": "string",
  "url": "string",
  "status": "opened|failed|redirected",
  "final_url": "string",
  "page_title": "string",
  "load_strategy": "string",
  "initial_state": { "dom_ready": true|false, "scripts_loaded": true|false, "network_idle": true|false },
  "session_config": { "viewport": "string", "user_agent": "string", "cookies_enabled": true|false },
  "estimated_load_ms": number,
  "next_recommended_action": "string",
  "confidence_per_section": { "initial_state": 0-1, "session_config": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/click', async (req: Request, res: Response) => {
  const { session_id, target, click_type, wait_after_ms, verify_navigation } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!target) return res.status(400).json({ error: 'target is required' });
  try {
    const raw = await callClaude(`Generate precise browser click instructions for this target element. Provide multiple selector strategies, handle overlays/modals, and predict post-click state.
Session ID: "${session_id}" Target: "${target}" Click type: "${click_type || 'single'}" Wait after ms: ${wait_after_ms || 0} Verify navigation: ${verify_navigation || false}

Return concise JSON:
{
  "session_id": "string",
  "target": "string",
  "click_type": "single|double|right",
  "selector_strategies": [{ "strategy": "css|xpath|text|aria", "selector": "string", "confidence": 0-1 }],
  "pre_click_checks": ["string"],
  "post_click_state": { "navigation_expected": true|false, "modal_expected": true|false, "dom_change_expected": true|false },
  "wait_recommendation": "string",
  "fallback_action": "string",
  "risk": "safe|caution|destructive",
  "confidence_per_section": { "selector_strategies": 0-1, "post_click_state": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/type', async (req: Request, res: Response) => {
  const { session_id, target, text, clear_first, humanlike_delay, submit_after } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!target) return res.status(400).json({ error: 'target is required' });
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Generate browser typing instructions for this field. Handle special characters, form validation, autofill prevention, and humanlike timing.
Session ID: "${session_id}" Target: "${target}" Text length: ${text.length} Clear first: ${clear_first || false} Humanlike delay: ${humanlike_delay || false} Submit after: ${submit_after || false}
Text preview: "${text.slice(0, 200)}"

Return concise JSON:
{
  "session_id": "string",
  "target": "string",
  "text_length": number,
  "selector": "string",
  "clear_first": true|false,
  "typing_method": "direct|clipboard|chunk",
  "chunk_size": number,
  "delay_between_chars_ms": number,
  "special_chars_handling": ["string"],
  "validation_triggers": ["string"],
  "submit_instruction": "string or null",
  "confidence_per_section": { "selector": 0-1, "timing": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/extract', async (req: Request, res: Response) => {
  const { session_id, extraction_goal, scope, output_format, target_element } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!extraction_goal) return res.status(400).json({ error: 'extraction_goal is required' });
  try {
    const raw = await callClaude(`Generate DOM extraction instructions for this goal. Identify relevant selectors, handle pagination, dynamic content, and structure the extraction schema.
Session ID: "${session_id}" Goal: "${extraction_goal}" Scope: "${scope || 'full_page'}" Output format: "${output_format || 'json'}" Target element: "${target_element || 'not specified'}"

Return concise JSON:
{
  "session_id": "string",
  "extraction_goal": "string",
  "extraction_strategy": "string",
  "target_selectors": [{ "label": "string", "selector": "string", "type": "text|attribute|html|list" }],
  "schema": {},
  "pagination_handling": { "detected": true|false, "strategy": "string" },
  "dynamic_content_wait": "string",
  "output_format": "json|markdown|text|table",
  "estimated_records": "string",
  "confidence_per_section": { "target_selectors": 0-1, "schema": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/upload', async (req: Request, res: Response) => {
  const { session_id, file_field, file_description, file_type, file_size_mb, multi_file } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!file_field) return res.status(400).json({ error: 'file_field is required' });
  if (!file_description) return res.status(400).json({ error: 'file_description is required' });
  try {
    const raw = await callClaude(`Generate file upload instructions for this browser session. Handle file input activation, drag-and-drop fallbacks, progress monitoring, and upload confirmation.
Session ID: "${session_id}" File field: "${file_field}" File description: "${file_description}" File type: "${file_type || 'unknown'}" File size MB: ${file_size_mb || 'unknown'} Multi-file: ${multi_file || false}

Return concise JSON:
{
  "session_id": "string",
  "file_field": "string",
  "upload_method": "input_click|drag_drop|api",
  "file_input_selector": "string",
  "activation_steps": ["string"],
  "progress_monitor": { "selector": "string", "check_interval_ms": number },
  "confirmation_check": "string",
  "size_limit_handling": "string",
  "error_recovery": ["string"],
  "confidence_per_section": { "upload_method": 0-1, "progress_monitor": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/download', async (req: Request, res: Response) => {
  const { session_id, download_trigger, expected_file_type, wait_timeout_ms, save_path } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!download_trigger) return res.status(400).json({ error: 'download_trigger is required' });
  try {
    const raw = await callClaude(`Generate file download instructions. Handle download triggers, intercept download events, monitor progress, and verify file integrity.
Session ID: "${session_id}" Download trigger: "${download_trigger}" Expected file type: "${expected_file_type || 'unknown'}" Wait timeout ms: ${wait_timeout_ms || 30000} Save path: "${save_path || 'default'}"

Return concise JSON:
{
  "session_id": "string",
  "trigger_selector": "string",
  "download_method": "click|api_intercept|direct_url",
  "pre_download_steps": ["string"],
  "intercept_config": { "event": "string", "timeout_ms": number },
  "progress_check": "string",
  "completion_verification": "string",
  "expected_filename_pattern": "string",
  "fallback_strategy": "string",
  "confidence_per_section": { "trigger_selector": 0-1, "intercept_config": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/wait', async (req: Request, res: Response) => {
  const { session_id, wait_for, timeout_ms, poll_interval_ms, condition_type } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!wait_for) return res.status(400).json({ error: 'wait_for is required' });
  try {
    const raw = await callClaude(`Generate intelligent wait instructions for this browser condition. Determine the best wait strategy, selector, timeout, and fallback.
Session ID: "${session_id}" Wait for: "${wait_for}" Timeout ms: ${timeout_ms || 10000} Poll interval ms: ${poll_interval_ms || 500} Condition type: "${condition_type || 'element'}"

Return concise JSON:
{
  "session_id": "string",
  "wait_strategy": "element_visible|element_hidden|text_present|network_idle|custom_condition",
  "condition_selector": "string or null",
  "timeout_ms": number,
  "poll_interval_ms": number,
  "condition_check": "string",
  "on_timeout": "retry|skip|abort",
  "alternative_conditions": ["string"],
  "estimated_wait_ms": number,
  "confidence_per_section": { "wait_strategy": 0-1, "condition_check": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/screenshot', async (req: Request, res: Response) => {
  const { session_id, scope, element_selector, analyze, highlight_elements } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  try {
    const raw = await callClaude(`Generate screenshot capture and analysis instructions. Determine capture scope, identify key elements in the captured state, and extract actionable insights.
Session ID: "${session_id}" Scope: "${scope || 'viewport'}" Element selector: "${element_selector || 'not specified'}" Analyze: ${analyze || false} Highlight elements: ${JSON.stringify(highlight_elements || [])}

Return concise JSON:
{
  "session_id": "string",
  "capture_scope": "full_page|viewport|element",
  "capture_instructions": ["string"],
  "visual_analysis": {
    "page_type": "string",
    "key_elements": [{ "element": "string", "location_hint": "string", "actionable": true|false }],
    "errors_visible": ["string"],
    "forms_detected": number,
    "navigation_detected": true|false
  },
  "state_assessment": "string",
  "recommended_next_action": "string",
  "anomalies": ["string"],
  "confidence_per_section": { "visual_analysis": 0-1, "state_assessment": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/session', async (req: Request, res: Response) => {
  const { action, session_id, session_name, context, ttl_minutes } = req.body;
  if (!action) return res.status(400).json({ error: 'action is required' });
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  try {
    const raw = await callClaude(`Generate browser session management instructions. Handle session creation, state persistence, authentication preservation, and cleanup.
Action: "${action}" Session ID: "${session_id}" Session name: "${session_name || 'unnamed'}" TTL minutes: ${ttl_minutes || 60} Context keys: ${JSON.stringify(Object.keys(context || {}))}

Return concise JSON:
{
  "action": "create|persist|restore|close|list",
  "session_id": "string",
  "session_status": "active|persisted|restored|closed",
  "auth_preserved": true|false,
  "cookies_count": number,
  "storage_keys_count": number,
  "session_age_minutes": number,
  "ttl_remaining_minutes": number,
  "persistence_method": "in_memory|serialized|token",
  "restore_instructions": ["string"],
  "cleanup_steps": ["string"],
  "confidence_per_section": { "session_status": 0-1, "persistence_method": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/run-workflow', async (req: Request, res: Response) => {
  const { workflow, session_id, goal, on_error, timeout_ms, checkpoint_after_steps } = req.body;
  if (!workflow) return res.status(400).json({ error: 'workflow is required' });
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  try {
    const raw = await callClaude(`Generate a complete browser workflow execution plan. Validate step sequence, identify dependencies, add verification points, and create rollback instructions.
Session ID: "${session_id}" Goal: "${goal}" On error: "${on_error || 'abort'}" Timeout ms: ${timeout_ms || 60000} Checkpoint after steps: ${checkpoint_after_steps || 5}
Workflow steps (${workflow.length} total): ${JSON.stringify(workflow.slice(0, 20))}

Return concise JSON:
{
  "trace_id": "string (uuid-style)",
  "workflow_id": "string (uuid-style)",
  "session_id": "string",
  "goal": "string",
  "total_steps": number,
  "estimated_duration_ms": number,
  "validated_steps": [{ "step": number, "action": "string", "selector": "string", "value": "string", "verification": "string", "on_failure": "string" }],
  "checkpoints": [{ "after_step": number, "state_check": "string" }],
  "risk_assessment": "low|medium|high",
  "rollback_steps": ["string"],
  "success_criteria": ["string"],
  "confidence_per_section": { "validated_steps": 0-1, "risk_assessment": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


router.post('/execution-gate', async (req: Request, res: Response) => {
  const { browser_action, action_context, risk_threshold, require_human_approval } = req.body;
  if (!browser_action) return res.status(400).json({ error: 'browser_action is required' });
  if (!action_context) return res.status(400).json({ error: 'action_context is required' });
  try {
    const raw = await callClaude(`Gate autonomous browser action execution. Assess risk, check if action is destructive, financial, or security-sensitive, and determine if human approval is needed.
Browser action: "${browser_action}" Risk threshold: ${risk_threshold ?? 0.7} Require human approval: ${require_human_approval ?? false} Action context: ${JSON.stringify(action_context)}

Return concise JSON:
{
  "execute": true,
  "confidence": 0.9,
  "risk_score": 0.2,
  "risk_level": "low|medium|high",
  "destructive_action": false,
  "credential_interaction": false,
  "financial_interaction": false,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "human_approval_required": false,
  "recommended_action": "proceed|require_approval|block",
  "safe_to_execute": true,
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/replan-workflow', async (req: Request, res: Response) => {
  const { session_id, original_workflow, failed_step, failure_reason, goal } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!failed_step) return res.status(400).json({ error: 'failed_step is required' });
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  try {
    const raw = await callClaude(`Autonomously replan a browser workflow after a step failure. Inspect the failure, generate an alternative strategy, and produce a modified workflow that continues toward the original goal.
Session ID: "${session_id}" Goal: "${goal}" Failed step: ${JSON.stringify(failed_step)} Failure reason: "${failure_reason || 'unknown'}" Original workflow length: ${original_workflow?.length || 'unknown'}

Return concise JSON:
{
  "trace_id": "string (uuid-style)",
  "workflow_id": "string (uuid-style)",
  "session_id": "string",
  "goal": "string",
  "failure_analysis": { "root_cause": "string", "failure_type": "selector_missing|timeout|navigation|auth|captcha|other", "recoverable": true },
  "alternative_strategy": "string",
  "modified_workflow": [{ "step": 1, "action": "string", "target": "string", "value": "string", "verification": "string" }],
  "steps_skipped": [1],
  "steps_added": [1],
  "confidence": 0.85,
  "loop_decision": "replan_and_continue|retry_original|escalate|abort",
  "estimated_success_rate": 0.85,
  "rollback_steps": ["string"],
  "confidence_per_section": { "failure_analysis": 0.9, "modified_workflow": 0.85 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/evaluate-state', async (req: Request, res: Response) => {
  const { session_id, goal, current_state, completed_steps, expected_state } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  if (!current_state) return res.status(400).json({ error: 'current_state is required' });
  try {
    const raw = await callClaude(`Evaluate current browser state against the agent goal. Determine if the goal is achieved, partially achieved, or failed, and return a loop-continuation decision.
Session ID: "${session_id}" Goal: "${goal}" Current state: ${JSON.stringify(current_state)} Completed steps: ${completed_steps || 'unknown'} Expected state: ${JSON.stringify(expected_state || {})}

Return concise JSON:
{
  "trace_id": "string (uuid-style)",
  "session_id": "string",
  "goal": "string",
  "goal_achieved": false,
  "achievement_score": 0.7,
  "state_match": { "matched": ["string"], "missing": ["string"], "unexpected": ["string"] },
  "blockers": ["string"],
  "loop_decision": "continue|goal_achieved|replan|retry|escalate|abort",
  "next_recommended_action": "string",
  "steps_remaining_estimate": 2,
  "confidence_per_section": { "goal_assessment": 0.9, "state_match": 0.85 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/resume-workflow', async (req: Request, res: Response) => {
  const { session_id, workflow_id, checkpoint, remaining_steps, goal } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  if (!workflow_id) return res.status(400).json({ error: 'workflow_id is required' });
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  try {
    const raw = await callClaude(`Resume a paused or interrupted browser workflow from a checkpoint. Validate session state, restore context, and generate continuation instructions.
Session ID: "${session_id}" Workflow ID: "${workflow_id}" Goal: "${goal}" Checkpoint: ${JSON.stringify(checkpoint || {})} Remaining steps: ${remaining_steps || 'unknown'}

Return concise JSON:
{
  "session_id": "string",
  "workflow_id": "string",
  "goal": "string",
  "resume_viable": true,
  "session_valid": true,
  "context_restored": true,
  "resume_from_step": 3,
  "state_validation": { "checks": ["string"], "passed": true, "warnings": ["string"] },
  "continuation_steps": [{ "step": 1, "action": "string", "target": "string", "verification": "string" }],
  "estimated_completion_ms": 5000,
  "loop_decision": "resume|replan|restart|abort",
  "confidence_per_section": { "session_validation": 0.9, "continuation": 0.85 },
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
