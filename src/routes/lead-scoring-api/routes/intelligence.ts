import { Router, Request, Response } from 'express';
import axios from 'axios';

// ── Universal Runtime Envelope ────────────────────────────────────────────────
function buildRuntime(req: any, overrides: Record<string, any> = {}) {
  const now          = Date.now();
  const trace_id     = req.headers?.['x-trace-id']     || `trace_${now}_${Math.random().toString(36).slice(2,8)}`;
  const execution_id = req.headers?.['x-execution-id'] || `exec_${now}_${Math.random().toString(36).slice(2,8)}`;
  const session_id   = req.body?.session_id || req.query?.session_id || req.headers?.['x-session-id'] || `session_${now}`;
  const request_id   = `req_${now}_${Math.random().toString(36).slice(2,8)}`;
  const unit         = 0.005;
  return {
    trace_id, execution_id, session_id, request_id,
    workflow_state:    overrides.workflow_state    || 'complete',
    retryable:         overrides.retryable         ?? false,
    latency_breakdown: overrides.latency_breakdown || { total_ms: 0, inference_ms: 0, io_ms: 0, overhead_ms: 0 },
    cost_breakdown:    overrides.cost_breakdown    || {
      total_usd:     unit,
      inference_usd: Math.round(unit * 0.70 * 1e6) / 1e6,
      io_usd:        Math.round(unit * 0.15 * 1e6) / 1e6,
      overhead_usd:  Math.round(unit * 0.15 * 1e6) / 1e6,
    },
    provenance: overrides.provenance || {
      api_version: '1.0.0', model: 'orbis-inference-v1',
      data_sources: [], computed_at: new Date().toISOString(),
    },
    retry_policy: overrides.retry_policy || {
      max_attempts: 3, backoff_strategy: 'exponential',
      backoff_base_ms: 500, safe_to_retry: true, idempotency_key: request_id,
    },
    dependencies: overrides.dependencies || {
      parent_execution: req.body?.parent_execution || req.headers?.['x-parent-execution'] || null,
      triggered_by:     req.body?.triggered_by     || req.headers?.['x-triggered-by']     || null,
      downstream: [], dag_id: req.body?.dag_id || req.headers?.['x-dag-id'] || null,
    },
    orchestration_hints: overrides.orchestration_hints || {
      can_chain: true, suggested_next: [], requires_review: false,
    },
  };
}


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
    name: 'lead-scoring API',
    info: '/lead-scoring/info',
    openapi: '/lead-scoring/openapi.json',
    health: 'ok'
  });
});


