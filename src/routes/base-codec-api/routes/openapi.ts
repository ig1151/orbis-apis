import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const ENC = ['utf8', 'ascii', 'latin1', 'hex', 'base64', 'base64url', 'base58', 'base32'];

const ConvertCore = {
  type: 'object', required: ['from', 'to', 'byte_length', 'output'], additionalProperties: false,
  properties: {
    from: { type: 'string', enum: ENC }, to: { type: 'string', enum: ENC },
    byte_length: { type: 'integer', minimum: 0 }, output: { type: 'string' },
  },
};
const ConvertRequest = {
  type: 'object', required: ['data', 'from', 'to'], additionalProperties: false,
  properties: {
    data: { type: 'string', description: 'Input encoded per "from".' },
    from: { type: 'string', enum: ENC }, to: { type: 'string', enum: ENC },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('conversion'), _Tail: Tail,
  ConvertCore, ConvertRequest, DiscoveryResponse: discoverySchema(),
  ConvertResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ConvertCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ConvertCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'bcd-1780000000000', request_id: 'bcd-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const CORE = { from: 'utf8', to: 'base64', byte_length: 5, output: 'SGVsbG8=' };
const CHAIN = [
  { api: 'hash-hmac', reason: 'Hash or HMAC the decoded bytes.' },
  { api: 'jwt-decoder', reason: 'If the base64url payload is a JWT, decode its claims.' },
];
const INVALIDATORS = [
  'Text encodings (utf8/ascii/latin1) are lossy for arbitrary bytes — round-tripping binary through utf8 can corrupt it; use hex/base64 for binary.',
  'base64 decoding is tolerant of missing padding; the byte_length reflects the actual decoded bytes, not the input string length.',
  'base58 has no fixed block size, so leading zero bytes are preserved as leading "1" characters by convention.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { conversion: 1 },
  recommended_actions_priority_order: [
    'Conversion is exact and reversible for binary-safe encodings (hex/base64/base64url/base58/base32).',
    'Prefer hex or base64 over text encodings when the bytes are not guaranteed to be valid text.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const disc = {
  name: 'Base Codec API', version: '1.0.0',
  description: 'Deterministic universal byte codec. Decodes data from a source encoding into raw bytes, then re-encodes to a target encoding. Supports utf8/ascii/latin1, hex, base64, base64url, base58 (Bitcoin), base32 (RFC 4648). No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/base-codec/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/convert', summary: 'Convert data between encodings', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL convert + reasoning', price_usdc: 0.008 },
  ],
  pricing: [
    { path: '/convert', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const reqEx = { data: 'Hello', from: 'utf8', to: 'base64' };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/convert', summary: 'Convert data between encodings', operationId: 'convert', priceUsdc: 0.004,
    requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'ConvertResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL convert + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Decoded 5 byte(s) from utf8, then re-encoded to base64.',
        key_factors: ['Source encoding: utf8.', 'Target encoding: base64.', 'Decoded length: 5 byte(s).'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'base-codec', title: 'Base Codec API', version: '1.0.0',
  description: 'Deterministic universal byte codec across utf8/ascii/latin1, hex, base64, base64url, base58, base32. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
