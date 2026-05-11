import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { researchCompany } from '../research/runner';
import { tavilySearch } from '../research/search';
import { claudeResearch } from '../research/claude';
import { logger } from '../logger';

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

function meta(startMs: number, cost: number) {
  return { latency_ms: Date.now() - startMs, estimated_cost: cost };
}

async function searchAndAsk(queries: string[], prompt: string, maxChars = 10000): Promise<any> {
  const results = await Promise.all(queries.map(q => tavilySearch(q, 4)));
  const content = results.flat().map(r => `${r.title}: ${r.content}`).join('\n\n').slice(0, maxChars);
  const sources = [...new Set(results.flat().map(r => r.url))].slice(0, 8);
  const raw = await claudeResearch(prompt.replace('{{CONTENT}}', content));
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  return { ...parsed, sources };
}

// ── POST /profile-company ──────────────────────────────────────────────────
router.post('/profile-company', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({ company: Joi.string().min(1).max(200).required(), focus: Joi.string().max(200).optional() }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const result = await researchCompany(value.company, value.focus);
    return res.json({ ...result, metadata: meta(start, 0.003) });
  } catch (err: any) {
    return res.status(500).json({ error: 'profile_failed', message: err.message });
  }
});

// ── POST /score-company ────────────────────────────────────────────────────
router.post('/score-company', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    company: Joi.string().min(1).max(200).required(),
    criteria: Joi.array().items(Joi.string()).default(['growth', 'stability', 'innovation', 'market_position', 'financial_health'])
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      [`${value.company} company performance growth revenue`, `${value.company} market position competitive strength`],
      `You are a company scoring engine. Score ${value.company} on each criterion. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"company":"${value.company}","overall_score":0.0,"scores":{"growth":0.0,"stability":0.0,"innovation":0.0,"market_position":0.0,"financial_health":0.0},"grade":"A|B|C|D|F","investment_signal":"strong_buy|buy|hold|sell|strong_sell","confidence":0.0,"summary":"one sentence","red_flags":[],"green_flags":[]}`
    );
    return res.json({ ...data, timestamp: new Date().toISOString(), metadata: meta(start, 0.0025) });
  } catch (err: any) {
    return res.status(500).json({ error: 'score_failed', message: err.message });
  }
});

// ── POST /detect-risks ─────────────────────────────────────────────────────
router.post('/detect-risks', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    company: Joi.string().min(1).max(200).required(),
    risk_types: Joi.array().items(Joi.string().valid('financial', 'legal', 'reputational', 'operational', 'market', 'regulatory')).default(['financial', 'legal', 'reputational', 'operational', 'market', 'regulatory'])
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      [`${value.company} risks lawsuits investigations problems 2024 2025`, `${value.company} financial risk debt layoffs problems`],
      `You are a risk detection engine. Identify risks for ${value.company}. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"company":"${value.company}","risk_level":"low|medium|high|critical","overall_risk_score":0.0,"risks":[{"type":"financial|legal|reputational|operational|market|regulatory","description":"one sentence","severity":0.0,"likelihood":0.0}],"immediate_flags":[],"due_diligence_required":true,"confidence":0.0}`
    );
    return res.json({ ...data, timestamp: new Date().toISOString(), metadata: meta(start, 0.0035) });
  } catch (err: any) {
    return res.status(500).json({ error: 'risk_detection_failed', message: err.message });
  }
});

// ── POST /find-competitors ─────────────────────────────────────────────────
router.post('/find-competitors', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    company: Joi.string().min(1).max(200).required(),
    max_results: Joi.number().integer().min(1).max(10).default(5)
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      [`${value.company} competitors alternatives similar companies`, `${value.company} industry landscape market share`],
      `You are a competitive intelligence engine. Find top competitors of ${value.company}. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"company":"${value.company}","competitors":[{"name":"string","similarity_score":0.0,"threat_level":"low|medium|high","strengths":["string"],"market_overlap":"string"}],"market_summary":"one sentence","competitive_position":"leader|challenger|follower|niche","confidence":0.0}`
    );
    return res.json({ ...data, timestamp: new Date().toISOString(), metadata: meta(start, 0.003) });
  } catch (err: any) {
    return res.status(500).json({ error: 'competitor_search_failed', message: err.message });
  }
});

