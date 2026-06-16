import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { adviseExample, lookupExample } from './examples';

const LEVEL_ENUM = ['public', 'internal', 'confidential', 'restricted'];
const CATEGORY_ENUM = ['public', 'general', 'pii', 'financial', 'health', 'phi', 'pci', 'credentials', 'biometric'];
const FRAMEWORK_ENUM = ['gdpr', 'hipaa', 'pci-dss', 'ccpa', 'sox'];
const ENV_ENUM = ['cloud', 'on_prem', 'hybrid'];

const AtRest = {
  type: 'object', required: ['recommended', 'algorithm', 'key_bits', 'key_management', 'rotation_days'], additionalProperties: false,
  properties: {
    recommended: { type: 'boolean' },
    algorithm: { type: 'string' },
    key_bits: { type: 'integer' },
    key_management: { type: 'string' },
    rotation_days: { type: ['integer', 'null'] },
  },
};
const InTransit = {
  type: 'object', required: ['recommended', 'min_tls', 'mutual_tls'], additionalProperties: false,
  properties: { recommended: { type: 'boolean' }, min_tls: { type: 'string' }, mutual_tls: { type: 'boolean' } },
};
const FieldHandling = {
  type: 'object', required: ['category', 'technique'], additionalProperties: false,
  properties: { category: { type: 'string' }, technique: { type: 'string' } },
};
const ComplianceNote = {
  type: 'object', required: ['framework', 'note'], additionalProperties: false,
  properties: { framework: { type: 'string', enum: FRAMEWORK_ENUM }, note: { type: 'string' } },
};
const AdviceCore = {
  type: 'object', required: ['classification', 'sensitivity_score', 'categories', 'at_rest', 'in_transit', 'field_level', 'key_management', 'compliance_notes', 'additional_controls'],
  properties: {
    classification: { type: 'string', enum: LEVEL_ENUM },
    sensitivity_score: { type: 'integer', minimum: 0, maximum: 100 },
    categories: { type: 'array', items: { type: 'string' } },
    at_rest: AtRest,
    in_transit: InTransit,
    field_level: { type: 'array', items: FieldHandling },
    key_management: { type: 'array', items: { type: 'string' } },
    compliance_notes: { type: 'array', items: ComplianceNote },
    additional_controls: { type: 'array', items: { type: 'string' } },
  },
};
const AdviseRequest = {
  type: 'object', required: ['data_categories'], additionalProperties: false,
  properties: {
    data_categories: { type: 'array', minItems: 1, items: { type: 'string', enum: CATEGORY_ENUM }, description: 'Categories of data being protected.' },
    regulatory: { type: 'array', items: { type: 'string', enum: FRAMEWORK_ENUM }, description: 'Applicable regulatory frameworks (optional).' },
    environment: { type: 'string', enum: ENV_ENUM, description: 'Hosting environment (affects key-management guidance). Default cloud.' },
  },
};

const adviseReq = { data_categories: ['pii', 'pci', 'credentials'], regulatory: ['gdpr', 'pci-dss'], environment: 'cloud' };

const disc = {
  name: 'Data Encryption Advisor API', version: '1.0.0',
  description: 'Deterministic data-encryption advisor. Maps data categories + regulatory context + environment to an encryption rubric: classification, at-rest/in-transit recommendations, per-category field handling, key-management guidance, and compliance notes. Rule-based, advisory. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-encryption-advisor/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/advise', summary: 'Get an encryption rubric for the supplied data', price_usdc: 0.009 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL advice + reasoning', price_usdc: 0.016 },
  ],
  pricing: [
    { path: '/advise', price_usdc: 0.009, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.016, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('classification', 'recommendations'), _Tail: Tail,
  AtRest, InTransit, FieldHandling, ComplianceNote, AdviceCore, AdviseRequest, DiscoveryResponse: discoverySchema(),
  AdviseResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AdviceCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AdviceCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/advise', summary: 'Get an encryption rubric for the supplied data', operationId: 'advise', priceUsdc: 0.009, requestSchemaRef: 'AdviseRequest', responseSchemaRef: 'AdviseResponse', requestExample: adviseReq, responseExample: adviseExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL advice + reasoning', operationId: 'lookup', priceUsdc: 0.016, oneCall: true, requestSchemaRef: 'AdviseRequest', responseSchemaRef: 'LookupResponse', requestExample: adviseReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'data-encryption-advisor', title: 'Data Encryption Advisor API', version: '1.0.0',
  description: 'Deterministic data-encryption advisor — data categories + regulatory + environment → encryption rubric (classification, at-rest/in-transit, field-level, key-management, compliance notes). No LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
