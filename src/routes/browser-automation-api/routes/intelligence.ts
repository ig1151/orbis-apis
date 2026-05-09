import { Router, Request, Response } from 'express';
import axios from 'axios';

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
  res.json({ name: 'Browser Automation API', info: '/browser-automation/info', openapi: '/browser-automation/openapi.json', health: 'ok' });
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

export default router;
