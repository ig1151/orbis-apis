import { Router, Request, Response } from 'express';
import axios from 'axios';
import { buildRuntime } from '../../../shared/ai';

// ── Universal Runtime Envelope ────────────────────────────────────────────────


const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(systemPrompt: string, userPrompt: string): Promise<any> {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const raw = response.data.choices[0].message.content;
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}


router.get('/', (_req, res) => {
  res.json({
    name: 'cold-outreach API',
    info: '/cold-outreach/info',
    openapi: '/cold-outreach/openapi.json',
    health: 'ok'
  });
});


router.post('/generate', async (req, res) => { req.url = '/generate-sequence'; (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
router.post('/generate-sequence', async (req: Request, res: Response) => {
  const { prospect_name, company_name, industry, pain_points, your_solution, sequence_length, tone } = req.body;
  if (!prospect_name || !company_name) return res.status(400).json({ error: 'prospect_name and company_name are required' });
  try {
    const result = await callClaude(
      'You are an expert cold outreach copywriter. Return only valid JSON.',
      `Generate a cold outreach sequence and return JSON with fields: sequence (array of objects with step, channel, day, subject, body, cta), sequence_strategy, personalization_hooks (array), optimal_send_times (array), follow_up_logic, expected_reply_rate (percentage), confidence_score (0-100). Prospect: ${JSON.stringify({ prospect_name, company_name, industry, pain_points, your_solution, sequence_length: sequence_length || 5, tone: tone || 'professional' })}`
    );
    res.json({ success: true, prospect_name, company_name, ...result, generated_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Sequence generation failed', details: e.message }); }
});

router.post('/personalize-email', async (req: Request, res: Response) => {
  const { template, prospect_data, company_data, personalization_depth } = req.body;
  if (!template || !prospect_data) return res.status(400).json({ error: 'template and prospect_data are required' });
  try {
    const result = await callClaude(
      'You are a cold email personalization specialist. Return only valid JSON.',
      `Personalize this email template and return JSON with fields: personalized_subject, personalized_body, personalization_elements (array with element, original, personalized, impact), relevance_score (0-100), authenticity_score (0-100), personalization_depth_achieved, suggested_improvements (array), spam_risk (low/medium/high), confidence_score (0-100). Template: ${template} Prospect: ${JSON.stringify(prospect_data)} Company: ${JSON.stringify(company_data || {})} Depth: ${personalization_depth || 'deep'}`
    );
    res.json({ success: true, ...result, personalized_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Personalization failed', details: e.message }); }
});

router.post('/optimize-subject', async (req: Request, res: Response) => {
  const { subject_line, prospect_data, industry, goal } = req.body;
  if (!subject_line) return res.status(400).json({ error: 'subject_line is required' });
  try {
    const result = await callClaude(
      'You are a cold email subject line optimization expert. Return only valid JSON.',
      `Analyze and optimize this subject line and return JSON with fields: original_subject, optimized_variants (array of 5 with subject, predicted_open_rate, tone, tactic), best_variant, open_rate_prediction (0-100), spam_score (0-100), character_count_analysis, emotional_triggers (array), power_words (array), ab_test_recommendation, confidence_score (0-100). Subject: "${subject_line}" Prospect: ${JSON.stringify(prospect_data || {})} Industry: ${industry || 'general'} Goal: ${goal || 'meeting'}`
    );
    res.json({ success: true, ...result, optimized_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Subject optimization failed', details: e.message }); }
});

router.post('/analyze-reply', async (req: Request, res: Response) => {
  const { reply_text, original_email, prospect_data } = req.body;
  if (!reply_text) return res.status(400).json({ error: 'reply_text is required' });
  try {
    const result = await callClaude(
      'You are a sales reply intelligence analyst. Return only valid JSON.',
      `Analyze this reply and return JSON with fields: sentiment (positive/neutral/negative/objection/not_interested), intent (interested/needs_info/objecting/scheduling/unsubscribe/out_of_office), interest_score (0-100), buying_signals (array), objections (array with objection, severity, suggested_counter), next_action (respond/call/schedule/nurture/close/remove), urgency (high/medium/low), recommended_response_template, key_insights (array), confidence_score (0-100). Reply: "${reply_text}" Original: ${JSON.stringify(original_email || {})} Prospect: ${JSON.stringify(prospect_data || {})}`
    );
    res.json({ success: true, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Reply analysis failed', details: e.message }); }
});

router.post('/generate-followup', async (req: Request, res: Response) => {
  const { previous_emails, prospect_data, followup_number, reason } = req.body;
  if (!previous_emails || !prospect_data) return res.status(400).json({ error: 'previous_emails and prospect_data are required' });
  try {
    const result = await callClaude(
      'You are a follow-up email specialist. Return only valid JSON.',
      `Generate a follow-up email and return JSON with fields: subject, body, followup_angle, value_add_element, cta, tone_shift (from previous), breakup_email (boolean — is this a final breakup email?), send_delay_days, predicted_open_rate (0-100), predicted_reply_rate (0-100), confidence_score (0-100). Previous emails: ${JSON.stringify(previous_emails)} Prospect: ${JSON.stringify(prospect_data)} Follow-up number: ${followup_number || 1} Reason for no reply: ${reason || 'unknown'}`
    );
    res.json({ success: true, ...result, generated_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Follow-up generation failed', details: e.message }); }
});

router.post('/score-email', async (req: Request, res: Response) => {
  const { subject, body, prospect_data, goal } = req.body;
  if (!subject || !body) return res.status(400).json({ error: 'subject and body are required' });
  try {
    const result = await callClaude(
      'You are a cold email quality scoring engine. Return only valid JSON.',
      `Score this cold email and return JSON with fields: overall_score (0-100), grade (A+/A/B/C/D), dimension_scores (personalization, clarity, value_prop, cta_strength, tone, length each 0-100), strengths (array), weaknesses (array), spam_risk (low/medium/high), predicted_open_rate (0-100), predicted_reply_rate (0-100), rewrite_suggestions (array), confidence_score (0-100). Subject: "${subject}" Body: "${body}" Prospect: ${JSON.stringify(prospect_data || {})} Goal: ${goal || 'meeting'}`
    );
    res.json({ success: true, ...result, scored_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Email scoring failed', details: e.message }); }
});

router.post('/ab-test', async (req: Request, res: Response) => {
  const { email_variants, prospect_segment, goal } = req.body;
  if (!email_variants || !Array.isArray(email_variants) || email_variants.length < 2) return res.status(400).json({ error: 'email_variants array with at least 2 variants is required' });
  try {
    const result = await callClaude(
      'You are an A/B testing specialist for cold email. Return only valid JSON.',
      `Analyze these email variants for A/B testing and return JSON with fields: winner (variant index), winner_rationale, variant_analysis (array with variant_index, predicted_open_rate, predicted_reply_rate, strengths, weaknesses, score), test_recommendation (what to test first), statistical_significance_needed, segment_fit (which variant fits which sub-segment), confidence_score (0-100). Variants: ${JSON.stringify(email_variants)} Segment: ${JSON.stringify(prospect_segment || {})} Goal: ${goal || 'reply'}`
    );
    res.json({ success: true, variant_count: email_variants.length, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'A/B test analysis failed', details: e.message }); }
});

router.post('/objection-handler', async (req: Request, res: Response) => {
  const { objection, context, prospect_data, your_solution } = req.body;
  if (!objection) return res.status(400).json({ error: 'objection is required' });
  try {
    const result = await callClaude(
      'You are a sales objection handling specialist. Return only valid JSON.',
      `Handle this sales objection and return JSON with fields: objection_type (price/timing/competitor/no_need/no_authority/trust/other), severity (high/medium/low), root_cause, reframe_strategy, response_variants (array of 3 with approach, script, tone, predicted_effectiveness), do_not_say (array), empathy_opener, proof_points (array), next_step_after_handling, confidence_score (0-100). Objection: "${objection}" Context: ${JSON.stringify(context || {})} Prospect: ${JSON.stringify(prospect_data || {})} Solution: ${JSON.stringify(your_solution || {})}`
    );
    res.json({ success: true, objection, ...result, generated_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Objection handling failed', details: e.message }); }
});

router.post('/timing-optimizer', async (req: Request, res: Response) => {
  const { prospect_timezone, industry, email_type, prospect_behavior } = req.body;
  if (!industry) return res.status(400).json({ error: 'industry is required' });
  try {
    const result = await callClaude(
      'You are an email timing optimization specialist. Return only valid JSON.',
      `Optimize send timing and return JSON with fields: best_send_times (array with day, time, timezone, expected_open_rate, rationale), worst_send_times (array), optimal_sequence_cadence (array with step, delay_days, best_time), industry_patterns, timezone_considerations, follow_up_spacing_recommendation, confidence_score (0-100). Timezone: ${prospect_timezone || 'US/Eastern'} Industry: ${industry} Email type: ${email_type || 'cold'} Behavior data: ${JSON.stringify(prospect_behavior || {})}`
    );
    res.json({ success: true, ...result, optimized_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Timing optimization failed', details: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { email_score, spam_risk, prospect_status, has_email, do_not_contact } = req.body;
  const score = email_score || 0;
  const blocking_flags: string[] = [];
  if (score < 50) blocking_flags.push('email_score_too_low');
  if (spam_risk === 'high') blocking_flags.push('high_spam_risk');
  if (prospect_status === 'unsubscribed') blocking_flags.push('prospect_unsubscribed');
  if (has_email === false) blocking_flags.push('missing_email_address');
  if (do_not_contact === true) blocking_flags.push('do_not_contact');
  const execution_ready = blocking_flags.length === 0 && score >= 50;
  res.json({
    execution_ready,
    email_score: score,
    blocking_flags,
    blocking_flag_definitions: {
      email_score_too_low: 'Email quality score below 50 threshold',
      high_spam_risk: 'Email flagged as high spam risk',
      prospect_unsubscribed: 'Prospect has unsubscribed',
      missing_email_address: 'No email address available',
      do_not_contact: 'Prospect is on do-not-contact list'
    },
    next_api: execution_ready ? 'competitor-monitor' : null,
    next_endpoint: execution_ready ? '/competitor-monitor/analyze' : null,
    recommended_action: execution_ready ? (score >= 80 ? 'send_immediately' : 'review_then_send') : 'fix_before_sending',
    privacy: { data_stored: false, retention: 'none' },
    evaluated_at: new Date().toISOString()
  });
});

router.post('/analyze-outreach', async (req: Request, res: Response) => {
  const { prospect_name, company_name, industry, pain_points, your_solution, prospect_data } = req.body;
  if (!prospect_name || !company_name) return res.status(400).json({ error: 'prospect_name and company_name are required' });
  try {
    const result = await callClaude(
      'You are a complete cold outreach intelligence platform. Return only valid JSON.',
      `Run a full outreach analysis and return JSON with fields: outreach_strategy (recommended_channels, sequence_length, tone, key_angle), email_sequence (array of 3 emails with subject, body, day, cta), subject_line_options (array of 5 with open_rate_prediction), personalization_hooks (array), objection_preparation (array with likely_objection, counter), optimal_timing (best_day, best_time, timezone_note), quality_score (0-100), spam_risk (low/medium/high), expected_reply_rate (0-100), executive_summary, confidence_score (0-100). Data: ${JSON.stringify({ prospect_name, company_name, industry, pain_points, your_solution, prospect_data })}`
    );
    res.json({ success: true, prospect_name, company_name, workflow: 'full_outreach_analysis', ...result, execution_gate: { ready: (result.quality_score || 0) >= 50, next_api: (result.quality_score || 0) >= 50 ? 'competitor-monitor' : null }, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Full outreach analysis failed', details: e.message }); }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["productivity:read", "productivity:generate", "productivity:execute"];
const EXECUTION_AUTHORITY: string = "low";
function evaluateGovernance(req: any) {
  const agent_id        = req.headers?.['x-agent-id']    || req.body?.agent_id    || null;
  const provided_scopes = (req.headers?.['x-agent-scopes'] || '').split(',').filter(Boolean);
  const trust_score     = Math.min(1.0, Math.max(0.0, parseFloat(req.headers?.['x-agent-trust-score'] || '1.0') || 1.0));
  const sandbox_mode    = req.headers?.['x-sandbox-mode'] === 'true' || trust_score < 0.5;
  const violations: string[] = [];
  if (trust_score < 0.3) violations.push('trust_score_below_threshold');
  const permitted = violations.filter((v: string) => v.includes('trust_score_below_threshold')).length === 0;
  return { permitted, agent_id, scopes: provided_scopes.length > 0 ? provided_scopes : REQUIRED_SCOPES,
    trust_score, execution_authority: EXECUTION_AUTHORITY, sandbox_mode, violations,
    audit_entry: { agent_id, timestamp: new Date().toISOString(), endpoint: req.path,
      method: req.method, permitted, trust_score, sandbox_mode } };
}
router.get('/events/:execution_id', (req: any, res: any) => {
  const events = eventStore[req.params.execution_id] || [];
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    execution_id: req.params.execution_id, events, total: events.length,
    computed_at: new Date().toISOString() });
});
router.get('/events/:execution_id/stream', (req: any, res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  let index = 0;
  const existing = eventStore[req.params.execution_id] || [];
  existing.forEach((evt: any) => { res.write(`data: ${JSON.stringify(evt)}

`); index++; });
  const interval = setInterval(() => {
    const current = eventStore[req.params.execution_id] || [];
    while (index < current.length) { res.write(`data: ${JSON.stringify(current[index])}

`); index++; }
  }, 500);
  req.on('close', () => clearInterval(interval));
});
router.post('/governance/check', (req: any, res: any) => {
  const gov = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: gov.permitted ? 'complete' : 'blocked',
    retryable: !gov.permitted && !gov.violations.includes('trust_score_below_threshold') }),
    success: gov.permitted, permitted: gov.permitted, agent_id: gov.agent_id,
    scopes: gov.scopes, required_scopes: REQUIRED_SCOPES, trust_score: gov.trust_score,
    execution_authority: gov.execution_authority, sandbox_mode: gov.sandbox_mode,
    violations: gov.violations, audit_entry: gov.audit_entry,
    computed_at: new Date().toISOString() });
});
router.get('/governance/scopes', (req: any, res: any) => {
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    required_scopes: REQUIRED_SCOPES, execution_authority: EXECUTION_AUTHORITY,
    scope_descriptions: REQUIRED_SCOPES.reduce((acc: any, s: string) => {
      acc[s] = `Permission to ${s.replace(':', ' ')} on this API`; return acc; }, {}),
    computed_at: new Date().toISOString() });
});
router.post('/governance/audit', (req: any, res: any) => {
  const { execution_id } = req.body || {};
  const events = execution_id ? (eventStore[execution_id] || []) : [];
  const gov    = evaluateGovernance(req);
  res.json({ ...buildRuntime(req, { workflow_state: 'complete' }), success: true,
    audit_trail: events, total_events: events.length, agent_id: gov.agent_id,
    trust_score: gov.trust_score, sandbox_mode: gov.sandbox_mode,
    audit_summary: { governance_checks: events.filter((e: any) => e.event === 'governance_check').length,
      step_completions: events.filter((e: any) => e.event === 'step_completed').length,
      violations: gov.violations, permitted: gov.permitted },
    computed_at: new Date().toISOString() });
});


// ── Workflow Runtime Layer ────────────────────────────────────────────────────
const workflowStore: Record<string, any> = {};
function createWorkflow(id: string, goal: string, steps: string[], meta: any) {
  const now = new Date().toISOString();
  workflowStore[id] = { workflow_id: id, goal, steps, current_step: steps[0], step_index: 0,
    status: 'running', created_at: now, updated_at: now,
    completed_steps: [], pending_steps: steps.slice(1), results: {}, meta };
  return workflowStore[id];
}
function advanceWorkflow(id: string) {
  const wf = workflowStore[id];
  if (!wf) return null;
  if (wf.step_index < wf.steps.length - 1) {
    wf.completed_steps.push(wf.current_step);
    wf.step_index += 1;
    wf.current_step  = wf.steps[wf.step_index];
    wf.pending_steps = wf.steps.slice(wf.step_index + 1);
    wf.status        = wf.step_index === wf.steps.length - 1 ? 'complete' : 'running';
  } else {
    wf.completed_steps.push(wf.current_step); wf.status = 'complete'; wf.pending_steps = [];
  }
  wf.updated_at = new Date().toISOString();
  return wf;
}
router.post('/workflow/start', (req: any, res: any) => {
  const { goal, steps, meta } = req.body || {};
  const workflow_id = `wf_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "generate_content", "score_quality", "apply_tone", "finalize"], meta || {});
  res.json({ ...buildRuntime(req, { workflow_state: 'running', orchestration_hints: { can_chain: true, suggested_next: ['GET /workflow/' + workflow_id], requires_review: false } }),
    success: true, workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    steps: wf.steps, pending_steps: wf.pending_steps, created_at: wf.created_at,
    estimated_steps: wf.steps.length, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id, goal: wf.goal, status: wf.status, current_step: wf.current_step,
    step_index: wf.step_index, total_steps: wf.steps.length, completed_steps: wf.completed_steps,
    pending_steps: wf.pending_steps, progress_pct: Math.round((wf.step_index / wf.steps.length) * 100),
    created_at: wf.created_at, updated_at: wf.updated_at, results: wf.results,
    computed_at: new Date().toISOString() });
});
router.post('/workflow/:id/resume', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  if (wf.status === 'complete') return res.json({ ...buildRuntime(req, { workflow_state: 'complete' }),
    success: true, workflow_id: wf.workflow_id, status: 'complete', message: 'Already complete' });
  const advanced = advanceWorkflow(req.params.id);
  res.json({ ...buildRuntime(req, { workflow_state: advanced!.status, retryable: advanced!.status !== 'complete',
    orchestration_hints: { can_chain: true, suggested_next: advanced!.status === 'complete' ? [] : ['POST /workflow/' + req.params.id + '/resume'], requires_review: false } }),
    success: true, workflow_id: advanced!.workflow_id, status: advanced!.status,
    current_step: advanced!.current_step, completed_steps: advanced!.completed_steps,
    pending_steps: advanced!.pending_steps, progress_pct: Math.round((advanced!.step_index / advanced!.steps.length) * 100),
    updated_at: advanced!.updated_at, computed_at: new Date().toISOString() });
});
router.get('/workflow/:id/state', (req: any, res: any) => {
  const wf = workflowStore[req.params.id];
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ ...buildRuntime(req, { workflow_state: wf.status }), success: true,
    workflow_id: wf.workflow_id,
    state_machine: { current_state: wf.current_step, previous_states: wf.completed_steps,
      next_states: wf.pending_steps, terminal: wf.status === 'complete',
      transitions: wf.steps.map((s: string, i: number) => ({ step: i+1, state: s,
        status: i < wf.step_index ? 'complete' : i === wf.step_index ? 'active' : 'pending' })) },
    meta: wf.meta, created_at: wf.created_at, updated_at: wf.updated_at,
    computed_at: new Date().toISOString() });
});

export default router;
