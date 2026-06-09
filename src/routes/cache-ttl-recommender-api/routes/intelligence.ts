import { Router, Request, Response } from 'express';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic cache-TTL advisory engine ----------------------------------------------
// Recommendations are rules-based (a documented policy table), not invented telemetry.
// Where the request supplies real headers, they are parsed and compared against the policy.

type Volatility = 'static' | 'low' | 'medium' | 'high' | 'realtime';
type Strategy = 'cache_first' | 'network_first' | 'stale_while_revalidate' | 'no_cache';
type Invalidation = 'time_based' | 'event_based' | 'manual' | 'tag_based';

interface Policy { ttl: number; min: number; max: number; strategy: Strategy; invalidation: Invalidation; }

const POLICY: Record<Volatility, Policy> = {
  static:   { ttl: 31536000, min: 86400,  max: 31536000, strategy: 'cache_first',             invalidation: 'manual' },
  low:      { ttl: 86400,    min: 3600,   max: 604800,   strategy: 'cache_first',             invalidation: 'time_based' },
  medium:   { ttl: 3600,     min: 300,    max: 86400,    strategy: 'stale_while_revalidate',  invalidation: 'time_based' },
  high:     { ttl: 60,       min: 5,      max: 300,      strategy: 'stale_while_revalidate',  invalidation: 'event_based' },
  realtime: { ttl: 0,        min: 0,      max: 5,        strategy: 'no_cache',                invalidation: 'event_based' },
};

// Map content-type / resource hints to a volatility class.
function classify(input: any, options: any): Volatility {
  if (options?.volatility && (POLICY as any)[options.volatility]) return options.volatility;
  const s = `${typeof input === 'string' ? input : JSON.stringify(input || '')} ${options?.content_type || ''}`.toLowerCase();
  if (/\b(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|\.css|\.js|font|image\/|immutable|[.-][0-9a-f]{8,})\b/.test(s)) return 'static';
  if (/\b(blog|article|doc|documentation|about|landing|marketing|sitemap|product page)\b/.test(s)) return 'low';
  if (/\b(html|text\/html|listing|category|search results|profile)\b/.test(s)) return 'medium';
  if (/\b(api|application\/json|feed|dashboard|inventory|availability|pricing)\b/.test(s)) return 'high';
  if (/\b(stock|ticker|live|realtime|streaming|chat|quote|score|auction|bid)\b/.test(s)) return 'realtime';
  return 'medium';
}

