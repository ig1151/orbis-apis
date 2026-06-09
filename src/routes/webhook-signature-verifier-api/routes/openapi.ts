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

const VerifyCore = {
  type: 'object',
  required: [
    'provider', 'algorithm', 'encoding', 'signature_status', 'match',
    'computed_signature', 'computed_signature_preview', 'provided_signature', 'signed_string_note', 'recommended_fix',
  ],
  properties: {
    provider: { type: 'string', enum: ['stripe', 'github', 'shopify', 'slack', 'svix', 'generic'] },
    algorithm: { type: 'string', enum: ['sha256', 'sha1'] },
    encoding: { type: 'string', enum: ['hex', 'base64'] },
    signature_status: { type: 'string', enum: ['valid', 'invalid', 'missing_signature', 'missing_timestamp'] },
    match: { type: 'boolean', description: 'True only when the computed digest matched the provided one (constant-time).' },
    computed_signature: { type: ['string', 'null'], description: 'The full signature this service computed (with provider prefix), or null when input was missing. The caller supplied the secret, so this leaks nothing they could not compute — useful for diffing against what you received.' },
    computed_signature_preview: { type: ['string', 'null'], description: 'A short, log-safe preview of computed_signature ("<prefix><first 8 hex>…"); null when no signature was computed.' },
    provided_signature: { type: 'string', description: 'The signature value you supplied, echoed back.' },
    signed_string_note: { type: 'string', description: 'How this provider canonicalizes the signed string.' },
    recommended_fix: { type: ['string', 'null'], description: 'Actionable fix when the check did not pass; null when valid.' },
  },
};

const WebhookTail = {
  type: 'object',
  required: ['confidence_score', 'recommended_actions_priority_order', 'chain_to', 'webhook_disclaimer', 'privacy'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    webhook_disclaimer: { type: 'string' },
    privacy: { $ref: '#/components/schemas/Privacy' },
  },
};

const VerifyRequest = {
  type: 'object',
  required: ['provider', 'secret', 'payload', 'signature'],
  additionalProperties: false,
  properties: {
    provider: { type: 'string', enum: ['stripe', 'github', 'shopify', 'slack', 'svix', 'generic'], description: 'Webhook vendor preset.' },
    secret: { type: 'string', minLength: 1, description: 'The endpoint signing secret. For Svix a "whsec_" base64 secret is accepted.' },
    payload: { type: 'string', description: 'The RAW request body exactly as received (do not re-serialize parsed JSON).' },
    signature: { type: 'string', description: 'The signature header value as received (e.g. Stripe "t=…,v1=…", GitHub "sha256=…").' },
    timestamp: { type: 'string', description: 'Timestamp for schemes that sign one (Stripe/Slack/Svix). For Stripe it is auto-extracted from the signature when omitted.' },
    message_id: { type: 'string', description: 'Message id for Svix/standard-webhooks ("{id}.{ts}.{body}").' },
  },
};

const schemas = {
  EnvelopeOk,
  VerifyCore,
  _WebhookTail: WebhookTail,
  VerifyRequest,
  DiscoveryResponse: {
    type: 'object',
    required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'supported_providers', 'x402_compatible'],
    additionalProperties: false,
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: { type: 'object', required: ['type', 'header'], additionalProperties: false, properties: { type: { type: 'string' }, header: { type: 'string' } } },
      endpoints: { type: 'array', items: { type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false, properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
      pricing: { type: 'array', items: { type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false, properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } } } },
      supported_providers: { type: 'array', items: { type: 'string' } },
      x402_compatible: { type: 'boolean' },
    },
  },
  VerifyResponse: {
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/VerifyCore' }, { $ref: '#/components/schemas/_WebhookTail' }],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/VerifyCore' },
      {
        type: 'object',
        required: ['reasoning'],
        properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } },
      },
      { $ref: '#/components/schemas/_WebhookTail' },
    ],
    unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = {
  provider: 'stripe',
  secret: 'whsec_test_secret',
  payload: '{"id":"evt_1","type":"payment_intent.succeeded"}',
  signature: 't=1718000000,v1=8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4',
};

const CORE_EXAMPLE = {
  provider: 'stripe',
  algorithm: 'sha256',
  encoding: 'hex',
  signature_status: 'valid',
  match: true,
  computed_signature: '8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4',
  computed_signature_preview: '8b9c0d1e…',
  provided_signature: 't=1718000000,v1=8b9c0d1e2f3a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4',
  signed_string_note: 'HMAC-SHA256 over "{timestamp}.{raw_body}", hex; header is "t=<ts>,v1=<sig>".',
  recommended_fix: null,
};

const TAIL_EXAMPLE = {
  confidence_score: 1.0,
  recommended_actions_priority_order: [
    'Signature is valid — safe to process the event. Still enforce idempotency on the event id to dedupe retries.',
    'Reject the request with 400/401 on any signature mismatch; never process unverified webhook bodies.',
  ],
  chain_to: [
    { api: 'webhook-validator', reason: 'Audit the full endpoint config (HTTPS, idempotency, replay protection), not just the signature.' },
    { api: 'webhook-reliability-scorer', reason: 'Score delivery health if signatures are failing intermittently.' },
  ],
  webhook_disclaimer: 'This result is a deterministic analysis of the configuration, payload, and delivery data you provided…',
  privacy: { data_stored: false, retention: 'none' },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/verify', summary: 'Verify a webhook signature against a secret',
    operationId: 'verify', priceUsdc: 0.01,
    requestSchemaRef: 'VerifyRequest', responseSchemaRef: 'VerifyResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wv1-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL verify + reasoning + recommended fixes',
    operationId: 'lookup', priceUsdc: 0.02, oneCall: true,
    requestSchemaRef: 'VerifyRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wv2-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      reasoning: {
        why_result_generated: 'Reconstructed the Stripe signed string from the supplied body, computed HMAC-sha256 (hex), and compared it to the provided value with a constant-time check.',
        key_factors: ['Status: valid.', 'Provider preset: Stripe — HMAC-SHA256 over "{timestamp}.{raw_body}", hex.', 'Computed signature: 8b9c0d1e…'],
        invalidators: ['A different secret or a body altered in transit changes the digest.', 'A valid signature does not prove freshness; enforce a timestamp tolerance to block replays.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'webhook-signature-verifier',
  title: 'Webhook Signature Verifier API',
  version: '1.0.0',
  description: 'Deterministic HMAC webhook signature verification with built-in presets for Stripe, GitHub, Shopify, Slack, and Svix/standard-webhooks, plus a generic HMAC mode. Reconstructs each provider\'s exact signed string, computes the digest with Node crypto, and compares it in constant time — returning signature_status, the computed signature, and a concrete recommended_fix when it fails. Real cryptography, never an LLM guess; confidence is always 1.0. Secrets and payloads are never stored.',
  endpoints,
  schemas,
  infoExtensions: { 'x-webhook': true, 'x-security-sensitive': true },
});

export default specRouter(spec);
