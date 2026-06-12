import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic Content-Security-Policy builder + linter. /lint parses a CSP
// header and flags well-known weaknesses (unsafe-inline/eval, wildcard sources,
// data: in script-src, insecure schemes, missing default-src/object-src/
// frame-ancestors/base-uri) with a 0–100 hardening score. /build assembles a
// canonical header from a directives object, auto-quoting CSP keywords. Pure
// string analysis against published best practices — no LLM. Nothing stored.

const router = Router();
const MAX_LEN = 32 * 1024;
type Sev = 'high' | 'medium' | 'low';
const PENALTY: Record<Sev, number> = { high: 25, medium: 12, low: 5 };

const KEYWORDS = new Set(['self', 'none', 'unsafe-inline', 'unsafe-eval', 'strict-dynamic', 'unsafe-hashes', 'report-sample', 'wasm-unsafe-eval']);
const KNOWN_DIRECTIVES = new Set([
  'default-src', 'script-src', 'script-src-elem', 'script-src-attr', 'style-src', 'style-src-elem', 'style-src-attr',
  'img-src', 'font-src', 'connect-src', 'media-src', 'object-src', 'prefetch-src', 'child-src', 'frame-src', 'worker-src',
  'manifest-src', 'base-uri', 'form-action', 'frame-ancestors', 'sandbox', 'report-uri', 'report-to', 'require-trusted-types-for',
  'trusted-types', 'upgrade-insecure-requests', 'block-all-mixed-content',
]);

export interface CspFinding { directive: string; severity: Sev; code: string; message: string; recommendation: string; }
export interface LintCore {
  valid: boolean; directive_count: number; parsed_directives: Record<string, string[]>;
  unknown_directives: string[]; findings: CspFinding[]; by_severity: Record<Sev, number>;
  score: number; grade: string; passed: boolean;
}

function parse(csp: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const seg of csp.split(';')) {
    const t = seg.trim();
    if (!t) continue;
    const parts = t.split(/\s+/);
    const name = parts[0].toLowerCase();
    if (!(name in out)) out[name] = parts.slice(1);
  }
  return out;
}

