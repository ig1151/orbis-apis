import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic duration ⇄ text converter. /humanize turns a millisecond count into a
// human-readable string and a structured breakdown; /parse turns a duration string
// ("1h 30m", "90s", "1.5d") back into milliseconds. Uses fixed, unambiguous units only
// (weeks/days/hours/minutes/seconds/ms — no calendar months/years). No LLM, nothing stored.

const router = Router();

const MAX_ABS_MS = 1e15;           // ~31,700 years — well inside safe integer range
const MAX_TEXT_LEN = 200;
const MAX_UNITS = 6;

interface Unit { key: string; long: string; ms: number }
const UNITS: Unit[] = [
  { key: 'w', long: 'week', ms: 604800000 },
  { key: 'd', long: 'day', ms: 86400000 },
  { key: 'h', long: 'hour', ms: 3600000 },
  { key: 'm', long: 'minute', ms: 60000 },
  { key: 's', long: 'second', ms: 1000 },
  { key: 'ms', long: 'millisecond', ms: 1 },
];

// Synonyms accepted by /parse. "m" → minute, "ms" → millisecond (checked first).
const TOKEN_UNITS: Array<{ re: string; ms: number }> = [
  { re: 'weeks|week|wks|wk|w', ms: 604800000 },
  { re: 'days|day|d', ms: 86400000 },
  { re: 'hours|hour|hrs|hr|h', ms: 3600000 },
  { re: 'minutes|minute|mins|min|m', ms: 60000 },
  { re: 'milliseconds|millisecond|millis|msecs|msec|ms', ms: 1 },
  { re: 'seconds|second|secs|sec|s', ms: 1000 },
];

export interface Part { unit: string; long: string; value: number }
export interface HumanizeCore { milliseconds: number; negative: boolean; humanized: string; compact: string; parts: Part[]; largest_unit: string | null }

function humanize(ms: number, maxUnits: number): HumanizeCore {
  const negative = ms < 0;
  let rem = Math.abs(ms);
  const parts: Part[] = [];
  for (const u of UNITS) {
    const v = Math.floor(rem / u.ms);
    if (v > 0) { parts.push({ unit: u.key, long: u.long, value: v }); rem -= v * u.ms; }
  }
  const limited = parts.length === 0 ? [{ unit: 'ms', long: 'millisecond', value: 0 }] : parts.slice(0, maxUnits);
  const sign = negative ? '-' : '';
  const compact = sign + limited.map((p) => `${p.value}${p.unit}`).join(' ');
  const humanized = sign + limited.map((p) => `${p.value} ${p.long}${p.value === 1 ? '' : 's'}`).join(' ');
  return { milliseconds: ms, negative, humanized, compact, parts: limited, largest_unit: limited[0]?.unit ?? null };
}

function parseDuration(text: string): { error: string } | { milliseconds: number; negative: boolean; parts: Part[] } {
  const trimmed = text.trim();
  if (trimmed === '') return { error: '"text" must be a non-empty duration string.' };
  let body = trimmed;
  let negative = false;
  if (body.startsWith('-')) { negative = true; body = body.slice(1).trim(); }
  // Bare number → milliseconds.
  if (/^[0-9]*\.?[0-9]+$/.test(body)) {
    const ms = Number(body);
    return { milliseconds: negative ? -ms : ms, negative, parts: [{ unit: 'ms', long: 'millisecond', value: ms }] };
  }
  const tokenRe = new RegExp(`([0-9]*\\.?[0-9]+)\\s*(${TOKEN_UNITS.map((t) => t.re).join('|')})`, 'gi');
  const parts: Part[] = [];
  let total = 0;
  let consumed = 0;
  let mtch: RegExpExecArray | null;
  while ((mtch = tokenRe.exec(body)) !== null) {
    const value = Number(mtch[1]);
    const unitStr = mtch[2].toLowerCase();
    const def = TOKEN_UNITS.find((t) => new RegExp(`^(?:${t.re})$`, 'i').test(unitStr))!;
    const u = UNITS.find((x) => x.ms === def.ms)!;
    total += value * def.ms;
    parts.push({ unit: u.key, long: u.long, value });
    consumed += mtch[0].length;
  }
  if (parts.length === 0) return { error: 'No recognizable duration tokens found (e.g. "1h 30m", "90s", "1.5d").' };
  // Reject stray non-separator characters that were not part of any token.
  const stripped = body.replace(tokenRe, '').replace(/[\s,]+/g, '');
  if (stripped !== '') return { error: `Unrecognized token(s) in duration: "${stripped}".` };
  void consumed;
  return { milliseconds: negative ? -total : total, negative, parts };
}

function readMs(raw: unknown): { error: string } | { ms: number } {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return { error: '"milliseconds" must be a finite number.' };
  if (!Number.isInteger(raw)) return { error: '"milliseconds" must be an integer.' };
  if (Math.abs(raw) > MAX_ABS_MS) return { error: `"milliseconds" magnitude exceeds the ${MAX_ABS_MS} limit.` };
  return { ms: raw };
}

