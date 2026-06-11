import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const numNull = { type: ['number', 'null'] };
const AnalyzeCore = {
  type: 'object',
  required: ['total_supply', 'circulating_supply', 'max_supply', 'locked_supply', 'circulating_pct', 'max_dilution_pct', 'price_usd', 'market_cap_usd', 'fully_diluted_valuation_usd', 'mc_to_fdv_ratio', 'annual_emission', 'annual_inflation_pct', 'financial_disclaimer'],
  properties: {
    total_supply: { type: 'number' }, circulating_supply: { type: 'number' }, max_supply: numNull, locked_supply: { type: 'number' },
    circulating_pct: { type: 'number' }, max_dilution_pct: numNull, price_usd: numNull,
    market_cap_usd: numNull, fully_diluted_valuation_usd: numNull, mc_to_fdv_ratio: numNull,
    annual_emission: numNull, annual_inflation_pct: numNull, financial_disclaimer: { type: 'string' },
  },
};
const UnlockRow = {
  type: 'object', required: ['label', 'unlock_month', 'tokens', 'cumulative_tokens', 'cumulative_pct_of_total'], additionalProperties: false,
  properties: { label: { type: 'string' }, unlock_month: { type: 'number' }, tokens: { type: 'number' }, cumulative_tokens: { type: 'number' }, cumulative_pct_of_total: { type: 'number' } },
};
const VestingCore = {
  type: 'object', required: ['tracked_tokens', 'tracked_pct_of_total', 'schedule', 'next_unlock'], additionalProperties: false,
  properties: { tracked_tokens: { type: 'number' }, tracked_pct_of_total: { type: 'number' }, schedule: { type: 'array', items: { $ref: '#/components/schemas/UnlockRow' } }, next_unlock: { oneOf: [{ $ref: '#/components/schemas/UnlockRow' }, { type: 'null' }] } },
};
const nullableVesting = { oneOf: [{ $ref: '#/components/schemas/VestingCore' }, { type: 'null' }] };

const AnalyzeRequest = {
  type: 'object', required: ['total_supply'], additionalProperties: false,
  properties: {
    total_supply: { type: 'number', exclusiveMinimum: 0 },
    circulating_supply: { type: 'number', minimum: 0, description: 'Defaults to total_supply if omitted.' },
    max_supply: { type: 'number', minimum: 0, description: 'Must be ≥ total_supply.' },
    price_usd: { type: 'number', minimum: 0 }, annual_emission: { type: 'number', minimum: 0, description: 'New tokens minted per year.' },
  },
};
const VestTranche = { type: 'object', required: ['tokens', 'unlock_month'], additionalProperties: false, properties: { label: { type: 'string' }, tokens: { type: 'number', minimum: 0 }, unlock_month: { type: 'number', minimum: 0 } } };
const LookupRequest = {
  type: 'object', required: ['total_supply'], additionalProperties: false,
  properties: {
    total_supply: { type: 'number', exclusiveMinimum: 0 }, circulating_supply: { type: 'number', minimum: 0 }, max_supply: { type: 'number', minimum: 0 },
    price_usd: { type: 'number', minimum: 0 }, annual_emission: { type: 'number', minimum: 0 },
    vesting: { type: 'array', minItems: 1, items: VestTranche, description: 'Optional unlock tranches; sorted into a cumulative curve.' },
    elapsed_months: { type: 'number', minimum: 0, description: 'Months elapsed; next_unlock is the first tranche after this.' },
  },
};

const DISC = 'Informational, deterministic tokenomics math derived solely from the inputs you provide — not financial advice and not a valuation. Garbage in, garbage out: figures are only as accurate as the supply/price/emission inputs.';
const CORE = { total_supply: 1000000000, circulating_supply: 200000000, max_supply: null, locked_supply: 800000000, circulating_pct: 20, max_dilution_pct: null, price_usd: 0.5, market_cap_usd: 100000000, fully_diluted_valuation_usd: 500000000, mc_to_fdv_ratio: 0.2, annual_emission: 50000000, annual_inflation_pct: 25, financial_disclaimer: DISC };
const ACTS = ['Circulating float 20% of total supply; 800000000 tokens locked.', 'MC/FDV 0.2 — low float: heavy future dilution vs market cap.', 'Annual emission inflates circulating supply by ~25%.'];
const VEST = { tracked_tokens: 500000000, tracked_pct_of_total: 50, schedule: [{ label: 'investors', unlock_month: 6, tokens: 300000000, cumulative_tokens: 300000000, cumulative_pct_of_total: 30 }, { label: 'team', unlock_month: 12, tokens: 200000000, cumulative_tokens: 500000000, cumulative_pct_of_total: 50 }], next_unlock: { label: 'investors', unlock_month: 6, tokens: 300000000, cumulative_tokens: 300000000, cumulative_pct_of_total: 30 } };
const TAIL = {
  confidence_score: 1, confidence_per_section: { supply: 1, valuation: 1 }, recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'country-currency-data', reason: 'Format the resulting USD valuations for display.' },
    { api: 'finance-payments', reason: 'Model vesting cliffs/linear unlocks as an installment-style schedule.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('supply', 'valuation'), _Tail: Tail, AnalyzeCore, UnlockRow, VestingCore, AnalyzeRequest, LookupRequest,
  DiscoveryResponse: discoverySchema(),
  AnalyzeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AnalyzeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AnalyzeCore' },
      { type: 'object', required: ['vesting', 'reasoning'], properties: { vesting: nullableVesting, reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'tke-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/analyze', summary: 'Supply/valuation/inflation math', operationId: 'analyze', priceUsdc: 0.006,
    requestSchemaRef: 'AnalyzeRequest', responseSchemaRef: 'AnalyzeResponse', requestExample: { total_supply: 1000000000, circulating_supply: 200000000, price_usd: 0.5, annual_emission: 50000000 },
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL analysis + vesting unlock curve + reasoning', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse', requestExample: { total_supply: 1000000000, circulating_supply: 200000000, price_usd: 0.5, annual_emission: 50000000, vesting: [{ label: 'team', tokens: 200000000, unlock_month: 12 }, { label: 'investors', tokens: 300000000, unlock_month: 6 }] },
    responseExample: {
      ...env, ...CORE, vesting: VEST,
      reasoning: { why_result_generated: '20% of 1000000000 circulating; FDV $500000000 at $0.5; 2 vesting tranche(s) tracked.', key_factors: ['Float: 20%.', 'MC/FDV: 0.2.', 'Annual inflation: 25%.'], invalidators: ['Figures are only as accurate as the supply/price/emission inputs you provided.', 'Real circulating supply, burns, and emission curves change over time and are not fetched here.', 'FDV uses max supply when given, otherwise total supply — a different denominator changes it.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'tokenomics-explainer', title: 'Tokenomics Explainer API', version: '1.0.0',
  description: 'Deterministic tokenomics math. From supply figures, optional price, optional emission, and an optional vesting schedule, returns float %, locked supply, dilution to max, market cap, FDV, MC/FDV ratio, annual inflation, and a cumulative unlock curve. Pure arithmetic from your inputs — no LLM, no market data, not financial advice.',
  endpoints, schemas, infoExtensions: { 'x-finance': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
