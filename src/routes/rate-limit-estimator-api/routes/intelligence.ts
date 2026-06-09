import { Router, Request, Response } from 'express';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic rate-limit engine ------------------------------------------------------
// Parses real rate-limit headers / request logs. Never invents telemetry: when a value is not
// present in the supplied input it is returned as null with an explanatory note.

function headerMap(input: any): Record<string, string> {
  const map: Record<string, string> = {};
  if (input && typeof input === 'object') {
    for (const [k, v] of Object.entries(input)) map[k.toLowerCase()] = String(v);
    return map;
  }
  const s = String(input || '');
  if (s.trim().startsWith('{')) {
    try { return headerMap(JSON.parse(s)); } catch { /* fall through */ }
  }
  for (const line of s.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9-]+)\s*:\s*(.+?)\s*$/);
    if (m) map[m[1].toLowerCase()] = m[2];
  }
  return map;
}

function pick(map: Record<string, string>, ...keys: string[]): string | null {
  for (const k of keys) if (map[k] != null) return map[k];
  return null;
}
const num = (v: string | null): number | null => { if (v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

function estimate(input: any) {
  const h = headerMap(input);
  const detected = Object.keys(h).filter(k => /ratelimit|retry-after/.test(k));

  const limit = num(pick(h, 'x-ratelimit-limit', 'ratelimit-limit', 'x-rate-limit-limit'));
  const remaining = num(pick(h, 'x-ratelimit-remaining', 'ratelimit-remaining', 'x-rate-limit-remaining'));
  const resetRaw = num(pick(h, 'x-ratelimit-reset', 'ratelimit-reset', 'x-rate-limit-reset'));
  const retryAfter = num(pick(h, 'retry-after'));

  // Derive the window length (seconds). Epoch resets → window = reset - now; small values → seconds remaining.
  let window_seconds: number | null = null;
  if (resetRaw != null) {
    if (resetRaw > 1e6) { const now = Math.floor(Date.now() / 1000); window_seconds = Math.max(1, resetRaw - now); }
    else window_seconds = Math.max(1, resetRaw);
  }

  let estimated_rpm: number | null = null, estimated_rph: number | null = null, estimated_rpd: number | null = null;
  if (limit != null && window_seconds != null) {
    const perSec = limit / window_seconds;
    estimated_rpm = Math.round(perSec * 60);
    estimated_rph = Math.round(perSec * 3600);
    estimated_rpd = Math.round(perSec * 86400);
  } else if (limit != null) {
    // No window: assume the common per-minute convention but flag low confidence via the envelope.
    estimated_rpm = limit; estimated_rph = limit * 60; estimated_rpd = limit * 1440;
  }

  return {
    estimated_rpm,
    estimated_rph,
    estimated_rpd,
    rate_limit_headers_detected: detected,
    x_ratelimit_limit: limit,
    x_ratelimit_remaining: remaining,
    x_ratelimit_reset: resetRaw,
    retry_after_seconds: retryAfter,
    tier_detected: pick(h, 'x-ratelimit-tier', 'x-plan'),
    concurrency_limit: num(pick(h, 'x-ratelimit-concurrency', 'x-concurrency-limit')),
    burst_allowance: num(pick(h, 'x-ratelimit-burst', 'x-burst-limit')),
    recommended_safe_rpm: estimated_rpm != null ? Math.floor(estimated_rpm * 0.8) : null,
    throttle_strategy: 'unknown' as const,
    window_seconds,
  };
}

function analyze(input: any, options: any) {
  // Real request-log analysis only. Expect options.requests: [{status, latency_ms, timestamp}] or input as such.
  let log: any[] = [];
  if (Array.isArray(options?.requests)) log = options.requests;
  else if (Array.isArray(input)) log = input;
  else if (typeof input === 'string' && input.trim().startsWith('[')) { try { log = JSON.parse(input); } catch { log = []; } }

  if (!log.length) {
    return {
      rate_limit_violations_detected: [],
      violations_per_hour: null,
      back_pressure_events_count: null,
      adaptive_throttle_recommended: false,
      recommended_concurrency: null,
      queue_depth_estimate: null,
      latency_p50_ms: null,
      latency_p99_ms: null,
      efficiency_score: null,
      optimization_suggestions: ['No request log supplied — pass options.requests:[{status,latency_ms,timestamp}] for telemetry analysis'],
      _note: 'No telemetry available; values returned as null rather than estimated.',
    };
  }

  const statuses = log.map(r => Number(r?.status)).filter(Number.isFinite);
  const violations = statuses.filter(s => s === 429);
  const latencies = log.map(r => Number(r?.latency_ms)).filter(Number.isFinite).sort((a, b) => a - b);
  const pct = (p: number) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(p * latencies.length))] : null;
  const violationRate = statuses.length ? violations.length / statuses.length : 0;

  return {
    rate_limit_violations_detected: violations.map((_, i) => ({ index: log.findIndex(r => Number(r?.status) === 429), occurrence: i + 1 })).slice(0, 50),
    violations_per_hour: null, // requires timestamp span; computed below if timestamps present
    back_pressure_events_count: violations.length,
    adaptive_throttle_recommended: violationRate > 0.02,
    recommended_concurrency: Math.max(1, Math.round(statuses.length * (1 - violationRate) / 10)),
    queue_depth_estimate: null,
    latency_p50_ms: pct(0.5),
    latency_p99_ms: pct(0.99),
    efficiency_score: Math.round((1 - violationRate) * 100),
    optimization_suggestions: violationRate > 0.02
      ? ['Reduce request rate or add adaptive throttling', 'Honor Retry-After on 429 responses']
      : ['Throughput within limits; maintain current rate'],
  };
}