function readMaxUnits(raw: unknown): { error: string } | { maxUnits: number } {
  if (raw === undefined) return { maxUnits: MAX_UNITS };
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > MAX_UNITS) return { error: `"max_units" must be an integer between 1 and ${MAX_UNITS}.` };
  return { maxUnits: raw };
}

const CHAIN_TO = [
  { api: 'table-formatter', reason: 'Render multiple humanized durations as a table for reporting.' },
];
const INVALIDATORS = [
  'Units are fixed, calendar-independent: 1w=7d, 1d=24h, 1h=60m, 1m=60s, 1s=1000ms. Calendar months and years are deliberately NOT supported (their length varies), so a "month"/"year" token is rejected by /parse.',
  'In /parse, "m" means minutes and "ms" means milliseconds (matched before "m"). /humanize emits integer values per unit; any sub-millisecond remainder is impossible because input must be an integer count of milliseconds.',
  '/humanize truncates (floor) per unit and stops after max_units components; it does not round the dropped remainder into the last shown unit.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

export const DISCOVERY = {
  name: 'Duration Humanizer API', version: '1.0.0',
  description: 'Deterministic duration ⇄ text converter. /humanize turns a millisecond count into a human-readable string + structured breakdown; /parse turns a duration string ("1h 30m", "90s", "1.5d") into milliseconds. Fixed unambiguous units (w/d/h/m/s/ms). No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/duration-humanizer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['humanize_duration', 'parse_duration', 'duration_breakdown', 'compact_and_long_form'],
  typical_use_cases: [
    'Render a millisecond duration as a human-readable string for logs, alerts or UI',
    'Parse a human duration like "1d 2h 3m" into milliseconds for scheduling or timeouts',
    'Normalize mixed duration inputs into a canonical compact form',
  ],
  input_examples: [
    { endpoint: '/humanize', body: { milliseconds: 93784000 } },
    { endpoint: '/parse', body: { text: '1d 2h 3m 4s' } },
  ],
  output_examples: [
    { endpoint: '/humanize', response: { milliseconds: 93784000, humanized: '1 day 2 hours 3 minutes 4 seconds', compact: '1d 2h 3m 4s' } },
    { endpoint: '/parse', response: { milliseconds: 93784000 } },
  ],
  endpoints: [
    { method: 'POST', path: '/humanize', summary: 'Milliseconds → human-readable duration', price_usdc: 0.004 },
    { method: 'POST', path: '/parse', summary: 'Duration string → milliseconds', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL humanize + reasoning', price_usdc: 0.009 },
  ],
  pricing: [
    { path: '/humanize', price_usdc: 0.004, currency: 'USDC' },
    { path: '/parse', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/humanize', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "milliseconds" integer.');
  const m = readMs(b.milliseconds);
  if ('error' in m) return fail(res, t0, 400, 'invalid_request', m.error);
  const mu = readMaxUnits(b.max_units);
  if ('error' in mu) return fail(res, t0, 400, 'invalid_request', mu.error);
  const core = humanize(m.ms, mu.maxUnits);
  respond(res, t0, { ...core, ...TAIL({ conversion: 1 }, [`Humanized ${core.milliseconds} ms as "${core.humanized}".`]) });
});

router.post('/parse', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "text" string.');
  if (typeof b.text !== 'string') return fail(res, t0, 400, 'invalid_request', '"text" must be a string.');
  if (b.text.length > MAX_TEXT_LEN) return fail(res, t0, 400, 'invalid_request', `"text" exceeds the ${MAX_TEXT_LEN}-character limit.`);
  const p = parseDuration(b.text);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  respond(res, t0, { input: b.text, milliseconds: p.milliseconds, negative: p.negative, parts: p.parts, ...TAIL({ conversion: 1 }, [`Parsed "${b.text}" as ${p.milliseconds} ms.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "milliseconds" integer.');
  const m = readMs(b.milliseconds);
  if ('error' in m) return fail(res, t0, 400, 'invalid_request', m.error);
  const mu = readMaxUnits(b.max_units);
  if ('error' in mu) return fail(res, t0, 400, 'invalid_request', mu.error);
  const core = humanize(m.ms, mu.maxUnits);
  respond(res, t0, {
    ...core,
    reasoning: {
      why_result_generated: `Decomposed ${core.milliseconds} ms greedily into ${core.parts.length} unit(s) (largest = ${core.largest_unit}), yielding "${core.humanized}".`,
      key_factors: [`Milliseconds: ${core.milliseconds}.`, `Parts: ${core.parts.map((p) => `${p.value}${p.unit}`).join(' ')}.`, `Max units: ${mu.maxUnits}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ conversion: 1 }, [`Humanized ${core.milliseconds} ms as "${core.humanized}".`]),
  });
});

export default router;
