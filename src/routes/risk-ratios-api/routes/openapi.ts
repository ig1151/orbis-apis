import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { sharpeExample, sortinoExample, lookupExample } from './examples';

const SharpeCore = {
  type: 'object',
  required: ['observations', 'periods_per_year', 'mean_return_percent', 'stdev_percent', 'risk_free_rate_percent', 'sharpe_ratio', 'annualized_sharpe', 'annualized_return_percent', 'annualized_volatility_percent'],
  properties: {
    observations: { type: 'integer' }, periods_per_year: { type: 'number' }, mean_return_percent: { type: 'number' }, stdev_percent: { type: 'number' },
    risk_free_rate_percent: { type: 'number' }, sharpe_ratio: { type: ['number', 'null'] }, annualized_sharpe: { type: ['number', 'null'] },
    annualized_return_percent: { type: 'number' }, annualized_volatility_percent: { type: 'number' },
  },
};
const SortinoCore = {
  type: 'object',
  required: ['observations', 'periods_per_year', 'mean_return_percent', 'minimum_acceptable_return_percent', 'downside_deviation_percent', 'sortino_ratio', 'annualized_sortino'],
  properties: {
    observations: { type: 'integer' }, periods_per_year: { type: 'number' }, mean_return_percent: { type: 'number' },
    minimum_acceptable_return_percent: { type: 'number' }, downside_deviation_percent: { type: 'number' },
    sortino_ratio: { type: ['number', 'null'] }, annualized_sortino: { type: ['number', 'null'] },
  },
};
const LookupCore = {
  type: 'object',
  required: ['observations', 'periods_per_year', 'mean_return_percent', 'stdev_percent', 'annualized_return_percent', 'annualized_volatility_percent', 'risk_free_rate_percent', 'sharpe_ratio', 'annualized_sharpe', 'minimum_acceptable_return_percent', 'downside_deviation_percent', 'sortino_ratio', 'annualized_sortino'],
  properties: {
    observations: { type: 'integer' }, periods_per_year: { type: 'number' }, mean_return_percent: { type: 'number' }, stdev_percent: { type: 'number' },
    annualized_return_percent: { type: 'number' }, annualized_volatility_percent: { type: 'number' }, risk_free_rate_percent: { type: 'number' },
    sharpe_ratio: { type: ['number', 'null'] }, annualized_sharpe: { type: ['number', 'null'] },
    minimum_acceptable_return_percent: { type: 'number' }, downside_deviation_percent: { type: 'number' },
    sortino_ratio: { type: ['number', 'null'] }, annualized_sortino: { type: ['number', 'null'] },
  },
};
const Returns = { type: 'array', minItems: 2, maxItems: 5000, items: { type: 'number' }, description: 'Per-period returns as percents (e.g. 1.5 = 1.5%).' };
const SharpeRequest = { type: 'object', required: ['returns'], additionalProperties: false, properties: { returns: Returns, risk_free_rate: { type: 'number', description: 'Per-period risk-free percent (default 0).' }, periods_per_year: { type: 'number', exclusiveMinimum: 0, description: 'For annualization (default 12).' } } };
const SortinoRequest = { type: 'object', required: ['returns'], additionalProperties: false, properties: { returns: Returns, minimum_acceptable_return: { type: 'number', description: 'Per-period MAR percent (default 0).' }, periods_per_year: { type: 'number', exclusiveMinimum: 0, description: 'For annualization (default 12).' } } };
const LookupRequest = { type: 'object', required: ['returns'], additionalProperties: false, properties: { returns: Returns, risk_free_rate: { type: 'number' }, minimum_acceptable_return: { type: 'number' }, periods_per_year: { type: 'number', exclusiveMinimum: 0 } } };

const sharpeReq = { returns: [2.1, -1.2, 3.4, 0.8, -0.5, 1.9, 2.7, -1.1], risk_free_rate: 0.2, periods_per_year: 12 };
const sortinoReq = { returns: [2.1, -1.2, 3.4, 0.8, -0.5, 1.9, 2.7, -1.1], minimum_acceptable_return: 0, periods_per_year: 12 };
const lookupReq = { returns: [2.1, -1.2, 3.4, 0.8, -0.5, 1.9, 2.7, -1.1], risk_free_rate: 0.2, minimum_acceptable_return: 0, periods_per_year: 12 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('sharpe', 'sortino'), _Tail: TailFinance,
  SharpeCore, SortinoCore, LookupCore, SharpeRequest, SortinoRequest, LookupRequest, DiscoveryResponse: discoverySchemaPlus(),
  SharpeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SharpeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  SortinoResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SortinoCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LookupCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const disc = {
  name: 'Sharpe / Sortino Risk Ratios API', version: '1.0.0',
  description: 'Deterministic risk-adjusted return ratios from a series of periodic returns. /sharpe uses total volatility; /sortino uses downside deviation below a minimum-acceptable return. Both annualized by √(periods per year), with annualized return & volatility. Returns are per-period percents. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/risk-ratios/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['sharpe_ratio', 'sortino_ratio', 'volatility', 'downside_risk', 'risk_adjusted_return'],
  endpoints: [
    { method: 'POST', path: '/sharpe', summary: 'Sharpe ratio + annualized return/vol', price_usdc: 0.007 },
    { method: 'POST', path: '/sortino', summary: 'Sortino ratio + downside deviation', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL Sharpe + Sortino + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/sharpe', price_usdc: 0.007, currency: 'USDC' },
    { path: '/sortino', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/sharpe', summary: 'Sharpe ratio + annualized return/vol', operationId: 'sharpe', priceUsdc: 0.007, requestSchemaRef: 'SharpeRequest', responseSchemaRef: 'SharpeResponse', requestExample: sharpeReq, responseExample: sharpeExample },
  { method: 'post', path: '/sortino', summary: 'Sortino ratio + downside deviation', operationId: 'sortino', priceUsdc: 0.007, requestSchemaRef: 'SortinoRequest', responseSchemaRef: 'SortinoResponse', requestExample: sortinoReq, responseExample: sortinoExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL Sharpe + Sortino + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true, requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse', requestExample: lookupReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'risk-ratios', title: 'Sharpe / Sortino Risk Ratios API', version: '1.0.0',
  description: 'Deterministic Sharpe & Sortino ratios from periodic returns — total vs downside risk, annualized return/vol. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
