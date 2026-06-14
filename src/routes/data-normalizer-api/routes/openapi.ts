import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema } from '../../_aplus/specparts';

const OP_ENUM = ['trim', 'collapse_whitespace', 'lowercase', 'uppercase', 'title_case', 'strip_accents', 'nfc', 'nfkc', 'remove_punctuation', 'remove_non_numeric', 'to_number', 'to_integer', 'to_boolean', 'to_date_iso'];
const Row = rowSchema();
const ColumnNorm = {
  type: 'object', required: ['column', 'operations', 'cells_changed', 'cells_type_changed'], additionalProperties: false,
  properties: {
    column: { type: 'string' },
    operations: { type: 'array', items: { type: 'string', enum: OP_ENUM } },
    cells_changed: { type: 'integer', minimum: 0 },
    cells_type_changed: { type: 'integer', minimum: 0, description: 'Subset of cells_changed whose JSON type changed (coercion, e.g. string→number/boolean/date).' },
  },
};
const NormalizeCore = {
  type: 'object', required: ['row_count', 'columns_normalized', 'total_cells_changed', 'total_cells_type_changed', 'per_column', 'rows'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    columns_normalized: { type: 'integer', minimum: 0 },
    total_cells_changed: { type: 'integer', minimum: 0 },
    total_cells_type_changed: { type: 'integer', minimum: 0, description: 'Total cells whose JSON type changed via coercion ops (to_number/to_integer/to_boolean/to_date_iso).' },
    per_column: { type: 'array', items: ColumnNorm },
    rows: { type: 'array', items: Row },
  },
};
const NormRule = {
  type: 'object', required: ['column', 'operations'], additionalProperties: false,
  properties: {
    column: { type: 'string' },
    operations: { type: 'array', minItems: 1, items: { type: 'string', enum: OP_ENUM } },
  },
};
const NormalizeRequest = {
  type: 'object', required: ['rows', 'rules'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to normalize.' },
    rules: { type: 'array', items: NormRule, minItems: 1, description: 'Ordered per-column normalization operations.' },
  },
};

const CORE = {
  row_count: 2, columns_normalized: 2, total_cells_changed: 4, total_cells_type_changed: 0,
  per_column: [
    { column: 'name', operations: ['trim', 'title_case'], cells_changed: 2, cells_type_changed: 0 },
    { column: 'city', operations: ['strip_accents', 'lowercase'], cells_changed: 2, cells_type_changed: 0 },
  ],
  rows: [{ name: 'Alice', city: 'sao paulo' }, { name: 'Bob', city: 'sao paulo' }],
};
const CHAIN = [
  { api: 'data-quality-rules', reason: 'Validate the normalized dataset against not_null/type/regex rules.' },
  { api: 'data-classification', reason: 'Re-infer column semantics now that values are canonicalized.' },
];
const INVALIDATORS = [
  'Operations apply in the given order; reordering (e.g. lowercase before strip_accents) can change the result.',
  'String operations coerce the value to a string first, so applying e.g. trim to a number returns a string; use to_number/to_integer last to convert back.',
  'null/undefined values pass through unchanged (no fabrication); empty strings ARE normalized. to_number/to_date_iso leave unparseable values as-is.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { normalization: 1 },
  recommended_actions_priority_order: [
    'Normalized 4 cell(s) across 2 column(s); most changes in "name" (2).',
    'Persist the returned rows or chain to data-quality-rules to confirm conformance.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('normalization'), _Tail: Tail,
  ColumnNorm, NormalizeCore, NormRule, NormalizeRequest, DiscoveryResponse: discoverySchema(),
  NormalizeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/NormalizeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/NormalizeCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dnm-1780000000000', request_id: 'dnm-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  rows: [{ name: '  Alice  ', city: 'são paulo' }, { name: 'BOB', city: 'SÃO PAULO' }],
  rules: [
    { column: 'name', operations: ['trim', 'title_case'] },
    { column: 'city', operations: ['strip_accents', 'lowercase'] },
  ],
};
const disc = {
  name: 'Data Normalizer API', version: '1.0.0',
  description: 'Deterministic data normalizer. Applies ordered canonicalization operations (whitespace, case, unicode, number, boolean, date) per column and returns normalized rows with per-column change counts. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-normalizer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/normalize', summary: 'Normalize a dataset', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL normalize + reasoning', price_usdc: 0.011 },
  ],
  pricing: [
    { path: '/normalize', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/normalize', summary: 'Normalize a dataset', operationId: 'normalize', priceUsdc: 0.006,
    requestSchemaRef: 'NormalizeRequest', responseSchemaRef: 'NormalizeResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL normalize + reasoning', operationId: 'lookup', priceUsdc: 0.011, oneCall: true,
    requestSchemaRef: 'NormalizeRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Applied normalization rules to 2 column(s) over 2 row(s); 4 cell(s) changed.',
        key_factors: ['name: [trim → title_case] changed 2.', 'city: [strip_accents → lowercase] changed 2.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-normalizer', title: 'Data Normalizer API', version: '1.0.0',
  description: 'Deterministic data normalizer — ordered per-column canonicalization (whitespace/case/unicode/number/boolean/date) returning normalized rows. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
