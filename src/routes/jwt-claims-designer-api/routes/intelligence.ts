import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic JWT claims DESIGNER. Given a token profile (type, issuer,
// audience, scopes, TTL, signing alg), generates a recommended registered +
// custom claim set, sensible TTLs, an example payload, signing-algorithm advice,
// and security recommendations / anti-patterns. This GENERATES a design — it does
// not decode (jwt-decoder) or validate against a policy (jwt-claim-policy-validator).
// Rule-based, no LLM, nothing stored.

const router = Router();

const TOKEN_TYPES = ['access', 'id', 'refresh'];
const SUBJECT_TYPES = ['user', 'service'];
const KNOWN_ALGS = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512'];
const DEFAULT_TTL: Record<string, number> = { access: 900, id: 3600, refresh: 2592000 };
const IAT_EXAMPLE = 1700000000; // fixed reference instant so the example payload is deterministic

export interface RegisteredClaim { claim: string; include: boolean; required: boolean; value_or_format: string; rationale: string; }
export interface CustomClaim { claim: string; value_or_format: string; rationale: string; }
export interface AlgorithmAdvice { provided: string | null; recommended: string[]; avoid: string[]; note: string; }
export interface DesignCore {
  token_type: string;
  subject_type: string;
  recommended_ttl_seconds: number;
  registered_claims: RegisteredClaim[];
  custom_claims: CustomClaim[];
  example_payload: Record<string, unknown>;
  algorithm: AlgorithmAdvice;
  security_recommendations: string[];
  anti_patterns: string[];
}

interface Profile { tokenType: string; issuer: string; audience: string | string[]; subjectType: string; scopes: string[]; ttl: number; algorithm: string | null; }

function design(p: Profile): DesignCore {
  const { tokenType, issuer, audience, subjectType, scopes, ttl, algorithm } = p;
  const subValue = subjectType === 'service' ? 'svc-client-abc (the service/client identifier)' : 'user-123 (stable, non-reassignable user id)';
  const needsJti = tokenType === 'refresh';

  const registered_claims: RegisteredClaim[] = [
    { claim: 'iss', include: true, required: true, value_or_format: issuer, rationale: 'Identifies the issuer; verifiers must check it.' },
    { claim: 'sub', include: true, required: true, value_or_format: subValue, rationale: 'Principal the token is about; keep it stable and opaque.' },
    { claim: 'aud', include: true, required: true, value_or_format: Array.isArray(audience) ? audience.join(', ') : audience, rationale: 'Intended recipient(s); verifiers must reject tokens not meant for them.' },
    { claim: 'exp', include: true, required: true, value_or_format: `iat + ${ttl}s (UNIX seconds)`, rationale: 'Expiry; keep short for access tokens.' },
    { claim: 'iat', include: true, required: true, value_or_format: 'issue time (UNIX seconds)', rationale: 'Issue time; supports max-age and freshness checks.' },
    { claim: 'nbf', include: true, required: false, value_or_format: '= iat (UNIX seconds)', rationale: 'Not-before; defend against early use / clock games.' },
    { claim: 'jti', include: needsJti || tokenType === 'access', required: needsJti, value_or_format: 'unique token id (UUID)', rationale: needsJti ? 'Required to support refresh-token revocation/rotation.' : 'Enables per-token revocation and replay detection.' },
  ];

  const custom_claims: CustomClaim[] = [];
  if (tokenType === 'access') {
    custom_claims.push({ claim: 'scope', value_or_format: scopes.length ? scopes.join(' ') : 'space-delimited scopes', rationale: 'Least-privilege authorization the token grants.' });
    custom_claims.push({ claim: 'client_id', value_or_format: 'client-abc', rationale: 'OAuth client that requested the token.' });
  } else if (tokenType === 'id') {
    custom_claims.push({ claim: 'auth_time', value_or_format: 'UNIX seconds of authentication', rationale: 'When the end-user authenticated (OIDC).' });
    custom_claims.push({ claim: 'nonce', value_or_format: 'echo of the request nonce', rationale: 'Binds the ID token to the auth request; mitigates replay.' });
    if (Array.isArray(audience) && audience.length > 1) custom_claims.push({ claim: 'azp', value_or_format: 'authorized party (client_id)', rationale: 'Required by OIDC when there are multiple audiences.' });
  } else { // refresh
    custom_claims.push({ claim: 'client_id', value_or_format: 'client-abc', rationale: 'Binds the refresh token to its client.' });
  }

  const example_payload: Record<string, unknown> = {
    iss: issuer, sub: subjectType === 'service' ? 'svc-client-abc' : 'user-123', aud: audience,
    iat: IAT_EXAMPLE, nbf: IAT_EXAMPLE, exp: IAT_EXAMPLE + ttl,
  };
  if (registered_claims.find((c) => c.claim === 'jti')!.include) example_payload.jti = '5f3b2a1c-0d9e-4b8a-9c1f-2e7d6a4b3c2d';
  for (const c of custom_claims) {
    if (c.claim === 'scope') example_payload.scope = scopes.length ? scopes.join(' ') : 'read write';
    else if (c.claim === 'client_id') example_payload.client_id = 'client-abc';
    else if (c.claim === 'auth_time') example_payload.auth_time = IAT_EXAMPLE;
    else if (c.claim === 'nonce') example_payload.nonce = 'n-0S6_WzA2Mj';
    else if (c.claim === 'azp') example_payload.azp = 'client-abc';
  }

  const usesHS = algorithm ? algorithm.startsWith('HS') : false;
  const algorithm_advice: AlgorithmAdvice = {
    provided: algorithm,
    recommended: ['RS256', 'ES256'],
    avoid: ['none', 'HS256 (across service boundaries)'],
    note: usesHS
      ? 'HS* uses a shared secret — every verifier can also mint tokens. Prefer RS256/ES256 in distributed systems so verifiers hold only the public key.'
      : 'Asymmetric signing (RS256/ES256) lets verifiers validate with a public key while only the issuer can sign. Never accept alg:none or let clients choose the alg.',
  };

  const security_recommendations = [
    `Keep ${tokenType} tokens short-lived (recommended ${ttl}s)${tokenType === 'access' ? '; use refresh tokens for longevity.' : '.'}`,
    'Always validate iss, aud, exp, and nbf on the verifier; allow ~60s clock-skew leeway.',
    needsJti ? 'Track jti and rotate refresh tokens; maintain a revocation list.' : 'Include jti to enable revocation and replay detection.',
    'Never put passwords, secrets, full PII, or payment data in claims — a JWT is base64-encoded, not encrypted.',
    'Scope tokens narrowly (least privilege via scope + aud).',
  ];
  const anti_patterns = [
    'Long-lived or non-expiring access tokens.',
    'Accepting alg:none or trusting the alg header from the client.',
    'Embedding sensitive data (PII/secrets) in claims.',
    'Skipping aud/iss validation, so a token for service A is accepted by service B.',
  ];

  return {
    token_type: tokenType, subject_type: subjectType, recommended_ttl_seconds: ttl,
    registered_claims, custom_claims, example_payload, algorithm: algorithm_advice,
    security_recommendations, anti_patterns,
  };
}

function parse(body: any): { error: string } | { profile: Profile } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "token_type", "issuer", and "audience".' };
  if (!TOKEN_TYPES.includes(body.token_type)) return { error: `"token_type" must be one of: ${TOKEN_TYPES.join(', ')}.` };
  if (typeof body.issuer !== 'string' || body.issuer === '') return { error: '"issuer" must be a non-empty string.' };
  let audience: string | string[];
  if (typeof body.audience === 'string' && body.audience !== '') audience = body.audience;
  else if (Array.isArray(body.audience) && body.audience.length > 0 && body.audience.every((a: unknown) => typeof a === 'string' && a !== '')) audience = body.audience as string[];
  else return { error: '"audience" must be a non-empty string or array of non-empty strings.' };

  let subjectType = 'user';
  if (body.subject_type !== undefined) {
    if (!SUBJECT_TYPES.includes(body.subject_type)) return { error: `"subject_type" must be one of: ${SUBJECT_TYPES.join(', ')}.` };
    subjectType = body.subject_type;
  }
  let scopes: string[] = [];
  if (body.scopes !== undefined) {
    if (!Array.isArray(body.scopes) || !body.scopes.every((s: unknown) => typeof s === 'string' && s !== '')) return { error: '"scopes" must be an array of non-empty strings.' };
    scopes = body.scopes as string[];
  }
  let ttl = DEFAULT_TTL[body.token_type];
  if (body.ttl_seconds !== undefined) {
    if (typeof body.ttl_seconds !== 'number' || !Number.isInteger(body.ttl_seconds) || body.ttl_seconds < 1 || body.ttl_seconds > 31536000) return { error: '"ttl_seconds" must be an integer in [1, 31536000].' };
    ttl = body.ttl_seconds;
  }
  let algorithm: string | null = null;
  if (body.algorithm !== undefined) {
    if (!KNOWN_ALGS.includes(body.algorithm)) return { error: `"algorithm" must be one of: ${KNOWN_ALGS.join(', ')}.` };
    algorithm = body.algorithm;
  }
  return { profile: { tokenType: body.token_type, issuer: body.issuer, audience, subjectType, scopes, ttl, algorithm } };
}

