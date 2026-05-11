import { Router, Request, Response } from 'express';
import axios from 'axios';

// ── Universal Runtime Envelope ────────────────────────────────────────────────
function buildRuntime(req: any, overrides: Record<string, any> = {}) {
  const now          = Date.now();
  const trace_id     = req.headers?.['x-trace-id']     || `trace_${now}_${Math.random().toString(36).slice(2,8)}`;
  const execution_id = req.headers?.['x-execution-id'] || `exec_${now}_${Math.random().toString(36).slice(2,8)}`;
  const session_id   = req.body?.session_id || req.query?.session_id || req.headers?.['x-session-id'] || `session_${now}`;
  const request_id   = `req_${now}_${Math.random().toString(36).slice(2,8)}`;
  const unit         = 0.01;
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
    name: 'competitor-monitor API',
    info: '/competitor-monitor/info',
    openapi: '/competitor-monitor/openapi.json',
    health: 'ok'
  });
});


router.post('/analyze', async (req, res) => { req.url = '/analyze-competitor'; (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
router.post('/analyze-competitor', async (req: Request, res: Response) => {
  const { competitor_name, your_company, industry, focus_areas } = req.body;
  if (!competitor_name || !industry) return res.status(400).json({ error: 'competitor_name and industry are required' });
  try {
    const result = await callClaude(
      'You are an expert competitive intelligence analyst. Return only valid JSON.',
      `Analyze this competitor and return JSON with fields: competitor_name, threat_level (low/medium/high/critical), overall_score (0-100), strengths (array), weaknesses (array), market_position (leader/challenger/follower/niche), estimated_market_share, key_differentiators (array), vulnerability_gaps (array), recent_moves (array), strategic_direction, recommended_actions_priority_order (array of action slugs in priority order), confidence (object with threat_assessment, strengths_analysis, market_position, recent_moves each scored 0-100). Data: ${JSON.stringify({ competitor_name, your_company, industry, focus_areas })}`
    );
    res.json({ success: true, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Competitor analysis failed', details: e.message }); }
});

router.post('/compare-features', async (req: Request, res: Response) => {
  const { your_product, competitor_product, feature_list, industry } = req.body;
  if (!your_product || !competitor_product) return res.status(400).json({ error: 'your_product and competitor_product are required' });
  try {
    const result = await callClaude(
      'You are a product competitive analysis specialist. Return only valid JSON.',
      `Compare these products and return JSON with fields: comparison_matrix (array with feature, your_score, competitor_score, winner, notes), your_advantages (array), competitor_advantages (array), feature_gaps (array with gap, priority, effort_to_close), overall_winner, win_rate_impact, positioning_recommendations (array), confidence_score (0-100). Your product: ${JSON.stringify(your_product)} Competitor: ${JSON.stringify(competitor_product)} Features: ${JSON.stringify(feature_list || [])} Industry: ${industry || 'general'}`
    );
    res.json({ success: true, ...result, compared_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Feature comparison failed', details: e.message }); }
});

router.post('/pricing-intelligence', async (req: Request, res: Response) => {
  const { competitor_name, your_pricing, known_competitor_pricing, industry, segment } = req.body;
  if (!competitor_name || !industry) return res.status(400).json({ error: 'competitor_name and industry are required' });
  try {
    const result = await callClaude(
      'You are a competitive pricing intelligence analyst. Return only valid JSON.',
      `Analyze competitive pricing and return JSON with fields: pricing_position (premium/competitive/budget), price_gap_analysis (object with your_price, competitor_price, gap_percentage, gap_direction), pricing_strategy_inference, value_perception_score (0-100), pricing_vulnerabilities (array), recommended_positioning, discount_patterns (array), upsell_opportunities (array), win_loss_price_impact, pricing_recommendations (array), confidence_score (0-100). Competitor: ${competitor_name} Your pricing: ${JSON.stringify(your_pricing || {})} Known competitor pricing: ${JSON.stringify(known_competitor_pricing || {})} Industry: ${industry} Segment: ${segment || 'mid-market'}`
    );
    res.json({ success: true, competitor_name, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Pricing intelligence failed', details: e.message }); }
});

router.post('/detect-threats', async (req: Request, res: Response) => {
  const { your_company, competitors, market_signals, industry } = req.body;
  if (!your_company || !industry) return res.status(400).json({ error: 'your_company and industry are required' });
  try {
    const result = await callClaude(
      'You are a competitive threat detection specialist. Return only valid JSON.',
      `Detect and rank competitive threats and return JSON with fields: threat_summary (overall_threat_level, top_threats array), threat_matrix (array with competitor, threat_type, severity, timeline, probability, recommended_response), emerging_threats (array), market_shift_signals (array), defensive_priorities (array with priority, action, urgency), offensive_opportunities (array), early_warning_indicators (array), confidence_score (0-100). Company: ${your_company} Competitors: ${JSON.stringify(competitors || [])} Signals: ${JSON.stringify(market_signals || [])} Industry: ${industry}`
    );
    res.json({ success: true, your_company, ...result, detected_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Threat detection failed', details: e.message }); }
});

router.post('/positioning-map', async (req: Request, res: Response) => {
  const { your_company, competitors, dimensions, industry } = req.body;
  if (!your_company || !industry) return res.status(400).json({ error: 'your_company and industry are required' });
  try {
    const result = await callClaude(
      'You are a market positioning analyst. Return only valid JSON.',
      `Create a competitive positioning map and return JSON with fields: positioning_map (array with company, x_score, y_score, quadrant, positioning_statement), your_position (quadrant, white_space_opportunities array, crowded_areas array), differentiation_score (0-100), repositioning_opportunities (array with direction, rationale, effort), market_segments (array with segment, owner, opportunity_level), strategic_recommendations (array), confidence_score (0-100). Company: ${your_company} Competitors: ${JSON.stringify(competitors || [])} Dimensions: ${JSON.stringify(dimensions || ['price', 'quality'])} Industry: ${industry}`
    );
    res.json({ success: true, your_company, ...result, mapped_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Positioning map failed', details: e.message }); }
});

router.post('/battlecard', async (req: Request, res: Response) => {
  const { competitor_name, your_solution, industry, deal_context } = req.body;
  if (!competitor_name || !your_solution) return res.status(400).json({ error: 'competitor_name and your_solution are required' });
  try {
    const result = await callClaude(
      'You are a sales battlecard specialist. Return only valid JSON.',
      `Generate a sales battlecard and return JSON with fields: competitor_snapshot (strengths array, weaknesses array, typical_customers, pricing_model), your_advantages (array with advantage, proof_point, talk_track), their_advantages (array with advantage, counter_argument), discovery_questions (array), landmines_to_plant (array), objection_responses (array with objection, response), win_themes (array), trap_questions (array that expose competitor weaknesses), closing_moves (array), confidence_score (0-100). Competitor: ${competitor_name} Your solution: ${JSON.stringify(your_solution)} Industry: ${industry || 'general'} Context: ${JSON.stringify(deal_context || {})}`
    );
    res.json({ success: true, competitor_name, ...result, generated_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Battlecard generation failed', details: e.message }); }
});

router.post('/monitor-changes', async (req: Request, res: Response) => {
  const { competitor_name, previous_state, current_signals, monitoring_areas } = req.body;
  if (!competitor_name) return res.status(400).json({ error: 'competitor_name is required' });
  try {
    const result = await callClaude(
      'You are a competitive change monitoring specialist. Return only valid JSON.',
      `Analyze competitor changes and return JSON with fields: change_summary (significant_changes array, minor_changes array, no_change_areas array), change_impact_score (0-100), strategic_implications (array), threat_escalation (increased/stable/decreased), recommended_responses (array with action, urgency, owner), market_signal_interpretation, alert_triggers (array), next_monitoring_focus (array), confidence_score (0-100). Competitor: ${competitor_name} Previous state: ${JSON.stringify(previous_state || {})} Current signals: ${JSON.stringify(current_signals || [])} Areas: ${JSON.stringify(monitoring_areas || ['pricing', 'product', 'marketing', 'hiring'])}`
    );
    res.json({ success: true, competitor_name, ...result, monitored_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Change monitoring failed', details: e.message }); }
});

router.post('/win-loss-analysis', async (req: Request, res: Response) => {
  const { deals, competitor_name, industry } = req.body;
  if (!deals || !Array.isArray(deals) || deals.length === 0) return res.status(400).json({ error: 'deals array is required' });
  try {
    const result = await callClaude(
      'You are a win-loss analysis specialist. Return only valid JSON.',
      `Analyze win-loss patterns and return JSON with fields: win_rate (percentage), loss_rate (percentage), win_patterns (array with pattern, frequency, impact), loss_patterns (array with pattern, frequency, impact), top_win_reasons (array), top_loss_reasons (array), competitive_win_rate_vs (object with competitor, win_rate), improvement_opportunities (array with area, potential_impact, recommended_action), deal_size_correlation, confidence_score (0-100). Deals: ${JSON.stringify(deals)} Competitor: ${competitor_name || 'all'} Industry: ${industry || 'general'}`
    );
    res.json({ success: true, deal_count: deals.length, ...result, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Win-loss analysis failed', details: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { threat_level, competitive_score, monitoring_active, industry } = req.body;
  const score = competitive_score || 0;
  const blocking_flags: string[] = [];
  if (threat_level === 'critical') blocking_flags.push('critical_threat_detected');
  if (score < 30) blocking_flags.push('competitive_position_too_weak');
  if (monitoring_active === false) blocking_flags.push('monitoring_not_active');
  const execution_ready = blocking_flags.length === 0;
  res.json({
    execution_ready,
    threat_level: threat_level || 'unknown',
    competitive_score: score,
    blocking_flags,
    blocking_flag_definitions: {
      critical_threat_detected: 'Competitor poses critical immediate threat — requires human review',
      competitive_position_too_weak: 'Competitive score below 30 — repositioning required before proceeding',
      monitoring_not_active: 'Competitor monitoring not active — blind spots in intelligence'
    },
    next_api: execution_ready ? 'local-business' : null,
    next_endpoint: execution_ready ? '/local-business/analyze' : null,
    recommended_action: execution_ready ? 'proceed_with_strategy' : 'address_competitive_gaps',
    privacy: { data_stored: false, retention: 'none' },
    evaluated_at: new Date().toISOString()
  });
});

router.post('/analyze-competitive-landscape', async (req: Request, res: Response) => {
  const { your_company, competitors, industry, strategic_goals } = req.body;
  if (!your_company || !industry) return res.status(400).json({ error: 'your_company and industry are required' });
  try {
    const result = await callClaude(
      'You are a complete competitive intelligence platform. Return only valid JSON.',
      `Run a full competitive landscape analysis and return CONCISE JSON with fields: market_overview (size, growth_rate, maturity), competitive_intensity (score 0-100, rating), your_position (rank, strengths array max 3, vulnerabilities array max 3, differentiation_score), competitor_profiles (array max 4 with name, threat_level, key_strength, key_weakness), threat_matrix (top 3 threats with severity and response), opportunity_map (array max 3 with opportunity, potential_impact), strategic_recommendations (array max 4 with priority, action, timeline), recommended_actions_priority_order (array of action slugs in execution order e.g. launch_freemium, vertical_specialization), confidence (object with market_overview, threat_matrix, opportunity_map, your_position each scored 0-100), executive_summary (2 sentences max). Keep all arrays to max 4 items. Company: ${your_company} Competitors: ${JSON.stringify(competitors || [])} Industry: ${industry} Goals: ${JSON.stringify(strategic_goals || [])}`
    );
    res.json({ success: true, your_company, workflow: 'full_competitive_analysis', ...result, execution_gate: { ready: true, next_api: 'local-business' }, analyzed_at: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: 'Competitive landscape analysis failed', details: e.message }); }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["market:read", "market:signal", "market:analyze"];
const EXECUTION_AUTHORITY: string = "medium";
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
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "fetch_market_data", "compute_signals", "rank_outputs", "finalize"], meta || {});
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
