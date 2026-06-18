import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { futureValueExample, effectiveRateExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const FvCore = {
  type: 'object',
  required: ['principal', 'annual_rate_percent', 'years', 'compounds_per_year', 'periods', 'contribution', 'contribution_timing', 'future_value', 'total_contributions', 'total_deposited', 'total_interest', 'effective_annual_rate_percent'],
  properties: {
    principal: { type: 'number' }, annual_rate_percent: { type: 'number' }, years: { type: 'number' }, compounds_per_year: { type: 'integer' }, periods: { type: 'number' },
    contribution: { type: 'number' }, contribution_timing: { type: 'string', enum: ['end', 'begin'] },
    future_value: { type: 'number' }, total_contributions: { type: 'number' }, total_deposited: { type: 'number' }, total_interest: { type: 'number' },
    effective_annual_rate_percent: { type: 'number' },
  },
};
const EarCore = {
  type: 'object',
  required: ['nominal_annual_rate_percent', 'compounds_per_year', 'period_rate_percent', 'effective_annual_rate_percent'],
  properties: {
    nominal_annual_rate_percent: { type: 'number' }, compounds_per_year: { type: 'integer' }, period_rate_percent: { type: 'number' }, effective_annual_rate_percent: { type: 'number' },
  },
};

const FvRequest = {
  type: 'object', required: ['principal', 'annual_rate_percent', 'years'], additionalProperties: false,
  properties: {
    principal: { type: 'number', minimum: 0 }, annual_rate_percent: { type: 'number' }, years: { type: 'number', exclusiveMinimum: 0 },
    compounds_per_year: { type: 'integer', exclusiveMinimum: 0, description: 'Compounding periods per year (default 12).' },
    contribution: { type: 'number', minimum: 0, description: 'Deposit added each compounding period (default 0).' },
    contribution_timing: { type: 'string', enum: ['end', 'begin'], description: 'Annuity timing (default "end").' },
  },
};
const EarRequest = {
  type: 'object', required: ['nominal_annual_rate_percent'], additionalProperties: false,
  properties: { nominal_annual_rate_percent: { type: 'number' }, compounds_per_year: { type: 'integer', exclusiveMinimum: 0, description: 'Default 12.' } },
};

const fvReq = { principal: 10000, annual_rate_percent: 6, years: 10, compounds_per_year: 12, contribution: 200 };
const earReq = { nominal_annual_rate_percent: 6, compounds_per_year: 12 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('future_value', 'effective_rate'), _Tail: TailFinance,
  FvCore, EarCore, FvRequest, EarRequest, DiscoveryResponse: discoverySchemaPlus(),
  FvResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/FvCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  EarResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EarCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/FvCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/future-value', summary: 'Future value of principal + contributions', operationId: 'futureValue', priceUsdc: 0.007, requestSchemaRef: 'FvRequest', responseSchemaRef: 'FvResponse', requestExample: fvReq, responseExample: futureValueExample },
  { method: 'post', path: '/effective-rate', summary: 'Nominal annual rate → effective annual rate (APY)', operationId: 'effectiveRate', priceUsdc: 0.005, requestSchemaRef: 'EarRequest', responseSchemaRef: 'EarResponse', requestExample: earReq, responseExample: effectiveRateExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL future value + EAR + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true, requestSchemaRef: 'FvRequest', responseSchemaRef: 'LookupResponse', requestExample: fvReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'compound-interest', title: 'Compound Interest API', version: '1.0.0',
  description: 'Deterministic compound-interest future value (with contributions) and nominal→effective rate conversion. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-financial-calculation': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
