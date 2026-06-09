import { Router, Request, Response } from 'express';

// Deterministic timezone intelligence — computed entirely in real code via the
// IANA/ICU database exposed through Intl.DateTimeFormat. No LLM, no network
// upstream: responses are exact, sub-millisecond, and can never fabricate or
// time out. (Replaces the prior OpenRouter-backed implementation that caused
// intermittent 500s / health-check failures.)

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }

// ── Intl/IANA primitives ──────────────────────────────────────────────────
function tzValid(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}
function offsetLabel(min: number): string {
  const sign = min >= 0 ? '+' : '-'; const a = Math.abs(min);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
function parts(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const m: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) m[p.type] = p.value;
  if (m.hour === '24') m.hour = '00';
  return m;
}
function offsetMinutes(date: Date, tz: string): number {
  const m = parts(date, tz);
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}
function abbreviation(date: Date, tz: string): string {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(date);
    return p.find((x) => x.type === 'timeZoneName')?.value ?? '';
  } catch { return ''; }
}
// DST status from the IANA db: a zone observes DST if its Jan and Jul offsets
// differ; DST is "active" now when the current offset equals the larger (summer) one.
function dstStatus(date: Date, tz: string) {
  const y = +parts(date, tz).year;
  const jan = offsetMinutes(new Date(Date.UTC(y, 0, 1, 12)), tz);
  const jul = offsetMinutes(new Date(Date.UTC(y, 6, 1, 12)), tz);
  const observes = jan !== jul;
  const std = Math.min(jan, jul);
  const dst = Math.max(jan, jul);
  const cur = offsetMinutes(date, tz);
  return { observes, std_offset_min: std, dst_offset_min: dst, current_offset_min: cur, dst_active: observes && cur === dst };
}
// Scan the year day-by-day for offset changes → exact DST transition dates.
function dstTransitions(tz: string, year: number) {
  const out: { date: string; type: 'dst_start' | 'dst_end'; from_offset: string; to_offset: string }[] = [];
  let prev = offsetMinutes(new Date(Date.UTC(year, 0, 1, 12)), tz);
  for (let day = 1; day < 366; day++) {
    const d = new Date(Date.UTC(year, 0, 1 + day, 12));
    if (d.getUTCFullYear() !== year) break;
    const off = offsetMinutes(d, tz);
    if (off !== prev) {
      const m = parts(d, tz);
      out.push({ date: `${m.year}-${m.month}-${m.day}`, type: off > prev ? 'dst_start' : 'dst_end', from_offset: offsetLabel(prev), to_offset: offsetLabel(off) });
      prev = off;
    }
  }
  return out;
}
function snapshot(date: Date, tz: string) {
  const m = parts(date, tz);
  const off = offsetMinutes(date, tz);
  const dst = dstStatus(date, tz);
  return {
    name: tz,
    abbreviation: abbreviation(date, tz),
    utc_offset: offsetLabel(off),
    utc_offset_seconds: off * 60,
    dst_active: dst.dst_active,
    dst_offset: dst.observes ? offsetLabel(dst.dst_offset_min) : null,
    standard_offset: offsetLabel(dst.std_offset_min),
    observes_dst: dst.observes,
    current_time: `${m.hour}:${m.minute}:${m.second}`,
    current_date: `${m.year}-${m.month}-${m.day}`,
    current_iso: `${m.year}-${m.month}-${m.day}T${m.hour}:${m.minute}:${m.second}${offsetLabel(off)}`,
    day_of_week: m.weekday,
  };
}