export function lint(body: any): { error: string } | { result: LintCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "csp" string.' };
  if (typeof body.csp !== 'string' || body.csp.trim() === '') return { error: '"csp" is required and must be a non-empty Content-Security-Policy string.' };
  if (body.csp.length > MAX_LEN) return { error: `"csp" exceeds the ${MAX_LEN}-character limit.` };

  const d = parse(body.csp);
  const names = Object.keys(d);
  const unknown_directives = names.filter((n) => !KNOWN_DIRECTIVES.has(n));
  const findings: CspFinding[] = [];
  const has = (n: string) => n in d;
  const effScript = d['script-src'] ?? d['default-src'] ?? null;
  const effStyle = d['style-src'] ?? d['default-src'] ?? null;
  const effObject = d['object-src'] ?? d['default-src'] ?? null;

  if (!has('default-src')) findings.push({ directive: 'default-src', severity: 'medium', code: 'MISSING_DEFAULT_SRC', message: 'No default-src fallback; directives you did not set are unrestricted.', recommendation: "Add default-src 'none' (or 'self') and explicitly allow what you need." });

  if (effScript) {
    if (effScript.includes("'unsafe-inline'")) findings.push({ directive: 'script-src', severity: 'high', code: 'UNSAFE_INLINE_SCRIPT', message: "script-src allows 'unsafe-inline', which permits inline scripts and defeats most XSS protection.", recommendation: 'Remove unsafe-inline; use nonces or hashes for required inline scripts.' });
    if (effScript.includes("'unsafe-eval'")) findings.push({ directive: 'script-src', severity: 'high', code: 'UNSAFE_EVAL', message: "script-src allows 'unsafe-eval', enabling eval()/new Function() injection sinks.", recommendation: 'Remove unsafe-eval and refactor code that relies on eval.' });
    if (effScript.includes('data:')) findings.push({ directive: 'script-src', severity: 'high', code: 'DATA_URI_SCRIPT', message: 'script-src allows the data: scheme, which lets attackers inject scripts via data URIs.', recommendation: 'Remove data: from script-src.' });
  } else {
    findings.push({ directive: 'script-src', severity: 'high', code: 'NO_SCRIPT_RESTRICTION', message: 'Neither script-src nor default-src is set, so scripts load from anywhere.', recommendation: "Set script-src 'self' (plus nonces/hashes) or a default-src fallback." });
  }

  if (effStyle && effStyle.includes("'unsafe-inline'")) findings.push({ directive: 'style-src', severity: 'medium', code: 'UNSAFE_INLINE_STYLE', message: "style-src allows 'unsafe-inline', enabling CSS-based data exfiltration and UI redressing.", recommendation: 'Prefer nonces/hashes for required inline styles.' });

  for (const n of names) {
    if (d[n].includes('*')) findings.push({ directive: n, severity: 'high', code: 'WILDCARD_SOURCE', message: `${n} contains a wildcard "*" source, allowing content from any origin.`, recommendation: `Replace "*" in ${n} with an explicit allow-list.` });
    if (d[n].some((s) => /^http:/i.test(s))) findings.push({ directive: n, severity: 'medium', code: 'INSECURE_SCHEME', message: `${n} allows an http: source, which is subject to mixed-content and tampering.`, recommendation: `Use https: sources in ${n}.` });
  }

  if (!effObject) findings.push({ directive: 'object-src', severity: 'medium', code: 'MISSING_OBJECT_SRC', message: 'object-src is not restricted; legacy plugins (Flash/embeds) can run.', recommendation: "Add object-src 'none'." });
  else if (!effObject.includes("'none'")) findings.push({ directive: 'object-src', severity: 'low', code: 'OBJECT_SRC_NOT_NONE', message: "object-src is set but not 'none'; plugin content may still load.", recommendation: "Prefer object-src 'none' unless you specifically need embeds." });
  if (!has('base-uri')) findings.push({ directive: 'base-uri', severity: 'low', code: 'MISSING_BASE_URI', message: 'No base-uri; injected <base> tags can hijack relative URLs.', recommendation: "Add base-uri 'self' (or 'none')." });
  if (!has('frame-ancestors')) findings.push({ directive: 'frame-ancestors', severity: 'medium', code: 'MISSING_FRAME_ANCESTORS', message: 'No frame-ancestors; the page can be framed for clickjacking.', recommendation: "Add frame-ancestors 'none' or an explicit allow-list." });

  const by_severity: Record<Sev, number> = { high: 0, medium: 0, low: 0 };
  let score = 100;
  for (const f of findings) { by_severity[f.severity]++; score -= PENALTY[f.severity]; }
  score = Math.max(0, score);
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F';

  findings.sort((a, b) => PENALTY[b.severity] - PENALTY[a.severity] || a.code.localeCompare(b.code));

  return {
    result: {
      valid: true, directive_count: names.length, parsed_directives: d, unknown_directives,
      findings, by_severity, score, grade, passed: by_severity.high === 0,
    },
  };
}

function quoteSource(s: string): string {
  if (s.startsWith("'") && s.endsWith("'")) return s;
  const lc = s.toLowerCase();
  if (KEYWORDS.has(lc)) return `'${lc}'`;
  if (/^(nonce-|sha256-|sha384-|sha512-)/i.test(s)) return `'${s}'`;
  return s;
}

export interface BuildCore { policy: string; header_name: string; report_only: boolean; directive_count: number; directives: Record<string, string[]>; }

