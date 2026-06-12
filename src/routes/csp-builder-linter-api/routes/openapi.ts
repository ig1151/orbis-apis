import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const CspFinding = {
  type: 'object',
  required: ['directive', 'severity', 'code', 'message', 'recommendation'],
  additionalProperties: false,
  properties: {
    directive: { type: 'string' },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    code: { type: 'string' }, message: { type: 'string' }, recommendation: { type: 'string' },
  },
};

const LintCore = {
  type: 'object',
  required: ['valid', 'directive_count', 'parsed_directives', 'unknown_directives', 'findings', 'by_severity', 'score', 'grade', 'passed'],
  properties: {
    valid: { type: 'boolean' },
    directive_count: { type: 'integer', minimum: 0 },
    parsed_directives: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
    unknown_directives: { type: 'array', items: { type: 'string' } },
    findings: { type: 'array', items: CspFinding },
    by_severity: { type: 'object', required: ['high', 'medium', 'low'], additionalProperties: false, properties: { high: { type: 'integer' }, medium: { type: 'integer' }, low: { type: 'integer' } } },
    score: { type: 'integer', minimum: 0, maximum: 100 },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    passed: { type: 'boolean' },
  },
};

const BuildCore = {
  type: 'object',
  required: ['policy', 'header_name', 'report_only', 'directive_count', 'directives'],
  properties: {
    policy: { type: 'string' },
    header_name: { type: 'string', enum: ['Content-Security-Policy', 'Content-Security-Policy-Report-Only'] },
    report_only: { type: 'boolean' },
    directive_count: { type: 'integer', minimum: 1 },
    directives: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
  },
};

const LintRequest = {
  type: 'object', required: ['csp'], additionalProperties: false,
  properties: { csp: { type: 'string', minLength: 1, description: 'A Content-Security-Policy header value to lint.' } },
};
const BuildRequest = {
  type: 'object', required: ['directives'], additionalProperties: false,
  properties: {
    directives: { type: 'object', additionalProperties: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] }, description: 'Map of directive name to a source string or array. CSP keywords are auto-quoted.' },
    report_only: { type: 'boolean', description: 'Emit the Report-Only header name. Default false.' },
  },
};

const LINT = {
  valid: true, directive_count: 3,
  parsed_directives: { 'default-src': ["'self'"], 'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.example.com'], 'img-src': ['*'] },
  unknown_directives: [],
  findings: [
    { directive: 'script-src', severity: 'high', code: 'UNSAFE_INLINE_SCRIPT', message: "script-src allows 'unsafe-inline', which permits inline scripts and defeats most XSS protection.", recommendation: 'Remove unsafe-inline; use nonces or hashes for required inline scripts.' },
    { directive: 'img-src', severity: 'high', code: 'WILDCARD_SOURCE', message: 'img-src contains a wildcard "*" source, allowing content from any origin.', recommendation: 'Replace "*" in img-src with an explicit allow-list.' },
    { directive: 'frame-ancestors', severity: 'medium', code: 'MISSING_FRAME_ANCESTORS', message: 'No frame-ancestors; the page can be framed for clickjacking.', recommendation: "Add frame-ancestors 'none' or an explicit allow-list." },
    { directive: 'base-uri', severity: 'low', code: 'MISSING_BASE_URI', message: 'No base-uri; injected <base> tags can hijack relative URLs.', recommendation: "Add base-uri 'self' (or 'none')." },
    { directive: 'object-src', severity: 'low', code: 'OBJECT_SRC_NOT_NONE', message: "object-src is set but not 'none'; plugin content may still load.", recommendation: "Prefer object-src 'none' unless you specifically need embeds." },
  ],
  by_severity: { high: 2, medium: 1, low: 2 }, score: 28, grade: 'F', passed: false,
};
const BUILD = {
  policy: "default-src 'self'; script-src 'self' https://cdn.example.com; object-src 'none'",
  header_name: 'Content-Security-Policy', report_only: false, directive_count: 3,
  directives: { 'default-src': ["'self'"], 'script-src': ["'self'", 'https://cdn.example.com'], 'object-src': ["'none'"] },
};

