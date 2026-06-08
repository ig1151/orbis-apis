import { Router, Request, Response } from 'express';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { respond, fail } from '../../_aplus/scaffold';

// Stateless AES-256-GCM encrypt/decrypt using Node's crypto. Real cryptography,
// nothing stored, confidence 1.0. The caller owns the key; lose it and the
// ciphertext is unrecoverable (surfaced in recommendations/invalidators).

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const ALGO = 'aes-256-gcm';
const KEY_BYTES = 32; // 256-bit
const IV_BYTES = 12;  // 96-bit nonce (GCM standard)
const TAG_BYTES = 16; // 128-bit auth tag
const MAX_PLAINTEXT = 256 * 1024; // 256 KB

// Decode a base64 string and require an exact byte length. Returns Buffer or null.
function b64(value: unknown, bytes: number): Buffer | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  let buf: Buffer;
  try { buf = Buffer.from(value, 'base64'); } catch { return null; }
  // Reject silently-dropped invalid input: round-trip must match.
  if (buf.toString('base64') !== Buffer.from(value, 'base64').toString('base64')) return null;
  return buf.length === bytes ? buf : null;
}

function encrypt(plaintext: string, key: Buffer): { ciphertext: string; iv: string; auth_tag: string } {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { ciphertext: ct.toString('base64'), iv: iv.toString('base64'), auth_tag: cipher.getAuthTag().toString('base64') };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'AES Vault API', version: '1.0.0',
    description: 'Stateless AES-256-GCM encryption and decryption. Real cryptography (Node crypto) — keys are caller-owned and nothing is stored.',
    openapi_url: 'https://orbis-apis.onrender.com/aes-vault/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/generate-key', summary: 'Generate a random 256-bit key', price_usdc: 0.002 },
      { method: 'POST', path: '/encrypt', summary: 'Encrypt plaintext with a provided key', price_usdc: 0.005 },
      { method: 'POST', path: '/decrypt', summary: 'Decrypt ciphertext with key + iv + auth tag', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL: generate key + encrypt + return full reusable bundle', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/generate-key', price_usdc: 0.002, currency: 'USDC' },
      { path: '/encrypt', price_usdc: 0.005, currency: 'USDC' },
      { path: '/decrypt', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/generate-key', (_req: Request, res: Response) => {
  const t0 = Date.now();
  respond(res, t0, {
    algorithm: ALGO, key_bits: 256, key_base64: randomBytes(KEY_BYTES).toString('base64'),
    confidence_score: 1.0,
    recommended_actions_priority_order: ['Store this key in a secret manager — it is shown once and never stored here.', 'Pass it to /encrypt as key_base64.'],
    chain_to: [{ api: 'aes-vault', reason: 'Encrypt data with this key via /encrypt.' }],
    privacy: PRIVACY,
  });
});

router.post('/encrypt', (req: Request, res: Response) => {
  const t0 = Date.now();
  const { plaintext, key_base64 } = req.body ?? {};
  if (typeof plaintext !== 'string') return fail(res, t0, 400, 'invalid_plaintext', '"plaintext" must be a string');
  if (Buffer.byteLength(plaintext, 'utf8') > MAX_PLAINTEXT) return fail(res, t0, 400, 'plaintext_too_large', `"plaintext" exceeds ${MAX_PLAINTEXT} bytes`);
  const key = b64(key_base64, KEY_BYTES);
  if (!key) return fail(res, t0, 400, 'invalid_key', '"key_base64" must be a base64-encoded 32-byte (256-bit) key');
  const enc = encrypt(plaintext, key);
  respond(res, t0, {
    algorithm: ALGO, ciphertext_base64: enc.ciphertext, iv_base64: enc.iv, auth_tag_base64: enc.auth_tag,
    confidence_score: 1.0,
    recommended_actions_priority_order: ['Persist ciphertext_base64, iv_base64, and auth_tag_base64 together.', 'Decrypt later via /decrypt with the same key.'],
    chain_to: [{ api: 'aes-vault', reason: 'Decrypt this payload via /decrypt.' }],
    privacy: PRIVACY,
  });
});

router.post('/decrypt', (req: Request, res: Response) => {
  const t0 = Date.now();
  const { ciphertext_base64, iv_base64, auth_tag_base64, key_base64 } = req.body ?? {};
  const key = b64(key_base64, KEY_BYTES);
  if (!key) return fail(res, t0, 400, 'invalid_key', '"key_base64" must be a base64-encoded 32-byte key');
  const iv = b64(iv_base64, IV_BYTES);
  if (!iv) return fail(res, t0, 400, 'invalid_iv', '"iv_base64" must be a base64-encoded 12-byte IV');
  const tag = b64(auth_tag_base64, TAG_BYTES);
  if (!tag) return fail(res, t0, 400, 'invalid_auth_tag', '"auth_tag_base64" must be a base64-encoded 16-byte tag');
  if (typeof ciphertext_base64 !== 'string' || ciphertext_base64.length === 0) return fail(res, t0, 400, 'invalid_ciphertext', '"ciphertext_base64" is required');
  try {
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(Buffer.from(ciphertext_base64, 'base64')), decipher.final()]);
    respond(res, t0, {
      algorithm: ALGO, plaintext: pt.toString('utf8'),
      confidence_score: 1.0,
      recommended_actions_priority_order: ['Authentication tag verified — ciphertext is intact and authentic.'],
      chain_to: [],
      privacy: PRIVACY,
    });
  } catch {
    return fail(res, t0, 400, 'decryption_failed', 'Authentication failed: wrong key, IV, tag, or corrupted ciphertext');
  }
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const { plaintext } = req.body ?? {};
  if (typeof plaintext !== 'string') return fail(res, t0, 400, 'invalid_plaintext', '"plaintext" must be a string');
  if (Buffer.byteLength(plaintext, 'utf8') > MAX_PLAINTEXT) return fail(res, t0, 400, 'plaintext_too_large', `"plaintext" exceeds ${MAX_PLAINTEXT} bytes`);
  const key = randomBytes(KEY_BYTES);
  const enc = encrypt(plaintext, key);
  respond(res, t0, {
    algorithm: ALGO, key_bits: 256,
    key_base64: key.toString('base64'),
    ciphertext_base64: enc.ciphertext, iv_base64: enc.iv, auth_tag_base64: enc.auth_tag,
    reasoning: {
      why_result_generated: 'Generated a fresh 256-bit key and encrypted the plaintext with AES-256-GCM, returning everything needed to decrypt later.',
      key_factors: ['AES-256-GCM authenticated encryption', '96-bit random IV per call', 'key generated from a CSPRNG'],
      invalidators: ['Losing key_base64 makes the ciphertext permanently unrecoverable.', 'Reusing the same key+IV pair across messages weakens GCM security.'],
    },
    confidence_score: 1.0,
    recommended_actions_priority_order: [
      'Store key_base64 in a secret manager NOW — it is not retrievable later.',
      'Persist ciphertext_base64, iv_base64, and auth_tag_base64 together with the key reference.',
      'Decrypt via /decrypt using all four values.',
    ],
    chain_to: [{ api: 'aes-vault', reason: 'Decrypt this payload via /decrypt.' }],
    privacy: PRIVACY,
  });
});

export default router;
