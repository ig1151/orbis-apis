import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const CorsFinding = {
  type: 'object', required: ['field', 'severity', 'code', 'message', 'recommendation'], additionalProperties: false,
  properties: {
    field: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    code: { type: 'string' }, message: { type: 'string' }, recommendation: { type: 'string' },
  },
};
const CorsConfig = {
  type: 'object',
  required: ['allow_origin', 'allow_credentials', 'allow_methods', 'allow_headers', 'expose_headers', 'vary', 'max_age'],
  additionalProperties: false,
  properties: {
    allow_origin: { type: ['string', 'null'] }, allow_credentials: { type: 'boolean' },
    allow_methods: { type: 'array', items: { type: 'string' } }, allow_headers: { type: 'array', items: { type: 'string' } },
    expose_headers: { type: 'array', items: { type: 'string' } }, vary: { type: 'array', items: { type: 'string' } },
    max_age: { type: ['integer', 'null'] },
  },
};
const LintCore = {
  type: 'object',
  required: ['config', 'findings', 'by_severity', 'score', 'grade', 'passed', 'source'],
  properties: {
    config: CorsConfig, findings: { type: 'array', items: CorsFinding },
    by_severity: { type: 'object', required: ['high', 'medium', 'low'], additionalProperties: false, properties: { high: { type: 'integer' }, medium: { type: 'integer' }, low: { type: 'integer' } } },
    score: { type: 'integer', minimum: 0, maximum: 100 }, grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    passed: { type: 'boolean' }, source: { type: 'string', enum: ['config', 'headers'] },
  },
};
const LintRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    allow_origin: { type: 'string', description: 'Access-Control-Allow-Origin value ("*", "null", or an origin).' },
    allow_credentials: { type: 'boolean' },
    allow_methods: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
    allow_headers: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
    expose_headers: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
    vary: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
    max_age: { type: 'number' },
    headers: { type: 'object', description: 'Alternatively, a raw response-headers object; Access-Control-* headers are parsed.' },
  },
};

const CORE = {
  config: { allow_origin: '*', allow_credentials: true, allow_methods: ['GET', 'POST'], allow_headers: [], expose_headers: [], vary: [], max_age: null },
  findings: [{ field: 'access-control-allow-origin', severity: 'high', code: 'WILDCARD_ORIGIN_WITH_CREDENTIALS', message: 'allow-origin "*" combined with allow-credentials:true is rejected by browsers and signals a server that may reflect arbitrary origins with credentials.', recommendation: 'Echo a single validated origin from an allow-list instead of "*" when credentials are enabled.' }],
  by_severity: { high: 1, medium: 0, low: 0 }, score: 75, grade: 'C', passed: false, source: 'config',
};
const CHAIN = [
  { api: 'csp-builder-linter', reason: 'Harden the Content-Security-Policy alongside the CORS policy.' },
  { api: 'jwt-claim-policy-validator', reason: 'Validate the bearer tokens these cross-origin requests will carry.' },
];
const INVALIDATORS = [
  'Static analysis cannot see whether allow-origin is REFLECTED from the request Origin at runtime — a single concrete origin in the sample may actually be dynamically echoed (the dangerous case), so confirm server logic.',
  'Heuristics encode common-case best practice; a wildcard origin is fine for genuinely public, non-credentialed APIs.',
  'Browser enforcement varies; the policy is one layer, not a substitute for authentication/authorization.',
];
const TAIL = {
  confidence_score: 0.9, confidence_per_section: { policy: 0.9 },
  recommended_actions_priority_order: [
    'Score 75/100 (C); 1 high-severity issue(s). Fix first: WILDCARD_ORIGIN_WITH_CREDENTIALS on access-control-allow-origin.',
    'Echo a single validated origin from an allow-list instead of "*" when credentials are enabled.',
    'Verify the running server does not reflect arbitrary Origin headers back with credentials.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('policy'), _Tail: Tail,
  CorsFinding, CorsConfig, LintCore, LintRequest, DiscoveryResponse: discoverySchema(),
  LintResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LintCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LintCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'cor-1780000000000', request_id: 'cor-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { allow_origin: '*', allow_credentials: true, allow_methods: ['GET', 'POST'] };
const disc = {
  name: 'CORS Linter API', version: '1.0.0',
  description: 'Deterministic CORS configuration linter. Accepts an explicit config or a raw response-headers object and flags cross-origin misconfigurations (wildcard origin with credentials, null/reflected origin, wildcard headers with credentials, missing Vary: Origin) with a 0–100 score. Best-practice heuristics, no LLM.',
  openapi_url: 'https://orbis-apis.onrender.com/cors-linter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/lint', summary: 'Lint a CORS configuration', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL lint + reasoning', price_usdc: 0.009 },
  ],
  pricing: [
    { path: '/lint', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/lint', summary: 'Lint a CORS configuration', operationId: 'lint', priceUsdc: 0.005,
    requestSchemaRef: 'LintRequest', responseSchemaRef: 'LintResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL lint + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true,
    requestSchemaRef: 'LintRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Parsed CORS config; 1 finding(s) → score 75/100 (C).',
        key_factors: ['allow-origin "*", credentials=true.', 'Severity: 1 high, 0 medium, 0 low.', 'Top issue: WILDCARD_ORIGIN_WITH_CREDENTIALS.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'cors-linter', title: 'CORS Linter API', version: '1.0.0',
  description: 'Deterministic CORS configuration linter. Accepts an explicit config or a raw response-headers object and flags cross-origin misconfigurations with a 0–100 score. Best-practice heuristics, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-rubric': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
