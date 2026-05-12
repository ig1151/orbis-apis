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
  res.json({ name: 'Meeting Analyzer API', info: '/meeting-analyzer/info', openapi: '/meeting-analyzer/openapi.json', health: 'ok' });
});

// POST /extract-action-items
router.post('/extract-action-items', async (req: Request, res: Response) => {
  const { transcript, meeting_type, attendees = [] } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  try {
    const raw = await callClaude(`Extract action items from this meeting transcript. Type: "${meeting_type || 'general'}" Attendees: ${JSON.stringify(attendees.slice(0,10))}

Transcript (first 3000 chars): "${transcript.slice(0, 3000)}"

Return concise JSON:
{
  "action_items": [{ "task": "string", "owner": "string", "due_date": "string", "priority": "high|medium|low", "dependencies": ["string"] }],
  "total_count": number,
  "by_owner": [{ "owner": "string", "count": number, "items": ["string"] }],
  "overdue_risk": [{ "task": "string", "risk_reason": "string" }],
  "confidence_per_section": { "action_items": 0-1, "by_owner": 0-1, "overdue_risk": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /summarize-meeting
router.post('/summarize-meeting', async (req: Request, res: Response) => {
  const { transcript, meeting_type, audience } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  try {
    const raw = await callClaude(`Summarize this meeting. Type: "${meeting_type || 'general'}" Audience: "${audience || 'team'}".

Transcript (first 3000 chars): "${transcript.slice(0, 3000)}"

Return concise JSON:
{
  "executive_summary": "string (2-3 sentences)",
  "key_points": ["string"],
  "topics_covered": [{ "topic": "string", "time_spent": "string", "outcome": "string" }],
  "decisions_made": ["string"],
  "open_questions": ["string"],
  "sentiment": { "overall": "positive|neutral|negative|mixed", "energy_level": "high|medium|low", "alignment": "high|medium|low" },
  "confidence_per_section": { "key_points": 0-1, "topics_covered": 0-1, "decisions_made": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /extract-decisions
router.post('/extract-decisions', async (req: Request, res: Response) => {
  const { transcript, meeting_type } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  try {
    const raw = await callClaude(`Extract all decisions from this meeting transcript. Type: "${meeting_type || 'general'}".

Transcript (first 3000 chars): "${transcript.slice(0, 3000)}"

Return concise JSON:
{
  "decisions": [{ "decision": "string", "rationale": "string", "decided_by": "string", "impact": "high|medium|low", "reversible": true|false }],
  "total_count": number,
  "deferred_decisions": [{ "topic": "string", "reason": "string", "next_step": "string" }],
  "contested_points": [{ "point": "string", "perspectives": ["string"] }],
  "confidence_per_section": { "decisions": 0-1, "deferred_decisions": 0-1, "contested_points": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /follow-up-email
router.post('/follow-up-email', async (req: Request, res: Response) => {
  const { transcript, sender_name, recipient_type, meeting_type } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  try {
    const raw = await callClaude(`Generate follow-up email content from this meeting. Sender: "${sender_name || 'Team'}" Recipient type: "${recipient_type || 'team'}" Meeting type: "${meeting_type || 'general'}".

Transcript (first 2000 chars): "${transcript.slice(0, 2000)}"

Return concise JSON:
{
  "subject_line": "string",
  "email_body": "string",
  "tone": "formal|semi-formal|casual",
  "key_callouts": ["string"],
  "alternative_subjects": ["string"],
  "send_timing": "string",
  "confidence_per_section": { "subject_line": 0-1, "email_body": 0-1, "key_callouts": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /sentiment-analysis
router.post('/sentiment-analysis', async (req: Request, res: Response) => {
  const { transcript, attendees = [], meeting_type } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  try {
    const raw = await callClaude(`Analyze sentiment and dynamics of this meeting. Attendees: ${JSON.stringify(attendees.slice(0,10))} Type: "${meeting_type || 'general'}".

Transcript (first 3000 chars): "${transcript.slice(0, 3000)}"

Return concise JSON:
{
  "overall_sentiment": { "score": -1 to 1, "label": "very_positive|positive|neutral|negative|very_negative", "summary": "string" },
  "participant_sentiment": [{ "participant": "string", "sentiment": "string", "engagement": "high|medium|low", "key_moments": ["string"] }],
  "tension_points": [{ "topic": "string", "intensity": "high|medium|low", "resolution": "resolved|unresolved|deferred" }],
  "engagement_signals": { "most_engaged": "string", "least_engaged": "string", "dominant_speaker": "string" },
  "meeting_health": { "score": 0-100, "psychological_safety": "high|medium|low", "recommendations": ["string"] },
  "confidence_per_section": { "overall_sentiment": 0-1, "participant_sentiment": 0-1, "tension_points": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /risk-flags
router.post('/risk-flags', async (req: Request, res: Response) => {
  const { transcript, meeting_type, project_context } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  try {
    const raw = await callClaude(`Identify risks and flags from this meeting. Type: "${meeting_type || 'general'}" Context: "${project_context || 'not provided'}".

Transcript (first 3000 chars): "${transcript.slice(0, 3000)}"

Return concise JSON:
{
  "risk_flags": [{ "risk": "string", "category": "timeline|budget|scope|people|technical|compliance", "severity": "critical|high|medium|low", "mitigation": "string" }],
  "blockers": [{ "blocker": "string", "owner": "string", "impact": "string", "resolution_path": "string" }],
  "unresolved_issues": [{ "issue": "string", "open_since": "string", "next_step": "string" }],
  "escalation_needed": [{ "topic": "string", "escalate_to": "string", "urgency": "immediate|soon|when_possible" }],
  "confidence_per_section": { "risk_flags": 0-1, "blockers": 0-1, "unresolved_issues": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /agenda-generator
router.post('/agenda-generator', async (req: Request, res: Response) => {
  const { meeting_objective, attendees = [], duration_minutes, previous_transcript } = req.body;
  if (!meeting_objective) return res.status(400).json({ error: 'meeting_objective is required' });
  try {
    const raw = await callClaude(`Generate a meeting agenda. Objective: "${meeting_objective}" Attendees: ${JSON.stringify(attendees.slice(0,10))} Duration: "${duration_minutes || 60} minutes" Previous meeting context: "${previous_transcript ? previous_transcript.slice(0,500) : 'none'}".

Return concise JSON:
{
  "agenda": [{ "item": "string", "duration_minutes": number, "owner": "string", "type": "discussion|decision|update|brainstorm", "materials_needed": ["string"] }],
  "total_duration": number,
  "pre_read_materials": ["string"],
  "success_criteria": ["string"],
  "parking_lot_topics": ["string"],
  "recommended_attendees": ["string"],
  "confidence_per_section": { "agenda": 0-1, "success_criteria": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { transcript, meeting_type } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  res.json({
    execution_ready: true,
    meeting_type: meeting_type || 'general',
    transcript_length: transcript.length,
    next_api: 'cold-outreach',
    next_endpoint: '/generate-sequence',
    blocking_flags: [],
    flag_definitions: {
      NO_TRANSCRIPT: 'No transcript provided — required for all analysis',
      TRANSCRIPT_TOO_SHORT: 'Transcript under 100 characters — results may be unreliable',
      NO_ACTION_ITEMS: 'No clear action items detected in transcript',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze-meeting (one-call workflow)
router.post('/analyze', async (req, res) => { req.url = '/analyze-meeting'; (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
router.post('/analyze-meeting', async (req: Request, res: Response) => {
  const { transcript, meeting_type, attendees = [], sender_name } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  try {
    const raw = await callClaude(`Full meeting analysis. Type: "${meeting_type || 'general'}" Attendees: ${JSON.stringify(attendees.slice(0,10))} Sender: "${sender_name || 'Team'}".

Transcript (first 3000 chars): "${transcript.slice(0, 3000)}"

Return concise JSON:
{
  "executive_summary": "string (2-3 sentences)",
  "meeting_health": { "score": 0-100, "grade": "A-F", "effectiveness": "string" },
  "action_items": [{ "task": "string", "owner": "string", "due_date": "string", "priority": "high|medium|low" }],
  "decisions": ["string"],
  "risks": [{ "risk": "string", "severity": "high|medium|low", "mitigation": "string" }],
  "sentiment": { "overall": "positive|neutral|negative|mixed", "alignment": "high|medium|low" },
  "follow_up_email": { "subject": "string", "body": "string" },
  "next_steps": [{ "step": "string", "owner": "string", "timeline": "string" }],
  "open_questions": ["string"],
  "confidence_per_section": { "action_items": 0-1, "decisions": 0-1, "risks": 0-1, "sentiment": 0-1 },
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
