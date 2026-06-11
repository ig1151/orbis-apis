import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, ConfidencePerSection, Tail, discoverySchema } from '../../_aplus/specparts';

const RoiCore = {
  type: 'object',
  required: ['pages', 'cost_per_page', 'cost_component_total', 'fixed_cost', 'variable_cost', 'total_cost', 'value_per_page', 'total_value', 'net_value', 'roi_pct', 'margin_per_page', 'break_even_pages', 'profitable', 'verdict'],
  properties: {
    pages: { type: 'number' }, cost_per_page: { type: 'number' }, cost_component_total: { type: ['number', 'null'] },
    fixed_cost: { type: 'number' }, variable_cost: { type: 'number' }, total_cost: { type: 'number' },
    value_per_page: { type: 'number' }, total_value: { type: 'number' }, net_value: { type: 'number' },
    roi_pct: { type: ['number', 'null'] }, margin_per_page: { type: 'number' }, break_even_pages: { type: ['integer', 'null'] },
    profitable: { type: 'boolean' }, verdict: { type: 'string', enum: ['strong_roi', 'positive', 'marginal', 'negative'] },
  },
};
const RoiRequest = {
  type: 'object', required: ['pages'], additionalProperties: false,
  properties: {
    pages: { type: 'number', exclusiveMinimum: 0 },
    cost_per_page: { type: 'number', minimum: 0, description: 'Total cost to fetch+process one page.' },
    cost_components: { type: 'object', additionalProperties: { type: 'number' }, description: 'Summed into cost_per_page, e.g. {proxy:0.001, compute:0.0008}.' },
    fixed_cost: { type: 'number', minimum: 0, description: 'One-time setup/engineering cost (default 0).' },
    value_per_page: { type: 'number', description: 'Value of the data extracted from one page.' },
    total_value: { type: 'number', description: 'Alternative to value_per_page: total value of the dataset.' },
  },
  description: 'Provide pages, a cost (cost_per_page or cost_components), and a value (value_per_page or total_value).',
};

const CORE_EXAMPLE = { pages: 10000, cost_per_page: 0.002, cost_component_total: null, fixed_cost: 50, variable_cost: 20, total_cost: 70, value_per_page: 0.02, total_value: 200, net_value: 130, roi_pct: 185.71, margin_per_page: 0.018, break_even_pages: 2778, profitable: true, verdict: 'positive' };
const ACTS = ['Net 130 on 70 cost → ROI 185.71% (positive).', 'Per-page margin is 0.018; break even at 2778 pages.'];
const TAIL = {
  confidence_score: 1, confidence_per_section: { cost: 1, roi: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'web-scrape-rate-limiter', reason: 'Turn the page count into a compliant crawl schedule and runtime estimate.' },
    { api: 'web-scrape-planner', reason: 'Break the crawl into batches with an ETA that matches this budget.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection, _Tail: Tail, RoiCore, RoiRequest,
  DiscoveryResponse: discoverySchema(),
  AnalyzeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RoiCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RoiCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = { pages: 10000, cost_per_page: 0.002, fixed_cost: 50, value_per_page: 0.02 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/analyze', summary: 'Cost, net value, ROI %, break-even, verdict', operationId: 'analyze', priceUsdc: 0.006,
    requestSchemaRef: 'RoiRequest', responseSchemaRef: 'AnalyzeResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wsc1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL ROI + reasoning + optimization guidance', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'RoiRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wsc2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      reasoning: { why_result_generated: 'cost 70 (fixed 50 + 0.002/page × 10000) vs value 200 → net 130, ROI 185.71%.', key_factors: ['Margin/page: 0.018.', 'Break-even pages: 2778.', 'Verdict: positive.'], invalidators: ['ROI depends entirely on your value estimate, which is rarely linear per page.', 'Cost ignores failure/retry overhead and engineering time unless you fold them into cost_per_page/fixed_cost.', 'Legal/blocking risk can impose costs not captured here — check the legal-risk checker.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web-scrape-cost-roi-analyzer', title: 'Web Scrape Cost/ROI Analyzer API', version: '1.0.0',
  description: 'Deterministic scrape cost/ROI analyzer. From page count, per-page cost (or components), per-page/total value, and a one-time fixed cost, returns total cost, net value, ROI %, per-page margin, break-even page count, and a verdict band. Pure arithmetic — no fetch, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
