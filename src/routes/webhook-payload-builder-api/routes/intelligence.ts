import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import {
  PROVIDERS, computeDigest, signedString, WEBHOOK_DISCLAIMER, randomUUID,
} from '../../_aplus/webhook';

// Deterministic signed-webhook envelope builder. Given an event, data, and a
// secret, it constructs the canonical JSON body, the provider-formatted
// signature header(s), and a ready-to-send request spec. Real HMAC crypto —
// no LLM. (Route code may use Date.now/randomUUID; the ban is only in Workflow scripts.)

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

const PROVIDER_IDS = Object.keys(PROVIDERS);

export interface BuildInput {
  provider: string;
  event_type: string;
  data: Record<string, unknown>;
  secret: string;
  timestamp?: number;   // unix seconds
  message_id?: string;
  url?: string;
}

export interface BuildResult {
  provider: string;
  body: string;
  headers: Record<string, string>;
  signature: string;
  signed_string: string;
  timestamp: number;
  message_id: string;
  request: { method: 'POST'; url: string | null; headers: Record<string, string>; body: string };
}

type Parsed = BuildInput | { error: string };

export function parseBuild(body: any): Parsed {
  const provider = String(body?.provider ?? 'generic').toLowerCase();
  const event_type = body?.event_type;
  const data = body?.data;
  const secret = body?.secret;
  const url = body?.url;

  if (!PROVIDERS[provider]) return { error: `"provider" must be one of: ${PROVIDER_IDS.join(', ')}` };
  if (typeof event_type !== 'string' || event_type.trim() === '') return { error: '"event_type" must be a non-empty string' };
  if (data === undefined || data === null || typeof data !== 'object' || Array.isArray(data)) return { error: '"data" must be an object (the event payload)' };
  if (typeof secret !== 'string' || secret.length === 0) return { error: '"secret" must be a non-empty string' };
  if (url !== undefined && typeof url !== 'string') return { error: '"url" must be a string when provided' };

  let timestamp: number | undefined;
  if (body?.timestamp !== undefined) {
    const t = typeof body.timestamp === 'string' ? Number(body.timestamp) : body.timestamp;
    if (typeof t !== 'number' || !Number.isFinite(t) || t < 0 || !Number.isInteger(t)) return { error: '"timestamp" must be a non-negative integer (unix seconds)' };
    timestamp = t;
  }
  let message_id: string | undefined;
  if (body?.message_id !== undefined) {
    if (typeof body.message_id !== 'string' || body.message_id.trim() === '') return { error: '"message_id" must be a non-empty string when provided' };
    message_id = body.message_id;
  }

  return {
    provider, event_type, data, secret, url,
    ...(timestamp !== undefined ? { timestamp } : {}),
    ...(message_id !== undefined ? { message_id } : {}),
  };
}

