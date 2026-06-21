import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { analyzeExample, lookupExample } from './examples';

const BAND_ENUM = ['low', 'medium', 'high', 'severe'];
const VERDICT_ENUM = ['allow', 'review', 'block'];
const IL_ENUM = ['none', 'low', 'medium', 'high', 'unknown'];
const strArr = { type: 'array', items: { type: 'string' } };

const PositionInput = {
  type: 'object', additionalProperties: false,
  description: 'One yield position. amount_usd drives weighting; apy_pct and type drive risk; il_risk/lockup_days/audited refine it.',
  properties: {
    protocol: { type: 'string', description: 'Protocol/platform name (drives protocol concentration).' },
    name: { type: 'string', description: 'Alias for protocol.' },
    platform: { type: 'string', description: 'Alias for protocol.' },
    type: { type: 'string', description: 'lending, lp/liquidity, staking, farm, vault, restaking, savings. Drives base risk.' },
    amount_usd: { type: 'number', minimum: 0, description: 'USD deployed in this position.' },
    value_usd: { type: 'number', minimum: 0, description: 'Alias for amount_usd.' },
    apy_pct: { type: 'number', minimum: 0, description: 'Annual percentage yield (treated as a risk signal, not a guarantee).' },
    apy: { type: 'number', minimum: 0, description: 'Alias for apy_pct.' },
    apr: { type: 'number', minimum: 0, description: 'Alias for apy_pct.' },
    reward_token: { type: 'string', description: 'Token the yield is paid in (drives reward-token dependency).' },
    il_risk: { type: 'string', enum: ['none', 'low', 'medium', 'high'], description: 'Impermanent-loss risk. Overrides the inferred value for LP/farm positions.' },
    is_stable_pair: { type: 'boolean', description: 'LP is a stable/stable pair (minimal IL).' },
    lockup_days: { type: 'integer', minimum: 0, description: 'Days funds are locked (illiquidity).' },
    audited: { type: 'boolean', description: 'Protocol is audited.' },
    audit: { type: 'string', description: 'Alias: set to "audited" to mark audited.' },
  },
};

const AnalyzeRequest = {
  type: 'object', additionalProperties: false, required: ['positions'],
  properties: {
    portfolio: { type: 'string', description: 'Portfolio/wallet label (echoed).' },
    wallet: { type: 'string', description: 'Alias for portfolio.' },
    address: { type: 'string', description: 'Alias for portfolio.' },
    positions: { type: 'array', minItems: 1, maxItems: 1000, items: { $ref: '#/components/schemas/PositionInput' } },
  },
};

const PositionRow = {
  type: 'object', additionalProperties: false,
  required: ['protocol', 'type', 'amount_usd', 'value_share_pct', 'apy_pct', 'reward_token', 'il_risk', 'is_stable_pair', 'lockup_days', 'audited', 'risk_score', 'risk_band', 'weighted_risk_contribution', 'reasons'],
  properties: {
    protocol: { type: 'string' }, type: { type: 'string' },
    amount_usd: { type: 'number' }, value_share_pct: { type: 'number', minimum: 0, maximum: 100 },
    apy_pct: { type: 'number', minimum: 0 }, reward_token: { type: ['string', 'null'] },
    il_risk: { type: 'string', enum: IL_ENUM }, is_stable_pair: { type: 'boolean' }, lockup_days: { type: 'integer', minimum: 0 }, audited: { type: 'boolean' },
    risk_score: { type: 'number', minimum: 0, maximum: 100 }, risk_band: { type: 'string', enum: BAND_ENUM },
    weighted_risk_contribution: { type: 'number' }, reasons: strArr,
  },
};
const TypeStat = {
  type: 'object', additionalProperties: false, required: ['type', 'amount_usd', 'share_pct', 'position_count'],
  properties: { type: { type: 'string' }, amount_usd: { type: 'number' }, share_pct: { type: 'number', minimum: 0, maximum: 100 }, position_count: { type: 'integer', minimum: 0 } },
};
const ProtocolConcentration = {
  type: 'object', additionalProperties: false, required: ['hhi', 'band', 'top_protocol', 'top_protocol_share_pct'],
  properties: { hhi: { type: 'number', minimum: 0, maximum: 1 }, band: { type: 'string', enum: ['low', 'moderate', 'high'] }, top_protocol: { type: ['string', 'null'] }, top_protocol_share_pct: { type: 'number', minimum: 0, maximum: 100 } },
};

