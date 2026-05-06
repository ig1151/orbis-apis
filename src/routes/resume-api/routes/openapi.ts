import { Router } from 'express';
const router = Router();

router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Agent Career Optimization & Resume Intelligence API',
      version: '2.0.0',
      description: 'AI-powered resume analysis, ATS scoring, job matching, gap detection, cover letter generation, and execution-gated application readiness for autonomous agents.',
      'x-agent-callable': true,
      'x-monetization-grade': 'A+',
      'x-pricing': {
        '/analyze-resume': 0.004,
        '/score-resume': 0.002,
        '/match-job': 0.004,
        '/optimize-for-ats': 0.006,
        '/generate-bullets': 0.003,
        '/rewrite-summary': 0.003,
        '/gap-analysis': 0.005,
        '/cover-letter': 0.006,
        '/execution-gate': 0.005,
        '/rank-jobs': 0.005,
        '/application-plan': 0.005,
        '/monitor-jobs': 0.004,
        '/register-webhook': 0.002,
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/resume', description: 'Production' }],
    paths: {
      '/analyze-resume': { post: { summary: 'Full resume analysis with scores, strengths, weaknesses, section feedback', tags: ['Resume Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resume_text: { type: 'string' }, job_description: { type: 'string' }, target_role: { type: 'string' }, seniority: { type: 'string', enum: ['intern','junior','mid','senior','lead','executive'] } }, required: ['resume_text'] } } } }, responses: { 200: { description: 'Analysis with overall_score, ats_score, strengths, weaknesses, section_feedback' } } } },
      '/score-resume': { post: { summary: 'Score resume across ATS, readability, impact, completeness', tags: ['Resume Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resume_text: { type: 'string' }, target_role: { type: 'string' }, seniority: { type: 'string' } }, required: ['resume_text'] } } } }, responses: { 200: { description: 'Scores with grade, verdict, top_issues, quick_wins' } } } },
      '/match-job': { post: { summary: 'Match resume to job description — returns match score, gaps, ATS probability', tags: ['Job Matching'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resume_text: { type: 'string' }, job_description: { type: 'string' } }, required: ['resume_text', 'job_description'] } } } }, responses: { 200: { description: 'match_score, matched_keywords, skill_gaps, ats_pass_probability, application_ready' } } } },
      '/optimize-for-ats': { post: { summary: 'Rewrite resume for ATS optimization', tags: ['Resume Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resume_text: { type: 'string' }, job_description: { type: 'string' }, target_role: { type: 'string' } }, required: ['resume_text'] } } } }, responses: { 200: { description: 'optimized_resume_text, keywords_added, ats_score_before, ats_score_after' } } } },
      '/generate-bullets': { post: { summary: 'Rewrite weak bullet points to be results-driven', tags: ['Resume Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { bullet_points: { type: 'array', items: { type: 'string' } }, target_role: { type: 'string' }, tone: { type: 'string' } }, required: ['bullet_points'] } } } }, responses: { 200: { description: 'rewritten_bullets with why_each_was_improved' } } } },
      '/rewrite-summary': { post: { summary: 'Rewrite or generate a powerful professional summary', tags: ['Resume Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resume_text: { type: 'string' }, target_role: { type: 'string' }, tone: { type: 'string' }, job_description: { type: 'string' } }, required: ['resume_text'] } } } }, responses: { 200: { description: 'rewritten_summary with keywords_included and improvement_notes' } } } },
      '/gap-analysis': { post: { summary: 'Detect skill, experience, education gaps vs job description', tags: ['Job Matching'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resume_text: { type: 'string' }, job_description: { type: 'string' }, target_role: { type: 'string' }, seniority: { type: 'string' } }, required: ['resume_text', 'job_description'] } } } }, responses: { 200: { description: 'skill_gaps, experience_gaps, overall_gap_score, priority_actions, application_ready' } } } },
      '/cover-letter': { post: { summary: 'Generate a tailored cover letter from resume and job description', tags: ['Resume Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resume_text: { type: 'string' }, job_description: { type: 'string' }, company_name: { type: 'string' }, tone: { type: 'string' } }, required: ['resume_text', 'job_description'] } } } }, responses: { 200: { description: 'cover_letter text with key_points_highlighted and personalization_notes' } } } },
      '/execution-gate': { post: { summary: 'Gate autonomous job application — returns execute bool, blocking flags, next API', tags: ['Execution'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resume_text: { type: 'string' }, job_description: { type: 'string' }, threshold: { type: 'number' } }, required: ['resume_text', 'job_description'] } } } }, responses: { 200: { description: 'execution_ready, next_api, next_endpoint, blocking_flags, match_score, confidence' } } } },
      '/rank-jobs': { post: { summary: 'Rank job postings against candidate resume', tags: ['Job Matching'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resume_text: { type: 'string' }, job_postings: { type: 'array', items: { type: 'string' } }, criteria: { type: 'string' } }, required: ['resume_text', 'job_postings'] } } } }, responses: { 200: { description: 'ranked_jobs with match_score, recommendation, top_pick' } } } },
      '/application-plan': { post: { summary: 'Generate execution-ready application plan with prioritized steps', tags: ['Execution'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resume_text: { type: 'string' }, job_description: { type: 'string' }, company_name: { type: 'string' }, target_role: { type: 'string' } }, required: ['resume_text', 'job_description'] } } } }, responses: { 200: { description: 'steps, readiness_score, timeline, success_probability, next_api' } } } },
      '/monitor-jobs': { post: { summary: 'Monitor target roles and surface matching opportunities', tags: ['Monitoring'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resume_text: { type: 'string' }, target_roles: { type: 'array', items: { type: 'string' } }, job_postings: { type: 'array', items: { type: 'string' } }, context: { type: 'string' } }, required: ['resume_text', 'target_roles'] } } } }, responses: { 200: { description: 'matches with alert_level, best_match, recommended_action' } } } },
      '/register-webhook': { post: { summary: 'Register webhook for job-match and application-readiness events', tags: ['Monitoring'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resume_text: { type: 'string' }, target_roles: { type: 'array', items: { type: 'string' } }, webhook_url: { type: 'string' } }, required: ['resume_text', 'target_roles', 'webhook_url'] } } } }, responses: { 200: { description: 'Webhook registered with id, target_roles, status' } } } },
    },
  });
});

export default router;
