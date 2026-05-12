import { Router, Request, Response } from 'express';
import axios from 'axios';
import { buildRuntime } from '../../../shared/ai';

// ── Universal Runtime Envelope ────────────────────────────────────────────────


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

function parseJSON(raw: string) { const cleaned = raw.replace(/```json|```/g, "").trim(); const match = cleaned.match(/\{[\s\S]*\}/); if (!match) throw new Error("No JSON found"); return JSON.parse(match[0]); }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Compliance API', slug: 'compliance', version: '1.0.0', endpoints: ['/kyc-check','/sanctions-screen','/aml-check','/jurisdiction-check','/verify-counterparty','/transaction-risk','/watchlist-manage','/audit-trail','/risk-profile','/compliance-report','/execution-gate'], docs: '/compliance/info', openapi: '/compliance/openapi.json', mcp_compatible: true });
});

router.post('/kyc-check', async (req: Request, res: Response) => {
  const { entity_id, entity_type, identity_data, verification_level, jurisdiction } = req.body;
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });
  if (!entity_type) return res.status(400).json({ error: 'entity_type is required' });
  try {
    const raw = await callClaude(`Perform KYC verification for an agent or entity. Validate identity signals, assess documentation completeness, assign verification tier and flag anomalies.
Entity ID: "${entity_id}" Type: "${entity_type}" Level: "${verification_level || 'standard'}" Jurisdiction: "${jurisdiction || 'global'}" Identity data keys: ${JSON.stringify(Object.keys(identity_data || {}))}
Return JSON: { "entity_id": "string", "entity_type": "string", "kyc_status": "verified|pending|failed|requires_review", "verification_level": "basic|standard|enhanced|kyc", "identity_score": 0.9, "verification_signals": [{"signal":"string","status":"pass|fail|pending","weight":0.8}], "missing_documents": ["string"], "risk_flags": ["string"], "jurisdiction_requirements": ["string"], "expiry_date": "string", "recommended_action": "approve|request_documents|escalate|reject", "confidence_per_section": {"identity":0.9,"documentation":0.85}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sanctions-screen', async (req: Request, res: Response) => {
  const { entity_id, wallet_address, name, jurisdiction, screen_lists } = req.body;
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });
  try {
    const raw = await callClaude(`Screen entity against global sanctions lists including OFAC, UN, EU, OFSI and custom lists. Return match confidence, entity details and blocking decision.
Entity ID: "${entity_id}" Wallet: "${wallet_address || 'none'}" Name: "${name || 'unknown'}" Jurisdiction: "${jurisdiction || 'global'}" Lists: ${JSON.stringify(screen_lists || ['OFAC','UN','EU','OFSI'])}
Return JSON: { "entity_id": "string", "screened_at": "string", "decision": "clear|blocked|review_required", "risk_level": "low|medium|high|critical", "matched_entities": [{"list":"string","entity":"string","match_confidence":0.95,"match_type":"exact|fuzzy|alias","details":"string"}], "lists_checked": ["string"], "blocking_reason": "string or null", "recommended_action": "proceed|block|escalate_to_compliance", "next_screen_date": "string", "confidence_per_section": {"sanctions_check":0.95}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/aml-check', async (req: Request, res: Response) => {
  const { entity_id, wallet_address, amount_usdc, transaction_pattern, jurisdiction } = req.body;
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });
  if (!amount_usdc) return res.status(400).json({ error: 'amount_usdc is required' });
  try {
    const raw = await callClaude(`Full AML analysis. Detect structuring, velocity anomalies, layering patterns and jurisdiction risk. Determine SAR/CTR filing requirements.
Entity ID: "${entity_id}" Wallet: "${wallet_address || 'none'}" Amount USDC: ${amount_usdc} Pattern: ${JSON.stringify(transaction_pattern || {})} Jurisdiction: "${jurisdiction || 'global'}"
Return JSON: { "entity_id": "string", "amount_usdc": 0.0, "aml_risk_score": 0.2, "aml_risk_level": "low|medium|high|critical", "decision": "clear|review_required|block|file_sar", "risk_signals": [{"signal":"string","severity":"low|medium|high","description":"string"}], "structuring_detected": false, "layering_detected": false, "velocity_flag": false, "threshold_breach": false, "threshold_amount_usdc": 10000, "sar_required": false, "ctr_required": false, "jurisdiction_risk": "low|medium|high", "recommended_action": "proceed|enhanced_due_diligence|block|file_report", "confidence_per_section": {"pattern_analysis":0.9,"threshold_check":0.95}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/jurisdiction-check', async (req: Request, res: Response) => {
  const { entity_id, from_jurisdiction, to_jurisdiction, transaction_type, amount_usdc } = req.body;
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });
  if (!from_jurisdiction) return res.status(400).json({ error: 'from_jurisdiction is required' });
  if (!to_jurisdiction) return res.status(400).json({ error: 'to_jurisdiction is required' });
  try {
    const raw = await callClaude(`Check jurisdictional compliance for a cross-border transaction. Assess regulatory requirements, restrictions, reporting obligations and licensing needs.
Entity ID: "${entity_id}" From: "${from_jurisdiction}" To: "${to_jurisdiction}" Type: "${transaction_type || 'payment'}" Amount USDC: ${amount_usdc || 'unspecified'}
Return JSON: { "entity_id": "string", "from_jurisdiction": "string", "to_jurisdiction": "string", "permitted": true, "risk_level": "low|medium|high|critical", "regulatory_requirements": ["string"], "reporting_obligations": ["string"], "licensing_required": false, "licensing_types": ["string"], "restricted_activities": ["string"], "travel_rule_applies": false, "travel_rule_threshold_usdc": 1000, "recommended_action": "proceed|obtain_license|file_report|block", "confidence_per_section": {"jurisdiction_rules":0.9,"reporting":0.85}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/verify-counterparty', async (req: Request, res: Response) => {
  const { entity_id, counterparty_id, wallet_address, verification_level, transaction_context } = req.body;
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });
  if (!counterparty_id) return res.status(400).json({ error: 'counterparty_id is required' });
  try {
    const raw = await callClaude(`Full counterparty verification including identity, sanctions, AML signals and trust scoring. Return composite verification decision with interaction limits.
Entity ID: "${entity_id}" Counterparty: "${counterparty_id}" Wallet: "${wallet_address || 'none'}" Level: "${verification_level || 'standard'}" Context: ${JSON.stringify(transaction_context || {})}
Return JSON: { "entity_id": "string", "counterparty_id": "string", "verified": true, "trust_score": 0.85, "trust_level": "high|medium|low|untrusted", "verification_components": {"kyc":"pass|fail|pending","sanctions":"clear|blocked","aml":"clear|review","identity":"verified|unverified"}, "risk_factors": ["string"], "recommended_limit_usdc": 500, "interaction_history": {"total_transactions":0,"successful":0,"disputed":0}, "recommended_action": "approve|limit|escalate|reject", "chain_to": ["agent-payments", "compliance/transaction-risk"], "confidence_per_section": {"identity":0.9,"trust_score":0.85}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/transaction-risk', async (req: Request, res: Response) => {
  const { entity_id, from_wallet, to_wallet, amount_usdc, purpose, metadata } = req.body;
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });
  if (!amount_usdc) return res.status(400).json({ error: 'amount_usdc is required' });
  try {
    const raw = await callClaude(`Comprehensive transaction risk assessment. Score counterparty, amount, pattern, jurisdiction, timing and behavioral dimensions. Return composite risk with factor breakdown.
Entity ID: "${entity_id}" From: "${from_wallet || 'unknown'}" To: "${to_wallet || 'unknown'}" Amount USDC: ${amount_usdc} Purpose: "${purpose || 'unspecified'}" Metadata: ${JSON.stringify(metadata || {})}
Return JSON: { "entity_id": "string", "transaction_id": "string", "composite_risk_score": 0.25, "risk_level": "low|medium|high|critical", "risk_factors": {"counterparty_risk":0.2,"amount_risk":0.1,"pattern_risk":0.15,"jurisdiction_risk":0.1,"timing_risk":0.05,"behavioral_risk":0.1}, "blocking_factors": ["string"], "warning_factors": ["string"], "proceed": true, "recommended_action": "proceed|add_controls|require_approval|block", "suggested_controls": ["string"], "risk_expiry_ms": 300000, "chain_to": ["agent-payments", "compliance/execution-gate"], "confidence_per_section": {"counterparty":0.9,"pattern":0.85}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/watchlist-manage', async (req: Request, res: Response) => {
  const { action, entity_id, watchlist_id, reason, severity, metadata } = req.body;
  if (!action) return res.status(400).json({ error: 'action is required' });
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });
  try {
    const raw = await callClaude(`Manage compliance watchlist entries. Add, remove, check or update entities with severity scoring and audit trail generation.
Action: "${action}" Entity ID: "${entity_id}" Watchlist: "${watchlist_id || 'default'}" Reason: "${reason || 'none'}" Severity: "${severity || 'medium'}" Metadata: ${JSON.stringify(metadata || {})}
Return JSON: { "action": "add|remove|check|update", "entity_id": "string", "watchlist_id": "string", "status": "added|removed|found|not_found|updated", "severity": "low|medium|high|critical", "reason": "string", "added_at": "string", "expires_at": "string or null", "review_date": "string", "audit_entry": {"timestamp":"string","action":"string","actor":"string"}, "similar_entities": ["string"], "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/audit-trail', async (req: Request, res: Response) => {
  const { entity_id, event_type, event_data, actor_id, timestamp } = req.body;
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });
  if (!event_type) return res.status(400).json({ error: 'event_type is required' });
  try {
    const raw = await callClaude(`Generate a compliance audit trail entry. Create immutable log with hash, categorize event, assess regulatory significance and flag reporting requirements.
Entity ID: "${entity_id}" Event: "${event_type}" Actor: "${actor_id || 'system'}" Timestamp: "${timestamp || new Date().toISOString()}" Data keys: ${JSON.stringify(Object.keys(event_data || {}))}
Return JSON: { "audit_id": "string", "entity_id": "string", "event_type": "string", "actor_id": "string", "timestamp": "string", "hash": "string", "previous_hash": "string or null", "regulatory_significance": "low|medium|high", "reporting_required": false, "retention_period_days": 2555, "categories": ["string"], "immutable": true, "chain_valid": true, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/risk-profile', async (req: Request, res: Response) => {
  const { entity_id, entity_type, transaction_history, jurisdiction, business_type } = req.body;
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });
  if (!entity_type) return res.status(400).json({ error: 'entity_type is required' });
  try {
    const raw = await callClaude(`Build a comprehensive compliance risk profile for an entity. Aggregate KYC, AML, sanctions and behavioral signals into a composite risk rating with review schedule.
Entity ID: "${entity_id}" Type: "${entity_type}" Jurisdiction: "${jurisdiction || 'global'}" Business type: "${business_type || 'unknown'}" History keys: ${JSON.stringify(Object.keys(transaction_history || {}))}
Return JSON: { "entity_id": "string", "entity_type": "string", "overall_risk_rating": "low|medium|high|critical", "composite_score": 0.25, "risk_dimensions": {"kyc_risk":0.2,"aml_risk":0.15,"sanctions_risk":0.05,"behavioral_risk":0.2,"jurisdiction_risk":0.1}, "risk_flags": ["string"], "positive_signals": ["string"], "review_frequency": "monthly|quarterly|annually", "next_review_date": "string", "enhanced_due_diligence_required": false, "transaction_limits": {"daily_usdc":10000,"per_transaction_usdc":1000}, "confidence_per_section": {"kyc":0.9,"aml":0.85,"behavioral":0.8}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/compliance-report', async (req: Request, res: Response) => {
  const { entity_id, report_type, period_start, period_end, include_sections } = req.body;
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });
  if (!report_type) return res.status(400).json({ error: 'report_type is required' });
  try {
    const raw = await callClaude(`Generate a compliance report for an entity. Summarize KYC status, AML findings, sanctions checks, risk profile and regulatory obligations for the specified period.
Entity ID: "${entity_id}" Report type: "${report_type}" Period: "${period_start || 'last_month'}" to "${period_end || 'now'}" Sections: ${JSON.stringify(include_sections || ['kyc','aml','sanctions','risk','recommendations'])}
Return JSON: { "entity_id": "string", "report_id": "string", "report_type": "string", "period": {"start":"string","end":"string"}, "summary": {"overall_status":"compliant|non_compliant|review_required","risk_rating":"low|medium|high","key_findings":["string"]}, "sections": {"kyc":{"status":"string","findings":["string"]},"aml":{"status":"string","findings":["string"]},"sanctions":{"status":"string","findings":["string"]},"risk":{"rating":"string","factors":["string"]}}, "action_items": [{"priority":"high|medium|low","action":"string","deadline":"string"}], "regulatory_obligations": ["string"], "chain_to": ["workflow-orchestrator", "compliance/execution-gate"], "confidence_per_section": {"kyc":0.9,"aml":0.85}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { entity_id, action_type, action_context, risk_threshold } = req.body;
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });
  if (!action_type) return res.status(400).json({ error: 'action_type is required' });
  if (!action_context) return res.status(400).json({ error: 'action_context is required' });
  try {
    const raw = await callClaude(`Gate a compliance-sensitive action. Run full compliance check including sanctions, AML, KYC status and jurisdiction rules. Return execute/block decision with audit trail.
Entity ID: "${entity_id}" Action: "${action_type}" Risk threshold: ${risk_threshold || 0.7} Context: ${JSON.stringify(action_context)}
Return JSON: { "execute": true, "entity_id": "string", "action_type": "string", "compliance_score": 0.9, "risk_score": 0.1, "risk_level": "low|medium|high|critical", "checks_passed": {"kyc":true,"sanctions":true,"aml":true,"jurisdiction":true}, "blocking_flags": ["string"], "warnings": ["string"], "human_approval_required": false, "confidence": 0.91,
  "recommended_action": "proceed|require_approval|block|escalate", "audit_entry": {"timestamp":"string","hash":"string"}, "chain_to": ["string"], "confidence_per_section": {"compliance":0.95,"risk":0.9}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


router.post('/policy-check', async (req: Request, res: Response) => {
  const { entity_id, policy_domain, action, context, jurisdiction } = req.body;
  if (!entity_id) return res.status(400).json({ error: 'entity_id is required' });
  if (!policy_domain) return res.status(400).json({ error: 'policy_domain is required' });
  if (!action) return res.status(400).json({ error: 'action is required' });
  try {
    const raw = await callClaude(`Check non-financial policy compliance for an agent action. Assess against HR, legal, healthcare, advertising, platform terms, or data privacy policies. Return permitted/blocked decision with policy citations and remediation steps.
Entity ID: "${entity_id}" Policy domain: "${policy_domain}" Action: "${action}" Jurisdiction: "${jurisdiction || 'global'}" Context: ${JSON.stringify(context || {})}

Policy domains include: hr (employment, discrimination, harassment), legal (IP, contracts, liability), healthcare (HIPAA, patient data, medical advice), advertising (FTC, GDPR consent, deceptive practices), platform (ToS violations, content policy, rate limits), data_privacy (GDPR, CCPA, data retention), content (copyright, defamation, hate speech).

Return JSON: { "entity_id": "string", "policy_domain": "string", "action": "string", "permitted": true, "risk_level": "low|medium|high|critical", "policy_violations": [{"policy":"string","section":"string","severity":"low|medium|high","description":"string"}], "warnings": ["string"], "citations": [{"policy_name":"string","section":"string","url":"string or null"}], "jurisdiction_specific": [{"jurisdiction":"string","requirement":"string","status":"compliant|non_compliant|unknown"}], "remediation_steps": ["string"], "human_review_required": false, "recommended_action": "proceed|modify|escalate|block", "chain_to": ["compliance/audit-trail","compliance/execution-gate"], "confidence_per_section": {"policy_check":0.9,"jurisdiction":0.85}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
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
const REQUIRED_SCOPES: string[] = ["defi:read", "defi:simulate", "defi:execute", "defi:risk"];
const EXECUTION_AUTHORITY: string = "high";
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
  const wf = createWorkflow(workflow_id, goal || 'execute', steps || ["validate_inputs", "assess_risk", "simulate_execution", "apply_execution_gate", "finalize"], meta || {});
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

