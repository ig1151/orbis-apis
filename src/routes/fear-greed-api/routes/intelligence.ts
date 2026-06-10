import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// ---- real source: alternative.me Crypto Fear & Greed Index (free, no key) ----
const FNG_URL = 'https://api.alternative.me/fng/';
const DISCLAIMER = 'For informational purposes only. Not financial advice.';

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

interface FngPoint { value: number; label: string; date: string; ts: number; }

// Fetch `limit` most-recent index points (index 0 = today). 12s timeout + 1 retry; never hangs.
async function fetchFng(limit: number, attempt = 0): Promise<FngPoint[]> {
  try {
    const res = await axios.get(FNG_URL, { params: { limit }, timeout: 12000 });
    const rows = Array.isArray(res.data?.data) ? res.data.data : [];
    return rows.map((r: any) => ({
      value: Number(r.value),
      label: String(r.value_classification || ''),
      ts: Number(r.timestamp) * 1000,
      date: new Date(Number(r.timestamp) * 1000).toISOString().slice(0, 10),
    })).filter((p: FngPoint) => Number.isFinite(p.value));
  } catch (e) {
    if (attempt < 1) { await new Promise(r => setTimeout(r, 500)); return fetchFng(limit, attempt + 1); }
    throw e;
  }
}

// Only crypto is available from this source — refuse other assets instead of fabricating.
function assetSupported(asset: string): boolean {
  return /^(crypto|cryptocurrency|btc|bitcoin|digital[\s_-]?asset)s?$/i.test(asset.trim());
}

// Deterministic contrarian signal from the index value (an interpretation of real data, not a guarantee).
function signalFor(value: number): string {
  if (value <= 24) return 'buy';        // Extreme Fear → contrarian accumulation watch
  if (value <= 44) return 'neutral';    // Fear
  if (value <= 74) return 'neutral';    // Greed
  return 'sell';                        // Extreme Greed → contrarian distribution watch
}

function trendOf(curr: number, prev?: number): 'improving' | 'deteriorating' | 'stable' {
  if (prev == null) return 'stable';
  if (curr > prev) return 'improving';
  if (curr < prev) return 'deteriorating';
  return 'stable';
}

function unavailable(res: Response, asset: string, reason: string, started: number) {
  return res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: false,
    asset, error: 'data_unavailable', message: reason, retryable: true,
    source_provenance: { provider: 'alternative.me', retrieved_at: new Date().toISOString(), freshness_score: 0 },
    cache_ttl_seconds: 0, cache_recommended: false, automation_safe: true,
    latency_ms: Date.now() - started, privacy: { data_stored: false, retention: 'none' },
  });
}

const NO_DRIVERS_NOTE = 'Component driver breakdown is not published by the source (alternative.me); returned empty rather than estimated.';

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Fear & Greed Index API', openapi: '/fear-greed/openapi.json', health: 'ok' });
});

// POST /current — real current crypto Fear & Greed reading + deltas from real history
router.post('/current', async (req: Request, res: Response) => {
  const started = Date.now();
  const { asset = 'crypto' } = req.body || {};
  if (!assetSupported(asset)) return unavailable(res, asset, `Only the crypto Fear & Greed Index (alternative.me) is available; "${asset}" is not supported by this source.`, started);
  try {
    const pts = await fetchFng(31);
    if (!pts.length) return unavailable(res, asset, 'Source returned no data.', started);
    const cur = pts[0];
    const prevDay = pts[1]?.value ?? null;
    const prevWeek = pts[7]?.value ?? null;
    const prevMonth = pts[30]?.value ?? null;
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      asset: 'crypto',
      index: {
        value: cur.value,
        label: cur.label,
        previous_day: prevDay,
        previous_week: prevWeek,
        previous_month: prevMonth,
        change_24h: prevDay != null ? cur.value - prevDay : null,
        trend: trendOf(cur.value, prevDay ?? undefined),
        as_of: cur.date,
      },
      drivers: [],
      data_notes: [NO_DRIVERS_NOTE],
      market_context: `Crypto market sentiment is "${cur.label}" at ${cur.value}/100${prevDay != null ? ` (${cur.value - prevDay >= 0 ? '+' : ''}${cur.value - prevDay} vs 24h ago)` : ''}.`,
      signal: signalFor(cur.value),
      financial_disclaimer: DISCLAIMER,
      paper_mode_recommended: true,
      confidence_per_section: { index: 1 },
      recommended_actions_priority_order: ['use as macro sentiment filter', 'combine with on-chain signals', 'avoid trading extremes without confirmation'],
      source_provenance: { provider: 'alternative.me', retrieved_at: new Date().toISOString(), freshness_score: 1 },
      cache_ttl_seconds: 3600, cache_recommended: true, automation_safe: true,
      latency_ms: Date.now() - started, privacy: { data_stored: false, retention: 'none' },
    });
  } catch { return unavailable(res, asset, 'Fear & Greed source (alternative.me) is temporarily unavailable.', started); }
});

