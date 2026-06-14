import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const DockerFinding = {
  type: 'object', required: ['line', 'instruction', 'severity', 'code', 'message', 'recommendation'], additionalProperties: false,
  properties: {
    line: { type: 'integer', minimum: 0 }, instruction: { type: 'string' },
    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
    code: { type: 'string' }, message: { type: 'string' }, recommendation: { type: 'string' },
  },
};
const LintCore = {
  type: 'object',
  required: ['stages', 'instruction_count', 'effective_user', 'findings', 'by_severity', 'score', 'grade', 'passed'],
  properties: {
    stages: { type: 'integer', minimum: 0 }, instruction_count: { type: 'integer', minimum: 0 },
    effective_user: { type: ['string', 'null'] }, findings: { type: 'array', items: DockerFinding },
    by_severity: { type: 'object', required: ['high', 'medium', 'low'], additionalProperties: false, properties: { high: { type: 'integer' }, medium: { type: 'integer' }, low: { type: 'integer' } } },
    score: { type: 'integer', minimum: 0, maximum: 100 }, grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] }, passed: { type: 'boolean' },
  },
};
const LintRequest = {
  type: 'object', required: ['dockerfile'], additionalProperties: false,
  properties: { dockerfile: { type: 'string', minLength: 1, description: 'Dockerfile contents to lint.' } },
};

const CORE = {
  stages: 1, instruction_count: 5, effective_user: null,
  findings: [
    { line: 1, instruction: 'FROM', severity: 'high', code: 'RUNS_AS_ROOT', message: 'No USER instruction — the container runs as root by default.', recommendation: 'Create and switch to a non-root user (USER appuser) before the runtime command.' },
    { line: 2, instruction: 'RUN', severity: 'high', code: 'REMOTE_EXEC_PIPE', message: 'Pipes a downloaded script straight into a shell (curl … | sh) — no integrity check, full RCE on the build.', recommendation: 'Download, verify a checksum/signature, then execute.' },
    { line: 1, instruction: 'FROM', severity: 'medium', code: 'LATEST_TAG', message: 'FROM node:latest uses the :latest tag — builds are non-reproducible.', recommendation: 'Pin to a specific version tag or @sha256 digest.' },
    { line: 0, instruction: '(file)', severity: 'low', code: 'MISSING_HEALTHCHECK', message: 'No HEALTHCHECK instruction; orchestrators cannot detect an unhealthy container.', recommendation: 'Add a HEALTHCHECK appropriate to the service.' },
    { line: 4, instruction: 'COPY', severity: 'low', code: 'BROAD_COPY', message: 'COPY . copies the entire build context, which can leak .env, .git, and secrets into the image.', recommendation: 'Copy only what is needed and add a thorough .dockerignore.' },
  ],
  by_severity: { high: 2, medium: 1, low: 2 }, score: 28, grade: 'F', passed: false,
};
const CHAIN = [
  { api: 'secret-scanner', reason: 'Deep-scan the Dockerfile and build context for embedded credentials.' },
  { api: 'env-validator', reason: 'Validate the runtime env the container expects instead of baking it in.' },
];
const INVALIDATORS = [
  'Static parsing cannot resolve what a base image or a RUN script actually does, so it may miss issues introduced downstream or flag intentional patterns.',
  'USER analysis takes the last USER as effective; multi-stage builds where the final stage differs may need manual confirmation.',
  'Best-practice findings (apt hygiene, HEALTHCHECK) are advisory and context-dependent, not security guarantees.',
];
const TAIL = {
  confidence_score: 0.8, confidence_per_section: { dockerfile: 0.8 },
  recommended_actions_priority_order: [
    'Score 28/100 (F); 2 high-severity issue(s). Fix first: RUNS_AS_ROOT at line 1.',
    'Create and switch to a non-root user (USER appuser) before the runtime command.',
    'Rebuild and re-lint; pair with an image vulnerability scan.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('dockerfile'), _Tail: Tail,
  DockerFinding, LintCore, LintRequest, DiscoveryResponse: discoverySchema(),
  LintResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LintCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LintCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dkl-1780000000000', request_id: 'dkl-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { dockerfile: 'FROM node:latest\nRUN curl https://x.sh | bash\nENV API_KEY=sk_live_abc123\nCOPY . /app\nCMD ["node","x.js"]' };
const disc = {
  name: 'Dockerfile Linter API', version: '1.0.0',
  description: 'Deterministic Dockerfile linter. Parses instructions and flags security / best-practice issues (runs as root, unpinned base image, baked-in secrets, curl|sh remote-exec, ADD over COPY, apt hygiene, broad COPY, missing HEALTHCHECK) with a 0–100 score. Static heuristics, no LLM.',
  openapi_url: 'https://orbis-apis.onrender.com/dockerfile-linter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/lint', summary: 'Lint a Dockerfile', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL lint + reasoning', price_usdc: 0.01 },
  ],
  pricing: [
    { path: '/lint', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/lint', summary: 'Lint a Dockerfile', operationId: 'lint', priceUsdc: 0.006,
    requestSchemaRef: 'LintRequest', responseSchemaRef: 'LintResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL lint + reasoning', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'LintRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '5 instruction(s) across 1 stage(s); 5 finding(s) → score 28/100 (F).',
        key_factors: ['Effective user: root (no USER).', 'Severity: 2 high, 1 medium, 2 low.', 'Top issue: RUNS_AS_ROOT at line 1.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'dockerfile-linter', title: 'Dockerfile Linter API', version: '1.0.0',
  description: 'Deterministic Dockerfile linter. Parses instructions and flags security / best-practice issues with a 0–100 score. Static heuristics, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-rubric': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
