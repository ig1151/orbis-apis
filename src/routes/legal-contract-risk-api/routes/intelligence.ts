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

function legalMeta(risk_level?: string) {
  const highRisk = risk_level === 'critical' || risk_level === 'high';
  return {
    legal_disclaimer: 'This analysis is AI-generated for informational purposes only and does not constitute legal advice. Consult a licensed attorney before taking any contractual action.',
    requires_licensed_attorney_review: highRisk ?? true,
    jurisdiction_scope: {
      coverage: 'general commercial law principles',
      limitations: ['Jurisdiction-specific statutes not verified', 'Local regulations may vary', 'Analysis based on text provided only'],
      recommended_review: highRisk ? 'Licensed attorney review strongly recommended before signing' : 'Legal review recommended for risk items',
    },
  };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Legal Contract Risk API', info: '/legal-contract-risk/info', openapi: '/legal-contract-risk/openapi.json', health: 'ok' });
});

// POST /extract-clauses
router.post('/extract-clauses', async (req: Request, res: Response) => {
  const { contract, contract_type = 'general', jurisdiction } = req.body;
  if (!contract) return res.status(400).json({ error: 'contract is required' });
  try {
    const raw = await callClaude(`Extract all clauses from this ${contract_type} contract. Jurisdiction: "${jurisdiction || 'general'}".

Contract (first 4000 chars): "${contract.slice(0, 4000)}"

Return concise JSON:
{
  "clauses": [{ "clause_id": "string", "title": "string", "category": "string", "text_excerpt": "string", "citation": { "char_start": number|null, "char_end": number|null, "page_ref": "string|null", "section_ref": "string|null" }, "importance": "critical|high|medium|low" }],
  "total_clauses": number,
  "categories_found": ["string"],
  "contract_type_detected": "string",
  "jurisdiction_detected": "string|null",
  "contract_summary": "string (2-3 sentences)",
  "confidence_per_section": { "clauses": 0-1, "categories_found": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...legalMeta() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /risk-score
router.post('/risk-score', async (req: Request, res: Response) => {
  const { contract, party_role = 'buyer', contract_type = 'general' } = req.body;
  if (!contract) return res.status(400).json({ error: 'contract is required' });
  try {
    const raw = await callClaude(`Score the overall risk of this ${contract_type} contract from the perspective of the "${party_role}" party.

Contract (first 4000 chars): "${contract.slice(0, 4000)}"

Return concise JSON:
{
  "overall_risk_score": 0-100,
  "risk_level": "critical|high|medium|low",
  "risk_grade": "A|B|C|D|F",
  "risk_by_category": [{ "category": "string", "score": 0-100, "level": "critical|high|medium|low", "primary_risk": "string" }],
  "top_risks": [{ "risk": "string", "category": "string", "impact": "string", "likelihood": "high|medium|low" }],
  "favorable_terms": ["string (terms that benefit the party_role)"],
  "unfavorable_terms": ["string (terms that disadvantage the party_role)"],
  "balance_assessment": "strongly_favorable|favorable|balanced|unfavorable|strongly_unfavorable",
  "sign_recommendation": "safe_to_sign|review_first|negotiate|do_not_sign",
  "confidence_per_section": { "overall_risk_score": 0-1, "top_risks": 0-1, "balance_assessment": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, ...legalMeta(parsed.risk_level) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /flag-risks
router.post('/flag-risks', async (req: Request, res: Response) => {
  const { contract, party_role = 'buyer', risk_categories } = req.body;
  if (!contract) return res.status(400).json({ error: 'contract is required' });
  try {
    const categories = risk_categories || ['liability', 'termination', 'indemnification', 'ip', 'payment', 'dispute', 'confidentiality', 'compliance'];
    const raw = await callClaude(`Identify and explain all risky clauses in this contract from the "${party_role}" perspective. Focus on: ${categories.join(', ')}.

Contract (first 4000 chars): "${contract.slice(0, 4000)}"

Return concise JSON:
{
  "risk_flags": [{ "clause_title": "string", "risk_type": "string", "severity": "critical|high|medium|low", "text_excerpt": "string", "explanation": "string", "impact": "string", "suggested_revision": "string" }],
  "critical_count": number,
  "high_count": number,
  "medium_count": number,
  "low_count": number,
  "red_flags": ["string (one-line summaries of the most dangerous clauses)"],
  "immediate_action_required": true|false,
  "categories_checked": ["string"],
  "confidence_per_section": { "risk_flags": 0-1, "red_flags": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    const topSeverity = parsed.risk_flags?.[0]?.severity;
    res.json({ ...parsed, ...legalMeta(topSeverity) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /missing-clauses
router.post('/missing-clauses', async (req: Request, res: Response) => {
  const { contract, contract_type = 'general', jurisdiction } = req.body;
  if (!contract) return res.status(400).json({ error: 'contract is required' });
  try {
    const raw = await callClaude(`Identify standard clauses that are missing from this ${contract_type} contract. Jurisdiction: "${jurisdiction || 'general'}".

Contract (first 4000 chars): "${contract.slice(0, 4000)}"

Return concise JSON:
{
  "missing_clauses": [{ "clause_name": "string", "importance": "critical|high|medium|low", "why_needed": "string", "risk_of_omission": "string", "suggested_language": "string" }],
  "present_standard_clauses": ["string"],
  "completeness_score": 0-100,
  "critical_missing_count": number,
  "high_missing_count": number,
  "most_urgent_addition": "string",
  "industry_standard_gaps": ["string"],
  "confidence_per_section": { "missing_clauses": 0-1, "completeness_score": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...legalMeta() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /compare-contracts
router.post('/compare-contracts', async (req: Request, res: Response) => {
  const { contract_a, contract_b, comparison_focus = 'all' } = req.body;
  if (!contract_a || !contract_b) return res.status(400).json({ error: 'contract_a and contract_b are required' });
  try {
    const raw = await callClaude(`Compare these two contracts and identify material differences. Focus: "${comparison_focus}" (all|financial|termination|liability|ip).

Contract A (first 2000 chars): "${contract_a.slice(0, 2000)}"

Contract B (first 2000 chars): "${contract_b.slice(0, 2000)}"

Return concise JSON:
{
  "material_differences": [{ "clause": "string", "contract_a_position": "string", "contract_b_position": "string", "significance": "critical|high|medium|low", "favors": "contract_a|contract_b|neutral" }],
  "clauses_only_in_a": ["string"],
  "clauses_only_in_b": ["string"],
  "matching_clauses": ["string"],
  "overall_similarity_pct": number,
  "better_for_buyer": "contract_a|contract_b|equivalent",
  "key_negotiation_differences": ["string"],
  "recommendation": "string",
  "confidence_per_section": { "material_differences": 0-1, "overall_similarity_pct": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...legalMeta() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /summarize-contract
router.post('/summarize-contract', async (req: Request, res: Response) => {
  const { contract, audience = 'executive', contract_type = 'general' } = req.body;
  if (!contract) return res.status(400).json({ error: 'contract is required' });
  try {
    const raw = await callClaude(`Summarize this ${contract_type} contract for a "${audience}" audience (executive|legal|technical|non-technical).

Contract (first 4000 chars): "${contract.slice(0, 4000)}"

Return concise JSON:
{
  "executive_summary": "string (3-5 sentences)",
  "parties": [{ "name": "string", "role": "string", "obligations": ["string"] }],
  "key_terms": [{ "term": "string", "value": "string", "notes": "string" }],
  "effective_date": "string|null",
  "expiration_date": "string|null",
  "renewal_terms": "string|null",
  "payment_terms": "string|null",
  "termination_conditions": ["string"],
  "key_obligations": [{ "party": "string", "obligation": "string", "deadline": "string|null" }],
  "governing_law": "string|null",
  "important_dates": [{ "date": "string", "event": "string" }],
  "confidence_per_section": { "executive_summary": 0-1, "key_terms": 0-1, "parties": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...legalMeta() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /negotiation-points
router.post('/negotiation-points', async (req: Request, res: Response) => {
  const { contract, party_role = 'buyer', priorities } = req.body;
  if (!contract) return res.status(400).json({ error: 'contract is required' });
  try {
    const raw = await callClaude(`Identify negotiation opportunities in this contract from the "${party_role}" perspective. Priorities: ${JSON.stringify(priorities || ['cost', 'liability', 'flexibility'])}.

Contract (first 4000 chars): "${contract.slice(0, 4000)}"

Return concise JSON:
{
  "negotiation_points": [{ "clause": "string", "current_language": "string", "proposed_change": "string", "rationale": "string", "priority": "critical|high|medium|low", "likelihood_of_success": "high|medium|low" }],
  "walk_away_conditions": ["string (clauses that should be deal-breakers)"],
  "quick_wins": ["string (easy concessions to request)"],
  "leverage_points": ["string (areas where you have negotiating leverage)"],
  "concessions_to_offer": ["string (what you can give up to get the important things)"],
  "recommended_negotiation_sequence": ["string"],
  "overall_negotiation_strength": "strong|moderate|weak",
  "confidence_per_section": { "negotiation_points": 0-1, "leverage_points": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json({ ...parseJSON(raw), ...legalMeta() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /execution-gate
router.post('/execution-gate', async (req: Request, res: Response) => {
  const { contract, party_role } = req.body;
  if (!contract) return res.status(400).json({ error: 'contract is required' });
  const charCount = (contract || '').length;
  res.json({
    execution_ready: charCount > 200,
    party_role: party_role || 'buyer',
    contract_length: charCount,
    recommended_workflow: ['POST /extract-clauses', 'POST /risk-score', 'POST /flag-risks', 'POST /missing-clauses', 'POST /negotiation-points'],
    next_api: 'proposal-generation',
    next_endpoint: '/generate-proposal',
    blocking_flags: charCount < 200 ? ['CONTRACT_TOO_SHORT'] : [],
    flag_definitions: {
      CONTRACT_TOO_SHORT: 'Contract under 200 characters — not enough content for analysis',
      NO_CONTRACT: 'No contract text provided',
    },
    confidence_per_section: { execution_ready: 0.95, blocking_flags: 0.9 },
    privacy: { data_stored: false, retention: 'none' },
  });
});

// POST /analyze-contract (one-call workflow)
router.post('/analyze-contract', async (req: Request, res: Response) => {
  const { contract, party_role = 'buyer', contract_type = 'general', jurisdiction } = req.body;
  if (!contract) return res.status(400).json({ error: 'contract is required' });
  try {
    const raw = await callClaude(`ONE-CALL full contract analysis. Party role: "${party_role}". Type: "${contract_type}". Jurisdiction: "${jurisdiction || 'general'}".

Contract (first 4000 chars): "${contract.slice(0, 4000)}"

Return concise JSON:
{
  "executive_summary": "string (3-4 sentences)",
  "overall_risk_score": 0-100,
  "risk_level": "critical|high|medium|low",
  "sign_recommendation": "safe_to_sign|review_first|negotiate|do_not_sign",
  "top_risks": [{ "risk": "string", "severity": "critical|high|medium|low", "clause": "string" }],
  "missing_critical_clauses": ["string"],
  "top_negotiation_points": [{ "clause": "string", "change": "string", "priority": "high|medium|low" }],
  "key_terms": [{ "term": "string", "value": "string" }],
  "effective_date": "string|null",
  "expiration_date": "string|null",
  "governing_law": "string|null",
  "parties": [{ "name": "string", "role": "string" }],
  "immediate_action_items": ["string"],
  "confidence_per_section": { "overall_risk_score": 0-1, "top_risks": 0-1, "top_negotiation_points": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    const parsed = parseJSON(raw);
    res.json({ ...parsed, ...legalMeta(parsed.risk_level) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// ── Event Store + Governance ──────────────────────────────────────────────────
const eventStore: Record<string, any[]> = {};
function emitEvent(execution_id: string, event: string, step: string, data: any = {}) {
  if (!eventStore[execution_id]) eventStore[execution_id] = [];
  eventStore[execution_id].push({ event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    event, step, timestamp: new Date().toISOString(), execution_id, data });
}
const REQUIRED_SCOPES: string[] = ["legal:read", "legal:analyze", "legal:execute"];
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
  const wf = createWorkflow(workflow_id, goal || 'analyze_contract', steps || ["extract_clauses", "score_risk", "flag_risks", "find_missing", "generate_negotiation_points"], meta || {});
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
