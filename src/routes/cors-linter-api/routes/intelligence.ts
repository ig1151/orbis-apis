import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic CORS configuration linter. Accepts either an explicit config
// (allow_origin / allow_credentials / allow_methods / allow_headers / vary / …)
// or a raw response-headers object, then flags well-known cross-origin
// misconfigurations (wildcard origin with credentials, reflected/null origin,
// wildcard headers with credentials, missing Vary: Origin) with a 0–100 score.
// Best-practice heuristics — no LLM, nothing stored.

const router = Router();
type Sev = 'high' | 'medium' | 'low';
const PENALTY: Record<Sev, number> = { high: 25, medium: 12, low: 5 };

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

export interface CorsFinding { field: string; severity: Sev; code: string; message: string; recommendation: string; }
export interface CorsConfig {
  allow_origin: string | null; allow_credentials: boolean;
  allow_methods: string[]; allow_headers: string[]; expose_headers: string[];
  vary: string[]; max_age: number | null;
}
export interface LintCore {
  config: CorsConfig; findings: CorsFinding[]; by_severity: Record<Sev, number>;
  score: number; grade: string; passed: boolean; source: 'config' | 'headers';
}

function readConfig(b: any): { error: string } | { cfg: CorsConfig; source: 'config' | 'headers' } {
  if (b.headers !== undefined) {
    if (b.headers === null || typeof b.headers !== 'object' || Array.isArray(b.headers)) return { error: '"headers" must be an object of response header name/value pairs.' };
    const h: Record<string, string> = {};
    for (const k of Object.keys(b.headers)) h[k.toLowerCase()] = String(b.headers[k]);
    return {
      source: 'headers',
      cfg: {
        allow_origin: h['access-control-allow-origin'] ?? null,
        allow_credentials: (h['access-control-allow-credentials'] ?? '').toLowerCase() === 'true',
        allow_methods: asList(h['access-control-allow-methods']),
        allow_headers: asList(h['access-control-allow-headers']),
        expose_headers: asList(h['access-control-expose-headers']),
        vary: asList(h['vary']),
        max_age: h['access-control-max-age'] !== undefined && /^\d+$/.test(h['access-control-max-age']) ? parseInt(h['access-control-max-age'], 10) : null,
      },
    };
  }
  const allow_origin = b.allow_origin === undefined ? null : (typeof b.allow_origin === 'string' ? b.allow_origin : null);
  if (b.allow_origin !== undefined && typeof b.allow_origin !== 'string') return { error: '"allow_origin" must be a string (e.g. "*", "null", or an origin).' };
  if (b.allow_credentials !== undefined && typeof b.allow_credentials !== 'boolean') return { error: '"allow_credentials" must be a boolean.' };
  if (b.max_age !== undefined && (typeof b.max_age !== 'number' || !Number.isFinite(b.max_age))) return { error: '"max_age" must be a number.' };
  return {
    source: 'config',
    cfg: {
      allow_origin,
      allow_credentials: b.allow_credentials === true,
      allow_methods: asList(b.allow_methods),
      allow_headers: asList(b.allow_headers),
      expose_headers: asList(b.expose_headers),
      vary: asList(b.vary),
      max_age: b.max_age === undefined ? null : b.max_age,
    },
  };
}