// ── Deterministic location → IANA resolution (bundled gazetteer) ────────────
type Place = { tz: string; country: string; cc: string; lat: number; lng: number };
const CITY: Record<string, Place> = {
  'new york': { tz: 'America/New_York', country: 'United States', cc: 'US', lat: 40.7128, lng: -74.006 },
  'nyc': { tz: 'America/New_York', country: 'United States', cc: 'US', lat: 40.7128, lng: -74.006 },
  'washington': { tz: 'America/New_York', country: 'United States', cc: 'US', lat: 38.9072, lng: -77.0369 },
  'boston': { tz: 'America/New_York', country: 'United States', cc: 'US', lat: 42.3601, lng: -71.0589 },
  'miami': { tz: 'America/New_York', country: 'United States', cc: 'US', lat: 25.7617, lng: -80.1918 },
  'atlanta': { tz: 'America/New_York', country: 'United States', cc: 'US', lat: 33.749, lng: -84.388 },
  'chicago': { tz: 'America/Chicago', country: 'United States', cc: 'US', lat: 41.8781, lng: -87.6298 },
  'houston': { tz: 'America/Chicago', country: 'United States', cc: 'US', lat: 29.7604, lng: -95.3698 },
  'dallas': { tz: 'America/Chicago', country: 'United States', cc: 'US', lat: 32.7767, lng: -96.797 },
  'denver': { tz: 'America/Denver', country: 'United States', cc: 'US', lat: 39.7392, lng: -104.9903 },
  'phoenix': { tz: 'America/Phoenix', country: 'United States', cc: 'US', lat: 33.4484, lng: -112.074 },
  'los angeles': { tz: 'America/Los_Angeles', country: 'United States', cc: 'US', lat: 34.0522, lng: -118.2437 },
  'la': { tz: 'America/Los_Angeles', country: 'United States', cc: 'US', lat: 34.0522, lng: -118.2437 },
  'san francisco': { tz: 'America/Los_Angeles', country: 'United States', cc: 'US', lat: 37.7749, lng: -122.4194 },
  'seattle': { tz: 'America/Los_Angeles', country: 'United States', cc: 'US', lat: 47.6062, lng: -122.3321 },
  'las vegas': { tz: 'America/Los_Angeles', country: 'United States', cc: 'US', lat: 36.1699, lng: -115.1398 },
  'honolulu': { tz: 'Pacific/Honolulu', country: 'United States', cc: 'US', lat: 21.3069, lng: -157.8583 },
  'anchorage': { tz: 'America/Anchorage', country: 'United States', cc: 'US', lat: 61.2181, lng: -149.9003 },
  'toronto': { tz: 'America/Toronto', country: 'Canada', cc: 'CA', lat: 43.6532, lng: -79.3832 },
  'montreal': { tz: 'America/Toronto', country: 'Canada', cc: 'CA', lat: 45.5019, lng: -73.5674 },
  'vancouver': { tz: 'America/Vancouver', country: 'Canada', cc: 'CA', lat: 49.2827, lng: -123.1207 },
  'mexico city': { tz: 'America/Mexico_City', country: 'Mexico', cc: 'MX', lat: 19.4326, lng: -99.1332 },
  'sao paulo': { tz: 'America/Sao_Paulo', country: 'Brazil', cc: 'BR', lat: -23.5505, lng: -46.6333 },
  'são paulo': { tz: 'America/Sao_Paulo', country: 'Brazil', cc: 'BR', lat: -23.5505, lng: -46.6333 },
  'rio de janeiro': { tz: 'America/Sao_Paulo', country: 'Brazil', cc: 'BR', lat: -22.9068, lng: -43.1729 },
  'buenos aires': { tz: 'America/Argentina/Buenos_Aires', country: 'Argentina', cc: 'AR', lat: -34.6037, lng: -58.3816 },
  'bogota': { tz: 'America/Bogota', country: 'Colombia', cc: 'CO', lat: 4.711, lng: -74.0721 },
  'lima': { tz: 'America/Lima', country: 'Peru', cc: 'PE', lat: -12.0464, lng: -77.0428 },
  'santiago': { tz: 'America/Santiago', country: 'Chile', cc: 'CL', lat: -33.4489, lng: -70.6693 },
  'london': { tz: 'Europe/London', country: 'United Kingdom', cc: 'GB', lat: 51.5074, lng: -0.1278 },
  'dublin': { tz: 'Europe/Dublin', country: 'Ireland', cc: 'IE', lat: 53.3498, lng: -6.2603 },
  'lisbon': { tz: 'Europe/Lisbon', country: 'Portugal', cc: 'PT', lat: 38.7223, lng: -9.1393 },
  'madrid': { tz: 'Europe/Madrid', country: 'Spain', cc: 'ES', lat: 40.4168, lng: -3.7038 },
  'barcelona': { tz: 'Europe/Madrid', country: 'Spain', cc: 'ES', lat: 41.3851, lng: 2.1734 },
  'paris': { tz: 'Europe/Paris', country: 'France', cc: 'FR', lat: 48.8566, lng: 2.3522 },
  'amsterdam': { tz: 'Europe/Amsterdam', country: 'Netherlands', cc: 'NL', lat: 52.3676, lng: 4.9041 },
  'brussels': { tz: 'Europe/Brussels', country: 'Belgium', cc: 'BE', lat: 50.8503, lng: 4.3517 },
  'berlin': { tz: 'Europe/Berlin', country: 'Germany', cc: 'DE', lat: 52.52, lng: 13.405 },
  'munich': { tz: 'Europe/Berlin', country: 'Germany', cc: 'DE', lat: 48.1351, lng: 11.582 },
  'frankfurt': { tz: 'Europe/Berlin', country: 'Germany', cc: 'DE', lat: 50.1109, lng: 8.6821 },
  'zurich': { tz: 'Europe/Zurich', country: 'Switzerland', cc: 'CH', lat: 47.3769, lng: 8.5417 },
  'rome': { tz: 'Europe/Rome', country: 'Italy', cc: 'IT', lat: 41.9028, lng: 12.4964 },
  'milan': { tz: 'Europe/Rome', country: 'Italy', cc: 'IT', lat: 45.4642, lng: 9.19 },
  'vienna': { tz: 'Europe/Vienna', country: 'Austria', cc: 'AT', lat: 48.2082, lng: 16.3738 },
  'stockholm': { tz: 'Europe/Stockholm', country: 'Sweden', cc: 'SE', lat: 59.3293, lng: 18.0686 },
  'oslo': { tz: 'Europe/Oslo', country: 'Norway', cc: 'NO', lat: 59.9139, lng: 10.7522 },
  'copenhagen': { tz: 'Europe/Copenhagen', country: 'Denmark', cc: 'DK', lat: 55.6761, lng: 12.5683 },
  'helsinki': { tz: 'Europe/Helsinki', country: 'Finland', cc: 'FI', lat: 60.1699, lng: 24.9384 },
  'warsaw': { tz: 'Europe/Warsaw', country: 'Poland', cc: 'PL', lat: 52.2297, lng: 21.0122 },
  'athens': { tz: 'Europe/Athens', country: 'Greece', cc: 'GR', lat: 37.9838, lng: 23.7275 },
  'istanbul': { tz: 'Europe/Istanbul', country: 'Turkey', cc: 'TR', lat: 41.0082, lng: 28.9784 },
  'moscow': { tz: 'Europe/Moscow', country: 'Russia', cc: 'RU', lat: 55.7558, lng: 37.6173 },
  'dubai': { tz: 'Asia/Dubai', country: 'United Arab Emirates', cc: 'AE', lat: 25.2048, lng: 55.2708 },
  'abu dhabi': { tz: 'Asia/Dubai', country: 'United Arab Emirates', cc: 'AE', lat: 24.4539, lng: 54.3773 },
  'riyadh': { tz: 'Asia/Riyadh', country: 'Saudi Arabia', cc: 'SA', lat: 24.7136, lng: 46.6753 },
  'tel aviv': { tz: 'Asia/Jerusalem', country: 'Israel', cc: 'IL', lat: 32.0853, lng: 34.7818 },
  'jerusalem': { tz: 'Asia/Jerusalem', country: 'Israel', cc: 'IL', lat: 31.7683, lng: 35.2137 },
  'cairo': { tz: 'Africa/Cairo', country: 'Egypt', cc: 'EG', lat: 30.0444, lng: 31.2357 },
  'lagos': { tz: 'Africa/Lagos', country: 'Nigeria', cc: 'NG', lat: 6.5244, lng: 3.3792 },
  'nairobi': { tz: 'Africa/Nairobi', country: 'Kenya', cc: 'KE', lat: -1.2921, lng: 36.8219 },
  'johannesburg': { tz: 'Africa/Johannesburg', country: 'South Africa', cc: 'ZA', lat: -26.2041, lng: 28.0473 },
  'cape town': { tz: 'Africa/Johannesburg', country: 'South Africa', cc: 'ZA', lat: -33.9249, lng: 18.4241 },
  'mumbai': { tz: 'Asia/Kolkata', country: 'India', cc: 'IN', lat: 19.076, lng: 72.8777 },
  'delhi': { tz: 'Asia/Kolkata', country: 'India', cc: 'IN', lat: 28.7041, lng: 77.1025 },
  'new delhi': { tz: 'Asia/Kolkata', country: 'India', cc: 'IN', lat: 28.6139, lng: 77.209 },
  'bangalore': { tz: 'Asia/Kolkata', country: 'India', cc: 'IN', lat: 12.9716, lng: 77.5946 },
  'bengaluru': { tz: 'Asia/Kolkata', country: 'India', cc: 'IN', lat: 12.9716, lng: 77.5946 },
  'karachi': { tz: 'Asia/Karachi', country: 'Pakistan', cc: 'PK', lat: 24.8607, lng: 67.0011 },
  'dhaka': { tz: 'Asia/Dhaka', country: 'Bangladesh', cc: 'BD', lat: 23.8103, lng: 90.4125 },
  'bangkok': { tz: 'Asia/Bangkok', country: 'Thailand', cc: 'TH', lat: 13.7563, lng: 100.5018 },
  'jakarta': { tz: 'Asia/Jakarta', country: 'Indonesia', cc: 'ID', lat: -6.2088, lng: 106.8456 },
  'singapore': { tz: 'Asia/Singapore', country: 'Singapore', cc: 'SG', lat: 1.3521, lng: 103.8198 },
  'kuala lumpur': { tz: 'Asia/Kuala_Lumpur', country: 'Malaysia', cc: 'MY', lat: 3.139, lng: 101.6869 },
  'manila': { tz: 'Asia/Manila', country: 'Philippines', cc: 'PH', lat: 14.5995, lng: 120.9842 },
  'hong kong': { tz: 'Asia/Hong_Kong', country: 'Hong Kong', cc: 'HK', lat: 22.3193, lng: 114.1694 },
  'shanghai': { tz: 'Asia/Shanghai', country: 'China', cc: 'CN', lat: 31.2304, lng: 121.4737 },
  'beijing': { tz: 'Asia/Shanghai', country: 'China', cc: 'CN', lat: 39.9042, lng: 116.4074 },
  'shenzhen': { tz: 'Asia/Shanghai', country: 'China', cc: 'CN', lat: 22.5431, lng: 114.0579 },
  'taipei': { tz: 'Asia/Taipei', country: 'Taiwan', cc: 'TW', lat: 25.033, lng: 121.5654 },
  'seoul': { tz: 'Asia/Seoul', country: 'South Korea', cc: 'KR', lat: 37.5665, lng: 126.978 },
  'tokyo': { tz: 'Asia/Tokyo', country: 'Japan', cc: 'JP', lat: 35.6762, lng: 139.6503 },
  'osaka': { tz: 'Asia/Tokyo', country: 'Japan', cc: 'JP', lat: 34.6937, lng: 135.5023 },
  'sydney': { tz: 'Australia/Sydney', country: 'Australia', cc: 'AU', lat: -33.8688, lng: 151.2093 },
  'melbourne': { tz: 'Australia/Melbourne', country: 'Australia', cc: 'AU', lat: -37.8136, lng: 144.9631 },
  'brisbane': { tz: 'Australia/Brisbane', country: 'Australia', cc: 'AU', lat: -27.4698, lng: 153.0251 },
  'perth': { tz: 'Australia/Perth', country: 'Australia', cc: 'AU', lat: -31.9505, lng: 115.8605 },
  'auckland': { tz: 'Pacific/Auckland', country: 'New Zealand', cc: 'NZ', lat: -36.8485, lng: 174.7633 },
  'wellington': { tz: 'Pacific/Auckland', country: 'New Zealand', cc: 'NZ', lat: -41.2865, lng: 174.7762 },
};
const COUNTRY: Record<string, Place> = {
  'usa': CITY['new york'], 'us': CITY['new york'], 'united states': CITY['new york'], 'united states of america': CITY['new york'], 'america': CITY['new york'],
  'canada': CITY['toronto'], 'ca': CITY['toronto'],
  'mexico': CITY['mexico city'], 'mx': CITY['mexico city'],
  'brazil': CITY['sao paulo'], 'br': CITY['sao paulo'],
  'argentina': CITY['buenos aires'], 'ar': CITY['buenos aires'],
  'uk': CITY['london'], 'gb': CITY['london'], 'united kingdom': CITY['london'], 'england': CITY['london'], 'britain': CITY['london'],
  'ireland': CITY['dublin'], 'ie': CITY['dublin'],
  'portugal': CITY['lisbon'], 'pt': CITY['lisbon'],
  'spain': CITY['madrid'], 'es': CITY['madrid'],
  'france': CITY['paris'], 'fr': CITY['paris'],
  'netherlands': CITY['amsterdam'], 'nl': CITY['amsterdam'],
  'belgium': CITY['brussels'], 'be': CITY['brussels'],
  'germany': CITY['berlin'], 'de': CITY['berlin'],
  'switzerland': CITY['zurich'], 'ch': CITY['zurich'],
  'italy': CITY['rome'], 'it': CITY['rome'],
  'austria': CITY['vienna'], 'at': CITY['vienna'],
  'sweden': CITY['stockholm'], 'se': CITY['stockholm'],
  'norway': CITY['oslo'], 'no': CITY['oslo'],
  'denmark': CITY['copenhagen'], 'dk': CITY['copenhagen'],
  'finland': CITY['helsinki'], 'fi': CITY['helsinki'],
  'poland': CITY['warsaw'], 'pl': CITY['warsaw'],
  'greece': CITY['athens'], 'gr': CITY['athens'],
  'turkey': CITY['istanbul'], 'tr': CITY['istanbul'],
  'russia': CITY['moscow'], 'ru': CITY['moscow'],
  'uae': CITY['dubai'], 'ae': CITY['dubai'], 'united arab emirates': CITY['dubai'],
  'saudi arabia': CITY['riyadh'], 'sa': CITY['riyadh'],
  'israel': CITY['jerusalem'], 'il': CITY['jerusalem'],
  'egypt': CITY['cairo'], 'eg': CITY['cairo'],
  'nigeria': CITY['lagos'], 'ng': CITY['lagos'],
  'kenya': CITY['nairobi'], 'ke': CITY['nairobi'],
  'south africa': CITY['johannesburg'], 'za': CITY['johannesburg'],
  'india': CITY['mumbai'], 'in': CITY['mumbai'],
  'pakistan': CITY['karachi'], 'pk': CITY['karachi'],
  'bangladesh': CITY['dhaka'], 'bd': CITY['dhaka'],
  'thailand': CITY['bangkok'], 'th': CITY['bangkok'],
  'indonesia': CITY['jakarta'], 'id': CITY['jakarta'],
  'sg': CITY['singapore'],
  'malaysia': CITY['kuala lumpur'], 'my': CITY['kuala lumpur'],
  'philippines': CITY['manila'], 'ph': CITY['manila'],
  'hk': CITY['hong kong'],
  'china': CITY['shanghai'], 'cn': CITY['shanghai'],
  'taiwan': CITY['taipei'], 'tw': CITY['taipei'],
  'south korea': CITY['seoul'], 'korea': CITY['seoul'], 'kr': CITY['seoul'],
  'japan': CITY['tokyo'], 'jp': CITY['tokyo'],
  'australia': CITY['sydney'], 'au': CITY['sydney'],
  'new zealand': CITY['auckland'], 'nz': CITY['auckland'],
};
// Common UTC-offset / abbreviation aliases → a representative IANA zone.
const ABBR: Record<string, string> = {
  utc: 'UTC', gmt: 'UTC', z: 'UTC',
  est: 'America/New_York', edt: 'America/New_York', et: 'America/New_York',
  cst: 'America/Chicago', cdt: 'America/Chicago', ct: 'America/Chicago',
  mst: 'America/Denver', mdt: 'America/Denver', mt: 'America/Denver',
  pst: 'America/Los_Angeles', pdt: 'America/Los_Angeles', pt: 'America/Los_Angeles',
  bst: 'Europe/London', cet: 'Europe/Paris', cest: 'Europe/Paris', eet: 'Europe/Athens',
  ist: 'Asia/Kolkata', jst: 'Asia/Tokyo', kst: 'Asia/Seoul', sgt: 'Asia/Singapore',
  hkt: 'Asia/Hong_Kong', aest: 'Australia/Sydney', aedt: 'Australia/Sydney', nzst: 'Pacific/Auckland',
};
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

