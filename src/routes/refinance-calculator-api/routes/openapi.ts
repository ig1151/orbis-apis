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

const RefiCore = {
  type: 'object',
  required: [
    'current_monthly_payment', 'new_monthly_payment', 'monthly_savings', 'new_loan_amount',
    'break_even_months', 'current_remaining_interest', 'new_total_interest', 'lifetime_savings',
    'worth_it', 'risk_level',
  ],
  properties: {
    current_monthly_payment: { type: 'number', description: 'Fully-amortizing payment on the current balance over its remaining term.' },
    new_monthly_payment: { type: 'number', description: 'Payment on the new loan amount over the new term.' },
    monthly_savings: { type: 'number', description: 'current_monthly_payment − new_monthly_payment (negative if the new payment is higher).' },
    new_loan_amount: { type: 'number', description: 'current_balance + cash_out.' },
    break_even_months: { type: ['integer', 'null'], description: 'Months for monthly savings to recoup closing costs; null when there are no monthly savings.' },
    current_remaining_interest: { type: 'number', description: 'Interest left on the current loan if kept to term.' },
    new_total_interest: { type: 'number', description: 'Total interest over the new loan term.' },
    lifetime_savings: { type: 'number', description: 'Total-cost difference over each loan\'s remaining life, net of closing costs.' },
    worth_it: { type: 'boolean', description: 'True when there are monthly savings, break-even ≤ 36 months, and positive lifetime savings.' },
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
    new_rate: { type: 'number' },
    new_monthly_payment: { type: 'number' },
    monthly_savings: { type: 'number' },
  },
};

const RefinanceRequest = {
  type: 'object',
  required: ['current_balance', 'current_rate', 'current_remaining_months', 'new_rate', 'new_term_months'],
  additionalProperties: false,
  properties: {
    current_balance: { type: 'number', exclusiveMinimum: 0, description: 'Outstanding balance on the current loan.' },
    current_rate: { type: 'number', minimum: 0, maximum: 100, description: 'Current annual interest rate (%).' },
    current_remaining_months: { type: 'integer', minimum: 1, maximum: 600, description: 'Months left on the current loan.' },
    new_rate: { type: 'number', minimum: 0, maximum: 100, description: 'New annual interest rate (%).' },
    new_term_months: { type: 'integer', minimum: 1, maximum: 600, description: 'Term of the new loan in months.' },
    closing_costs: { type: 'number', minimum: 0, default: 0, description: 'Upfront refinance/closing costs.' },
    cash_out: { type: 'number', minimum: 0, default: 0, description: 'Additional cash borrowed, added to the new principal.' },
  },
};

const schemas = {
  EnvelopeOk,
  RefiCore,
  _FinanceTail: FinanceTail,
  SensitivityRow,
  RefinanceRequest,
  DiscoveryResponse: {
    type: 'object',
    required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'],
    additionalProperties: false,
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: {
        type: 'object', required: ['type', 'header'], additionalProperties: false,
        properties: { type: { type: 'string' }, header: { type: 'string' } },
      },
      endpoints: {
        type: 'array',
        items: {
          type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false,
          properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } },
        },
      },
      pricing: {
        type: 'array',
        items: {
          type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false,
          properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } },
        },
      },
      x402_compatible: { type: 'boolean' },
    },
  },
  CalculateResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/RefiCore' },
      { $ref: '#/components/schemas/_FinanceTail' },
    ],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/RefiCore' },
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
  current_balance: 280000, current_rate: 7.25, current_remaining_months: 324,
  new_rate: 6.0, new_term_months: 360, closing_costs: 4500, cash_out: 0,
};

const CORE_EXAMPLE = {
  current_monthly_payment: 1979.41, new_monthly_payment: 1678.85, monthly_savings: 300.56,
  new_loan_amount: 280000, break_even_months: 15,
  current_remaining_interest: 361329.84, new_total_interest: 324386,
  lifetime_savings: 37443.84, worth_it: true, risk_level: 'low',
};

const TAIL_EXAMPLE = {
  confidence_score: 1.0,
  recommended_actions_priority_order: [
    'Refinancing saves 300.56/mo and breaks even in 15 month(s) — proceed if you will hold the loan past break-even.',
    'Confirm the actual rate, APR, and closing costs in a written loan estimate before committing.',
  ],
  chain_to: [
    { api: 'mortgage-refinance', reason: 'Mortgage-specific analysis incl. PMI removal, points, and LTV.' },
    { api: 'financial-health-checker', reason: 'Check how the new payment affects your debt-to-income and overall health.' },
  ],
  financial_disclaimer: 'This result is an informational, deterministic calculation… not financial advice.',
  privacy: { data_stored: false, retention: 'none' },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/calculate', summary: 'Compute current vs new payment, savings, and break-even',
    operationId: 'calculate', priceUsdc: 0.01, humanApprovalRequired: true,
    requestSchemaRef: 'RefinanceRequest', responseSchemaRef: 'CalculateResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'rf1-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL refinance analysis + reasoning + rate sensitivity',
    operationId: 'lookup', priceUsdc: 0.02, oneCall: true, humanApprovalRequired: true,
    requestSchemaRef: 'RefinanceRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'rf2-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      assumptions: [
        'Fixed interest rates and fully-amortizing payments over each loan term.',
        'Closing costs are paid upfront (not financed into the new balance).',
      ],
      sensitivity_analysis: [
        { new_rate: 5.5, new_monthly_payment: 1589.91, monthly_savings: 389.5 },
        { new_rate: 6.0, new_monthly_payment: 1678.85, monthly_savings: 300.56 },
        { new_rate: 6.5, new_monthly_payment: 1769.92, monthly_savings: 209.49 },
      ],
      reasoning: {
        why_result_generated: 'Amortized the current balance over 324 remaining month(s) and the new 360-month loan, then compared payments and total cost net of 4500 in closing costs.',
        key_factors: ['Monthly payment change: -300.56 (1979.41 → 1678.85).', 'Break-even in 15 month(s) on 4500 closing costs.', 'Lifetime cost change: saves 37443.84 over the loan life.'],
        invalidators: ['Selling or paying off the loan before break-even erases the savings.', 'A higher actual APR or larger closing costs than entered reduce or eliminate the benefit.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'refinance-calculator',
  title: 'Refinance Calculator API',
  version: '1.0.0',
  description: 'Deterministic loan refinance analysis for mortgage, auto, student, and personal loans. Computes current vs new monthly payment, monthly and lifetime savings, break-even months, and rate sensitivity in real amortization math (never estimated). Includes a financial disclaimer and human-approval flag because results inform refinancing decisions.',
  endpoints,
  schemas,
  infoExtensions: { 'x-finance': true, 'x-human-approval-required': true },
});

export default specRouter(spec);
