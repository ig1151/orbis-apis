import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const GRADE_ENUM = ['A', 'B', 'C', 'D', 'F'];
const LEVEL_ENUM = ['not_ready', 'high_risk', 'developing', 'strong'];
const strArr = { type: 'array', items: { type: 'string' } };

const ChecklistRow = {
  type: 'object', required: ['item', 'weight', 'critical', 'present', 'note'], additionalProperties: false,
  properties: { item: { type: 'string' }, weight: { type: 'number' }, critical: { type: 'boolean' }, present: { type: 'boolean' }, note: { type: 'string' } },
};
const ChecklistCore = {
  type: 'object',
  required: ['readiness_score', 'grade', 'readiness_level', 'do_not_deploy', 'checklist', 'missing_critical', 'red_flags_triggered', 'items_passed', 'items_total', 'security_disclaimer'],
  properties: {
    readiness_score: { type: 'number', minimum: 0, maximum: 100 }, grade: { type: 'string', enum: GRADE_ENUM },
    readiness_level: { type: 'string', enum: LEVEL_ENUM }, do_not_deploy: { type: 'boolean' },
    checklist: { type: 'array', items: { $ref: '#/components/schemas/ChecklistRow' } },
    missing_critical: strArr, red_flags_triggered: strArr, items_passed: { type: 'integer' }, items_total: { type: 'integer' }, security_disclaimer: { type: 'string' },
  },
};
const BOOL = { type: 'boolean' };
const AssessRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    external_audit: BOOL, verified_source: BOOL, access_control: BOOL, reentrancy_protection: BOOL, timelock_on_upgrades: BOOL,
    multisig_admin: BOOL, adequate_test_coverage: BOOL, pause_mechanism: BOOL, bug_bounty: BOOL, no_known_vulns: BOOL,
    test_coverage_pct: { type: 'number', minimum: 0, maximum: 100, description: 'If given and ≥80, sets adequate_test_coverage.' },
    owner_can_drain_funds: BOOL, upgradeable_without_timelock: BOOL, unresolved_critical_findings: BOOL,
  },
  description: 'Declare which security practices the contract follows; omitted flags are treated as false. The three *_can_drain / upgradeable_without_timelock / unresolved_critical_findings flags are red flags that force do_not_deploy.',
};

const N = (item: string, weight: number, critical: boolean, present: boolean, note: string) => ({ item, weight, critical, present, note });
const CHECKLIST = [
  N('external_audit', 25, true, true, 'Independently audited by a reputable firm.'),
  N('verified_source', 10, false, true, 'Source code verified on the block explorer.'),
  N('access_control', 10, true, true, 'Privileged functions are gated by access control.'),
  N('reentrancy_protection', 10, false, true, 'Reentrancy guarded (nonReentrant / checks-effects-interactions).'),
  N('timelock_on_upgrades', 10, false, false, 'No timelock — admin changes can take effect with no warning window.'),
  N('multisig_admin', 10, false, true, 'Admin/owner is a multisig, not a single EOA.'),
  N('adequate_test_coverage', 10, false, true, 'Adequate automated test coverage of critical paths.'),
  N('pause_mechanism', 5, false, false, 'No emergency pause to contain an active incident.'),
  N('bug_bounty', 5, false, false, 'No bug-bounty incentive for responsible disclosure.'),
  N('no_known_vulns', 5, false, false, 'Known vulnerabilities are unresolved or undeclared.'),
];
const DISC = 'Audit-readiness self-assessment from declared facts — NOT a security audit, formal verification, or guarantee. A high score does not mean a contract is safe; commission an independent audit before mainnet deployment.';
const CORE = { readiness_score: 75, grade: 'B', readiness_level: 'strong', do_not_deploy: false, checklist: CHECKLIST, missing_critical: [], red_flags_triggered: [], items_passed: 6, items_total: 10, security_disclaimer: DISC };
const ACTS = ['Audit-readiness 75/100 (grade B, strong); 6/10 practices in place.', 'Address the unchecked items above and commission an independent audit before mainnet.'];
const TAIL = {
  confidence_score: 0.7, confidence_per_section: { scoring: 1, security_interpretation: 0.5 }, recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'web3-wallet-risk-scorer', reason: 'Score the deploying/admin wallet’s risk profile from its declared features.' },
    { api: 'layer2-comparison', reason: 'Pick a settlement/L2 target appropriate for the contract’s risk and cost profile.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('scoring', 'security_interpretation'), _Tail: Tail, ChecklistRow, ChecklistCore, AssessRequest,
  DiscoveryResponse: discoverySchema(),
  AssessResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ChecklistCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ChecklistCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = { external_audit: true, verified_source: true, access_control: true, reentrancy_protection: true, multisig_admin: true, adequate_test_coverage: true };
const env = { trace_id: 'w3s-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/assess', summary: 'Score audit-readiness from declared facts', operationId: 'assess', priceUsdc: 0.006,
    requestSchemaRef: 'AssessRequest', responseSchemaRef: 'AssessResponse', requestExample: REQ,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL readiness + reasoning + remediation guidance', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'AssessRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ,
    responseExample: {
      ...env, ...CORE,
      reasoning: { why_result_generated: 'Summed 6/10 declared practices → 75/100 (grade B).', key_factors: ['Score 75/100.', 'No critical items missing.', 'No red flags.'], invalidators: ['Score reflects only the practices you declared — a wrong/omitted answer changes it.', 'This is a checklist, not an audit: a perfect score does not prove the code is safe.', 'New vulnerability classes or business-logic bugs are not captured by these items.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web3-security-checklist', title: 'Web3 Security Checklist API', version: '1.0.0',
  description: 'Deterministic, defensive smart-contract audit-readiness checklist. Declare which security practices the contract follows; returns a 0–100 readiness score, a grade, per-item pass/fail, missing critical items, and red-flag warnings. A self-assessment rubric, not an audit. No bytecode analysis, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