function resolveLocation(input: string): { place: Place | { tz: string }; confidence: number; matched_on: string } | null {
  const raw = input.trim();
  const key = norm(raw);
  // Abbreviations first: some ICU builds accept legacy ids like "PST"/"EST" as
  // fixed zones, so canonicalize them to a real IANA zone before the raw check.
  if (ABBR[key]) return { place: { tz: ABBR[key] }, confidence: 0.95, matched_on: 'abbreviation' };
  if (tzValid(raw)) return { place: { tz: raw }, confidence: 1.0, matched_on: 'iana_timezone' };
  if (CITY[key]) return { place: CITY[key], confidence: 0.98, matched_on: 'city' };
  if (COUNTRY[key]) return { place: COUNTRY[key], confidence: 0.9, matched_on: 'country' };
  // "City, Country" → try the city segment, then the country segment.
  const segs = key.split(',').map((s) => s.trim()).filter(Boolean);
  if (segs.length > 1) {
    if (CITY[segs[0]]) return { place: CITY[segs[0]], confidence: 0.97, matched_on: 'city' };
    const last = segs[segs.length - 1];
    if (COUNTRY[last]) return { place: COUNTRY[last], confidence: 0.85, matched_on: 'country' };
    if (CITY[last]) return { place: CITY[last], confidence: 0.9, matched_on: 'city' };
  }
  return null;
}
function placeMeta(place: Place | { tz: string }) {
  const p = place as Place;
  return {
    country: p.country ?? null,
    country_code: p.cc ?? null,
    coordinates: typeof p.lat === 'number' ? { lat: p.lat, lng: p.lng } : null,
  };
}
const unresolved = (res: Response, location: string) =>
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: false,
    resolved: false, location,
    error: 'unresolved_location',
    message: `Could not deterministically resolve "${location}" to a timezone. Pass an IANA timezone (e.g. "Asia/Tokyo"), a major city ("Tokyo"), "City, Country", or a code (e.g. "JST", "PST").`,
    confidence_per_section: { resolution: 0 },
    recommended_actions_priority_order: ['Retry with an IANA timezone id or a major city name.'],
    privacy: PRIVACY,
  });

