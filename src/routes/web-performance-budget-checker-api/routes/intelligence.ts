import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, round, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic performance-budget checker. Caller supplies per-resource weights
// (or pre-aggregated class totals); we bucket by asset class, compare against a
// budget (sensible defaults, fully overridable), and return pass/warn/fail per
// class plus a total verdict. Pure arithmetic — no fetch, no LLM.

const router = Router();

export const CLASSES = ['html', 'css', 'js', 'image', 'font', 'media', 'other'] as const;
export type AssetClass = (typeof CLASSES)[number];

// Default per-class KB budgets — opinionated but standard mobile-perf targets.
export const DEFAULT_BUDGETS: Record<AssetClass, number> = { html: 50, css: 100, js: 350, image: 900, font: 150, media: 0, other: 100 };
const DEFAULT_TOTAL = 1600;
const WARN_FACTOR = 1.2; // ≤ budget → pass; ≤ budget*1.2 → warn; else fail

function classify(type: string): AssetClass {
  const t = type.toLowerCase();
  if (CLASSES.includes(t as AssetClass)) return t as AssetClass;
  if (/(^|\b)(js|javascript|script)\b/.test(t)) return 'js';
  if (/css|style/.test(t)) return 'css';
  if (/html|document|doc/.test(t)) return 'html';
  if (/img|image|png|jpe?g|webp|gif|svg|avif/.test(t)) return 'image';
  if (/font|woff|ttf|otf/.test(t)) return 'font';
  if (/video|audio|media|mp4|mp3|webm/.test(t)) return 'media';
  return 'other';
}

export interface ClassRow { class: AssetClass; size_kb: number; count: number; budget_kb: number; over_by_kb: number; pct_of_budget: number | null; status: 'pass' | 'warn' | 'fail'; }

function statusFor(size: number, budget: number): ClassRow['status'] {
  if (budget <= 0) return size > 0 ? 'fail' : 'pass'; // 0 budget = disallowed class
  if (size <= budget) return 'pass';
  if (size <= budget * WARN_FACTOR) return 'warn';
  return 'fail';
}

export interface TotalRow { size_kb: number; budget_kb: number; over_by_kb: number; pct_of_budget: number | null; status: 'pass' | 'warn' | 'fail'; }
export interface BudgetResult { by_class: ClassRow[]; total: TotalRow; passes: boolean; failing_classes: AssetClass[]; }

export function checkBudget(body: any): { error: string } | { result: BudgetResult } {
  // Accept either resources:[{type,size_kb,count}] or class totals:{js:{size_kb,count}}.
  const totals: Record<AssetClass, { size: number; count: number }> = Object.fromEntries(CLASSES.map((c) => [c, { size: 0, count: 0 }])) as any;

  if (Array.isArray(body?.resources)) {
    if (body.resources.length === 0) return { error: '"resources" is empty — provide at least one {type, size_kb}.' };
    for (const r of body.resources) {
      const size = num(r?.size_kb);
      if (size === undefined || size < 0) return { error: 'Each resource needs a non-negative "size_kb".' };
      const cls = classify(String(r?.type ?? 'other'));
      totals[cls].size += size;
      totals[cls].count += num(r?.count) ?? 1;
    }
  } else if (body?.class_totals && typeof body.class_totals === 'object') {
    let any = false;
    for (const [k, v] of Object.entries(body.class_totals as Record<string, any>)) {
      const cls = classify(k);
      const size = num(v?.size_kb ?? v);
      if (size === undefined || size < 0) return { error: `class_totals.${k} needs a non-negative size_kb.` };
      totals[cls].size += size; totals[cls].count += num(v?.count) ?? 0; any = true;
    }
    if (!any) return { error: '"class_totals" is empty.' };
  } else {
    return { error: 'Provide "resources" (array of {type,size_kb,count}) or "class_totals" (map of class -> {size_kb,count}).' };
  }

  const budgets: Record<AssetClass, number> = { ...DEFAULT_BUDGETS };
  if (body?.budgets && typeof body.budgets === 'object') {
    for (const [k, v] of Object.entries(body.budgets as Record<string, any>)) {
      const cls = classify(k); const b = num(v?.max_kb ?? v);
      if (b !== undefined && b >= 0) budgets[cls] = b;
    }
  }
  const total_budget_kb = num(body?.total_budget_kb) ?? DEFAULT_TOTAL;

  const by_class: ClassRow[] = CLASSES.map((c) => {
    const size = round(totals[c].size, 2);
    const budget = budgets[c];
    return { class: c, size_kb: size, count: totals[c].count, budget_kb: budget, over_by_kb: round(Math.max(0, size - budget), 2), pct_of_budget: budget > 0 ? round((size / budget) * 100, 1) : null, status: statusFor(size, budget) };
  });
  const total_size = round(CLASSES.reduce((s, c) => s + totals[c].size, 0), 2);
  const total_status = statusFor(total_size, total_budget_kb);
  const passes = total_status !== 'fail' && by_class.every((r) => r.status !== 'fail');
  return {
    result: {
      by_class,
      total: { size_kb: total_size, budget_kb: total_budget_kb, over_by_kb: round(Math.max(0, total_size - total_budget_kb), 2), pct_of_budget: total_budget_kb > 0 ? round((total_size / total_budget_kb) * 100, 1) : null, status: total_status },
      passes,
      failing_classes: by_class.filter((r) => r.status === 'fail').map((r) => r.class),
    },
  };
}

