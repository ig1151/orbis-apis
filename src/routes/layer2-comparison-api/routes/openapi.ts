import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const L2Record = {
  type: 'object',
  required: ['name', 'slug', 'type', 'settlement_layer', 'vm', 'native_gas_token', 'data_availability', 'approx_tx_fee_usd', 'throughput_tps', 'time_to_finality', 'ecosystem_maturity', 'launched_year', 'notable_for'],
  additionalProperties: false,
  properties: {
    name: { type: 'string' }, slug: { type: 'string' },
    type: { type: 'string', enum: ['optimistic_rollup', 'zk_rollup', 'validium', 'sidechain'] },
    settlement_layer: { type: 'string' }, vm: { type: 'string' }, native_gas_token: { type: 'string' },
    data_availability: { type: 'string', enum: ['ethereum', 'external_dac', 'self'] },
    approx_tx_fee_usd: { type: 'number', minimum: 0 }, throughput_tps: { type: 'number', minimum: 0 },
    time_to_finality: { type: 'string' },
    ecosystem_maturity: { type: 'string', enum: ['emerging', 'growing', 'established'] },
    launched_year: { type: 'integer' }, notable_for: { type: 'string' },
  },
};
const nullableL2 = { oneOf: [{ $ref: '#/components/schemas/L2Record' }, { type: 'null' }] };
const strArr = { type: 'array', items: { type: 'string' } };

const ChainCore = { type: 'object', required: ['found', 'query', 'chain', 'available'], properties: { found: { type: 'boolean' }, query: { type: 'string' }, chain: nullableL2, available: strArr } };
const CompareCore = {
  type: 'object',
  required: ['chains', 'cheapest', 'fastest_finality_type', 'highest_throughput', 'all_settle_to', 'types_present'],
  properties: { chains: { type: 'array', items: { $ref: '#/components/schemas/L2Record' } }, cheapest: { type: 'string' }, fastest_finality_type: { type: 'string' }, highest_throughput: { type: 'string' }, all_settle_to: strArr, types_present: strArr },
};
const LookupCore = {
  type: 'object', required: ['mode', 'reasoning'],
  properties: {
    mode: { type: 'string', enum: ['chain', 'compare'] }, reasoning: { $ref: '#/components/schemas/Reasoning' },
    found: { type: 'boolean' }, query: { type: 'string' }, chain: nullableL2, available: strArr,
    chains: { type: 'array', items: { $ref: '#/components/schemas/L2Record' } }, cheapest: { type: 'string' }, fastest_finality_type: { type: 'string' }, highest_throughput: { type: 'string' }, all_settle_to: strArr, types_present: strArr,
  },
};

const ARB = { name: 'Arbitrum One', slug: 'arbitrum', type: 'optimistic_rollup', settlement_layer: 'Ethereum', vm: 'EVM', native_gas_token: 'ETH', data_availability: 'ethereum', approx_tx_fee_usd: 0.03, throughput_tps: 40, time_to_finality: '~7 days (challenge window) to L1', ecosystem_maturity: 'established', launched_year: 2021, notable_for: 'Largest optimistic-rollup TVL and DeFi ecosystem.' };
const STARK = { name: 'Starknet', slug: 'starknet', type: 'zk_rollup', settlement_layer: 'Ethereum', vm: 'Cairo VM', native_gas_token: 'ETH/STRK', data_availability: 'ethereum', approx_tx_fee_usd: 0.02, throughput_tps: 90, time_to_finality: '~few hours (proof + L1 verify)', ecosystem_maturity: 'growing', launched_year: 2021, notable_for: 'STARK proofs and the Cairo language; high prover scalability.' };

