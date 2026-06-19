import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const BAND_ENUM = ['low', 'medium', 'high', 'severe'];
const strArr = { type: 'array', items: { type: 'string' } };

const ApprovalInput = {
  type: 'object', additionalProperties: false,
  description: 'One ERC-20 approval (allowance). Supply at least token/spender plus an allowance or is_unlimited flag.',
  properties: {
    token: { type: 'string', description: 'Token contract address.' },
    token_symbol: { type: 'string', description: 'Human-readable token symbol (preferred for labels).' },
    spender: { type: 'string', description: 'Approved spender contract address.' },
    spender_label: { type: 'string', description: 'Human-readable spender name (preferred for labels).' },
    allowance: { type: ['string', 'number'], description: "Approved amount; the string 'unlimited'/'max' or a value >= 1e30 is treated as unlimited." },
    is_unlimited: { type: 'boolean', description: 'Explicit unlimited-allowance flag (overrides allowance parsing).' },
    spender_verified: { type: 'boolean', description: 'Whether the spender contract source is verified. Omit if unknown.' },
    spender_flagged: { type: 'boolean', description: 'Whether the spender is on a blocklist / known-malicious.' },
    last_used_days: { type: 'number', minimum: 0, description: 'Days since this approval was last used (for staleness).' },
    balance_usd: { type: 'number', minimum: 0, description: 'USD value of the wallet holding of this token. With an unlimited allowance, the full balance is the value at risk.' },
    value_at_risk_usd: { type: 'number', minimum: 0, description: 'Explicit USD exposed via this approval; overrides the balance-derived estimate.' },
  },
};

const ScanRequest = {
  type: 'object', additionalProperties: false, required: ['approvals'],
  properties: { approvals: { type: 'array', minItems: 1, maxItems: 500, items: { $ref: '#/components/schemas/ApprovalInput' } } },
};

const ApprovalRow = {
  type: 'object', additionalProperties: false,
  required: ['token', 'spender', 'is_unlimited', 'risk_score', 'risk_band', 'revoke_recommended', 'value_at_risk_usd', 'reasons'],
  properties: {
    token: { type: 'string' }, spender: { type: 'string' }, is_unlimited: { type: 'boolean' },
    risk_score: { type: 'number', minimum: 0, maximum: 100 }, risk_band: { type: 'string', enum: BAND_ENUM },
    revoke_recommended: { type: 'boolean' },
    value_at_risk_usd: { type: ['number', 'null'], minimum: 0, description: 'USD exposed via this approval, when derivable; null otherwise.' },
    reasons: strArr,
  },
};

