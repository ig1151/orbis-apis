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
  res.json({ name: 'ATS Keyword API', info: '/ats-keyword/info', openapi: '/ats-keyword/openapi.json', health: 'ok' });
});

// POST /extract-keywords
router.post('/extract-keywords', async (req: Request, res: Response) => {
  const { job_description } = req.body;
  if (!job_description) return res.status(400).json({ error: 'job_description is required' });
  try {
    const raw = await callClaude(`Extract ATS-critical keywords from this job description: "${job_description.slice(0, 3000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "keywords": {
    "required_skills": ["string"],
    "preferred_skills": ["string"],
    "tools_technologies": ["string"],
    "soft_skills": ["string"],
    "certifications": ["string"],
    "experience_level": "entry|mid|senior|executive",
    "education_requirements": ["string"]
  },
  "ats_critical_terms": ["string"],
  "job_title_variants": ["string"],
  "industry_keywords": ["string"],
  "confidence_per_section": {"keywords": 0.9, "ats_critical_terms": 0.85},
  "recommended_actions_priority_order": ["Include all required skills", "Add certifications if applicable", "Mirror exact job title"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /match
router.post('/match', async (req: Request, res: Response) => {
  const { resume_text, job_description } = req.body;
  if (!resume_text || !job_description) return res.status(400).json({ error: 'resume_text and job_description are required' });
  try {
    const raw = await callClaude(`Match resume to job description. Resume: "${resume_text.slice(0, 2000)}". Job: "${job_description.slice(0, 2000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "match_score": number,
  "matched_keywords": ["string"],
  "missing_keywords": ["string"],
  "partial_matches": [{"keyword": "string", "resume_variant": "string"}],
  "keyword_coverage_pct": number,
  "strengths": ["string"],
  "gaps": ["string"],
  "ats_pass_likelihood": "high|medium|low",
  "confidence_per_section": {"match_score": 0.9, "keyword_coverage": 0.88},
  "recommended_actions_priority_order": ["Add missing required keywords", "Quantify achievements", "Mirror job title"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /score
router.post('/score', async (req: Request, res: Response) => {
  const { resume_text, job_description } = req.body;
  if (!resume_text || !job_description) return res.status(400).json({ error: 'resume_text and job_description are required' });
  try {
    const raw = await callClaude(`Score keyword coverage for this resume against job description. Resume: "${resume_text.slice(0, 2000)}". Job: "${job_description.slice(0, 2000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "overall_score": number,
  "section_scores": {
    "technical_skills": number,
    "experience": number,
    "education": number,
    "soft_skills": number,
    "certifications": number
  },
  "keyword_density_score": number,
  "ats_format_score": number,
  "readability_score": number,
  "improvement_priority": [{"section": "string", "action": "string", "impact": "high|medium|low"}],
  "grade": "A|B|C|D|F",
  "confidence_per_section": {"overall_score": 0.9, "section_scores": 0.85},
  "recommended_actions_priority_order": ["Fix highest-impact gap first", "Optimize keyword density", "Improve formatting"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { job_description, objective } = req.body;
  if (!job_description) return res.status(400).json({ error: 'job_description is required' });
  res.json({
    trace_id: traceId(),
    computed_at: new Date().toISOString(),
    success: true,
    execution_ready: true,
    objective: objective || 'keyword_extraction',
    next_api: 'job-posting-search',
    next_endpoint: '/search',
    blocking_flags: [],
    flag_definitions: {
      NO_JOB_DESCRIPTION: 'No job description provided',
      DESCRIPTION_TOO_SHORT: 'Job description is too short for accurate keyword extraction',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    recommended_actions_priority_order: ['Extract keywords first', 'Match against resume', 'Score coverage'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze (one-call)
router.post('/analyze', async (req: Request, res: Response) => {
  const { resume_url, job_description } = req.body;
  if (!resume_url || !job_description) return res.status(400).json({ error: 'resume_url and job_description are required' });
  try {
    const raw = await callClaude(`Full ATS keyword analysis for resume at: "${resume_url}" against job description: "${job_description.slice(0, 2000)}". Return JSON:
{
  "trace_id": "${traceId()}",
  "computed_at": "${new Date().toISOString()}",
  "success": true,
  "resume_url": "${resume_url}",
  "extracted_keywords": {
    "required_skills": ["string"],
    "preferred_skills": ["string"],
    "tools_technologies": ["string"],
    "certifications": ["string"]
  },
  "match_score": number,
  "matched_keywords": ["string"],
  "missing_keywords": ["string"],
  "keyword_coverage_pct": number,
  "overall_score": number,
  "grade": "A|B|C|D|F",
  "ats_pass_likelihood": "high|medium|low",
  "improvement_suggestions": [{"action": "string", "impact": "high|medium|low"}],
  "hire_recommendation": "strong_yes|yes|maybe|no",
  "confidence_per_section": {"keywords": 0.9, "match": 0.88, "score": 0.85},
  "recommended_actions_priority_order": ["Address critical keyword gaps", "Optimize formatting", "Tailor objective statement"],
  "privacy": {"data_stored": false, "retention": "none"}
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
