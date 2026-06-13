import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const ALGS = ['md5', 'sha1', 'sha256', 'sha384', 'sha512'];
const IN_ENC = ['utf8', 'latin1', 'hex', 'base64', 'base64url'];
const OUT_ENC = ['hex', 'base64', 'base64url'];

const HashCore = {
  type: 'object', required: ['algorithm', 'output_encoding', 'input_byte_length', 'digest', 'digest_bits'], additionalProperties: false,
  properties: {
    algorithm: { type: 'string', enum: ALGS }, output_encoding: { type: 'string', enum: OUT_ENC },
    input_byte_length: { type: 'integer', minimum: 0 }, digest: { type: 'string' }, digest_bits: { type: 'integer' },
  },
};
const HmacCore = {
  type: 'object', required: ['algorithm', 'output_encoding', 'input_byte_length', 'key_byte_length', 'digest', 'digest_bits'], additionalProperties: false,
  properties: {
    algorithm: { type: 'string', enum: ALGS }, output_encoding: { type: 'string', enum: OUT_ENC },
    input_byte_length: { type: 'integer', minimum: 0 }, key_byte_length: { type: 'integer', minimum: 0 },
    digest: { type: 'string' }, digest_bits: { type: 'integer' },
  },
};
const HashRequest = {
  type: 'object', required: ['data', 'algorithm'], additionalProperties: false,
  properties: {
    data: { type: 'string' }, algorithm: { type: 'string', enum: ALGS },
    input_encoding: { type: 'string', enum: IN_ENC }, output_encoding: { type: 'string', enum: OUT_ENC },
  },
};
const HmacRequest = {
  type: 'object', required: ['data', 'key', 'algorithm'], additionalProperties: false,
  properties: {
    data: { type: 'string' }, key: { type: 'string' }, algorithm: { type: 'string', enum: ALGS },
    input_encoding: { type: 'string', enum: IN_ENC }, key_encoding: { type: 'string', enum: IN_ENC }, output_encoding: { type: 'string', enum: OUT_ENC },
  },
};
const LookupRequest = {
  type: 'object', required: ['data', 'algorithm'], additionalProperties: false,
  properties: {
    data: { type: 'string' }, algorithm: { type: 'string', enum: ALGS }, key: { type: 'string', description: 'Optional — when present, an HMAC is also computed.' },
    input_encoding: { type: 'string', enum: IN_ENC }, key_encoding: { type: 'string', enum: IN_ENC }, output_encoding: { type: 'string', enum: OUT_ENC },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('hash', 'hmac'), _Tail: Tail,
  HashCore, HmacCore, HashRequest, HmacRequest, LookupRequest, DiscoveryResponse: discoverySchema(),
  HashResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HashCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  HmacResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HmacCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HashCore' },
      {
        type: 'object', required: ['hmac', 'reasoning'],
        properties: { hmac: { oneOf: [{ $ref: '#/components/schemas/HmacCore' }, { type: 'null' }] }, reasoning: { $ref: '#/components/schemas/Reasoning' } },
      },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'hsh-1780000000000', request_id: 'hsh-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const HASH_CORE = { algorithm: 'sha256', output_encoding: 'hex', input_byte_length: 5, digest: '185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969', digest_bits: 256 };
const HMAC_CORE = { algorithm: 'sha256', output_encoding: 'hex', input_byte_length: 5, key_byte_length: 6, digest: '0cc692f2177b42b6e5cd82488ee6c5d526a007c571e7de1fec07c1e2b1dfa2e2', digest_bits: 256 };
const CHAIN = [
  { api: 'base-codec', reason: 'Re-encode the digest bytes into another representation.' },
  { api: 'secret-scanner', reason: 'Check that the data being hashed is not itself a leaked secret.' },
];
const INVALIDATORS = [
  'MD5 and SHA-1 are broken for collision resistance — never use them for signatures or integrity against an adversary; they remain fine for checksums of trusted data.',
  'A bare hash is NOT a password hash; use a slow KDF (bcrypt/scrypt/argon2) for credentials. This service does no key stretching.',
  'The digest depends on the exact bytes — a different input_encoding (e.g. hex vs utf8) yields a completely different result.',
];
const tail = (section: Record<string, number>, algo: string) => ({
  confidence_score: 1, confidence_per_section: section,
  recommended_actions_priority_order: [
    `Digest computed with ${algo}.`,
    algo === 'md5' || algo === 'sha1' ? 'Do not rely on this algorithm for security against collisions; prefer SHA-256+.' : 'Suitable for integrity checks; for passwords use a dedicated KDF instead.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
});

const disc = {
  name: 'Hash & HMAC API', version: '1.0.0',
  description: 'Deterministic cryptographic digests. /hash computes MD5/SHA-1/SHA-256/SHA-384/SHA-512; /hmac computes the keyed HMAC. Explicit input/key/output encodings for lossless binary. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/hash-hmac/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/hash', summary: 'Compute a message digest', price_usdc: 0.003 },
    { method: 'POST', path: '/hmac', summary: 'Compute a keyed HMAC', price_usdc: 0.003 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL hash (+ hmac if key) + reasoning', price_usdc: 0.006 },
  ],
  pricing: [
    { path: '/hash', price_usdc: 0.003, currency: 'USDC' },
    { path: '/hmac', price_usdc: 0.003, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.006, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/hash', summary: 'Compute a message digest', operationId: 'hash', priceUsdc: 0.003,
    requestSchemaRef: 'HashRequest', responseSchemaRef: 'HashResponse', requestExample: { data: 'Hello', algorithm: 'sha256' },
    responseExample: { ...env, ...HASH_CORE, ...tail({ hash: 1 }, 'sha256') },
  },
  {
    method: 'post', path: '/hmac', summary: 'Compute a keyed HMAC', operationId: 'hmac', priceUsdc: 0.003,
    requestSchemaRef: 'HmacRequest', responseSchemaRef: 'HmacResponse', requestExample: { data: 'Hello', key: 'secret', algorithm: 'sha256' },
    responseExample: { ...env, ...HMAC_CORE, ...tail({ hmac: 1 }, 'sha256') },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL hash (+ hmac if key) + reasoning', operationId: 'lookup', priceUsdc: 0.006, oneCall: true,
    requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse', requestExample: { data: 'Hello', key: 'secret', algorithm: 'sha256' },
    responseExample: {
      ...env, ...HASH_CORE, hmac: HMAC_CORE,
      reasoning: {
        why_result_generated: 'Computed the sha256 digest over 5 byte(s) plus a keyed HMAC.',
        key_factors: ['Algorithm: sha256 (256-bit).', 'Input length: 5 byte(s); output encoding: hex.', 'HMAC computed with a 6-byte key.'],
        invalidators: INVALIDATORS,
      },
      ...tail({ hash: 1, hmac: 1 }, 'sha256'),
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'hash-hmac', title: 'Hash & HMAC API', version: '1.0.0',
  description: 'Deterministic MD5/SHA-1/SHA-256/384/512 hashing and keyed HMAC with explicit encodings. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
