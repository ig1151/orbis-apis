import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const MetricResult = {
  type: 'object', required: ['metric', 'value', 'unit', 'rating', 'good_threshold', 'needs_improvement_threshold', 'is_core'], additionalProperties: false,
  properties: {
    metric: { type: 'string', enum: ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] },
    value: { type: 'number' }, unit: { type: 'string', enum: ['ms', 'score'] },
    rating: { type: 'string', enum: ['good', 'needs-improvement', 'poor'] },
    good_threshold: { type: 'number' }, needs_improvement_threshold: { type: 'number' }, is_core: { type: 'boolean' },
  },
};

const GradeCore = {
  type: 'object', required: ['metrics', 'passes_cwv', 'core_metrics_provided', 'overall_rating', 'score', 'grade'],
  properties: {
    metrics: { type: 'array', items: { $ref: '#/components/schemas/MetricResult' } },
    passes_cwv: { type: 'boolean', description: 'True only when all three core metrics (LCP, INP, CLS) are supplied and "good".' },
    core_metrics_provided: { type: 'integer', minimum: 1, maximum: 3 },
    overall_rating: { type: 'string', enum: ['good', 'needs-improvement', 'poor'] },
    score: { type: 'number', minimum: 0, maximum: 100 },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
  },
};

const GradeRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    lcp_ms: { type: 'number', minimum: 0, description: 'Largest Contentful Paint (ms). good ≤2500, poor >4000.' },
    inp_ms: { type: 'number', minimum: 0, description: 'Interaction to Next Paint (ms). good ≤200, poor >500.' },
    fid_ms: { type: 'number', minimum: 0, description: 'Legacy First Input Delay (ms); used as INP if inp_ms absent.' },
    cls: { type: 'number', minimum: 0, description: 'Cumulative Layout Shift (unitless). good ≤0.1, poor >0.25.' },
    fcp_ms: { type: 'number', minimum: 0, description: 'First Contentful Paint (ms). good ≤1800.' },
    ttfb_ms: { type: 'number', minimum: 0, description: 'Time To First Byte (ms). good ≤800.' },
  },
  description: 'Supply at least one Core Web Vital (lcp_ms, inp_ms or fid_ms, cls).',
};

const METRICS_EXAMPLE = [
  { metric: 'LCP', value: 3200, unit: 'ms', rating: 'needs-improvement', good_threshold: 2500, needs_improvement_threshold: 4000, is_core: true },
  { metric: 'INP', value: 150, unit: 'ms', rating: 'good', good_threshold: 200, needs_improvement_threshold: 500, is_core: true },
  { metric: 'CLS', value: 0.05, unit: 'score', rating: 'good', good_threshold: 0.1, needs_improvement_threshold: 0.25, is_core: true },
];
const CORE_EXAMPLE = { metrics: METRICS_EXAMPLE, passes_cwv: false, core_metrics_provided: 3, overall_rating: 'needs-improvement', score: 86.7, grade: 'B' };
const ACTS = ['Does NOT pass Core Web Vitals.', 'Improve LCP: optimize the largest image/text paint — preload the hero asset, compress images, cut render-blocking CSS/JS.'];
const TAIL = {
  confidence_score: 1, confidence_per_section: { ratings: 1, score: 1 },
  recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'web-performance-budget-checker', reason: 'Set per-asset weight budgets that keep LCP/INP within the good band.' },
    { api: 'mobile-seo-audit', reason: 'Core Web Vitals feed Google ranking — pair with an on-page mobile SEO audit.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('ratings', 'score'), _Tail: Tail, MetricResult, GradeCore, GradeRequest,
  DiscoveryResponse: discoverySchema(),
  GradeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/GradeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/GradeCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = { lcp_ms: 3200, inp_ms: 150, cls: 0.05 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/grade', summary: 'Grade supplied Web Vitals → ratings, pass/fail, score', operationId: 'grade', priceUsdc: 0.005,
    requestSchemaRef: 'GradeRequest', responseSchemaRef: 'GradeResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wvg1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL grade + reasoning + fix priorities', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'GradeRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wvg2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      reasoning: { why_result_generated: 'Rated 3 metric(s) against Google thresholds → score 86.7, grade B; Core Web Vitals fail.', key_factors: ['LCP 3200ms: needs-improvement (good ≤ 2500).', 'INP 150ms: good (good ≤ 200).', 'CLS 0.05: good (good ≤ 0.1).'], invalidators: ['Grade reflects only the supplied values; real CWV uses the 75th percentile of field data over 28 days.', 'Lab values (Lighthouse) often differ from field (CrUX) values.', 'Core Web Vitals pass requires all three of LCP, INP, and CLS — omitting one cannot pass.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web-vitals-grader', title: 'Web Vitals Grader API', version: '1.0.0',
  description: 'Deterministic Core Web Vitals grader. Supply measured LCP/INP/CLS (and optional FCP/TTFB); returns per-metric ratings against Google\'s published good/needs-improvement/poor thresholds and a Core Web Vitals pass/fail. The 0–100 score and A–F letter grade are an opinionated rollup of those official ratings, not a Google-defined metric. Input-driven — no fetch, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
