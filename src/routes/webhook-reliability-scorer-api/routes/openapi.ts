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

const ScoreCore = {
  type: 'object',
  required: [
    'delivery_score', 'health_status', 'total_deliveries', 'successful_deliveries', 'failed_deliveries',
    'success_rate', 'failure_rate', 'retry_rate', 'latency', 'failure_reason', 'retry_policy',
  ],
  properties: {
    delivery_score: { type: 'number', minimum: 0, maximum: 100, description: 'Overall delivery health 0–100 (success rate minus retry/latency penalties).' },
    health_status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy', 'critical'] },
    total_deliveries: { type: 'integer', minimum: 1 },
    successful_deliveries: { type: 'integer', minimum: 0 },
    failed_deliveries: { type: 'integer', minimum: 0 },
    success_rate: { type: 'number', minimum: 0, maximum: 1 },
    failure_rate: { type: 'number', minimum: 0, maximum: 1 },
    retry_rate: { type: 'number', minimum: 0, maximum: 1 },
    latency: {
      type: ['object', 'null'],
      required: ['p50_ms', 'p95_ms', 'max_ms'],
      additionalProperties: false,
      properties: {
        p50_ms: { type: 'number', minimum: 0 },
        p95_ms: { type: 'number', minimum: 0 },
        max_ms: { type: 'number', minimum: 0 },
      },
      description: 'Latency percentiles, or null when no latency data was supplied.',
    },
    failure_reason: {
      type: 'array',
      items: {
        type: 'object',
        required: ['category', 'count', 'share'],
        additionalProperties: false,
        properties: {
          category: { type: 'string', enum: ['client_error', 'server_error', 'timeout', 'connection_error', 'other'] },
          count: { type: 'integer', minimum: 0 },
          share: { type: 'number', minimum: 0, maximum: 1, description: 'Share of total failures.' },
        },
      },
    },
    retry_policy: {
      type: 'object',
      required: ['recommended_max_retries', 'recommended_backoff', 'note'],
      additionalProperties: false,
      properties: {
        recommended_max_retries: { type: 'integer', minimum: 0 },
        recommended_backoff: { type: 'string' },
        note: { type: 'string' },
      },
    },
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

const AttemptItem = {
  type: 'object',
  required: ['success'],
  additionalProperties: false,
  properties: {
    success: { type: 'boolean', description: 'Whether this delivery attempt succeeded (2xx).' },
    status_code: { type: 'integer', minimum: 0, maximum: 599, description: 'HTTP status (0 = connection error).' },
    latency_ms: { type: 'number', minimum: 0 },
    attempt_number: { type: 'integer', minimum: 1, description: '1 = first try; >1 marks a retry.' },
  },
};

const StatsObject = {
  type: 'object',
  required: ['total_deliveries', 'successful_deliveries'],
  additionalProperties: false,
  properties: {
    total_deliveries: { type: 'integer', minimum: 1 },
    successful_deliveries: { type: 'integer', minimum: 0 },
    retried_deliveries: { type: 'integer', minimum: 0, default: 0 },
    avg_latency_ms: { type: 'number', minimum: 0 },
    p50_latency_ms: { type: 'number', minimum: 0 },
    p95_latency_ms: { type: 'number', minimum: 0 },
    failure_breakdown: {
      type: 'object',
      additionalProperties: false,
      properties: {
        client_error: { type: 'integer', minimum: 0 },
        server_error: { type: 'integer', minimum: 0 },
        timeout: { type: 'integer', minimum: 0 },
        connection_error: { type: 'integer', minimum: 0 },
        other: { type: 'integer', minimum: 0 },
      },
    },
  },
};

const ScoreRequest = {
  type: 'object',
  additionalProperties: false,
  description: 'Provide either "attempts" (preferred, richest) or "stats" (aggregate).',
  properties: {
    attempts: { type: 'array', minItems: 1, maxItems: 10000, items: { $ref: '#/components/schemas/AttemptItem' } },
    stats: { $ref: '#/components/schemas/StatsObject' },
  },
};

const schemas = {
  EnvelopeOk,
  ScoreCore,
  _WebhookTail: WebhookTail,
  AttemptItem,
  StatsObject,
  ScoreRequest,
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
  ScoreResponse: {
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScoreCore' }, { $ref: '#/components/schemas/_WebhookTail' }],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/ScoreCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_WebhookTail' },
    ],
    unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = {
  attempts: [
    { success: true, status_code: 200, latency_ms: 180, attempt_number: 1 },
    { success: false, status_code: 503, latency_ms: 1200, attempt_number: 1 },
    { success: true, status_code: 200, latency_ms: 240, attempt_number: 2 },
    { success: false, status_code: 504, latency_ms: 9000, attempt_number: 1 },
  ],
};

const CORE_EXAMPLE = {
  delivery_score: 60.5,
  health_status: 'unhealthy',
  total_deliveries: 4,
  successful_deliveries: 2,
  failed_deliveries: 2,
  success_rate: 0.5,
  failure_rate: 0.5,
  retry_rate: 0.25,
  latency: { p50_ms: 720, p95_ms: 7860, max_ms: 9000 },
  failure_reason: [
    { category: 'server_error', count: 1, share: 0.5 },
    { category: 'timeout', count: 1, share: 0.5 },
  ],
  retry_policy: { recommended_max_retries: 4, recommended_backoff: 'exponential with jitter, base 1s, cap 1h', note: 'Server-side (5xx) failures are usually transient — retry with jittered exponential backoff; dead-letter after exhausting retries.' },
};

const TAIL_EXAMPLE = {
  confidence_score: 1.0,
  recommended_actions_priority_order: [
    'Delivery health is unhealthy (60.5/100) with a 50% failure rate — Server-side (5xx) failures are usually transient — retry with jittered exponential backoff; dead-letter after exhausting retries.',
    'p95 latency is 7860ms — keep handlers under ~1s by processing webhooks asynchronously (ack fast, work in a queue).',
  ],
  chain_to: [
    { api: 'webhook-validator', reason: 'Check whether the endpoint config (timeouts, retries, idempotency) explains the failures.' },
    { api: 'webhook-signature-verifier', reason: 'Rule out signature mismatches if failures are 4xx rejections.' },
  ],
  webhook_disclaimer: 'This result is a deterministic analysis of the configuration, payload, and delivery data you provided…',
  privacy: { data_stored: false, retention: 'none' },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/score', summary: 'Score delivery health from attempts or stats',
    operationId: 'score', priceUsdc: 0.01,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'ScoreResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wr1-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL score + reasoning + retry policy',
    operationId: 'lookup', priceUsdc: 0.02, oneCall: true,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wr2-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      reasoning: {
        why_result_generated: 'Scored 4 deliveries (2 ok / 2 failed) from attempts; started at success_rate×100 (50) then applied retry and latency penalties.',
        key_factors: ['Success rate 50%, retry rate 25%.', 'Latency p50 720ms / p95 7860ms.', 'Top failure category: server_error (1).'],
        invalidators: ['A small sample size makes the score noisy — interpret with caution under ~50 deliveries.', 'Client-side (4xx) failures will not improve with retries even though they lower the score.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'webhook-reliability-scorer',
  title: 'Webhook Reliability Scorer API',
  version: '1.0.0',
  description: 'Deterministic webhook delivery-health scoring. Feed it a raw attempt log (success, status_code, latency_ms, attempt_number) or aggregate stats and it returns a 0–100 delivery_score, success/failure/retry rates, p50/p95/max latency, a failure breakdown by category (client_error, server_error, timeout, connection_error), and a recommended retry policy tuned to the dominant failure mode. Real arithmetic, never an LLM guess; confidence is always 1.0. Nothing is stored.',
  endpoints,
  schemas,
  infoExtensions: { 'x-webhook': true },
});

export default specRouter(spec);
