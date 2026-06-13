import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic universal byte codec. Decodes `data` from a source encoding into
// raw bytes, then re-encodes those bytes into a target encoding. Supports text
// (utf8/ascii/latin1), hex, base64, base64url, base58 (Bitcoin alphabet), and
// base32 (RFC 4648). Pure functions, no LLM, nothing stored.

const router = Router();

export type Encoding = 'utf8' | 'ascii' | 'latin1' | 'hex' | 'base64' | 'base64url' | 'base58' | 'base32';
const ENCODINGS: Encoding[] = ['utf8', 'ascii', 'latin1', 'hex', 'base64', 'base64url', 'base58', 'base32'];

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function b58encode(buf: Buffer): string {
  let zeros = 0;
  while (zeros < buf.length && buf[zeros] === 0) zeros++;
  let n = 0n;
  for (const b of buf) n = n * 256n + BigInt(b);
  let out = '';
  while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n; }
  return '1'.repeat(zeros) + out;
}
function b58decode(str: string): Buffer | null {
  let zeros = 0;
  while (zeros < str.length && str[zeros] === '1') zeros++;
  let n = 0n;
  for (const ch of str) { const i = B58.indexOf(ch); if (i < 0) return null; n = n * 58n + BigInt(i); }
  const bytes: number[] = [];
  while (n > 0n) { bytes.unshift(Number(n % 256n)); n /= 256n; }
  return Buffer.from([...Array(zeros).fill(0), ...bytes]);
}
function b32encode(buf: Buffer): string {
  let bits = 0, val = 0, out = '';
  for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  while (out.length % 8 !== 0) out += '=';
  return out;
}
function b32decode(str: string): Buffer | null {
  const s = str.replace(/=+$/, '').toUpperCase();
  let bits = 0, val = 0; const bytes: number[] = [];
  for (const ch of s) { const i = B32.indexOf(ch); if (i < 0) return null; val = (val << 5) | i; bits += 5; if (bits >= 8) { bytes.push((val >>> (bits - 8)) & 0xff); bits -= 8; } }
  return Buffer.from(bytes);
}

function toBytes(data: string, enc: Encoding): { error: string } | { buf: Buffer } {
  switch (enc) {
    case 'utf8': return { buf: Buffer.from(data, 'utf8') };
    case 'ascii':
      if (!/^[\x00-\x7F]*$/.test(data)) return { error: 'ascii input contains non-ASCII characters (code point > 127).' };
      return { buf: Buffer.from(data, 'latin1') };
    case 'latin1':
      if (![...data].every((c) => c.charCodeAt(0) <= 0xff)) return { error: 'latin1 input contains characters above code point 255.' };
      return { buf: Buffer.from(data, 'latin1') };
    case 'hex':
      if (!/^[0-9a-fA-F]*$/.test(data)) return { error: 'hex input contains non-hex characters.' };
      if (data.length % 2 !== 0) return { error: 'hex input must have an even number of digits.' };
      return { buf: Buffer.from(data, 'hex') };
    case 'base64':
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) return { error: 'base64 input contains characters outside the standard alphabet.' };
      return { buf: Buffer.from(data, 'base64') };
    case 'base64url':
      if (!/^[A-Za-z0-9_-]*$/.test(data)) return { error: 'base64url input contains characters outside the URL-safe alphabet.' };
      return { buf: Buffer.from(data, 'base64url') };
    case 'base58': {
      const b = b58decode(data);
      if (b === null) return { error: 'base58 input contains characters outside the Bitcoin base58 alphabet.' };
      return { buf: b };
    }
    case 'base32': {
      const b = b32decode(data);
      if (b === null) return { error: 'base32 input contains characters outside the RFC 4648 alphabet.' };
      return { buf: b };
    }
  }
}

function fromBytes(buf: Buffer, enc: Encoding): string {
  switch (enc) {
    case 'utf8': return buf.toString('utf8');
    case 'ascii':
    case 'latin1': return buf.toString('latin1');
    case 'hex': return buf.toString('hex');
    case 'base64': return buf.toString('base64');
    case 'base64url': return buf.toString('base64url');
    case 'base58': return b58encode(buf);
    case 'base32': return b32encode(buf);
  }
}

export interface ConvertCore { from: Encoding; to: Encoding; byte_length: number; output: string; }

export function convert(body: any): { error: string } | { result: ConvertCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide { data, from, to }.' };
  if (typeof body.data !== 'string') return { error: '"data" must be a string.' };
  const from = body.from, to = body.to;
  if (!ENCODINGS.includes(from)) return { error: `"from" must be one of: ${ENCODINGS.join(', ')}.` };
  if (!ENCODINGS.includes(to)) return { error: `"to" must be one of: ${ENCODINGS.join(', ')}.` };
  const r = toBytes(body.data, from);
  if ('error' in r) return r;
  return { result: { from, to, byte_length: r.buf.length, output: fromBytes(r.buf, to) } };
}

const CHAIN_TO = [
  { api: 'hash-hmac', reason: 'Hash or HMAC the decoded bytes.' },
  { api: 'jwt-decoder', reason: 'If the base64url payload is a JWT, decode its claims.' },
];
const INVALIDATORS = [
  'Text encodings (utf8/ascii/latin1) are lossy for arbitrary bytes — round-tripping binary through utf8 can corrupt it; use hex/base64 for binary.',
  'base64 decoding is tolerant of missing padding; the byte_length reflects the actual decoded bytes, not the input string length.',
  'base58 has no fixed block size, so leading zero bytes are preserved as leading "1" characters by convention.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Base Codec API', version: '1.0.0',
    description: 'Deterministic universal byte codec. Decodes data from a source encoding into raw bytes, then re-encodes to a target encoding. Supports utf8/ascii/latin1, hex, base64, base64url, base58 (Bitcoin), base32 (RFC 4648). No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/base-codec/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/convert', summary: 'Convert data between encodings', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL convert + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/convert', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = () => ({
  confidence_score: 1, confidence_per_section: { conversion: 1 },
  recommended_actions_priority_order: [
    'Conversion is exact and reversible for binary-safe encodings (hex/base64/base64url/base58/base32).',
    'Prefer hex or base64 over text encodings when the bytes are not guaranteed to be valid text.',
  ],
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/convert', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = convert(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL() });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = convert(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Decoded ${v.byte_length} byte(s) from ${v.from}, then re-encoded to ${v.to}.`,
      key_factors: [`Source encoding: ${v.from}.`, `Target encoding: ${v.to}.`, `Decoded length: ${v.byte_length} byte(s).`],
      invalidators: INVALIDATORS,
    },
    ...TAIL(),
  });
});

export default router;