export function lint(body: any): { error: string } | { result: LintCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a CORS config object or a "headers" object.' };
  const r = readConfig(body);
  if ('error' in r) return r;
  const c = r.cfg;
  if (c.allow_origin === null && c.allow_methods.length === 0 && c.allow_headers.length === 0) {
    return { error: 'No CORS fields found. Provide allow_origin/allow_methods/allow_headers (or a "headers" object with Access-Control-* headers).' };
  }

  const findings: CorsFinding[] = [];
  const origin = c.allow_origin;
  const wildcardOrigin = origin === '*';
  const headersHasWildcard = c.allow_headers.includes('*');

  if (wildcardOrigin && c.allow_credentials) {
    findings.push({ field: 'access-control-allow-origin', severity: 'high', code: 'WILDCARD_ORIGIN_WITH_CREDENTIALS', message: 'allow-origin "*" combined with allow-credentials:true is rejected by browsers and signals a server that may reflect arbitrary origins with credentials.', recommendation: 'Echo a single validated origin from an allow-list instead of "*" when credentials are enabled.' });
  } else if (wildcardOrigin) {
    findings.push({ field: 'access-control-allow-origin', severity: 'medium', code: 'WILDCARD_ORIGIN', message: 'allow-origin "*" exposes the resource to every site. Acceptable only for fully public, non-credentialed data.', recommendation: 'Restrict to an explicit origin allow-list unless this endpoint is intentionally public.' });
  }
  if (origin && origin.toLowerCase() === 'null') {
    findings.push({ field: 'access-control-allow-origin', severity: 'high', code: 'NULL_ORIGIN_ALLOWED', message: 'allow-origin "null" can be forged by sandboxed iframes, data: URLs, and local files.', recommendation: 'Never allow the literal "null" origin; validate against real origins.' });
  }
  if (c.allow_credentials && headersHasWildcard) {
    findings.push({ field: 'access-control-allow-headers', severity: 'high', code: 'WILDCARD_HEADERS_WITH_CREDENTIALS', message: 'allow-headers "*" is ignored when credentials are allowed, and signals an over-permissive policy.', recommendation: 'List the specific request headers you accept.' });
  }
  if (c.allow_methods.includes('*')) {
    findings.push({ field: 'access-control-allow-methods', severity: 'medium', code: 'WILDCARD_METHODS', message: 'allow-methods "*" permits every HTTP method, including ones the API does not implement.', recommendation: 'List only the methods this endpoint supports (e.g. GET, POST).' });
  }
  // Origin is dynamic/specific (not wildcard) but Vary: Origin is missing → cache poisoning risk.
  if (origin && !wildcardOrigin && origin.toLowerCase() !== 'null' && !c.vary.map((v) => v.toLowerCase()).includes('origin')) {
    findings.push({ field: 'vary', severity: 'medium', code: 'MISSING_VARY_ORIGIN', message: 'A per-origin allow-origin is returned without "Vary: Origin", so a shared cache can serve one origin’s CORS headers to another.', recommendation: 'Add "Vary: Origin" whenever allow-origin is computed from the request Origin.' });
  }
  if (c.allow_credentials && c.expose_headers.includes('*')) {
    findings.push({ field: 'access-control-expose-headers', severity: 'low', code: 'WILDCARD_EXPOSE_WITH_CREDENTIALS', message: 'expose-headers "*" is ignored with credentials and over-broad otherwise.', recommendation: 'Enumerate the response headers clients may read.' });
  }

  const by_severity: Record<Sev, number> = { high: 0, medium: 0, low: 0 };
  let score = 100;
  for (const f of findings) { by_severity[f.severity]++; score -= PENALTY[f.severity]; }
  score = Math.max(0, score);
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F';
  findings.sort((a, b) => PENALTY[b.severity] - PENALTY[a.severity] || a.code.localeCompare(b.code));

  return { result: { config: c, findings, by_severity, score, grade, passed: by_severity.high === 0, source: r.source } };
}

const CHAIN_TO = [
  { api: 'csp-builder-linter', reason: 'Harden the Content-Security-Policy alongside the CORS policy.' },
  { api: 'jwt-claim-policy-validator', reason: 'Validate the bearer tokens these cross-origin requests will carry.' },
];
const INVALIDATORS = [
  'Static analysis cannot see whether allow-origin is REFLECTED from the request Origin at runtime — a single concrete origin in the sample may actually be dynamically echoed (the dangerous case), so confirm server logic.',
  'Heuristics encode common-case best practice; a wildcard origin is fine for genuinely public, non-credentialed APIs.',
  'Browser enforcement varies; the policy is one layer, not a substitute for authentication/authorization.',
];

function actions(r: LintCore): string[] {
  if (r.findings.length === 0) return [`No CORS weaknesses detected — score ${r.score}/100 (${r.grade}).`, 'Confirm allow-origin is matched against an allow-list (not blindly reflected) at runtime.'];
  const top = r.findings[0];
  return [
    `Score ${r.score}/100 (${r.grade}); ${r.by_severity.high} high-severity issue(s). Fix first: ${top.code} on ${top.field}.`,
    top.recommendation,
    'Verify the running server does not reflect arbitrary Origin headers back with credentials.',
  ];
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'CORS Linter API', version: '1.0.0',
    description: 'Deterministic CORS configuration linter. Accepts an explicit config or a raw response-headers object and flags cross-origin misconfigurations (wildcard origin with credentials, null/reflected origin, wildcard headers with credentials, missing Vary: Origin) with a 0–100 score. Best-practice heuristics, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/cors-linter/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/lint', summary: 'Lint a CORS configuration', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL lint + reasoning', price_usdc: 0.009 },
    ],
    pricing: [
      { path: '/lint', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: LintCore) => ({
  confidence_score: 0.9, confidence_per_section: { policy: 0.9 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/lint', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = lint(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = lint(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Parsed CORS ${v.source}; ${v.findings.length} finding(s) → score ${v.score}/100 (${v.grade}).`,
      key_factors: [
        `allow-origin "${v.config.allow_origin ?? '(unset)'}", credentials=${v.config.allow_credentials}.`,
        `Severity: ${v.by_severity.high} high, ${v.by_severity.medium} medium, ${v.by_severity.low} low.`,
        v.findings.length ? `Top issue: ${v.findings[0].code}.` : 'No best-practice violations found.',
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