// Interpret a datetime string: absolute if it carries Z/offset; otherwise a
// naive wall-clock to be interpreted in `tz` (DST-correct, 2-pass).
function toInstant(datetime: string, tz: string): Date | null {
  const s = datetime.trim();
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(s)) { const d = new Date(s); return isNaN(d.getTime()) ? null : d; }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) { const d = new Date(s); return isNaN(d.getTime()) ? null : d; }
  const [, y, mo, da, h, mi, se] = m;
  const guess = Date.UTC(+y, +mo - 1, +da, +h, +mi, +(se || 0));
  const off1 = offsetMinutes(new Date(guess), tz);
  let utc = guess - off1 * 60000;
  const off2 = offsetMinutes(new Date(utc), tz);
  if (off2 !== off1) utc = guess - off2 * 60000;
  return new Date(utc);
}

// Representative zones (one per common region) for overlap discovery.
const REP_ZONES = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver', 'America/Chicago',
  'America/New_York', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Athens',
  'Europe/Moscow', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok',
  'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Timezone API', info: '/timezone/info', openapi: '/timezone/openapi.json', health: 'ok' });
});

// POST /lookup — timezone facts for a location.
router.post('/lookup', (req: Request, res: Response) => {
  const { location } = req.body || {};
  if (!location) return res.status(400).json({ error: 'location is required' });
  const r = resolveLocation(String(location));
  if (!r) return unresolved(res, String(location));
  const now = new Date();
  const tz = r.place.tz;
  res.json({
    trace_id: traceId(), computed_at: now.toISOString(), success: true,
    location: String(location), resolved: true, matched_on: r.matched_on,
    timezone: snapshot(now, tz),
    ...placeMeta(r.place),
    confidence_per_section: { timezone: 1.0, resolution: r.confidence },
    recommended_actions_priority_order: ['Store the IANA timezone name, not the abbreviation, for future conversions.', 'Account for DST transitions in recurring schedules.'],
    privacy: PRIVACY,
  });
});

