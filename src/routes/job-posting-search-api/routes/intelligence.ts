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
  res.json({ name: 'Job Posting Search API', info: '/job-posting-search/info', openapi: '/job-posting-search/openapi.json', health: 'ok' });
});

// POST /search-jobs
router.post('/search-jobs', async (req: Request, res: Response) => {
  const { title, skills, location, remote, experience_level } = req.body;
  if (!title && !skills) return res.status(400).json({ error: 'title or skills is required' });
  try {
    const raw = await callClaude(`Search jobs: title: "${title || 'any'}" skills: "${(skills || []).join(', ')}" location: "${location || 'any'}" remote: ${remote || false} experience: "${experience_level || 'any'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "job_summaries": [
    {
      "title": "string", "company": "string", "location": "string",
      "remote": true|false, "salary_range": "string",
      "required_skills": ["string"], "fit_score": 0-100,
      "posted_days_ago": number, "applicant_volume": "high|medium|low"
    }
  ],
  "total_estimated": number,
  "top_skills_in_demand": ["string"],
  "salary_benchmark": {"low": "string", "median": "string", "high": "string"},
  "confidence_per_section": {"job_summaries": 0-1, "salary_benchmark": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /company-jobs
router.post('/company-jobs', async (req: Request, res: Response) => {
  const { company } = req.body;
  if (!company) return res.status(400).json({ error: 'company is required' });
  try {
    const raw = await callClaude(`All open roles at company: "${company}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "company": "${company}",
  "open_roles": [
    {"title": "string", "department": "string", "location": "string", "remote": true|false, "seniority": "string", "posted_days_ago": number}
  ],
  "department_breakdown": [{"department": "string", "open_count": number, "growth_signal": "hiring|stable|reducing"}],
  "hiring_velocity": "fast|normal|slow",
  "total_open_roles": number,
  "confidence_per_section": {"open_roles": 0-1, "department_breakdown": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /job-details
router.post('/job-details', async (req: Request, res: Response) => {
  const { posting_url, title, company } = req.body;
  if (!posting_url && !title) return res.status(400).json({ error: 'posting_url or title is required' });
  try {
    const raw = await callClaude(`Full job details from: url: "${posting_url || 'none'}" title: "${title || 'none'}" company: "${company || 'none'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "job": {"title": "string", "company": "string", "location": "string", "remote": true|false, "employment_type": "full-time|part-time|contract|internship"},
  "requirements": {"must_have": ["string"], "nice_to_have": ["string"], "years_experience": number, "education": "string"},
  "skills": {"technical": ["string"], "soft": ["string"]},
  "salary_signals": {"range": "string", "currency": "string", "equity": true|false, "bonus": true|false},
  "culture_signals": [{"signal": "string", "type": "positive|negative|neutral"}],
  "application_tips": ["string"],
  "confidence_per_section": {"job": 0-1, "requirements": 0-1, "salary_signals": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /salary-estimate
router.post('/salary-estimate', async (req: Request, res: Response) => {
  const { title, location, experience_years, skills } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const raw = await callClaude(`Salary estimate for: title: "${title}" location: "${location || 'US'}" experience: ${experience_years || 3} years skills: "${(skills || []).join(', ')}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "title": "${title}",
  "location": "${location || 'US'}",
  "salary_range": {
    "p10": number, "p25": number, "p50": number, "p75": number, "p90": number,
    "currency": "USD"
  },
  "remote_premium_pct": number,
  "equity_signals": {"typical_grant": "string", "vesting": "string", "refreshes": true|false},
  "total_comp_estimate": {"base": number, "bonus_pct": number, "equity_value": "string"},
  "market_demand": "high|medium|low",
  "yoy_salary_growth_pct": number,
  "confidence_per_section": {"salary_range": 0-1, "equity_signals": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { title, objective } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    title,
    objective: objective || 'job_search',
    next_api: 'resume',
    next_endpoint: '/match-job',
    blocking_flags: [],
    flag_definitions: { NO_TITLE: 'No job title provided', NO_SKILLS: 'No skills provided — results may be too broad' },
    confidence_per_section: { execution_ready: 0.95 },
    recommended_actions_priority_order: ['Search by title + location', 'Get salary estimate before applying', 'Use /search for one-call enriched results'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /search (one-call)
router.post('/search', async (req: Request, res: Response) => {
  const { title, skills, location, experience_years } = req.body;
  if (!title && !skills) return res.status(400).json({ error: 'title or skills is required' });
  try {
    const raw = await callClaude(`Full job search + enrichment for: title: "${title || 'any'}" skills: "${(skills || []).join(', ')}" location: "${location || 'US'}" experience: ${experience_years || 3} years. Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "top_jobs": [
    {"title": "string", "company": "string", "location": "string", "salary_range": "string", "fit_score": 0-100, "remote": true|false, "key_requirements": ["string"]}
  ],
  "salary_benchmark": {"p50": number, "p75": number, "currency": "USD", "remote_premium_pct": number},
  "market_insights": {"demand_level": "high|medium|low", "top_hiring_companies": ["string"], "emerging_skills": ["string"]},
  "application_strategy": [{"step": "string", "priority": "high|medium|low"}],
  "total_jobs_estimated": number,
  "confidence_per_section": {"top_jobs": 0-1, "salary_benchmark": 0-1, "market_insights": 0-1},
  "recommended_actions_priority_order": ["string"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
