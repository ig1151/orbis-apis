import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, round, clamp, percentile, WEBHOOK_DISCLAIMER } from '../../_aplus/webhook';

// Deterministic webhook delivery-reliability scorer. Computes a delivery health
// score, success/retry rates, latency percentiles, and a failure breakdown from
// a raw attempt log or aggregate stats. Real arithmetic — no LLM, no estimates.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

type FailureCategory = 'client_error' | 'server_error' | 'timeout' | 'connection_error' | 'other';

export interface Attempt {
  success: boolean;
  status_code?: number;
  latency_ms?: number;
  attempt_number?: number;
}

export interface Normalized {
  total: number;
  successful: number;
  failed: number;
  retried: number;
  latencies: number[];
  /** Pre-summarized latency (stats mode), used verbatim when present. */
  latencySummary?: { p50_ms: number; p95_ms: number; max_ms: number };
  failures: Record<FailureCategory, number>;
  source: 'attempts' | 'stats';
}

export interface ScoreResult {
  delivery_score: number;
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  failure_rate: number;
  retry_rate: number;
  latency: { p50_ms: number; p95_ms: number; max_ms: number } | null;
  failure_reason: { category: FailureCategory; count: number; share: number }[];
  retry_policy: { recommended_max_retries: number; recommended_backoff: string; note: string };
}

type Parsed = Normalized | { error: string };

function categorize(a: Attempt): FailureCategory {
  const c = a.status_code;
  if (c === undefined || c === 0) return 'connection_error';
  if (c === 408 || c === 504 || c === 524) return 'timeout';
  if (c >= 400 && c < 500) return 'client_error';
  if (c >= 500) return 'server_error';
  return 'other';
}

export function parseScore(body: any): Parsed {
  const emptyFailures = (): Record<FailureCategory, number> =>
    ({ client_error: 0, server_error: 0, timeout: 0, connection_error: 0, other: 0 });

  if (Array.isArray(body?.attempts)) {
    const raw = body.attempts as any[];
    if (raw.length === 0) return { error: '"attempts" must be a non-empty array' };
    if (raw.length > 10000) return { error: '"attempts" may contain at most 10000 records' };
    const failures = emptyFailures();
    const latencies: number[] = [];
    let successful = 0, retried = 0;
    for (let k = 0; k < raw.length; k++) {
      const a = raw[k];
      if (typeof a?.success !== 'boolean') return { error: `attempts[${k}].success must be a boolean` };
      const att: Attempt = { success: a.success };
      const sc = num(a.status_code);
      if (sc !== undefined) {
        if (sc < 0 || sc > 599 || !Number.isInteger(sc)) return { error: `attempts[${k}].status_code must be an integer 0–599` };
        att.status_code = sc;
      }
      const lat = num(a.latency_ms);
      if (lat !== undefined) {
        if (lat < 0) return { error: `attempts[${k}].latency_ms must be 0 or greater` };
        att.latency_ms = lat;
        latencies.push(lat);
      }
      const an = num(a.attempt_number);
      if (an !== undefined) {
        if (an < 1 || !Number.isInteger(an)) return { error: `attempts[${k}].attempt_number must be an integer ≥ 1` };
        if (an > 1) retried++;
      }
      if (att.success) successful++;
      else failures[categorize(att)]++;
    }
    return {
      total: raw.length, successful, failed: raw.length - successful,
      retried, latencies, failures, source: 'attempts',
    };
  }

  const stats = body?.stats;
  if (stats && typeof stats === 'object') {
    const total = num(stats.total_deliveries);
    const successful = num(stats.successful_deliveries);
    if (total === undefined || total <= 0 || !Number.isInteger(total)) return { error: '"stats.total_deliveries" must be a positive integer' };
    if (successful === undefined || successful < 0 || !Number.isInteger(successful)) return { error: '"stats.successful_deliveries" must be a non-negative integer' };
    if (successful > total) return { error: '"stats.successful_deliveries" cannot exceed "stats.total_deliveries"' };
    const retried = num(stats.retried_deliveries) ?? 0;
    if (retried < 0 || retried > total || !Number.isInteger(retried)) return { error: '"stats.retried_deliveries" must be an integer between 0 and total_deliveries' };
    const failures = emptyFailures();
    const failed = total - successful;
    // Optional explicit breakdown; otherwise bucket all failures as "other".
    const fb = stats.failure_breakdown;
    if (fb && typeof fb === 'object') {
      let sum = 0;
      for (const cat of ['client_error', 'server_error', 'timeout', 'connection_error', 'other'] as FailureCategory[]) {
        const v = num(fb[cat]) ?? 0;
        if (v < 0 || !Number.isInteger(v)) return { error: `"stats.failure_breakdown.${cat}" must be a non-negative integer` };
        failures[cat] = v;
        sum += v;
      }
      if (sum > failed) return { error: '"stats.failure_breakdown" totals exceed the number of failed deliveries' };
      failures.other += failed - sum; // remainder is uncategorized
    } else {
      failures.other = failed;
    }
    const p50 = num(stats.p50_latency_ms);
    const p95 = num(stats.p95_latency_ms);
    const avg = num(stats.avg_latency_ms);
    for (const [k, v] of [['p50_latency_ms', p50], ['p95_latency_ms', p95], ['avg_latency_ms', avg]] as [string, number | undefined][]) {
      if (v !== undefined && v < 0) return { error: `"stats.${k}" must be 0 or greater` };
    }
    // Use supplied summary values verbatim (no re-percentiling). Fill gaps sensibly.
    let latencySummary: Normalized['latencySummary'];
    if (p50 !== undefined || p95 !== undefined || avg !== undefined) {
      const pp50 = p50 ?? avg ?? p95!;
      const pp95 = p95 ?? p50 ?? avg!;
      latencySummary = { p50_ms: round(pp50, 0), p95_ms: round(pp95, 0), max_ms: round(Math.max(pp50, pp95), 0) };
    }
    return { total, successful, failed, retried, latencies: [], latencySummary, failures, source: 'stats' };
  }

  return { error: 'Provide either "attempts" (array of delivery attempts) or "stats" (aggregate delivery counts)' };
}