// POST /convert — convert a datetime between two zones (DST-correct).
router.post('/convert', (req: Request, res: Response) => {
  const { datetime, from_tz, to_tz } = req.body || {};
  if (!datetime || !from_tz || !to_tz) return res.status(400).json({ error: 'datetime, from_tz, and to_tz are required' });
  const fr = resolveLocation(String(from_tz));
  const to = resolveLocation(String(to_tz));
  if (!fr) return unresolved(res, String(from_tz));
  if (!to) return unresolved(res, String(to_tz));
  const instant = toInstant(String(datetime), fr.place.tz);
  if (!instant) return res.status(400).json({ error: 'datetime could not be parsed (use ISO 8601, optionally with Z/offset, or "YYYY-MM-DD HH:MM")' });
  const fromSnap = snapshot(instant, fr.place.tz);
  const toSnap = snapshot(instant, to.place.tz);
  const offDiffHours = (offsetMinutes(instant, to.place.tz) - offsetMinutes(instant, fr.place.tz)) / 60;
  const dayDelta = new Date(toSnap.current_date).getTime() - new Date(fromSnap.current_date).getTime();
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    original: { datetime: String(datetime), timezone: fr.place.tz, utc_offset: fromSnap.utc_offset, local_iso: fromSnap.current_iso, day_of_week: fromSnap.day_of_week },
    converted: { timezone: to.place.tz, utc_offset: toSnap.utc_offset, datetime: toSnap.current_iso, date: toSnap.current_date, time: toSnap.current_time, day_of_week: toSnap.day_of_week },
    utc_equivalent: instant.toISOString(),
    offset_diff_hours: offDiffHours,
    is_next_day: dayDelta > 0,
    is_previous_day: dayDelta < 0,
    confidence_per_section: { converted: 1.0, utc_equivalent: 1.0 },
    recommended_actions_priority_order: ['Confirm date-boundary crossings when offset_diff is large.', 'Store the UTC equivalent for durable scheduling.'],
    privacy: PRIVACY,
  });
});

