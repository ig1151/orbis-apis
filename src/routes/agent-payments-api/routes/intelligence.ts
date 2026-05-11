import { Router, Request, Response } from 'express';
import axios from 'axios';

// ── Universal Runtime Envelope ────────────────────────────────────────────────
function buildRuntime(req: any, overrides: Record<string, any> = {}) {
  const now          = Date.now();
  const trace_id     = req.headers?.['x-trace-id']     || `trace_${now}_${Math.random().toString(36).slice(2,8)}`;
  const execution_id = req.headers?.['x-execution-id'] || `exec_${now}_${Math.random().toString(36).slice(2,8)}`;
  const session_id   = req.body?.session_id || req.query?.session_id || req.headers?.['x-session-id'] || `session_${now}`;
  const request_id   = `req_${now}_${Math.random().toString(36).slice(2,8)}`;
  const unit         = 0.012;
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

function parseJSON(raw: string) { const cleaned = raw.replace(/```json|```/g, "").trim(); const match = cleaned.match(/\{[\s\S]*\}/); if (!match) throw new Error("No JSON found"); return JSON.parse(match[0]); }


router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Agent Payments API', slug: 'agent-payments', version: '1.0.0', endpoints: ['/create-wallet','/request-payment','/approve-spend','/execute-payment','/escrow','/subscription-management','/usage-billing','/spending-limits','/execution-gate','/simulate-payment','/verify-settlement','/run-payment'], docs: '/agent-payments/info', openapi: '/agent-payments/openapi.json', mcp_compatible: true });
});

