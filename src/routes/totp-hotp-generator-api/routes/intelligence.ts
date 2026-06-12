import { Router, Request, Response } from 'express';
import { createHmac, randomBytes } from 'crypto';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// RFC 4226 (HOTP) + RFC 6238 (TOTP) one-time-password generator and verifier.
// Pure crypto (HMAC over a base32 secret) — fully deterministic given a secret +
// counter (HOTP) or secret + timestamp + period (TOTP). Also mints random base32
// secrets and otpauth:// provisioning URIs. No LLM. Secrets are never stored.

const router = Router();
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ALGOS: Record<string, string> = { SHA1: 'sha1', SHA256: 'sha256', SHA512: 'sha512' };

function base32Decode(s: string): Buffer | null {
  const clean = s.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  if (clean.length === 0) return null;
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const idx = B32.indexOf(c);
    if (idx < 0) return null;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const b of buf) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function hotp(secret: Buffer, counter: number, digits: number, algo: string): string {
  const buf = Buffer.alloc(8);
  let c = BigInt(counter);
  for (let i = 7; i >= 0; i--) { buf[i] = Number(c & 0xffn); c >>= 8n; }
  const h = createHmac(algo, secret).update(buf).digest();
  const off = h[h.length - 1] & 0xf;
  const bin = ((h[off] & 0x7f) << 24) | ((h[off + 1] & 0xff) << 16) | ((h[off + 2] & 0xff) << 8) | (h[off + 3] & 0xff);
  return (bin % 10 ** digits).toString().padStart(digits, '0');
}

interface Common { type: 'totp' | 'hotp'; algorithm: string; digits: number; period: number; }
function parseCommon(b: any): { error: string } | Common {
  const type = b.type === undefined ? 'totp' : b.type;
  if (type !== 'totp' && type !== 'hotp') return { error: '"type" must be "totp" or "hotp".' };
  const algorithm = b.algorithm === undefined ? 'SHA1' : b.algorithm;
  if (!ALGOS[algorithm]) return { error: '"algorithm" must be one of SHA1, SHA256, SHA512.' };
  const digits = b.digits === undefined ? 6 : b.digits;
  if (![6, 7, 8].includes(digits)) return { error: '"digits" must be 6, 7, or 8.' };
  const period = b.period === undefined ? 30 : b.period;
  if (typeof period !== 'number' || !Number.isInteger(period) || period < 1 || period > 600) return { error: '"period" must be an integer between 1 and 600 seconds.' };
  return { type, algorithm, digits, period };
}

export interface GenCore {
  type: 'totp' | 'hotp'; code: string; algorithm: string; digits: number;
  counter: number; period: number | null; timestamp: number | null;
  seconds_remaining: number | null; valid_until: string | null;
}

export function generate(body: any): { error: string } | { result: GenCore } {
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const secretStr = typeof b.secret === 'string' ? b.secret : '';
  const secret = base32Decode(secretStr);
  if (!secret) return { error: '"secret" is required and must be a non-empty base32 string.' };
  const c = parseCommon(b);
  if ('error' in c) return c;

  let counter: number;
  let timestamp: number | null = null;
  let period: number | null = null;
  let seconds_remaining: number | null = null;
  let valid_until: string | null = null;

  if (c.type === 'hotp') {
    if (b.counter === undefined || typeof b.counter !== 'number' || !Number.isInteger(b.counter) || b.counter < 0) return { error: 'HOTP requires an integer "counter" >= 0.' };
    counter = b.counter;
  } else {
    timestamp = b.timestamp === undefined ? Math.floor(Date.now() / 1000) : b.timestamp;
    if (typeof timestamp !== 'number' || !Number.isInteger(timestamp) || timestamp < 0) return { error: '"timestamp" must be a non-negative integer (unix seconds).' };
    period = c.period;
    counter = Math.floor(timestamp / period);
    seconds_remaining = period - (timestamp % period);
    valid_until = new Date((counter + 1) * period * 1000).toISOString();
  }

  const code = hotp(secret, counter, c.digits, ALGOS[c.algorithm]);
  return { result: { type: c.type, code, algorithm: c.algorithm, digits: c.digits, counter, period, timestamp, seconds_remaining, valid_until } };
}

