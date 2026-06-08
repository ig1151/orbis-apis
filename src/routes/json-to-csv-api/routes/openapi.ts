import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';

const EnvelopeOk = {
  type: 'object',
  required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: {
    trace_id: { type: 'string' },
    computed_at: { type: 'string', format: 'date-time' },
    success: { type: 'boolean', enum: [true] },
    latency_ms: { type: 'integer', minimum: 0 },
  },
};

const CsvCore = {
  type: 'object',
  required: ['output', 'output_format', 'row_count', 'column_count', 'columns', 'delimiter'],
  // allOf branch — strictness via unevaluatedProperties:false on the composite.
  properties: {
    output: { type: 'string', description: 'Serialized data in the requested format: RFC 4180 CSV, a JSON array, or newline-delimited JSON (JSONL).' },
    output_format: { type: 'string', enum: ['csv', 'json', 'jsonl'], description: 'The format of the "output" field.' },
    row_count: { type: 'integer', minimum: 0 },
    column_count: { type: 'integer', minimum: 0 },
    columns: { type: 'array', items: { type: 'string' } },
    delimiter: { type: 'string', description: 'Field delimiter (applies to CSV output).' },
  },
};

const Tail = {
  type: 'object',
  required: ['confidence_score', 'recommended_actions_priority_order', 'chain_to', 'privacy'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    privacy: { $ref: '#/components/schemas/Privacy' },
  },
};

const ConvertRequest = {
  type: 'object', required: ['data'], additionalProperties: false,
  properties: {
    data: {
      description: 'A JSON object or an array of JSON objects (max 10000 rows).',
      oneOf: [{ type: 'object' }, { type: 'array', items: { type: 'object' } }],
    },
    delimiter: { type: 'string', minLength: 1, maxLength: 1, default: ',', description: 'Single-character field delimiter (CSV only).' },
    include_header: { type: 'boolean', default: true, description: 'Emit a header row (CSV only).' },
    flatten: { type: 'boolean', default: true, description: 'Flatten nested objects with dot-notation keys.' },
    output: { type: 'string', enum: ['csv', 'json', 'jsonl'], default: 'csv', description: 'Output wire format: CSV (RFC 4180), a JSON array, or newline-delimited JSON (JSONL).' },
  },
};

const schemas = {
  EnvelopeOk,
  CsvCore,
  _Tail: Tail,
  ConvertRequest,
  LookupRequest: ConvertRequest,
  DiscoveryResponse: {
    type: 'object',
    required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'],
    additionalProperties: false,
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: {
        type: 'object', required: ['type', 'header'], additionalProperties: false,
        properties: { type: { type: 'string' }, header: { type: 'string' } },
      },
      endpoints: {
        type: 'array',
        items: {
          type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false,
          properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } },
        },
      },
      pricing: {
        type: 'array',
        items: {
          type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false,
          properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } },
        },
      },
      x402_compatible: { type: 'boolean' },
    },
  },
  ConvertResponse: {
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CsvCore' }, { $ref: '#/components/schemas/_Tail' }],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/CsvCore' },
      {
        type: 'object',
        required: ['column_types', 'reasoning'],
        properties: {
          column_types: {
            type: 'object',
            additionalProperties: { type: 'string', enum: ['string', 'number', 'boolean', 'json', 'null', 'mixed'] },
            description: 'Inferred type per column across all rows.',
          },
          reasoning: { $ref: '#/components/schemas/Reasoning' },
        },
      },
      { $ref: '#/components/schemas/_Tail' },
    ],
    unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/convert', summary: 'Convert a JSON array of objects to CSV, JSON, or JSONL', operationId: 'convert',
    priceUsdc: 0.005, requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'ConvertResponse',
    requestExample: { data: [{ id: 1, user: { name: 'Ada' } }, { id: 2, user: { name: 'Lin' } }], output: 'csv' },
    responseExample: {
      trace_id: 'j1-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      output: 'id,user.name\n1,Ada\n2,Lin', output_format: 'csv', row_count: 2, column_count: 2, columns: ['id', 'user.name'], delimiter: ',',
      confidence_score: 1.0,
      recommended_actions_priority_order: ['Converted 2 row(s) across 2 column(s) to CSV.', 'Use /lookup to also receive inferred column types.'],
      chain_to: [], privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL convert + column type inference + reasoning', operationId: 'lookup',
    priceUsdc: 0.015, oneCall: true, requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse',
    requestExample: { data: [{ id: 1, active: true }, { id: 2, active: false }], output: 'jsonl' },
    responseExample: {
      trace_id: 'j2-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      output: '{"id":1,"active":true}\n{"id":2,"active":false}', output_format: 'jsonl', row_count: 2, column_count: 2, columns: ['id', 'active'], delimiter: ',',
      column_types: { id: 'number', active: 'boolean' },
      reasoning: {
        why_result_generated: 'Flattened 2 object(s), unioned 2 column(s), and serialized to JSONL.',
        key_factors: ['nested objects flattened with dot notation', 'arrays serialized as JSON strings', 'output format jsonl'],
        invalidators: ['Rows that are not JSON objects.', 'Expecting a non-dot flattening convention.'],
      },
      confidence_score: 1.0,
      recommended_actions_priority_order: ['Converted 2 row(s) across 2 column(s) to JSONL.', 'Map column_types to your destination schema before import.'],
      chain_to: [], privacy: { data_stored: false, retention: 'none' },
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'json-to-csv',
  title: 'JSON to CSV API',
  version: '1.1.0',
  description: 'Deterministic JSON-array conversion to CSV (RFC 4180), JSON, or JSONL with nested-object flattening (dot notation) and per-column type inference. Pure code; deterministic schemas; confidence always 1.0.',
  endpoints,
  schemas,
});

export default specRouter(spec);
