import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, ConfidencePerSection, Tail, discoverySchema } from '../../_aplus/specparts';

const BatchRow = {
  type: 'object', required: ['index', 'pages', 'cumulative_pages', 'start_offset_seconds', 'est_seconds'], additionalProperties: false,
  properties: { index: { type: 'integer' }, pages: { type: 'integer' }, cumulative_pages: { type: 'integer' }, start_offset_seconds: { type: 'number' }, est_seconds: { type: 'number' } },
};
const PlanCore = {
  type: 'object',
  required: ['total_pages', 'pages_with_retries', 'retry_overhead_pct', 'effective_rps', 'throughput_pages_per_min', 'concurrency', 'batch_size', 'total_batches', 'last_batch_pages', 'seconds_per_full_batch', 'estimated_total_seconds', 'estimated_total_human', 'sample_schedule', 'schedule_truncated'],
  properties: {
    total_pages: { type: 'number' }, pages_with_retries: { type: 'integer' }, retry_overhead_pct: { type: 'number' },
    effective_rps: { type: 'number' }, throughput_pages_per_min: { type: 'number' }, concurrency: { type: 'integer' },
    batch_size: { type: 'integer' }, total_batches: { type: 'integer' }, last_batch_pages: { type: 'integer' }, seconds_per_full_batch: { type: 'number' },
    estimated_total_seconds: { type: 'number' }, estimated_total_human: { type: 'string' },
    sample_schedule: { type: 'array', items: { $ref: '#/components/schemas/BatchRow' } }, schedule_truncated: { type: 'boolean' },
  },
};
const PlanRequest = {
  type: 'object', required: ['total_pages'], additionalProperties: false,
  properties: {
    total_pages: { type: 'number', exclusiveMinimum: 0 },
    crawl_delay_s: { type: 'number', minimum: 0, description: 'robots Crawl-delay; sets throughput to 1/delay if given.' },
    requested_rps: { type: 'number', exclusiveMinimum: 0, description: 'Throughput when no crawl-delay (default 1).' },
    concurrency: { type: 'number', minimum: 1, description: 'Parallel workers (informational; capped at 50).' },
    batch_size: { type: 'number', minimum: 1, description: 'Pages per batch (default 500).' },
    retry_overhead_pct: { type: 'number', minimum: 0, description: 'Extra fetches for retries, % (default 0).' },
  },
};

const SCHEDULE = [
  { index: 1, pages: 1000, cumulative_pages: 1000, start_offset_seconds: 0, est_seconds: 500 },
  { index: 2, pages: 1000, cumulative_pages: 2000, start_offset_seconds: 500, est_seconds: 500 },
  { index: 3, pages: 1000, cumulative_pages: 3000, start_offset_seconds: 1000, est_seconds: 500 },
  { index: 4, pages: 1000, cumulative_pages: 4000, start_offset_seconds: 1500, est_seconds: 500 },
  { index: 5, pages: 1000, cumulative_pages: 5000, start_offset_seconds: 2000, est_seconds: 500 },
  { index: 6, pages: 200, cumulative_pages: 5200, start_offset_seconds: 2500, est_seconds: 100 },
];
const CORE_EXAMPLE = { total_pages: 5200, pages_with_retries: 5720, retry_overhead_pct: 10, effective_rps: 2, throughput_pages_per_min: 120, concurrency: 4, batch_size: 1000, total_batches: 6, last_batch_pages: 200, seconds_per_full_batch: 500, estimated_total_seconds: 2860, estimated_total_human: '47m 40s', sample_schedule: SCHEDULE, schedule_truncated: false };
const ACTS = ['5200 pages in 6 batches of 1000 at 2 req/s → ~47m 40s.', 'Includes 10% retry overhead (5720 effective fetches).', 'Throughput ≈ 120 pages/min; checkpoint after each batch so a failure resumes mid-crawl.'];
const TAIL = {
  confidence_score: 1, confidence_per_section: { batching: 1, eta: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'web-scrape-rate-limiter', reason: 'Derive a compliant, polite RPS before committing to this throughput.' },
    { api: 'web-scrape-cost-roi-analyzer', reason: 'Cost the planned page count and confirm positive ROI.' },
    { api: 'web-scrape-legal-risk-checker', reason: 'Confirm the crawl is permissible before scheduling it.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection, _Tail: Tail, BatchRow, PlanCore, PlanRequest,
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

const REQ_EXAMPLE = { total_pages: 5200, requested_rps: 2, concurrency: 4, batch_size: 1000, retry_overhead_pct: 10 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/plan', summary: 'Batches, per-batch timing, total ETA, sample schedule', operationId: 'plan', priceUsdc: 0.006,
    requestSchemaRef: 'PlanRequest', responseSchemaRef: 'PlanResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wsp1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL crawl plan + reasoning + sequencing guidance', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'PlanRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wsp2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      reasoning: { why_result_generated: '5200 pages ÷ 1000/batch = 6 batches; 5720 fetches ÷ 2 req/s = 2860s.', key_factors: ['Effective RPS: 2.', 'Batches: 6 (last 200 pages).', 'ETA: 47m 40s.'], invalidators: ['ETA assumes steady throughput; real latency, blocks, and backoff lengthen it.', 'Concurrency does not increase per-host RPS when politeness/crawl-delay binds.', 'Page-size variance changes bandwidth but not this page-count ETA.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web-scrape-planner', title: 'Web Scrape Planner API', version: '1.0.0',
  description: 'Deterministic crawl planner. From total pages, throughput (crawl-delay or RPS), batch size, and retry overhead, returns batch count, per-batch timing, a total ETA, and a sample batch schedule with start offsets. Pure arithmetic — no fetch, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