const CHAIN = [
  { api: 'cors-linter', reason: 'Audit the matching CORS policy once the CSP is hardened.' },
  { api: 'secret-scanner', reason: 'Check that any report-uri endpoint or inline config holds no secrets.' },
];
const INVALIDATORS = [
  'Linting is against published best-practice heuristics, not your app’s runtime behavior — a strict policy can still break legitimate functionality, and a lenient one can be safe if the app needs no inline/eval.',
  "'unsafe-inline' is ignored by browsers when a nonce or hash is present, so a finding may be moot under strict-dynamic; verify against the full directive set.",
  'New directives or browser-specific behavior may not be modeled; treat the score as guidance, not certification.',
];
const policy1 = { confidence_per_section: { policy: 0.9 }, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true } };
const LINT_TAIL = {
  confidence_score: 0.9, ...policy1, chain_to: CHAIN,
  recommended_actions_priority_order: [
    'Score 28/100 (F); 2 high-severity issue(s). Fix first: UNSAFE_INLINE_SCRIPT on script-src.',
    'Remove unsafe-inline; use nonces or hashes for required inline scripts.',
    'Deploy with Content-Security-Policy-Report-Only first to catch breakage before enforcing.',
  ],
};
const BUILD_TAIL = {
  confidence_score: 1, confidence_per_section: { policy: 1 },
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true }, chain_to: CHAIN,
  recommended_actions_priority_order: [
    `Set response header "Content-Security-Policy: ${BUILD.policy}".`,
    'Run the result through /lint to confirm it has no high-severity gaps.',
    'Consider deploying report-only first to catch breakage.',
  ],
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('policy'), _Tail: Tail,
  CspFinding, LintCore, BuildCore, LintRequest, BuildRequest, DiscoveryResponse: discoverySchema(),
  LintResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LintCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  BuildResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BuildCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LintCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'csp-1780000000000', request_id: 'csp-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const disc = {
  name: 'CSP Builder & Linter API', version: '1.0.0',
  description: 'Deterministic Content-Security-Policy builder + linter. /lint flags well-known weaknesses (unsafe-inline/eval, wildcards, data: scripts, insecure schemes, missing default-src/object-src/frame-ancestors/base-uri) with a 0–100 hardening score; /build assembles a canonical header from a directives object. Best-practice heuristics, no LLM.',
  openapi_url: 'https://orbis-apis.onrender.com/csp-builder-linter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/lint', summary: 'Lint a CSP header for weaknesses', price_usdc: 0.005 },
    { method: 'POST', path: '/build', summary: 'Build a CSP header from directives', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL lint + reasoning', price_usdc: 0.009 },
  ],
  pricing: [
    { path: '/lint', price_usdc: 0.005, currency: 'USDC' },
    { path: '/build', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/lint', summary: 'Lint a CSP header for weaknesses', operationId: 'lint', priceUsdc: 0.005,
    requestSchemaRef: 'LintRequest', responseSchemaRef: 'LintResponse',
    requestExample: { csp: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.example.com; img-src *" },
    responseExample: { ...env, ...LINT, ...LINT_TAIL },
  },
  {
    method: 'post', path: '/build', summary: 'Build a CSP header from directives', operationId: 'build', priceUsdc: 0.004,
    requestSchemaRef: 'BuildRequest', responseSchemaRef: 'BuildResponse',
    requestExample: { directives: { 'default-src': ['self'], 'script-src': ['self', 'https://cdn.example.com'], 'object-src': ['none'] } },
    responseExample: { ...env, ...BUILD, ...BUILD_TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL lint + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true,
    requestSchemaRef: 'LintRequest', responseSchemaRef: 'LookupResponse',
    requestExample: { csp: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.example.com; img-src *" },
    responseExample: {
      ...env, ...LINT,
      reasoning: {
        why_result_generated: '3 directive(s) parsed; 5 finding(s) → score 28/100 (F).',
        key_factors: ['Severity: 2 high, 1 medium, 2 low.', 'Top issue: UNSAFE_INLINE_SCRIPT on script-src.', 'All directives recognized.'],
        invalidators: INVALIDATORS,
      },
      ...LINT_TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'csp-builder-linter', title: 'CSP Builder & Linter API', version: '1.0.0',
  description: 'Deterministic Content-Security-Policy builder + linter. /lint flags well-known weaknesses with a 0–100 hardening score; /build assembles a canonical header from a directives object. Best-practice heuristics, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-rubric': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
