import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic JWT claim-policy validator. Decodes a JWT (header + payload,
// base64url) WITHOUT verifying the signature, or takes a claims object directly,
// then checks the claims against a policy: exp/nbf/iat time validity (with clock
// skew + max age), issuer/audience/subject allow-lists, required claims, and
// exact-value matches. It explicitly does NOT verify the signature — never trust
// the result as proof of authenticity. No LLM, nothing stored.

const router = Router();

function b64urlToJson(seg: string): any {
  const buf = Buffer.from(seg.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return JSON.parse(buf.toString('utf8'));
}

export interface Check { name: string; status: 'pass' | 'fail' | 'skip'; detail: string; }
export interface Violation { code: string; claim: string | null; message: string; }
export interface ValidateCore {
  valid: boolean; signature_verified: boolean;
  header: Record<string, any> | null; claims: Record<string, any>;
  checks: Check[]; violations: Violation[];
  now: number; expires_in_seconds: number | null;
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') return [v];
  return [];
}

export function validate(body: any): { error: string } | { result: ValidateCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide "token" or "claims", plus a "policy".' };
  if (body.policy === null || typeof body.policy !== 'object' || Array.isArray(body.policy)) return { error: '"policy" is required and must be an object.' };
  const policy = body.policy;

  let header: Record<string, any> | null = null;
  let claims: Record<string, any>;
  if (typeof body.token === 'string' && body.token.length) {
    const parts = body.token.split('.');
    if (parts.length < 2) return { error: '"token" is not a JWT (expected header.payload.signature).' };
    try { header = b64urlToJson(parts[0]); claims = b64urlToJson(parts[1]); } catch { return { error: 'Failed to base64url-decode the JWT header/payload as JSON.' }; }
    if (claims === null || typeof claims !== 'object' || Array.isArray(claims)) return { error: 'Decoded JWT payload is not a JSON object.' };
  } else if (body.claims && typeof body.claims === 'object' && !Array.isArray(body.claims)) {
    claims = body.claims;
  } else {
    return { error: 'Provide a "token" string or a "claims" object.' };
  }

  const now = body.now === undefined ? Math.floor(Date.now() / 1000) : body.now;
  if (typeof now !== 'number' || !Number.isFinite(now)) return { error: '"now" must be a unix-seconds number.' };
  const skew = typeof policy.clock_skew_seconds === 'number' ? policy.clock_skew_seconds : 0;

  const checks: Check[] = [];
  const violations: Violation[] = [];
  const fail = (name: string, code: string, claim: string | null, message: string) => { checks.push({ name, status: 'fail', detail: message }); violations.push({ code, claim, message }); };
  const pass = (name: string, detail: string) => checks.push({ name, status: 'pass', detail });
  const skip = (name: string, detail: string) => checks.push({ name, status: 'skip', detail });

  // exp
  if (policy.check_exp !== false) {
    if (typeof claims.exp === 'number') { if (now > claims.exp + skew) fail('exp', 'EXPIRED', 'exp', `Token expired at ${claims.exp}; now ${now} (skew ${skew}s).`); else pass('exp', `Not expired (exp ${claims.exp}).`); }
    else skip('exp', 'No exp claim.');
  } else skip('exp', 'exp check disabled.');

  // nbf
  if (policy.check_nbf !== false) {
    if (typeof claims.nbf === 'number') { if (now < claims.nbf - skew) fail('nbf', 'NOT_YET_VALID', 'nbf', `Token not valid until ${claims.nbf}; now ${now}.`); else pass('nbf', `Active (nbf ${claims.nbf}).`); }
    else skip('nbf', 'No nbf claim.');
  } else skip('nbf', 'nbf check disabled.');

  // max age via iat
  if (typeof policy.max_age_seconds === 'number') {
    if (typeof claims.iat === 'number') { if (now - claims.iat > policy.max_age_seconds + skew) fail('max_age', 'TOO_OLD', 'iat', `Age ${now - claims.iat}s exceeds max ${policy.max_age_seconds}s.`); else pass('max_age', `Age ${now - claims.iat}s within ${policy.max_age_seconds}s.`); }
    else fail('max_age', 'MISSING_IAT', 'iat', 'max_age_seconds policy set but token has no iat claim.');
  }

  // issuer
  if (policy.iss !== undefined) {
    const allowed = asList(policy.iss);
    if (typeof claims.iss === 'string' && allowed.includes(claims.iss)) pass('iss', `Issuer "${claims.iss}" allowed.`);
    else fail('iss', 'ISSUER_MISMATCH', 'iss', `Issuer "${claims.iss ?? '(absent)'}" not in allow-list [${allowed.join(', ')}].`);
  }

  // audience
  if (policy.aud !== undefined) {
    const allowed = asList(policy.aud);
    const tokenAud = asList(claims.aud);
    if (tokenAud.some((a) => allowed.includes(a))) pass('aud', `Audience matched (${tokenAud.join(', ')}).`);
    else fail('aud', 'AUDIENCE_MISMATCH', 'aud', `Audience [${tokenAud.join(', ') || '(absent)'}] does not intersect allow-list [${allowed.join(', ')}].`);
  }

  // subject
  if (policy.subject !== undefined) {
    if (claims.sub === policy.subject) pass('sub', `Subject matches "${policy.subject}".`);
    else fail('sub', 'SUBJECT_MISMATCH', 'sub', `Subject "${claims.sub ?? '(absent)'}" != expected "${policy.subject}".`);
  }

  // required claims
  if (Array.isArray(policy.require)) {
    const missing = policy.require.filter((c: any) => !(String(c) in claims));
    if (missing.length === 0) pass('required', `All required claims present (${policy.require.join(', ')}).`);
    else for (const c of missing) fail('required', 'MISSING_CLAIM', String(c), `Required claim "${c}" is absent.`);
  }

  // exact-value matches
  if (policy.equals && typeof policy.equals === 'object' && !Array.isArray(policy.equals)) {
    for (const c of Object.keys(policy.equals)) {
      if (JSON.stringify(claims[c]) === JSON.stringify(policy.equals[c])) pass(`equals:${c}`, `Claim "${c}" matches expected value.`);
      else fail(`equals:${c}`, 'CLAIM_MISMATCH', c, `Claim "${c}" does not equal the expected value.`);
    }
  }

  const expires_in_seconds = typeof claims.exp === 'number' ? claims.exp - now : null;
  return { result: { valid: violations.length === 0, signature_verified: false, header, claims, checks, violations, now, expires_in_seconds } };
}

const CHAIN_TO = [
  { api: 'oauth-scope-diff', reason: 'Compare the token’s "scope" claim against what the operation requires.' },
  { api: 'iam-scope-simulator', reason: 'Map the validated identity to concrete action/resource permissions.' },
];
const INVALIDATORS = [
  'SIGNATURE IS NOT VERIFIED. This only inspects claims — a valid result does NOT prove the token is authentic or unaltered. Verify the signature against the issuer’s JWKS separately before trusting it.',
  'Time checks use the supplied "now" (or server time) and clock_skew_seconds; a wrong clock or skew changes exp/nbf outcomes.',
  'Claim comparisons are exact (issuer/audience/subject/equals); it does not understand provider-specific claim semantics or nested-claim policies beyond top-level keys.',
];

function actions(r: ValidateCore): string[] {
  const out: string[] = [];
  if (r.valid) out.push(`All claim-policy checks passed${r.expires_in_seconds !== null ? ` (expires in ${r.expires_in_seconds}s)` : ''}.`);
  else out.push(`${r.violations.length} violation(s) — first: ${r.violations[0].code}${r.violations[0].claim ? ` on ${r.violations[0].claim}` : ''}.`);
  out.push('ALWAYS verify the JWT signature (issuer JWKS) separately — this endpoint does not, so do not authorize on claims alone.');
  out.push(r.valid ? 'Proceed only after signature verification succeeds.' : (r.violations[0]?.message ?? 'Fix the failing claim.'));
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'JWT Claim Policy Validator API', version: '1.0.0',
    description: 'Deterministic JWT claim-policy validator. Decodes a JWT (or takes a claims object) WITHOUT verifying the signature, then checks claims against a policy: exp/nbf/iat validity (clock skew + max age), issuer/audience/subject allow-lists, required claims, and exact-value matches. Signature is NOT verified. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/jwt-claim-policy-validator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/validate', summary: 'Validate JWT claims vs a policy', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL validate + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/validate', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: ValidateCore) => ({
  confidence_score: 0.9, confidence_per_section: { claim_checks: 1, authenticity: 0 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/validate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = validate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = validate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.checks.filter((c) => c.status !== 'skip').length} claim check(s) run → ${v.violations.length} violation(s); valid=${v.valid}. Signature NOT verified.`,
      key_factors: [
        `Checks: ${v.checks.map((c) => `${c.name}=${c.status}`).join(', ')}.`,
        v.violations.length ? `Violations: ${v.violations.map((x) => x.code).join(', ')}.` : 'No claim violations.',
        'signature_verified is always false — verify the signature out of band.',
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
