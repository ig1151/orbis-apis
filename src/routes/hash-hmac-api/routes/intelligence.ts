import { Router, Request, Response } from 'express';
import { createHash, createHmac } from 'crypto';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic cryptographic digest service. /hash computes MD5/SHA-1/SHA-256/
// SHA-384/SHA-512 over input bytes; /hmac computes the keyed HMAC of the same.
// Input/key/output encodings are explicit so binary is handled losslessly. Uses
// Node's crypto primitives — no LLM, nothing stored, nothing logged.

const router = Router();
const ALGS = ['md5', 'sha1', 'sha256', 'sha384', 'sha512'] as const;
const IN_ENC = ['utf8', 'latin1', 'hex', 'base64', 'base64url'] as const;
const OUT_ENC = ['hex', 'base64', 'base64url'] as const;
type InEnc = (typeof IN_ENC)[number];
type OutEnc = (typeof OUT_ENC)[number];

function toBytes(data: string, enc: InEnc): { error: string } | { buf: Buffer } {
  switch (enc) {
    case 'utf8': return { buf: Buffer.from(data, 'utf8') };
    case 'latin1': return { buf: Buffer.from(data, 'latin1') };
    case 'hex':
      if (!/^[0-9a-fA-F]*$/.test(data) || data.length % 2 !== 0) return { error: 'hex input must be an even-length hex string.' };
      return { buf: Buffer.from(data, 'hex') };
    case 'base64':
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) return { error: 'base64 input contains characters outside the standard alphabet.' };
      return { buf: Buffer.from(data, 'base64') };
    case 'base64url':
      if (!/^[A-Za-z0-9_-]*$/.test(data)) return { error: 'base64url input contains characters outside the URL-safe alphabet.' };
      return { buf: Buffer.from(data, 'base64url') };
  }
}

function readEnc(v: unknown, def: InEnc, list: readonly string[], field: string): { error: string } | { enc: string } {
  if (v === undefined) return { enc: def };
  if (typeof v !== 'string' || !list.includes(v)) return { error: `"${field}" must be one of: ${list.join(', ')}.` };
  return { enc: v };
}

export interface HashCore { algorithm: string; output_encoding: OutEnc; input_byte_length: number; digest: string; digest_bits: number; }
export interface HmacCore extends HashCore { key_byte_length: number; }

export function doHash(body: any): { error: string } | { result: HashCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide { data, algorithm }.' };
  if (typeof body.data !== 'string') return { error: '"data" must be a string.' };
  if (!ALGS.includes(body.algorithm)) return { error: `"algorithm" must be one of: ${ALGS.join(', ')}.` };
  const ie = readEnc(body.input_encoding, 'utf8', IN_ENC, 'input_encoding');
  if ('error' in ie) return ie;
  const oe = readEnc(body.output_encoding, 'hex', OUT_ENC, 'output_encoding');
  if ('error' in oe) return oe;
  const b = toBytes(body.data, ie.enc as InEnc);
  if ('error' in b) return b;
  const digestBuf = createHash(body.algorithm).update(b.buf).digest();
  return {
    result: {
      algorithm: body.algorithm, output_encoding: oe.enc as OutEnc, input_byte_length: b.buf.length,
      digest: digestBuf.toString(oe.enc as OutEnc), digest_bits: digestBuf.length * 8,
    },
  };
}

