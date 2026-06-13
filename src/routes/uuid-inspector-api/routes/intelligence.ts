import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic UUID inspector + generator. /inspect validates a UUID and
// extracts its version, variant, embedded timestamp (v1/v6/v7), node (MAC) and
// clock sequence (v1/v6). /generate emits cryptographically-random v4 or
// time-ordered v7 UUIDs. Parsing is pure; generation uses a CSPRNG. No LLM,
// nothing stored.

const router = Router();
const RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// 100-ns intervals between the Gregorian epoch (1582-10-15) and the Unix epoch.
const GREGORIAN_OFFSET_100NS = 122192928000000000n;

const VERSION_DESC: Record<number, string> = {
  1: 'time-based (Gregorian timestamp + node)',
  2: 'DCE security (POSIX UID/GID)',
  3: 'name-based (MD5)',
  4: 'random',
  5: 'name-based (SHA-1)',
  6: 'reordered time-based',
  7: 'Unix-epoch time-ordered',
  8: 'custom / vendor-defined',
};

function variantDesc(n: number): string {
  if (n <= 0x7) return 'NCS (reserved, legacy Apollo)';
  if (n <= 0xb) return 'RFC 4122 / RFC 9562';
  if (n <= 0xd) return 'Microsoft (reserved)';
  return 'reserved (future)';
}

function normalize(s: string): string | null {
  let v = s.trim();
  if (v.toLowerCase().startsWith('urn:uuid:')) v = v.slice(9);
  if (v.startsWith('{') && v.endsWith('}')) v = v.slice(1, -1);
  v = v.toLowerCase();
  return RE.test(v) ? v : null;
}

