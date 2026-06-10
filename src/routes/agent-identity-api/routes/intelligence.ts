import { Router, Request, Response } from 'express';
import axios from 'axios';
import { callClaude } from '../../../shared/ai';

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

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Agent Identity & Trust API', info: '/agent-identity/info', openapi: '/agent-identity/openapi.json', health: 'ok' });
});

router.post('/create-identity', async (req: Request, res: Response) => {
  const { agent_name, agent_type, owner_id, capabilities = [], permissions = [], trust_level } = req.body;
  if (!agent_name) return res.status(400).json({ error: 'agent_name is required' });
  if (!agent_type) return res.status(400).json({ error: 'agent_type is required' });
  if (!owner_id) return res.status(400).json({ error: 'owner_id is required' });
  try {
    const raw = await callClaude(`Generate a verifiable agent identity with credentials, capability attestations, and trust configuration. Define permission boundaries and signing keys.
Agent name: "${agent_name}" Agent type: "${agent_type}" Owner ID: "${owner_id}" Capabilities: ${JSON.stringify(capabilities)} Permissions: ${JSON.stringify(permissions)} Trust level: "${trust_level || 'standard'}"

Return concise JSON:
{
  "agent_id": "string (uuid-style like agt_xxxxxxxx)",
  "agent_name": "string",
  "agent_type": "string",
  "owner_id": "string",
  "did": "string (decentralized identifier, format: did:orbis:agent:xxxxxxxx)",
  "public_key": "string (simulated PEM-style public key fragment)",
  "trust_level": "sandboxed|restricted|standard|elevated",
  "capabilities_attested": ["string"],
  "permissions_granted": ["string"],
  "permissions_denied": ["string"],
  "identity_hash": "string (sha256-style hex)",
  "created_at": "string (ISO 8601)",
  "expires_at": "string (ISO 8601, 1 year from now)",
  "verification_endpoint": "string (URL)",
  "confidence_per_section": { "identity": 0-1, "capabilities": 0-1, "permissions": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/verify-agent', async (req: Request, res: Response) => {
  const { agent_id, verification_token, check_permissions = [], verify_capabilities = [], context } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!verification_token) return res.status(400).json({ error: 'verification_token is required' });
  try {
    const raw = await callClaude(`Verify this agent's identity and authority. Validate token, check permission scope, assess trust level, and determine if the agent is authorized for the requested context.
Agent ID: "${agent_id}" Verification token: "${verification_token}" Check permissions: ${JSON.stringify(check_permissions)} Verify capabilities: ${JSON.stringify(verify_capabilities)} Context: "${context || 'general'}"

Return concise JSON:
{
  "agent_id": "string",
  "verified": true|false,
  "trust_level": "sandboxed|restricted|standard|elevated",
  "identity_valid": true|false,
  "token_valid": true|false,
  "permissions_verified": [{ "permission": "string", "granted": true|false }],
  "capabilities_verified": [{ "capability": "string", "attested": true|false }],
  "risk_signals": ["string"],
  "verification_timestamp": "string (ISO 8601)",
  "next_verification_due": "string (ISO 8601)",
  "recommended_action": "allow|allow_with_monitoring|restrict|deny",
  "confidence_per_section": { "identity": 0-1, "permissions": 0-1, "risk": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sign-action', async (req: Request, res: Response) => {
  const { agent_id, action, action_payload, signatories = [], multisig_threshold, expiry_minutes } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!action) return res.status(400).json({ error: 'action is required' });
  if (!action_payload) return res.status(400).json({ error: 'action_payload is required' });
  try {
    const raw = await callClaude(`Generate a cryptographic action signature for this agent operation. Create audit-ready signed payload, handle multi-sig requirements, and set expiry.
Agent ID: "${agent_id}" Action: "${action}" Action payload: ${JSON.stringify(action_payload)} Signatories: ${JSON.stringify(signatories)} Multisig threshold: ${multisig_threshold || 1} Expiry minutes: ${expiry_minutes || 60}

Return concise JSON:
{
  "agent_id": "string",
  "action": "string",
  "signature_id": "string (sig_xxxxxxxx)",
  "signature": "string (simulated sha256 hex hash)",
  "payload_hash": "string (simulated sha256 hex hash)",
  "signed_at": "string (ISO 8601)",
  "expires_at": "string (ISO 8601)",
  "signatories_required": number,
  "signatories_signed": [{ "agent_id": "string", "signed_at": "string", "signature": "string" }],
  "multisig_complete": true|false,
  "audit_entry": { "action": "string", "actor": "string", "timestamp": "string", "hash": "string", "chain_id": "string" },
  "confidence_per_section": { "signature": 0-1, "multisig": 0-1, "audit": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/permission-scope', async (req: Request, res: Response) => {
  const { agent_id, action, permission, resource, granted_by, expiry_hours } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!action) return res.status(400).json({ error: 'action is required' });
  try {
    const raw = await callClaude(`Manage agent permission scopes. Check if permission is granted, validate scope boundaries, grant or revoke with audit trail, and detect scope creep.
Agent ID: "${agent_id}" Action: "${action}" Permission: "${permission || 'all'}" Resource: "${resource || 'all'}" Granted by: "${granted_by || 'system'}" Expiry hours: ${expiry_hours || 'null'}

Return concise JSON:
{
  "agent_id": "string",
  "action": "string",
  "permission": "string or null",
  "granted": true|false,
  "scope": {
    "resource": "string",
    "actions_allowed": ["string"],
    "conditions": ["string"],
    "expires_at": "string or null"
  },
  "all_permissions": [{ "permission": "string", "resource": "string", "granted_at": "string", "granted_by": "string", "expires_at": "string or null" }],
  "scope_violations": ["string"],
  "least_privilege_gaps": ["string"],
  "audit_entry": { "action": "string", "actor": "string", "timestamp": "string", "hash": "string", "chain_id": "string" },
  "confidence_per_section": { "scope": 0-1, "violations": 0-1, "audit": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/audit-log', async (req: Request, res: Response) => {
  const { agent_id, event_type, event_details, session_id, target_resource, outcome } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!event_type) return res.status(400).json({ error: 'event_type is required' });
  if (!event_details) return res.status(400).json({ error: 'event_details is required' });
  try {
    const raw = await callClaude(`Create a tamper-evident audit log entry for this agent event. Enrich with context, compute integrity hash, and assess compliance implications.
Agent ID: "${agent_id}" Event type: "${event_type}" Event details: ${JSON.stringify(event_details)} Session ID: "${session_id || 'none'}" Target resource: "${target_resource || 'none'}" Outcome: "${outcome || 'success'}"

Return concise JSON:
{
  "log_id": "string (log_xxxxxxxx)",
  "agent_id": "string",
  "event_type": "string",
  "timestamp": "string (ISO 8601)",
  "session_id": "string or null",
  "event_details": { "description": "string", "metadata": {} },
  "outcome": "success|failure|blocked",
  "integrity_hash": "string (sha256-style hex)",
  "previous_log_hash": "string (sha256-style hex)",
  "compliance_tags": ["string"],
  "risk_level": "high|medium|low|info",
  "retention_policy": "string",
  "exportable": true|false,
  "confidence_per_section": { "integrity": 0-1, "compliance": 0-1, "risk": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/trust-score', async (req: Request, res: Response) => {
  const { agent_id, behavior_history, evaluation_window, context, peer_agents = [] } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!behavior_history) return res.status(400).json({ error: 'behavior_history is required' });
  try {
    const raw = await callClaude(`Compute a dynamic trust score for this agent based on behavioral history. Analyze patterns, detect anomalies, score reliability, and recommend trust level adjustment.
Agent ID: "${agent_id}" Evaluation window: "${evaluation_window || '30d'}" Context: "${context || 'general'}" Peer agents: ${JSON.stringify(peer_agents)} Behavior history: ${JSON.stringify(behavior_history.slice(0, 50))}

Return concise JSON:
{
  "agent_id": "string",
  "trust_score": 0-100,
  "trust_level": "sandboxed|restricted|standard|elevated|trusted",
  "score_components": {
    "reliability": 0-100,
    "safety": 0-100,
    "consistency": 0-100,
    "compliance": 0-100
  },
  "behavioral_patterns": [{ "pattern": "string", "frequency": "high|medium|low", "desirable": true|false }],
  "anomalies": [{ "event": "string", "deviation": "string", "severity": "high|medium|low" }],
  "trend": "improving|stable|declining",
  "recommended_level_change": "string or null",
  "confidence_per_section": { "trust_score": 0-1, "patterns": 0-1, "anomalies": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/human-approval', async (req: Request, res: Response) => {
  const { agent_id, action_requested, action_impact, context, deadline, approver_ids = [], alternatives = [] } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!action_requested) return res.status(400).json({ error: 'action_requested is required' });
  if (!action_impact) return res.status(400).json({ error: 'action_impact is required' });
  if (!context) return res.status(400).json({ error: 'context is required' });
  try {
    const raw = await callClaude(`Generate a human approval request for this high-impact agent action. Summarize the request clearly, assess risk, and provide decision-making context.
Agent ID: "${agent_id}" Action requested: "${action_requested}" Action impact: "${action_impact}" Context: "${context}" Deadline: "${deadline || 'none'}" Approver IDs: ${JSON.stringify(approver_ids)} Alternatives: ${JSON.stringify(alternatives)}

Return concise JSON:
{
  "approval_request_id": "string (apr_xxxxxxxx)",
  "agent_id": "string",
  "action_requested": "string",
  "action_impact": "high|medium|low",
  "risk_assessment": "string",
  "risk_score": 0-1,
  "decision_summary": "string (clear one-paragraph summary for human)",
  "options": [{ "option": "string", "consequence": "string", "recommended": true|false }],
  "deadline": "string or null",
  "approver_ids": ["string"],
  "escalation_path": ["string"],
  "auto_deny_after": "string",
  "context_links": ["string"],
  "confidence_per_section": { "risk": 0-1, "options": 0-1, "summary": 0-1 },
  "recommended_actions_priority_order": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/execution-gate', async (req: Request, res: Response) => {
  const { agent_id, intended_action, action_context, trust_threshold, require_signature, require_human_approval } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
  if (!intended_action) return res.status(400).json({ error: 'intended_action is required' });
  if (!action_context) return res.status(400).json({ error: 'action_context is required' });
  try {
    const raw = await callClaude(`Gate agent action execution based on identity, trust score, and permission scope. Final safety check before high-stakes autonomous action.
Agent ID: "${agent_id}" Intended action: "${intended_action}" Trust threshold: ${trust_threshold || 0.7} Require signature: ${require_signature || false} Require human approval: ${require_human_approval || false} Action context: ${JSON.stringify(action_context)}

Return concise JSON:
{
  "execute": true|false,
  "confidence": 0-1,
  "agent_verified": true|false,
  "trust_sufficient": true|false,
  "permissions_sufficient": true|false,
  "risk_score": 0-1,
  "blocking_flags": ["string"],
  "warnings": ["string"],
  "signature_required": true|false,
  "human_approval_required": true|false,
  "recommended_action": "proceed|sign_first|get_approval|deny",
  "chain_to": ["string"],
  "privacy": { "data_stored": false, "retention": "none" }
}`);
    res.json(parseJSON(raw));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
