import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { npvExample, irrExample, lookupExample } from './examples';

const NpvCore = {
  type: 'object', required: ['rate_percent', 'period_count', 'cashflow_total', 'npv'],
  properties: { rate_percent: { type: 'number' }, period_count: { type: 'integer', minimum: 0 }, cashflow_total: { type: 'number' }, npv: { type: 'number' } },
};
const IrrCore = {
  type: 'object', required: ['period_count', 'cashflow_total', 'irr_percent', 'converged', 'npv_at_irr', 'sign_changes'],
  properties: {
    period_count: { type: 'integer', minimum: 0 }, cashflow_total: { type: 'number' },
    irr_percent: { type: ['number', 'null'], description: 'Per-period IRR percent, or null when none exists.' },
    converged: { type: 'boolean' }, npv_at_irr: { type: ['number', 'null'] }, sign_changes: { type: 'integer', minimum: 0 },
  },
};
const LookupCore = {
  type: 'object', required: ['period_count', 'cashflow_total', 'npv', 'rate_percent', 'irr_percent', 'converged', 'sign_changes'],
  properties: {
    period_count: { type: 'integer', minimum: 0 }, cashflow_total: { type: 'number' },
    npv: { type: ['number', 'null'] }, rate_percent: { type: ['number', 'null'] },
    irr_percent: { type: ['number', 'null'] }, converged: { type: 'boolean' }, sign_changes: { type: 'integer', minimum: 0 },
  },
};
const Cashflows = { type: 'array', minItems: 2, maxItems: 1200, items: { type: 'number' }, description: 'Cashflows by period; index 0 = today (t=0, not discounted).' };
const NpvRequest = { type: 'object', required: ['rate', 'cashflows'], additionalProperties: false, properties: { rate: { type: 'number', description: 'Discount rate as a per-period percent (e.g. 8 = 8%).' }, cashflows: Cashflows } };
const IrrRequest = { type: 'object', required: ['cashflows'], additionalProperties: false, properties: { cashflows: Cashflows } };
const LookupRequest = { type: 'object', required: ['cashflows'], additionalProperties: false, properties: { rate: { type: 'number', description: 'Optional per-period percent; when present, NPV is also returned.' }, cashflows: Cashflows } };

const npvReq = { rate: 8, cashflows: [-1000, 300, 400, 500, 300] };
const irrReq = { cashflows: [-1000, 300, 400, 500, 300] };
const lookupReq = { rate: 8, cashflows: [-1000, 300, 400, 500, 300] };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('npv', 'irr'), _Tail: TailFinance,
  NpvCore, IrrCore, LookupCore, NpvRequest, IrrRequest, LookupRequest, DiscoveryResponse: discoverySchemaPlus(),
  NpvResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/NpvCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  IrrResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/IrrCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LookupCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const disc = {
  name: 'NPV / IRR API', version: '1.0.0',
  description: 'Deterministic net-present-value and internal-rate-of-return calculator for a cashflow series. /npv discounts cashflows at a per-period rate; /irr solves the rate that zeroes NPV (bracket scan + bisection). Per-period rates, index 0 = today. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/npv-irr/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['npv', 'irr', 'cashflow_analysis', 'discounting', 'capital_budgeting'],
  typical_use_cases: ['Rank capital projects by NPV at the firm cost of capital', 'Compute the IRR of an investment cashflow series', 'Screen a lease-vs-buy or build-vs-defer decision'],
  endpoints: [
    { method: 'POST', path: '/npv', summary: 'Net present value at a per-period rate', price_usdc: 0.006 },
    { method: 'POST', path: '/irr', summary: 'Internal rate of return of a cashflow series', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL NPV + IRR + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/npv', price_usdc: 0.006, currency: 'USDC' },
    { path: '/irr', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/npv', summary: 'Net present value at a per-period rate', operationId: 'npv', priceUsdc: 0.006, requestSchemaRef: 'NpvRequest', responseSchemaRef: 'NpvResponse', requestExample: npvReq, responseExample: npvExample },
  { method: 'post', path: '/irr', summary: 'Internal rate of return of a cashflow series', operationId: 'irr', priceUsdc: 0.008, requestSchemaRef: 'IrrRequest', responseSchemaRef: 'IrrResponse', requestExample: irrReq, responseExample: irrExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL NPV + IRR + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true, requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse', requestExample: lookupReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'npv-irr', title: 'NPV / IRR API', version: '1.0.0',
  description: 'Deterministic NPV + IRR for a cashflow series — discount at a per-period rate, or solve the breakeven rate via bracket scan + bisection. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-financial-calculation': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
