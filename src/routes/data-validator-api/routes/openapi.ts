import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, ConfidencePerSection, Tail, discoverySchema } from '../../_aplus/specparts';

const TYPE_ENUM = ['luhn', 'iban', 'isbn', 'ean', 'routing', 'e164', 'email', 'json'];

const Check = {
  type: 'object', required: ['type', 'valid', 'normalized', 'reason'], additionalProperties: false,
  properties: {
    type: { type: 'string', enum: TYPE_ENUM },
    valid: { type: 'boolean' },
    normalized: { type: ['string', 'null'], description: 'Canonical form when valid (digits-only card, upper-cased IBAN, lower-cased email, re-serialized JSON); null when invalid.' },
    reason: { type: 'string' },
  },
};

const ValidatorCore = {
  type: 'object',
  required: ['requested_type', 'detected_type', 'type', 'valid', 'normalized', 'reason'],
  properties: {
    requested_type: { type: 'string', enum: [...TYPE_ENUM, 'auto'] },
    detected_type: { type: 'string', enum: TYPE_ENUM },
    type: { type: 'string', enum: TYPE_ENUM, description: 'The format actually validated against.' },
    valid: { type: 'boolean' },
    normalized: { type: ['string', 'null'] },
    reason: { type: 'string' },
  },
};

const ValidatorRequest = {
  type: 'object', required: ['value'], additionalProperties: false,
  properties: {
    value: { type: 'string', description: 'The value to validate (card, IBAN, ISBN, GTIN, routing #, phone, email, or JSON text).' },
    type: { type: 'string', enum: [...TYPE_ENUM, 'auto'], default: 'auto', description: 'Format to check; "auto" (default) detects the most likely format.' },
  },
};

const REQ_EXAMPLE = { value: '4242 4242 4242 4242', type: 'luhn' };
const CORE_EXAMPLE = { requested_type: 'luhn', detected_type: 'luhn', type: 'luhn', valid: true, normalized: '4242424242424242', reason: 'Passes the Luhn checksum.' };
const TAIL_EXAMPLE = {
  confidence_score: 1, confidence_per_section: { checksum: 1, syntax: 1 },
  recommended_actions_priority_order: ['Value passes luhn validation (normalized: 4242424242424242).', 'Safe to accept; no further format check needed.'],
  chain_to: [
    { api: 'email-syntax-validator', reason: 'Deeper email deliverability checks (MX, disposable, role-based) beyond syntax.' },
    { api: 'phone-validation', reason: 'Carrier / line-type lookup once an E.164 number passes the syntax gate.' },
    { api: 'json-schema-validator', reason: 'Validate parsed JSON against a JSON Schema, not just parseability.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection, _Tail: Tail, Check, ValidatorCore, ValidatorRequest,
  DiscoveryResponse: discoverySchema(),
  ValidateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidatorCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidatorCore' },
      { type: 'object', required: ['also_valid_as', 'all_checks', 'reasoning'], properties: { also_valid_as: { type: 'array', items: { type: 'string', enum: TYPE_ENUM } }, all_checks: { type: 'array', items: { $ref: '#/components/schemas/Check' } }, reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/validate', summary: 'Validate a value against one format (or auto-detect)', operationId: 'validate', priceUsdc: 0.005,
    requestSchemaRef: 'ValidatorRequest', responseSchemaRef: 'ValidateResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'dv1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL validate + detected type + reasoning', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'ValidatorRequest', responseSchemaRef: 'LookupResponse', requestExample: { value: '4242 4242 4242 4242' },
    responseExample: {
      trace_id: 'dv2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0,
      requested_type: 'auto', detected_type: 'luhn', type: 'luhn', valid: true, normalized: '4242424242424242', reason: 'Passes the Luhn checksum.',
      also_valid_as: [],
      all_checks: [
        { type: 'luhn', valid: true, normalized: '4242424242424242', reason: 'Passes the Luhn checksum.' },
        { type: 'iban', valid: false, normalized: null, reason: 'Not a well-formed IBAN (2-letter country, 2 check digits, then alphanumerics).' },
        { type: 'isbn', valid: false, normalized: null, reason: 'An ISBN must be 10 (digits + optional X) or 13 digits.' },
        { type: 'ean', valid: false, normalized: null, reason: 'A GTIN must be 8 (EAN-8), 12 (UPC-A), or 13 (EAN-13) digits.' },
        { type: 'routing', valid: false, normalized: null, reason: 'A US ABA routing number must be 9 digits.' },
        { type: 'e164', valid: false, normalized: null, reason: 'Must start with + and a country code, 7–15 digits total, no leading zero.' },
        { type: 'email', valid: false, normalized: null, reason: 'Not a syntactically valid email address.' },
        { type: 'json', valid: false, normalized: null, reason: 'Invalid JSON: Unexpected non-whitespace character after JSON at position 5' },
      ],
      reasoning: { why_result_generated: 'Validated "4242 4242 4242 4242" as luhn: Passes the Luhn checksum.', key_factors: ['Type auto-detected as luhn.', 'Result: VALID.', 'Does not satisfy any other format.'], invalidators: ['Syntax/checksum validity does not guarantee the value exists or is in service (e.g. a Luhn-valid card may be unissued; email syntax ≠ deliverable).', 'IBAN here checks mod-97 only, not per-country length tables.', 'Editing any character can flip the checksum result.'] },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-validator', title: 'Data Validator API', version: '1.0.0',
  description: 'Deterministic data-format validator: Luhn (card), IBAN (mod-97), ISBN-10/13, EAN/UPC GTIN, US ABA routing number, E.164 phone, email syntax, and JSON parse. Real checksum/syntax algorithms — never an LLM. Invalid input returns {valid:false, reason}, never an error.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