export interface VerifyCore {
  type: 'totp' | 'hotp'; valid: boolean; matched_counter: number | null; matched_offset: number | null;
  window: number; checked_counters: number[]; algorithm: string; digits: number;
}

export function verify(body: any): { error: string } | { result: VerifyCore } {
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const secret = base32Decode(typeof b.secret === 'string' ? b.secret : '');
  if (!secret) return { error: '"secret" is required and must be a non-empty base32 string.' };
  if (typeof b.code !== 'string' || !/^\d+$/.test(b.code)) return { error: '"code" is required and must be a numeric string.' };
  const c = parseCommon(b);
  if ('error' in c) return c;
  const window = b.window === undefined ? 1 : b.window;
  if (typeof window !== 'number' || !Number.isInteger(window) || window < 0 || window > 10) return { error: '"window" must be an integer between 0 and 10.' };

  let baseCounter: number;
  if (c.type === 'hotp') {
    if (b.counter === undefined || typeof b.counter !== 'number' || !Number.isInteger(b.counter) || b.counter < 0) return { error: 'HOTP verify requires an integer "counter" >= 0.' };
    baseCounter = b.counter;
  } else {
    const timestamp = b.timestamp === undefined ? Math.floor(Date.now() / 1000) : b.timestamp;
    if (typeof timestamp !== 'number' || !Number.isInteger(timestamp) || timestamp < 0) return { error: '"timestamp" must be a non-negative integer (unix seconds).' };
    baseCounter = Math.floor(timestamp / c.period);
  }

  const checked: number[] = [];
  let matched_counter: number | null = null, matched_offset: number | null = null;
  for (let off = -window; off <= window; off++) {
    const ctr = baseCounter + off;
    if (ctr < 0) continue;
    checked.push(ctr);
    if (hotp(secret, ctr, c.digits, ALGOS[c.algorithm]) === b.code) { matched_counter = ctr; matched_offset = off; break; }
  }
  return { result: { type: c.type, valid: matched_counter !== null, matched_counter, matched_offset, window, checked_counters: checked, algorithm: c.algorithm, digits: c.digits } };
}

export interface SecretCore {
  secret: string; bytes: number; algorithm: string; digits: number; period: number;
  type: 'totp' | 'hotp'; issuer: string | null; account: string | null; otpauth_uri: string;
}

export function mintSecret(body: any): { error: string } | { result: SecretCore } {
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const bytes = b.bytes === undefined ? 20 : b.bytes;
  if (typeof bytes !== 'number' || !Number.isInteger(bytes) || bytes < 10 || bytes > 64) return { error: '"bytes" must be an integer between 10 and 64 (default 20).' };
  const c = parseCommon(b);
  if ('error' in c) return c;
  const issuer = typeof b.issuer === 'string' && b.issuer.trim() ? b.issuer.trim() : null;
  const account = typeof b.account === 'string' && b.account.trim() ? b.account.trim() : null;

  const secret = base32Encode(randomBytes(bytes));
  const label = encodeURIComponent(issuer ? `${issuer}:${account ?? 'user'}` : (account ?? 'user'));
  const params = new URLSearchParams({ secret, algorithm: c.algorithm, digits: String(c.digits) });
  if (issuer) params.set('issuer', issuer);
  if (c.type === 'totp') params.set('period', String(c.period)); else params.set('counter', '0');
  const otpauth_uri = `otpauth://${c.type}/${label}?${params.toString()}`;

  return { result: { secret, bytes, algorithm: c.algorithm, digits: c.digits, period: c.period, type: c.type, issuer, account, otpauth_uri } };
}

