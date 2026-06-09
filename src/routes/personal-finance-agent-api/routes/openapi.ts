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

const HealthRatios = {
  type: 'object',
  required: ['savings_rate', 'debt_to_income', 'expense_ratio', 'emergency_fund_months', 'net_worth'],
  additionalProperties: false,
  properties: {
    savings_rate: { type: 'number' },
    debt_to_income: { type: 'number' },
    expense_ratio: { type: 'number' },
    emergency_fund_months: { type: ['number', 'null'] },
    net_worth: { type: 'number' },
  },
};

const HealthComponentScores = {
  type: 'object',
  required: ['savings', 'debt', 'emergency', 'solvency'],
  additionalProperties: false,
  properties: {
    savings: { type: 'integer', minimum: 0, maximum: 100 },
    debt: { type: 'integer', minimum: 0, maximum: 100 },
    emergency: { type: 'integer', minimum: 0, maximum: 100 },
    solvency: { type: 'integer', minimum: 0, maximum: 100 },
  },
};

const HealthSummary = {
  type: 'object',
  required: ['health_score', 'grade', 'component_scores', 'ratios'],
  additionalProperties: false,
  properties: {
    health_score: { type: 'integer', minimum: 0, maximum: 100 },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    component_scores: { $ref: '#/components/schemas/HealthComponentScores' },
    ratios: { $ref: '#/components/schemas/HealthRatios' },
  },
};

const EmergencyFundSummary = {
  type: 'object',
  required: ['status', 'recommended_target_months', 'current_coverage_months', 'gap', 'months_to_goal'],
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['fully_funded', 'adequate', 'underfunded', 'critical'] },
    recommended_target_months: { type: 'integer' },
    current_coverage_months: { type: ['number', 'null'] },
    gap: { type: 'number', minimum: 0 },
    months_to_goal: { type: ['integer', 'null'] },
  },
};

const RefinanceSummary = {
  type: 'object',
  required: ['worth_it', 'monthly_savings', 'break_even_months', 'lifetime_savings'],
  additionalProperties: false,
  properties: {
    worth_it: { type: 'boolean' },
    monthly_savings: { type: 'number' },
    break_even_months: { type: ['integer', 'null'] },
    lifetime_savings: { type: 'number' },
  },
};

const ActionItem = {
  type: 'object',
  required: ['priority', 'area', 'recommendation'],
  additionalProperties: false,
  properties: {
    priority: { type: 'integer', minimum: 1 },
    area: { type: 'string', enum: ['emergency_fund', 'debt', 'refinance', 'savings', 'net_worth', 'maintain'] },
    recommendation: { type: 'string' },
  },
};

const LoanRequest = {
  type: 'object',
  required: ['current_balance', 'current_rate', 'current_remaining_months', 'new_rate', 'new_term_months'],
  additionalProperties: false,
  properties: {
    current_balance: { type: 'number', exclusiveMinimum: 0 },
    current_rate: { type: 'number', minimum: 0, maximum: 100 },
    current_remaining_months: { type: 'integer', minimum: 1, maximum: 600 },
    new_rate: { type: 'number', minimum: 0, maximum: 100 },
    new_term_months: { type: 'integer', minimum: 1, maximum: 600 },
    closing_costs: { type: 'number', minimum: 0, default: 0 },
    cash_out: { type: 'number', minimum: 0, default: 0 },
  },
};

const ProfileRequest = {
  type: 'object',
  required: ['monthly_income', 'monthly_expenses'],
  additionalProperties: false,
  properties: {
    monthly_income: { type: 'number', exclusiveMinimum: 0, description: 'Monthly take-home (net) income.' },
    monthly_expenses: { type: 'number', exclusiveMinimum: 0, description: 'Total monthly spending including housing.' },
    monthly_debt_payments: { type: 'number', minimum: 0, default: 0 },
    monthly_savings: { type: 'number', minimum: 0, default: 0, description: 'Saved/invested per month (also used as the emergency-fund contribution).' },
    liquid_savings: { type: 'number', minimum: 0, default: 0, description: 'Current liquid emergency savings.' },
    total_assets: { type: 'number', minimum: 0, default: 0 },
    total_liabilities: { type: 'number', minimum: 0, default: 0 },
    dependents: { type: 'integer', minimum: 0, maximum: 20, default: 0 },
    job_stability: { type: 'string', enum: ['stable', 'variable', 'unstable'], default: 'stable' },
    loan: { $ref: '#/components/schemas/LoanRequest', description: 'Optional loan to evaluate for refinancing.' },
  },
};

