import { Router, Request, Response } from 'express';
import { randomInt } from 'crypto';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';
import { WORDS } from './wordlist';

// Diceware-style passphrase generator. Picks words uniformly at random from a
// curated list using a CSPRNG (crypto.randomInt — rejection-sampled, unbiased),
// then reports the exact entropy (words × log2(list_size), plus log2(10) per
// appended digit). Generation is random per call; the entropy math is exact and
// deterministic. No LLM. Nothing is stored.

const router = Router();
const LIST_SIZE = WORDS.length;
const PER_WORD_BITS = Math.log2(LIST_SIZE);

export interface PassphraseCore {
  passphrases: string[];
  count: number;
  words: number;
  separator: string;
  capitalize: boolean;
  include_number: boolean;
  list_size: number;
  entropy_bits_per_word: number;
  entropy_bits: number;
  strength: string;
}

function strengthFor(bits: number): string {
  if (bits < 40) return 'weak';
  if (bits < 60) return 'fair';
  if (bits < 80) return 'strong';
  return 'very strong';
}

export function generate(body: any): { error: string } | { result: PassphraseCore } {
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  const words = b.words === undefined ? 6 : b.words;
  if (typeof words !== 'number' || !Number.isInteger(words) || words < 3 || words > 20) return { error: '"words" must be an integer between 3 and 20 (default 6).' };

  const count = b.count === undefined ? 1 : b.count;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 50) return { error: '"count" must be an integer between 1 and 50 (default 1).' };

  let separator = b.separator === undefined ? '-' : b.separator;
  if (typeof separator !== 'string' || separator.length > 4) return { error: '"separator" must be a string of at most 4 characters (default "-").' };

  const capitalize = b.capitalize === undefined ? false : b.capitalize;
  if (typeof capitalize !== 'boolean') return { error: '"capitalize" must be a boolean.' };
  const include_number = b.include_number === undefined ? false : b.include_number;
  if (typeof include_number !== 'boolean') return { error: '"include_number" must be a boolean.' };

  const passphrases: string[] = [];
  for (let n = 0; n < count; n++) {
    const picked: string[] = [];
    for (let i = 0; i < words; i++) {
      let w = WORDS[randomInt(0, LIST_SIZE)];
      if (capitalize) w = w.charAt(0).toUpperCase() + w.slice(1);
      picked.push(w);
    }
    let phrase = picked.join(separator);
    if (include_number) phrase += separator + String(randomInt(0, 10));
    passphrases.push(phrase);
  }

  const entropy_bits = round(words * PER_WORD_BITS + (include_number ? Math.log2(10) : 0), 2);

  return {
    result: {
      passphrases, count, words, separator, capitalize, include_number,
      list_size: LIST_SIZE, entropy_bits_per_word: round(PER_WORD_BITS, 2),
      entropy_bits, strength: strengthFor(entropy_bits),
    },
  };
}

function actions(r: PassphraseCore): string[] {
  return [
    `Use one of the ${r.count} generated passphrase(s); each carries ${r.entropy_bits} bits of entropy (${r.strength}).`,
    r.entropy_bits < 60 ? `Increase "words" (currently ${r.words}) to raise entropy — each word adds ~${r.entropy_bits_per_word} bits.` : 'Entropy is sufficient for high-value accounts; store it in a password manager.',
    'Never reuse a passphrase across accounts, even a strong one.',
  ];
}

const CHAIN_TO = [
  { api: 'password-strength-analyzer', reason: 'Score the chosen passphrase against attacker models before adopting it.' },
  { api: 'totp-hotp-generator', reason: 'Pair the passphrase with a TOTP second factor.' },
];
const INVALIDATORS = [
  `Entropy assumes uniform random selection from the ${LIST_SIZE}-word list; if you hand-pick or filter the output you lose entropy.`,
  'Capitalizing the first letter is a fixed transform and adds no entropy; only "words" and "include_number" change the bit count.',
  'A passphrase is only as safe as where you store and transmit it.',
];

function tail(r: PassphraseCore) {
  return {
    confidence_score: 1, confidence_per_section: { strength: 1 },
    recommended_actions_priority_order: actions(r),
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Passphrase Generator API', version: '1.0.0',
    description: `Diceware-style passphrase generator. Picks words uniformly at random from a curated ${LIST_SIZE}-word list using a CSPRNG, then reports the exact entropy (words × log2(list_size)). Generation is random; the entropy math is exact. No LLM, nothing stored.`,
    openapi_url: 'https://orbis-apis.onrender.com/passphrase-generator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/generate', summary: 'Generate passphrase(s)', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL generate + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/generate', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/generate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = generate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...tail(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = generate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.words} words drawn uniformly from a ${v.list_size}-word list${v.include_number ? ' plus one random digit' : ''} → ${v.entropy_bits} bits (${v.strength}).`,
      key_factors: [`List size ${v.list_size} → ${v.entropy_bits_per_word} bits/word.`, `${v.words} words${v.include_number ? ' + digit (+3.32 bits)' : ''}.`, `Separator "${v.separator}", capitalize=${v.capitalize}.`],
      invalidators: INVALIDATORS,
    },
    ...tail(v),
  });
});

export default router;
