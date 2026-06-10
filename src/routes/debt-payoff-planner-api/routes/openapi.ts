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

const PayoffEntry = {
  type: 'object', required: ['name', 'payoff_month'], additionalProperties: false,
  properties: { name: { type: 'string' }, payoff_month: { type: 'integer', minimum: 1 } },
};

const StrategyResult = {
  type: 'object',
  required: ['strategy', 'months_to_debt_free', 'total_interest_paid', 'total_paid', 'payoff_order', 'never_payoff'],
  additionalProperties: false,
  properties: {
    strategy: { type: 'string', enum: ['avalanche', 'snowball'] },
    months_to_debt_free: { type: ['integer', 'null'], description: 'Months until all debts clear; null if payments never cover interest within the horizon.' },
    total_interest_paid: { type: 'number' },
    total_paid: { type: 'number' },
    payoff_order: { type: 'array', items: { $ref: '#/components/schemas/PayoffEntry' } },
    never_payoff: { type: 'boolean' },
  },
};

const MinimumsOnly = {
  type: 'object', required: ['months_to_debt_free', 'total_interest_paid', 'never_payoff'], additionalProperties: false,
  properties: {
    months_to_debt_free: { type: ['integer', 'null'] },
    total_interest_paid: { type: ['number', 'null'] },
    never_payoff: { type: 'boolean' },
  },
};

const DebtSensitivityRow = {
  type: 'object', required: ['extra_monthly_payment', 'months_to_debt_free', 'total_interest_paid'], additionalProperties: false,
  properties: {
    extra_monthly_payment: { type: 'number' },
    months_to_debt_free: { type: ['integer', 'null'] },
    total_interest_paid: { type: 'number' },
  },
};

const DebtCore = {
  type: 'object',
  required: [
    'total_debt', 'total_minimum_payment', 'extra_monthly_payment', 'monthly_budget',
    'avalanche', 'snowball', 'minimums_only', 'recommended_strategy', 'recommended_reason',
    'interest_saved_vs_minimums', 'months_saved_vs_minimums', 'debt_free_in_months', 'never_payoff',
  ],
  properties: {
    total_debt: { type: 'number' },
    total_minimum_payment: { type: 'number' },
    extra_monthly_payment: { type: 'number' },
    monthly_budget: { type: 'number', description: 'total_minimum_payment + extra_monthly_payment.' },
    avalanche: { $ref: '#/components/schemas/StrategyResult' },
    snowball: { $ref: '#/components/schemas/StrategyResult' },
    minimums_only: { $ref: '#/components/schemas/MinimumsOnly' },
    recommended_strategy: { type: 'string', enum: ['avalanche', 'snowball'] },
    recommended_reason: { type: 'string' },
    interest_saved_vs_minimums: { type: ['number', 'null'], description: 'Interest saved by the recommended strategy vs paying only minimums; null if minimums never clear the debt.' },
    months_saved_vs_minimums: { type: ['integer', 'null'] },
    debt_free_in_months: { type: ['integer', 'null'], description: 'Months to debt-free under the recommended strategy.' },
    never_payoff: { type: 'boolean' },
  },
};

const ExecutionMetadata = {
  type: 'object', required: ['model', 'automation_safe'], additionalProperties: false,
  properties: { model: { type: 'string', enum: ['deterministic'] }, automation_safe: { type: 'boolean' } },
};
const ConfidencePerSection = { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 1 } };

const FinanceTail = {
  type: 'object',
  required: ['confidence_score', 'confidence_per_section', 'recommended_actions_priority_order', 'chain_to', 'financial_disclaimer', 'privacy', 'execution_metadata'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    confidence_per_section: { $ref: '#/components/schemas/ConfidencePerSection' },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    financial_disclaimer: { type: 'string' },
    privacy: { $ref: '#/components/schemas/Privacy' },
    execution_metadata: { $ref: '#/components/schemas/ExecutionMetadata' },
  },
};

const DebtEntry = {
  type: 'object', required: ['balance', 'apr', 'min_payment'], additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Optional label; defaults to debt_N.' },
    balance: { type: 'number', exclusiveMinimum: 0 },
    apr: { type: 'number', minimum: 0, maximum: 100, description: 'Annual percentage rate (%).' },
    min_payment: { type: 'number', minimum: 0 },
  },
};

const DebtPayoffRequest = {
  type: 'object', required: ['debts'], additionalProperties: false,
  properties: {
    debts: { type: 'array', minItems: 1, maxItems: 50, items: { $ref: '#/components/schemas/DebtEntry' } },
    extra_monthly_payment: { type: 'number', minimum: 0, default: 0, description: 'Extra paid above the sum of minimums, applied to the focus debt.' },
  },
};

const REQ_EXAMPLE = {
  debts: [
    { name: 'Credit Card', balance: 6000, apr: 24.99, min_payment: 150 },
    { name: 'Medical Bill', balance: 2500, apr: 0, min_payment: 75 },
    { name: 'Auto Loan', balance: 15000, apr: 6.9, min_payment: 320 },
  ],
  extra_monthly_payment: 250,
};

