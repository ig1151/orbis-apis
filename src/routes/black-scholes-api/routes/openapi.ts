import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections } from '../../_aplus/specparts';
import { TailFinance } from '../../_aplus/specparts-finance';
import { discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { priceExample, greeksExample, lookupExample } from './examples';

const Greeks = {
  type: 'object', required: ['delta', 'gamma', 'vega', 'theta', 'rho'], additionalProperties: false,
  properties: {
    delta: { type: 'number', description: 'Per $1 of spot.' }, gamma: { type: 'number', description: 'Per $1 of spot.' },
    vega: { type: 'number', description: 'Per +1% volatility.' }, theta: { type: 'number', description: 'Per calendar day.' }, rho: { type: 'number', description: 'Per +1% rate.' },
  },
};
const PriceCore = {
  type: 'object', required: ['type', 'price', 'd1', 'd2', 'intrinsic_value', 'time_value'],
  properties: { type: { type: 'string', enum: ['call', 'put'] }, price: { type: 'number' }, d1: { type: 'number' }, d2: { type: 'number' }, intrinsic_value: { type: 'number' }, time_value: { type: 'number' } },
};
const GreeksCore = {
  type: 'object', required: ['type', 'price', 'greeks'],
  properties: { type: { type: 'string', enum: ['call', 'put'] }, price: { type: 'number' }, greeks: Greeks },
};
const LookupCore = {
  type: 'object', required: ['type', 'price', 'd1', 'd2', 'intrinsic_value', 'time_value', 'greeks'],
  properties: { type: { type: 'string', enum: ['call', 'put'] }, price: { type: 'number' }, d1: { type: 'number' }, d2: { type: 'number' }, intrinsic_value: { type: 'number' }, time_value: { type: 'number' }, greeks: Greeks },
};
const BSRequest = {
  type: 'object', required: ['spot', 'strike', 'time_to_expiry_years', 'volatility', 'risk_free_rate', 'type'], additionalProperties: false,
  properties: {
    spot: { type: 'number', exclusiveMinimum: 0 }, strike: { type: 'number', exclusiveMinimum: 0 },
    time_to_expiry_years: { type: 'number', exclusiveMinimum: 0 },
    volatility: { type: 'number', exclusiveMinimum: 0, description: 'Annualized volatility percent (e.g. 20 = 20%).' },
    risk_free_rate: { type: 'number', description: 'Annual risk-free rate percent.' },
    dividend_yield: { type: 'number', description: 'Annual continuous dividend yield percent (default 0).' },
    type: { type: 'string', enum: ['call', 'put'] },
  },
};

const req = { spot: 100, strike: 105, time_to_expiry_years: 0.5, volatility: 20, risk_free_rate: 4, dividend_yield: 1, type: 'call' };

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('price', 'greeks'), _Tail: TailFinance,
  Greeks, PriceCore, GreeksCore, LookupCore, BSRequest, DiscoveryResponse: discoverySchemaPlus(),
  PriceResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/PriceCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  GreeksResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/GreeksCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LookupCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const disc = {
  name: 'Black-Scholes Option Pricing API', version: '1.0.0',
  description: 'Deterministic Black-Scholes-Merton European option pricing and greeks (with continuous dividend yield). /price returns the model price + d1/d2 + intrinsic/time value; /greeks returns delta, gamma, vega, theta, rho. Closed-form math — no LLM, nothing stored. Model value, not a market quote.',
  openapi_url: 'https://orbis-apis.onrender.com/black-scholes/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['option_pricing', 'black_scholes', 'option_greeks', 'derivatives', 'implied_value'],
  typical_use_cases: ['Price a European option from spot/strike/volatility/rate', 'Derive delta for a hedge ratio', 'Estimate theta decay and vega exposure of a position'],
  endpoints: [
    { method: 'POST', path: '/price', summary: 'Black-Scholes model price + d1/d2', price_usdc: 0.01 },
    { method: 'POST', path: '/greeks', summary: 'Delta, gamma, vega, theta, rho', price_usdc: 0.012 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL price + greeks + reasoning', price_usdc: 0.018 },
  ],
  pricing: [
    { path: '/price', price_usdc: 0.01, currency: 'USDC' },
    { path: '/greeks', price_usdc: 0.012, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.018, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/price', summary: 'Black-Scholes model price + d1/d2', operationId: 'price', priceUsdc: 0.01, requestSchemaRef: 'BSRequest', responseSchemaRef: 'PriceResponse', requestExample: req, responseExample: priceExample },
  { method: 'post', path: '/greeks', summary: 'Delta, gamma, vega, theta, rho', operationId: 'greeks', priceUsdc: 0.012, requestSchemaRef: 'BSRequest', responseSchemaRef: 'GreeksResponse', requestExample: req, responseExample: greeksExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL price + greeks + reasoning', operationId: 'lookup', priceUsdc: 0.018, oneCall: true, requestSchemaRef: 'BSRequest', responseSchemaRef: 'LookupResponse', requestExample: req, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'black-scholes', title: 'Black-Scholes Option Pricing API', version: '1.0.0',
  description: 'Deterministic Black-Scholes-Merton European option pricing + greeks (continuous dividend yield). Closed-form; model value, not a market quote. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-finance-tool': true, 'x-financial-calculation': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
