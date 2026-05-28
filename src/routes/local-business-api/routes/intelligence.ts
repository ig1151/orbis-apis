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

router.get('/', (_req, res) => {
  res.json({ name: 'local-business API', info: '/local-business/info', openapi: '/local-business/openapi.json', health: 'ok' });
});

router.post('/analyze-business', async (req: Request, res: Response) => {
  const { business_name, location, category, competitors } = req.body;
  if (!business_name || !location) return res.status(400).json({ error: 'business_name and location are required' });
  try {
    const result = await callClaude(
      'You are a local business intelligence analyst. Return only valid JSON.',
      `Analyze this local business and return JSON with fields: business_score (0-100), market_position (leader/challenger/follower/niche), strengths (array max 4), weaknesses (array max 4), opportunities (array max 4), threats (array max 4), customer_demographics (primary_age_range, income_level, lifestyle), foot_traffic_estimate (low/medium/high), peak_hours (array), seasonal_patterns, competitive_advantage, recommended_actions (array max 4), confidence (object with market_position, demographics, foot_traffic each 0-100). Data: ${JSON.stringify({ business_name, location, category, competitors })}`
    );
    res.json({ success: true, business_name, location, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Business analysis failed', details: e.message }); }
});

router.post('/reputation-analysis', async (req: Request, res: Response) => {
  const { business_name, location, category, review_data } = req.body;
  if (!business_name || !location) return res.status(400).json({ error: 'business_name and location are required' });
  try {
    const result = await callClaude(
      'You are a local business reputation analyst. Return only valid JSON.',
      `Analyze this business reputation and return JSON with fields: reputation_score (0-100), sentiment_breakdown (positive, neutral, negative as percentages), review_themes (positive_themes array, negative_themes array), response_rate_estimate, owner_engagement_score (0-100), trust_signals (array), red_flags (array), competitor_reputation_comparison, improvement_priorities (array max 4 with priority, action, expected_impact), recommended_response_templates (array max 2), confidence (object with sentiment, themes, trust_signals each 0-100). Data: ${JSON.stringify({ business_name, location, category, review_data })}`
    );
    res.json({ success: true, business_name, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Reputation analysis failed', details: e.message }); }
});

router.post('/foot-traffic-signals', async (req: Request, res: Response) => {
  const { business_name, location, category, time_period } = req.body;
  if (!business_name || !location) return res.status(400).json({ error: 'business_name and location are required' });
  try {
    const result = await callClaude(
      'You are a foot traffic and location intelligence analyst. Return only valid JSON.',
      `Analyze foot traffic signals and return JSON with fields: traffic_score (0-100), estimated_daily_visitors (range as string), peak_days (array), peak_hours (array), slow_periods (array), traffic_drivers (array), catchment_area_profile (radius_estimate, population_density, accessibility_score), seasonal_index (object with months as keys, index values), nearby_anchors (array of nearby traffic generators), optimization_opportunities (array max 4), confidence (object with traffic_estimate, peak_times, catchment each 0-100). Data: ${JSON.stringify({ business_name, location, category, time_period })}`
    );
    res.json({ success: true, business_name, location, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Foot traffic analysis failed', details: e.message }); }
});

router.post('/local-competitors', async (req: Request, res: Response) => {
  const { business_name, location, category, radius_km } = req.body;
  if (!business_name || !location) return res.status(400).json({ error: 'business_name and location are required' });
  try {
    const result = await callClaude(
      'You are a local competitive intelligence specialist. Return only valid JSON.',
      `Analyze local competitive landscape and return JSON with fields: competitive_density (low/medium/high/saturated), estimated_competitor_count, competitor_profiles (array max 5 with name, estimated_distance, threat_level, key_strength, key_weakness), market_saturation_score (0-100), differentiation_opportunities (array max 4), underserved_segments (array), location_advantages (array), location_disadvantages (array), recommended_positioning, confidence (object with density, profiles, opportunities each 0-100). Data: ${JSON.stringify({ business_name, location, category, radius_km: radius_km || 2 })}`
    );
    res.json({ success: true, business_name, location, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Local competitor analysis failed', details: e.message }); }
});

router.post('/market-opportunity', async (req: Request, res: Response) => {
  const { location, category, target_demographic, investment_level } = req.body;
  if (!location || !category) return res.status(400).json({ error: 'location and category are required' });
  try {
    const result = await callClaude(
      'You are a local market opportunity analyst. Return only valid JSON.',
      `Analyze local market opportunity and return JSON with fields: opportunity_score (0-100), market_size_estimate (annual_revenue_potential, addressable_customers), demand_signals (array), supply_gap_analysis (underserved_needs array, oversupplied_areas array), entry_barriers (array with barrier, severity, mitigation), success_factors (array max 4), risk_factors (array max 4), recommended_entry_strategy, break_even_estimate, roi_projection (12_month, 24_month, 36_month as percentages), confidence (object with market_size, demand, roi each 0-100). Data: ${JSON.stringify({ location, category, target_demographic, investment_level })}`
    );
    res.json({ success: true, location, category, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Market opportunity analysis failed', details: e.message }); }
});

router.post('/customer-profile', async (req: Request, res: Response) => {
  const { business_name, location, category, existing_customer_data } = req.body;
  if (!business_name || !location) return res.status(400).json({ error: 'business_name and location are required' });
  try {
    const result = await callClaude(
      'You are a local business customer profiling specialist. Return only valid JSON.',
      `Build a customer profile and return JSON with fields: primary_persona (name, age_range, income, lifestyle, pain_points array, motivations array), secondary_personas (array max 2 with same fields), lifetime_value_estimate, acquisition_channels (array with channel, effectiveness, cost_estimate), retention_drivers (array), churn_risks (array), upsell_opportunities (array), local_marketing_recommendations (array max 4), seasonal_behavior_patterns, confidence (object with persona, ltv, channels each 0-100). Data: ${JSON.stringify({ business_name, location, category, existing_customer_data })}`
    );
    res.json({ success: true, business_name, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Customer profiling failed', details: e.message }); }
});

router.post('/location-score', async (req: Request, res: Response) => {
  const { address, category, business_requirements } = req.body;
  if (!address || !category) return res.status(400).json({ error: 'address and category are required' });
  try {
    const result = await callClaude(
      'You are a commercial location scoring specialist. Return only valid JSON.',
      `Score this business location and return JSON with fields: location_score (0-100), grade (A+/A/B/C/D), dimension_scores (visibility, accessibility, foot_traffic, demographics, competition, parking, cost_efficiency each 0-100), strengths (array max 4), weaknesses (array max 4), nearby_demand_generators (array), zoning_considerations, lease_negotiation_tips (array), alternative_locations_suggestion, recommended_actions_priority_order (array of slugs), confidence (object with visibility, demographics, competition each 0-100). Data: ${JSON.stringify({ address, category, business_requirements })}`
    );
    res.json({ success: true, address, category, ...result, scored_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Location scoring failed', details: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { business_score, reputation_score, market_opportunity_score, location_grade } = req.body;
  const score = business_score || 0;
  const reputation = reputation_score || 0;
  const opportunity = market_opportunity_score || 0;
  const blocking_flags: string[] = [];
  if (score < 40) blocking_flags.push('business_score_too_low');
  if (reputation < 40) blocking_flags.push('reputation_score_too_low');
  if (location_grade === 'D') blocking_flags.push('poor_location_grade');
  if (opportunity < 30) blocking_flags.push('insufficient_market_opportunity');
  const execution_ready = blocking_flags.length === 0;
  res.json({
    execution_ready,
    business_score: score,
    reputation_score: reputation,
    blocking_flags,
    blocking_flag_definitions: {
      business_score_too_low: 'Overall business score below 40',
      reputation_score_too_low: 'Reputation score below 40 — address reviews before proceeding',
      poor_location_grade: 'Location graded D — consider relocation or major improvements',
      insufficient_market_opportunity: 'Market opportunity score below 30 — market may be oversaturated'
    },
    next_api: execution_ready ? 'serp-intelligence' : null,
    next_endpoint: execution_ready ? '/serp-intelligence/analyze' : null,
    recommended_action: execution_ready ? 'proceed_with_local_strategy' : 'address_blocking_issues_first',
    privacy: { data_stored: false, retention: 'none' },
    evaluated_at: new Date().toISOString()
  });
});

router.post('/analyze', async (req, res) => { req.url = '/analyze-local-business'; (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
router.post('/analyze-local-business', async (req: Request, res: Response) => {
  const { business_name, location, category, competitors, review_data } = req.body;
  if (!business_name || !location) return res.status(400).json({ error: 'business_name and location are required' });
  try {
    const result = await callClaude(
      'You are a complete local business intelligence platform. Return only valid JSON.',
      `Run a full local business analysis and return CONCISE JSON with fields: business_score (0-100), market_position, reputation_score (0-100), foot_traffic_estimate (low/medium/high), competitive_density (low/medium/high/saturated), top_opportunities (array max 3), top_threats (array max 3), customer_persona (primary age_range, income, key_pain_point), location_grade (A+/A/B/C/D), recommended_actions_priority_order (array max 5 of action slugs), executive_summary (2 sentences), confidence (object with business_score, reputation, foot_traffic, market each 0-100). Keep all arrays max 3 items. Data: ${JSON.stringify({ business_name, location, category, competitors, review_data })}`
    );
    res.json({ success: true, business_name, location, workflow: 'full_local_business_analysis', ...result, execution_gate: { ready: (result.business_score || 0) >= 40, next_api: 'serp-intelligence' }, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Full local business analysis failed', details: e.message }); }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["data:read", "data:extract", "data:monitor"];
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
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "fetch_source", "extract_structure", "score_confidence", "finalize"], meta || {});
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
