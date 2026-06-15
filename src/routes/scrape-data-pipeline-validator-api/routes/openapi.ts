import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema } from '../../_aplus/specparts';

const TYPE_ENUM = ['string', 'number', 'integer', 'boolean', 'date'];
const FORMAT_ENUM = ['url', 'email', 'date'];
const STATUS_ENUM = ['ok', 'degraded', 'broken'];
const GRADE_ENUM = ['A', 'B', 'C', 'D', 'F'];
const Row = rowSchema();

const FieldReport = {
  type: 'object',
  required: ['name', 'expected_type', 'required', 'format', 'present_count', 'present_rate', 'null_rate', 'type_match_rate', 'format_match_rate', 'coverage_ok', 'issues'],
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    expected_type: { type: ['string', 'null'], enum: [...TYPE_ENUM, null] },
    required: { type: 'boolean' },
    format: { type: ['string', 'null'], enum: [...FORMAT_ENUM, null] },
    present_count: { type: 'integer', minimum: 0 },
    present_rate: { type: 'number', minimum: 0, maximum: 1 },
    null_rate: { type: 'number', minimum: 0, maximum: 1 },
    type_match_rate: { type: ['number', 'null'], minimum: 0, maximum: 1, description: 'Among present values; null when a type is not specified or nothing is present.' },
    format_match_rate: { type: ['number', 'null'], minimum: 0, maximum: 1, description: 'Among present values; null when a format is not specified or nothing is present.' },
    coverage_ok: { type: 'boolean', description: 'present_rate >= min_coverage.' },
    issues: { type: 'array', items: { type: 'string' } },
  },
};
const SelectorHealth = {
  type: 'object', required: ['field', 'selector', 'coverage', 'status'], additionalProperties: false,
  properties: {
    field: { type: 'string' },
    selector: { type: 'string' },
    coverage: { type: 'number', minimum: 0, maximum: 1 },
    status: { type: 'string', enum: STATUS_ENUM, description: 'ok >= min_coverage; degraded if partial; broken if the field is empty in every record.' },
  },
};
const ValidateCore = {
  type: 'object',
  required: ['record_count', 'min_coverage', 'fields', 'selector_health', 'valid_record_count', 'invalid_record_count', 'passed', 'score', 'grade'],
  properties: {
    record_count: { type: 'integer', minimum: 0 },
    min_coverage: { type: 'number', minimum: 0, maximum: 1 },
    fields: { type: 'array', items: FieldReport },
    selector_health: { type: 'array', items: SelectorHealth },
    valid_record_count: { type: 'integer', minimum: 0 },
    invalid_record_count: { type: 'integer', minimum: 0 },
    passed: { type: 'boolean' },
    score: { type: 'number', minimum: 0, maximum: 100 },
    grade: { type: 'string', enum: GRADE_ENUM },
  },
};
const FieldSpec = {
  type: 'object', required: ['name'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: TYPE_ENUM, description: 'Expected value type.' },
    required: { type: 'boolean', description: 'Whether the field must be present (default false).' },
    format: { type: 'string', enum: FORMAT_ENUM, description: 'Optional format check applied to present values.' },
  },
};
const SelectorSpec = {
  type: 'object', required: ['field', 'selector'], additionalProperties: false,
  properties: { field: { type: 'string' }, selector: { type: 'string', description: 'Selector label that should populate this field.' } },
};
const ValidateRequest = {
  type: 'object', required: ['records', 'expected_schema'], additionalProperties: false,
  properties: {
    records: { type: 'array', items: Row, minItems: 1, description: 'Scrape output records to validate.' },
    expected_schema: {
      type: 'object', required: ['fields'], additionalProperties: false,
      properties: { fields: { type: 'array', items: FieldSpec, minItems: 1 } },
      description: 'Expected field schema.',
    },
    selectors: { type: 'array', items: SelectorSpec, description: 'Optional selector→field map for coverage health.' },
    min_coverage: { type: 'number', minimum: 0, maximum: 1, description: 'Coverage threshold for required fields & selector health (default 0.9).' },
  },
};

