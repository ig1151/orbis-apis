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
  res.json({ name: 'Deep Research API', info: '/deep-research/info', openapi: '/deep-research/openapi.json', health: 'ok' });
});

router.post('/research-topic', async (req: Request, res: Response) => {
  const { topic, depth, sources = [], focus_areas = [], max_sources } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Conduct cross-source research synthesis on this topic. Topic: "${topic}" Depth: "${depth || 'standard'}" Focus areas: ${JSON.stringify(focus_areas)} Sources: ${JSON.stringify(sources.slice(0, 10))} Max sources: ${max_sources || 20}

Return concise JSON:
{
  "topic": "string",
  "summary": "string",
  "key_findings": [{ "finding": "string", "confidence": 0-1, "supporting_sources": ["string"], "consensus_level": "high|medium|low|disputed" }],
  "subtopics": [{ "name": "string", "coverage": "thorough|moderate|sparse", "key_points": ["string"] }],
  "knowledge_gaps": [{ "gap": "string", "importance": "high|medium|low", "research_suggestion": "string" }],
  "contradictions": [{ "claim_a": "string", "claim_b": "string", "resolution": "string" }],
  "research_quality": { "score": 0-100, "strengths": ["string"], "limitations": ["string"] },
  "confidence_per_section": { "key_findings": 0-1, "subtopics": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/extract-facts', async (req: Request, res: Response) => {
  const { content, fact_types = [], min_confidence, source_url } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const raw = await callClaude(`Extract verified facts with citations from this content. Fact types: ${JSON.stringify(fact_types)} Min confidence: ${min_confidence || 0.5} Source URL: "${source_url || 'not provided'}"

Content (first 3000 chars): "${content.slice(0, 3000)}"

Return concise JSON:
{
  "facts": [{ "fact": "string", "fact_type": "statistic|claim|date|entity|relationship|definition", "confidence": 0-1, "verbatim_quote": "string", "verifiable": true|false }],
  "total_facts": number,
  "high_confidence_facts": number,
  "entities_mentioned": [{ "entity": "string", "type": "person|org|location|product|event|concept", "role": "string" }],
  "temporal_markers": [{ "date": "string", "event": "string", "certainty": "exact|approximate|relative" }],
  "source_quality_indicators": { "specificity": 0-1, "recency_signals": ["string"], "authority_signals": ["string"] },
  "confidence_per_section": { "facts": 0-1, "entities": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/compare-sources', async (req: Request, res: Response) => {
  const { sources, comparison_angle } = req.body;
  if (!sources) return res.status(400).json({ error: 'sources is required' });
  try {
    const raw = await callClaude(`Compare multiple sources for consistency, credibility and perspectives. Comparison angle: "${comparison_angle || 'general'}" Sources: ${JSON.stringify(sources.slice(0, 10).map((s: any) => ({ ...s, content: s.content?.slice(0, 500) })))}

Return concise JSON:
{
  "sources_analyzed": number,
  "consensus_claims": [{ "claim": "string", "sources_agreeing": ["string"], "confidence": 0-1 }],
  "divergent_claims": [{ "claim": "string", "source_positions": [{ "source_id": "string", "position": "string" }], "divergence_reason": "string" }],
  "unique_insights": [{ "source_id": "string", "insight": "string", "value": "high|medium|low" }],
  "source_quality_ranking": [{ "source_id": "string", "title": "string", "quality_score": 0-100, "strengths": ["string"], "weaknesses": ["string"] }],
  "synthesis": "string",
  "recommendation": "string",
  "confidence_per_section": { "consensus": 0-1, "source_ranking": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/credibility-analysis', async (req: Request, res: Response) => {
  const { source_url, source_title, author, content_sample, publication_date } = req.body;
  if (!content_sample) return res.status(400).json({ error: 'content_sample is required' });
  try {
    const raw = await callClaude(`Score source credibility with bias and reliability detection. URL: "${source_url || 'not provided'}" Title: "${source_title || 'not provided'}" Author: "${author || 'not provided'}" Publication date: "${publication_date || 'not provided'}"

Content sample (first 2000 chars): "${content_sample.slice(0, 2000)}"

Return concise JSON:
{
  "credibility_score": 0-100,
  "credibility_tier": "authoritative|reliable|mixed|questionable|unreliable",
  "bias_indicators": [{ "type": "political|commercial|cultural|confirmation", "severity": "high|medium|low", "evidence": "string" }],
  "quality_signals": { "author_expertise": "high|medium|low|unknown", "citations_present": true|false, "methodology_transparent": true|false, "peer_reviewed": true|false, "publication_reputation": "string" },
  "red_flags": ["string"],
  "trust_factors": ["string"],
  "recommended_use": "primary_source|supporting_source|background_only|avoid",
  "fact_check_items": [{ "claim": "string", "verification_priority": "high|medium|low" }],
  "confidence_per_section": { "credibility_score": 0-1, "bias_indicators": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/timeline-builder', async (req: Request, res: Response) => {
  const { content, topic, timeline_type, start_date, end_date } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Build a chronological timeline from research data. Topic: "${topic}" Timeline type: "${timeline_type || 'chronological'}" Start date: "${start_date || 'not specified'}" End date: "${end_date || 'not specified'}"

Content (first 3000 chars): "${content.slice(0, 3000)}"

Return concise JSON:
{
  "topic": "string",
  "timeline_type": "string",
  "events": [{ "date": "string", "event": "string", "significance": "pivotal|major|minor", "actors": ["string"], "consequences": ["string"], "certainty": "confirmed|probable|speculative" }],
  "total_events": number,
  "date_range": { "earliest": "string", "latest": "string", "span": "string" },
  "turning_points": [{ "date": "string", "event": "string", "reason": "string" }],
  "patterns": [{ "pattern": "string", "period": "string", "implications": "string" }],
  "future_projections": [{ "timeframe": "string", "prediction": "string", "confidence": 0-1 }],
  "confidence_per_section": { "events": 0-1, "patterns": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/citation-builder', async (req: Request, res: Response) => {
  const { sources, citation_style, context } = req.body;
  if (!sources) return res.status(400).json({ error: 'sources is required' });
  try {
    const raw = await callClaude(`Format citations in various academic and professional styles. Citation style preference: "${citation_style || 'all'}" Context: "${context || 'general'}" Sources: ${JSON.stringify(sources.slice(0, 20))}

Return concise JSON:
{
  "citations": [{ "source_index": number, "title": "string", "apa": "string", "mla": "string", "chicago": "string", "harvard": "string", "url_formatted": "string" }],
  "bibliography_apa": "string",
  "bibliography_mla": "string",
  "in_text_examples": [{ "source_index": number, "apa": "string", "mla": "string" }],
  "source_count": number,
  "formatting_notes": ["string"],
  "missing_fields": [{ "source_index": number, "fields": ["string"] }],
  "confidence_per_section": { "citations": 0-1, "bibliography": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { research_context, intended_action, quality_threshold, source_count } = req.body;
  if (!research_context) return res.status(400).json({ error: 'research_context is required' });
  if (!intended_action) return res.status(400).json({ error: 'intended_action is required' });
  try {
    const raw = await callClaude(`Gate research execution based on quality and completeness. Intended action: "${intended_action}" Quality threshold: ${quality_threshold || 0.7} Source count: ${source_count || 'unknown'} Research context: ${JSON.stringify(research_context)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "risk_score": 0-1,
  "recommended_action": "string",
  "chain_to": ["string"],
  "research_quality": "sufficient|marginal|insufficient",
  "retry_after": "string or null",
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/research', async (req, res) => { req.url = '/deep-research'; (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
router.post('/deep-research', async (req: Request, res: Response) => {
  const { topic, depth, focus_areas = [], output_format } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  try {
    const raw = await callClaude(`Full research workflow on this topic. Topic: "${topic}" Depth: "${depth || 'standard'}" Focus areas: ${JSON.stringify(focus_areas)} Output format: "${output_format || 'structured'}"

Return concise JSON:
{
  "research_id": "string (uuid-style)",
  "topic": "string",
  "executive_summary": "string",
  "key_findings": [{ "finding": "string", "confidence": 0-1, "importance": "critical|high|medium|low" }],
  "fact_inventory": [{ "fact": "string", "confidence": 0-1, "verifiable": true|false }],
  "timeline": [{ "date": "string", "event": "string", "significance": "pivotal|major|minor" }],
  "contradictions": [{ "claim_a": "string", "claim_b": "string", "resolution": "string" }],
  "knowledge_gaps": ["string"],
  "sources_synthesized": number,
  "research_quality_score": 0-100,
  "report": "string",
  "confidence_per_section": { "key_findings": 0-1, "fact_inventory": 0-1, "timeline": 0-1 },
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
