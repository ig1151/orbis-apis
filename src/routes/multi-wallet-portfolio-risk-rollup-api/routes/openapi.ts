import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { rollupExample, lookupExample } from './examples';

const BAND_ENUM = ['low', 'medium', 'high', 'severe'];
const WALLET_BAND_ENUM = ['low', 'medium', 'high', 'severe', 'unscored'];
const VERDICT_ENUM = ['allow', 'review', 'block'];
const RISK_SOURCE_ENUM = ['sanctioned', 'flagged', 'supplied', 'derived', 'unscored'];
const strArr = { type: 'array', items: { type: 'string' } };

const WalletInput = {
  type: 'object', additionalProperties: false,
  description: 'One wallet. Provide a USD value and a risk signal (risk_score, or approval_exposure_score/reputation_score to derive it). Without any signal the wallet is counted in value but excluded from weighted risk.',
  properties: {
    label: { type: 'string', description: 'Human label (falls back to address).' },
    name: { type: 'string', description: 'Alias for label.' },
    address: { type: 'string', description: 'Wallet address (echoed; not validated against the chain).' },
    value_usd: { type: 'number', minimum: 0, description: 'USD value held in this wallet.' },
    net_worth_usd: { type: 'number', minimum: 0, description: 'Alias for value_usd.' },
    risk_score: { type: 'number', minimum: 0, maximum: 100, description: 'Explicit wallet risk, higher = riskier.' },
    approval_exposure_score: { type: 'number', minimum: 0, maximum: 100, description: 'Fallback risk signal (e.g. from token-approval-risk-scanner).' },
    reputation_score: { type: 'number', minimum: 0, maximum: 100, description: 'Fallback signal, higher = BETTER (inverted to risk).' },
    flagged: { type: 'boolean', description: 'Flagged/blocklisted — forces risk to at least 90.' },
    blocklisted: { type: 'boolean', description: 'Alias for flagged.' },
    sanctioned: { type: 'boolean', description: 'Sanctioned — forces risk to 100 and hard-blocks the verdict.' },
  },
};

const RollupRequest = {
  type: 'object', additionalProperties: false, required: ['wallets'],
  properties: {
    wallets: { type: 'array', minItems: 1, maxItems: 1000, items: { $ref: '#/components/schemas/WalletInput' } },
  },
};

const WalletRow = {
  type: 'object', additionalProperties: false,
  required: ['label', 'address', 'value_usd', 'value_share_pct', 'risk_score', 'risk_band', 'risk_source', 'flagged', 'sanctioned', 'risk_adjusted_value_usd', 'reasons'],
  properties: {
    label: { type: 'string' }, address: { type: ['string', 'null'] },
    value_usd: { type: 'number' }, value_share_pct: { type: 'number', minimum: 0, maximum: 100 },
    risk_score: { type: ['number', 'null'], minimum: 0, maximum: 100 },
    risk_band: { type: 'string', enum: WALLET_BAND_ENUM },
    risk_source: { type: 'string', enum: RISK_SOURCE_ENUM },
    flagged: { type: 'boolean' }, sanctioned: { type: 'boolean' },
    risk_adjusted_value_usd: { type: 'number' },
    reasons: strArr,
  },
};
const Concentration = {
  type: 'object', additionalProperties: false, required: ['hhi', 'band', 'top_wallet_share_pct', 'top3_share_pct'],
  properties: { hhi: { type: 'number', minimum: 0, maximum: 1 }, band: { type: 'string', enum: ['low', 'moderate', 'high'] }, top_wallet_share_pct: { type: 'number', minimum: 0, maximum: 100 }, top3_share_pct: { type: 'number', minimum: 0, maximum: 100 } },
};
const CountByBand = {
  type: 'object', additionalProperties: false, required: ['low', 'medium', 'high', 'severe', 'unscored'],
  properties: { low: { type: 'integer', minimum: 0 }, medium: { type: 'integer', minimum: 0 }, high: { type: 'integer', minimum: 0 }, severe: { type: 'integer', minimum: 0 }, unscored: { type: 'integer', minimum: 0 } },
};

const RollupCore = {
  type: 'object',
  required: ['total_value_usd', 'wallet_count', 'scored_wallet_count', 'unscored_wallet_count', 'value_weighted_risk_score', 'equal_weighted_risk_score', 'portfolio_risk_band', 'verdict', 'hard_block', 'value_at_risk_usd', 'risk_adjusted_value_usd', 'concentration', 'count_by_band', 'worst_wallet', 'wallets', 'highest_risk_wallets', 'risk_disclaimer'],
  properties: {
    total_value_usd: { type: 'number' },
    wallet_count: { type: 'integer', minimum: 0 }, scored_wallet_count: { type: 'integer', minimum: 0 }, unscored_wallet_count: { type: 'integer', minimum: 0 },
    value_weighted_risk_score: { type: 'number', minimum: 0, maximum: 100 }, equal_weighted_risk_score: { type: 'number', minimum: 0, maximum: 100 },
    portfolio_risk_band: { type: 'string', enum: BAND_ENUM }, verdict: { type: 'string', enum: VERDICT_ENUM }, hard_block: { type: 'boolean' },
    value_at_risk_usd: { type: 'number' }, risk_adjusted_value_usd: { type: 'number' },
    concentration: { $ref: '#/components/schemas/Concentration' },
    count_by_band: { $ref: '#/components/schemas/CountByBand' },
    worst_wallet: { oneOf: [{ $ref: '#/components/schemas/WalletRow' }, { type: 'null' }] },
    wallets: { type: 'array', items: { $ref: '#/components/schemas/WalletRow' } },
    highest_risk_wallets: { type: 'array', items: { $ref: '#/components/schemas/WalletRow' } },
    risk_disclaimer: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('aggregation', 'interpretation'), _Tail: Tail,
  WalletInput, RollupRequest, WalletRow, Concentration, CountByBand, RollupCore, DiscoveryResponse: discoverySchema(),
  RollupResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RollupCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RollupCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = {
  wallets: [
    { label: 'Treasury', address: '0xtre', value_usd: 250000, risk_score: 15 },
    { label: 'Hot Wallet', address: '0xhot', value_usd: 40000, approval_exposure_score: 65 },
    { label: 'Degen Wallet', address: '0xdeg', value_usd: 12000, risk_score: 80 },
    { label: 'Flagged Wallet', address: '0xflg', value_usd: 5000, flagged: true },
    { label: 'Cold Storage', address: '0xcld', value_usd: 100000 },
  ],
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/rollup', summary: 'Aggregate wallets into a portfolio risk view', operationId: 'rollup', priceUsdc: 0.025,
    requestSchemaRef: 'RollupRequest', responseSchemaRef: 'RollupResponse', requestExample: REQ, responseExample: rollupExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL rollup + reasoning + prioritized actions', operationId: 'lookup', priceUsdc: 0.04, oneCall: true,
    requestSchemaRef: 'RollupRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ, responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'multi-wallet-portfolio-risk-rollup', title: 'Multi-Wallet Portfolio Risk Rollup API', version: '1.0.0',
  description: 'Deterministic multi-wallet portfolio risk rollup. From a caller-supplied set of wallets (USD value + risk signals) it computes value-weighted composite risk, value concentration (HHI), value-at-risk in high-risk wallets, per-band counts, the worst wallet, and an allow/review/block verdict. Rolls up the wallets you supply — no chain fetch. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
