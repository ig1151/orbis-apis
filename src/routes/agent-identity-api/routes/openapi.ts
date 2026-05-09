import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Agent Identity & Trust API',
      version: '1.0.0',
      description: 'AI-powered agent identity and trust management — create verifiable agent identities, verify agents, sign actions, manage permission scopes, audit events, compute trust scores, request human approvals, and gate autonomous execution',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/agent-identity' }],
    paths: {
      '/create-identity': {
        post: {
          operationId: 'createIdentity',
          summary: 'Create a verifiable agent identity with DID, public key, capability attestations and permission boundaries',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['agent_name', 'agent_type', 'owner_id'], properties: {
              agent_name: { type: 'string' },
              agent_type: { type: 'string', enum: ['autonomous', 'assistive', 'workflow', 'evaluator'] },
              owner_id: { type: 'string' },
              capabilities: { type: 'array', items: { type: 'string' } },
              permissions: { type: 'array', items: { type: 'string' } },
              trust_level: { type: 'string', enum: ['sandboxed', 'restricted', 'standard', 'elevated'] },
            } } } },
          },
          responses: {
            '200': {
              description: 'Agent identity created',
              content: { 'application/json': { schema: { type: 'object', properties: {
                agent_id: { type: 'string' },
                agent_name: { type: 'string' },
                agent_type: { type: 'string', enum: ['autonomous', 'assistive', 'workflow', 'evaluator'] },
                owner_id: { type: 'string' },
                did: { type: 'string' },
                public_key: { type: 'string' },
                trust_level: { type: 'string', enum: ['sandboxed', 'restricted', 'standard', 'elevated'] },
                capabilities_attested: actions,
                permissions_granted: actions,
                permissions_denied: actions,
                identity_hash: { type: 'string' },
                created_at: { type: 'string' },
                expires_at: { type: 'string' },
                verification_endpoint: { type: 'string' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_name, agent_type, or owner_id' },
            '500': { description: 'Identity creation failed' },
          },
        },
      },
      '/verify-agent': {
        post: {
          operationId: 'verifyAgent',
          summary: 'Verify agent identity and authority — validate token, check permissions, assess trust level and recommend action',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['agent_id', 'verification_token'], properties: {
              agent_id: { type: 'string' },
              verification_token: { type: 'string' },
              check_permissions: { type: 'array', items: { type: 'string' } },
              verify_capabilities: { type: 'array', items: { type: 'string' } },
              context: { type: 'string' },
            } } } },
          },
          responses: {
            '200': {
              description: 'Agent verification result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                agent_id: { type: 'string' },
                verified: { type: 'boolean' },
                trust_level: { type: 'string', enum: ['sandboxed', 'restricted', 'standard', 'elevated'] },
                identity_valid: { type: 'boolean' },
                token_valid: { type: 'boolean' },
                permissions_verified: { type: 'array', items: { type: 'object', properties: { permission: { type: 'string' }, granted: { type: 'boolean' } } } },
                capabilities_verified: { type: 'array', items: { type: 'object', properties: { capability: { type: 'string' }, attested: { type: 'boolean' } } } },
                risk_signals: actions,
                verification_timestamp: { type: 'string' },
                next_verification_due: { type: 'string' },
                recommended_action: { type: 'string', enum: ['allow', 'allow_with_monitoring', 'restrict', 'deny'] },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_id or verification_token' },
            '500': { description: 'Verification failed' },
          },
        },
      },
      '/sign-action': {
        post: {
          operationId: 'signAction',
          summary: 'Generate a cryptographic action signature with multi-sig support, payload hash and audit entry',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['agent_id', 'action', 'action_payload'], properties: {
              agent_id: { type: 'string' },
              action: { type: 'string' },
              action_payload: { type: 'object' },
              signatories: { type: 'array', items: { type: 'string' } },
              multisig_threshold: { type: 'number' },
              expiry_minutes: { type: 'number' },
            } } } },
          },
          responses: {
            '200': {
              description: 'Action signature result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                agent_id: { type: 'string' },
                action: { type: 'string' },
                signature_id: { type: 'string' },
                signature: { type: 'string' },
                payload_hash: { type: 'string' },
                signed_at: { type: 'string' },
                expires_at: { type: 'string' },
                signatories_required: { type: 'number' },
                signatories_signed: { type: 'array', items: { type: 'object', properties: { agent_id: { type: 'string' }, signed_at: { type: 'string' }, signature: { type: 'string' } } } },
                multisig_complete: { type: 'boolean' },
                audit_entry: { type: 'object', properties: { action: { type: 'string' }, actor: { type: 'string' }, timestamp: { type: 'string' }, hash: { type: 'string' }, chain_id: { type: 'string' } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_id, action, or action_payload' },
            '500': { description: 'Action signing failed' },
          },
        },
      },
      '/permission-scope': {
        post: {
          operationId: 'permissionScope',
          summary: 'Manage agent permission scopes — check, grant, revoke or list permissions with audit trail and scope creep detection',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['agent_id', 'action'], properties: {
              agent_id: { type: 'string' },
              action: { type: 'string', enum: ['check', 'grant', 'revoke', 'list'] },
              permission: { type: 'string' },
              resource: { type: 'string' },
              granted_by: { type: 'string' },
              expiry_hours: { type: 'number' },
            } } } },
          },
          responses: {
            '200': {
              description: 'Permission scope result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                agent_id: { type: 'string' },
                action: { type: 'string', enum: ['check', 'grant', 'revoke', 'list'] },
                permission: { type: 'string', nullable: true },
                granted: { type: 'boolean' },
                scope: { type: 'object', properties: {
                  resource: { type: 'string' },
                  actions_allowed: actions,
                  conditions: actions,
                  expires_at: { type: 'string', nullable: true },
                } },
                all_permissions: { type: 'array', items: { type: 'object', properties: {
                  permission: { type: 'string' },
                  resource: { type: 'string' },
                  granted_at: { type: 'string' },
                  granted_by: { type: 'string' },
                  expires_at: { type: 'string', nullable: true },
                } } },
                scope_violations: actions,
                least_privilege_gaps: actions,
                audit_entry: { type: 'object', properties: { action: { type: 'string' }, actor: { type: 'string' }, timestamp: { type: 'string' }, hash: { type: 'string' }, chain_id: { type: 'string' } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_id or action' },
            '500': { description: 'Permission scope operation failed' },
          },
        },
      },
      '/audit-log': {
        post: {
          operationId: 'auditLog',
          summary: 'Create a tamper-evident audit log entry with integrity hash, compliance tags and risk level',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['agent_id', 'event_type', 'event_details'], properties: {
              agent_id: { type: 'string' },
              event_type: { type: 'string', enum: ['action', 'permission_change', 'identity_update', 'violation', 'login'] },
              event_details: { type: 'object' },
              session_id: { type: 'string' },
              target_resource: { type: 'string' },
              outcome: { type: 'string', enum: ['success', 'failure', 'blocked'] },
            } } } },
          },
          responses: {
            '200': {
              description: 'Audit log entry created',
              content: { 'application/json': { schema: { type: 'object', properties: {
                log_id: { type: 'string' },
                agent_id: { type: 'string' },
                event_type: { type: 'string', enum: ['action', 'permission_change', 'identity_update', 'violation', 'login'] },
                timestamp: { type: 'string' },
                session_id: { type: 'string', nullable: true },
                event_details: { type: 'object' },
                outcome: { type: 'string', enum: ['success', 'failure', 'blocked'] },
                integrity_hash: { type: 'string' },
                previous_log_hash: { type: 'string' },
                compliance_tags: actions,
                risk_level: { type: 'string', enum: ['high', 'medium', 'low', 'info'] },
                retention_policy: { type: 'string' },
                exportable: { type: 'boolean' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_id, event_type, or event_details' },
            '500': { description: 'Audit log creation failed' },
          },
        },
      },
      '/trust-score': {
        post: {
          operationId: 'trustScore',
          summary: 'Compute dynamic trust score from behavioral history — reliability, safety, consistency, compliance and anomaly detection',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['agent_id', 'behavior_history'], properties: {
              agent_id: { type: 'string' },
              behavior_history: { type: 'array', items: { type: 'object', properties: {
                action: { type: 'string' },
                outcome: { type: 'string' },
                timestamp: { type: 'string' },
                risk_level: { type: 'string' },
              } } },
              evaluation_window: { type: 'string' },
              context: { type: 'string' },
              peer_agents: { type: 'array', items: { type: 'string' } },
            } } } },
          },
          responses: {
            '200': {
              description: 'Trust score result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                agent_id: { type: 'string' },
                trust_score: { type: 'number', minimum: 0, maximum: 100 },
                trust_level: { type: 'string', enum: ['sandboxed', 'restricted', 'standard', 'elevated', 'trusted'] },
                score_components: { type: 'object', properties: {
                  reliability: { type: 'number', minimum: 0, maximum: 100 },
                  safety: { type: 'number', minimum: 0, maximum: 100 },
                  consistency: { type: 'number', minimum: 0, maximum: 100 },
                  compliance: { type: 'number', minimum: 0, maximum: 100 },
                } },
                behavioral_patterns: { type: 'array', items: { type: 'object', properties: {
                  pattern: { type: 'string' },
                  frequency: { type: 'string', enum: ['high', 'medium', 'low'] },
                  desirable: { type: 'boolean' },
                } } },
                anomalies: { type: 'array', items: { type: 'object', properties: {
                  event: { type: 'string' },
                  deviation: { type: 'string' },
                  severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                } } },
                trend: { type: 'string', enum: ['improving', 'stable', 'declining'] },
                recommended_level_change: { type: 'string', nullable: true },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_id or behavior_history' },
            '500': { description: 'Trust score computation failed' },
          },
        },
      },
      '/human-approval': {
        post: {
          operationId: 'humanApproval',
          summary: 'Generate a human approval request for high-impact agent actions with risk assessment and decision options',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['agent_id', 'action_requested', 'action_impact', 'context'], properties: {
              agent_id: { type: 'string' },
              action_requested: { type: 'string' },
              action_impact: { type: 'string', enum: ['high', 'medium', 'low'] },
              context: { type: 'string' },
              deadline: { type: 'string' },
              approver_ids: { type: 'array', items: { type: 'string' } },
              alternatives: { type: 'array', items: { type: 'string' } },
            } } } },
          },
          responses: {
            '200': {
              description: 'Human approval request created',
              content: { 'application/json': { schema: { type: 'object', properties: {
                approval_request_id: { type: 'string' },
                agent_id: { type: 'string' },
                action_requested: { type: 'string' },
                action_impact: { type: 'string', enum: ['high', 'medium', 'low'] },
                risk_assessment: { type: 'string' },
                risk_score: { type: 'number', minimum: 0, maximum: 1 },
                decision_summary: { type: 'string' },
                options: { type: 'array', items: { type: 'object', properties: {
                  option: { type: 'string' },
                  consequence: { type: 'string' },
                  recommended: { type: 'boolean' },
                } } },
                deadline: { type: 'string', nullable: true },
                approver_ids: actions,
                escalation_path: actions,
                auto_deny_after: { type: 'string' },
                context_links: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_id, action_requested, action_impact, or context' },
            '500': { description: 'Approval request creation failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'agentExecutionGate',
          summary: 'ONE-CALL: final safety gate — verify identity, check trust and permissions before autonomous action execution',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['agent_id', 'intended_action', 'action_context'], properties: {
              agent_id: { type: 'string' },
              intended_action: { type: 'string' },
              action_context: { type: 'object' },
              trust_threshold: { type: 'number', minimum: 0, maximum: 1 },
              require_signature: { type: 'boolean' },
              require_human_approval: { type: 'boolean' },
            } } } },
          },
          responses: {
            '200': {
              description: 'Execution gate decision',
              content: { 'application/json': { schema: { type: 'object', properties: {
                execute: { type: 'boolean' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                agent_verified: { type: 'boolean' },
                trust_sufficient: { type: 'boolean' },
                permissions_sufficient: { type: 'boolean' },
                risk_score: { type: 'number', minimum: 0, maximum: 1 },
                blocking_flags: actions,
                warnings: actions,
                signature_required: { type: 'boolean' },
                human_approval_required: { type: 'boolean' },
                recommended_action: { type: 'string', enum: ['proceed', 'sign_first', 'get_approval', 'deny'] },
                chain_to: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_id, intended_action, or action_context' },
            '500': { description: 'Execution gate check failed' },
          },
        },
      },
    },
  });
});

export default router;
