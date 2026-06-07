import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

// Inputs are ABSOLUTE instants (ISO 8601 with Z or numeric offset, or epoch ms).
// We never infer an instant from a naive local time, so all output is exact.
function parseInstant(v: unknown): Date | null {
  if (typeof v === 'number' && Number.isFinite(v)) { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v !== 'string') return null;
  if (!/Z$|[+-]\d{2}:?\d{2}$/.test(v.trim())) return null; // must carry an explicit offset
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function tzValid(tz: unknown): tz is string {
  if (typeof tz !== 'string') return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}
function offsetLabel(min: number): string {
  const sign = min >= 0 ? '+' : '-'; const a = Math.abs(min);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
function inZone(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const m: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) m[p.type] = p.value;
  const hh = m.hour === '24' ? '00' : m.hour;
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +hh, +m.minute, +m.second);
  const offsetMin = Math.round((asUTC - date.getTime()) / 60000);
  let abbr = '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(date);
    abbr = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch { /* ignore */ }
  return {
    timezone: tz,
    local_time: `${m.year}-${m.month}-${m.day}T${hh}:${m.minute}:${m.second}`,
    offset_minutes: offsetMin,
    offset_label: offsetLabel(offsetMin),
    abbreviation: abbr,
  };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Timezone Offset Harmonizer API', version: '1.0.0',
    description: 'Deterministic timezone conversion from absolute instants using the IANA/ICU database: normalize to UTC and express wall-clock time + offset in any zone. Real tz data — confidence 1.0.',
    openapi_url: 'https://orbis-apis.onrender.com/timezone-harmonizer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    notes: 'Inputs must be absolute instants (ISO 8601 with Z/offset, or epoch ms). Naive local times are rejected to guarantee correctness.',
    endpoints: [
      { method: 'POST', path: '/normalize', summary: 'Normalize an absolute instant to UTC + epoch', price_usdc: 0.001 },
      { method: 'POST', path: '/convert', summary: 'Express an instant in a target timezone (wall-clock + offset)', price_usdc: 0.002 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: UTC + many target zones + meeting-friendly view', price_usdc: 0.003 },
    ],
    pricing: [
      { path: '/normalize', price_usdc: 0.001, currency: 'USDC' },
      { path: '/convert', price_usdc: 0.002, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.003, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/normalize', (req: Request, res: Response) => {
  const t0 = Date.now();
  const d = parseInstant(req.body?.datetime);
  if (!d) return fail(res, t0, 400, 'invalid_datetime', '"datetime" must be an absolute instant (ISO 8601 with Z/offset, or epoch ms).');
  respond(res, t0, {
    input: { datetime: req.body.datetime },
    utc_iso: d.toISOString(), epoch_ms: d.getTime(),
    confidence_score: 1.0,
    recommended_actions_priority_order: ['Store as UTC/epoch; convert to local only for display.'],
    chain_to: [],
    privacy: PRIVACY,
  });
});

router.post('/convert', (req: Request, res: Response) => {
  const t0 = Date.now();
  const d = parseInstant(req.body?.datetime);
  if (!d) return fail(res, t0, 400, 'invalid_datetime', '"datetime" must be an absolute instant (ISO with Z/offset, or epoch ms).');
  if (!tzValid(req.body?.to_tz)) return fail(res, t0, 400, 'invalid_timezone', '"to_tz" must be a valid IANA timezone, e.g. "America/Los_Angeles".');
  respond(res, t0, {
    input: { datetime: req.body.datetime, to_tz: req.body.to_tz },
    utc_iso: d.toISOString(),
    converted: inZone(d, req.body.to_tz),
    confidence_score: 1.0,
    recommended_actions_priority_order: [`Local wall-clock in ${req.body.to_tz} is ${inZone(d, req.body.to_tz).local_time} (${inZone(d, req.body.to_tz).offset_label}).`],
    chain_to: [],
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const d = parseInstant(req.body?.datetime);
  if (!d) return fail(res, t0, 400, 'invalid_datetime', '"datetime" must be an absolute instant (ISO with Z/offset, or epoch ms).');
  const zones = req.body?.to_tzs;
  if (!Array.isArray(zones) || zones.length === 0 || zones.length > 25)
    return fail(res, t0, 400, 'invalid_timezones', '"to_tzs" must be an array of 1–25 IANA timezones.');
  const bad = zones.find((z: unknown) => !tzValid(z));
  if (bad !== undefined) return fail(res, t0, 400, 'invalid_timezone', `"${String(bad)}" is not a valid IANA timezone.`);
  const converted = zones.map((z: string) => inZone(d, z));
  respond(res, t0, {
    input: { datetime: req.body.datetime, to_tzs: zones },
    utc_iso: d.toISOString(), epoch_ms: d.getTime(),
    zones: converted,
    reasoning: {
      why_result_generated: 'Each zone\'s wall-clock and UTC offset is derived from the IANA/ICU timezone database at the given absolute instant (DST-correct).',
      key_factors: [`instant ${d.toISOString()}`, `${converted.length} target zone(s)`],
      invalidators: ['Input lacks an explicit offset (naive local time is rejected).', 'A requested timezone id is not in the IANA database.'],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      'Compare offset_label across zones to find overlapping working hours.',
      'Use abbreviation (e.g. PST vs PDT) to communicate the active DST state.',
    ],
    chain_to: [],
    privacy: PRIVACY,
  });
});

export default router;
