import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { toJsonExample, toXmlExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const ToJsonCore = {
  type: 'object', required: ['json', 'source_length', 'root_elements', 'attributes_preserved'],
  properties: {
    json: { description: 'The parsed XML as a JSON value (object; attributes under the "@_" prefix).' },
    source_length: { type: 'integer', minimum: 0, description: 'Character length of the input XML.' },
    root_elements: { type: 'array', items: { type: 'string' }, description: 'Top-level element names (excluding the XML declaration).' },
    attributes_preserved: { type: 'boolean', description: 'Whether XML attributes were kept on the JSON side.' },
  },
};
const ToXmlCore = {
  type: 'object', required: ['xml', 'xml_length'],
  properties: {
    xml: { type: 'string', description: 'The JSON object serialized as XML.' },
    xml_length: { type: 'integer', minimum: 0, description: 'Character length of "xml".' },
  },
};

const ToJsonRequest = {
  type: 'object', required: ['xml'], additionalProperties: false,
  properties: {
    xml: { type: 'string', maxLength: 1000000, description: 'A well-formed XML document.' },
    preserve_attributes: { type: 'boolean', description: 'Keep XML attributes (prefixed "@_") in the JSON output. Default true.' },
  },
};
const ToXmlRequest = {
  type: 'object', required: ['json'], additionalProperties: false,
  properties: {
    json: { description: 'A JSON object (or a JSON string that parses to an object) to serialize as XML.' },
    format: { type: 'boolean', description: 'Pretty-print the XML with indentation. Default true.' },
  },
};

const toJsonReq = { xml: '<note id="1"><to>Ada</to><body>Hi</body></note>' };
const toXmlReq = { json: { note: { '@_id': '1', to: 'Ada', body: 'Hi' } } };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('conversion'), _Tail: Tail,
  ToJsonCore, ToXmlCore, ToJsonRequest, ToXmlRequest, DiscoveryResponse: discoverySchemaPlus(),
  ToJsonResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ToJsonCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  ToXmlResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ToXmlCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ToJsonCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/to-json', summary: 'Convert XML to JSON', operationId: 'toJson', priceUsdc: 0.006, requestSchemaRef: 'ToJsonRequest', responseSchemaRef: 'ToJsonResponse', requestExample: toJsonReq, responseExample: toJsonExample },
  { method: 'post', path: '/to-xml', summary: 'Convert a JSON object to XML', operationId: 'toXml', priceUsdc: 0.006, requestSchemaRef: 'ToXmlRequest', responseSchemaRef: 'ToXmlResponse', requestExample: toXmlReq, responseExample: toXmlExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL XML→JSON + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true, requestSchemaRef: 'ToJsonRequest', responseSchemaRef: 'LookupResponse', requestExample: toJsonReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'xml-json-converter', title: 'XML JSON Converter API', version: '1.0.0',
  description: 'Deterministic XML ⇄ JSON converter — validate + parse XML to JSON (attributes preserved) and serialize JSON objects back to XML. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
