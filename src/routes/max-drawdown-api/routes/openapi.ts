import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { analyzeExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const Values = { type: 'array', minItems: 2, maxItems: 5000, items: { type: 'number', exclusiveMinimum: 0 }, description: 'Level series (NAV/price), positive numbers.' };

const DrawdownCore = {
  type: 'object',
  required: ['observations', 'periods_per_year', 'max_drawdown_percent', 'peak_index', 'trough_index', 'peak_value', 'trough_value', 'drawdown_periods', 'recovery_index', 'recovery_periods', 'recovered', 'cagr_percent', 'calmar_ratio'],
  properties: {
    observations: { type: 'integer' }, periods_per_year: { type: 'number' }, max_drawdown_percent: { type: 'number' },
    peak_index: { type: 'integer' }, trough_index: { type: 'integer' }, peak_value: { type: 'number' }, trough_value: { type: 'number' },
    drawdown_periods: { type: 'integer' }, recovery_index: { type: ['integer', 'null'] }, recovery_periods: { type: ['integer', 'null'] },
    recovered: { type: 'boolean' }, cagr_percent: { type: 'number' }, calmar_ratio: { type: ['number', 'null'] },
  },
};

const AnalyzeRequest = { type: 'object', required: ['values'], additionalProperties: false, properties: { values: Values, periods_per_year: { type: 'number', exclusiveMinimum: 0, description: 'For CAGR/Calmar annualization (default 12).' } } };

const analyzeReq = { values: [100, 120, 90, 95, 130], periods_per_year: 12 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('drawdown'), _Tail: TailFinance,
  DrawdownCore, AnalyzeRequest, DiscoveryResponse: discoverySchemaPlus(),
  AnalyzeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DrawdownCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DrawdownCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/analyze', summary: 'Max drawdown, peak/trough/recovery, Calmar', operationId: 'analyze', priceUsdc: 0.008, requestSchemaRef: 'AnalyzeRequest', responseSchemaRef: 'AnalyzeResponse', requestExample: analyzeReq, responseExample: analyzeExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL drawdown analysis + reasoning', operationId: 'lookup', priceUsdc: 0.013, oneCall: true, requestSchemaRef: 'AnalyzeRequest', responseSchemaRef: 'LookupResponse', requestExample: analyzeReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'max-drawdown', title: 'Max Drawdown API', version: '1.0.0',
  description: 'Deterministic maximum drawdown, recovery and Calmar ratio from a value series. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-financial-calculation': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
