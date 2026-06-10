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

const SavingsCore = {
  type: 'object',
  required: [
    'mode', 'goal_amount', 'current_savings', 'amount_remaining', 'annual_return_pct', 'monthly_contribution',
    'months_to_goal', 'target_months', 'required_monthly_contribution', 'projected_balance_at_target',
    'surplus_or_shortfall_at_target', 'reaches_goal', 'invalid_reason', 'total_contributions', 'total_growth',
  ],
  properties: {
    mode: { type: 'string', enum: ['time_to_goal', 'required_contribution', 'projection'], description: 'Which calculation ran, based on the inputs supplied.' },
    goal_amount: { type: 'number' },
    current_savings: { type: 'number' },
    amount_remaining: { type: 'number' },
    annual_return_pct: { type: 'number' },
    monthly_contribution: { type: ['number', 'null'] },
    months_to_goal: { type: ['integer', 'null'] },
    target_months: { type: ['integer', 'null'] },
    required_monthly_contribution: { type: ['number', 'null'] },
    projected_balance_at_target: { type: ['number', 'null'] },
    surplus_or_shortfall_at_target: { type: ['number', 'null'] },
    reaches_goal: { type: ['boolean', 'null'] },
    invalid_reason: { type: ['string', 'null'], enum: ['goal_unreachable', null], description: 'Set to "goal_unreachable" when the contribution/return can never reach the goal; null otherwise.' },
    total_contributions: { type: ['number', 'null'] },
    total_growth: { type: ['number', 'null'] },
  },
};

// Strict, mode-specific rows: either a contribution→time row or a months→contribution row.
const SavingsSensitivityRow = {
  oneOf: [
    { type: 'object', required: ['monthly_contribution', 'months_to_goal'], additionalProperties: false, properties: { monthly_contribution: { type: 'number' }, months_to_goal: { type: ['integer', 'null'] } } },
    { type: 'object', required: ['target_months', 'required_monthly_contribution'], additionalProperties: false, properties: { target_months: { type: 'integer' }, required_monthly_contribution: { type: 'number' } } },
  ],
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

const SavingsRequest = {
  type: 'object', required: ['goal_amount'], additionalProperties: false,
  properties: {
    goal_amount: { type: 'number', exclusiveMinimum: 0 },
    current_savings: { type: 'number', minimum: 0, default: 0 },
    monthly_contribution: { type: 'number', minimum: 0, description: 'Supply to compute time-to-goal.' },
    target_months: { type: 'integer', minimum: 1, maximum: 1200, description: 'Supply to compute the required contribution.' },
    annual_return_pct: { type: 'number', minimum: -20, maximum: 30, default: 0 },
  },
  description: 'Provide monthly_contribution (time-to-goal), target_months (required contribution), or both (projection).',
};

const REQ_EXAMPLE = { goal_amount: 30000, current_savings: 5000, monthly_contribution: 800, annual_return_pct: 4 };

const CORE_EXAMPLE = {
  mode: 'time_to_goal', goal_amount: 30000, current_savings: 5000, amount_remaining: 25000, annual_return_pct: 4,
  monthly_contribution: 800, months_to_goal: 30, target_months: null, required_monthly_contribution: null,
  projected_balance_at_target: null, surplus_or_shortfall_at_target: null, reaches_goal: true, invalid_reason: null,
  total_contributions: 24000, total_growth: 1721.85,
};

const TAIL_EXAMPLE = {
  confidence_score: 1,
  confidence_per_section: { calculation: 1, sensitivity_analysis: 1 },
  recommended_actions_priority_order: [
    'At 800/mo you reach 30000 in 30 month(s).',
    'Automate the transfer on payday and hold the fund in a high-yield/insured account matched to your time horizon.',
  ],
  chain_to: [
    { api: 'budget-planner', reason: 'Find the monthly room to fund this savings contribution.' },
    { api: 'retirement-planner', reason: 'Roll long-horizon goals into a full retirement projection.' },
    { api: 'personal-finance-agent', reason: 'Sequence savings against debt payoff and other goals.' },
  ],
  financial_disclaimer: 'This result is an informational, deterministic calculation… not financial advice.',
  privacy: { data_stored: false, retention: 'none' },
  execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk,
  SavingsCore,
  SavingsSensitivityRow,
  ExecutionMetadata,
  ConfidencePerSection,
  _FinanceTail: FinanceTail,
  SavingsRequest,
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
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/SavingsCore' },
      { $ref: '#/components/schemas/_FinanceTail' },
    ],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/SavingsCore' },
      {
        type: 'object',
        required: ['assumptions', 'sensitivity_analysis', 'reasoning'],
        properties: {
          assumptions: { type: 'array', items: { type: 'string' } },
          sensitivity_analysis: { type: 'array', items: { $ref: '#/components/schemas/SavingsSensitivityRow' }, description: 'Varies the operative lever (contribution or target months).' },
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
    method: 'post', path: '/calculate', summary: 'Time-to-goal, required contribution, or projection',
    operationId: 'calculate', priceUsdc: 0.008,
    requestSchemaRef: 'SavingsRequest', responseSchemaRef: 'CalculateResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'sav1-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL plan + reasoning + sensitivity',
    operationId: 'lookup', priceUsdc: 0.015, oneCall: true,
    requestSchemaRef: 'SavingsRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'sav2-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      assumptions: [
        'Contributions are made at the end of each month and earn a constant 4% annual return, compounded monthly.',
        'No taxes, fees, or withdrawals are modeled; figures are in nominal dollars.',
      ],
      sensitivity_analysis: [
        { monthly_contribution: 700, months_to_goal: 34 },
        { monthly_contribution: 800, months_to_goal: 30 },
        { monthly_contribution: 900, months_to_goal: 27 },
      ],
      reasoning: {
        why_result_generated: 'Mode "time_to_goal": solved the compound-growth equation for 30000 starting from 5000 at 4% monthly-compounded.',
        key_factors: ['Amount still needed: 25000.', 'Reaches goal in 30 month(s) at 800/mo.', 'Of the total, 1721.85 comes from investment growth.'],
        invalidators: ['A different realized return changes both the time and the required contribution.', 'Missed or irregular contributions push the goal out.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'savings-goal-optimizer',
  title: 'Savings Goal Optimizer API',
  version: '1.0.0',
  description: 'Deterministic savings-goal planner. Computes time-to-goal from a contribution, the contribution required for a target date, or the projected balance and surplus/shortfall when both are supplied — all with real monthly compound-interest math (never estimated).',
  endpoints,
  schemas,
  infoExtensions: { 'x-finance': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