const CORE_EXAMPLE = {
  total_debt: 23500, total_minimum_payment: 545, extra_monthly_payment: 250, monthly_budget: 795,
  avalanche: { strategy: 'avalanche', months_to_debt_free: 34, total_interest_paid: 3121.46, total_paid: 26621.46, payoff_order: [{ name: 'Credit Card', payoff_month: 19 }, { name: 'Auto Loan', payoff_month: 34 }, { name: 'Medical Bill', payoff_month: 34 }], never_payoff: false },
  snowball: { strategy: 'snowball', months_to_debt_free: 35, total_interest_paid: 3851.21, total_paid: 27351.21, payoff_order: [{ name: 'Medical Bill', payoff_month: 8 }, { name: 'Credit Card', payoff_month: 22 }, { name: 'Auto Loan', payoff_month: 35 }], never_payoff: false },
  minimums_only: { months_to_debt_free: 87, total_interest_paid: 9554.4, never_payoff: false },
  recommended_strategy: 'avalanche',
  recommended_reason: 'Avalanche pays off highest-APR debt first, minimizing total interest (729.75 less than snowball).',
  interest_saved_vs_minimums: 6432.94, months_saved_vs_minimums: 53, debt_free_in_months: 34, never_payoff: false,
};

const TAIL_EXAMPLE = {
  confidence_score: 1,
  confidence_per_section: { payoff_simulation: 1, recommendation: 1, sensitivity_analysis: 1 },
  execution_metadata: { model: 'deterministic', automation_safe: true },
  recommended_actions_priority_order: [
    'Use the avalanche strategy: Avalanche pays off highest-APR debt first, minimizing total interest (729.75 less than snowball).',
    'Direct all 795/mo (incl. 250 extra) per the payoff order; you are debt-free in 34 month(s).',
    'This saves 6432.94 in interest vs paying only minimums.',
  ],
  chain_to: [
    { api: 'budget-planner', reason: 'Find room in your budget to fund the extra debt payment.' },
    { api: 'financial-health-checker', reason: 'See how this payoff plan moves your debt-to-income and overall score.' },
    { api: 'personal-finance-agent', reason: 'Combine payoff, budget, and savings into one prioritized action plan.' },
  ],
  financial_disclaimer: 'This result is an informational, deterministic calculation… not financial advice.',
  privacy: { data_stored: false, retention: 'none' },
};

const schemas = {
  EnvelopeOk,
  PayoffEntry,
  StrategyResult,
  MinimumsOnly,
  DebtSensitivityRow,
  ExecutionMetadata,
  ConfidencePerSection,
  DebtCore,
  _FinanceTail: FinanceTail,
  DebtEntry,
  DebtPayoffRequest,
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
  PlanResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/DebtCore' },
      { $ref: '#/components/schemas/_FinanceTail' },
    ],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/DebtCore' },
      {
        type: 'object',
        required: ['assumptions', 'sensitivity_analysis', 'reasoning'],
        properties: {
          assumptions: { type: 'array', items: { type: 'string' } },
          sensitivity_analysis: { type: 'array', items: { $ref: '#/components/schemas/DebtSensitivityRow' }, description: 'Four rows: total extra_monthly_payment stepped by +0/+50/+100/+200 above the supplied extra (absolute values shown in extra_monthly_payment).' },
          reasoning: { $ref: '#/components/schemas/Reasoning' },
        },
      },
      { $ref: '#/components/schemas/_FinanceTail' },
    ],
    unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/plan', summary: 'Compare avalanche vs snowball + recommended strategy',
    operationId: 'plan', priceUsdc: 0.01, humanApprovalRequired: true,
    requestSchemaRef: 'DebtPayoffRequest', responseSchemaRef: 'PlanResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'deb1-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL payoff plan + reasoning + extra-payment sensitivity',
    operationId: 'lookup', priceUsdc: 0.02, oneCall: true, humanApprovalRequired: true,
    requestSchemaRef: 'DebtPayoffRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'deb2-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      assumptions: [
        'Interest accrues monthly at APR/12 on the remaining balance of each debt.',
        'You make every minimum payment on time; freed minimums roll into the focus debt as each debt is cleared.',
      ],
      sensitivity_analysis: [
        { extra_monthly_payment: 250, months_to_debt_free: 34, total_interest_paid: 3121.46 },
        { extra_monthly_payment: 300, months_to_debt_free: 32, total_interest_paid: 2827.57 },
        { extra_monthly_payment: 350, months_to_debt_free: 30, total_interest_paid: 2590.34 },
        { extra_monthly_payment: 450, months_to_debt_free: 26, total_interest_paid: 2229.05 },
      ],
      reasoning: {
        why_result_generated: 'Simulated each debt month-by-month under both strategies on a 795/mo budget, accruing APR/12 interest and rolling freed minimums into the focus debt.',
        key_factors: ['Total debt 23500 across 3 balance(s); minimum payments 545/mo + 250 extra.', 'Recommended avalanche: debt-free in 34 month(s), 3121.46 (avalanche) vs 3851.21 (snowball) total interest.', 'Saves 6432.94 in interest and 53 month(s) vs minimums-only.'],
        invalidators: ['Adding new charges or missing a payment changes the timeline and interest.', 'A balance transfer or consolidation to a lower rate would change the optimal order.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'debt-payoff-planner',
  title: 'Debt Payoff Planner API',
  version: '1.0.0',
  description: 'Deterministic debt-payoff planner. Simulates avalanche (highest-APR first) and snowball (smallest-balance first) strategies month-by-month with real interest accrual and minimum-payment rollover, recommends one, and quantifies the interest and months saved vs paying only minimums. Includes a financial disclaimer and human-approval flag because results inform borrowing decisions.',
  endpoints,
  schemas,
  infoExtensions: { 'x-finance': true, 'x-human-approval-required': true },
});

export default specRouter(spec);
