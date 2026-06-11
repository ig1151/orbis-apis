import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, ConfidencePerSection, Tail, discoverySchema } from '../../_aplus/specparts';

const PlanCore = {
  type: 'object',
  required: ['basis', 'crawl_delay_s', 'requested_rps', 'requested_concurrency', 'pages', 'safe_rps', 'effective_rps', 'recommended_concurrency', 'delay_between_requests_ms', 'throttled', 'violates_crawl_delay', 'estimated_duration_seconds'],
  properties: {
    basis: { type: 'string', enum: ['crawl_delay', 'politeness_default'] },
    crawl_delay_s: { type: ['number', 'null'] }, requested_rps: { type: ['number', 'null'] }, requested_concurrency: { type: ['number', 'null'] }, pages: { type: ['number', 'null'] },
    safe_rps: { type: 'number' }, effective_rps: { type: 'number' }, recommended_concurrency: { type: 'integer', minimum: 1 },
    delay_between_requests_ms: { type: ['number', 'null'] }, throttled: { type: 'boolean' }, violates_crawl_delay: { type: 'boolean' },
    estimated_duration_seconds: { type: ['number', 'null'] },
  },
};
const PlanRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    crawl_delay_s: { type: 'number', minimum: 0, description: 'robots.txt Crawl-delay in seconds (omit if none).' },
    requested_rps: { type: 'number', exclusiveMinimum: 0, description: 'Desired requests/sec; throttled down if it exceeds the safe ceiling.' },
    requested_concurrency: { type: 'number', minimum: 1, description: 'Desired parallel workers.' },
    pages: { type: 'number', minimum: 0, description: 'Total pages to fetch (for the ETA).' },
    default_max_rps: { type: 'number', exclusiveMinimum: 0, description: 'Politeness ceiling when no crawl-delay (default 1).' },
    max_concurrency: { type: 'number', minimum: 1, description: 'Concurrency cap when no crawl-delay (default 5, hard max 10).' },
  },
};

const CORE_EXAMPLE = { basis: 'crawl_delay', crawl_delay_s: 10, requested_rps: 1, requested_concurrency: 4, pages: 500, safe_rps: 0.1, effective_rps: 0.1, recommended_concurrency: 1, delay_between_requests_ms: 10000, throttled: true, violates_crawl_delay: true, estimated_duration_seconds: 5000 };
const ACTS = ['robots crawl-delay is 10s → cap at 0.1 req/s, concurrency 1 (10000ms between requests).', 'Your requested rate/concurrency would VIOLATE crawl-delay — it has been throttled down. Do not override.', 'At 0.1 req/s, 500 pages take ~5000s (83.3 min).', 'Always honor robots.txt and Retry-After; back off on 429/503.'];
const TAIL = {
  confidence_score: 1, confidence_per_section: { schedule: 1, compliance: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'robots-txt-parser', reason: 'Parse the target robots.txt to obtain the real crawl-delay and disallow rules first.' },
    { api: 'web-scrape-legal-risk-checker', reason: 'Confirm the crawl is permissible (ToS/PII/copyright) before scheduling it.' },
    { api: 'web-scrape-planner', reason: 'Turn this rate into batches and an end-to-end crawl plan.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection, _Tail: Tail, PlanCore, PlanRequest,
  DiscoveryResponse: discoverySchema(),
  PlanResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/PlanCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/PlanCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = { crawl_delay_s: 10, requested_rps: 1, requested_concurrency: 4, pages: 500 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/plan', summary: 'Compute a polite, crawl-delay-compliant request schedule', operationId: 'plan', priceUsdc: 0.006,
    requestSchemaRef: 'PlanRequest', responseSchemaRef: 'PlanResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wsr1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL schedule + reasoning + compliance notes', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'PlanRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wsr2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      reasoning: { why_result_generated: 'Basis: crawl_delay; safe 0.1 req/s → effective 0.1 req/s, concurrency 1.', key_factors: ['crawl_delay: 10.', 'throttled: true.', 'violates_crawl_delay: true.'], invalidators: ['robots crawl-delay is advisory and not honored by all servers, but you should; some sites enforce stricter limits via 429.', 'A shared IP/proxy pool changes effective per-host load.', 'Server-side Retry-After always overrides this schedule.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web-scrape-rate-limiter', title: 'Web Scrape Rate Limiter API', version: '1.0.0',
  description: 'Deterministic, defensive scrape scheduler. From a robots crawl-delay (if any), desired RPS, concurrency, and page count it computes a polite, compliant schedule: safe RPS, inter-request delay, concurrency cap, throttle flags, and total ETA. Only ever reduces aggressiveness. Pure math — no fetch, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
