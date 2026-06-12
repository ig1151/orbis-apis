import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const GenCore = {
  type: 'object',
  required: ['type', 'code', 'algorithm', 'digits', 'counter', 'period', 'timestamp', 'seconds_remaining', 'valid_until'],
  properties: {
    type: { type: 'string', enum: ['totp', 'hotp'] },
    code: { type: 'string' },
    algorithm: { type: 'string', enum: ['SHA1', 'SHA256', 'SHA512'] },
    digits: { type: 'integer', enum: [6, 7, 8] },
    counter: { type: 'integer', minimum: 0 },
    period: { type: ['integer', 'null'] },
    timestamp: { type: ['integer', 'null'] },
    seconds_remaining: { type: ['integer', 'null'] },
    valid_until: { type: ['string', 'null'] },
  },
};

const VerifyCore = {
  type: 'object',
  required: ['type', 'valid', 'matched_counter', 'matched_offset', 'window', 'checked_counters', 'algorithm', 'digits'],
  properties: {
    type: { type: 'string', enum: ['totp', 'hotp'] },
    valid: { type: 'boolean' },
    matched_counter: { type: ['integer', 'null'] },
    matched_offset: { type: ['integer', 'null'] },
    window: { type: 'integer', minimum: 0 },
    checked_counters: { type: 'array', items: { type: 'integer' } },
    algorithm: { type: 'string', enum: ['SHA1', 'SHA256', 'SHA512'] },
    digits: { type: 'integer', enum: [6, 7, 8] },
  },
};

const SecretCore = {
  type: 'object',
  required: ['secret', 'bytes', 'algorithm', 'digits', 'period', 'type', 'issuer', 'account', 'otpauth_uri'],
  properties: {
    secret: { type: 'string' }, bytes: { type: 'integer' },
    algorithm: { type: 'string', enum: ['SHA1', 'SHA256', 'SHA512'] },
    digits: { type: 'integer', enum: [6, 7, 8] }, period: { type: 'integer' },
    type: { type: 'string', enum: ['totp', 'hotp'] },
    issuer: { type: ['string', 'null'] }, account: { type: ['string', 'null'] },
    otpauth_uri: { type: 'string' },
  },
};

const GenerateRequest = {
  type: 'object', required: ['secret'], additionalProperties: false,
  properties: {
    secret: { type: 'string', description: 'Base32-encoded shared secret.' },
    type: { type: 'string', enum: ['totp', 'hotp'], description: 'Default totp.' },
    algorithm: { type: 'string', enum: ['SHA1', 'SHA256', 'SHA512'], description: 'Default SHA1.' },
    digits: { type: 'integer', enum: [6, 7, 8], description: 'Default 6.' },
    period: { type: 'integer', minimum: 1, maximum: 600, description: 'TOTP step seconds. Default 30.' },
    timestamp: { type: 'integer', minimum: 0, description: 'TOTP unix-seconds time. Default: now.' },
    counter: { type: 'integer', minimum: 0, description: 'HOTP counter (required for HOTP).' },
  },
};
const VerifyRequest = {
  type: 'object', required: ['secret', 'code'], additionalProperties: false,
  properties: {
    secret: { type: 'string' }, code: { type: 'string', description: 'The numeric code to verify.' },
    type: { type: 'string', enum: ['totp', 'hotp'] }, algorithm: { type: 'string', enum: ['SHA1', 'SHA256', 'SHA512'] },
    digits: { type: 'integer', enum: [6, 7, 8] }, period: { type: 'integer', minimum: 1, maximum: 600 },
    timestamp: { type: 'integer', minimum: 0 }, counter: { type: 'integer', minimum: 0 },
    window: { type: 'integer', minimum: 0, maximum: 10, description: '± steps to check. Default 1.' },
  },
};
const SecretRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    bytes: { type: 'integer', minimum: 10, maximum: 64, description: 'Secret length in bytes. Default 20.' },
    type: { type: 'string', enum: ['totp', 'hotp'] }, algorithm: { type: 'string', enum: ['SHA1', 'SHA256', 'SHA512'] },
    digits: { type: 'integer', enum: [6, 7, 8] }, period: { type: 'integer', minimum: 1, maximum: 600 },
    issuer: { type: 'string' }, account: { type: 'string' },
  },
};

const GEN = { type: 'totp', code: '287082', algorithm: 'SHA1', digits: 6, counter: 1, period: 30, timestamp: 59, seconds_remaining: 1, valid_until: '1970-01-01T00:01:00.000Z' };
const VER = { type: 'totp', valid: true, matched_counter: 1, matched_offset: 0, window: 1, checked_counters: [0, 1, 2], algorithm: 'SHA1', digits: 6 };
const SEC = { secret: 'KRSXG5CTMVRXEZLUKVKFE2KSMFRGGZDF', bytes: 20, algorithm: 'SHA1', digits: 6, period: 30, type: 'totp', issuer: 'Acme', account: 'alice@acme.com', otpauth_uri: 'otpauth://totp/Acme%3Aalice%40acme.com?secret=KRSXG5CTMVRXEZLUKVKFE2KSMFRGGZDF&algorithm=SHA1&digits=6&issuer=Acme&period=30' };

