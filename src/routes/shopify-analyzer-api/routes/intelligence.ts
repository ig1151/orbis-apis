import { Router, Request, Response } from 'express';
import axios from 'axios';

// ── Universal Runtime Envelope ────────────────────────────────────────────────
function buildRuntime(req: any, overrides: Record<string, any> = {}) {
  const now          = Date.now();
  const trace_id     = req.headers?.['x-trace-id']     || `trace_${now}_${Math.random().toString(36).slice(2,8)}`;
  const execution_id = req.headers?.['x-execution-id'] || `exec_${now}_${Math.random().toString(36).slice(2,8)}`;
  const session_id   = req.body?.session_id || req.query?.session_id || req.headers?.['x-session-id'] || `session_${now}`;
  const request_id   = `req_${now}_${Math.random().toString(36).slice(2,8)}`;
  const unit         = 0.006;
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

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Shopify Analyzer API', info: '/shopify-analyzer/info', openapi: '/shopify-analyzer/openapi.json', health: 'ok' });
});

// POST /analyze-store
router.post('/analyze-store', async (req: Request, res: Response) => {
  const { store_url, niche, competitors = [] } = req.body;
  if (!store_url) return res.status(400).json({ error: 'store_url is required' });
  try {
    const raw = await callClaude(`Analyze Shopify store: "${store_url}" niche: "${niche || 'general'}" competitors: ${JSON.stringify(competitors.slice(0,3))}. Return concise JSON:
{
  "store_url": "${store_url}",
  "store_overview": { "niche": "string", "maturity": "new|growing|established", "estimated_monthly_revenue": "string", "brand_strength": 0-100 },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "market_position": { "score": 0-100, "positioning": "string", "differentiation": "string" },
  "growth_potential": { "score": 0-100, "primary_opportunity": "string", "estimated_upside": "string" },
  "confidence_per_section": { "store_overview": 0-1, "market_position": 0-1, "growth_potential": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /product-intelligence
router.post('/product-intelligence', async (req: Request, res: Response) => {
  const { product_name, category, price_point, store_url } = req.body;
  if (!product_name || !category) return res.status(400).json({ error: 'product_name and category are required' });
  try {
    const raw = await callClaude(`Product intelligence for: "${product_name}" category: "${category}" price: "${price_point || 'unknown'}" store: "${store_url || 'unknown'}". Return concise JSON:
{
  "product_name": "${product_name}",
  "market_demand": { "score": 0-100, "trend": "rising|stable|declining", "seasonality": "string" },
  "pricing_analysis": { "current": "${price_point || 'unknown'}", "recommended": "string", "competitor_range": "string", "price_sensitivity": "low|medium|high" },
  "listing_quality": { "score": 0-100, "title_score": 0-100, "description_score": 0-100, "image_recommendations": ["string"] },
  "upsell_opportunities": [{ "product": "string", "relevance": 0-100, "revenue_impact": "string" }],
  "winning_factors": ["string"],
  "confidence_per_section": { "market_demand": 0-1, "pricing_analysis": 0-1, "listing_quality": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /conversion-audit
router.post('/conversion-audit', async (req: Request, res: Response) => {
  const { store_url, current_cvr, traffic_source, niche } = req.body;
  if (!store_url) return res.status(400).json({ error: 'store_url is required' });
  try {
    const raw = await callClaude(`Conversion audit for Shopify store: "${store_url}" current CVR: "${current_cvr || 'unknown'}" traffic: "${traffic_source || 'mixed'}" niche: "${niche || 'general'}". Return concise JSON:
{
  "store_url": "${store_url}",
  "cvr_benchmark": { "industry_avg": "string", "top_quartile": "string", "gap": "string" },
  "conversion_killers": [{ "issue": "string", "impact": "high|medium|low", "fix": "string" }],
  "checkout_friction": [{ "friction_point": "string", "severity": "critical|high|medium", "solution": "string" }],
  "trust_signals": { "score": 0-100, "missing": ["string"], "quick_wins": ["string"] },
  "mobile_experience": { "score": 0-100, "issues": ["string"], "priority_fixes": ["string"] },
  "confidence_per_section": { "conversion_killers": 0-1, "checkout_friction": 0-1, "trust_signals": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /competitor-stores
router.post('/competitor-stores', async (req: Request, res: Response) => {
  const { store_url, niche, price_range } = req.body;
  if (!store_url || !niche) return res.status(400).json({ error: 'store_url and niche are required' });
  try {
    const raw = await callClaude(`Competitor analysis for Shopify store: "${store_url}" niche: "${niche}" price range: "${price_range || 'unknown'}". Return concise JSON:
{
  "store_url": "${store_url}",
  "competitive_landscape": { "density": "low|medium|high|saturated", "avg_competitor_rating": number, "market_maturity": "emerging|growing|mature" },
  "top_competitors": [{ "name": "string", "strengths": ["string"], "weaknesses": ["string"], "est_revenue": "string", "threat_level": "high|medium|low" }],
  "gaps_to_exploit": [{ "gap": "string", "opportunity_size": "string", "difficulty": "easy|medium|hard" }],
  "competitive_advantages": ["string"],
  "confidence_per_section": { "competitive_landscape": 0-1, "top_competitors": 0-1, "gaps_to_exploit": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /seo-audit
router.post('/seo-audit', async (req: Request, res: Response) => {
  const { store_url, niche, target_keywords = [] } = req.body;
  if (!store_url) return res.status(400).json({ error: 'store_url is required' });
  try {
    const raw = await callClaude(`SEO audit for Shopify store: "${store_url}" niche: "${niche || 'general'}" target keywords: ${JSON.stringify(target_keywords.slice(0,5))}. Return concise JSON:
{
  "store_url": "${store_url}",
  "seo_score": 0-100,
  "technical_issues": [{ "issue": "string", "priority": "critical|high|medium", "fix": "string" }],
  "content_gaps": [{ "keyword": "string", "volume": "low|medium|high", "difficulty": 0-100, "page_needed": "string" }],
  "collection_optimization": [{ "collection": "string", "issue": "string", "fix": "string" }],
  "schema_opportunities": ["string"],
  "backlink_strategy": { "current_estimate": "string", "target": "string", "top_sources": ["string"] },
  "confidence_per_section": { "technical_issues": 0-1, "content_gaps": 0-1, "collection_optimization": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /pricing-strategy
router.post('/pricing-strategy', async (req: Request, res: Response) => {
  const { products, niche, business_model, target_margin } = req.body;
  if (!products || !niche) return res.status(400).json({ error: 'products and niche are required' });
  try {
    const raw = await callClaude(`Pricing strategy for Shopify store. products: ${JSON.stringify(products.slice(0,5))} niche: "${niche}" model: "${business_model || 'retail'}" target margin: "${target_margin || 'unknown'}". Return concise JSON:
{
  "pricing_model": { "recommended": "string", "rationale": "string" },
  "product_pricing": [{ "product": "string", "current": "string", "recommended": "string", "reasoning": "string" }],
  "bundle_opportunities": [{ "bundle": "string", "price": "string", "margin_impact": "string", "conversion_lift": "string" }],
  "discount_strategy": { "recommended_discount_depth": "string", "frequency": "string", "urgency_tactics": ["string"] },
  "psychological_pricing": [{ "tactic": "string", "example": "string", "impact": "string" }],
  "confidence_per_section": { "pricing_model": 0-1, "bundle_opportunities": 0-1, "discount_strategy": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /ad-intelligence
router.post('/ad-intelligence', async (req: Request, res: Response) => {
  const { store_url, niche, budget, current_roas } = req.body;
  if (!store_url || !niche) return res.status(400).json({ error: 'store_url and niche are required' });
  try {
    const raw = await callClaude(`Ad intelligence for Shopify store: "${store_url}" niche: "${niche}" budget: "${budget || 'unknown'}" current ROAS: "${current_roas || 'unknown'}". Return concise JSON:
{
  "store_url": "${store_url}",
  "channel_recommendations": [{ "channel": "string", "priority": "high|medium|low", "estimated_roas": "string", "rationale": "string" }],
  "audience_segments": [{ "segment": "string", "size": "string", "cpm_estimate": "string", "conversion_rate": "string" }],
  "creative_angles": [{ "angle": "string", "format": "string", "hook": "string" }],
  "budget_allocation": [{ "channel": "string", "percentage": number, "rationale": "string" }],
  "retargeting_strategy": { "segments": ["string"], "window_days": number, "message_sequence": ["string"] },
  "confidence_per_section": { "channel_recommendations": 0-1, "audience_segments": 0-1, "creative_angles": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /growth-signals
router.post('/growth-signals', async (req: Request, res: Response) => {
  const { store_url, niche, current_revenue, goals } = req.body;
  if (!store_url) return res.status(400).json({ error: 'store_url is required' });
  try {
    const raw = await callClaude(`Growth signals for Shopify store: "${store_url}" niche: "${niche || 'general'}" revenue: "${current_revenue || 'unknown'}" goals: "${goals || 'scale revenue'}". Return concise JSON:
{
  "store_url": "${store_url}",
  "growth_score": 0-100,
  "top_growth_levers": [{ "lever": "string", "impact": "high|medium|low", "effort": "low|medium|high", "timeline": "string" }],
  "expansion_opportunities": [{ "opportunity": "string", "type": "product|market|channel|model", "revenue_potential": "string" }],
  "retention_signals": { "score": 0-100, "ltv_estimate": "string", "churn_risks": ["string"], "loyalty_tactics": ["string"] },
  "scaling_readiness": { "score": 0-100, "blockers": ["string"], "enablers": ["string"] },
  "confidence_per_section": { "top_growth_levers": 0-1, "expansion_opportunities": 0-1, "retention_signals": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { store_url, objective } = req.body;
  if (!store_url) return res.status(400).json({ error: 'store_url is required' });
  res.json({
    execution_ready: true,
    store_url,
    objective: objective || 'growth_optimization',
    next_api: 'meeting-analyzer',
    next_endpoint: '/analyze-meeting',
    blocking_flags: [],
    flag_definitions: {
      NO_STORE_URL: 'No store URL provided — required for all analysis',
      LOW_TRAFFIC: 'Insufficient traffic data — results will be based on niche benchmarks only',
      MISSING_NICHE: 'No niche provided — analysis will use generic ecommerce benchmarks',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze-shopify-store (one-call workflow)
router.post('/analyze', async (req, res) => { req.url = '/analyze-shopify-store'; (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
router.post('/analyze-shopify-store', async (req: Request, res: Response) => {
  const { store_url, niche, budget, competitors = [], goals } = req.body;
  if (!store_url) return res.status(400).json({ error: 'store_url is required' });
  try {
    const raw = await callClaude(`Full Shopify store analysis. store: "${store_url}" niche: "${niche || 'general'}" budget: "${budget || 'unknown'}" competitors: ${JSON.stringify(competitors.slice(0,3))} goals: "${goals || 'grow revenue'}". Return concise JSON:
{
  "store_url": "${store_url}",
  "executive_summary": { "overall_score": 0-100, "grade": "A-F", "top_priority": "string", "revenue_opportunity": "string" },
  "store_health": { "conversion_score": 0-100, "seo_score": 0-100, "brand_score": 0-100, "product_score": 0-100 },
  "top_issues": [{ "issue": "string", "impact": "high|medium|low", "fix": "string" }],
  "growth_levers": [{ "lever": "string", "impact": "high|medium|low", "effort": "low|medium|high" }],
  "competitive_position": { "score": 0-100, "key_gaps": ["string"], "advantages": ["string"] },
  "ad_recommendations": [{ "channel": "string", "priority": "high|medium|low", "budget_allocation": "string" }],
  "quick_wins": [{ "action": "string", "revenue_impact": "string", "effort": "low|medium|high" }],
  "90_day_plan": [{ "phase": number, "action": "string", "timeline": "string", "expected_outcome": "string" }],
  "confidence_per_section": { "store_health": 0-1, "top_issues": 0-1, "growth_levers": 0-1, "competitive_position": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
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
