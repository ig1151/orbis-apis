import { Router, Request, Response } from 'express';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic retry-strategy advisory engine -----------------------------------------
// Strategy selection is a documented rules table; delay schedules are computed exactly.
// Failure classification is derived from the status codes actually present in the input.

type Strategy = 'exponential_backoff' | 'linear_backoff' | 'fixed_delay' | 'fibonacci_backoff' | 'decorrelated_jitter';
type Jitter = 'full' | 'equal' | 'decorrelated' | 'none';
type FailurePattern = 'transient' | 'persistent' | 'rate_limited' | 'timeout' | 'network' | 'authentication';

const RETRYABLE = [408, 425, 429, 500, 502, 503, 504];
const NON_RETRYABLE = [400, 401, 403, 404, 405, 409, 410, 422];

function extractCodes(input: any, options: any): number[] {
  if (Array.isArray(options?.status_codes)) return options.status_codes.map(Number).filter(Number.isFinite);
  if (typeof options?.status_code === 'number') return [options.status_code];
  const s = typeof input === 'string' ? input : JSON.stringify(input || '');
  const codes = [...s.matchAll(/\b([1-5]\d{2})\b/g)].map(m => Number(m[1])).filter(c => c >= 100 && c <= 599);
  return codes;
}

function classifyFailure(codes: number[], input: any, options: any): FailurePattern {
  if (options?.failure_type) return options.failure_type;
  const s = `${typeof input === 'string' ? input : JSON.stringify(input || '')}`.toLowerCase();
  if (codes.includes(429) || /rate.?limit|too many requests/.test(s)) return 'rate_limited';
  if (codes.includes(401) || codes.includes(403) || /auth|unauthorized|forbidden|token/.test(s)) return 'authentication';
  if (codes.includes(408) || codes.includes(504) || /timeout|timed out|deadline/.test(s)) return 'timeout';
  if (/econnreset|enotfound|econnrefused|network|dns|socket/.test(s)) return 'network';
  if (codes.some(c => NON_RETRYABLE.includes(c)) && !codes.some(c => RETRYABLE.includes(c))) return 'persistent';
  return 'transient';
}

function recommend(input: any, options: any) {
  const codes = extractCodes(input, options);
  const pattern = classifyFailure(codes, input, options);

  // Rules table: failure pattern → strategy + parameters.
  let strategy: Strategy = 'exponential_backoff';
  let jitter: Jitter = 'full';
  let max_retries = 3;
  let initial = 200, maxDelay = 30000, multiplier = 2;
  let circuit = false;

  switch (pattern) {
    case 'rate_limited':   strategy = 'decorrelated_jitter'; jitter = 'decorrelated'; max_retries = 5; initial = 1000; maxDelay = 60000; circuit = false; break;
    case 'timeout':        strategy = 'exponential_backoff'; jitter = 'full'; max_retries = 3; initial = 500; maxDelay = 20000; circuit = true; break;
    case 'network':        strategy = 'exponential_backoff'; jitter = 'full'; max_retries = 4; initial = 250; maxDelay = 15000; circuit = true; break;
    case 'authentication': strategy = 'fixed_delay'; jitter = 'none'; max_retries = 1; initial = 0; maxDelay = 0; circuit = false; break;
    case 'persistent':     strategy = 'fixed_delay'; jitter = 'none'; max_retries = 0; initial = 0; maxDelay = 0; circuit = true; break;
    case 'transient':
    default:               strategy = 'exponential_backoff'; jitter = 'full'; max_retries = 3; initial = 200; maxDelay = 30000; circuit = false; break;
  }
  // Allow explicit overrides.
  if (typeof options?.strategy === 'string' && ['exponential_backoff', 'linear_backoff', 'fixed_delay', 'fibonacci_backoff', 'decorrelated_jitter'].includes(options.strategy)) strategy = options.strategy as Strategy;
  if (typeof options?.max_retries === 'number') max_retries = options.max_retries;
  if (typeof options?.initial_delay_ms === 'number') initial = options.initial_delay_ms;
  if (typeof options?.max_delay_ms === 'number') maxDelay = options.max_delay_ms;

  // Compute the nominal delay schedule (pre-jitter).
  const schedule: number[] = [];
  for (let i = 0; i < max_retries; i++) {
    let d: number;
    if (strategy === 'fixed_delay' || strategy === 'decorrelated_jitter') d = initial;
    else if (strategy === 'linear_backoff') d = initial * (i + 1);
    else if (strategy === 'fibonacci_backoff') { const fib = [1, 1, 2, 3, 5, 8, 13, 21]; d = initial * (fib[i] || fib[fib.length - 1]); }
    else d = initial * Math.pow(multiplier, i); // exponential
    schedule.push(Math.min(d, maxDelay));
  }

  const pseudocode = pattern === 'authentication'
    ? 'if (status===401) { refreshToken(); retryOnce(); } else fail();'
    : `delay = min(${initial} * ${strategy === 'exponential_backoff' ? `${multiplier}^attempt` : 'attempt'}, ${maxDelay}); sleep(delay${jitter !== 'none' ? ' * random()' : ''}); retry();`;

  return {
    strategy,
    max_retries,
    initial_delay_ms: initial,
    max_delay_ms: maxDelay,
    multiplier: strategy === 'exponential_backoff' ? multiplier : 1,
    jitter_type: jitter,
    retry_on_status_codes: RETRYABLE,
    non_retryable_status_codes: NON_RETRYABLE,
    circuit_breaker_recommended: circuit,
    circuit_breaker_threshold: circuit ? 5 : null,
    timeout_ms: pattern === 'timeout' ? 10000 : 5000,
    delay_schedule_ms: schedule,
    failure_pattern: pattern,
    sample_implementation_pseudocode: pseudocode,
  };
}