export function computeScore(n: Normalized): ScoreResult {
  const success_rate = n.successful / n.total;
  const failure_rate = 1 - success_rate;
  const retry_rate = n.total > 0 ? n.retried / n.total : 0;

  // Latency percentiles from whatever latency data is available.
  let latency: ScoreResult['latency'] = null;
  if (n.latencySummary) {
    latency = n.latencySummary;
  } else if (n.latencies.length > 0) {
    const sorted = [...n.latencies].sort((a, b) => a - b);
    latency = {
      p50_ms: round(percentile(sorted, 50)!, 0),
      p95_ms: round(percentile(sorted, 95)!, 0),
      max_ms: sorted[sorted.length - 1],
    };
  }

  // Score: success rate is the backbone (0–100), then penalize retries and slow tails.
  let score = success_rate * 100;
  score -= clamp(retry_rate, 0, 1) * 15;          // up to -15 for heavy retrying
  if (latency) {
    if (latency.p95_ms > 5000) score -= 10;
    else if (latency.p95_ms > 1000) score -= 4;
  }
  const delivery_score = round(clamp(score, 0, 100), 1);

  let health_status: ScoreResult['health_status'];
  if (delivery_score >= 95) health_status = 'healthy';
  else if (delivery_score >= 80) health_status = 'degraded';
  else if (delivery_score >= 50) health_status = 'unhealthy';
  else health_status = 'critical';

  const failed = n.failed;
  const failure_reason = (Object.entries(n.failures) as [FailureCategory, number][])
    .filter(([, c]) => c > 0)
    .map(([category, count]) => ({ category, count, share: failed > 0 ? round(count / failed, 3) : 0 }))
    .sort((a, b) => b.count - a.count);

  return {
    delivery_score,
    health_status,
    total_deliveries: n.total,
    successful_deliveries: n.successful,
    failed_deliveries: failed,
    success_rate: round(success_rate, 4),
    failure_rate: round(failure_rate, 4),
    retry_rate: round(retry_rate, 4),
    latency,
    failure_reason,
    retry_policy: retryPolicy(n, failure_reason),
  };
}

