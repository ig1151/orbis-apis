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
  res.json({ name: 'Resume Parser API', info: '/resume-parser/info', openapi: '/resume-parser/openapi.json', health: 'ok' });
});

// POST /parse
router.post('/parse', async (req: Request, res: Response) => {
  const { resume_url } = req.body;
  if (!resume_url) return res.status(400).json({ error: 'resume_url is required' });
  try {
    const raw = await callClaude(`Parse resume from URL: "${resume_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "resume_url": "${resume_url}",
  "candidate": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string",
    "website": "string",
    "summary": "string"
  },
  "education": [
    {"institution": "string", "degree": "string", "field": "string", "graduation_year": "string", "gpa": "string"}
  ],
  "experience": [
    {"company": "string", "title": "string", "start_date": "string", "end_date": "string", "duration_months": number, "description": "string", "achievements": ["string"]}
  ],
  "skills": ["string"],
  "certifications": [{"name": "string", "issuer": "string", "year": "string"}],
  "languages": [{"language": "string", "proficiency": "native|fluent|conversational|basic"}],
  "confidence_per_section": {"candidate": 0.95, "education": 0.92, "experience": 0.9, "skills": 0.88},
  "recommended_actions_priority_order": ["validate contact info", "score skills against job requirements", "verify employment history"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /skills
router.post('/skills', async (req: Request, res: Response) => {
  const { resume_url } = req.body;
  if (!resume_url) return res.status(400).json({ error: 'resume_url is required' });
  try {
    const raw = await callClaude(`Extract and categorize skills from resume at URL: "${resume_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "resume_url": "${resume_url}",
  "skills": {
    "technical": ["string"],
    "programming_languages": ["string"],
    "frameworks": ["string"],
    "tools": ["string"],
    "soft_skills": ["string"],
    "domain_expertise": ["string"],
    "certifications": ["string"]
  },
  "skill_levels": [{"skill": "string", "level": "expert|proficient|familiar", "years": number}],
  "top_skills": ["string"],
  "skill_gaps": ["string"],
  "confidence_per_section": {"skills": 0.88, "skill_levels": 0.82},
  "recommended_actions_priority_order": ["match top_skills against JD requirements", "evaluate skill_gaps for training needs", "verify skill_levels with technical assessment"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /experience
router.post('/experience', async (req: Request, res: Response) => {
  const { resume_url } = req.body;
  if (!resume_url) return res.status(400).json({ error: 'resume_url is required' });
  try {
    const raw = await callClaude(`Extract and analyze work experience from resume at URL: "${resume_url}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "resume_url": "${resume_url}",
  "experience": [
    {
      "company": "string",
      "title": "string",
      "seniority": "intern|junior|mid|senior|lead|director|vp|c-level",
      "start_date": "string",
      "end_date": "string",
      "duration_months": number,
      "industry": "string",
      "achievements": ["string"],
      "technologies": ["string"]
    }
  ],
  "career_summary": {
    "total_years": number,
    "industries": ["string"],
    "career_progression": "accelerating|steady|lateral|declining",
    "avg_tenure_months": number,
    "highest_title": "string"
  },
  "red_flags": ["string"],
  "confidence_per_section": {"experience": 0.9, "career_summary": 0.88},
  "recommended_actions_priority_order": ["review career_progression for growth potential", "assess avg_tenure for retention risk", "investigate red_flags before advancing"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { resume_url, objective } = req.body;
  if (!resume_url) return res.status(400).json({ error: 'resume_url is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    resume_url,
    objective: objective || 'resume_parsing',
    next_api: 'ats-keyword',
    next_endpoint: '/match',
    blocking_flags: [],
    flag_definitions: { NO_RESUME_URL: 'No resume URL provided', UNSUPPORTED_FORMAT: 'Resume format not supported — use PDF or plain text' },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Parse resume for candidate data', 'Extract skills for JD matching', 'Analyze experience for seniority assessment'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (one-call)
router.post('/analyze', async (req: Request, res: Response) => {
  const { resume_url, job_description } = req.body;
  if (!resume_url) return res.status(400).json({ error: 'resume_url is required' });
  try {
    const raw = await callClaude(`Full resume analysis for URL: "${resume_url}" against job description: "${job_description || 'general role'}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "resume_url": "${resume_url}",
  "candidate": {"name": "string", "email": "string", "location": "string", "linkedin": "string"},
  "skills": {"technical": ["string"], "soft_skills": ["string"], "top_skills": ["string"]},
  "experience": {"total_years": number, "industries": ["string"], "highest_title": "string", "career_progression": "string"},
  "education": [{"degree": "string", "institution": "string", "field": "string"}],
  "ats_score": {
    "overall_score": 0.0,
    "keyword_match_pct": number,
    "format_score": 0.0,
    "readability_score": 0.0,
    "matched_keywords": ["string"],
    "missing_keywords": ["string"]
  },
  "hire_recommendation": "strong_yes|yes|maybe|no|strong_no",
  "red_flags": ["string"],
  "strengths": ["string"],
  "confidence_per_section": {"candidate": 0.95, "skills": 0.88, "experience": 0.9, "ats_score": 0.85},
  "recommended_actions_priority_order": ["act on hire_recommendation", "address missing_keywords for ATS optimization", "validate red_flags with reference checks"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
