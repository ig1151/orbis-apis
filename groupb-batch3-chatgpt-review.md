# Group B Batch 3 — ChatGPT Review Bundle (Orbis A+ developer/encoding/format tools)

Date: 2026-06-17 · batch 3 shipped in PR #54; this bundle reflects the **post-review fix round** · tsc clean · smoke 43/43 green · live-verified on Render

Five deterministic, dependency-free, agent-native APIs: **checksum/hash**, **duration-humanizer**, **html-entities**, **mermaid-validator**, **table-formatter**.

**Fixes applied from the previous review:** (1) checksum `/hash` & `/verify` now reject malformed base64 via a canonical round-trip (matching the existing hex check); (2) the `Hashes` schema uses `patternProperties` so new algorithms need no schema change; (3) discovery now includes `typical_use_cases` + `input_examples` + `output_examples`; (4) Mermaid `confidence_score` is now dynamic — 0.95 for exact delimiter/type errors, 0.85 when the verdict leans on flowchart line-level heuristics, 0.9 for structurally-clean (grammar not fully validated).

## Please grade each API (A+/A/B/...) on:
1. **Correctness** of the deterministic logic (CRC-32/Adler-32 hand-rolled + MD5/SHA via node:crypto; ms⇄human duration with fixed units only — no calendar months/years; HTML entity encode/decode incl. numeric + curated named map; Mermaid lexical/structural lint — NOT full grammar; GFM + ASCII table rendering with alignment).
2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata side_effects/compute_class; reasoning + capabilities on /lookup).
3. **Honesty** (no fabrication; nothing stored; checksum is integrity not authentication; mermaid validator is lexical/structural not a full parser; heuristic vs exact confidence framed correctly).
4. **OpenAPI 3.1** schema rigor (allOf + unevaluatedProperties:false; typed 200/400/500; x-pricing; request/response examples present).
5. **Agent-usability** (clear field names, actionable recommended_actions, sensible chain_to targets).
Flag any bug, incorrect output, security footgun, or schema/response drift.

All five are deterministic — **no LLM call anywhere** — built on the shared `src/routes/_aplus/` scaffold (+ `specparts-plus`).

## Shared A+ scaffold — `src/routes/_aplus/scaffold.ts`
```ts
// Shared A+ scaffold for agent-native, x402 / Orbis / Coinbase Bazaar / Agentic Market APIs.
//
// Provides:
//  - traceId()                — per-response trace id
//  - respond()/fail()         — typed response envelope (trace_id, computed_at, success, latency_ms)
//  - buildAplusSpec()         — OpenAPI 3.1 builder with all global A+ extensions, ApiKeyAuth
//                               security, and shared typed components (Reasoning, ChainTo,
//                               Privacy, Error400, Error500). No generic `object` schemas.
//  - specRouter()             — Router that serves a prebuilt spec at GET '/'
//
// Determinism: these helpers never call an LLM. Each API supplies its own typed payload
// schemas and (for compute APIs) computes results in real code.
//
// Determinism scope: the deterministic guarantee covers the RESULT PATH only — the
// computed payload (and its reasoning) is a pure function of the request body. The
// operational metadata fields — `trace_id`/`request_id` (Math.random + Date.now) and
// `computed_at`/`latency_ms` (wall clock) — are intentionally nondeterministic per call
// and are EXCLUDED from the determinism guarantee. They are observability metadata, not
// inputs to or part of the result, and must never be treated as such.

import { Router, Request, Response } from 'express';

// Operational metadata only — NOT part of the deterministic result path. A fresh,
// non-reproducible id per response for tracing/correlation; never feed it back into
// or compare it as result data.
export function traceId(): string {
  return Math.random().toString(36).slice(2, 10) + '-' + Date.now();
}

/** Standard success envelope merged with the endpoint's typed payload. */
export function respond<T extends Record<string, unknown>>(
  res: Response,
  startMs: number,
  payload: T,
): void {
  const trace_id = traceId();
  res.status(200).json({
    trace_id,
    request_id: trace_id, // alias of trace_id for clients that key on request_id
    computed_at: new Date().toISOString(),
    success: true,
    latency_ms: Date.now() - startMs,
    ...payload,
  });
}

/** Typed error envelope. code is a stable machine-readable string. */
export function fail(
  res: Response,
  startMs: number,
  status: 400 | 500,
  code: string,
  message: string,
  details?: unknown,
): void {
  const trace_id = traceId();
  res.status(status).json({
    trace_id,
    request_id: trace_id,
    computed_at: new Date().toISOString(),
    success: false,
    latency_ms: Date.now() - startMs,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  });
}

export interface AplusEndpoint {
  method: 'get' | 'post';
  path: string;                  // e.g. '/lookup'
  summary: string;
  operationId: string;
  priceUsdc?: number;            // omit/0 for free endpoints (e.g. GET /)
  requestSchemaRef?: string;     // component schema name for the request body
  responseSchemaRef: string;     // component schema name for the 200 payload
  requestExample?: unknown;      // example request body (rendered in the spec)
  responseExample?: unknown;     // example 200 payload (rendered in the spec)
  oneCall?: boolean;             // marks an aggregating one-call endpoint (x-one-call: true)
  // optional safety extensions
  executionGateRequired?: boolean;
  humanApprovalRequired?: boolean;
  paperModeRecommended?: boolean;
}

export interface AplusSpecMeta {
  slug: string;
  title: string;
  description: string;
  version?: string;
  endpoints: AplusEndpoint[];
  /** API-specific component schemas (fully typed — no bare `object`). */
  schemas: Record<string, unknown>;
  /** Extra API-level extensions merged into `info` (e.g. x-security-sensitive). */
  infoExtensions?: Record<string, unknown>;
}

// Common typed components injected into every spec.
function commonSchemas(): Record<string, unknown> {
  return {
    ChainTo: {
      type: 'object',
      required: ['api', 'reason'],
      additionalProperties: false,
      properties: {
        api: { type: 'string', description: 'Slug of a recommended next API to call.' },
        reason: { type: 'string', description: 'Why an agent would chain to this API next.' },
      },
    },
    Reasoning: {
      type: 'object',
      required: ['why_result_generated', 'key_factors', 'invalidators'],
      additionalProperties: false,
      properties: {
        why_result_generated: { type: 'string' },
        key_factors: { type: 'array', items: { type: 'string' } },
        invalidators: {
          type: 'array',
          items: { type: 'string' },
          description: 'Conditions that would change or invalidate this result.',
        },
      },
    },
    Privacy: {
      type: 'object',
      required: ['data_stored', 'retention'],
      additionalProperties: false,
      properties: {
        data_stored: { type: 'boolean' },
        retention: { type: 'string', description: 'Retention policy, e.g. "none".' },
      },
    },
    EnvelopeError: {
      type: 'object',
      required: ['code', 'message'],
      additionalProperties: false,
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { description: 'Optional machine-readable error context.' },
      },
    },
    Error400: {
      type: 'object',
      required: ['trace_id', 'computed_at', 'success', 'latency_ms', 'error'],
      additionalProperties: false,
      properties: {
        trace_id: { type: 'string' },
        request_id: { type: 'string', description: 'Alias of trace_id.' },
        computed_at: { type: 'string', format: 'date-time' },
        success: { type: 'boolean', enum: [false] },
        latency_ms: { type: 'integer' },
        error: { $ref: '#/components/schemas/EnvelopeError' },
      },
    },
    Error500: { $ref: '#/components/schemas/Error400' },
  };
}

export function buildAplusSpec(meta: AplusSpecMeta): Record<string, unknown> {
  const version = meta.version ?? '1.0.0';
  const base = `https://orbis-apis.onrender.com/${meta.slug}`;

  const paths: Record<string, any> = {};
  for (const ep of meta.endpoints) {
    const op: any = {
      operationId: ep.operationId,
      summary: ep.summary,
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${ep.responseSchemaRef}` },
              ...(ep.responseExample !== undefined ? { example: ep.responseExample } : {}),
            },
          },
        },
        '400': {
          description: 'Invalid request',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } },
        },
        '500': {
          description: 'Internal error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } },
        },
      },
    };
    if (ep.requestSchemaRef) {
      op.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${ep.requestSchemaRef}` },
            ...(ep.requestExample !== undefined ? { example: ep.requestExample } : {}),
          },
        },
      };
    }
    if (ep.priceUsdc && ep.priceUsdc > 0) {
      op['x-pricing'] = { model: 'per_call', price_usdc: ep.priceUsdc, currency: 'USDC' };
    }
    if (ep.oneCall) op['x-one-call'] = true;
    if (ep.executionGateRequired) op['x-execution-gate-required'] = true;
    if (ep.humanApprovalRequired) op['x-human-approval-required'] = true;
    if (ep.paperModeRecommended) op['x-paper-mode-recommended'] = true;

    paths[ep.path] = { ...(paths[ep.path] || {}), [ep.method]: op };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: meta.title,
      version,
      description: meta.description,
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x402-compatible': true,
      'x-agent-marketplace-ready': true,
      'x-pay-per-call-optimized': true,
      ...(meta.infoExtensions ?? {}),
    },
    servers: [{ url: base }],
    security: [{ ApiKeyAuth: [] }],
    paths,
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      schemas: { ...commonSchemas(), ...meta.schemas },
    },
  };
}

/** Mounts a prebuilt spec at GET '/' (dispatcher serves it at /:slug/openapi.json). */
export function specRouter(spec: Record<string, unknown>): Router {
  const r = Router();
  r.get('/', (_req: Request, res: Response) => res.json(spec));
  return r;
}
```

## Shared A+ helpers — `src/routes/_aplus/util.ts`
```ts
// Shared deterministic helpers for the non-finance A+ APIs (web, web3, data,
// generators, validators). Pure functions only — no LLM, no fabricated data.
// Network is allowed ONLY in explicitly live-but-bounded APIs (e.g. WebSocket
// tester) and must always carry a tight AbortController/timeout.

/** Coerce to a finite number, else undefined. Accepts numeric strings. */
export function num(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Coerce to a non-empty trimmed string, else undefined. */
export function str(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim() !== '') return v;
  return undefined;
}

/** Coerce to a non-negative integer (count), else undefined. */
export function intIn(v: unknown): number | undefined {
  const n = num(v);
  if (n === undefined) return undefined;
  return Number.isInteger(n) ? n : Math.trunc(n);
}

