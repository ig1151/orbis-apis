import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { convertExample, contrastExample, suggestExample, lookupExample } from './examples';

const RgbObject = { type: 'object', required: ['r', 'g', 'b', 'a'], additionalProperties: false, properties: { r: { type: 'integer', minimum: 0, maximum: 255 }, g: { type: 'integer', minimum: 0, maximum: 255 }, b: { type: 'integer', minimum: 0, maximum: 255 }, a: { type: 'number', minimum: 0, maximum: 1 } } };
const HslObject = { type: 'object', required: ['h', 's', 'l'], additionalProperties: false, properties: { h: { type: 'integer' }, s: { type: 'integer' }, l: { type: 'integer' } } };
const HsvObject = { type: 'object', required: ['h', 's', 'v'], additionalProperties: false, properties: { h: { type: 'integer' }, s: { type: 'integer' }, v: { type: 'integer' } } };
const ColorForms = {
  type: 'object',
  required: ['hex', 'hex8', 'rgb', 'rgba', 'hsl', 'hsv', 'rgb_object', 'hsl_object', 'hsv_object', 'relative_luminance'],
  additionalProperties: false,
  properties: {
    hex: { type: 'string' }, hex8: { type: 'string' }, rgb: { type: 'string' }, rgba: { type: 'string' },
    hsl: { type: 'string' }, hsv: { type: 'string' },
    rgb_object: RgbObject, hsl_object: HslObject, hsv_object: HsvObject,
    relative_luminance: { type: 'number', minimum: 0, maximum: 1 },
  },
};
const ConvertCore = {
  type: 'object', required: ['input', 'matched_format', 'color'],
  properties: { input: { type: 'string' }, matched_format: { type: 'string', enum: ['hex', 'rgb', 'hsl', 'named'] }, color: ColorForms },
};
const ContrastCore = {
  type: 'object', required: ['foreground', 'background', 'contrast_ratio', 'passes', 'highest_level'],
  properties: {
    foreground: { type: 'string' }, background: { type: 'string' },
    contrast_ratio: { type: 'number', minimum: 1 },
    passes: { type: 'object', required: ['aa_normal', 'aa_large', 'aaa_normal', 'aaa_large'], additionalProperties: false, properties: { aa_normal: { type: 'boolean' }, aa_large: { type: 'boolean' }, aaa_normal: { type: 'boolean' }, aaa_large: { type: 'boolean' } } },
    highest_level: { type: 'string' },
  },
};
const ConvertRequest = { type: 'object', required: ['color'], additionalProperties: false, properties: { color: { type: 'string', description: 'A hex, rgb()/rgba(), hsl()/hsla(), or CSS named color.' } } };
const ContrastRequest = { type: 'object', required: ['foreground', 'background'], additionalProperties: false, properties: { foreground: { type: 'string' }, background: { type: 'string' } } };
const SuggestRequest = {
  type: 'object', required: ['foreground', 'background'], additionalProperties: false,
  properties: {
    foreground: { type: 'string' }, background: { type: 'string' },
    level: { type: 'string', enum: ['AA', 'AAA'], description: 'WCAG target level (default AA).' },
    text_size: { type: 'string', enum: ['normal', 'large'], description: 'Text size class (default normal).' },
  },
};
const SuggestCore = {
  type: 'object',
  required: ['foreground', 'background', 'level', 'text_size', 'target_ratio', 'original_ratio', 'meets_target', 'adjusted', 'direction', 'recommended_foreground', 'recommended_ratio', 'recommended_meets_target'],
  properties: {
    foreground: { type: 'string' }, background: { type: 'string' },
    level: { type: 'string', enum: ['AA', 'AAA'] }, text_size: { type: 'string', enum: ['normal', 'large'] },
    target_ratio: { type: 'number' }, original_ratio: { type: 'number' }, meets_target: { type: 'boolean' },
    adjusted: { type: 'boolean' }, direction: { type: 'string', enum: ['none', 'darker', 'lighter'] },
    recommended_foreground: { type: 'string' }, recommended_ratio: { type: 'number' }, recommended_meets_target: { type: 'boolean' },
  },
};

const convertReq = { color: 'hsl(204, 70%, 53%)' };
const contrastReq = { foreground: '#777777', background: '#ffffff' };
const suggestReq = { foreground: '#9bbcd6', background: '#ffffff', level: 'AA', text_size: 'normal' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('parse', 'conversion', 'contrast'), _Tail: Tail,
  RgbObject, HslObject, HsvObject, ColorForms, ConvertCore, ContrastCore, SuggestCore, ConvertRequest, ContrastRequest, SuggestRequest, DiscoveryResponse: discoverySchemaPlus(),
  ConvertResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ConvertCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  ContrastResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ContrastCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  SuggestResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SuggestCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ConvertCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const disc = {
  name: 'Color Converter API', version: '1.0.0',
  description: 'Deterministic color converter & WCAG contrast checker. /convert parses a hex, rgb(), hsl(), or CSS named color and emits every representation plus relative luminance; /contrast computes the WCAG 2.1 contrast ratio between two colors with AA/AAA pass/fail. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/color-converter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['color_conversion', 'wcag_contrast', 'accessibility_remediation', 'relative_luminance'],
  endpoints: [
    { method: 'POST', path: '/convert', summary: 'Parse a color and emit all representations', price_usdc: 0.006 },
    { method: 'POST', path: '/contrast', summary: 'WCAG 2.1 contrast ratio + AA/AAA pass/fail', price_usdc: 0.007 },
    { method: 'POST', path: '/suggest-accessible', summary: 'Recommend an accessible foreground (AA/AAA)', price_usdc: 0.009 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL convert + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/convert', price_usdc: 0.006, currency: 'USDC' },
    { path: '/contrast', price_usdc: 0.007, currency: 'USDC' },
    { path: '/suggest-accessible', price_usdc: 0.009, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/convert', summary: 'Parse a color and emit all representations', operationId: 'convert', priceUsdc: 0.006, requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'ConvertResponse', requestExample: convertReq, responseExample: convertExample },
  { method: 'post', path: '/contrast', summary: 'WCAG 2.1 contrast ratio + AA/AAA pass/fail', operationId: 'contrast', priceUsdc: 0.007, requestSchemaRef: 'ContrastRequest', responseSchemaRef: 'ContrastResponse', requestExample: contrastReq, responseExample: contrastExample },
  { method: 'post', path: '/suggest-accessible', summary: 'Recommend an accessible foreground (AA/AAA)', operationId: 'suggestAccessible', priceUsdc: 0.009, requestSchemaRef: 'SuggestRequest', responseSchemaRef: 'SuggestResponse', requestExample: suggestReq, responseExample: suggestExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL convert + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true, requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'LookupResponse', requestExample: convertReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'color-converter', title: 'Color Converter API', version: '1.0.0',
  description: 'Deterministic color converter & WCAG contrast checker — hex/rgb/hsl/hsv + CSS named colors, relative luminance, AA/AAA contrast. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
