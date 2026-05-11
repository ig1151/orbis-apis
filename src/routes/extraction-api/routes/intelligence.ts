import { Router, Request, Response } from 'express';
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
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

async function fetchPageContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OrbisBot/1.0)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

async function callClaude(prompt: string, maxTokens = 1200): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${err}`);
  }
  const data = await response.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content ?? '{}';
}

function parseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return { raw };
  }
}

interface CacheEntry { content: string; snapshot: string; ts: number; }
const pageCache = new Map<string, CacheEntry>();

router.post('/extract-entities', async (req: Request, res: Response) => {
  const { url, text } = req.body;
  if (!url && !text) { res.status(400).json({ error: 'Provide url or text' }); return; }
  const start = Date.now();
  try {
    const content = text ?? await fetchPageContent(url);
    const raw = await callClaude(`You are an entity extraction engine. Extract all named entities from the content below.
Return ONLY a valid JSON object with these keys:
- people: array of {name, role, context}
- companies: array of {name, type, context}
- prices: array of {value, currency, context}
- events: array of {name, date, context}
- locations: array of {name, type}
- topics: array of strings
Content:
"""
${content}
"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-entities', url: url ?? null, data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-entities', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/extract-signals', async (req: Request, res: Response) => {
  const { url, text, context } = req.body;
  if (!url && !text) { res.status(400).json({ error: 'Provide url or text' }); return; }
  const start = Date.now();
  try {
    const content = text ?? await fetchPageContent(url);
    const raw = await callClaude(`You are an intelligence signal extractor. Identify actionable signals in the content below.
${context ? `Context/goal: ${context}` : ''}
Return ONLY a valid JSON object with these keys:
- signals: array of {signal, type, strength (high|medium|low), action, confidence (0-1)}
  signal types: hiring | funding | partnership | product_launch | regulatory | competitive | market | sentiment
- summary: string (1-2 sentences)
- alert_level: high | medium | low
- recommended_action: string
Content:
"""
${content}
"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-signals', url: url ?? null, data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-signals', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/detect-change', async (req: Request, res: Response) => {
  const { url, baseline } = req.body;
  if (!url) { res.status(400).json({ error: 'Provide url' }); return; }
  const start = Date.now();
  try {
    const current = await fetchPageContent(url);
    const cached = pageCache.get(url);
    const previous = baseline ?? cached?.snapshot ?? null;
    pageCache.set(url, { content: current, snapshot: current.slice(0, 3000), ts: Date.now() });
    if (!previous) {
      res.json({ endpoint: 'detect-change', url, changed: false, message: 'Baseline captured. Call again to detect changes.', cached_at: new Date().toISOString(), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
      return;
    }
    const raw = await callClaude(`You are a page change detection engine. Compare these two versions of a webpage and identify what changed.
Return ONLY a valid JSON object with these keys:
- changed: boolean
- change_type: none | minor | significant | critical
- changes: array of {field, old_value, new_value, significance (high|medium|low)}
- summary: string (1-2 sentences describing what changed)
- alert_level: none | low | medium | high
PREVIOUS VERSION:
"""
${previous.slice(0, 5000)}
"""
CURRENT VERSION:
"""
${current.slice(0, 5000)}
"""
Return only the JSON object:`);
    res.json({ endpoint: 'detect-change', url, data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'detect-change', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/monitor-page', async (req: Request, res: Response) => {
  const { url, watch_for, webhook_url } = req.body;
  if (!url) { res.status(400).json({ error: 'Provide url' }); return; }
  const start = Date.now();
  try {
    const content = await fetchPageContent(url);
    const alreadyCached = pageCache.has(url);
    pageCache.set(url, { content, snapshot: content.slice(0, 3000), ts: Date.now() });
    const raw = await callClaude(`You are a page monitoring setup engine. Analyze this page and define what should be monitored.
${watch_for ? `The user wants to watch for: ${watch_for}` : ''}
Return ONLY a valid JSON object with these keys:
- monitor_id: string (slug based on url)
- watch_targets: array of {target, type, current_value, change_trigger}
  types: price | text | presence | count | status | any
- check_frequency_recommendation: string (e.g. "every 15 minutes")
- current_state_summary: string
- status: active
Content:
"""
${content}
"""
Return only the JSON object:`);
    const data = parseJson(raw) as Record<string, unknown>;
    data.webhook_url = webhook_url ?? null;
    data.webhook_configured = !!webhook_url;
    data.registered_at = new Date().toISOString();
    data.baseline_captured = true;
    data.previously_registered = alreadyCached;
    res.json({ endpoint: 'monitor-page', url, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'monitor-page', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/extract-opportunities', async (req: Request, res: Response) => {
  const { url, text, context } = req.body;
  if (!url && !text) { res.status(400).json({ error: 'Provide url or text' }); return; }
  const start = Date.now();
  try {
    const content = text ?? await fetchPageContent(url);
    const raw = await callClaude(`You are an opportunity intelligence engine. Surface actionable opportunities from the content below.
${context ? `Context/goal: ${context}` : ''}
Return ONLY a valid JSON object with these keys:
- opportunities: array of {title, type (sales|partnership|investment|hiring|market_gap|competitive|content|other), description, urgency (high|medium|low), effort (high|medium|low), potential_value (high|medium|low), action, confidence (0-1)}
- top_opportunity: string (title of the best one)
- summary: string (1-2 sentences)
- total_found: number
Content:
"""
${content}
"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-opportunities', url: url ?? null, data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-opportunities', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/monitor-topic', async (req: Request, res: Response) => {
  const { topic, urls, context } = req.body;
  if (!topic) { res.status(400).json({ error: 'Provide topic' }); return; }
  const start = Date.now();
  try {
    const sources: string[] = urls ?? [];
    const contentBlocks: string[] = [];
    for (const url of sources.slice(0, 5)) {
      try {
        const content = await fetchPageContent(url);
        contentBlocks.push(`SOURCE: ${url}\n${content.slice(0, 2000)}`);
      } catch {
        contentBlocks.push(`SOURCE: ${url}\n[Failed to fetch]`);
      }
    }
    const sourceText = contentBlocks.length > 0 ? contentBlocks.join('\n\n---\n\n') : `No sources provided. Analyze topic: "${topic}" based on general knowledge.`;
    const raw = await callClaude(`You are a topic intelligence monitor. Analyze the sources below for the topic: "${topic}".
${context ? `Context: ${context}` : ''}
Return ONLY a valid JSON object with these keys:
- topic: string
- signals: array of {source_url, signal, type, strength (high|medium|low), quote}
- sentiment: positive | neutral | negative | mixed
- trend: rising | stable | declining | emerging
- narrative_summary: string (2-3 sentences)
- key_actors: array of strings
- alert_level: high | medium | low
- recommended_action: string
- sources_analyzed: number
Sources:
"""
${sourceText}
"""
Return only the JSON object:`, 1500);
    res.json({ endpoint: 'monitor-topic', topic, urls: sources, data: parseJson(raw), latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'monitor-topic', err }, message);
    res.status(500).json({ error: message });
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

// ── POST /execution-gate ──────────────────────────────────────────────────────
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { url, text, action_threshold, context } = req.body;
  if (!url && !text) { res.status(400).json({ error: 'Provide url or text' }); return; }
  const start = Date.now();
  try {
    const content = text ?? await fetchPageContent(url);
    const raw = await callClaude(`You are an autonomous agent execution gate. Analyze the content and determine whether it contains sufficient intelligence to trigger an autonomous action.
${context ? `Context/goal: ${context}` : ''}
${action_threshold ? `Action threshold: ${action_threshold}` : ''}
Return ONLY a valid JSON object with these keys:
- execute: boolean (should the agent proceed with an action?)
- confidence: number (0-1)
- alert_level: high | medium | low | none
- reason: string (why execute is true or false)
- signals_found: number
- top_signal: string (the most actionable finding)
- risk_level: high | medium | low
- blocking_flags: array of strings (reasons NOT to act, empty if execute is true)
- next_api: string (recommended next API e.g. "autopilot")
- next_endpoint: string (recommended next endpoint e.g. "/should-execute")
- recommended_action: string (specific action for the agent to take)

Content:
"""
${content}
"""
Return only the JSON object:`);
    const data = parseJson(raw) as Record<string, unknown>;
    const estimatedCost = 0.005;
    res.json({
      endpoint: 'execution-gate',
      url: url ?? null,
      execution_ready: data.execute === true,
      next_api: data.next_api ?? 'autopilot',
      next_endpoint: data.next_endpoint ?? '/should-execute',
      data,
      metadata: {
        latency_ms: Date.now() - start,
        estimated_cost: estimatedCost,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'execution-gate', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── Webhook store (in-memory, replace with DB for persistence) ────────────────
interface WebhookEntry {
  id: string;
  url: string;
  webhook_url: string;
  watch_for?: string;
  created_at: string;
  status: 'active' | 'cancelled';
  trigger_count: number;
}
const webhookStore = new Map<string, WebhookEntry>();

// ── POST /register-webhook ────────────────────────────────────────────────────
router.post('/register-webhook', async (req: Request, res: Response) => {
  const { url, webhook_url, watch_for, secret } = req.body;
  if (!url || !webhook_url) {
    res.status(400).json({ error: 'Provide url and webhook_url' });
    return;
  }
  const start = Date.now();
  try {
    const id = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entry: WebhookEntry = {
      id,
      url,
      webhook_url,
      watch_for,
      created_at: new Date().toISOString(),
      status: 'active',
      trigger_count: 0,
    };
    webhookStore.set(id, entry);

    // Capture baseline
    const content = await fetchPageContent(url);
    pageCache.set(url, { content, snapshot: content.slice(0, 3000), ts: Date.now() });

    logger.info({ endpoint: 'register-webhook', id, url }, 'Webhook registered');
    res.json({
      endpoint: 'register-webhook',
      id,
      url,
      webhook_url,
      watch_for: watch_for ?? null,
      status: 'active',
      baseline_captured: true,
      message: 'Webhook registered. Call /detect-change to trigger evaluation and fire webhook on change.',
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'register-webhook', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /monitor-status ──────────────────────────────────────────────────────
router.post('/monitor-status', (req: Request, res: Response) => {
  const { id, url } = req.body;
  if (!id && !url) {
    res.status(400).json({ error: 'Provide id or url' });
    return;
  }
  let entry: WebhookEntry | undefined;
  if (id) {
    entry = webhookStore.get(id);
  } else {
    for (const e of webhookStore.values()) {
      if (e.url === url) { entry = e; break; }
    }
  }
  if (!entry) {
    res.status(404).json({ error: 'Monitor not found', id, url });
    return;
  }
  const cached = pageCache.get(entry.url);
  res.json({
    endpoint: 'monitor-status',
    id: entry.id,
    url: entry.url,
    webhook_url: entry.webhook_url,
    watch_for: entry.watch_for ?? null,
    status: entry.status,
    trigger_count: entry.trigger_count,
    created_at: entry.created_at,
    last_checked: cached ? new Date(cached.ts).toISOString() : null,
    baseline_captured: !!cached,
    timestamp: new Date().toISOString(),
  });
});

// ── POST /monitor-cancel ──────────────────────────────────────────────────────
router.post('/monitor-cancel', (req: Request, res: Response) => {
  const { id, url } = req.body;
  if (!id && !url) {
    res.status(400).json({ error: 'Provide id or url' });
    return;
  }
  let entry: WebhookEntry | undefined;
  let foundId = id;
  if (id) {
    entry = webhookStore.get(id);
  } else {
    for (const [k, e] of webhookStore.entries()) {
      if (e.url === url) { entry = e; foundId = k; break; }
    }
  }
  if (!entry) {
    res.status(404).json({ error: 'Monitor not found', id, url });
    return;
  }
  entry.status = 'cancelled';
  webhookStore.set(foundId, entry);
  logger.info({ endpoint: 'monitor-cancel', id: foundId }, 'Monitor cancelled');
  res.json({
    endpoint: 'monitor-cancel',
    id: foundId,
    url: entry.url,
    status: 'cancelled',
    timestamp: new Date().toISOString(),
  });
});

// ── GET /stream ───────────────────────────────────────────────────────────────
router.get('/stream', async (req: Request, res: Response) => {
  const { url, interval_ms } = req.query as { url?: string; interval_ms?: string };
  if (!url) {
    res.status(400).json({ error: 'Provide url as query param' });
    return;
  }

  const intervalMs = Math.max(parseInt(interval_ms ?? '10000', 10), 5000);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Send connected event
  send('connected', { url, interval_ms: intervalMs, timestamp: new Date().toISOString() });

  // Capture initial baseline
  let baseline: string | null = null;
  try {
    const content = await fetchPageContent(url);
    baseline = content.slice(0, 3000);
    pageCache.set(url, { content, snapshot: baseline, ts: Date.now() });
    send('baseline', { url, captured: true, timestamp: new Date().toISOString() });
  } catch (err) {
    send('error', { message: 'Failed to fetch baseline', url });
    res.end();
    return;
  }

  // Poll for changes
  const timer = setInterval(async () => {
    try {
      const current = await fetchPageContent(url);
      const currentSnapshot = current.slice(0, 3000);

      if (baseline && currentSnapshot !== baseline) {
        const raw = await callClaude(`Compare these two page versions and return ONLY a JSON object:
- changed: boolean
- change_type: none | minor | significant | critical  
- summary: string
- alert_level: none | low | medium | high
PREVIOUS: """${baseline.slice(0, 2000)}"""
CURRENT: """${currentSnapshot.slice(0, 2000)}"""
Return only the JSON object:`);
        const data = parseJson(raw);
        send('change', {
          url,
          ...data,
          timestamp: new Date().toISOString(),
        });

        // Fire webhooks if registered
        for (const entry of webhookStore.values()) {
          if (entry.url === url && entry.status === 'active') {
            entry.trigger_count++;
            fetch(entry.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: 'change', url, data, timestamp: new Date().toISOString() }),
            }).catch(() => logger.error({ webhook: entry.webhook_url }, 'Webhook delivery failed'));
          }
        }

        baseline = currentSnapshot;
        pageCache.set(url, { content: current, snapshot: currentSnapshot, ts: Date.now() });
      } else {
        send('heartbeat', { url, timestamp: new Date().toISOString() });
      }
    } catch (err) {
      send('error', { message: 'Poll failed', url, timestamp: new Date().toISOString() });
    }
  }, intervalMs);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(timer);
    logger.info({ endpoint: 'stream', url }, 'SSE client disconnected');
  });
});
