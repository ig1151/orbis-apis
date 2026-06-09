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

const HeaderMap = {
  type: 'object',
  description: 'HTTP header name → value. Names vary by provider.',
  additionalProperties: { type: 'string' },
};

const RequestSpec = {
  type: 'object',
  required: ['method', 'url', 'headers', 'body'],
  additionalProperties: false,
  properties: {
    method: { type: 'string', enum: ['POST'] },
    url: { type: ['string', 'null'], description: 'Target URL if you supplied one, else null.' },
    headers: { $ref: '#/components/schemas/HeaderMap' },
    body: { type: 'string', description: 'Raw body to send verbatim (the exact bytes that were signed).' },
  },
};

const BuildCore = {
  type: 'object',
  required: ['provider', 'body', 'headers', 'signature', 'signed_string', 'timestamp', 'message_id', 'request'],
  properties: {
    provider: { type: 'string', enum: ['stripe', 'github', 'shopify', 'slack', 'svix', 'generic'] },
    body: { type: 'string', description: 'Canonical JSON envelope {id,type,created,data}, serialized once.' },
    headers: { $ref: '#/components/schemas/HeaderMap' },
    signature: { type: 'string', description: 'The signature value with provider prefix.' },
    signed_string: { type: 'string', description: 'The exact string that was HMAC-signed.' },
    timestamp: { type: 'integer', description: 'Unix seconds used in the signature (supplied or generated).' },
    message_id: { type: 'string', description: 'Event/message id used for idempotency (supplied or generated).' },
    request: { $ref: '#/components/schemas/RequestSpec' },
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

const BuildRequest = {
  type: 'object',
  required: ['provider', 'event_type', 'data', 'secret'],
  additionalProperties: false,
  properties: {
    provider: { type: 'string', enum: ['stripe', 'github', 'shopify', 'slack', 'svix', 'generic'] },
    event_type: { type: 'string', minLength: 1, description: 'Event/topic name, e.g. "invoice.paid".' },
    data: { type: 'object', description: 'The event payload data (placed under envelope.data).' },
    secret: { type: 'string', minLength: 1, description: 'Signing secret. Svix accepts a "whsec_" base64 secret.' },
    timestamp: { type: 'integer', minimum: 0, description: 'Optional unix-seconds timestamp; generated if omitted.' },
    message_id: { type: 'string', description: 'Optional event/message id; generated if omitted.' },
    url: { type: 'string', description: 'Optional target URL echoed into the request spec.' },
  },
};

const schemas = {
  EnvelopeOk,
  HeaderMap,
  RequestSpec,
  BuildCore,
  _WebhookTail: WebhookTail,
  BuildRequest,
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
  BuildResponse: {
    allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/BuildCore' }, { $ref: '#/components/schemas/_WebhookTail' }],
    unevaluatedProperties: false,
  },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' },
      { $ref: '#/components/schemas/BuildCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_WebhookTail' },
    ],
    unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = {
  provider: 'stripe',
  event_type: 'payment_intent.succeeded',
  data: { id: 'pi_123', amount: 4200, currency: 'usd' },
  secret: 'whsec_test_secret',
  timestamp: 1718000000,
  message_id: 'evt_test_1',
  url: 'https://api.example.com/webhooks/stripe',
};

const CORE_EXAMPLE = {
  provider: 'stripe',
  body: '{"id":"evt_test_1","type":"payment_intent.succeeded","created":1718000000,"data":{"id":"pi_123","amount":4200,"currency":"usd"}}',
  headers: {
    'Content-Type': 'application/json',
    'Stripe-Signature': 't=1718000000,v1=4a7d1ed414474e4033ac29ccb8653d9b1a1b2c3d4e5f60718293a4b5c6d7e8f9',
    'X-Idempotency-Key': 'evt_test_1',
  },
  signature: '4a7d1ed414474e4033ac29ccb8653d9b1a1b2c3d4e5f60718293a4b5c6d7e8f9',
  signed_string: '1718000000.{"id":"evt_test_1","type":"payment_intent.succeeded","created":1718000000,"data":{"id":"pi_123","amount":4200,"currency":"usd"}}',
  timestamp: 1718000000,
  message_id: 'evt_test_1',
  request: {
    method: 'POST',
    url: 'https://api.example.com/webhooks/stripe',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': 't=1718000000,v1=4a7d1ed414474e4033ac29ccb8653d9b1a1b2c3d4e5f60718293a4b5c6d7e8f9',
      'X-Idempotency-Key': 'evt_test_1',
    },
    body: '{"id":"evt_test_1","type":"payment_intent.succeeded","created":1718000000,"data":{"id":"pi_123","amount":4200,"currency":"usd"}}',
  },
};

const TAIL_EXAMPLE = {
  confidence_score: 1.0,
  recommended_actions_priority_order: [
    'POST the "body" verbatim to your endpoint with the returned headers — re-serializing it will change the bytes and break the stripe signature.',
    'Send the signature over the RAW body; have the receiver verify before parsing.',
    'Use this for tests, replays, and local development — do not expose the signing secret client-side.',
  ],
  chain_to: [
    { api: 'webhook-signature-verifier', reason: 'Round-trip: verify the signature you just built against the same secret.' },
    { api: 'webhook-validator', reason: 'Check the receiving endpoint config before sending real traffic.' },
  ],
  webhook_disclaimer: 'This result is a deterministic analysis of the configuration, payload, and delivery data you provided…',
  privacy: { data_stored: false, retention: 'none' },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/build', summary: 'Build a signed webhook envelope + request spec',
    operationId: 'build', priceUsdc: 0.01,
    requestSchemaRef: 'BuildRequest', responseSchemaRef: 'BuildResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wb1-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL_EXAMPLE },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL build + reasoning + send guidance',
    operationId: 'lookup', priceUsdc: 0.02, oneCall: true,
    requestSchemaRef: 'BuildRequest', responseSchemaRef: 'LookupResponse',
    requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wb2-1780000000000', computed_at: '2026-06-09T12:00:00.000Z', success: true, latency_ms: 0,
      ...CORE_EXAMPLE,
      reasoning: {
        why_result_generated: 'Serialized a canonical {id,type,created,data} envelope, built the Stripe signed string, and computed HMAC-sha256 (hex).',
        key_factors: ['Provider: Stripe; signature header: Stripe-Signature.', 'Timestamp 1718000000, message id evt_test_1.', 'Signed string shape: "{timestamp}.{raw_body}".'],
        invalidators: ['Changing the body bytes (whitespace, key order, re-encoding) invalidates the signature.', 'The receiver must use the same secret and verify over the raw body.'],
      },
      ...TAIL_EXAMPLE,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'webhook-payload-builder',
  title: 'Webhook Payload Builder API',
  version: '1.0.0',
  description: 'Deterministic signed-webhook envelope builder. Given an event type, payload data, and a signing secret, it serializes a canonical {id,type,created,data} JSON body, computes a real HMAC signature, and returns the provider-formatted signature header(s), timestamp, idempotency id, and a ready-to-send request spec for Stripe, GitHub, Shopify, Slack, Svix/standard-webhooks, or generic HMAC. Perfect for tests, replays, and local development. Real cryptography, never an LLM guess; confidence is always 1.0. Secrets are never stored.',
  endpoints,
  schemas,
  infoExtensions: { 'x-webhook': true, 'x-security-sensitive': true },
});

export default specRouter(spec);