router.post('/create-wallet', async (req: Request, res: Response) => {
  const { agent_id, wallet_type, network, spending_limit_usdc, owner_id } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!wallet_type) return res.status(400).json({ error: 'wallet_type is required' });
  try {
    const raw = await callClaude(`Generate agent wallet creation instructions and configuration. Validate wallet type selection, recommend network, set security parameters, and define spending controls.
Agent ID: "${agent_id}" Wallet type: "${wallet_type}" Network: "${network || 'base'}" Spending limit USDC: ${spending_limit_usdc ?? 1000} Owner ID: "${owner_id || 'none'}"

Return concise JSON:
{
  "agent_id": "string",
  "wallet_id": "string (uuid-style)",
  "wallet_type": "custodial|non_custodial|smart_contract",
  "network": "string",
  "address": "string (simulated blockchain address)",
  "spending_limit_usdc": number,
  "daily_limit_usdc": number,
  "requires_approval_above_usdc": number,
  "multi_sig_required": true|false,
  "security_config": { "rate_limit": "string", "whitelist_only": true|false, "require_2fa": true|false },
  "setup_steps": ["string"],
  "confidence_per_section": { "wallet_config": 0-1, "security": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/request-payment', async (req: Request, res: Response) => {
  const { from_agent_id, to_agent_id, amount_usdc, purpose, metadata, expires_in_minutes, idempotency_key } = req.body;
  if (!from_agent_id) return res.status(400).json({ error: 'from_agent_id is required' });
  if (!to_agent_id) return res.status(400).json({ error: 'to_agent_id is required' });
  if (amount_usdc === undefined) return res.status(400).json({ error: 'amount_usdc is required' });
  if (!purpose) return res.status(400).json({ error: 'purpose is required' });
  try {
    const raw = await callClaude(`Generate a payment request with validation, risk scoring, and approval routing. Assess payment legitimacy, check spending limits, and recommend approval workflow.
From agent: "${from_agent_id}" To agent: "${to_agent_id}" Amount USDC: ${amount_usdc} Purpose: "${purpose}" Metadata: ${JSON.stringify(metadata || {})} Expires in minutes: ${expires_in_minutes || 60} Idempotency key: "${idempotency_key || 'none'}"

Return concise JSON:
{
  "payment_request_id": "string (uuid-style)",
  "from_agent_id": "string",
  "to_agent_id": "string",
  "amount_usdc": number,
  "purpose": "string",
  "risk_score": 0-1,
  "risk_flags": ["string"],
  "approval_required": true|false,
  "approval_threshold_usdc": number,
  "expires_at": "string (ISO datetime)",
  "payment_status": "pending_approval|auto_approved|blocked",
  "routing": { "approver": "string", "channel": "string", "sla_minutes": number },
  "confidence_per_section": { "risk_assessment": 0-1, "routing": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/approve-spend', async (req: Request, res: Response) => {
  const { payment_request_id, approver_id, decision, modified_amount_usdc, conditions, reason, idempotency_key } = req.body;
  if (!payment_request_id) return res.status(400).json({ error: 'payment_request_id is required' });
  if (!approver_id) return res.status(400).json({ error: 'approver_id is required' });
  if (!decision) return res.status(400).json({ error: 'decision is required' });
  try {
    const raw = await callClaude(`Process a spend approval decision. Validate approver authority, apply conditions, generate audit trail, and prepare execution instructions.
Payment request ID: "${payment_request_id}" Approver ID: "${approver_id}" Decision: "${decision}" Modified amount USDC: ${modified_amount_usdc ?? 'none'} Conditions: ${JSON.stringify(conditions || [])} Reason: "${reason || 'none'}"

Return concise JSON:
{
  "payment_request_id": "string",
  "decision": "approve|reject|modify",
  "approver_id": "string",
  "approver_authority_level": "string",
  "final_amount_usdc": number,
  "conditions_applied": ["string"],
  "audit_entry": { "timestamp": "string (ISO datetime)", "action": "string", "actor": "string", "hash": "string" },
  "execution_ready": true|false,
  "expires_at": "string or null",
  "next_step": "string",
  "confidence_per_section": { "authority_validation": 0-1, "audit": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execute-payment', async (req: Request, res: Response) => {
  const { payment_request_id, wallet_id, network, gas_strategy, simulate_first, idempotency_key } = req.body;
  if (!payment_request_id) return res.status(400).json({ error: 'payment_request_id is required' });
  if (!wallet_id) return res.status(400).json({ error: 'wallet_id is required' });
  try {
    const raw = await callClaude(`Generate payment execution instructions with simulation, gas optimization, and confirmation steps. Validate pre-conditions and prepare rollback.
Payment request ID: "${payment_request_id}" Wallet ID: "${wallet_id}" Network: "${network || 'base'}" Gas strategy: "${gas_strategy || 'standard'}" Simulate first: ${simulate_first ?? true} Idempotency key: "${idempotency_key || 'none'}"

Return concise JSON:
{
  "payment_request_id": "string",
  "transaction_id": "string (uuid-style)",
  "status": "simulated|submitted|confirmed|failed",
  "amount_usdc": number,
  "network_fee_usdc": number,
  "total_cost_usdc": number,
  "gas_strategy": "fast|standard|economy",
  "estimated_confirmation_ms": number,
  "pre_execution_checks": [{ "check": "string", "passed": true|false }],
  "rollback_available": true|false,
  "receipt": { "block": "string", "timestamp": "string (ISO datetime)", "hash": "string" },
  "confidence_per_section": { "execution": 0-1, "gas_optimization": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/escrow', async (req: Request, res: Response) => {
  const { action, escrow_id, amount_usdc, payer_id, payee_id, release_conditions, expiry_hours, idempotency_key } = req.body;
  if (!action) return res.status(400).json({ error: 'action is required' });
  if (!escrow_id) return res.status(400).json({ error: 'escrow_id is required' });
  if (amount_usdc === undefined) return res.status(400).json({ error: 'amount_usdc is required' });
  try {
    const raw = await callClaude(`Generate escrow management instructions. Handle creation, condition validation, release triggers, and refund logic for agent-to-agent transactions.
Action: "${action}" Escrow ID: "${escrow_id}" Amount USDC: ${amount_usdc} Payer ID: "${payer_id || 'none'}" Payee ID: "${payee_id || 'none'}" Release conditions: ${JSON.stringify(release_conditions || [])} Expiry hours: ${expiry_hours || 24}

Return concise JSON:
{
  "escrow_id": "string",
  "action": "create|release|refund|check",
  "status": "created|held|released|refunded|expired",
  "amount_usdc": number,
  "payer_id": "string",
  "payee_id": "string",
  "conditions_met": [{ "condition": "string", "met": true|false }],
  "all_conditions_met": true|false,
  "release_ready": true|false,
  "expiry_at": "string (ISO datetime)",
  "audit_trail": [{ "timestamp": "string", "event": "string", "actor": "string" }],
  "confidence_per_section": { "conditions": 0-1, "release_logic": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/subscription-management', async (req: Request, res: Response) => {
  const { action, subscription_id, agent_id, plan, amount_usdc_per_period, period, features } = req.body;
  if (!action) return res.status(400).json({ error: 'action is required' });
  if (!subscription_id) return res.status(400).json({ error: 'subscription_id is required' });
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  try {
    const raw = await callClaude(`Manage agent subscription lifecycle. Handle plan changes, proration, feature gating, and renewal logic.
Action: "${action}" Subscription ID: "${subscription_id}" Agent ID: "${agent_id}" Plan: "${plan || 'none'}" Amount USDC per period: ${amount_usdc_per_period ?? 'none'} Period: "${period || 'monthly'}" Features: ${JSON.stringify(features || [])}

Return concise JSON:
{
  "subscription_id": "string",
  "agent_id": "string",
  "action": "string",
  "plan": "string",
  "status": "active|cancelled|paused|past_due",
  "amount_usdc_per_period": number,
  "period": "daily|weekly|monthly",
  "next_billing_date": "string (ISO date)",
  "proration_credit_usdc": number,
  "features_enabled": ["string"],
  "features_removed": ["string"],
  "cancellation_effective": "string or null",
  "renewal_instructions": ["string"],
  "confidence_per_section": { "billing": 0-1, "features": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/usage-billing', async (req: Request, res: Response) => {
  const { agent_id, usage_records, billing_period, pricing_table, apply_discounts } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!usage_records) return res.status(400).json({ error: 'usage_records is required' });
  try {
    const raw = await callClaude(`Calculate usage-based billing for an agent. Apply tiered pricing, volume discounts, and generate an itemized invoice with anomaly detection.
Agent ID: "${agent_id}" Billing period: "${billing_period || 'current_month'}" Apply discounts: ${apply_discounts ?? true} Pricing table: ${JSON.stringify(pricing_table || {})} Usage records: ${JSON.stringify(usage_records.slice(0, 50))}

Return concise JSON:
{
  "agent_id": "string",
  "billing_period": "string",
  "line_items": [{ "resource": "string", "quantity": number, "unit": "string", "unit_price_usdc": number, "subtotal_usdc": number, "tier": "string" }],
  "subtotal_usdc": number,
  "discounts": [{ "type": "string", "amount_usdc": number, "reason": "string" }],
  "total_usdc": number,
  "anomalies": [{ "resource": "string", "expected_range": "string", "actual": number, "flag": "string" }],
  "invoice_id": "string (uuid-style)",
  "due_date": "string (ISO date)",
  "confidence_per_section": { "line_items": 0-1, "anomalies": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/spending-limits', async (req: Request, res: Response) => {
  const { agent_id, action, wallet_id, daily_limit_usdc, per_transaction_limit_usdc, monthly_limit_usdc, whitelist_addresses } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!action) return res.status(400).json({ error: 'action is required' });
  if (!wallet_id) return res.status(400).json({ error: 'wallet_id is required' });
  try {
    const raw = await callClaude(`Manage agent spending limits and governance controls. Validate limit configuration, check current spend against limits, and flag policy violations.
Agent ID: "${agent_id}" Action: "${action}" Wallet ID: "${wallet_id}" Daily limit USDC: ${daily_limit_usdc ?? 'none'} Per-transaction limit USDC: ${per_transaction_limit_usdc ?? 'none'} Monthly limit USDC: ${monthly_limit_usdc ?? 'none'} Whitelist addresses: ${JSON.stringify(whitelist_addresses || [])}

Return concise JSON:
{
  "agent_id": "string",
  "wallet_id": "string",
  "action": "string",
  "current_limits": { "daily": number, "per_transaction": number, "monthly": number },
  "current_spend": { "today_usdc": number, "this_month_usdc": number },
  "utilization": { "daily_pct": number, "monthly_pct": number },
  "headroom": { "daily_usdc": number, "monthly_usdc": number },
  "violations": ["string"],
  "at_risk": true|false,
  "recommended_action": "string",
  "confidence_per_section": { "limits": 0-1, "spend_analysis": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { payment_action, payment_context, risk_threshold, require_human_approval, compliance_check } = req.body;
  if (!payment_action) return res.status(400).json({ error: 'payment_action is required' });
  if (!payment_context) return res.status(400).json({ error: 'payment_context is required' });
  try {
    const raw = await callClaude(`Gate autonomous payment execution. Assess risk, check compliance, validate authority, and determine if human approval is needed before proceeding.
Payment action: "${payment_action}" Risk threshold: ${risk_threshold ?? 0.7} Require human approval: ${require_human_approval ?? false} Compliance check: ${compliance_check ?? true} Payment context: ${JSON.stringify(payment_context)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "risk_score": 0-1,
  "risk_level": "high|medium|low",
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "compliance_status": "compliant|review_needed|blocked",
  "human_approval_required": true|false,
  "recommended_action": "proceed|require_approval|block|escrow_first",
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


router.post('/simulate-payment', async (req: Request, res: Response) => {
  const { payment_request_id, wallet_id, network, amount_usdc } = req.body;
  if (!payment_request_id) return res.status(400).json({ error: 'payment_request_id is required' });
  if (!wallet_id) return res.status(400).json({ error: 'wallet_id is required' });
  try {
    const raw = await callClaude(`Simulate a payment before execution. Observe current financial state, check balances, estimate fees, assess risk, and return go/no-go recommendation without executing.
Payment request ID: "${payment_request_id}" Wallet ID: "${wallet_id}" Network: "${network || 'base'}" Amount USDC: ${amount_usdc || 'unknown'}

Return concise JSON:
{
  "payment_request_id": "string",
  "simulation_id": "string",
  "go": true,
  "balance_sufficient": true,
  "estimated_fee_usdc": 0.002,
  "total_cost_usdc": 0.0,
  "risk_score": 0.1,
  "risk_flags": ["string"],
  "spending_limit_headroom_usdc": 0.0,
  "network_congestion": "low|medium|high",
  "recommended_gas_strategy": "fast|standard|economy",
  "simulation_notes": ["string"],
  "confidence_per_section": { "balance_check": 0.95, "risk_assessment": 0.9 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/verify-settlement', async (req: Request, res: Response) => {
  const { transaction_id, expected_amount_usdc, recipient_id, max_wait_ms } = req.body;
  if (!transaction_id) return res.status(400).json({ error: 'transaction_id is required' });
  if (!expected_amount_usdc) return res.status(400).json({ error: 'expected_amount_usdc is required' });
  try {
    const raw = await callClaude(`Verify payment settlement after execution. Check confirmation status, validate amount received, detect anomalies, and return loop-continuation decision.
Transaction ID: "${transaction_id}" Expected amount USDC: ${expected_amount_usdc} Recipient ID: "${recipient_id || 'unknown'}" Max wait ms: ${max_wait_ms || 30000}

Return concise JSON:
{
  "transaction_id": "string",
  "settled": true,
  "confirmations": 3,
  "amount_received_usdc": 0.0,
  "amount_matched": true,
  "settlement_time_ms": 0,
  "anomalies": ["string"],
  "recipient_confirmed": true,
  "loop_decision": "continue|retry|escalate|abort",
  "retry_recommended": false,
  "retry_reason": "string or null",
  "next_action": "string",
  "confidence_per_section": { "settlement": 0.95, "anomaly_detection": 0.9 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/run-payment', async (req: Request, res: Response) => {
  const { from_agent_id, to_agent_id, amount_usdc, purpose, wallet_id, network, auto_approve_below_usdc } = req.body;
  if (!from_agent_id) return res.status(400).json({ error: 'from_agent_id is required' });
  if (!to_agent_id) return res.status(400).json({ error: 'to_agent_id is required' });
  if (!amount_usdc) return res.status(400).json({ error: 'amount_usdc is required' });
  if (!purpose) return res.status(400).json({ error: 'purpose is required' });
  if (!wallet_id) return res.status(400).json({ error: 'wallet_id is required' });
  try {
    const raw = await callClaude(`ONE-CALL: Execute a complete autonomous payment workflow. Simulate, gate, approve, execute and verify settlement in one response.
From: "${from_agent_id}" To: "${to_agent_id}" Amount USDC: ${amount_usdc} Purpose: "${purpose}" Wallet: "${wallet_id}" Network: "${network || 'base'}" Auto-approve below USDC: ${auto_approve_below_usdc || 100}

Return concise JSON:
{
  "workflow_id": "string",
  "from_agent_id": "string",
  "to_agent_id": "string",
  "amount_usdc": 0.0,
  "simulation": { "go": true, "risk_score": 0.1, "estimated_fee_usdc": 0.002 },
  "gate": { "execute": true, "risk_level": "low", "human_approval_required": false },
  "approval": { "decision": "approve", "auto_approved": true, "approver": "string" },
  "execution": { "transaction_id": "string", "status": "confirmed", "total_cost_usdc": 0.0 },
  "settlement": { "settled": true, "confirmations": 3, "amount_matched": true },
  "overall_status": "completed|pending_approval|failed|escalated",
  "loop_decision": "continue|retry|escalate|abort",
  "audit_trail": [{ "stage": "string", "timestamp": "string", "result": "string" }],
  "confidence_per_section": { "simulation": 0.95, "execution": 0.9, "settlement": 0.95 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


router.post('/sanctions-screen', async (req: Request, res: Response) => {
  const { agent_id, wallet_address, name, jurisdiction, screen_lists } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!wallet_address) return res.status(400).json({ error: 'wallet_address is required' });
  try {
    const raw = await callClaude(`Screen an agent or wallet against sanctions lists. Check OFAC, UN, EU lists and return clear/blocked decision with matched entities.
Agent ID: "${agent_id}" Wallet: "${wallet_address}" Name: "${name || 'unknown'}" Jurisdiction: "${jurisdiction || 'global'}" Lists: ${JSON.stringify(screen_lists || ['OFAC','UN','EU'])}
Return JSON: { "agent_id": "string", "wallet_address": "string", "screened_at": "string", "decision": "clear|blocked|review_required", "risk_level": "low|medium|high|critical", "matched_entities": [{"list":"string","entity":"string","match_confidence":0.95,"match_type":"exact|fuzzy|alias"}], "lists_checked": ["string"], "blocking_reason": "string or null", "recommended_action": "proceed|block|escalate_to_compliance", "review_notes": ["string"], "confidence_per_section": {"sanctions_check":0.95}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/verify-counterparty', async (req: Request, res: Response) => {
  const { agent_id, counterparty_id, wallet_address, verification_level, context } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!counterparty_id) return res.status(400).json({ error: 'counterparty_id is required' });
  try {
    const raw = await callClaude(`Verify identity and trustworthiness of a payment counterparty. Check reputation signals and return trust score with recommended interaction limits.
Agent ID: "${agent_id}" Counterparty: "${counterparty_id}" Wallet: "${wallet_address || 'unknown'}" Level: "${verification_level || 'standard'}" Context: ${JSON.stringify(context || {})}
Return JSON: { "agent_id": "string", "counterparty_id": "string", "verified": true, "trust_score": 0.85, "trust_level": "high|medium|low|untrusted", "verification_level": "basic|standard|enhanced|kyc", "identity_signals": [{"signal":"string","value":"string","weight":0.8}], "risk_factors": ["string"], "recommended_limit_usdc": 500, "interaction_history": {"total_transactions":0,"successful":0,"disputed":0}, "verification_notes": ["string"], "confidence_per_section": {"identity":0.9,"trust_score":0.85}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/aml-check', async (req: Request, res: Response) => {
  const { agent_id, wallet_address, amount_usdc, transaction_pattern, jurisdiction } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!wallet_address) return res.status(400).json({ error: 'wallet_address is required' });
  if (!amount_usdc) return res.status(400).json({ error: 'amount_usdc is required' });
  try {
    const raw = await callClaude(`Perform anti-money laundering check. Analyze transaction patterns, velocity, structuring signals and jurisdiction risk.
Agent ID: "${agent_id}" Wallet: "${wallet_address}" Amount USDC: ${amount_usdc} Pattern: ${JSON.stringify(transaction_pattern || {})} Jurisdiction: "${jurisdiction || 'global'}"
Return JSON: { "agent_id": "string", "wallet_address": "string", "amount_usdc": 0.0, "aml_risk_score": 0.2, "aml_risk_level": "low|medium|high|critical", "decision": "clear|review_required|block|file_sar", "risk_signals": [{"signal":"string","severity":"low|medium|high","description":"string"}], "structuring_detected": false, "velocity_flag": false, "threshold_breach": false, "threshold_amount_usdc": 10000, "sar_required": false, "ctr_required": false, "jurisdiction_risk": "low|medium|high", "recommended_action": "proceed|enhanced_due_diligence|block|file_report", "confidence_per_section": {"pattern_analysis":0.9,"threshold_check":0.95}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/transaction-risk', async (req: Request, res: Response) => {
  const { agent_id, from_wallet, to_wallet, amount_usdc, purpose, metadata } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!from_wallet) return res.status(400).json({ error: 'from_wallet is required' });
  if (!to_wallet) return res.status(400).json({ error: 'to_wallet is required' });
  if (!amount_usdc) return res.status(400).json({ error: 'amount_usdc is required' });
  try {
    const raw = await callClaude(`Standalone transaction risk assessment. Score risk across counterparty, amount, pattern, jurisdiction and timing dimensions.
Agent ID: "${agent_id}" From: "${from_wallet}" To: "${to_wallet}" Amount USDC: ${amount_usdc} Purpose: "${purpose || 'unspecified'}" Metadata: ${JSON.stringify(metadata || {})}
Return JSON: { "agent_id": "string", "transaction_id": "string", "composite_risk_score": 0.25, "risk_level": "low|medium|high|critical", "risk_factors": {"counterparty_risk":0.2,"amount_risk":0.1,"pattern_risk":0.15,"jurisdiction_risk":0.1,"timing_risk":0.05}, "blocking_factors": ["string"], "warning_factors": ["string"], "proceed": true, "recommended_action": "proceed|add_controls|require_approval|block", "suggested_controls": ["string"], "risk_expiry_ms": 300000, "confidence_per_section": {"counterparty":0.9,"pattern":0.85}, "recommended_actions_priority_order": ["string"], "privacy": {"data_stored":false,"retention":"none"} }`);
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