// ── POST /compare-companies ────────────────────────────────────────────────
router.post('/compare-companies', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    companies: Joi.array().items(Joi.string().min(1).max(200)).min(2).max(5).required(),
    criteria: Joi.array().items(Joi.string()).default(['revenue', 'growth', 'innovation', 'market_share', 'talent'])
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      value.companies.map((c: string) => `${c} company overview performance revenue`),
      `You are a company comparison engine. Compare these companies: ${value.companies.join(', ')}. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"companies":["string"],"winner":"company_name","comparison":[{"company":"string","scores":{"revenue":0.0,"growth":0.0,"innovation":0.0,"market_share":0.0,"talent":0.0},"overall":0.0,"recommendation":"buy|hold|avoid"}],"key_differentiators":["string"],"confidence":0.0}`
    );
    return res.json({ ...data, timestamp: new Date().toISOString(), metadata: meta(start, 0.004) });
  } catch (err: any) {
    return res.status(500).json({ error: 'comparison_failed', message: err.message });
  }
});

// ── POST /monitor-signals ──────────────────────────────────────────────────
router.post('/monitor-signals', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    company: Joi.string().min(1).max(200).required(),
    signal_types: Joi.array().items(Joi.string().valid('hiring', 'funding', 'partnerships', 'product', 'leadership', 'legal', 'financial')).default(['hiring', 'funding', 'partnerships', 'product', 'leadership'])
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      [`${value.company} news announcements 2025`, `${value.company} hiring funding partnership product launch 2025`],
      `You are a company signal monitor. Detect recent signals for ${value.company}. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"company":"${value.company}","signals":[{"type":"hiring|funding|partnerships|product|leadership|legal|financial","description":"one sentence","sentiment":"positive|negative|neutral","impact_score":0.0,"date":"string or null"}],"overall_momentum":"accelerating|stable|declining","alert_level":"none|watch|alert|critical","next_check_ms":3600000,"confidence":0.0}`
    );
    return res.json({ ...data, timestamp: new Date().toISOString(), metadata: meta(start, 0.002) });
  } catch (err: any) {
    return res.status(500).json({ error: 'monitor_failed', message: err.message });
  }
});

// ── POST /summarize-filings ────────────────────────────────────────────────
router.post('/summarize-filings', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    company: Joi.string().min(1).max(200).required(),
    filing_type: Joi.string().valid('10-K', '10-Q', '8-K', 'S-1', 'annual_report', 'earnings').default('earnings')
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      [`${value.company} ${value.filing_type} filing 2024 2025`, `${value.company} earnings revenue financial results 2025`],
      `You are a financial filing analyst. Summarize ${value.filing_type} filings for ${value.company}. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"company":"${value.company}","filing_type":"${value.filing_type}","key_metrics":{"revenue":"string or null","growth":"string or null","profit_margin":"string or null","guidance":"string or null"},"highlights":["string"],"risks":["string"],"sentiment":"bullish|bearish|neutral","agent_summary":"two sentences","confidence":0.0}`
    );
    return res.json({ ...data, timestamp: new Date().toISOString(), metadata: meta(start, 0.0045) });
  } catch (err: any) {
    return res.status(500).json({ error: 'filings_failed', message: err.message });
  }
});

// ── POST /rank-targets ─────────────────────────────────────────────────────
router.post('/rank-targets', async (req: Request, res: Response) => {
  const start = Date.now();
  const { error, value } = Joi.object({
    companies: Joi.array().items(Joi.string().min(1).max(200)).min(2).max(10).required(),
    objective: Joi.string().valid('investment', 'acquisition', 'partnership', 'competitive_threat', 'hiring').default('investment'),
    top_n: Joi.number().integer().min(1).max(10).default(3)
  }).validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  try {
    const data = await searchAndAsk(
      value.companies.map((c: string) => `${c} company performance growth ${value.objective}`),
      `You are a company ranking engine. Rank these companies for ${value.objective}: ${value.companies.join(', ')}. Return ONLY valid JSON, no markdown. Web content: {{CONTENT}}
{"objective":"${value.objective}","ranked":[{"rank":1,"company":"string","score":0.0,"action":"string","reason":"one sentence","confidence":0.0}],"top_pick":"company_name","summary":"one sentence"}`
    );
    const ranked = { ...data, ranked: (data.ranked || []).slice(0, value.top_n) };
    return res.json({ ...ranked, timestamp: new Date().toISOString(), metadata: meta(start, 0.005) });
  } catch (err: any) {
    return res.status(500).json({ error: 'ranking_failed', message: err.message });
  }
});

// ── Legacy ─────────────────────────────────────────────────────────────────
router.post('/research/company', async (req: Request, res: Response) => {
  const { error, value } = Joi.object({ company: Joi.string().min(1).max(200).required(), focus: Joi.string().max(200).optional() }).validate(req.body);
  if (error) { res.status(400).json({ error: 'Validation failed', details: error.details[0].message }); return; }
  logger.info({ company: value.company }, 'Company research started');
  try {
    const result = await researchCompany(value.company, value.focus);
    logger.info({ company: value.company, latency_ms: result.latency_ms }, 'Company research complete');
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Research failed';
    res.status(500).json({ error: 'Research failed', details: message });
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
