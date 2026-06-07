import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';

const EnvelopeOk = {
  type: 'object', required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: {
    trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' },
    success: { type: 'boolean', enum: [true] }, latency_ms: { type: 'integer', minimum: 0 },
  },
};
const Tail = {
  type: 'object', required: ['confidence_score', 'recommended_actions_priority_order', 'chain_to', 'privacy'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    privacy: { $ref: '#/components/schemas/Privacy' },
  },
};
const Ratings = {
  type: 'object', required: ['aa_normal', 'aa_large', 'aaa_normal', 'aaa_large', 'highest_level'],
  additionalProperties: false,
  properties: {
    aa_normal: { type: 'boolean' }, aa_large: { type: 'boolean' },
    aaa_normal: { type: 'boolean' }, aaa_large: { type: 'boolean' },
    highest_level: { type: 'string', enum: ['AAA', 'AA', 'AA Large only', 'Fail'] },
  },
};
const ColorPair = {
  type: 'object', required: ['foreground', 'background'], additionalProperties: false,
  properties: { foreground: { type: 'string', example: '#777777' }, background: { type: 'string', example: '#FFFFFF' } },
};
const PaletteItem = {
  type: 'object', required: ['color', 'recommended_text_color', 'text_contrast_ratio', 'text_meets_aa'],
  additionalProperties: false,
  properties: {
    color: { type: 'string' }, recommended_text_color: { type: 'string', enum: ['#000000', '#FFFFFF'] },
    text_contrast_ratio: { type: 'number' }, text_meets_aa: { type: 'boolean' },
  },
};
const Alternative = {
  type: 'object', required: ['suggestion', 'resulting_ratio', 'meets_aa'], additionalProperties: false,
  properties: { suggestion: { type: 'string' }, resulting_ratio: { type: 'number' }, meets_aa: { type: 'boolean' } },
};

const schemas = {
  EnvelopeOk, Tail, Ratings, ColorPair, PaletteItem, Alternative,
  PaletteRequest: {
    type: 'object', required: ['colors'], additionalProperties: false,
    properties: { colors: { type: 'array', minItems: 1, maxItems: 50, items: { type: 'string' }, example: ['#1A2B3C', '#FFD700', '#0A0A0A'] } },
  },
  DiscoveryResponse: {
    type: 'object', required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'],
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: { type: 'object', required: ['type', 'header'], additionalProperties: false, properties: { type: { type: 'string' }, header: { type: 'string' } } },
      endpoints: { type: 'array', items: { type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false, properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
      pricing: { type: 'array', items: { type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false, properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } } } },
      x402_compatible: { type: 'boolean' },
    },
  },
  ContrastResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { type: 'object', required: ['input', 'contrast_ratio', 'ratings'], properties: { input: { $ref: '#/components/schemas/ColorPair' }, contrast_ratio: { type: 'number' }, ratings: { $ref: '#/components/schemas/Ratings' } } },
      { $ref: '#/components/schemas/Tail' },
    ],
  },
  PaletteResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { type: 'object', required: ['count', 'colors'], properties: { count: { type: 'integer' }, colors: { type: 'array', items: { $ref: '#/components/schemas/PaletteItem' } } } },
      { $ref: '#/components/schemas/Tail' },
    ],
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      {
        type: 'object', required: ['input', 'contrast_ratio', 'ratings', 'accessible_alternatives', 'reasoning'],
        properties: {
          input: { $ref: '#/components/schemas/ColorPair' }, contrast_ratio: { type: 'number' }, ratings: { $ref: '#/components/schemas/Ratings' },
          accessible_alternatives: { type: 'array', items: { $ref: '#/components/schemas/Alternative' } },
          reasoning: { $ref: '#/components/schemas/Reasoning' },
        },
      },
      { $ref: '#/components/schemas/Tail' },
    ],
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/contrast', summary: 'WCAG contrast ratio + AA/AAA pass-fail', operationId: 'contrast',
    priceUsdc: 0.001, requestSchemaRef: 'ColorPair', responseSchemaRef: 'ContrastResponse',
    requestExample: { foreground: '#777777', background: '#FFFFFF' },
    responseExample: {
      trace_id: 'c1-1780000000000', computed_at: '2026-06-07T19:30:00.000Z', success: true, latency_ms: 0,
      input: { foreground: '#777777', background: '#FFFFFF' }, contrast_ratio: 4.48,
      ratings: { aa_normal: false, aa_large: true, aaa_normal: false, aaa_large: false, highest_level: 'AA Large only' },
      confidence_score: 1.0, recommended_actions_priority_order: ['Fails AA for normal text — darken/lighten one color or reserve for large text only.'],
      chain_to: [], privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/palette', summary: 'Per-color best text color + contrast', operationId: 'palette',
    priceUsdc: 0.002, requestSchemaRef: 'PaletteRequest', responseSchemaRef: 'PaletteResponse',
    requestExample: { colors: ['#1A2B3C', '#FFD700', '#0A0A0A'] },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL contrast + ratings + accessible alternatives', operationId: 'lookup',
    priceUsdc: 0.003, requestSchemaRef: 'ColorPair', responseSchemaRef: 'LookupResponse',
    requestExample: { foreground: '#888888', background: '#FFFFFF' },
  },
];

const spec = buildAplusSpec({
  slug: 'color-contrast-evaluator',
  title: 'Color Palette Contrast Evaluator API',
  description: 'Deterministic WCAG 2.1 contrast evaluation: AA/AAA pass-fail for text pairs, per-color text recommendations across a palette, and accessible alternatives. Real luminance math; confidence always 1.0.',
  endpoints,
  schemas,
});

export default specRouter(spec);