const CHAIN_TO = [
  { api: 'jwt-claim-policy-validator', reason: 'Validate real tokens against the claim policy this design implies.' },
  { api: 'jwt-decoder', reason: 'Decode and inspect an issued token built from this design.' },
];
const INVALIDATORS = [
  'This generates a recommended claim DESIGN from the supplied profile; it does not mint, sign, decode, or validate tokens, and example_payload uses placeholder values + a fixed reference iat.',
  'Recommendations follow JWT/OAuth/OIDC best practice (RFC 7519 / RFC 9068 / OIDC Core) but are general guidance — your IdP, framework, or threat model may require different claims.',
  'TTLs are sensible defaults per token type (access 900s, id 3600s, refresh 2592000s) overridable via ttl_seconds; tune to your risk tolerance.',
];

const TAIL = (r: DesignCore) => ({
  confidence_score: 0.85, confidence_per_section: { claims: 1, recommendations: 0.8 },
  recommended_actions_priority_order: [
    `Issue ${r.token_type} tokens with the ${r.registered_claims.filter((c) => c.include).length} registered + ${r.custom_claims.length} custom claim(s) shown; TTL ${r.recommended_ttl_seconds}s.`,
    `Sign with ${r.algorithm.recommended.join(' or ')}; ${r.algorithm.provided ? `provided alg = ${r.algorithm.provided}.` : 'avoid HS256 across services and never accept alg:none.'}`,
    'Validate iss/aud/exp/nbf on every verifier and keep sensitive data out of claims.',
  ],
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'JWT Claims Designer API', version: '1.0.0',
    description: 'Deterministic JWT claims designer. From a token profile (type/issuer/audience/scopes/TTL/alg) it generates a recommended registered + custom claim set, TTLs, an example payload, signing-algorithm advice, and security recommendations. Generates a design — does not decode or validate. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/jwt-claims-designer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/design', summary: 'Design a recommended JWT claim set', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL design + reasoning', price_usdc: 0.014 },
    ],
    pricing: [
      { path: '/design', price_usdc: 0.008, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/design', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = design(p.profile);
  respond(res, t0, { ...r, ...TAIL(r) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = design(p.profile);
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Designed a ${r.token_type}-token claim set for a ${r.subject_type} subject: ${r.registered_claims.filter((c) => c.include).length} registered + ${r.custom_claims.length} custom claim(s), TTL ${r.recommended_ttl_seconds}s.`,
      key_factors: [
        `Registered claims: ${r.registered_claims.filter((c) => c.include).map((c) => c.claim).join(', ')}.`,
        `Custom claims: ${r.custom_claims.map((c) => c.claim).join(', ') || 'none'}.`,
        `Algorithm advice: prefer ${r.algorithm.recommended.join('/')}${r.algorithm.provided ? ` (provided ${r.algorithm.provided})` : ''}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(r),
  });
});

export default router;
