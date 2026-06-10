import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';

const EnvelopeOk = {
  type: 'object', required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean', enum: [true] }, latency_ms: { type: 'integer', minimum: 0 } },
};
const ExecutionMetadata = { type: 'object', required: ['model', 'automation_safe'], additionalProperties: false, properties: { model: { type: 'string', enum: ['deterministic'] }, automation_safe: { type: 'boolean' } } };
const ConfidencePerSection = { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 1 } };

const DtiCore = {
  type: 'object',
  required: ['gross_monthly_income', 'housing_payment', 'other_monthly_debt', 'total_monthly_debt', 'front_end_dti_pct', 'back_end_dti_pct', 'front_end_status', 'back_end_status', 'qualification', 'max_additional_monthly_debt_at_36', 'max_additional_monthly_debt_at_43'],
  properties: {
    gross_monthly_income: { type: 'number' }, housing_payment: { type: 'number' }, other_monthly_debt: { type: 'number' }, total_monthly_debt: { type: 'number' },
    front_end_dti_pct: { type: 'number' }, back_end_dti_pct: { type: 'number' },
    front_end_status: { type: 'string', enum: ['ideal', 'acceptable', 'high'] },
    back_end_status: { type: 'string', enum: ['ideal', 'acceptable', 'limited', 'high'] },
    qualification: { type: 'string', enum: ['strong', 'acceptable', 'limited', 'high_risk'] },
    max_additional_monthly_debt_at_36: { type: 'number', description: 'Headroom before reaching a 36% back-end DTI.' },
    max_additional_monthly_debt_at_43: { type: 'number', description: 'Headroom before reaching the 43% QM limit.' },
  },
};
const Thresholds = {
  type: 'object', required: ['front_end_ideal_pct', 'back_end_conservative_pct', 'back_end_qm_limit_pct', 'back_end_fha_max_pct'], additionalProperties: false,
  properties: { front_end_ideal_pct: { type: 'number' }, back_end_conservative_pct: { type: 'number' }, back_end_qm_limit_pct: { type: 'number' }, back_end_fha_max_pct: { type: 'number' } },
};
const FinanceTail = {
  type: 'object', required: ['confidence_score', 'confidence_per_section', 'recommended_actions_priority_order', 'chain_to', 'financial_disclaimer', 'privacy', 'execution_metadata'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 }, confidence_per_section: { $ref: '#/components/schemas/ConfidencePerSection' },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } }, chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    financial_disclaimer: { type: 'string' }, privacy: { $ref: '#/components/schemas/Privacy' }, execution_metadata: { $ref: '#/components/schemas/ExecutionMetadata' },
  },
};
const DtiRequest = {
  type: 'object', required: ['housing_payment'], additionalProperties: false,
  properties: {
    gross_monthly_income: { type: 'number', exclusiveMinimum: 0, description: 'Pre-tax monthly income (or supply annual_income).' },
    annual_income: { type: 'number', exclusiveMinimum: 0, description: 'Alternative to gross_monthly_income.' },
    housing_payment: { type: 'number', minimum: 0, description: 'Monthly mortgage/rent PITI (front-end).' },
    other_monthly_debt: { type: 'number', minimum: 0, default: 0, description: 'All other recurring debt minimums (back-end).' },
  },
  description: 'Provide gross_monthly_income or annual_income, plus housing_payment and optional other_monthly_debt.',
};

const REQ_EXAMPLE = { gross_monthly_income: 8000, housing_payment: 2000, other_monthly_debt: 700 };
const CORE_EXAMPLE = {
  gross_monthly_income: 8000, housing_payment: 2000, other_monthly_debt: 700, total_monthly_debt: 2700,
  front_end_dti_pct: 25, back_end_dti_pct: 33.8, front_end_status: 'ideal', back_end_status: 'ideal', qualification: 'strong',
  max_additional_monthly_debt_at_36: 180, max_additional_monthly_debt_at_43: 740,
};
const TAIL_EXAMPLE = {
  confidence_score: 1, confidence_per_section: { ratios: 1, qualification: 1 },
  recommended_actions_priority_order: ['Back-end DTI is 33.8% (strong); front-end (housing) is 25% (ideal).', 'You have room for up to 180/mo more debt before reaching the conservative 36% line.'],
  chain_to: [
    { api: 'loan-affordability-calculator', reason: 'Translate this DTI headroom into a maximum loan and purchase price.' },
    { api: 'debt-payoff-planner', reason: 'Lower the back-end ratio by paying down the highest-rate debt.' },
    { api: 'credit-score-estimator', reason: 'Pair DTI with an estimated score — lenders weigh both.' },
  ],
  financial_disclaimer: 'Informational, deterministic calculation — not financial advice.',
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection, DtiCore, Thresholds, _FinanceTail: FinanceTail, DtiRequest,
  DiscoveryResponse: {
    type: 'object', required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'], additionalProperties: false,
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' }, openapi_url: { type: 'string', format: 'uri' },
      auth: { type: 'object', required: ['type', 'header'], additionalProperties: false, properties: { type: { type: 'string' }, header: { type: 'string' } } },
      endpoints: { type: 'array', items: { type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false, properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
      pricing: { type: 'array', items: { type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false, properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } } } },
      x402_compatible: { type: 'boolean' },
    },
  },
  CalculateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DtiCore' }, { $ref: '#/components/schemas/_FinanceTail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DtiCore' },
      { type: 'object', required: ['thresholds', 'assumptions', 'reasoning'], properties: { thresholds: { $ref: '#/components/schemas/Thresholds' }, assumptions: { type: 'array', items: { type: 'string' } }, reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_FinanceTail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/calculate', summary: 'Front/back-end DTI + qualification band + headroom', operationId: 'calculate', priceUsdc: 0.008,
    requestSchemaRef: 'DtiRequest', responseSchemaRef: 'CalculateResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'dti1-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL DTI + reasoning + threshold guidance', operationId: 'lookup', priceUsdc: 0.015, oneCall: true,
    requestSchemaRef: 'DtiRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'dti2-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      thresholds: { front_end_ideal_pct: 28, back_end_conservative_pct: 36, back_end_qm_limit_pct: 43, back_end_fha_max_pct: 50 },
      assumptions: ['Uses gross (pre-tax) monthly income, as lenders do.', 'Back-end DTI includes housing + all recurring debt minimums; it excludes utilities and typical living expenses.', 'Bands reflect common conventional/QM (≤43%) and FHA (≤50%) guidelines, not a specific lender overlay.'],
      reasoning: { why_result_generated: 'Divided housing 2000 by income 8000 for front-end 25%, and total debt 2700 for back-end 33.8%.', key_factors: ['Qualification: strong (back-end 33.8%).', 'Headroom to 36%: 180/mo; to 43%: 740/mo.', 'Front-end status: ideal.'], invalidators: ['Adding or clearing recurring debt moves the back-end ratio directly.', 'A raise or second income lowers both ratios.'] },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'dti-calculator', title: 'DTI Calculator API', version: '1.0.0',
  description: 'Deterministic debt-to-income calculator. Computes front-end (housing) and back-end (total debt) DTI against gross income, maps the back-end ratio to a lender qualification band, and reports the headroom to the 36% and 43% limits. Real arithmetic — never estimated.',
  endpoints, schemas, infoExtensions: { 'x-finance': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
