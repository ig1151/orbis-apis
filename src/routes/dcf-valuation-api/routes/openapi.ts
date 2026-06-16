import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { valueExample, lookupExample } from './examples';

const DcfCore = {
  type: 'object',
  required: ['years', 'discount_rate_percent', 'terminal_growth_percent', 'pv_explicit', 'terminal_value', 'pv_terminal', 'enterprise_value', 'equity_value', 'value_per_share'],
  properties: {
    years: { type: 'integer', minimum: 1 }, discount_rate_percent: { type: 'number' }, terminal_growth_percent: { type: ['number', 'null'] },
    pv_explicit: { type: 'number' }, terminal_value: { type: 'number' }, pv_terminal: { type: 'number' }, enterprise_value: { type: 'number' },
    equity_value: { type: ['number', 'null'] }, value_per_share: { type: ['number', 'null'] },
  },
};
const SensitivityItem = { type: 'object', required: ['discount_rate_percent', 'enterprise_value'], additionalProperties: false, properties: { discount_rate_percent: { type: 'number' }, enterprise_value: { type: ['number', 'null'] } } };
const DcfRequest = {
  type: 'object', required: ['cashflows', 'discount_rate'], additionalProperties: false,
  properties: {
    cashflows: { type: 'array', minItems: 1, maxItems: 200, items: { type: 'number' }, description: 'Projected free cash flows, year 1..n.' },
    discount_rate: { type: 'number', description: 'Annual discount rate / WACC percent.' },
    terminal_growth_rate: { type: 'number', description: 'Annual Gordon-growth rate percent (must be < discount_rate). Omit for no terminal value.' },
    net_debt: { type: 'number', description: 'Optional — subtracted from EV for equity value.' },
    shares_outstanding: { type: 'number', exclusiveMinimum: 0, description: 'Optional — divides equity value for per-share value.' },
  },
};

const valueReq = { cashflows: [120, 135, 150, 165, 180], discount_rate: 10, terminal_growth_rate: 2.5, net_debt: 200, shares_outstanding: 100 };
const lookupReq = { cashflows: [120, 135, 150, 165, 180], discount_rate: 10, terminal_growth_rate: 2.5, net_debt: 200, shares_outstanding: 100 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('valuation'), _Tail: TailFinance,
  DcfCore, SensitivityItem, DcfRequest, DiscoveryResponse: discoverySchemaPlus(),
  ValueResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DcfCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DcfCore' },
      { type: 'object', required: ['discount_rate_sensitivity', 'reasoning'], properties: { discount_rate_sensitivity: { type: 'array', items: SensitivityItem }, reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const disc = {
  name: 'DCF Valuation API', version: '1.0.0',
  description: 'Deterministic discounted-cash-flow valuation. Discounts projected free cash flows (years 1..n) at a discount rate and adds an optional Gordon-growth terminal value; optionally nets debt and divides by shares for equity / per-share value. /lookup adds a discount-rate sensitivity grid. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/dcf-valuation/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['dcf', 'valuation', 'enterprise_value', 'terminal_value', 'equity_value'],
  endpoints: [
    { method: 'POST', path: '/value', summary: 'Enterprise / equity value from projected FCF', price_usdc: 0.01 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL valuation + sensitivity + reasoning', price_usdc: 0.016 },
  ],
  pricing: [
    { path: '/value', price_usdc: 0.01, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.016, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/value', summary: 'Enterprise / equity value from projected FCF', operationId: 'value', priceUsdc: 0.01, requestSchemaRef: 'DcfRequest', responseSchemaRef: 'ValueResponse', requestExample: valueReq, responseExample: valueExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL valuation + sensitivity + reasoning', operationId: 'lookup', priceUsdc: 0.016, oneCall: true, requestSchemaRef: 'DcfRequest', responseSchemaRef: 'LookupResponse', requestExample: lookupReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'dcf-valuation', title: 'DCF Valuation API', version: '1.0.0',
  description: 'Deterministic DCF valuation — PV of projected free cash flows + optional Gordon terminal value, equity & per-share value, discount-rate sensitivity. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
