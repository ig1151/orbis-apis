import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';

const EnvelopeOk = {
  type: 'object', required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean', enum: [true] }, latency_ms: { type: 'integer', minimum: 0 } },
};
const ExecutionMetadata = { type: 'object', required: ['model', 'automation_safe'], additionalProperties: false, properties: { model: { type: 'string', enum: ['deterministic'] }, automation_safe: { type: 'boolean' } } };
const ConfidencePerSection = { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 1 } };

const BuyBreakdown = {
  type: 'object', additionalProperties: false,
  required: ['down_payment', 'buy_closing_costs', 'total_mortgage_payments', 'total_property_tax', 'total_insurance', 'total_maintenance', 'home_value_at_end', 'remaining_mortgage_balance', 'selling_costs', 'net_sale_proceeds'],
  properties: {
    down_payment: { type: 'number' }, buy_closing_costs: { type: 'number' }, total_mortgage_payments: { type: 'number' },
    total_property_tax: { type: 'number' }, total_insurance: { type: 'number' }, total_maintenance: { type: 'number' },
    home_value_at_end: { type: 'number' }, remaining_mortgage_balance: { type: 'number' }, selling_costs: { type: 'number' }, net_sale_proceeds: { type: 'number' },
  },
};
const RentBreakdown = {
  type: 'object', required: ['total_rent_paid', 'investment_gain_on_upfront'], additionalProperties: false,
  properties: { total_rent_paid: { type: 'number' }, investment_gain_on_upfront: { type: 'number' } },
};
const RbSensitivityRow = {
  type: 'object', required: ['home_appreciation_pct', 'net_buy_cost', 'net_rent_cost'], additionalProperties: false,
  properties: { home_appreciation_pct: { type: 'number' }, net_buy_cost: { type: 'number' }, net_rent_cost: { type: 'number' } },
};
const RentBuyCore = {
  type: 'object',
  required: ['recommendation', 'net_buy_cost', 'net_rent_cost', 'cost_difference', 'breakeven_year', 'monthly_mortgage_payment', 'buy_breakdown', 'rent_breakdown', 'horizon_years'],
  properties: {
    recommendation: { type: 'string', enum: ['buy', 'rent', 'similar'] },
    net_buy_cost: { type: 'number' }, net_rent_cost: { type: 'number' },
    cost_difference: { type: 'number', description: 'net_buy_cost − net_rent_cost (negative favors buying).' },
    breakeven_year: { type: ['integer', 'null'], description: 'Year buying becomes cheaper; null if it never does within the horizon.' },
    monthly_mortgage_payment: { type: 'number' },
    buy_breakdown: { $ref: '#/components/schemas/BuyBreakdown' },
    rent_breakdown: { $ref: '#/components/schemas/RentBreakdown' },
    horizon_years: { type: 'integer' },
  },
};
const FinanceTail = {
  type: 'object', required: ['confidence_score', 'confidence_per_section', 'recommended_actions_priority_order', 'chain_to', 'financial_disclaimer', 'privacy', 'execution_metadata'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 }, confidence_per_section: { $ref: '#/components/schemas/ConfidencePerSection' },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } }, chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    financial_disclaimer: { type: 'string' }, privacy: { $ref: '#/components/schemas/Privacy' }, execution_metadata: { $ref: '#/components/schemas/ExecutionMetadata' },
  },
};
const RentBuyRequest = {
  type: 'object', required: ['home_price', 'monthly_rent', 'annual_rate'], additionalProperties: false,
  properties: {
    home_price: { type: 'number', exclusiveMinimum: 0 },
    down_payment: { type: 'number', minimum: 0, description: 'Defaults to 20% of home_price.' },
    annual_rate: { type: 'number', minimum: 0, maximum: 30 },
    term_months: { type: 'integer', minimum: 1, maximum: 600, default: 360 },
    monthly_rent: { type: 'number', exclusiveMinimum: 0 },
    years: { type: 'integer', minimum: 1, maximum: 50, default: 7, description: 'Holding horizon.' },
    property_tax_rate_pct: { type: 'number', minimum: 0, default: 1.1 },
    home_insurance_annual: { type: 'number', minimum: 0, description: 'Defaults to 0.4% of home_price.' },
    maintenance_pct: { type: 'number', minimum: 0, default: 1 },
    home_appreciation_pct: { type: 'number', minimum: 0, default: 3 },
    rent_growth_pct: { type: 'number', minimum: 0, default: 3 },
    investment_return_pct: { type: 'number', minimum: 0, default: 6 },
    buy_closing_pct: { type: 'number', minimum: 0, default: 3 },
    sell_closing_pct: { type: 'number', minimum: 0, default: 6 },
  },
};

