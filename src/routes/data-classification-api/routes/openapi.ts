import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema } from '../../_aplus/specparts';

const SEMANTIC_ENUM = ['uuid', 'email', 'url', 'ipv4', 'credit_card', 'ssn', 'zip_code', 'phone', 'datetime', 'date', 'currency', 'boolean', 'integer', 'number', 'json', 'free_text', 'empty'];
const INFERRED_ENUM = ['empty', 'boolean', 'integer', 'number', 'date', 'string'];
const Row = rowSchema();
const ColumnClass = {
  type: 'object',
  required: ['column', 'inferred_type', 'semantic_type', 'pii', 'pii_category', 'match_rate', 'sample_size', 'distinct_count'],
  additionalProperties: false,
  properties: {
    column: { type: 'string' },
    inferred_type: { type: 'string', enum: INFERRED_ENUM },
    semantic_type: { type: 'string', enum: SEMANTIC_ENUM },
    pii: { type: 'boolean' },
    pii_category: { type: ['string', 'null'], enum: ['contact', 'network_identifier', 'financial', 'national_id', null] },
    match_rate: { type: 'number', minimum: 0, maximum: 1 },
    sample_size: { type: 'integer', minimum: 0 },
    distinct_count: { type: 'integer', minimum: 0 },
  },
};
const ClassifyCore = {
  type: 'object', required: ['row_count', 'column_count', 'pii_column_count', 'pii_columns', 'columns'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    column_count: { type: 'integer', minimum: 0 },
    pii_column_count: { type: 'integer', minimum: 0 },
    pii_columns: { type: 'array', items: { type: 'string' } },
    columns: { type: 'array', items: ColumnClass },
  },
};
const ClassifyRequest = {
  type: 'object', required: ['rows'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to classify.' },
    columns: { type: 'array', items: { type: 'string' }, description: 'Optional explicit column list (default: union of row keys).' },
  },
};

const CORE = {
  row_count: 3, column_count: 4, pii_column_count: 2, pii_columns: ['email', 'phone'],
  columns: [
    { column: 'email', inferred_type: 'string', semantic_type: 'email', pii: true, pii_category: 'contact', match_rate: 1, sample_size: 3, distinct_count: 3 },
    { column: 'phone', inferred_type: 'string', semantic_type: 'phone', pii: true, pii_category: 'contact', match_rate: 1, sample_size: 3, distinct_count: 3 },
    { column: 'age', inferred_type: 'integer', semantic_type: 'integer', pii: false, pii_category: null, match_rate: 1, sample_size: 3, distinct_count: 3 },
    { column: 'note', inferred_type: 'string', semantic_type: 'free_text', pii: false, pii_category: null, match_rate: 0, sample_size: 3, distinct_count: 3 },
  ],
};
const CHAIN = [
  { api: 'data-quality-rules', reason: 'Turn semantic types into regex/format validation rules.' },
  { api: 'data-normalizer', reason: 'Canonicalize detected emails/phones/dates before storage.' },
];
const INVALIDATORS = [
  'Classification is heuristic (regex + Luhn checksum), not authoritative: a 9-digit id can read as a phone, and free-form text columns may be mislabeled. Verify before acting on PII flags.',
  'A column is labeled only if at least 80% of sampled non-missing values match a detector; columns are sampled to the first 2000 values for speed.',
  'PII detection finds format-based identifiers (email/phone/ssn/credit_card/ip) only — it does NOT detect names, addresses, or free-text PII, so absence of a flag is not proof a column is PII-free.',
];
const TAIL = {
  confidence_score: 0.8, confidence_per_section: { classification: 0.85, pii_detection: 0.8 },
  recommended_actions_priority_order: [
    '2 likely-PII column(s): email, phone — review handling/encryption/retention before storing.',
    'Use the semantic types to generate validation rules (chain to data-quality-rules).',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('classification', 'pii_detection'), _Tail: Tail,
  ColumnClass, ClassifyCore, ClassifyRequest, DiscoveryResponse: discoverySchema(),
  ClassifyResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ClassifyCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ClassifyCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dcl-1780000000000', request_id: 'dcl-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  rows: [
    { email: 'a@x.com', phone: '555-123-4567', age: '30', note: 'hello world' },
    { email: 'b@y.com', phone: '555-987-6543', age: '41', note: 'foo bar baz' },
    { email: 'c@z.com', phone: '555-111-2222', age: '22', note: 'lorem ipsum' },
  ],
};
const disc = {
  name: 'Data Classification API', version: '1.0.0',
  description: 'Deterministic data classifier. Infers a per-column semantic type and PII flag/category from regex and checksum heuristics over the values. Heuristic, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-classification/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/classify', summary: 'Classify dataset columns (semantic + PII)', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL classify + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/classify', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/classify', summary: 'Classify dataset columns (semantic + PII)', operationId: 'classify', priceUsdc: 0.007,
    requestSchemaRef: 'ClassifyRequest', responseSchemaRef: 'ClassifyResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL classify + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'ClassifyRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Classified 4 column(s) over 3 row(s); 2 flagged as likely PII.',
        key_factors: ['email: email [PII:contact] (match 1).', 'phone: phone [PII:contact] (match 1).', 'age: integer (match 1).', 'note: free_text (match 0).'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-classification', title: 'Data Classification API', version: '1.0.0',
  description: 'Deterministic data classifier — per-column semantic type + PII flag from regex/checksum heuristics. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
