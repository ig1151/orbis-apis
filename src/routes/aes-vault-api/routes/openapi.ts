import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';

const EnvelopeOk = {
  type: 'object',
  required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: {
    trace_id: { type: 'string' },
    computed_at: { type: 'string', format: 'date-time' },
    success: { type: 'boolean', enum: [true] },
    latency_ms: { type: 'integer', minimum: 0 },
  },
};

const Tail = {
  type: 'object',
  required: ['confidence_score', 'recommended_actions_priority_order', 'chain_to', 'privacy'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    privacy: { $ref: '#/components/schemas/Privacy' },
  },
};

const GenerateKeyCore = {
  type: 'object', required: ['algorithm', 'key_bits', 'key_base64'],
  properties: {
    algorithm: { type: 'string', enum: ['aes-256-gcm'] },
    key_bits: { type: 'integer', enum: [256] },
    key_base64: { type: 'string', description: 'Base64-encoded 32-byte key.' },
  },
};

const EncryptCore = {
  type: 'object', required: ['algorithm', 'ciphertext_base64', 'iv_base64', 'auth_tag_base64'],
  properties: {
    algorithm: { type: 'string', enum: ['aes-256-gcm'] },
    ciphertext_base64: { type: 'string' },
    iv_base64: { type: 'string', description: 'Base64-encoded 12-byte IV.' },
    auth_tag_base64: { type: 'string', description: 'Base64-encoded 16-byte GCM auth tag.' },
  },
};

const DecryptCore = {
  type: 'object', required: ['algorithm', 'plaintext'],
  properties: {
    algorithm: { type: 'string', enum: ['aes-256-gcm'] },
    plaintext: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk,
  _Tail: Tail,
  GenerateKeyCore,
  EncryptCore,
  DecryptCore,
  EncryptRequest: {
    type: 'object', required: ['plaintext', 'key_base64'], additionalProperties: false,
    properties: {
      plaintext: { type: 'string', description: 'UTF-8 plaintext (max 256 KB).', example: 'hello agent' },
      key_base64: { type: 'string', description: 'Base64-encoded 32-byte key from /generate-key.' },
    },
  },
  DecryptRequest: {
    type: 'object', required: ['ciphertext_base64', 'iv_base64', 'auth_tag_base64', 'key_base64'], additionalProperties: false,
    properties: {
      ciphertext_base64: { type: 'string' },
      iv_base64: { type: 'string' },
      auth_tag_base64: { type: 'string' },
      key_base64: { type: 'string' },
    },
  },
  LookupRequest: {
    type: 'object', required: ['plaintext'], additionalProperties: false,
    properties: { plaintext: { type: 'string', description: 'UTF-8 plaintext (max 256 KB).', example: 'hello agent' } },
  },
  DiscoveryResponse: {
    type: 'object',
    required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'],
    additionalProperties: false,
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: {
        type: 'object', required: ['type', 'header'], additionalProperties: false,
        properties: { type: { type: 'string' }, header: { type: 'string' } },
      },
      endpoints: {
        type: 'array',
        items: {
          type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false,
          properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } },
        },
      },
      pricing: {
        type: 'array',
        items: {
          type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false,
          properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } },
        },
      },
      x402_compatible: { type: 'boolean' },
    },
  },
  GenerateKeyResponse: {
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/GenerateKeyCore' }, { $ref: '#/components/schemas/_Tail' }],
    unevaluatedProperties: false,
  },
  EncryptResponse: {
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EncryptCore' }, { $ref: '#/components/schemas/_Tail' }],
    unevaluatedProperties: false,
  },
  DecryptResponse: {
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DecryptCore' }, { $ref: '#/components/schemas/_Tail' }],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      {
        type: 'object',
        required: ['algorithm', 'key_bits', 'key_base64', 'ciphertext_base64', 'iv_base64', 'auth_tag_base64', 'reasoning'],
        properties: {
          algorithm: { type: 'string', enum: ['aes-256-gcm'] },
          key_bits: { type: 'integer', enum: [256] },
          key_base64: { type: 'string' },
          ciphertext_base64: { type: 'string' },
          iv_base64: { type: 'string' },
          auth_tag_base64: { type: 'string' },
          reasoning: { $ref: '#/components/schemas/Reasoning' },
        },
      },
      { $ref: '#/components/schemas/_Tail' },
    ],
    unevaluatedProperties: false,
  },
};

