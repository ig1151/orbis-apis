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

const ConvertCore = {
  type: 'object',
  required: ['value', 'from', 'to', 'result', 'category'],
  // allOf branch — strictness enforced via unevaluatedProperties:false on the composite.
  properties: {
    value: { type: 'number' },
    from: { type: 'string', description: 'Source unit symbol.' },
    to: { type: 'string', description: 'Target unit symbol.' },
    result: { type: 'number', description: 'Converted value (12 significant digits).' },
    category: { type: 'string', enum: ['length', 'mass', 'volume', 'area', 'speed', 'time', 'data', 'temperature'] },
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
  type: 'object', required: ['value'], additionalProperties: false,
  description: 'Provide from/to (preferred) or the legacy from_unit/to_unit.',
  properties: {
    value: { type: 'number', example: 10 },
    from: { type: 'string', example: 'km' },
    to: { type: 'string', example: 'mi' },
    from_unit: { type: 'string', description: 'Legacy alias for "from".' },
    to_unit: { type: 'string', description: 'Legacy alias for "to".' },
  },
};

const schemas = {
  EnvelopeOk,
  ConvertCore,
  _Tail: Tail,
  ConvertRequest,
  BatchRequest: {
    type: 'object', required: ['conversions'], additionalProperties: false,
    properties: {
      conversions: {
        type: 'array', minItems: 1, maxItems: 100,
        items: { $ref: '#/components/schemas/ConvertRequest' },
      },
    },
  },
  LookupRequest: ConvertRequest,
  BatchResultItem: {
    type: 'object', required: ['success'], additionalProperties: false,
    properties: {
      success: { type: 'boolean' },
      value: { type: 'number' }, from: { type: 'string' }, to: { type: 'string' },
      result: { type: 'number' }, category: { type: 'string' },
      error: { type: 'string', description: 'Present only when success is false.' },
    },
  },
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
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ConvertCore' }, { $ref: '#/components/schemas/_Tail' }],
    unevaluatedProperties: false,
  },
  BatchResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      {
        type: 'object',
        required: ['results', 'total', 'successful', 'failed'],
        properties: {
          results: { type: 'array', items: { $ref: '#/components/schemas/BatchResultItem' } },
          total: { type: 'integer', minimum: 0 },
          successful: { type: 'integer', minimum: 0 },
          failed: { type: 'integer', minimum: 0 },
        },
      },
      { $ref: '#/components/schemas/_Tail' },
    ],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/ConvertCore' },
      {
        type: 'object',
        required: ['equivalents', 'reasoning'],
        properties: {
          equivalents: { type: 'object', additionalProperties: { type: 'number' }, description: 'The input value expressed in every unit of the category.' },
          reasoning: { $ref: '#/components/schemas/Reasoning' },
        },
      },
      { $ref: '#/components/schemas/_Tail' },
    ],
    unevaluatedProperties: false,
  },
  SupportedUnitsResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      {
        type: 'object',
        required: ['categories', 'total_units'],
        properties: {
          categories: {
            type: 'object',
            additionalProperties: { type: 'array', items: { type: 'string' } },
            description: 'Map of category name to the unit symbols it supports.',
          },
          total_units: { type: 'integer', minimum: 0 },
        },
      },
      { $ref: '#/components/schemas/_Tail' },
    ],
    unevaluatedProperties: false,
  },
};

const TAIL_EXAMPLE = {
  confidence_score: 1.0,
  recommended_actions_priority_order: ['10 km = 6.21371192237 mi.', 'Use /lookup for the same value in every length unit.'],
  chain_to: [],
  privacy: { data_stored: false, retention: 'none' },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'get', path: '/supported-units', summary: 'List every supported unit symbol per category', operationId: 'supportedUnits',
    responseSchemaRef: 'SupportedUnitsResponse',
    responseExample: {
      trace_id: 'u0-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      categories: {
        length: ['m', 'km', 'cm', 'mm', 'um', 'nm', 'mi', 'yd', 'ft', 'in', 'nmi'],
        temperature: ['C', 'F', 'K'],
      },
      total_units: 58,
      confidence_score: 1.0,
      recommended_actions_priority_order: ['58 unit symbols across 8 categories.', 'Pass any two symbols from the same category to /convert.'],
      chain_to: [{ api: 'unit-conversion', reason: 'Convert between any two of these units via /convert.' }],
      privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/convert', summary: 'Convert a value between two units of the same category', operationId: 'convert',
    priceUsdc: 0.005, requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'ConvertResponse',
    requestExample: { value: 10, from: 'km', to: 'mi' },
    responseExample: {
      trace_id: 'u1-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      value: 10, from: 'km', to: 'mi', result: 6.21371192237, category: 'length',
      ...TAIL_EXAMPLE,
    },
  },
  {
    method: 'post', path: '/batch', summary: 'Convert up to 100 value/unit pairs in one call', operationId: 'batch',
    priceUsdc: 0.01, requestSchemaRef: 'BatchRequest', responseSchemaRef: 'BatchResponse',
    requestExample: { conversions: [{ value: 100, from: 'C', to: 'F' }, { value: 1, from: 'GB', to: 'MiB' }] },
    responseExample: {
      trace_id: 'u2-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      results: [
        { success: true, value: 100, from: 'C', to: 'F', result: 212, category: 'temperature' },
        { success: true, value: 1, from: 'GB', to: 'MiB', result: 953.674316406, category: 'data' },
      ],
      total: 2, successful: 2, failed: 0,
      confidence_score: 1.0,
      recommended_actions_priority_order: ['2/2 conversions succeeded.', 'All pairs converted exactly.'],
      chain_to: [], privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL convert + all sibling-unit equivalents + reasoning', operationId: 'lookup',
    priceUsdc: 0.015, oneCall: true, requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse',
    requestExample: { value: 100, from: 'C', to: 'F' },
    responseExample: {
      trace_id: 'u3-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      value: 100, from: 'C', to: 'F', result: 212, category: 'temperature',
      equivalents: { C: 100, F: 212, K: 373.15 },
      reasoning: {
        why_result_generated: 'Converted 100 C to F using exact temperature factors.',
        key_factors: ['category: temperature', 'C and F share the same dimension', 'exact conversion factors (no estimation)'],
        invalidators: ['Passing units from different categories.', 'Non-finite input value.'],
      },
      confidence_score: 1.0,
      recommended_actions_priority_order: ['100 C = 212 F.', 'Pick the equivalent unit that matches your downstream system.'],
      chain_to: [], privacy: { data_stored: false, retention: 'none' },
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'unit-conversion',
  title: 'Unit Conversion API',
  description: 'Deterministic measurement conversion across length, mass, volume, area, speed, time, digital data, and temperature. Exact SI factors computed in real code; deterministic schemas; confidence always 1.0. Includes a free /supported-units catalog endpoint.',
  version: '2.1.0',
  endpoints,
  schemas,
});

export default specRouter(spec);
