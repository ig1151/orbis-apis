import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const DiffCore = {
  type: 'object',
  required: ['granted', 'required', 'granted_expanded', 'used_hierarchy', 'missing', 'extra', 'overlap', 'satisfied', 'satisfied_count', 'required_count'],
  properties: {
    granted: { type: 'array', items: { type: 'string' } }, required: { type: 'array', items: { type: 'string' } },
    granted_expanded: { type: 'array', items: { type: 'string' } }, used_hierarchy: { type: 'boolean' },
    missing: { type: 'array', items: { type: 'string' } }, extra: { type: 'array', items: { type: 'string' } },
    overlap: { type: 'array', items: { type: 'string' } }, satisfied: { type: 'boolean' },
    satisfied_count: { type: 'integer', minimum: 0 }, required_count: { type: 'integer', minimum: 0 },
  },
};
const ScopeInput = { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] };
const DiffRequest = {
  type: 'object', required: ['granted', 'required'], additionalProperties: false,
  properties: {
    granted: ScopeInput, required: ScopeInput,
    hierarchy: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } }, description: 'Optional: scope → scopes it implies.' },
  },
};

const CORE = {
  granted: ['openid', 'profile', 'email'], required: ['openid', 'profile', 'offline_access'],
  granted_expanded: ['openid', 'profile', 'email'], used_hierarchy: false,
  missing: ['offline_access'], extra: ['email'], overlap: ['openid', 'profile'],
  satisfied: false, satisfied_count: 2, required_count: 3,
};
const CHAIN = [
  { api: 'jwt-claim-policy-validator', reason: 'Validate the token whose "scope" claim these scopes came from.' },
  { api: 'iam-scope-simulator', reason: 'Map satisfied scopes to concrete action/resource permissions.' },
];
const INVALIDATORS = [
  'Scope names are compared as exact strings (after normalization); provider scope semantics, prefixes, and aliases (e.g. URL-style vs short scopes) are not normalized for you.',
  'Implication only applies if you supply a "hierarchy"; without it a broad scope does NOT automatically grant narrower ones.',
  'A satisfied diff means the requested scopes are present, not that the token is valid, unexpired, or accepted by the resource server.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { diff: 1 },
  recommended_actions_priority_order: [
    'Not satisfied — missing 1 scope(s): offline_access.',
    'Request the missing scope(s) in the authorization request (re-consent may be required).',
    'Unrelated over-granted scope(s): email.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('diff'), _Tail: Tail,
  DiffCore, DiffRequest, DiscoveryResponse: discoverySchema(),
  DiffResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DiffCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DiffCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'osd-1780000000000', request_id: 'osd-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { granted: 'openid profile email', required: ['openid', 'profile', 'offline_access'] };
const disc = {
  name: 'OAuth Scope Diff API', version: '1.0.0',
  description: 'Deterministic OAuth scope diff. Compares a granted scope set against a required set and returns missing, extra (over-grant), and whether the grant satisfies the requirement. Accepts space/comma strings or arrays plus an optional scope hierarchy for implied scopes. Pure set math, no LLM.',
  openapi_url: 'https://orbis-apis.onrender.com/oauth-scope-diff/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/diff', summary: 'Diff granted vs required scopes', price_usdc: 0.003 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL diff + reasoning', price_usdc: 0.006 },
  ],
  pricing: [
    { path: '/diff', price_usdc: 0.003, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.006, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/diff', summary: 'Diff granted vs required scopes', operationId: 'diff', priceUsdc: 0.003,
    requestSchemaRef: 'DiffRequest', responseSchemaRef: 'DiffResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL diff + reasoning', operationId: 'lookup', priceUsdc: 0.006, oneCall: true,
    requestSchemaRef: 'DiffRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '2/3 required scope(s) present → satisfied=false.',
        key_factors: ['Granted 3.', 'Missing: offline_access.', 'Over-granted: email.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'oauth-scope-diff', title: 'OAuth Scope Diff API', version: '1.0.0',
  description: 'Deterministic OAuth scope diff. Compares a granted scope set against a required set and returns missing, extra (over-grant), and whether the grant satisfies the requirement. Optional scope hierarchy for implied scopes. Pure set math, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-rubric': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
