import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';

const EnvelopeOk = {
  type: 'object',
  required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: {
    trace_id: { type: 'string' },
    computed_at: { type: 'string', format: 'date-time' },
    success: { type: 'boolean', enum: [true] },
    latency_ms: { type: 'integer', minimum: 0 },
  },
};

const CheckItem = {
  type: 'object',
  required: ['id', 'label', 'severity', 'status', 'message', 'recommendation'],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
    status: { type: 'string', enum: ['pass', 'fail', 'warn', 'info'] },
    message: { type: 'string' },
    recommendation: { type: ['string', 'null'] },
  },
};

const ValidatorCore = {
  type: 'object',
  required: ['validation_score', 'verdict', 'checks', 'passed', 'failed', 'warnings', 'critical_issues'],
  properties: {
    validation_score: { type: 'number', minimum: 0, maximum: 100 },
    verdict: { type: 'string', enum: ['production_ready', 'needs_attention', 'not_production_ready'] },
    checks: { type: 'array', items: { $ref: '#/components/schemas/CheckItem' } },
    passed: { type: 'integer', minimum: 0 },
    failed: { type: 'integer', minimum: 0 },
    warnings: { type: 'integer', minimum: 0 },
    critical_issues: { type: 'integer', minimum: 0 },
  },
};

const WebhookTail = {
  type: 'object',
  required: ['confidence_score', 'recommended_actions_priority_order', 'chain_to', 'webhook_disclaimer', 'privacy'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    webhook_disclaimer: { type: 'string' },
    privacy: { $ref: '#/components/schemas/Privacy' },
  },
};

const ValidateRequest = {
  type: 'object',
  additionalProperties: false,
  description: 'Supply any subset of webhook configuration fields; omitted fields are reported as info.',
  properties: {
    url: { type: 'string', description: 'The webhook endpoint URL (checked for HTTPS).' },
    has_signature_verification: { type: 'boolean', description: 'Whether the endpoint verifies an HMAC signature.' },
    signature_header: { type: 'string', description: 'Name of the signature header, if any (implies verification).' },
    verifies_timestamp: { type: 'boolean', description: 'Whether a signed timestamp is validated (replay protection).' },
    timestamp_tolerance_seconds: { type: 'number', minimum: 0, description: 'Accepted timestamp skew.' },
    has_idempotency: { type: 'boolean', description: 'Whether deliveries are deduped (idempotent processing).' },
    idempotency_key_header: { type: 'string', description: 'Name of the idempotency key header, if any.' },
    content_type: { type: 'string', description: 'Content-Type the endpoint accepts/sends.' },
    timeout_ms: { type: 'number', minimum: 0, description: 'Handler timeout in milliseconds.' },
    max_retries: { type: 'number', minimum: 0, description: 'Configured maximum retry attempts.' },
    max_payload_bytes: { type: 'number', minimum: 0, description: 'Maximum accepted payload size in bytes.' },
    payload: { type: 'string', description: 'Optional sample raw body (checked for JSON validity and size).' },
  },
};

const schemas = {
  EnvelopeOk,
  CheckItem,
  ValidatorCore,
  _WebhookTail: WebhookTail,
  ValidateRequest,
  DiscoveryResponse: {
    type: 'object',
    required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'],
    additionalProperties: false,
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: { type: 'object', required: ['type', 'header'], additionalProperties: false, properties: { type: { type: 'string' }, header: { type: 'string' } } },
      endpoints: { type: 'array', items: { type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false, properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
      pricing: { type: 'array', items: { type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false, properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } } } },
      x402_compatible: { type: 'boolean' },
    },
  },
  ValidateResponse: {
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidatorCore' }, { $ref: '#/components/schemas/_WebhookTail' }],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/ValidatorCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_WebhookTail' },
    ],
    unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = {
  url: 'https://api.example.com/webhooks/stripe',
  has_signature_verification: true,
  signature_header: 'Stripe-Signature',
  verifies_timestamp: false,
  has_idempotency: false,
  content_type: 'application/json',
  timeout_ms: 500,
  max_retries: 0,
  payload: '{"id":"evt_1","type":"invoice.paid"}',
  max_payload_bytes: 65536,
};

