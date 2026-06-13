import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const Timestamp = {
  type: ['object', 'null'], required: ['iso', 'unix_ms'], additionalProperties: false,
  properties: { iso: { type: ['string', 'null'], format: 'date-time' }, unix_ms: { type: 'integer' } },
};
const Node = {
  type: ['object', 'null'], required: ['mac', 'is_multicast', 'is_locally_administered'], additionalProperties: false,
  properties: { mac: { type: 'string' }, is_multicast: { type: 'boolean' }, is_locally_administered: { type: 'boolean' } },
};
const InspectCore = {
  type: 'object',
  required: ['input', 'canonical', 'valid', 'version', 'version_description', 'variant', 'variant_description', 'is_nil', 'is_max', 'timestamp', 'node', 'clock_sequence'],
  additionalProperties: false,
  properties: {
    input: { type: 'string' }, canonical: { type: 'string' }, valid: { type: 'boolean' },
    version: { type: ['integer', 'null'] }, version_description: { type: 'string' },
    variant: { type: 'integer' }, variant_description: { type: 'string' },
    is_nil: { type: 'boolean' }, is_max: { type: 'boolean' },
    timestamp: Timestamp, node: Node, clock_sequence: { type: ['integer', 'null'] },
  },
};
const GenerateCore = {
  type: 'object', required: ['version', 'count', 'uuids'], additionalProperties: false,
  properties: { version: { type: 'integer', enum: [4, 7] }, count: { type: 'integer' }, uuids: { type: 'array', items: { type: 'string' } } },
};
const InspectRequest = {
  type: 'object', required: ['uuid'], additionalProperties: false,
  properties: { uuid: { type: 'string', description: 'A UUID (canonical, braced, or urn:uuid: form).' } },
};
const GenerateRequest = {
  type: 'object', required: ['version'], additionalProperties: false,
  properties: { version: { type: 'integer', enum: [4, 7] }, count: { type: 'integer', minimum: 1, maximum: 100 } },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('structure', 'timestamp', 'generation'), _Tail: Tail,
  Timestamp, Node, InspectCore, GenerateCore, InspectRequest, GenerateRequest, DiscoveryResponse: discoverySchema(),
  InspectResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/InspectCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  GenerateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/GenerateCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/InspectCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'uid-1780000000000', request_id: 'uid-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const CORE = {
  input: 'c232ab00-9414-11ec-b3c8-9e6bdeced846', canonical: 'c232ab00-9414-11ec-b3c8-9e6bdeced846', valid: true,
  version: 1, version_description: 'time-based (Gregorian timestamp + node)',
  variant: 11, variant_description: 'RFC 4122 / RFC 9562', is_nil: false, is_max: false,
  timestamp: { iso: '2022-02-22T19:22:22.000Z', unix_ms: 1645557742000 },
  node: { mac: '9e:6b:de:ce:d8:46', is_multicast: false, is_locally_administered: true },
  clock_sequence: 13256,
};
const CHAIN = [
  { api: 'radix-converter', reason: 'Render the 128-bit value in another base.' },
  { api: 'base-codec', reason: 'Encode the raw 16 bytes as base64/base58.' },
];
const INSPECT_INVALIDATORS = [
  'Embedded timestamps exist only for v1/v6/v7 — v4 is purely random and carries no time or MAC.',
  'A v1/v6 node may be a random or hashed value rather than a real MAC if the multicast bit is set; treat MACs as untrusted.',
  'The variant bits classify the layout, not the validity — a syntactically valid UUID can still be unregistered/garbage.',
];
const INSPECT_TAIL = {
  confidence_score: 1, confidence_per_section: { structure: 1, timestamp: 1 },
  recommended_actions_priority_order: [
    'Version 1 (time-based (Gregorian timestamp + node)); variant RFC 4122 / RFC 9562.',
    'Embedded timestamp: 2022-02-22T19:22:22.000Z.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};
const GEN_CORE = { version: 4, count: 2, uuids: ['1e2f9c84-2b6a-4d51-9f0c-7a3b1c5d8e02', 'b8d3a17f-6c44-4e90-8a21-0f9e2d4c6b73'] };
const GEN_TAIL = {
  confidence_score: 1, confidence_per_section: { generation: 1 },
  recommended_actions_priority_order: ['Generated 2 v4 UUID(s).', 'v4 is fully random — use when ordering must not leak timing.'],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const disc = {
  name: 'UUID Inspector API', version: '1.0.0',
  description: 'Deterministic UUID inspector + generator. Validates a UUID and extracts version, variant, embedded timestamp (v1/v6/v7), node (MAC) and clock sequence; generates random v4 or time-ordered v7 UUIDs. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/uuid-inspector/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/inspect', summary: 'Inspect a UUID', price_usdc: 0.003 },
    { method: 'POST', path: '/generate', summary: 'Generate v4/v7 UUIDs', price_usdc: 0.003 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL inspect + reasoning', price_usdc: 0.006 },
  ],
  pricing: [
    { path: '/inspect', price_usdc: 0.003, currency: 'USDC' },
    { path: '/generate', price_usdc: 0.003, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.006, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/inspect', summary: 'Inspect a UUID', operationId: 'inspect', priceUsdc: 0.003,
    requestSchemaRef: 'InspectRequest', responseSchemaRef: 'InspectResponse', requestExample: { uuid: 'c232ab00-9414-11ec-b3c8-9e6bdeced846' },
    responseExample: { ...env, ...CORE, ...INSPECT_TAIL },
  },
  {
    method: 'post', path: '/generate', summary: 'Generate v4/v7 UUIDs', operationId: 'generate', priceUsdc: 0.003,
    requestSchemaRef: 'GenerateRequest', responseSchemaRef: 'GenerateResponse', requestExample: { version: 4, count: 2 },
    responseExample: { ...env, ...GEN_CORE, ...GEN_TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL inspect + reasoning', operationId: 'lookup', priceUsdc: 0.006, oneCall: true,
    requestSchemaRef: 'InspectRequest', responseSchemaRef: 'LookupResponse', requestExample: { uuid: 'c232ab00-9414-11ec-b3c8-9e6bdeced846' },
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Parsed the canonical UUID and read its version nibble (1) and variant bits.',
        key_factors: ['Version 1: time-based (Gregorian timestamp + node).', 'Variant: RFC 4122 / RFC 9562.', 'Embedded time: 2022-02-22T19:22:22.000Z.'],
        invalidators: INSPECT_INVALIDATORS,
      },
      ...INSPECT_TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'uuid-inspector', title: 'UUID Inspector API', version: '1.0.0',
  description: 'Deterministic UUID inspector + generator (version, variant, v1/v6/v7 timestamp, node/MAC, clock sequence; v4/v7 generation). No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
