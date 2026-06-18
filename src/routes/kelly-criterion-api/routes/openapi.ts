import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { kellyExample, ruinExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const KellyCore = {
  type: 'object',
  required: ['win_probability', 'loss_probability', 'win_payoff', 'loss_fraction', 'kelly_multiplier', 'edge', 'expected_value_per_unit', 'kelly_fraction', 'fractional_kelly_fraction', 'favorable', 'expected_log_growth_full', 'expected_log_growth_fractional', 'bankroll', 'recommended_stake', 'recommendation'],
  properties: {
    win_probability: { type: 'number' }, loss_probability: { type: 'number' }, win_payoff: { type: 'number' }, loss_fraction: { type: 'number' },
    kelly_multiplier: { type: 'number' }, edge: { type: 'number' }, expected_value_per_unit: { type: 'number' },
    kelly_fraction: { type: 'number' }, fractional_kelly_fraction: { type: 'number' }, favorable: { type: 'boolean' },
    expected_log_growth_full: { type: ['number', 'null'] }, expected_log_growth_fractional: { type: ['number', 'null'] },
    bankroll: { type: ['number', 'null'] }, recommended_stake: { type: ['number', 'null'] }, recommendation: { type: 'string' },
  },
};
const RuinCore = {
  type: 'object',
  required: ['win_probability', 'loss_probability', 'bankroll_units', 'risk_of_ruin', 'survival_probability', 'favorable', 'assumptions'],
  properties: {
    win_probability: { type: 'number' }, loss_probability: { type: 'number' }, bankroll_units: { type: 'integer' },
    risk_of_ruin: { type: 'number' }, survival_probability: { type: 'number' }, favorable: { type: 'boolean' }, assumptions: { type: 'string' },
  },
};

const KellyRequest = {
  type: 'object', required: ['win_probability', 'win_payoff'], additionalProperties: false,
  properties: {
    win_probability: { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1 },
    win_payoff: { type: 'number', exclusiveMinimum: 0, description: 'Net odds b: profit per unit staked on a win (b:1).' },
    loss_fraction: { type: 'number', exclusiveMinimum: 0, maximum: 1, description: 'Fraction of stake lost on a loss (default 1).' },
    kelly_multiplier: { type: 'number', exclusiveMinimum: 0, maximum: 1, description: 'Fractional-Kelly scaler (default 1 = full Kelly).' },
    bankroll: { type: 'number', exclusiveMinimum: 0, description: 'If given, returns the recommended stake amount.' },
  },
};
const RuinRequest = {
  type: 'object', required: ['win_probability', 'bankroll_units'], additionalProperties: false,
  properties: {
    win_probability: { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1 },
    bankroll_units: { type: 'integer', minimum: 1, description: 'Number of one-unit flat bets the bankroll covers.' },
  },
};

const kellyReq = { win_probability: 0.55, win_payoff: 1, kelly_multiplier: 0.5, bankroll: 10000 };
const ruinReq = { win_probability: 0.55, bankroll_units: 20 };
const lookupReq = { win_probability: 0.55, win_payoff: 1, kelly_multiplier: 0.5, bankroll: 10000 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('kelly', 'risk_of_ruin'), _Tail: TailFinance,
  KellyCore, RuinCore, KellyRequest, RuinRequest, DiscoveryResponse: discoverySchemaPlus(),
  KellyResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/KellyCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  RuinResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RuinCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/KellyCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/kelly', summary: 'Optimal + fractional Kelly stake', operationId: 'kelly', priceUsdc: 0.007, requestSchemaRef: 'KellyRequest', responseSchemaRef: 'KellyResponse', requestExample: kellyReq, responseExample: kellyExample },
  { method: 'post', path: '/risk-of-ruin', summary: 'Gambler\'s-ruin probability (flat even-money bets)', operationId: 'riskOfRuin', priceUsdc: 0.006, requestSchemaRef: 'RuinRequest', responseSchemaRef: 'RuinResponse', requestExample: ruinReq, responseExample: ruinExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL Kelly stake + interpretation + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true, requestSchemaRef: 'KellyRequest', responseSchemaRef: 'LookupResponse', requestExample: lookupReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'kelly-criterion', title: 'Kelly Criterion API', version: '1.0.0',
  description: 'Deterministic Kelly-criterion bet/position sizing: optimal & fractional Kelly fraction, edge, expected log-growth, gambler\'s-ruin probability. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-financial-calculation': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