function isoFromMs(ms: number): string | null {
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export interface InspectCore {
  input: string; canonical: string; valid: boolean;
  version: number | null; version_description: string;
  variant: number; variant_description: string;
  is_nil: boolean; is_max: boolean;
  timestamp: { iso: string | null; unix_ms: number } | null;
  node: { mac: string; is_multicast: boolean; is_locally_administered: boolean } | null;
  clock_sequence: number | null;
}

export function inspect(body: any): { error: string } | { result: InspectCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide { uuid }.' };
  if (typeof body.uuid !== 'string') return { error: '"uuid" must be a string.' };
  const hexDashed = normalize(body.uuid);
  if (hexDashed === null) return { error: 'Not a canonical UUID (expected 8-4-4-4-12 hex digits).' };
  const hex = hexDashed.replace(/-/g, '');

  const is_nil = hex === '0'.repeat(32);
  const is_max = hex === 'f'.repeat(32);
  const version = parseInt(hex[12], 16);
  const variant = parseInt(hex[16], 16);

  let timestamp: InspectCore['timestamp'] = null;
  let node: InspectCore['node'] = null;
  let clock_sequence: number | null = null;

  if (version === 1 || version === 6) {
    let ts100: bigint;
    if (version === 1) {
      const timeLow = BigInt('0x' + hex.slice(0, 8));
      const timeMid = BigInt('0x' + hex.slice(8, 12));
      const timeHi = BigInt('0x' + hex.slice(12, 16)) & 0x0fffn;
      ts100 = (timeHi << 48n) | (timeMid << 32n) | timeLow;
    } else {
      const timeHigh = BigInt('0x' + hex.slice(0, 8));
      const timeMid = BigInt('0x' + hex.slice(8, 12));
      const timeLow = BigInt('0x' + hex.slice(12, 16)) & 0x0fffn;
      ts100 = (timeHigh << 28n) | (timeMid << 12n) | timeLow;
    }
    const unixMs = Number((ts100 - GREGORIAN_OFFSET_100NS) / 10000n);
    timestamp = { iso: isoFromMs(unixMs), unix_ms: unixMs };
    const clkHi = parseInt(hex.slice(16, 18), 16);
    const clkLow = parseInt(hex.slice(18, 20), 16);
    clock_sequence = ((clkHi & 0x3f) << 8) | clkLow;
    const nodeHex = hex.slice(20, 32);
    const firstOctet = parseInt(nodeHex.slice(0, 2), 16);
    node = {
      mac: (nodeHex.match(/.{2}/g) as string[]).join(':'),
      is_multicast: (firstOctet & 0x01) === 1,
      is_locally_administered: (firstOctet & 0x02) === 2,
    };
  } else if (version === 7) {
    const unixMs = Number(BigInt('0x' + hex.slice(0, 12)));
    timestamp = { iso: isoFromMs(unixMs), unix_ms: unixMs };
  }

  return {
    result: {
      input: body.uuid, canonical: hexDashed, valid: true,
      version: is_nil || is_max ? null : version,
      version_description: is_nil ? 'nil UUID' : is_max ? 'max UUID' : (VERSION_DESC[version] ?? 'unknown'),
      variant, variant_description: variantDesc(variant),
      is_nil, is_max, timestamp, node, clock_sequence,
    },
  };
}

function fmt(b: Buffer): string {
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
function genV4(): string {
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  return fmt(b);
}
function genV7(nowMs: number): string {
  const b = randomBytes(16);
  const tb = Buffer.alloc(6);
  tb.writeUIntBE(nowMs, 0, 6);
  tb.copy(b, 0);
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  return fmt(b);
}

export interface GenerateCore { version: number; count: number; uuids: string[]; }

export function generate(body: any): { error: string } | { result: GenerateCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide { version, count? }.' };
  const version = body.version;
  if (version !== 4 && version !== 7) return { error: '"version" must be 4 or 7.' };
  let count = body.count === undefined ? 1 : body.count;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 100) return { error: '"count" must be an integer between 1 and 100.' };
  const now = Date.now();
  const uuids: string[] = [];
  for (let i = 0; i < count; i++) uuids.push(version === 4 ? genV4() : genV7(now));
  return { result: { version, count, uuids } };
}

const CHAIN_TO = [
  { api: 'radix-converter', reason: 'Render the 128-bit value in another base.' },
  { api: 'base-codec', reason: 'Encode the raw 16 bytes as base64/base58.' },
];
const INSPECT_INVALIDATORS = [
  'Embedded timestamps exist only for v1/v6/v7 — v4 is purely random and carries no time or MAC.',
  'A v1/v6 node may be a random or hashed value rather than a real MAC if the multicast bit is set; treat MACs as untrusted.',
  'The variant bits classify the layout, not the validity — a syntactically valid UUID can still be unregistered/garbage.',
];
const GEN_INVALIDATORS = [
  'v4 UUIDs are random; collision probability is negligible but non-zero. v7 embeds the current wall-clock time.',
  'Generation uses the server CSPRNG; outputs are non-deterministic by design and are never stored.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'UUID Inspector API', version: '1.0.0',
    description: 'Deterministic UUID inspector + generator. Validates a UUID and extracts version, variant, embedded timestamp (v1/v6/v7), node (MAC) and clock sequence; generates random v4 or time-ordered v7 UUIDs. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/uuid-inspector/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/inspect', summary: 'Inspect a UUID', price_usdc: 0.003 },
      { method: 'POST', path: '/generate', summary: 'Generate v4/v7 UUIDs', price_usdc: 0.003 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL inspect + reasoning', price_usdc: 0.006 },
    ],
    pricing: [
      { path: '/inspect', price_usdc: 0.003, currency: 'USDC' },
      { path: '/generate', price_usdc: 0.003, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.006, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const INSPECT_TAIL = (r: InspectCore) => ({
  confidence_score: 1, confidence_per_section: { structure: 1, timestamp: r.timestamp ? 1 : 0 },
  recommended_actions_priority_order: [
    r.is_nil || r.is_max ? `Special ${r.is_nil ? 'nil' : 'max'} UUID — no version/timestamp.` : `Version ${r.version} (${r.version_description}); variant ${r.variant_description}.`,
    r.timestamp ? `Embedded timestamp: ${r.timestamp.iso}.` : 'No embedded timestamp (random/name-based version).',
  ],
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/inspect', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = inspect(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...INSPECT_TAIL(r.result) });
});

router.post('/generate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = generate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 1, confidence_per_section: { generation: 1 },
    recommended_actions_priority_order: [
      `Generated ${r.result.count} v${r.result.version} UUID(s).`,
      r.result.version === 7 ? 'v7 is time-ordered — good as a sortable database key.' : 'v4 is fully random — use when ordering must not leak timing.',
    ],
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = inspect(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Parsed the canonical UUID and read its version nibble (${v.version ?? 'special'}) and variant bits.`,
      key_factors: [
        `Version ${v.version ?? '—'}: ${v.version_description}.`,
        `Variant: ${v.variant_description}.`,
        v.timestamp ? `Embedded time: ${v.timestamp.iso}.` : 'No embedded time.',
      ],
      invalidators: INSPECT_INVALIDATORS,
    },
    ...INSPECT_TAIL(v),
  });
});

export { GEN_INVALIDATORS };
export default router;
