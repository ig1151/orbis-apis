import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const Finding = {
  type: 'object',
  required: ['type', 'severity', 'line', 'column', 'match_preview', 'match_length', 'entropy_bits_per_char'],
  additionalProperties: false,
  properties: {
    type: { type: 'string' },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    line: { type: 'integer', minimum: 1 }, column: { type: 'integer', minimum: 1 },
    match_preview: { type: 'string' }, match_length: { type: 'integer', minimum: 0 },
    entropy_bits_per_char: { type: ['number', 'null'] },
  },
};

const ScanCore = {
  type: 'object',
  required: ['has_secrets', 'finding_count', 'truncated_findings', 'by_severity', 'by_type', 'scanned_chars', 'scanned_lines', 'redacted', 'findings'],
  properties: {
    has_secrets: { type: 'boolean' }, finding_count: { type: 'integer', minimum: 0 },
    truncated_findings: { type: 'boolean' },
    by_severity: { type: 'object', required: ['high', 'medium', 'low'], additionalProperties: false, properties: { high: { type: 'integer' }, medium: { type: 'integer' }, low: { type: 'integer' } } },
    by_type: { type: 'object', additionalProperties: { type: 'integer' } },
    scanned_chars: { type: 'integer', minimum: 0 }, scanned_lines: { type: 'integer', minimum: 0 },
    redacted: { type: 'boolean' },
    findings: { type: 'array', items: Finding },
  },
};

const ScanRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: {
    text: { type: 'string', description: 'Text or source to scan. Never stored.' },
    redact: { type: 'boolean', description: 'Redact matched values in the output. Default true.' },
    min_entropy: { type: 'number', minimum: 0, description: 'Optional: drop findings below this bits/char entropy.' },
  },
};

const CORE = {
  has_secrets: true, finding_count: 2, truncated_findings: false,
  by_severity: { high: 1, medium: 1, low: 0 },
  by_type: { aws_access_key_id: 1, generic_secret_assignment: 1 },
  scanned_chars: 52, scanned_lines: 2, redacted: true,
  findings: [
    { type: 'aws_access_key_id', severity: 'high', line: 1, column: 9, match_preview: 'AKIA…LE', match_length: 20, entropy_bits_per_char: null },
    { type: 'generic_secret_assignment', severity: 'medium', line: 2, column: 13, match_preview: 'hunt…23', match_length: 21, entropy_bits_per_char: 3.71 },
  ],
};
const ACTS = [
  '2 potential secret(s) found (1 high). First: aws_access_key_id at line 1:9.',
  'Rotate every matched credential immediately — assume leaked secrets are already compromised.',
  'Purge them from git history (e.g. git filter-repo / BFG) and move to a secrets manager or env vars.',
];
const CHAIN = [
  { api: 'env-validator', reason: 'Move matched secrets into a validated .env and out of source.' },
  { api: 'idempotency-key-generator', reason: 'Fingerprint sanitized payloads without embedding raw secrets.' },
];
const INVALIDATORS = [
  'Pattern + entropy matching has false negatives (custom/obfuscated secret formats) and false positives (high-entropy non-secrets like hashes or UUIDs) — treat findings as leads, not proof.',
  'Only the listed providers and a generic assignment heuristic are checked; a clean scan does not certify the absence of secrets.',
  'The generic detector keys on variable names near the value; secrets stored without a tell-tale name may be missed.',
];
const TAIL = {
  confidence_score: 0.85, confidence_per_section: { detection: 0.85 },
  recommended_actions_priority_order: ACTS, chain_to: CHAIN,
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('detection'), _Tail: Tail,
  Finding, ScanCore, ScanRequest, DiscoveryResponse: discoverySchema(),
  ScanResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScanCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScanCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'ssc-1780000000000', request_id: 'ssc-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { text: "AWS_KEY=AKIAIOSFODNN7EXAMPLE\npassword = 'hunter2isnotsecure123'" };
const disc = {
  name: 'Secret Scanner API', version: '1.0.0',
  description: 'Deterministic secret scanner. Matches text/code against known credential patterns (AWS, GitHub, Slack, Google, Stripe, npm, private keys, JWTs) plus a generic high-entropy-assignment heuristic, and reports redacted findings with line/column and severity. Detection only. No LLM, input never stored.',
  openapi_url: 'https://orbis-apis.onrender.com/secret-scanner/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/scan', summary: 'Scan text for leaked secrets', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL scan + reasoning', price_usdc: 0.01 },
  ],
  pricing: [
    { path: '/scan', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/scan', summary: 'Scan text for leaked secrets', operationId: 'scan', priceUsdc: 0.006,
    requestSchemaRef: 'ScanRequest', responseSchemaRef: 'ScanResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL scan + reasoning', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'ScanRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '2 match(es) across 2 pattern type(s) over 2 line(s).',
        key_factors: ['Severity breakdown: 1 high, 1 medium, 0 low.', 'Types: aws_access_key_id, generic_secret_assignment.', 'Output is redacted.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'secret-scanner', title: 'Secret Scanner API', version: '1.0.0',
  description: 'Deterministic secret scanner. Matches text/code against known credential patterns plus a generic high-entropy-assignment heuristic, and reports redacted findings with line/column and severity. Detection only. No LLM, input never stored.',
  endpoints, schemas, infoExtensions: { 'x-security-rubric': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
