import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema } from '../../_aplus/specparts';

const NumericDriftDetails = {
  type: 'object', additionalProperties: false,
  required: ['baseline_mean', 'current_mean', 'mean_shift', 'bins'],
  properties: {
    baseline_mean: { type: ['number', 'null'] },
    current_mean: { type: ['number', 'null'] },
    mean_shift: { type: ['number', 'null'] },
    bins: { type: 'integer', minimum: 1 },
  },
};
const CategoricalDriftDetails = {
  type: 'object', additionalProperties: false,
  required: ['baseline_categories', 'current_categories', 'new_categories', 'dropped_categories'],
  properties: {
    baseline_categories: { type: 'integer', minimum: 0 },
    current_categories: { type: 'integer', minimum: 0 },
    new_categories: { type: 'array', items: { type: 'string' } },
    dropped_categories: { type: 'array', items: { type: 'string' } },
  },
};
const ColumnDrift = {
  type: 'object',
  required: ['column', 'type', 'psi', 'drift_level', 'baseline_missing_rate', 'current_missing_rate', 'details'],
  additionalProperties: false,
  properties: {
    column: { type: 'string' },
    type: { type: 'string', enum: ['numeric', 'categorical'] },
    psi: { type: 'number', minimum: 0 },
    drift_level: { type: 'string', enum: ['none', 'minor', 'major'] },
    baseline_missing_rate: { type: 'number', minimum: 0, maximum: 1 },
    current_missing_rate: { type: 'number', minimum: 0, maximum: 1 },
    details: { oneOf: [NumericDriftDetails, CategoricalDriftDetails], description: 'Numeric drift detail (means/mean_shift/bins) for numeric columns; categorical detail (category counts + new/dropped categories) for categorical columns.' },
  },
};
const DriftCore = {
  type: 'object',
  required: ['columns_compared', 'baseline_rows', 'current_rows', 'drifted_columns', 'max_psi', 'most_drifted_column', 'has_significant_drift', 'per_column'],
  properties: {
    columns_compared: { type: 'integer', minimum: 0 },
    baseline_rows: { type: 'integer', minimum: 0 },
    current_rows: { type: 'integer', minimum: 0 },
    drifted_columns: { type: 'integer', minimum: 0 },
    max_psi: { type: 'number', minimum: 0 },
    most_drifted_column: { type: ['string', 'null'] },
    has_significant_drift: { type: 'boolean' },
    per_column: { type: 'array', items: ColumnDrift },
  },
};
const Row = rowSchema();
const DetectRequest = {
  type: 'object', required: ['baseline', 'current'], additionalProperties: false,
  properties: {
    baseline: { type: 'array', items: Row, minItems: 1, description: 'Baseline/reference dataset rows.' },
    current: { type: 'array', items: Row, minItems: 1, description: 'Current dataset rows to compare against the baseline.' },
    columns: { type: 'array', items: { type: 'string' }, description: 'Optional explicit columns to compare (default: common columns).' },
  },
};

const CORE = {
  columns_compared: 2, baseline_rows: 4, current_rows: 4, drifted_columns: 1, max_psi: 8.5155, most_drifted_column: 'tier',
  has_significant_drift: true,
  per_column: [
    { column: 'tier', type: 'categorical', psi: 8.5155, drift_level: 'major', baseline_missing_rate: 0, current_missing_rate: 0, details: { baseline_categories: 2, current_categories: 2, new_categories: ['enterprise'], dropped_categories: ['free'] } },
    { column: 'age', type: 'numeric', psi: 0, drift_level: 'none', baseline_missing_rate: 0, current_missing_rate: 0, details: { baseline_mean: 31, current_mean: 31, mean_shift: 0, bins: 10 } },
  ],
};
const CHAIN = [
  { api: 'data-profiler', reason: 'Profile the drifted columns to see exactly how their distributions changed.' },
  { api: 'data-quality-rules', reason: 'Encode the baseline expectations as rules and re-check the current dataset.' },
];
const INVALIDATORS = [
  'PSI bands (none <0.1, minor <0.25, major ≥0.25) are the industry-standard convention, not a statistical guarantee — calibrate thresholds to your domain.',
  'PSI is sensitive to bin count and to small samples; with few rows a high PSI can be noise rather than real drift.',
  'A column is compared numerically only if BOTH sides parse as numeric; mixed-type columns are compared as categories.',
];
const TAIL = {
  confidence_score: 0.5, confidence_per_section: { drift_statistics: 0.5 },
  recommended_actions_priority_order: [
    'Major drift on tier (PSI 8.5155) — investigate before trusting downstream models/aggregates.',
    'Confirm baseline and current windows are comparable (same population, no schema change).',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('drift_statistics'), _Tail: Tail,
  ColumnDrift, DriftCore, DetectRequest, DiscoveryResponse: discoverySchema(),
  DetectResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DriftCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DriftCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'ddd-1780000000000', request_id: 'ddd-1780000000000', computed_at: '2026-06-13T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  baseline: [{ age: 30, tier: 'free' }, { age: 32, tier: 'pro' }, { age: 28, tier: 'free' }, { age: 34, tier: 'pro' }],
  current: [{ age: 30, tier: 'pro' }, { age: 32, tier: 'enterprise' }, { age: 28, tier: 'pro' }, { age: 34, tier: 'enterprise' }],
};
const disc = {
  name: 'Data Drift Detector API', version: '1.0.0',
  description: 'Deterministic data-drift detector. Compares a baseline vs current dataset column-by-column and computes Population Stability Index (PSI), new/dropped categories, and missing-rate shift. Pure statistics, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-drift-detector/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/detect', summary: 'Detect column-level drift (PSI)', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL detect + reasoning', price_usdc: 0.01 },
  ],
  pricing: [
    { path: '/detect', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/detect', summary: 'Detect column-level drift (PSI)', operationId: 'detect', priceUsdc: 0.006,
    requestSchemaRef: 'DetectRequest', responseSchemaRef: 'DetectResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL detect + reasoning', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'DetectRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Compared 2 column(s) across 4 baseline vs 4 current rows; 1 drifted (max PSI 8.5155).',
        key_factors: ['Most drifted: tier (PSI 8.5155).', 'Significant (major) drift present: true.', 'Numeric columns use 10 baseline quantile bins; categorical use frequency PSI.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-drift-detector', title: 'Data Drift Detector API', version: '1.0.0',
  description: 'Deterministic data-drift detector. Compares baseline vs current datasets and computes Population Stability Index (PSI) per column. Pure statistics, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
