import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';

// Deterministic password-strength analyzer. Computes the character-set search
// space, Shannon-style charset entropy (length × log2(pool)), guess counts, and
// crack-time estimates under stated attacker speeds, plus advisory warnings
// (common password, single charset, repeats, sequences, contains user input).
// Pure math + pattern checks — no LLM, no dictionary model beyond a tiny common
// list. The password is never stored (privacy.data_stored=false).

const router = Router();
const MAX_LEN = 4096;

// 32 ASCII punctuation chars + space share one pool of 33.
const COMMON = new Set([
  'password', 'password1', 'passw0rd', '123456', '12345678', '123456789', '1234567890',
  'qwerty', 'qwertyuiop', 'letmein', 'admin', 'welcome', 'iloveyou', 'monkey', 'dragon',
  'abc123', '111111', '000000', 'aa123456', 'football', 'sunshine', 'princess', 'master',
  'login', 'starwars', 'hello', 'whatever', 'trustno1', 'superman', 'batman', 'shadow',
]);

const LABELS = ['very weak', 'weak', 'fair', 'strong', 'very strong'] as const;
const SCENARIOS = [
  { key: 'online_throttled_100_per_sec', rate: 100 },
  { key: 'offline_slow_hash_1e4_per_sec', rate: 1e4 },
  { key: 'offline_fast_hash_1e10_per_sec', rate: 1e10 },
] as const;

export interface PwCore {
  length: number;
  charset_pool_size: number;
  charsets: { lowercase: boolean; uppercase: boolean; digits: boolean; symbols: boolean; other_unicode: boolean };
  entropy_bits: number;
  guesses_log10: number;
  crack_times: Record<string, string>;
  score: number;
  strength: string;
  is_common_password: boolean;
  warnings: string[];
  suggestions: string[];
}

function humanizeLog10Seconds(l: number): string {
  if (!Number.isFinite(l)) return 'effectively uncrackable';
  if (l < 0) return 'less than a second';
  if (l < 1.778) return 'seconds';        // < 60s
  if (l < 3.556) return 'minutes';        // < 1h
  if (l < 4.936) return 'hours';          // < 1d
  if (l < 6.498) return 'days';           // < ~1 month (2.6e6s)
  if (l < 7.499) return 'months';         // < 1y
  if (l < 9.499) return 'years';          // < 1 century
  if (l < 13.5) return 'centuries';
  return 'effectively uncrackable';
}

export function analyze(body: any): { error: string } | { result: PwCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "password" string.' };
  if (typeof body.password !== 'string') return { error: '"password" is required and must be a string.' };
  const password = body.password;
  if (password.length === 0) return { error: '"password" must not be empty.' };
  if (password.length > MAX_LEN) return { error: `"password" exceeds the ${MAX_LEN}-character limit.` };

  let userInputs: string[] = [];
  if (body.user_inputs !== undefined) {
    if (!Array.isArray(body.user_inputs) || body.user_inputs.some((x: unknown) => typeof x !== 'string')) return { error: '"user_inputs" must be an array of strings if provided.' };
    userInputs = body.user_inputs.map((s: string) => s.toLowerCase()).filter((s: string) => s.length >= 3);
  }

  const cs = { lowercase: false, uppercase: false, digits: false, symbols: false, other_unicode: false };
  for (const ch of password) {
    const c = ch.codePointAt(0)!;
    if (c >= 97 && c <= 122) cs.lowercase = true;
    else if (c >= 65 && c <= 90) cs.uppercase = true;
    else if (c >= 48 && c <= 57) cs.digits = true;
    else if (c >= 0x20 && c <= 0x7e) cs.symbols = true;
    else cs.other_unicode = true;
  }
  const charset_pool_size =
    (cs.lowercase ? 26 : 0) + (cs.uppercase ? 26 : 0) + (cs.digits ? 10 : 0) +
    (cs.symbols ? 33 : 0) + (cs.other_unicode ? 100 : 0);

  const length = [...password].length;
  const entropy_bits = charset_pool_size > 0 ? round(length * Math.log2(charset_pool_size), 2) : 0;
  const guesses_log10 = round(entropy_bits * Math.log10(2), 2);

  const crack_times: Record<string, string> = {};
  for (const s of SCENARIOS) {
    // average guesses to crack = half the keyspace; log10(0.5) = -0.30103
    const secondsLog10 = guesses_log10 - 0.30103 - Math.log10(s.rate);
    crack_times[s.key] = humanizeLog10Seconds(secondsLog10);
  }

  const lower = password.toLowerCase();
  const is_common_password = COMMON.has(lower);

  const warnings: string[] = [];
  if (is_common_password) warnings.push('This is one of the most common passwords and would be guessed almost instantly.');
  const distinctSets = [cs.lowercase, cs.uppercase, cs.digits, cs.symbols, cs.other_unicode].filter(Boolean).length;
  if (distinctSets === 1) warnings.push('Uses a single character set — mixing case, digits, and symbols sharply increases the search space.');
  if (length < 8) warnings.push('Shorter than 8 characters — length is the strongest lever on strength.');
  if (/(.)\1\1/.test(password)) warnings.push('Contains a character repeated 3+ times in a row, which attackers test early.');
  if (hasSequence(lower)) warnings.push('Contains a sequential run (e.g. "abc" or "123") that dictionary attacks try first.');
  if (/^\d+$/.test(password)) warnings.push('All digits — only a 10-symbol search space.');
  for (const u of userInputs) {
    if (lower.includes(u)) { warnings.push('Contains user-related text (name/email/site) — these are tried first in targeted attacks.'); break; }
  }

  // Score from charset entropy; cap hard when the password is trivially guessable.
  let score: number;
  if (entropy_bits < 28) score = 0;
  else if (entropy_bits < 36) score = 1;
  else if (entropy_bits < 60) score = 2;
  else if (entropy_bits < 128) score = 3;
  else score = 4;
  if (is_common_password) score = 0;

  const suggestions: string[] = [];
  if (score < 3) {
    if (length < 16) suggestions.push('Increase length to 16+ characters (e.g. a passphrase) — the single most effective change.');
    if (!cs.symbols) suggestions.push('Add symbols to widen the character pool.');
    if (!(cs.uppercase && cs.lowercase)) suggestions.push('Mix upper- and lower-case letters.');
    if (!cs.digits) suggestions.push('Add digits.');
  }
  if (suggestions.length === 0) suggestions.push('Strong as analyzed; ensure it is unique to this account and stored in a password manager.');

  return {
    result: {
      length, charset_pool_size, charsets: cs, entropy_bits, guesses_log10, crack_times,
      score, strength: LABELS[score], is_common_password, warnings, suggestions,
    },
  };
}

