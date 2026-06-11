import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const CLASS_ENUM = ['html', 'css', 'js', 'image', 'font', 'media', 'other'];
const STATUS_ENUM = ['pass', 'warn', 'fail'];

const ClassRow = {
  type: 'object', required: ['class', 'size_kb', 'count', 'budget_kb', 'over_by_kb', 'pct_of_budget', 'status'], additionalProperties: false,
  properties: {
    class: { type: 'string', enum: CLASS_ENUM }, size_kb: { type: 'number' }, count: { type: 'number' },
    budget_kb: { type: 'number' }, over_by_kb: { type: 'number' }, pct_of_budget: { type: ['number', 'null'] }, status: { type: 'string', enum: STATUS_ENUM },
  },
};
const TotalRow = {
  type: 'object', required: ['size_kb', 'budget_kb', 'over_by_kb', 'pct_of_budget', 'status'], additionalProperties: false,
  properties: { size_kb: { type: 'number' }, budget_kb: { type: 'number' }, over_by_kb: { type: 'number' }, pct_of_budget: { type: ['number', 'null'] }, status: { type: 'string', enum: STATUS_ENUM } },
};
const BudgetCore = {
  type: 'object', required: ['by_class', 'total', 'passes', 'failing_classes'],
  properties: {
    by_class: { type: 'array', items: { $ref: '#/components/schemas/ClassRow' } },
    total: { $ref: '#/components/schemas/TotalRow' },
    passes: { type: 'boolean' },
    failing_classes: { type: 'array', items: { type: 'string', enum: CLASS_ENUM } },
  },
};

const Resource = { type: 'object', required: ['size_kb'], additionalProperties: false, properties: { type: { type: 'string', description: 'Asset type/class hint, e.g. "js", "image", "font".' }, size_kb: { type: 'number', minimum: 0 }, count: { type: 'number', minimum: 0 } } };
const BudgetRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    resources: { type: 'array', items: { $ref: '#/components/schemas/Resource' }, description: 'Individual resources; bucketed by class.' },
    class_totals: { type: 'object', additionalProperties: true, description: 'Pre-aggregated totals: { js: {size_kb, count}, image: {size_kb} }.' },
    budgets: { type: 'object', additionalProperties: true, description: 'Override per-class KB budgets: { js: {max_kb: 250} } or { js: 250 }.' },
    total_budget_kb: { type: 'number', minimum: 0, description: 'Override the total-page KB budget (default 1600).' },
  },
  description: 'Provide "resources" or "class_totals"; "budgets"/"total_budget_kb" optionally override defaults.',
};

const BY_CLASS = [
  { class: 'html', size_kb: 30, count: 1, budget_kb: 50, over_by_kb: 0, pct_of_budget: 60, status: 'pass' },
  { class: 'css', size_kb: 60, count: 3, budget_kb: 100, over_by_kb: 0, pct_of_budget: 60, status: 'pass' },
  { class: 'js', size_kb: 520, count: 8, budget_kb: 350, over_by_kb: 170, pct_of_budget: 148.6, status: 'fail' },
  { class: 'image', size_kb: 1200, count: 20, budget_kb: 900, over_by_kb: 300, pct_of_budget: 133.3, status: 'fail' },
  { class: 'font', size_kb: 0, count: 0, budget_kb: 150, over_by_kb: 0, pct_of_budget: 0, status: 'pass' },
  { class: 'media', size_kb: 0, count: 0, budget_kb: 0, over_by_kb: 0, pct_of_budget: null, status: 'pass' },
  { class: 'other', size_kb: 0, count: 0, budget_kb: 100, over_by_kb: 0, pct_of_budget: 0, status: 'pass' },
];
const CORE_EXAMPLE = { by_class: BY_CLASS, total: { size_kb: 1810, budget_kb: 1600, over_by_kb: 210, pct_of_budget: 113.1, status: 'warn' }, passes: false, failing_classes: ['js', 'image'] };
const ACTS = ['OVER budget: total 1810KB vs 1600KB budget.', 'Trim images (1200KB > 900KB): use AVIF/WebP, responsive srcset, and lazy-load below the fold.', 'Trim JS (520KB > 350KB): code-split, tree-shake, defer non-critical bundles.'];
const TAIL = {
  confidence_score: 1, confidence_per_section: { budget: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'web-vitals-grader', reason: 'Translate weight savings into expected LCP/INP improvements.' },
    { api: 'web-scrape-cost-roi-analyzer', reason: 'Estimate the bandwidth cost of crawling pages of this weight.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('budget'), _Tail: Tail, ClassRow, TotalRow, BudgetCore, Resource, BudgetRequest,
  DiscoveryResponse: discoverySchema(),
  CheckResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BudgetCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BudgetCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = { resources: [{ type: 'html', size_kb: 30, count: 1 }, { type: 'css', size_kb: 60, count: 3 }, { type: 'js', size_kb: 520, count: 8 }, { type: 'image', size_kb: 1200, count: 20 }] };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/check', summary: 'Bucket weights by class & compare vs budget → pass/fail', operationId: 'check', priceUsdc: 0.006,
    requestSchemaRef: 'BudgetRequest', responseSchemaRef: 'CheckResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wpb1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL budget check + reasoning + fix priorities', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'BudgetRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wpb2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      reasoning: { why_result_generated: 'Bucketed weights into 7 classes; total 1810KB vs 1600KB budget → FAIL.', key_factors: ['html: 30KB / 50KB (pass).', 'css: 60KB / 100KB (pass).', 'js: 520KB / 350KB (fail).', 'image: 1200KB / 900KB (fail).'], invalidators: ['Budgets are KB of transfer size — gzip/brotli compression changes real bytes on the wire.', 'Defaults are mobile-oriented targets, not a hard standard; override per project.', 'Weight alone does not capture render-blocking behavior or execution cost.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web-performance-budget-checker', title: 'Web Performance Budget Checker API', version: '1.0.0',
  description: 'Deterministic performance-budget checker. Supply per-resource weights or pre-aggregated class totals; returns pass/warn/fail per asset class against a budget (sensible defaults, fully overridable) plus a total verdict and the worst offenders. Pure arithmetic — no fetch, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
