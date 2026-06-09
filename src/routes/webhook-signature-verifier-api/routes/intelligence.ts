import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import {
  PROVIDERS, computeSignature, computeDigest, signedString, extractDigest,
  extractStripeTimestamp, safeEqual, WEBHOOK_DISCLAIMER,
} from '../../_aplus/webhook';

// Deterministic webhook HMAC signature verifier with provider presets.
// Real crypto (createHmac + timingSafeEqual) — no LLM, no estimates.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

export type SignatureStatus = 'valid' | 'invalid' | 'missing_signature' | 'missing_timestamp';

export interface VerifyInput {
  provider: string;
  secret: string;
  payload: string;
  signature: string;
  timestamp?: string;
  message_id?: string;
}

export interface VerifyResult {
  provider: string;
  algorithm: string;
  encoding: string;
  signature_status: SignatureStatus;
  match: boolean;
  computed_signature: string | null;
  computed_signature_preview: string | null;
  provided_signature: string;
  signed_string_note: string;
  recommended_fix: string | null;
}

/** Short, log-safe preview of a signature: "<prefix><first 8 hex>…". */
function previewSig(provider: string, full: string | null): string | null {
  if (full === null) return null;
  const prefix = PROVIDERS[provider]?.prefix ?? '';
  const digest = full.startsWith(prefix) ? full.slice(prefix.length) : full;
  return `${prefix}${digest.slice(0, 8)}…`;
}

type ParsedInput = VerifyInput | { error: string };

const PROVIDER_IDS = Object.keys(PROVIDERS);

export function parseVerify(body: any): ParsedInput {
  const provider = String(body?.provider ?? 'generic').toLowerCase();
  const secret = body?.secret;
  const payload = body?.payload;
  const signature = body?.signature;
  const timestamp = body?.timestamp;
  const message_id = body?.message_id;

  if (!PROVIDERS[provider]) return { error: `"provider" must be one of: ${PROVIDER_IDS.join(', ')}` };
  if (typeof secret !== 'string' || secret.length === 0) return { error: '"secret" must be a non-empty string' };
  if (typeof payload !== 'string') return { error: '"payload" must be a string (the raw request body, exactly as received)' };
  if (typeof signature !== 'string') return { error: '"signature" must be a string (the signature header value as received)' };
  if (timestamp !== undefined && typeof timestamp !== 'string') return { error: '"timestamp" must be a string when provided' };
  if (message_id !== undefined && typeof message_id !== 'string') return { error: '"message_id" must be a string when provided' };

  return {
    provider, secret, payload, signature,
    ...(timestamp !== undefined ? { timestamp } : {}),
    ...(message_id !== undefined ? { message_id } : {}),
  };
}

export function computeVerify(i: VerifyInput): VerifyResult {
  const p = PROVIDERS[i.provider];
  const base: Omit<VerifyResult, 'signature_status' | 'match' | 'computed_signature' | 'computed_signature_preview' | 'recommended_fix'> = {
    provider: p.id,
    algorithm: p.algo,
    encoding: p.encoding,
    provided_signature: i.signature,
    signed_string_note: p.signed_payload_note,
  };

  // Resolve the timestamp the scheme needs.
  let timestamp = i.timestamp;
  if (i.provider === 'stripe' && timestamp === undefined) {
    timestamp = extractStripeTimestamp(i.signature) ?? undefined;
  }

  const needsTs = i.provider === 'stripe' || i.provider === 'slack' || i.provider === 'svix';
  if (needsTs && (timestamp === undefined || timestamp === '')) {
    return {
      ...base,
      signature_status: 'missing_timestamp',
      match: false,
      computed_signature: null,
      computed_signature_preview: null,
      recommended_fix: `${p.label} signs over a timestamp. Supply "timestamp"${i.provider === 'stripe' ? ' (or pass the full "t=…,v1=…" header as "signature")' : ''}${i.provider === 'svix' ? ' and "message_id"' : ''} so the signed string can be reconstructed.`,
    };
  }

  if (i.signature.trim() === '') {
    return {
      ...base,
      signature_status: 'missing_signature',
      match: false,
      computed_signature: null,
      computed_signature_preview: null,
      recommended_fix: `No signature value was provided. Read the "${p.signature_header}" header from the incoming request and pass it as "signature".`,
    };
  }

  // The full, provider-formatted signature (with prefix) for display…
  const computed_signature = computeSignature(i.provider, i.secret, i.payload, {
    timestamp,
    messageId: i.message_id,
  });
  // …and the bare digest for an apples-to-apples constant-time comparison.
  const computedDigest = computeDigest(i.provider, i.secret, signedString(i.provider, i.payload, { timestamp, messageId: i.message_id }));
  const providedDigest = extractDigest(i.provider, i.signature);

  const match = providedDigest !== null && safeEqual(providedDigest, computedDigest);

  return {
    ...base,
    signature_status: match ? 'valid' : 'invalid',
    match,
    computed_signature,
    computed_signature_preview: previewSig(i.provider, computed_signature),
    recommended_fix: match
      ? null
      : recommendedFix(i, p),
  };
}

