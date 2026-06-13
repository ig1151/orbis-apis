import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic integer radix (base) converter. Parses an arbitrary-precision
// integer in a source base (2–36) and re-renders it in a target base, plus its
// decimal value, bit length, and digit count. Uses BigInt — no precision loss.
// Pure functions, no LLM, nothing stored.

const router = Router();
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

function parseInBase(s: string, base: number): bigint | null {
  let str = s.trim();
  let neg = false;
  if (str.startsWith('-')) { neg = true; str = str.slice(1); }
  else if (str.startsWith('+')) str = str.slice(1);
  if (str.length === 0) return null;
  let n = 0n; const b = BigInt(base);
  for (const ch of str.toLowerCase()) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return null;
    n = n * b + BigInt(d);
  }
  return neg ? -n : n;
}

function renderInBase(n: bigint, base: number): string {
  if (n === 0n) return '0';
  const neg = n < 0n;
  let m = neg ? -n : n;
  const b = BigInt(base);
  let out = '';
  while (m > 0n) { out = DIGITS[Number(m % b)] + out; m /= b; }
  return (neg ? '-' : '') + out;
}

export interface RadixCore {
  from_base: number; to_base: number;
  output: string; output_upper: string;
  decimal: string; bit_length: number; digit_count: number; negative: boolean;
}

function intBase(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isInteger(v)) return null;
  if (v < 2 || v > 36) return null;
  return v;
}

export function convert(body: any): { error: string } | { result: RadixCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide { value, from_base, to_base }.' };
  if (typeof body.value !== 'string' && typeof body.value !== 'number') return { error: '"value" must be a string (or number) integer.' };
  const fromBase = intBase(body.from_base);
  const toBase = intBase(body.to_base);
  if (fromBase === null) return { error: '"from_base" must be an integer between 2 and 36.' };
  if (toBase === null) return { error: '"to_base" must be an integer between 2 and 36.' };
  const n = parseInBase(String(body.value), fromBase);
  if (n === null) return { error: `"value" is not a valid base-${fromBase} integer.` };

  const output = renderInBase(n, toBase);
  const mag = n < 0n ? -n : n;
  return {
    result: {
      from_base: fromBase, to_base: toBase,
      output, output_upper: output.toUpperCase(),
      decimal: n.toString(10),
      bit_length: mag === 0n ? 0 : mag.toString(2).length,
      digit_count: output.replace('-', '').length,
      negative: n < 0n,
    },
  };
}

const CHAIN_TO = [
  { api: 'base-codec', reason: 'Convert the underlying bytes between encodings (hex/base64/base58).' },
  { api: 'uuid-inspector', reason: 'If the value is a UUID rendered as a big integer, inspect its structure.' },
];
const INVALIDATORS = [
  'This converts integers only — fractional/decimal parts are not supported.',
  'Digit case is not significant on input (A–Z and a–z map to the same value); output is lowercase with an uppercase variant provided.',
  'Bases are limited to 2–36 because digits use 0–9 then a–z.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Radix Converter API', version: '1.0.0',
    description: 'Deterministic integer radix converter. Parses an arbitrary-precision integer in a source base (2–36) and re-renders it in a target base, with decimal value, bit length, and digit count. BigInt, no precision loss. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/radix-converter/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/convert', summary: 'Convert an integer between bases', price_usdc: 0.003 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL convert + reasoning', price_usdc: 0.006 },
    ],
    pricing: [
      { path: '/convert', price_usdc: 0.003, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.006, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = () => ({
  confidence_score: 1, confidence_per_section: { conversion: 1 },
  recommended_actions_priority_order: [
    'Conversion is exact (BigInt) and lossless for integers of any size.',
    'Use the decimal field as a canonical key when comparing values expressed in different bases.',
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
      why_result_generated: `Parsed a base-${v.from_base} integer (decimal ${v.decimal}) and rendered it in base-${v.to_base}.`,
      key_factors: [`Decimal value: ${v.decimal}.`, `Bit length: ${v.bit_length}.`, `Output digits: ${v.digit_count}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL(),
  });
});

export default router;
