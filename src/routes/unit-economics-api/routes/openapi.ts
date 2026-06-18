import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { ltvCacExample, marginsExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const LtvCacCore = {
  type: 'object',
  required: ['arpu', 'gross_margin_percent', 'cac', 'monthly_churn_rate', 'lifetime_periods', 'gross_margin_per_period', 'ltv', 'ltv_cac_ratio', 'cac_payback_periods', 'verdict'],
  properties: {
    arpu: { type: 'number' }, gross_margin_percent: { type: 'number' }, cac: { type: 'number' },
    monthly_churn_rate: { type: ['number', 'null'] }, lifetime_periods: { type: 'number' },
    gross_margin_per_period: { type: 'number' }, ltv: { type: 'number' }, ltv_cac_ratio: { type: 'number' },
    cac_payback_periods: { type: ['number', 'null'] }, verdict: { type: 'string' },
  },
};
const MarginsCore = {
  type: 'object',
  required: ['revenue', 'cogs', 'variable_costs', 'gross_profit', 'gross_margin_percent', 'contribution_margin', 'contribution_margin_percent'],
  properties: {
    revenue: { type: 'number' }, cogs: { type: 'number' }, variable_costs: { type: 'number' },
    gross_profit: { type: 'number' }, gross_margin_percent: { type: 'number' },
    contribution_margin: { type: 'number' }, contribution_margin_percent: { type: 'number' },
  },
};

const LtvCacRequest = {
  type: 'object', required: ['arpu', 'gross_margin_percent', 'cac'], additionalProperties: false,
  properties: {
    arpu: { type: 'number', minimum: 0, description: 'Average revenue per customer per period.' },
    gross_margin_percent: { type: 'number', minimum: 0, maximum: 100 },
    cac: { type: 'number', minimum: 0, description: 'Customer acquisition cost.' },
    monthly_churn_rate: { type: 'number', exclusiveMinimum: 0, maximum: 1, description: 'Per-period churn; lifetime = 1/churn.' },
    lifetime_periods: { type: 'number', exclusiveMinimum: 0, description: 'Customer lifetime in periods (alternative to churn).' },
  },
};
const MarginsRequest = {
  type: 'object', required: ['revenue', 'cogs'], additionalProperties: false,
  properties: {
    revenue: { type: 'number', minimum: 0 }, cogs: { type: 'number', minimum: 0 },
    variable_costs: { type: 'number', minimum: 0, description: 'Variable costs beyond COGS (default 0).' },
  },
};

const ltvCacReq = { arpu: 100, gross_margin_percent: 80, cac: 400, monthly_churn_rate: 0.05 };
const marginsReq = { revenue: 100000, cogs: 30000, variable_costs: 15000 };
const lookupReq = { arpu: 100, gross_margin_percent: 80, cac: 400, monthly_churn_rate: 0.05 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('ltv_cac', 'margins'), _Tail: TailFinance,
  LtvCacCore, MarginsCore, LtvCacRequest, MarginsRequest, DiscoveryResponse: discoverySchemaPlus(),
  LtvCacResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LtvCacCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  MarginsResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/MarginsCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LtvCacCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/ltv-cac', summary: 'LTV, LTV:CAC ratio and CAC payback', operationId: 'ltvCac', priceUsdc: 0.007, requestSchemaRef: 'LtvCacRequest', responseSchemaRef: 'LtvCacResponse', requestExample: ltvCacReq, responseExample: ltvCacExample },
  { method: 'post', path: '/margins', summary: 'Gross and contribution margins', operationId: 'margins', priceUsdc: 0.005, requestSchemaRef: 'MarginsRequest', responseSchemaRef: 'MarginsResponse', requestExample: marginsReq, responseExample: marginsExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL unit economics + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true, requestSchemaRef: 'LtvCacRequest', responseSchemaRef: 'LookupResponse', requestExample: lookupReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'unit-economics', title: 'Unit Economics API', version: '1.0.0',
  description: 'Deterministic SaaS unit economics: gross-margin LTV, LTV:CAC ratio, CAC payback, gross & contribution margins. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-financial-calculation': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
