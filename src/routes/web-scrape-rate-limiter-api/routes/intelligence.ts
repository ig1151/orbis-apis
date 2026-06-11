import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic scrape rate-limiter / schedule planner. Given a robots
// crawl-delay (if any), desired RPS, concurrency, and page count, computes a
// polite, compliant request schedule: safe RPS, inter-request delay, concurrency
// cap, and total ETA. Pure math — no fetch, no LLM. Defensive: it only ever
// *reduces* aggressiveness to respect crawl-delay and politeness defaults.

const router = Router();
const HARD_MAX_CONCURRENCY = 10;

export interface PlanResult {
  basis: 'crawl_delay' | 'politeness_default';
  crawl_delay_s: number | null; requested_rps: number | null; requested_concurrency: number | null; pages: number | null;
  safe_rps: number; effective_rps: number; recommended_concurrency: number; delay_between_requests_ms: number | null;
  throttled: boolean; violates_crawl_delay: boolean; estimated_duration_seconds: number | null;
}

export function plan(body: any): { error: string } | { result: PlanResult } {
  const crawl_delay_s = num(body?.crawl_delay_s);
  if (crawl_delay_s !== undefined && crawl_delay_s < 0) return { error: '"crawl_delay_s" must be 0 or greater.' };
  const requested_rps = num(body?.requested_rps);
  if (requested_rps !== undefined && requested_rps <= 0) return { error: '"requested_rps" must be positive.' };
  const requested_concurrency = num(body?.requested_concurrency);
  if (requested_concurrency !== undefined && requested_concurrency < 1) return { error: '"requested_concurrency" must be at least 1.' };
  const pages = num(body?.pages);
  if (pages !== undefined && pages < 0) return { error: '"pages" must be 0 or greater.' };
  // Politeness ceiling when robots gives no crawl-delay (default 1 req/s/host).
  const default_max_rps = num(body?.default_max_rps) ?? 1;
  const max_concurrency = clamp(num(body?.max_concurrency) ?? 5, 1, HARD_MAX_CONCURRENCY);

  let safe_rps: number;
  let recommended_concurrency: number;
  let basis: 'crawl_delay' | 'politeness_default';
  if (crawl_delay_s !== undefined && crawl_delay_s > 0) {
    // crawl-delay = minimum seconds between successive requests → serialize.
    safe_rps = 1 / crawl_delay_s;
    recommended_concurrency = 1;
    basis = 'crawl_delay';
  } else {
    safe_rps = default_max_rps;
    recommended_concurrency = clamp(Math.round(requested_concurrency ?? 2), 1, max_concurrency);
    basis = 'politeness_default';
  }

  const effective_rps = round(requested_rps !== undefined ? Math.min(requested_rps, safe_rps) : safe_rps, 4);
  const throttled = requested_rps !== undefined && requested_rps > safe_rps;
  const violates_crawl_delay = basis === 'crawl_delay' && ((requested_rps !== undefined && requested_rps > safe_rps) || (requested_concurrency !== undefined && requested_concurrency > 1));
  const delay_between_requests_ms = effective_rps > 0 ? round(1000 / effective_rps, 1) : null;
  const estimated_duration_seconds = pages !== undefined && effective_rps > 0 ? round(pages / effective_rps, 1) : null;

  return {
    result: {
      basis, crawl_delay_s: crawl_delay_s ?? null,
      requested_rps: requested_rps ?? null, requested_concurrency: requested_concurrency ?? null, pages: pages ?? null,
      safe_rps: round(safe_rps, 4), effective_rps, recommended_concurrency, delay_between_requests_ms,
      throttled, violates_crawl_delay, estimated_duration_seconds,
    },
  };
}

function actions(r: PlanResult): string[] {
  const out: string[] = [];
  if (r.basis === 'crawl_delay') out.push(`robots crawl-delay is ${r.crawl_delay_s}s → cap at ${r.effective_rps} req/s, concurrency 1 (${r.delay_between_requests_ms}ms between requests).`);
  else out.push(`No crawl-delay in robots → apply the politeness default of ${r.safe_rps} req/s with concurrency ${r.recommended_concurrency}.`);
  if (r.violates_crawl_delay) out.push('Your requested rate/concurrency would VIOLATE crawl-delay — it has been throttled down. Do not override.');
  else if (r.throttled) out.push('Requested RPS exceeded the safe ceiling and was throttled to the safe rate.');
  if (r.estimated_duration_seconds !== null) out.push(`At ${r.effective_rps} req/s, ${r.pages} pages take ~${r.estimated_duration_seconds}s (${round(r.estimated_duration_seconds / 60, 1)} min).`);
  out.push('Always honor robots.txt and Retry-After; back off on 429/503.');
  return out;
}

const CHAIN_TO = [
  { api: 'robots-txt-parser', reason: 'Parse the target robots.txt to obtain the real crawl-delay and disallow rules first.' },
  { api: 'web-scrape-legal-risk-checker', reason: 'Confirm the crawl is permissible (ToS/PII/copyright) before scheduling it.' },
  { api: 'web-scrape-planner', reason: 'Turn this rate into batches and an end-to-end crawl plan.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Scrape Rate Limiter API', version: '1.0.0',
    description: 'Deterministic, defensive scrape scheduler. From a robots crawl-delay (if any), desired RPS, concurrency, and page count it computes a polite, compliant schedule: safe RPS, inter-request delay, concurrency cap, throttle flags, and total ETA. Only ever reduces aggressiveness. Pure math — no fetch, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/web-scrape-rate-limiter/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/plan', summary: 'Compute a polite, crawl-delay-compliant request schedule', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL schedule + reasoning + compliance notes', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/plan', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/plan', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = plan(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 0.85, confidence_per_section: { schedule: 1, compliance: 0.7 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = plan(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Basis: ${v.basis}; safe ${v.safe_rps} req/s → effective ${v.effective_rps} req/s, concurrency ${v.recommended_concurrency}.`,
      key_factors: [`crawl_delay: ${v.crawl_delay_s ?? 'none'}.`, `throttled: ${v.throttled}.`, `violates_crawl_delay: ${v.violates_crawl_delay}.`],
      invalidators: ['robots crawl-delay is advisory and not honored by all servers, but you should; some sites enforce stricter limits via 429.', 'A shared IP/proxy pool changes effective per-host load.', 'Server-side Retry-After always overrides this schedule.'],
    },
    confidence_score: 0.85, confidence_per_section: { schedule: 1, compliance: 0.7 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
