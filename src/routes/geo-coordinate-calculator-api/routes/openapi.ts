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
const Point = {
  type: 'object', required: ['lat', 'lon'], additionalProperties: false,
  properties: { lat: { type: 'number', minimum: -90, maximum: 90 }, lon: { type: 'number', minimum: -180, maximum: 180 } },
};
const Unit = { type: 'string', enum: ['km', 'mi', 'm', 'nmi'], default: 'km' };

const schemas = {
  EnvelopeOk, Tail, Point,
  DistanceRequest: {
    type: 'object', required: ['from', 'to'], additionalProperties: false,
    properties: { from: { $ref: '#/components/schemas/Point' }, to: { $ref: '#/components/schemas/Point' }, unit: Unit },
  },
  BatchRequest: {
    type: 'object', required: ['pairs'], additionalProperties: false,
    properties: {
      pairs: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'object', required: ['from', 'to'], additionalProperties: false, properties: { from: { $ref: '#/components/schemas/Point' }, to: { $ref: '#/components/schemas/Point' } } } },
      unit: Unit,
    },
  },
  BatchItem: {
    type: 'object', required: ['index', 'distance', 'initial_bearing_deg', 'cardinal_direction'], additionalProperties: false,
    properties: { index: { type: 'integer' }, distance: { type: 'number' }, initial_bearing_deg: { type: 'number' }, cardinal_direction: { type: 'string' } },
  },
  DiscoveryResponse: {
    type: 'object', additionalProperties: false, required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'],
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: { type: 'object', required: ['type', 'header'], additionalProperties: false, properties: { type: { type: 'string' }, header: { type: 'string' } } },
      endpoints: { type: 'array', items: { type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false, properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
      pricing: { type: 'array', items: { type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false, properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } } } },
      x402_compatible: { type: 'boolean' },
    },
  },
  DistanceResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      {
        type: 'object', required: ['input', 'distance', 'unit', 'method', 'initial_bearing_deg', 'cardinal_direction'],
        properties: {
          input: { type: 'object', required: ['from', 'to', 'unit'], properties: { from: { $ref: '#/components/schemas/Point' }, to: { $ref: '#/components/schemas/Point' }, unit: Unit } },
          distance: { type: 'number' }, unit: Unit, method: { type: 'string', enum: ['haversine'] },
          initial_bearing_deg: { type: 'number' }, cardinal_direction: { type: 'string' },
        },
      },
      { $ref: '#/components/schemas/Tail' },
    ],
    unevaluatedProperties: false,
  },
  BatchResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { type: 'object', required: ['unit', 'count', 'results'], properties: { unit: Unit, count: { type: 'integer' }, results: { type: 'array', items: { $ref: '#/components/schemas/BatchItem' } } } },
      { $ref: '#/components/schemas/Tail' },
    ],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      {
        type: 'object', required: ['input', 'distance', 'unit', 'method', 'initial_bearing_deg', 'cardinal_direction', 'midpoint', 'reasoning'],
        properties: {
          input: { type: 'object', required: ['from', 'to', 'unit'], properties: { from: { $ref: '#/components/schemas/Point' }, to: { $ref: '#/components/schemas/Point' }, unit: Unit } },
          distance: { type: 'number' }, unit: Unit, method: { type: 'string', enum: ['haversine'] },
          initial_bearing_deg: { type: 'number' }, cardinal_direction: { type: 'string' },
          midpoint: { $ref: '#/components/schemas/Point' }, reasoning: { $ref: '#/components/schemas/Reasoning' },
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
    method: 'post', path: '/distance', summary: 'Great-circle distance + bearing', operationId: 'distance',
    priceUsdc: 0.005, requestSchemaRef: 'DistanceRequest', responseSchemaRef: 'DistanceResponse',
    requestExample: { from: { lat: 40.7128, lon: -74.006 }, to: { lat: 34.0522, lon: -118.2437 }, unit: 'km' },
    responseExample: {
      trace_id: 'g1-1780000000000', computed_at: '2026-06-07T19:30:00.000Z', success: true, latency_ms: 0,
      input: { from: { lat: 40.7128, lon: -74.006 }, to: { lat: 34.0522, lon: -118.2437 }, unit: 'km' },
      distance: 3935.746, unit: 'km', method: 'haversine', initial_bearing_deg: 273.65, cardinal_direction: 'W',
      confidence_score: 1.0, recommended_actions_priority_order: ['Bearing W — heading from origin to destination.'],
      chain_to: [{ api: 'timezone-harmonizer', reason: 'Get the local time at the destination coordinates.' }, { api: 'local-business', reason: 'Find businesses near these coordinates.' }],
      privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/batch', summary: 'Distances/bearings for many pairs', operationId: 'batch',
    priceUsdc: 0.010, requestSchemaRef: 'BatchRequest', responseSchemaRef: 'BatchResponse',
    requestExample: { pairs: [{ from: { lat: 51.5074, lon: -0.1278 }, to: { lat: 48.8566, lon: 2.3522 } }], unit: 'km' },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL distance + bearing + midpoint', operationId: 'lookup',
    priceUsdc: 0.015, oneCall: true, requestSchemaRef: 'DistanceRequest', responseSchemaRef: 'LookupResponse',
    requestExample: { from: { lat: 35.6762, lon: 139.6503 }, to: { lat: 1.3521, lon: 103.8198 }, unit: 'km' },
  },
];

const spec = buildAplusSpec({
  slug: 'geo-coordinate-calculator',
  title: 'Geospatial Coordinate Calculator API',
  description: 'Deterministic great-circle geometry: Haversine distance (km/mi/m/nmi), initial bearing with cardinal direction, and midpoint between two coordinates. Real spherical math; confidence always 1.0.',
  endpoints,
  schemas,
});

export default specRouter(spec);
