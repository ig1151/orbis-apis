import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';

// Deterministic unit conversion — real arithmetic with exact SI factors.
// Replaces the prior LLM-backed implementation (which let a language model
// guess conversions). Confidence is always 1.0 because nothing is estimated.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const MAX_BATCH = 100;

// factor = how many BASE units one of this unit equals. Base unit per category is factor 1.
const CATEGORIES: Record<string, Record<string, number>> = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, um: 1e-6, nm: 1e-9, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, nmi: 1852 },
  mass: { g: 1, kg: 1000, mg: 0.001, t: 1e6, lb: 453.59237, oz: 28.349523125, st: 6350.29318 },
  volume: { l: 1, ml: 0.001, m3: 1000, cm3: 0.001, gal: 3.785411784, qt: 0.946352946, pt: 0.473176473, cup: 0.2365882365, floz: 0.0295735295625 },
  area: { m2: 1, km2: 1e6, cm2: 0.0001, ha: 10000, acre: 4046.8564224, ft2: 0.09290304, mi2: 2589988.110336 },
  speed: { mps: 1, kph: 1 / 3.6, mph: 0.44704, fps: 0.3048, knot: 1852 / 3600 },
  time: { s: 1, ms: 0.001, min: 60, h: 3600, day: 86400, week: 604800 },
  data: { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824, TiB: 1099511627776, bit: 0.125 },
};

const TEMP_UNITS = ['C', 'F', 'K'] as const;
type Temp = typeof TEMP_UNITS[number];

const INDEX: Record<string, { category: string }> = {};
for (const [cat, units] of Object.entries(CATEGORIES)) {
  for (const unit of Object.keys(units)) INDEX[unit] = { category: cat };
}

// Static catalog of every supported unit symbol per category (temperature is
// handled separately from the factor table, so it's appended here).
const CATALOG: Record<string, string[]> = {
  ...Object.fromEntries(Object.entries(CATEGORIES).map(([cat, units]) => [cat, Object.keys(units)])),
  temperature: [...TEMP_UNITS],
};
const TOTAL_UNITS = Object.values(CATALOG).reduce((n, arr) => n + arr.length, 0);

function tempToC(v: number, from: Temp): number {
  return from === 'C' ? v : from === 'F' ? (v - 32) * 5 / 9 : v - 273.15;
}
function tempFromC(v: number, to: Temp): number {
  return to === 'C' ? v : to === 'F' ? v * 9 / 5 + 32 : v + 273.15;
}

// Trim float noise without lying about precision: 12 significant digits.
function clean(n: number): number {
  return Number.isFinite(n) ? Number(n.toPrecision(12)) : n;
}

interface ConvOk { value: number; from: string; to: string; result: number; category: string; }

function convert(value: number, from: string, to: string): ConvOk | { error: string } {
  const isTempFrom = (TEMP_UNITS as readonly string[]).includes(from);
  const isTempTo = (TEMP_UNITS as readonly string[]).includes(to);
  if (isTempFrom || isTempTo) {
    if (!isTempFrom || !isTempTo) return { error: 'temperature units (C, F, K) only convert to other temperature units' };
    return { value, from, to, result: clean(tempFromC(tempToC(value, from as Temp), to as Temp)), category: 'temperature' };
  }
  const f = INDEX[from];
  const t = INDEX[to];
  if (!f) return { error: `unknown unit "${from}"` };
  if (!t) return { error: `unknown unit "${to}"` };
  if (f.category !== t.category) return { error: `cannot convert ${f.category} (${from}) to ${t.category} (${to})` };
  const units = CATEGORIES[f.category];
  return { value, from, to, result: clean((value * units[from]) / units[to]), category: f.category };
}

