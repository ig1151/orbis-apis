import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { parseExample, buildExample, canonicalizeExample, lookupExample } from './examples';

const QueryValue = { type: ['string', 'array'], items: { type: 'string' }, description: 'A single value (string) or repeated values (array of strings).' };
const UrlComponents = {
  type: 'object',
  required: ['href', 'protocol', 'username', 'password', 'host', 'hostname', 'port', 'origin', 'pathname', 'path_segments', 'search', 'query', 'hash'],
  additionalProperties: false,
  properties: {
    href: { type: 'string' }, protocol: { type: 'string' }, username: { type: 'string' }, password: { type: 'string' },
    host: { type: 'string' }, hostname: { type: 'string' }, port: { type: 'string' }, origin: { type: 'string' },
    pathname: { type: 'string' }, path_segments: { type: 'array', items: { type: 'string' } },
    search: { type: 'string' }, query: { type: 'object', additionalProperties: QueryValue }, hash: { type: 'string' },
  },
};
const ParseCore = {
  type: 'object', required: ['input', 'components', 'normalized'],
  properties: { input: { type: 'string' }, components: UrlComponents, normalized: { type: 'string' } },
};
const BuildCore = {
  type: 'object', required: ['href', 'components'],
  properties: { href: { type: 'string' }, components: UrlComponents },
};
const ParseRequest = {
  type: 'object', required: ['url'], additionalProperties: false,
  properties: { url: { type: 'string', maxLength: 8192 }, base: { type: 'string', description: 'Base URL to resolve a relative "url" against.' } },
};
const BuildRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    base: { type: 'string', description: 'Full base URL to start from (alternative to protocol+hostname).' },
    protocol: { type: 'string' }, hostname: { type: 'string' }, port: { type: ['string', 'number'] },
    pathname: { type: 'string' }, hash: { type: 'string' }, username: { type: 'string' }, password: { type: 'string' },
    query: { type: 'object', additionalProperties: { type: ['string', 'number', 'boolean', 'array'], items: { type: ['string', 'number', 'boolean'] } }, description: 'Key → value or array of values.' },
  },
};

const CanonicalizeCore = {
  type: 'object', required: ['input', 'parsed_href', 'normalized', 'canonicalization_needed', 'changes'],
  properties: {
    input: { type: 'string' }, parsed_href: { type: 'string', description: 'The URL as parsed by the WHATWG parser.' },
    normalized: { type: 'string', description: 'The conservative canonical form (use as a dedup key).' },
    canonicalization_needed: { type: 'boolean', description: 'True when the canonical form differs from the raw input.' },
    changes: { type: 'array', items: { type: 'string', enum: ['host_lowercased', 'default_port_removed', 'query_sorted', 'parser_normalized'] }, description: 'Exact transformation steps that altered the URL.' },
  },
};
const CanonicalizeRequest = {
  type: 'object', required: ['url'], additionalProperties: false,
  properties: { url: { type: 'string', maxLength: 8192 }, base: { type: 'string', description: 'Base URL to resolve a relative "url" against.' } },
};

const parseReq = { url: 'https://user:pw@Example.com:443/a//b?z=2&a=1&a=3#frag' };
const buildReq = { protocol: 'https', hostname: 'api.example.com', pathname: '/v1/search', query: { q: 'agent native', page: 2, tag: ['a', 'b'] } };
const canonicalizeReq = { url: 'https://Example.com:443/path?b=2&a=1' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('parse', 'build', 'normalization'), _Tail: Tail,
  QueryValue, UrlComponents, ParseCore, BuildCore, CanonicalizeCore, ParseRequest, BuildRequest, CanonicalizeRequest, DiscoveryResponse: discoverySchemaPlus(),
  ParseResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ParseCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  BuildResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BuildCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  CanonicalizeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CanonicalizeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ParseCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const disc = {
  name: 'URL Tools API', version: '1.0.0',
  description: 'Deterministic URL parser / builder / normalizer on the WHATWG URL API. /parse decomposes a URL (query expanded to an object, repeated keys as arrays); /build assembles a URL from components over an optional base; /lookup parses and returns a normalized canonical form. No LLM, nothing fetched, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/url-tools/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['url_parsing', 'url_building', 'query_string_expansion', 'url_canonicalization'],
  endpoints: [
    { method: 'POST', path: '/parse', summary: 'Decompose a URL into components', price_usdc: 0.005 },
    { method: 'POST', path: '/build', summary: 'Assemble a URL from components', price_usdc: 0.006 },
    { method: 'POST', path: '/canonicalize', summary: 'Report exact canonicalization steps', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL parse + normalize + reasoning', price_usdc: 0.009 },
  ],
  pricing: [
    { path: '/parse', price_usdc: 0.005, currency: 'USDC' },
    { path: '/build', price_usdc: 0.006, currency: 'USDC' },
    { path: '/canonicalize', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/parse', summary: 'Decompose a URL into components', operationId: 'parse', priceUsdc: 0.005, requestSchemaRef: 'ParseRequest', responseSchemaRef: 'ParseResponse', requestExample: parseReq, responseExample: parseExample },
  { method: 'post', path: '/build', summary: 'Assemble a URL from components', operationId: 'build', priceUsdc: 0.006, requestSchemaRef: 'BuildRequest', responseSchemaRef: 'BuildResponse', requestExample: buildReq, responseExample: buildExample },
  { method: 'post', path: '/canonicalize', summary: 'Report exact canonicalization steps', operationId: 'canonicalize', priceUsdc: 0.007, requestSchemaRef: 'CanonicalizeRequest', responseSchemaRef: 'CanonicalizeResponse', requestExample: canonicalizeReq, responseExample: canonicalizeExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL parse + normalize + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true, requestSchemaRef: 'ParseRequest', responseSchemaRef: 'LookupResponse', requestExample: parseReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'url-tools', title: 'URL Tools API', version: '1.0.0',
  description: 'Deterministic URL parser / builder / normalizer on the WHATWG URL API — component decomposition, query expansion, component assembly, conservative canonical form. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
