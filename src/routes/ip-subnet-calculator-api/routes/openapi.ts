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

const SubnetCore = {
  type: 'object',
  required: [
    'input', 'ip_version', 'cidr_prefix', 'network_address', 'broadcast_address',
    'netmask', 'wildcard_mask', 'first_usable_host', 'last_usable_host',
    'total_addresses', 'usable_hosts', 'is_private',
  ],
  additionalProperties: false,
  properties: {
    input: {
      type: 'object', required: ['cidr'], additionalProperties: false,
      properties: { cidr: { type: 'string', example: '10.0.0.0/24' } },
    },
    ip_version: { type: 'string', enum: ['IPv4'] },
    cidr_prefix: { type: 'integer', minimum: 0, maximum: 32 },
    network_address: { type: 'string' },
    broadcast_address: { type: 'string' },
    netmask: { type: 'string' },
    wildcard_mask: { type: 'string' },
    first_usable_host: { type: ['string', 'null'] },
    last_usable_host: { type: ['string', 'null'] },
    total_addresses: { type: 'integer', minimum: 1 },
    usable_hosts: { type: 'integer', minimum: 0 },
    is_private: { type: 'boolean' },
  },
};

const OverlapCore = {
  type: 'object',
  required: ['overlaps', 'relationship', 'overlap_address_count', 'overlap_start', 'overlap_end'],
  additionalProperties: false,
  properties: {
    overlaps: { type: 'boolean' },
    relationship: { type: 'string', enum: ['disjoint', 'identical', 'a_contains_b', 'b_contains_a', 'partial'] },
    overlap_address_count: { type: 'integer', minimum: 0 },
    overlap_start: { type: ['string', 'null'] },
    overlap_end: { type: ['string', 'null'] },
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

const schemas = {
  EnvelopeOk,
  SubnetCore,
  OverlapCore,
  CidrRequest: {
    type: 'object', required: ['cidr'], additionalProperties: false,
    properties: { cidr: { type: 'string', description: 'IPv4 CIDR, e.g. 192.168.1.0/24', example: '192.168.1.0/24' } },
  },
  OverlapRequest: {
    type: 'object', required: ['cidr_a', 'cidr_b'], additionalProperties: false,
    properties: { cidr_a: { type: 'string', example: '10.0.0.0/16' }, cidr_b: { type: 'string', example: '10.0.5.0/24' } },
  },
  LookupRequest: {
    type: 'object', required: ['cidr'], additionalProperties: false,
    properties: {
      cidr: { type: 'string', example: '10.0.0.0/24' },
      other_cidr: { type: 'string', description: 'Optional second CIDR to overlap-check against.', example: '10.0.0.128/25' },
    },
  },
  DiscoveryResponse: {
    type: 'object',
    required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'x402_compatible'],
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
      x402_compatible: { type: 'boolean' },
    },
  },
  CalculateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SubnetCore' }, { $ref: '#/components/schemas/_Tail' }] },
  OverlapResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { type: 'object', required: ['input'], properties: { input: { $ref: '#/components/schemas/OverlapRequest' } } },
      { $ref: '#/components/schemas/OverlapCore' },
      { $ref: '#/components/schemas/_Tail' },
    ],
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      {
        type: 'object',
        required: ['subnet', 'overlap', 'reasoning'],
        properties: {
          subnet: { $ref: '#/components/schemas/SubnetCore' },
          overlap: { oneOf: [{ $ref: '#/components/schemas/OverlapResponse' }, { type: 'null' }] },
          reasoning: { $ref: '#/components/schemas/Reasoning' },
        },
      },
      { $ref: '#/components/schemas/_Tail' },
    ],
  },
  _Tail: Tail,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  { method: 'post', path: '/calculate', summary: 'CIDR → network/broadcast/mask/usable host range', operationId: 'calculate', priceUsdc: 0.001, requestSchemaRef: 'CidrRequest', responseSchemaRef: 'CalculateResponse' },
  { method: 'post', path: '/overlap', summary: 'Detect overlap/containment between two CIDR blocks', operationId: 'overlap', priceUsdc: 0.002, requestSchemaRef: 'OverlapRequest', responseSchemaRef: 'OverlapResponse' },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL full subnet breakdown + optional overlap', operationId: 'lookup', priceUsdc: 0.003, requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse' },
];

const spec = buildAplusSpec({
  slug: 'ip-subnet-calculator',
  title: 'IP Subnet Calculator API',
  description: 'Deterministic IPv4 CIDR math for network-aware agents: subnet boundaries, usable host ranges, mask conversion, and overlap/containment detection. Real bitmask computation — no estimation, confidence always 1.0.',
  endpoints,
  schemas,
});

export default specRouter(spec);
