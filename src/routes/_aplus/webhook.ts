// Shared, deterministic webhook helpers for the A+ webhook APIs.
// Pure crypto + string logic only — no LLM, no network. Signature verification
// uses Node's crypto (createHmac + timingSafeEqual) so results are exact and
// confidence is always 1.0. Provider presets encode how each major webhook
// vendor canonicalizes the signed string and encodes the digest.

import { createHmac, timingSafeEqual, randomUUID } from 'crypto';

export type Encoding = 'hex' | 'base64';

/** A webhook provider's signing convention. */
export interface ProviderPreset {
  id: string;
  label: string;
  /** Hash algorithm passed to createHmac (sha256 / sha1). */
  algo: 'sha256' | 'sha1';
  /** Digest encoding of the signature value. */
  encoding: Encoding;
  /** Header the signature is delivered in. */
  signature_header: string;
  /** Header carrying the timestamp, when the scheme signs one. */
  timestamp_header?: string;
  /** Prefix on the signature value, e.g. "sha256=" or "v0=". '' if none. */
  prefix: string;
  /** Human note on how the signed string is built. */
  signed_payload_note: string;
}

export const PROVIDERS: Record<string, ProviderPreset> = {
  stripe: {
    id: 'stripe',
    label: 'Stripe',
    algo: 'sha256',
    encoding: 'hex',
    signature_header: 'Stripe-Signature',
    timestamp_header: 'Stripe-Signature',
    prefix: '',
    signed_payload_note: 'HMAC-SHA256 over "{timestamp}.{raw_body}", hex; header is "t=<ts>,v1=<sig>".',
  },
  github: {
    id: 'github',
    label: 'GitHub',
    algo: 'sha256',
    encoding: 'hex',
    signature_header: 'X-Hub-Signature-256',
    prefix: 'sha256=',
    signed_payload_note: 'HMAC-SHA256 over the raw body, hex, prefixed with "sha256=".',
  },
  shopify: {
    id: 'shopify',
    label: 'Shopify',
    algo: 'sha256',
    encoding: 'base64',
    signature_header: 'X-Shopify-Hmac-SHA256',
    prefix: '',
    signed_payload_note: 'HMAC-SHA256 over the raw body, base64-encoded.',
  },
  slack: {
    id: 'slack',
    label: 'Slack',
    algo: 'sha256',
    encoding: 'hex',
    signature_header: 'X-Slack-Signature',
    timestamp_header: 'X-Slack-Request-Timestamp',
    prefix: 'v0=',
    signed_payload_note: 'HMAC-SHA256 over "v0:{timestamp}:{raw_body}", hex, prefixed with "v0=".',
  },
  svix: {
    id: 'svix',
    label: 'Svix / standard-webhooks',
    algo: 'sha256',
    encoding: 'base64',
    signature_header: 'webhook-signature',
    timestamp_header: 'webhook-timestamp',
    prefix: 'v1,',
    signed_payload_note: 'HMAC-SHA256 over "{id}.{timestamp}.{raw_body}", base64, space-separated "v1,<sig>" values.',
  },
  generic: {
    id: 'generic',
    label: 'Generic HMAC',
    algo: 'sha256',
    encoding: 'hex',
    signature_header: 'X-Signature',
    prefix: '',
    signed_payload_note: 'HMAC-SHA256 over the raw body, hex.',
  },
};

/** Svix secrets are commonly base64 with a "whsec_" prefix; strip + decode. */
export function svixKey(secret: string): Buffer {
  const s = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  try {
    return Buffer.from(s, 'base64');
  } catch {
    return Buffer.from(secret, 'utf8');
  }
}

/**
 * Build the exact string that gets HMAC'd for a given provider, given the raw
 * request body plus any timestamp / message-id the scheme needs.
 */
export function signedString(
  provider: string,
  rawBody: string,
  opts: { timestamp?: string; messageId?: string } = {},
): string {
  const ts = opts.timestamp ?? '';
  const id = opts.messageId ?? '';
  switch (provider) {
    case 'stripe':
      return `${ts}.${rawBody}`;
    case 'slack':
      return `v0:${ts}:${rawBody}`;
    case 'svix':
      return `${id}.${ts}.${rawBody}`;
    default:
      return rawBody;
  }
}

/** Compute the raw HMAC digest (no prefix) for a provider over a signed string. */
export function computeDigest(provider: string, secret: string, payload: string): string {
  const p = PROVIDERS[provider] ?? PROVIDERS.generic;
  const key = provider === 'svix' ? svixKey(secret) : Buffer.from(secret, 'utf8');
  return createHmac(p.algo, key).update(payload, 'utf8').digest(p.encoding);
}

/** Full signature value including the provider's prefix (e.g. "sha256=ab12…"). */
export function computeSignature(
  provider: string,
  secret: string,
  rawBody: string,
  opts: { timestamp?: string; messageId?: string } = {},
): string {
  const p = PROVIDERS[provider] ?? PROVIDERS.generic;
  const payload = signedString(provider, rawBody, opts);
  return p.prefix + computeDigest(provider, secret, payload);
}

/** Strip a provider prefix and pull the comparable digest out of a header value. */
export function extractDigest(provider: string, headerValue: string): string | null {
  const p = PROVIDERS[provider] ?? PROVIDERS.generic;
  const v = headerValue.trim();
  if (provider === 'stripe') {
    // "t=123,v1=abc,v1=def" — return the first v1 value.
    const parts = v.split(',').map((x) => x.trim());
    const v1 = parts.find((x) => x.startsWith('v1='));
    return v1 ? v1.slice(3) : null;
  }
  if (provider === 'svix') {
    // space-separated "v1,<sig> v1a,<sig>" — return first v1 value.
    const tokens = v.split(/\s+/);
    const tok = tokens.find((x) => x.startsWith('v1,'));
    return tok ? tok.slice(3) : null;
  }
  if (p.prefix && v.startsWith(p.prefix)) return v.slice(p.prefix.length);
  return v;
}

/** Pull the timestamp out of a Stripe-style "t=…,v1=…" header. */
export function extractStripeTimestamp(headerValue: string): string | null {
  const t = headerValue.split(',').map((x) => x.trim()).find((x) => x.startsWith('t='));
  return t ? t.slice(2) : null;
}

/** Constant-time comparison of two digest strings (length-safe). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** A finite non-negative number coercion (mirrors finance.num). */
export function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

/** Round to dp decimals, half-up. */
export function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Clamp n into [lo, hi]. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Exact percentile from a numeric array (linear interpolation, nearest-rank-ish). */
export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

export { randomUUID };

/** Standard webhook reliability disclaimer reused across the family. */
export const WEBHOOK_DISCLAIMER =
  'This result is a deterministic analysis of the configuration, payload, and delivery data you provided. ' +
  'A passing signature check confirms the digest matched the secret and signed string supplied here — it does not by itself ' +
  'prove the request reached you unmodified, nor does any score guarantee future delivery. Always verify signatures on the ' +
  'raw request body, server-side, with a constant-time comparison.';
