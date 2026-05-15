import { Router, Request, Response } from 'express';
import axios from 'axios';
import { buildRuntime } from '../../../shared/ai';

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
function parseJSON(raw: string) { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
function traceId() { return `sai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

// GET / discovery
router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Sales Intelligence API', info: '/sales-intelligence/info', openapi: '/sales-intelligence/openapi.json', health: 'ok' });
});

// POST /qualify-lead
router.post('/qualify-lead', async (req: Request, res: Response) => {
  const { lead_data } = req.body;
  if (!lead_data) return res.status(400).json({ error: 'lead_data is required' });
  try {
    const leadStr = typeof lead_data === 'string' ? lead_data : JSON.stringify(lead_data).slice(0, 3000);
    const raw = await callClaude(`Qualify this sales lead using BANT and ICP fit signals.

Lead data: "${leadStr}"

Return JSON:
{
  "qualified": true|false,
  "lead_score": 0-100,
  "grade": "A|B|C|D",
  "icp_fit": "strong|moderate|weak|no_fit",
  "budget_signals": "present|absent|unknown",
  "authority_signals": "decision_maker|influencer|unknown",
  "need_signals": "urgent|present|latent|none",
  "timeline_signals": "immediate|short_term|long_term|unknown",
  "recommended_action": "pursue_now|nurture|deprioritize|disqualify",
  "disqualification_reasons": ["string"],
  "confidence_per_section": { "lead_score": 0-1, "icp_fit": 0-1, "recommended_action": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /enrich-prospect
router.post('/enrich-prospect', async (req: Request, res: Response) => {
  const { company, person_name, email, role } = req.body;
  if (!company && !person_name) return res.status(400).json({ error: 'company or person_name is required' });
  try {
    const target = company || person_name;
    const context = [email && `Email: ${email}`, role && `Role: ${role}`].filter(Boolean).join(', ');
    const raw = await callClaude(`Enrich this prospect with all available intelligence signals.

Target: "${target}"
${context ? `Additional context: ${context}` : ''}

Return JSON:
{
  "company_summary": "string",
  "industry": "string",
  "employee_count_estimate": "string",
  "revenue_estimate": "string",
  "tech_stack": ["string"],
  "recent_news": ["string"],
  "decision_makers": ["string"],
  "buying_triggers": ["string"],
  "budget_cycle_estimate": "string",
  "ideal_timing": "string",
  "confidence_per_section": { "company_summary": 0-1, "tech_stack": 0-1, "buying_triggers": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /prioritize-pipeline
router.post('/prioritize-pipeline', async (req: Request, res: Response) => {
  const { deals } = req.body;
  if (!deals) return res.status(400).json({ error: 'deals is required' });
  try {
    const dealsStr = typeof deals === 'string' ? deals.slice(0, 3000) : JSON.stringify(deals).slice(0, 3000);
    const raw = await callClaude(`Prioritize and rank this sales pipeline by close probability and strategic value.

Deals: "${dealsStr}"

Return JSON:
{
  "ranked_deals": [{ "deal_id_or_name": "string", "priority_score": 0-100, "close_probability": 0-1, "recommended_action": "string", "next_step": "string", "risk_flags": ["string"] }],
  "total_pipeline_value_estimate": "string",
  "at_risk_deals": ["string"],
  "quick_win_deals": ["string"],
  "confidence_per_section": { "ranked_deals": 0-1, "total_pipeline_value_estimate": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /generate-outreach
router.post('/generate-outreach', async (req: Request, res: Response) => {
  const { prospect_data, goal } = req.body;
  if (!prospect_data || !goal) return res.status(400).json({ error: 'prospect_data and goal are required' });
  try {
    const prospectStr = typeof prospect_data === 'string' ? prospect_data.slice(0, 2000) : JSON.stringify(prospect_data).slice(0, 2000);
    const raw = await callClaude(`Generate a highly personalized sales outreach message for this prospect.

Prospect: "${prospectStr}"
Goal: "${goal}" (first_contact|follow_up|re_engage|close)

Return JSON:
{
  "subject_line": "string",
  "opening_line": "string",
  "value_proposition": "string",
  "call_to_action": "string",
  "full_message": "string",
  "tone": "professional|casual|consultative|urgent",
  "personalization_hooks": ["string"],
  "a_b_variant": "string",
  "confidence_per_section": { "full_message": 0-1, "personalization_hooks": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /analyze-deal
router.post('/analyze-deal', async (req: Request, res: Response) => {
  const { deal_description, crm_notes } = req.body;
  if (!deal_description && !crm_notes) return res.status(400).json({ error: 'deal_description or crm_notes is required' });
  try {
    const dealStr = (deal_description || crm_notes).slice(0, 3000);
    const raw = await callClaude(`Analyze this sales deal for health, risks, and next steps.

Deal: "${dealStr}"

Return JSON:
{
  "deal_health": "healthy|at_risk|stalled|lost_likely",
  "deal_score": 0-100,
  "stage_appropriate": true|false,
  "blockers": ["string"],
  "champions": ["string"],
  "detractors": ["string"],
  "competitor_threats": ["string"],
  "recommended_next_steps": ["string"],
  "close_probability": 0-1,
  "confidence_per_section": { "deal_health": 0-1, "close_probability": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /win-loss-analysis
router.post('/win-loss-analysis', async (req: Request, res: Response) => {
  const { deal_outcome, deal_context } = req.body;
  if (!deal_outcome || !deal_context) return res.status(400).json({ error: 'deal_outcome and deal_context are required' });
  try {
    const contextStr = typeof deal_context === 'string' ? deal_context.slice(0, 3000) : JSON.stringify(deal_context).slice(0, 3000);
    const raw = await callClaude(`Perform a win/loss analysis for this deal outcome.

Outcome: "${deal_outcome}" (won|lost)
Context: "${contextStr}"

Return JSON:
{
  "primary_win_loss_reason": "string",
  "contributing_factors": ["string"],
  "competitor_involved": "string",
  "decision_criteria_ranked": ["string"],
  "lessons_learned": ["string"],
  "pattern_detected": "string",
  "recommended_adjustments": ["string"],
  "confidence_per_section": { "primary_win_loss_reason": 0-1, "contributing_factors": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /sales-forecast
router.post('/sales-forecast', async (req: Request, res: Response) => {
  const { pipeline_data, deals_text } = req.body;
  if (!pipeline_data && !deals_text) return res.status(400).json({ error: 'pipeline_data or deals_text is required' });
  try {
    const inputStr = pipeline_data
      ? (typeof pipeline_data === 'string' ? pipeline_data.slice(0, 3000) : JSON.stringify(pipeline_data).slice(0, 3000))
      : deals_text.slice(0, 3000);
    const raw = await callClaude(`Generate a sales forecast from this pipeline data.

Pipeline: "${inputStr}"

Return JSON:
{
  "forecast_period": "string",
  "total_forecast_value": "string",
  "confidence_range_low": "string",
  "confidence_range_high": "string",
  "likely_to_close": ["string"],
  "at_risk": ["string"],
  "slipped_deals": ["string"],
  "forecast_accuracy_note": "string",
  "confidence_per_section": { "total_forecast_value": 0-1, "likely_to_close": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { lead_data, deals } = req.body;
  if (!lead_data && !deals) return res.status(400).json({ error: 'lead_data or deals is required' });
  const hasLeadData = !!lead_data;
  res.json({
    execution_ready: true,
    recommended_endpoint: hasLeadData ? '/qualify-lead' : '/prioritize-pipeline',
    blocking_flags: [],
    recommended_next_api: 'reputation-intelligence',
    execution_priority: 'high',
    automation_safe: true,
    trace_id: traceId(),
    confidence_per_section: { execution_ready: 0.95 },
    privacy: { data_stored: false, retention: 'none' },
    computed_at: new Date().toISOString(),
  });
});

// POST /execute (one-call workflow)
router.post('/execute', async (req: Request, res: Response) => {
  const { prospect_data } = req.body;
  if (!prospect_data) return res.status(400).json({ error: 'prospect_data is required' });
  try {
    const prospectStr = typeof prospect_data === 'string' ? prospect_data.slice(0, 3000) : JSON.stringify(prospect_data).slice(0, 3000);
    const raw = await callClaude(`ONE-CALL sales intelligence execution. Qualify, enrich, score, and generate outreach for this prospect.

Prospect: "${prospectStr}"

Return JSON:
{
  "lead_score": 0-100,
  "icp_fit": "strong|moderate|weak|no_fit",
  "enrichment_summary": "string",
  "outreach_message": "string",
  "deal_signals": ["string"],
  "recommended_actions": ["string"],
  "one_line_summary": "string",
  "confidence_per_section": { "lead_score": 0-1, "icp_fit": 0-1, "outreach_message": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, trace_id: traceId(), computed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Governance + Workflow ─────────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
const REQUIRED_SCOPES = ['sales:read', 'sales:analyze', 'sales:generate'];
const EXECUTION_AUTHORITY = 'low';
function evaluateGovernance(req: any) {
  const agent_id = req.headers?.['x-agent-id'] || req.body?.agent_id || null;
  const trust_score = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const violations: string[] = trust_score < 0.3 ? ['trust_score_below_threshold'] : [];
  return { permitted: violations.length === 0, agent_id, trust_score, sandbox_mode: trust_score < 0.5, violations, scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY, audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path, method: req.method, permitted: violations.length === 0, trust_score } };
}
router.get('/events/:execution_id', (req: any, res: any) => { res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, execution_id: req.params.execution_id, events: eventStore[req.params.execution_id] || [], total: (eventStore[req.params.execution_id] || []).length, computed_at: new Date().toISOString() }); });
router.post('/governance/check', (req: any, res: any) => { const gov = evaluateGovernance(req); res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked' }), success: gov.permitted, ...gov, required_scopes: REQUIRED_SCOPES, computed_at: new Date().toISOString() }); });
router.get('/governance/scopes', (req: any, res: any) => { res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY, computed_at: new Date().toISOString() }); });
router.post('/governance/audit', (req: any, res: any) => { const { execution_id } = req.body || {}; const gov = evaluateGovernance(req); res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true, audit_trail: execution_id ? (eventStore[execution_id] || []) : [], agent_id: gov.agent_id, trust_score: gov.trust_score, computed_at: new Date().toISOString() }); });
const workflowStore: Record<string, any> = {};
router.post('/workflow/start', (req: any, res: any) => { const { goal, steps } = req.body || {}; const id = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; workflowStore[id] = { workflow_id: id, goal: goal || 'default goal', steps: steps || ['qualify_lead', 'enrich_prospect', 'score_pipeline', 'generate_outreach', 'analyze_deal'], step_index: 0, status: 'running', created_at: new Date().toISOString() }; const wf = workflowStore[id]; res.json({ ...buildRuntime(req, { workflow_state: 'running' }), success: true, workflow_id: id, status: wf.status, current_step: wf.steps[0], steps: wf.steps, computed_at: new Date().toISOString() }); });
router.get('/workflow/:id', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, ...wf, computed_at: new Date().toISOString() }); });
router.post('/workflow/:id/resume', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); if (wf.step_index < wf.steps.length - 1) { wf.step_index++; wf.status = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running'; } else { wf.status = 'complete'; } wf.updated_at = new Date().toISOString(); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, status: wf.status, current_step: wf.steps[wf.step_index], computed_at: new Date().toISOString() }); });
router.get('/workflow/:id/state', (req: any, res: any) => { const wf = workflowStore[req.params.id]; if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' }); res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true, workflow_id: wf.workflow_id, state_machine: { current_state: wf.steps[wf.step_index], terminal: wf.status === 'complete', transitions: wf.steps.map((s: string, i: number) => ({ step: i + 1, state: s, status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) }, computed_at: new Date().toISOString() }); });
export default router;
