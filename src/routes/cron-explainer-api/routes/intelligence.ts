import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';

// Deterministic 5-field cron parser, human-readable describer, and next-run
// computer (UTC). No LLM — pure parsing and date arithmetic, confidence 1.0.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const DOW_NAMES: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

const FIELD_NAMES = ['minute', 'hour', 'day_of_month', 'month', 'day_of_week'] as const;
type FieldKey = typeof FIELD_NAMES[number];
const RANGES: Record<FieldKey, [number, number]> = {
  minute: [0, 59], hour: [0, 23], day_of_month: [1, 31], month: [1, 12], day_of_week: [0, 7],
};

function nameToNum(token: string, names?: Record<string, number>): number {
  if (/^\d+$/.test(token)) return Number(token);
  if (names) {
    const v = names[token.toLowerCase().slice(0, 3)];
    if (v !== undefined) return v;
  }
  return NaN;
}

// Expand one field spec into a sorted set of allowed integers. Throws on invalid input.
function parseField(raw: string, min: number, max: number, names?: Record<string, number>): number[] {
  const set = new Set<number>();
  for (const part of raw.split(',')) {
    if (part === '') throw new Error(`empty term in "${raw}"`);
    let step = 1;
    let range = part;
    const slash = part.split('/');
    if (slash.length === 2) {
      range = slash[0];
      step = Number(slash[1]);
      if (!Number.isInteger(step) || step < 1) throw new Error(`invalid step "/${slash[1]}"`);
    } else if (slash.length > 2) {
      throw new Error(`invalid term "${part}"`);
    }
    let lo: number;
    let hi: number;
    if (range === '*') {
      lo = min; hi = max;
    } else if (range.includes('-')) {
      const [a, b] = range.split('-');
      lo = nameToNum(a, names); hi = nameToNum(b, names);
    } else {
      lo = nameToNum(range, names);
      hi = slash.length === 2 ? max : lo; // "5/10" => from 5 to max stepping 10
    }
    if (Number.isNaN(lo) || Number.isNaN(hi)) throw new Error(`unrecognized value in "${part}"`);
    if (lo < min || hi > max || lo > hi) throw new Error(`"${part}" out of range ${min}-${max}`);
    for (let i = lo; i <= hi; i += step) set.add(i);
  }
  return [...set].sort((a, b) => a - b);
}

interface Parsed {
  fields: Record<FieldKey, string>;
  sets: Record<FieldKey, number[]>;
  domRestricted: boolean;
  dowRestricted: boolean;
}

