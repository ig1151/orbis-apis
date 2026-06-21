import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { assessExample, lookupExample } from './examples';

const BAND_ENUM = ['low', 'medium', 'high', 'severe'];
const VERDICT_ENUM = ['allow', 'review', 'block'];
const ATTESTATION_ENUM = ['none', 'attested', 'audited', 'unknown'];
const strArr = { type: 'array', items: { type: 'string' } };

const HoldingInput = {
  type: 'object', additionalProperties: false,
  description: 'One stablecoin holding. amount_usd drives the weighting; current_price vs peg_price drives depeg; collateral_type and attestation drive structural risk.',
  properties: {
    symbol: { type: 'string', description: 'Stablecoin symbol, e.g. USDC, USDT, DAI, FRAX.' },
    token: { type: 'string', description: 'Alias for symbol.' },
    issuer: { type: 'string', description: 'Issuer name (drives issuer concentration; falls back to symbol).' },
    chain: { type: 'string', description: 'Chain/network (echoed).' },
    network: { type: 'string', description: 'Alias for chain.' },
    amount_usd: { type: 'number', minimum: 0, description: 'USD value held.' },
    value_usd: { type: 'number', minimum: 0, description: 'Alias for amount_usd.' },
    peg_price: { type: 'number', minimum: 0, description: 'Target peg (default 1.0).' },
    current_price: { type: 'number', minimum: 0, description: 'Current market price (default = peg, i.e. assumed at peg).' },
    price: { type: 'number', minimum: 0, description: 'Alias for current_price.' },
    collateral_type: { type: 'string', description: 'fiat, crypto, algorithmic, commodity, unknown. Drives structural depeg risk.' },
    collateral: { type: 'string', description: 'Alias for collateral_type.' },
    attestation: { type: 'string', enum: ['none', 'attested', 'audited'], description: 'Reserve attestation level.' },
    audit: { type: 'string', description: 'Alias for attestation.' },
  },
};

const AssessRequest = {
  type: 'object', additionalProperties: false, required: ['holdings'],
  properties: {
    portfolio: { type: 'string', description: 'Portfolio/wallet label (echoed).' },
    wallet: { type: 'string', description: 'Alias for portfolio.' },
    address: { type: 'string', description: 'Alias for portfolio.' },
    holdings: { type: 'array', minItems: 1, maxItems: 1000, items: { $ref: '#/components/schemas/HoldingInput' } },
  },
};

const HoldingRow = {
  type: 'object', additionalProperties: false,
  required: ['symbol', 'issuer', 'chain', 'amount_usd', 'value_share_pct', 'peg_price', 'current_price', 'depeg_pct', 'collateral_type', 'attestation', 'risk_score', 'risk_band', 'weighted_risk_contribution', 'reasons'],
  properties: {
    symbol: { type: 'string' }, issuer: { type: ['string', 'null'] }, chain: { type: ['string', 'null'] },
    amount_usd: { type: 'number' }, value_share_pct: { type: 'number', minimum: 0, maximum: 100 },
    peg_price: { type: 'number' }, current_price: { type: 'number' }, depeg_pct: { type: 'number', minimum: 0 },
    collateral_type: { type: 'string' }, attestation: { type: 'string', enum: ATTESTATION_ENUM },
    risk_score: { type: 'number', minimum: 0, maximum: 100 }, risk_band: { type: 'string', enum: BAND_ENUM },
    weighted_risk_contribution: { type: 'number' }, reasons: strArr,
  },
};
const CollateralStat = {
  type: 'object', additionalProperties: false, required: ['collateral_type', 'amount_usd', 'share_pct', 'holding_count'],
  properties: { collateral_type: { type: 'string' }, amount_usd: { type: 'number' }, share_pct: { type: 'number', minimum: 0, maximum: 100 }, holding_count: { type: 'integer', minimum: 0 } },
};
const IssuerConcentration = {
  type: 'object', additionalProperties: false, required: ['hhi', 'band', 'top_issuer', 'top_issuer_share_pct'],
  properties: { hhi: { type: 'number', minimum: 0, maximum: 1 }, band: { type: 'string', enum: ['low', 'moderate', 'high'] }, top_issuer: { type: ['string', 'null'] }, top_issuer_share_pct: { type: 'number', minimum: 0, maximum: 100 } },
};