function recommendedFix(i: VerifyInput, p: typeof PROVIDERS[string]): string {
  const tips = [
    `Verify over the RAW request body bytes — re-serializing parsed JSON changes whitespace and breaks the digest.`,
    `Confirm the secret matches the endpoint's signing secret (${p.label} secrets are environment/endpoint-specific).`,
  ];
  if (i.provider === 'stripe') tips.push('Sign over "{timestamp}.{raw_body}"; compare against the v1 value in the "t=…,v1=…" header.');
  if (i.provider === 'slack') tips.push('Sign over "v0:{timestamp}:{raw_body}" and compare to the "v0=" hex value.');
  if (i.provider === 'svix') tips.push('Base64-decode the "whsec_"-prefixed secret first; sign over "{id}.{timestamp}.{raw_body}".');
  return tips.join(' ');
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Webhook Signature Verifier API', version: '1.0.0',
    description: 'Deterministic HMAC webhook signature verification with presets for Stripe, GitHub, Shopify, Slack, and Svix/standard-webhooks (plus generic HMAC). Real crypto with constant-time comparison — never an LLM guess.',
    openapi_url: 'https://orbis-apis.onrender.com/webhook-signature-verifier/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/verify', summary: 'Verify a webhook signature against a secret', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL verify + reasoning + recommended fixes', price_usdc: 0.02 },
    ],
    pricing: [
      { path: '/verify', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.02, currency: 'USDC' },
    ],
    supported_providers: PROVIDER_IDS,
    x402_compatible: true,
  });
});

function chains(r: VerifyResult) {
  const out = [
    { api: 'webhook-validator', reason: 'Audit the full endpoint config (HTTPS, idempotency, replay protection), not just the signature.' },
    { api: 'webhook-reliability-scorer', reason: 'Score delivery health if signatures are failing intermittently.' },
  ];
  if (r.signature_status !== 'valid') {
    out.unshift({ api: 'webhook-payload-builder', reason: 'Generate a correctly-signed reference payload to diff against what you received.' });
  }
  return out;
}

function actions(r: VerifyResult): string[] {
  const out: string[] = [];
  if (r.signature_status === 'valid') {
    out.push('Signature is valid — safe to process the event. Still enforce idempotency on the event id to dedupe retries.');
  } else if (r.recommended_fix) {
    out.push(r.recommended_fix);
  }
  out.push('Reject the request with 400/401 on any signature mismatch; never process unverified webhook bodies.');
  return out;
}

router.post('/verify', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseVerify(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeVerify(parsed);
  respond(res, t0, {
    ...r,
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(r),
    chain_to: chains(r),
    webhook_disclaimer: WEBHOOK_DISCLAIMER,
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const parsed = parseVerify(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeVerify(parsed);
  const p = PROVIDERS[parsed.provider];
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Reconstructed the ${p.label} signed string (${p.signed_payload_note}) from the supplied body${r.signature_status === 'missing_timestamp' ? ' but no timestamp was available' : ''}, computed HMAC-${p.algo} (${p.encoding}), and compared it to the provided value with a constant-time check.`,
      key_factors: [
        `Status: ${r.signature_status}.`,
        `Provider preset: ${p.label} — ${p.signed_payload_note}`,
        r.computed_signature ? `Computed signature: ${r.computed_signature}` : 'No signature was computed (missing input).',
      ],
      invalidators: [
        'A different secret or a body altered in transit (or re-serialized) changes the digest.',
        'For timestamped schemes, the signed string depends on the exact timestamp — a wrong/missing one fails the check.',
        'A valid signature does not prove freshness; enforce a timestamp tolerance to block replays.',
      ],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: actions(r),
    chain_to: chains(r),
    webhook_disclaimer: WEBHOOK_DISCLAIMER,
    privacy: PRIVACY,
  });
});

export default router;
