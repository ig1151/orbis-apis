import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const numNull = { type: ['number', 'null'] };
const TestCore = {
  type: 'object',
  required: ['url', 'secure', 'connected', 'handshake_ms', 'echo_requested', 'echo_received', 'echo_ok', 'close_code', 'error_message', 'timeout_ms'],
  properties: {
    url: { type: 'string' }, secure: { type: 'boolean' }, connected: { type: 'boolean' }, handshake_ms: numNull,
    echo_requested: { type: 'boolean' }, echo_received: { type: 'boolean' }, echo_ok: { type: ['boolean', 'null'] },
    close_code: numNull, error_message: { type: ['string', 'null'] }, timeout_ms: { type: 'number' },
  },
};
const TestRequest = {
  type: 'object', required: ['url'], additionalProperties: false,
  properties: {
    url: { type: 'string', description: 'ws:// or wss:// URL. Loopback/private/link-local hosts are refused.' },
    echo_message: { type: 'string', description: 'Optional payload to send; echo_ok is true if the server returns it.' },
    timeout_ms: { type: 'number', minimum: 1000, maximum: 5000, description: 'Bound on the whole probe (default 5000, clamped to 1000–5000).' },
  },
};

const CORE = { url: 'wss://echo.example.com/socket', secure: true, connected: true, handshake_ms: 142, echo_requested: true, echo_received: true, echo_ok: true, close_code: null, error_message: null, timeout_ms: 5000 };
const ACTS = ['Connected in 142ms over wss (TLS).', 'Echo round-trip verified (server returned the same payload).'];
const TAIL = {
  confidence_score: 0.9, confidence_per_section: { connectivity: 1, stability: 0.7 }, recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'ssl-certificate', reason: 'For wss:// endpoints, inspect the TLS certificate of the host.' },
    { api: 'dns-lookup', reason: 'Resolve and verify the host before connecting.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('connectivity', 'stability'), _Tail: Tail, TestCore, TestRequest,
  DiscoveryResponse: discoverySchema(),
  TestResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TestCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TestCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'wst-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 142 };
const REQ = { url: 'wss://echo.example.com/socket', echo_message: 'ping' };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/test', summary: 'Connect, measure handshake, optional echo check', operationId: 'test', priceUsdc: 0.01,
    requestSchemaRef: 'TestRequest', responseSchemaRef: 'TestResponse', requestExample: REQ,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL connectivity test + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'TestRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ,
    responseExample: {
      ...env, ...CORE,
      reasoning: { why_result_generated: 'Handshake completed in 142ms; echo verified.', key_factors: ['Connected: true.', 'Handshake: 142ms.', 'Scheme: wss.'], invalidators: ['A single live observation — transient network conditions, server load, or restarts can change the result.', 'A successful handshake does not validate application-level auth or subprotocol behavior.', 'Bounded by a 5000ms timeout; a slow-but-reachable server may report as unreachable.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'websocket-tester', title: 'WebSocket Tester API', version: '1.0.0',
  description: 'Live WebSocket connectivity tester. Opens a real ws://wss:// connection within a tight timeout (≤5s), measures the handshake, optionally verifies an echo round-trip, and always returns HTTP 200 with connected:true/false. Refuses loopback/private/link-local hosts (SSRF protection).',
  endpoints, schemas, infoExtensions: { 'x-live-network': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
