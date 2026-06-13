import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const OpenObject = { type: 'object', additionalProperties: true };

const TimeStatus = {
  type: ['object', 'null'],
  required: ['as_of', 'is_expired', 'is_not_yet_valid', 'seconds_until_expiry'], additionalProperties: false,
  properties: {
    as_of: { type: 'string', format: 'date-time' },
    is_expired: { type: ['boolean', 'null'] },
    is_not_yet_valid: { type: ['boolean', 'null'] },
    seconds_until_expiry: { type: ['integer', 'null'] },
  },
};

const DecodeCore = {
  type: 'object',
  required: ['valid_structure', 'parts', 'header', 'payload', 'signature_present', 'signature_verified', 'algorithm', 'token_type', 'key_id', 'registered_claims', 'claim_times', 'time_status'],
  properties: {
    valid_structure: { type: 'boolean' },
    parts: { type: 'integer' },
    header: OpenObject,
    payload: OpenObject,
    signature_present: { type: 'boolean' },
    signature_verified: { type: 'boolean', enum: [false] },
    algorithm: { type: ['string', 'null'] },
    token_type: { type: ['string', 'null'] },
    key_id: { type: ['string', 'null'] },
    registered_claims: OpenObject,
    claim_times: { type: 'object', additionalProperties: { type: ['string', 'null'] } },
    time_status: TimeStatus,
  },
};

const DecodeRequest = {
  type: 'object', required: ['token'], additionalProperties: false,
  properties: {
    token: { type: 'string', description: 'Compact JWT (header.payload.signature).' },
    as_of: { description: 'Optional epoch seconds or ISO date-time to evaluate exp/nbf against.', oneOf: [{ type: 'number' }, { type: 'string' }] },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('decode', 'authenticity'), _Tail: Tail,
  TimeStatus, DecodeCore, DecodeRequest, DiscoveryResponse: discoverySchema(),
  DecodeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DecodeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DecodeCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'jwt-1780000000000', request_id: 'jwt-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const CORE = {
  valid_structure: true, parts: 3,
  header: { alg: 'HS256', typ: 'JWT' },
  payload: { sub: '1234567890', name: 'John Doe', iat: 1516239022 },
  signature_present: true, signature_verified: false,
  algorithm: 'HS256', token_type: 'JWT', key_id: null,
  registered_claims: { sub: '1234567890', iat: 1516239022 },
  claim_times: { iat: '2018-01-18T01:30:22.000Z' },
  time_status: null,
};
const CHAIN = [
  { api: 'jwt-claim-policy-validator', reason: 'Validate the decoded claims (iss/aud/exp/required claims) against a policy.' },
  { api: 'secret-scanner', reason: 'Scan the decoded payload for tokens or secrets that should not live in a JWT.' },
];
const INVALIDATORS = [
  'The signature is NOT verified — a decoded JWT proves nothing about authenticity or integrity. Anyone can forge these fields without the signing key.',
  'NumericDate claims (exp/nbf/iat) are interpreted as seconds since the Unix epoch; a token using milliseconds will yield wildly wrong ISO times.',
  'time_status is computed only against the supplied "as_of"; without it, no expiry judgement is made.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { decode: 1, authenticity: 0 },
  recommended_actions_priority_order: [
    'Decoded 2 registered claim(s); alg=HS256.',
    'Signature is NOT verified — verify it against the issuer key (JWKS) before trusting this token.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const disc = {
  name: 'JWT Decoder API', version: '1.0.0',
  description: 'Deterministic JWT decoder. Splits a compact JWS, base64url-decodes the header and payload, parses their JSON, and surfaces registered claims with human-readable ISO times. Signature is NOT verified. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/jwt-decoder/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/decode', summary: 'Decode a JWT (no signature verification)', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL decode + reasoning', price_usdc: 0.008 },
  ],
  pricing: [
    { path: '/decode', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/decode', summary: 'Decode a JWT (no signature verification)', operationId: 'decode', priceUsdc: 0.004,
    requestSchemaRef: 'DecodeRequest', responseSchemaRef: 'DecodeResponse', requestExample: { token: TOKEN },
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL decode + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'DecodeRequest', responseSchemaRef: 'LookupResponse', requestExample: { token: TOKEN },
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Split the JWT into 3 segments and decoded header + payload as JSON; surfaced 2 registered claim(s).',
        key_factors: ['alg=HS256, typ=JWT, kid=none.', 'Signature present: true; verified: false (never verified by this API).', 'No as_of supplied — no expiry judgement.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'jwt-decoder', title: 'JWT Decoder API', version: '1.0.0',
  description: 'Deterministic JWT decoder: base64url-decodes header and payload, parses JSON, surfaces registered claims with ISO times. Signature is NOT verified. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
