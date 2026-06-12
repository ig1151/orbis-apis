import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const EnvIssue = {
  type: 'object', required: ['key', 'line', 'code', 'message'], additionalProperties: false,
  properties: { key: { type: ['string', 'null'] }, line: { type: 'integer', minimum: 0 }, code: { type: 'string' }, message: { type: 'string' } },
};
const ValidateCore = {
  type: 'object',
  required: ['valid', 'checked_against_schema', 'keys', 'parsed_count', 'errors', 'warnings', 'missing_required', 'unknown_keys'],
  properties: {
    valid: { type: 'boolean' }, checked_against_schema: { type: 'boolean' },
    keys: { type: 'array', items: { type: 'string' } }, parsed_count: { type: 'integer', minimum: 0 },
    errors: { type: 'array', items: EnvIssue }, warnings: { type: 'array', items: EnvIssue },
    missing_required: { type: 'array', items: { type: 'string' } }, unknown_keys: { type: 'array', items: { type: 'string' } },
  },
};
const Rule = {
  type: 'object', additionalProperties: false,
  properties: {
    required: { type: 'boolean' },
    type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'url', 'email', 'port'] },
    allowed: { type: 'array' }, pattern: { type: 'string' },
  },
};
const ValidateRequest = {
  type: 'object', required: ['env'], additionalProperties: false,
  properties: {
    env: { type: 'string', description: 'dotenv file contents.' },
    schema: { type: 'object', additionalProperties: Rule, description: 'Optional KEY → rule map (required/type/allowed/pattern).' },
  },
};

const CORE = {
  valid: false, checked_against_schema: true,
  keys: ['PORT', 'DEBUG', 'DATABASE_URL', 'BAD KEY'], parsed_count: 4,
  errors: [
    { key: 'API_KEY', line: 0, code: 'MISSING_REQUIRED', message: 'Required key is not defined.' },
    { key: 'DEBUG', line: 2, code: 'TYPE_MISMATCH', message: 'Value is not a valid boolean.' },
    { key: 'BAD KEY', line: 5, code: 'INVALID_KEY', message: 'Key must match [A-Za-z_][A-Za-z0-9_]* (no spaces, dashes, or leading digits).' },
  ],
  warnings: [
    { key: 'DATABASE_URL', line: 3, code: 'UNKNOWN_KEY', message: 'Key is not declared in the schema.' },
    { key: 'BAD KEY', line: 5, code: 'UNKNOWN_KEY', message: 'Key is not declared in the schema.' },
  ],
  missing_required: ['API_KEY'], unknown_keys: ['DATABASE_URL', 'BAD KEY'],
};
const CHAIN = [
  { api: 'secret-scanner', reason: 'Scan the same .env for leaked credentials before committing.' },
  { api: 'dockerfile-linter', reason: 'Ensure these values are injected at runtime, not baked into the image.' },
];
const INVALIDATORS = [
  'Validation is structural/schema-based; it cannot confirm a value is correct for your application (a well-formed URL may still point at the wrong host).',
  'Without a schema, only format checks run — required/typed validation needs you to declare the schema.',
  'Parsing follows common dotenv conventions; exotic interpolation or multiline values may not be handled.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { validation: 1 },
  recommended_actions_priority_order: [
    '3 error(s) — fix first: MISSING_REQUIRED on API_KEY.',
    'Add missing required key(s): API_KEY.',
    'Re-validate before deploying; never commit real secret values.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('validation'), _Tail: Tail,
  EnvIssue, Rule, ValidateCore, ValidateRequest, DiscoveryResponse: discoverySchema(),
  ValidateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidateCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidateCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'env-1780000000000', request_id: 'env-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { env: 'PORT=8080\nDEBUG=maybe\nDATABASE_URL=postgres://localhost/db\n# comment\nBAD KEY=1', schema: { PORT: { type: 'port', required: true }, DEBUG: { type: 'boolean' }, API_KEY: { required: true } } };
const disc = {
  name: 'Env Validator API', version: '1.0.0',
  description: 'Deterministic .env validator. Parses dotenv text and reports format issues (malformed lines, invalid keys, duplicates, empty/unquoted values); with an optional schema it checks required keys, types, allowed sets, and patterns. Returns key names only — never echoes values. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/env-validator/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/validate', summary: 'Validate .env contents', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL validate + reasoning', price_usdc: 0.009 },
  ],
  pricing: [
    { path: '/validate', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/validate', summary: 'Validate .env contents', operationId: 'validate', priceUsdc: 0.005,
    requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'ValidateResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL validate + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true,
    requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '4 assignment(s) parsed; 3 error(s), 2 warning(s) → valid=false.',
        key_factors: ['Checked against schema: true.', 'Missing required: API_KEY.', 'Unknown keys: DATABASE_URL, BAD KEY.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'env-validator', title: 'Env Validator API', version: '1.0.0',
  description: 'Deterministic .env validator. Parses dotenv text and reports format issues; with an optional schema it checks required keys, types, allowed sets, and patterns. Returns key names only — never echoes values. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-rubric': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
