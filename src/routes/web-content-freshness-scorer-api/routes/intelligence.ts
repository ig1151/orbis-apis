import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic content-freshness scorer. From published / modified (or
// Last-Modified) dates and an optional half-life, computes content age, an
// exponential-decay freshness score (0–100), a staleness band, and a recommended
// re-check interval. Pure date math — no fetch, no LLM.

const router = Router();
const DAY_MS = 86_400_000;
const DEFAULT_HALF_LIFE = 180; // days

function parseDate(v: unknown): number | undefined {
  const s = str(v);
  if (s === undefined) return undefined;
  const t = Date.parse(s);
  return Number.isNaN(t) ? undefined : t;
}

export type Band = 'fresh' | 'recent' | 'aging' | 'stale' | 'outdated';
function band(score: number): Band {
  if (score >= 80) return 'fresh';
  if (score >= 60) return 'recent';
  if (score >= 40) return 'aging';
  if (score >= 20) return 'stale';
  return 'outdated';
}
const RECHECK: Record<Band, number> = { fresh: 90, recent: 60, aging: 30, stale: 14, outdated: 7 };

export interface ScoreResult {
  as_of: string; published_date: string | null; modified_date: string | null; effective_date: string;
  was_updated: boolean; half_life_days: number; age_days: number; days_since_published: number | null; days_since_modified: number | null;
  freshness_score: number; band: Band; recommended_recheck_in_days: number;
}

export function score(body: any): { error: string } | { result: ScoreResult } {
  const published = parseDate(body?.published_date);
  const modified = parseDate(body?.modified_date ?? body?.last_modified);
  if (body?.published_date !== undefined && published === undefined) return { error: '"published_date" is not a parseable date (use ISO 8601).' };
  if ((body?.modified_date ?? body?.last_modified) !== undefined && modified === undefined) return { error: '"modified_date"/"last_modified" is not a parseable date (use ISO 8601).' };
  if (published === undefined && modified === undefined) return { error: 'Provide at least one of "published_date" or "modified_date"/"last_modified" (ISO 8601).' };

  const now = parseDate(body?.as_of) ?? Date.now();
  const half_life_days = clamp(num(body?.half_life_days) ?? DEFAULT_HALF_LIFE, 1, 36500);
  const effective = modified ?? (published as number);
  if (effective > now) return { error: 'The content date is in the future relative to as_of.' };

  const age_days = round((now - effective) / DAY_MS, 2);
  const days_since_published = published !== undefined ? round((now - published) / DAY_MS, 2) : null;
  const days_since_modified = modified !== undefined ? round((now - modified) / DAY_MS, 2) : null;
  const freshness_score = round(clamp(100 * Math.pow(0.5, age_days / half_life_days), 0, 100), 1);
  const b = band(freshness_score);
  return {
    result: {
      as_of: new Date(now).toISOString(),
      published_date: published !== undefined ? new Date(published).toISOString() : null,
      modified_date: modified !== undefined ? new Date(modified).toISOString() : null,
      effective_date: new Date(effective).toISOString(),
      was_updated: published !== undefined && modified !== undefined && modified > published,
      half_life_days, age_days, days_since_published, days_since_modified,
      freshness_score, band: b, recommended_recheck_in_days: RECHECK[b],
    },
  };
}

function actions(r: ScoreResult): string[] {
  const out = [`Freshness ${r.freshness_score}/100 (${r.band}); content is ${r.age_days} days old.`];
  if (r.band === 'fresh' || r.band === 'recent') out.push('Treat as current; safe to cite. Re-check in ~' + r.recommended_recheck_in_days + ' days.');
  else if (r.band === 'aging') out.push('Aging — verify time-sensitive claims against a newer source before relying on it.');
  else out.push(`Likely ${r.band} — re-crawl or find an updated source; recommended re-check in ${r.recommended_recheck_in_days} days.`);
  if (r.was_updated) out.push('Content was updated after publication — the modified date drives the score.');
  return out;
}

const CHAIN_TO = [
  { api: 'web-content-diff-checker', reason: 'Compare the current version against your stored snapshot to confirm what actually changed.' },
  { api: 'website-change-monitor', reason: 'Schedule re-checks at the recommended interval.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Content Freshness Scorer API', version: '1.0.0',
    description: 'Deterministic content-freshness scorer. From published/modified (Last-Modified) dates and an optional half-life, returns content age, an exponential-decay freshness score (0–100), a staleness band (fresh/recent/aging/stale/outdated), and a recommended re-check interval. Pure date math — no fetch, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/web-content-freshness-scorer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/score', summary: 'Score content freshness from its dates', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL freshness + reasoning + re-check guidance', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/score', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/score', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = score(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 1.0, confidence_per_section: { age: 1, score: 1 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = score(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Age ${v.age_days}d vs half-life ${v.half_life_days}d → score ${v.freshness_score} (${v.band}).`,
      key_factors: [`Effective date: ${v.effective_date}.`, `Updated after publish: ${v.was_updated}.`, `Half-life: ${v.half_life_days}d.`],
      invalidators: ['Score assumes content value decays smoothly with age; evergreen reference pages decay far slower than news.', 'A "modified" date can reflect a trivial template change, not real content updates.', 'Tune half_life_days per content type (news ≈ 7–30, docs ≈ 365+).'],
    },
    confidence_score: 1.0, confidence_per_section: { age: 1, score: 1 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
