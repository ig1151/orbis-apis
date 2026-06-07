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
const IdBatchCore = {
  // NOTE: used as an allOf branch — must NOT set additionalProperties:false
  // (that would reject envelope/tail props from sibling branches). Strictness
  // is enforced by unevaluatedProperties:false on the composite responses.
  type: 'object',
  required: ['format', 'version', 'count', 'ids', 'sortable', 'collision_note'],
  properties: {
    format: { type: 'string', enum: ['uuid', 'ulid'] },
    version: { type: 'string', enum: ['v4', 'ulid'] },
    count: { type: 'integer', minimum: 1, maximum: 1000 },
    ids: { type: 'array', items: { type: 'string' } },
    sortable: { type: 'boolean' },
    collision_note: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk, Tail, IdBatchCore,
  CountRequest: {
    type: 'object', additionalProperties: false,
    properties: { count: { type: 'integer', minimum: 1, maximum: 1000, default: 1, description: 'How many IDs to generate.' } },
  },
  LookupRequest: {
    type: 'object', additionalProperties: false,
    properties: {
      format: { type: 'string', enum: ['uuid', 'ulid'], default: 'uuid' },
      count: { type: 'integer', minimum: 1, maximum: 1000, default: 1 },
    },
  },
  DiscoveryResponse: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'],
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: { type: 'object', required: ['type', 'header'], additionalProperties: false, properties: { type: { type: 'string' }, header: { type: 'string' } } },
      endpoints: { type: 'array', items: { type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false, properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
      pricing: { type: 'array', items: { type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false, properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } } } },
      x402_compatible: { type: 'boolean' },
    },
  },
  BatchResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/IdBatchCore' }, { $ref: '#/components/schemas/Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/IdBatchCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/Tail' },
    ],
    unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/uuid', summary: 'Generate a batch of UUID v4', operationId: 'uuid',
    priceUsdc: 0.002, requestSchemaRef: 'CountRequest', responseSchemaRef: 'BatchResponse',
    requestExample: { count: 3 },
    responseExample: {
      trace_id: 'u1-1780000000000', computed_at: '2026-06-07T19:30:00.000Z', success: true, latency_ms: 0,
      format: 'uuid', version: 'v4', count: 3,
      ids: ['1f3b9c2a-7e4d-4a6b-9c1e-2d5f8a0b3c4d', '2a4c0d3b-8f5e-4b7c-0d2f-3e6a9b1c4d5e', '3b5d1e4c-9a6f-4c8d-1e3a-4f7b0c2d5e6f'],
      sortable: false, collision_note: 'UUID v4 has 122 bits of randomness; collision probability is negligible.',
      confidence_score: 1.0, recommended_actions_priority_order: ['Use as random primary keys or idempotency keys.'],
      chain_to: [], privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/ulid', summary: 'Generate a batch of sortable ULIDs', operationId: 'ulid',
    priceUsdc: 0.002, requestSchemaRef: 'CountRequest', responseSchemaRef: 'BatchResponse',
    requestExample: { count: 2 },
    responseExample: {
      trace_id: 'l1-1780000000000', computed_at: '2026-06-07T19:30:00.000Z', success: true, latency_ms: 0,
      format: 'ulid', version: 'ulid', count: 2,
      ids: ['01J9Z8ABCD0123456789ABCDEF', '01J9Z8ABCD9876543210ZYXWVU'],
      sortable: true, collision_note: 'ULID has 80 bits of randomness per millisecond.',
      confidence_score: 1.0, recommended_actions_priority_order: ['Use as lexicographically-sortable, time-ordered keys.'],
      chain_to: [], privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL generate by format with metadata', operationId: 'lookup',
    priceUsdc: 0.005, oneCall: true, requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse',
    requestExample: { format: 'ulid', count: 5 },
  },
];

const spec = buildAplusSpec({
  slug: 'uuid-ulid-generator',
  title: 'UUID/ULID Batch Generator API',
  description: 'Cryptographically-random UUID v4 and lexicographically-sortable ULID generation in batches (1–1000). Real crypto RNG; deterministic schemas; confidence always 1.0.',
  endpoints,
  schemas,
});

export default specRouter(spec);
