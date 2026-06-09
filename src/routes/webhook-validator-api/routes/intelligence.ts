import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, round, clamp, WEBHOOK_DISCLAIMER } from '../../_aplus/webhook';

// Deterministic webhook configuration + payload best-practice validator.
// Runs a fixed checklist (HTTPS, signature, replay protection, idempotency,
// content-type, timeout, retries, JSON validity, size) — no LLM, no estimates.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
type CheckStatus = 'pass' | 'fail' | 'warn' | 'info';

export interface Check {
  id: string;
  label: string;
  severity: Severity;
  status: CheckStatus;
  message: string;
  recommendation: string | null;
}

export interface ValidatorInput {
  url?: string;
  has_signature_verification?: boolean;
  signature_header?: string;
  verifies_timestamp?: boolean;
  timestamp_tolerance_seconds?: number;
  has_idempotency?: boolean;
  idempotency_key_header?: string;
  content_type?: string;
  timeout_ms?: number;
  max_retries?: number;
  max_payload_bytes?: number;
  payload?: string;
}

export interface ValidatorResult {
  validation_score: number;
  verdict: 'production_ready' | 'needs_attention' | 'not_production_ready';
  checks: Check[];
  passed: number;
  failed: number;
  warnings: number;
  critical_issues: number;
}

type Parsed = ValidatorInput | { error: string };

// Severity weight applied to the score when a check fails (warn = half).
const WEIGHT: Record<Severity, number> = { critical: 35, high: 15, medium: 8, low: 3, info: 0 };

export function parseValidator(body: any): Parsed {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Request body must be a configuration object' };
  const out: ValidatorInput = {};
  const strFields = ['url', 'signature_header', 'idempotency_key_header', 'content_type', 'payload'] as const;
  for (const f of strFields) {
    if (body[f] !== undefined) {
      if (typeof body[f] !== 'string') return { error: `"${f}" must be a string` };
      (out as any)[f] = body[f];
    }
  }
  const boolFields = ['has_signature_verification', 'verifies_timestamp', 'has_idempotency'] as const;
  for (const f of boolFields) {
    if (body[f] !== undefined) {
      if (typeof body[f] !== 'boolean') return { error: `"${f}" must be a boolean` };
      (out as any)[f] = body[f];
    }
  }
  const numFields = ['timestamp_tolerance_seconds', 'timeout_ms', 'max_retries', 'max_payload_bytes'] as const;
  for (const f of numFields) {
    if (body[f] !== undefined) {
      const v = num(body[f]);
      if (v === undefined || v < 0) return { error: `"${f}" must be a non-negative number` };
      (out as any)[f] = v;
    }
  }
  if (Object.keys(out).length === 0) return { error: 'Provide at least one webhook configuration field to validate' };
  return out;
}

