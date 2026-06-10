import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) {
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
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Voice Intelligence API', info: '/voice-intelligence/info', openapi: '/voice-intelligence/openapi.json', health: 'ok' });
});

router.post('/analyze-transcript', async (req: Request, res: Response) => {
  const { transcript, call_type, participants = [], duration_minutes } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  try {
    const raw = await callClaude(`Analyze this call/meeting transcript for insights. Extract sentiment, key themes, conversation dynamics, and actionable insights. Call type: "${call_type || 'general'}" Participants: ${JSON.stringify(participants)} Duration minutes: ${duration_minutes || 'unknown'}

Transcript (first 4000 chars): "${transcript.slice(0, 4000)}"

Return concise JSON:
{
  "call_type": "string",
  "duration_minutes": number or null,
  "overall_sentiment": "positive|negative|neutral|mixed",
  "sentiment_score": 0-1,
  "key_themes": ["string"],
  "talk_ratio": { "speaker_name": percentage_number },
  "conversation_flow": "structured|chaotic|one_sided",
  "engagement_level": "high|medium|low",
  "key_moments": [{ "timestamp_approx": "string", "moment_type": "decision|objection|commitment|question|insight", "description": "string" }],
  "next_steps_mentioned": ["string"],
  "confidence_per_section": { "sentiment": 0-1, "themes": 0-1, "key_moments": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/extract-action-items', async (req: Request, res: Response) => {
  const { transcript, participants = [], meeting_date } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  try {
    const raw = await callClaude(`Extract all action items, commitments, and follow-ups from this transcript. Assign owners, deadlines, and priority. Participants: ${JSON.stringify(participants)} Meeting date: "${meeting_date || 'not provided'}"

Transcript (first 4000 chars): "${transcript.slice(0, 4000)}"

Return concise JSON:
{
  "action_items": [{ "action": "string", "owner": "string or null", "deadline": "string or null", "priority": "high|medium|low", "context": "string", "confidence": 0-1 }],
  "decisions_made": [{ "decision": "string", "decided_by": "string", "context": "string" }],
  "questions_unresolved": ["string"],
  "commitments": [{ "commitment": "string", "committed_by": "string", "to_whom": "string or null" }],
  "total_action_items": number,
  "high_priority_count": number,
  "confidence_per_section": { "action_items": 0-1, "decisions": 0-1, "commitments": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sentiment-score', async (req: Request, res: Response) => {
  const { transcript, speaker_labels = {}, segment_level } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  try {
    const raw = await callClaude(`Score emotional tone and sentiment at overall and per-speaker level. Detect emotional shifts, frustration, enthusiasm, and confidence levels. Speaker labels: ${JSON.stringify(speaker_labels)} Segment level: ${segment_level || false}

Transcript (first 4000 chars): "${transcript.slice(0, 4000)}"

Return concise JSON:
{
  "overall_sentiment": "positive|negative|neutral|mixed",
  "overall_score": 0-1,
  "per_speaker": [{ "speaker": "string", "sentiment": "string", "score": 0-1, "emotion_profile": { "enthusiasm": 0-1, "frustration": 0-1, "confidence": 0-1, "uncertainty": 0-1 } }],
  "sentiment_timeline": [{ "segment": "string", "sentiment": "string", "score": 0-1, "notable": true|false }],
  "emotional_peaks": [{ "type": "positive|negative", "trigger": "string", "speaker": "string" }],
  "rapport_score": 0-1,
  "tension_moments": ["string"],
  "confidence_per_section": { "overall": 0-1, "per_speaker": 0-1, "timeline": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/objection-detect', async (req: Request, res: Response) => {
  const { transcript, context, product_or_service } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  try {
    const raw = await callClaude(`Detect and classify all objections, concerns, and hesitations in this conversation. Analyze how they were handled and suggest better responses. Context: "${context || 'general'}" Product or service: "${product_or_service || 'not specified'}"

Transcript (first 4000 chars): "${transcript.slice(0, 4000)}"

Return concise JSON:
{
  "objections_found": number,
  "objections": [{ "objection_text": "string", "type": "price|timing|need|authority|competition|trust|feature", "severity": "high|medium|low", "handled_well": true|false, "response_quality": "good|adequate|poor|unaddressed", "better_response_suggestion": "string" }],
  "buying_signals": [{ "signal": "string", "strength": "strong|moderate|weak" }],
  "deal_risk_score": 0-1,
  "overall_objection_handling_score": 0-100,
  "patterns": ["string"],
  "coaching_summary": "string",
  "confidence_per_section": { "objections": 0-1, "buying_signals": 0-1, "patterns": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/call-summary', async (req: Request, res: Response) => {
  const { transcript, call_type, max_length, focus_areas = [] } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  try {
    const raw = await callClaude(`Generate a structured call summary with executive overview, key discussion points, outcomes, and next steps. Call type: "${call_type || 'general'}" Max length (words): ${max_length || 'no limit'} Focus areas: ${JSON.stringify(focus_areas)}

Transcript (first 4000 chars): "${transcript.slice(0, 4000)}"

Return concise JSON:
{
  "executive_summary": "string (2-3 sentences)",
  "key_discussion_points": [{ "topic": "string", "summary": "string", "outcome": "string or null" }],
  "decisions_reached": ["string"],
  "action_items": [{ "action": "string", "owner": "string", "deadline": "string" }],
  "open_issues": ["string"],
  "relationship_status": "string",
  "call_effectiveness_score": 0-100,
  "follow_up_urgency": "high|medium|low",
  "recommended_follow_up_message": "string",
  "confidence_per_section": { "summary": 0-1, "action_items": 0-1, "decisions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/speaker-profile', async (req: Request, res: Response) => {
  const { transcript, speaker_name, role, context } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  if (!speaker_name) return res.status(400).json({ error: 'speaker_name is required' });
  try {
    const raw = await callClaude(`Build a communication profile for this speaker based on their language patterns, style, and behaviors in the transcript. Speaker name: "${speaker_name}" Role: "${role || 'not specified'}" Context: "${context || 'not specified'}"

Transcript (first 4000 chars): "${transcript.slice(0, 4000)}"

Return concise JSON:
{
  "speaker_name": "string",
  "communication_style": "string",
  "traits": [{ "trait": "string", "evidence": "string", "strength": "high|medium|low" }],
  "vocabulary_complexity": "low|medium|high|technical",
  "dominant_behaviors": ["assertive|questioning|listening|deflecting|leading|agreeing"],
  "persuasion_style": "logical|emotional|social|authoritative",
  "rapport_indicators": "high|medium|low",
  "areas_for_improvement": ["string"],
  "strengths": ["string"],
  "preferred_engagement_approach": "string",
  "confidence_per_section": { "traits": 0-1, "behaviors": 0-1, "style": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/coaching-insights', async (req: Request, res: Response) => {
  const { transcript, role_to_coach, context, goals = [], skill_areas = [] } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  if (!role_to_coach) return res.status(400).json({ error: 'role_to_coach is required' });
  try {
    const raw = await callClaude(`Generate coaching feedback for the specified role in this conversation. Identify skill gaps, wins to reinforce, and specific improvement areas with examples from the transcript. Role to coach: "${role_to_coach}" Context: "${context || 'not specified'}" Goals: ${JSON.stringify(goals)} Skill areas: ${JSON.stringify(skill_areas)}

Transcript (first 4000 chars): "${transcript.slice(0, 4000)}"

Return concise JSON:
{
  "role_to_coach": "string",
  "overall_performance_score": 0-100,
  "wins": [{ "behavior": "string", "impact": "string", "quote": "string" }],
  "improvement_areas": [{ "area": "string", "severity": "critical|important|minor", "example_from_transcript": "string", "recommended_technique": "string" }],
  "missed_opportunities": [{ "opportunity": "string", "what_to_do": "string" }],
  "talk_time_assessment": "string",
  "questioning_quality": 0-100,
  "questioning_assessment": "string",
  "listening_indicators": "high|medium|low",
  "priority_coaching_focus": ["string"],
  "practice_scenarios": [{ "scenario": "string", "objective": "string" }],
  "confidence_per_section": { "wins": 0-1, "improvement_areas": 0-1, "practice_scenarios": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/meeting-intelligence', async (req: Request, res: Response) => {
  const { transcript, meeting_type, attendees = [], meeting_date, agenda } = req.body;
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });
  if (!meeting_type) return res.status(400).json({ error: 'meeting_type is required' });
  try {
    const raw = await callClaude(`Extract full intelligence from this meeting transcript — effectiveness, alignment, decisions, blockers, and follow-ups tailored to the meeting type. Meeting type: "${meeting_type}" Attendees: ${JSON.stringify(attendees)} Meeting date: "${meeting_date || 'not provided'}" Agenda: "${agenda || 'not provided'}"

Transcript (first 4000 chars): "${transcript.slice(0, 4000)}"

Return concise JSON:
{
  "meeting_type": "string",
  "effectiveness_score": 0-100,
  "time_well_spent": true|false,
  "agenda_coverage": "string",
  "key_decisions": [{ "decision": "string", "impact": "high|medium|low", "owner": "string" }],
  "blockers_identified": [{ "blocker": "string", "owner": "string", "urgency": "high|medium|low" }],
  "alignment_score": 0-1,
  "participation_balance": "balanced|dominated|passive",
  "meeting_health": "productive|unfocused|dominated|efficient",
  "recommended_changes_for_next_meeting": ["string"],
  "follow_up_items": [{ "item": "string", "owner": "string", "due": "string" }],
  "confidence_per_section": { "decisions": 0-1, "blockers": 0-1, "effectiveness": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { call_context, intended_action, risk_threshold, call_stage } = req.body;
  if (!call_context) return res.status(400).json({ error: 'call_context is required' });
  if (!intended_action) return res.status(400).json({ error: 'intended_action is required' });
  try {
    const raw = await callClaude(`Evaluate whether the intended follow-up action is appropriate based on the call context and stage. Intended action: "${intended_action}" Risk threshold: ${risk_threshold || 0.7} Call stage: "${call_stage || 'not specified'}" Call context: ${JSON.stringify(call_context)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "risk_score": 0-1,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "recommended_action": "proceed|modify|delay|escalate",
  "timing_recommendation": "string",
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
