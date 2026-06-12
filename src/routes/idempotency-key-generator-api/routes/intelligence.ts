import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { respond, fail } from '../../_aplus/scaffold';
import { str, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic idempotency-key generator. Canonicalizes a request fingerprint
// (method, path, query, body, selected headers) by recursively sorting object
// keys — and optionally arrays — then hashes the canonical form (SHA-256 by
// default) into a stable idempotency key. Same inputs → same key, every time.
// Pure crypto/serialization — no LLM. Fully deterministic (confidence 1.0).

const router = Router();
const MAX_BYTES = 256 * 1024;
const ALGOS = new Set(['sha256', 'sha1', 'sha512']);

export interface KeyCore {
  idempotency_key: string; hash_hex: string; short_key: string; algorithm: string;
  namespace: string | null; sort_arrays: boolean; included_fields: string[];
  canonical_string: string; canonical_length: number; canonical_truncated: boolean;
}

function canon(v: any, sortArrays: boolean): any {
  if (Array.isArray(v)) {
    const arr = v.map((x) => canon(x, sortArrays));
    return sortArrays ? [...arr].sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1)) : arr;
  }
  if (v !== null && typeof v === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = canon(v[k], sortArrays);
    return out;
  }
  return v;
}

export function generate(body: any): { error: string } | { result: KeyCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with any of: method, path, query, body, headers (plus optional namespace, algorithm, sort_arrays).' };

  const algorithm = body.algorithm ?? 'sha256';
  if (!ALGOS.has(algorithm)) return { error: '"algorithm" must be one of: sha256, sha1, sha512.' };
  const sort_arrays = body.sort_arrays === true;

  const namespace = str(body.namespace);
  if (body.namespace !== undefined && namespace === undefined) return { error: '"namespace" must be a non-empty string if provided.' };

  const fingerprint: Record<string, unknown> = {};
  const included_fields: string[] = [];
  if (body.method !== undefined) { fingerprint.method = String(body.method).toUpperCase(); included_fields.push('method'); }
  if (body.path !== undefined) { fingerprint.path = String(body.path); included_fields.push('path'); }
  if (body.query !== undefined) { fingerprint.query = body.query; included_fields.push('query'); }
  if (body.body !== undefined) { fingerprint.body = body.body; included_fields.push('body'); }
  if (body.headers !== undefined) {
    if (body.headers === null || typeof body.headers !== 'object' || Array.isArray(body.headers)) return { error: '"headers" must be an object of header name/value pairs.' };
    const lc: Record<string, unknown> = {};
    for (const k of Object.keys(body.headers)) lc[k.toLowerCase()] = body.headers[k];
    fingerprint.headers = lc; included_fields.push('headers');
  }
  if (included_fields.length === 0) return { error: 'Provide at least one of: method, path, query, body, headers.' };

  const canonical = canon(fingerprint, sort_arrays);
  let canonical_string: string;
  try { canonical_string = JSON.stringify(canonical); } catch { return { error: 'fingerprint is not JSON-serializable.' }; }
  if (canonical_string.length > MAX_BYTES) return { error: `fingerprint exceeds the ${MAX_BYTES}-byte limit.` };

  const hash_hex = createHash(algorithm).update(canonical_string).digest('hex');
  const idempotency_key = namespace ? `${namespace}_${hash_hex}` : hash_hex;

  const CAP = 4000;
  const canonical_truncated = canonical_string.length > CAP;

  return {
    result: {
      idempotency_key, hash_hex, short_key: hash_hex.slice(0, 16), algorithm,
      namespace: namespace ?? null, sort_arrays, included_fields,
      canonical_string: canonical_truncated ? canonical_string.slice(0, CAP) : canonical_string,
      canonical_length: canonical_string.length, canonical_truncated,
    },
  };
}

function actions(r: KeyCore): string[] {
  return [
    `Use idempotency_key "${r.idempotency_key.length > 48 ? r.idempotency_key.slice(0, 48) + '…' : r.idempotency_key}" (${r.algorithm}) to dedupe retries of this exact request.`,
    `Fingerprint covers: ${r.included_fields.join(', ')}. Any change to these fields produces a different key.`,
    r.sort_arrays ? 'Array order was normalized (sort_arrays=true) — reordered arrays map to the same key.' : 'Array order is significant — reordered arrays produce a different key (set sort_arrays to ignore order).',
  ];
}

const CHAIN_TO = [
  { api: 'function-arg-validator', reason: 'Validate the request body against a schema before fingerprinting it.' },
  { api: 'webhook-signature-verifier', reason: 'Verify an inbound webhook before generating its idempotency key.' },
];
const INVALIDATORS = [
  'The key is a fingerprint of exactly the fields you supply — omitting a field that actually varies the request can collide distinct requests onto one key.',
  'Header names are lowercased; values are used verbatim — including a volatile header (timestamp, nonce) makes every request unique and defeats deduplication.',
  'Array order is significant unless sort_arrays=true.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Idempotency Key Generator API', version: '1.0.0',
    description: 'Deterministic idempotency-key generator. Canonicalizes a request fingerprint (method, path, query, body, selected headers) by recursively sorting object keys (and optionally arrays), then hashes it (SHA-256 by default) into a stable key. Same inputs → same key. Pure crypto — no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/idempotency-key-generator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/generate', summary: 'Generate a stable idempotency key', price_usdc: 0.003 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL key + reasoning', price_usdc: 0.006 },
    ],
    pricing: [
      { path: '/generate', price_usdc: 0.003, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.006, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/generate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = generate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, confidence_score: 1, confidence_per_section: { fingerprint: 1 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = generate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.algorithm} over a canonical fingerprint of [${v.included_fields.join(', ')}] (${v.canonical_length} bytes) → ${v.short_key}…`,
      key_factors: [`Fields: ${v.included_fields.join(', ')}.`, `Algorithm: ${v.algorithm}; sort_arrays=${v.sort_arrays}.`, v.namespace ? `Namespaced "${v.namespace}".` : 'No namespace prefix.'],
      invalidators: INVALIDATORS,
    },
    confidence_score: 1, confidence_per_section: { fingerprint: 1 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
