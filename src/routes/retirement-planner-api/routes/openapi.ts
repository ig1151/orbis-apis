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

const RetCore = {
  type: 'object',
  required: [
    'years_to_retirement', 'months_to_retirement', 'total_contributions', 'projected_balance',
    'projected_balance_todays_dollars', 'investment_growth', 'sustainable_annual_income_todays_dollars',
    'nest_egg_target_todays_dollars', 'surplus_or_gap_todays_dollars', 'income_replacement_ratio', 'on_track',
  ],
  properties: {
    years_to_retirement: { type: 'number' },
    months_to_retirement: { type: 'integer' },
    total_contributions: { type: 'number', description: 'monthly_contribution × months_to_retirement.' },
    projected_balance: { type: 'number', description: 'Nominal balance at retirement.' },
    projected_balance_todays_dollars: { type: 'number', description: 'Inflation-adjusted (today\'s dollars) balance.' },
    investment_growth: { type: 'number', description: 'projected_balance − current_savings − total_contributions.' },
    sustainable_annual_income_todays_dollars: { type: 'number', description: '4% of the real balance.' },
    nest_egg_target_todays_dollars: { type: ['number', 'null'], description: 'desired_annual_retirement_income / 0.04; null if no target income supplied.' },
    surplus_or_gap_todays_dollars: { type: ['number', 'null'], description: 'real balance − nest_egg_target; null if no target.' },
    income_replacement_ratio: { type: ['number', 'null'], description: 'sustainable income / current_annual_income; null if income not supplied.' },
    on_track: { type: ['boolean', 'null'], description: 'Whether the real balance meets the nest-egg target; null if no target.' },
  },
};

