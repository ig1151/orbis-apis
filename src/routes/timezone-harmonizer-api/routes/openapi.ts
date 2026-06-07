import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';

const EnvelopeOk = {
  type: 'object', required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: {
    trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' },
    success: { type: 'boolean', enum: [true] }, latency_ms: { type: 'integer', minimum: 0 },
  },
};
const Tail = {
  type: 'object', required: ['confidence_score', 'recommended_actions_priority_order', 'chain_to', 'privacy'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    privacy: { $ref: '#/components/schemas/Privacy' },
  },
};
const ZoneTime = {
  type: 'object', required: ['timezone', 'local_time', 'offset_minutes', 'offset_label', 'abbreviation'],
  additionalProperties: false,
  properties: {
    timezone: { type: 'string' }, local_time: { type: 'string', description: 'Wall-clock ISO (no offset) in this zone.' },
    offset_minutes: { type: 'integer' }, offset_label: { type: 'string', example: '-07:00' }, abbreviation: { type: 'string', example: 'PDT' },
  },
};
const InstantString = { type: ['string', 'integer'], description: 'Absolute instant: ISO 8601 with Z/offset, or epoch milliseconds.', example: '2026-06-07T19:30:00Z' };

const schemas = {
  EnvelopeOk, Tail, ZoneTime,
  NormalizeRequest: { type: 'object', required: ['datetime'], additionalProperties: false, properties: { datetime: InstantString } },
  ConvertRequest: { type: 'object', required: ['datetime', 'to_tz'], additionalProperties: false, properties: { datetime: InstantString, to_tz: { type: 'string', example: 'America/Los_Angeles' } } },
  LookupRequest: {
    type: 'object', required: ['datetime', 'to_tzs'], additionalProperties: false,
    properties: { datetime: InstantString, to_tzs: { type: 'array', minItems: 1, maxItems: 25, items: { type: 'string' }, example: ['America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'] } },
  },
  DiscoveryResponse: {
    type: 'object', additionalProperties: false, required: ['name', 'version', 'description', 'openapi_url', 'auth', 'notes', 'endpoints', 'pricing', 'x402_compatible'],
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' }, notes: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: { type: 'object', required: ['type', 'header'], additionalProperties: false, properties: { type: { type: 'string' }, header: { type: 'string' } } },
      endpoints: { type: 'array', items: { type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false, properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
      pricing: { type: 'array', items: { type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false, properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } } } },
      x402_compatible: { type: 'boolean' },
    },
  },
  NormalizeResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { type: 'object', required: ['input', 'utc_iso', 'epoch_ms'], properties: { input: { $ref: '#/components/schemas/NormalizeRequest' }, utc_iso: { type: 'string', format: 'date-time' }, epoch_ms: { type: 'integer' } } },
      { $ref: '#/components/schemas/Tail' },
    ],
    unevaluatedProperties: false,
  },
  ConvertResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { type: 'object', required: ['input', 'utc_iso', 'converted'], properties: { input: { $ref: '#/components/schemas/ConvertRequest' }, utc_iso: { type: 'string', format: 'date-time' }, converted: { $ref: '#/components/schemas/ZoneTime' } } },
      { $ref: '#/components/schemas/Tail' },
    ],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      {
        type: 'object', required: ['input', 'utc_iso', 'epoch_ms', 'zones', 'reasoning'],
        properties: {
          input: { $ref: '#/components/schemas/LookupRequest' }, utc_iso: { type: 'string', format: 'date-time' }, epoch_ms: { type: 'integer' },
          zones: { type: 'array', items: { $ref: '#/components/schemas/ZoneTime' } }, reasoning: { $ref: '#/components/schemas/Reasoning' },
        },
      },
      { $ref: '#/components/schemas/Tail' },
    ],
    unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/normalize', summary: 'Normalize an absolute instant to UTC + epoch', operationId: 'normalize',
    priceUsdc: 0.005, requestSchemaRef: 'NormalizeRequest', responseSchemaRef: 'NormalizeResponse',
    requestExample: { datetime: '2026-06-07T12:30:00-07:00' },
    responseExample: {
      trace_id: 't1-1780000000000', computed_at: '2026-06-07T19:30:00.000Z', success: true, latency_ms: 0,
      input: { datetime: '2026-06-07T12:30:00-07:00' }, utc_iso: '2026-06-07T19:30:00.000Z', epoch_ms: 1780860600000,
      confidence_score: 1.0, recommended_actions_priority_order: ['Store as UTC/epoch; convert to local only for display.'],
      chain_to: [{ api: 'calendar-scheduling', reason: 'Schedule a meeting across the harmonized time zones.' }, { api: 'geo-coordinate-calculator', reason: 'Compute distances between the locations in each zone.' }],
      privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/convert', summary: 'Express an instant in a target timezone', operationId: 'convert',
    priceUsdc: 0.008, requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'ConvertResponse',
    requestExample: { datetime: '2026-06-07T19:30:00Z', to_tz: 'Asia/Tokyo' },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL UTC + many target zones', operationId: 'lookup',
    priceUsdc: 0.015, oneCall: true, requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse',
    requestExample: { datetime: '2026-06-07T19:30:00Z', to_tzs: ['America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'] },
  },
];

const spec = buildAplusSpec({
  slug: 'timezone-harmonizer',
  title: 'Timezone Offset Harmonizer API',
  description: 'Deterministic timezone conversion from absolute instants via the IANA/ICU database: normalize to UTC/epoch and express wall-clock time + offset + abbreviation in any zone. Naive local times are rejected to guarantee correctness. Confidence always 1.0.',
  endpoints,
  schemas,
});

export default specRouter(spec);
