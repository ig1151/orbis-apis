import { Router, Request, Response } from 'express';
import axios from 'axios';

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

export default router;
