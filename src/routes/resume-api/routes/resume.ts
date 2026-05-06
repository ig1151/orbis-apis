import { Router, Request, Response } from 'express';
import { logger } from '../logger';

const router = Router();
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string, maxTokens = 1500): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${err}`);
  }
  const data = await response.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content ?? '{}';
}

function parseJson(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw.replace(/```json|```/g, '').trim()); }
  catch { return { raw }; }
}

// ── POST /analyze-resume ──────────────────────────────────────────────────────
router.post('/analyze-resume', async (req: Request, res: Response) => {
  const { resume_text, job_description, target_role, seniority } = req.body;
  if (!resume_text) { res.status(400).json({ error: 'Provide resume_text' }); return; }
  const start = Date.now();
  try {
    const raw = await callClaude(`You are an expert resume analyzer. Analyze this resume and return ONLY a valid JSON object with these keys:
- overall_score: number (0-100)
- ats_score: number (0-100)
- strengths: array of strings
- weaknesses: array of strings
- missing_keywords: array of strings
- section_feedback: object with keys summary, experience, skills, education — each {score, feedback, suggestions[]}
- rewrite_suggestions: array of strings
- weak_bullet_count: number
- vague_phrases_found: array of strings
- recommended_action_verbs: array of strings
${target_role ? `Target role: ${target_role}` : ''}
${seniority ? `Seniority: ${seniority}` : ''}
${job_description ? `Job description: ${job_description.slice(0, 3000)}` : ''}
Resume:
"""${resume_text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'analyze-resume', data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'analyze-resume', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /score-resume ────────────────────────────────────────────────────────
router.post('/score-resume', async (req: Request, res: Response) => {
  const { resume_text, target_role, seniority } = req.body;
  if (!resume_text) { res.status(400).json({ error: 'Provide resume_text' }); return; }
  const start = Date.now();
  try {
    const raw = await callClaude(`You are a resume scoring engine. Score this resume and return ONLY a valid JSON object with these keys:
- overall_score: number (0-100)
- ats_score: number (0-100)
- readability_score: number (0-100)
- impact_score: number (0-100)
- completeness_score: number (0-100)
- grade: string (A+/A/B+/B/C+/C/D)
- verdict: string (strong|good|needs_work|weak)
- top_issues: array of strings (top 3 things to fix)
- quick_wins: array of strings (easy improvements)
${target_role ? `Target role: ${target_role}` : ''}
${seniority ? `Seniority: ${seniority}` : ''}
Resume:
"""${resume_text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'score-resume', data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'score-resume', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /match-job ───────────────────────────────────────────────────────────
router.post('/match-job', async (req: Request, res: Response) => {
  const { resume_text, job_description } = req.body;
  if (!resume_text || !job_description) { res.status(400).json({ error: 'Provide resume_text and job_description' }); return; }
  const start = Date.now();
  try {
    const raw = await callClaude(`You are a job-resume matching engine. Compare this resume to the job description and return ONLY a valid JSON object with these keys:
- match_score: number (0-100)
- matched_keywords: array of strings
- missing_keywords: array of strings
- skill_gaps: array of strings
- experience_gaps: array of strings
- recommendations: array of strings
- ats_pass_probability: string (high|medium|low)
- hiring_manager_impression: string
- application_ready: boolean
- confidence: number (0-1)
Job description:
"""${job_description.slice(0, 3000)}"""
Resume:
"""${resume_text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'match-job', data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'match-job', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /optimize-for-ats ────────────────────────────────────────────────────
router.post('/optimize-for-ats', async (req: Request, res: Response) => {
  const { resume_text, job_description, target_role } = req.body;
  if (!resume_text) { res.status(400).json({ error: 'Provide resume_text' }); return; }
  const start = Date.now();
  try {
    const raw = await callClaude(`You are an ATS optimization engine. Optimize this resume for ATS systems and return ONLY a valid JSON object with these keys:
- optimized_resume_text: string (full rewritten resume)
- keywords_added: array of strings
- formatting_fixes: array of strings
- sections_reordered: boolean
- ats_score_before: number (0-100)
- ats_score_after: number (0-100)
- changes_made: array of {section, change, reason}
${job_description ? `Job description: ${job_description.slice(0, 3000)}` : ''}
${target_role ? `Target role: ${target_role}` : ''}
Resume:
"""${resume_text.slice(0, 8000)}"""
Return only the JSON object:`, 2000);
    res.json({ endpoint: 'optimize-for-ats', data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'optimize-for-ats', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /generate-bullets ────────────────────────────────────────────────────
router.post('/generate-bullets', async (req: Request, res: Response) => {
  const { bullet_points, target_role, tone } = req.body;
  if (!bullet_points || !Array.isArray(bullet_points)) { res.status(400).json({ error: 'Provide bullet_points as array' }); return; }
  const start = Date.now();
  try {
    const raw = await callClaude(`You are a resume bullet point rewriting engine. Rewrite these bullet points to be stronger, more impactful, and results-driven. Return ONLY a valid JSON object with these keys:
- rewritten_bullets: array of strings
- why_each_was_improved: array of {original, rewritten, reason, issues_found[]}
- tone_applied: string
${target_role ? `Target role: ${target_role}` : ''}
${tone ? `Tone: ${tone}` : 'Tone: professional'}
Bullet points:
${bullet_points.slice(0, 50).map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}
Return only the JSON object:`);
    res.json({ endpoint: 'generate-bullets', data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'generate-bullets', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /rewrite-summary ─────────────────────────────────────────────────────
router.post('/rewrite-summary', async (req: Request, res: Response) => {
  const { resume_text, target_role, tone, job_description } = req.body;
  if (!resume_text) { res.status(400).json({ error: 'Provide resume_text' }); return; }
  const start = Date.now();
  try {
    const raw = await callClaude(`You are a professional resume summary writer. Rewrite or generate a powerful professional summary for this resume. Return ONLY a valid JSON object with these keys:
- original_summary: string (extracted from resume, or empty if none found)
- rewritten_summary: string (new powerful summary, 3-5 sentences)
- keywords_included: array of strings
- tone_applied: string
- improvement_notes: array of strings
${target_role ? `Target role: ${target_role}` : ''}
${tone ? `Tone: ${tone}` : 'Tone: professional'}
${job_description ? `Job description: ${job_description.slice(0, 2000)}` : ''}
Resume:
"""${resume_text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'rewrite-summary', data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'rewrite-summary', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /gap-analysis ────────────────────────────────────────────────────────
router.post('/gap-analysis', async (req: Request, res: Response) => {
  const { resume_text, job_description, target_role, seniority } = req.body;
  if (!resume_text || !job_description) { res.status(400).json({ error: 'Provide resume_text and job_description' }); return; }
  const start = Date.now();
  try {
    const raw = await callClaude(`You are a career gap analysis engine. Identify all gaps between this resume and the target role/job description. Return ONLY a valid JSON object with these keys:
- skill_gaps: array of {skill, importance (critical|high|medium|low), how_to_address}
- experience_gaps: array of {gap, importance, how_to_address}
- education_gaps: array of strings
- certification_gaps: array of strings
- overall_gap_score: number (0-100, higher = bigger gap)
- time_to_close_estimate: string (e.g. "3-6 months")
- priority_actions: array of strings (top 5 things to do)
- application_ready: boolean
${target_role ? `Target role: ${target_role}` : ''}
${seniority ? `Seniority: ${seniority}` : ''}
Job description:
"""${job_description.slice(0, 3000)}"""
Resume:
"""${resume_text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'gap-analysis', data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'gap-analysis', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /cover-letter ────────────────────────────────────────────────────────
router.post('/cover-letter', async (req: Request, res: Response) => {
  const { resume_text, job_description, company_name, tone } = req.body;
  if (!resume_text || !job_description) { res.status(400).json({ error: 'Provide resume_text and job_description' }); return; }
  const start = Date.now();
  try {
    const raw = await callClaude(`You are an expert cover letter writer. Write a compelling cover letter based on this resume and job description. Return ONLY a valid JSON object with these keys:
- cover_letter: string (full cover letter text, 3-4 paragraphs)
- key_points_highlighted: array of strings
- tone_applied: string
- personalization_notes: array of strings
${company_name ? `Company: ${company_name}` : ''}
${tone ? `Tone: ${tone}` : 'Tone: professional'}
Job description:
"""${job_description.slice(0, 3000)}"""
Resume:
"""${resume_text.slice(0, 8000)}"""
Return only the JSON object:`, 2000);
    res.json({ endpoint: 'cover-letter', data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'cover-letter', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /execution-gate ──────────────────────────────────────────────────────
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { resume_text, job_description, threshold } = req.body;
  if (!resume_text || !job_description) { res.status(400).json({ error: 'Provide resume_text and job_description' }); return; }
  const start = Date.now();
  try {
    const raw = await callClaude(`You are a job application execution gate. Determine whether this resume is ready to apply to this job. Return ONLY a valid JSON object with these keys:
- execute: boolean (should the agent submit the application?)
- match_score: number (0-100)
- confidence: number (0-1)
- ats_pass_probability: string (high|medium|low)
- application_ready: boolean
- blocking_flags: array of strings (reasons NOT to apply)
- recommended_fixes: array of strings (fix these before applying)
- risk_level: string (high|medium|low)
- next_api: string (recommended next step e.g. "gap-analysis" or "optimize-for-ats")
- next_endpoint: string
- recommended_action: string
${threshold ? `Minimum match threshold: ${threshold}` : 'Minimum match threshold: 70'}
Job description:
"""${job_description.slice(0, 3000)}"""
Resume:
"""${resume_text.slice(0, 8000)}"""
Return only the JSON object:`);
    const data = parseJson(raw) as Record<string, unknown>;
    res.json({
      endpoint: 'execution-gate',
      execution_ready: data.execute === true,
      next_api: data.next_api ?? 'autopilot',
      next_endpoint: data.next_endpoint ?? '/should-execute',
      data,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.005, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'execution-gate', err }, message);
    res.status(500).json({ error: message });
  }
});

export default router;

// ── Webhook store ─────────────────────────────────────────────────────────────
interface JobWebhookEntry {
  id: string;
  resume_text: string;
  target_roles: string[];
  webhook_url: string;
  created_at: string;
  status: 'active' | 'cancelled';
  match_count: number;
}
const jobWebhookStore = new Map<string, JobWebhookEntry>();

// ── POST /rank-jobs ───────────────────────────────────────────────────────────
router.post('/rank-jobs', async (req: Request, res: Response) => {
  const { resume_text, job_postings, criteria } = req.body;
  if (!resume_text || !job_postings || !Array.isArray(job_postings)) {
    res.status(400).json({ error: 'Provide resume_text and job_postings array' }); return;
  }
  const start = Date.now();
  try {
    const raw = await callClaude(`You are a job ranking engine. Rank these job postings against the candidate's resume and return ONLY a valid JSON object with these keys:
- ranked_jobs: array of {rank, job_title, company, match_score (0-100), ats_pass_probability (high|medium|low), key_matches[], key_gaps[], recommendation (apply_now|apply_with_edits|skip), confidence (0-1)}
- top_pick: string (job title of best match)
- summary: string (1-2 sentences)
- total_ranked: number
${criteria ? `Ranking criteria: ${criteria}` : ''}
Job postings:
${job_postings.slice(0, 10).map((j: string, i: number) => `JOB ${i + 1}:\n${j}`).join('\n\n---\n\n')}
Resume:
"""${resume_text.slice(0, 6000)}"""
Return only the JSON object:`, 2000);
    res.json({ endpoint: 'rank-jobs', data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'rank-jobs', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /application-plan ────────────────────────────────────────────────────
router.post('/application-plan', async (req: Request, res: Response) => {
  const { resume_text, job_description, company_name, target_role } = req.body;
  if (!resume_text || !job_description) {
    res.status(400).json({ error: 'Provide resume_text and job_description' }); return;
  }
  const start = Date.now();
  try {
    const raw = await callClaude(`You are a career strategy engine. Generate an execution-ready application plan for this candidate. Return ONLY a valid JSON object with these keys:
- application_ready: boolean
- readiness_score: number (0-100)
- steps: array of {step, priority (critical|high|medium), action, estimated_time, blocking (true|false)}
- resume_edits_needed: array of strings
- cover_letter_needed: boolean
- networking_suggestions: array of strings
- timeline: string (e.g. "Apply in 3-5 days after making edits")
- success_probability: string (high|medium|low)
- next_api: string (recommended next step)
- next_endpoint: string
${company_name ? `Company: ${company_name}` : ''}
${target_role ? `Target role: ${target_role}` : ''}
Job description:
"""${job_description.slice(0, 3000)}"""
Resume:
"""${resume_text.slice(0, 6000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'application-plan', data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'application-plan', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /monitor-jobs ────────────────────────────────────────────────────────
router.post('/monitor-jobs', async (req: Request, res: Response) => {
  const { resume_text, target_roles, job_postings, context } = req.body;
  if (!resume_text || !target_roles || !Array.isArray(target_roles)) {
    res.status(400).json({ error: 'Provide resume_text and target_roles array' }); return;
  }
  const start = Date.now();
  try {
    const raw = await callClaude(`You are a job monitoring intelligence engine. Analyze these job postings against the candidate profile and surface the best matches. Return ONLY a valid JSON object with these keys:
- matches: array of {job_title, match_score (0-100), alert_level (high|medium|low), reason, action}
- best_match: string (job title)
- total_analyzed: number
- high_priority_count: number
- recommended_action: string
- next_check_recommendation: string (e.g. "Check again in 24 hours")
Target roles: ${target_roles.join(', ')}
${context ? `Context: ${context}` : ''}
${job_postings ? `Job postings:\n${(job_postings as string[]).slice(0, 5).join('\n\n---\n\n')}` : 'No postings provided — analyze based on target roles only.'}
Resume:
"""${resume_text.slice(0, 6000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'monitor-jobs', data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'monitor-jobs', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /register-webhook ────────────────────────────────────────────────────
router.post('/register-webhook', async (req: Request, res: Response) => {
  const { resume_text, target_roles, webhook_url } = req.body;
  if (!resume_text || !webhook_url || !target_roles) {
    res.status(400).json({ error: 'Provide resume_text, target_roles, and webhook_url' }); return;
  }
  const start = Date.now();
  try {
    const id = `rwh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entry: JobWebhookEntry = {
      id,
      resume_text: resume_text.slice(0, 500),
      target_roles: Array.isArray(target_roles) ? target_roles : [target_roles],
      webhook_url,
      created_at: new Date().toISOString(),
      status: 'active',
      match_count: 0,
    };
    jobWebhookStore.set(id, entry);
    res.json({
      endpoint: 'register-webhook',
      id,
      target_roles: entry.target_roles,
      webhook_url,
      status: 'active',
      message: 'Webhook registered. Call /monitor-jobs to evaluate postings and fire webhook on high matches.',
      registered_at: entry.created_at,
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'register-webhook', err }, message);
    res.status(500).json({ error: message });
  }
});
