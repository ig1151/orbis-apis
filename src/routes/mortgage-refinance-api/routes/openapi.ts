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

const MortgageCore = {
  type: 'object',
  required: [
    'ltv', 'pmi_removal_eligible', 'points_cost', 'upfront_cost', 'current_monthly_payment',
    'new_monthly_payment', 'new_pmi_monthly', 'monthly_savings', 'break_even_months',
    'new_total_interest', 'lifetime_savings', 'worth_it', 'risk_level',
  ],
  properties: {
    ltv: { type: ['number', 'null'], description: 'New loan-to-value as a fraction ((current_balance + cash_out) / home_value).' },
    pmi_removal_eligible: { type: 'boolean', description: 'True when new LTV ≤ 80% and PMI was being paid.' },
    points_cost: { type: 'number', description: 'Upfront cost of discount points (points% of the new loan amount).' },
    upfront_cost: { type: 'number', description: 'closing_costs + points_cost.' },
    current_monthly_payment: { type: 'number', description: 'Current principal + interest + PMI.' },
    new_monthly_payment: { type: 'number', description: 'New principal + interest + any remaining PMI.' },
    new_pmi_monthly: { type: 'number', description: 'PMI carried on the new loan (0 if LTV ≤ 80%).' },
    monthly_savings: { type: 'number' },
    break_even_months: { type: ['integer', 'null'], description: 'Months for monthly savings to recoup upfront_cost; null when no savings.' },
    new_total_interest: { type: 'number' },
    lifetime_savings: { type: 'number' },
    worth_it: { type: 'boolean' },
    risk_level: { type: 'string', enum: ['low', 'moderate', 'high'] },
  },
};

const FinanceTail = {
  type: 'object',
  required: ['confidence_score', 'recommended_actions_priority_order', 'chain_to', 'financial_disclaimer', 'privacy'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    financial_disclaimer: { type: 'string' },
    privacy: { $ref: '#/components/schemas/Privacy' },
  },
};

const SensitivityRow = {
  type: 'object',
  required: ['new_rate', 'new_monthly_payment', 'monthly_savings'],
  additionalProperties: false,
  properties: {
    new_rate: { type: 'number' }, new_monthly_payment: { type: 'number' }, monthly_savings: { type: 'number' },
  },
};

const MortgageRequest = {
  type: 'object',
  required: ['home_value', 'current_balance', 'current_rate', 'current_remaining_months', 'new_rate', 'new_term_months'],
  additionalProperties: false,
  properties: {
    home_value: { type: 'number', exclusiveMinimum: 0, description: 'Current appraised/market value of the home.' },
    current_balance: { type: 'number', exclusiveMinimum: 0, description: 'Outstanding mortgage balance.' },
    current_rate: { type: 'number', minimum: 0, maximum: 100, description: 'Current annual mortgage rate (%).' },
    current_remaining_months: { type: 'integer', minimum: 1, maximum: 600 },
    new_rate: { type: 'number', minimum: 0, maximum: 100, description: 'New annual mortgage rate (%).' },
    new_term_months: { type: 'integer', minimum: 1, maximum: 600 },
    closing_costs: { type: 'number', minimum: 0, default: 0 },
    points: { type: 'number', minimum: 0, maximum: 10, default: 0, description: 'Discount points (each = 1% of the new loan, paid upfront).' },
    pmi_monthly: { type: 'number', minimum: 0, default: 0, description: 'Current monthly PMI, if any.' },
    cash_out: { type: 'number', minimum: 0, default: 0, description: 'Cash-out amount added to the new principal.' },
  },
};

