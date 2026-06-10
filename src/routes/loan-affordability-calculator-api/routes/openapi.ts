import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';

const EnvelopeOk = {
  type: 'object', required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean', enum: [true] }, latency_ms: { type: 'integer', minimum: 0 } },
};
const ExecutionMetadata = { type: 'object', required: ['model', 'automation_safe'], additionalProperties: false, properties: { model: { type: 'string', enum: ['deterministic'] }, automation_safe: { type: 'boolean' } } };
const ConfidencePerSection = { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 1 } };

const AffordSensitivityRow = {
  type: 'object', required: ['annual_rate', 'max_loan_amount', 'max_purchase_price'], additionalProperties: false,
  properties: { annual_rate: { type: 'number' }, max_loan_amount: { type: 'number' }, max_purchase_price: { type: 'number' } },
};
const AffordCore = {
  type: 'object',
  required: ['gross_monthly_income', 'front_end_cap', 'back_end_cap', 'max_housing_payment', 'max_principal_interest_payment', 'max_loan_amount', 'max_purchase_price', 'down_payment', 'binding_constraint', 'current_back_end_dti_pct'],
  properties: {
    gross_monthly_income: { type: 'number' },
    front_end_cap: { type: 'number', description: 'Housing budget at the front-end DTI %.' },
    back_end_cap: { type: 'number', description: 'Housing budget at the back-end DTI % less existing debt.' },
    max_housing_payment: { type: 'number', description: 'Lower of the two caps (PITI budget).' },
    max_principal_interest_payment: { type: 'number', description: 'max_housing_payment less taxes/insurance.' },
    max_loan_amount: { type: 'number' }, max_purchase_price: { type: 'number', description: 'max_loan_amount + down_payment.' },
    down_payment: { type: 'number' },
    binding_constraint: { type: 'string', enum: ['front_end_dti', 'back_end_dti', 'none'] },
    current_back_end_dti_pct: { type: 'number', description: 'Existing debt as a % of gross income.' },
  },
};
const FinanceTail = {
  type: 'object', required: ['confidence_score', 'confidence_per_section', 'recommended_actions_priority_order', 'chain_to', 'financial_disclaimer', 'privacy', 'execution_metadata'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 }, confidence_per_section: { $ref: '#/components/schemas/ConfidencePerSection' },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } }, chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    financial_disclaimer: { type: 'string' }, privacy: { $ref: '#/components/schemas/Privacy' }, execution_metadata: { $ref: '#/components/schemas/ExecutionMetadata' },
  },
};
const AffordRequest = {
  type: 'object', required: ['annual_income', 'annual_rate'], additionalProperties: false,
  properties: {
    annual_income: { type: 'number', exclusiveMinimum: 0 },
    monthly_debt_payments: { type: 'number', minimum: 0, default: 0, description: 'Existing recurring debt (auto/student/cards).' },
    down_payment: { type: 'number', minimum: 0, default: 0 },
    annual_rate: { type: 'number', minimum: 0, maximum: 30 },
    term_months: { type: 'integer', minimum: 1, maximum: 600, default: 360 },
    front_end_dti_pct: { type: 'number', exclusiveMinimum: 0, maximum: 100, default: 28 },
    back_end_dti_pct: { type: 'number', exclusiveMinimum: 0, maximum: 100, default: 36 },
    property_tax_insurance_monthly: { type: 'number', minimum: 0, default: 0, description: 'Monthly taxes + insurance (subtracted from the PITI budget).' },
  },
};

const REQ_EXAMPLE = { annual_income: 120000, monthly_debt_payments: 600, down_payment: 60000, annual_rate: 6.5, term_months: 360, property_tax_insurance_monthly: 450 };
const CORE_EXAMPLE = {
  gross_monthly_income: 10000, front_end_cap: 2800, back_end_cap: 3000, max_housing_payment: 2800, max_principal_interest_payment: 2350,
  max_loan_amount: 371795.43, max_purchase_price: 431795.43, down_payment: 60000, binding_constraint: 'front_end_dti', current_back_end_dti_pct: 6,
};
const TAIL_EXAMPLE = {
  confidence_score: 1, confidence_per_section: { affordability: 1, dti_caps: 1 },
  recommended_actions_priority_order: ['You can likely afford up to ~431795.43 (loan 371795.43 + 60000 down) at 6.5% over 30 years.', 'The 28% front-end (housing) cap is the binding constraint at 2800/mo.', 'Get a pre-approval for the real rate and PITI; lenders also weigh credit score, reserves, and property taxes.'],
  chain_to: [
    { api: 'dti-calculator', reason: 'See your exact front/back-end DTI and qualification band.' },
    { api: 'credit-score-estimator', reason: 'Estimate the score that drives your actual rate.' },
    { api: 'mortgage-refinance', reason: 'Once you have a loan, evaluate refinancing it.' },
  ],
  financial_disclaimer: 'Informational, deterministic calculation — not financial advice.',
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection, AffordSensitivityRow, AffordCore, _FinanceTail: FinanceTail, AffordRequest,
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
  CalculateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AffordCore' }, { $ref: '#/components/schemas/_FinanceTail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AffordCore' },
      { type: 'object', required: ['assumptions', 'sensitivity_analysis', 'reasoning'], properties: { assumptions: { type: 'array', items: { type: 'string' } }, sensitivity_analysis: { type: 'array', items: { $ref: '#/components/schemas/AffordSensitivityRow' } }, reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_FinanceTail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/calculate', summary: 'Max loan, purchase price, and binding DTI constraint', operationId: 'calculate', priceUsdc: 0.01,
    requestSchemaRef: 'AffordRequest', responseSchemaRef: 'CalculateResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'loa1-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL affordability + reasoning + rate sensitivity', operationId: 'lookup', priceUsdc: 0.02, oneCall: true,
    requestSchemaRef: 'AffordRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'loa2-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      assumptions: ['Front-end cap 28% of gross income for housing; back-end cap 36% for all debt (conventional defaults).', 'Uses gross (pre-tax) income; does not model PMI, HOA, or reserve requirements.'],
      sensitivity_analysis: [
        { annual_rate: 5.5, max_loan_amount: 413886.14, max_purchase_price: 473886.14 },
        { annual_rate: 6, max_loan_amount: 391960.29, max_purchase_price: 451960.29 },
        { annual_rate: 6.5, max_loan_amount: 371795.43, max_purchase_price: 431795.43 },
        { annual_rate: 7, max_loan_amount: 353222.78, max_purchase_price: 413222.78 },
        { annual_rate: 7.5, max_loan_amount: 336091.42, max_purchase_price: 396091.42 },
      ],
      reasoning: { why_result_generated: 'Gross 10000 → housing budget 2800 (lower of 28% front-end and 36% back-end less 600 debt), then inverted 2350/mo at 6.5% to a 371795.43 loan.', key_factors: ['Max purchase price 431795.43 (incl. 60000 down).', 'Binding constraint: front_end_dti.', 'Current other-debt back-end DTI: 6%.'], invalidators: ['A higher rate lowers the affordable loan (see sensitivity).', 'Adding or clearing other monthly debt moves the back-end cap directly.'] },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'loan-affordability-calculator', title: 'Loan Affordability Calculator API', version: '1.0.0',
  description: 'Deterministic loan/home affordability calculator. Applies the standard 28% front-end and 36% back-end DTI caps to your income, nets out existing debt and taxes/insurance, and inverts the amortization formula to the maximum loan amount and purchase price, identifying the binding constraint. Real math — never estimated.',
  endpoints, schemas, infoExtensions: { 'x-finance': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
