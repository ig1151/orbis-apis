import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { hashExample, verifyExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const hex = { type: 'string', pattern: '^[0-9a-f]+$' };
const Hashes = {
  // Keyed by algorithm name; a typed map so adding an algorithm needs no schema change.
  // Documented keys are listed in properties for tooling; only lowercase-hex values are allowed.
  type: 'object',
  description: 'Lowercase-hex digests keyed by algorithm name, one per requested algorithm.',
  properties: { crc32: hex, adler32: hex, md5: hex, sha1: hex, sha256: hex, sha512: hex },
  patternProperties: { '^[a-z0-9-]+$': hex },
  additionalProperties: false,
};
const Encoding = { type: 'string', enum: ['utf8', 'base64', 'hex'] };
const Algorithm = { type: 'string', enum: ['crc32', 'adler32', 'md5', 'sha1', 'sha256', 'sha512'] };

const HashCore = {
  type: 'object', required: ['byte_length', 'encoding', 'hashes'],
  properties: {
    byte_length: { type: 'integer', minimum: 0, description: 'Number of bytes decoded from the input.' },
    encoding: Encoding, hashes: Hashes,
  },
};
const VerifyCore = {
  type: 'object', required: ['algorithm', 'encoding', 'byte_length', 'computed', 'expected_normalized', 'match'],
  properties: {
    algorithm: Algorithm, encoding: Encoding, byte_length: { type: 'integer', minimum: 0 },
    computed: { type: 'string', description: 'Lowercase-hex digest computed from the input.' },
    expected_normalized: { type: 'string', description: 'The expected value, trimmed and lowercased.' },
    match: { type: 'boolean' },
  },
};

const HashRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: {
    text: { type: 'string', maxLength: 5000000 },
    encoding: { ...Encoding, description: 'How to decode "text" into bytes (default utf8).' },
    algorithms: { type: 'array', minItems: 1, items: Algorithm, description: 'Subset of algorithms to compute (default: all).' },
  },
};
const VerifyRequest = {
  type: 'object', required: ['text', 'algorithm', 'expected'], additionalProperties: false,
  properties: {
    text: { type: 'string', maxLength: 5000000 }, encoding: Encoding, algorithm: Algorithm,
    expected: { type: 'string', description: 'Expected hex digest (compared case-insensitively after trimming).' },
  },
};

const hashReq = { text: 'hello world' };
const verifyReq = { text: 'hello world', algorithm: 'sha256', expected: 'B94D27B9934D3E08A52E52D7DA7DABFAC484EFE37A5380EE9088F7ACE2EFCDE9' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('computation', 'verification'), _Tail: Tail,
  Encoding, Algorithm, Hashes, HashCore, VerifyCore, HashRequest, VerifyRequest, DiscoveryResponse: discoverySchemaPlus(),
  HashResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HashCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  VerifyResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/VerifyCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HashCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/hash', summary: 'Compute checksums/digests over the input', operationId: 'hash', priceUsdc: 0.005, requestSchemaRef: 'HashRequest', responseSchemaRef: 'HashResponse', requestExample: hashReq, responseExample: hashExample },
  { method: 'post', path: '/verify', summary: 'Recompute one algorithm and compare to an expected digest', operationId: 'verify', priceUsdc: 0.006, requestSchemaRef: 'VerifyRequest', responseSchemaRef: 'VerifyResponse', requestExample: verifyReq, responseExample: verifyExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL digests + reasoning', operationId: 'lookup', priceUsdc: 0.01, oneCall: true, requestSchemaRef: 'HashRequest', responseSchemaRef: 'LookupResponse', requestExample: hashReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'checksum', title: 'Checksum & Hash API', version: '1.0.0',
  description: 'Deterministic checksum & hash digest calculator — CRC-32, Adler-32, MD5, SHA-1, SHA-256, SHA-512 over utf8/base64/hex input, plus digest verification. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
