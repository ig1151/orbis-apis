import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const BAND_ENUM = ['low', 'medium', 'high', 'severe'];
const strArr = { type: 'array', items: { type: 'string' } };
const FactorRow = { type: 'object', required: ['factor', 'points', 'note'], additionalProperties: false, properties: { factor: { type: 'string' }, points: { type: 'number' }, note: { type: 'string' } } };
const WalletRiskCore = {
  type: 'object', required: ['risk_score', 'risk_band', 'factors', 'risk_factors', 'mitigants', 'risk_disclaimer'],
  properties: {
    risk_score: { type: 'number', minimum: 0, maximum: 100 }, risk_band: { type: 'string', enum: BAND_ENUM },
    factors: { type: 'array', items: { $ref: '#/components/schemas/FactorRow' } }, risk_factors: strArr, mitigants: strArr, risk_disclaimer: { type: 'string' },
  },
};
const BOOL = { type: 'boolean' };
const ScoreRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    age_days: { type: 'number', minimum: 0 }, tx_count: { type: 'number', minimum: 0 }, unique_counterparties: { type: 'number', minimum: 0 },
    token_approvals_count: { type: 'number', minimum: 0 }, unlimited_approvals_count: { type: 'number', minimum: 0 },
    failed_tx_ratio: { type: 'number', minimum: 0, maximum: 1 }, interacted_with_flagged: BOOL, funded_by_mixer: BOOL,
  },
  description: 'Caller-supplied wallet features; provide at least one. Omitted features are not scored (not assumed risky).',
};

const DISC = 'Heuristic risk score over the wallet features you supplied — not on-chain analysis, not financial/compliance advice, and not a verdict on any real address. Inputs are trusted as given; a wrong input changes the score.';
const FACTORS = [
  { factor: 'unlimited_approvals', points: 12, note: '2 unlimited token approval(s) — broad drain exposure if any spender is malicious.' },
  { factor: 'high_failed_tx_ratio', points: 12, note: 'High failed-transaction ratio (0.4) — bot/probing or careless signing pattern.' },
  { factor: 'new_wallet', points: 15, note: 'Young wallet (5d old) — limited history to judge.' },
  { factor: 'low_activity', points: 10, note: 'Very low activity (3 tx) — possible burner/fresh wallet.' },
];
const CORE = { risk_score: 49, risk_band: 'medium', factors: FACTORS, risk_factors: ['unlimited_approvals', 'high_failed_tx_ratio', 'new_wallet', 'low_activity'], mitigants: [], risk_disclaimer: DISC };
const ACTS = ['Wallet risk 49/100 (medium) from 4 risk factor(s) and 0 mitigant(s).', 'Revoke stale/unlimited token approvals to shrink the drain surface.'];
const TAIL = {
  confidence_score: 0.75, confidence_per_section: { scoring: 1, interpretation: 0.6 }, recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'wallet-address-risk', reason: 'Cross-check the address against on-chain/label data sources for a live signal.' },
    { api: 'web3-security-checklist', reason: 'If this wallet deploys contracts, assess their audit-readiness too.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('scoring', 'interpretation'), _Tail: Tail, FactorRow, WalletRiskCore, ScoreRequest,
  DiscoveryResponse: discoverySchema(),
  ScoreResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/WalletRiskCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/WalletRiskCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = { age_days: 5, tx_count: 3, unlimited_approvals_count: 2, failed_tx_ratio: 0.4 };
const env = { trace_id: 'wrs-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/score', summary: 'Score wallet risk from declared features', operationId: 'score', priceUsdc: 0.006,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'ScoreResponse', requestExample: REQ,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL risk score + reasoning + guidance', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ,
    responseExample: {
      ...env, ...CORE,
      reasoning: { why_result_generated: 'Summed 4 factor contribution(s) → 49/100 (medium).', key_factors: ['unlimited_approvals: +12.', 'high_failed_tx_ratio: +12.', 'new_wallet: +15.', 'low_activity: +10.'], invalidators: ['The score reflects only the features you supplied — it does not verify them against the chain.', 'Heuristic weights are opinionated; a different rubric would score the same wallet differently.', 'Absence of a flag is treated as benign, which a real investigation might not assume.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web3-wallet-risk-scorer', title: 'Web3 Wallet Risk Scorer API', version: '1.0.0',
  description: 'Deterministic wallet-risk rubric over caller-supplied features (age, tx count, approvals, counterparties, mixer/flagged signals). Returns a 0–100 risk score, a band, and per-factor contributions. Scores the facts you pass in — no chain fetch — so it is advisory, not a verdict on a real address. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
