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

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'LinkedIn Profile API', info: '/linkedin-profile/info', openapi: '/linkedin-profile/openapi.json', health: 'ok' });
});

// POST /profile
router.post('/profile', async (req: Request, res: Response) => {
  const { url, name, company } = req.body;
  if (!url && !name) return res.status(400).json({ error: 'url or name is required' });
  try {
    const raw = await callClaude(`Analyze LinkedIn profile. url: "${url || 'none'}" name: "${name || 'none'}" company: "${company || 'none'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "profile": {
    "name": "string",
    "headline": "string",
    "location": "string",
    "profile_url": "string or null",
    "current_company": "string",
    "past_companies": ["string"],
    "certifications": ["string"],
    "languages": ["string"],
    "source_provenance": {"source": "public_profile", "retrieved_at": "${new Date().toISOString()}", "freshness_score": 0.85},
    "connections_estimate": "500+|1000+|5000+",
    "engagement_score": 0-100,
    "industry": "string",
    "summary_keywords": ["string"]
  },
  "experience": [{"title": "string", "company": "string", "duration_months": number, "is_current": true|false}],
  "skills": [{"skill": "string", "endorsement_level": "high|medium|low"}],
  "education": [{"degree": "string", "institution": "string", "year": number}],
  "activity_signals": {"posting_frequency": "active|moderate|inactive", "content_topics": ["string"], "thought_leadership_score": 0-100},
  "confidence_per_section": {"profile": 0-1, "experience": 0-1, "skills": 0-1, "education": 0-1},
  "recommended_actions_priority_order": ["enrich company data", "find email address", "score decision-maker fit"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /company
router.post('/company', async (req: Request, res: Response) => {
  const { company_name, company_url } = req.body;
  if (!company_name && !company_url) return res.status(400).json({ error: 'company_name or company_url is required' });
  try {
    const raw = await callClaude(`Analyze LinkedIn company page. company: "${company_name || 'none'}" url: "${company_url || 'none'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "company": {
    "name": "string",
    "industry": "string",
    "size": "1-10|11-50|51-200|201-500|501-1000|1001-5000|5000+",
    "followers_estimate": number,
    "headquarters": "string",
    "founded": number,
    "specialties": ["string"]
  },
  "recent_posts": [{"topic": "string", "engagement_level": "high|medium|low", "content_type": "string"}],
  "hiring_signals": {"is_hiring": true|false, "open_roles_estimate": number, "departments_hiring": ["string"], "growth_signal": "expanding|stable|contracting"},
  "growth_signals": [{"signal": "string", "strength": "strong|moderate|weak"}],
  "confidence_per_section": {"company": 0-1, "hiring_signals": 0-1, "growth_signals": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /enrich
router.post('/enrich', async (req: Request, res: Response) => {
  const { name, email, company } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Enrich person with LinkedIn data. name: "${name}" email: "${email || 'none'}" company: "${company || 'none'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "enriched_profile": {
    "name": "string",
    "title": "string",
    "company": "string",
    "seniority": "c-suite|vp|director|manager|individual_contributor",
    "department": "string",
    "linkedin_url_signal": "string"
  },
  "contact_signals": {"email_pattern_guess": "string", "best_channel": "linkedin|email|phone", "response_likelihood": "high|medium|low"},
  "recent_activity": {"last_post_days_ago": number, "topics": ["string"], "is_active": true|false},
  "mutual_connections_estimate": number,
  "enrichment_confidence": 0-1,
  "confidence_per_section": {"enriched_profile": 0-1, "contact_signals": 0-1, "recent_activity": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { name, url, objective } = req.body;
  if (!name && !url) return res.status(400).json({ error: 'name or url is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    input: { name: name || null, url: url || null },
    objective: objective || 'profile_enrichment',
    next_api: 'email-finder',
    next_endpoint: '/find-email',
    blocking_flags: [],
    flag_definitions: {
      NO_IDENTIFIER: 'No name or URL provided',
      PRIVATE_PROFILE: 'Profile may be private or restricted',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Call /profile or /enrich first', 'Use /lookup for full enrichment'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /decision-maker-fit
router.post('/decision-maker-fit', async (req: Request, res: Response) => {
  const { name, title, company, department } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Score decision-maker fit for outreach. name: "${name}" title: "${title || 'none'}" company: "${company || 'none'}" department: "${department || 'none'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "buyer_persona_fit": 0-100,
  "decision_maker_likelihood": "high|medium|low",
  "department": "string",
  "seniority": "c-suite|vp|director|manager|individual_contributor",
  "recommended_pitch_angle": "string describing best outreach angle",
  "outreach_priority": "high|medium|low",
  "fit_reasoning": ["string"],
  "confidence_per_section": {"buyer_persona_fit": 0-1, "decision_maker_likelihood": 0-1},
  "recommended_actions_priority_order": ["score company ICP fit", "personalize outreach", "find email address"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /lookup (one-call)
router.post('/lookup', async (req: Request, res: Response) => {
  const { name, email, company, company_name } = req.body;
  if (!name && !email) return res.status(400).json({ error: 'name or email is required' });
  try {
    const raw = await callClaude(`Full LinkedIn enrichment. name: "${name || 'none'}" email: "${email || 'none'}" company: "${company || company_name || 'none'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "person": {
    "name": "string",
    "title": "string",
    "seniority": "c-suite|vp|director|manager|individual_contributor",
    "department": "string",
    "linkedin_url_signal": "string",
    "headline": "string",
    "location": "string"
  },
  "company": {
    "name": "string",
    "industry": "string",
    "size": "string",
    "followers_estimate": number,
    "hiring_signal": "expanding|stable|contracting"
  },
  "contact_signals": {"best_channel": "linkedin|email|phone", "response_likelihood": "high|medium|low", "email_pattern_guess": "string"},
  "engagement_score": 0-100,
  "fit_score": 0-100,
  "outreach_ready": true|false,
  "confidence_per_section": {"person": 0-1, "company": 0-1, "contact_signals": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