const LookupCore = {
  type: 'object',
  required: ['overall_health_score', 'grade', 'risk_level', 'top_priority', 'health_summary', 'emergency_fund_summary', 'refinance_summary', 'action_plan', 'reasoning'],
  properties: {
    overall_health_score: { type: 'integer', minimum: 0, maximum: 100 },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    risk_level: { type: 'string', enum: ['low', 'moderate', 'high'] },
    top_priority: { type: 'string' },
    health_summary: { $ref: '#/components/schemas/HealthSummary' },
    emergency_fund_summary: { $ref: '#/components/schemas/EmergencyFundSummary' },
    refinance_summary: { anyOf: [{ $ref: '#/components/schemas/RefinanceSummary' }, { type: 'null' }], description: 'null when no loan was supplied.' },
    action_plan: { type: 'array', items: { $ref: '#/components/schemas/ActionItem' } },
    reasoning: { $ref: '#/components/schemas/Reasoning' },
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

const schemas = {
  EnvelopeOk,
  HealthRatios,
  HealthComponentScores,
  HealthSummary,
  EmergencyFundSummary,
  RefinanceSummary,
  ActionItem,
  LoanRequest,
  ProfileRequest,
  LookupCore,
  _FinanceTail: FinanceTail,
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
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/LookupCore' },
      { $ref: '#/components/schemas/_FinanceTail' },
    ],
    unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = {
  monthly_income: 6500, monthly_expenses: 4200, monthly_debt_payments: 1500, monthly_savings: 800,
  liquid_savings: 12000, total_assets: 95000, total_liabilities: 240000, dependents: 2, job_stability: 'variable',
  loan: { current_balance: 280000, current_rate: 7.25, current_remaining_months: 324, new_rate: 6.0, new_term_months: 360, closing_costs: 4500 },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL full financial profile → health + emergency fund + refinance + prioritized plan',
    operationId: 'lookup', priceUsdc: 0.04, oneCall: true, humanApprovalRequired: true,
    requestSchemaRef: 'ProfileRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'pfa-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0,
      overall_health_score: 51, grade: 'D', risk_level: 'moderate', top_priority: 'debt',
      health_summary: {
        health_score: 51, grade: 'D',
        component_scores: { savings: 62, debt: 71, emergency: 48, solvency: 0 },
        ratios: { savings_rate: 0.1231, debt_to_income: 0.2308, expense_ratio: 0.6462, emergency_fund_months: 2.9, net_worth: -145000 },
      },
      emergency_fund_summary: { status: 'underfunded', recommended_target_months: 8, current_coverage_months: 2.9, gap: 21600, months_to_goal: 27 },
      refinance_summary: { worth_it: true, monthly_savings: 300.56, break_even_months: 15, lifetime_savings: 37443.84 },
      action_plan: [
        { priority: 1, area: 'refinance', recommendation: 'Refinance to save 300.56/mo (break-even 15 month(s)) and redirect the savings to your top priority.' },
        { priority: 2, area: 'emergency_fund', recommendation: 'Continue funding toward 8 months (gap 21600, ~27 month(s)).' },
        { priority: 3, area: 'savings', recommendation: 'Raise your savings rate (now 12%) toward 20% via automatic transfers.' },
        { priority: 4, area: 'net_worth', recommendation: 'Grow net worth by paying down liabilities faster than new ones accrue.' },
      ],
      reasoning: {
        why_result_generated: 'Composed a financial-health score (51/100), an emergency-fund check (underfunded), and a refinance analysis into a 4-step plan ordered by impact.',
        key_factors: ['Top priority: refinance.', 'Health grade D (risk moderate); weakest component solvency.', 'Emergency fund: underfunded, 2.9/8 months.', 'Refinance worthwhile (300.56/mo).'],
        invalidators: ['Income is treated as monthly take-home; gross income changes the ratios.', 'Omitting a debt, asset, or the loan block changes the plan ordering.'],
      },
      confidence_score: 1.0,
      recommended_actions_priority_order: [
        'Refinance to save 300.56/mo (break-even 15 month(s)) and redirect the savings to your top priority.',
        'Continue funding toward 8 months (gap 21600, ~27 month(s)).',
      ],
      chain_to: [
        { api: 'financial-health-checker', reason: 'Full health-score breakdown and component sub-scores.' },
        { api: 'emergency-fund-calculator', reason: 'Detailed emergency-fund target and time-to-goal.' },
        { api: 'refinance-calculator', reason: 'Full refinance numbers and rate sensitivity.' },
        { api: 'mortgage-refinance', reason: 'Mortgage-specific refinance (LTV, PMI, points) if the loan is a mortgage.' },
      ],
      financial_disclaimer: 'This result is an informational, deterministic calculation… not financial advice.',
      privacy: { data_stored: false, retention: 'none' },
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'personal-finance-agent',
  title: 'Personal Finance Agent API',
  version: '1.0.0',
  description: 'One-call personal-finance planner for agents. Takes a full financial profile and composes three deterministic analyses — a financial-health score, an emergency-fund check, and (when a loan is supplied) a refinance evaluation — into a single prioritized action plan with reasoning. All real arithmetic, never estimated. Carries a financial disclaimer and a human-approval flag because the plan informs debt, savings, and refinancing decisions.',
  endpoints,
  schemas,
  infoExtensions: { 'x-finance': true, 'x-human-approval-required': true },
});

export default specRouter(spec);
