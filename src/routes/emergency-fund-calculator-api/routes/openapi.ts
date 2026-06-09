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

const FundCore = {
  type: 'object',
  required: [
    'recommended_target_months', 'recommended_target_amount', 'current_coverage_months',
    'funded_percent', 'gap', 'monthly_contribution', 'months_to_goal', 'status',
  ],
  properties: {
    recommended_target_months: { type: 'integer', description: 'Recommended months of expenses (scales with job stability + dependents, 3–12), or your target_months override.' },
    recommended_target_amount: { type: 'number', description: 'recommended_target_months × monthly_expenses.' },
    current_coverage_months: { type: ['number', 'null'], description: 'current_savings ÷ monthly_expenses.' },
    funded_percent: { type: 'number', minimum: 0, maximum: 100, description: 'current_savings as a % of the target amount (capped at 100).' },
    gap: { type: 'number', minimum: 0, description: 'Amount still needed to reach the target (0 if met).' },
    monthly_contribution: { type: 'number', minimum: 0 },
    months_to_goal: { type: ['integer', 'null'], description: 'Months to close the gap at the contribution rate; 0 if funded, null if no contribution set.' },
    status: { type: 'string', enum: ['fully_funded', 'adequate', 'underfunded', 'critical'] },
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

const FundRequest = {
  type: 'object',
  required: ['monthly_expenses'],
  additionalProperties: false,
  properties: {
    monthly_expenses: { type: 'number', exclusiveMinimum: 0, description: 'Total essential monthly expenses.' },
    current_savings: { type: 'number', minimum: 0, default: 0, description: 'Current liquid emergency savings.' },
    monthly_contribution: { type: 'number', minimum: 0, default: 0, description: 'Amount added to the fund each month.' },
    dependents: { type: 'integer', minimum: 0, maximum: 20, default: 0, description: 'Number of dependents (adds up to +3 months).' },
    job_stability: { type: 'string', enum: ['stable', 'variable', 'unstable'], default: 'stable', description: 'Drives the base target: stable 3, variable 6, unstable 9 months.' },
    target_months: { type: 'integer', minimum: 1, maximum: 24, description: 'Optional override of the recommended target months.' },
  },
};

const schemas = {
  EnvelopeOk,
  FundCore,
  _FinanceTail: FinanceTail,
  FundRequest,
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
  CalculateResponse: {
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/FundCore' }, { $ref: '#/components/schemas/_FinanceTail' }],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/FundCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_FinanceTail' },
    ],
    unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = { monthly_expenses: 4200, current_savings: 6000, monthly_contribution: 500, dependents: 2, job_stability: 'variable' };

const CORE_EXAMPLE = {
  recommended_target_months: 8, recommended_target_amount: 33600, current_coverage_months: 1.4,
  funded_percent: 17.9, gap: 27600, monthly_contribution: 500, months_to_goal: 56, status: 'underfunded',
};

const TAIL_EXAMPLE = {
  confidence_score: 1.0,
  recommended_actions_priority_order: [
    'Save 27600 more to hit your 8-month target; at 500/mo that takes 56 month(s).',
    'Keep emergency savings in a liquid, separate high-yield account, not invested in volatile assets.',
  ],
  chain_to: [
    { api: 'financial-health-checker', reason: 'See how emergency-fund coverage rolls into your overall financial health score.' },
    { api: 'personal-finance-agent', reason: 'Get a full prioritized plan across savings, debt, and refinancing in one call.' },
  ],
  financial_disclaimer: 'This result is an informational, deterministic calculation… not financial advice.',
  privacy: { data_stored: false, retention: 'none' },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/calculate', summary: 'Target, coverage, gap, and time-to-goal',
    operationId: 'calculate', priceUsdc: 0.005,
    requestSchemaRef: 'FundRequest', responseSchemaRef: 'CalculateResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'ef1-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL emergency-fund analysis + reasoning + actions',
    operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'FundRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'ef2-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      reasoning: {
        why_result_generated: 'Recommended 8 months based on variable income and 2 dependent(s), then measured current savings against 33600.',
        key_factors: ['Status: underfunded (1.4 month(s) of coverage now).', 'Target: 8 months = 33600.', 'Gap of 27600, ~56 month(s) to close at 500/mo.'],
        invalidators: ['A change in monthly_expenses shifts both the target and current coverage.', 'Job loss or a new dependent raises the recommended number of months.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'emergency-fund-calculator',
  title: 'Emergency Fund Calculator API',
  version: '1.0.0',
  description: 'Deterministic emergency-fund planning: a recommended target (months scaled by job stability and dependents), current coverage in months, funded percent, the dollar gap, and time-to-goal at a given monthly contribution — all in real arithmetic, never estimated. The one-call /lookup adds reasoning and prioritized actions. Carries a financial disclaimer on every response.',
  endpoints,
  schemas,
  infoExtensions: { 'x-finance': true },
});

export default specRouter(spec);
