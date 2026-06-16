import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { priceExample, yieldExample, lookupExample } from './examples';

const FREQ_ENUM = [1, 2, 4, 12];
const PriceCore = {
  type: 'object', required: ['face', 'coupon_rate', 'frequency', 'periods', 'yield_percent', 'price', 'current_yield_percent'],
  properties: { face: { type: 'number' }, coupon_rate: { type: 'number' }, frequency: { type: 'integer' }, periods: { type: 'integer' }, yield_percent: { type: 'number' }, price: { type: 'number' }, current_yield_percent: { type: 'number' } },
};
const YieldCore = {
  type: 'object', required: ['face', 'coupon_rate', 'frequency', 'periods', 'price', 'yield_to_maturity_percent', 'converged'],
  properties: { face: { type: 'number' }, coupon_rate: { type: 'number' }, frequency: { type: 'integer' }, periods: { type: 'integer' }, price: { type: 'number' }, yield_to_maturity_percent: { type: ['number', 'null'] }, converged: { type: 'boolean' } },
};
const LookupCore = {
  type: 'object', required: ['face', 'coupon_rate', 'frequency', 'periods', 'yield_percent', 'price', 'current_yield_percent', 'macaulay_duration_years', 'modified_duration_years', 'convexity_years2'],
  properties: {
    face: { type: 'number' }, coupon_rate: { type: 'number' }, frequency: { type: 'integer' }, periods: { type: 'integer' },
    yield_percent: { type: 'number' }, price: { type: 'number' }, current_yield_percent: { type: 'number' },
    macaulay_duration_years: { type: 'number' }, modified_duration_years: { type: 'number' }, convexity_years2: { type: 'number' },
  },
};
const BaseProps = {
  face: { type: 'number', exclusiveMinimum: 0, description: 'Par/face value (default 1000).' },
  coupon_rate: { type: 'number', minimum: 0, description: 'Annual coupon rate percent.' },
  years_to_maturity: { type: 'number', exclusiveMinimum: 0 },
  frequency: { type: 'integer', enum: FREQ_ENUM, description: 'Coupons per year (default 2).' },
};
const PriceRequest = { type: 'object', required: ['coupon_rate', 'years_to_maturity', 'yield_rate'], additionalProperties: false, properties: { ...BaseProps, yield_rate: { type: 'number', description: 'Annual yield percent to discount at.' } } };
const YieldRequest = { type: 'object', required: ['coupon_rate', 'years_to_maturity', 'price'], additionalProperties: false, properties: { ...BaseProps, price: { type: 'number', exclusiveMinimum: 0 } } };

const priceReq = { face: 1000, coupon_rate: 5, years_to_maturity: 10, frequency: 2, yield_rate: 6 };
const yieldReq = { face: 1000, coupon_rate: 5, years_to_maturity: 10, frequency: 2, price: 925.61 };
const lookupReq = { face: 1000, coupon_rate: 5, years_to_maturity: 10, frequency: 2, yield_rate: 6 };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('price', 'yield'), _Tail: TailFinance,
  PriceCore, YieldCore, LookupCore, PriceRequest, YieldRequest, DiscoveryResponse: discoverySchemaPlus(),
  PriceResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/PriceCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  YieldResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/YieldCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LookupCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const disc = {
  name: 'Bond Analytics API', version: '1.0.0',
  description: 'Deterministic fixed-coupon bond analytics. /price values a bond from its yield (+ current yield); /yield solves yield-to-maturity from a price; /lookup adds Macaulay & modified duration and convexity. Clean price on a coupon date. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/bond-analytics/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['bond_pricing', 'yield_to_maturity', 'duration', 'convexity', 'fixed_income'],
  endpoints: [
    { method: 'POST', path: '/price', summary: 'Bond price from yield', price_usdc: 0.008 },
    { method: 'POST', path: '/yield', summary: 'Yield to maturity from price', price_usdc: 0.01 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL price + duration/convexity + reasoning', price_usdc: 0.015 },
  ],
  pricing: [
    { path: '/price', price_usdc: 0.008, currency: 'USDC' },
    { path: '/yield', price_usdc: 0.01, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/price', summary: 'Bond price from yield', operationId: 'price', priceUsdc: 0.008, requestSchemaRef: 'PriceRequest', responseSchemaRef: 'PriceResponse', requestExample: priceReq, responseExample: priceExample },
  { method: 'post', path: '/yield', summary: 'Yield to maturity from price', operationId: 'yield', priceUsdc: 0.01, requestSchemaRef: 'YieldRequest', responseSchemaRef: 'YieldResponse', requestExample: yieldReq, responseExample: yieldExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL price + duration/convexity + reasoning', operationId: 'lookup', priceUsdc: 0.015, oneCall: true, requestSchemaRef: 'PriceRequest', responseSchemaRef: 'LookupResponse', requestExample: lookupReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'bond-analytics', title: 'Bond Analytics API', version: '1.0.0',
  description: 'Deterministic fixed-coupon bond price / yield-to-maturity / duration / convexity. Clean price on a coupon date. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
