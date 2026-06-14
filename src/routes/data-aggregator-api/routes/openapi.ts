import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema } from '../../_aplus/specparts';

const FUNC_ENUM = ['count', 'count_distinct', 'sum', 'avg', 'min', 'max', 'median', 'percentile'];
const Row = rowSchema();
const AggSpec = {
  type: 'object', required: ['column', 'func', 'percentile', 'as'], additionalProperties: false,
  properties: {
    column: { type: ['string', 'null'] },
    func: { type: 'string', enum: FUNC_ENUM },
    percentile: { type: ['number', 'null'], minimum: 0, maximum: 100 },
    as: { type: 'string' },
  },
};
const AggregateCore = {
  type: 'object', required: ['row_count', 'group_count', 'group_by', 'aggregations', 'groups'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    group_count: { type: 'integer', minimum: 0 },
    group_by: { type: 'array', items: { type: 'string' } },
    aggregations: { type: 'array', items: AggSpec },
    groups: { type: 'array', items: Row },
  },
};
const Aggregation = {
  type: 'object', required: ['func'], additionalProperties: false,
  properties: {
    column: { type: 'string', description: 'Column to aggregate (required for all funcs except count).' },
    func: { type: 'string', enum: FUNC_ENUM },
    percentile: { type: 'number', minimum: 0, maximum: 100, description: 'Required when func=percentile.' },
    as: { type: 'string', description: 'Output field name (default derived from func/column).' },
  },
};
const AggregateRequest = {
  type: 'object', required: ['rows', 'aggregations'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to aggregate.' },
    group_by: { type: 'array', items: { type: 'string' }, description: 'Columns to group by (omit/empty for a single global group).' },
    aggregations: { type: 'array', items: Aggregation, minItems: 1, description: 'Aggregation functions to compute per group.' },
  },
};

const CORE = {
  row_count: 4, group_count: 2, group_by: ['tier'],
  aggregations: [
    { column: null, func: 'count', percentile: null, as: 'count' },
    { column: 'amount', func: 'sum', percentile: null, as: 'sum_amount' },
    { column: 'amount', func: 'avg', percentile: null, as: 'avg_amount' },
  ],
  groups: [
    { tier: 'free', count: 2, sum_amount: 30, avg_amount: 15 },
    { tier: 'pro', count: 2, sum_amount: 80, avg_amount: 40 },
  ],
};
const CHAIN = [
  { api: 'data-profiler', reason: 'Profile the aggregated output to sanity-check distributions.' },
  { api: 'data-drift-detector', reason: 'Compare this aggregate against a prior period to detect shifts.' },
];
const INVALIDATORS = [
  'Numeric aggregations (sum/avg/min/max/median/percentile) parse numeric strings and ignore missing/non-numeric values; a group with no numeric values returns null for that aggregation.',
  'count counts all rows in the group; count_distinct and column-based functions count only non-missing values.',
  'percentile uses linear interpolation between order statistics (same convention as the profiler); group_by=[] aggregates the whole dataset into one group.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { aggregation: 1 },
  recommended_actions_priority_order: [
    'Aggregated 4 row(s) into 2 group(s) by [tier] with 3 function(s).',
    'Persist the grouped rows or chain to data-profiler / data-drift-detector on the output.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('aggregation'), _Tail: Tail,
  AggSpec, AggregateCore, Aggregation, AggregateRequest, DiscoveryResponse: discoverySchema(),
  AggregateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AggregateCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AggregateCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dag-1780000000000', request_id: 'dag-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  rows: [
    { tier: 'free', amount: '10' },
    { tier: 'pro', amount: '30' },
    { tier: 'pro', amount: '50' },
    { tier: 'free', amount: '20' },
  ],
  group_by: ['tier'],
  aggregations: [
    { func: 'count' },
    { column: 'amount', func: 'sum' },
    { column: 'amount', func: 'avg', as: 'avg_amount' },
  ],
};
const disc = {
  name: 'Data Aggregator API', version: '1.0.0',
  description: 'Deterministic data aggregator. Groups a dataset by zero or more columns and computes count/count_distinct/sum/avg/min/max/median/percentile per group. Pure arithmetic, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-aggregator/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/aggregate', summary: 'Group-by + aggregate a dataset', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL aggregate + reasoning', price_usdc: 0.011 },
  ],
  pricing: [
    { path: '/aggregate', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/aggregate', summary: 'Group-by + aggregate a dataset', operationId: 'aggregate', priceUsdc: 0.006,
    requestSchemaRef: 'AggregateRequest', responseSchemaRef: 'AggregateResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL aggregate + reasoning', operationId: 'lookup', priceUsdc: 0.011, oneCall: true,
    requestSchemaRef: 'AggregateRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Grouped 4 row(s) by [tier] into 2 group(s); computed 3 aggregation(s).',
        key_factors: ['Group keys: tier.', 'Aggregations: count, sum_amount, avg_amount.', 'Groups produced: 2.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-aggregator', title: 'Data Aggregator API', version: '1.0.0',
  description: 'Deterministic data aggregator — group-by + count/sum/avg/min/max/median/percentile per group. Pure arithmetic, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
