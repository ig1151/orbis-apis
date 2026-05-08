import { Router, Request, Response } from 'express';
import axios from 'axios';

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

export default router;
