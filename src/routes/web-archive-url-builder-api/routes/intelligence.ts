import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { str, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic web-archive URL builder. Constructs Wayback Machine,
// archive.today, and Google Cache URLs (snapshot, latest, save/submit, calendar,
// availability API) for a URL + optional timestamp, and normalizes the timestamp
// to Wayback's 14-digit form and ISO. Pure string math — no fetch, no LLM.

const router = Router();

function pad(n: number, w: number) { return String(n).padStart(w, '0'); }
function toWayback14(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1, 2)}${pad(d.getUTCDate(), 2)}${pad(d.getUTCHours(), 2)}${pad(d.getUTCMinutes(), 2)}${pad(d.getUTCSeconds(), 2)}`;
}

// Parse many timestamp shapes into a Date (UTC). Returns undefined if unparseable.
export function parseTs(input: string): Date | undefined {
  const s = input.trim();
  if (/^\d+$/.test(s)) {
    if (s.length === 14) { const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`); return Number.isNaN(d.getTime()) ? undefined : d; }
    if (s.length === 8) { const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`); return Number.isNaN(d.getTime()) ? undefined : d; }
    if (s.length === 13) return new Date(Number(s)); // epoch ms
    if (s.length === 10) return new Date(Number(s) * 1000); // epoch s
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? undefined : new Date(t);
}

function normalizeUrl(u: string): string | undefined {
  let s = u.trim();
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try { return new URL(s).toString(); } catch { return undefined; }
}

export const SERVICES = ['wayback', 'archive_today', 'google_cache', 'all'] as const;
export type Service = (typeof SERVICES)[number];

export interface BuildResult {
  normalized_url: string; service: Service;
  timestamp: { input: string; wayback_14: string; iso: string } | null;
  archives: Record<string, unknown>;
}

export function build(body: any): { error: string } | { result: BuildResult } {
  const raw = str(body?.url);
  if (raw === undefined) return { error: 'Provide "url" (the page to archive/retrieve).' };
  const url = normalizeUrl(raw);
  if (url === undefined) return { error: `"${raw}" is not a valid URL.` };
  const service = (str(body?.service)?.toLowerCase() ?? 'all') as Service;
  if (!SERVICES.includes(service)) return { error: `"service" must be one of: ${SERVICES.join(', ')}.` };

  const tsRaw = str(body?.timestamp ?? body?.date);
  let ts: { input: string; wayback_14: string; iso: string } | null = null;
  if (tsRaw !== undefined) {
    const d = parseTs(tsRaw);
    if (d === undefined) return { error: `"${tsRaw}" is not a parseable timestamp (ISO 8601, epoch seconds/ms, YYYYMMDD, or 14-digit Wayback).` };
    ts = { input: tsRaw, wayback_14: toWayback14(d), iso: d.toISOString() };
  }
  const enc = encodeURIComponent(url);
  const wb14 = ts?.wayback_14;

  const wayback = {
    snapshot_url: wb14 ? `https://web.archive.org/web/${wb14}/${url}` : null,
    latest_url: `https://web.archive.org/web/${url}`,
    save_url: `https://web.archive.org/save/${url}`,
    calendar_url: `https://web.archive.org/web/*/${url}`,
    availability_api: `https://archive.org/wayback/available?url=${enc}${wb14 ? `&timestamp=${wb14}` : ''}`,
  };
  const archive_today = {
    newest_url: `https://archive.ph/newest/${url}`,
    snapshot_list_url: `https://archive.ph/${url}`,
    submit_url: `https://archive.ph/?run=1&url=${enc}`,
  };
  const google_cache = {
    url: `https://webcache.googleusercontent.com/search?q=cache:${enc}`,
    deprecated: true,
    note: 'Google removed the public cache feature in 2024; this URL is best-effort and usually no longer resolves.',
  };

  const archives: Record<string, unknown> = {};
  if (service === 'wayback' || service === 'all') archives.wayback = wayback;
  if (service === 'archive_today' || service === 'all') archives.archive_today = archive_today;
  if (service === 'google_cache' || service === 'all') archives.google_cache = google_cache;

  return { result: { normalized_url: url, service, timestamp: ts, archives } };
}

function actions(r: BuildResult): string[] {
  const out: string[] = [];
  if (r.timestamp) out.push(`Built archive URLs for ${r.normalized_url} at ${r.timestamp.iso} (Wayback ${r.timestamp.wayback_14}).`);
  else out.push(`Built latest-snapshot archive URLs for ${r.normalized_url} (no timestamp → newest available).`);
  if ('wayback' in r.archives) out.push('Check Wayback availability_api first; if empty, POST save_url to capture a fresh snapshot.');
  if ('archive_today' in r.archives) out.push('archive.today preserves dynamic/JS pages better than Wayback; use submit_url to capture.');
  return out;
}

const CHAIN_TO = [
  { api: 'web-content-type-classifier', reason: 'Confirm the URL is a webpage before archiving it.' },
  { api: 'web-content-freshness-scorer', reason: 'Once retrieved, score how fresh the archived snapshot is.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Archive URL Builder API', version: '1.0.0',
    description: 'Deterministic web-archive URL builder. Constructs Wayback Machine, archive.today, and Google Cache URLs (snapshot, latest, save/submit, calendar, availability API) for a URL + optional timestamp, and normalizes the timestamp to Wayback 14-digit + ISO. Pure string math — no fetch, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/web-archive-url-builder/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/build', summary: 'Build archive URLs + normalized timestamp', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL archive URLs + reasoning + retrieval tips', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/build', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/build', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = build(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 1.0, confidence_per_section: { url_construction: 1, timestamp_parsing: 1 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = build(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Normalized the URL and built ${Object.keys(v.archives).length} archive service URL set(s)${v.timestamp ? ` for timestamp ${v.timestamp.wayback_14}` : ' (latest)'}.`,
      key_factors: [`Service: ${v.service}.`, `Timestamp supplied: ${v.timestamp ? 'yes' : 'no'}.`, `Normalized URL: ${v.normalized_url}.`],
      invalidators: ['URLs are constructed, not verified — a snapshot may not exist at the requested time.', 'Google Cache is deprecated and usually 404s.', 'Wayback matches the nearest available capture, which can differ from the exact requested timestamp.'],
    },
    confidence_score: 1.0, confidence_per_section: { url_construction: 1, timestamp_parsing: 1 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
