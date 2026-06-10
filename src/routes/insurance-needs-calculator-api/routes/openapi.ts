import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';

const EnvelopeOk = {
  type: 'object', required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean', enum: [true] }, latency_ms: { type: 'integer', minimum: 0 } },
};
const ExecutionMetadata = { type: 'object', required: ['model', 'automation_safe'], additionalProperties: false, properties: { model: { type: 'string', enum: ['deterministic'] }, automation_safe: { type: 'boolean' } } };
const ConfidencePerSection = { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 1 } };

const DimeBreakdown = {
  type: 'object', required: ['debt', 'income_replacement', 'mortgage', 'education', 'final_expenses'], additionalProperties: false,
  properties: { debt: { type: 'number' }, income_replacement: { type: 'number' }, mortgage: { type: 'number' }, education: { type: 'number' }, final_expenses: { type: 'number' } },
};
const InsSensitivityRow = {
  type: 'object', required: ['years_income_replacement', 'total_need', 'coverage_gap'], additionalProperties: false,
  properties: { years_income_replacement: { type: 'number' }, total_need: { type: 'number' }, coverage_gap: { type: 'number' } },
};
const InsuranceCore = {
  type: 'object',
  required: ['dime_breakdown', 'total_need', 'existing_coverage', 'liquid_assets', 'coverage_gap', 'recommended_coverage', 'income_multiplier_estimate', 'adequately_insured'],
  properties: {
    dime_breakdown: { $ref: '#/components/schemas/DimeBreakdown' },
    total_need: { type: 'number' }, existing_coverage: { type: 'number' }, liquid_assets: { type: 'number' },
    coverage_gap: { type: 'number', description: 'max(0, total_need − existing_coverage − liquid_assets).' },
    recommended_coverage: { type: 'number', description: 'Coverage gap rounded up to the nearest 25,000; 0 if adequately insured.' },
    income_multiplier_estimate: { type: 'number', description: '10× annual income cross-check.' },
    adequately_insured: { type: 'boolean' },
  },
};
const FinanceTail = {
  type: 'object', required: ['confidence_score', 'confidence_per_section', 'recommended_actions_priority_order', 'chain_to', 'financial_disclaimer', 'privacy', 'execution_metadata'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    confidence_per_section: { $ref: '#/components/schemas/ConfidencePerSection' },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    financial_disclaimer: { type: 'string' }, privacy: { $ref: '#/components/schemas/Privacy' },
    execution_metadata: { $ref: '#/components/schemas/ExecutionMetadata' },
  },
};
const InsuranceRequest = {
  type: 'object', required: ['annual_income'], additionalProperties: false,
  properties: {
    annual_income: { type: 'number', exclusiveMinimum: 0 },
    years_income_replacement: { type: 'number', minimum: 0, maximum: 50, default: 10 },
    non_mortgage_debt: { type: 'number', minimum: 0, default: 0 },
    mortgage_balance: { type: 'number', minimum: 0, default: 0 },
    education_fund_needed: { type: 'number', minimum: 0, default: 0 },
    final_expenses: { type: 'number', minimum: 0, default: 15000 },
    existing_coverage: { type: 'number', minimum: 0, default: 0 },
    liquid_assets: { type: 'number', minimum: 0, default: 0 },
  },
};

const REQ_EXAMPLE = { annual_income: 90000, years_income_replacement: 10, non_mortgage_debt: 25000, mortgage_balance: 280000, education_fund_needed: 120000, final_expenses: 15000, existing_coverage: 100000, liquid_assets: 50000 };
const CORE_EXAMPLE = {
  dime_breakdown: { debt: 25000, income_replacement: 900000, mortgage: 280000, education: 120000, final_expenses: 15000 },
  total_need: 1340000, existing_coverage: 100000, liquid_assets: 50000, coverage_gap: 1190000, recommended_coverage: 1200000, income_multiplier_estimate: 900000, adequately_insured: false,
};
const TAIL_EXAMPLE = {
  confidence_score: 1, confidence_per_section: { dime: 1, coverage_gap: 1 },
  recommended_actions_priority_order: ['Consider about 1200000 in additional term life coverage to close the 1190000 gap.', 'Term life is usually the most cost-effective way to cover a temporary need (working years, mortgage, kids at home).', 'Cross-check: the 10× income rule suggests ~900000; DIME is more precise because it uses your actual obligations.'],
  chain_to: [
    { api: 'net-worth-tracker', reason: 'Quantify the liquid assets that offset the insurance need.' },
    { api: 'debt-payoff-planner', reason: 'Reducing debt lowers the coverage you need.' },
    { api: 'financial-health-checker', reason: 'See how insurance fits your overall financial picture.' },
  ],
  financial_disclaimer: 'Informational, deterministic calculation — not financial advice.',
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection, DimeBreakdown, InsSensitivityRow, InsuranceCore, _FinanceTail: FinanceTail, InsuranceRequest,
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
  CalculateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/InsuranceCore' }, { $ref: '#/components/schemas/_FinanceTail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/InsuranceCore' },
      { type: 'object', required: ['assumptions', 'sensitivity_analysis', 'reasoning'], properties: { assumptions: { type: 'array', items: { type: 'string' } }, sensitivity_analysis: { type: 'array', items: { $ref: '#/components/schemas/InsSensitivityRow' } }, reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_FinanceTail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/calculate', summary: 'DIME need, coverage gap, recommended coverage', operationId: 'calculate', priceUsdc: 0.01,
    requestSchemaRef: 'InsuranceRequest', responseSchemaRef: 'CalculateResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'ins1-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL needs analysis + reasoning + sensitivity', operationId: 'lookup', priceUsdc: 0.02, oneCall: true,
    requestSchemaRef: 'InsuranceRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'ins2-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      assumptions: ['Income replacement = annual income × 10 year(s); adjust years to match how long dependents need support.', 'DIME sums obligations to cover at death; it does not model survivor income or Social Security.'],
      sensitivity_analysis: [
        { years_income_replacement: 5, total_need: 890000, coverage_gap: 740000 },
        { years_income_replacement: 10, total_need: 1340000, coverage_gap: 1190000 },
        { years_income_replacement: 15, total_need: 1790000, coverage_gap: 1640000 },
        { years_income_replacement: 20, total_need: 2240000, coverage_gap: 2090000 },
      ],
      reasoning: { why_result_generated: 'Summed DIME components then subtracted 150000 in existing coverage + liquid assets.', key_factors: ['Total need 1340000; gap 1190000.', 'Recommended additional coverage 1200000.', 'Income replacement is the largest component at 900000.'], invalidators: ['Changing the income-replacement horizon materially changes the need.', 'New debt, a new mortgage, or another child raises the requirement.'] },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'insurance-needs-calculator', title: 'Insurance Needs Calculator API', version: '1.0.0',
  description: 'Deterministic life-insurance needs calculator using the DIME method (Debt + Income replacement + Mortgage + Education) plus final expenses, netted against existing coverage and liquid assets. Returns total need, coverage gap, and a recommended coverage amount with a 10×-income cross-check. Real arithmetic — never estimated.',
  endpoints, schemas, infoExtensions: { 'x-finance': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
