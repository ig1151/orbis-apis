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
  // Envelope-free overlap result used when nested inside /lookup.
  OverlapResult: {
    allOf: [
      { type: 'object', required: ['input'], properties: { input: { $ref: '#/components/schemas/OverlapRequest' } } },
      { $ref: '#/components/schemas/OverlapCore' },
    ],
  },
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
    required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'],
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
          overlap: { oneOf: [{ $ref: '#/components/schemas/OverlapResult' }, { type: 'null' }] },
          reasoning: { $ref: '#/components/schemas/Reasoning' },
        },
      },
      { $ref: '#/components/schemas/_Tail' },
    ],
  },
  _Tail: Tail,
};

const TAIL_EXAMPLE = {
  confidence_score: 1.0,
  recommended_actions_priority_order: ['Allocate hosts between 192.168.1.1 and 192.168.1.254.', 'Private (RFC1918) range — not internet-routable.'],
  chain_to: [
    { api: 'ip-geolocation', reason: 'Geolocate specific hosts discovered within this subnet.' },
    { api: 'ip-intelligence', reason: 'Threat-score and detect VPN/proxy on hosts in this range.' },
  ],
  privacy: { data_stored: false, retention: 'none' },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/calculate', summary: 'CIDR → network/broadcast/mask/usable host range', operationId: 'calculate',
    priceUsdc: 0.001, requestSchemaRef: 'CidrRequest', responseSchemaRef: 'CalculateResponse',
    requestExample: { cidr: '192.168.1.0/24' },
    responseExample: {
      trace_id: 'a1b2c3d4-1780000000000', computed_at: '2026-06-07T19:30:00.000Z', success: true, latency_ms: 0,
      input: { cidr: '192.168.1.0/24' }, ip_version: 'IPv4', cidr_prefix: 24,
      network_address: '192.168.1.0', broadcast_address: '192.168.1.255', netmask: '255.255.255.0', wildcard_mask: '0.0.0.255',
      first_usable_host: '192.168.1.1', last_usable_host: '192.168.1.254', total_addresses: 256, usable_hosts: 254, is_private: true,
      ...TAIL_EXAMPLE,
    },
  },
  {
    method: 'post', path: '/overlap', summary: 'Detect overlap/containment between two CIDR blocks', operationId: 'overlap',
    priceUsdc: 0.002, requestSchemaRef: 'OverlapRequest', responseSchemaRef: 'OverlapResponse',
    requestExample: { cidr_a: '10.0.0.0/16', cidr_b: '10.0.5.0/24' },
    responseExample: {
      trace_id: 'b2c3d4e5-1780000000000', computed_at: '2026-06-07T19:30:00.000Z', success: true, latency_ms: 0,
      input: { cidr_a: '10.0.0.0/16', cidr_b: '10.0.5.0/24' },
      overlaps: true, relationship: 'a_contains_b', overlap_address_count: 256, overlap_start: '10.0.5.0', overlap_end: '10.0.5.255',
      confidence_score: 1.0,
      recommended_actions_priority_order: ['Resolve the address conflict before assigning either block.', 'Relationship: a_contains_b.'],
      chain_to: TAIL_EXAMPLE.chain_to, privacy: TAIL_EXAMPLE.privacy,
    },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL full subnet breakdown + optional overlap', operationId: 'lookup',
    priceUsdc: 0.003, requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse',
    requestExample: { cidr: '10.0.0.0/24', other_cidr: '10.0.0.128/25' },
    responseExample: {
      trace_id: 'c3d4e5f6-1780000000000', computed_at: '2026-06-07T19:30:00.000Z', success: true, latency_ms: 0,
      subnet: {
        input: { cidr: '10.0.0.0/24' }, ip_version: 'IPv4', cidr_prefix: 24,
        network_address: '10.0.0.0', broadcast_address: '10.0.0.255', netmask: '255.255.255.0', wildcard_mask: '0.0.0.255',
        first_usable_host: '10.0.0.1', last_usable_host: '10.0.0.254', total_addresses: 256, usable_hosts: 254, is_private: true,
      },
      overlap: {
        input: { cidr_a: '10.0.0.0/24', cidr_b: '10.0.0.128/25' },
        overlaps: true, relationship: 'a_contains_b', overlap_address_count: 128, overlap_start: '10.0.0.128', overlap_end: '10.0.0.255',
      },
      reasoning: {
        why_result_generated: 'Computed directly from the CIDR using deterministic IPv4 bitmask arithmetic.',
        key_factors: ['prefix /24', '254 usable hosts', 'RFC1918 private'],
        invalidators: ['Input is IPv6 (not supported).', 'CIDR prefix or octets out of range.'],
      },
      confidence_score: 1.0,
      recommended_actions_priority_order: ['Usable host pool: 10.0.0.1 – 10.0.0.254 (254).', 'Overlaps other_cidr (a_contains_b) — resolve before assignment.', 'Private range — add NAT/route policy for egress.'],
      chain_to: TAIL_EXAMPLE.chain_to, privacy: TAIL_EXAMPLE.privacy,
    },
  },
];

const spec = buildAplusSpec({
  slug: 'ip-subnet-calculator',
  title: 'IP Subnet Calculator API',
  description: 'Deterministic IPv4 CIDR math for network-aware agents: subnet boundaries, usable host ranges, mask conversion, and overlap/containment detection. Real bitmask computation — no estimation, confidence always 1.0.',
  endpoints,
  schemas,
});

export default specRouter(spec);
