import { Router, Request, Response } from 'express';
import { randomUUID, randomBytes } from 'crypto';
import { respond, fail } from '../../_aplus/scaffold';

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const MAX = 1000;

// ---- ULID (Crockford base32, 48-bit time + 80-bit randomness) --------------
const ENC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function encodeTime(ms: number, len = 10): string {
  let out = '';
  for (let i = len - 1; i >= 0; i--) { const mod = ms % 32; out = ENC[mod] + out; ms = (ms - mod) / 32; }
  return out;
}
function encodeRandom(len = 16): string {
  const b = randomBytes(len); let out = '';
  for (let i = 0; i < len; i++) out += ENC[b[i] % 32];
  return out;
}
function ulid(ms: number): string { return encodeTime(ms, 10) + encodeRandom(16); }

function clampCount(raw: unknown): number | null {
  if (raw === undefined) return 1;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > MAX) return null;
  return raw;
}

const COLLISION_NOTE = {
  uuid: 'UUID v4 has 122 bits of randomness; collision probability is negligible (~1 in 2.7e18 per billion IDs).',
  ulid: 'ULID has 80 bits of randomness per millisecond; within the same ms collisions are ~1 in 1.2e24.',
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'UUID/ULID Batch Generator API', version: '1.0.0',
    description: 'Cryptographically-random UUID v4 and lexicographically-sortable ULID generation in batches. Real crypto RNG — no estimation.',
    openapi_url: 'https://orbis-apis.onrender.com/uuid-ulid-generator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/uuid', summary: 'Generate a batch of UUID v4', price_usdc: 0.0005 },
      { method: 'POST', path: '/ulid', summary: 'Generate a batch of sortable ULIDs', price_usdc: 0.0005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: generate by format with metadata + recommendations', price_usdc: 0.001 },
    ],
    pricing: [
      { path: '/uuid', price_usdc: 0.0005, currency: 'USDC' },
      { path: '/ulid', price_usdc: 0.0005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.001, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/uuid', (req: Request, res: Response) => {
  const t0 = Date.now();
  const count = clampCount(req.body?.count);
  if (count === null) return fail(res, t0, 400, 'invalid_count', `"count" must be an integer 1–${MAX}.`);
  const ids = Array.from({ length: count }, () => randomUUID());
  respond(res, t0, {
    format: 'uuid', version: 'v4', count, ids,
    sortable: false, collision_note: COLLISION_NOTE.uuid,
    confidence_score: 1.0,
    recommended_actions_priority_order: ['Use as random primary keys or idempotency keys.', 'For time-sortable keys use /ulid instead.'],
    chain_to: [],
    privacy: PRIVACY,
  });
});

router.post('/ulid', (req: Request, res: Response) => {
  const t0 = Date.now();
  const count = clampCount(req.body?.count);
  if (count === null) return fail(res, t0, 400, 'invalid_count', `"count" must be an integer 1–${MAX}.`);
  const now = Date.now();
  const ids = Array.from({ length: count }, () => ulid(now));
  respond(res, t0, {
    format: 'ulid', version: 'ulid', count, ids,
    sortable: true, collision_note: COLLISION_NOTE.ulid,
    confidence_score: 1.0,
    recommended_actions_priority_order: ['Use as lexicographically-sortable, time-ordered keys.', 'IDs share the current timestamp prefix; ordering within a batch is by random suffix.'],
    chain_to: [],
    privacy: PRIVACY,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const format = req.body?.format ?? 'uuid';
  if (format !== 'uuid' && format !== 'ulid') return fail(res, t0, 400, 'invalid_format', '"format" must be "uuid" or "ulid".');
  const count = clampCount(req.body?.count);
  if (count === null) return fail(res, t0, 400, 'invalid_count', `"count" must be an integer 1–${MAX}.`);
  const now = Date.now();
  const ids = format === 'uuid'
    ? Array.from({ length: count }, () => randomUUID())
    : Array.from({ length: count }, () => ulid(now));
  respond(res, t0, {
    format, version: format === 'uuid' ? 'v4' : 'ulid', count, ids,
    sortable: format === 'ulid',
    collision_note: COLLISION_NOTE[format as 'uuid' | 'ulid'],
    reasoning: {
      why_result_generated: `Generated ${count} ${format.toUpperCase()} value(s) from a cryptographic RNG.`,
      key_factors: [format === 'uuid' ? '122 bits of randomness' : '80 bits randomness + 48-bit ms timestamp', `batch size ${count}`],
      invalidators: ['Requesting more than the per-call max.', 'Needing monotonic ordering within the same millisecond (not guaranteed).'],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      format === 'ulid' ? 'Use ULIDs when you need sortable, time-ordered identifiers.' : 'Use UUIDs when you need opaque, unordered identifiers.',
      'Persist returned IDs; this endpoint stores nothing.',
    ],
    chain_to: [],
    privacy: PRIVACY,
  });
});

export default router;