export function doHmac(body: any): { error: string } | { result: HmacCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide { data, key, algorithm }.' };
  if (typeof body.data !== 'string') return { error: '"data" must be a string.' };
  if (typeof body.key !== 'string') return { error: '"key" must be a string.' };
  if (!ALGS.includes(body.algorithm)) return { error: `"algorithm" must be one of: ${ALGS.join(', ')}.` };
  const ie = readEnc(body.input_encoding, 'utf8', IN_ENC, 'input_encoding');
  if ('error' in ie) return ie;
  const ke = readEnc(body.key_encoding, 'utf8', IN_ENC, 'key_encoding');
  if ('error' in ke) return ke;
  const oe = readEnc(body.output_encoding, 'hex', OUT_ENC, 'output_encoding');
  if ('error' in oe) return oe;
  const b = toBytes(body.data, ie.enc as InEnc);
  if ('error' in b) return b;
  const k = toBytes(body.key, ke.enc as InEnc);
  if ('error' in k) return k;
  const digestBuf = createHmac(body.algorithm, k.buf).update(b.buf).digest();
  return {
    result: {
      algorithm: body.algorithm, output_encoding: oe.enc as OutEnc, input_byte_length: b.buf.length, key_byte_length: k.buf.length,
      digest: digestBuf.toString(oe.enc as OutEnc), digest_bits: digestBuf.length * 8,
    },
  };
}

const CHAIN_TO = [
  { api: 'base-codec', reason: 'Re-encode the digest bytes into another representation.' },
  { api: 'secret-scanner', reason: 'Check that the data being hashed is not itself a leaked secret.' },
];
const INVALIDATORS = [
  'MD5 and SHA-1 are broken for collision resistance — never use them for signatures or integrity against an adversary; they remain fine for checksums of trusted data.',
  'A bare hash is NOT a password hash; use a slow KDF (bcrypt/scrypt/argon2) for credentials. This service does no key stretching.',
  'The digest depends on the exact bytes — a different input_encoding (e.g. hex vs utf8) yields a completely different result.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Hash & HMAC API', version: '1.0.0',
    description: 'Deterministic cryptographic digests. /hash computes MD5/SHA-1/SHA-256/SHA-384/SHA-512; /hmac computes the keyed HMAC. Explicit input/key/output encodings for lossless binary. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/hash-hmac/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/hash', summary: 'Compute a message digest', price_usdc: 0.003 },
      { method: 'POST', path: '/hmac', summary: 'Compute a keyed HMAC', price_usdc: 0.003 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL hash (+ hmac if key) + reasoning', price_usdc: 0.006 },
    ],
    pricing: [
      { path: '/hash', price_usdc: 0.003, currency: 'USDC' },
      { path: '/hmac', price_usdc: 0.003, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.006, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (section: Record<string, number>, algo: string) => ({
  confidence_score: 1, confidence_per_section: section,
  recommended_actions_priority_order: [
    `Digest computed with ${algo}.`,
    algo === 'md5' || algo === 'sha1' ? 'Do not rely on this algorithm for security against collisions; prefer SHA-256+.' : 'Suitable for integrity checks; for passwords use a dedicated KDF instead.',
  ],
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/hash', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doHash(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL({ hash: 1 }, r.result.algorithm) });
});

router.post('/hmac', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doHmac(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL({ hmac: 1 }, r.result.algorithm) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doHash(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  let hmac: HmacCore | null = null;
  if (req.body && typeof req.body.key === 'string') {
    const hr = doHmac(req.body);
    if ('error' in hr) return fail(res, t0, 400, 'invalid_request', hr.error);
    hmac = hr.result;
  }
  const section: Record<string, number> = { hash: 1 };
  if (hmac) section.hmac = 1;
  respond(res, t0, {
    ...r.result, hmac,
    reasoning: {
      why_result_generated: `Computed the ${r.result.algorithm} digest over ${r.result.input_byte_length} byte(s)${hmac ? ' plus a keyed HMAC' : ''}.`,
      key_factors: [
        `Algorithm: ${r.result.algorithm} (${r.result.digest_bits}-bit).`,
        `Input length: ${r.result.input_byte_length} byte(s); output encoding: ${r.result.output_encoding}.`,
        hmac ? `HMAC computed with a ${hmac.key_byte_length}-byte key.` : 'No key supplied — plain digest only.',
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(section, r.result.algorithm),
  });
});

export default router;
