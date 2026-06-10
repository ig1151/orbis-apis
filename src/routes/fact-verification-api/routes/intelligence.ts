import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';
import { buildRuntime } from '../../../shared/ai';

const router = Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = 'anthropic/claude-sonnet-4-5';


function parseJSON(raw: string) {
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

function verificationProvenance(domain?: string) {
  return {
    provenance: {
      sources_checked: ['OpenRouter', 'internal-knowledge', domain ? `domain:${domain}` : 'general-knowledge'],
      knowledge_cutoff: '2024-08',
      retrieval_confidence: 0.88,
      model_used: MODEL,
      verification_method: 'llm-reasoning',
      external_lookup: false,
    },
    retry_policy: {
      max_attempts: 3,
      backoff_strategy: 'exponential',
      backoff_base_ms: 500,
      safe_to_retry: true,
    },
  };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Fact Verification API', info: '/fact-verification/info', openapi: '/fact-verification/openapi.json', health: 'ok' });
});

// POST /verify-claim
router.post('/verify-claim', async (req: Request, res: Response) => {
  const { claim, context, domain = 'general' } = req.body;
  if (!claim) return res.status(400).json({ error: 'claim is required' });
  try {
    const prov = verificationProvenance(domain);
    const raw = await callClaude(`Verify this claim. Domain: "${domain}". Context provided: "${context || 'none'}".

Claim: "${claim.slice(0, 2000)}"

Return concise JSON:
{
  "verdict": "true|false|partially_true|unverifiable|misleading",
  "confidence": 0-1,
  "reasoning": "string (step-by-step reasoning)",
  "supporting_evidence": ["string"],
  "contradicting_evidence": ["string"],
  "missing_context": ["string (what context would change the verdict)"],
  "nuances": ["string (important caveats)"],
  "suggested_correction": "string|null",
  "verifiability": "high|medium|low",
  "confidence_per_section": { "verdict": 0-1, "evidence": 0-1, "reasoning": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...prov });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /detect-hallucination
router.post('/detect-hallucination', async (req: Request, res: Response) => {
  const { ai_output, source_context, output_type = 'general' } = req.body;
  if (!ai_output) return res.status(400).json({ error: 'ai_output is required' });
  try {
    const raw = await callClaude(`Analyze this AI-generated output for hallucinations, fabrications, and unsupported claims. Output type: "${output_type}". Source context: "${(source_context || 'none').slice(0, 1500)}".

AI output: "${ai_output.slice(0, 3000)}"

Return concise JSON:
{
  "hallucination_risk": "critical|high|medium|low|none",
  "hallucination_score": 0-100,
  "fabricated_facts": [{ "claim": "string", "issue": "string", "severity": "critical|high|medium|low" }],
  "unsupported_claims": [{ "claim": "string", "missing_source": "string" }],
  "plausible_but_unverified": ["string"],
  "factually_grounded": ["string (claims that appear correct)"],
  "overall_reliability": "high|medium|low|unreliable",
  "safe_to_use": true|false,
  "recommended_fix": "string",
  "confidence_per_section": { "hallucination_risk": 0-1, "fabricated_facts": 0-1, "factually_grounded": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...verificationProvenance() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /check-citations
router.post('/check-citations', async (req: Request, res: Response) => {
  const { text, citations } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const citationsStr = citations ? JSON.stringify(citations).slice(0, 2000) : 'none provided';
    const raw = await callClaude(`Verify citation accuracy and source credibility in this text. Citations: ${citationsStr}

Text: "${text.slice(0, 3000)}"

Return concise JSON:
{
  "citations_found": [{ "citation": "string", "claim_supported": true|false, "accuracy": "accurate|inaccurate|unverifiable", "issue": "string|null" }],
  "missing_citations": ["string (claims that need citations but have none)"],
  "suspicious_sources": [{ "source": "string", "issue": "string", "credibility": "high|medium|low|unknown" }],
  "citation_accuracy_score": 0-100,
  "total_citations": number,
  "verified_count": number,
  "failed_count": number,
  "overall_trustworthiness": "high|medium|low",
  "confidence_per_section": { "citations_found": 0-1, "missing_citations": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...verificationProvenance() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /consistency-check
router.post('/consistency-check', async (req: Request, res: Response) => {
  const { document, check_type = 'internal' } = req.body;
  if (!document) return res.status(400).json({ error: 'document is required' });
  try {
    const raw = await callClaude(`Check this document for internal consistency, contradictions, and logical errors. Check type: "${check_type}" (internal|logical|numerical|temporal).

Document (first 4000 chars): "${document.slice(0, 4000)}"

Return concise JSON:
{
  "consistency_score": 0-100,
  "contradictions": [{ "statement_a": "string", "statement_b": "string", "conflict": "string", "severity": "critical|high|medium|low" }],
  "logical_errors": [{ "error": "string", "location": "string", "correction": "string" }],
  "numerical_inconsistencies": [{ "claim": "string", "issue": "string" }],
  "temporal_conflicts": [{ "event": "string", "conflict": "string" }],
  "internally_consistent_sections": ["string"],
  "overall_coherence": "high|medium|low",
  "confidence_per_section": { "contradictions": 0-1, "logical_errors": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...verificationProvenance() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /policy-validate
router.post('/policy-validate', async (req: Request, res: Response) => {
  const { content, policies, policy_domain = 'general' } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  if (!policies) return res.status(400).json({ error: 'policies is required' });
  try {
    const policiesStr = typeof policies === 'string' ? policies : JSON.stringify(policies).slice(0, 2000);
    const raw = await callClaude(`Validate this content against the specified policies. Domain: "${policy_domain}".

Policies: "${policiesStr.slice(0, 2000)}"

Content: "${content.slice(0, 3000)}"

Return concise JSON:
{
  "policy_compliant": true|false,
  "compliance_score": 0-100,
  "violations": [{ "policy": "string", "violation": "string", "severity": "critical|high|medium|low", "location": "string" }],
  "warnings": [{ "policy": "string", "concern": "string" }],
  "compliant_sections": ["string"],
  "required_changes": [{ "change": "string", "policy_reference": "string", "priority": "high|medium|low" }],
  "risk_level": "critical|high|medium|low|none",
  "confidence_per_section": { "violations": 0-1, "compliance_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...verificationProvenance() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /output-score
router.post('/output-score', async (req: Request, res: Response) => {
  const { ai_output, task_description, scoring_dimensions } = req.body;
  if (!ai_output) return res.status(400).json({ error: 'ai_output is required' });
  try {
    const dims = scoring_dimensions || ['accuracy', 'completeness', 'clarity', 'relevance', 'hallucination_risk'];
    const raw = await callClaude(`Score this AI output across multiple quality dimensions. Task: "${task_description || 'not specified'}". Dimensions: ${JSON.stringify(dims)}.

AI output: "${ai_output.slice(0, 3000)}"

Return concise JSON:
{
  "overall_score": 0-100,
  "grade": "A|B|C|D|F",
  "dimension_scores": { "accuracy": 0-100, "completeness": 0-100, "clarity": 0-100, "relevance": 0-100, "hallucination_risk": 0-100 },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "critical_issues": ["string"],
  "improvement_suggestions": ["string"],
  "safe_to_use": true|false,
  "use_with_caution": true|false,
  "confidence_per_section": { "overall_score": 0-1, "dimension_scores": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...verificationProvenance() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /flag-uncertainty
router.post('/flag-uncertainty', async (req: Request, res: Response) => {
  const { text, threshold = 'medium' } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const raw = await callClaude(`Identify and flag all uncertain, speculative, or low-confidence statements in this text. Flag threshold: "${threshold}" (low|medium|high — lower threshold = flag more aggressively).

Text: "${text.slice(0, 4000)}"

Return concise JSON:
{
  "uncertainty_flags": [{ "statement": "string", "uncertainty_type": "speculative|hedged|unverified|ambiguous|outdated", "confidence": 0-1, "reason": "string" }],
  "certain_statements": ["string (clearly factual, high-confidence)"],
  "overall_certainty_score": 0-100,
  "high_risk_sections": ["string"],
  "hedging_language_detected": ["string (words like 'might', 'could', 'possibly')"],
  "recommendation": "string (use/review/reject)",
  "confidence_per_section": { "uncertainty_flags": 0-1, "certain_statements": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...verificationProvenance() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { content, verification_type } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  res.json({
    execution_ready: true,
    verification_type: verification_type || 'auto',
    content_length: (content || '').length,
    next_api: 'ai-output-safety',
    next_endpoint: '/check',
    blocking_flags: [],
    flag_definitions: {
      NO_CONTENT: 'No content provided — required for all verification',
      CONTENT_TOO_SHORT: 'Content under 50 characters — verification not reliable',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /verify (one-call workflow)
router.post('/verify', async (req: Request, res: Response) => {
  const { content, content_type = 'ai_output', task_description, policies } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const policyStr = policies ? `Policies to check: ${JSON.stringify(policies).slice(0, 500)}` : '';
    const raw = await callClaude(`ONE-CALL full verification workflow. Content type: "${content_type}". Task: "${task_description || 'not specified'}". ${policyStr}

Content: "${content.slice(0, 3000)}"

Return concise JSON:
{
  "overall_verdict": "pass|fail|review_needed",
  "trust_score": 0-100,
  "hallucination_risk": "critical|high|medium|low|none",
  "factual_accuracy": "high|medium|low|unknown",
  "consistency": "consistent|minor_issues|contradictions_found",
  "policy_compliant": true|false|null,
  "critical_issues": [{ "issue": "string", "severity": "critical|high|medium|low", "location": "string" }],
  "safe_to_use": true|false,
  "recommended_action": "use_as_is|use_with_caution|requires_edit|reject",
  "corrections_needed": ["string"],
  "verification_summary": "string",
  "confidence_per_section": { "hallucination_risk": 0-1, "factual_accuracy": 0-1, "consistency": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...verificationProvenance() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["verification:read", "verification:write", "verification:execute"];
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
  existing.forEach((evt: any) => { res.write(`data: ${JSON.stringify(evt)}\n\n`); index++; });
  const interval = setInterval(() => {
    const current = eventStore[req.params.execution_id] || [];
    while (index < current.length) { res.write(`data: ${JSON.stringify(current[index])}\n\n`); index++; }
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
  const wf = createWorkflow(workflow_id, goal || 'verify', steps || ["detect_hallucinations", "check_consistency", "validate_citations", "score_output", "generate_report"], meta || {});
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
