import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { waccExample, capmExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const WaccCore = {
  type: 'object',
  required: ['equity_value', 'debt_value', 'total_value', 'equity_weight', 'debt_weight', 'cost_of_equity_percent', 'cost_of_debt_percent', 'tax_rate_percent', 'after_tax_cost_of_debt_percent', 'wacc_percent'],
  properties: {
    equity_value: { type: 'number' }, debt_value: { type: 'number' }, total_value: { type: 'number' },
    equity_weight: { type: 'number' }, debt_weight: { type: 'number' },
    cost_of_equity_percent: { type: 'number' }, cost_of_debt_percent: { type: 'number' }, tax_rate_percent: { type: 'number' },
    after_tax_cost_of_debt_percent: { type: 'number' }, wacc_percent: { type: 'number' },
  },
};
const CapmCore = {
  type: 'object',
  required: ['risk_free_percent', 'beta', 'equity_risk_premium_percent', 'market_return_percent', 'cost_of_equity_percent'],
  properties: {
    risk_free_percent: { type: 'number' }, beta: { type: 'number' }, equity_risk_premium_percent: { type: 'number' }, market_return_percent: { type: 'number' }, cost_of_equity_percent: { type: 'number' },
  },
};

const WaccRequest = {
  type: 'object', required: ['equity_value', 'debt_value', 'cost_of_equity_percent', 'cost_of_debt_percent'], additionalProperties: false,
  properties: {
    equity_value: { type: 'number', minimum: 0 }, debt_value: { type: 'number', minimum: 0 },
    cost_of_equity_percent: { type: 'number' }, cost_of_debt_percent: { type: 'number' },
    tax_rate_percent: { type: 'number', minimum: 0, maximum: 100, description: 'Corporate tax rate for the debt shield (default 0).' },
  },
};
const CapmRequest = {
  type: 'object', required: ['risk_free_percent', 'beta'], additionalProperties: false,
  properties: {
    risk_free_percent: { type: 'number' }, beta: { type: 'number' },
    equity_risk_premium_percent: { type: 'number', description: 'Equity risk premium; if omitted, derived from market_return_percent − risk_free_percent.' },
    market_return_percent: { type: 'number', description: 'Expected market return; used to derive ERP if equity_risk_premium_percent is omitted.' },
  },
};
const LookupRequest = {
  type: 'object', required: ['equity_value', 'debt_value', 'cost_of_debt_percent', 'risk_free_percent', 'beta'], additionalProperties: false,
  properties: {
    equity_value: { type: 'number', minimum: 0 }, debt_value: { type: 'number', minimum: 0 }, cost_of_debt_percent: { type: 'number' },
    tax_rate_percent: { type: 'number', minimum: 0, maximum: 100 },
    risk_free_percent: { type: 'number' }, beta: { type: 'number' },
    equity_risk_premium_percent: { type: 'number' }, market_return_percent: { type: 'number' },
  },
};

const waccReq = { equity_value: 600000, debt_value: 400000, cost_of_equity_percent: 9, cost_of_debt_percent: 5, tax_rate_percent: 21 };
const capmReq = { risk_free_percent: 4, beta: 1.2, market_return_percent: 10 };
const lookupReq = { equity_value: 600000, debt_value: 400000, cost_of_debt_percent: 5, tax_rate_percent: 21, risk_free_percent: 4, beta: 1.2, market_return_percent: 10 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('wacc', 'capm'), _Tail: TailFinance,
  WaccCore, CapmCore, WaccRequest, CapmRequest, LookupRequest, DiscoveryResponse: discoverySchemaPlus(),
  WaccResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/WaccCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  CapmResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CapmCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/WaccCore' },
      { type: 'object', required: ['capm', 'reasoning'], properties: { capm: { $ref: '#/components/schemas/CapmCore' }, reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/wacc', summary: 'Weighted-average cost of capital', operationId: 'wacc', priceUsdc: 0.008, requestSchemaRef: 'WaccRequest', responseSchemaRef: 'WaccResponse', requestExample: waccReq, responseExample: waccExample },
  { method: 'post', path: '/capm', summary: 'Cost of equity via CAPM', operationId: 'capm', priceUsdc: 0.006, requestSchemaRef: 'CapmRequest', responseSchemaRef: 'CapmResponse', requestExample: capmReq, responseExample: capmExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL CAPM cost of equity → WACC + reasoning', operationId: 'lookup', priceUsdc: 0.014, oneCall: true, requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse', requestExample: lookupReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'wacc', title: 'WACC API', version: '1.0.0',
  description: 'Deterministic weighted-average cost of capital + CAPM cost of equity. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-financial-calculation': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
