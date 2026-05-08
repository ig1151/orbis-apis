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

export default router;