const StablecoinCore = {
  type: 'object',
  required: ['portfolio', 'holding_count', 'total_stablecoin_usd', 'stablecoin_risk_score', 'risk_band', 'max_depeg_pct', 'currently_depegged_count', 'algorithmic_pct', 'audited_pct', 'unknown_collateral_pct', 'issuer_concentration', 'collateral_breakdown', 'verdict', 'hard_block', 'holdings', 'highest_risk_holdings', 'risk_disclaimer'],
  properties: {
    portfolio: { type: ['string', 'null'] },
    holding_count: { type: 'integer', minimum: 0 }, total_stablecoin_usd: { type: 'number' },
    stablecoin_risk_score: { type: 'number', minimum: 0, maximum: 100 }, risk_band: { type: 'string', enum: BAND_ENUM },
    max_depeg_pct: { type: 'number', minimum: 0 }, currently_depegged_count: { type: 'integer', minimum: 0 },
    algorithmic_pct: { type: 'number', minimum: 0, maximum: 100 }, audited_pct: { type: 'number', minimum: 0, maximum: 100 }, unknown_collateral_pct: { type: 'number', minimum: 0, maximum: 100 },
    issuer_concentration: { $ref: '#/components/schemas/IssuerConcentration' },
    collateral_breakdown: { type: 'array', items: { $ref: '#/components/schemas/CollateralStat' } },
    verdict: { type: 'string', enum: VERDICT_ENUM }, hard_block: { type: 'boolean' },
    holdings: { type: 'array', items: { $ref: '#/components/schemas/HoldingRow' } },
    highest_risk_holdings: { type: 'array', items: { $ref: '#/components/schemas/HoldingRow' } },
    risk_disclaimer: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('assessment', 'interpretation'), _Tail: Tail,
  HoldingInput, AssessRequest, HoldingRow, CollateralStat, IssuerConcentration, StablecoinCore, DiscoveryResponse: discoverySchema(),
  AssessResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/StablecoinCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/StablecoinCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = {
  portfolio: 'treasury',
  holdings: [
    { symbol: 'USDC', issuer: 'Circle', amount_usd: 120000, collateral_type: 'fiat', attestation: 'audited' },
    { symbol: 'USDT', issuer: 'Tether', amount_usd: 60000, collateral_type: 'fiat', attestation: 'attested' },
    { symbol: 'DAI', issuer: 'MakerDAO', amount_usd: 30000, collateral_type: 'crypto', attestation: 'attested' },
    { symbol: 'USTC', issuer: 'Terra', amount_usd: 10000, collateral_type: 'algorithmic', attestation: 'none', current_price: 0.85 },
  ],
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/assess', summary: 'Score stablecoin depeg/collateral/concentration risk', operationId: 'assess', priceUsdc: 0.025,
    requestSchemaRef: 'AssessRequest', responseSchemaRef: 'AssessResponse', requestExample: REQ, responseExample: assessExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL assessment + reasoning + prioritized actions', operationId: 'lookup', priceUsdc: 0.04, oneCall: true,
    requestSchemaRef: 'AssessRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ, responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'portfolio-stablecoin-risk', title: 'Portfolio Stablecoin Risk API', version: '1.0.0',
  description: 'Deterministic stablecoin portfolio risk assessor. From a caller-supplied set of stablecoin holdings (USD amount, optional current/peg price, collateral type, issuer, attestation) it scores depeg, collateral, and issuer-concentration risk: per-holding and value-weighted portfolio risk, max depeg, algorithmic/audited shares, issuer HHI, a collateral breakdown, and an allow/review/block verdict. Scores the holdings you supply — no price fetch. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