export function build(body: any): { error: string } | { result: BuildCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "directives" map.' };
  const input = body.directives;
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return { error: '"directives" must be an object mapping directive names to source arrays (or strings).' };
  const report_only = body.report_only === undefined ? false : body.report_only;
  if (typeof report_only !== 'boolean') return { error: '"report_only" must be a boolean.' };

  const names = Object.keys(input);
  if (names.length === 0) return { error: '"directives" must contain at least one directive.' };
  const normalized: Record<string, string[]> = {};
  const segs: string[] = [];
  for (const rawName of names) {
    const name = rawName.toLowerCase().trim();
    if (!KNOWN_DIRECTIVES.has(name)) return { error: `Unknown directive "${rawName}". Known directives include default-src, script-src, style-src, object-src, frame-ancestors, base-uri, etc.` };
    let vals = input[rawName];
    if (typeof vals === 'string') vals = vals.trim() === '' ? [] : vals.trim().split(/\s+/);
    if (!Array.isArray(vals) || vals.some((v: unknown) => typeof v !== 'string')) return { error: `Directive "${rawName}" must map to a string or an array of strings.` };
    const sources = (vals as string[]).map(quoteSource);
    normalized[name] = sources;
    segs.push(sources.length ? `${name} ${sources.join(' ')}` : name);
  }
  return { result: { policy: segs.join('; '), header_name: report_only ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy', report_only, directive_count: names.length, directives: normalized } };
}

const CHAIN_TO = [
  { api: 'cors-linter', reason: 'Audit the matching CORS policy once the CSP is hardened.' },
  { api: 'secret-scanner', reason: 'Check that any report-uri endpoint or inline config holds no secrets.' },
];
const INVALIDATORS = [
  'Linting is against published best-practice heuristics, not your app’s runtime behavior — a strict policy can still break legitimate functionality, and a lenient one can be safe if the app needs no inline/eval.',
  "'unsafe-inline' is ignored by browsers when a nonce or hash is present, so a finding may be moot under strict-dynamic; verify against the full directive set.",
  'New directives or browser-specific behavior may not be modeled; treat the score as guidance, not certification.',
];

function lintActions(r: LintCore): string[] {
  if (r.findings.length === 0) return [`No weaknesses detected — score ${r.score}/100 (${r.grade}).`, 'Re-run on every policy change and keep report-only monitoring in production.'];
  const top = r.findings[0];
  return [
    `Score ${r.score}/100 (${r.grade}); ${r.by_severity.high} high-severity issue(s). Fix first: ${top.code} on ${top.directive}.`,
    top.recommendation,
    'Deploy with Content-Security-Policy-Report-Only first to catch breakage before enforcing.',
  ];
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'CSP Builder & Linter API', version: '1.0.0',
    description: 'Deterministic Content-Security-Policy builder + linter. /lint flags well-known weaknesses (unsafe-inline/eval, wildcards, data: scripts, insecure schemes, missing default-src/object-src/frame-ancestors/base-uri) with a 0–100 hardening score; /build assembles a canonical header from a directives object. Best-practice heuristics, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/csp-builder-linter/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/lint', summary: 'Lint a CSP header for weaknesses', price_usdc: 0.005 },
      { method: 'POST', path: '/build', summary: 'Build a CSP header from directives', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL lint + reasoning', price_usdc: 0.009 },
    ],
    pricing: [
      { path: '/lint', price_usdc: 0.005, currency: 'USDC' },
      { path: '/build', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const LINT_TAIL = (r: LintCore) => ({
  confidence_score: 0.9, confidence_per_section: { policy: 0.9 },
  recommended_actions_priority_order: lintActions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/lint', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = lint(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...LINT_TAIL(r.result) });
});

router.post('/build', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = build(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    confidence_score: 1, confidence_per_section: { policy: 1 },
    recommended_actions_priority_order: [
      `Set response header "${v.header_name}: ${v.policy.length > 80 ? v.policy.slice(0, 80) + '…' : v.policy}".`,
      'Run the result through /lint to confirm it has no high-severity gaps.',
      v.report_only ? 'Report-only mode will not block — switch to Content-Security-Policy to enforce.' : 'Consider deploying report-only first to catch breakage.',
    ],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = lint(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.directive_count} directive(s) parsed; ${v.findings.length} finding(s) → score ${v.score}/100 (${v.grade}).`,
      key_factors: [
        `Severity: ${v.by_severity.high} high, ${v.by_severity.medium} medium, ${v.by_severity.low} low.`,
        v.findings.length ? `Top issue: ${v.findings[0].code} on ${v.findings[0].directive}.` : 'No best-practice violations found.',
        v.unknown_directives.length ? `Unknown directives ignored: ${v.unknown_directives.join(', ')}.` : 'All directives recognized.',
      ],
      invalidators: INVALIDATORS,
    },
    ...LINT_TAIL(v),
  });
});

export default router;