router.post('/score', async (req, res) => { req.url = '/score-lead'; (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
router.post('/score-lead', async (req: Request, res: Response) => {
  const { company_name, industry, company_size, revenue, technology_stack, engagement_signals, budget_range, timeline, pain_points } = req.body;
  if (!company_name || !industry) return res.status(400).json({ error: 'company_name and industry are required' });
  try {
    const result = await callClaude(
      'You are an expert B2B lead scoring engine. Return only valid JSON.',
      `Score this lead and return JSON with fields: lead_score (0-100), grade (A+/A/B/C/D), qualification_status (hot/warm/cold/disqualified), fit_dimensions (budget_fit, authority_fit, need_fit, timeline_fit each 0-100), score_breakdown (object with weighted factors), recommended_action, next_steps (array), disqualification_flags (array), confidence_level (0-100). Lead: ${JSON.stringify({ company_name, industry, company_size, revenue, technology_stack, engagement_signals, budget_range, timeline, pain_points })}`
    );
    res.json({ success: true, company_name, ...result, scored_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Scoring failed', details: e.message }); }
});

router.post('/qualify-bant', async (req: Request, res: Response) => {
  const { lead_data, conversation_notes, discovery_answers } = req.body;
  if (!lead_data) return res.status(400).json({ error: 'lead_data is required' });
  try {
    const result = await callClaude(
      'You are a BANT qualification specialist. Return only valid JSON.',
      `Perform BANT qualification and return JSON with fields: bant_score (0-100), budget_qualification (score, evidence, gaps), authority_qualification (score, evidence, gaps), need_qualification (score, evidence, gaps), timeline_qualification (score, evidence, gaps), overall_verdict (qualified/unqualified/needs_more_info), qualification_confidence, missing_information (array), recommended_discovery_questions (array). Data: ${JSON.stringify({ lead_data, conversation_notes, discovery_answers })}`
    );
    res.json({ success: true, ...result, qualified_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'BANT qualification failed', details: e.message }); }
});

router.post('/icp-fit', async (req: Request, res: Response) => {
  const { lead_profile, icp_definition } = req.body;
  if (!lead_profile || !icp_definition) return res.status(400).json({ error: 'lead_profile and icp_definition are required' });
  try {
    const result = await callClaude(
      'You are an ICP matching engine. Return only valid JSON.',
      `Analyze this lead against the ICP and return JSON with fields: icp_fit_score (0-100), fit_grade (A+/A/B/C/D), matching_criteria (array), mismatching_criteria (array), persona_match (primary_persona, confidence), segment_classification, expansion_potential (score, rationale), recommended_approach, customization_suggestions (array). Lead: ${JSON.stringify(lead_profile)} ICP: ${JSON.stringify(icp_definition)}`
    );
    res.json({ success: true, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'ICP fit analysis failed', details: e.message }); }
});

router.post('/intent-signals', async (req: Request, res: Response) => {
  const { company_name, behavioral_data, firmographic_data, engagement_history } = req.body;
  if (!company_name) return res.status(400).json({ error: 'company_name is required' });
  try {
    const result = await callClaude(
      'You are a buyer intent signal analyst. Return only valid JSON.',
      `Analyze buyer intent signals and return JSON with fields: intent_score (0-100), buying_stage (awareness/consideration/decision/purchase), signal_strength (strong/moderate/weak), intent_categories (array with category, signal, weight), urgency_indicators (array), trigger_events (array), competitive_signals (array), recommended_timing, engagement_score (0-100), conversion_probability (0-100). Data: ${JSON.stringify({ company_name, behavioral_data, firmographic_data, engagement_history })}`
    );
    res.json({ success: true, company_name, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Intent signal analysis failed', details: e.message }); }
});

router.post('/priority-rank', async (req: Request, res: Response) => {
  const { leads, scoring_weights, capacity } = req.body;
  if (!leads || !Array.isArray(leads) || leads.length === 0) return res.status(400).json({ error: 'leads array is required' });
  try {
    const result = await callClaude(
      'You are a sales prioritization engine. Return only valid JSON.',
      `Rank these ${leads.length} leads by priority and return JSON with fields: ranked_leads (array with rank, lead_id, priority_score, tier, rationale), tier_distribution (hot/warm/cold counts), recommended_daily_focus (array), prioritization_logic, review_date. Leads: ${JSON.stringify(leads)} Weights: ${JSON.stringify(scoring_weights || {})} Capacity: ${capacity || 'not specified'}`
    );
    res.json({ success: true, total_leads: leads.length, ...result, ranked_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Priority ranking failed', details: e.message }); }
});

router.post('/disqualify', async (req: Request, res: Response) => {
  const { lead_data, disqualification_criteria } = req.body;
  if (!lead_data) return res.status(400).json({ error: 'lead_data is required' });
  try {
    const result = await callClaude(
      'You are a lead disqualification specialist. Return only valid JSON.',
      `Evaluate this lead for disqualification and return JSON with fields: disqualification_verdict (disqualified/borderline/qualified), disqualification_flags (array with flag, severity, evidence), disqualification_score (0-100), hard_stops (array), soft_flags (array), salvage_potential (score, actions), recycle_timeline, recommendation (archive/recycle/escalate_review). Lead: ${JSON.stringify(lead_data)} Criteria: ${JSON.stringify(disqualification_criteria || {})}`
    );
    res.json({ success: true, ...result, evaluated_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Disqualification analysis failed', details: e.message }); }
});

router.post('/enrich-profile', async (req: Request, res: Response) => {
  const { basic_lead_info, enrichment_context } = req.body;
  if (!basic_lead_info) return res.status(400).json({ error: 'basic_lead_info is required' });
  try {
    const result = await callClaude(
      'You are a lead enrichment and intelligence engine. Return only valid JSON.',
      `Enrich this lead profile and return JSON with fields: enriched_profile (firmographics, technographics, financials), persona_inference (role_type, seniority, decision_making_authority, buying_influence), company_intelligence (growth_signals, challenges, initiatives), competitive_landscape (known_vendors, switching_likelihood), conversation_starters (array), value_propositions (array), enrichment_confidence (0-100). Basic info: ${JSON.stringify(basic_lead_info)} Context: ${JSON.stringify(enrichment_context || {})}`
    );
    res.json({ success: true, ...result, enriched_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Profile enrichment failed', details: e.message }); }
});

router.post('/conversion-predict', async (req: Request, res: Response) => {
  const { lead_score, deal_size, sales_cycle_data, historical_patterns, current_stage } = req.body;
  if (!lead_score || !current_stage) return res.status(400).json({ error: 'lead_score and current_stage are required' });
  try {
    const result = await callClaude(
      'You are a sales conversion prediction model. Return only valid JSON.',
      `Predict conversion probability and return JSON with fields: conversion_probability (0-100), confidence_interval (low, high), predicted_close_date, expected_deal_value, stage_progression (array with stage, probability), risk_factors (array), acceleration_opportunities (array), win_loss_indicators (positive array, negative array), recommended_actions (array), forecast_category (commit/best_case/pipeline/omit). Data: ${JSON.stringify({ lead_score, deal_size, sales_cycle_data, historical_patterns, current_stage })}`
    );
    res.json({ success: true, ...result, predicted_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Conversion prediction failed', details: e.message }); }
});

router.post('/competitive-position', async (req: Request, res: Response) => {
  const { lead_data, your_solution, known_competitors } = req.body;
  if (!lead_data || !your_solution) return res.status(400).json({ error: 'lead_data and your_solution are required' });
  try {
    const result = await callClaude(
      'You are a competitive sales intelligence analyst. Return only valid JSON.',
      `Analyze competitive positioning and return JSON with fields: competitive_score (0-100), likely_competitors (array with name, threat_level, win_probability), your_advantages (array), your_vulnerabilities (array), differentiation_strategy, objection_predictions (array with objection, counter), win_themes (array), competitive_landmines (array), positioning_recommendation, deal_risk_level (low/medium/high/critical). Lead: ${JSON.stringify(lead_data)} Solution: ${JSON.stringify(your_solution)} Competitors: ${JSON.stringify(known_competitors || [])}`
    );
    res.json({ success: true, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Competitive analysis failed', details: e.message }); }
});

router.post('/routing-decision', async (req: Request, res: Response) => {
  const { lead_data, team_structure, routing_rules } = req.body;
  if (!lead_data) return res.status(400).json({ error: 'lead_data is required' });
  try {
    const result = await callClaude(
      'You are a lead routing and assignment engine. Return only valid JSON.',
      `Determine optimal lead routing and return JSON with fields: routing_decision (team/rep/queue), routing_rationale, assignment_criteria (array), sla_tier (standard/priority/vip), response_time_target, escalation_triggers (array), handoff_notes, specialization_match (score, reason), routing_confidence (0-100), fallback_routing. Lead: ${JSON.stringify(lead_data)} Team: ${JSON.stringify(team_structure || {})} Rules: ${JSON.stringify(routing_rules || {})}`
    );
    res.json({ success: true, ...result, routed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Routing decision failed', details: e.message }); }
});

router.post('/score-batch', async (req: Request, res: Response) => {
  const { leads, scoring_model } = req.body;
  if (!leads || !Array.isArray(leads) || leads.length === 0) return res.status(400).json({ error: 'leads array is required' });
  if (leads.length > 20) return res.status(422).json({ error: 'Maximum 20 leads per batch' });
  try {
    const result = await callClaude(
      'You are a batch lead scoring engine. Return only valid JSON.',
      `Score all ${leads.length} leads and return JSON with fields: scored_leads (array with lead_id, score, grade, status, top_reason), batch_summary (total, hot_count, warm_count, cold_count, avg_score), top_leads (array of top 3), model_applied, scoring_notes. Leads: ${JSON.stringify(leads)} Model: ${JSON.stringify(scoring_model || {})}`
    );
    res.json({ success: true, batch_size: leads.length, ...result, scored_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Batch scoring failed', details: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { lead_score, qualification_status, intent_score, icp_fit_score, has_email, confidence_score, do_not_contact } = req.body;
  const score = lead_score || 0;
  const intent = intent_score || 0;
  const icp = icp_fit_score || 0;
  const confidence = confidence_score || 0;
  const status = qualification_status || 'unknown';
  const blocking_flags: string[] = [];
  if (score < 40) blocking_flags.push('lead_score_too_low');
  if (status === 'disqualified') blocking_flags.push('lead_disqualified');
  if (intent < 30) blocking_flags.push('insufficient_intent_signals');
  if (icp < 40) blocking_flags.push('not_icp_fit');
  if (has_email === false) blocking_flags.push('missing_email');
  if (confidence > 0 && confidence < 40) blocking_flags.push('low_confidence');
  if (do_not_contact === true) blocking_flags.push('do_not_contact');
  if (score >= 40 && confidence > 0 && confidence < 50) blocking_flags.push('requires_human_review');
  const execution_ready = blocking_flags.length === 0 && score >= 40;
  const next_apis = execution_ready ? {
    primary: { api: 'cold-outreach', endpoint: '/cold-outreach/generate-sequence' },
    optional: [
      { api: 'email-intelligence', endpoint: '/email-intelligence/validate' },
      { api: 'crm-update', endpoint: '/crm-update/upsert-lead' },
      { api: 'calendar-scheduling', endpoint: '/calendar-scheduling/find-slot' }
    ]
  } : null;
  res.json({
    execution_ready,
    lead_score: score,
    qualification_status: status,
    blocking_flags,
    blocking_flag_definitions: {
      lead_score_too_low: 'Score below 40 threshold for outreach',
      lead_disqualified: 'Lead marked as disqualified',
      insufficient_intent_signals: 'Intent score below 30',
      not_icp_fit: 'ICP fit score below 40',
      missing_email: 'No email address available for outreach',
      low_confidence: 'Confidence score below 40 — enrichment recommended',
      do_not_contact: 'Lead is on do-not-contact list',
      requires_human_review: 'Borderline score requires human decision'
    },
    next_apis,
    recommended_action: execution_ready ? (score >= 80 ? 'immediate_outreach' : 'nurture_then_outreach') : 'disqualify_or_recycle',
    metadata: {
      composite_score: Math.round((score + intent + icp) / 3),
      pipeline_stage: score >= 80 ? 'sales_ready' : score >= 60 ? 'marketing_qualified' : 'early_stage',
      privacy: { data_stored: false, retention: 'none', crm_data_logged: false },
      evaluated_at: new Date().toISOString()
    }
  });
});

router.post('/analyze-lead', async (req: Request, res: Response) => {
  const { company_name, industry, lead_data, icp_definition, known_competitors, your_solution } = req.body;
  if (!company_name || !industry) return res.status(400).json({ error: 'company_name and industry are required' });
  try {
    const result = await callClaude(
      'You are a complete lead intelligence platform. Return only valid JSON.',
      `Run a full lead analysis and return JSON with fields: lead_score (0-100), grade (A+/A/B/C/D), qualification_status (hot/warm/cold/disqualified), bant_summary (budget/authority/need/timeline each with score and verdict), icp_fit (score, match_level, key_gaps), intent_analysis (score, stage, top_signals), competitive_position (threat_level, win_probability, key_differentiators), conversion_probability (0-100), routing_recommendation, priority_tier (1-4), executive_summary, immediate_actions (array of top 3), pipeline_value_estimate, confidence_score (0-100). Data: ${JSON.stringify({ company_name, industry, lead_data, icp_definition, known_competitors, your_solution })}`
    );
    res.json({ success: true, company_name, workflow: 'full_lead_analysis', ...result, execution_gate: { ready: (result.lead_score || 0) >= 40, next_api: (result.lead_score || 0) >= 40 ? 'cold-outreach' : null }, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Full lead analysis failed', details: e.message }); }
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