const tail = (acts: string[]) => ({
  confidence_score: 0.85, confidence_per_section: { classification: 1, metrics: 0.7 }, recommended_actions_priority_order: acts,
  chain_to: [
    { api: 'gas-fee-api', reason: 'Get live gas/fee estimates for the chain you selected before transacting.' },
    { api: 'web3-security-checklist', reason: 'Assess audit-readiness of a contract you plan to deploy on the chosen L2.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
});

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('classification', 'metrics'), _Tail: Tail, L2Record, ChainCore, CompareCore, LookupCore,
  DiscoveryResponse: discoverySchema(),
  ChainRequest: { type: 'object', additionalProperties: false, properties: { chain: { type: 'string' }, query: { type: 'string' }, name: { type: 'string' } }, description: 'Network name or slug.' },
  CompareRequest: { type: 'object', required: ['chains'], additionalProperties: false, properties: { chains: { type: 'array', minItems: 2, maxItems: 12, items: { type: 'string' } } }, description: 'Array of 2–12 network names or slugs.' },
  LookupRequest: { type: 'object', additionalProperties: false, properties: { chain: { type: 'string' }, query: { type: 'string' }, name: { type: 'string' }, chains: { type: 'array', items: { type: 'string' } } }, description: 'Provide "chain" for a single record or "chains" (2+) to compare.' },
  ChainResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ChainCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  CompareResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CompareCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LookupCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
};

const env = { trace_id: 'l2c-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/chain', summary: 'Resolve one L2 network record', operationId: 'chain', priceUsdc: 0.004,
    requestSchemaRef: 'ChainRequest', responseSchemaRef: 'ChainResponse', requestExample: { chain: 'arbitrum' },
    responseExample: { ...env, found: true, query: 'arbitrum', chain: ARB, available: ['arbitrum', 'optimism', 'base'], ...tail(['Arbitrum One: optimistic rollup on Ethereum, EVM, ~$0.03 per transfer, ~40 TPS.', 'Finality: ~7 days (challenge window) to L1.']) },
  },
  {
    method: 'post', path: '/compare', summary: 'Compare 2+ L2 networks side by side', operationId: 'compare', priceUsdc: 0.006,
    requestSchemaRef: 'CompareRequest', responseSchemaRef: 'CompareResponse', requestExample: { chains: ['arbitrum', 'starknet'] },
    responseExample: { ...env, chains: [ARB, STARK], cheapest: 'Starknet', fastest_finality_type: 'Starknet', highest_throughput: 'Starknet', all_settle_to: ['Ethereum'], types_present: ['optimistic_rollup', 'zk_rollup'], ...tail(['Comparing 2 networks: cheapest Starknet, highest throughput Starknet.', 'Fastest L1 finality class: Starknet (zk/validium settle far sooner than the ~7-day optimistic window).']) },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL resolve/compare + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse', requestExample: { chains: ['arbitrum', 'starknet'] },
    responseExample: {
      ...env, mode: 'compare', chains: [ARB, STARK], cheapest: 'Starknet', fastest_finality_type: 'Starknet', highest_throughput: 'Starknet', all_settle_to: ['Ethereum'], types_present: ['optimistic_rollup', 'zk_rollup'],
      reasoning: { why_result_generated: 'Compared 2 curated L2 records; cheapest by indicative fee is Starknet, highest throughput is Starknet.', key_factors: ['Types present: optimistic_rollup, zk_rollup.', 'All settle to: Ethereum.', 'Cheapest: Starknet.'], invalidators: ['Fees and throughput are curated indicative estimates and change with congestion, blob prices, and upgrades.', 'Finality classes are structural; actual times vary by batch/proof cadence.', 'Sidechains (e.g. Polygon PoS) have their own security, not Ethereum-equivalent rollup security.'] },
      ...tail(['Cheapest Starknet; highest throughput Starknet; fastest-finality class Starknet.']),
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'layer2-comparison', title: 'Layer 2 Blockchain Comparison API', version: '1.0.0',
  description: 'Deterministic Layer-2 comparison over a curated static table. Resolve one network or compare several across type, settlement layer, VM, data availability, indicative fee, throughput, and finality. Categorical facts are exact; numeric metrics are curated indicative estimates. No fetch, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
