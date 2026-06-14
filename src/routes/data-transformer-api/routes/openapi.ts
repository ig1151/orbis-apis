import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema, CellValue } from '../../_aplus/specparts';

const PRED_ENUM = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'not_null', 'is_null'];
const Row = rowSchema();
const FailureCodes = {
  type: 'object', required: ['non_numeric_operand', 'divide_by_zero'], additionalProperties: false,
  properties: {
    non_numeric_operand: { type: 'integer', minimum: 0, description: 'Rows where an operand could not be parsed as a number; result set to null.' },
    divide_by_zero: { type: 'integer', minimum: 0, description: 'Rows where a "/" operation hit a zero divisor; result set to null.' },
  },
};
const OpResult = {
  type: 'object', required: ['op', 'detail'], additionalProperties: false,
  properties: {
    op: { type: 'string', enum: ['concat', 'arithmetic', 'split', 'filter'] },
    detail: { type: 'string' },
    rows_removed: { type: 'integer', minimum: 0 },
    cells_written: { type: 'integer', minimum: 0 },
    failures: { type: 'integer', minimum: 0 },
    failure_codes: { ...FailureCodes, description: 'Failure breakdown for arithmetic ops (present only on arithmetic).' },
  },
};
const TransformCore = {
  type: 'object', required: ['rows_in', 'rows_out', 'operations_applied', 'per_operation', 'rows'],
  properties: {
    rows_in: { type: 'integer', minimum: 0 },
    rows_out: { type: 'integer', minimum: 0 },
    operations_applied: { type: 'integer', minimum: 0 },
    per_operation: { type: 'array', items: OpResult },
    rows: { type: 'array', items: Row },
  },
};
// Each operation variant is closed and discriminated by "op".
const ConcatOp = { type: 'object', additionalProperties: false, required: ['op', 'target', 'columns'], properties: { op: { const: 'concat' }, target: { type: 'string' }, columns: { type: 'array', minItems: 1, items: { type: 'string' } }, separator: { type: 'string' } } };
const ArithOp = { type: 'object', additionalProperties: false, required: ['op', 'target', 'columns', 'operator'], properties: { op: { const: 'arithmetic' }, target: { type: 'string' }, columns: { type: 'array', minItems: 1, items: { type: 'string' } }, operator: { type: 'string', enum: ['+', '-', '*', '/'] } } };
const SplitOp = { type: 'object', additionalProperties: false, required: ['op', 'column', 'separator', 'into'], properties: { op: { const: 'split' }, column: { type: 'string' }, separator: { type: 'string' }, into: { type: 'array', minItems: 1, items: { type: 'string' } } } };
const FilterOp = { type: 'object', additionalProperties: false, required: ['op', 'column', 'predicate'], properties: { op: { const: 'filter' }, column: { type: 'string' }, predicate: { type: 'string', enum: PRED_ENUM }, value: { ...CellValue, description: 'Comparison value (array for the "in" predicate; omit for not_null/is_null).' } } };
const Operation = { oneOf: [ConcatOp, ArithOp, SplitOp, FilterOp], description: 'A declarative transform; shape depends on "op".' };
const TransformRequest = {
  type: 'object', required: ['rows', 'operations'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to transform.' },
    operations: { type: 'array', items: Operation, minItems: 1, description: 'Ordered transform pipeline.' },
  },
};

const CORE = {
  rows_in: 3, rows_out: 2, operations_applied: 3,
  per_operation: [
    { op: 'concat', detail: 'first+last → full_name', cells_written: 3 },
    { op: 'arithmetic', detail: 'qty * price → total', cells_written: 3, failures: 0, failure_codes: { non_numeric_operand: 0, divide_by_zero: 0 } },
    { op: 'filter', detail: 'total gt 0', rows_removed: 1 },
  ],
  rows: [
    { first: 'Ann', last: 'Lee', qty: '2', price: '10', full_name: 'Ann Lee', total: 20 },
    { first: 'Bob', last: 'Ng', qty: '3', price: '5', full_name: 'Bob Ng', total: 15 },
  ],
};
const CHAIN = [
  { api: 'data-aggregator', reason: 'Group and aggregate the transformed rows.' },
  { api: 'data-quality-rules', reason: 'Validate the derived columns before promoting downstream.' },
];
const INVALIDATORS = [
  'Operations run in order; a filter early in the pipeline changes which rows later derivations see.',
  'arithmetic / numeric predicates use numeric parsing (numeric strings accepted); a non-numeric operand sets the derived value to null (counted in failures) and division by zero yields null.',
  'concat/split coerce values to strings; missing values become "" in concat and null in split target columns. No expressions are evaluated.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { transformation: 1 },
  recommended_actions_priority_order: [
    'Applied 3 operation(s): 3 → 2 row(s).',
    'Chain to data-aggregator or data-quality-rules on the transformed rows.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('transformation'), _Tail: Tail,
  OpResult, TransformCore, Operation, TransformRequest, DiscoveryResponse: discoverySchema(),
  TransformResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TransformCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TransformCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dtf-1780000000000', request_id: 'dtf-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  rows: [
    { first: 'Ann', last: 'Lee', qty: '2', price: '10' },
    { first: 'Bob', last: 'Ng', qty: '3', price: '5' },
    { first: 'Cy', last: 'Xu', qty: '0', price: '9' },
  ],
  operations: [
    { op: 'concat', target: 'full_name', columns: ['first', 'last'], separator: ' ' },
    { op: 'arithmetic', target: 'total', columns: ['qty', 'price'], operator: '*' },
    { op: 'filter', column: 'total', predicate: 'gt', value: 0 },
  ],
};
const disc = {
  name: 'Data Transformer API', version: '1.0.0',
  description: 'Deterministic data transformer. Applies an ordered pipeline of declarative row transforms (concat, arithmetic, split, filter) and returns the transformed rows with a per-operation effect summary. No expression eval, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-transformer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/transform', summary: 'Transform dataset rows', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL transform + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/transform', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/transform', summary: 'Transform dataset rows', operationId: 'transform', priceUsdc: 0.007,
    requestSchemaRef: 'TransformRequest', responseSchemaRef: 'TransformResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL transform + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'TransformRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Ran 3 operation(s) over 3 row(s) → 2 row(s).',
        key_factors: ['concat: first+last → full_name (wrote 3).', 'arithmetic: qty * price → total (wrote 3).', 'filter: total gt 0 (removed 1).'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-transformer', title: 'Data Transformer API', version: '1.0.0',
  description: 'Deterministic data transformer — ordered declarative pipeline (concat/arithmetic/split/filter) returning transformed rows. No expression eval, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
