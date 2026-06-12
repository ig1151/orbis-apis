import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const Charsets = {
  type: 'object',
  required: ['lowercase', 'uppercase', 'digits', 'symbols', 'other_unicode'],
  additionalProperties: false,
  properties: {
    lowercase: { type: 'boolean' }, uppercase: { type: 'boolean' }, digits: { type: 'boolean' },
    symbols: { type: 'boolean' }, other_unicode: { type: 'boolean' },
  },
};

const PwCore = {
  type: 'object',
  required: ['length', 'charset_pool_size', 'charsets', 'entropy_bits', 'guesses_log10', 'crack_times', 'score', 'strength', 'is_common_password', 'warnings', 'suggestions'],
  properties: {
    length: { type: 'integer', minimum: 0 },
    charset_pool_size: { type: 'integer', minimum: 0 },
    charsets: Charsets,
    entropy_bits: { type: 'number', minimum: 0 },
    guesses_log10: { type: 'number', minimum: 0 },
    crack_times: { type: 'object', additionalProperties: { type: 'string' } },
    score: { type: 'integer', minimum: 0, maximum: 4 },
    strength: { type: 'string', enum: ['very weak', 'weak', 'fair', 'strong', 'very strong'] },
    is_common_password: { type: 'boolean' },
    warnings: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
};

const AnalyzeRequest = {
  type: 'object', required: ['password'], additionalProperties: false,
  properties: {
    password: { type: 'string', minLength: 1, maxLength: 4096, description: 'The password to analyze. Never stored.' },
    user_inputs: { type: 'array', items: { type: 'string' }, description: 'Optional user-related strings (name, email, site) to penalize if contained.' },
  },
};

const CORE = {
  length: 8, charset_pool_size: 95,
  charsets: { lowercase: true, uppercase: true, digits: true, symbols: true, other_unicode: false },
  entropy_bits: 52.56, guesses_log10: 15.82,
  crack_times: {
    online_throttled_100_per_sec: 'effectively uncrackable',
    offline_slow_hash_1e4_per_sec: 'centuries',
    offline_fast_hash_1e10_per_sec: 'days',
  },
  score: 2, strength: 'fair', is_common_password: false,
  warnings: ['Shorter than 8 characters — length is the strongest lever on strength.'],
  suggestions: ['Increase length to 16+ characters (e.g. a passphrase) — the single most effective change.', 'Mix upper- and lower-case letters.'],
};
const ACTS = [
  'Strength: fair (score 2/4, 52.56 bits of charset entropy).',
  'Address: Shorter than 8 characters — length is the strongest lever on strength.',
  'Increase length to 16+ characters (e.g. a passphrase) — the single most effective change.',
  'A fast offline attacker (10^10 guesses/sec) needs days to exhaust the keyspace.',
];
const CHAIN = [
  { api: 'passphrase-generator', reason: 'Generate a high-entropy replacement passphrase if this password scores low.' },
  { api: 'secret-scanner', reason: 'Check that this password is not hard-coded or leaked in your codebase.' },
];
const INVALIDATORS = [
  'Entropy here is the brute-force charset search space (length × log2(pool)); it does NOT model dictionary, keyboard-walk, or leaked-password attacks, so a high-entropy-looking password can still be weak if it is a known/leaked phrase.',
  'Crack times assume the stated guesses/sec and that the attacker knows the exact character pool; a slower KDF (bcrypt/argon2) or rate-limiting changes them dramatically.',
  'Common-password detection uses a tiny built-in list, not a full breach corpus.',
];
const TAIL = {
  confidence_score: 0.9, confidence_per_section: { strength: 0.9, crack_time: 0.8 },
  recommended_actions_priority_order: ACTS, chain_to: CHAIN,
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('strength', 'crack_time'), _Tail: Tail,
  Charsets, PwCore, AnalyzeRequest, DiscoveryResponse: discoverySchema(),
  AnalyzeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/PwCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/PwCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'pwa-1780000000000', request_id: 'pwa-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { password: 'Tk9$mWp2' };
const disc = {
  name: 'Password Strength Analyzer API', version: '1.0.0',
  description: 'Deterministic password-strength analyzer. Computes the character-set search space, charset entropy (length × log2(pool)), guess counts, and crack-time estimates under stated attacker speeds, plus advisory warnings and suggestions. The password is never stored. No LLM.',
  openapi_url: 'https://orbis-apis.onrender.com/password-strength-analyzer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/analyze', summary: 'Analyze password strength', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL analysis + reasoning', price_usdc: 0.008 },
  ],
  pricing: [
    { path: '/analyze', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/analyze', summary: 'Analyze password strength', operationId: 'analyze', priceUsdc: 0.004,
    requestSchemaRef: 'AnalyzeRequest', responseSchemaRef: 'AnalyzeResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL analysis + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'AnalyzeRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '8-char password over a 95-symbol pool → 52.56 bits → score 2/4 (fair).',
        key_factors: ['Pool 95 from charsets: lowercase, uppercase, digits, symbols.', 'Entropy 52.56 bits (~10^15.82 guesses).', '1 warning(s).'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'password-strength-analyzer', title: 'Password Strength Analyzer API', version: '1.0.0',
  description: 'Deterministic password-strength analyzer. Computes the character-set search space, charset entropy (length × log2(pool)), guess counts, and crack-time estimates under stated attacker speeds, plus advisory warnings and suggestions. The password is never stored. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-rubric': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