const CORE_EXAMPLE = {
  validation_score: 76.5,
  verdict: 'needs_attention',
  passed: 5,
  failed: 0,
  warnings: 4,
  critical_issues: 0,
  checks: [
    { id: 'https', label: 'Endpoint uses HTTPS', severity: 'critical', status: 'pass', message: 'Endpoint URL uses HTTPS.', recommendation: null },
    { id: 'signature_verification', label: 'Signature verification enabled', severity: 'critical', status: 'pass', message: 'Signature verification is in place (header: Stripe-Signature).', recommendation: null },
    { id: 'replay_protection', label: 'Replay / timestamp protection', severity: 'high', status: 'warn', message: 'Timestamp is not validated — a captured request can be replayed.', recommendation: 'Reject requests whose signed timestamp is outside a small tolerance (e.g. 5 minutes).' },
    { id: 'idempotency', label: 'Idempotent processing', severity: 'high', status: 'warn', message: 'No idempotency handling — provider retries will be processed more than once.', recommendation: 'Dedupe on the event id (or an idempotency key) so retried deliveries are processed exactly once.' },
    { id: 'content_type', label: 'JSON content-type', severity: 'medium', status: 'pass', message: 'Content-Type is application/json.', recommendation: null },
    { id: 'timeout', label: 'Reasonable handler timeout', severity: 'medium', status: 'warn', message: 'Timeout 500ms is very low — transient slowness will fail deliveries.', recommendation: 'Allow at least ~1s, or ack immediately and process asynchronously.' },
    { id: 'retries', label: 'Sensible retry budget', severity: 'low', status: 'warn', message: 'No retries configured — a single transient failure drops the event.', recommendation: 'Retry 3–5 times with exponential backoff and a dead-letter queue.' },
    { id: 'payload_json', label: 'Payload is valid JSON', severity: 'high', status: 'pass', message: 'Sample payload parses as JSON.', recommendation: null },
    { id: 'payload_size', label: 'Payload within size limit', severity: 'medium', status: 'pass', message: 'Sample payload is 37 bytes vs limit 65536.', recommendation: null },
  ],
};

const TAIL_EXAMPLE = {
  confidence_score: 1.0,
  recommended_actions_priority_order: [
    '[high] Reject requests whose signed timestamp is outside a small tolerance (e.g. 5 minutes).',
    '[high] Dedupe on the event id (or an idempotency key) so retried deliveries are processed exactly once.',
    '[medium] Allow at least ~1s, or ack immediately and process asynchronously.',
    '[low] Retry 3–5 times with exponential backoff and a dead-letter queue.',
  ],
  chain_to: [
    { api: 'webhook-signature-verifier', reason: 'Actually verify a signature once verification is wired up.' },
    { api: 'webhook-reliability-scorer', reason: 'Quantify delivery health after fixing the config issues.' },
  ],
  webhook_disclaimer: 'This result is a deterministic analysis of the configuration, payload, and delivery data you provided…',
  privacy: { data_stored: false, retention: 'none' },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/validate', summary: 'Run the webhook best-practice checklist',
    operationId: 'validate', priceUsdc: 0.01,
    requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'ValidateResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wd1-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL validate + reasoning + prioritized fixes',
    operationId: 'lookup', priceUsdc: 0.02, oneCall: true,
    requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wd2-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      reasoning: {
        why_result_generated: 'Ran 9 best-practice checks; 5 passed, 0 failed, 4 warned. Score starts at 100 and subtracts severity-weighted penalties (warnings count half).',
        key_factors: ['Verdict: needs_attention (76.5/100).', '0 critical issue(s).', 'No failed checks.'],
        invalidators: ['Checks only cover the fields you supplied — omitted fields are reported as info, not pass.', 'A passing config check does not prove the live endpoint behaves the same way.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'webhook-validator',
  title: 'Webhook Validator API',
  version: '1.0.0',
  description: 'Deterministic webhook configuration + payload best-practice validation. Supply any subset of endpoint config (url, signature verification, timestamp/replay protection, idempotency, content-type, timeout, retries, payload size) plus an optional sample body, and it runs a fixed checklist returning typed checks[] (each with severity and a concrete recommendation), counts, and a 0–100 validation_score with a production-readiness verdict. Real rule-based checks, never an LLM guess; confidence is always 1.0. Nothing is stored.',
  endpoints,
  schemas,
  infoExtensions: { 'x-webhook': true },
});

export default specRouter(spec);
