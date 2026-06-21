import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { assessExample, lookupExample } from './examples';

const BAND_ENUM = ['low', 'medium', 'high', 'severe'];
const BAND_UNKNOWN_ENUM = ['low', 'medium', 'high', 'severe', 'unknown'];
const VERDICT_ENUM = ['allow', 'review', 'block'];
const strArr = { type: 'array', items: { type: 'string' } };

const AssessRequest = {
  type: 'object', additionalProperties: false, required: ['amount_usd'],
  description: 'Bridge-transfer params. amount_usd is required; everything else is optional and scored conservatively when omitted. Params may also be nested under a "transfer" object.',
  properties: {
    transfer: { type: 'object', description: 'Optional wrapper — the same params may be nested here instead of at the top level.' },
    amount_usd: { type: 'number', minimum: 0, description: 'USD value being bridged.' },
    value_usd: { type: 'number', minimum: 0, description: 'Alias for amount_usd.' },
    bridge: { type: 'string', description: 'Bridge name (echoed).' },
    bridge_name: { type: 'string', description: 'Alias for bridge.' },
    bridge_type: { type: 'string', description: 'native, canonical, rollup, light_client, liquidity, lock_mint, optimistic, external_validator, multisig, federated, unknown. Drives the security-model risk.' },
    type: { type: 'string', description: 'Alias for bridge_type.' },
    source_chain: { type: 'string', description: 'Origin chain.' },
    dest_chain: { type: 'string', description: 'Destination chain.' },
    from_chain: { type: 'string', description: 'Alias for source_chain.' },
    to_chain: { type: 'string', description: 'Alias for dest_chain.' },
    dest_liquidity_usd: { type: 'number', minimum: 0, description: 'Available destination liquidity (enables a slippage estimate and recommended max).' },
    liquidity_usd: { type: 'number', minimum: 0, description: 'Alias for dest_liquidity_usd.' },
    bridge_tvl_usd: { type: 'number', minimum: 0, description: 'Total value locked in the bridge (maturity signal).' },
    tvl_usd: { type: 'number', minimum: 0, description: 'Alias for bridge_tvl_usd.' },
    audited: { type: 'boolean', description: 'Bridge contracts are audited.' },
    audit: { type: 'string', description: 'Alias: set to "audited".' },
    exploited_before: { type: 'boolean', description: 'Bridge has been exploited/hacked before — forces a hard block.' },
    previously_exploited: { type: 'boolean', description: 'Alias for exploited_before.' },
    validator_set_size: { type: 'integer', minimum: 0, description: 'Validator/multisig signer count (small sets concentrate trust).' },
  },
};

const RiskComponent = {
  type: 'object', additionalProperties: false, required: ['factor', 'points', 'detail'],
  properties: { factor: { type: 'string' }, points: { type: 'number' }, detail: { type: 'string' } },
};

const BridgeCore = {
  type: 'object',
  required: ['bridge', 'bridge_type', 'source_chain', 'dest_chain', 'amount_usd', 'cross_chain', 'liquidity_ratio', 'estimated_slippage_pct', 'liquidity_risk_band', 'recommended_max_transfer_usd', 'bridge_risk_score', 'risk_band', 'trust_score', 'components', 'verdict', 'hard_block', 'exploited_before', 'audited', 'reasons', 'risk_disclaimer'],
  properties: {
    bridge: { type: 'string' }, bridge_type: { type: 'string' },
    source_chain: { type: ['string', 'null'] }, dest_chain: { type: ['string', 'null'] },
    amount_usd: { type: 'number' }, cross_chain: { type: 'boolean' },
    liquidity_ratio: { type: ['number', 'null'] },
    estimated_slippage_pct: { type: ['number', 'null'] },
    liquidity_risk_band: { type: 'string', enum: BAND_UNKNOWN_ENUM },
    recommended_max_transfer_usd: { type: ['number', 'null'] },
    bridge_risk_score: { type: 'number', minimum: 0, maximum: 100 }, risk_band: { type: 'string', enum: BAND_ENUM },
    trust_score: { type: 'number', minimum: 0, maximum: 100 },
    components: { type: 'array', items: { $ref: '#/components/schemas/RiskComponent' } },
    verdict: { type: 'string', enum: VERDICT_ENUM }, hard_block: { type: 'boolean' },
    exploited_before: { type: 'boolean' }, audited: { type: 'boolean' },
    reasons: strArr,
    risk_disclaimer: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('assessment', 'interpretation'), _Tail: Tail,
  AssessRequest, RiskComponent, BridgeCore, DiscoveryResponse: discoverySchema(),
  AssessResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BridgeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BridgeCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = {
  amount_usd: 250000,
  bridge: 'ExampleBridge',
  bridge_type: 'lock_mint',
  source_chain: 'ethereum',
  dest_chain: 'arbitrum',
  dest_liquidity_usd: 2000000,
  bridge_tvl_usd: 40000000,
  audited: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/assess', summary: 'Score a single bridge transfer', operationId: 'assess', priceUsdc: 0.025,
    requestSchemaRef: 'AssessRequest', responseSchemaRef: 'AssessResponse', requestExample: REQ, responseExample: assessExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL assessment + reasoning + prioritized actions', operationId: 'lookup', priceUsdc: 0.04, oneCall: true,
    requestSchemaRef: 'AssessRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ, responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'bridge-transfer-risk', title: 'Bridge Transfer Risk API', version: '1.0.0',
  description: 'Deterministic cross-chain bridge transfer risk assessor. From caller-supplied params for a single transfer (amount, bridge, bridge type, chains, optional TVL / dest liquidity / audit / exploit history) it returns a liquidity/slippage estimate, a bridge-design trust score, a composite bridge_risk_score, a recommended max transfer size, and an allow/review/block verdict. Scores the params you supply — no chain or liquidity fetch. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
