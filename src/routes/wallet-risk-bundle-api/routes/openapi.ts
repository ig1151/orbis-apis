import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const TIER_ENUM = ['trusted', 'neutral', 'caution', 'high_risk'];
const VERDICT_ENUM = ['allow', 'review', 'block'];
const strArr = { type: 'array', items: { type: 'string' } };

const AssessRequest = {
  type: 'object', additionalProperties: false,
  description: 'Supply one or more scored wallet-signal blocks. Omitted blocks are returned under missing_sources with a chain_to pointer.',
  properties: {
    address: { type: 'string', description: 'Wallet address (echoed for labeling; not validated against the chain).' },
    address_risk: {
      type: 'object', additionalProperties: false,
      properties: { score: { type: 'number', minimum: 0, maximum: 100, description: 'AML/sanctions risk, higher = riskier.' }, sanctioned: { type: 'boolean', description: 'Hard-block if true.' } },
    },
    exposure: {
      type: 'object', additionalProperties: false,
      properties: { mixer_exposure_pct: { type: 'number', minimum: 0, maximum: 100 }, flagged_counterparty_pct: { type: 'number', minimum: 0, maximum: 100 } },
    },
    approvals: {
      type: 'object', additionalProperties: false,
      description: 'Either a precomputed exposure_score (e.g. from token-approval-risk-scanner) or raw counts.',
      properties: { exposure_score: { type: 'number', minimum: 0, maximum: 100 }, unlimited_count: { type: 'integer', minimum: 0 }, flagged_spender_count: { type: 'integer', minimum: 0 }, total_count: { type: 'integer', minimum: 0 } },
    },
    reputation: {
      type: 'object', additionalProperties: false,
      properties: { score: { type: 'number', minimum: 0, maximum: 100, description: 'Reputation, higher = BETTER (inverted internally to risk).' } },
    },
    balance: {
      type: 'object', additionalProperties: false,
      description: 'Context only — not scored into the composite.',
      properties: { net_worth_usd: { type: 'number', minimum: 0 }, token_count: { type: 'integer', minimum: 0 } },
    },
  },
};

const SourceContribution = {
  type: 'object', additionalProperties: false, required: ['source', 'risk', 'weight', 'weighted', 'note'],
  properties: { source: { type: 'string' }, risk: { type: 'number', minimum: 0, maximum: 100 }, weight: { type: 'number', minimum: 0, maximum: 1 }, weighted: { type: 'number' }, note: { type: 'string' } },
};
const MissingSource = {
  type: 'object', additionalProperties: false, required: ['source', 'chain_to', 'reason'],
  properties: { source: { type: 'string' }, chain_to: { type: 'string' }, reason: { type: 'string' } },
};
const BalanceContext = {
  type: ['object', 'null'], additionalProperties: false,
  properties: { net_worth_usd: { type: ['number', 'null'] }, token_count: { type: ['integer', 'null'] } },
};

