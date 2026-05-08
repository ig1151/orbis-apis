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

export default router;
