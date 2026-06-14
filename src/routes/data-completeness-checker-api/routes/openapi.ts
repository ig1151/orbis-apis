import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema } from '../../_aplus/specparts';

const ColumnCompleteness = {
  type: 'object',
  required: ['column', 'required', 'total', 'present', 'missing', 'completeness_pct'],
  additionalProperties: false,
  properties: {
    column: { type: 'string' },
    required: { type: 'boolean' },
    total: { type: 'integer', minimum: 0 },
    present: { type: 'integer', minimum: 0 },
    missing: { type: 'integer', minimum: 0 },
    completeness_pct: { type: 'number', minimum: 0, maximum: 100 },
  },
};
const CompletenessCore = {
  type: 'object',
  required: ['row_count', 'column_count', 'per_column', 'overall_completeness_pct', 'fully_complete_rows', 'fully_complete_rows_pct', 'required_columns_complete', 'completeness_score', 'grade', 'passed'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    column_count: { type: 'integer', minimum: 0 },
    per_column: { type: 'array', items: ColumnCompleteness },
    overall_completeness_pct: { type: 'number', minimum: 0, maximum: 100 },
    fully_complete_rows: { type: 'integer', minimum: 0 },
    fully_complete_rows_pct: { type: 'number', minimum: 0, maximum: 100 },
    required_columns_complete: { type: 'boolean' },
    completeness_score: { type: 'integer', minimum: 0, maximum: 100 },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    passed: { type: 'boolean' },
  },
};
const Row = rowSchema();
const CheckRequest = {
  type: 'object', required: ['rows'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to measure.' },
    columns: { type: 'array', items: { type: 'string' }, description: 'Optional explicit column list (default: union of row keys).' },
    required_columns: { type: 'array', items: { type: 'string' }, description: 'Columns that must be fully present; any missing value caps the score at 49 (fail).' },
    blank_as_missing: { type: 'boolean', description: 'Treat blank/whitespace strings as missing (default true).' },
  },
};

const CORE = {
  row_count: 3, column_count: 3, overall_completeness_pct: 77.78, fully_complete_rows: 1, fully_complete_rows_pct: 33.33,
  required_columns_complete: true, completeness_score: 78, grade: 'C', passed: false,
  per_column: [
    { column: 'phone', required: false, total: 3, present: 1, missing: 2, completeness_pct: 33.33 },
    { column: 'id', required: true, total: 3, present: 3, missing: 0, completeness_pct: 100 },
    { column: 'name', required: false, total: 3, present: 3, missing: 0, completeness_pct: 100 },
  ],
};
const CHAIN = [
  { api: 'data-quality-rules', reason: 'Turn required columns into not_null rules and enforce them as a gate.' },
  { api: 'data-profiler', reason: 'Profile the sparse columns to understand why values are missing.' },
];
const INVALIDATORS = [
  'Blank/whitespace strings count as missing by default; set "blank_as_missing": false to count them as present.',
  'A column not present in any row but listed in required_columns scores 0% — that is intentional (the field is absent).',
  'completeness_score is capped at 49 (failing) if any required column has a missing value, regardless of overall fill rate.',
  'Counts are exact for the supplied rows; they are not a population estimate — a complete sample does not guarantee the upstream source is complete.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { completeness: 1 },
  recommended_actions_priority_order: [
    'Overall completeness 77.78% (grade C); sparsest column "phone" at 33.33%.',
    'Backfill or impute the sparsest columns, or drop them if not needed downstream.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('completeness'), _Tail: Tail,
  ColumnCompleteness, CompletenessCore, CheckRequest, DiscoveryResponse: discoverySchema(),
  CheckResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CompletenessCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CompletenessCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dcc-1780000000000', request_id: 'dcc-1780000000000', computed_at: '2026-06-13T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = {
  rows: [{ id: 1, name: 'Ann', phone: '555-1' }, { id: 2, name: 'Bob', phone: '' }, { id: 3, name: 'Cy' }],
  required_columns: ['id'],
};
const disc = {
  name: 'Data Completeness Checker API', version: '1.0.0',
  description: 'Deterministic data-completeness checker. Measures present/missing values per column, overall completeness, fully-complete rows, and a 0–100 score with a required-columns gate. Pure counting, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-completeness-checker/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/check', summary: 'Check dataset completeness', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL check + reasoning', price_usdc: 0.01 },
  ],
  pricing: [
    { path: '/check', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/check', summary: 'Check dataset completeness', operationId: 'check', priceUsdc: 0.005,
    requestSchemaRef: 'CheckRequest', responseSchemaRef: 'CheckResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL check + reasoning', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'CheckRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Measured 3 column(s) over 3 row(s); overall completeness 77.78% (score 78, grade C).',
        key_factors: ['Fully-complete rows: 1/3 (33.33%).', 'Required columns complete: true.', 'Sparsest column: phone at 33.33%.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-completeness-checker', title: 'Data Completeness Checker API', version: '1.0.0',
  description: 'Deterministic data-completeness checker. Measures present/missing values per column with an overall 0–100 score and required-columns gate. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
