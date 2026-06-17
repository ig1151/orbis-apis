import { Router, Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic checksum / hash digest calculator. /hash computes CRC-32, Adler-32,
// MD5, SHA-1, SHA-256 and SHA-512 over the supplied bytes; /verify recomputes one
// algorithm and compares it (case-insensitively) against an expected digest. Bytes are
// read from a UTF-8/base64/hex string. Pure computation — no LLM, nothing stored.

const router = Router();

const MAX_INPUT_LEN = 5_000_000; // characters of the input string
const CRYPTO_ALGOS = ['md5', 'sha1', 'sha256', 'sha512'] as const;
const ALL_ALGOS = ['crc32', 'adler32', ...CRYPTO_ALGOS] as const;
type Algo = (typeof ALL_ALGOS)[number];
const ALGO_SET = new Set<string>(ALL_ALGOS);

// CRC-32 (IEEE 802.3, reflected, polynomial 0xEDB88320) → 8-char lowercase hex.
function crc32Hex(buf: Buffer): string {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

// Adler-32 (zlib) → 8-char lowercase hex.
function adler32Hex(buf: Buffer): string {
  let a = 1, b = 0;
  const MOD = 65521;
  for (let i = 0; i < buf.length; i++) { a = (a + buf[i]) % MOD; b = (b + a) % MOD; }
  return (((b << 16) | a) >>> 0).toString(16).padStart(8, '0');
}

function digest(algo: Algo, buf: Buffer): string {
  if (algo === 'crc32') return crc32Hex(buf);
  if (algo === 'adler32') return adler32Hex(buf);
  return createHash(algo).update(buf).digest('hex');
}

type Encoding = 'utf8' | 'base64' | 'hex';

function readBytes(text: unknown, encodingRaw: unknown): { error: string } | { buf: Buffer; encoding: Encoding } {
  if (typeof text !== 'string') return { error: '"text" must be a string.' };
  if (text.length > MAX_INPUT_LEN) return { error: `"text" exceeds the ${MAX_INPUT_LEN}-character limit.` };
  let encoding: Encoding = 'utf8';
  if (encodingRaw !== undefined) {
    if (encodingRaw !== 'utf8' && encodingRaw !== 'base64' && encodingRaw !== 'hex') return { error: '"encoding" must be one of "utf8", "base64", "hex".' };
    encoding = encodingRaw;
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(text, encoding);
  } catch {
    return { error: `"text" is not valid ${encoding}.` };
  }
  // Buffer.from is lenient with base64/hex; round-trip check to reject malformed input.
  if (encoding === 'hex' && buf.toString('hex') !== text.toLowerCase()) return { error: '"text" is not valid hex.' };
  return { buf, encoding };
}

function readAlgos(raw: unknown): { error: string } | { algos: Algo[] } {
  if (raw === undefined) return { algos: [...ALL_ALGOS] };
  if (!Array.isArray(raw) || raw.length === 0) return { error: '"algorithms" must be a non-empty array.' };
  const out: Algo[] = [];
  for (const a of raw) {
    if (typeof a !== 'string' || !ALGO_SET.has(a)) return { error: `"algorithms" must be a subset of ${ALL_ALGOS.join(', ')}.` };
    if (!out.includes(a as Algo)) out.push(a as Algo);
  }
  return { algos: out };
}

export interface HashCore { byte_length: number; encoding: Encoding; hashes: Record<string, string> }

const CHAIN_TO = [
  { api: 'sensitive-data-detector', reason: 'Scan the same payload for PII before persisting or transmitting it.' },
  { api: 'json-patch', reason: 'Verify a document is unchanged by comparing checksums before and after a patch.' },
];
const INVALIDATORS = [
  'Digests are computed over the exact bytes decoded from "text" using "encoding" (default utf8). The same logical content under a different encoding yields different bytes and thus different digests.',
  'CRC-32 (IEEE reflected, poly 0xEDB88320) and Adler-32 are error-detection checksums, NOT cryptographic — do not use them for integrity against tampering or for security. MD5 and SHA-1 are cryptographically broken; prefer SHA-256/SHA-512 for security-sensitive integrity.',
  'All digests are lowercase hex. Verification compares hex case-insensitively after stripping surrounding whitespace; a leading "0x" in the expected value is not stripped.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

const DISCOVERY = {
  name: 'Checksum & Hash API', version: '1.0.0',
  description: 'Deterministic checksum & hash digest calculator. /hash computes CRC-32, Adler-32, MD5, SHA-1, SHA-256 and SHA-512 over the supplied bytes (utf8/base64/hex input); /verify recomputes one algorithm and compares it against an expected digest. Pure computation — no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/checksum/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['crc32', 'adler32', 'cryptographic_hash', 'digest_verification', 'multi_algorithm'],
  endpoints: [
    { method: 'POST', path: '/hash', summary: 'Compute checksums/digests over the input', price_usdc: 0.005 },
    { method: 'POST', path: '/verify', summary: 'Recompute one algorithm and compare to an expected digest', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL digests + reasoning', price_usdc: 0.01 },
  ],
  pricing: [
    { path: '/hash', price_usdc: 0.005, currency: 'USDC' },
    { path: '/verify', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

function hashAll(buf: Buffer, encoding: Encoding, algos: Algo[]): HashCore {
  const hashes: Record<string, string> = {};
  for (const a of algos) hashes[a] = digest(a, buf);
  return { byte_length: buf.length, encoding, hashes };
}

router.post('/hash', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "text" string.');
  const r = readBytes(b.text, b.encoding);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const a = readAlgos(b.algorithms);
  if ('error' in a) return fail(res, t0, 400, 'invalid_request', a.error);
  const core = hashAll(r.buf, r.encoding, a.algos);
  respond(res, t0, { ...core, ...TAIL({ computation: 1 }, [`Computed ${a.algos.length} digest(s) over ${core.byte_length} byte(s).`]) });
});

router.post('/verify', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide "text", "algorithm" and "expected".');
  const r = readBytes(b.text, b.encoding);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  if (typeof b.algorithm !== 'string' || !ALGO_SET.has(b.algorithm)) return fail(res, t0, 400, 'invalid_request', `"algorithm" must be one of ${ALL_ALGOS.join(', ')}.`);
  if (typeof b.expected !== 'string') return fail(res, t0, 400, 'invalid_request', '"expected" must be a hex string.');
  const algorithm = b.algorithm as Algo;
  const computed = digest(algorithm, r.buf);
  const expected_normalized = b.expected.trim().toLowerCase();
  const match = computed === expected_normalized;
  respond(res, t0, {
    algorithm, encoding: r.encoding, byte_length: r.buf.length, computed, expected_normalized, match,
    ...TAIL({ computation: 1, verification: 1 }, [match ? `Digest matches the expected ${algorithm} value.` : `Digest does NOT match — expected ${expected_normalized}, computed ${computed}.`]),
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "text" string.');
  const r = readBytes(b.text, b.encoding);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const a = readAlgos(b.algorithms);
  if ('error' in a) return fail(res, t0, 400, 'invalid_request', a.error);
  const core = hashAll(r.buf, r.encoding, a.algos);
  respond(res, t0, {
    ...core,
    reasoning: {
      why_result_generated: `Decoded ${core.byte_length} byte(s) from the ${core.encoding} input and computed ${a.algos.length} digest(s): ${a.algos.join(', ')}.`,
      key_factors: [`Byte length: ${core.byte_length}.`, `Encoding: ${core.encoding}.`, `Algorithms: ${a.algos.join(', ')}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ computation: 1 }, [`Computed ${a.algos.length} digest(s) over ${core.byte_length} byte(s).`]),
  });
});

export default router;