const YieldCore = {
  type: 'object',
  required: ['portfolio', 'position_count', 'total_yield_position_usd', 'weighted_apy_pct', 'yield_risk_score', 'risk_band', 'il_exposure_pct', 'locked_pct', 'high_apy_exposure_pct', 'reward_token_dependency_pct', 'unaudited_pct', 'protocol_concentration', 'type_breakdown', 'verdict', 'hard_block', 'positions', 'highest_risk_positions', 'risk_disclaimer'],
  properties: {
    portfolio: { type: ['string', 'null'] },
    position_count: { type: 'integer', minimum: 0 }, total_yield_position_usd: { type: 'number' },
    weighted_apy_pct: { type: 'number', minimum: 0 },
    yield_risk_score: { type: 'number', minimum: 0, maximum: 100 }, risk_band: { type: 'string', enum: BAND_ENUM },
    il_exposure_pct: { type: 'number', minimum: 0, maximum: 100 }, locked_pct: { type: 'number', minimum: 0, maximum: 100 },
    high_apy_exposure_pct: { type: 'number', minimum: 0, maximum: 100 }, reward_token_dependency_pct: { type: 'number', minimum: 0, maximum: 100 }, unaudited_pct: { type: 'number', minimum: 0, maximum: 100 },
    protocol_concentration: { $ref: '#/components/schemas/ProtocolConcentration' },
    type_breakdown: { type: 'array', items: { $ref: '#/components/schemas/TypeStat' } },
    verdict: { type: 'string', enum: VERDICT_ENUM }, hard_block: { type: 'boolean' },
    positions: { type: 'array', items: { $ref: '#/components/schemas/PositionRow' } },
    highest_risk_positions: { type: 'array', items: { $ref: '#/components/schemas/PositionRow' } },
    risk_disclaimer: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('rollup', 'interpretation'), _Tail: Tail,
  PositionInput, AnalyzeRequest, PositionRow, TypeStat, ProtocolConcentration, YieldCore, DiscoveryResponse: discoverySchema(),
  AnalyzeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/YieldCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/YieldCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = {
  portfolio: 'defi-book',
  positions: [
    { protocol: 'Aave', type: 'lending', amount_usd: 80000, apy_pct: 4.5, audited: true },
    { protocol: 'Curve', type: 'lp', amount_usd: 40000, apy_pct: 9, is_stable_pair: true, audited: true },
    { protocol: 'Uniswap', type: 'lp', amount_usd: 25000, apy_pct: 22, il_risk: 'high', audited: true },
    { protocol: 'NewFarm', type: 'farm', amount_usd: 15000, apy_pct: 180, reward_token: 'FARM', lockup_days: 30 },
  ],
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/analyze', summary: 'Roll up yield positions into a yield-risk view', operationId: 'analyze', priceUsdc: 0.025,
    requestSchemaRef: 'AnalyzeRequest', responseSchemaRef: 'AnalyzeResponse', requestExample: REQ, responseExample: analyzeExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL analysis + reasoning + prioritized actions', operationId: 'lookup', priceUsdc: 0.04, oneCall: true,
    requestSchemaRef: 'AnalyzeRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ, responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'portfolio-yield-exposure', title: 'Portfolio Yield Exposure API', version: '1.0.0',
  description: 'Deterministic DeFi yield-exposure analyzer. From a caller-supplied set of yield positions (protocol, USD amount, APY, type, optional IL risk / lockup / audit / reward token) it computes value-weighted APY, a value-weighted yield-risk score, protocol concentration (HHI), impermanent-loss exposure, locked share, high-APY share, reward-token dependency, a type breakdown, and an allow/review/block verdict. Rolls up the positions you supply — no chain fetch. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
