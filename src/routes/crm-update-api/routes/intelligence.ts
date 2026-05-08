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
  res.json({ name: 'CRM Update API', info: '/crm-update/info', openapi: '/crm-update/openapi.json', health: 'ok' });
});

router.post('/create-contact', async (req: Request, res: Response) => {
  const { name, email, phone, company, title, source, notes, tags } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
  try {
    const raw = await callClaude(`Create a CRM contact record. Name: "${name}" Email: "${email}" Phone: "${phone || ''}" Company: "${company || ''}" Title: "${title || ''}" Source: "${source || ''}" Notes: "${notes || ''}" Tags: ${JSON.stringify(tags || [])}.

Return concise JSON:
{
  "contact_id": "CRM-XXXXXX (generated UUID-style)",
  "name": "string",
  "email": "string",
  "phone": "string",
  "company": "string",
  "title": "string",
  "source": "string",
  "lead_score": number (0-100),
  "enrichment": { "linkedin_likely": "string", "company_size": "string", "industry": "string", "estimated_revenue": "string" },
  "recommended_sequence": "string (e.g. cold-outreach-5-step)",
  "tags": ["string"],
  "next_action": { "action": "string", "due_in": "string", "channel": "string" },
  "duplicate_risk": { "score": number (0-1), "reason": "string" },
  "confidence_per_section": { "enrichment": 0-1, "lead_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/update-opportunity', async (req: Request, res: Response) => {
  const { opportunity_id, deal_name, stage, value, currency, probability, close_date, notes, owner } = req.body;
  if (!opportunity_id || !deal_name) return res.status(400).json({ error: 'opportunity_id and deal_name are required' });
  try {
    const raw = await callClaude(`Update a CRM opportunity/deal. ID: "${opportunity_id}" Deal: "${deal_name}" Stage: "${stage || ''}" Value: "${value || ''}" Currency: "${currency || 'USD'}" Probability: "${probability || ''}" Close Date: "${close_date || ''}" Notes: "${notes || ''}" Owner: "${owner || ''}".

Return concise JSON:
{
  "opportunity_id": "string",
  "deal_name": "string",
  "stage": "string",
  "value": number,
  "currency": "string",
  "probability": number,
  "close_date": "string",
  "owner": "string",
  "stage_analysis": { "days_in_stage": number, "expected_days": number, "velocity": "fast|on_track|slow|stalled" },
  "win_probability_factors": [{ "factor": "string", "impact": "positive|negative|neutral", "weight": number }],
  "risk_flags": [{ "flag": "string", "severity": "high|medium|low" }],
  "recommended_actions": ["string"],
  "forecast_category": "commit|best_case|pipeline|omit",
  "confidence_per_section": { "stage_analysis": 0-1, "win_probability_factors": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/log-activity', async (req: Request, res: Response) => {
  const { contact_id, activity_type, subject, body, outcome, next_step, channel } = req.body;
  if (!contact_id || !activity_type || !subject) return res.status(400).json({ error: 'contact_id, activity_type and subject are required' });
  try {
    const raw = await callClaude(`Log a CRM activity. Contact ID: "${contact_id}" Type: "${activity_type}" Subject: "${subject}" Body: "${body || ''}" Outcome: "${outcome || ''}" Next Step: "${next_step || ''}" Channel: "${channel || ''}".

Return concise JSON:
{
  "activity_id": "string",
  "contact_id": "string",
  "activity_type": "string",
  "subject": "string",
  "body": "string",
  "outcome": "string",
  "channel": "string",
  "sentiment": "positive|neutral|negative|mixed",
  "key_signals": ["string"],
  "follow_up_required": boolean,
  "suggested_next_activity": { "type": "string", "subject": "string", "due_in": "string", "priority": "high|medium|low" },
  "deal_impact": { "direction": "positive|negative|neutral", "reason": "string" },
  "confidence_per_section": { "sentiment": 0-1, "deal_impact": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/create-followup-task', async (req: Request, res: Response) => {
  const { contact_id, task_type, description, due_date, priority, assigned_to, context } = req.body;
  if (!contact_id || !task_type || !description) return res.status(400).json({ error: 'contact_id, task_type and description are required' });
  try {
    const raw = await callClaude(`Create a CRM follow-up task. Contact ID: "${contact_id}" Type: "${task_type}" Description: "${description}" Due Date: "${due_date || ''}" Priority: "${priority || 'medium'}" Assigned To: "${assigned_to || ''}" Context: "${context || ''}".

Return concise JSON:
{
  "task_id": "string",
  "contact_id": "string",
  "task_type": "string",
  "description": "string",
  "due_date": "string",
  "priority": "high|medium|low",
  "assigned_to": "string",
  "urgency_score": number (0-100),
  "suggested_message": "string",
  "best_channel": "email|phone|linkedin|sms",
  "best_time": "string",
  "completion_probability": number (0-1),
  "escalation_risk": { "score": number (0-1), "reason": "string" },
  "confidence_per_section": { "urgency_score": 0-1, "completion_probability": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/pipeline-transition', async (req: Request, res: Response) => {
  const { opportunity_id, from_stage, to_stage, reason, notes, blockers } = req.body;
  if (!opportunity_id || !from_stage || !to_stage) return res.status(400).json({ error: 'opportunity_id, from_stage and to_stage are required' });
  try {
    const raw = await callClaude(`Execute a CRM pipeline stage transition. Opportunity ID: "${opportunity_id}" From: "${from_stage}" To: "${to_stage}" Reason: "${reason || ''}" Notes: "${notes || ''}" Blockers: ${JSON.stringify(blockers || [])}.

Return concise JSON:
{
  "opportunity_id": "string",
  "from_stage": "string",
  "to_stage": "string",
  "transition_valid": boolean,
  "transition_risk": "high|medium|low",
  "skipped_steps": ["string"],
  "required_fields_missing": ["string"],
  "entry_criteria_met": boolean,
  "exit_criteria": [{ "criterion": "string", "met": boolean }],
  "recommended_actions": ["string"],
  "estimated_close_impact_days": number,
  "confidence_per_section": { "transition_risk": 0-1, "exit_criteria": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sync-lead', async (req: Request, res: Response) => {
  const { lead_data, source_system, target_system, dedup_fields } = req.body;
  if (!lead_data || !source_system || !target_system) return res.status(400).json({ error: 'lead_data, source_system and target_system are required' });
  try {
    const raw = await callClaude(`Sync and deduplicate a lead across CRM systems. Source: "${source_system}" Target: "${target_system}" Dedup Fields: ${JSON.stringify(dedup_fields || [])} Lead Data: ${JSON.stringify(lead_data)}.

Return concise JSON:
{
  "sync_id": "string",
  "source_system": "string",
  "target_system": "string",
  "duplicate_detected": boolean,
  "duplicate_confidence": number (0-1),
  "merge_recommendation": "create_new|merge_existing|skip|manual_review",
  "field_mapping": [{ "source_field": "string", "target_field": "string", "value": "string", "conflict": boolean }],
  "data_quality_score": number (0-100),
  "enrichment_suggestions": [{ "field": "string", "suggested_value": "string", "source": "string" }],
  "sync_warnings": ["string"],
  "confidence_per_section": { "duplicate_detection": 0-1, "field_mapping": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { crm_context, intended_action, contact_id, opportunity_id } = req.body;
  if (!crm_context || !intended_action) return res.status(400).json({ error: 'crm_context and intended_action are required' });
  try {
    const raw = await callClaude(`Gate CRM action execution. Intended Action: "${intended_action}" Contact ID: "${contact_id || ''}" Opportunity ID: "${opportunity_id || ''}" CRM Context: ${JSON.stringify(crm_context)}.

Return concise JSON:
{
  "execute": boolean,
  "confidence": number (0-1),
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "risk_score": number (0-1),
  "recommended_action": "string",
  "chain_to": ["string"],
  "estimated_impact": "string",
  "retry_after": "string or null",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/crm-workflow', async (req: Request, res: Response) => {
  const { contact_name, contact_email, company, deal_name, deal_value, meeting_notes, current_stage } = req.body;
  if (!contact_name || !contact_email) return res.status(400).json({ error: 'contact_name and contact_email are required' });
  try {
    const raw = await callClaude(`Run a complete CRM action workflow. Contact: "${contact_name}" Email: "${contact_email}" Company: "${company || ''}" Deal: "${deal_name || ''}" Value: "${deal_value || ''}" Stage: "${current_stage || ''}" Meeting Notes: "${meeting_notes || ''}".

Return concise JSON:
{
  "workflow_id": "string",
  "contact": { "id": "string", "lead_score": number, "recommended_sequence": "string", "next_action": { "action": "string", "due_in": "string", "channel": "string" } },
  "opportunity": { "stage": "string", "probability": number, "forecast_category": "commit|best_case|pipeline|omit", "risk_flags": ["string"] },
  "activities_logged": number,
  "followup_tasks": [{ "type": "string", "due_in": "string", "priority": "high|medium|low", "suggested_message": "string" }],
  "pipeline_health": { "status": "on_track|at_risk|stalled", "velocity": "string", "close_probability": number },
  "execution_summary": { "actions_taken": number, "next_steps": ["string"], "estimated_close_date": "string" },
  "confidence_per_section": { "contact": 0-1, "opportunity": 0-1, "pipeline_health": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