export function computeValidator(i: ValidatorInput): ValidatorResult {
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  // 1. HTTPS
  if (i.url !== undefined) {
    const isHttps = /^https:\/\//i.test(i.url.trim());
    add({
      id: 'https', label: 'Endpoint uses HTTPS', severity: 'critical',
      status: isHttps ? 'pass' : 'fail',
      message: isHttps ? 'Endpoint URL uses HTTPS.' : 'Endpoint URL is not HTTPS — webhook payloads and secrets travel in plaintext.',
      recommendation: isHttps ? null : 'Serve the webhook endpoint over HTTPS with a valid TLS certificate.',
    });
  } else {
    add({ id: 'https', label: 'Endpoint uses HTTPS', severity: 'critical', status: 'info', message: 'No "url" supplied — could not check HTTPS.', recommendation: 'Supply the endpoint url to verify it uses HTTPS.' });
  }

  // 2. Signature verification
  const hasSig = i.has_signature_verification === true || (typeof i.signature_header === 'string' && i.signature_header.trim() !== '');
  add({
    id: 'signature_verification', label: 'Signature verification enabled', severity: 'critical',
    status: hasSig ? 'pass' : 'fail',
    message: hasSig ? `Signature verification is in place${i.signature_header ? ` (header: ${i.signature_header})` : ''}.` : 'No signature verification — anyone who knows the URL can forge events.',
    recommendation: hasSig ? null : 'Verify an HMAC signature on the raw body for every request before processing (see webhook-signature-verifier).',
  });

  // 3. Replay / timestamp protection
  const replay = i.verifies_timestamp === true;
  add({
    id: 'replay_protection', label: 'Replay / timestamp protection', severity: 'high',
    status: replay ? 'pass' : 'warn',
    message: replay ? `Timestamp is validated${i.timestamp_tolerance_seconds !== undefined ? ` (tolerance ${i.timestamp_tolerance_seconds}s)` : ''}.` : 'Timestamp is not validated — a captured request can be replayed.',
    recommendation: replay ? (i.timestamp_tolerance_seconds !== undefined && i.timestamp_tolerance_seconds > 600 ? 'Tolerance over 10 minutes is loose; tighten to ~5 minutes.' : null) : 'Reject requests whose signed timestamp is outside a small tolerance (e.g. 5 minutes).',
  });

  // 4. Idempotency
  const idem = i.has_idempotency === true || (typeof i.idempotency_key_header === 'string' && i.idempotency_key_header.trim() !== '');
  add({
    id: 'idempotency', label: 'Idempotent processing', severity: 'high',
    status: idem ? 'pass' : 'warn',
    message: idem ? `Idempotency is handled${i.idempotency_key_header ? ` (key: ${i.idempotency_key_header})` : ''}.` : 'No idempotency handling — provider retries will be processed more than once.',
    recommendation: idem ? null : 'Dedupe on the event id (or an idempotency key) so retried deliveries are processed exactly once.',
  });

  // 5. Content-Type
  if (i.content_type !== undefined) {
    const ok = /application\/json/i.test(i.content_type);
    add({ id: 'content_type', label: 'JSON content-type', severity: 'medium', status: ok ? 'pass' : 'warn', message: ok ? 'Content-Type is application/json.' : `Content-Type is "${i.content_type}", not application/json.`, recommendation: ok ? null : 'Accept and send application/json so the body parses consistently.' });
  } else {
    add({ id: 'content_type', label: 'JSON content-type', severity: 'medium', status: 'info', message: 'No "content_type" supplied.', recommendation: null });
  }

  // 6. Timeout
  if (i.timeout_ms !== undefined) {
    let status: CheckStatus = 'pass'; let msg = `Handler timeout is ${i.timeout_ms}ms.`; let rec: string | null = null;
    if (i.timeout_ms < 1000) { status = 'warn'; msg = `Timeout ${i.timeout_ms}ms is very low — transient slowness will fail deliveries.`; rec = 'Allow at least ~1s, or ack immediately and process asynchronously.'; }
    else if (i.timeout_ms > 30000) { status = 'warn'; msg = `Timeout ${i.timeout_ms}ms is high — providers usually expect a fast ack.`; rec = 'Ack within a few seconds and move slow work to a queue.'; }
    add({ id: 'timeout', label: 'Reasonable handler timeout', severity: 'medium', status, message: msg, recommendation: rec });
  } else {
    add({ id: 'timeout', label: 'Reasonable handler timeout', severity: 'medium', status: 'info', message: 'No "timeout_ms" supplied.', recommendation: null });
  }

  // 7. Retries
  if (i.max_retries !== undefined) {
    let status: CheckStatus = 'pass'; let msg = `Max retries set to ${i.max_retries}.`; let rec: string | null = null;
    if (i.max_retries === 0) { status = 'warn'; msg = 'No retries configured — a single transient failure drops the event.'; rec = 'Retry 3–5 times with exponential backoff and a dead-letter queue.'; }
    else if (i.max_retries > 10) { status = 'warn'; msg = `Max retries ${i.max_retries} is high — excessive retrying amplifies load on a struggling consumer.`; rec = 'Cap retries (≤ ~8) and dead-letter the rest.'; }
    add({ id: 'retries', label: 'Sensible retry budget', severity: 'low', status, message: msg, recommendation: rec });
  } else {
    add({ id: 'retries', label: 'Sensible retry budget', severity: 'low', status: 'info', message: 'No "max_retries" supplied.', recommendation: null });
  }

  // 8. Payload valid JSON
  if (i.payload !== undefined) {
    let valid = true;
    try { JSON.parse(i.payload); } catch { valid = false; }
    add({ id: 'payload_json', label: 'Payload is valid JSON', severity: 'high', status: valid ? 'pass' : 'fail', message: valid ? 'Sample payload parses as JSON.' : 'Sample payload is not valid JSON.', recommendation: valid ? null : 'Ensure the producer sends well-formed JSON; reject unparseable bodies with 400.' });

    // 9. Payload size
    const bytes = Buffer.byteLength(i.payload, 'utf8');
    if (i.max_payload_bytes !== undefined) {
      const ok = bytes <= i.max_payload_bytes;
      add({ id: 'payload_size', label: 'Payload within size limit', severity: 'medium', status: ok ? 'pass' : 'warn', message: `Sample payload is ${bytes} bytes vs limit ${i.max_payload_bytes}.`, recommendation: ok ? null : 'Either raise the limit or have the producer send a reference id and fetch the detail out-of-band.' });
    } else {
      add({ id: 'payload_size', label: 'Payload within size limit', severity: 'info', status: 'info', message: `Sample payload is ${bytes} bytes (no "max_payload_bytes" to compare).`, recommendation: 'Set a max payload size and reject oversized bodies to bound memory use.' });
    }
  }

  // Score: start at 100, subtract weighted penalties (warn counts half).
  let score = 100;
  let passed = 0, failed = 0, warnings = 0, critical_issues = 0;
  for (const c of checks) {
    if (c.status === 'pass') passed++;
    else if (c.status === 'fail') { failed++; score -= WEIGHT[c.severity]; if (c.severity === 'critical') critical_issues++; }
    else if (c.status === 'warn') { warnings++; score -= WEIGHT[c.severity] / 2; }
  }
  const validation_score = round(clamp(score, 0, 100), 1);

  let verdict: ValidatorResult['verdict'];
  if (critical_issues > 0 || validation_score < 60) verdict = 'not_production_ready';
  else if (validation_score < 85 || warnings > 0) verdict = 'needs_attention';
  else verdict = 'production_ready';

  return { validation_score, verdict, checks, passed, failed, warnings, critical_issues };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Webhook Validator API', version: '1.0.0',
    description: 'Deterministic webhook configuration + payload best-practice validation: HTTPS, signature verification, replay/timestamp protection, idempotency, content-type, timeout, retry budget, JSON validity, and payload size. Returns a typed checks[] with severities and a 0–100 validation_score. Real checks — never an LLM guess.',
    openapi_url: 'https://orbis-apis.onrender.com/webhook-validator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/validate', summary: 'Run the webhook best-practice checklist', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL validate + reasoning + prioritized fixes', price_usdc: 0.02 },
    ],
    pricing: [
      { path: '/validate', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.02, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

function chains() {
  return [
    { api: 'webhook-signature-verifier', reason: 'Actually verify a signature once verification is wired up.' },
    { api: 'webhook-reliability-scorer', reason: 'Quantify delivery health after fixing the config issues.' },
  ];
}

function actions(r: ValidatorResult): string[] {
  const out: string[] = [];
  const failing = r.checks
    .filter((c) => c.status === 'fail' || c.status === 'warn')
    .sort((a, b) => (WEIGHT[b.severity] - WEIGHT[a.severity]) || (a.status === 'fail' ? -1 : 1));
  for (const c of failing.slice(0, 4)) if (c.recommendation) out.push(`[${c.severity}] ${c.recommendation}`);
  if (out.length === 0) out.push(`All ${r.passed} applicable checks passed (${r.validation_score}/100) — configuration looks production-ready.`);
  return out;
}

function handle(req: Request, res: Response, withReasoning: boolean) {
  const t0 = Date.now();
  const parsed = parseValidator(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeValidator(parsed);
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
      why_result_generated: `Ran ${r.checks.length} best-practice checks; ${r.passed} passed, ${r.failed} failed, ${r.warnings} warned. Score starts at 100 and subtracts severity-weighted penalties (warnings count half).`,
      key_factors: [
        `Verdict: ${r.verdict} (${r.validation_score}/100).`,
        `${r.critical_issues} critical issue(s).`,
        r.checks.filter((c) => c.status === 'fail').map((c) => c.id).join(', ') || 'No failed checks.',
      ],
      invalidators: [
        'Checks only cover the fields you supplied — omitted fields are reported as info, not pass.',
        'A passing config check does not prove the live endpoint behaves the same way.',
        'Signature verification being "enabled" is asserted by you here; verify a real signature to confirm it.',
      ],
    };
  }
  respond(res, t0, payload);
}

router.post('/validate', (req, res) => handle(req, res, false));
router.post('/lookup', (req, res) => handle(req, res, true));

export default router;
