import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, round, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic scrape cost / ROI analyzer. From page count, per-page cost (or
// cost components), per-page value (or total value), and a one-time fixed cost,
// computes total cost, net value, ROI %, per-page margin, break-even page count,
// and a verdict band. Pure arithmetic — no fetch, no LLM.

const router = Router();

export interface RoiResult {
  pages: number; cost_per_page: number; cost_component_total: number | null; fixed_cost: number; variable_cost: number; total_cost: number;
  value_per_page: number; total_value: number; net_value: number; roi_pct: number | null; margin_per_page: number;
  break_even_pages: number | null; profitable: boolean; verdict: 'strong_roi' | 'positive' | 'marginal' | 'negative';
}

export function analyze(body: any): { error: string } | { result: RoiResult } {
  const pages = num(body?.pages);
  if (pages === undefined || pages <= 0) return { error: 'Provide "pages" as a positive number.' };

  // Cost per page: explicit, or summed components.
  let cost_per_page = num(body?.cost_per_page);
  const components = body?.cost_components;
  let component_total: number | null = null;
  if (cost_per_page === undefined && components && typeof components === 'object') {
    let sum = 0; let any = false;
    for (const v of Object.values(components as Record<string, any>)) { const n = num(v); if (n !== undefined) { sum += n; any = true; } }
    if (any) { cost_per_page = sum; component_total = round(sum, 6); }
  }
  if (cost_per_page === undefined || cost_per_page < 0) return { error: 'Provide "cost_per_page" (or non-negative "cost_components") — a non-negative number.' };

  const fixed_cost = num(body?.fixed_cost) ?? 0;
  if (fixed_cost < 0) return { error: '"fixed_cost" must be 0 or greater.' };

  // Value: per-page or a provided total.
  const value_per_page = num(body?.value_per_page);
  const total_value_in = num(body?.total_value);
  if (value_per_page === undefined && total_value_in === undefined) return { error: 'Provide "value_per_page" or "total_value".' };
  const total_value = round(total_value_in ?? (value_per_page as number) * pages, 4);
  const effective_value_per_page = round(total_value / pages, 6);

  const variable_cost = round(cost_per_page * pages, 4);
  const total_cost = round(fixed_cost + variable_cost, 4);
  const net_value = round(total_value - total_cost, 4);
  const roi_pct = total_cost > 0 ? round((net_value / total_cost) * 100, 2) : null;
  const margin_per_page = round(effective_value_per_page - cost_per_page, 6);
  const break_even_pages = margin_per_page > 0 ? Math.ceil(fixed_cost / margin_per_page) : null;

  const verdict: 'strong_roi' | 'positive' | 'marginal' | 'negative' =
    net_value < 0 ? 'negative' : roi_pct === null ? 'strong_roi' : roi_pct >= 200 ? 'strong_roi' : roi_pct >= 50 ? 'positive' : 'marginal';

  return {
    result: {
      pages, cost_per_page: round(cost_per_page, 6), cost_component_total: component_total, fixed_cost: round(fixed_cost, 4),
      variable_cost, total_cost, value_per_page: effective_value_per_page, total_value,
      net_value, roi_pct, margin_per_page, break_even_pages, profitable: net_value > 0, verdict,
    },
  };
}

function actions(r: RoiResult): string[] {
  const out: string[] = [];
  out.push(`Net ${r.net_value} on ${r.total_cost} cost${r.roi_pct !== null ? ` → ROI ${r.roi_pct}%` : ''} (${r.verdict}).`);
  if (r.verdict === 'negative') {
    out.push('Unprofitable as scoped — cut per-page cost (cheaper proxies/cache, fewer retries), raise extracted value, or reduce page count.');
    if (r.margin_per_page <= 0) out.push('Per-page value does not cover per-page cost — the fixed cost can never be recovered at this margin.');
  } else {
    out.push(`Per-page margin is ${r.margin_per_page}; ${r.break_even_pages !== null ? `break even at ${r.break_even_pages} pages` : 'no fixed cost to recover'}.`);
    if (r.verdict === 'marginal') out.push('Thin ROI — sensitive to cost/value assumptions; validate on a small pilot before scaling.');
  }
  return out;
}

const CHAIN_TO = [
  { api: 'web-scrape-rate-limiter', reason: 'Turn the page count into a compliant crawl schedule and runtime estimate.' },
  { api: 'web-scrape-planner', reason: 'Break the crawl into batches with an ETA that matches this budget.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Scrape Cost/ROI Analyzer API', version: '1.0.0',
    description: 'Deterministic scrape cost/ROI analyzer. From page count, per-page cost (or components), per-page/total value, and a one-time fixed cost, returns total cost, net value, ROI %, per-page margin, break-even page count, and a verdict band. Pure arithmetic — no fetch, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/web-scrape-cost-roi-analyzer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/analyze', summary: 'Cost, net value, ROI %, break-even, verdict', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL ROI + reasoning + optimization guidance', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/analyze', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/analyze', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = analyze(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 1.0, confidence_per_section: { cost: 1, roi: 1 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = analyze(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `cost ${v.total_cost} (fixed ${v.fixed_cost} + ${v.cost_per_page}/page × ${v.pages}) vs value ${v.total_value} → net ${v.net_value}, ROI ${v.roi_pct ?? 'n/a'}%.`,
      key_factors: [`Margin/page: ${v.margin_per_page}.`, `Break-even pages: ${v.break_even_pages ?? 'n/a'}.`, `Verdict: ${v.verdict}.`],
      invalidators: ['ROI depends entirely on your value estimate, which is rarely linear per page.', 'Cost ignores failure/retry overhead and engineering time unless you fold them into cost_per_page/fixed_cost.', 'Legal/blocking risk can impose costs not captured here — check the legal-risk checker.'],
    },
    confidence_score: 1.0, confidence_per_section: { cost: 1, roi: 1 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