// Accepts both the A+ field names (from/to) and the legacy ones (from_unit/to_unit).
function readPair(o: any): { value: number; from: string; to: string } | string {
  const from = o?.from ?? o?.from_unit;
  const to = o?.to ?? o?.to_unit;
  if (typeof o?.value !== 'number' || !Number.isFinite(o.value)) return '"value" must be a finite number';
  if (typeof from !== 'string' || !from) return '"from" (or "from_unit") is required';
  if (typeof to !== 'string' || !to) return '"to" (or "to_unit") is required';
  return { value: o.value, from, to };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Unit Conversion API', version: '2.1.0',
    description: 'Deterministic measurement conversion across length, mass, volume, area, speed, time, digital data, and temperature. Exact SI factors computed in real code — confidence always 1.0, never estimated.',
    openapi_url: 'https://orbis-apis.onrender.com/unit-conversion/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'GET', path: '/supported-units', summary: 'List every supported unit symbol per category', price_usdc: 0 },
      { method: 'POST', path: '/convert', summary: 'Convert a value between two units of the same category', price_usdc: 0.005 },
      { method: 'POST', path: '/batch', summary: 'Convert up to 100 value/unit pairs in one call', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: convert + all sibling-unit equivalents + reasoning', price_usdc: 0.015 },
    ],
    pricing: [
      { path: '/supported-units', price_usdc: 0, currency: 'USDC' },
      { path: '/convert', price_usdc: 0.005, currency: 'USDC' },
      { path: '/batch', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.get('/supported-units', (_req: Request, res: Response) => {
  const t0 = Date.now();
  respond(res, t0, {
    categories: CATALOG,
    total_units: TOTAL_UNITS,
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      `${TOTAL_UNITS} unit symbols across ${Object.keys(CATALOG).length} categories.`,
      'Pass any two symbols from the same category to /convert.',
    ],
    chain_to: [{ api: 'unit-conversion', reason: 'Convert between any two of these units via /convert.' }],
    privacy: PRIVACY,
  });
});

router.post('/convert', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = readPair(req.body);
  if (typeof p === 'string') return fail(res, t0, 400, 'invalid_request', p);
  const r = convert(p.value, p.from, p.to);
  if ('error' in r) return fail(res, t0, 400, 'invalid_conversion', r.error);
  respond(res, t0, {
    ...r,
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      `${r.value} ${r.from} = ${r.result} ${r.to}.`,
      'Use /lookup for the same value expressed in every unit of this category.',
    ],
    chain_to: [],
    privacy: PRIVACY,
  });
});

router.post('/batch', (req: Request, res: Response) => {
  const t0 = Date.now();
  const list = req.body?.conversions;
  if (!Array.isArray(list) || list.length === 0) return fail(res, t0, 400, 'invalid_request', '"conversions" must be a non-empty array');
  if (list.length > MAX_BATCH) return fail(res, t0, 400, 'too_many', `"conversions" may contain at most ${MAX_BATCH} items`);
  const results = list.map((item) => {
    const p = readPair(item);
    if (typeof p === 'string') return { success: false, error: p };
    const r = convert(p.value, p.from, p.to);
    if ('error' in r) return { success: false, error: r.error };
    return { success: true, ...r };
  });
  const successful = results.filter((r) => r.success).length;
  respond(res, t0, {
    results,
    total: results.length,
    successful,
    failed: results.length - successful,
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      `${successful}/${results.length} conversions succeeded.`,
      results.length === successful ? 'All pairs converted exactly.' : 'Inspect failed items for unknown or mismatched units.',
    ],
    chain_to: [],
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = readPair(req.body);
  if (typeof p === 'string') return fail(res, t0, 400, 'invalid_request', p);
  const r = convert(p.value, p.from, p.to);
  if ('error' in r) return fail(res, t0, 400, 'invalid_conversion', r.error);

  const equivalents: Record<string, number> = {};
  if (r.category === 'temperature') {
    for (const u of TEMP_UNITS) equivalents[u] = clean(tempFromC(tempToC(p.value, p.from as Temp), u));
  } else {
    const units = CATEGORIES[r.category];
    for (const u of Object.keys(units)) equivalents[u] = clean((p.value * units[p.from]) / units[u]);
  }

  respond(res, t0, {
    ...r,
    equivalents,
    reasoning: {
      why_result_generated: `Converted ${r.value} ${r.from} to ${r.to} using exact ${r.category} factors.`,
      key_factors: [`category: ${r.category}`, `${r.from} and ${r.to} share the same dimension`, 'exact conversion factors (no estimation)'],
      invalidators: ['Passing units from different categories.', 'Non-finite input value.'],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      `${r.value} ${r.from} = ${r.result} ${r.to}.`,
      'Pick the equivalent unit that matches your downstream system.',
    ],
    chain_to: [],
    privacy: PRIVACY,
  });
});

export default router;