const BundleCore = {
  type: 'object',
  required: ['address', 'composite_risk_score', 'trust_tier', 'verdict', 'hard_block', 'sources_used', 'source_contributions', 'confidence_per_source', 'next_best_api_call', 'missing_sources', 'balance_context', 'risk_disclaimer'],
  properties: {
    address: { type: ['string', 'null'] },
    composite_risk_score: { type: 'number', minimum: 0, maximum: 100 },
    trust_tier: { type: 'string', enum: TIER_ENUM }, verdict: { type: 'string', enum: VERDICT_ENUM }, hard_block: { type: 'boolean' },
    sources_used: strArr,
    source_contributions: { type: 'array', items: { $ref: '#/components/schemas/SourceContribution' } },
    confidence_per_source: { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 1 }, description: 'Per-source confidence in the supplied signal (1 = exact at the fusion level).' },
    next_best_api_call: { type: 'string', description: 'Slug of the single highest-priority missing signal to fetch next; empty when all signals are present.' },
    missing_sources: { type: 'array', items: { $ref: '#/components/schemas/MissingSource' } },
    balance_context: { $ref: '#/components/schemas/BalanceContext' },
    risk_disclaimer: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('fusion', 'interpretation'), _Tail: Tail,
  AssessRequest, SourceContribution, MissingSource, BalanceContext, BundleCore, DiscoveryResponse: discoverySchema(),
  AssessResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BundleCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BundleCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = {
  address: '0xabc...def',
  address_risk: { score: 65, sanctioned: false },
  exposure: { mixer_exposure_pct: 5, flagged_counterparty_pct: 10 },
  approvals: { exposure_score: 60 },
  reputation: { score: 40 },
  balance: { net_worth_usd: 12500, token_count: 8 },
};
const CONTRIB = [
  { source: 'address_risk', risk: 65, weight: 0.4, weighted: 26, note: 'address_risk contributed 65/100 at re-normalized weight 0.4.' },
  { source: 'exposure', risk: 10, weight: 0.3, weighted: 3, note: 'exposure contributed 10/100 at re-normalized weight 0.3.' },
  { source: 'approvals', risk: 60, weight: 0.2, weighted: 12, note: 'approvals contributed 60/100 at re-normalized weight 0.2.' },
  { source: 'reputation', risk: 60, weight: 0.1, weighted: 6, note: 'reputation contributed 60/100 at re-normalized weight 0.1.' },
];
const CORE = {
  address: '0xabc...def', composite_risk_score: 47, trust_tier: 'neutral', verdict: 'review', hard_block: false,
  sources_used: ['address_risk', 'exposure', 'approvals', 'reputation'], source_contributions: CONTRIB,
  confidence_per_source: { address_risk: 1, exposure: 1, approvals: 1, reputation: 1 }, next_best_api_call: '',
  missing_sources: [],
  balance_context: { net_worth_usd: 12500, token_count: 8 },
  risk_disclaimer: 'Composite is computed only from the signals you supply, re-weighted over the sources present — it is not on-chain analysis and not financial/compliance advice. Omitted sources are not assumed safe; they are listed under missing_sources. A wrong input changes the verdict.',
};
const ACTS = [
  'Composite wallet risk 47/100 (neutral) from 4 signal(s) → verdict: review.',
  'Review: gate the action behind human approval or a stricter threshold.',
];
const CHAIN_TO = [
  { api: 'wallet-balance', reason: 'Pull current token balances and net worth for the address.' },
  { api: 'wallet-portfolio', reason: 'Get full portfolio composition and PnL for deeper context.' },
];
const TAIL = {
  confidence_score: 0.8, confidence_per_section: { fusion: 1, interpretation: 0.6 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN_TO, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};
const env = { trace_id: 'wrb-1780000000000', request_id: 'wrb-1780000000000', computed_at: '2026-06-19T12:00:00.000Z', success: true, latency_ms: 0 };

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/assess', summary: 'Fuse supplied wallet signals into a composite verdict', operationId: 'assess', priceUsdc: 0.025,
    requestSchemaRef: 'AssessRequest', responseSchemaRef: 'AssessResponse', requestExample: REQ, responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL verdict + reasoning + prioritized actions', operationId: 'lookup', priceUsdc: 0.05, oneCall: true,
    requestSchemaRef: 'AssessRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Re-weighted 4 supplied signal(s) into composite 47/100 (neutral); verdict review.',
        key_factors: ['address_risk: 65/100 @ w=0.4 → 26.', 'exposure: 10/100 @ w=0.3 → 3.', 'approvals: 60/100 @ w=0.2 → 12.', 'reputation: 60/100 @ w=0.1 → 6.'],
        invalidators: ['The composite reflects only the signals you supplied; missing_sources are excluded, not assumed safe.', 'Source weights are opinionated; a different weighting would shift the verdict near thresholds.', 'Supplied signals are trusted as-is — a stale or wrong input propagates straight into the verdict.'],
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'wallet-risk-bundle', title: 'Wallet Risk Bundle API', version: '1.0.0',
  description: 'Deterministic wallet trust/risk fusion. Combines address risk, exposure, token approvals, reputation, and balance context into one composite risk score, trust tier, and allow/review/block verdict — re-weighted over whichever signals you supply, with chain_to pointers to fetch any missing one. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
