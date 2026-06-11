import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic crawl planner. From total pages, throughput (crawl-delay or RPS),
// batch size, and a retry-overhead factor, computes batch count, per-batch
// timing, a total ETA, and a sample batch schedule. Pure arithmetic — no fetch,
// no LLM. Pairs with web-scrape-rate-limiter (rate) and -cost-roi-analyzer (cost).

const router = Router();

function humanize(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : '', (r || (!h && !m)) ? `${r}s` : ''].filter(Boolean).join(' ');
}

export interface BatchRow { index: number; pages: number; cumulative_pages: number; start_offset_seconds: number; est_seconds: number; }
export interface PlanResult {
  total_pages: number; pages_with_retries: number; retry_overhead_pct: number;
  effective_rps: number; throughput_pages_per_min: number; concurrency: number;
  batch_size: number; total_batches: number; last_batch_pages: number; seconds_per_full_batch: number;
  estimated_total_seconds: number; estimated_total_human: string;
  sample_schedule: BatchRow[]; schedule_truncated: boolean;
}

export function planCrawl(body: any): { error: string } | { result: PlanResult } {
  const total_pages = num(body?.total_pages);
  if (total_pages === undefined || total_pages <= 0) return { error: 'Provide "total_pages" as a positive number.' };

  const crawl_delay_s = num(body?.crawl_delay_s);
  if (crawl_delay_s !== undefined && crawl_delay_s < 0) return { error: '"crawl_delay_s" must be 0 or greater.' };
  const requested_rps = num(body?.requested_rps);
  if (requested_rps !== undefined && requested_rps <= 0) return { error: '"requested_rps" must be positive.' };

  const effective_rps = crawl_delay_s !== undefined && crawl_delay_s > 0 ? round(1 / crawl_delay_s, 4) : round(requested_rps ?? 1, 4);
  const concurrency = clamp(Math.round(num(body?.concurrency) ?? 1), 1, 50);
  const batch_size = clamp(Math.round(num(body?.batch_size) ?? 500), 1, 100000);
  const retry_overhead_pct = clamp(num(body?.retry_overhead_pct) ?? 0, 0, 200);

  const pages_with_retries = Math.ceil(total_pages * (1 + retry_overhead_pct / 100));
  const total_batches = Math.ceil(total_pages / batch_size);
  const last_batch_pages = total_pages - (total_batches - 1) * batch_size;
  const seconds_per_full_batch = round(batch_size / effective_rps, 2);
  const estimated_total_seconds = round(pages_with_retries / effective_rps, 2);

  const MAX_ROWS = 10;
  const sample_schedule: BatchRow[] = [];
  let cumulative = 0, offset = 0;
  for (let i = 0; i < Math.min(total_batches, MAX_ROWS); i++) {
    const pages = i === total_batches - 1 ? last_batch_pages : batch_size;
    const est = round(pages / effective_rps, 2);
    sample_schedule.push({ index: i + 1, pages, cumulative_pages: cumulative + pages, start_offset_seconds: round(offset, 2), est_seconds: est });
    cumulative += pages; offset += est;
  }

  return {
    result: {
      total_pages, pages_with_retries, retry_overhead_pct,
      effective_rps, throughput_pages_per_min: round(effective_rps * 60, 2), concurrency,
      batch_size, total_batches, last_batch_pages, seconds_per_full_batch,
      estimated_total_seconds, estimated_total_human: humanize(estimated_total_seconds),
      sample_schedule, schedule_truncated: total_batches > MAX_ROWS,
    },
  };
}

function actions(r: PlanResult): string[] {
  const out = [`${r.total_pages} pages in ${r.total_batches} batches of ${r.batch_size} at ${r.effective_rps} req/s → ~${r.estimated_total_human}.`];
  if (r.retry_overhead_pct > 0) out.push(`Includes ${r.retry_overhead_pct}% retry overhead (${r.pages_with_retries} effective fetches).`);
  out.push(`Throughput ≈ ${r.throughput_pages_per_min} pages/min; checkpoint after each batch so a failure resumes mid-crawl.`);
  if (r.estimated_total_seconds > 86400) out.push('Crawl exceeds 24h — split across days or raise throughput only if robots/ToS allow.');
  return out;
}

const CHAIN_TO = [
  { api: 'web-scrape-rate-limiter', reason: 'Derive a compliant, polite RPS before committing to this throughput.' },
  { api: 'web-scrape-cost-roi-analyzer', reason: 'Cost the planned page count and confirm positive ROI.' },
  { api: 'web-scrape-legal-risk-checker', reason: 'Confirm the crawl is permissible before scheduling it.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Scrape Planner API', version: '1.0.0',
    description: 'Deterministic crawl planner. From total pages, throughput (crawl-delay or RPS), batch size, and retry overhead, returns batch count, per-batch timing, a total ETA, and a sample batch schedule with start offsets. Pure arithmetic — no fetch, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/web-scrape-planner/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/plan', summary: 'Batches, per-batch timing, total ETA, sample schedule', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL crawl plan + reasoning + sequencing guidance', price_usdc: 0.012 },
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
  const r = planCrawl(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 1.0, confidence_per_section: { batching: 1, eta: 1 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = planCrawl(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.total_pages} pages ÷ ${v.batch_size}/batch = ${v.total_batches} batches; ${v.pages_with_retries} fetches ÷ ${v.effective_rps} req/s = ${v.estimated_total_seconds}s.`,
      key_factors: [`Effective RPS: ${v.effective_rps}.`, `Batches: ${v.total_batches} (last ${v.last_batch_pages} pages).`, `ETA: ${v.estimated_total_human}.`],
      invalidators: ['ETA assumes steady throughput; real latency, blocks, and backoff lengthen it.', 'Concurrency does not increase per-host RPS when politeness/crawl-delay binds.', 'Page-size variance changes bandwidth but not this page-count ETA.'],
    },
    confidence_score: 1.0, confidence_per_section: { batching: 1, eta: 1 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
