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

const AssetBreakdownItem = {
  type: 'object', required: ['name', 'type', 'value', 'pct_of_assets'], additionalProperties: false,
  properties: { name: { type: 'string' }, type: { type: 'string' }, value: { type: 'number' }, pct_of_assets: { type: 'number' } },
};

const LiabilityBreakdownItem = {
  type: 'object', required: ['name', 'type', 'balance', 'pct_of_liabilities'], additionalProperties: false,
  properties: { name: { type: 'string' }, type: { type: 'string' }, balance: { type: 'number' }, pct_of_liabilities: { type: 'number' } },
};

const NetWorthCore = {
  type: 'object',
  required: [
    'total_assets', 'total_liabilities', 'net_worth', 'liquid_assets', 'debt_to_asset_ratio', 'solvent',
    'asset_breakdown', 'liability_breakdown', 'expected_net_worth_target', 'net_worth_vs_target_ratio', 'prosperity_tier',
  ],
  properties: {
    total_assets: { type: 'number' },
    total_liabilities: { type: 'number' },
    net_worth: { type: 'number', description: 'total_assets − total_liabilities.' },
    liquid_assets: { type: ['number', 'null'], description: 'Sum of assets typed "liquid" or "investment"; null if no per-asset types supplied.' },
    debt_to_asset_ratio: { type: ['number', 'null'], description: 'total_liabilities / total_assets; null if no assets.' },
    solvent: { type: 'boolean', description: 'net_worth ≥ 0.' },
    asset_breakdown: { type: 'array', items: { $ref: '#/components/schemas/AssetBreakdownItem' } },
    liability_breakdown: { type: 'array', items: { $ref: '#/components/schemas/LiabilityBreakdownItem' } },
    expected_net_worth_target: { type: ['number', 'null'], description: 'age × annual_income / 10 (Stanley & Danko); null unless both supplied.' },
    net_worth_vs_target_ratio: { type: ['number', 'null'] },
    prosperity_tier: { type: ['string', 'null'], enum: ['under_accumulator', 'average_accumulator', 'prodigious_accumulator', null] },
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

const AssetEntry = {
  type: 'object', required: ['value'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    value: { type: 'number', minimum: 0 },
    type: { type: 'string', description: 'e.g. liquid, investment, retirement, real_estate, personal, other.' },
  },
};
const LiabilityEntry = {
  type: 'object', required: ['balance'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    balance: { type: 'number', minimum: 0 },
    type: { type: 'string', description: 'e.g. mortgage, auto, student, credit_card, other.' },
  },
};

const NetWorthRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    assets: { type: 'array', maxItems: 200, items: { $ref: '#/components/schemas/AssetEntry' } },
    liabilities: { type: 'array', maxItems: 200, items: { $ref: '#/components/schemas/LiabilityEntry' } },
    total_assets: { type: 'number', minimum: 0, description: 'Use instead of the assets array.' },
    total_liabilities: { type: 'number', minimum: 0, default: 0, description: 'Use instead of the liabilities array.' },
    age: { type: 'number', minimum: 18, maximum: 110, description: 'Enables the wealth benchmark (with annual_income).' },
    annual_income: { type: 'number', exclusiveMinimum: 0, description: 'Pretax annual income for the benchmark.' },
  },
  description: 'Provide an "assets" array or "total_assets"; liabilities are optional. Supply age + annual_income for the benchmark.',
};

const REQ_EXAMPLE = {
  assets: [
    { name: 'Checking', value: 12000, type: 'liquid' },
    { name: 'Brokerage', value: 65000, type: 'investment' },
    { name: '401k', value: 140000, type: 'retirement' },
    { name: 'Home', value: 420000, type: 'real_estate' },
  ],
  liabilities: [
    { name: 'Mortgage', balance: 310000, type: 'mortgage' },
    { name: 'Auto Loan', balance: 14000, type: 'auto' },
  ],
  age: 40, annual_income: 95000,
};

