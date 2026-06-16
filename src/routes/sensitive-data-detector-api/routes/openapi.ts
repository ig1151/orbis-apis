import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { scanExample, lookupExample } from './examples';

const TYPE_ENUM = ['email', 'ssn', 'credit_card', 'phone', 'ipv4', 'ipv6'];

const Finding = {
  type: 'object', required: ['type', 'value', 'start', 'end'], additionalProperties: false,
  properties: {
    type: { type: 'string', enum: TYPE_ENUM },
    value: { type: 'string', description: 'The matched substring.' },
    start: { type: 'integer', minimum: 0 },
    end: { type: 'integer', minimum: 0 },
  },
};
const ScanCore = {
  type: 'object', required: ['text_length', 'has_pii', 'finding_count', 'counts_by_type', 'findings', 'redacted_text', 'risk_level'],
  properties: {
    text_length: { type: 'integer', minimum: 0 },
    has_pii: { type: 'boolean' },
    finding_count: { type: 'integer', minimum: 0 },
    counts_by_type: { type: 'object', additionalProperties: { type: 'integer', minimum: 0 }, description: 'Count of findings per PII type.' },
    findings: { type: 'array', items: Finding },
    redacted_text: { type: 'string', description: 'The input with detected spans masked.' },
    risk_level: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
  },
};
const ScanRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: {
    text: { type: 'string', description: 'Text to scan for sensitive data (≤200,000 chars).' },
    types: { type: 'array', items: { type: 'string', enum: TYPE_ENUM }, description: 'Restrict detection to these types (default: all).' },
    mask_style: { type: 'string', enum: ['label', 'stars', 'type'], description: 'Redaction style: "[REDACTED_EMAIL]" (label), "****" (stars), or "[EMAIL]" (type). Default label.' },
  },
};

const scanReq = {
  text: 'Contact Ada at ada@example.com or (555) 123-4567. SSN 123-45-6789, card 4111 1111 1111 1111, host 192.168.1.1.',
};

const disc = {
  name: 'Sensitive Data Detector API', version: '1.0.0',
  description: 'Deterministic PII detector. Finds emails, phone numbers, US SSNs, Luhn-validated credit-card numbers, and IPv4/IPv6 addresses in text using fixed regex rules, returning spans, counts, a redacted copy, and a heuristic risk level. No LLM, nothing fetched or stored.',
  openapi_url: 'https://orbis-apis.onrender.com/sensitive-data-detector/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/scan', summary: 'Detect & redact PII in text', price_usdc: 0.020 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL scan + reasoning', price_usdc: 0.035 },
  ],
  pricing: [
    { path: '/scan', price_usdc: 0.020, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.035, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('detection', 'classification', 'risk'), _Tail: Tail,
  Finding, ScanCore, ScanRequest, DiscoveryResponse: discoverySchema(),
  ScanResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScanCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScanCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/scan', summary: 'Detect & redact PII in text', operationId: 'scan', priceUsdc: 0.020, requestSchemaRef: 'ScanRequest', responseSchemaRef: 'ScanResponse', requestExample: scanReq, responseExample: scanExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL scan + reasoning', operationId: 'lookup', priceUsdc: 0.035, oneCall: true, requestSchemaRef: 'ScanRequest', responseSchemaRef: 'LookupResponse', requestExample: scanReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'sensitive-data-detector', title: 'Sensitive Data Detector API', version: '1.0.0',
  description: 'Deterministic PII detector — email/SSN/credit-card(Luhn)/phone/IPv4/IPv6 spans + counts + redacted text + risk level. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
