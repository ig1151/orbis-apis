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

const Variance = {
  type: 'object', required: ['needs', 'wants', 'savings'], additionalProperties: false,
  properties: { needs: { type: 'number' }, wants: { type: 'number' }, savings: { type: 'number' } },
};

const CategoryBreakdownItem = {
  type: 'object', required: ['category', 'classification', 'amount', 'pct_of_income'], additionalProperties: false,
  properties: {
    category: { type: 'string' },
    classification: { type: 'string', enum: ['need', 'want', 'savings'] },
    amount: { type: 'number' },
    pct_of_income: { type: 'number' },
  },
};

const BudgetCore = {
  type: 'object',
  required: [
    'monthly_income', 'total_needs', 'total_wants', 'total_savings', 'total_allocated', 'unallocated',
    'needs_pct', 'wants_pct', 'savings_pct', 'recommended_needs', 'recommended_wants', 'recommended_savings',
    'variance', 'savings_rate', 'status', 'category_breakdown',
  ],
  properties: {
    monthly_income: { type: 'number' },
    total_needs: { type: 'number' },
    total_wants: { type: 'number' },
    total_savings: { type: 'number' },
    total_allocated: { type: 'number' },
    unallocated: { type: 'number', description: 'monthly_income − total_allocated (negative means overspending).' },
    needs_pct: { type: 'number' },
    wants_pct: { type: 'number' },
    savings_pct: { type: 'number' },
    recommended_needs: { type: 'number', description: '50% of income.' },
    recommended_wants: { type: 'number', description: '30% of income.' },
    recommended_savings: { type: 'number', description: '20% of income.' },
    variance: { $ref: '#/components/schemas/Variance' },
    savings_rate: { type: 'number', description: 'total_savings / income (fraction).' },
    status: { type: 'string', enum: ['overspending', 'balanced', 'surplus'] },
    category_breakdown: { type: 'array', items: { $ref: '#/components/schemas/CategoryBreakdownItem' }, description: 'Per-line breakdown when an expenses array was supplied; empty when totals were supplied.' },
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

const ExpenseItem = {
  type: 'object', required: ['amount', 'classification'], additionalProperties: false,
  properties: {
    category: { type: 'string', description: 'Optional label; defaults to item_N.' },
    amount: { type: 'number', minimum: 0 },
    classification: { type: 'string', enum: ['need', 'want', 'savings'] },
  },
};

const BudgetRequest = {
  type: 'object', required: ['monthly_income'], additionalProperties: false,
  properties: {
    monthly_income: { type: 'number', exclusiveMinimum: 0, description: 'After-tax monthly income.' },
    expenses: { type: 'array', maxItems: 200, items: { $ref: '#/components/schemas/ExpenseItem' }, description: 'Itemized expenses; takes precedence over the needs/wants/savings totals.' },
    needs: { type: 'number', minimum: 0, description: 'Total needs (used when expenses is omitted).' },
    wants: { type: 'number', minimum: 0, description: 'Total wants (used when expenses is omitted).' },
    savings: { type: 'number', minimum: 0, default: 0, description: 'Total savings (used when expenses is omitted).' },
  },
  description: 'Provide an "expenses" array, or the "needs" and "wants" totals (with optional "savings").',
};

const REQ_EXAMPLE = {
  monthly_income: 6000,
  expenses: [
    { category: 'Rent', amount: 1900, classification: 'need' },
    { category: 'Groceries', amount: 600, classification: 'need' },
    { category: 'Utilities', amount: 300, classification: 'need' },
    { category: 'Dining Out', amount: 500, classification: 'want' },
    { category: 'Streaming', amount: 80, classification: 'want' },
    { category: '401k', amount: 900, classification: 'savings' },
  ],
};

const CORE_EXAMPLE = {
  monthly_income: 6000, total_needs: 2800, total_wants: 580, total_savings: 900, total_allocated: 4280,
  unallocated: 1720, needs_pct: 46.7, wants_pct: 9.7, savings_pct: 15,
  recommended_needs: 3000, recommended_wants: 1800, recommended_savings: 1200,
  variance: { needs: -200, wants: -1220, savings: -300 }, savings_rate: 0.15, status: 'surplus',
  category_breakdown: [
    { category: 'Rent', classification: 'need', amount: 1900, pct_of_income: 31.7 },
    { category: 'Groceries', classification: 'need', amount: 600, pct_of_income: 10 },
    { category: 'Utilities', classification: 'need', amount: 300, pct_of_income: 5 },
    { category: 'Dining Out', classification: 'want', amount: 500, pct_of_income: 8.3 },
    { category: 'Streaming', classification: 'want', amount: 80, pct_of_income: 1.3 },
    { category: '401k', classification: 'savings', amount: 900, pct_of_income: 15 },
  ],
};

const TAIL_EXAMPLE = {
  confidence_score: 1,
  recommended_actions_priority_order: [
    'You have 1720 unallocated each month — direct it to savings or debt payoff to lift your 15% savings rate toward 20%.',
    'Savings is 15% of income; aim for 20% (1200/mo) including retirement and emergency fund.',
  ],
  chain_to: [
    { api: 'savings-goal-optimizer', reason: 'Turn freed-up budget room into a funded savings goal.' },
    { api: 'debt-payoff-planner', reason: 'Apply any surplus to an avalanche/snowball debt plan.' },
    { api: 'emergency-fund-calculator', reason: 'Size the emergency fund your savings bucket should build first.' },
  ],
  financial_disclaimer: 'This result is an informational, deterministic calculation… not financial advice.',
  privacy: { data_stored: false, retention: 'none' },
};

const schemas = {
  EnvelopeOk,
  Variance,
  CategoryBreakdownItem,
  BudgetCore,
  _FinanceTail: FinanceTail,
  ExpenseItem,
  BudgetRequest,
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
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/BudgetCore' },
      { $ref: '#/components/schemas/_FinanceTail' },
    ],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/BudgetCore' },
      {
        type: 'object',
        required: ['assumptions', 'reasoning'],
        properties: {
          assumptions: { type: 'array', items: { type: 'string' } },
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
    method: 'post', path: '/analyze', summary: 'Bucket spending and compare to 50/30/20',
    operationId: 'analyze', priceUsdc: 0.008,
    requestSchemaRef: 'BudgetRequest', responseSchemaRef: 'AnalyzeResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'bud1-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL budget analysis + reasoning + recommendations',
    operationId: 'lookup', priceUsdc: 0.015, oneCall: true,
    requestSchemaRef: 'BudgetRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'bud2-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      assumptions: [
        'The 50/30/20 rule is a guideline applied to after-tax monthly income, not a hard rule.',
        'Savings includes intentional saving, investing, and extra debt principal — not minimum debt payments (those are needs).',
      ],
      reasoning: {
        why_result_generated: 'Summed 6 expense line(s) into needs/wants/savings and divided by 6000 income to compare against 50/30/20.',
        key_factors: ['Allocation: needs 46.7%, wants 9.7%, savings 15% (1720 unallocated).', 'Status: surplus.', 'Largest deviation from target: wants.'],
        invalidators: ['Misclassifying a need as a want (or vice versa) shifts the buckets.', 'Pre-tax vs after-tax income changes every percentage.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'budget-planner',
  title: 'Budget Planner API',
  version: '1.0.0',
  description: 'Deterministic 50/30/20 budget analyzer. Buckets monthly spending into needs/wants/savings (from an expense list or direct totals), compares it to the 50/30/20 rule, and reports the savings rate, per-bucket variance, and any overspending — pure arithmetic, never estimated.',
  endpoints,
  schemas,
  infoExtensions: { 'x-finance': true },
});

export default specRouter(spec);
