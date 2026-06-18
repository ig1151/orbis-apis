import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { correlationExample, betaExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const CorrelationCore = {
  type: 'object',
  required: ['n', 'correlation', 'covariance', 'mean_a', 'mean_b', 'stdev_a', 'stdev_b', 'r_squared', 'relationship'],
  properties: {
    n: { type: 'integer' }, correlation: { type: 'number' }, covariance: { type: 'number' },
    mean_a: { type: 'number' }, mean_b: { type: 'number' }, stdev_a: { type: 'number' }, stdev_b: { type: 'number' },
    r_squared: { type: 'number' }, relationship: { type: 'string' },
  },
};
const BetaCore = {
  type: 'object',
  required: ['n', 'beta', 'alpha_per_period', 'r_squared', 'correlation', 'mean_asset', 'mean_benchmark', 'benchmark_variance', 'alpha_annualized_percent', 'sensitivity'],
  properties: {
    n: { type: 'integer' }, beta: { type: 'number' }, alpha_per_period: { type: 'number' },
    r_squared: { type: 'number' }, correlation: { type: 'number' },
    mean_asset: { type: 'number' }, mean_benchmark: { type: 'number' }, benchmark_variance: { type: 'number' },
    alpha_annualized_percent: { type: ['number', 'null'] }, sensitivity: { type: 'string' },
  },
};

const CorrelationRequest = {
  type: 'object', required: ['series_a', 'series_b'], additionalProperties: false,
  properties: {
    series_a: { type: 'array', minItems: 2, items: { type: 'number' } },
    series_b: { type: 'array', minItems: 2, items: { type: 'number' }, description: 'Same length as series_a.' },
  },
};
const BetaRequest = {
  type: 'object', required: ['asset_returns', 'benchmark_returns'], additionalProperties: false,
  properties: {
    asset_returns: { type: 'array', minItems: 2, items: { type: 'number' } },
    benchmark_returns: { type: 'array', minItems: 2, items: { type: 'number' }, description: 'Same length as asset_returns; must not be constant.' },
    periods_per_year: { type: 'number', exclusiveMinimum: 0, description: 'If given, also returns annualized alpha (×periods_per_year).' },
  },
};

const correlationReq = { series_a: [1.2, -0.8, 2.1, -3.4, 0.5], series_b: [0.9, -0.5, 1.7, -2.9, 0.2] };
const betaReq = { asset_returns: [1.2, -0.8, 2.1, -3.4, 0.5], benchmark_returns: [0.9, -0.5, 1.7, -2.9, 0.2], periods_per_year: 252 };
const lookupReq = { asset_returns: [1.2, -0.8, 2.1, -3.4, 0.5], benchmark_returns: [0.9, -0.5, 1.7, -2.9, 0.2], periods_per_year: 252 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('correlation', 'beta'), _Tail: TailFinance,
  CorrelationCore, BetaCore, CorrelationRequest, BetaRequest, DiscoveryResponse: discoverySchemaPlus(),
  CorrelationResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CorrelationCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  BetaResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BetaCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BetaCore' },
      { type: 'object', required: ['correlation_detail', 'reasoning'], properties: { correlation_detail: { $ref: '#/components/schemas/CorrelationCore' }, reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/correlation', summary: 'Pearson correlation + covariance of two series', operationId: 'correlation', priceUsdc: 0.008, requestSchemaRef: 'CorrelationRequest', responseSchemaRef: 'CorrelationResponse', requestExample: correlationReq, responseExample: correlationExample },
  { method: 'post', path: '/beta', summary: 'Beta, alpha and R² of an asset vs a benchmark', operationId: 'beta', priceUsdc: 0.008, requestSchemaRef: 'BetaRequest', responseSchemaRef: 'BetaResponse', requestExample: betaReq, responseExample: betaExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL correlation + beta + reasoning', operationId: 'lookup', priceUsdc: 0.014, oneCall: true, requestSchemaRef: 'BetaRequest', responseSchemaRef: 'LookupResponse', requestExample: lookupReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'correlation-beta', title: 'Correlation & Beta API', version: '1.0.0',
  description: 'Deterministic portfolio statistics: Pearson correlation, covariance, beta, Jensen\'s alpha and R². No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-financial-calculation': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