const REQ_EXAMPLE = { home_price: 450000, down_payment: 90000, annual_rate: 6.5, term_months: 360, monthly_rent: 2400, years: 7 };
const CORE_EXAMPLE = {
  recommendation: 'rent', net_buy_cost: 178649.21, net_rent_cost: 168553.18, cost_difference: 10096.03, breakeven_year: null, monthly_mortgage_payment: 2275.44,
  buy_breakdown: { down_payment: 90000, buy_closing_costs: 13500, total_mortgage_payments: 191137.37, total_property_tax: 34650, total_insurance: 12600, total_maintenance: 31500, home_value_at_end: 553443.24, remaining_mortgage_balance: 325498.48, selling_costs: 33206.59, net_sale_proceeds: 194738.16 },
  rent_breakdown: { total_rent_paid: 220678.91, investment_gain_on_upfront: 52125.73 }, horizon_years: 7,
};
const TAIL_EXAMPLE = {
  confidence_score: 0.75, confidence_per_section: { math: 1, assumptions: 0.55 },
  recommended_actions_priority_order: ['Over 7 years, renting is cheaper by 10096.03 (net rent 168553.18 vs net buy 178649.21).', 'Buying does not break even within the horizon — the shorter you stay, the more renting wins.', 'Re-run with your real rate, local tax/appreciation, and the rent you would actually pay.'],
  chain_to: [
    { api: 'loan-affordability-calculator', reason: 'Confirm the purchase price fits your income and DTI.' },
    { api: 'mortgage-refinance', reason: 'After buying, evaluate refinancing the mortgage.' },
    { api: 'savings-goal-optimizer', reason: 'Plan the down-payment savings if buying wins.' },
  ],
  financial_disclaimer: 'Informational, deterministic calculation — not financial advice.',
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection, BuyBreakdown, RentBreakdown, RbSensitivityRow, RentBuyCore, _FinanceTail: FinanceTail, RentBuyRequest,
  DiscoveryResponse: {
    type: 'object', required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'], additionalProperties: false,
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' }, openapi_url: { type: 'string', format: 'uri' },
      auth: { type: 'object', required: ['type', 'header'], additionalProperties: false, properties: { type: { type: 'string' }, header: { type: 'string' } } },
      endpoints: { type: 'array', items: { type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false, properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
      pricing: { type: 'array', items: { type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false, properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } } } },
      x402_compatible: { type: 'boolean' },
    },
  },
  CompareResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RentBuyCore' }, { $ref: '#/components/schemas/_FinanceTail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RentBuyCore' },
      { type: 'object', required: ['assumptions', 'sensitivity_analysis', 'reasoning'], properties: { assumptions: { type: 'array', items: { type: 'string' } }, sensitivity_analysis: { type: 'array', items: { $ref: '#/components/schemas/RbSensitivityRow' } }, reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_FinanceTail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/compare', summary: 'Net buy vs net rent cost + recommendation + break-even', operationId: 'compare', priceUsdc: 0.01,
    requestSchemaRef: 'RentBuyRequest', responseSchemaRef: 'CompareResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'ren1-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL comparison + reasoning + appreciation sensitivity', operationId: 'lookup', priceUsdc: 0.02, oneCall: true,
    requestSchemaRef: 'RentBuyRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'ren2-1780000000000', computed_at: '2026-06-10T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      assumptions: ['Holding horizon 7 years; home appreciates 3%/yr, rent grows 3%/yr.', "The buyer's upfront cash is assumed invested at 6%/yr in the rent scenario (opportunity cost).", 'Taxes/maintenance are on the initial value; tax-deduction effects are not modeled.'],
      sensitivity_analysis: [
        { home_appreciation_pct: 1, net_buy_cost: 245372.6, net_rent_cost: 168553.18 },
        { home_appreciation_pct: 2, net_buy_cost: 212991.81, net_rent_cost: 168553.18 },
        { home_appreciation_pct: 3, net_buy_cost: 178649.21, net_rent_cost: 168553.18 },
        { home_appreciation_pct: 4, net_buy_cost: 142246.71, net_rent_cost: 168553.18 },
        { home_appreciation_pct: 5, net_buy_cost: 103682.37, net_rent_cost: 168553.18 },
      ],
      reasoning: { why_result_generated: 'Compared net buy cost 178649.21 (outflows minus 194738.16 net sale proceeds) against net rent cost 168553.18 (220678.91 rent minus 52125.73 investment gain) over 7 years.', key_factors: ['Recommendation: rent (difference 10096.03).', 'No break-even within the horizon.', 'Home value at end 553443.24; equity recovered 194738.16.'], invalidators: ['Appreciation and investment-return assumptions drive the result more than any other input.', 'A shorter stay favors renting because buy/sell costs amortize over fewer years.'] },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'rent-vs-buy-calculator', title: 'Rent vs Buy Calculator API', version: '1.0.0',
  description: 'Deterministic rent-vs-buy comparison over a holding horizon. Models the net cost of buying (mortgage + carrying costs − equity recovered at sale) against renting (rent growth − investment gain on the cash a buyer ties up), returns a recommendation and the break-even year. Real math with explicit assumptions — never estimated.',
  endpoints, schemas, infoExtensions: { 'x-finance': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