// POST /meeting-times — rank UTC windows by business-hours overlap across zones.
router.post('/meeting-times', (req: Request, res: Response) => {
  const { timezones, date } = req.body || {};
  if (!timezones || !Array.isArray(timezones)) return res.status(400).json({ error: 'timezones array is required' });
  const resolved = timezones.slice(0, 10).map((t: unknown) => ({ input: String(t), r: resolveLocation(String(t)) }));
  const bad = resolved.find((x) => !x.r);
  if (bad) return unresolved(res, bad.input);
  const zones = resolved.map((x) => x.r!.place.tz);
  const day = (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : new Date().toISOString().slice(0, 10);
  const windows: { utc_time: string; local_times: any[]; score: number; in_business: number; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    const instant = new Date(`${day}T${String(h).padStart(2, '0')}:00:00Z`);
    const local = zones.map((tz) => {
      const s = snapshot(instant, tz);
      const hour = +s.current_time.slice(0, 2);
      const biz = hour >= 9 && hour < 17;
      return { timezone: tz, local_time: s.current_time.slice(0, 5), day: s.day_of_week, is_business_hours: biz };
    });
    const inBiz = local.filter((l) => l.is_business_hours).length;
    windows.push({ utc_time: `${String(h).padStart(2, '0')}:00`, local_times: local, score: +(inBiz / zones.length).toFixed(3), in_business: inBiz, label: inBiz === zones.length ? 'all in business hours' : `${inBiz}/${zones.length} in business hours` });
  }
  const ranked = [...windows].sort((a, b) => b.in_business - a.in_business);
  const top = ranked.slice(0, 5);
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    timezones: zones, date: day,
    optimal_windows: top,
    recommended_slot: { utc_time: top[0]?.utc_time, reason: top[0] ? `${top[0].in_business} of ${zones.length} participants are within 09:00–17:00 local at this UTC hour.` : 'no overlap found' },
    timezone_summary: zones.map((tz) => { const s = snapshot(new Date(`${day}T12:00:00Z`), tz); return { timezone: tz, abbreviation: s.abbreviation, utc_offset: s.utc_offset }; }),
    confidence_per_section: { optimal_windows: 1.0, recommended_slot: 1.0 },
    recommended_actions_priority_order: ['Book the recommended UTC slot first.', 'Send calendar invites in each participant\'s local time.'],
    privacy: PRIVACY,
  });
});