/** Round to `dp` decimal places (default 2), half-up. */
export function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Clamp into [lo, hi]. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export const EXECUTION_METADATA = { model: 'deterministic' as const, automation_safe: true };
export const PRIVACY = { data_stored: false, retention: 'none' as const };
```

---

# checksum

## intelligence.ts
```ts
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
  if (encoding === 'base64') {
    // Canonical round-trip: re-encode the decoded bytes and compare, padding-insensitively.
    // Node drops characters outside the base64 alphabet and tolerates bad length/padding,
    // so a mismatch means the input was not valid base64. Accept both the standard (+/)
    // and url-safe (-_) alphabets by normalizing before comparison.
    const stripPad = (s: string) => s.replace(/=+$/, '');
    const canonical = stripPad(buf.toString('base64'));
    const want = stripPad(text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'));
    if (canonical !== want) return { error: '"text" is not valid base64.' };
  }
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

export const DISCOVERY = {
  name: 'Checksum & Hash API', version: '1.0.0',
  description: 'Deterministic checksum & hash digest calculator. /hash computes CRC-32, Adler-32, MD5, SHA-1, SHA-256 and SHA-512 over the supplied bytes (utf8/base64/hex input); /verify recomputes one algorithm and compares it against an expected digest. Pure computation — no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/checksum/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['crc32', 'adler32', 'cryptographic_hash', 'digest_verification', 'multi_algorithm'],
  typical_use_cases: [
    'Verify a downloaded artifact or payload matches a published checksum before using it',
    'Fingerprint content to detect whether it changed between pipeline stages or to deduplicate records',
    'Produce SHA-256/SHA-512 digests for audit logs or integrity manifests',
  ],
  input_examples: [
    { endpoint: '/hash', body: { text: 'hello world', algorithms: ['crc32', 'sha256'] } },
  ],
  output_examples: [
    { endpoint: '/hash', response: { byte_length: 11, encoding: 'utf8', hashes: { crc32: '0d4a1185', sha256: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9' } } },
  ],
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
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { hashExample, verifyExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const hex = { type: 'string', pattern: '^[0-9a-f]+$' };
const Hashes = {
  // Keyed by algorithm name; a typed map so adding an algorithm needs no schema change.
  // Documented keys are listed in properties for tooling; only lowercase-hex values are allowed.
  type: 'object',
  description: 'Lowercase-hex digests keyed by algorithm name, one per requested algorithm.',
  properties: { crc32: hex, adler32: hex, md5: hex, sha1: hex, sha256: hex, sha512: hex },
  patternProperties: { '^[a-z0-9-]+$': hex },
  additionalProperties: false,
};
const Encoding = { type: 'string', enum: ['utf8', 'base64', 'hex'] };
const Algorithm = { type: 'string', enum: ['crc32', 'adler32', 'md5', 'sha1', 'sha256', 'sha512'] };

const HashCore = {
  type: 'object', required: ['byte_length', 'encoding', 'hashes'],
  properties: {
    byte_length: { type: 'integer', minimum: 0, description: 'Number of bytes decoded from the input.' },
    encoding: Encoding, hashes: Hashes,
  },
};
const VerifyCore = {
  type: 'object', required: ['algorithm', 'encoding', 'byte_length', 'computed', 'expected_normalized', 'match'],
  properties: {
    algorithm: Algorithm, encoding: Encoding, byte_length: { type: 'integer', minimum: 0 },
    computed: { type: 'string', description: 'Lowercase-hex digest computed from the input.' },
    expected_normalized: { type: 'string', description: 'The expected value, trimmed and lowercased.' },
    match: { type: 'boolean' },
  },
};

const HashRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: {
    text: { type: 'string', maxLength: 5000000 },
    encoding: { ...Encoding, description: 'How to decode "text" into bytes (default utf8).' },
    algorithms: { type: 'array', minItems: 1, items: Algorithm, description: 'Subset of algorithms to compute (default: all).' },
  },
};
const VerifyRequest = {
  type: 'object', required: ['text', 'algorithm', 'expected'], additionalProperties: false,
  properties: {
    text: { type: 'string', maxLength: 5000000 }, encoding: Encoding, algorithm: Algorithm,
    expected: { type: 'string', description: 'Expected hex digest (compared case-insensitively after trimming).' },
  },
};

const hashReq = { text: 'hello world' };
const verifyReq = { text: 'hello world', algorithm: 'sha256', expected: 'B94D27B9934D3E08A52E52D7DA7DABFAC484EFE37A5380EE9088F7ACE2EFCDE9' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('computation', 'verification'), _Tail: Tail,
  Encoding, Algorithm, Hashes, HashCore, VerifyCore, HashRequest, VerifyRequest, DiscoveryResponse: discoverySchemaPlus(),
  HashResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HashCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  VerifyResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/VerifyCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HashCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/hash', summary: 'Compute checksums/digests over the input', operationId: 'hash', priceUsdc: 0.005, requestSchemaRef: 'HashRequest', responseSchemaRef: 'HashResponse', requestExample: hashReq, responseExample: hashExample },
  { method: 'post', path: '/verify', summary: 'Recompute one algorithm and compare to an expected digest', operationId: 'verify', priceUsdc: 0.006, requestSchemaRef: 'VerifyRequest', responseSchemaRef: 'VerifyResponse', requestExample: verifyReq, responseExample: verifyExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL digests + reasoning', operationId: 'lookup', priceUsdc: 0.01, oneCall: true, requestSchemaRef: 'HashRequest', responseSchemaRef: 'LookupResponse', requestExample: hashReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'checksum', title: 'Checksum & Hash API', version: '1.0.0',
  description: 'Deterministic checksum & hash digest calculator — CRC-32, Adler-32, MD5, SHA-1, SHA-256, SHA-512 over utf8/base64/hex input, plus digest verification. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /checksum/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Checksum & Hash API",
    "version": "1.0.0",
    "description": "Deterministic checksum & hash digest calculator — CRC-32, Adler-32, MD5, SHA-1, SHA-256, SHA-512 over utf8/base64/hex input, plus digest verification. No LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-developer-tool": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/checksum"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "discover",
        "summary": "Service discovery",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "name": "Checksum & Hash API",
                  "version": "1.0.0",
                  "description": "Deterministic checksum & hash digest calculator. /hash computes CRC-32, Adler-32, MD5, SHA-1, SHA-256 and SHA-512 over the supplied bytes (utf8/base64/hex input); /verify recomputes one algorithm and compares it against an expected digest. Pure computation — no LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/checksum/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "capabilities": [
                    "crc32",
                    "adler32",
                    "cryptographic_hash",
                    "digest_verification",
                    "multi_algorithm"
                  ],
                  "typical_use_cases": [
                    "Verify a downloaded artifact or payload matches a published checksum before using it",
                    "Fingerprint content to detect whether it changed between pipeline stages or to deduplicate records",
                    "Produce SHA-256/SHA-512 digests for audit logs or integrity manifests"
                  ],
                  "input_examples": [
                    {
                      "endpoint": "/hash",
                      "body": {
                        "text": "hello world",
                        "algorithms": [
                          "crc32",
                          "sha256"
                        ]
                      }
                    }
                  ],
                  "output_examples": [
                    {
                      "endpoint": "/hash",
                      "response": {
                        "byte_length": 11,
                        "encoding": "utf8",
                        "hashes": {
                          "crc32": "0d4a1185",
                          "sha256": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
                        }
                      }
                    }
                  ],
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/hash",
                      "summary": "Compute checksums/digests over the input",
                      "price_usdc": 0.005
                    },
                    {
                      "method": "POST",
                      "path": "/verify",
                      "summary": "Recompute one algorithm and compare to an expected digest",
                      "price_usdc": 0.006
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL digests + reasoning",
                      "price_usdc": 0.01
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/hash",
                      "price_usdc": 0.005,
                      "currency": "USDC"
                    },
                    {
                      "path": "/verify",
                      "price_usdc": 0.006,
                      "currency": "USDC"
                    },
                    {
                      "path": "/lookup",
                      "price_usdc": 0.01,
                      "currency": "USDC"
                    }
                  ],
                  "x402_compatible": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        }
      }
    },
    "/hash": {
      "post": {
        "operationId": "hash",
        "summary": "Compute checksums/digests over the input",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HashResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "byte_length": 11,
                  "encoding": "utf8",
                  "hashes": {
                    "crc32": "0d4a1185",
                    "adler32": "1a0b045d",
                    "md5": "5eb63bbbe01eeed093cb22bb8f5acdc3",
                    "sha1": "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed",
                    "sha256": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
                    "sha512": "309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f"
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "computation": 1
                  },
                  "recommended_actions_priority_order": [
                    "Computed 6 digest(s) over 11 byte(s)."
                  ],
                  "chain_to": [
                    {
                      "api": "sensitive-data-detector",
                      "reason": "Scan the same payload for PII before persisting or transmitting it."
                    },
                    {
                      "api": "json-patch",
                      "reason": "Verify a document is unchanged by comparing checksums before and after a patch."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/HashRequest"
              },
              "example": {
                "text": "hello world"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.005,
          "currency": "USDC"
        }
      }
    },
    "/verify": {
      "post": {
        "operationId": "verify",
        "summary": "Recompute one algorithm and compare to an expected digest",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/VerifyResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "algorithm": "sha256",
                  "encoding": "utf8",
                  "byte_length": 11,
                  "computed": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
                  "expected_normalized": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
                  "match": true,
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "computation": 1,
                    "verification": 1
                  },
                  "recommended_actions_priority_order": [
                    "Digest matches the expected sha256 value."
                  ],
                  "chain_to": [
                    {
                      "api": "sensitive-data-detector",
                      "reason": "Scan the same payload for PII before persisting or transmitting it."
                    },
                    {
                      "api": "json-patch",
                      "reason": "Verify a document is unchanged by comparing checksums before and after a patch."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/VerifyRequest"
              },
              "example": {
                "text": "hello world",
                "algorithm": "sha256",
                "expected": "B94D27B9934D3E08A52E52D7DA7DABFAC484EFE37A5380EE9088F7ACE2EFCDE9"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.006,
          "currency": "USDC"
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "ONE-CALL digests + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "byte_length": 11,
                  "encoding": "utf8",
                  "hashes": {
                    "crc32": "0d4a1185",
                    "adler32": "1a0b045d",
                    "md5": "5eb63bbbe01eeed093cb22bb8f5acdc3",
                    "sha1": "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed",
                    "sha256": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
                    "sha512": "309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f"
                  },
                  "reasoning": {
                    "why_result_generated": "Decoded 11 byte(s) from the utf8 input and computed 6 digest(s): crc32, adler32, md5, sha1, sha256, sha512.",
                    "key_factors": [
                      "Byte length: 11.",
                      "Encoding: utf8.",
                      "Algorithms: crc32, adler32, md5, sha1, sha256, sha512."
                    ],
                    "invalidators": [
                      "Digests are computed over the exact bytes decoded from \"text\" using \"encoding\" (default utf8). The same logical content under a different encoding yields different bytes and thus different digests.",
                      "CRC-32 (IEEE reflected, poly 0xEDB88320) and Adler-32 are error-detection checksums, NOT cryptographic — do not use them for integrity against tampering or for security. MD5 and SHA-1 are cryptographically broken; prefer SHA-256/SHA-512 for security-sensitive integrity.",
                      "All digests are lowercase hex. Verification compares hex case-insensitively after stripping surrounding whitespace; a leading \"0x\" in the expected value is not stripped."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "computation": 1
                  },
                  "recommended_actions_priority_order": [
                    "Computed 6 digest(s) over 11 byte(s)."
                  ],
                  "chain_to": [
                    {
                      "api": "sensitive-data-detector",
                      "reason": "Scan the same payload for PII before persisting or transmitting it."
                    },
                    {
                      "api": "json-patch",
                      "reason": "Verify a document is unchanged by comparing checksums before and after a patch."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/HashRequest"
              },
              "example": {
                "text": "hello world"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.01,
          "currency": "USDC"
        },
        "x-one-call": true
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    },
    "schemas": {
      "ChainTo": {
        "type": "object",
        "required": [
          "api",
          "reason"
        ],
        "additionalProperties": false,
        "properties": {
          "api": {
            "type": "string",
            "description": "Slug of a recommended next API to call."
          },
          "reason": {
            "type": "string",
            "description": "Why an agent would chain to this API next."
          }
        }
      },
      "Reasoning": {
        "type": "object",
        "required": [
          "why_result_generated",
          "key_factors",
          "invalidators"
        ],
        "additionalProperties": false,
        "properties": {
          "why_result_generated": {
            "type": "string"
          },
          "key_factors": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "invalidators": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Conditions that would change or invalidate this result."
          }
        }
      },
      "Privacy": {
        "type": "object",
        "required": [
          "data_stored",
          "retention"
        ],
        "additionalProperties": false,
        "properties": {
          "data_stored": {
            "type": "boolean"
          },
          "retention": {
            "type": "string",
            "description": "Retention policy, e.g. \"none\"."
          }
        }
      },
      "EnvelopeError": {
        "type": "object",
        "required": [
          "code",
          "message"
        ],
        "additionalProperties": false,
        "properties": {
          "code": {
            "type": "string"
          },
          "message": {
            "type": "string"
          },
          "details": {
            "description": "Optional machine-readable error context."
          }
        }
      },
      "Error400": {
        "type": "object",
        "required": [
          "trace_id",
          "request_id",
          "computed_at",
          "success",
          "latency_ms",
          "error"
        ],
        "additionalProperties": false,
        "properties": {
          "trace_id": {
            "type": "string"
          },
          "request_id": {
            "type": "string",
            "description": "Alias of trace_id."
          },
          "computed_at": {
            "type": "string",
            "format": "date-time"
          },
          "success": {
            "type": "boolean",
            "enum": [
              false
            ]
          },
          "latency_ms": {
            "type": "integer"
          },
          "error": {
            "$ref": "#/components/schemas/EnvelopeError"
          }
        }
      },
      "Error500": {
        "$ref": "#/components/schemas/Error400"
      },
      "EnvelopeOk": {
        "type": "object",
        "required": [
          "trace_id",
          "computed_at",
          "success",
          "latency_ms",
          "request_id"
        ],
        "properties": {
          "trace_id": {
            "type": "string"
          },
          "request_id": {
            "type": "string",
            "description": "Alias of trace_id for clients that key on request_id."
          },
          "computed_at": {
            "type": "string",
            "format": "date-time"
          },
          "success": {
            "type": "boolean",
            "enum": [
              true
            ]
          },
          "latency_ms": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "ExecutionMetadata": {
        "type": "object",
        "required": [
          "model",
          "automation_safe",
          "side_effects",
          "estimated_compute_class"
        ],
        "additionalProperties": false,
        "properties": {
          "model": {
            "type": "string",
            "enum": [
              "deterministic"
            ]
          },
          "automation_safe": {
            "type": "boolean"
          },
          "side_effects": {
            "type": "boolean",
            "description": "Whether a call mutates external state (always false — pure computation)."
          },
          "estimated_compute_class": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high"
            ],
            "description": "Rough CPU cost band for planning."
          }
        }
      },
      "ConfidencePerSection": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "computation": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "verification": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          }
        }
      },
      "_Tail": {
        "type": "object",
        "required": [
          "confidence_score",
          "confidence_per_section",
          "recommended_actions_priority_order",
          "chain_to",
          "privacy",
          "execution_metadata"
        ],
        "properties": {
          "confidence_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "confidence_per_section": {
            "$ref": "#/components/schemas/ConfidencePerSection"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "execution_metadata": {
            "$ref": "#/components/schemas/ExecutionMetadata"
          }
        }
      },
      "Encoding": {
        "type": "string",
        "enum": [
          "utf8",
          "base64",
          "hex"
        ]
      },
      "Algorithm": {
        "type": "string",
        "enum": [
          "crc32",
          "adler32",
          "md5",
          "sha1",
          "sha256",
          "sha512"
        ]
      },
      "Hashes": {
        "type": "object",
        "description": "Lowercase-hex digests keyed by algorithm name, one per requested algorithm.",
        "properties": {
          "crc32": {
            "type": "string",
            "pattern": "^[0-9a-f]+$"
          },
          "adler32": {
            "type": "string",
            "pattern": "^[0-9a-f]+$"
          },
          "md5": {
            "type": "string",
            "pattern": "^[0-9a-f]+$"
          },
          "sha1": {
            "type": "string",
            "pattern": "^[0-9a-f]+$"
          },
          "sha256": {
            "type": "string",
            "pattern": "^[0-9a-f]+$"
          },
          "sha512": {
            "type": "string",
            "pattern": "^[0-9a-f]+$"
          }
        },
        "patternProperties": {
          "^[a-z0-9-]+$": {
            "type": "string",
            "pattern": "^[0-9a-f]+$"
          }
        },
        "additionalProperties": false
      },
      "HashCore": {
        "type": "object",
        "required": [
          "byte_length",
          "encoding",
          "hashes"
        ],
        "properties": {
          "byte_length": {
            "type": "integer",
            "minimum": 0,
            "description": "Number of bytes decoded from the input."
          },
          "encoding": {
            "type": "string",
            "enum": [
              "utf8",
              "base64",
              "hex"
            ]
          },
          "hashes": {
            "type": "object",
            "description": "Lowercase-hex digests keyed by algorithm name, one per requested algorithm.",
            "properties": {
              "crc32": {
                "type": "string",
                "pattern": "^[0-9a-f]+$"
              },
              "adler32": {
                "type": "string",
                "pattern": "^[0-9a-f]+$"
              },
              "md5": {
                "type": "string",
                "pattern": "^[0-9a-f]+$"
              },
              "sha1": {
                "type": "string",
                "pattern": "^[0-9a-f]+$"
              },
              "sha256": {
                "type": "string",
                "pattern": "^[0-9a-f]+$"
              },
              "sha512": {
                "type": "string",
                "pattern": "^[0-9a-f]+$"
              }
            },
            "patternProperties": {
              "^[a-z0-9-]+$": {
                "type": "string",
                "pattern": "^[0-9a-f]+$"
              }
            },
            "additionalProperties": false
          }
        }
      },
      "VerifyCore": {
        "type": "object",
        "required": [
          "algorithm",
          "encoding",
          "byte_length",
          "computed",
          "expected_normalized",
          "match"
        ],
        "properties": {
          "algorithm": {
            "type": "string",
            "enum": [
              "crc32",
              "adler32",
              "md5",
              "sha1",
              "sha256",
              "sha512"
            ]
          },
          "encoding": {
            "type": "string",
            "enum": [
              "utf8",
              "base64",
              "hex"
            ]
          },
          "byte_length": {
            "type": "integer",
            "minimum": 0
          },
          "computed": {
            "type": "string",
            "description": "Lowercase-hex digest computed from the input."
          },
          "expected_normalized": {
            "type": "string",
            "description": "The expected value, trimmed and lowercased."
          },
          "match": {
            "type": "boolean"
          }
        }
      },
      "HashRequest": {
        "type": "object",
        "required": [
          "text"
        ],
        "additionalProperties": false,
        "properties": {
          "text": {
            "type": "string",
            "maxLength": 5000000
          },
          "encoding": {
            "type": "string",
            "enum": [
              "utf8",
              "base64",
              "hex"
            ],
            "description": "How to decode \"text\" into bytes (default utf8)."
          },
          "algorithms": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string",
              "enum": [
                "crc32",
                "adler32",
                "md5",
                "sha1",
                "sha256",
                "sha512"
              ]
            },
            "description": "Subset of algorithms to compute (default: all)."
          }
        }
      },
      "VerifyRequest": {
        "type": "object",
        "required": [
          "text",
          "algorithm",
          "expected"
        ],
        "additionalProperties": false,
        "properties": {
          "text": {
            "type": "string",
            "maxLength": 5000000
          },
          "encoding": {
            "type": "string",
            "enum": [
              "utf8",
              "base64",
              "hex"
            ]
          },
          "algorithm": {
            "type": "string",
            "enum": [
              "crc32",
              "adler32",
              "md5",
              "sha1",
              "sha256",
              "sha512"
            ]
          },
          "expected": {
            "type": "string",
            "description": "Expected hex digest (compared case-insensitively after trimming)."
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "required": [
          "name",
          "version",
          "description",
          "openapi_url",
          "auth",
          "endpoints",
          "pricing",
          "x402_compatible",
          "capabilities"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "openapi_url": {
            "type": "string",
            "format": "uri"
          },
          "auth": {
            "type": "object",
            "required": [
              "type",
              "header"
            ],
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "method",
                "path",
                "summary",
                "price_usdc"
              ],
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "summary": {
                  "type": "string"
                },
                "price_usdc": {
                  "type": "number"
                }
              }
            }
          },
          "pricing": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "path",
                "price_usdc",
                "currency"
              ],
              "additionalProperties": false,
              "properties": {
                "path": {
                  "type": "string"
                },
                "price_usdc": {
                  "type": "number"
                },
                "currency": {
                  "type": "string",
                  "enum": [
                    "USDC"
                  ]
                }
              }
            }
          },
          "x402_compatible": {
            "type": "boolean"
          },
          "capabilities": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Machine-readable capability tags for agent matching."
          },
          "typical_use_cases": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Optional plain-language use cases to aid autonomous discovery."
          },
          "input_examples": {
            "type": "array",
            "description": "Optional representative request bodies for primary endpoints, to aid autonomous discovery.",
            "items": {
              "type": "object",
              "required": [
                "endpoint",
                "body"
              ],
              "additionalProperties": false,
              "properties": {
                "endpoint": {
                  "type": "string"
                },
                "body": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "output_examples": {
            "type": "array",
            "description": "Optional trimmed response payloads matching input_examples (core fields only; full envelope omitted).",
            "items": {
              "type": "object",
              "required": [
                "endpoint",
                "response"
              ],
              "additionalProperties": false,
              "properties": {
                "endpoint": {
                  "type": "string"
                },
                "response": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          }
        }
      },
      "HashResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/HashCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "VerifyResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/VerifyCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "LookupResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/HashCore"
          },
          {
            "type": "object",
            "required": [
              "reasoning"
            ],
            "properties": {
              "reasoning": {
                "$ref": "#/components/schemas/Reasoning"
              }
            }
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      }
    }
  }
}
```

## Live example responses (happy path — replayed from each endpoint's published request example)
### POST /hash
Request:
```json
{
  "text": "hello world"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "hp1057cm-1781730505228",
  "request_id": "hp1057cm-1781730505228",
  "computed_at": "2026-06-17T21:08:25.228Z",
  "success": true,
  "latency_ms": 0,
  "byte_length": 11,
  "encoding": "utf8",
  "hashes": {
    "crc32": "0d4a1185",
    "adler32": "1a0b045d",
    "md5": "5eb63bbbe01eeed093cb22bb8f5acdc3",
    "sha1": "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed",
    "sha256": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    "sha512": "309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f"
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "computation": 1
  },
  "recommended_actions_priority_order": [
    "Computed 6 digest(s) over 11 byte(s)."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Scan the same payload for PII before persisting or transmitting it."
    },
    {
      "api": "json-patch",
      "reason": "Verify a document is unchanged by comparing checksums before and after a patch."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

### POST /verify
Request:
```json
{
  "text": "hello world",
  "algorithm": "sha256",
  "expected": "B94D27B9934D3E08A52E52D7DA7DABFAC484EFE37A5380EE9088F7ACE2EFCDE9"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "55iwflra-1781730505234",
  "request_id": "55iwflra-1781730505234",
  "computed_at": "2026-06-17T21:08:25.234Z",
  "success": true,
  "latency_ms": 0,
  "algorithm": "sha256",
  "encoding": "utf8",
  "byte_length": 11,
  "computed": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
  "expected_normalized": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
  "match": true,
  "confidence_score": 1,
  "confidence_per_section": {
    "computation": 1,
    "verification": 1
  },
  "recommended_actions_priority_order": [
    "Digest matches the expected sha256 value."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Scan the same payload for PII before persisting or transmitting it."
    },
    {
      "api": "json-patch",
      "reason": "Verify a document is unchanged by comparing checksums before and after a patch."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

### POST /lookup
Request:
```json
{
  "text": "hello world"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "z7ifhhgo-1781730505238",
  "request_id": "z7ifhhgo-1781730505238",
  "computed_at": "2026-06-17T21:08:25.238Z",
  "success": true,
  "latency_ms": 0,
  "byte_length": 11,
  "encoding": "utf8",
  "hashes": {
    "crc32": "0d4a1185",
    "adler32": "1a0b045d",
    "md5": "5eb63bbbe01eeed093cb22bb8f5acdc3",
    "sha1": "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed",
    "sha256": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    "sha512": "309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f"
  },
  "reasoning": {
    "why_result_generated": "Decoded 11 byte(s) from the utf8 input and computed 6 digest(s): crc32, adler32, md5, sha1, sha256, sha512.",
    "key_factors": [
      "Byte length: 11.",
      "Encoding: utf8.",
      "Algorithms: crc32, adler32, md5, sha1, sha256, sha512."
    ],
    "invalidators": [
      "Digests are computed over the exact bytes decoded from \"text\" using \"encoding\" (default utf8). The same logical content under a different encoding yields different bytes and thus different digests.",
      "CRC-32 (IEEE reflected, poly 0xEDB88320) and Adler-32 are error-detection checksums, NOT cryptographic — do not use them for integrity against tampering or for security. MD5 and SHA-1 are cryptographically broken; prefer SHA-256/SHA-512 for security-sensitive integrity.",
      "All digests are lowercase hex. Verification compares hex case-insensitively after stripping surrounding whitespace; a leading \"0x\" in the expected value is not stripped."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "computation": 1
  },
  "recommended_actions_priority_order": [
    "Computed 6 digest(s) over 11 byte(s)."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Scan the same payload for PII before persisting or transmitting it."
    },
    {
      "api": "json-patch",
      "reason": "Verify a document is unchanged by comparing checksums before and after a patch."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

## Live error / edge responses
### POST /hash (error: non-string text)
Request:
```json
{
  "text": 123
}
```
Response (HTTP 400):
```json
{
  "trace_id": "mqi7byu8-1781730505241",
  "request_id": "mqi7byu8-1781730505241",
  "computed_at": "2026-06-17T21:08:25.241Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"text\" must be a string."
  }
}
```

### POST /verify (error: bad algorithm)
Request:
```json
{
  "text": "x",
  "algorithm": "bogus",
  "expected": "aa"
}
```
Response (HTTP 400):
```json
{
  "trace_id": "sekv8x72-1781730505244",
  "request_id": "sekv8x72-1781730505244",
  "computed_at": "2026-06-17T21:08:25.244Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"algorithm\" must be one of crc32, adler32, md5, sha1, sha256, sha512."
  }
}
```

---

# duration-humanizer

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic duration ⇄ text converter. /humanize turns a millisecond count into a
// human-readable string and a structured breakdown; /parse turns a duration string
// ("1h 30m", "90s", "1.5d") back into milliseconds. Uses fixed, unambiguous units only
// (weeks/days/hours/minutes/seconds/ms — no calendar months/years). No LLM, nothing stored.

const router = Router();

const MAX_ABS_MS = 1e15;           // ~31,700 years — well inside safe integer range
const MAX_TEXT_LEN = 200;
const MAX_UNITS = 6;

interface Unit { key: string; long: string; ms: number }
const UNITS: Unit[] = [
  { key: 'w', long: 'week', ms: 604800000 },
  { key: 'd', long: 'day', ms: 86400000 },
  { key: 'h', long: 'hour', ms: 3600000 },
  { key: 'm', long: 'minute', ms: 60000 },
  { key: 's', long: 'second', ms: 1000 },
  { key: 'ms', long: 'millisecond', ms: 1 },
];

// Synonyms accepted by /parse. "m" → minute, "ms" → millisecond (checked first).
const TOKEN_UNITS: Array<{ re: string; ms: number }> = [
  { re: 'weeks|week|wks|wk|w', ms: 604800000 },
  { re: 'days|day|d', ms: 86400000 },
  { re: 'hours|hour|hrs|hr|h', ms: 3600000 },
  { re: 'minutes|minute|mins|min|m', ms: 60000 },
  { re: 'milliseconds|millisecond|millis|msecs|msec|ms', ms: 1 },
  { re: 'seconds|second|secs|sec|s', ms: 1000 },
];

export interface Part { unit: string; long: string; value: number }
export interface HumanizeCore { milliseconds: number; negative: boolean; humanized: string; compact: string; parts: Part[]; largest_unit: string | null }

function humanize(ms: number, maxUnits: number): HumanizeCore {
  const negative = ms < 0;
  let rem = Math.abs(ms);
  const parts: Part[] = [];
  for (const u of UNITS) {
    const v = Math.floor(rem / u.ms);
    if (v > 0) { parts.push({ unit: u.key, long: u.long, value: v }); rem -= v * u.ms; }
  }
  const limited = parts.length === 0 ? [{ unit: 'ms', long: 'millisecond', value: 0 }] : parts.slice(0, maxUnits);
  const sign = negative ? '-' : '';
  const compact = sign + limited.map((p) => `${p.value}${p.unit}`).join(' ');
  const humanized = sign + limited.map((p) => `${p.value} ${p.long}${p.value === 1 ? '' : 's'}`).join(' ');
  return { milliseconds: ms, negative, humanized, compact, parts: limited, largest_unit: limited[0]?.unit ?? null };
}

function parseDuration(text: string): { error: string } | { milliseconds: number; negative: boolean; parts: Part[] } {
  const trimmed = text.trim();
  if (trimmed === '') return { error: '"text" must be a non-empty duration string.' };
  let body = trimmed;
  let negative = false;
  if (body.startsWith('-')) { negative = true; body = body.slice(1).trim(); }
  // Bare number → milliseconds.
  if (/^[0-9]*\.?[0-9]+$/.test(body)) {
    const ms = Number(body);
    return { milliseconds: negative ? -ms : ms, negative, parts: [{ unit: 'ms', long: 'millisecond', value: ms }] };
  }
  const tokenRe = new RegExp(`([0-9]*\\.?[0-9]+)\\s*(${TOKEN_UNITS.map((t) => t.re).join('|')})`, 'gi');
  const parts: Part[] = [];
  let total = 0;
  let consumed = 0;
  let mtch: RegExpExecArray | null;
  while ((mtch = tokenRe.exec(body)) !== null) {
    const value = Number(mtch[1]);
    const unitStr = mtch[2].toLowerCase();
    const def = TOKEN_UNITS.find((t) => new RegExp(`^(?:${t.re})$`, 'i').test(unitStr))!;
    const u = UNITS.find((x) => x.ms === def.ms)!;
    total += value * def.ms;
    parts.push({ unit: u.key, long: u.long, value });
    consumed += mtch[0].length;
  }
  if (parts.length === 0) return { error: 'No recognizable duration tokens found (e.g. "1h 30m", "90s", "1.5d").' };
  // Reject stray non-separator characters that were not part of any token.
  const stripped = body.replace(tokenRe, '').replace(/[\s,]+/g, '');
  if (stripped !== '') return { error: `Unrecognized token(s) in duration: "${stripped}".` };
  void consumed;
  return { milliseconds: negative ? -total : total, negative, parts };
}

function readMs(raw: unknown): { error: string } | { ms: number } {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return { error: '"milliseconds" must be a finite number.' };
  if (!Number.isInteger(raw)) return { error: '"milliseconds" must be an integer.' };
  if (Math.abs(raw) > MAX_ABS_MS) return { error: `"milliseconds" magnitude exceeds the ${MAX_ABS_MS} limit.` };
  return { ms: raw };
}

function readMaxUnits(raw: unknown): { error: string } | { maxUnits: number } {
  if (raw === undefined) return { maxUnits: MAX_UNITS };
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > MAX_UNITS) return { error: `"max_units" must be an integer between 1 and ${MAX_UNITS}.` };
  return { maxUnits: raw };
}

const CHAIN_TO = [
  { api: 'table-formatter', reason: 'Render multiple humanized durations as a table for reporting.' },
];
const INVALIDATORS = [
  'Units are fixed, calendar-independent: 1w=7d, 1d=24h, 1h=60m, 1m=60s, 1s=1000ms. Calendar months and years are deliberately NOT supported (their length varies), so a "month"/"year" token is rejected by /parse.',
  'In /parse, "m" means minutes and "ms" means milliseconds (matched before "m"). /humanize emits integer values per unit; any sub-millisecond remainder is impossible because input must be an integer count of milliseconds.',
  '/humanize truncates (floor) per unit and stops after max_units components; it does not round the dropped remainder into the last shown unit.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

export const DISCOVERY = {
  name: 'Duration Humanizer API', version: '1.0.0',
  description: 'Deterministic duration ⇄ text converter. /humanize turns a millisecond count into a human-readable string + structured breakdown; /parse turns a duration string ("1h 30m", "90s", "1.5d") into milliseconds. Fixed unambiguous units (w/d/h/m/s/ms). No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/duration-humanizer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['humanize_duration', 'parse_duration', 'duration_breakdown', 'compact_and_long_form'],
  typical_use_cases: [
    'Render a millisecond duration as a human-readable string for logs, alerts or UI',
    'Parse a human duration like "1d 2h 3m" into milliseconds for scheduling or timeouts',
    'Normalize mixed duration inputs into a canonical compact form',
  ],
  input_examples: [
    { endpoint: '/humanize', body: { milliseconds: 93784000 } },
    { endpoint: '/parse', body: { text: '1d 2h 3m 4s' } },
  ],
  output_examples: [
    { endpoint: '/humanize', response: { milliseconds: 93784000, humanized: '1 day 2 hours 3 minutes 4 seconds', compact: '1d 2h 3m 4s' } },
    { endpoint: '/parse', response: { milliseconds: 93784000 } },
  ],
  endpoints: [
    { method: 'POST', path: '/humanize', summary: 'Milliseconds → human-readable duration', price_usdc: 0.004 },
    { method: 'POST', path: '/parse', summary: 'Duration string → milliseconds', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL humanize + reasoning', price_usdc: 0.009 },
  ],
  pricing: [
    { path: '/humanize', price_usdc: 0.004, currency: 'USDC' },
    { path: '/parse', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/humanize', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "milliseconds" integer.');
  const m = readMs(b.milliseconds);
  if ('error' in m) return fail(res, t0, 400, 'invalid_request', m.error);
  const mu = readMaxUnits(b.max_units);
  if ('error' in mu) return fail(res, t0, 400, 'invalid_request', mu.error);
  const core = humanize(m.ms, mu.maxUnits);
  respond(res, t0, { ...core, ...TAIL({ conversion: 1 }, [`Humanized ${core.milliseconds} ms as "${core.humanized}".`]) });
});

router.post('/parse', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "text" string.');
  if (typeof b.text !== 'string') return fail(res, t0, 400, 'invalid_request', '"text" must be a string.');
  if (b.text.length > MAX_TEXT_LEN) return fail(res, t0, 400, 'invalid_request', `"text" exceeds the ${MAX_TEXT_LEN}-character limit.`);
  const p = parseDuration(b.text);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  respond(res, t0, { input: b.text, milliseconds: p.milliseconds, negative: p.negative, parts: p.parts, ...TAIL({ conversion: 1 }, [`Parsed "${b.text}" as ${p.milliseconds} ms.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "milliseconds" integer.');
  const m = readMs(b.milliseconds);
  if ('error' in m) return fail(res, t0, 400, 'invalid_request', m.error);
  const mu = readMaxUnits(b.max_units);
  if ('error' in mu) return fail(res, t0, 400, 'invalid_request', mu.error);
  const core = humanize(m.ms, mu.maxUnits);
  respond(res, t0, {
    ...core,
    reasoning: {
      why_result_generated: `Decomposed ${core.milliseconds} ms greedily into ${core.parts.length} unit(s) (largest = ${core.largest_unit}), yielding "${core.humanized}".`,
      key_factors: [`Milliseconds: ${core.milliseconds}.`, `Parts: ${core.parts.map((p) => `${p.value}${p.unit}`).join(' ')}.`, `Max units: ${mu.maxUnits}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ conversion: 1 }, [`Humanized ${core.milliseconds} ms as "${core.humanized}".`]),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { humanizeExample, parseExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const Part = {
  type: 'object', required: ['unit', 'long', 'value'], additionalProperties: false,
  properties: {
    unit: { type: 'string', enum: ['w', 'd', 'h', 'm', 's', 'ms'] },
    long: { type: 'string', enum: ['week', 'day', 'hour', 'minute', 'second', 'millisecond'] },
    value: { type: 'number', minimum: 0 },
  },
};
const HumanizeCore = {
  type: 'object', required: ['milliseconds', 'negative', 'humanized', 'compact', 'parts', 'largest_unit'],
  properties: {
    milliseconds: { type: 'integer' }, negative: { type: 'boolean' },
    humanized: { type: 'string', description: 'Long form, e.g. "1 hour 30 minutes".' },
    compact: { type: 'string', description: 'Short form, e.g. "1h 30m".' },
    parts: { type: 'array', items: Part },
    largest_unit: { type: ['string', 'null'], enum: ['w', 'd', 'h', 'm', 's', 'ms', null] },
  },
};
const ParseCore = {
  type: 'object', required: ['input', 'milliseconds', 'negative', 'parts'],
  properties: {
    input: { type: 'string' }, milliseconds: { type: 'number' }, negative: { type: 'boolean' },
    parts: { type: 'array', items: Part },
  },
};

const HumanizeRequest = {
  type: 'object', required: ['milliseconds'], additionalProperties: false,
  properties: {
    milliseconds: { type: 'integer', description: 'Duration in milliseconds (may be negative).' },
    max_units: { type: 'integer', minimum: 1, maximum: 6, description: 'Max number of components to emit (default 6).' },
  },
};
const ParseRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: { text: { type: 'string', minLength: 1, maxLength: 200, description: 'Duration string, e.g. "1h 30m" or "90s".' } },
};

const humanizeReq = { milliseconds: 93784000 };
const parseReq = { text: '1d 2h 3m 4s' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('conversion'), _Tail: Tail,
  Part, HumanizeCore, ParseCore, HumanizeRequest, ParseRequest, DiscoveryResponse: discoverySchemaPlus(),
  HumanizeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HumanizeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  ParseResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ParseCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/HumanizeCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/humanize', summary: 'Milliseconds → human-readable duration', operationId: 'humanize', priceUsdc: 0.004, requestSchemaRef: 'HumanizeRequest', responseSchemaRef: 'HumanizeResponse', requestExample: humanizeReq, responseExample: humanizeExample },
  { method: 'post', path: '/parse', summary: 'Duration string → milliseconds', operationId: 'parse', priceUsdc: 0.005, requestSchemaRef: 'ParseRequest', responseSchemaRef: 'ParseResponse', requestExample: parseReq, responseExample: parseExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL humanize + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true, requestSchemaRef: 'HumanizeRequest', responseSchemaRef: 'LookupResponse', requestExample: humanizeReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'duration-humanizer', title: 'Duration Humanizer API', version: '1.0.0',
  description: 'Deterministic duration ⇄ text converter — milliseconds to "1h 30m" and back, structured breakdown, fixed unambiguous units. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /duration-humanizer/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Duration Humanizer API",
    "version": "1.0.0",
    "description": "Deterministic duration ⇄ text converter — milliseconds to \"1h 30m\" and back, structured breakdown, fixed unambiguous units. No LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-developer-tool": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/duration-humanizer"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "discover",
        "summary": "Service discovery",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "name": "Duration Humanizer API",
                  "version": "1.0.0",
                  "description": "Deterministic duration ⇄ text converter. /humanize turns a millisecond count into a human-readable string + structured breakdown; /parse turns a duration string (\"1h 30m\", \"90s\", \"1.5d\") into milliseconds. Fixed unambiguous units (w/d/h/m/s/ms). No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/duration-humanizer/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "capabilities": [
                    "humanize_duration",
                    "parse_duration",
                    "duration_breakdown",
                    "compact_and_long_form"
                  ],
                  "typical_use_cases": [
                    "Render a millisecond duration as a human-readable string for logs, alerts or UI",
                    "Parse a human duration like \"1d 2h 3m\" into milliseconds for scheduling or timeouts",
                    "Normalize mixed duration inputs into a canonical compact form"
                  ],
                  "input_examples": [
                    {
                      "endpoint": "/humanize",
                      "body": {
                        "milliseconds": 93784000
                      }
                    },
                    {
                      "endpoint": "/parse",
                      "body": {
                        "text": "1d 2h 3m 4s"
                      }
                    }
                  ],
                  "output_examples": [
                    {
                      "endpoint": "/humanize",
                      "response": {
                        "milliseconds": 93784000,
                        "humanized": "1 day 2 hours 3 minutes 4 seconds",
                        "compact": "1d 2h 3m 4s"
                      }
                    },
                    {
                      "endpoint": "/parse",
                      "response": {
                        "milliseconds": 93784000
                      }
                    }
                  ],
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/humanize",
                      "summary": "Milliseconds → human-readable duration",
                      "price_usdc": 0.004
                    },
                    {
                      "method": "POST",
                      "path": "/parse",
                      "summary": "Duration string → milliseconds",
                      "price_usdc": 0.005
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL humanize + reasoning",
                      "price_usdc": 0.009
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/humanize",
                      "price_usdc": 0.004,
                      "currency": "USDC"
                    },
                    {
                      "path": "/parse",
                      "price_usdc": 0.005,
                      "currency": "USDC"
                    },
                    {
                      "path": "/lookup",
                      "price_usdc": 0.009,
                      "currency": "USDC"
                    }
                  ],
                  "x402_compatible": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        }
      }
    },
    "/humanize": {
      "post": {
        "operationId": "humanize",
        "summary": "Milliseconds → human-readable duration",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HumanizeResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "milliseconds": 93784000,
                  "negative": false,
                  "humanized": "1 day 2 hours 3 minutes 4 seconds",
                  "compact": "1d 2h 3m 4s",
                  "parts": [
                    {
                      "unit": "d",
                      "long": "day",
                      "value": 1
                    },
                    {
                      "unit": "h",
                      "long": "hour",
                      "value": 2
                    },
                    {
                      "unit": "m",
                      "long": "minute",
                      "value": 3
                    },
                    {
                      "unit": "s",
                      "long": "second",
                      "value": 4
                    }
                  ],
                  "largest_unit": "d",
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "conversion": 1
                  },
                  "recommended_actions_priority_order": [
                    "Humanized 93784000 ms as \"1 day 2 hours 3 minutes 4 seconds\"."
                  ],
                  "chain_to": [
                    {
                      "api": "table-formatter",
                      "reason": "Render multiple humanized durations as a table for reporting."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/HumanizeRequest"
              },
              "example": {
                "milliseconds": 93784000
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.004,
          "currency": "USDC"
        }
      }
    },
    "/parse": {
      "post": {
        "operationId": "parse",
        "summary": "Duration string → milliseconds",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ParseResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "input": "1d 2h 3m 4s",
                  "milliseconds": 93784000,
                  "negative": false,
                  "parts": [
                    {
                      "unit": "d",
                      "long": "day",
                      "value": 1
                    },
                    {
                      "unit": "h",
                      "long": "hour",
                      "value": 2
                    },
                    {
                      "unit": "m",
                      "long": "minute",
                      "value": 3
                    },
                    {
                      "unit": "s",
                      "long": "second",
                      "value": 4
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "conversion": 1
                  },
                  "recommended_actions_priority_order": [
                    "Parsed \"1d 2h 3m 4s\" as 93784000 ms."
                  ],
                  "chain_to": [
                    {
                      "api": "table-formatter",
                      "reason": "Render multiple humanized durations as a table for reporting."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ParseRequest"
              },
              "example": {
                "text": "1d 2h 3m 4s"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.005,
          "currency": "USDC"
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "ONE-CALL humanize + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "milliseconds": 93784000,
                  "negative": false,
                  "humanized": "1 day 2 hours 3 minutes 4 seconds",
                  "compact": "1d 2h 3m 4s",
                  "parts": [
                    {
                      "unit": "d",
                      "long": "day",
                      "value": 1
                    },
                    {
                      "unit": "h",
                      "long": "hour",
                      "value": 2
                    },
                    {
                      "unit": "m",
                      "long": "minute",
                      "value": 3
                    },
                    {
                      "unit": "s",
                      "long": "second",
                      "value": 4
                    }
                  ],
                  "largest_unit": "d",
                  "reasoning": {
                    "why_result_generated": "Decomposed 93784000 ms greedily into 4 unit(s) (largest = d), yielding \"1 day 2 hours 3 minutes 4 seconds\".",
                    "key_factors": [
                      "Milliseconds: 93784000.",
                      "Parts: 1d 2h 3m 4s.",
                      "Max units: 6."
                    ],
                    "invalidators": [
                      "Units are fixed, calendar-independent: 1w=7d, 1d=24h, 1h=60m, 1m=60s, 1s=1000ms. Calendar months and years are deliberately NOT supported (their length varies), so a \"month\"/\"year\" token is rejected by /parse.",
                      "In /parse, \"m\" means minutes and \"ms\" means milliseconds (matched before \"m\"). /humanize emits integer values per unit; any sub-millisecond remainder is impossible because input must be an integer count of milliseconds.",
                      "/humanize truncates (floor) per unit and stops after max_units components; it does not round the dropped remainder into the last shown unit."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "conversion": 1
                  },
                  "recommended_actions_priority_order": [
                    "Humanized 93784000 ms as \"1 day 2 hours 3 minutes 4 seconds\"."
                  ],
                  "chain_to": [
                    {
                      "api": "table-formatter",
                      "reason": "Render multiple humanized durations as a table for reporting."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/HumanizeRequest"
              },
              "example": {
                "milliseconds": 93784000
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.009,
          "currency": "USDC"
        },
        "x-one-call": true
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    },
    "schemas": {
      "ChainTo": {
        "type": "object",
        "required": [
          "api",
          "reason"
        ],
        "additionalProperties": false,
        "properties": {
          "api": {
            "type": "string",
            "description": "Slug of a recommended next API to call."
          },
          "reason": {
            "type": "string",
            "description": "Why an agent would chain to this API next."
          }
        }
      },
      "Reasoning": {
        "type": "object",
        "required": [
          "why_result_generated",
          "key_factors",
          "invalidators"
        ],
        "additionalProperties": false,
        "properties": {
          "why_result_generated": {
            "type": "string"
          },
          "key_factors": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "invalidators": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Conditions that would change or invalidate this result."
          }
        }
      },
      "Privacy": {
        "type": "object",
        "required": [
          "data_stored",
          "retention"
        ],
        "additionalProperties": false,
        "properties": {
          "data_stored": {
            "type": "boolean"
          },
          "retention": {
            "type": "string",
            "description": "Retention policy, e.g. \"none\"."
          }
        }
      },
      "EnvelopeError": {
        "type": "object",
        "required": [
          "code",
          "message"
        ],
        "additionalProperties": false,
        "properties": {
          "code": {
            "type": "string"
          },
          "message": {
            "type": "string"
          },
          "details": {
            "description": "Optional machine-readable error context."
          }
        }
      },
      "Error400": {
        "type": "object",
        "required": [
          "trace_id",
          "request_id",
          "computed_at",
          "success",
          "latency_ms",
          "error"
        ],
        "additionalProperties": false,
        "properties": {
          "trace_id": {
            "type": "string"
          },
          "request_id": {
            "type": "string",
            "description": "Alias of trace_id."
          },
          "computed_at": {
            "type": "string",
            "format": "date-time"
          },
          "success": {
            "type": "boolean",
            "enum": [
              false
            ]
          },
          "latency_ms": {
            "type": "integer"
          },
          "error": {
            "$ref": "#/components/schemas/EnvelopeError"
          }
        }
      },
      "Error500": {
        "$ref": "#/components/schemas/Error400"
      },
      "EnvelopeOk": {
        "type": "object",
        "required": [
          "trace_id",
          "computed_at",
          "success",
          "latency_ms",
          "request_id"
        ],
        "properties": {
          "trace_id": {
            "type": "string"
          },
          "request_id": {
            "type": "string",
            "description": "Alias of trace_id for clients that key on request_id."
          },
          "computed_at": {
            "type": "string",
            "format": "date-time"
          },
          "success": {
            "type": "boolean",
            "enum": [
              true
            ]
          },
          "latency_ms": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "ExecutionMetadata": {
        "type": "object",
        "required": [
          "model",
          "automation_safe",
          "side_effects",
          "estimated_compute_class"
        ],
        "additionalProperties": false,
        "properties": {
          "model": {
            "type": "string",
            "enum": [
              "deterministic"
            ]
          },
          "automation_safe": {
            "type": "boolean"
          },
          "side_effects": {
            "type": "boolean",
            "description": "Whether a call mutates external state (always false — pure computation)."
          },
          "estimated_compute_class": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high"
            ],
            "description": "Rough CPU cost band for planning."
          }
        }
      },
      "ConfidencePerSection": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "conversion": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          }
        }
      },
      "_Tail": {
        "type": "object",
        "required": [
          "confidence_score",
          "confidence_per_section",
          "recommended_actions_priority_order",
          "chain_to",
          "privacy",
          "execution_metadata"
        ],
        "properties": {
          "confidence_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "confidence_per_section": {
            "$ref": "#/components/schemas/ConfidencePerSection"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "execution_metadata": {
            "$ref": "#/components/schemas/ExecutionMetadata"
          }
        }
      },
      "Part": {
        "type": "object",
        "required": [
          "unit",
          "long",
          "value"
        ],
        "additionalProperties": false,
        "properties": {
          "unit": {
            "type": "string",
            "enum": [
              "w",
              "d",
              "h",
              "m",
              "s",
              "ms"
            ]
          },
          "long": {
            "type": "string",
            "enum": [
              "week",
              "day",
              "hour",
              "minute",
              "second",
              "millisecond"
            ]
          },
          "value": {
            "type": "number",
            "minimum": 0
          }
        }
      },
      "HumanizeCore": {
        "type": "object",
        "required": [
          "milliseconds",
          "negative",
          "humanized",
          "compact",
          "parts",
          "largest_unit"
        ],
        "properties": {
          "milliseconds": {
            "type": "integer"
          },
          "negative": {
            "type": "boolean"
          },
          "humanized": {
            "type": "string",
            "description": "Long form, e.g. \"1 hour 30 minutes\"."
          },
          "compact": {
            "type": "string",
            "description": "Short form, e.g. \"1h 30m\"."
          },
          "parts": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "unit",
                "long",
                "value"
              ],
              "additionalProperties": false,
              "properties": {
                "unit": {
                  "type": "string",
                  "enum": [
                    "w",
                    "d",
                    "h",
                    "m",
                    "s",
                    "ms"
                  ]
                },
                "long": {
                  "type": "string",
                  "enum": [
                    "week",
                    "day",
                    "hour",
                    "minute",
                    "second",
                    "millisecond"
                  ]
                },
                "value": {
                  "type": "number",
                  "minimum": 0
                }
              }
            }
          },
          "largest_unit": {
            "type": [
              "string",
              "null"
            ],
            "enum": [
              "w",
              "d",
              "h",
              "m",
              "s",
              "ms",
              null
            ]
          }
        }
      },
      "ParseCore": {
        "type": "object",
        "required": [
          "input",
          "milliseconds",
          "negative",
          "parts"
        ],
        "properties": {
          "input": {
            "type": "string"
          },
          "milliseconds": {
            "type": "number"
          },
          "negative": {
            "type": "boolean"
          },
          "parts": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "unit",
                "long",
                "value"
              ],
              "additionalProperties": false,
              "properties": {
                "unit": {
                  "type": "string",
                  "enum": [
                    "w",
                    "d",
                    "h",
                    "m",
                    "s",
                    "ms"
                  ]
                },
                "long": {
                  "type": "string",
                  "enum": [
                    "week",
                    "day",
                    "hour",
                    "minute",
                    "second",
                    "millisecond"
                  ]
                },
                "value": {
                  "type": "number",
                  "minimum": 0
                }
              }
            }
          }
        }
      },
      "HumanizeRequest": {
        "type": "object",
        "required": [
          "milliseconds"
        ],
        "additionalProperties": false,
        "properties": {
          "milliseconds": {
            "type": "integer",
            "description": "Duration in milliseconds (may be negative)."
          },
          "max_units": {
            "type": "integer",
            "minimum": 1,
            "maximum": 6,
            "description": "Max number of components to emit (default 6)."
          }
        }
      },
      "ParseRequest": {
        "type": "object",
        "required": [
          "text"
        ],
        "additionalProperties": false,
        "properties": {
          "text": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200,
            "description": "Duration string, e.g. \"1h 30m\" or \"90s\"."
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "required": [
          "name",
          "version",
          "description",
          "openapi_url",
          "auth",
          "endpoints",
          "pricing",
          "x402_compatible",
          "capabilities"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "openapi_url": {
            "type": "string",
            "format": "uri"
          },
          "auth": {
            "type": "object",
            "required": [
              "type",
              "header"
            ],
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "method",
                "path",
                "summary",
                "price_usdc"
              ],
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "summary": {
                  "type": "string"
                },
                "price_usdc": {
                  "type": "number"
                }
              }
            }
          },
          "pricing": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "path",
                "price_usdc",
                "currency"
              ],
              "additionalProperties": false,
              "properties": {
                "path": {
                  "type": "string"
                },
                "price_usdc": {
                  "type": "number"
                },
                "currency": {
                  "type": "string",
                  "enum": [
                    "USDC"
                  ]
                }
              }
            }
          },
          "x402_compatible": {
            "type": "boolean"
          },
          "capabilities": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Machine-readable capability tags for agent matching."
          },
          "typical_use_cases": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Optional plain-language use cases to aid autonomous discovery."
          },
          "input_examples": {
            "type": "array",
            "description": "Optional representative request bodies for primary endpoints, to aid autonomous discovery.",
            "items": {
              "type": "object",
              "required": [
                "endpoint",
                "body"
              ],
              "additionalProperties": false,
              "properties": {
                "endpoint": {
                  "type": "string"
                },
                "body": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "output_examples": {
            "type": "array",
            "description": "Optional trimmed response payloads matching input_examples (core fields only; full envelope omitted).",
            "items": {
              "type": "object",
              "required": [
                "endpoint",
                "response"
              ],
              "additionalProperties": false,
              "properties": {
                "endpoint": {
                  "type": "string"
                },
                "response": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          }
        }
      },
      "HumanizeResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/HumanizeCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "ParseResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/ParseCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "LookupResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/HumanizeCore"
          },
          {
            "type": "object",
            "required": [
              "reasoning"
            ],
            "properties": {
              "reasoning": {
                "$ref": "#/components/schemas/Reasoning"
              }
            }
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      }
    }
  }
}
```

## Live example responses (happy path — replayed from each endpoint's published request example)
### POST /humanize
Request:
```json
{
  "milliseconds": 93784000
}
```
Response (HTTP 200):
```json
{
  "trace_id": "3nwlp6mi-1781730505248",
  "request_id": "3nwlp6mi-1781730505248",
  "computed_at": "2026-06-17T21:08:25.248Z",
  "success": true,
  "latency_ms": 0,
  "milliseconds": 93784000,
  "negative": false,
  "humanized": "1 day 2 hours 3 minutes 4 seconds",
  "compact": "1d 2h 3m 4s",
  "parts": [
    {
      "unit": "d",
      "long": "day",
      "value": 1
    },
    {
      "unit": "h",
      "long": "hour",
      "value": 2
    },
    {
      "unit": "m",
      "long": "minute",
      "value": 3
    },
    {
      "unit": "s",
      "long": "second",
      "value": 4
    }
  ],
  "largest_unit": "d",
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Humanized 93784000 ms as \"1 day 2 hours 3 minutes 4 seconds\"."
  ],
  "chain_to": [
    {
      "api": "table-formatter",
      "reason": "Render multiple humanized durations as a table for reporting."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

### POST /parse
Request:
```json
{
  "text": "1d 2h 3m 4s"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "1r52o3r0-1781730505252",
  "request_id": "1r52o3r0-1781730505252",
  "computed_at": "2026-06-17T21:08:25.252Z",
  "success": true,
  "latency_ms": 0,
  "input": "1d 2h 3m 4s",
  "milliseconds": 93784000,
  "negative": false,
  "parts": [
    {
      "unit": "d",
      "long": "day",
      "value": 1
    },
    {
      "unit": "h",
      "long": "hour",
      "value": 2
    },
    {
      "unit": "m",
      "long": "minute",
      "value": 3
    },
    {
      "unit": "s",
      "long": "second",
      "value": 4
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Parsed \"1d 2h 3m 4s\" as 93784000 ms."
  ],
  "chain_to": [
    {
      "api": "table-formatter",
      "reason": "Render multiple humanized durations as a table for reporting."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

### POST /lookup
Request:
```json
{
  "milliseconds": 93784000
}
```
Response (HTTP 200):
```json
{
  "trace_id": "girp9of0-1781730505254",
  "request_id": "girp9of0-1781730505254",
  "computed_at": "2026-06-17T21:08:25.254Z",
  "success": true,
  "latency_ms": 0,
  "milliseconds": 93784000,
  "negative": false,
  "humanized": "1 day 2 hours 3 minutes 4 seconds",
  "compact": "1d 2h 3m 4s",
  "parts": [
    {
      "unit": "d",
      "long": "day",
      "value": 1
    },
    {
      "unit": "h",
      "long": "hour",
      "value": 2
    },
    {
      "unit": "m",
      "long": "minute",
      "value": 3
    },
    {
      "unit": "s",
      "long": "second",
      "value": 4
    }
  ],
  "largest_unit": "d",
  "reasoning": {
    "why_result_generated": "Decomposed 93784000 ms greedily into 4 unit(s) (largest = d), yielding \"1 day 2 hours 3 minutes 4 seconds\".",
    "key_factors": [
      "Milliseconds: 93784000.",
      "Parts: 1d 2h 3m 4s.",
      "Max units: 6."
    ],
    "invalidators": [
      "Units are fixed, calendar-independent: 1w=7d, 1d=24h, 1h=60m, 1m=60s, 1s=1000ms. Calendar months and years are deliberately NOT supported (their length varies), so a \"month\"/\"year\" token is rejected by /parse.",
      "In /parse, \"m\" means minutes and \"ms\" means milliseconds (matched before \"m\"). /humanize emits integer values per unit; any sub-millisecond remainder is impossible because input must be an integer count of milliseconds.",
      "/humanize truncates (floor) per unit and stops after max_units components; it does not round the dropped remainder into the last shown unit."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Humanized 93784000 ms as \"1 day 2 hours 3 minutes 4 seconds\"."
  ],
  "chain_to": [
    {
      "api": "table-formatter",
      "reason": "Render multiple humanized durations as a table for reporting."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

## Live error / edge responses
### POST /humanize (error: non-integer ms)
Request:
```json
{
  "milliseconds": 1.5
}
```
Response (HTTP 400):
```json
{
  "trace_id": "6x31y88j-1781730505260",
  "request_id": "6x31y88j-1781730505260",
  "computed_at": "2026-06-17T21:08:25.260Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"milliseconds\" must be an integer."
  }
}
```

### POST /parse (error: unknown unit)
Request:
```json
{
  "text": "3 fortnights"
}
```
Response (HTTP 400):
```json
{
  "trace_id": "0wh3pyzo-1781730505272",
  "request_id": "0wh3pyzo-1781730505272",
  "computed_at": "2026-06-17T21:08:25.272Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "No recognizable duration tokens found (e.g. \"1h 30m\", \"90s\", \"1.5d\")."
  }
}
```

---

# html-entities

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic HTML-entity encoder/decoder. /encode escapes HTML-special characters
// (and, in non_ascii mode, every non-ASCII codepoint as a numeric reference); /decode
// resolves numeric references (&#NN; / &#xHH;) and a curated set of named entities back
// to text. Pure string computation — no LLM, nothing stored.

const router = Router();

const MAX_LEN = 200_000;

// Named → codepoint map for decoding (and the small reverse map for encoding).
const NAMED: Record<string, number> = {
  amp: 38, lt: 60, gt: 62, quot: 34, apos: 39, nbsp: 160, copy: 169, reg: 174, trade: 8482,
  hellip: 8230, mdash: 8212, ndash: 8211, lsquo: 8216, rsquo: 8217, ldquo: 8220, rdquo: 8221,
  laquo: 171, raquo: 187, bull: 8226, dagger: 8224, Dagger: 8225, permil: 8240, prime: 8242, Prime: 8243,
  euro: 8364, pound: 163, yen: 165, cent: 162, curren: 164, sect: 167, para: 182, middot: 183,
  deg: 176, plusmn: 177, times: 215, divide: 247, frac12: 189, frac14: 188, frac34: 190, sup1: 185, sup2: 178, sup3: 179,
  micro: 181, iexcl: 161, iquest: 191, brvbar: 166, uml: 168, macr: 175, acute: 180, cedil: 184, ordf: 170, ordm: 186, not: 172, shy: 173,
  agrave: 224, aacute: 225, acirc: 226, atilde: 227, auml: 228, aring: 229, aelig: 230, ccedil: 231,
  egrave: 232, eacute: 233, ecirc: 234, euml: 235, igrave: 236, iacute: 237, icirc: 238, iuml: 239,
  ntilde: 241, ograve: 242, oacute: 243, ocirc: 244, otilde: 245, ouml: 246, oslash: 248,
  ugrave: 249, uacute: 250, ucirc: 251, uuml: 252, yacute: 253, yuml: 255, szlig: 223,
  Agrave: 192, Aacute: 193, Acirc: 194, Atilde: 195, Auml: 196, Aring: 197, AElig: 198, Ccedil: 199,
  Egrave: 200, Eacute: 201, Ecirc: 202, Euml: 203, Igrave: 204, Iacute: 205, Icirc: 206, Iuml: 207,
  Ntilde: 209, Ograve: 210, Oacute: 211, Ocirc: 212, Otilde: 213, Ouml: 214, Oslash: 216,
  Ugrave: 217, Uacute: 218, Ucirc: 219, Uuml: 220, Yacute: 221,
  alpha: 945, beta: 946, gamma: 947, delta: 948, pi: 960, sigma: 963, omega: 969, mu: 956, lambda: 955,
  larr: 8592, uarr: 8593, rarr: 8594, darr: 8595, harr: 8596, infin: 8734, ne: 8800, le: 8804, ge: 8805, sum: 8721, radic: 8730,
};
// Encode named map (named output for the 5 HTML specials + a few common ones).
const ENCODE_NAMED: Record<number, string> = { 38: 'amp', 60: 'lt', 62: 'gt', 34: 'quot', 39: '#39' };

type Mode = 'minimal' | 'non_ascii';

function encode(text: string, mode: Mode, numeric: boolean): { encoded: string; replaced_count: number } {
  let out = '';
  let replaced = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const special = cp === 38 || cp === 60 || cp === 62 || cp === 34 || cp === 39;
    if (special) {
      replaced++;
      if (numeric) out += `&#${cp};`;
      else out += `&${ENCODE_NAMED[cp]};`;
      continue;
    }
    if (mode === 'non_ascii' && cp > 127) { replaced++; out += `&#${cp};`; continue; }
    out += ch;
  }
  return { encoded: out, replaced_count: replaced };
}

function decode(text: string): { decoded: string; replaced_count: number } {
  let replaced = 0;
  const decoded = text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, ref: string) => {
    let cp: number | null = null;
    if (ref[0] === '#') {
      cp = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
    } else if (Object.prototype.hasOwnProperty.call(NAMED, ref)) {
      cp = NAMED[ref];
    }
    if (cp === null || !Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return whole; // unknown/invalid → leave verbatim
    replaced++;
    return String.fromCodePoint(cp);
  });
  return { decoded, replaced_count: replaced };
}

function readText(raw: unknown): { error: string } | { text: string } {
  if (typeof raw !== 'string') return { error: '"text" must be a string.' };
  if (raw.length > MAX_LEN) return { error: `"text" exceeds the ${MAX_LEN}-character limit.` };
  return { text: raw };
}

const CHAIN_TO = [
  { api: 'sensitive-data-detector', reason: 'Scan decoded text for PII before rendering or storing it.' },
  { api: 'table-formatter', reason: 'Encode cell content before embedding it in generated HTML/Markdown tables.' },
];
const INVALIDATORS = [
  '/encode (minimal) escapes only the five HTML-special characters & < > " \'. In non_ascii mode it additionally escapes every codepoint > 127 as a numeric reference. The single quote is emitted as &#39; (numeric) in named mode for maximum HTML compatibility.',
  '/decode resolves ALL numeric references (&#NN; decimal and &#xHH; hex) and a curated set of common named entities. An unrecognized named entity (e.g. a rare HTML5 ref not in the set) is left verbatim — it is NOT an error and is not counted in replaced_count.',
  'Encoding is reversible by /decode for everything it produces. Decoding is not guaranteed to round-trip back to the exact original markup because multiple inputs (named vs numeric for the same character) decode to the same text.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

export const DISCOVERY = {
  name: 'HTML Entities API', version: '1.0.0',
  description: 'Deterministic HTML-entity encoder/decoder. /encode escapes HTML-special characters (and, in non_ascii mode, every non-ASCII codepoint as a numeric reference); /decode resolves numeric references and a curated set of named entities back to text. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/html-entities/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['html_encode', 'html_decode', 'numeric_references', 'named_entities', 'xss_safe_escaping'],
  typical_use_cases: [
    'Escape user-supplied text before embedding it in an HTML page or template',
    'Decode HTML entities from scraped or stored content back to plain text',
    'Convert non-ASCII text to numeric references for legacy/ASCII-only channels',
  ],
  input_examples: [
    { endpoint: '/encode', body: { text: '<a href="x">© 5</a>' } },
    { endpoint: '/decode', body: { text: '&lt;a&gt;&copy;&#48;' } },
  ],
  output_examples: [
    { endpoint: '/encode', response: { mode: 'minimal', encoded: '&lt;a href=&quot;x&quot;&gt;© 5&lt;/a&gt;', replaced_count: 6 } },
    { endpoint: '/decode', response: { decoded: '<a>©0', replaced_count: 4 } },
  ],
  endpoints: [
    { method: 'POST', path: '/encode', summary: 'Escape text to HTML entities', price_usdc: 0.004 },
    { method: 'POST', path: '/decode', summary: 'Resolve HTML entities back to text', price_usdc: 0.004 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL encode + reasoning', price_usdc: 0.008 },
  ],
  pricing: [
    { path: '/encode', price_usdc: 0.004, currency: 'USDC' },
    { path: '/decode', price_usdc: 0.004, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
  ],
  x402_compatible: true,
};

function readMode(raw: unknown): { error: string } | { mode: Mode } {
  if (raw === undefined) return { mode: 'minimal' };
  if (raw !== 'minimal' && raw !== 'non_ascii') return { error: '"mode" must be "minimal" or "non_ascii".' };
  return { mode: raw };
}

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/encode', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "text" string.');
  const r = readText(b.text);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const m = readMode(b.mode);
  if ('error' in m) return fail(res, t0, 400, 'invalid_request', m.error);
  if (b.numeric !== undefined && typeof b.numeric !== 'boolean') return fail(res, t0, 400, 'invalid_request', '"numeric" must be a boolean.');
  const numeric = b.numeric ?? false;
  const { encoded, replaced_count } = encode(r.text, m.mode, numeric);
  respond(res, t0, { input: r.text, encoded, mode: m.mode, numeric, replaced_count, ...TAIL({ encoding: 1 }, [`Encoded ${replaced_count} character(s) to HTML entities.`]) });
});

router.post('/decode', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "text" string.');
  const r = readText(b.text);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const { decoded, replaced_count } = decode(r.text);
  respond(res, t0, { input: r.text, decoded, replaced_count, ...TAIL({ decoding: 1 }, [`Resolved ${replaced_count} entity reference(s).`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "text" string.');
  const r = readText(b.text);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const m = readMode(b.mode);
  if ('error' in m) return fail(res, t0, 400, 'invalid_request', m.error);
  if (b.numeric !== undefined && typeof b.numeric !== 'boolean') return fail(res, t0, 400, 'invalid_request', '"numeric" must be a boolean.');
  const numeric = b.numeric ?? false;
  const { encoded, replaced_count } = encode(r.text, m.mode, numeric);
  respond(res, t0, {
    input: r.text, encoded, mode: m.mode, numeric, replaced_count,
    reasoning: {
      why_result_generated: `Escaped ${replaced_count} character(s) in ${m.mode} mode (numeric=${numeric}); the result is safe to embed in HTML text content.`,
      key_factors: [`Mode: ${m.mode}.`, `Numeric special chars: ${numeric}.`, `Characters replaced: ${replaced_count}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ encoding: 1 }, [`Encoded ${replaced_count} character(s) to HTML entities.`]),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { encodeExample, decodeExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const Mode = { type: 'string', enum: ['minimal', 'non_ascii'] };
const EncodeCore = {
  type: 'object', required: ['input', 'encoded', 'mode', 'numeric', 'replaced_count'],
  properties: {
    input: { type: 'string' }, encoded: { type: 'string' }, mode: Mode,
    numeric: { type: 'boolean', description: 'Whether HTML-special chars were emitted as numeric references.' },
    replaced_count: { type: 'integer', minimum: 0 },
  },
};
const DecodeCore = {
  type: 'object', required: ['input', 'decoded', 'replaced_count'],
  properties: { input: { type: 'string' }, decoded: { type: 'string' }, replaced_count: { type: 'integer', minimum: 0 } },
};

const EncodeRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: {
    text: { type: 'string', maxLength: 200000 },
    mode: { ...Mode, description: '"minimal" escapes only HTML-special chars; "non_ascii" also escapes every codepoint > 127 (default minimal).' },
    numeric: { type: 'boolean', description: 'Emit HTML-special chars as numeric references instead of named (default false).' },
  },
};
const DecodeRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: { text: { type: 'string', maxLength: 200000 } },
};

const encodeReq = { text: 'Tom & Jerry <3 "quotes" — café', mode: 'non_ascii' };
const decodeReq = { text: 'Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('encoding', 'decoding'), _Tail: Tail,
  Mode, EncodeCore, DecodeCore, EncodeRequest, DecodeRequest, DiscoveryResponse: discoverySchemaPlus(),
  EncodeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EncodeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  DecodeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DecodeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EncodeCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/encode', summary: 'Escape text to HTML entities', operationId: 'encode', priceUsdc: 0.004, requestSchemaRef: 'EncodeRequest', responseSchemaRef: 'EncodeResponse', requestExample: encodeReq, responseExample: encodeExample },
  { method: 'post', path: '/decode', summary: 'Resolve HTML entities back to text', operationId: 'decode', priceUsdc: 0.004, requestSchemaRef: 'DecodeRequest', responseSchemaRef: 'DecodeResponse', requestExample: decodeReq, responseExample: decodeExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL encode + reasoning', operationId: 'lookup', priceUsdc: 0.008, oneCall: true, requestSchemaRef: 'EncodeRequest', responseSchemaRef: 'LookupResponse', requestExample: encodeReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'html-entities', title: 'HTML Entities API', version: '1.0.0',
  description: 'Deterministic HTML-entity encoder/decoder — escape HTML-special & non-ASCII characters, resolve numeric + named references back to text. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /html-entities/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "HTML Entities API",
    "version": "1.0.0",
    "description": "Deterministic HTML-entity encoder/decoder — escape HTML-special & non-ASCII characters, resolve numeric + named references back to text. No LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-developer-tool": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/html-entities"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "discover",
        "summary": "Service discovery",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "name": "HTML Entities API",
                  "version": "1.0.0",
                  "description": "Deterministic HTML-entity encoder/decoder. /encode escapes HTML-special characters (and, in non_ascii mode, every non-ASCII codepoint as a numeric reference); /decode resolves numeric references and a curated set of named entities back to text. No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/html-entities/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "capabilities": [
                    "html_encode",
                    "html_decode",
                    "numeric_references",
                    "named_entities",
                    "xss_safe_escaping"
                  ],
                  "typical_use_cases": [
                    "Escape user-supplied text before embedding it in an HTML page or template",
                    "Decode HTML entities from scraped or stored content back to plain text",
                    "Convert non-ASCII text to numeric references for legacy/ASCII-only channels"
                  ],
                  "input_examples": [
                    {
                      "endpoint": "/encode",
                      "body": {
                        "text": "<a href=\"x\">© 5</a>"
                      }
                    },
                    {
                      "endpoint": "/decode",
                      "body": {
                        "text": "&lt;a&gt;&copy;&#48;"
                      }
                    }
                  ],
                  "output_examples": [
                    {
                      "endpoint": "/encode",
                      "response": {
                        "mode": "minimal",
                        "encoded": "&lt;a href=&quot;x&quot;&gt;© 5&lt;/a&gt;",
                        "replaced_count": 6
                      }
                    },
                    {
                      "endpoint": "/decode",
                      "response": {
                        "decoded": "<a>©0",
                        "replaced_count": 4
                      }
                    }
                  ],
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/encode",
                      "summary": "Escape text to HTML entities",
                      "price_usdc": 0.004
                    },
                    {
                      "method": "POST",
                      "path": "/decode",
                      "summary": "Resolve HTML entities back to text",
                      "price_usdc": 0.004
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL encode + reasoning",
                      "price_usdc": 0.008
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/encode",
                      "price_usdc": 0.004,
                      "currency": "USDC"
                    },
                    {
                      "path": "/decode",
                      "price_usdc": 0.004,
                      "currency": "USDC"
                    },
                    {
                      "path": "/lookup",
                      "price_usdc": 0.008,
                      "currency": "USDC"
                    }
                  ],
                  "x402_compatible": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        }
      }
    },
    "/encode": {
      "post": {
        "operationId": "encode",
        "summary": "Escape text to HTML entities",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EncodeResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "input": "Tom & Jerry <3 \"quotes\" — café",
                  "encoded": "Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;",
                  "mode": "non_ascii",
                  "numeric": false,
                  "replaced_count": 6,
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "encoding": 1
                  },
                  "recommended_actions_priority_order": [
                    "Encoded 6 character(s) to HTML entities."
                  ],
                  "chain_to": [
                    {
                      "api": "sensitive-data-detector",
                      "reason": "Scan decoded text for PII before rendering or storing it."
                    },
                    {
                      "api": "table-formatter",
                      "reason": "Encode cell content before embedding it in generated HTML/Markdown tables."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/EncodeRequest"
              },
              "example": {
                "text": "Tom & Jerry <3 \"quotes\" — café",
                "mode": "non_ascii"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.004,
          "currency": "USDC"
        }
      }
    },
    "/decode": {
      "post": {
        "operationId": "decode",
        "summary": "Resolve HTML entities back to text",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DecodeResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "input": "Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;",
                  "decoded": "Tom & Jerry <3 \"quotes\" — café",
                  "replaced_count": 6,
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "decoding": 1
                  },
                  "recommended_actions_priority_order": [
                    "Resolved 6 entity reference(s)."
                  ],
                  "chain_to": [
                    {
                      "api": "sensitive-data-detector",
                      "reason": "Scan decoded text for PII before rendering or storing it."
                    },
                    {
                      "api": "table-formatter",
                      "reason": "Encode cell content before embedding it in generated HTML/Markdown tables."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DecodeRequest"
              },
              "example": {
                "text": "Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.004,
          "currency": "USDC"
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "ONE-CALL encode + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "input": "Tom & Jerry <3 \"quotes\" — café",
                  "encoded": "Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;",
                  "mode": "non_ascii",
                  "numeric": false,
                  "replaced_count": 6,
                  "reasoning": {
                    "why_result_generated": "Escaped 6 character(s) in non_ascii mode (numeric=false); the result is safe to embed in HTML text content.",
                    "key_factors": [
                      "Mode: non_ascii.",
                      "Numeric special chars: false.",
                      "Characters replaced: 6."
                    ],
                    "invalidators": [
                      "/encode (minimal) escapes only the five HTML-special characters & < > \" '. In non_ascii mode it additionally escapes every codepoint > 127 as a numeric reference. The single quote is emitted as &#39; (numeric) in named mode for maximum HTML compatibility.",
                      "/decode resolves ALL numeric references (&#NN; decimal and &#xHH; hex) and a curated set of common named entities. An unrecognized named entity (e.g. a rare HTML5 ref not in the set) is left verbatim — it is NOT an error and is not counted in replaced_count.",
                      "Encoding is reversible by /decode for everything it produces. Decoding is not guaranteed to round-trip back to the exact original markup because multiple inputs (named vs numeric for the same character) decode to the same text."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "encoding": 1
                  },
                  "recommended_actions_priority_order": [
                    "Encoded 6 character(s) to HTML entities."
                  ],
                  "chain_to": [
                    {
                      "api": "sensitive-data-detector",
                      "reason": "Scan decoded text for PII before rendering or storing it."
                    },
                    {
                      "api": "table-formatter",
                      "reason": "Encode cell content before embedding it in generated HTML/Markdown tables."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/EncodeRequest"
              },
              "example": {
                "text": "Tom & Jerry <3 \"quotes\" — café",
                "mode": "non_ascii"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.008,
          "currency": "USDC"
        },
        "x-one-call": true
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    },
    "schemas": {
      "ChainTo": {
        "type": "object",
        "required": [
          "api",
          "reason"
        ],
        "additionalProperties": false,
        "properties": {
          "api": {
            "type": "string",
            "description": "Slug of a recommended next API to call."
          },
          "reason": {
            "type": "string",
            "description": "Why an agent would chain to this API next."
          }
        }
      },
      "Reasoning": {
        "type": "object",
        "required": [
          "why_result_generated",
          "key_factors",
          "invalidators"
        ],
        "additionalProperties": false,
        "properties": {
          "why_result_generated": {
            "type": "string"
          },
          "key_factors": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "invalidators": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Conditions that would change or invalidate this result."
          }
        }
      },
      "Privacy": {
        "type": "object",
        "required": [
          "data_stored",
          "retention"
        ],
        "additionalProperties": false,
        "properties": {
          "data_stored": {
            "type": "boolean"
          },
          "retention": {
            "type": "string",
            "description": "Retention policy, e.g. \"none\"."
          }
        }
      },
      "EnvelopeError": {
        "type": "object",
        "required": [
          "code",
          "message"
        ],
        "additionalProperties": false,
        "properties": {
          "code": {
            "type": "string"
          },
          "message": {
            "type": "string"
          },
          "details": {
            "description": "Optional machine-readable error context."
          }
        }
      },
      "Error400": {
        "type": "object",
        "required": [
          "trace_id",
          "request_id",
          "computed_at",
          "success",
          "latency_ms",
          "error"
        ],
        "additionalProperties": false,
        "properties": {
          "trace_id": {
            "type": "string"
          },
          "request_id": {
            "type": "string",
            "description": "Alias of trace_id."
          },
          "computed_at": {
            "type": "string",
            "format": "date-time"
          },
          "success": {
            "type": "boolean",
            "enum": [
              false
            ]
          },
          "latency_ms": {
            "type": "integer"
          },
          "error": {
            "$ref": "#/components/schemas/EnvelopeError"
          }
        }
      },
      "Error500": {
        "$ref": "#/components/schemas/Error400"
      },
      "EnvelopeOk": {
        "type": "object",
        "required": [
          "trace_id",
          "computed_at",
          "success",
          "latency_ms",
          "request_id"
        ],
        "properties": {
          "trace_id": {
            "type": "string"
          },
          "request_id": {
            "type": "string",
            "description": "Alias of trace_id for clients that key on request_id."
          },
          "computed_at": {
            "type": "string",
            "format": "date-time"
          },
          "success": {
            "type": "boolean",
            "enum": [
              true
            ]
          },
          "latency_ms": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "ExecutionMetadata": {
        "type": "object",
        "required": [
          "model",
          "automation_safe",
          "side_effects",
          "estimated_compute_class"
        ],
        "additionalProperties": false,
        "properties": {
          "model": {
            "type": "string",
            "enum": [
              "deterministic"
            ]
          },
          "automation_safe": {
            "type": "boolean"
          },
          "side_effects": {
            "type": "boolean",
            "description": "Whether a call mutates external state (always false — pure computation)."
          },
          "estimated_compute_class": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high"
            ],
            "description": "Rough CPU cost band for planning."
          }
        }
      },
      "ConfidencePerSection": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "encoding": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "decoding": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          }
        }
      },
      "_Tail": {
        "type": "object",
        "required": [
          "confidence_score",
          "confidence_per_section",
          "recommended_actions_priority_order",
          "chain_to",
          "privacy",
          "execution_metadata"
        ],
        "properties": {
          "confidence_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "confidence_per_section": {
            "$ref": "#/components/schemas/ConfidencePerSection"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "execution_metadata": {
            "$ref": "#/components/schemas/ExecutionMetadata"
          }
        }
      },
      "Mode": {
        "type": "string",
        "enum": [
          "minimal",
          "non_ascii"
        ]
      },
      "EncodeCore": {
        "type": "object",
        "required": [
          "input",
          "encoded",
          "mode",
          "numeric",
          "replaced_count"
        ],
        "properties": {
          "input": {
            "type": "string"
          },
          "encoded": {
            "type": "string"
          },
          "mode": {
            "type": "string",
            "enum": [
              "minimal",
              "non_ascii"
            ]
          },
          "numeric": {
            "type": "boolean",
            "description": "Whether HTML-special chars were emitted as numeric references."
          },
          "replaced_count": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "DecodeCore": {
        "type": "object",
        "required": [
          "input",
          "decoded",
          "replaced_count"
        ],
        "properties": {
          "input": {
            "type": "string"
          },
          "decoded": {
            "type": "string"
          },
          "replaced_count": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "EncodeRequest": {
        "type": "object",
        "required": [
          "text"
        ],
        "additionalProperties": false,
        "properties": {
          "text": {
            "type": "string",
            "maxLength": 200000
          },
          "mode": {
            "type": "string",
            "enum": [
              "minimal",
              "non_ascii"
            ],
            "description": "\"minimal\" escapes only HTML-special chars; \"non_ascii\" also escapes every codepoint > 127 (default minimal)."
          },
          "numeric": {
            "type": "boolean",
            "description": "Emit HTML-special chars as numeric references instead of named (default false)."
          }
        }
      },
      "DecodeRequest": {
        "type": "object",
        "required": [
          "text"
        ],
        "additionalProperties": false,
        "properties": {
          "text": {
            "type": "string",
            "maxLength": 200000
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "required": [
          "name",
          "version",
          "description",
          "openapi_url",
          "auth",
          "endpoints",
          "pricing",
          "x402_compatible",
          "capabilities"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "openapi_url": {
            "type": "string",
            "format": "uri"
          },
          "auth": {
            "type": "object",
            "required": [
              "type",
              "header"
            ],
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "method",
                "path",
                "summary",
                "price_usdc"
              ],
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "summary": {
                  "type": "string"
                },
                "price_usdc": {
                  "type": "number"
                }
              }
            }
          },
          "pricing": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "path",
                "price_usdc",
                "currency"
              ],
              "additionalProperties": false,
              "properties": {
                "path": {
                  "type": "string"
                },
                "price_usdc": {
                  "type": "number"
                },
                "currency": {
                  "type": "string",
                  "enum": [
                    "USDC"
                  ]
                }
              }
            }
          },
          "x402_compatible": {
            "type": "boolean"
          },
          "capabilities": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Machine-readable capability tags for agent matching."
          },
          "typical_use_cases": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Optional plain-language use cases to aid autonomous discovery."
          },
          "input_examples": {
            "type": "array",
            "description": "Optional representative request bodies for primary endpoints, to aid autonomous discovery.",
            "items": {
              "type": "object",
              "required": [
                "endpoint",
                "body"
              ],
              "additionalProperties": false,
              "properties": {
                "endpoint": {
                  "type": "string"
                },
                "body": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "output_examples": {
            "type": "array",
            "description": "Optional trimmed response payloads matching input_examples (core fields only; full envelope omitted).",
            "items": {
              "type": "object",
              "required": [
                "endpoint",
                "response"
              ],
              "additionalProperties": false,
              "properties": {
                "endpoint": {
                  "type": "string"
                },
                "response": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          }
        }
      },
      "EncodeResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/EncodeCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "DecodeResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/DecodeCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "LookupResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/EncodeCore"
          },
          {
            "type": "object",
            "required": [
              "reasoning"
            ],
            "properties": {
              "reasoning": {
                "$ref": "#/components/schemas/Reasoning"
              }
            }
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      }
    }
  }
}
```

## Live example responses (happy path — replayed from each endpoint's published request example)
### POST /encode
Request:
```json
{
  "text": "Tom & Jerry <3 \"quotes\" — café",
  "mode": "non_ascii"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "5wt2af2l-1781730505283",
  "request_id": "5wt2af2l-1781730505283",
  "computed_at": "2026-06-17T21:08:25.283Z",
  "success": true,
  "latency_ms": 0,
  "input": "Tom & Jerry <3 \"quotes\" — café",
  "encoded": "Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;",
  "mode": "non_ascii",
  "numeric": false,
  "replaced_count": 6,
  "confidence_score": 1,
  "confidence_per_section": {
    "encoding": 1
  },
  "recommended_actions_priority_order": [
    "Encoded 6 character(s) to HTML entities."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Scan decoded text for PII before rendering or storing it."
    },
    {
      "api": "table-formatter",
      "reason": "Encode cell content before embedding it in generated HTML/Markdown tables."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

### POST /decode
Request:
```json
{
  "text": "Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "xapnxyfk-1781730505286",
  "request_id": "xapnxyfk-1781730505286",
  "computed_at": "2026-06-17T21:08:25.286Z",
  "success": true,
  "latency_ms": 0,
  "input": "Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;",
  "decoded": "Tom & Jerry <3 \"quotes\" — café",
  "replaced_count": 6,
  "confidence_score": 1,
  "confidence_per_section": {
    "decoding": 1
  },
  "recommended_actions_priority_order": [
    "Resolved 6 entity reference(s)."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Scan decoded text for PII before rendering or storing it."
    },
    {
      "api": "table-formatter",
      "reason": "Encode cell content before embedding it in generated HTML/Markdown tables."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

### POST /lookup
Request:
```json
{
  "text": "Tom & Jerry <3 \"quotes\" — café",
  "mode": "non_ascii"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "ncr2mk9r-1781730505287",
  "request_id": "ncr2mk9r-1781730505287",
  "computed_at": "2026-06-17T21:08:25.287Z",
  "success": true,
  "latency_ms": 0,
  "input": "Tom & Jerry <3 \"quotes\" — café",
  "encoded": "Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;",
  "mode": "non_ascii",
  "numeric": false,
  "replaced_count": 6,
  "reasoning": {
    "why_result_generated": "Escaped 6 character(s) in non_ascii mode (numeric=false); the result is safe to embed in HTML text content.",
    "key_factors": [
      "Mode: non_ascii.",
      "Numeric special chars: false.",
      "Characters replaced: 6."
    ],
    "invalidators": [
      "/encode (minimal) escapes only the five HTML-special characters & < > \" '. In non_ascii mode it additionally escapes every codepoint > 127 as a numeric reference. The single quote is emitted as &#39; (numeric) in named mode for maximum HTML compatibility.",
      "/decode resolves ALL numeric references (&#NN; decimal and &#xHH; hex) and a curated set of common named entities. An unrecognized named entity (e.g. a rare HTML5 ref not in the set) is left verbatim — it is NOT an error and is not counted in replaced_count.",
      "Encoding is reversible by /decode for everything it produces. Decoding is not guaranteed to round-trip back to the exact original markup because multiple inputs (named vs numeric for the same character) decode to the same text."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "encoding": 1
  },
  "recommended_actions_priority_order": [
    "Encoded 6 character(s) to HTML entities."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Scan decoded text for PII before rendering or storing it."
    },
    {
      "api": "table-formatter",
      "reason": "Encode cell content before embedding it in generated HTML/Markdown tables."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

## Live error / edge responses
### POST /encode (error: bad mode)
Request:
```json
{
  "text": "x",
  "mode": "bogus"
}
```
Response (HTTP 400):
```json
{
  "trace_id": "axovvic6-1781730505289",
  "request_id": "axovvic6-1781730505289",
  "computed_at": "2026-06-17T21:08:25.289Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"mode\" must be \"minimal\" or \"non_ascii\"."
  }
}
```

### POST /decode (error: missing text)
Request:
```json
{}
```
Response (HTTP 400):
```json
{
  "trace_id": "sr6fs4kp-1781730505291",
  "request_id": "sr6fs4kp-1781730505291",
  "computed_at": "2026-06-17T21:08:25.291Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"text\" must be a string."
  }
}
```

---

# mermaid-validator

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic Mermaid diagram LINTER. /validate detects the diagram type, checks that
// delimiters ( ) [ ] { } and double quotes are balanced, and flags structurally suspect
// lines (with line numbers). It is a lexical/structural lint — NOT a port of the Mermaid
// grammar — so it will not catch every semantic error. No LLM, nothing stored.

const router = Router();

const MAX_LEN = 100_000;
const MAX_LINES = 5_000;

const KNOWN_TYPES = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'stateDiagram-v2',
  'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph', 'mindmap', 'timeline', 'quadrantChart',
  'requirementDiagram', 'C4Context', 'C4Container', 'C4Component', 'sankey-beta', 'xychart-beta', 'block-beta',
];
const FLOW_DIRECTIONS = new Set(['TB', 'TD', 'BT', 'RL', 'LR']);
const FLOW_KEYWORDS = /^(subgraph|end|direction|click|style|classDef|class|linkStyle|%%)/;
const ARROW_RE = /(-{2,}>|-{2,}|={2,}>|-\.->|-\.-|--[xo]|<-{2,}|o-{2,}|x-{2,}|~~~)/;

export interface Issue { line: number; severity: 'error' | 'warning'; code: string; message: string }
export interface ValidateCore {
  diagram_type: string | null; valid: boolean; line_count: number; content_line_count: number;
  balanced_delimiters: boolean; node_count: number | null; edge_count: number | null; issues: Issue[];
}

function detectType(line: string): string | null {
  const first = line.trim().split(/\s+/)[0];
  for (const t of KNOWN_TYPES) if (first === t || first.startsWith(t + ' ') || line.trim().startsWith(t)) {
    // exact first-token match preferred; allow "flowchart LR" / "graph TD"
    if (first === t) return t;
  }
  // handle "stateDiagram-v2", "sankey-beta" where first token equals the type already covered;
  return null;
}

function checkBalanced(text: string): { balanced: boolean; issues: Issue[] } {
  const issues: Issue[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const opens = new Set(['(', '[', '{']);
  const lines = text.split('\n');
  const stack: Array<{ ch: string; line: number }> = [];
  let inQuote = false;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (line.trim().startsWith('%%')) continue; // comment line
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuote = !inQuote; continue; }
      if (inQuote) continue;
      if (opens.has(c)) stack.push({ ch: c, line: li + 1 });
      else if (pairs[c]) {
        const top = stack.pop();
        if (!top || top.ch !== pairs[c]) {
          issues.push({ line: li + 1, severity: 'error', code: 'unbalanced_delimiter', message: `Unexpected closing "${c}" with no matching opener.` });
        }
      }
    }
    if (inQuote) {
      // quotes do not span lines in mermaid labels
      issues.push({ line: li + 1, severity: 'error', code: 'unterminated_quote', message: 'Double quote opened but not closed on this line.' });
      inQuote = false;
    }
  }
  for (const s of stack) issues.push({ line: s.line, severity: 'error', code: 'unbalanced_delimiter', message: `Opening "${s.ch}" was never closed.` });
  return { balanced: issues.length === 0, issues };
}

function validate(diagram: string): ValidateCore {
  const rawLines = diagram.split('\n');
  const issues: Issue[] = [];
  // Find first meaningful line (skip blanks, %% comments, %%{init}%% directives).
  let headerIdx = -1;
  for (let i = 0; i < rawLines.length; i++) {
    const t = rawLines[i].trim();
    if (t === '' || t.startsWith('%%')) continue;
    headerIdx = i; break;
  }
  let diagram_type: string | null = null;
  if (headerIdx === -1) {
    issues.push({ line: 1, severity: 'error', code: 'empty_diagram', message: 'Diagram is empty or contains only comments.' });
  } else {
    diagram_type = detectType(rawLines[headerIdx]);
    if (!diagram_type) issues.push({ line: headerIdx + 1, severity: 'error', code: 'unknown_diagram_type', message: `Unrecognized diagram type. Expected one of: ${KNOWN_TYPES.join(', ')}.` });
  }

  const bal = checkBalanced(diagram);
  issues.push(...bal.issues);

  const isFlow = diagram_type === 'graph' || diagram_type === 'flowchart';
  let node_count: number | null = null;
  let edge_count: number | null = null;

  // Flow direction check + per-line lint.
  if (isFlow && headerIdx !== -1) {
    const header = rawLines[headerIdx].trim().split(/\s+/);
    if (header.length >= 2 && !FLOW_DIRECTIONS.has(header[1])) {
      issues.push({ line: headerIdx + 1, severity: 'warning', code: 'unknown_direction', message: `"${header[1]}" is not a known flow direction (TB/TD/BT/RL/LR).` });
    }
    const nodes = new Set<string>();
    let edges = 0;
    for (let i = headerIdx + 1; i < rawLines.length; i++) {
      const t = rawLines[i].trim();
      if (t === '' || FLOW_KEYWORDS.test(t)) continue;
      const hasArrow = ARROW_RE.test(t);
      if (hasArrow) {
        edges++;
        const segs = t.split(ARROW_RE).filter((s) => s && !ARROW_RE.test(s));
        for (const s of segs) {
          const seg = s.trim().replace(/^\|[^|]*\|\s*/, ''); // strip a leading |edge label|
          const id = seg.split(/[\[({|]/)[0].trim();
          if (id) nodes.add(id);
        }
        // arrow at end with no target
        if (/(-{2,}>?|={2,}>?)\s*$/.test(t)) issues.push({ line: i + 1, severity: 'warning', code: 'dangling_edge', message: 'Edge appears to have no target node.' });
      } else if (/^[A-Za-z0-9_]+(\[.*\]|\(.*\)|\{.*\})?$/.test(t)) {
        nodes.add(t.split(/[\[({]/)[0].trim());
      } else {
        issues.push({ line: i + 1, severity: 'warning', code: 'unrecognized_line', message: 'Line is neither a recognized edge, node, nor keyword.' });
      }
    }
    node_count = nodes.size;
    edge_count = edges;
  }

  const content_line_count = rawLines.filter((l) => l.trim() !== '' && !l.trim().startsWith('%%')).length;
  const valid = !issues.some((x) => x.severity === 'error');
  return { diagram_type, valid, line_count: rawLines.length, content_line_count, balanced_delimiters: bal.balanced, node_count, edge_count, issues };
}

function readDiagram(raw: unknown): { error: string } | { diagram: string } {
  if (typeof raw !== 'string') return { error: '"diagram" must be a string.' };
  if (raw.length > MAX_LEN) return { error: `"diagram" exceeds the ${MAX_LEN}-character limit.` };
  if (raw.split('\n').length > MAX_LINES) return { error: `"diagram" exceeds the ${MAX_LINES}-line limit.` };
  return { diagram: raw };
}

const CHAIN_TO = [
  { api: 'table-formatter', reason: 'Render the issue list as a Markdown table for a PR comment or report.' },
];
const INVALIDATORS = [
  'This is a LEXICAL/STRUCTURAL lint, not the Mermaid parser: it reliably detects the diagram type, unbalanced delimiters ( ) [ ] { }, unterminated quotes, and (for flowcharts) dangling/unrecognized lines. It does NOT fully validate the Mermaid grammar, so valid:true means "no structural problems found", not "guaranteed to render".',
  'node_count and edge_count are reported only for flowchart/graph diagrams and are derived from arrow tokens and node identifiers via tokenization; subgraph headers, styling, and click directives are excluded from the node count.',
  'Comments (lines beginning with %%) and %%{...}%% init directives are ignored. Double-quoted labels are not expected to span multiple lines; an unclosed quote on a line is flagged.',
];

// Confidence reflects HOW the verdict was reached, not just that it is deterministic.
// Delimiter/type/quote checks are exact; the flowchart line-level heuristics
// (unrecognized_line / dangling_edge / unknown_direction) can misfire, so lower
// confidence when the verdict leans on them. A structurally clean diagram is still
// only 0.9 because the full Mermaid grammar is NOT validated.
const HEURISTIC_CODES = new Set(['unrecognized_line', 'dangling_edge', 'unknown_direction']);
function confidenceFor(core: ValidateCore): number {
  const hasHeuristic = core.issues.some((i) => HEURISTIC_CODES.has(i.code));
  const hasExactError = core.issues.some((i) => i.severity === 'error' && !HEURISTIC_CODES.has(i.code));
  if (hasHeuristic) return 0.85;
  if (hasExactError) return 0.95;
  return 0.9;
}

const TAIL = (confidence: number, sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: confidence, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

export const DISCOVERY = {
  name: 'Mermaid Validator API', version: '1.0.0',
  description: 'Deterministic Mermaid diagram linter. /validate detects the diagram type, checks balanced delimiters and quotes, and flags structurally suspect lines with line numbers. Lexical/structural lint (not the full Mermaid grammar). No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/mermaid-validator/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['diagram_type_detection', 'delimiter_balance_check', 'flowchart_lint', 'line_level_issues'],
  typical_use_cases: [
    'Lint LLM- or user-generated Mermaid before rendering it in docs or a PR',
    'Catch unbalanced delimiters or unterminated quotes that would break rendering',
    'Detect the diagram type and count flowchart nodes/edges for downstream tooling',
  ],
  input_examples: [
    { endpoint: '/validate', body: { diagram: 'flowchart LR\n  A-->B\n  B-->C' } },
  ],
  output_examples: [
    { endpoint: '/validate', response: { diagram_type: 'flowchart', valid: true, node_count: 3, edge_count: 2, balanced_delimiters: true, issues: [] } },
  ],
  endpoints: [
    { method: 'POST', path: '/validate', summary: 'Lint a Mermaid diagram', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL validate + reasoning', price_usdc: 0.011 },
  ],
  pricing: [
    { path: '/validate', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

const SECTIONS = { structure: 1, grammar: 0.8 };

router.post('/validate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "diagram" string.');
  const r = readDiagram(b.diagram);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const core = validate(r.diagram);
  const errs = core.issues.filter((x) => x.severity === 'error').length;
  respond(res, t0, { ...core, ...TAIL(confidenceFor(core), SECTIONS, [core.valid ? `No structural errors found in ${core.diagram_type ?? 'diagram'}.` : `Found ${errs} structural error(s) — see issues[].`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "diagram" string.');
  const r = readDiagram(b.diagram);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const core = validate(r.diagram);
  const errs = core.issues.filter((x) => x.severity === 'error').length;
  const warns = core.issues.length - errs;
  respond(res, t0, {
    ...core,
    reasoning: {
      why_result_generated: `Detected diagram type "${core.diagram_type}"; delimiters ${core.balanced_delimiters ? 'balanced' : 'UNBALANCED'}; found ${errs} error(s) and ${warns} warning(s) across ${core.content_line_count} content line(s).`,
      key_factors: [`Diagram type: ${core.diagram_type}.`, `Balanced delimiters: ${core.balanced_delimiters}.`, core.node_count !== null ? `Nodes: ${core.node_count}, edges: ${core.edge_count}.` : `Errors: ${errs}, warnings: ${warns}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL(confidenceFor(core), SECTIONS, [core.valid ? `No structural errors found.` : `Found ${errs} structural error(s) — see issues[].`]),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { validateExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const Issue = {
  type: 'object', required: ['line', 'severity', 'code', 'message'], additionalProperties: false,
  properties: {
    line: { type: 'integer', minimum: 1 },
    severity: { type: 'string', enum: ['error', 'warning'] },
    code: { type: 'string' }, message: { type: 'string' },
  },
};
const ValidateCore = {
  type: 'object', required: ['diagram_type', 'valid', 'line_count', 'content_line_count', 'balanced_delimiters', 'node_count', 'edge_count', 'issues'],
  properties: {
    diagram_type: { type: ['string', 'null'] }, valid: { type: 'boolean' },
    line_count: { type: 'integer', minimum: 0 }, content_line_count: { type: 'integer', minimum: 0 },
    balanced_delimiters: { type: 'boolean' },
    node_count: { type: ['integer', 'null'], minimum: 0 }, edge_count: { type: ['integer', 'null'], minimum: 0 },
    issues: { type: 'array', items: Issue },
  },
};

const ValidateRequest = {
  type: 'object', required: ['diagram'], additionalProperties: false,
  properties: { diagram: { type: 'string', minLength: 1, maxLength: 100000, description: 'Mermaid diagram source.' } },
};

const validateReq = { diagram: 'flowchart LR\n  A[Start] --> B{Decision}\n  B -->|yes| C[Ship]\n  B -->|no| A' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('structure', 'grammar'), _Tail: Tail,
  Issue, ValidateCore, ValidateRequest, DiscoveryResponse: discoverySchemaPlus(),
  ValidateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidateCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidateCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};


const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/validate', summary: 'Lint a Mermaid diagram', operationId: 'validate', priceUsdc: 0.006, requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'ValidateResponse', requestExample: validateReq, responseExample: validateExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL validate + reasoning', operationId: 'lookup', priceUsdc: 0.011, oneCall: true, requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'LookupResponse', requestExample: validateReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'mermaid-validator', title: 'Mermaid Validator API', version: '1.0.0',
  description: 'Deterministic Mermaid diagram linter — diagram-type detection, delimiter/quote balance, flowchart line lint with line numbers. Lexical/structural (not the full grammar). No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /mermaid-validator/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Mermaid Validator API",
    "version": "1.0.0",
    "description": "Deterministic Mermaid diagram linter — diagram-type detection, delimiter/quote balance, flowchart line lint with line numbers. Lexical/structural (not the full grammar). No LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-developer-tool": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/mermaid-validator"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "discover",
        "summary": "Service discovery",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "name": "Mermaid Validator API",
                  "version": "1.0.0",
                  "description": "Deterministic Mermaid diagram linter. /validate detects the diagram type, checks balanced delimiters and quotes, and flags structurally suspect lines with line numbers. Lexical/structural lint (not the full Mermaid grammar). No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/mermaid-validator/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "capabilities": [
                    "diagram_type_detection",
                    "delimiter_balance_check",
                    "flowchart_lint",
                    "line_level_issues"
                  ],
                  "typical_use_cases": [
                    "Lint LLM- or user-generated Mermaid before rendering it in docs or a PR",
                    "Catch unbalanced delimiters or unterminated quotes that would break rendering",
                    "Detect the diagram type and count flowchart nodes/edges for downstream tooling"
                  ],
                  "input_examples": [
                    {
                      "endpoint": "/validate",
                      "body": {
                        "diagram": "flowchart LR\n  A-->B\n  B-->C"
                      }
                    }
                  ],
                  "output_examples": [
                    {
                      "endpoint": "/validate",
                      "response": {
                        "diagram_type": "flowchart",
                        "valid": true,
                        "node_count": 3,
                        "edge_count": 2,
                        "balanced_delimiters": true,
                        "issues": []
                      }
                    }
                  ],
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/validate",
                      "summary": "Lint a Mermaid diagram",
                      "price_usdc": 0.006
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL validate + reasoning",
                      "price_usdc": 0.011
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/validate",
                      "price_usdc": 0.006,
                      "currency": "USDC"
                    },
                    {
                      "path": "/lookup",
                      "price_usdc": 0.011,
                      "currency": "USDC"
                    }
                  ],
                  "x402_compatible": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        }
      }
    },
    "/validate": {
      "post": {
        "operationId": "validate",
        "summary": "Lint a Mermaid diagram",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidateResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "diagram_type": "flowchart",
                  "valid": true,
                  "line_count": 4,
                  "content_line_count": 4,
                  "balanced_delimiters": true,
                  "node_count": 3,
                  "edge_count": 3,
                  "issues": [],
                  "confidence_score": 0.9,
                  "confidence_per_section": {
                    "structure": 1,
                    "grammar": 0.8
                  },
                  "recommended_actions_priority_order": [
                    "No structural errors found in flowchart."
                  ],
                  "chain_to": [
                    {
                      "api": "table-formatter",
                      "reason": "Render the issue list as a Markdown table for a PR comment or report."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidateRequest"
              },
              "example": {
                "diagram": "flowchart LR\n  A[Start] --> B{Decision}\n  B -->|yes| C[Ship]\n  B -->|no| A"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.006,
          "currency": "USDC"
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "ONE-CALL validate + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "diagram_type": "flowchart",
                  "valid": true,
                  "line_count": 4,
                  "content_line_count": 4,
                  "balanced_delimiters": true,
                  "node_count": 3,
                  "edge_count": 3,
                  "issues": [],
                  "reasoning": {
                    "why_result_generated": "Detected diagram type \"flowchart\"; delimiters balanced; found 0 error(s) and 0 warning(s) across 4 content line(s).",
                    "key_factors": [
                      "Diagram type: flowchart.",
                      "Balanced delimiters: true.",
                      "Nodes: 3, edges: 3."
                    ],
                    "invalidators": [
                      "This is a LEXICAL/STRUCTURAL lint, not the Mermaid parser: it reliably detects the diagram type, unbalanced delimiters ( ) [ ] { }, unterminated quotes, and (for flowcharts) dangling/unrecognized lines. It does NOT fully validate the Mermaid grammar, so valid:true means \"no structural problems found\", not \"guaranteed to render\".",
                      "node_count and edge_count are reported only for flowchart/graph diagrams and are derived from arrow tokens and node identifiers via tokenization; subgraph headers, styling, and click directives are excluded from the node count.",
                      "Comments (lines beginning with %%) and %%{...}%% init directives are ignored. Double-quoted labels are not expected to span multiple lines; an unclosed quote on a line is flagged."
                    ]
                  },
                  "confidence_score": 0.9,
                  "confidence_per_section": {
                    "structure": 1,
                    "grammar": 0.8
                  },
                  "recommended_actions_priority_order": [
                    "No structural errors found."
                  ],
                  "chain_to": [
                    {
                      "api": "table-formatter",
                      "reason": "Render the issue list as a Markdown table for a PR comment or report."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidateRequest"
              },
              "example": {
                "diagram": "flowchart LR\n  A[Start] --> B{Decision}\n  B -->|yes| C[Ship]\n  B -->|no| A"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.011,
          "currency": "USDC"
        },
        "x-one-call": true
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    },
    "schemas": {
      "ChainTo": {
        "type": "object",
        "required": [
          "api",
          "reason"
        ],
        "additionalProperties": false,
        "properties": {
          "api": {
            "type": "string",
            "description": "Slug of a recommended next API to call."
          },
          "reason": {
            "type": "string",
            "description": "Why an agent would chain to this API next."
          }
        }
      },
      "Reasoning": {
        "type": "object",
        "required": [
          "why_result_generated",
          "key_factors",
          "invalidators"
        ],
        "additionalProperties": false,
        "properties": {
          "why_result_generated": {
            "type": "string"
          },
          "key_factors": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "invalidators": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Conditions that would change or invalidate this result."
          }
        }
      },
      "Privacy": {
        "type": "object",
        "required": [
          "data_stored",
          "retention"
        ],
        "additionalProperties": false,
        "properties": {
          "data_stored": {
            "type": "boolean"
          },
          "retention": {
            "type": "string",
            "description": "Retention policy, e.g. \"none\"."
          }
        }
      },
      "EnvelopeError": {
        "type": "object",
        "required": [
          "code",
          "message"
        ],
        "additionalProperties": false,
        "properties": {
          "code": {
            "type": "string"
          },
          "message": {
            "type": "string"
          },
          "details": {
            "description": "Optional machine-readable error context."
          }
        }
      },
      "Error400": {
        "type": "object",
        "required": [
          "trace_id",
          "request_id",
          "computed_at",
          "success",
          "latency_ms",
          "error"
        ],
        "additionalProperties": false,
        "properties": {
          "trace_id": {
            "type": "string"
          },
          "request_id": {
            "type": "string",
            "description": "Alias of trace_id."
          },
          "computed_at": {
            "type": "string",
            "format": "date-time"
          },
          "success": {
            "type": "boolean",
            "enum": [
              false
            ]
          },
          "latency_ms": {
            "type": "integer"
          },
          "error": {
            "$ref": "#/components/schemas/EnvelopeError"
          }
        }
      },
      "Error500": {
        "$ref": "#/components/schemas/Error400"
      },
      "EnvelopeOk": {
        "type": "object",
        "required": [
          "trace_id",
          "computed_at",
          "success",
          "latency_ms",
          "request_id"
        ],
        "properties": {
          "trace_id": {
            "type": "string"
          },
          "request_id": {
            "type": "string",
            "description": "Alias of trace_id for clients that key on request_id."
          },
          "computed_at": {
            "type": "string",
            "format": "date-time"
          },
          "success": {
            "type": "boolean",
            "enum": [
              true
            ]
          },
          "latency_ms": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "ExecutionMetadata": {
        "type": "object",
        "required": [
          "model",
          "automation_safe",
          "side_effects",
          "estimated_compute_class"
        ],
        "additionalProperties": false,
        "properties": {
          "model": {
            "type": "string",
            "enum": [
              "deterministic"
            ]
          },
          "automation_safe": {
            "type": "boolean"
          },
          "side_effects": {
            "type": "boolean",
            "description": "Whether a call mutates external state (always false — pure computation)."
          },
          "estimated_compute_class": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high"
            ],
            "description": "Rough CPU cost band for planning."
          }
        }
      },
      "ConfidencePerSection": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "structure": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "grammar": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          }
        }
      },
      "_Tail": {
        "type": "object",
        "required": [
          "confidence_score",
          "confidence_per_section",
          "recommended_actions_priority_order",
          "chain_to",
          "privacy",
          "execution_metadata"
        ],
        "properties": {
          "confidence_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "confidence_per_section": {
            "$ref": "#/components/schemas/ConfidencePerSection"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "execution_metadata": {
            "$ref": "#/components/schemas/ExecutionMetadata"
          }
        }
      },
      "Issue": {
        "type": "object",
        "required": [
          "line",
          "severity",
          "code",
          "message"
        ],
        "additionalProperties": false,
        "properties": {
          "line": {
            "type": "integer",
            "minimum": 1
          },
          "severity": {
            "type": "string",
            "enum": [
              "error",
              "warning"
            ]
          },
          "code": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      },
      "ValidateCore": {
        "type": "object",
        "required": [
          "diagram_type",
          "valid",
          "line_count",
          "content_line_count",
          "balanced_delimiters",
          "node_count",
          "edge_count",
          "issues"
        ],
        "properties": {
          "diagram_type": {
            "type": [
              "string",
              "null"
            ]
          },
          "valid": {
            "type": "boolean"
          },
          "line_count": {
            "type": "integer",
            "minimum": 0
          },
          "content_line_count": {
            "type": "integer",
            "minimum": 0
          },
          "balanced_delimiters": {
            "type": "boolean"
          },
          "node_count": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "edge_count": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "issues": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "line",
                "severity",
                "code",
                "message"
              ],
              "additionalProperties": false,
              "properties": {
                "line": {
                  "type": "integer",
                  "minimum": 1
                },
                "severity": {
                  "type": "string",
                  "enum": [
                    "error",
                    "warning"
                  ]
                },
                "code": {
                  "type": "string"
                },
                "message": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "ValidateRequest": {
        "type": "object",
        "required": [
          "diagram"
        ],
        "additionalProperties": false,
        "properties": {
          "diagram": {
            "type": "string",
            "minLength": 1,
            "maxLength": 100000,
            "description": "Mermaid diagram source."
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "required": [
          "name",
          "version",
          "description",
          "openapi_url",
          "auth",
          "endpoints",
          "pricing",
          "x402_compatible",
          "capabilities"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "openapi_url": {
            "type": "string",
            "format": "uri"
          },
          "auth": {
            "type": "object",
            "required": [
              "type",
              "header"
            ],
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "method",
                "path",
                "summary",
                "price_usdc"
              ],
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "summary": {
                  "type": "string"
                },
                "price_usdc": {
                  "type": "number"
                }
              }
            }
          },
          "pricing": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "path",
                "price_usdc",
                "currency"
              ],
              "additionalProperties": false,
              "properties": {
                "path": {
                  "type": "string"
                },
                "price_usdc": {
                  "type": "number"
                },
                "currency": {
                  "type": "string",
                  "enum": [
                    "USDC"
                  ]
                }
              }
            }
          },
          "x402_compatible": {
            "type": "boolean"
          },
          "capabilities": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Machine-readable capability tags for agent matching."
          },
          "typical_use_cases": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Optional plain-language use cases to aid autonomous discovery."
          },
          "input_examples": {
            "type": "array",
            "description": "Optional representative request bodies for primary endpoints, to aid autonomous discovery.",
            "items": {
              "type": "object",
              "required": [
                "endpoint",
                "body"
              ],
              "additionalProperties": false,
              "properties": {
                "endpoint": {
                  "type": "string"
                },
                "body": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "output_examples": {
            "type": "array",
            "description": "Optional trimmed response payloads matching input_examples (core fields only; full envelope omitted).",
            "items": {
              "type": "object",
              "required": [
                "endpoint",
                "response"
              ],
              "additionalProperties": false,
              "properties": {
                "endpoint": {
                  "type": "string"
                },
                "response": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          }
        }
      },
      "ValidateResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/ValidateCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "LookupResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/ValidateCore"
          },
          {
            "type": "object",
            "required": [
              "reasoning"
            ],
            "properties": {
              "reasoning": {
                "$ref": "#/components/schemas/Reasoning"
              }
            }
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      }
    }
  }
}
```

## Live example responses (happy path — replayed from each endpoint's published request example)
### POST /validate
Request:
```json
{
  "diagram": "flowchart LR\n  A[Start] --> B{Decision}\n  B -->|yes| C[Ship]\n  B -->|no| A"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "xk6aws5y-1781730505295",
  "request_id": "xk6aws5y-1781730505295",
  "computed_at": "2026-06-17T21:08:25.295Z",
  "success": true,
  "latency_ms": 1,
  "diagram_type": "flowchart",
  "valid": true,
  "line_count": 4,
  "content_line_count": 4,
  "balanced_delimiters": true,
  "node_count": 3,
  "edge_count": 3,
  "issues": [],
  "confidence_score": 0.9,
  "confidence_per_section": {
    "structure": 1,
    "grammar": 0.8
  },
  "recommended_actions_priority_order": [
    "No structural errors found in flowchart."
  ],
  "chain_to": [
    {
      "api": "table-formatter",
      "reason": "Render the issue list as a Markdown table for a PR comment or report."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

### POST /lookup
Request:
```json
{
  "diagram": "flowchart LR\n  A[Start] --> B{Decision}\n  B -->|yes| C[Ship]\n  B -->|no| A"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "tmjc6bgq-1781730505296",
  "request_id": "tmjc6bgq-1781730505296",
  "computed_at": "2026-06-17T21:08:25.296Z",
  "success": true,
  "latency_ms": 0,
  "diagram_type": "flowchart",
  "valid": true,
  "line_count": 4,
  "content_line_count": 4,
  "balanced_delimiters": true,
  "node_count": 3,
  "edge_count": 3,
  "issues": [],
  "reasoning": {
    "why_result_generated": "Detected diagram type \"flowchart\"; delimiters balanced; found 0 error(s) and 0 warning(s) across 4 content line(s).",
    "key_factors": [
      "Diagram type: flowchart.",
      "Balanced delimiters: true.",
      "Nodes: 3, edges: 3."
    ],
    "invalidators": [
      "This is a LEXICAL/STRUCTURAL lint, not the Mermaid parser: it reliably detects the diagram type, unbalanced delimiters ( ) [ ] { }, unterminated quotes, and (for flowcharts) dangling/unrecognized lines. It does NOT fully validate the Mermaid grammar, so valid:true means \"no structural problems found\", not \"guaranteed to render\".",
      "node_count and edge_count are reported only for flowchart/graph diagrams and are derived from arrow tokens and node identifiers via tokenization; subgraph headers, styling, and click directives are excluded from the node count.",
      "Comments (lines beginning with %%) and %%{...}%% init directives are ignored. Double-quoted labels are not expected to span multiple lines; an unclosed quote on a line is flagged."
    ]
  },
  "confidence_score": 0.9,
  "confidence_per_section": {
    "structure": 1,
    "grammar": 0.8
  },
  "recommended_actions_priority_order": [
    "No structural errors found."
  ],
  "chain_to": [
    {
      "api": "table-formatter",
      "reason": "Render the issue list as a Markdown table for a PR comment or report."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

## Live error / edge responses
### POST /validate (error: non-string diagram)
Request:
```json
{
  "diagram": 123
}
```
Response (HTTP 400):
```json
{
  "trace_id": "rvlvzx64-1781730505297",
  "request_id": "rvlvzx64-1781730505297",
  "computed_at": "2026-06-17T21:08:25.297Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"diagram\" must be a string."
  }
}
```

---

# table-formatter

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic table renderer. /markdown renders rows into a GitHub-Flavored-Markdown
// table (with optional per-column alignment); /ascii renders a fixed-width ASCII grid
// table. Accepts row objects (column→value) or positional arrays. Pure string
// computation — no LLM, nothing stored.

const router = Router();

const MAX_ROWS = 1000;
const MAX_COLS = 50;
const MAX_CELL_LEN = 5000;

type Align = 'left' | 'right' | 'center';
type Cell = string | number | boolean | null;

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

interface Prepared { columns: string[]; matrix: string[][]; row_count: number }

function prepare(body: any): { error: string } | { p: Prepared } {
  if (!Array.isArray(body.rows)) return { error: '"rows" must be an array.' };
  if (body.rows.length > MAX_ROWS) return { error: `"rows" exceeds the ${MAX_ROWS}-row limit.` };
  let columns: string[];
  if (body.columns !== undefined) {
    if (!Array.isArray(body.columns) || body.columns.some((c: unknown) => typeof c !== 'string')) return { error: '"columns" must be an array of strings.' };
    columns = body.columns;
  } else {
    // derive from object keys (first-seen order); arrays require explicit columns.
    const seen: string[] = [];
    for (const r of body.rows) {
      if (Array.isArray(r) || r === null || typeof r !== 'object') return { error: 'When "columns" is omitted, every row must be an object; provide "columns" to use array rows.' };
      for (const k of Object.keys(r)) if (!seen.includes(k)) seen.push(k);
    }
    columns = seen;
  }
  if (columns.length === 0) return { error: 'No columns to render (empty rows or empty "columns").' };
  if (columns.length > MAX_COLS) return { error: `column count exceeds the ${MAX_COLS} limit.` };

  const matrix: string[][] = [];
  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i];
    const out: string[] = [];
    for (let c = 0; c < columns.length; c++) {
      let raw: unknown;
      if (Array.isArray(r)) raw = r[c];
      else if (r !== null && typeof r === 'object') raw = r[columns[c]];
      else return { error: `rows[${i}] must be an object or array.` };
      let s = cellToString(raw).replace(/\r?\n/g, ' ');
      if (s.length > MAX_CELL_LEN) return { error: `a cell in rows[${i}] exceeds the ${MAX_CELL_LEN}-character limit.` };
      out.push(s);
    }
    matrix.push(out);
  }
  return { p: { columns, matrix, row_count: body.rows.length } };
}

function readAlign(raw: unknown, n: number): { error: string } | { align: Align[] } {
  if (raw === undefined) return { align: Array(n).fill('left') };
  if (!Array.isArray(raw)) return { error: '"align" must be an array of "left"|"right"|"center".' };
  if (raw.length !== n) return { error: `"align" must have exactly ${n} entries (one per column).` };
  for (const a of raw) if (a !== 'left' && a !== 'right' && a !== 'center') return { error: '"align" entries must be "left", "right" or "center".' };
  return { align: raw as Align[] };
}

function renderMarkdown(p: Prepared, align: Align[]): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|');
  const head = `| ${p.columns.map(esc).join(' | ')} |`;
  const sep = `| ${align.map((a) => (a === 'right' ? '---:' : a === 'center' ? ':--:' : a === 'left' ? ':---' : '---')).join(' | ')} |`;
  const rows = p.matrix.map((r) => `| ${r.map(esc).join(' | ')} |`);
  return [head, sep, ...rows].join('\n');
}

function pad(s: string, w: number, a: Align): string {
  const gap = w - s.length;
  if (gap <= 0) return s;
  if (a === 'right') return ' '.repeat(gap) + s;
  if (a === 'center') { const l = Math.floor(gap / 2); return ' '.repeat(l) + s + ' '.repeat(gap - l); }
  return s + ' '.repeat(gap);
}

function renderAscii(p: Prepared, align: Align[]): string {
  const widths = p.columns.map((c, i) => Math.max(c.length, ...p.matrix.map((r) => r[i].length), 1));
  const border = '+' + widths.map((w) => '-'.repeat(w + 2)).join('+') + '+';
  const line = (cells: string[]) => '| ' + cells.map((s, i) => pad(s, widths[i], align[i])).join(' | ') + ' |';
  const out = [border, line(p.columns), border, ...p.matrix.map((r) => line(r)), border];
  return out.join('\n');
}

const CHAIN_TO = [
  { api: 'html-entities', reason: 'Escape cell content before embedding the rendered table in HTML.' },
  { api: 'duration-humanizer', reason: 'Humanize millisecond columns before rendering a report table.' },
];
const INVALIDATORS = [
  'Cells are stringified deterministically: strings verbatim, numbers/booleans via String(), null/undefined → empty, objects/arrays → compact JSON. Newlines within a cell are replaced by a single space (Markdown/ASCII tables are single-line per cell).',
  'Markdown rendering escapes literal "|" as "\\|"; ASCII rendering pads columns to the widest cell. Alignment ("align") affects the Markdown separator row and ASCII padding only.',
  'When "columns" is omitted, columns are the union of object keys in first-seen order; array rows REQUIRE an explicit "columns" header list. Missing keys render as empty cells, not errors.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

export const DISCOVERY = {
  name: 'Table Formatter API', version: '1.0.0',
  description: 'Deterministic table renderer. /markdown renders rows into a GitHub-Flavored-Markdown table (optional per-column alignment); /ascii renders a fixed-width ASCII grid table. Accepts row objects or positional arrays. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/table-formatter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['markdown_table', 'ascii_table', 'column_alignment', 'object_or_array_rows'],
  typical_use_cases: [
    'Render JSON rows as a GitHub-Flavored-Markdown table for a PR comment or report',
    'Produce a fixed-width ASCII grid table for terminal or plaintext output',
    'Normalize object or positional-array rows into a consistent tabular layout',
  ],
  input_examples: [
    { endpoint: '/markdown', body: { rows: [{ name: 'Ada', role: 'Eng' }, { name: 'Lin', role: 'PM' }] } },
  ],
  output_examples: [
    { endpoint: '/markdown', response: { format: 'markdown', row_count: 2, columns: ['name', 'role'], table: '| name | role |\n| :--- | :--- |\n| Ada | Eng |\n| Lin | PM |' } },
  ],
  endpoints: [
    { method: 'POST', path: '/markdown', summary: 'Render rows as a Markdown table', price_usdc: 0.005 },
    { method: 'POST', path: '/ascii', summary: 'Render rows as an ASCII grid table', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL render + reasoning', price_usdc: 0.009 },
  ],
  pricing: [
    { path: '/markdown', price_usdc: 0.005, currency: 'USDC' },
    { path: '/ascii', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

function handle(req: Request, res: Response, mode: 'markdown' | 'ascii', withReasoning: boolean) {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "rows" array.');
  const pr = prepare(b);
  if ('error' in pr) return fail(res, t0, 400, 'invalid_request', pr.error);
  const al = readAlign(b.align, pr.p.columns.length);
  if ('error' in al) return fail(res, t0, 400, 'invalid_request', al.error);
  const table = mode === 'markdown' ? renderMarkdown(pr.p, al.align) : renderAscii(pr.p, al.align);
  const core = { format: mode, columns: pr.p.columns, row_count: pr.p.row_count, align: al.align, table };
  const tail = TAIL({ rendering: 1 }, [`Rendered a ${pr.p.row_count}×${pr.p.columns.length} ${mode} table.`]);
  if (!withReasoning) return respond(res, t0, { ...core, ...tail });
  respond(res, t0, {
    ...core,
    reasoning: {
      why_result_generated: `Rendered ${pr.p.row_count} row(s) across ${pr.p.columns.length} column(s) as a ${mode} table.`,
      key_factors: [`Columns: ${pr.p.columns.join(', ')}.`, `Rows: ${pr.p.row_count}.`, `Alignment: ${al.align.join(', ')}.`],
      invalidators: INVALIDATORS,
    },
    ...tail,
  });
}

router.post('/markdown', (req, res) => handle(req, res, 'markdown', false));
router.post('/ascii', (req, res) => handle(req, res, 'ascii', false));
router.post('/lookup', (req, res) => handle(req, res, 'markdown', true));

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { CellValue } from '../../_aplus/specparts';
import { markdownExample, asciiExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const Align = { type: 'string', enum: ['left', 'right', 'center'] };
const TableCore = {
  type: 'object', required: ['format', 'columns', 'row_count', 'align', 'table'],
  properties: {
    format: { type: 'string', enum: ['markdown', 'ascii'] },
    columns: { type: 'array', items: { type: 'string' } },
    row_count: { type: 'integer', minimum: 0 },
    align: { type: 'array', items: Align },
    table: { type: 'string', description: 'The rendered table.' },
  },
};

const RowObject = { type: 'object', additionalProperties: CellValue };
const RowArray = { type: 'array', items: CellValue };
const TableRequest = {
  type: 'object', required: ['rows'], additionalProperties: false,
  properties: {
    rows: { type: 'array', maxItems: 1000, items: { oneOf: [RowObject, RowArray] }, description: 'Row objects (column→value) or positional arrays (then "columns" is required).' },
    columns: { type: 'array', maxItems: 50, items: { type: 'string' }, description: 'Explicit column order / headers (required for array rows).' },
    align: { type: 'array', items: Align, description: 'Per-column alignment, one entry per column (default all left).' },
  },
};

const markdownReq = { rows: [{ name: 'Alice', role: 'Engineer', commits: 142 }, { name: 'Bob', role: 'Designer', commits: 37 }], align: ['left', 'left', 'right'] };
const asciiReq = { rows: [{ name: 'Alice', role: 'Engineer', commits: 142 }, { name: 'Bob', role: 'Designer', commits: 37 }] };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('rendering'), _Tail: Tail,
  CellValue, Align, RowObject, RowArray, TableCore, TableRequest, DiscoveryResponse: discoverySchemaPlus(),
  MarkdownResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TableCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  AsciiResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TableCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TableCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};


const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/markdown', summary: 'Render rows as a Markdown table', operationId: 'markdown', priceUsdc: 0.005, requestSchemaRef: 'TableRequest', responseSchemaRef: 'MarkdownResponse', requestExample: markdownReq, responseExample: markdownExample },
  { method: 'post', path: '/ascii', summary: 'Render rows as an ASCII grid table', operationId: 'ascii', priceUsdc: 0.005, requestSchemaRef: 'TableRequest', responseSchemaRef: 'AsciiResponse', requestExample: asciiReq, responseExample: asciiExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL render + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true, requestSchemaRef: 'TableRequest', responseSchemaRef: 'LookupResponse', requestExample: markdownReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'table-formatter', title: 'Table Formatter API', version: '1.0.0',
  description: 'Deterministic table renderer — Markdown (GFM, per-column alignment) and fixed-width ASCII grid tables from row objects or positional arrays. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /table-formatter/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Table Formatter API",
    "version": "1.0.0",
    "description": "Deterministic table renderer — Markdown (GFM, per-column alignment) and fixed-width ASCII grid tables from row objects or positional arrays. No LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-developer-tool": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/table-formatter"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "paths": {
    "/": {
      "get": {
        "operationId": "discover",
        "summary": "Service discovery",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiscoveryResponse"
                },
                "example": {
                  "name": "Table Formatter API",
                  "version": "1.0.0",
                  "description": "Deterministic table renderer. /markdown renders rows into a GitHub-Flavored-Markdown table (optional per-column alignment); /ascii renders a fixed-width ASCII grid table. Accepts row objects or positional arrays. No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/table-formatter/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "capabilities": [
                    "markdown_table",
                    "ascii_table",
                    "column_alignment",
                    "object_or_array_rows"
                  ],
                  "typical_use_cases": [
                    "Render JSON rows as a GitHub-Flavored-Markdown table for a PR comment or report",
                    "Produce a fixed-width ASCII grid table for terminal or plaintext output",
                    "Normalize object or positional-array rows into a consistent tabular layout"
                  ],
                  "input_examples": [
                    {
                      "endpoint": "/markdown",
                      "body": {
                        "rows": [
                          {
                            "name": "Ada",
                            "role": "Eng"
                          },
                          {
                            "name": "Lin",
                            "role": "PM"
                          }
                        ]
                      }
                    }
                  ],
                  "output_examples": [
                    {
                      "endpoint": "/markdown",
                      "response": {
                        "format": "markdown",
                        "row_count": 2,
                        "columns": [
                          "name",
                          "role"
                        ],
                        "table": "| name | role |\n| :--- | :--- |\n| Ada | Eng |\n| Lin | PM |"
                      }
                    }
                  ],
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/markdown",
                      "summary": "Render rows as a Markdown table",
                      "price_usdc": 0.005
                    },
                    {
                      "method": "POST",
                      "path": "/ascii",
                      "summary": "Render rows as an ASCII grid table",
                      "price_usdc": 0.005
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL render + reasoning",
                      "price_usdc": 0.009
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/markdown",
                      "price_usdc": 0.005,
                      "currency": "USDC"
                    },
                    {
                      "path": "/ascii",
                      "price_usdc": 0.005,
                      "currency": "USDC"
                    },
                    {
                      "path": "/lookup",
                      "price_usdc": 0.009,
                      "currency": "USDC"
                    }
                  ],
                  "x402_compatible": true
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        }
      }
    },
    "/markdown": {
      "post": {
        "operationId": "markdown",
        "summary": "Render rows as a Markdown table",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MarkdownResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "format": "markdown",
                  "columns": [
                    "name",
                    "role",
                    "commits"
                  ],
                  "row_count": 2,
                  "align": [
                    "left",
                    "left",
                    "right"
                  ],
                  "table": "| name | role | commits |\n| :--- | :--- | ---: |\n| Alice | Engineer | 142 |\n| Bob | Designer | 37 |",
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "rendering": 1
                  },
                  "recommended_actions_priority_order": [
                    "Rendered a 2×3 markdown table."
                  ],
                  "chain_to": [
                    {
                      "api": "html-entities",
                      "reason": "Escape cell content before embedding the rendered table in HTML."
                    },
                    {
                      "api": "duration-humanizer",
                      "reason": "Humanize millisecond columns before rendering a report table."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/TableRequest"
              },
              "example": {
                "rows": [
                  {
                    "name": "Alice",
                    "role": "Engineer",
                    "commits": 142
                  },
                  {
                    "name": "Bob",
                    "role": "Designer",
                    "commits": 37
                  }
                ],
                "align": [
                  "left",
                  "left",
                  "right"
                ]
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.005,
          "currency": "USDC"
        }
      }
    },
    "/ascii": {
      "post": {
        "operationId": "ascii",
        "summary": "Render rows as an ASCII grid table",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AsciiResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "format": "ascii",
                  "columns": [
                    "name",
                    "role",
                    "commits"
                  ],
                  "row_count": 2,
                  "align": [
                    "left",
                    "left",
                    "left"
                  ],
                  "table": "+-------+----------+---------+\n| name  | role     | commits |\n+-------+----------+---------+\n| Alice | Engineer | 142     |\n| Bob   | Designer | 37      |\n+-------+----------+---------+",
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "rendering": 1
                  },
                  "recommended_actions_priority_order": [
                    "Rendered a 2×3 ascii table."
                  ],
                  "chain_to": [
                    {
                      "api": "html-entities",
                      "reason": "Escape cell content before embedding the rendered table in HTML."
                    },
                    {
                      "api": "duration-humanizer",
                      "reason": "Humanize millisecond columns before rendering a report table."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/TableRequest"
              },
              "example": {
                "rows": [
                  {
                    "name": "Alice",
                    "role": "Engineer",
                    "commits": 142
                  },
                  {
                    "name": "Bob",
                    "role": "Designer",
                    "commits": 37
                  }
                ]
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.005,
          "currency": "USDC"
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "ONE-CALL render + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "format": "markdown",
                  "columns": [
                    "name",
                    "role",
                    "commits"
                  ],
                  "row_count": 2,
                  "align": [
                    "left",
                    "left",
                    "right"
                  ],
                  "table": "| name | role | commits |\n| :--- | :--- | ---: |\n| Alice | Engineer | 142 |\n| Bob | Designer | 37 |",
                  "reasoning": {
                    "why_result_generated": "Rendered 2 row(s) across 3 column(s) as a markdown table.",
                    "key_factors": [
                      "Columns: name, role, commits.",
                      "Rows: 2.",
                      "Alignment: left, left, right."
                    ],
                    "invalidators": [
                      "Cells are stringified deterministically: strings verbatim, numbers/booleans via String(), null/undefined → empty, objects/arrays → compact JSON. Newlines within a cell are replaced by a single space (Markdown/ASCII tables are single-line per cell).",
                      "Markdown rendering escapes literal \"|\" as \"\\|\"; ASCII rendering pads columns to the widest cell. Alignment (\"align\") affects the Markdown separator row and ASCII padding only.",
                      "When \"columns\" is omitted, columns are the union of object keys in first-seen order; array rows REQUIRE an explicit \"columns\" header list. Missing keys render as empty cells, not errors."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "rendering": 1
                  },
                  "recommended_actions_priority_order": [
                    "Rendered a 2×3 markdown table."
                  ],
                  "chain_to": [
                    {
                      "api": "html-entities",
                      "reason": "Escape cell content before embedding the rendered table in HTML."
                    },
                    {
                      "api": "duration-humanizer",
                      "reason": "Humanize millisecond columns before rendering a report table."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true,
                    "side_effects": false,
                    "estimated_compute_class": "low"
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error400"
                }
              }
            }
          },
          "500": {
            "description": "Internal error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error500"
                }
              }
            }
          }
        },
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/TableRequest"
              },
              "example": {
                "rows": [
                  {
                    "name": "Alice",
                    "role": "Engineer",
                    "commits": 142
                  },
                  {
                    "name": "Bob",
                    "role": "Designer",
                    "commits": 37
                  }
                ],
                "align": [
                  "left",
                  "left",
                  "right"
                ]
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.009,
          "currency": "USDC"
        },
        "x-one-call": true
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    },
    "schemas": {
      "ChainTo": {
        "type": "object",
        "required": [
          "api",
          "reason"
        ],
        "additionalProperties": false,
        "properties": {
          "api": {
            "type": "string",
            "description": "Slug of a recommended next API to call."
          },
          "reason": {
            "type": "string",
            "description": "Why an agent would chain to this API next."
          }
        }
      },
      "Reasoning": {
        "type": "object",
        "required": [
          "why_result_generated",
          "key_factors",
          "invalidators"
        ],
        "additionalProperties": false,
        "properties": {
          "why_result_generated": {
            "type": "string"
          },
          "key_factors": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "invalidators": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Conditions that would change or invalidate this result."
          }
        }
      },
      "Privacy": {
        "type": "object",
        "required": [
          "data_stored",
          "retention"
        ],
        "additionalProperties": false,
        "properties": {
          "data_stored": {
            "type": "boolean"
          },
          "retention": {
            "type": "string",
            "description": "Retention policy, e.g. \"none\"."
          }
        }
      },
      "EnvelopeError": {
        "type": "object",
        "required": [
          "code",
          "message"
        ],
        "additionalProperties": false,
        "properties": {
          "code": {
            "type": "string"
          },
          "message": {
            "type": "string"
          },
          "details": {
            "description": "Optional machine-readable error context."
          }
        }
      },
      "Error400": {
        "type": "object",
        "required": [
          "trace_id",
          "request_id",
          "computed_at",
          "success",
          "latency_ms",
          "error"
        ],
        "additionalProperties": false,
        "properties": {
          "trace_id": {
            "type": "string"
          },
          "request_id": {
            "type": "string",
            "description": "Alias of trace_id."
          },
          "computed_at": {
            "type": "string",
            "format": "date-time"
          },
          "success": {
            "type": "boolean",
            "enum": [
              false
            ]
          },
          "latency_ms": {
            "type": "integer"
          },
          "error": {
            "$ref": "#/components/schemas/EnvelopeError"
          }
        }
      },
      "Error500": {
        "$ref": "#/components/schemas/Error400"
      },
      "EnvelopeOk": {
        "type": "object",
        "required": [
          "trace_id",
          "computed_at",
          "success",
          "latency_ms",
          "request_id"
        ],
        "properties": {
          "trace_id": {
            "type": "string"
          },
          "request_id": {
            "type": "string",
            "description": "Alias of trace_id for clients that key on request_id."
          },
          "computed_at": {
            "type": "string",
            "format": "date-time"
          },
          "success": {
            "type": "boolean",
            "enum": [
              true
            ]
          },
          "latency_ms": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "ExecutionMetadata": {
        "type": "object",
        "required": [
          "model",
          "automation_safe",
          "side_effects",
          "estimated_compute_class"
        ],
        "additionalProperties": false,
        "properties": {
          "model": {
            "type": "string",
            "enum": [
              "deterministic"
            ]
          },
          "automation_safe": {
            "type": "boolean"
          },
          "side_effects": {
            "type": "boolean",
            "description": "Whether a call mutates external state (always false — pure computation)."
          },
          "estimated_compute_class": {
            "type": "string",
            "enum": [
              "low",
              "medium",
              "high"
            ],
            "description": "Rough CPU cost band for planning."
          }
        }
      },
      "ConfidencePerSection": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "rendering": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          }
        }
      },
      "_Tail": {
        "type": "object",
        "required": [
          "confidence_score",
          "confidence_per_section",
          "recommended_actions_priority_order",
          "chain_to",
          "privacy",
          "execution_metadata"
        ],
        "properties": {
          "confidence_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "confidence_per_section": {
            "$ref": "#/components/schemas/ConfidencePerSection"
          },
          "recommended_actions_priority_order": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "chain_to": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChainTo"
            }
          },
          "privacy": {
            "$ref": "#/components/schemas/Privacy"
          },
          "execution_metadata": {
            "$ref": "#/components/schemas/ExecutionMetadata"
          }
        }
      },
      "CellValue": {
        "description": "A single cell value: any JSON scalar, null, array, or object.",
        "type": [
          "string",
          "number",
          "boolean",
          "null",
          "array",
          "object"
        ]
      },
      "Align": {
        "type": "string",
        "enum": [
          "left",
          "right",
          "center"
        ]
      },
      "RowObject": {
        "type": "object",
        "additionalProperties": {
          "description": "A single cell value: any JSON scalar, null, array, or object.",
          "type": [
            "string",
            "number",
            "boolean",
            "null",
            "array",
            "object"
          ]
        }
      },
      "RowArray": {
        "type": "array",
        "items": {
          "description": "A single cell value: any JSON scalar, null, array, or object.",
          "type": [
            "string",
            "number",
            "boolean",
            "null",
            "array",
            "object"
          ]
        }
      },
      "TableCore": {
        "type": "object",
        "required": [
          "format",
          "columns",
          "row_count",
          "align",
          "table"
        ],
        "properties": {
          "format": {
            "type": "string",
            "enum": [
              "markdown",
              "ascii"
            ]
          },
          "columns": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "row_count": {
            "type": "integer",
            "minimum": 0
          },
          "align": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "left",
                "right",
                "center"
              ]
            }
          },
          "table": {
            "type": "string",
            "description": "The rendered table."
          }
        }
      },
      "TableRequest": {
        "type": "object",
        "required": [
          "rows"
        ],
        "additionalProperties": false,
        "properties": {
          "rows": {
            "type": "array",
            "maxItems": 1000,
            "items": {
              "oneOf": [
                {
                  "type": "object",
                  "additionalProperties": {
                    "description": "A single cell value: any JSON scalar, null, array, or object.",
                    "type": [
                      "string",
                      "number",
                      "boolean",
                      "null",
                      "array",
                      "object"
                    ]
                  }
                },
                {
                  "type": "array",
                  "items": {
                    "description": "A single cell value: any JSON scalar, null, array, or object.",
                    "type": [
                      "string",
                      "number",
                      "boolean",
                      "null",
                      "array",
                      "object"
                    ]
                  }
                }
              ]
            },
            "description": "Row objects (column→value) or positional arrays (then \"columns\" is required)."
          },
          "columns": {
            "type": "array",
            "maxItems": 50,
            "items": {
              "type": "string"
            },
            "description": "Explicit column order / headers (required for array rows)."
          },
          "align": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "left",
                "right",
                "center"
              ]
            },
            "description": "Per-column alignment, one entry per column (default all left)."
          }
        }
      },
      "DiscoveryResponse": {
        "type": "object",
        "required": [
          "name",
          "version",
          "description",
          "openapi_url",
          "auth",
          "endpoints",
          "pricing",
          "x402_compatible",
          "capabilities"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "openapi_url": {
            "type": "string",
            "format": "uri"
          },
          "auth": {
            "type": "object",
            "required": [
              "type",
              "header"
            ],
            "additionalProperties": false,
            "properties": {
              "type": {
                "type": "string"
              },
              "header": {
                "type": "string"
              }
            }
          },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "method",
                "path",
                "summary",
                "price_usdc"
              ],
              "additionalProperties": false,
              "properties": {
                "method": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "summary": {
                  "type": "string"
                },
                "price_usdc": {
                  "type": "number"
                }
              }
            }
          },
          "pricing": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "path",
                "price_usdc",
                "currency"
              ],
              "additionalProperties": false,
              "properties": {
                "path": {
                  "type": "string"
                },
                "price_usdc": {
                  "type": "number"
                },
                "currency": {
                  "type": "string",
                  "enum": [
                    "USDC"
                  ]
                }
              }
            }
          },
          "x402_compatible": {
            "type": "boolean"
          },
          "capabilities": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Machine-readable capability tags for agent matching."
          },
          "typical_use_cases": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Optional plain-language use cases to aid autonomous discovery."
          },
          "input_examples": {
            "type": "array",
            "description": "Optional representative request bodies for primary endpoints, to aid autonomous discovery.",
            "items": {
              "type": "object",
              "required": [
                "endpoint",
                "body"
              ],
              "additionalProperties": false,
              "properties": {
                "endpoint": {
                  "type": "string"
                },
                "body": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          },
          "output_examples": {
            "type": "array",
            "description": "Optional trimmed response payloads matching input_examples (core fields only; full envelope omitted).",
            "items": {
              "type": "object",
              "required": [
                "endpoint",
                "response"
              ],
              "additionalProperties": false,
              "properties": {
                "endpoint": {
                  "type": "string"
                },
                "response": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          }
        }
      },
      "MarkdownResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/TableCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "AsciiResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/TableCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "LookupResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/TableCore"
          },
          {
            "type": "object",
            "required": [
              "reasoning"
            ],
            "properties": {
              "reasoning": {
                "$ref": "#/components/schemas/Reasoning"
              }
            }
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      }
    }
  }
}
```

## Live example responses (happy path — replayed from each endpoint's published request example)
### POST /markdown
Request:
```json
{
  "rows": [
    {
      "name": "Alice",
      "role": "Engineer",
      "commits": 142
    },
    {
      "name": "Bob",
      "role": "Designer",
      "commits": 37
    }
  ],
  "align": [
    "left",
    "left",
    "right"
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "de2jijzi-1781730505300",
  "request_id": "de2jijzi-1781730505300",
  "computed_at": "2026-06-17T21:08:25.300Z",
  "success": true,
  "latency_ms": 0,
  "format": "markdown",
  "columns": [
    "name",
    "role",
    "commits"
  ],
  "row_count": 2,
  "align": [
    "left",
    "left",
    "right"
  ],
  "table": "| name | role | commits |\n| :--- | :--- | ---: |\n| Alice | Engineer | 142 |\n| Bob | Designer | 37 |",
  "confidence_score": 1,
  "confidence_per_section": {
    "rendering": 1
  },
  "recommended_actions_priority_order": [
    "Rendered a 2×3 markdown table."
  ],
  "chain_to": [
    {
      "api": "html-entities",
      "reason": "Escape cell content before embedding the rendered table in HTML."
    },
    {
      "api": "duration-humanizer",
      "reason": "Humanize millisecond columns before rendering a report table."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

### POST /ascii
Request:
```json
{
  "rows": [
    {
      "name": "Alice",
      "role": "Engineer",
      "commits": 142
    },
    {
      "name": "Bob",
      "role": "Designer",
      "commits": 37
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "925qxd05-1781730505302",
  "request_id": "925qxd05-1781730505302",
  "computed_at": "2026-06-17T21:08:25.302Z",
  "success": true,
  "latency_ms": 0,
  "format": "ascii",
  "columns": [
    "name",
    "role",
    "commits"
  ],
  "row_count": 2,
  "align": [
    "left",
    "left",
    "left"
  ],
  "table": "+-------+----------+---------+\n| name  | role     | commits |\n+-------+----------+---------+\n| Alice | Engineer | 142     |\n| Bob   | Designer | 37      |\n+-------+----------+---------+",
  "confidence_score": 1,
  "confidence_per_section": {
    "rendering": 1
  },
  "recommended_actions_priority_order": [
    "Rendered a 2×3 ascii table."
  ],
  "chain_to": [
    {
      "api": "html-entities",
      "reason": "Escape cell content before embedding the rendered table in HTML."
    },
    {
      "api": "duration-humanizer",
      "reason": "Humanize millisecond columns before rendering a report table."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

### POST /lookup
Request:
```json
{
  "rows": [
    {
      "name": "Alice",
      "role": "Engineer",
      "commits": 142
    },
    {
      "name": "Bob",
      "role": "Designer",
      "commits": 37
    }
  ],
  "align": [
    "left",
    "left",
    "right"
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "mks8tiyj-1781730505307",
  "request_id": "mks8tiyj-1781730505307",
  "computed_at": "2026-06-17T21:08:25.307Z",
  "success": true,
  "latency_ms": 1,
  "format": "markdown",
  "columns": [
    "name",
    "role",
    "commits"
  ],
  "row_count": 2,
  "align": [
    "left",
    "left",
    "right"
  ],
  "table": "| name | role | commits |\n| :--- | :--- | ---: |\n| Alice | Engineer | 142 |\n| Bob | Designer | 37 |",
  "reasoning": {
    "why_result_generated": "Rendered 2 row(s) across 3 column(s) as a markdown table.",
    "key_factors": [
      "Columns: name, role, commits.",
      "Rows: 2.",
      "Alignment: left, left, right."
    ],
    "invalidators": [
      "Cells are stringified deterministically: strings verbatim, numbers/booleans via String(), null/undefined → empty, objects/arrays → compact JSON. Newlines within a cell are replaced by a single space (Markdown/ASCII tables are single-line per cell).",
      "Markdown rendering escapes literal \"|\" as \"\\|\"; ASCII rendering pads columns to the widest cell. Alignment (\"align\") affects the Markdown separator row and ASCII padding only.",
      "When \"columns\" is omitted, columns are the union of object keys in first-seen order; array rows REQUIRE an explicit \"columns\" header list. Missing keys render as empty cells, not errors."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "rendering": 1
  },
  "recommended_actions_priority_order": [
    "Rendered a 2×3 markdown table."
  ],
  "chain_to": [
    {
      "api": "html-entities",
      "reason": "Escape cell content before embedding the rendered table in HTML."
    },
    {
      "api": "duration-humanizer",
      "reason": "Humanize millisecond columns before rendering a report table."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true,
    "side_effects": false,
    "estimated_compute_class": "low"
  }
}
```

## Live error / edge responses
### POST /markdown (error: rows not array)
Request:
```json
{
  "rows": "nope"
}
```
Response (HTTP 400):
```json
{
  "trace_id": "8x39q00w-1781730505309",
  "request_id": "8x39q00w-1781730505309",
  "computed_at": "2026-06-17T21:08:25.309Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"rows\" must be an array."
  }
}
```

### POST /ascii (error: array rows w/o columns)
Request:
```json
{
  "rows": [
    [
      "a",
      "b"
    ]
  ]
}
```
Response (HTTP 400):
```json
{
  "trace_id": "ppkoyynw-1781730505310",
  "request_id": "ppkoyynw-1781730505310",
  "computed_at": "2026-06-17T21:08:25.310Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "When \"columns\" is omitted, every row must be an object; provide \"columns\" to use array rows."
  }
}
```

### POST /lookup (error: align length mismatch)
Request:
```json
{
  "rows": [
    {
      "a": 1
    }
  ],
  "align": [
    "left",
    "right"
  ]
}
```
Response (HTTP 400):
```json
{
  "trace_id": "pjeeyl2p-1781730505311",
  "request_id": "pjeeyl2p-1781730505311",
  "computed_at": "2026-06-17T21:08:25.311Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"align\" must have exactly 1 entries (one per column)."
  }
}
```

