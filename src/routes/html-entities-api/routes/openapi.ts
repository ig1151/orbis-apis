import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { encodeExample, decodeExample, lookupExample } from './examples';

const Mode = { type: 'string', enum: ['minimal', 'non_ascii'] };
const EncodeCore = {
  type: 'object', required: ['input', 'encoded', 'mode', 'numeric', 'replaced_count'],
  properties: {
    input: { type: 'string' }, encoded: { type: 'string' }, mode: Mode,
    numeric: { type: 'boolean', description: 'Whether HTML-special chars were emitted as numeric references.' },
    replaced_count: { type: 'integer', minimum: 0 },
  },
};
const DecodeCore = {
  type: 'object', required: ['input', 'decoded', 'replaced_count'],
  properties: { input: { type: 'string' }, decoded: { type: 'string' }, replaced_count: { type: 'integer', minimum: 0 } },
};

const EncodeRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: {
    text: { type: 'string', maxLength: 200000 },
    mode: { ...Mode, description: '"minimal" escapes only HTML-special chars; "non_ascii" also escapes every codepoint > 127 (default minimal).' },
    numeric: { type: 'boolean', description: 'Emit HTML-special chars as numeric references instead of named (default false).' },
  },
};
const DecodeRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: { text: { type: 'string', maxLength: 200000 } },
};

const encodeReq = { text: 'Tom & Jerry <3 "quotes" — café', mode: 'non_ascii' };
const decodeReq = { text: 'Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('encoding', 'decoding'), _Tail: Tail,
  Mode, EncodeCore, DecodeCore, EncodeRequest, DecodeRequest, DiscoveryResponse: discoverySchemaPlus(),
  EncodeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EncodeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  DecodeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DecodeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EncodeCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const disc = {
  name: 'HTML Entities API', version: '1.0.0',
  description: 'Deterministic HTML-entity encoder/decoder. /encode escapes HTML-special characters (and, in non_ascii mode, every non-ASCII codepoint as a numeric reference); /decode resolves numeric references and a curated set of named entities back to text. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/html-entities/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['html_encode', 'html_decode', 'numeric_references', 'named_entities', 'xss_safe_escaping'],
  endpoints: [
    { method: 'POST', path: '/encode', summary: 'Escape text to HTML entities', price_usdc: 0.004 },
    { method: 'POST', path: '/decode', summary: 'Resolve HTML entities back to text', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL encode + reasoning', price_usdc: 0.008 },
  ],
  pricing: [
    { path: '/encode', price_usdc: 0.004, currency: 'USDC' },
    { path: '/decode', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/encode', summary: 'Escape text to HTML entities', operationId: 'encode', priceUsdc: 0.004, requestSchemaRef: 'EncodeRequest', responseSchemaRef: 'EncodeResponse', requestExample: encodeReq, responseExample: encodeExample },
  { method: 'post', path: '/decode', summary: 'Resolve HTML entities back to text', operationId: 'decode', priceUsdc: 0.004, requestSchemaRef: 'DecodeRequest', responseSchemaRef: 'DecodeResponse', requestExample: decodeReq, responseExample: decodeExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL encode + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true, requestSchemaRef: 'EncodeRequest', responseSchemaRef: 'LookupResponse', requestExample: encodeReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'html-entities', title: 'HTML Entities API', version: '1.0.0',
  description: 'Deterministic HTML-entity encoder/decoder — escape HTML-special & non-ASCII characters, resolve numeric + named references back to text. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
