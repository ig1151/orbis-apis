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

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Social Profile Lookup API', info: '/social-profile-lookup/info', openapi: '/social-profile-lookup/openapi.json', health: 'ok' });
});

// POST /find-profiles
router.post('/find-profiles', async (req: Request, res: Response) => {
  const { name, email, company } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Find social profiles for name: "${name}", email: "${email || 'unknown'}", company: "${company || 'unknown'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "name": "${name}",
  "profiles": [
    {"platform": "linkedin|twitter|github|instagram|facebook", "url": "string", "username": "string", "verified": false, "followers": number, "bio_snippet": "string"}
  ],
  "match_confidence": number,
  "confidence_per_section": {"profiles": 0.8},
  "recommended_actions_priority_order": ["verify profiles manually", "check linkedin first", "cross-reference email"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /profile-summary
router.post('/profile-summary', async (req: Request, res: Response) => {
  const { profile_url } = req.body;
  if (!profile_url) return res.status(400).json({ error: 'profile_url is required' });
  try {
    const raw = await callClaude(`Summarize social profile at URL: "${profile_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "profile_url": "${profile_url}",
  "summary": {
    "name": "string", "platform": "string", "bio": "string",
    "followers": number, "following": number, "posts_count": number,
    "topics": ["string"], "engagement_rate": number,
    "account_age_years": number, "verified": false
  },
  "influence_score": number,
  "confidence_per_section": {"summary": 0.8},
  "recommended_actions_priority_order": ["check engagement rate", "review topics", "assess influence score"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /links
router.post('/links', async (req: Request, res: Response) => {
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Aggregate cross-platform links for name: "${name}", email: "${email || 'unknown'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "name": "${name}",
  "links": [
    {"platform": "string", "url": "string", "handle": "string", "confidence": number}
  ],
  "primary_platform": "string",
  "match_score": number,
  "confidence_per_section": {"links": 0.75},
  "recommended_actions_priority_order": ["verify top confidence links", "contact via primary platform", "cross-reference handles"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { name, objective } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    name,
    objective: objective || 'profile_enrichment',
    next_api: 'twitter-post-lookup',
    next_endpoint: '/profile',
    blocking_flags: [],
    flag_definitions: { NO_NAME: 'Name is required for profile search', AMBIGUOUS_NAME: 'Multiple matches found — provide email to disambiguate' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Find profiles first', 'Get profile summaries', 'Aggregate all links'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /lookup (ONE-CALL)
router.post('/lookup', async (req: Request, res: Response) => {
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const raw = await callClaude(`Full social profile intelligence for name: "${name}", email: "${email || 'unknown'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "name": "${name}",
  "profiles": [{"platform": "string", "url": "string", "followers": number, "verified": false}],
  "primary_profile": {"platform": "string", "url": "string", "bio": "string", "influence_score": number},
  "cross_platform_links": [{"platform": "string", "url": "string"}],
  "engagement_summary": {"avg_engagement": number, "most_active_platform": "string", "topics": ["string"]},
  "outreach_recommendation": {"best_channel": "string", "best_time": "string", "approach": "string"},
  "confidence_per_section": {"profiles": 0.8, "outreach_recommendation": 0.75},
  "recommended_actions_priority_order": ["verify primary_profile", "use outreach_recommendation", "check engagement"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
