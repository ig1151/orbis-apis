import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';

// Deterministic secret scanner. Matches text/code against a library of known
// credential patterns (AWS, GitHub, Slack, Google, Stripe, npm, private-key
// blocks, JWTs) plus a generic high-entropy-assignment heuristic, then reports
// redacted findings with line/column and severity. Detection only — no
// remediation, no exfiltration. No LLM. The input is never stored.

const router = Router();
const MAX_BYTES = 512 * 1024;
const MAX_FINDINGS = 500;
type Sev = 'high' | 'medium' | 'low';

interface Detector { type: string; severity: Sev; regex: RegExp; group?: number; entropy_gate?: number; }
const DETECTORS: Detector[] = [
  { type: 'aws_access_key_id', severity: 'high', regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { type: 'github_token', severity: 'high', regex: /\bgh[pousr]_[A-Za-z0-9]{36}\b/g },
  { type: 'github_fine_grained_pat', severity: 'high', regex: /\bgithub_pat_[A-Za-z0-9_]{82}\b/g },
  { type: 'gitlab_token', severity: 'high', regex: /\bglpat-[A-Za-z0-9_-]{20}\b/g },
  { type: 'slack_token', severity: 'high', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { type: 'google_api_key', severity: 'high', regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { type: 'stripe_live_secret_key', severity: 'high', regex: /\b(?:sk|rk)_live_[0-9A-Za-z]{20,}\b/g },
  { type: 'stripe_test_secret_key', severity: 'medium', regex: /\b(?:sk|rk)_test_[0-9A-Za-z]{20,}\b/g },
  { type: 'npm_token', severity: 'high', regex: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { type: 'sendgrid_api_key', severity: 'high', regex: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g },
  { type: 'twilio_account_sid', severity: 'medium', regex: /\bAC[0-9a-fA-F]{32}\b/g },
  { type: 'private_key_block', severity: 'high', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { type: 'jwt', severity: 'medium', regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/g },
  { type: 'generic_secret_assignment', severity: 'medium', group: 1, entropy_gate: 3.2,
    regex: /(?:password|passwd|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|client[_-]?secret|auth[_-]?token)["']?\s*[:=]\s*["']?([A-Za-z0-9/+=_-]{12,})/gi },
];

function shannonPerChar(s: string): number {
  if (!s.length) return 0;
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] || 0) + 1;
  let h = 0;
  for (const k in freq) { const p = freq[k] / s.length; h -= p * Math.log2(p); }
  return h;
}

function redact(s: string): string {
  if (s.length <= 6) return '*'.repeat(s.length);
  return `${s.slice(0, 4)}…${s.slice(-2)}`;
}

export interface Finding {
  type: string; severity: Sev; line: number; column: number;
  match_preview: string; match_length: number; entropy_bits_per_char: number | null;
}
export interface ScanCore {
  has_secrets: boolean; finding_count: number; truncated_findings: boolean;
  by_severity: Record<Sev, number>; by_type: Record<string, number>;
  scanned_chars: number; scanned_lines: number; redacted: boolean; findings: Finding[];
}

export function scan(body: any): { error: string } | { result: ScanCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "text" string.' };
  if (typeof body.text !== 'string') return { error: '"text" is required and must be a string.' };
  const text = body.text;
  if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) return { error: `"text" exceeds the ${MAX_BYTES}-byte limit.` };
  const redacted = body.redact === undefined ? true : body.redact;
  if (typeof redacted !== 'boolean') return { error: '"redact" must be a boolean.' };
  const minEntropy = body.min_entropy === undefined ? undefined : body.min_entropy;
  if (minEntropy !== undefined && (typeof minEntropy !== 'number' || minEntropy < 0)) return { error: '"min_entropy" must be a non-negative number if provided.' };

  // Precompute line-start offsets for O(log n) line/column lookup.
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
  const locate = (idx: number) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1; }
    return { line: lo + 1, column: idx - lineStarts[lo] + 1 };
  };

  const seen = new Set<string>();
  const findings: Finding[] = [];
  for (const d of DETECTORS) {
    d.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = d.regex.exec(text)) !== null) {
      if (m[0].length === 0) { d.regex.lastIndex++; continue; }
      const value = d.group ? m[d.group] : m[0];
      const valueIdx = d.group ? m.index + m[0].indexOf(value) : m.index;
      const ent = round(shannonPerChar(value), 2);
      if (d.entropy_gate !== undefined && ent < d.entropy_gate) continue;
      if (minEntropy !== undefined && ent < minEntropy) continue;
      const key = `${d.type}@${valueIdx}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const { line, column } = locate(valueIdx);
      findings.push({
        type: d.type, severity: d.severity, line, column,
        match_preview: redacted ? redact(value) : value,
        match_length: value.length,
        entropy_bits_per_char: d.group || d.entropy_gate !== undefined ? ent : null,
      });
    }
  }

  findings.sort((a, b) => a.line - b.line || a.column - b.column || a.type.localeCompare(b.type));
  const truncated_findings = findings.length > MAX_FINDINGS;
  const kept = truncated_findings ? findings.slice(0, MAX_FINDINGS) : findings;

  const by_severity: Record<Sev, number> = { high: 0, medium: 0, low: 0 };
  const by_type: Record<string, number> = {};
  for (const f of kept) { by_severity[f.severity]++; by_type[f.type] = (by_type[f.type] || 0) + 1; }

  return {
    result: {
      has_secrets: kept.length > 0, finding_count: kept.length, truncated_findings,
      by_severity, by_type,
      scanned_chars: text.length, scanned_lines: lineStarts.length, redacted, findings: kept,
    },
  };
}

function actions(r: ScanCore): string[] {
  if (!r.has_secrets) return ['No known secret patterns detected. This is best-effort detection, not a guarantee — keep secret scanning in CI.', 'Continue to keep credentials in a secrets manager / env vars, never in source.'];
  const top = r.findings[0];
  return [
    `${r.finding_count} potential secret(s) found (${r.by_severity.high} high). First: ${top.type} at line ${top.line}:${top.column}.`,
    'Rotate every matched credential immediately — assume leaked secrets are already compromised.',
    'Purge them from git history (e.g. git filter-repo / BFG) and move to a secrets manager or env vars.',
  ];
}

const CHAIN_TO = [
  { api: 'env-validator', reason: 'Move matched secrets into a validated .env and out of source.' },
  { api: 'idempotency-key-generator', reason: 'Fingerprint sanitized payloads without embedding raw secrets.' },
];
const INVALIDATORS = [
  'Pattern + entropy matching has false negatives (custom/obfuscated secret formats) and false positives (high-entropy non-secrets like hashes or UUIDs) — treat findings as leads, not proof.',
  'Only the listed providers and a generic assignment heuristic are checked; a clean scan does not certify the absence of secrets.',
  'The generic detector keys on variable names near the value; secrets stored without a tell-tale name may be missed.',
];

function tail(r: ScanCore) {
  return {
    confidence_score: 0.85, confidence_per_section: { detection: 0.85 },
    recommended_actions_priority_order: actions(r),
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Secret Scanner API', version: '1.0.0',
    description: 'Deterministic secret scanner. Matches text/code against known credential patterns (AWS, GitHub, Slack, Google, Stripe, npm, private keys, JWTs) plus a generic high-entropy-assignment heuristic, and reports redacted findings with line/column and severity. Detection only. No LLM, input never stored.',
    openapi_url: 'https://orbis-apis.onrender.com/secret-scanner/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Scan text for leaked secrets', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL scan + reasoning', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/scan', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/scan', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = scan(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...tail(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = scan(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: v.has_secrets
        ? `${v.finding_count} match(es) across ${Object.keys(v.by_type).length} pattern type(s) over ${v.scanned_lines} line(s).`
        : `No pattern matched across ${v.scanned_lines} line(s) / ${v.scanned_chars} chars.`,
      key_factors: [
        `Severity breakdown: ${v.by_severity.high} high, ${v.by_severity.medium} medium, ${v.by_severity.low} low.`,
        Object.keys(v.by_type).length ? `Types: ${Object.keys(v.by_type).join(', ')}.` : 'No known credential patterns matched.',
        `Output is ${v.redacted ? 'redacted' : 'NOT redacted (raw secrets returned)'}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...tail(v),
  });
});

export default router;
