import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { historicalExample, parametricExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const Returns = { type: 'array', minItems: 2, maxItems: 5000, items: { type: 'number' }, description: 'Per-period returns as percents (e.g. -3.4 = −3.4%).' };
const Confidence = { type: 'number', exclusiveMinimum: 0.5, exclusiveMaximum: 1, description: 'Confidence level (default 0.95).' };

const HistoricalCore = {
  type: 'object',
  required: ['method', 'observations', 'confidence', 'alpha', 'threshold_return_percent', 'var_percent', 'cvar_percent'],
  properties: {
    method: { type: 'string', enum: ['historical'] }, observations: { type: 'integer' }, confidence: { type: 'number' }, alpha: { type: 'number' },
    threshold_return_percent: { type: 'number' }, var_percent: { type: 'number' }, cvar_percent: { type: 'number' },
  },
};
const ParametricCore = {
  type: 'object',
  required: ['method', 'observations', 'confidence', 'alpha', 'mean_percent', 'stdev_percent', 'z_score', 'var_percent', 'cvar_percent'],
  properties: {
    method: { type: 'string', enum: ['parametric_gaussian'] }, observations: { type: 'integer' }, confidence: { type: 'number' }, alpha: { type: 'number' },
    mean_percent: { type: 'number' }, stdev_percent: { type: 'number' }, z_score: { type: 'number' }, var_percent: { type: 'number' }, cvar_percent: { type: 'number' },
  },
};
const LookupCore = {
  type: 'object',
  required: ['observations', 'confidence', 'alpha', 'historical', 'parametric'],
  properties: {
    observations: { type: 'integer' }, confidence: { type: 'number' }, alpha: { type: 'number' },
    historical: {
      type: 'object', required: ['threshold_return_percent', 'var_percent', 'cvar_percent'], additionalProperties: false,
      properties: { threshold_return_percent: { type: 'number' }, var_percent: { type: 'number' }, cvar_percent: { type: 'number' } },
    },
    parametric: {
      type: 'object', required: ['mean_percent', 'stdev_percent', 'z_score', 'var_percent', 'cvar_percent'], additionalProperties: false,
      properties: { mean_percent: { type: 'number' }, stdev_percent: { type: 'number' }, z_score: { type: 'number' }, var_percent: { type: 'number' }, cvar_percent: { type: 'number' } },
    },
  },
};

const VarRequest = { type: 'object', required: ['returns'], additionalProperties: false, properties: { returns: Returns, confidence: Confidence } };

const sampleReturns = [1.2, -0.8, 2.1, -3.4, 0.5, -1.1, 1.8, -2.2, 0.9, -0.3];
const varReq = { returns: sampleReturns, confidence: 0.95 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('historical_var', 'parametric_var'), _Tail: TailFinance,
  HistoricalCore, ParametricCore, LookupCore, VarRequest, DiscoveryResponse: discoverySchemaPlus(),
  HistoricalResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HistoricalCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  ParametricResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ParametricCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LookupCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/historical', summary: 'Empirical VaR + expected shortfall', operationId: 'historical', priceUsdc: 0.008, requestSchemaRef: 'VarRequest', responseSchemaRef: 'HistoricalResponse', requestExample: varReq, responseExample: historicalExample },
  { method: 'post', path: '/parametric', summary: 'Gaussian VaR + expected shortfall', operationId: 'parametric', priceUsdc: 0.008, requestSchemaRef: 'VarRequest', responseSchemaRef: 'ParametricResponse', requestExample: varReq, responseExample: parametricExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL historical + parametric + reasoning', operationId: 'lookup', priceUsdc: 0.014, oneCall: true, requestSchemaRef: 'VarRequest', responseSchemaRef: 'LookupResponse', requestExample: varReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'value-at-risk', title: 'Value at Risk API', version: '1.0.0',
  description: 'Deterministic historical and parametric Value-at-Risk + expected shortfall from a return series. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-financial-calculation': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
