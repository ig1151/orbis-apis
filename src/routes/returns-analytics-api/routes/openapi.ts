import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { summaryExample, cagrExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const Values = { type: 'array', minItems: 2, maxItems: 5000, items: { type: 'number', exclusiveMinimum: 0 }, description: 'Level series (NAV/price), positive numbers.' };

const SummaryCore = {
  type: 'object',
  required: ['observations', 'periods', 'periods_per_year', 'years', 'total_return_percent', 'cagr_percent', 'annualized_arithmetic_percent', 'mean_period_return_percent', 'best_period_return_percent', 'worst_period_return_percent'],
  properties: {
    observations: { type: 'integer' }, periods: { type: 'integer' }, periods_per_year: { type: 'number' }, years: { type: 'number' },
    total_return_percent: { type: 'number' }, cagr_percent: { type: 'number' }, annualized_arithmetic_percent: { type: 'number' },
    mean_period_return_percent: { type: 'number' }, best_period_return_percent: { type: 'number' }, worst_period_return_percent: { type: 'number' },
  },
};
const CagrCore = {
  type: 'object',
  required: ['begin_value', 'end_value', 'periods', 'periods_per_year', 'years', 'total_return_percent', 'cagr_percent'],
  properties: {
    begin_value: { type: 'number' }, end_value: { type: 'number' }, periods: { type: 'number' }, periods_per_year: { type: 'number' },
    years: { type: 'number' }, total_return_percent: { type: 'number' }, cagr_percent: { type: 'number' },
  },
};

const SummaryRequest = { type: 'object', required: ['values'], additionalProperties: false, properties: { values: Values, periods_per_year: { type: 'number', exclusiveMinimum: 0, description: 'For annualization (default 12).' } } };
const CagrRequest = { type: 'object', required: ['begin_value', 'end_value', 'periods'], additionalProperties: false, properties: { begin_value: { type: 'number', exclusiveMinimum: 0 }, end_value: { type: 'number', exclusiveMinimum: 0 }, periods: { type: 'number', exclusiveMinimum: 0 }, periods_per_year: { type: 'number', exclusiveMinimum: 0, description: 'Default 12.' } } };

const summaryReq = { values: [100, 108, 102, 115, 121], periods_per_year: 12 };
const cagrReq = { begin_value: 100, end_value: 121, periods: 4, periods_per_year: 12 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('returns', 'cagr'), _Tail: TailFinance,
  SummaryCore, CagrCore, SummaryRequest, CagrRequest, DiscoveryResponse: discoverySchemaPlus(),
  SummaryResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SummaryCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  CagrResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CagrCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SummaryCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/summary', summary: 'Total return, CAGR, annualized & best/worst from a series', operationId: 'summary', priceUsdc: 0.007, requestSchemaRef: 'SummaryRequest', responseSchemaRef: 'SummaryResponse', requestExample: summaryReq, responseExample: summaryExample },
  { method: 'post', path: '/cagr', summary: 'CAGR from begin/end values over N periods', operationId: 'cagr', priceUsdc: 0.006, requestSchemaRef: 'CagrRequest', responseSchemaRef: 'CagrResponse', requestExample: cagrReq, responseExample: cagrExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL summary + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true, requestSchemaRef: 'SummaryRequest', responseSchemaRef: 'LookupResponse', requestExample: summaryReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'returns-analytics', title: 'Returns Analytics API', version: '1.0.0',
  description: 'Deterministic total return, CAGR and annualized return from a value series. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-financial-calculation': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
