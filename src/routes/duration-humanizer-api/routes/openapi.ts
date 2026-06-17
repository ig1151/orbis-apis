import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { humanizeExample, parseExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const Part = {
  type: 'object', required: ['unit', 'long', 'value'], additionalProperties: false,
  properties: {
    unit: { type: 'string', enum: ['w', 'd', 'h', 'm', 's', 'ms'] },
    long: { type: 'string', enum: ['week', 'day', 'hour', 'minute', 'second', 'millisecond'] },
    value: { type: 'number', minimum: 0 },
  },
};
const HumanizeCore = {
  type: 'object', required: ['milliseconds', 'negative', 'humanized', 'compact', 'parts', 'largest_unit'],
  properties: {
    milliseconds: { type: 'integer' }, negative: { type: 'boolean' },
    humanized: { type: 'string', description: 'Long form, e.g. "1 hour 30 minutes".' },
    compact: { type: 'string', description: 'Short form, e.g. "1h 30m".' },
    parts: { type: 'array', items: Part },
    largest_unit: { type: ['string', 'null'], enum: ['w', 'd', 'h', 'm', 's', 'ms', null] },
  },
};
const ParseCore = {
  type: 'object', required: ['input', 'milliseconds', 'negative', 'parts'],
  properties: {
    input: { type: 'string' }, milliseconds: { type: 'number' }, negative: { type: 'boolean' },
    parts: { type: 'array', items: Part },
  },
};

const HumanizeRequest = {
  type: 'object', required: ['milliseconds'], additionalProperties: false,
  properties: {
    milliseconds: { type: 'integer', description: 'Duration in milliseconds (may be negative).' },
    max_units: { type: 'integer', minimum: 1, maximum: 6, description: 'Max number of components to emit (default 6).' },
  },
};
const ParseRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: { text: { type: 'string', minLength: 1, maxLength: 200, description: 'Duration string, e.g. "1h 30m" or "90s".' } },
};

const humanizeReq = { milliseconds: 93784000 };
const parseReq = { text: '1d 2h 3m 4s' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('conversion'), _Tail: Tail,
  Part, HumanizeCore, ParseCore, HumanizeRequest, ParseRequest, DiscoveryResponse: discoverySchemaPlus(),
  HumanizeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HumanizeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  ParseResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ParseCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HumanizeCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/humanize', summary: 'Milliseconds → human-readable duration', operationId: 'humanize', priceUsdc: 0.004, requestSchemaRef: 'HumanizeRequest', responseSchemaRef: 'HumanizeResponse', requestExample: humanizeReq, responseExample: humanizeExample },
  { method: 'post', path: '/parse', summary: 'Duration string → milliseconds', operationId: 'parse', priceUsdc: 0.005, requestSchemaRef: 'ParseRequest', responseSchemaRef: 'ParseResponse', requestExample: parseReq, responseExample: parseExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL humanize + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true, requestSchemaRef: 'HumanizeRequest', responseSchemaRef: 'LookupResponse', requestExample: humanizeReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'duration-humanizer', title: 'Duration Humanizer API', version: '1.0.0',
  description: 'Deterministic duration ⇄ text converter — milliseconds to "1h 30m" and back, structured breakdown, fixed unambiguous units. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