function parseCron(expr: string): Parsed {
  const tokens = expr.trim().split(/\s+/);
  if (tokens.length !== 5) throw new Error(`expected 5 fields, got ${tokens.length}`);
  const [minute, hour, dom, month, dow] = tokens;
  const sets = {
    minute: parseField(minute, 0, 59),
    hour: parseField(hour, 0, 23),
    day_of_month: parseField(dom, 1, 31),
    month: parseField(month, 1, 12, MONTH_NAMES),
    day_of_week: parseField(dow, 0, 7, DOW_NAMES),
  } as Record<FieldKey, number[]>;
  // Normalize day-of-week 7 -> 0 (both mean Sunday).
  sets.day_of_week = [...new Set(sets.day_of_week.map((d) => (d === 7 ? 0 : d)))].sort((a, b) => a - b);
  return {
    fields: { minute, hour, day_of_month: dom, month, day_of_week: dow },
    sets,
    domRestricted: dom !== '*',
    dowRestricted: dow !== '*',
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

function describe(p: Parsed, tzLabel = 'UTC'): string {
  const { fields, sets } = p;
  const parts: string[] = [];
  // time-of-day
  if (fields.minute === '*' && fields.hour === '*') parts.push('every minute');
  else if (fields.minute.startsWith('*/') && fields.hour === '*') parts.push(`every ${fields.minute.slice(2)} minutes`);
  else if (fields.hour === '*') parts.push(`at minute ${sets.minute.join(', ')} of every hour`);
  else if (fields.minute === '*') parts.push(`every minute of hour ${sets.hour.join(', ')}`);
  else if (sets.minute.length === 1 && sets.hour.length === 1) parts.push(`at ${pad(sets.hour[0])}:${pad(sets.minute[0])}`);
  else parts.push(`at minute(s) ${sets.minute.join(', ')} past hour(s) ${sets.hour.join(', ')}`);
  // calendar
  if (p.domRestricted) parts.push(`on day-of-month ${sets.day_of_month.join(', ')}`);
  if (fields.month !== '*') parts.push(`in ${sets.month.map((m) => MONTHS[m - 1]).join(', ')}`);
  if (p.dowRestricted) parts.push(`on ${sets.day_of_week.map((d) => DAYS[d]).join(', ')}`);
  const s = parts.join(', ');
  return s.charAt(0).toUpperCase() + s.slice(1) + ` (${tzLabel}).`;
}

const MAX_ITERS = 1_500_000; // ~2.8 years of minutes; safety bound for sparse schedules

// --- UTC fast path (default; pure getUTC* arithmetic) ---------------------
function matchesUtc(p: Parsed, d: Date): boolean {
  if (!p.sets.minute.includes(d.getUTCMinutes())) return false;
  if (!p.sets.hour.includes(d.getUTCHours())) return false;
  if (!p.sets.month.includes(d.getUTCMonth() + 1)) return false;
  const domHit = p.sets.day_of_month.includes(d.getUTCDate());
  const dowHit = p.sets.day_of_week.includes(d.getUTCDay());
  // Vixie cron: when both day fields are restricted, match on EITHER.
  if (p.domRestricted && p.dowRestricted) return domHit || dowHit;
  if (p.domRestricted) return domHit;
  if (p.dowRestricted) return dowHit;
  return true;
}

function nextRunsUtc(p: Parsed, fromMs: number, count: number): string[] {
  const out: string[] = [];
  let ms = Math.ceil(fromMs / 60000) * 60000 + 60000; // strictly after `from`, aligned to minute
  for (let i = 0; i < MAX_ITERS && out.length < count; i++, ms += 60000) {
    const d = new Date(ms);
    if (matchesUtc(p, d)) out.push(d.toISOString().replace(/\.\d{3}Z$/, 'Z'));
  }
  return out;
}

// --- Timezone-aware path (DST-correct via Intl, zero dependencies) --------
// We iterate UTC minutes and interpret each instant's WALL-CLOCK time in the
// target IANA zone, so DST transitions are handled by the ICU tz database:
// a skipped local minute (spring-forward) simply never matches; a repeated
// local minute (fall-back) matches at both real instants.
const fmtCache = new Map<string, Intl.DateTimeFormat>();
function getFmt(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZoneName: 'longOffset',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

export function isValidTimezone(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

interface WallClock { year: number; month: number; day: number; hour: number; minute: number; offset: string; }

function wallClock(ms: number, fmt: Intl.DateTimeFormat): WallClock {
  const parts = fmt.formatToParts(new Date(ms));
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? '';
  const raw = get('timeZoneName'); // "GMT-04:00", "GMT+05:30", or "GMT"/"UTC"
  let offset = 'Z';
  const m = raw.match(/GMT([+-]\d{2}):?(\d{2})?/);
  if (m) offset = `${m[1]}:${m[2] ?? '00'}`;
  let hour = Number(get('hour'));
  if (hour === 24) hour = 0; // h23 guard
  return { year: Number(get('year')), month: Number(get('month')), day: Number(get('day')), hour, minute: Number(get('minute')), offset };
}

function matchesWall(p: Parsed, wc: WallClock): boolean {
  if (!p.sets.minute.includes(wc.minute)) return false;
  if (!p.sets.hour.includes(wc.hour)) return false;
  if (!p.sets.month.includes(wc.month)) return false;
  const dow = new Date(Date.UTC(wc.year, wc.month - 1, wc.day)).getUTCDay(); // weekday of that calendar date
  const domHit = p.sets.day_of_month.includes(wc.day);
  const dowHit = p.sets.day_of_week.includes(dow);
  if (p.domRestricted && p.dowRestricted) return domHit || dowHit;
  if (p.domRestricted) return domHit;
  if (p.dowRestricted) return dowHit;
  return true;
}

function nextRuns(p: Parsed, fromMs: number, count: number, tz: string): string[] {
  if (tz === 'UTC') return nextRunsUtc(p, fromMs, count);
  const fmt = getFmt(tz);
  const out: string[] = [];
  let ms = Math.ceil(fromMs / 60000) * 60000 + 60000;
  for (let i = 0; i < MAX_ITERS && out.length < count; i++, ms += 60000) {
    const wc = wallClock(ms, fmt);
    if (matchesWall(p, wc)) {
      out.push(`${wc.year}-${pad(wc.month)}-${pad(wc.day)}T${pad(wc.hour)}:${pad(wc.minute)}:00${wc.offset}`);
    }
  }
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Cron Explainer API', version: '1.1.0',
    description: 'Deterministic 5-field cron parsing: human-readable description plus the next scheduled run times in any IANA timezone (DST-aware). Real parsing and date math — never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/cron-explainer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/explain', summary: 'Parse a cron expression into fields + a plain-English description', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: explain + next run times (any IANA timezone, DST-aware) + reasoning', price_usdc: 0.015 },
    ],
    pricing: [
      { path: '/explain', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

function readExpr(body: any): string | { error: string } {
  if (typeof body?.expression !== 'string' || !body.expression.trim()) return { error: '"expression" (a 5-field cron string) is required' };
  return body.expression;
}

router.post('/explain', (req: Request, res: Response) => {
  const t0 = Date.now();
  const expr = readExpr(req.body);
  if (typeof expr !== 'string') return fail(res, t0, 400, 'invalid_request', expr.error);
  let p: Parsed;
  try { p = parseCron(expr); } catch (e: any) { return fail(res, t0, 400, 'invalid_cron', `Invalid cron expression: ${e.message}`); }
  respond(res, t0, {
    expression: expr.trim(),
    fields: p.fields,
    description: describe(p),
    confidence_score: 1.0,
    recommended_actions_priority_order: [describe(p), 'Use /lookup to compute the next scheduled run times.'],
    chain_to: [],
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const expr = readExpr(req.body);
  if (typeof expr !== 'string') return fail(res, t0, 400, 'invalid_request', expr.error);
  let p: Parsed;
  try { p = parseCron(expr); } catch (e: any) { return fail(res, t0, 400, 'invalid_cron', `Invalid cron expression: ${e.message}`); }

  let fromMs = Date.now();
  if (req.body?.from !== undefined) {
    const parsedFrom = Date.parse(req.body.from);
    if (Number.isNaN(parsedFrom)) return fail(res, t0, 400, 'invalid_from', '"from" must be an ISO-8601 datetime');
    fromMs = parsedFrom;
  }
  let count = 5;
  if (req.body?.count !== undefined) {
    if (!Number.isInteger(req.body.count) || req.body.count < 1 || req.body.count > 20) return fail(res, t0, 400, 'invalid_count', '"count" must be an integer 1–20');
    count = req.body.count;
  }
  let tz = 'UTC';
  if (req.body?.timezone !== undefined) {
    if (typeof req.body.timezone !== 'string' || !isValidTimezone(req.body.timezone)) {
      return fail(res, t0, 400, 'invalid_timezone', '"timezone" must be a valid IANA timezone name, e.g. "America/New_York" or "UTC"');
    }
    tz = req.body.timezone;
  }
  const runs = nextRuns(p, fromMs, count, tz);
  const desc = describe(p, tz);
  respond(res, t0, {
    expression: expr.trim(),
    fields: p.fields,
    description: desc,
    next_runs: runs,
    next_runs_timezone: tz,
    next_run_count: runs.length,
    reasoning: {
      why_result_generated: `Parsed the cron expression and computed the next ${runs.length} matching minute(s) interpreted in ${tz} after the reference time.`,
      key_factors: [
        desc,
        p.domRestricted && p.dowRestricted ? 'day-of-month and day-of-week both set → matches on either (Vixie cron)' : 'standard day matching',
        tz === 'UTC' ? 'times in UTC' : `wall-clock times in ${tz}, DST-aware (returned with UTC offset)`,
      ],
      invalidators: ['Interpreting the schedule in a different timezone changes the absolute instants.', 'A schedule with no occurrence within ~2.8 years returns fewer runs.'],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: [desc, runs.length ? `Next run: ${runs[0]} (${tz}).` : 'No upcoming run found within the search horizon.'],
    chain_to: [],
    privacy: PRIVACY,
  });
});

export default router;