function parseMaxAge(input: any): number | null {
  const s = typeof input === 'string' ? input : JSON.stringify(input || '');
  const m = s.match(/max-age\s*=\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function recommend(input: any, options: any) {
  const volatility = classify(input, options);
  const p = POLICY[volatility];
  const noCache = p.strategy === 'no_cache';
  return {
    recommended_ttl_seconds: p.ttl,
    min_ttl_seconds: p.min,
    max_ttl_seconds: p.max,
    cache_strategy: p.strategy,
    cdn_ttl_seconds: noCache ? 0 : p.ttl,
    browser_ttl_seconds: noCache ? 0 : Math.min(p.ttl, 86400),
    edge_ttl_seconds: noCache ? 0 : p.ttl,
    cache_control_header: noCache
      ? 'no-store, max-age=0'
      : `public, max-age=${Math.min(p.ttl, 86400)}, s-maxage=${p.ttl}${p.strategy === 'stale_while_revalidate' ? `, stale-while-revalidate=${Math.max(60, Math.round(p.ttl / 10))}` : ''}`,
    vary_headers: ['Accept-Encoding', ...(options?.varies_on_auth ? ['Authorization'] : [])],
    etag_recommended: !noCache,
    content_volatility: volatility,
    invalidation_strategy: p.invalidation,
  };
}

function analyze(input: any, options: any) {
  const rec = recommend(input, options);
  const current = parseMaxAge(input) ?? (typeof options?.current_ttl_seconds === 'number' ? options.current_ttl_seconds : null);
  const over = current != null && current > rec.max_ttl_seconds;
  const under = current != null && current < rec.min_ttl_seconds;

  // Hit-rate / savings depend on real traffic. Only report when current TTL is known, and clearly as model-based.
  const ratio = current != null && rec.recommended_ttl_seconds > 0 ? Math.min(1, current / rec.recommended_ttl_seconds) : null;
  return {
    current_ttl_seconds: current,
    cache_hit_rate_estimate: null, // requires real traffic data — not fabricated
    stale_data_risk_score: over ? Math.min(100, Math.round((current! / Math.max(1, rec.recommended_ttl_seconds)) * 50)) : 0,
    over_caching_detected: over,
    under_caching_detected: under,
    bandwidth_savings_estimate_percent: null,
    latency_improvement_estimate_ms: null,
    cost_savings_estimate_percent: null,
    cache_efficiency_score: current == null ? null : (over || under ? 50 : 90),
    improvement_suggestions: current == null
      ? ['No current Cache-Control/max-age found — supply it (or options.current_ttl_seconds) to assess fit']
      : over ? [`Reduce max-age toward ${rec.recommended_ttl_seconds}s to lower stale-data risk`]
      : under ? [`Increase max-age toward ${rec.recommended_ttl_seconds}s to improve cache reuse`]
      : ['Current TTL is within the recommended range'],
    _alignment_ratio: ratio,
  };
}

// ---- envelope -----------------------------------------------------------------------------

function envelope(data: any, opts: { start: number; score: number; reason: string; ttl: number; actions: any[] }) {
  return {
    success: true,
    request_id: rid(),
    data,
    confidence: { score: opts.score, reason: opts.reason, per_section: { policy: opts.score } },
    provenance: { provider: 'deterministic-compute', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl, retryable: false, cache_recommended: true },
    recommended_next_api: [
      { api: 'cache-ttl-recommender', endpoint: '/cache-ttl-intelligence', reason: 'Full cache TTL intelligence in one call' },
      { api: 'core-web-vitals-lite', endpoint: '/core-web-vitals-lite', reason: 'Measure the page-load impact of caching' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Cache TTL Recommender API', info: '/cache-ttl-recommender/info', openapi: '/cache-ttl-recommender/openapi.json', health: 'ok' });
});

router.post('/recommend', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  if (input == null || (typeof input === 'string' && !input.trim() && !options?.volatility && !options?.content_type)) {
    return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  }
  const data = recommend(input, options);
  res.json(envelope(data, {
    start, score: options?.volatility ? 1 : 0.85, ttl: 3600,
    reason: options?.volatility ? 'Policy applied to declared volatility class' : `Volatility inferred as "${data.content_volatility}" from content hints`,
    actions: [{ priority: 'medium', action: `Set Cache-Control: ${data.cache_control_header}`, reason: `Volatility class: ${data.content_volatility}` }],
  }));
});

router.post('/analyze', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  if (input == null || (typeof input === 'string' && !input.trim() && options?.current_ttl_seconds == null)) {
    return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  }
  const data = analyze(input, options);
  const known = data.current_ttl_seconds != null;
  res.json(envelope(data, {
    start, score: known ? 0.9 : 0.3, ttl: 3600,
    reason: known ? 'Compared supplied TTL against the recommended policy' : 'No current TTL found to analyze',
    actions: data.improvement_suggestions.slice(0, 1).map((sug: string) => ({ priority: (data.over_caching_detected || data.under_caching_detected) ? 'high' : 'low', action: sug, reason: known ? `Current: ${data.current_ttl_seconds}s` : 'Supply current Cache-Control' })),
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'analyze', next_api: 'cache-ttl-recommender', next_endpoint: '/cache-ttl-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'cache-ttl-recommender', endpoint: '/cache-ttl-intelligence', reason: 'Full cache TTL intelligence in one call' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /cache-ttl-intelligence', reason: 'Single-request full analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

router.post('/cache-ttl-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  if (input == null || (typeof input === 'string' && !input.trim() && !options?.volatility && !options?.content_type)) {
    return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  }
  const rec = recommend(input, options);
  const ana = analyze(input, options);
  const overall_score = ana.cache_efficiency_score ?? 80;
  const data = {
    recommend: rec,
    analyze: ana,
    overall_score,
    key_findings: [
      `Volatility: ${rec.content_volatility}; recommended TTL ${rec.recommended_ttl_seconds}s`,
      `Strategy: ${rec.cache_strategy}`,
      ana.current_ttl_seconds != null ? `Current TTL ${ana.current_ttl_seconds}s (${ana.over_caching_detected ? 'over-caching' : ana.under_caching_detected ? 'under-caching' : 'within range'})` : 'No current TTL supplied',
    ],
    summary: `Recommend ${rec.recommended_ttl_seconds}s TTL with "${rec.cache_strategy}" for ${rec.content_volatility} content.`,
  };
  res.json(envelope(data, {
    start, score: options?.volatility ? 1 : 0.85, ttl: 3600,
    reason: 'Deterministic combined cache TTL intelligence',
    actions: [{ priority: 'medium', action: `Apply Cache-Control: ${rec.cache_control_header}`, reason: `${rec.content_volatility} content` }],
  }));
});

export default router;
