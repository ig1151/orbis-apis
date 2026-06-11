import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic monitoring-cadence scorer. From an observed change rate (or
// counts/window, or mean interval), business importance, and staleness
// tolerance, computes a recommended re-check interval (sample below the change
// interval, bounded by tolerance), a volatility band, and a monitoring-priority
// score. Pure arithmetic — no fetch, no LLM.

const router = Router();
const MIN_INTERVAL_HOURS = 0.25; // politeness floor — never poll faster than every 15 min

const IMPORTANCE_MAP: Record<string, number> = { low: 3, medium: 5, high: 8, critical: 10 };

export interface MonitorResult {
  change_rate_per_day: number; mean_change_interval_days: number; volatility: 'static' | 'low' | 'moderate' | 'high' | 'very_high';
  importance: number; staleness_tolerance_hours: number | null;
  recommended_check_interval_hours: number; recommended_checks_per_day: number; cadence_capped_by: 'change_rate' | 'staleness_tolerance' | 'politeness_floor';
  monitoring_priority_score: number; priority_band: 'low' | 'medium' | 'high' | 'urgent';
}

function volatility(rate: number): MonitorResult['volatility'] {
  if (rate < 0.01) return 'static';
  if (rate < 0.1) return 'low';
  if (rate < 1) return 'moderate';
  if (rate < 5) return 'high';
  return 'very_high';
}

export function scoreMonitoring(body: any): { error: string } | { result: MonitorResult } {
  // Resolve change rate.
  let change_rate_per_day: number | undefined;
  const meanIn = num(body?.mean_change_interval_days);
  const rateIn = num(body?.change_rate_per_day);
  const changes = num(body?.changes_observed);
  const window = num(body?.observation_window_days);
  if (rateIn !== undefined) { if (rateIn < 0) return { error: '"change_rate_per_day" must be 0 or greater.' }; change_rate_per_day = rateIn; }
  else if (meanIn !== undefined) { if (meanIn <= 0) return { error: '"mean_change_interval_days" must be positive.' }; change_rate_per_day = 1 / meanIn; }
  else if (changes !== undefined && window !== undefined) {
    if (window <= 0) return { error: '"observation_window_days" must be positive.' };
    if (changes < 0) return { error: '"changes_observed" must be 0 or greater.' };
    change_rate_per_day = changes / window;
  } else return { error: 'Provide "change_rate_per_day", or "mean_change_interval_days", or both "changes_observed" and "observation_window_days".' };

  const mean_change_interval_days = change_rate_per_day > 0 ? 1 / change_rate_per_day : Infinity;

  // Importance.
  let importance: number;
  const impRaw = body?.importance;
  if (typeof impRaw === 'string') { const mapped = IMPORTANCE_MAP[impRaw.toLowerCase()]; if (mapped === undefined) return { error: '"importance" string must be low/medium/high/critical, or a number 1–10.' }; importance = mapped; }
  else { importance = clamp(num(impRaw) ?? 5, 1, 10); }

  const staleness_tolerance_hours = num(body?.staleness_tolerance_hours);
  if (staleness_tolerance_hours !== undefined && staleness_tolerance_hours <= 0) return { error: '"staleness_tolerance_hours" must be positive.' };

  // Sample at half the change interval to catch changes promptly.
  const half_change_hours = mean_change_interval_days === Infinity ? Infinity : (mean_change_interval_days * 24) / 2;
  let interval = half_change_hours;
  let capped_by: MonitorResult['cadence_capped_by'] = 'change_rate';
  if (staleness_tolerance_hours !== undefined && staleness_tolerance_hours < interval) { interval = staleness_tolerance_hours; capped_by = 'staleness_tolerance'; }
  if (interval < MIN_INTERVAL_HOURS) { interval = MIN_INTERVAL_HOURS; capped_by = 'politeness_floor'; }
  if (interval === Infinity) interval = 720; // fully static → check monthly as a sanity baseline
  const recommended_check_interval_hours = round(interval, 2);
  const recommended_checks_per_day = round(24 / recommended_check_interval_hours, 3);

  // Priority: importance (60%) + volatility (40%).
  const vol = volatility(change_rate_per_day);
  const volScore = clamp(Math.min(change_rate_per_day, 5) / 5, 0, 1);
  const monitoring_priority_score = round((importance / 10) * 60 + volScore * 40, 1);
  const priority_band: MonitorResult['priority_band'] = monitoring_priority_score >= 75 ? 'urgent' : monitoring_priority_score >= 50 ? 'high' : monitoring_priority_score >= 25 ? 'medium' : 'low';

  return {
    result: {
      change_rate_per_day: round(change_rate_per_day, 4), mean_change_interval_days: mean_change_interval_days === Infinity ? -1 : round(mean_change_interval_days, 3),
      volatility: vol, importance, staleness_tolerance_hours: staleness_tolerance_hours ?? null,
      recommended_check_interval_hours, recommended_checks_per_day, cadence_capped_by: capped_by,
      monitoring_priority_score, priority_band,
    },
  };
}

function actions(r: MonitorResult): string[] {
  const out = [`Check every ${r.recommended_check_interval_hours}h (~${r.recommended_checks_per_day}×/day); volatility ${r.volatility}, priority ${r.priority_band} (${r.monitoring_priority_score}/100).`];
  if (r.cadence_capped_by === 'staleness_tolerance') out.push('Cadence is set by your staleness tolerance, not the change rate — loosen tolerance to poll less.');
  else if (r.cadence_capped_by === 'politeness_floor') out.push('Cadence hit the 15-minute politeness floor; consider webhooks/feeds instead of tight polling.');
  else out.push('Cadence samples below the observed change interval so changes are caught within one cycle.');
  if (r.volatility === 'static') out.push('Page rarely changes — a sparse monthly check (or an If-Modified-Since/ETag conditional request) is enough.');
  return out;
}

const CHAIN_TO = [
  { api: 'web-content-freshness-scorer', reason: 'Score the freshness of the content you fetch at each check.' },
  { api: 'web-content-diff-checker', reason: 'On each check, diff against the prior snapshot to confirm a real change.' },
  { api: 'website-change-monitor', reason: 'Operationalize this cadence as a scheduled monitor.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Scrape Monitoring Scorer API', version: '1.0.0',
    description: 'Deterministic monitoring-cadence scorer. From an observed change rate (or counts/window, or mean interval), importance, and staleness tolerance, returns a recommended re-check interval, a volatility band, and a monitoring-priority score. Pure arithmetic — no fetch, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/web-scrape-monitoring-scorer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/score', summary: 'Recommended cadence + volatility + priority score', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL cadence + reasoning + monitoring guidance', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/score', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/score', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = scoreMonitoring(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 1.0, confidence_per_section: { cadence: 1, priority: 1 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = scoreMonitoring(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Change rate ${v.change_rate_per_day}/day (${v.volatility}); cadence ${v.recommended_check_interval_hours}h capped by ${v.cadence_capped_by}; priority ${v.monitoring_priority_score}.`,
      key_factors: [`Mean change interval: ${v.mean_change_interval_days === -1 ? 'effectively never' : v.mean_change_interval_days + 'd'}.`, `Importance: ${v.importance}/10.`, `Capped by: ${v.cadence_capped_by}.`],
      invalidators: ['Recommendation assumes past change rate predicts future rate; bursty pages need adaptive polling.', 'Conditional requests (ETag/If-Modified-Since) or feeds beat polling for both freshness and politeness.', 'Importance is your business input, not an observed quantity.'],
    },
    confidence_score: 1.0, confidence_per_section: { cadence: 1, priority: 1 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
