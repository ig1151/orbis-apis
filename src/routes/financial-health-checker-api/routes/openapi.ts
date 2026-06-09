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
    savings_rate: { type: 'number', description: 'monthly_savings ÷ monthly_income (fraction).' },
    debt_to_income: { type: 'number', description: 'monthly_debt_payments ÷ monthly_income (fraction).' },
    expense_ratio: { type: 'number', description: 'monthly_expenses ÷ monthly_income (fraction).' },
    emergency_fund_months: { type: ['number', 'null'], description: 'liquid_savings ÷ monthly_expenses; null if expenses are 0.' },
    net_worth: { type: 'number', description: 'total_assets − total_liabilities.' },
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

const HealthCore = {
  type: 'object',
  required: ['ratios', 'component_scores', 'health_score', 'grade', 'risk_level', 'weakest_component'],
  properties: {
    ratios: { $ref: '#/components/schemas/HealthRatios' },
    component_scores: { $ref: '#/components/schemas/HealthComponentScores' },
    health_score: { type: 'integer', minimum: 0, maximum: 100, description: 'Weighted: savings 30%, debt 30%, emergency 25%, solvency 15%.' },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    risk_level: { type: 'string', enum: ['low', 'moderate', 'high'] },
    weakest_component: { type: 'string', enum: ['savings', 'debt', 'emergency', 'solvency'], description: 'Lowest-scoring component — the highest-leverage area to improve. Useful for agent routing.' },
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

const HealthRequest = {
  type: 'object',
  required: ['monthly_income'],
  additionalProperties: false,
  properties: {
    monthly_income: { type: 'number', exclusiveMinimum: 0, description: 'Monthly take-home (net) income.' },
    monthly_expenses: { type: 'number', minimum: 0, default: 0, description: 'Total monthly spending including housing.' },
    monthly_debt_payments: { type: 'number', minimum: 0, default: 0, description: 'Total required monthly debt payments (mortgage, loans, card minimums).' },
    monthly_savings: { type: 'number', minimum: 0, default: 0, description: 'Amount saved or invested each month.' },
    liquid_savings: { type: 'number', minimum: 0, default: 0, description: 'Current liquid emergency savings.' },
    total_assets: { type: 'number', minimum: 0, default: 0 },
    total_liabilities: { type: 'number', minimum: 0, default: 0 },
  },
};

const schemas = {
  EnvelopeOk,
  HealthRatios,
  HealthComponentScores,
  HealthCore,
  _FinanceTail: FinanceTail,
  HealthRequest,
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
  ScoreResponse: {
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HealthCore' }, { $ref: '#/components/schemas/_FinanceTail' }],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/HealthCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_FinanceTail' },
    ],
    unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = {
  monthly_income: 6500, monthly_expenses: 4200, monthly_debt_payments: 1500,
  monthly_savings: 800, liquid_savings: 12000, total_assets: 95000, total_liabilities: 240000,
};

const CORE_EXAMPLE = {
  ratios: { savings_rate: 0.1231, debt_to_income: 0.2308, expense_ratio: 0.6462, emergency_fund_months: 2.9, net_worth: -145000 },
  component_scores: { savings: 62, debt: 71, emergency: 48, solvency: 0 },
  health_score: 51, grade: 'D', risk_level: 'moderate', weakest_component: 'solvency',
};

const TAIL_EXAMPLE = {
  confidence_score: 1.0,
  recommended_actions_priority_order: [
    'Improve net worth (now -145000) by paying down liabilities and growing assets.',
    'Build emergency coverage (now 2.9 months) toward 3–6 months of expenses.',
    'Raise your savings rate (now 12%) toward 20% by automating transfers on payday.',
  ],
  chain_to: [
    { api: 'emergency-fund-calculator', reason: 'Drill into the emergency-fund target and time-to-goal.' },
    { api: 'refinance-calculator', reason: 'If debt-to-income is high, test whether refinancing lowers payments.' },
    { api: 'personal-finance-agent', reason: 'Get a full prioritized plan across savings, debt, and refinancing in one call.' },
  ],
  financial_disclaimer: 'This result is an informational, deterministic calculation… not financial advice.',
  privacy: { data_stored: false, retention: 'none' },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/score', summary: 'Core ratios + weighted health score + grade',
    operationId: 'scoreHealth', priceUsdc: 0.01, humanApprovalRequired: true,
    requestSchemaRef: 'HealthRequest', responseSchemaRef: 'ScoreResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'fh1-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL health check + reasoning + prioritized actions',
    operationId: 'lookup', priceUsdc: 0.02, oneCall: true, humanApprovalRequired: true,
    requestSchemaRef: 'HealthRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'fh2-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      reasoning: {
        why_result_generated: 'Scored four weighted components — savings rate (30%), debt-to-income (30%), emergency coverage (25%), solvency (15%) — for a 51/100 (grade D).',
        key_factors: ['Savings rate 12% → 62/100.', 'Debt-to-income 23% → 71/100.', 'Emergency coverage 2.9 months → 48/100.', 'Solvency (net worth -145000) → 0/100.'],
        invalidators: ['Income is treated as monthly take-home; using gross income changes the ratios.', 'Excluding a debt or asset shifts debt-to-income and solvency.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'financial-health-checker',
  title: 'Financial Health Checker API',
  version: '1.0.0',
  description: 'Deterministic personal financial-health score (0–100) and letter grade from four weighted components — savings rate, debt-to-income, emergency-fund coverage, and solvency — each returned as a sub-score alongside the underlying ratios. The one-call /lookup adds reasoning and actions prioritized by the weakest component. Real arithmetic, never estimated; carries a financial disclaimer on every response.',
  endpoints,
  schemas,
  infoExtensions: { 'x-finance': true, 'x-human-approval-required': true },
});

export default specRouter(spec);
