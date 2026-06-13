import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic JWT decoder. Splits a compact JWS (header.payload.signature),
// base64url-decodes the header and payload, parses their JSON, and surfaces the
// registered claims with human-readable ISO times. It DOES NOT verify the
// signature (no key is supplied) — signature_verified is always false. Pure
// parsing, no LLM, nothing stored.

const router = Router();

const REGISTERED = ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'] as const;
const TIME_CLAIMS = new Set(['exp', 'nbf', 'iat']);

function b64urlToBuf(s: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try { return Buffer.from(s, 'base64url'); } catch { return null; }
}

function epochToIso(v: unknown): string | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  // NumericDate is seconds since epoch (RFC 7519 §2).
  const d = new Date(v * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export interface DecodeCore {
  valid_structure: boolean;
  parts: number;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature_present: boolean;
  signature_verified: boolean;
  algorithm: string | null;
  token_type: string | null;
  key_id: string | null;
  registered_claims: Record<string, unknown>;
  claim_times: Record<string, string | null>;
  time_status: null | {
    as_of: string;
    is_expired: boolean | null;
    is_not_yet_valid: boolean | null;
    seconds_until_expiry: number | null;
  };
}

function asEpochSeconds(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    const d = Date.parse(v);
    if (!Number.isNaN(d)) return Math.floor(d / 1000);
  }
  return null;
}

export function decode(body: any): { error: string } | { result: DecodeCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a JSON object with a "token" string.' };
  const token = body.token;
  if (typeof token !== 'string' || token.trim() === '') return { error: '"token" must be a non-empty JWT string.' };
  const t = token.trim();
  const segs = t.split('.');
  if (segs.length !== 3) return { error: `A compact JWT has exactly 3 dot-separated segments; got ${segs.length}.` };
  const [h, p, sig] = segs;

  const hBuf = b64urlToBuf(h);
  const pBuf = b64urlToBuf(p);
  if (!hBuf) return { error: 'Header segment is not valid base64url.' };
  if (!pBuf) return { error: 'Payload segment is not valid base64url.' };

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try { const o = JSON.parse(hBuf.toString('utf8')); if (o === null || typeof o !== 'object' || Array.isArray(o)) throw 0; header = o; }
  catch { return { error: 'Header segment does not decode to a JSON object.' }; }
  try { const o = JSON.parse(pBuf.toString('utf8')); if (o === null || typeof o !== 'object' || Array.isArray(o)) throw 0; payload = o; }
  catch { return { error: 'Payload segment does not decode to a JSON object.' }; }

  const registered_claims: Record<string, unknown> = {};
  const claim_times: Record<string, string | null> = {};
  for (const k of REGISTERED) {
    if (k in payload) {
      registered_claims[k] = (payload as any)[k];
      if (TIME_CLAIMS.has(k)) claim_times[k] = epochToIso((payload as any)[k]);
    }
  }

  // time_status only when caller supplies "as_of" — keeps the result deterministic.
  let time_status: DecodeCore['time_status'] = null;
  if (body.as_of !== undefined) {
    const asOf = asEpochSeconds(body.as_of);
    if (asOf === null) return { error: '"as_of" must be epoch seconds or an ISO date-time string.' };
    const exp = typeof payload.exp === 'number' ? payload.exp : null;
    const nbf = typeof payload.nbf === 'number' ? payload.nbf : null;
    time_status = {
      as_of: new Date(asOf * 1000).toISOString(),
      is_expired: exp === null ? null : asOf >= exp,
      is_not_yet_valid: nbf === null ? null : asOf < nbf,
      seconds_until_expiry: exp === null ? null : Math.round(exp - asOf),
    };
  }

  return {
    result: {
      valid_structure: true,
      parts: 3,
      header,
      payload,
      signature_present: sig.length > 0,
      signature_verified: false,
      algorithm: typeof header.alg === 'string' ? header.alg : null,
      token_type: typeof header.typ === 'string' ? header.typ : null,
      key_id: typeof header.kid === 'string' ? header.kid : null,
      registered_claims,
      claim_times,
      time_status,
    },
  };
}

const CHAIN_TO = [
  { api: 'jwt-claim-policy-validator', reason: 'Validate the decoded claims (iss/aud/exp/required claims) against a policy.' },
  { api: 'secret-scanner', reason: 'Scan the decoded payload for tokens or secrets that should not live in a JWT.' },
];
const INVALIDATORS = [
  'The signature is NOT verified — a decoded JWT proves nothing about authenticity or integrity. Anyone can forge these fields without the signing key.',
  'NumericDate claims (exp/nbf/iat) are interpreted as seconds since the Unix epoch; a token using milliseconds will yield wildly wrong ISO times.',
  'time_status is computed only against the supplied "as_of"; without it, no expiry judgement is made.',
];

function actions(r: DecodeCore): string[] {
  const out = [`Decoded ${Object.keys(r.registered_claims).length} registered claim(s); alg=${r.algorithm ?? 'unknown'}.`];
  out.push('Signature is NOT verified — verify it against the issuer key (JWKS) before trusting this token.');
  if (r.time_status?.is_expired) out.push('Token is expired as of the supplied as_of — reject it.');
  else if (r.time_status?.is_not_yet_valid) out.push('Token is not yet valid (nbf in the future) as of as_of.');
  if (r.algorithm && r.algorithm.toLowerCase() === 'none') out.push('alg is "none" — reject; unsecured JWTs must never be accepted.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'JWT Decoder API', version: '1.0.0',
    description: 'Deterministic JWT decoder. Splits a compact JWS, base64url-decodes the header and payload, parses their JSON, and surfaces registered claims with human-readable ISO times. Signature is NOT verified. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/jwt-decoder/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/decode', summary: 'Decode a JWT (no signature verification)', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL decode + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/decode', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: DecodeCore) => ({
  confidence_score: 1, confidence_per_section: { decode: 1, authenticity: 0 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/decode', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = decode(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = decode(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Split the JWT into 3 segments and decoded header + payload as JSON; surfaced ${Object.keys(v.registered_claims).length} registered claim(s).`,
      key_factors: [
        `alg=${v.algorithm ?? 'unknown'}, typ=${v.token_type ?? 'unset'}, kid=${v.key_id ?? 'none'}.`,
        `Signature present: ${v.signature_present}; verified: ${v.signature_verified} (never verified by this API).`,
        v.time_status ? `as_of expiry check: expired=${v.time_status.is_expired}.` : 'No as_of supplied — no expiry judgement.',
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