function retryPolicy(n: Normalized, fr: ScoreResult['failure_reason']): ScoreResult['retry_policy'] {
  const top = fr[0]?.category;
  if (top === 'client_error') {
    return {
      recommended_max_retries: 0,
      recommended_backoff: 'none',
      note: 'Most failures are 4xx client errors — retrying will not help. Fix the request/handler and alert instead of retrying.',
    };
  }
  if (top === 'timeout' || top === 'connection_error') {
    return {
      recommended_max_retries: 5,
      recommended_backoff: 'exponential with jitter, base 2s, cap 5m',
      note: 'Failures are transient (timeouts/connection errors). Retry with jittered exponential backoff and a dead-letter queue after the cap.',
    };
  }
  return {
    recommended_max_retries: 4,
    recommended_backoff: 'exponential with jitter, base 1s, cap 1h',
    note: 'Server-side (5xx) failures are usually transient — retry with jittered exponential backoff; dead-letter after exhausting retries.',
  };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Webhook Reliability Scorer API', version: '1.0.0',
    description: 'Deterministic webhook delivery-health scoring from a raw attempt log or aggregate stats: a 0–100 delivery_score, success/retry rates, p50/p95 latency, a failure breakdown, and a recommended retry policy. Real arithmetic — never an LLM guess.',
    openapi_url: 'https://orbis-apis.onrender.com/webhook-reliability-scorer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/score', summary: 'Score delivery health from attempts or stats', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL score + reasoning + retry policy', price_usdc: 0.02 },
    ],
    pricing: [
      { path: '/score', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.02, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

function chains() {
  return [
    { api: 'webhook-validator', reason: 'Check whether the endpoint config (timeouts, retries, idempotency) explains the failures.' },
    { api: 'webhook-signature-verifier', reason: 'Rule out signature mismatches if failures are 4xx rejections.' },
  ];
}

function actions(r: ScoreResult): string[] {
  const out: string[] = [];
  if (r.health_status === 'healthy') {
    out.push(`Delivery health is strong (${r.delivery_score}/100). Keep monitoring p95 latency (${r.latency ? r.latency.p95_ms + 'ms' : 'n/a'}).`);
  } else {
    out.push(`Delivery health is ${r.health_status} (${r.delivery_score}/100) with a ${round(r.failure_rate * 100, 1)}% failure rate — ${r.retry_policy.note}`);
  }
  if (r.latency && r.latency.p95_ms > 1000) out.push(`p95 latency is ${r.latency.p95_ms}ms — keep handlers under ~1s by processing webhooks asynchronously (ack fast, work in a queue).`);
  if (r.retry_rate > 0.2) out.push(`Retry rate is ${round(r.retry_rate * 100, 1)}% — high retrying inflates load; ensure handlers are idempotent and return 2xx quickly.`);
  return out;
}

function handle(req: Request, res: Response, withReasoning: boolean) {
  const t0 = Date.now();
  const parsed = parseScore(req.body);
  if ('error' in parsed) return fail(res, t0, 400, 'invalid_request', parsed.error);
  const r = computeScore(parsed);
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
      why_result_generated: `Scored ${r.total_deliveries} deliveries (${r.successful_deliveries} ok / ${r.failed_deliveries} failed) from ${parsed.source}; started at success_rate×100 (${round(r.success_rate * 100, 1)}) then applied retry and latency penalties.`,
      key_factors: [
        `Success rate ${round(r.success_rate * 100, 1)}%, retry rate ${round(r.retry_rate * 100, 1)}%.`,
        r.latency ? `Latency p50 ${r.latency.p50_ms}ms / p95 ${r.latency.p95_ms}ms.` : 'No latency data supplied.',
        r.failure_reason.length ? `Top failure category: ${r.failure_reason[0].category} (${r.failure_reason[0].count}).` : 'No failures.',
      ],
      invalidators: [
        'A small sample size makes the score noisy — interpret with caution under ~50 deliveries.',
        'Aggregate "stats" mode approximates latency percentiles from the summary values you supply.',
        'Client-side (4xx) failures will not improve with retries even though they lower the score.',
      ],
    };
  }
  respond(res, t0, payload);
}

router.post('/score', (req, res) => handle(req, res, false));
router.post('/lookup', (req, res) => handle(req, res, true));

export default router;