export function computeBuild(i: BuildInput): BuildResult {
  const p = PROVIDERS[i.provider];
  const timestamp = i.timestamp ?? Math.floor(Date.now() / 1000);
  const message_id = i.message_id ?? `msg_${randomUUID()}`;

  // Canonical event envelope, serialized once; this exact string is what gets signed and sent.
  const envelope = { id: message_id, type: i.event_type, created: timestamp, data: i.data };
  const bodyStr = JSON.stringify(envelope);

  const signed_string = signedString(i.provider, bodyStr, { timestamp: String(timestamp), messageId: message_id });
  const digest = computeDigest(i.provider, i.secret, signed_string);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  switch (i.provider) {
    case 'stripe':
      headers['Stripe-Signature'] = `t=${timestamp},v1=${digest}`;
      break;
    case 'github':
      headers['X-Hub-Signature-256'] = `sha256=${digest}`;
      headers['X-GitHub-Event'] = i.event_type;
      headers['X-GitHub-Delivery'] = message_id;
      break;
    case 'shopify':
      headers['X-Shopify-Hmac-SHA256'] = digest;
      headers['X-Shopify-Topic'] = i.event_type;
      break;
    case 'slack':
      headers['X-Slack-Signature'] = `v0=${digest}`;
      headers['X-Slack-Request-Timestamp'] = String(timestamp);
      break;
    case 'svix':
      headers['webhook-id'] = message_id;
      headers['webhook-timestamp'] = String(timestamp);
      headers['webhook-signature'] = `v1,${digest}`;
      break;
    default:
      headers['X-Signature'] = digest;
      headers['X-Webhook-Timestamp'] = String(timestamp);
      headers['X-Idempotency-Key'] = message_id;
  }
  // Always advertise an idempotency key consumers can dedupe on.
  if (!('X-Idempotency-Key' in headers)) headers['X-Idempotency-Key'] = message_id;

  const signature = p.prefix
    ? (i.provider === 'svix' ? `v1,${digest}` : `${p.prefix}${digest}`)
    : digest;

  return {
    provider: p.id,
    body: bodyStr,
    headers,
    signature,
    signed_string,
    timestamp,
    message_id,
    request: { method: 'POST', url: i.url ?? null, headers, body: bodyStr },
  };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Webhook Payload Builder API', version: '1.0.0',
    description: 'Deterministic signed-webhook envelope builder. Given an event type, data, and secret, it constructs the canonical JSON body, provider-formatted signature header(s), timestamp, idempotency id, and a ready-to-send request spec for Stripe, GitHub, Shopify, Slack, Svix, or generic HMAC. Real HMAC crypto — never an LLM guess.',
    openapi_url: 'https://orbis-apis.onrender.com/webhook-payload-builder/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/build', summary: 'Build a signed webhook envelope + request spec', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL build + reasoning + send guidance', price_usdc: 0.02 },
    ],
    pricing: [
      { path: '/build', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.02, currency: 'USDC' },
    ],
    supported_providers: PROVIDER_IDS,
    x402_compatible: true,
  });
});

function chains() {
  return [
    { api: 'webhook-signature-verifier', reason: 'Round-trip: verify the signature you just built against the same secret.' },
    { api: 'webhook-validator', reason: 'Check the receiving endpoint config before sending real traffic.' },
  ];
}

function actions(r: BuildResult): string[] {
  return [
    `POST the "body" verbatim to your endpoint with the returned headers — re-serializing it will change the bytes and break the ${r.provider} signature.`,
    'Send the signature over the RAW body; have the receiver verify before parsing.',
    'Use this for tests, replays, and local development — do not expose the signing secret client-side.',
  ];
}

function handle(req: Request, res: Response, withReasoning: boolean) {
  const t0 = Date.now();
  const parsed = parseBuild(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeBuild(parsed);
  const p = PROVIDERS[parsed.provider];
  const payload: Record<string, unknown> = {
    ...r,
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(r),
    chain_to: chains(),
    webhook_disclaimer: WEBHOOK_DISCLAIMER,
    privacy: PRIVACY,
  };
  if (withReasoning) {
    payload.reasoning = {
      why_result_generated: `Serialized a canonical {id,type,created,data} envelope, built the ${p.label} signed string (${p.signed_payload_note}), and computed HMAC-${p.algo} (${p.encoding}).`,
      key_factors: [
        `Provider: ${p.label}; signature header: ${p.signature_header}.`,
        `Timestamp ${r.timestamp}, message id ${r.message_id}.`,
        `Signed string shape: ${p.signed_payload_note}`,
      ],
      invalidators: [
        'Changing the body bytes (whitespace, key order, re-encoding) invalidates the signature.',
        'The receiver must use the same secret and verify over the raw body.',
        'Timestamped schemes also fail if the receiver enforces a tolerance and the timestamp is stale.',
      ],
    };
  }
  respond(res, t0, payload);
}

router.post('/build', (req, res) => handle(req, res, false));
router.post('/lookup', (req, res) => handle(req, res, true));

export default router;
