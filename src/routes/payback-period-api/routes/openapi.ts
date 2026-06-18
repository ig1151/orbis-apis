import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { simpleExample, discountedExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const SimpleCore = {
  type: 'object',
  required: ['initial_investment', 'periods', 'total_inflows', 'payback_periods', 'recovered', 'payback_years'],
  properties: {
    initial_investment: { type: 'number' }, periods: { type: 'integer' }, total_inflows: { type: 'number' },
    payback_periods: { type: ['number', 'null'] }, recovered: { type: 'boolean' }, payback_years: { type: ['number', 'null'] },
  },
};
const DiscountedCore = {
  type: 'object',
  required: ['initial_investment', 'discount_rate_percent', 'periods', 'discounted_payback_periods', 'recovered', 'payback_years', 'npv', 'profitability_index'],
  properties: {
    initial_investment: { type: 'number' }, discount_rate_percent: { type: 'number' }, periods: { type: 'integer' },
    discounted_payback_periods: { type: ['number', 'null'] }, recovered: { type: 'boolean' }, payback_years: { type: ['number', 'null'] },
    npv: { type: 'number' }, profitability_index: { type: ['number', 'null'] },
  },
};

const SimpleRequest = {
  type: 'object', required: ['initial_investment', 'cashflows'], additionalProperties: false,
  properties: {
    initial_investment: { type: 'number', exclusiveMinimum: 0 },
    cashflows: { type: 'array', minItems: 1, items: { type: 'number' }, description: 'Per-period inflow; cashflows[k] is the inflow in period k+1.' },
    periods_per_year: { type: 'number', exclusiveMinimum: 0, description: 'If given, also returns payback in years.' },
  },
};
const DiscountedRequest = {
  type: 'object', required: ['initial_investment', 'cashflows', 'discount_rate_percent'], additionalProperties: false,
  properties: {
    initial_investment: { type: 'number', exclusiveMinimum: 0 },
    cashflows: { type: 'array', minItems: 1, items: { type: 'number' } },
    discount_rate_percent: { type: 'number', exclusiveMinimum: -100, description: 'Per-period discount rate, percent.' },
    periods_per_year: { type: 'number', exclusiveMinimum: 0 },
  },
};

const simpleReq = { initial_investment: 100000, cashflows: [30000, 30000, 30000, 30000, 30000], periods_per_year: 1 };
const discountedReq = { initial_investment: 100000, cashflows: [30000, 30000, 30000, 30000, 30000], discount_rate_percent: 10, periods_per_year: 1 };
const lookupReq = { initial_investment: 100000, cashflows: [30000, 30000, 30000, 30000, 30000], discount_rate_percent: 10, periods_per_year: 1 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('simple', 'discounted'), _Tail: TailFinance,
  SimpleCore, DiscountedCore, SimpleRequest, DiscountedRequest, DiscoveryResponse: discoverySchemaPlus(),
  SimpleResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SimpleCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  DiscountedResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DiscountedCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SimpleCore' },
      { type: 'object', required: ['discounted', 'reasoning'], properties: { discounted: { $ref: '#/components/schemas/DiscountedCore' }, reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/simple', summary: 'Undiscounted payback period', operationId: 'simple', priceUsdc: 0.007, requestSchemaRef: 'SimpleRequest', responseSchemaRef: 'SimpleResponse', requestExample: simpleReq, responseExample: simpleExample },
  { method: 'post', path: '/discounted', summary: 'Discounted payback + NPV + profitability index', operationId: 'discounted', priceUsdc: 0.008, requestSchemaRef: 'DiscountedRequest', responseSchemaRef: 'DiscountedResponse', requestExample: discountedReq, responseExample: discountedExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL simple + discounted payback + reasoning', operationId: 'lookup', priceUsdc: 0.013, oneCall: true, requestSchemaRef: 'DiscountedRequest', responseSchemaRef: 'LookupResponse', requestExample: lookupReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'payback-period', title: 'Payback Period API', version: '1.0.0',
  description: 'Deterministic capital-budgeting payback analysis: simple and discounted payback, NPV, profitability index. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-financial-calculation': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
