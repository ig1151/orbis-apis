import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { WORDS } from './wordlist';

const LIST_SIZE = WORDS.length;

const PassphraseCore = {
  type: 'object',
  required: ['passphrases', 'count', 'words', 'separator', 'capitalize', 'include_number', 'list_size', 'entropy_bits_per_word', 'entropy_bits', 'strength'],
  properties: {
    passphrases: { type: 'array', items: { type: 'string' } },
    count: { type: 'integer', minimum: 1 },
    words: { type: 'integer', minimum: 3, maximum: 20 },
    separator: { type: 'string', maxLength: 4 },
    capitalize: { type: 'boolean' }, include_number: { type: 'boolean' },
    list_size: { type: 'integer', minimum: 1 },
    entropy_bits_per_word: { type: 'number', minimum: 0 },
    entropy_bits: { type: 'number', minimum: 0 },
    strength: { type: 'string', enum: ['weak', 'fair', 'strong', 'very strong'] },
  },
};

const GenerateRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    words: { type: 'integer', minimum: 3, maximum: 20, description: 'Words per passphrase. Default 6.' },
    count: { type: 'integer', minimum: 1, maximum: 50, description: 'How many passphrases to generate. Default 1.' },
    separator: { type: 'string', maxLength: 4, description: 'Separator between words. Default "-".' },
    capitalize: { type: 'boolean', description: 'Capitalize each word (adds no entropy). Default false.' },
    include_number: { type: 'boolean', description: 'Append one random digit (+log2(10) bits). Default false.' },
  },
};

const CORE = {
  passphrases: ['wolf-gate-rust-moon-cake-vine'], count: 1, words: 6, separator: '-',
  capitalize: false, include_number: false, list_size: LIST_SIZE,
  entropy_bits_per_word: 9.3, entropy_bits: 55.8, strength: 'fair',
};
const ACTS = [
  'Use one of the 1 generated passphrase(s); each carries 55.8 bits of entropy (fair).',
  'Increase "words" (currently 6) to raise entropy — each word adds ~9.3 bits.',
  'Never reuse a passphrase across accounts, even a strong one.',
];
const CHAIN = [
  { api: 'password-strength-analyzer', reason: 'Score the chosen passphrase against attacker models before adopting it.' },
  { api: 'totp-hotp-generator', reason: 'Pair the passphrase with a TOTP second factor.' },
];
const INVALIDATORS = [
  `Entropy assumes uniform random selection from the ${LIST_SIZE}-word list; if you hand-pick or filter the output you lose entropy.`,
  'Capitalizing the first letter is a fixed transform and adds no entropy; only "words" and "include_number" change the bit count.',
  'A passphrase is only as safe as where you store and transmit it.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { strength: 1 },
  recommended_actions_priority_order: ACTS, chain_to: CHAIN,
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('strength'), _Tail: Tail,
  PassphraseCore, GenerateRequest, DiscoveryResponse: discoverySchema(),
  GenerateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/PassphraseCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/PassphraseCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'pgn-1780000000000', request_id: 'pgn-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { words: 6, separator: '-' };
const disc = {
  name: 'Passphrase Generator API', version: '1.0.0',
  description: `Diceware-style passphrase generator. Picks words uniformly at random from a curated ${LIST_SIZE}-word list using a CSPRNG, then reports the exact entropy (words × log2(list_size)). Generation is random; the entropy math is exact. No LLM, nothing stored.`,
  openapi_url: 'https://orbis-apis.onrender.com/passphrase-generator/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/generate', summary: 'Generate passphrase(s)', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL generate + reasoning', price_usdc: 0.008 },
  ],
  pricing: [
    { path: '/generate', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/generate', summary: 'Generate passphrase(s)', operationId: 'generate', priceUsdc: 0.004,
    requestSchemaRef: 'GenerateRequest', responseSchemaRef: 'GenerateResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL generate + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true,
    requestSchemaRef: 'GenerateRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: `6 words drawn uniformly from a ${LIST_SIZE}-word list → 55.8 bits (fair).`,
        key_factors: [`List size ${LIST_SIZE} → 9.3 bits/word.`, '6 words.', 'Separator "-", capitalize=false.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'passphrase-generator', title: 'Passphrase Generator API', version: '1.0.0',
  description: `Diceware-style passphrase generator. Picks words uniformly at random from a curated ${LIST_SIZE}-word list using a CSPRNG, then reports the exact entropy. Generation is random; the entropy math is exact. No LLM, nothing stored.`,
  endpoints, schemas, infoExtensions: { 'x-security-rubric': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
