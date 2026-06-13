import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const NumericStats = {
  type: ['object', 'null'],
  properties: {
    min: { type: 'number' }, max: { type: 'number' }, mean: { type: 'number' }, median: { type: 'number' },
    stddev: { type: 'number' }, p25: { type: 'number' }, p75: { type: 'number' },
  },
};
const StringStats = { type: ['object', 'null'], properties: { min_length: { type: 'integer' }, max_length: { type: 'integer' }, avg_length: { type: 'number' } } };
const BoolStats = { type: ['object', 'null'], properties: { true_count: { type: 'integer' }, false_count: { type: 'integer' } } };
const TopValue = { type: 'object', required: ['value', 'count'], additionalProperties: false, properties: { value: { type: 'string' }, count: { type: 'integer', minimum: 1 } } };

const ColumnProfile = {
  type: 'object',
  required: ['column', 'inferred_type', 'count', 'null_count', 'null_rate', 'distinct_count', 'distinct_ratio', 'is_unique', 'is_constant', 'numeric', 'string', 'boolean', 'top_values'],
  additionalProperties: false,
  properties: {
    column: { type: 'string' },
    inferred_type: { type: 'string', enum: ['empty', 'boolean', 'integer', 'number', 'date', 'string'] },
    count: { type: 'integer', minimum: 0 },
    null_count: { type: 'integer', minimum: 0 },
    null_rate: { type: 'number', minimum: 0, maximum: 1 },
    distinct_count: { type: 'integer', minimum: 0 },
    distinct_ratio: { type: 'number', minimum: 0, maximum: 1 },
    is_unique: { type: 'boolean' },
    is_constant: { type: 'boolean' },
    numeric: NumericStats,
    string: StringStats,
    boolean: BoolStats,
    top_values: { type: 'array', items: TopValue },
  },
};
const ProfileCore = {
  type: 'object',
  required: ['row_count', 'column_count', 'columns'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    column_count: { type: 'integer', minimum: 0 },
    columns: { type: 'array', items: ColumnProfile },
  },
};
const Row = { type: 'object', description: 'A dataset row as a flat JSON object (column → value).' };
const ProfileRequest = {
  type: 'object', required: ['rows'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to profile.' },
    columns: { type: 'array', items: { type: 'string' }, description: 'Optional explicit column list (default: union of row keys).' },
  },
};

const CORE = {
  row_count: 3, column_count: 2,
  columns: [
    { column: 'id', inferred_type: 'integer', count: 3, null_count: 0, null_rate: 0, distinct_count: 3, distinct_ratio: 1, is_unique: true, is_constant: false, numeric: { min: 1, max: 3, mean: 2, median: 2, stddev: 0.8165, p25: 1.5, p75: 2.5 }, string: null, boolean: null, top_values: [{ value: '1', count: 1 }, { value: '2', count: 1 }, { value: '3', count: 1 }] },
    { column: 'tier', inferred_type: 'string', count: 3, null_count: 0, null_rate: 0, distinct_count: 2, distinct_ratio: 0.6667, is_unique: false, is_constant: false, numeric: null, string: { min_length: 3, max_length: 4, avg_length: 3.33 }, boolean: null, top_values: [{ value: 'pro', count: 2 }, { value: 'free', count: 1 }] },
  ],
};
const CHAIN = [
  { api: 'data-quality-rules', reason: 'Turn the observed types/ranges into enforceable validation rules.' },
  { api: 'data-drift-detector', reason: 'Compare this profile against a future snapshot to catch distribution drift.' },
];
const INVALIDATORS = [
  'Types are inferred from sample values: a numeric-looking string column ("007") is reported numeric; a single non-numeric value makes the whole column string.',
  'distinct/top_values use a canonical string form of each value, so 1 and "1" collapse to the same key.',
  'Statistics describe only the supplied rows — they are not a population estimate.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { profiling: 1 },
  recommended_actions_priority_order: [
    'Profiled 2 column(s) over 3 row(s).',
    'Candidate key/id column(s): id.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('profiling'), _Tail: Tail,
  NumericStats, StringStats, BoolStats, TopValue, ColumnProfile, ProfileCore, ProfileRequest, DiscoveryResponse: discoverySchema(),
  ProfileResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ProfileCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ProfileCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dpf-1780000000000', request_id: 'dpf-1780000000000', computed_at: '2026-06-13T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = { rows: [{ id: 1, tier: 'free' }, { id: 2, tier: 'pro' }, { id: 3, tier: 'pro' }] };
const disc = {
  name: 'Data Profiler API', version: '1.0.0',
  description: 'Deterministic dataset profiler. Per column: inferred type, null/distinct counts, uniqueness/constant flags, numeric stats (min/max/mean/median/stddev/quantiles), string length stats, boolean counts, and top values. Pure statistics, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-profiler/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/profile', summary: 'Profile a dataset', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL profile + reasoning', price_usdc: 0.009 },
  ],
  pricing: [
    { path: '/profile', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/profile', summary: 'Profile a dataset', operationId: 'profile', priceUsdc: 0.005,
    requestSchemaRef: 'ProfileRequest', responseSchemaRef: 'ProfileResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL profile + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true,
    requestSchemaRef: 'ProfileRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Profiled 2 column(s) across 3 row(s).',
        key_factors: ['Inferred types: integer×1, string×1.', 'Unique/key columns: 1; constant columns: 0.', 'Columns ≥50% null: 0.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-profiler', title: 'Data Profiler API', version: '1.0.0',
  description: 'Deterministic dataset profiler — per-column type, null/distinct counts, uniqueness flags, and type-appropriate statistics. Pure statistics, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
