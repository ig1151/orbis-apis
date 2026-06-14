import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const Check = {
  type: 'object', required: ['name', 'status', 'detail'], additionalProperties: false,
  properties: { name: { type: 'string' }, status: { type: 'string', enum: ['pass', 'fail', 'skip'] }, detail: { type: 'string' } },
};
const Violation = {
  type: 'object', required: ['code', 'claim', 'message'], additionalProperties: false,
  properties: { code: { type: 'string' }, claim: { type: ['string', 'null'] }, message: { type: 'string' } },
};
const ValidateCore = {
  type: 'object',
  required: ['valid', 'signature_verified', 'header', 'claims', 'checks', 'violations', 'now', 'expires_in_seconds'],
  properties: {
    valid: { type: 'boolean' }, signature_verified: { type: 'boolean', enum: [false] },
    header: { type: ['object', 'null'], additionalProperties: true },
    claims: { type: 'object', additionalProperties: true },
    checks: { type: 'array', items: Check }, violations: { type: 'array', items: Violation },
    now: { type: 'integer' }, expires_in_seconds: { type: ['integer', 'null'] },
  },
};
const Policy = {
  type: 'object', additionalProperties: false,
  properties: {
    iss: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
    aud: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
    subject: { type: 'string' },
    require: { type: 'array', items: { type: 'string' } },
    equals: { type: 'object', additionalProperties: true },
    max_age_seconds: { type: 'number' }, clock_skew_seconds: { type: 'number' },
    check_exp: { type: 'boolean' }, check_nbf: { type: 'boolean' },
  },
};
const ValidateRequest = {
  type: 'object', required: ['policy'], additionalProperties: false,
  properties: {
    token: { type: 'string', description: 'JWT (header.payload.signature). Signature is NOT verified.' },
    claims: { type: 'object', additionalProperties: true, description: 'Alternatively, a decoded claims object.' },
    policy: Policy,
    now: { type: 'integer', description: 'Unix-seconds time for exp/nbf checks. Default: server time.' },
  },
};

const CLAIMS = { iss: 'https://auth.example.com', aud: 'my-api', sub: 'user-123', exp: 2000000000, iat: 1999999000, scope: 'read' };
const CORE = {
  valid: true, signature_verified: false, header: null, claims: CLAIMS,
  checks: [
    { name: 'exp', status: 'pass', detail: 'Not expired (exp 2000000000).' },
    { name: 'nbf', status: 'skip', detail: 'No nbf claim.' },
    { name: 'iss', status: 'pass', detail: 'Issuer "https://auth.example.com" allowed.' },
    { name: 'aud', status: 'pass', detail: 'Audience matched (my-api).' },
    { name: 'required', status: 'pass', detail: 'All required claims present (sub, scope).' },
  ],
  violations: [], now: 1999999500, expires_in_seconds: 500,
};
const CHAIN = [
  { api: 'oauth-scope-diff', reason: 'Compare the token’s "scope" claim against what the operation requires.' },
  { api: 'iam-scope-simulator', reason: 'Map the validated identity to concrete action/resource permissions.' },
];
const INVALIDATORS = [
  'SIGNATURE IS NOT VERIFIED. This only inspects claims — a valid result does NOT prove the token is authentic or unaltered. Verify the signature against the issuer’s JWKS separately before trusting it.',
  'Time checks use the supplied "now" (or server time) and clock_skew_seconds; a wrong clock or skew changes exp/nbf outcomes.',
  'Claim comparisons are exact (issuer/audience/subject/equals); it does not understand provider-specific claim semantics or nested-claim policies beyond top-level keys.',
];
const TAIL = {
  confidence_score: 0.9, confidence_per_section: { claim_checks: 1, authenticity: 0 },
  recommended_actions_priority_order: [
    'All claim-policy checks passed (expires in 500s).',
    'ALWAYS verify the JWT signature (issuer JWKS) separately — this endpoint does not, so do not authorize on claims alone.',
    'Proceed only after signature verification succeeds.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('claim_checks', 'authenticity'), _Tail: Tail,
  Check, Violation, ValidateCore, Policy, ValidateRequest, DiscoveryResponse: discoverySchema(),
  ValidateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidateCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidateCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'jwt-1780000000000', request_id: 'jwt-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { claims: CLAIMS, policy: { iss: 'https://auth.example.com', aud: ['my-api'], require: ['sub', 'scope'] }, now: 1999999500 };
const disc = {
  name: 'JWT Claim Policy Validator API', version: '1.0.0',
  description: 'Deterministic JWT claim-policy validator. Decodes a JWT (or takes a claims object) WITHOUT verifying the signature, then checks claims against a policy: exp/nbf/iat validity (clock skew + max age), issuer/audience/subject allow-lists, required claims, and exact-value matches. Signature is NOT verified. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/jwt-claim-policy-validator/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/validate', summary: 'Validate JWT claims vs a policy', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL validate + reasoning', price_usdc: 0.008 },
  ],
  pricing: [
    { path: '/validate', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/validate', summary: 'Validate JWT claims vs a policy', operationId: 'validate', priceUsdc: 0.004,
    requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'ValidateResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL validate + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '4 claim check(s) run → 0 violation(s); valid=true. Signature NOT verified.',
        key_factors: ['Checks: exp=pass, nbf=skip, iss=pass, aud=pass, required=pass.', 'No claim violations.', 'signature_verified is always false — verify the signature out of band.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'jwt-claim-policy-validator', title: 'JWT Claim Policy Validator API', version: '1.0.0',
  description: 'Deterministic JWT claim-policy validator. Decodes a JWT (or takes claims) WITHOUT verifying the signature, then checks claims against a policy (exp/nbf/iat, issuer/audience/subject, required, exact matches). Signature is NOT verified. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-rubric': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