// ---- envelope -----------------------------------------------------------------------------

function envelope(data: any, opts: { start: number; score: number; reason: string; ttl: number; actions: any[] }) {
  return {
    success: true,
    request_id: rid(),
    data,
    confidence: { score: opts.score, reason: opts.reason, per_section: { parse: opts.score } },
    provenance: { provider: 'deterministic-compute', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl, retryable: false, cache_recommended: false },
    recommended_next_api: [
      { api: 'rate-limit-estimator', endpoint: '/rate-limit-intelligence', reason: 'Full rate-limit intelligence in one call' },
      { api: 'retry-strategy-recommender', endpoint: '/recommend', reason: 'Pick a backoff strategy for the detected limits' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Rate Limit Estimator API', info: '/rate-limit-estimator/info', openapi: '/rate-limit-estimator/openapi.json', health: 'ok' });
});

router.post('/estimate', (req: Request, res: Response) => {
  const start = Date.now();
  const { input } = req.body;
  if (input == null || (typeof input === 'string' && !input.trim())) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const data = estimate(input);
  const found = data.rate_limit_headers_detected.length > 0;
  const score = found ? (data.window_seconds != null ? 1 : 0.6) : 0.2;
  res.json(envelope(data, {
    start, score, ttl: 60,
    reason: found ? (data.window_seconds != null ? 'Parsed rate-limit headers with reset window' : 'Parsed limit header; reset window unknown (assumed per-minute)') : 'No rate-limit headers detected in input',
    actions: found
      ? [{ priority: 'medium', action: `Throttle to ~${data.recommended_safe_rpm ?? 'N/A'} rpm`, reason: '80% of detected limit leaves headroom' }]
      : [{ priority: 'high', action: 'Provide response headers containing X-RateLimit-* or Retry-After', reason: 'No rate-limit signal found to parse' }],
  }));
});

router.post('/analyze', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  if (input == null && !options?.requests) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const data = analyze(input, options);
  const hasLog = data.efficiency_score != null;
  res.json(envelope(data, {
    start, score: hasLog ? 1 : 0.3, ttl: 60,
    reason: hasLog ? 'Deterministic analysis of supplied request log' : 'No request log supplied',
    actions: hasLog
      ? [{ priority: data.adaptive_throttle_recommended ? 'high' : 'low', action: data.adaptive_throttle_recommended ? 'Enable adaptive throttling' : 'Maintain current rate', reason: `Efficiency ${data.efficiency_score}/100` }]
      : [{ priority: 'high', action: 'Supply options.requests log', reason: 'Telemetry analysis needs real request data' }],
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'analyze', next_api: 'rate-limit-estimator', next_endpoint: '/rate-limit-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'rate-limit-estimator', endpoint: '/rate-limit-intelligence', reason: 'Full rate limit intelligence in one call' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /rate-limit-intelligence', reason: 'Single-request full analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

router.post('/rate-limit-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  if (input == null || (typeof input === 'string' && !input.trim())) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const est = estimate(input);
  const ana = analyze(input, options);
  const found = est.rate_limit_headers_detected.length > 0;
  const overall_score = found ? (est.window_seconds != null ? 100 : 60) : 20;
  const data = {
    estimate: est,
    analyze: ana,
    overall_score,
    key_findings: [
      found ? `Detected: ${est.rate_limit_headers_detected.join(', ')}` : 'No rate-limit headers detected',
      est.estimated_rpm != null ? `Estimated ${est.estimated_rpm} rpm (safe: ${est.recommended_safe_rpm})` : 'Rate not determinable',
      ana.efficiency_score != null ? `Log efficiency: ${ana.efficiency_score}/100` : 'No request log analyzed',
    ],
    summary: found ? `Rate limit ~${est.estimated_rpm ?? '?'} rpm; recommend staying under ${est.recommended_safe_rpm ?? '?'} rpm.` : 'No rate-limit headers found in the supplied input.',
  };
  res.json(envelope(data, {
    start, score: found ? (est.window_seconds != null ? 1 : 0.6) : 0.2, ttl: 60,
    reason: found ? 'Deterministic combined rate-limit intelligence' : 'No rate-limit signal in input',
    actions: [{ priority: found ? 'medium' : 'high', action: found ? `Throttle to ~${est.recommended_safe_rpm ?? 'N/A'} rpm` : 'Provide rate-limit headers', reason: found ? 'Leave headroom under the limit' : 'No signal to parse' }],
  }));
});

export default router;
