import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const RadixCore = {
  type: 'object',
  required: ['from_base', 'to_base', 'output', 'output_upper', 'decimal', 'bit_length', 'digit_count', 'negative'],
  additionalProperties: false,
  properties: {
    from_base: { type: 'integer', minimum: 2, maximum: 36 }, to_base: { type: 'integer', minimum: 2, maximum: 36 },
    output: { type: 'string' }, output_upper: { type: 'string' }, decimal: { type: 'string' },
    bit_length: { type: 'integer', minimum: 0 }, digit_count: { type: 'integer', minimum: 1 }, negative: { type: 'boolean' },
  },
};
const ConvertRequest = {
  type: 'object', required: ['value', 'from_base', 'to_base'], additionalProperties: false,
  properties: {
    value: { oneOf: [{ type: 'string' }, { type: 'integer' }], description: 'Integer in the source base.' },
    from_base: { type: 'integer', minimum: 2, maximum: 36 }, to_base: { type: 'integer', minimum: 2, maximum: 36 },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('conversion'), _Tail: Tail,
  RadixCore, ConvertRequest, DiscoveryResponse: discoverySchema(),
  ConvertResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RadixCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RadixCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'rdx-1780000000000', request_id: 'rdx-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const CORE = { from_base: 16, to_base: 2, output: '11111111', output_upper: '11111111', decimal: '255', bit_length: 8, digit_count: 8, negative: false };
const CHAIN = [
  { api: 'base-codec', reason: 'Convert the underlying bytes between encodings (hex/base64/base58).' },
  { api: 'uuid-inspector', reason: 'If the value is a UUID rendered as a big integer, inspect its structure.' },
];
const INVALIDATORS = [
  'This converts integers only — fractional/decimal parts are not supported.',
  'Digit case is not significant on input (A–Z and a–z map to the same value); output is lowercase with an uppercase variant provided.',
  'Bases are limited to 2–36 because digits use 0–9 then a–z.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { conversion: 1 },
  recommended_actions_priority_order: [
    'Conversion is exact (BigInt) and lossless for integers of any size.',
    'Use the decimal field as a canonical key when comparing values expressed in different bases.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const disc = {
  name: 'Radix Converter API', version: '1.0.0',
  description: 'Deterministic integer radix converter. Parses an arbitrary-precision integer in a source base (2–36) and re-renders it in a target base, with decimal value, bit length, and digit count. BigInt, no precision loss. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/radix-converter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/convert', summary: 'Convert an integer between bases', price_usdc: 0.003 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL convert + reasoning', price_usdc: 0.006 },
  ],
  pricing: [
    { path: '/convert', price_usdc: 0.003, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.006, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const reqEx = { value: 'ff', from_base: 16, to_base: 2 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/convert', summary: 'Convert an integer between bases', operationId: 'convert', priceUsdc: 0.003,
    requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'ConvertResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL convert + reasoning', operationId: 'lookup', priceUsdc: 0.006, oneCall: true,
    requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Parsed a base-16 integer (decimal 255) and rendered it in base-2.',
        key_factors: ['Decimal value: 255.', 'Bit length: 8.', 'Output digits: 8.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'radix-converter', title: 'Radix Converter API', version: '1.0.0',
  description: 'Deterministic integer radix converter (bases 2–36) using BigInt. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