const KEY_EX = 'bXktMzItYnl0ZS1rZXktZXhhbXBsZS0xMjM0NTY3OA==';
const IV_EX = 'MTIzNDU2Nzg5MDEy';
const TAG_EX = 'YWJjZGVmZ2hpamtsbW5vcA==';
const CT_EX = 'q1Z3yQ==';

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/generate-key', summary: 'Generate a random 256-bit key', operationId: 'generateKey',
    priceUsdc: 0.002, responseSchemaRef: 'GenerateKeyResponse',
    responseExample: {
      trace_id: 'a1-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      algorithm: 'aes-256-gcm', key_bits: 256, key_base64: KEY_EX,
      confidence_score: 1.0,
      recommended_actions_priority_order: ['Store this key in a secret manager — it is shown once and never stored here.', 'Pass it to /encrypt as key_base64.'],
      chain_to: [{ api: 'aes-vault', reason: 'Encrypt data with this key via /encrypt.' }],
      privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/encrypt', summary: 'Encrypt plaintext with a provided key', operationId: 'encrypt',
    priceUsdc: 0.005, requestSchemaRef: 'EncryptRequest', responseSchemaRef: 'EncryptResponse',
    requestExample: { plaintext: 'hello agent', key_base64: KEY_EX },
    responseExample: {
      trace_id: 'a2-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      algorithm: 'aes-256-gcm', ciphertext_base64: CT_EX, iv_base64: IV_EX, auth_tag_base64: TAG_EX,
      confidence_score: 1.0,
      recommended_actions_priority_order: ['Persist ciphertext_base64, iv_base64, and auth_tag_base64 together.', 'Decrypt later via /decrypt with the same key.'],
      chain_to: [{ api: 'aes-vault', reason: 'Decrypt this payload via /decrypt.' }],
      privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/decrypt', summary: 'Decrypt ciphertext with key + iv + auth tag', operationId: 'decrypt',
    priceUsdc: 0.005, requestSchemaRef: 'DecryptRequest', responseSchemaRef: 'DecryptResponse',
    requestExample: { ciphertext_base64: CT_EX, iv_base64: IV_EX, auth_tag_base64: TAG_EX, key_base64: KEY_EX },
    responseExample: {
      trace_id: 'a3-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      algorithm: 'aes-256-gcm', plaintext: 'hello agent',
      confidence_score: 1.0,
      recommended_actions_priority_order: ['Authentication tag verified — ciphertext is intact and authentic.'],
      chain_to: [], privacy: { data_stored: false, retention: 'none' },
    },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL generate key + encrypt + return full reusable bundle', operationId: 'lookup',
    priceUsdc: 0.008, oneCall: true, requestSchemaRef: 'LookupRequest', responseSchemaRef: 'LookupResponse',
    requestExample: { plaintext: 'hello agent' },
    responseExample: {
      trace_id: 'a4-1780000000000', computed_at: '2026-06-08T12:00:00.000Z', success: true, latency_ms: 0,
      algorithm: 'aes-256-gcm', key_bits: 256, key_base64: KEY_EX, ciphertext_base64: CT_EX, iv_base64: IV_EX, auth_tag_base64: TAG_EX,
      reasoning: {
        why_result_generated: 'Generated a fresh 256-bit key and encrypted the plaintext with AES-256-GCM, returning everything needed to decrypt later.',
        key_factors: ['AES-256-GCM authenticated encryption', '96-bit random IV per call', 'key generated from a CSPRNG'],
        invalidators: ['Losing key_base64 makes the ciphertext permanently unrecoverable.', 'Reusing the same key+IV pair across messages weakens GCM security.'],
      },
      confidence_score: 1.0,
      recommended_actions_priority_order: [
        'Store key_base64 in a secret manager NOW — it is not retrievable later.',
        'Persist ciphertext_base64, iv_base64, and auth_tag_base64 together with the key reference.',
        'Decrypt via /decrypt using all four values.',
      ],
      chain_to: [{ api: 'aes-vault', reason: 'Decrypt this payload via /decrypt.' }],
      privacy: { data_stored: false, retention: 'none' },
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'aes-vault',
  title: 'AES Vault API',
  description: 'Stateless AES-256-GCM authenticated encryption and decryption. Real cryptography (Node crypto); caller-owned keys; nothing stored; deterministic schemas.',
  endpoints,
  schemas,
});

export default specRouter(spec);