function hasSequence(s: string): boolean {
  for (let i = 0; i + 2 < s.length; i++) {
    const a = s.charCodeAt(i), b = s.charCodeAt(i + 1), c = s.charCodeAt(i + 2);
    if (b - a === 1 && c - b === 1) return true;   // ascending abc / 123
    if (a - b === 1 && b - c === 1) return true;   // descending cba / 321
  }
  return false;
}

function actions(r: PwCore): string[] {
  const out = [`Strength: ${r.strength} (score ${r.score}/4, ${r.entropy_bits} bits of charset entropy).`];
  if (r.warnings.length) out.push(`Address: ${r.warnings[0]}`);
  out.push(r.suggestions[0]);
  out.push(`A fast offline attacker (10^10 guesses/sec) needs ${r.crack_times['offline_fast_hash_1e10_per_sec']} to exhaust the keyspace.`);
  return out;
}

const CHAIN_TO = [
  { api: 'passphrase-generator', reason: 'Generate a high-entropy replacement passphrase if this password scores low.' },
  { api: 'secret-scanner', reason: 'Check that this password is not hard-coded or leaked in your codebase.' },
];
const INVALIDATORS = [
  'Entropy here is the brute-force charset search space (length × log2(pool)); it does NOT model dictionary, keyboard-walk, or leaked-password attacks, so a high-entropy-looking password can still be weak if it is a known/leaked phrase.',
  'Crack times assume the stated guesses/sec and that the attacker knows the exact character pool; a slower KDF (bcrypt/argon2) or rate-limiting changes them dramatically.',
  'Common-password detection uses a tiny built-in list, not a full breach corpus.',
];

function tail(r: PwCore) {
  return {
    confidence_score: 0.9,
    confidence_per_section: { strength: 0.9, crack_time: 0.8 },
    recommended_actions_priority_order: actions(r),
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Password Strength Analyzer API', version: '1.0.0',
    description: 'Deterministic password-strength analyzer. Computes the character-set search space, charset entropy (length × log2(pool)), guess counts, and crack-time estimates under stated attacker speeds, plus advisory warnings and suggestions. The password is never stored. No LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/password-strength-analyzer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/analyze', summary: 'Analyze password strength', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL analysis + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/analyze', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/analyze', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = analyze(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...tail(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = analyze(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.length}-char password over a ${v.charset_pool_size}-symbol pool → ${v.entropy_bits} bits → score ${v.score}/4 (${v.strength}).`,
      key_factors: [
        `Pool ${v.charset_pool_size} from charsets: ${Object.entries(v.charsets).filter(([, on]) => on).map(([k]) => k).join(', ') || 'none'}.`,
        `Entropy ${v.entropy_bits} bits (~10^${v.guesses_log10} guesses).`,
        v.is_common_password ? 'Matched the common-password list — score forced to 0.' : `${v.warnings.length} warning(s).`,
      ],
      invalidators: INVALIDATORS,
    },
    ...tail(v),
  });
});

export default router;