// POST /history — real index history + deterministic summary
router.post('/history', async (req: Request, res: Response) => {
  const started = Date.now();
  const { days = 30, asset = 'crypto' } = req.body || {};
  if (!assetSupported(asset)) return unavailable(res, asset, `Only the crypto Fear & Greed Index (alternative.me) is available; "${asset}" is not supported.`, started);
  const n = Math.max(2, Math.min(365, parseInt(String(days), 10) || 30));
  try {
    const pts = await fetchFng(n);
    if (!pts.length) return unavailable(res, asset, 'Source returned no data.', started);
    const values = pts.map(p => p.value);
    const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
    const daysInFear = values.filter(v => v < 50).length;
    const daysInGreed = values.filter(v => v >= 50).length;
    // current streak: consecutive most-recent days on the same fear/greed side
    const side = (v: number) => (v < 50 ? 'Fear' : 'Greed');
    let streak = 1;
    for (let i = 1; i < pts.length && side(pts[i].value) === side(pts[0].value); i++) streak++;
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      asset: 'crypto', period_days: pts.length,
      history: pts.map(p => ({ date: p.date, value: p.value, label: p.label })),
      summary: {
        avg_value: avg,
        avg_label: pts.find(p => Math.abs(p.value - avg) <= 5)?.label || (avg < 50 ? 'Fear' : 'Greed'),
        days_in_fear: daysInFear,
        days_in_greed: daysInGreed,
        min_value: Math.min(...values),
        max_value: Math.max(...values),
        current_streak: `${streak} day${streak === 1 ? '' : 's'} of ${side(pts[0].value)}`,
      },
      confidence_per_section: { history: 1, summary: 1 },
      recommended_actions_priority_order: ['identify market cycle phase', 'compare extremes vs price action', 'use streaks for contrarian signals'],
      source_provenance: { provider: 'alternative.me', retrieved_at: new Date().toISOString(), freshness_score: 1 },
      cache_ttl_seconds: 3600, cache_recommended: true, automation_safe: true,
      latency_ms: Date.now() - started, privacy: { data_stored: false, retention: 'none' },
    });
  } catch { return unavailable(res, asset, 'Fear & Greed source (alternative.me) is temporarily unavailable.', started); }
});

// POST /lookup — ONE-CALL: real current reading + 30d summary + signal
router.post('/lookup', async (req: Request, res: Response) => {
  const started = Date.now();
  const { asset = 'crypto' } = req.body || {};
  if (!assetSupported(asset)) return unavailable(res, asset, `Only the crypto Fear & Greed Index (alternative.me) is available; "${asset}" is not supported.`, started);
  try {
    const pts = await fetchFng(31);
    if (!pts.length) return unavailable(res, asset, 'Source returned no data.', started);
    const cur = pts[0];
    const prevDay = pts[1]?.value ?? null;
    const prevWeek = pts[7]?.value ?? null;
    const window = pts.slice(0, 30).map(p => p.value);
    const side = (v: number) => (v < 50 ? 'Fear' : 'Greed');
    let streak = 1;
    for (let i = 1; i < pts.length && side(pts[i].value) === side(pts[0].value); i++) streak++;
    res.json({
      trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
      asset: 'crypto',
      index: { value: cur.value, label: cur.label, previous_day: prevDay, previous_week: prevWeek, trend: trendOf(cur.value, prevDay ?? undefined), as_of: cur.date },
      drivers: [],
      data_notes: [NO_DRIVERS_NOTE],
      '30d_summary': {
        avg_value: Math.round(window.reduce((s, v) => s + v, 0) / window.length),
        days_in_fear: window.filter(v => v < 50).length,
        days_in_greed: window.filter(v => v >= 50).length,
        current_streak: `${streak} day${streak === 1 ? '' : 's'} of ${side(cur.value)}`,
      },
      market_context: `Crypto market sentiment is "${cur.label}" at ${cur.value}/100.`,
      signal: signalFor(cur.value),
      contrarian_opportunity: cur.value <= 24 || cur.value >= 75,
      financial_disclaimer: DISCLAIMER,
      paper_mode_recommended: true,
      confidence_per_section: { index: 1, summary: 1 },
      recommended_actions_priority_order: ['use as macro filter before any trade', 'extreme fear = watch for reversal', 'extreme greed = tighten stops'],
      source_provenance: { provider: 'alternative.me', retrieved_at: new Date().toISOString(), freshness_score: 1 },
      cache_ttl_seconds: 3600, cache_recommended: true, automation_safe: true,
      latency_ms: Date.now() - started, privacy: { data_stored: false, retention: 'none' },
    });
  } catch { return unavailable(res, asset, 'Fear & Greed source (alternative.me) is temporarily unavailable.', started); }
});

export default router;
