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

async function callClaude(prompt: string, maxTokens = 1500): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json() as { choices: { message: { content: string } }[] };
  try {
    const raw = data.choices[0].message.content ?? '{}';
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch { return { raw: data.choices[0].message.content }; }
}

router.post('/extract', async (req, res) => { req.url = '/extract-invoice'; (router as any).handle(req, res, () => res.status(404).json({ error: 'Not found' })); });
router.post('/extract-invoice', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are an invoice extraction engine. Extract all invoice data and return ONLY a valid JSON object with these keys:
- invoice_number, vendor_name, vendor_address, vendor_email, client_name, client_address
- issue_date, due_date, currency, subtotal, tax_amount, total_amount
- line_items: array of {description, quantity, unit_price, total}
- payment_terms, payment_method, notes
- confidence: number (0-1), missing_fields: array of strings
${context ? `Context: ${context}` : ''}
Text: """${text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-invoice', data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-invoice', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/extract-contract', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are a legal contract extraction engine. Extract all key terms and return ONLY a valid JSON object with these keys:
- contract_type, parties: array of {name, role, address}
- effective_date, expiration_date, value, currency, payment_terms, governing_law, jurisdiction
- key_obligations: array of {party, obligation, deadline}
- termination_clauses: array of strings
- risk_flags: array of strings
- confidentiality: boolean, non_compete: boolean, auto_renewal: boolean
- confidence: number (0-1)
${context ? `Context: ${context}` : ''}
Text: """${text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-contract', data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-contract', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/extract-receipt', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are a receipt extraction engine. Extract all purchase data and return ONLY a valid JSON object with these keys:
- merchant_name, merchant_address, merchant_phone, date, time, receipt_number
- items: array of {name, quantity, unit_price, total}
- subtotal, tax, tip, total, currency, payment_method, card_last_four
- category: string (restaurant|retail|grocery|travel|entertainment|other)
- confidence: number (0-1)
${context ? `Context: ${context}` : ''}
Text: """${text.slice(0, 4000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-receipt', data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-receipt', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/extract-resume', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are a resume extraction engine. Extract all professional data and return ONLY a valid JSON object with these keys:
- name, email, phone, location, linkedin, website, summary
- skills: array of strings
- experience: array of {company, role, start_date, end_date, location, description, achievements[]}
- education: array of {institution, degree, field, graduation_year, gpa}
- certifications: array of {name, issuer, date}
- total_years_experience: number
- seniority_level: string (intern|junior|mid|senior|lead|executive)
- top_skills: array of strings (top 5)
- confidence: number (0-1)
${context ? `Context: ${context}` : ''}
Text: """${text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-resume', data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-resume', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/extract-custom', async (req: Request, res: Response) => {
  const { text, schema, context } = req.body;
  if (!text || !schema) { res.status(400).json({ error: 'Provide text and schema object' }); return; }
  const start = Date.now();
  try {
    const fieldList = Object.entries(schema).map(([k, v]) => `- ${k}: ${v}`).join('\n');
    const data = await callClaude(`You are a custom document extraction engine. Extract these fields and return ONLY a valid JSON object:
${fieldList}
- confidence: number (0-1)
- missing_fields: array of strings
${context ? `Context: ${context}` : ''}
Text: """${text.slice(0, 8000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'extract-custom', schema, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'extract-custom', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/classify-document', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are a document classification engine. Classify this document and return ONLY a valid JSON object with these keys:
- document_type: string (invoice|contract|receipt|resume|report|letter|form|proposal|agreement|other)
- sub_type: string
- confidence: number (0-1)
- language: string
- has_tables: boolean, has_signatures: boolean, is_scanned: boolean
- recommended_extractor: string (extract-invoice|extract-contract|extract-receipt|extract-resume|extract-custom)
- key_entities: array of strings
- summary: string (1-2 sentences)
- pii_detected: boolean
Text: """${text.slice(0, 4000)}"""
Return only the JSON object:`);
    res.json({ endpoint: 'classify-document', data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'classify-document', err }, message);
    res.status(500).json({ error: message });
  }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { text, action, context } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are an autonomous agent execution gate for PDF document processing. Return ONLY a valid JSON object with these keys:
- execute: boolean
- confidence: number (0-1)
- document_type: string
- risk_level: string (high|medium|low)
- blocking_flags: array of strings
- recommended_action: string
- next_api: string
- next_endpoint: string
- data_quality: string (high|medium|low)
- pii_detected: boolean
- financial_data_detected: boolean
${action ? `Requested action: ${action}` : ''}
${context ? `Context: ${context}` : ''}
Text: """${text.slice(0, 4000)}"""
Return only the JSON object:`) as Record<string, unknown>;
    res.json({
      endpoint: 'execution-gate',
      execution_ready: data.execute === true,
      next_api: data.next_api ?? 'autopilot',
      next_endpoint: data.next_endpoint ?? '/should-execute',
      data,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.004, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'execution-gate', err }, message);
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

// ── POST /analyze-document (one-call workflow) ────────────────────────────────
router.post('/analyze-document', async (req: Request, res: Response) => {
  const { text, context } = req.body;
  if (!text) { res.status(400).json({ error: 'Provide text' }); return; }
  const start = Date.now();
  try {
    const data = await callClaude(`You are a complete document intelligence engine. Perform a full analysis of this document and return ONLY a valid JSON object with ALL of these keys:
- document_type: string (invoice|contract|receipt|resume|report|letter|form|proposal|agreement|other)
- sub_type: string
- confidence: number (0-1)
- language: string
- summary: string (2-3 sentences)
- key_entities: array of strings
- pii_detected: boolean
- financial_data_detected: boolean
- has_tables: boolean
- is_scanned: boolean
- extracted_data: object (all relevant fields based on document type)
- risk_flags: array of strings
- missing_fields: array of strings
- data_quality: string (high|medium|low)
- recommended_next_action: string
- execute: boolean (should agent process this document?)
- blocking_flags: array of strings
- next_api: string
- next_endpoint: string
${context ? `Context/goal: ${context}` : ''}
Document text:
"""${text.slice(0, 8000)}"""
Return only the JSON object:`, 2000) as Record<string, unknown>;

    res.json({
      endpoint: 'analyze-document',
      execution_ready: data.execute === true,
      next_api: data.next_api ?? 'autopilot',
      next_endpoint: data.next_endpoint ?? '/should-execute',
      data,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.008, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'analyze-document', err }, message);
    res.status(500).json({ error: message });
  }
});
