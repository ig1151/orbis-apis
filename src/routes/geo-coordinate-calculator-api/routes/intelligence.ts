import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const R_KM = 6371.0088;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

interface Pt { lat: number; lon: number; }
function pt(v: unknown): Pt | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as any;
  if (typeof o.lat !== 'number' || typeof o.lon !== 'number') return null;
  if (o.lat < -90 || o.lat > 90 || o.lon < -180 || o.lon > 180) return null;
  return { lat: o.lat, lon: o.lon };
}
function haversineKm(a: Pt, b: Pt): number {
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R_KM * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
function bearing(a: Pt, b: Pt): number {
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
function midpoint(a: Pt, b: Pt): Pt {
  const dLon = toRad(b.lon - a.lon);
  const bx = Math.cos(toRad(b.lat)) * Math.cos(dLon), by = Math.cos(toRad(b.lat)) * Math.sin(dLon);
  const lat = Math.atan2(Math.sin(toRad(a.lat)) + Math.sin(toRad(b.lat)), Math.sqrt((Math.cos(toRad(a.lat)) + bx) ** 2 + by ** 2));
  const lon = toRad(a.lon) + Math.atan2(by, Math.cos(toRad(a.lat)) + bx);
  return { lat: Math.round(toDeg(lat) * 1e6) / 1e6, lon: Math.round(((toDeg(lon) + 540) % 360 - 180) * 1e6) / 1e6 };
}
const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function cardinal(deg: number): string { return CARDINALS[Math.round(deg / 45) % 8]; }
function convert(km: number, unit: string): number {
  const v = unit === 'mi' ? km * 0.621371 : unit === 'm' ? km * 1000 : unit === 'nmi' ? km * 0.539957 : km;
  return Math.round(v * 1000) / 1000;
}
function unitOk(u: unknown): u is string { return u === undefined || ['km', 'mi', 'm', 'nmi'].includes(u as string); }

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Geospatial Coordinate Calculator API', version: '1.0.0',
    description: 'Deterministic great-circle geometry: distance (Haversine), initial bearing, and midpoint between coordinates. Real spherical math — confidence 1.0.',
    openapi_url: 'https://orbis-apis.onrender.com/geo-coordinate-calculator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/distance', summary: 'Great-circle distance + bearing between two points', price_usdc: 0.005 },
      { method: 'POST', path: '/batch', summary: 'Distances/bearings for many coordinate pairs', price_usdc: 0.010 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: distance + bearing + midpoint + direction', price_usdc: 0.015 },
    ],
    pricing: [
      { path: '/distance', price_usdc: 0.005, currency: 'USDC' },
      { path: '/batch', price_usdc: 0.010, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/distance', (req: Request, res: Response) => {
  const t0 = Date.now();
  const from = pt(req.body?.from), to = pt(req.body?.to);
  if (!from || !to) return fail(res, t0, 400, 'invalid_points', '"from" and "to" must be {lat:-90..90, lon:-180..180}.');
  if (!unitOk(req.body?.unit)) return fail(res, t0, 400, 'invalid_unit', '"unit" must be one of km, mi, m, nmi.');
  const unit = req.body?.unit ?? 'km';
  const km = haversineKm(from, to);
  respond(res, t0, {
    input: { from, to, unit },
    distance: convert(km, unit), unit, method: 'haversine',
    initial_bearing_deg: Math.round(bearing(from, to) * 100) / 100,
    cardinal_direction: cardinal(bearing(from, to)),
    confidence_score: 1.0,
    recommended_actions_priority_order: [`Bearing ${cardinal(bearing(from, to))} — heading from origin to destination.`],
    chain_to: [
      { api: 'timezone-harmonizer', reason: 'Get the local time at the destination coordinates.' },
      { api: 'local-business', reason: 'Find businesses near these coordinates.' },
    ],
    privacy: PRIVACY,
  });
});

router.post('/batch', (req: Request, res: Response) => {
  const t0 = Date.now();
  const pairs = req.body?.pairs;
  if (!Array.isArray(pairs) || pairs.length === 0 || pairs.length > 100)
    return fail(res, t0, 400, 'invalid_pairs', '"pairs" must be an array of 1–100 {from,to} objects.');
  if (!unitOk(req.body?.unit)) return fail(res, t0, 400, 'invalid_unit', '"unit" must be one of km, mi, m, nmi.');
  const unit = req.body?.unit ?? 'km';
  const results: any[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const from = pt(pairs[i]?.from), to = pt(pairs[i]?.to);
    if (!from || !to) return fail(res, t0, 400, 'invalid_points', `pairs[${i}] has invalid from/to coordinates.`);
    const km = haversineKm(from, to);
    results.push({ index: i, distance: convert(km, unit), initial_bearing_deg: Math.round(bearing(from, to) * 100) / 100, cardinal_direction: cardinal(bearing(from, to)) });
  }
  respond(res, t0, {
    unit, count: results.length, results,
    confidence_score: 1.0,
    recommended_actions_priority_order: ['Use per-pair distances for routing/clustering.'],
    chain_to: [
      { api: 'timezone-harmonizer', reason: 'Get the local time at the destination coordinates.' },
      { api: 'local-business', reason: 'Find businesses near these coordinates.' },
    ],
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const from = pt(req.body?.from), to = pt(req.body?.to);
  if (!from || !to) return fail(res, t0, 400, 'invalid_points', '"from" and "to" must be {lat,lon}.');
  if (!unitOk(req.body?.unit)) return fail(res, t0, 400, 'invalid_unit', '"unit" must be one of km, mi, m, nmi.');
  const unit = req.body?.unit ?? 'km';
  const km = haversineKm(from, to);
  const brg = bearing(from, to);
  respond(res, t0, {
    input: { from, to, unit },
    distance: convert(km, unit), unit, method: 'haversine',
    initial_bearing_deg: Math.round(brg * 100) / 100,
    cardinal_direction: cardinal(brg),
    midpoint: midpoint(from, to),
    reasoning: {
      why_result_generated: 'Distance via the Haversine great-circle formula on a spherical Earth (R=6371.0088 km); bearing and midpoint from spherical trigonometry.',
      key_factors: [`${convert(km, unit)} ${unit}`, `initial bearing ${Math.round(brg)}° (${cardinal(brg)})`],
      invalidators: ['Geodesic (ellipsoidal/Vincenty) accuracy required — Haversine error is up to ~0.5%.', 'Coordinates outside valid lat/lon range.'],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      `Travel ${convert(km, unit)} ${unit} heading ${cardinal(brg)} (${Math.round(brg)}°).`,
      'For sub-meter precision use a geodesic (Vincenty) method instead.',
    ],
    chain_to: [
      { api: 'timezone-harmonizer', reason: 'Get the local time at the destination coordinates.' },
      { api: 'local-business', reason: 'Find businesses near these coordinates.' },
    ],
    privacy: PRIVACY,
  });
});

export default router;
