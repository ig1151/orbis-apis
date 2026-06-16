import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema } from '../../_aplus/specparts';
import { scoreExample, lookupExample } from './examples';

const TYPE_ENUM = ['boolean', 'number', 'date', 'string'];
const unit = (description: string) => ({ type: 'number', minimum: 0, maximum: 1, description });

const FieldReport = {
  type: 'object', required: ['name', 'fill_rate', 'placeholder_rate', 'noise_rate', 'truncated_count', 'dominant_type', 'type_consistency'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    fill_rate: unit('Fraction of rows with a non-missing value.'),
    placeholder_rate: unit('Fraction of rows holding a placeholder/boilerplate token.'),
    noise_rate: unit('Fraction of rows with whitespace/HTML-entity/control-char/truncation noise.'),
    truncated_count: { type: 'integer', minimum: 0 },
    dominant_type: { type: ['string', 'null'], enum: [...TYPE_ENUM, null] },
    type_consistency: unit('Share of present values matching the dominant type.'),
  },
};
const Subscores = {
  type: 'object', required: ['completeness', 'uniqueness', 'cleanliness', 'placeholder_freedom', 'consistency'], additionalProperties: false,
  properties: {
    completeness: unit('Non-missing cell rate.'),
    uniqueness: unit('1 − duplicate-row rate.'),
    cleanliness: unit('1 − noisy-cell rate.'),
    placeholder_freedom: unit('1 − placeholder-cell rate.'),
    consistency: unit('Mean per-column dominant-type share.'),
  },
};
const Weights = {
  type: 'object', required: ['completeness', 'uniqueness', 'cleanliness', 'placeholder_freedom', 'consistency'], additionalProperties: false,
  properties: {
    completeness: { type: 'number' }, uniqueness: { type: 'number' }, cleanliness: { type: 'number' },
    placeholder_freedom: { type: 'number' }, consistency: { type: 'number' },
  },
};
const ScoreCore = {
  type: 'object',
  required: ['row_count', 'column_count', 'total_cells', 'duplicate_row_count', 'placeholder_cell_count', 'noise_cell_count', 'missing_cell_count', 'subscores', 'score', 'grade', 'weights_used', 'fields', 'issues'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    column_count: { type: 'integer', minimum: 0 },
    total_cells: { type: 'integer', minimum: 0 },
    duplicate_row_count: { type: 'integer', minimum: 0 },
    placeholder_cell_count: { type: 'integer', minimum: 0 },
    noise_cell_count: { type: 'integer', minimum: 0 },
    missing_cell_count: { type: 'integer', minimum: 0 },
    subscores: Subscores,
    score: { type: 'number', minimum: 0, maximum: 100 },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    weights_used: Weights,
    fields: { type: 'array', items: FieldReport },
    issues: { type: 'array', items: { type: 'string' } },
  },
};
const ScoreRequest = {
  type: 'object', required: ['rows'], additionalProperties: false,
  properties: {
    rows: { type: 'array', minItems: 1, items: rowSchema('A scraped/extracted record (column → value).'), description: 'The scraped dataset to score.' },
    columns: { type: 'array', items: { type: 'string' }, description: 'Optional explicit column list; defaults to the union of row keys.' },
  },
};

const reqEx = {
  rows: [
    { title: 'Widget A', price: '$9.99', url: 'https://shop.com/a', stock: '12' },
    { title: 'Widget B ', price: 'N/A', url: 'https://shop.com/b', stock: '7' },
    { title: 'Tom &amp; Jerry', price: '$14.50', url: 'https://shop.com/c', stock: 'unknown' },
    { title: 'Widget A', price: '$9.99', url: 'https://shop.com/a', stock: '12' },
    { title: 'Long description that was cut o…', price: '', url: 'https://shop.com/e', stock: '3' },
  ],
};
const disc = {
  name: 'Scraped Data Quality Scorer API', version: '1.0.0',
  description: 'Deterministic quality scorer for scraped/extracted datasets. Scores extraction completeness, duplicate extraction, HTML/whitespace noise, placeholder/boilerplate values, and per-column type consistency into a 0–100 score with per-dimension subscores, per-field breakdown and issues. No reference schema, no fetching, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/scraped-data-quality-scorer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/score', summary: 'Score a scraped/extracted dataset', price_usdc: 0.01 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL score + reasoning', price_usdc: 0.018 },
  ],
  pricing: [
    { path: '/score', price_usdc: 0.01, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.018, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('measurement', 'scoring'), _Tail: Tail,
  FieldReport, Subscores, Weights, ScoreCore, ScoreRequest, DiscoveryResponse: discoverySchema(),
  ScoreResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScoreCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScoreCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/score', summary: 'Score a scraped/extracted dataset', operationId: 'score', priceUsdc: 0.01,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'ScoreResponse', requestExample: reqEx,
    responseExample: scoreExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL score + reasoning', operationId: 'lookup', priceUsdc: 0.018, oneCall: true,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'scraped-data-quality-scorer', title: 'Scraped Data Quality Scorer API', version: '1.0.0',
  description: 'Deterministic scraped/extracted-data quality scorer — completeness, duplicate extraction, HTML/whitespace noise, placeholder values, type consistency → 0–100 score + subscores + issues. No schema, no fetching, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
