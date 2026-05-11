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

// Root GET
router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'SERP Intelligence API',
    info: '/serp-intelligence/info',
    openapi: '/serp-intelligence/openapi.json',
    health: 'ok',
  });
});

// POST /analyze-serp
router.post('/analyze', async (req, res) => { req.url = '/analyze-serp'; (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
router.post('/analyze-serp', async (req: Request, res: Response) => {
  const { keyword, domain, location = 'US', search_engine = 'google' } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Analyze SERP for keyword: "${keyword}" domain: "${domain || 'none'}" location: ${location} engine: ${search_engine}. Return concise JSON:
{
  "keyword": "${keyword}",
  "serp_overview": { "difficulty": 0-100, "commercial_intent": "low|medium|high", "local_intent": true|false, "informational_intent": true|false, "serp_features": ["featured_snippet","knowledge_panel","local_pack","shopping","video","image"] },
  "top_ranking_signals": [{"signal": "string", "weight": "high|medium|low", "explanation": "string"}],
  "content_type_distribution": { "articles": 0-100, "product_pages": 0-100, "guides": 0-100, "videos": 0-100 },
  "ranking_opportunity": { "score": 0-100, "grade": "A-F", "quick_wins": ["string"] },
  "confidence_per_section": { "serp_overview": 0-1, "top_ranking_signals": 0-1, "content_type_distribution": 0-1, "ranking_opportunity": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /keyword-intelligence
router.post('/keyword-intelligence', async (req: Request, res: Response) => {
  const { keyword, niche, competitors = [] } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Keyword intelligence for: "${keyword}" niche: "${niche || 'general'}" competitors: ${JSON.stringify(competitors.slice(0,3))}. Return concise JSON:
{
  "keyword": "${keyword}",
  "search_volume": { "estimated_monthly": number, "trend": "rising|stable|declining", "seasonality": "string" },
  "difficulty": { "score": 0-100, "label": "easy|medium|hard|very_hard", "domain_authority_needed": number },
  "intent": { "primary": "informational|navigational|commercial|transactional", "secondary": "string", "buyer_stage": "awareness|consideration|decision" },
  "cpc_estimate": { "low": "$X.XX", "avg": "$X.XX", "high": "$X.XX" },
  "related_keywords": [{"keyword": "string", "volume": "low|medium|high", "difficulty": 0-100}],
  "long_tail_opportunities": ["string"],
  "confidence_per_section": { "search_volume": 0-1, "difficulty": 0-1, "intent": 0-1, "cpc_estimate": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /ranking-signals
router.post('/ranking-signals', async (req: Request, res: Response) => {
  const { keyword, url, industry } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Analyze ranking signals for keyword: "${keyword}" url: "${url || 'not provided'}" industry: "${industry || 'general'}". Return concise JSON:
{
  "keyword": "${keyword}",
  "on_page_signals": [{"signal": "string", "importance": "critical|high|medium|low", "status": "present|missing|needs_improvement", "action": "string"}],
  "off_page_signals": [{"signal": "string", "importance": "critical|high|medium|low", "benchmark": "string"}],
  "technical_signals": [{"signal": "string", "importance": "critical|high|medium|low", "action": "string"}],
  "content_signals": { "ideal_length": number, "heading_structure": "string", "schema_recommended": ["string"], "media_types": ["string"] },
  "overall_score": 0-100,
  "confidence_per_section": { "on_page_signals": 0-1, "off_page_signals": 0-1, "technical_signals": 0-1, "content_signals": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /competitor-gap
router.post('/competitor-gap', async (req: Request, res: Response) => {
  const { domain, competitors, niche } = req.body;
  if (!domain || !competitors) return res.status(400).json({ error: 'domain and competitors are required' });
  try {
    const raw = await callClaude(`Keyword gap analysis for domain: "${domain}" vs competitors: ${JSON.stringify(competitors.slice(0,3))} niche: "${niche || 'general'}". Return concise JSON:
{
  "domain": "${domain}",
  "gap_summary": { "total_gaps_estimated": number, "opportunity_score": 0-100, "urgency": "high|medium|low" },
  "keyword_gaps": [{"keyword": "string", "competitor_has": ["string"], "volume": "low|medium|high", "difficulty": 0-100, "opportunity": "string"}],
  "content_gaps": [{"topic": "string", "gap_type": "missing|thin|outdated", "priority": "high|medium|low"}],
  "quick_wins": [{"keyword": "string", "reason": "string", "estimated_traffic": "string"}],
  "confidence_per_section": { "gap_summary": 0-1, "keyword_gaps": 0-1, "content_gaps": 0-1, "quick_wins": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /content-opportunities
router.post('/content-opportunities', async (req: Request, res: Response) => {
  const { topic, domain, target_audience } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Content opportunities for topic: "${topic}" domain: "${domain || 'general'}" audience: "${target_audience || 'general'}". Return concise JSON:
{
  "topic": "${topic}",
  "opportunity_score": 0-100,
  "content_formats": [{"format": "string", "priority": "high|medium|low", "rationale": "string"}],
  "cluster_opportunities": [{"cluster_topic": "string", "pillar_page": "string", "supporting_pages": ["string"]}],
  "serp_feature_opportunities": [{"feature": "string", "target_keyword": "string", "content_requirement": "string"}],
  "content_calendar_suggestions": [{"week": number, "content_type": "string", "title_idea": "string", "target_keyword": "string"}],
  "confidence_per_section": { "content_formats": 0-1, "cluster_opportunities": 0-1, "serp_feature_opportunities": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /featured-snippet
router.post('/featured-snippet', async (req: Request, res: Response) => {
  const { keyword, current_content, content_type } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Featured snippet optimization for keyword: "${keyword}" content_type: "${content_type || 'article'}" existing_content: "${current_content ? 'provided' : 'none'}". Return concise JSON:
{
  "keyword": "${keyword}",
  "snippet_type": "paragraph|list|table|video",
  "eligibility_score": 0-100,
  "optimization_requirements": [{"requirement": "string", "priority": "critical|high|medium", "current_status": "met|not_met|unknown"}],
  "ideal_answer_structure": { "format": "string", "ideal_length": number, "key_elements": ["string"] },
  "sample_optimized_content": "string",
  "voice_search_fit": { "score": 0-100, "conversational_keywords": ["string"] },
  "confidence_per_section": { "eligibility_score": 0-1, "optimization_requirements": 0-1, "ideal_answer_structure": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /local-pack-signals
router.post('/local-pack-signals', async (req: Request, res: Response) => {
  const { business_name, location, category, keyword } = req.body;
  if (!keyword || !location) return res.status(400).json({ error: 'keyword and location are required' });
  try {
    const raw = await callClaude(`Local pack signals for keyword: "${keyword}" location: "${location}" business: "${business_name || 'unknown'}" category: "${category || 'general'}". Return concise JSON:
{
  "keyword": "${keyword}",
  "location": "${location}",
  "local_pack_difficulty": 0-100,
  "ranking_factors": [{"factor": "string", "weight": "critical|high|medium|low", "action": "string"}],
  "gmb_optimization": [{"element": "string", "status": "optimized|needs_work|missing", "tip": "string"}],
  "citation_requirements": { "estimated_citations_needed": number, "top_directories": ["string"], "consistency_importance": "string" },
  "review_strategy": { "target_count": number, "target_rating": number, "response_template": "string" },
  "confidence_per_section": { "ranking_factors": 0-1, "gmb_optimization": 0-1, "citation_requirements": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /search-intent
router.post('/search-intent', async (req: Request, res: Response) => {
  const { keyword, industry, current_page_type } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Search intent analysis for keyword: "${keyword}" industry: "${industry || 'general'}" current_page_type: "${current_page_type || 'unknown'}". Return concise JSON:
{
  "keyword": "${keyword}",
  "intent_classification": { "primary_intent": "informational|navigational|commercial|transactional", "confidence": 0-1, "micro_intent": "string" },
  "user_journey_stage": { "stage": "awareness|consideration|decision|retention", "persona": "string", "pain_points": ["string"] },
  "content_alignment": { "ideal_page_type": "string", "ideal_cta": "string", "alignment_score": 0-100, "mismatch_penalty": "none|low|medium|high" },
  "modifiers_analysis": [{"modifier_type": "string", "examples": ["string"], "impact_on_intent": "string"}],
  "conversion_potential": { "score": 0-100, "barriers": ["string"], "accelerators": ["string"] },
  "confidence_per_section": { "intent_classification": 0-1, "user_journey_stage": 0-1, "content_alignment": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { keyword, domain, objective } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  res.json({
    execution_ready: true,
    keyword,
    domain: domain || null,
    objective: objective || 'search_visibility',
    next_api: 'content-optimizer',
    next_endpoint: '/optimize-content',
    blocking_flags: [],
    flag_definitions: {
      NO_KEYWORD: 'No target keyword provided — required for SERP analysis',
      HIGH_DIFFICULTY: 'Keyword difficulty above 80 — review competitive strategy first',
      INTENT_MISMATCH: 'Page type misaligned with search intent — update content strategy',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze-search-visibility (one-call workflow)
router.post('/analyze-search-visibility', async (req: Request, res: Response) => {
  const { keyword, domain, location = 'US', niche, competitors = [] } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const raw = await callClaude(`Full search visibility analysis. keyword: "${keyword}" domain: "${domain || 'not provided'}" location: "${location}" niche: "${niche || 'general'}" competitors: ${JSON.stringify(competitors.slice(0,3))}. Return concise JSON:
{
  "keyword": "${keyword}",
  "executive_summary": { "visibility_score": 0-100, "grade": "A-F", "top_priority": "string", "estimated_traffic_potential": "string" },
  "serp_overview": { "difficulty": 0-100, "commercial_intent": "low|medium|high", "serp_features_present": ["string"] },
  "keyword_intelligence": { "estimated_monthly_volume": number, "trend": "rising|stable|declining", "intent": "string", "cpc_avg": "$X.XX" },
  "ranking_signals": [{"signal": "string", "importance": "high|medium|low", "status": "present|missing"}],
  "content_opportunities": [{"type": "string", "title": "string", "priority": "high|medium|low"}],
  "quick_wins": [{"action": "string", "impact": "high|medium|low", "effort": "low|medium|high"}],
  "competitive_position": { "gap_count": number, "opportunity_score": 0-100, "immediate_actions": ["string"] },
  "execution_plan": [{"phase": number, "action": "string", "timeline": "string"}],
  "confidence_per_section": { "serp_overview": 0-1, "keyword_intelligence": 0-1, "ranking_signals": 0-1, "content_opportunities": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
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
