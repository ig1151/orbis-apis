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
  required: ['csv', 'row_count', 'column_count', 'columns', 'delimiter'],
  // allOf branch — strictness via unevaluatedProperties:false on the composite.
  properties: {
    csv: { type: 'string' },
    row_count: { type: 'integer', minimum: 0 },
    column_count: { type: 'integer', minimum: 0 },
    columns: { type: 'array', items: { type: 'string' } },
    delimiter: { type: 'string' },
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
    delimiter: { type: 'string', minLength: 1, maxLength: 1, default: ',', description: 'Single-character field delimiter.' },
    include_header: { type: 'boolean', default: true },
    flatten: { type: 'boolean', default: true, description: 'Flatten nested objects with dot-notation keys.' },
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
    method: 'post', path: '/convert', summary: 'Convert a JSON array of objects to CSV', operationId: 'convert',
    priceUsdc: 0.003, requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'ConvertResponse',
    requestExample: { data: [{ id: 1, user: { name: 'Ada' } }, { id: 2, user: { name: 'Lin' } }] },
    responseExample: {
      trace_id: 'j1-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      csv: 'id,user.name\n1,Ada\n2,Lin', row_count: 2, column_count: 2, columns: ['id', 'user.name'], delimiter: ',',
      confidence_score: 1.0,
      recommended_actions_priority_order: ['Converted 2 row(s) across 2 column(s).', 'Use /lookup to also receive inferred column types.'],
      chain_to: [], privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL convert + column type inference + reasoning', operationId: 'lookup',
    priceUsdc: 0.008, oneCall: true, requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse',
    requestExample: { data: [{ id: 1, active: true }, { id: 2, active: false }] },
    responseExample: {
      trace_id: 'j2-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      csv: 'id,active\n1,true\n2,false', row_count: 2, column_count: 2, columns: ['id', 'active'], delimiter: ',',
      column_types: { id: 'number', active: 'boolean' },
      reasoning: {
        why_result_generated: 'Flattened 2 object(s), unioned 2 column(s), and serialized to RFC 4180 CSV.',
        key_factors: ['nested objects flattened with dot notation', 'arrays serialized as JSON strings', 'delimiter ","'],
        invalidators: ['Rows that are not JSON objects.', 'Expecting a non-dot flattening convention.'],
      },
      confidence_score: 1.0,
      recommended_actions_priority_order: ['Converted 2 row(s) across 2 column(s).', 'Map column_types to your destination schema before import.'],
      chain_to: [], privacy: { data_stored: false, retention: 'none' },
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'json-to-csv',
  title: 'JSON to CSV API',
  description: 'Deterministic JSON-array to CSV conversion with nested-object flattening (dot notation), RFC 4180 quoting, and per-column type inference. Pure code; deterministic schemas; confidence always 1.0.',
  endpoints,
  schemas,
});

export default specRouter(spec);