const CHAIN = [
  { api: 'passphrase-generator', reason: 'Generate the primary passphrase this OTP is the second factor for.' },
  { api: 'secret-scanner', reason: 'Ensure the TOTP secret is not committed to source control.' },
];
const INVALIDATORS = [
  'Codes are time- or counter-bound: a TOTP is only valid within its period (default 30s); a stale timestamp yields a code that has already expired.',
  'Verification uses a ± window of steps; a larger window accepts older/newer codes and trades security for clock-skew tolerance.',
  'Security depends entirely on the secret staying secret — anyone with the base32 secret can mint valid codes.',
];
const otp1 = { confidence_score: 1, confidence_per_section: { otp: 1 }, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true } };
const GEN_TAIL = { ...otp1, recommended_actions_priority_order: ['TOTP code 287082 (SHA1, 6 digits) for counter 1.', 'Valid for 1s more (until 1970-01-01T00:01:00.000Z); regenerate after expiry.', 'Transmit and store the secret only over secure channels.'], chain_to: CHAIN };
const VER_TAIL = { ...otp1, recommended_actions_priority_order: ['Code accepted at counter 1 (offset 0).', 'Use the smallest window that tolerates your clients’ clock skew.', 'Reject reused codes at the application layer to prevent replay.'], chain_to: CHAIN };
const SEC_TAIL = { ...otp1, recommended_actions_priority_order: ['Provision an authenticator with the otpauth URI or the base32 secret (20 bytes, SHA1).', 'Show the secret/QR once, then store only a server-side encrypted copy.', 'Pair with backup codes so a lost device does not lock the user out.'], chain_to: CHAIN };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('otp'), _Tail: Tail,
  GenCore, VerifyCore, SecretCore, GenerateRequest, VerifyRequest, SecretRequest, DiscoveryResponse: discoverySchema(),
  GenerateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/GenCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  VerifyResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/VerifyCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  SecretResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SecretCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/GenCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'otp-1780000000000', request_id: 'otp-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const disc = {
  name: 'TOTP / HOTP Generator API', version: '1.0.0',
  description: 'RFC 4226 (HOTP) + RFC 6238 (TOTP) one-time-password generator and verifier. Pure HMAC crypto over a base32 secret — deterministic given secret + counter/timestamp. Also mints random secrets and otpauth:// URIs. No LLM, secrets never stored.',
  openapi_url: 'https://orbis-apis.onrender.com/totp-hotp-generator/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/generate', summary: 'Generate a TOTP/HOTP code', price_usdc: 0.004 },
    { method: 'POST', path: '/verify', summary: 'Verify a code within a window', price_usdc: 0.004 },
    { method: 'POST', path: '/secret', summary: 'Mint a random secret + otpauth URI', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL generate + reasoning', price_usdc: 0.008 },
  ],
  pricing: [
    { path: '/generate', price_usdc: 0.004, currency: 'USDC' },
    { path: '/verify', price_usdc: 0.004, currency: 'USDC' },
    { path: '/secret', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/generate', summary: 'Generate a TOTP/HOTP code', operationId: 'generate', priceUsdc: 0.004,
    requestSchemaRef: 'GenerateRequest', responseSchemaRef: 'GenerateResponse',
    requestExample: { secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', type: 'totp', timestamp: 59 },
    responseExample: { ...env, ...GEN, ...GEN_TAIL },
  },
  {
    method: 'post', path: '/verify', summary: 'Verify a code within a window', operationId: 'verifyCode', priceUsdc: 0.004,
    requestSchemaRef: 'VerifyRequest', responseSchemaRef: 'VerifyResponse',
    requestExample: { secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', code: '287082', timestamp: 59, window: 1 },
    responseExample: { ...env, ...VER, ...VER_TAIL },
  },
  {
    method: 'post', path: '/secret', summary: 'Mint a random secret + otpauth URI', operationId: 'mintSecret', priceUsdc: 0.004,
    requestSchemaRef: 'SecretRequest', responseSchemaRef: 'SecretResponse',
    requestExample: { issuer: 'Acme', account: 'alice@acme.com', bytes: 20 },
    responseExample: { ...env, ...SEC, ...SEC_TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL generate + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'GenerateRequest', responseSchemaRef: 'LookupResponse',
    requestExample: { secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', timestamp: 59 },
    responseExample: {
      ...env, ...GEN,
      reasoning: {
        why_result_generated: 'HMAC-SHA1 over counter 1 → truncated to 6 digits → 287082.',
        key_factors: ['TOTP: counter = floor(timestamp 59 / period 30) = 1.', '1s remaining in this step.', 'Algorithm SHA1, 6 digits.'],
        invalidators: INVALIDATORS,
      },
      ...GEN_TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'totp-hotp-generator', title: 'TOTP / HOTP Generator API', version: '1.0.0',
  description: 'RFC 4226 (HOTP) + RFC 6238 (TOTP) one-time-password generator and verifier. Pure HMAC crypto over a base32 secret — deterministic given secret + counter/timestamp. Also mints random secrets and otpauth:// URIs. No LLM, secrets never stored.',
  endpoints, schemas, infoExtensions: { 'x-security-rubric': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