const CHAIN_TO = [
  { api: 'passphrase-generator', reason: 'Generate the primary passphrase this OTP is the second factor for.' },
  { api: 'secret-scanner', reason: 'Ensure the TOTP secret is not committed to source control.' },
];
const INVALIDATORS = [
  'Codes are time- or counter-bound: a TOTP is only valid within its period (default 30s); a stale timestamp yields a code that has already expired.',
  'Verification uses a ± window of steps; a larger window accepts older/newer codes and trades security for clock-skew tolerance.',
  'Security depends entirely on the secret staying secret — anyone with the base32 secret can mint valid codes.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'TOTP / HOTP Generator API', version: '1.0.0',
    description: 'RFC 4226 (HOTP) + RFC 6238 (TOTP) one-time-password generator and verifier. Pure HMAC crypto over a base32 secret — deterministic given secret + counter/timestamp. Also mints random secrets and otpauth:// URIs. No LLM, secrets never stored.',
    openapi_url: 'https://orbis-apis.onrender.com/totp-hotp-generator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/generate', summary: 'Generate a TOTP/HOTP code', price_usdc: 0.004 },
      { method: 'POST', path: '/verify', summary: 'Verify a code within a window', price_usdc: 0.004 },
      { method: 'POST', path: '/secret', summary: 'Mint a random secret + otpauth URI', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL generate + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/generate', price_usdc: 0.004, currency: 'USDC' },
      { path: '/verify', price_usdc: 0.004, currency: 'USDC' },
      { path: '/secret', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

function genActions(r: GenCore): string[] {
  return [
    `${r.type.toUpperCase()} code ${r.code} (${r.algorithm}, ${r.digits} digits) for counter ${r.counter}.`,
    r.type === 'totp' ? `Valid for ${r.seconds_remaining}s more (until ${r.valid_until}); regenerate after expiry.` : 'Increment the counter on every use; never reuse a counter value.',
    'Transmit and store the secret only over secure channels.',
  ];
}
const GEN_TAIL = (r: GenCore) => ({
  confidence_score: 1, confidence_per_section: { otp: 1 },
  recommended_actions_priority_order: genActions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/generate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = generate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...GEN_TAIL(r.result) });
});

router.post('/verify', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = verify(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    confidence_score: 1, confidence_per_section: { otp: 1 },
    recommended_actions_priority_order: [
      v.valid ? `Code accepted at counter ${v.matched_counter} (offset ${v.matched_offset}).` : `Code rejected — no match across ${v.checked_counters.length} step(s) within ±${v.window}.`,
      v.valid && v.matched_offset !== 0 ? 'Accepted off the current step — clock drift or counter desync; consider resyncing.' : 'Use the smallest window that tolerates your clients’ clock skew.',
      'Reject reused codes at the application layer to prevent replay.',
    ],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/secret', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = mintSecret(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    confidence_score: 1, confidence_per_section: { otp: 1 },
    recommended_actions_priority_order: [
      `Provision an authenticator with the otpauth URI or the base32 secret (${v.bytes} bytes, ${v.algorithm}).`,
      'Show the secret/QR once, then store only a server-side encrypted copy.',
      'Pair with backup codes so a lost device does not lock the user out.',
    ],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = generate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `HMAC-${v.algorithm} over counter ${v.counter} → truncated to ${v.digits} digits → ${v.code}.`,
      key_factors: v.type === 'totp'
        ? [`TOTP: counter = floor(timestamp ${v.timestamp} / period ${v.period}) = ${v.counter}.`, `${v.seconds_remaining}s remaining in this step.`, `Algorithm ${v.algorithm}, ${v.digits} digits.`]
        : [`HOTP: explicit counter ${v.counter}.`, `Algorithm ${v.algorithm}, ${v.digits} digits.`, 'Counter must advance on each use.'],
      invalidators: INVALIDATORS,
    },
    ...GEN_TAIL(v),
  });
});

export default router;
