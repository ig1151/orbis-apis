import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';

const EnvelopeOk = {
  type: 'object', required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean', enum: [true] }, latency_ms: { type: 'integer', minimum: 0 } },
};
const ExecutionMetadata = {
  type: 'object', required: ['model', 'automation_safe'], additionalProperties: false,
  properties: { model: { type: 'string', enum: ['deterministic'] }, automation_safe: { type: 'boolean' } },
};
const ConfidencePerSection = { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 1 } };

const Factor = {
  type: 'object', required: ['factor', 'weight_pct', 'sub_score', 'impact', 'note'], additionalProperties: false,
  properties: {
    factor: { type: 'string' }, weight_pct: { type: 'number' }, sub_score: { type: 'number' },
    impact: { type: 'string', enum: ['positive', 'neutral', 'negative'] }, note: { type: 'string' },
  },
};
const CreditCore = {
  type: 'object',
  required: ['estimated_score', 'score_range', 'rating', 'factor_breakdown', 'weakest_factor', 'is_estimate'],
  properties: {
    estimated_score: { type: 'integer', minimum: 300, maximum: 850 },
    score_range: { type: 'object', required: ['low', 'high'], additionalProperties: false, properties: { low: { type: 'integer' }, high: { type: 'integer' } }, description: 'Model uncertainty band (±20).' },
    rating: { type: 'string', enum: ['poor', 'fair', 'good', 'very_good', 'exceptional'] },
    factor_breakdown: { type: 'array', items: { $ref: '#/components/schemas/Factor' } },
    weakest_factor: { type: 'string' },
    is_estimate: { type: 'boolean', enum: [true], description: 'Always true — a model estimate, not your actual FICO/VantageScore.' },
  },
};
const FinanceTail = {
  type: 'object',
  required: ['confidence_score', 'confidence_per_section', 'recommended_actions_priority_order', 'chain_to', 'financial_disclaimer', 'privacy', 'execution_metadata'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1, description: 'Below 1.0: this is a model estimate, not exact math.' },
    confidence_per_section: { $ref: '#/components/schemas/ConfidencePerSection' },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    financial_disclaimer: { type: 'string' },
    privacy: { $ref: '#/components/schemas/Privacy' },
    execution_metadata: { $ref: '#/components/schemas/ExecutionMetadata' },
  },
};
const CreditRequest = {
  type: 'object', required: ['on_time_payment_pct', 'credit_utilization_pct', 'avg_account_age_years', 'num_credit_types'], additionalProperties: false,
  properties: {
    on_time_payment_pct: { type: 'number', minimum: 0, maximum: 100, description: '% of payments made on time (payment history, 35%).' },
    credit_utilization_pct: { type: 'number', minimum: 0, maximum: 200, description: 'Balances ÷ limits (amounts owed, 30%).' },
    avg_account_age_years: { type: 'number', minimum: 0, maximum: 80, description: 'Average account age (length, 15%).' },
    num_credit_types: { type: 'integer', minimum: 0, maximum: 10, description: 'Distinct account types (mix, 10%).' },
    hard_inquiries_last_12mo: { type: 'integer', minimum: 0, maximum: 50, default: 0, description: 'New credit, 10%.' },
    derogatory_marks: { type: 'integer', minimum: 0, maximum: 50, default: 0, description: 'Late payments/collections/bankruptcies.' },
  },
};

const REQ_EXAMPLE = { on_time_payment_pct: 98, credit_utilization_pct: 22, avg_account_age_years: 6, num_credit_types: 3, hard_inquiries_last_12mo: 1, derogatory_marks: 0 };
const CORE_EXAMPLE = {
  estimated_score: 800, score_range: { low: 780, high: 820 }, rating: 'exceptional',
  factor_breakdown: [
    { factor: 'payment_history', weight_pct: 35, sub_score: 98, impact: 'positive', note: '98% on-time payments.' },
    { factor: 'utilization', weight_pct: 30, sub_score: 86.8, impact: 'positive', note: '22% utilization (best is under 10%; under 30% is healthy).' },
    { factor: 'credit_age', weight_pct: 15, sub_score: 85.71, impact: 'positive', note: 'Average account age 6 year(s); ~7+ years maxes this factor.' },
    { factor: 'credit_mix', weight_pct: 10, sub_score: 90, impact: 'positive', note: '3 distinct account type(s).' },
    { factor: 'new_credit', weight_pct: 10, sub_score: 88, impact: 'positive', note: '1 hard inquiry(ies) in the last 12 months.' },
  ],
  weakest_factor: 'new_credit', is_estimate: true,
};
const TAIL_EXAMPLE = {
  confidence_score: 0.6,
  confidence_per_section: { model_estimate: 0.6, factor_breakdown: 1 },
  recommended_actions_priority_order: ['Your profile is strong across all factors; maintain on-time payments and low utilization.'],
  chain_to: [
    { api: 'dti-calculator', reason: 'Check the debt-to-income ratio lenders pair with your score.' },
    { api: 'loan-affordability-calculator', reason: 'Translate this score band into the rate/amount you can likely qualify for.' },
    { api: 'debt-payoff-planner', reason: 'Lowering balances improves utilization — plan the payoff.' },
  ],
  financial_disclaimer: 'Informational, deterministic estimate using public FICO category weights — not your actual FICO/VantageScore.',
  privacy: { data_stored: false, retention: 'none' },
  execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection, Factor, CreditCore, _FinanceTail: FinanceTail, CreditRequest,
  DiscoveryResponse: {
    type: 'object', required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'], additionalProperties: false,
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: { type: 'object', required: ['type', 'header'], additionalProperties: false, properties: { type: { type: 'string' }, header: { type: 'string' } } },
      endpoints: { type: 'array', items: { type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false, properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
      pricing: { type: 'array', items: { type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false, properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } } } },
      x402_compatible: { type: 'boolean' },
    },
  },
  EstimateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CreditCore' }, { $ref: '#/components/schemas/_FinanceTail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CreditCore' },
      { type: 'object', required: ['assumptions', 'reasoning'], properties: { assumptions: { type: 'array', items: { type: 'string' } }, reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_FinanceTail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/estimate', summary: 'Estimate score band + per-factor breakdown', operationId: 'estimate', priceUsdc: 0.01,
    requestSchemaRef: 'CreditRequest', responseSchemaRef: 'EstimateResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'cre1-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL estimate + reasoning + improvement plan', operationId: 'lookup', priceUsdc: 0.02, oneCall: true,
    requestSchemaRef: 'CreditRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'cre2-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      assumptions: ['Uses the publicly published FICO category weights; lenders may use different score models.', 'Sub-scores are heuristic mappings of your inputs, not a lookup of your real credit file.'],
      reasoning: { why_result_generated: 'Weighted five factor sub-scores by the FICO weights and scaled to 300–850.', key_factors: ['Estimated 800 (exceptional); likely range 780–820.', 'Weakest factor: new_credit.', 'Payment history (35%) and utilization (30%) dominate the result.'], invalidators: ['A derogatory mark, new inquiry, or balance change shifts the estimate.', "Your lender's actual scoring model may differ from public FICO weights."] },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'credit-score-estimator', title: 'Credit Score Estimator API', version: '1.0.0',
  description: 'Transparent credit-score estimator using the public FICO category weights (payment 35%, utilization 30%, age 15%, mix 10%, new credit 10%), mapped to the 300–850 scale with a per-factor breakdown. A deterministic model and explicit estimate — not your actual FICO/VantageScore — so confidence is below 1.0 and the result is a range.',
  endpoints, schemas, infoExtensions: { 'x-finance': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
