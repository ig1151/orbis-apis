import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema } from '../../_aplus/specparts';

const Dimension = {
  type: 'object', required: ['score', 'weight', 'detail'], additionalProperties: false,
  properties: { score: { type: 'number', minimum: 0, maximum: 1 }, weight: { type: 'number', minimum: 0, maximum: 1 }, detail: { type: 'string' } },
};
const Dimensions = {
  type: 'object', required: ['completeness', 'consistency', 'uniqueness', 'validity'], additionalProperties: false,
  properties: {
    completeness: Dimension, consistency: Dimension, uniqueness: Dimension,
    validity: { oneOf: [Dimension, { type: 'null' }] },
  },
};
const WeightsUsed = {
  type: 'object', additionalProperties: false, required: ['completeness', 'consistency', 'uniqueness'],
  properties: {
    completeness: { type: 'number', minimum: 0, maximum: 1 },
    consistency: { type: 'number', minimum: 0, maximum: 1 },
    uniqueness: { type: 'number', minimum: 0, maximum: 1 },
    validity: { type: 'number', minimum: 0, maximum: 1 },
  },
};
const ScoreCore = {
  type: 'object',
  required: ['row_count', 'column_count', 'dimensions', 'weighting_profile', 'weights_used', 'quality_score', 'grade', 'passed', 'top_issues'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    column_count: { type: 'integer', minimum: 0 },
    dimensions: Dimensions,
    weighting_profile: { type: 'string', description: 'Identifier of the weight set used to blend the dimensions.' },
    weights_used: WeightsUsed,
    quality_score: { type: 'integer', minimum: 0, maximum: 100 },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    passed: { type: 'boolean' },
    top_issues: { type: 'array', items: { type: 'string' } },
  },
};
const Row = rowSchema();
const ScoreRequest = {
  type: 'object', required: ['rows'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to score.' },
    columns: { type: 'array', items: { type: 'string' }, description: 'Optional explicit column list (default: union of row keys).' },
    expected_types: { type: 'object', description: 'Optional map column → expected type (string/number/integer/boolean/date); enables the validity dimension.' },
  },
};

const CORE = {
  row_count: 4, column_count: 3, quality_score: 90, grade: 'A', passed: true,
  dimensions: {
    completeness: { score: 0.8333, weight: 0.3, detail: '10/12 non-missing cells.' },
    consistency: { score: 1, weight: 0.25, detail: 'Mean dominant-type share across 3 column(s).' },
    uniqueness: { score: 0.75, weight: 0.2, detail: '1 duplicate row(s) of 4.' },
    validity: { score: 1, weight: 0.25, detail: '4/4 present cell(s) match the expected type across 1 column(s).' },
  },
  weighting_profile: 'default',
  weights_used: { completeness: 0.3, consistency: 0.25, uniqueness: 0.2, validity: 0.25 },
  top_issues: ['Completeness 83.3% (sparsest: phone).', '1 duplicate row(s) (25%).'],
};
const CHAIN = [
  { api: 'data-completeness-checker', reason: 'Drill into the completeness dimension column-by-column.' },
  { api: 'data-quality-rules', reason: 'Enforce the failing dimensions as hard rules in your pipeline.' },
];
const INVALIDATORS = [
  'The dimension measures are exact, but the blend weights (completeness .3, consistency .25, uniqueness .2, validity .25) are a heuristic — reweight for your domain.',
  'Validity is scored only when "expected_types" is supplied; otherwise its weight is redistributed across the other dimensions.',
  'Uniqueness is full-row duplication over the scored columns; a legitimately repeated row (e.g. event logs) will lower it.',
];
const TAIL = {
  confidence_score: 0.8, confidence_per_section: { measures: 1, weighting: 0.8 },
  recommended_actions_priority_order: [
    'Pipeline quality 90/100 (grade A); passes the 80 promotion gate.',
    'Address: Completeness 83.3% (sparsest: phone).',
    'Address: 1 duplicate row(s) (25%).',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('measures', 'weighting'), _Tail: Tail,
  Dimension, Dimensions, WeightsUsed, ScoreCore, ScoreRequest, DiscoveryResponse: discoverySchema(),
  ScoreResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScoreCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScoreCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dpq-1780000000000', request_id: 'dpq-1780000000000', computed_at: '2026-06-13T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  rows: [
    { id: 1, tier: 'free', phone: '555-1' },
    { id: 2, tier: 'pro', phone: '555-2' },
    { id: 3, tier: 'pro', phone: '' },
    { id: 3, tier: 'pro', phone: '' },
  ],
  expected_types: { id: 'integer' },
};
const disc = {
  name: 'Data Pipeline Quality Scorer API', version: '1.0.0',
  description: 'Deterministic data-pipeline quality scorer. Blends completeness, type-consistency, row-uniqueness, and optional type-validity into a weighted 0–100 score with a grade and top issues. Exact measures, heuristic weights, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-pipeline-quality-scorer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/score', summary: 'Score dataset quality', price_usdc: 0.01 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL score + reasoning', price_usdc: 0.018 },
  ],
  pricing: [
    { path: '/score', price_usdc: 0.01, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.018, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/score', summary: 'Score dataset quality', operationId: 'score', priceUsdc: 0.01,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'ScoreResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL score + reasoning', operationId: 'lookup', priceUsdc: 0.018, oneCall: true,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Blended 4 dimension(s) over 4 row(s) × 3 column(s) → 90/100 (grade A).',
        key_factors: ['Completeness 0.8333, consistency 1, uniqueness 0.75, validity 1.', 'Passes 80 gate: true.', 'Top issue: Completeness 83.3% (sparsest: phone).'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-pipeline-quality-scorer', title: 'Data Pipeline Quality Scorer API', version: '1.0.0',
  description: 'Deterministic data-pipeline quality scorer — blends completeness, consistency, uniqueness, and optional validity into a weighted 0–100 score. Exact measures, heuristic weights, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