const schemas = {
  EnvelopeOk,
  MortgageCore,
  _FinanceTail: FinanceTail,
  SensitivityRow,
  MortgageRequest,
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
  AnalyzeResponse: {
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/MortgageCore' }, { $ref: '#/components/schemas/_FinanceTail' }],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/MortgageCore' },
      {
        type: 'object',
        required: ['assumptions', 'sensitivity_analysis', 'reasoning'],
        properties: {
          assumptions: { type: 'array', items: { type: 'string' } },
          sensitivity_analysis: { type: 'array', items: { $ref: '#/components/schemas/SensitivityRow' }, description: 'New payment and savings across new_rate ± 0.5%.' },
          reasoning: { $ref: '#/components/schemas/Reasoning' },
        },
      },
      { $ref: '#/components/schemas/_FinanceTail' },
    ],
    unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = {
  home_value: 480000, current_balance: 360000, current_rate: 7.5, current_remaining_months: 348,
  new_rate: 6.125, new_term_months: 360, closing_costs: 6000, points: 0, pmi_monthly: 180, cash_out: 0,
};

const CORE_EXAMPLE = {
  ltv: 0.75, pmi_removal_eligible: true, points_cost: 0, upfront_cost: 6000,
  current_monthly_payment: 2697.98, new_monthly_payment: 2187.34, new_pmi_monthly: 0,
  monthly_savings: 510.64, break_even_months: 12, new_total_interest: 427442.4,
  lifetime_savings: 94944, worth_it: true, risk_level: 'low',
};

const TAIL_EXAMPLE = {
  confidence_score: 1.0,
  recommended_actions_priority_order: [
    'Refinance saves 510.64/mo and breaks even in 12 month(s) — strong candidate if you hold past break-even.',
    'New LTV is at/below 80% — refinancing can eliminate PMI; confirm the lender drops it.',
    'Confirm rate, APR, points, and PMI terms in a written loan estimate before committing.',
  ],
  chain_to: [
    { api: 'refinance-calculator', reason: 'General-loan view of the same refinance (auto/student/personal).' },
    { api: 'financial-health-checker', reason: 'Check how the new mortgage payment affects DTI and overall financial health.' },
  ],
  financial_disclaimer: 'This result is an informational, deterministic calculation… not financial advice.',
  privacy: { data_stored: false, retention: 'none' },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/analyze', summary: 'LTV, PMI removal, points, payment & break-even',
    operationId: 'analyze', priceUsdc: 0.01, humanApprovalRequired: true,
    requestSchemaRef: 'MortgageRequest', responseSchemaRef: 'AnalyzeResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'mr1-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL mortgage refinance analysis + reasoning + rate sensitivity',
    operationId: 'lookup', priceUsdc: 0.025, oneCall: true, humanApprovalRequired: true,
    requestSchemaRef: 'MortgageRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'mr2-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      assumptions: [
        'Fixed rate and fully-amortizing payments; payment shown is principal + interest (+ PMI where applicable), excluding taxes and insurance escrow.',
        'PMI is assumed removed when the new loan-to-value is at or below 80%.',
      ],
      sensitivity_analysis: [
        { new_rate: 5.625, new_monthly_payment: 2073.45, monthly_savings: 624.53 },
        { new_rate: 6.125, new_monthly_payment: 2187.34, monthly_savings: 510.64 },
        { new_rate: 6.625, new_monthly_payment: 2304.01, monthly_savings: 393.97 },
      ],
      reasoning: {
        why_result_generated: 'Computed new LTV 0.75, amortized the 360-month loan at 6.125%, and compared total monthly cost (incl. PMI) net of 6000 upfront.',
        key_factors: ['Monthly payment change: -510.64 (2697.98 → 2187.34).', 'New LTV ≤ 80% → PMI removable.', 'Break-even in 12 month(s) on 6000 upfront.'],
        invalidators: ['Selling or paying off before break-even erases the savings.', 'An appraisal below the entered home_value raises LTV and may keep PMI.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'mortgage-refinance',
  title: 'Mortgage Refinance API',
  version: '1.0.0',
  description: 'Deterministic mortgage refinance analysis: loan-to-value, PMI removal eligibility, discount-points break-even, cash-out, and rate-and-term savings — all in real amortization math (never estimated). Returns monthly and lifetime savings, break-even months, rate sensitivity, and reasoning, with a financial disclaimer and human-approval flag because results inform a refinancing decision.',
  endpoints,
  schemas,
  infoExtensions: { 'x-finance': true, 'x-human-approval-required': true },
});

export default specRouter(spec);