const ScanCore = {
  type: 'object',
  required: ['total_approvals', 'unlimited_count', 'flagged_spender_count', 'stale_count', 'unverified_spender_count', 'exposure_score', 'exposure_band', 'estimated_value_at_risk_usd', 'approvals', 'revoke_priority', 'risk_disclaimer'],
  properties: {
    total_approvals: { type: 'integer', minimum: 0 }, unlimited_count: { type: 'integer', minimum: 0 },
    flagged_spender_count: { type: 'integer', minimum: 0 }, stale_count: { type: 'integer', minimum: 0 },
    unverified_spender_count: { type: 'integer', minimum: 0 },
    exposure_score: { type: 'number', minimum: 0, maximum: 100 }, exposure_band: { type: 'string', enum: BAND_ENUM },
    estimated_value_at_risk_usd: { type: ['number', 'null'], minimum: 0, description: 'Sum of derivable per-approval USD at risk; null if no token values were supplied.' },
    approvals: { type: 'array', items: { $ref: '#/components/schemas/ApprovalRow' } },
    revoke_priority: { type: 'array', items: { $ref: '#/components/schemas/ApprovalRow' } },
    risk_disclaimer: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('scoring', 'interpretation'), _Tail: Tail,
  ApprovalInput, ScanRequest, ApprovalRow, ScanCore, DiscoveryResponse: discoverySchema(),
  ScanResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScanCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScanCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = {
  approvals: [
    { token_symbol: 'USDC', spender_label: 'UnknownRouter', is_unlimited: true, spender_verified: false, last_used_days: 400, balance_usd: 4200 },
    { token_symbol: 'WETH', spender_label: 'Uniswap V3 Router', allowance: 500, spender_verified: true, last_used_days: 3 },
  ],
};
const ROWS = [
  { token: 'USDC', spender: 'UnknownRouter', is_unlimited: true, risk_score: 60, risk_band: 'high', revoke_recommended: true, value_at_risk_usd: 4200, reasons: ['Unlimited allowance — the spender can move your entire balance of this token.', 'Spender contract is unverified — source code cannot be reviewed.', 'Stale approval — unused for 400d; likely safe to revoke.'] },
  { token: 'WETH', spender: 'Uniswap V3 Router', is_unlimited: false, risk_score: 0, risk_band: 'low', revoke_recommended: false, value_at_risk_usd: null, reasons: ['Bounded, recently-used approval to a known spender — low concern.'] },
];
const CORE = {
  total_approvals: 2, unlimited_count: 1, flagged_spender_count: 0, stale_count: 1, unverified_spender_count: 1,
  exposure_score: 60, exposure_band: 'high', estimated_value_at_risk_usd: 4200, approvals: ROWS, revoke_priority: [ROWS[0]],
  risk_disclaimer: 'Heuristic risk scoring over the approvals you supplied — not on-chain analysis, not financial/compliance advice. Inputs are trusted as given; a wrong or stale input changes the result. Revoking an approval is an on-chain transaction you must execute yourself.',
};
const ACTS = [
  'Scanned 2 approval(s): exposure 60/100 (high); 1 recommended for revocation; ~$4200 at risk.',
  'Reduce 1 unlimited allowance(s) to a bounded amount, or revoke if unused.',
  'Revoke 1 stale approval(s) (unused 180d+) to shrink the attack surface.',
];
const CHAIN_TO = [
  { api: 'wallet-risk-bundle', reason: 'Fold this approval exposure into a single wallet trust verdict alongside address risk and reputation.' },
  { api: 'web3-wallet-risk-scorer', reason: 'Feed unlimited_approvals_count and total approvals into a full wallet-risk rubric.' },
  { api: 'wallet-address-risk', reason: 'Cross-check the wallet or a suspicious spender address against on-chain/label sources.' },
];
const TAIL = {
  confidence_score: 0.85, confidence_per_section: { scoring: 1, interpretation: 0.7 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN_TO, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};
const env = { trace_id: 'tar-1780000000000', request_id: 'tar-1780000000000', computed_at: '2026-06-19T12:00:00.000Z', success: true, latency_ms: 0 };

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/scan', summary: 'Score approvals and return a revoke-priority list', operationId: 'scan', priceUsdc: 0.02,
    requestSchemaRef: 'ScanRequest', responseSchemaRef: 'ScanResponse', requestExample: REQ, responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL scan + reasoning + prioritized actions', operationId: 'lookup', priceUsdc: 0.035, oneCall: true,
    requestSchemaRef: 'ScanRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Scored 2 approval(s); worst per-approval risk and breadth of risky grants set exposure to 60/100 (high).',
        key_factors: ['1 unlimited allowance(s).', '0 flagged spender(s).', '1 stale approval(s) (180d+).', '1 unverified spender(s).'],
        invalidators: ['Scores only the approvals you supplied — it does not query the chain to confirm they are still active.', 'A spender flagged after your snapshot would not be reflected; re-scan against fresh data.', 'Heuristic weights are opinionated; a different rubric would rank the same approvals differently.'],
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'token-approval-risk-scanner', title: 'Token Approval Risk Scanner API', version: '1.0.0',
  description: 'Deterministic scanner for ERC-20 token approvals (allowances). Flags unlimited allowances, flagged/unverified spenders, and stale grants, scores per-approval and portfolio drain exposure, and returns a revoke-priority list. Scores the approvals you supply — no chain fetch. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