function actions(r: BudgetResult): string[] {
  const out: string[] = [];
  out.push(r.passes ? `Within budget: total ${r.total.size_kb}KB vs ${r.total.budget_kb}KB budget.` : `OVER budget: total ${r.total.size_kb}KB vs ${r.total.budget_kb}KB (${r.total.over_by_kb}KB over).`);
  const offenders = [...r.by_class].filter((c) => c.status === 'fail').sort((a, b) => b.over_by_kb - a.over_by_kb);
  for (const o of offenders.slice(0, 3)) {
    if (o.class === 'js') out.push(`Trim JS (${o.size_kb}KB > ${o.budget_kb}KB): code-split, tree-shake, defer non-critical bundles.`);
    else if (o.class === 'image') out.push(`Trim images (${o.size_kb}KB > ${o.budget_kb}KB): use AVIF/WebP, responsive srcset, and lazy-load below the fold.`);
    else if (o.class === 'css') out.push(`Trim CSS (${o.size_kb}KB > ${o.budget_kb}KB): purge unused rules and inline only critical CSS.`);
    else if (o.class === 'font') out.push(`Trim fonts (${o.size_kb}KB > ${o.budget_kb}KB): subset glyphs, use woff2, limit weights.`);
    else out.push(`${o.class} is ${o.over_by_kb}KB over its ${o.budget_kb}KB budget — reduce or defer.`);
  }
  if (offenders.length === 0 && !r.passes) out.push('Per-class budgets pass but the total budget is exceeded — tighten the largest classes.');
  return out;
}

const CHAIN_TO = [
  { api: 'web-vitals-grader', reason: 'Translate weight savings into expected LCP/INP improvements.' },
  { api: 'web-scrape-cost-roi-analyzer', reason: 'Estimate the bandwidth cost of crawling pages of this weight.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Performance Budget Checker API', version: '1.0.0',
    description: 'Deterministic performance-budget checker. Supply per-resource weights or pre-aggregated class totals; returns pass/warn/fail per asset class (html/css/js/image/font/media/other) against a budget (sensible defaults, fully overridable) plus a total verdict and the worst offenders. Pure arithmetic — no fetch, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/web-performance-budget-checker/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/check', summary: 'Bucket weights by class & compare vs budget → pass/fail', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL budget check + reasoning + fix priorities', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/check', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/check', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = checkBudget(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 1.0, confidence_per_section: { budget: 1 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = checkBudget(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const res2 = r.result;
  respond(res, t0, {
    ...res2,
    reasoning: {
      why_result_generated: `Bucketed weights into ${CLASSES.length} classes; total ${res2.total.size_kb}KB vs ${res2.total.budget_kb}KB budget → ${res2.passes ? 'PASS' : 'FAIL'}.`,
      key_factors: res2.by_class.filter((c) => c.size_kb > 0).map((c) => `${c.class}: ${c.size_kb}KB / ${c.budget_kb}KB (${c.status}).`),
      invalidators: ['Budgets are KB of transfer size — gzip/brotli compression changes real bytes on the wire.', 'Defaults are mobile-oriented targets, not a hard standard; override per project.', 'Weight alone does not capture render-blocking behavior or execution cost.'],
    },
    confidence_score: 1.0, confidence_per_section: { budget: 1 },
    recommended_actions_priority_order: actions(res2), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