const CORE = {
  record_count: 3, min_coverage: 0.9,
  fields: [
    { name: 'title', expected_type: 'string', required: true, format: null, present_count: 3, present_rate: 1, null_rate: 0, type_match_rate: 1, format_match_rate: null, coverage_ok: true, issues: [] },
    { name: 'price', expected_type: 'number', required: true, format: null, present_count: 3, present_rate: 1, null_rate: 0, type_match_rate: 0.6667, format_match_rate: null, coverage_ok: true, issues: ['1 value(s) do not match type "number".'] },
    { name: 'url', expected_type: 'string', required: true, format: 'url', present_count: 3, present_rate: 1, null_rate: 0, type_match_rate: 1, format_match_rate: 0.6667, coverage_ok: true, issues: ['1 value(s) do not match format "url".'] },
    { name: 'sku', expected_type: 'string', required: true, format: null, present_count: 0, present_rate: 0, null_rate: 1, type_match_rate: null, format_match_rate: null, coverage_ok: false, issues: ['required field present in only 0.0% of records (< 90% threshold).'] },
  ],
  selector_health: [
    { field: 'price', selector: '.price', coverage: 1, status: 'ok' },
    { field: 'sku', selector: '.sku', coverage: 0, status: 'broken' },
  ],
  valid_record_count: 0, invalid_record_count: 3, passed: false, score: 68.1, grade: 'D',
};
const CHAIN = [
  { api: 'scrape-data-enricher', reason: 'Backfill/repair the failing fields with deterministic enrichment rules.' },
  { api: 'data-quality-rules', reason: 'Codify the expected schema as reusable not-null/range/regex rules.' },
];
const INVALIDATORS = [
  'Validity is measured only against the supplied expected_schema; fields not listed are ignored and extra columns are not penalized.',
  'A "broken" selector means its mapped field was empty in every record — a strong signal the selector changed, but this API does not fetch the page to confirm.',
  'score blends presence + type + format equally per field; passed requires zero invalid records AND no broken selectors (stricter than the score alone).',
];
const TAIL = {
  confidence_score: 0.85, confidence_per_section: { validation: 1, scoring: 0.85 },
  recommended_actions_priority_order: [
    '0/3 record(s) valid — score 68.1/100 (D), FAILED.',
    'Likely broken selector(s): .sku — the mapped field was empty in every record.',
    'Fields with issues: price, url, sku — see per-field issues.',
    'Chain to scrape-data-enricher to repair fields or data-quality-rules to codify the schema.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('validation', 'scoring'), _Tail: Tail,
  FieldReport, SelectorHealth, ValidateCore, FieldSpec, SelectorSpec, ValidateRequest, DiscoveryResponse: discoverySchema(),
  ValidateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidateCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidateCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'spv-1780000000000', request_id: 'spv-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  records: [
    { title: 'Widget A', price: '9.99', url: 'https://shop.com/a' },
    { title: 'Widget B', price: 'N/A', url: 'https://shop.com/b' },
    { title: 'Widget C', price: '14.50', url: 'not-a-url' },
  ],
  expected_schema: {
    fields: [
      { name: 'title', type: 'string', required: true },
      { name: 'price', type: 'number', required: true },
      { name: 'url', type: 'string', required: true, format: 'url' },
      { name: 'sku', type: 'string', required: true },
    ],
  },
  selectors: [
    { field: 'price', selector: '.price' },
    { field: 'sku', selector: '.sku' },
  ],
  min_coverage: 0.9,
};
const disc = {
  name: 'Scrape Data Pipeline Validator API', version: '1.0.0',
  description: 'Deterministic scrape-data pipeline validator. Checks scraped output against an expected schema (presence/type/format) and optional selector→field coverage, returning per-field reports, per-record validity, a 0–100 score, and pass/fail. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/scrape-data-pipeline-validator/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/validate', summary: 'Validate scrape output vs expected schema/selectors', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL validate + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/validate', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/validate', summary: 'Validate scrape output vs expected schema/selectors', operationId: 'validate', priceUsdc: 0.007,
    requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'ValidateResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL validate + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Validated 3 record(s) against 4 expected field(s): 0 valid, score 68.1/100.',
        key_factors: ['Pass/fail: FAILED (grade D).', 'Fields with issues: price, url, sku.', 'Selector health: .price=ok, .sku=broken.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'scrape-data-pipeline-validator', title: 'Scrape Data Pipeline Validator API', version: '1.0.0',
  description: 'Deterministic scrape-data pipeline validator — scrape output vs expected schema/selectors → per-field reports, validity, score, pass/fail. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
