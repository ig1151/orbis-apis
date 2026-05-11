import { Router, Request, Response } from 'express';
import { logger } from '../logger';

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
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

async function callClaude(prompt: string, maxTokens = 1200): Promise<Record<string, unknown>> {
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

// Shared email analysis function
async function analyzeEmail(email: string, context?: string): Promise<Record<string, unknown>> {
  const domain = email.split('@')[1] ?? '';
  const localPart = email.split('@')[0] ?? '';

  const disposableDomains = ['mailinator.com','tempmail.com','guerrillamail.com','10minutemail.com','throwaway.email','yopmail.com','trashmail.com','fakeinbox.com','sharklasers.com','guerrillamailblock.com'];
  const freeProviders = ['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','aol.com','protonmail.com','zoho.com'];
  const isDisposable = disposableDomains.some(d => domain.includes(d));
  const isFreeProvider = freeProviders.includes(domain);
  const isBusinessEmail = !isDisposable && !isFreeProvider && domain.length > 0;

  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidFormat = emailRegex.test(email);

  // Role-based detection
  const roleKeywords = ['admin','info','support','sales','contact','help','noreply','no-reply','hello','team','billing','hr','careers','jobs'];
  const isRoleBased = roleKeywords.some(k => localPart.toLowerCase().startsWith(k));

  return {
    email,
    domain,
    local_part: localPart,
    is_valid_format: isValidFormat,
    is_disposable: isDisposable,
    is_free_provider: isFreeProvider,
    is_business_email: isBusinessEmail,
    is_role_based: isRoleBased,
  };
}

// ── POST /verify ──────────────────────────────────────────────────────────────
router.post('/verify', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: 'Provide email' }); return; }
  const start = Date.now();
  try {
    const analysis = await analyzeEmail(email);
    const data = await callClaude(`You are an email verification engine. Analyze this email and return ONLY a valid JSON object with these keys:
- valid: boolean
- status: string (valid|invalid|risky|unknown)
- deliverability: string (high|medium|low)
- is_disposable: boolean
- is_free_provider: boolean
- is_business_email: boolean
- is_role_based: boolean
- is_catch_all_likely: boolean
- domain_reputation: string (good|neutral|poor|unknown)
- risk_score: number (0-100, higher = riskier)
- confidence: number (0-1)
- reason: string
Email: ${email}
Analysis data: ${JSON.stringify(analysis)}
Return only the JSON object:`);
    res.json({ endpoint: 'verify', email, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'verify', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /risk-score ──────────────────────────────────────────────────────────
router.post('/risk-score', async (req: Request, res: Response) => {
  const { email, context } = req.body;
  if (!email) { res.status(400).json({ error: 'Provide email' }); return; }
  const start = Date.now();
  try {
    const analysis = await analyzeEmail(email);
    const data = await callClaude(`You are an email fraud and risk scoring engine. Score this email for risk and return ONLY a valid JSON object with these keys:
- risk_score: number (0-100, higher = riskier)
- risk_level: string (critical|high|medium|low)
- fraud_signals: array of strings
- spam_likelihood: string (high|medium|low)
- is_disposable: boolean
- is_burner: boolean
- is_spoofed_likely: boolean
- allow: boolean (should this email be allowed?)
- block_reason: string or null
- recommended_action: string (allow|flag|block|verify)
- confidence: number (0-1)
${context ? `Context: ${context}` : ''}
Email: ${email}
Analysis: ${JSON.stringify(analysis)}
Return only the JSON object:`);
    res.json({ endpoint: 'risk-score', email, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'risk-score', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /enrich ──────────────────────────────────────────────────────────────
router.post('/enrich', async (req: Request, res: Response) => {
  const { email, context } = req.body;
  if (!email) { res.status(400).json({ error: 'Provide email' }); return; }
  const start = Date.now();
  try {
    const analysis = await analyzeEmail(email);
    const domain = email.split('@')[1] ?? '';

    // Fetch domain info
    let domainData: Record<string, unknown> = {};
    try {
      const res2 = await fetch(`https://${domain}`, { signal: AbortSignal.timeout(5000) });
      domainData = { reachable: res2.ok, status: res2.status };
    } catch { domainData = { reachable: false }; }

    const data = await callClaude(`You are an email enrichment engine. Enrich this email address with contact and company intelligence. Return ONLY a valid JSON object with these keys:
- email_type: string (personal|business|role|disposable|unknown)
- likely_name_format: string (e.g. firstname.lastname, f.lastname)
- company_name: string or null (inferred from domain)
- company_domain: string
- company_type: string (startup|enterprise|agency|freelancer|unknown)
- industry_guess: string
- location_guess: string or null
- seniority_guess: string (executive|senior|mid|junior|unknown)
- linkedin_search_query: string (suggested search to find this person)
- crm_ready: boolean
- notes: string
${context ? `Context: ${context}` : ''}
Email: ${email}
Domain info: ${JSON.stringify({ ...analysis, ...domainData })}
Return only the JSON object:`);
    res.json({ endpoint: 'enrich', email, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'enrich', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /domain-health ───────────────────────────────────────────────────────
router.post('/domain-health', async (req: Request, res: Response) => {
  const { domain, email } = req.body;
  if (!domain && !email) { res.status(400).json({ error: 'Provide domain or email' }); return; }
  const start = Date.now();
  const targetDomain = domain ?? (email as string).split('@')[1];
  try {
    let reachable = false;
    let status = 0;
    try {
      const res2 = await fetch(`https://${targetDomain}`, { signal: AbortSignal.timeout(5000) });
      reachable = res2.ok;
      status = res2.status;
    } catch { reachable = false; }

    const data = await callClaude(`You are a domain health analysis engine. Analyze this domain for email deliverability and reputation. Return ONLY a valid JSON object with these keys:
- domain: string
- reachable: boolean
- health_score: number (0-100)
- reputation: string (excellent|good|neutral|poor|unknown)
- likely_has_mx: boolean
- likely_has_spf: boolean
- likely_has_dmarc: boolean
- is_disposable_domain: boolean
- is_free_provider: boolean
- catch_all_likely: boolean
- deliverability: string (high|medium|low)
- recommended_action: string
Domain: ${targetDomain}
Reachability: ${JSON.stringify({ reachable, status })}
Return only the JSON object:`);
    res.json({ endpoint: 'domain-health', domain: targetDomain, data, latency_ms: Date.now() - start, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'domain-health', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /batch-verify ────────────────────────────────────────────────────────
router.post('/batch-verify', async (req: Request, res: Response) => {
  const { emails } = req.body;
  if (!emails || !Array.isArray(emails)) { res.status(400).json({ error: 'Provide emails array' }); return; }
  const start = Date.now();
  try {
    const results = await Promise.allSettled(
      emails.slice(0, 50).map(async (email: string) => {
        const analysis = await analyzeEmail(email);
        const riskScore = analysis.is_disposable ? 80 : analysis.is_role_based ? 30 : 10;
        return {
          email,
          valid: analysis.is_valid_format,
          is_disposable: analysis.is_disposable,
          is_business: analysis.is_business_email,
          is_role_based: analysis.is_role_based,
          risk_score: riskScore,
          risk_level: riskScore >= 70 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
          crm_ready: analysis.is_valid_format && !analysis.is_disposable,
        };
      })
    );
    const out = results.map(r => r.status === 'fulfilled' ? r.value : { error: 'Failed' });
    const valid = out.filter(r => !('error' in r) && (r as Record<string, unknown>).valid).length;
    const crm_ready = out.filter(r => !('error' in r) && (r as Record<string, unknown>).crm_ready).length;
    const high_risk = out.filter(r => !('error' in r) && (r as Record<string, unknown>).risk_level === 'high').length;
    res.json({
      endpoint: 'batch-verify',
      total: emails.length,
      valid,
      invalid: emails.length - valid,
      crm_ready,
      high_risk,
      results: out,
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'batch-verify', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /execution-gate ──────────────────────────────────────────────────────
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { email, action, context, risk_threshold } = req.body;
  if (!email) { res.status(400).json({ error: 'Provide email' }); return; }
  const start = Date.now();
  try {
    const analysis = await analyzeEmail(email);
    const threshold = risk_threshold ?? 50;
    const blocking_flags: string[] = [];
    if (!analysis.is_valid_format) blocking_flags.push('Invalid email format');
    if (analysis.is_disposable) blocking_flags.push('Disposable email detected');
    if (analysis.is_role_based) blocking_flags.push('Role-based email (lower deliverability)');
    const riskScore = analysis.is_disposable ? 80 : analysis.is_role_based ? 30 : 10;
    if (riskScore >= threshold) blocking_flags.push(`Risk score ${riskScore} exceeds threshold ${threshold}`);
    const execute = analysis.is_valid_format as boolean && blocking_flags.length === 0;
    res.json({
      endpoint: 'execution-gate',
      email,
      execution_ready: execute,
      next_api: execute ? 'action-api' : 'crm-api',
      next_endpoint: execute ? '/send-email' : '/flag-contact',
      data: {
        execute,
        valid: analysis.is_valid_format,
        risk_score: riskScore,
        risk_level: riskScore >= 70 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
        is_disposable: analysis.is_disposable,
        is_business_email: analysis.is_business_email,
        blocking_flags,
        confidence: analysis.is_valid_format ? 0.9 : 0.5,
        recommended_action: execute ? 'Proceed with email contact' : 'Block or verify before sending',
      },
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.002, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'execution-gate', err }, message);
    res.status(500).json({ error: message });
  }
});

// ── POST /analyze-email (one-call) ────────────────────────────────────────────
router.post('/analyze-email', async (req: Request, res: Response) => {
  const { email, context } = req.body;
  if (!email) { res.status(400).json({ error: 'Provide email' }); return; }
  const start = Date.now();
  try {
    const analysis = await analyzeEmail(email);
    const data = await callClaude(`You are a complete email intelligence engine. Perform a full analysis and return ONLY a valid JSON object with ALL of these keys:
- valid: boolean
- status: string (valid|invalid|risky|unknown)
- deliverability: string (high|medium|low)
- risk_score: number (0-100)
- risk_level: string (critical|high|medium|low)
- fraud_signals: array of strings
- is_disposable: boolean
- is_free_provider: boolean
- is_business_email: boolean
- is_role_based: boolean
- email_type: string (personal|business|role|disposable|unknown)
- company_name: string or null
- company_domain: string
- industry_guess: string
- seniority_guess: string
- linkedin_search_query: string
- domain_reputation: string (good|neutral|poor|unknown)
- crm_ready: boolean
- allow: boolean
- blocking_flags: array of strings
- recommended_action: string (allow|flag|block|verify)
- execute: boolean (should agent proceed with this email?)
- next_api: string
- next_endpoint: string
- confidence: number (0-1)
- notes: string
${context ? `Context: ${context}` : ''}
Email: ${email}
Analysis: ${JSON.stringify(analysis)}
Return only the JSON object:`, 1500) as Record<string, unknown>;
    res.json({
      endpoint: 'analyze-email',
      email,
      execution_ready: data.execute === true,
      next_api: data.next_api ?? 'action-api',
      next_endpoint: data.next_endpoint ?? '/send-email',
      data,
      metadata: { latency_ms: Date.now() - start, estimated_cost: 0.006, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed';
    logger.error({ endpoint: 'analyze-email', err }, message);
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
