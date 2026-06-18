import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { unitsExample, revenueExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const UnitsCore = {
  type: 'object',
  required: ['fixed_costs', 'price_per_unit', 'variable_cost_per_unit', 'contribution_margin_per_unit', 'contribution_margin_ratio', 'break_even_units', 'break_even_revenue', 'target_profit', 'target_profit_units', 'target_profit_revenue', 'current_units', 'margin_of_safety_units', 'margin_of_safety_percent'],
  properties: {
    fixed_costs: { type: 'number' }, price_per_unit: { type: 'number' }, variable_cost_per_unit: { type: 'number' },
    contribution_margin_per_unit: { type: 'number' }, contribution_margin_ratio: { type: 'number' },
    break_even_units: { type: 'number' }, break_even_revenue: { type: 'number' },
    target_profit: { type: 'number' }, target_profit_units: { type: 'number' }, target_profit_revenue: { type: 'number' },
    current_units: { type: ['number', 'null'] }, margin_of_safety_units: { type: ['number', 'null'] }, margin_of_safety_percent: { type: ['number', 'null'] },
  },
};
const RevenueCore = {
  type: 'object',
  required: ['fixed_costs', 'contribution_margin_ratio', 'break_even_revenue', 'target_profit', 'target_profit_revenue', 'current_revenue', 'margin_of_safety_revenue', 'margin_of_safety_percent'],
  properties: {
    fixed_costs: { type: 'number' }, contribution_margin_ratio: { type: 'number' },
    break_even_revenue: { type: 'number' }, target_profit: { type: 'number' }, target_profit_revenue: { type: 'number' },
    current_revenue: { type: ['number', 'null'] }, margin_of_safety_revenue: { type: ['number', 'null'] }, margin_of_safety_percent: { type: ['number', 'null'] },
  },
};

const UnitsRequest = {
  type: 'object', required: ['fixed_costs', 'price_per_unit', 'variable_cost_per_unit'], additionalProperties: false,
  properties: {
    fixed_costs: { type: 'number', minimum: 0 }, price_per_unit: { type: 'number', exclusiveMinimum: 0 }, variable_cost_per_unit: { type: 'number', minimum: 0 },
    target_profit: { type: 'number', minimum: 0, description: 'Desired profit above break-even (default 0).' },
    current_units: { type: 'number', minimum: 0, description: 'Current/expected unit volume; enables margin-of-safety.' },
  },
};
const RevenueRequest = {
  type: 'object', required: ['fixed_costs', 'contribution_margin_ratio'], additionalProperties: false,
  properties: {
    fixed_costs: { type: 'number', minimum: 0 },
    contribution_margin_ratio: { type: 'number', exclusiveMinimum: 0, maximum: 1, description: 'Contribution margin as a fraction of revenue, in (0, 1].' },
    target_profit: { type: 'number', minimum: 0 },
    current_revenue: { type: 'number', minimum: 0, description: 'Current/expected revenue; enables margin-of-safety.' },
  },
};

const unitsReq = { fixed_costs: 50000, price_per_unit: 40, variable_cost_per_unit: 25, target_profit: 20000, current_units: 5000 };
const revenueReq = { fixed_costs: 50000, contribution_margin_ratio: 0.375, current_revenue: 200000 };
const lookupReq = { fixed_costs: 50000, price_per_unit: 40, variable_cost_per_unit: 25, target_profit: 20000, current_units: 5000 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('units', 'revenue', 'target_profit'), _Tail: TailFinance,
  UnitsCore, RevenueCore, UnitsRequest, RevenueRequest, DiscoveryResponse: discoverySchemaPlus(),
  UnitsResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/UnitsCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  RevenueResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RevenueCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/UnitsCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/units', summary: 'Unit-based break-even + contribution margin', operationId: 'units', priceUsdc: 0.007, requestSchemaRef: 'UnitsRequest', responseSchemaRef: 'UnitsResponse', requestExample: unitsReq, responseExample: unitsExample },
  { method: 'post', path: '/revenue', summary: 'Ratio-based break-even revenue', operationId: 'revenue', priceUsdc: 0.006, requestSchemaRef: 'RevenueRequest', responseSchemaRef: 'RevenueResponse', requestExample: revenueReq, responseExample: revenueExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL full CVP analysis + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true, requestSchemaRef: 'UnitsRequest', responseSchemaRef: 'LookupResponse', requestExample: lookupReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'break-even', title: 'Break-Even Analysis API', version: '1.0.0',
  description: 'Deterministic cost-volume-profit / break-even analysis (units, revenue, contribution margin, target profit, margin of safety). No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-financial-calculation': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