// POST /execution-gate — deterministic readiness check (no upstream).
router.post('/execution-gate', (req: Request, res: Response) => {
  const { location, objective } = req.body || {};
  if (!location) return res.status(400).json({ error: 'location is required' });
  const r = resolveLocation(String(location));
  const flags: string[] = [];
  if (!r) flags.push('AMBIGUOUS_LOCATION');
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    execution_ready: flags.length === 0,
    location: String(location), objective: objective || 'timezone_lookup',
    resolved_timezone: r ? r.place.tz : null,
    next_api: 'calendar-holiday', next_endpoint: '/holidays',
    blocking_flags: flags,
    flag_definitions: { NO_LOCATION: 'No location provided', AMBIGUOUS_LOCATION: 'Location could not be resolved — provide an IANA zone, a major city, or "City, Country".' },
    confidence_per_section: { execution_ready: 1.0, blocking_flags: 1.0 },
    recommended_actions_priority_order: ['Look up timezone', 'Convert times for participants', 'Find meeting windows'],
    privacy: PRIVACY,
  });
});

// POST /analyze — ONE-CALL: lookup + DST schedule + overlapping zones.
router.post('/analyze', (req: Request, res: Response) => {
  const { location } = req.body || {};
  if (!location) return res.status(400).json({ error: 'location is required' });
  const r = resolveLocation(String(location));
  if (!r) return unresolved(res, String(location));
  const now = new Date();
  const tz = r.place.tz;
  const tzSnap = snapshot(now, tz);
  const year = +tzSnap.current_date.slice(0, 4);
  const transitions = dstTransitions(tz, year);
  const start = transitions.find((t) => t.type === 'dst_start');
  const end = transitions.find((t) => t.type === 'dst_end');
  const curOff = offsetMinutes(now, tz);
  const overlapping = REP_ZONES.filter((z) => z !== tz && offsetMinutes(now, z) === curOff);
  const hhmm = (min: number) => { const m = ((min % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  res.json({
    trace_id: traceId(), computed_at: now.toISOString(), success: true,
    location: String(location), resolved: true, matched_on: r.matched_on,
    timezone: tzSnap,
    ...placeMeta(r.place),
    business_hours_utc: { start: hhmm(9 * 60 - curOff), end: hhmm(17 * 60 - curOff), local_window: '09:00–17:00' },
    dst_schedule: tzSnap.observes_dst
      ? { observes_dst: true, year, starts: start?.date ?? null, ends: end?.date ?? null, offset_change: start ? `${start.from_offset} → ${start.to_offset}` : null, transitions }
      : { observes_dst: false, year, starts: null, ends: null, offset_change: null, transitions: [] },
    overlapping_zones: overlapping,
    confidence_per_section: { timezone: 1.0, dst_schedule: 1.0, coordinates: typeof (r.place as Place).lat === 'number' ? 1.0 : 0, resolution: r.confidence },
    recommended_actions_priority_order: ['Store the IANA timezone name, not the abbreviation.', 'Account for DST transitions in recurring schedules.', 'Use overlapping_zones to group participants by offset.'],
    privacy: PRIVACY,
  });
});

export default router;