const CORE_EXAMPLE = {
  total_assets: 637000, total_liabilities: 324000, net_worth: 313000, liquid_assets: 77000,
  debt_to_asset_ratio: 0.5086, solvent: true,
  asset_breakdown: [
    { name: 'Checking', type: 'liquid', value: 12000, pct_of_assets: 1.9 },
    { name: 'Brokerage', type: 'investment', value: 65000, pct_of_assets: 10.2 },
    { name: '401k', type: 'retirement', value: 140000, pct_of_assets: 22 },
    { name: 'Home', type: 'real_estate', value: 420000, pct_of_assets: 65.9 },
  ],
  liability_breakdown: [
    { name: 'Mortgage', type: 'mortgage', balance: 310000, pct_of_liabilities: 95.7 },
    { name: 'Auto Loan', type: 'auto', balance: 14000, pct_of_liabilities: 4.3 },
  ],
  expected_net_worth_target: 380000, net_worth_vs_target_ratio: 0.824, prosperity_tier: 'average_accumulator',
};

const TAIL_EXAMPLE = {
  confidence_score: 1,
  recommended_actions_priority_order: [
    'Net worth is 313000 with a debt-to-asset ratio of 0.5086.',
    'Re-run monthly to track the trend; net worth direction matters more than any single snapshot.',
  ],
  chain_to: [
    { api: 'debt-payoff-planner', reason: 'Build a payoff plan for the liabilities reducing your net worth.' },
    { api: 'retirement-planner', reason: 'Project how current assets grow toward retirement.' },
    { api: 'financial-health-checker', reason: 'Combine net worth with income and DTI for an overall score.' },
  ],
  financial_disclaimer: 'This result is an informational, deterministic calculation… not financial advice.',
  privacy: { data_stored: false, retention: 'none' },
};

const schemas = {
  EnvelopeOk,
  AssetBreakdownItem,
  LiabilityBreakdownItem,
  NetWorthCore,
  _FinanceTail: FinanceTail,
  AssetEntry,
  LiabilityEntry,
  NetWorthRequest,
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
      { $ref: '#/components/schemas/NetWorthCore' },
      { $ref: '#/components/schemas/_FinanceTail' },
    ],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/NetWorthCore' },
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
    method: 'post', path: '/calculate', summary: 'Compute net worth, ratios, and breakdowns',
    operationId: 'calculate', priceUsdc: 0.008,
    requestSchemaRef: 'NetWorthRequest', responseSchemaRef: 'CalculateResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'net1-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL net worth + reasoning + benchmark',
    operationId: 'lookup', priceUsdc: 0.015, oneCall: true,
    requestSchemaRef: 'NetWorthRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'net2-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      assumptions: [
        'Values are current market/face values you supplied at a single point in time.',
        'Liquid assets count only entries typed "liquid" or "investment"; retirement and real estate are treated as illiquid.',
      ],
      reasoning: {
        why_result_generated: 'Subtracted 324000 in liabilities from 637000 in assets for a net worth of 313000.',
        key_factors: ['Debt-to-asset ratio: 0.5086 (lower is stronger).', 'Liquid assets: 77000.', 'Benchmark: 0.824× the 380000 target → average_accumulator.'],
        invalidators: ['Stale or estimated asset values change net worth materially.', 'Illiquid assets (home, retirement) cannot cover near-term obligations despite raising net worth.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'net-worth-tracker',
  title: 'Net Worth Tracker API',
  version: '1.0.0',
  description: 'Deterministic net-worth calculator. Sums assets and liabilities, computes net worth and the debt-to-asset ratio, breaks down each side by type, and benchmarks against the age×income/10 wealth target when age and income are supplied — pure arithmetic, never estimated.',
  endpoints,
  schemas,
  infoExtensions: { 'x-finance': true },
});

export default specRouter(spec);