const RetSensitivityRow = {
  type: 'object', required: ['annual_return_pct', 'projected_balance', 'projected_balance_todays_dollars'], additionalProperties: false,
  properties: {
    annual_return_pct: { type: 'number' },
    projected_balance: { type: 'number' },
    projected_balance_todays_dollars: { type: 'number' },
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

const RetirementRequest = {
  type: 'object', required: ['current_age', 'retirement_age'], additionalProperties: false,
  properties: {
    current_age: { type: 'number', minimum: 0, maximum: 110 },
    retirement_age: { type: 'number', minimum: 0, maximum: 110, description: 'Must be ≥ current_age; equal means retiring now (years/months_to_retirement = 0, projected = current balance).' },
    current_savings: { type: 'number', minimum: 0, default: 0 },
    monthly_contribution: { type: 'number', minimum: 0, default: 0 },
    annual_return_pct: { type: 'number', minimum: -20, maximum: 30, default: 7 },
    inflation_pct: { type: 'number', minimum: 0, maximum: 20, default: 3 },
    desired_annual_retirement_income: { type: 'number', minimum: 0, description: 'Target annual income in today\'s dollars; enables nest-egg sizing.' },
    current_annual_income: { type: 'number', exclusiveMinimum: 0, description: 'Enables the income-replacement ratio.' },
  },
};

const REQ_EXAMPLE = {
  current_age: 35, retirement_age: 65, current_savings: 50000, monthly_contribution: 1000,
  annual_return_pct: 7, inflation_pct: 3, desired_annual_retirement_income: 60000, current_annual_income: 90000,
};

const CORE_EXAMPLE = {
  years_to_retirement: 30, months_to_retirement: 360, total_contributions: 360000,
  projected_balance: 1625795.87, projected_balance_todays_dollars: 839819.07, investment_growth: 1215795.87,
  sustainable_annual_income_todays_dollars: 33592.76, nest_egg_target_todays_dollars: 1500000,
  surplus_or_gap_todays_dollars: -660180.93, income_replacement_ratio: 0.373, on_track: false,
};

const TAIL_EXAMPLE = {
  confidence_score: 1,
  confidence_per_section: { projection: 1, nest_egg_analysis: 1, sensitivity_analysis: 1 },
  execution_metadata: { model: 'deterministic', automation_safe: true },
  recommended_actions_priority_order: [
    "Gap of 660180.93 (today's dollars) to your target. Increase monthly contributions to about 1971.12, retire later, or adjust the target income.",
    'Maximize tax-advantaged accounts (401k/IRA) and any employer match before taxable investing.',
    'This replaces about 37% of your current income; 70–80% is a common target.',
  ],
  chain_to: [
    { api: 'savings-goal-optimizer', reason: 'Plan the monthly contribution needed to close any retirement gap.' },
    { api: 'net-worth-tracker', reason: 'Track current assets and liabilities feeding the retirement balance.' },
    { api: 'personal-finance-agent', reason: 'Combine retirement, savings, and budget into one prioritized plan.' },
  ],
  financial_disclaimer: 'This result is an informational, deterministic calculation… not financial advice.',
  privacy: { data_stored: false, retention: 'none' },
};

const schemas = {
  EnvelopeOk,
  RetCore,
  RetSensitivityRow,
  ExecutionMetadata,
  ConfidencePerSection,
  _FinanceTail: FinanceTail,
  RetirementRequest,
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
  ProjectResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/RetCore' },
      { $ref: '#/components/schemas/_FinanceTail' },
    ],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/RetCore' },
      {
        type: 'object',
        required: ['required_monthly_contribution_for_target', 'assumptions', 'sensitivity_analysis', 'reasoning'],
        properties: {
          required_monthly_contribution_for_target: { type: ['number', 'null'], description: 'Monthly contribution that would exactly hit the target; null if no target income supplied.' },
          assumptions: { type: 'array', items: { type: 'string' } },
          sensitivity_analysis: { type: 'array', items: { $ref: '#/components/schemas/RetSensitivityRow' }, description: 'Projected balance across annual return ± 2%.' },
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
    method: 'post', path: '/project', summary: 'Project retirement balance, sustainable income, and target gap',
    operationId: 'project', priceUsdc: 0.01, humanApprovalRequired: true,
    requestSchemaRef: 'RetirementRequest', responseSchemaRef: 'ProjectResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'ret1-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL projection + reasoning + return sensitivity',
    operationId: 'lookup', priceUsdc: 0.025, oneCall: true, humanApprovalRequired: true,
    requestSchemaRef: 'RetirementRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'ret2-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      required_monthly_contribution_for_target: 1971.12,
      assumptions: [
        'A constant 7% nominal annual return, compounded monthly, until retirement.',
        "Today's-dollar figures discount by 3% annual inflation.",
      ],
      sensitivity_analysis: [
        { annual_return_pct: 5, projected_balance: 1055645.85, projected_balance_todays_dollars: 577526.14 },
        { annual_return_pct: 7, projected_balance: 1625795.87, projected_balance_todays_dollars: 839819.07 },
        { annual_return_pct: 9, projected_balance: 2567272.29, projected_balance_todays_dollars: 1257406.56 },
      ],
      reasoning: {
        why_result_generated: 'Compounded 50000 plus 1000/mo at 7% for 360 month(s), then discounted by 3% inflation and applied the 4% rule.',
        key_factors: ['30 year(s) of growth: 360000 contributed, 1215795.87 from compounding.', 'Projected 1625795.87 nominal / 839819.07 in today\'s dollars → ~33592.76/yr sustainable income.', 'Short of target by 660180.93.'],
        invalidators: ['Actual returns vary year to year; sequence-of-returns risk near retirement matters.', 'Higher inflation than entered erodes purchasing power and the real balance.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'retirement-planner',
  title: 'Retirement Planner API',
  version: '1.0.0',
  description: 'Deterministic retirement projection. Compounds current savings + monthly contributions to the retirement date, reports the balance in nominal and inflation-adjusted (today\'s) dollars, derives sustainable income via the 4% rule, and sizes any nest-egg gap when a target income is supplied. Includes a financial disclaimer and human-approval flag because results inform long-term financial decisions.',
  endpoints,
  schemas,
  infoExtensions: { 'x-finance': true, 'x-human-approval-required': true },
});

export default specRouter(spec);