function analyze(input: any, options: any) {
  const codes = extractCodes(input, options);
  const pattern = classifyFailure(codes, input, options);
  const error_classification = [...new Set(codes)].map(code => ({
    code,
    type: code === 429 ? 'rate_limit' : code >= 500 ? 'server' : code === 408 ? 'timeout' : code >= 400 ? 'client' : 'informational',
    retryable: RETRYABLE.includes(code),
  }));
  const retryableShare = error_classification.length ? error_classification.filter(e => e.retryable).length / error_classification.length : (pattern === 'persistent' || pattern === 'authentication' ? 0 : 0.7);
  const idempotent = options?.idempotent === true || ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'].includes(String(options?.method || '').toUpperCase());

  return {
    failure_pattern: pattern,
    error_classification,
    retry_success_rate_estimate: Math.round(retryableShare * 100) / 100,
    thundering_herd_risk: pattern === 'rate_limited' || (codes.includes(503) && !options?.jitter),
    idempotency_safe: idempotent,
    idempotency_key_suggested: !idempotent && (pattern === 'transient' || pattern === 'timeout' || pattern === 'network'),
    sla_impact_analysis: pattern === 'persistent' ? 'Non-retryable failures will surface to users; retries will not help' : 'Retryable failures can be masked with bounded backoff',
    cost_per_retry_estimate: null, // depends on real per-call cost — not fabricated
    analysis_summary: `Detected ${error_classification.length} distinct status code(s); pattern classified as ${pattern}.`,
  };
}

// ---- envelope -----------------------------------------------------------------------------

function envelope(data: any, opts: { start: number; score: number; reason: string; ttl: number; actions: any[] }) {
  return {
    success: true,
    request_id: rid(),
    data,
    confidence: { score: opts.score, reason: opts.reason, per_section: { rules: opts.score } },
    provenance: { provider: 'deterministic-compute', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl, retryable: false, cache_recommended: true },
    recommended_next_api: [
      { api: 'retry-strategy-recommender', endpoint: '/retry-intelligence', reason: 'Full retry strategy intelligence in one call' },
      { api: 'rate-limit-estimator', endpoint: '/estimate', reason: 'Size backoff against the upstream rate limit' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Retry Strategy Recommender API', info: '/retry-strategy-recommender/info', openapi: '/retry-strategy-recommender/openapi.json', health: 'ok' });
});

router.post('/recommend', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  if (input == null || (typeof input === 'string' && !input.trim() && !options?.status_codes && !options?.failure_type)) {
    return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  }
  const data = recommend(input, options);
  res.json(envelope(data, {
    start, score: 1, ttl: 86400,
    reason: `Rules-based strategy for "${data.failure_pattern}" failures with computed delay schedule`,
    actions: [{ priority: 'high', action: `Use ${data.strategy} (${data.max_retries} retries, ${data.jitter_type} jitter)`, reason: `Failure pattern: ${data.failure_pattern}` }],
  }));
});

router.post('/analyze', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  if (input == null || (typeof input === 'string' && !input.trim() && !options?.status_codes && !options?.failure_type)) {
    return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  }
  const data = analyze(input, options);
  res.json(envelope(data, {
    start, score: data.error_classification.length ? 1 : 0.6, ttl: 86400,
    reason: data.error_classification.length ? 'Classified from status codes in input' : 'No status codes found; pattern inferred from text',
    actions: [{ priority: data.thundering_herd_risk ? 'high' : 'medium', action: data.thundering_herd_risk ? 'Add jitter to avoid thundering herd' : 'Apply bounded retries with backoff', reason: `Pattern: ${data.failure_pattern}` }],
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'analyze', next_api: 'retry-strategy-recommender', next_endpoint: '/retry-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'retry-strategy-recommender', endpoint: '/retry-intelligence', reason: 'Full retry strategy intelligence in one call' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /retry-intelligence', reason: 'Single-request full analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

router.post('/retry-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  if (input == null || (typeof input === 'string' && !input.trim() && !options?.status_codes && !options?.failure_type)) {
    return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  }
  const rec = recommend(input, options);
  const ana = analyze(input, options);
  const overall_score = Math.round(ana.retry_success_rate_estimate * 100);
  const data = {
    recommend: rec,
    analyze: ana,
    overall_score,
    key_findings: [
      `Failure pattern: ${rec.failure_pattern}`,
      `Strategy: ${rec.strategy} (${rec.max_retries} retries)`,
      `Estimated retry success share: ${Math.round(ana.retry_success_rate_estimate * 100)}%`,
    ],
    summary: `For ${rec.failure_pattern} failures, use ${rec.strategy} with ${rec.max_retries} retries and ${rec.jitter_type} jitter.`,
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400,
    reason: 'Deterministic combined retry strategy intelligence',
    actions: [{ priority: 'high', action: `Adopt ${rec.strategy}`, reason: `Best fit for ${rec.failure_pattern}` }],
  }));
});

export default router;
