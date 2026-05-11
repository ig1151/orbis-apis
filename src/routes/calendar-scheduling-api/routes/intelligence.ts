import { Router, Request, Response } from 'express';
import axios from 'axios';

// ── Universal Runtime Envelope ────────────────────────────────────────────────
function buildRuntime(req: any, overrides: Record<string, any> = {}) {
  const now          = Date.now();
  const trace_id     = req.headers?.['x-trace-id']     || `trace_${now}_${Math.random().toString(36).slice(2,8)}`;
  const execution_id = req.headers?.['x-execution-id'] || `exec_${now}_${Math.random().toString(36).slice(2,8)}`;
  const session_id   = req.body?.session_id || req.query?.session_id || req.headers?.['x-session-id'] || `session_${now}`;
  const request_id   = `req_${now}_${Math.random().toString(36).slice(2,8)}`;
  const unit         = 0.005;
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
  res.json({ name: 'Calendar Scheduling API', info: '/calendar-scheduling/info', openapi: '/calendar-scheduling/openapi.json', health: 'ok' });
});

router.post('/find-slots', async (req: Request, res: Response) => {
  const { attendees, duration_minutes, date_range, timezone, preferences } = req.body;
  if (!attendees) return res.status(400).json({ error: 'attendees is required' });
  if (!duration_minutes) return res.status(400).json({ error: 'duration_minutes is required' });
  if (!date_range) return res.status(400).json({ error: 'date_range is required' });
  try {
    const raw = await callClaude(`Find optimal meeting slots for given attendees and constraints. Attendees: ${JSON.stringify(attendees)} Duration: ${duration_minutes} minutes. Date range: ${JSON.stringify(date_range)}. Timezone: "${timezone || 'UTC'}". Preferences: ${JSON.stringify(preferences || {})}.

Return concise JSON:
{
  "slots": [{ "start": "string", "end": "string", "timezone": "string", "score": 0-100, "conflicts": ["string"], "attendee_availability": "all|partial" }],
  "best_slot": { "start": "string", "end": "string", "timezone": "string", "score": 0-100, "reason": "string" },
  "availability_summary": [{ "attendee": "string", "available_windows": ["string"], "busy_signals": ["string"] }],
  "timezone_analysis": { "primary_tz": "string", "conflicts": ["string"], "recommendation": "string" },
  "total_slots_found": number,
  "confidence_per_section": { "slots": 0-1, "best_slot": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/schedule-meeting', async (req: Request, res: Response) => {
  const { title, attendees, start_time, duration_minutes, timezone, location, agenda, meeting_type } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!attendees) return res.status(400).json({ error: 'attendees is required' });
  if (!start_time) return res.status(400).json({ error: 'start_time is required' });
  if (!duration_minutes) return res.status(400).json({ error: 'duration_minutes is required' });
  if (!timezone) return res.status(400).json({ error: 'timezone is required' });
  try {
    const raw = await callClaude(`Schedule a meeting with confirmation and logistics. Title: "${title}" Attendees: ${JSON.stringify(attendees)} Start: "${start_time}" Duration: ${duration_minutes} minutes. Timezone: "${timezone}". Location: "${location || 'TBD'}". Agenda: ${JSON.stringify(agenda || [])}. Type: "${meeting_type || 'general'}".

Return concise JSON:
{
  "meeting_id": "string",
  "title": "string",
  "attendees": ["string"],
  "start_time": "string",
  "end_time": "string",
  "duration_minutes": number,
  "timezone": "string",
  "location": "string",
  "calendar_links": { "google": "string", "outlook": "string", "ics": "string" },
  "invite_subject": "string",
  "invite_body": "string",
  "pre_meeting_checklist": ["string"],
  "agenda_structured": [{ "item": "string", "owner": "string", "duration_minutes": number }],
  "conflict_warnings": ["string"],
  "confirmation_status": { "all_confirmed": true|false, "pending": ["string"] },
  "confidence_per_section": { "calendar_links": 0-1, "agenda_structured": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/reschedule', async (req: Request, res: Response) => {
  const { meeting_id, original_time, reason, attendees, duration_minutes, timezone, preferred_dates } = req.body;
  if (!meeting_id) return res.status(400).json({ error: 'meeting_id is required' });
  if (!original_time) return res.status(400).json({ error: 'original_time is required' });
  if (!reason) return res.status(400).json({ error: 'reason is required' });
  if (!attendees) return res.status(400).json({ error: 'attendees is required' });
  if (!duration_minutes) return res.status(400).json({ error: 'duration_minutes is required' });
  if (!timezone) return res.status(400).json({ error: 'timezone is required' });
  try {
    const raw = await callClaude(`Reschedule a meeting with conflict resolution. Meeting ID: "${meeting_id}" Original time: "${original_time}" Reason: "${reason}" Attendees: ${JSON.stringify(attendees)} Duration: ${duration_minutes} minutes. Timezone: "${timezone}". Preferred dates: ${JSON.stringify(preferred_dates || [])}.

Return concise JSON:
{
  "meeting_id": "string",
  "reschedule_approved": true|false,
  "new_suggested_slot": { "start": "string", "end": "string", "timezone": "string", "score": 0-100 },
  "alternative_slots": [{ "start": "string", "end": "string", "score": 0-100 }],
  "reschedule_message": "string",
  "impact_analysis": { "urgency": "high|medium|low", "stakeholder_impact": "string", "cost_of_delay": "string" },
  "notification_templates": { "email_subject": "string", "email_body": "string", "slack_message": "string" },
  "confidence_per_section": { "new_suggested_slot": 0-1, "impact_analysis": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/timezone-optimizer', async (req: Request, res: Response) => {
  const { attendees, duration_minutes, preferred_hours } = req.body;
  if (!attendees) return res.status(400).json({ error: 'attendees is required' });
  if (!duration_minutes) return res.status(400).json({ error: 'duration_minutes is required' });
  try {
    const raw = await callClaude(`Optimize meeting time across multiple timezones. Attendees: ${JSON.stringify(attendees)} Duration: ${duration_minutes} minutes. Preferred hours: ${JSON.stringify(preferred_hours || { start: 9, end: 17 })}.

Return concise JSON:
{
  "optimal_utc_window": { "start": "string", "end": "string" },
  "per_timezone_impact": [{ "timezone": "string", "local_time": "string", "working_hours": true|false, "score": 0-100 }],
  "fairness_score": 0-100,
  "best_days_of_week": ["string"],
  "rotation_schedule": [{ "week": number, "time_utc": "string", "burden_on": "string" }],
  "cultural_notes": [{ "timezone": "string", "note": "string" }],
  "confidence_per_section": { "optimal_window": 0-1, "fairness": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/availability-intelligence', async (req: Request, res: Response) => {
  const { calendar_data, analysis_period_days, patterns_to_detect } = req.body;
  if (!calendar_data) return res.status(400).json({ error: 'calendar_data is required' });
  try {
    const raw = await callClaude(`Analyze calendar patterns and predict optimal availability. Calendar data: ${JSON.stringify(calendar_data)} Analysis period: ${analysis_period_days || 30} days. Patterns to detect: ${JSON.stringify(patterns_to_detect || [])}.

Return concise JSON:
{
  "availability_score": 0-100,
  "peak_focus_windows": [{ "day": "string", "start": "string", "end": "string", "quality": "deep|light|admin" }],
  "meeting_density": { "current": "high|medium|low", "optimal": "string", "overloaded_days": ["string"] },
  "patterns": [{ "pattern": "string", "frequency": "string", "impact": "positive|negative" }],
  "recommendations": [{ "action": "string", "expected_gain": "string", "effort": "low|medium|high" }],
  "burnout_risk": { "score": 0-1, "signals": ["string"] },
  "optimal_meeting_days": ["string"],
  "confidence_per_section": { "patterns": 0-1, "burnout_risk": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/meeting-priority', async (req: Request, res: Response) => {
  const { meetings, scoring_criteria } = req.body;
  if (!meetings) return res.status(400).json({ error: 'meetings is required' });
  try {
    const raw = await callClaude(`Score and prioritize meeting requests. Meetings: ${JSON.stringify(meetings)} Scoring criteria: ${JSON.stringify(scoring_criteria || {})}.

Return concise JSON:
{
  "prioritized_meetings": [{ "id": "string", "title": "string", "priority_score": 0-100, "tier": "must_attend|high|medium|optional|decline", "reason": "string" }],
  "decline_candidates": [{ "id": "string", "reason": "string", "alternative": "string" }],
  "time_roi_analysis": { "total_hours": number, "high_value_hours": number, "recoverable_hours": number },
  "delegation_opportunities": [{ "meeting_id": "string", "delegate_to": "string", "reason": "string" }],
  "schedule_health": { "score": number, "issues": ["string"], "quick_wins": ["string"] },
  "confidence_per_section": { "prioritized_meetings": 0-1, "time_roi": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { scheduling_context, intended_action, attendees, time_constraints } = req.body;
  if (!scheduling_context) return res.status(400).json({ error: 'scheduling_context is required' });
  if (!intended_action) return res.status(400).json({ error: 'intended_action is required' });
  try {
    const raw = await callClaude(`Gate calendar scheduling execution. Context: ${JSON.stringify(scheduling_context)} Intended action: "${intended_action}" Attendees: ${JSON.stringify(attendees || [])}. Time constraints: ${JSON.stringify(time_constraints || {})}.

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "risk_score": 0-1,
  "recommended_action": "string",
  "chain_to": ["string"],
  "scheduling_viability": "high|medium|low",
  "retry_after": "string or null",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/schedule-workflow', async (req: Request, res: Response) => {
  const { goal, attendees, context, duration_minutes, timezone, urgency } = req.body;
  if (!goal) return res.status(400).json({ error: 'goal is required' });
  if (!attendees) return res.status(400).json({ error: 'attendees is required' });
  try {
    const raw = await callClaude(`Full calendar scheduling workflow. Goal: "${goal}" Attendees: ${JSON.stringify(attendees)} Context: "${context || 'none'}" Duration: ${duration_minutes || 60} minutes. Timezone: "${timezone || 'UTC'}". Urgency: "${urgency || 'normal'}".

Return concise JSON:
{
  "workflow_id": "string",
  "goal": "string",
  "optimal_slot": { "start": "string", "end": "string", "timezone": "string", "score": 0-100 },
  "alternative_slots": [{ "start": "string", "end": "string", "score": 0-100 }],
  "meeting_details": { "title": "string", "agenda": ["string"], "invite_body": "string", "pre_meeting_checklist": ["string"] },
  "attendee_analysis": [{ "attendee": "string", "availability": "high|medium|low", "priority_rank": number }],
  "scheduling_risk": { "score": 0-1, "factors": ["string"] },
  "execution_summary": { "actions_taken": ["string"], "next_steps": ["string"], "estimated_scheduling_time": "string" },
  "confidence_per_section": { "optimal_slot": 0-1, "attendee_analysis": 0-1 },
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
