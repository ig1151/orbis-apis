import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, intIn, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic-by-seed (or crypto-random) test-data generator. No LLM. When a
// `seed` is supplied the output is fully reproducible (mulberry32 PRNG); without
// a seed it draws from Node's CSPRNG. Generates names, emails, UUIDs, phones,
// addresses, primitives, and multi-column test rows.

const router = Router();
const MAX_COUNT = 1000;

// ---- RNG ------------------------------------------------------------------
function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}
class Rng {
  private a: number;
  private seeded: boolean;
  constructor(seed?: string) {
    this.seeded = seed !== undefined;
    this.a = seed !== undefined ? hashSeed(seed) : 0;
  }
  next(): number {
    if (!this.seeded) return crypto.randomBytes(4).readUInt32BE(0) / 4294967296;
    let t = (this.a = (this.a + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number { return min + Math.floor(this.next() * (max - min + 1)); }
  pick<T>(arr: T[]): T { return arr[this.int(0, arr.length - 1)]; }
  bool(): boolean { return this.next() < 0.5; }
  hex(n: number): string { let s = ''; for (let i = 0; i < n; i++) s += this.int(0, 15).toString(16); return s; }
}

// ---- pools ----------------------------------------------------------------
const FIRST = ['Avery', 'Jordan', 'Riley', 'Morgan', 'Casey', 'Quinn', 'Skyler', 'Reese', 'Rowan', 'Sage', 'Hayden', 'Emerson', 'Finley', 'Dakota', 'Parker', 'Elliot', 'Marlow', 'Tatum', 'Bellamy', 'Lennon'];
const LAST = ['Hernandez', 'Okafor', 'Nguyen', 'Patel', 'Kovač', 'Andersen', 'Suzuki', 'Rossi', 'Schmidt', 'Costa', 'Haddad', 'Olsen', 'Kim', 'Dubois', 'Ferreira', 'Walsh', 'Novak', 'Bauer', 'Mensah', 'Larsen'];
const DOMAINS = ['example.com', 'test.dev', 'mail.example', 'sample.io', 'demo.net'];
const STREETS = ['Maple', 'Oak', 'Cedar', 'Birch', 'Elm', 'Pine', 'Walnut', 'Chestnut', 'Willow', 'Aspen'];
const SUFFIX = ['St', 'Ave', 'Blvd', 'Ln', 'Dr', 'Way', 'Ct'];
const CITIES = ['Springfield', 'Riverton', 'Fairview', 'Lakewood', 'Greenville', 'Kingston', 'Ashford', 'Brookside', 'Westport', 'Northgate'];
const STATES = ['CA', 'TX', 'NY', 'FL', 'WA', 'CO', 'IL', 'GA', 'MA', 'OR'];
const COMPANIES = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark', 'Wayne', 'Wonka', 'Vandelay', 'Cyberdyne'];
const SUFFIXES = ['Inc', 'LLC', 'Group', 'Labs', 'Systems', 'Holdings', 'Co'];
const WORDS = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'tempor', 'incididunt', 'labore', 'magna', 'aliqua', 'veniam', 'nostrud', 'commodo', 'aliquip'];

export const GEN_TYPES = ['uuid', 'name', 'first_name', 'last_name', 'email', 'username', 'phone', 'company', 'address', 'city', 'state', 'zip', 'country', 'integer', 'float', 'boolean', 'date', 'hex_color', 'ipv4', 'mac', 'word', 'sentence', 'password'] as const;
export type GenType = (typeof GEN_TYPES)[number];

export interface Address { street: string; city: string; state: string; zip: string; country: string; }
export type GenValue = string | number | boolean | Address;

function uuidV4(r: Rng): string {
  const h = r.hex(32).split('');
  h[12] = '4';
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
function address(r: Rng): Address {
  return { street: `${r.int(1, 9999)} ${r.pick(STREETS)} ${r.pick(SUFFIX)}`, city: r.pick(CITIES), state: r.pick(STATES), zip: String(r.int(10000, 99999)), country: 'US' };
}

export function genOne(type: GenType, r: Rng, opts: { min?: number; max?: number }): GenValue {
  const first = () => r.pick(FIRST), last = () => r.pick(LAST);
  switch (type) {
    case 'uuid': return uuidV4(r);
    case 'name': return `${first()} ${last()}`;
    case 'first_name': return first();
    case 'last_name': return last();
    case 'email': return `${first().toLowerCase()}.${last().toLowerCase()}${r.int(1, 99)}@${r.pick(DOMAINS)}`;
    case 'username': return `${first().toLowerCase()}_${last().toLowerCase()}${r.int(1, 999)}`;
    case 'phone': return `+1${r.int(200, 989)}${String(r.int(0, 9999999)).padStart(7, '0')}`;
    case 'company': return `${r.pick(COMPANIES)} ${r.pick(SUFFIXES)}`;
    case 'address': return address(r);
    case 'city': return r.pick(CITIES);
    case 'state': return r.pick(STATES);
    case 'zip': return String(r.int(10000, 99999));
    case 'country': return 'US';
    case 'integer': { const lo = opts.min ?? 0, hi = opts.max ?? 1000; return r.int(Math.min(lo, hi), Math.max(lo, hi)); }
    case 'float': { const lo = opts.min ?? 0, hi = opts.max ?? 1; return Math.round((lo + r.next() * (hi - lo)) * 1e6) / 1e6; }
    case 'boolean': return r.bool();
    case 'date': { const start = Date.UTC(2000, 0, 1), end = Date.UTC(2030, 0, 1); return new Date(start + r.next() * (end - start)).toISOString().slice(0, 10); }
    case 'hex_color': return '#' + r.hex(6);
    case 'ipv4': return `${r.int(1, 254)}.${r.int(0, 255)}.${r.int(0, 255)}.${r.int(1, 254)}`;
    case 'mac': return Array.from({ length: 6 }, () => r.hex(2)).join(':');
    case 'word': return r.pick(WORDS);
    case 'sentence': { const n = r.int(5, 12); const w = Array.from({ length: n }, () => r.pick(WORDS)); w[0] = w[0][0].toUpperCase() + w[0].slice(1); return w.join(' ') + '.'; }
    case 'password': { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'; let p = ''; for (let i = 0; i < 16; i++) p += chars[r.int(0, chars.length - 1)]; return p; }
  }
}

function chainTo() {
  return [
    { api: 'data-validator', reason: 'Validate generated cards/IBANs/emails against real checksums before using them as fixtures.' },
    { api: 'json-to-csv', reason: 'Convert generated test rows into CSV for seeding spreadsheets or fixtures.' },
  ];
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Random Data Generator API', version: '1.0.0',
    description: 'Deterministic-by-seed (or crypto-random) test-data generator: UUIDs, names, emails, phones, addresses, primitives, and multi-column test rows. Supply a seed for reproducible output; omit it for CSPRNG randomness. No LLM, no fabricated PII about real people.',
    openapi_url: 'https://orbis-apis.onrender.com/random-data-generator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/generate', summary: 'Generate N values of one type (optional seed)', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL multi-column test rows + reasoning', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/generate', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/generate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const type = str(req.body?.type)?.toLowerCase() as GenType | undefined;
  if (!type || !GEN_TYPES.includes(type)) return fail(res, t0, 400, 'invalid_request', `Provide "type" as one of: ${GEN_TYPES.join(', ')}.`);
  const count = intIn(req.body?.count) ?? 1;
  if (count < 1 || count > MAX_COUNT) return fail(res, t0, 400, 'invalid_request', `"count" must be between 1 and ${MAX_COUNT}.`);
  const seed = str(req.body?.seed);
  const r = new Rng(seed);
  const opts = { min: num(req.body?.min), max: num(req.body?.max) };
  const values: GenValue[] = Array.from({ length: count }, () => genOne(type, r, opts));
  respond(res, t0, {
    type, count, seed: seed ?? null, reproducible: seed !== undefined, values,
    confidence_score: 1.0, confidence_per_section: { generation: 1 },
    recommended_actions_priority_order: [
      `Generated ${count} ${type} value${count === 1 ? '' : 's'}${seed ? ` (seed "${seed}" — reproducible)` : ' (crypto-random — not reproducible)'}.`,
      'Use as test fixtures/synthetic data; do not treat as real records.',
    ],
    chain_to: chainTo(), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const fields = req.body?.fields;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields) || Object.keys(fields).length === 0) {
    return fail(res, t0, 400, 'invalid_request', 'Provide "fields" as an object mapping column name -> type (e.g. {"id":"uuid","email":"email"}).');
  }
  const columns: { name: string; type: GenType }[] = [];
  for (const [name, t] of Object.entries(fields)) {
    const type = String(t).toLowerCase() as GenType;
    if (!GEN_TYPES.includes(type)) return fail(res, t0, 400, 'invalid_request', `Column "${name}" has unsupported type "${t}". Supported: ${GEN_TYPES.join(', ')}.`);
    columns.push({ name, type });
  }
  const count = intIn(req.body?.count) ?? 5;
  if (count < 1 || count > MAX_COUNT) return fail(res, t0, 400, 'invalid_request', `"count" must be between 1 and ${MAX_COUNT}.`);
  const seed = str(req.body?.seed);
  const r = new Rng(seed);
  const opts = { min: num(req.body?.min), max: num(req.body?.max) };
  const rows: Record<string, GenValue>[] = [];
  for (let i = 0; i < count; i++) {
    const row: Record<string, GenValue> = {};
    for (const c of columns) row[c.name] = genOne(c.type, r, opts);
    rows.push(row);
  }
  respond(res, t0, {
    count, seed: seed ?? null, reproducible: seed !== undefined,
    columns, rows,
    reasoning: {
      why_result_generated: `Generated ${count} rows across ${columns.length} columns (${columns.map((c) => `${c.name}:${c.type}`).join(', ')})${seed ? ` from seed "${seed}"` : ' using the CSPRNG'}.`,
      key_factors: [`${columns.length} columns.`, `${count} rows.`, seed ? 'Seeded → reproducible.' : 'Unseeded → fresh each call.'],
      invalidators: ['All values are synthetic — they do not correspond to real people, accounts, or records.', 'Reproducibility holds only while the seed and column order are unchanged.'],
    },
    confidence_score: 1.0, confidence_per_section: { generation: 1 },
    recommended_actions_priority_order: [
      `Generated a ${count}×${columns.length} synthetic dataset${seed ? ' (reproducible)' : ''}.`,
      'Feed into tests, demos, or load fixtures; never persist as real customer data.',
    ],
    chain_to: chainTo(), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
