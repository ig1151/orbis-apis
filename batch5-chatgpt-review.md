# Batch 5 — ChatGPT Review Bundle (Orbis A+ security + JSON dev-tools)

Date: 2026-06-16 · branch aplus/batch5-security-devtools · tsc clean · smoke 34/34 green

5 deterministic, STATELESS APIs (input → computed output, nothing fetched, nothing stored, **no LLM anywhere**). Built on the shared `src/routes/_aplus/` scaffold; the two JSON tools share `src/routes/_aplus/jsonptr.ts` (RFC 6901 primitives).

- **json-pointer** — RFC 6901 evaluator: resolve one/many pointers (with ~0/~1 unescaping, array-index rules, null-vs-missing) + enumerate all leaf pointers.
- **json-patch** — RFC 6902 engine: atomic /apply (add/remove/replace/move/copy/test, operates on a clone) + /diff (from→to, round-trippable).
- **sensitive-data-detector** — deterministic PII: regex for email/SSN/phone/IPv4/IPv6 + Luhn-validated credit cards → spans, counts, redacted text, risk level. (Distinct from the LLM-based pii-detection-api — this one is 100% deterministic.)
- **data-encryption-advisor** — rule-based rubric: data categories + regulatory + environment → classification, at-rest/in-transit/field-level/key-management guidance + compliance notes.
- **jwt-claims-designer** — generates a recommended registered+custom claim set, TTLs, example payload, signing-alg advice. (Distinct from jwt-decoder which decodes, and jwt-claim-policy-validator which validates — this GENERATES a design.)

## Please grade each API (A+/A/B/...) on:
1. **Correctness** — pointer resolution & enumeration (RFC 6901 edge cases); patch apply atomicity + move/copy/test semantics + diff round-trip (RFC 6902); PII regex/Luhn precision & overlap handling & redaction; encryption rubric mapping (esp. credentials→hashing not encryption); JWT claim choices, TTLs, alg advice.
2. **A+ envelope** — trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata; reasoning on /lookup.
3. **Honesty / confidence calibration** — exact computation reports 1; heuristics report <1 with invalidators (PII detection classification 0.8 / risk 0.7; advisor & designer recommendations 0.8). Flag any over-claim.
4. **OpenAPI 3.1 rigor** — allOf + unevaluatedProperties:false, typed 200/400/500, closed objects (no bare `{type:object}` except the typed CellValue map), x-pricing, requestExample replays == responseExample.
5. **Agent-usability & security soundness** — actionable outputs, sensible chain_to, and (critically) no insecure advice. Flag anything dangerous: weak crypto defaults, reversible-encryption-for-credentials, ReDoS, alg:none acceptance, PII echoed unsafely, etc.

## Shared — `src/routes/_aplus/scaffold.ts`
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

## Shared — `src/routes/_aplus/util.ts`
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

## Shared — `src/routes/_aplus/specparts.ts`
```ts
// Reusable OpenAPI 3.1 schema fragments for the non-finance A+ APIs, mirroring
// the validated finance convention: allOf composites use `unevaluatedProperties:
// false` (NEVER `additionalProperties:false` on an allOf branch — that self-rejects
// sibling props, the documented IP-Subnet bug). Leaves use additionalProperties:false.

export const EnvelopeOk = {
  type: 'object',
  required: ['trace_id', 'computed_at', 'success', 'latency_ms'],
  properties: {
    trace_id: { type: 'string' },
    request_id: { type: 'string', description: 'Alias of trace_id for clients that key on request_id.' },
    computed_at: { type: 'string', format: 'date-time' },
    success: { type: 'boolean', enum: [true] },
    latency_ms: { type: 'integer', minimum: 0 },
  },
};

export const ExecutionMetadata = {
  type: 'object',
  required: ['model', 'automation_safe'],
  additionalProperties: false,
  properties: { model: { type: 'string', enum: ['deterministic'] }, automation_safe: { type: 'boolean' } },
};

export const ConfidencePerSection = {
  type: 'object',
  additionalProperties: { type: 'number', minimum: 0, maximum: 1 },
};

// Per-API strict confidence_per_section schema: locks the section vocabulary to a
// known set (no arbitrary keys) while leaving keys optional so different endpoints
// may emit subsets. Bind it as the spec's `ConfidencePerSection` and the shared
// `_Tail` $ref resolves to it within that self-contained spec.
export function confSections(...keys: string[]) {
  const properties: Record<string, { type: string; minimum: number; maximum: number }> = {};
  for (const k of keys) properties[k] = { type: 'number', minimum: 0, maximum: 1 };
  return { type: 'object', additionalProperties: false, properties };
}

// Standard A+ tail shared by every intelligence response (no financial_disclaimer —
// these are non-finance APIs). Used as an allOf branch, so no additionalProperties here.
export const Tail = {
  type: 'object',
  required: ['confidence_score', 'confidence_per_section', 'recommended_actions_priority_order', 'chain_to', 'privacy', 'execution_metadata'],
  properties: {
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    confidence_per_section: { $ref: '#/components/schemas/ConfidencePerSection' },
    recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { $ref: '#/components/schemas/ChainTo' } },
    privacy: { $ref: '#/components/schemas/Privacy' },
    execution_metadata: { $ref: '#/components/schemas/ExecutionMetadata' },
  },
};

// A single dataset cell: any JSON scalar, null, array, or object — NOT an
// untyped `{}`. Used as the `additionalProperties` schema for dataset rows so
// "row" is a typed map rather than a generic object.
export const CellValue = {
  description: 'A single cell value: any JSON scalar, null, array, or object.',
  type: ['string', 'number', 'boolean', 'null', 'array', 'object'],
};

/** Typed dataset-row schema: a flat object whose values are constrained to JSON cell values. */
export function rowSchema(description = 'A dataset row as a flat JSON object (column → value).') {
  return { type: 'object', description, additionalProperties: CellValue };
}

/** Build the standard DiscoveryResponse schema (GET / payload). */
export function discoverySchema() {
  return {
    type: 'object',
    required: ['name', 'version', 'description', 'openapi_url', 'auth', 'endpoints', 'pricing', 'x402_compatible'],
    additionalProperties: false,
    properties: {
      name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
      openapi_url: { type: 'string', format: 'uri' },
      auth: { type: 'object', required: ['type', 'header'], additionalProperties: false, properties: { type: { type: 'string' }, header: { type: 'string' } } },
      endpoints: { type: 'array', items: { type: 'object', required: ['method', 'path', 'summary', 'price_usdc'], additionalProperties: false, properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
      pricing: { type: 'array', items: { type: 'object', required: ['path', 'price_usdc', 'currency'], additionalProperties: false, properties: { path: { type: 'string' }, price_usdc: { type: 'number' }, currency: { type: 'string', enum: ['USDC'] } } } },
      x402_compatible: { type: 'boolean' },
    },
  };
}

/** The common schema bag every non-finance A+ spec needs. Spread into `schemas`. */
export function baseSchemas() {
  return { EnvelopeOk, ExecutionMetadata, ConfidencePerSection, _Tail: Tail, DiscoveryResponse: discoverySchema() };
}
```

## Shared — `src/routes/_aplus/jsonptr.ts`
```ts
// Shared RFC 6901 JSON Pointer primitives for the deterministic JSON tools
// (json-pointer-api, json-patch-api). Pure functions — no LLM, no I/O.

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** Unescape a single reference token: ~1 → "/", ~0 → "~" (order matters). */
export function unescapeToken(t: string): string {
  return t.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Escape a single reference token: "~" → ~0, "/" → ~1. */
export function escapeToken(t: string): string {
  return t.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** Parse a JSON Pointer into decoded reference tokens. "" → []. Must be "" or start with "/". */
export function parsePointer(pointer: string): { error: string } | { tokens: string[] } {
  if (typeof pointer !== 'string') return { error: 'pointer must be a string.' };
  if (pointer === '') return { tokens: [] };
  if (pointer[0] !== '/') return { error: `pointer "${pointer}" must be empty or start with "/".` };
  return { tokens: pointer.slice(1).split('/').map(unescapeToken) };
}

function isArrayIndexToken(t: string): boolean {
  return t === '0' || /^[1-9][0-9]*$/.test(t); // RFC 6901: no leading zeros
}

export interface ResolveResult { found: boolean; value?: Json; reason?: string; }

/** Resolve decoded tokens against a document (RFC 6901). "-" is not resolvable (end-of-array marker). */
export function resolveTokens(doc: Json, tokens: string[]): ResolveResult {
  let cur: Json = doc;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (Array.isArray(cur)) {
      if (tok === '-') return { found: false, reason: `token "-" at index ${i} refers to the (nonexistent) element after the last array item.` };
      if (!isArrayIndexToken(tok)) return { found: false, reason: `token "${tok}" at index ${i} is not a valid array index.` };
      const idx = Number(tok);
      if (idx >= cur.length) return { found: false, reason: `array index ${idx} at index ${i} is out of bounds (length ${cur.length}).` };
      cur = cur[idx];
    } else if (cur !== null && typeof cur === 'object') {
      if (!Object.prototype.hasOwnProperty.call(cur, tok)) return { found: false, reason: `key "${tok}" at index ${i} does not exist.` };
      cur = (cur as { [k: string]: Json })[tok];
    } else {
      return { found: false, reason: `cannot descend into a ${cur === null ? 'null' : typeof cur} value at token index ${i}.` };
    }
  }
  return { found: true, value: cur };
}

export interface PointerEntry { pointer: string; value: Json; type: string; }

/** JSON type label for a value. */
export function jsonType(v: Json): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v; // 'object' | 'string' | 'number' | 'boolean'
}

/**
 * Enumerate leaf pointers of a document: every scalar (and every empty
 * array/object) addressed by its RFC 6901 pointer, in document order.
 * The whole-document pointer "" is included only when the document itself is a leaf.
 */
export function enumerateLeaves(doc: Json, max = 5000): PointerEntry[] {
  const out: PointerEntry[] = [];
  const walk = (node: Json, ptr: string): void => {
    if (out.length >= max) return;
    if (Array.isArray(node)) {
      if (node.length === 0) { out.push({ pointer: ptr, value: node, type: 'array' }); return; }
      for (let i = 0; i < node.length; i++) walk(node[i], `${ptr}/${i}`);
    } else if (node !== null && typeof node === 'object') {
      const keys = Object.keys(node);
      if (keys.length === 0) { out.push({ pointer: ptr, value: node, type: 'object' }); return; }
      for (const k of keys) walk((node as { [k: string]: Json })[k], `${ptr}/${escapeToken(k)}`);
    } else {
      out.push({ pointer: ptr, value: node, type: jsonType(node) });
    }
  };
  walk(doc, '');
  return out;
}
```

---

# json-pointer

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { parsePointer, resolveTokens, enumerateLeaves, jsonType, Json } from '../../_aplus/jsonptr';

// Deterministic RFC 6901 JSON Pointer evaluator. Resolves one or many pointers
// against a supplied JSON document (with ~0/~1 unescaping and array-index rules),
// and can enumerate every leaf pointer of a document. Pure computation — no LLM,
// nothing fetched, nothing stored.

const router = Router();

const MAX_POINTERS = 2000;
const ENUM_HARD_CAP = 20000;

export interface ResolveEntry { pointer: string; found: boolean; value?: Json; type?: string; reason?: string; }
export interface ResolveCore { document_type: string; requested: number; found_count: number; missing_count: number; results: ResolveEntry[]; }
export interface EnumerateCore { document_type: string; leaf_count: number; truncated: boolean; entries: { pointer: string; value: Json; type: string }[]; }

function hasDoc(body: any): boolean {
  return body !== null && typeof body === 'object' && !Array.isArray(body) && 'document' in body;
}

function resolveOne(doc: Json, pointer: string): ResolveEntry {
  const p = parsePointer(pointer);
  if ('error' in p) return { pointer, found: false, reason: p.error };
  const r = resolveTokens(doc, p.tokens);
  return r.found ? { pointer, found: true, value: r.value, type: jsonType(r.value as Json) } : { pointer, found: false, reason: r.reason };
}

function doResolve(body: any): { error: string } | { result: ResolveCore } {
  if (!hasDoc(body)) return { error: 'Provide an object with a "document" and "pointer" (or "pointers").' };
  const doc = body.document as Json;
  let pointers: string[];
  if (Array.isArray(body.pointers)) {
    if (body.pointers.length === 0) return { error: '"pointers" must be a non-empty array of JSON Pointer strings.' };
    if (body.pointers.length > MAX_POINTERS) return { error: `"pointers" exceeds the ${MAX_POINTERS}-pointer limit.` };
    if (!body.pointers.every((s: unknown) => typeof s === 'string')) return { error: '"pointers" must contain only strings.' };
    pointers = body.pointers as string[];
  } else if (typeof body.pointer === 'string') {
    pointers = [body.pointer];
  } else {
    return { error: 'Provide "pointer" (string) or "pointers" (string[]).' };
  }
  const results = pointers.map((p) => resolveOne(doc, p));
  const found_count = results.filter((r) => r.found).length;
  return { result: { document_type: jsonType(doc), requested: results.length, found_count, missing_count: results.length - found_count, results } };
}

function doEnumerate(body: any): { error: string } | { result: EnumerateCore } {
  if (!hasDoc(body)) return { error: 'Provide an object with a "document".' };
  const doc = body.document as Json;
  let max = 5000;
  if (body.max !== undefined) {
    if (typeof body.max !== 'number' || !Number.isInteger(body.max) || body.max < 1 || body.max > ENUM_HARD_CAP) return { error: `"max" must be an integer in [1, ${ENUM_HARD_CAP}].` };
    max = body.max;
  }
  const entries = enumerateLeaves(doc, max + 1);
  const truncated = entries.length > max;
  const kept = truncated ? entries.slice(0, max) : entries;
  return { result: { document_type: jsonType(doc), leaf_count: kept.length, truncated, entries: kept } };
}

const CHAIN_TO = [
  { api: 'json-patch', reason: 'Mutate the document at these pointers with RFC 6902 add/remove/replace operations.' },
  { api: 'json-schema-validator', reason: 'Validate the document these pointers address against a JSON Schema.' },
];
const INVALIDATORS = [
  'Pointers follow RFC 6901: tokens are ~1→"/" and ~0→"~" unescaped; array indices must be "0" or have no leading zeros; "-" (end-of-array) is reported as not-found because it addresses no existing element.',
  'A pointer is "not found" (not an error) when the path does not exist in this document; only malformed pointers (not starting with "/") are reported via reason without a value.',
  'Resolution reflects only the supplied document; a value of null is a real found value, distinguished from missing by the found flag.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'JSON Pointer API', version: '1.0.0',
    description: 'Deterministic RFC 6901 JSON Pointer evaluator. Resolves one or many pointers against a supplied JSON document and can enumerate every leaf pointer. No LLM, nothing fetched, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/json-pointer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/resolve', summary: 'Resolve one or many JSON Pointers', price_usdc: 0.005 },
      { method: 'POST', path: '/enumerate', summary: 'List every leaf pointer in a document', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL resolve + reasoning', price_usdc: 0.009 },
    ],
    pricing: [
      { path: '/resolve', price_usdc: 0.005, currency: 'USDC' },
      { path: '/enumerate', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/resolve', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doResolve(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ resolution: 1 }, [`Resolved ${v.found_count}/${v.requested} pointer(s); ${v.missing_count} not found.`]) });
});

router.post('/enumerate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doEnumerate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ enumeration: 1 }, [`Enumerated ${v.leaf_count} leaf pointer(s)${v.truncated ? ' (truncated — raise max for more)' : ''}.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doResolve(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Resolved ${v.requested} JSON Pointer(s) against a ${v.document_type} document: ${v.found_count} found, ${v.missing_count} missing.`,
      key_factors: [
        `Found: ${v.results.filter((x) => x.found).map((x) => x.pointer || '""').join(', ') || '(none)'}.`,
        `Missing: ${v.results.filter((x) => !x.found).map((x) => `${x.pointer || '""'} (${x.reason})`).join('; ') || '(none)'}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ resolution: 1 }, [`Resolved ${v.found_count}/${v.requested} pointer(s); ${v.missing_count} not found.`]),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, CellValue } from '../../_aplus/specparts';
import { resolveExample, enumerateExample, lookupExample } from './examples';

const ResolveEntry = {
  type: 'object', required: ['pointer', 'found'], additionalProperties: false,
  properties: {
    pointer: { type: 'string' },
    found: { type: 'boolean' },
    value: { ...CellValue, description: 'The value at the pointer (present only when found; null is a valid found value).' },
    type: { type: 'string', description: 'JSON type of the found value.' },
    reason: { type: 'string', description: 'Why a pointer was not found, or why it is malformed.' },
  },
};
const ResolveCore = {
  type: 'object', required: ['document_type', 'requested', 'found_count', 'missing_count', 'results'],
  properties: {
    document_type: { type: 'string' },
    requested: { type: 'integer', minimum: 0 },
    found_count: { type: 'integer', minimum: 0 },
    missing_count: { type: 'integer', minimum: 0 },
    results: { type: 'array', items: ResolveEntry },
  },
};
const PointerEntry = {
  type: 'object', required: ['pointer', 'value', 'type'], additionalProperties: false,
  properties: { pointer: { type: 'string' }, value: CellValue, type: { type: 'string' } },
};
const EnumerateCore = {
  type: 'object', required: ['document_type', 'leaf_count', 'truncated', 'entries'],
  properties: {
    document_type: { type: 'string' },
    leaf_count: { type: 'integer', minimum: 0 },
    truncated: { type: 'boolean' },
    entries: { type: 'array', items: PointerEntry },
  },
};
const ResolveRequest = {
  type: 'object', required: ['document'], additionalProperties: false,
  properties: {
    document: { ...CellValue, description: 'Any JSON document to resolve against.' },
    pointer: { type: 'string', description: 'A single RFC 6901 JSON Pointer.' },
    pointers: { type: 'array', items: { type: 'string' }, description: 'Multiple JSON Pointers (alternative to "pointer").' },
  },
};
const EnumerateRequest = {
  type: 'object', required: ['document'], additionalProperties: false,
  properties: {
    document: { ...CellValue, description: 'Any JSON document to enumerate.' },
    max: { type: 'integer', minimum: 1, description: 'Max leaf pointers to return (default 5000).' },
  },
};

const resolveReq = {
  document: { user: { name: 'Ada', roles: ['admin', 'editor'], 'a/b': 1 }, items: [10, 20], active: null },
  pointers: ['/user/name', '/user/roles/0', '/user/a~1b', '/items/1', '/active', '/user/missing', '/items/5'],
};
const enumerateReq = { document: { user: { name: 'Ada', active: true }, tags: ['x', 'y'], meta: {} } };

const disc = {
  name: 'JSON Pointer API', version: '1.0.0',
  description: 'Deterministic RFC 6901 JSON Pointer evaluator. Resolves one or many pointers against a supplied JSON document and can enumerate every leaf pointer. No LLM, nothing fetched, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/json-pointer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/resolve', summary: 'Resolve one or many JSON Pointers', price_usdc: 0.005 },
    { method: 'POST', path: '/enumerate', summary: 'List every leaf pointer in a document', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL resolve + reasoning', price_usdc: 0.009 },
  ],
  pricing: [
    { path: '/resolve', price_usdc: 0.005, currency: 'USDC' },
    { path: '/enumerate', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('resolution', 'enumeration'), _Tail: Tail,
  ResolveEntry, ResolveCore, PointerEntry, EnumerateCore, ResolveRequest, EnumerateRequest, DiscoveryResponse: discoverySchema(),
  ResolveResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ResolveCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  EnumerateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EnumerateCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ResolveCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/resolve', summary: 'Resolve one or many JSON Pointers', operationId: 'resolve', priceUsdc: 0.005, requestSchemaRef: 'ResolveRequest', responseSchemaRef: 'ResolveResponse', requestExample: resolveReq, responseExample: resolveExample },
  { method: 'post', path: '/enumerate', summary: 'List every leaf pointer in a document', operationId: 'enumerate', priceUsdc: 0.006, requestSchemaRef: 'EnumerateRequest', responseSchemaRef: 'EnumerateResponse', requestExample: enumerateReq, responseExample: enumerateExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL resolve + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true, requestSchemaRef: 'ResolveRequest', responseSchemaRef: 'LookupResponse', requestExample: resolveReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'json-pointer', title: 'JSON Pointer API', version: '1.0.0',
  description: 'Deterministic RFC 6901 JSON Pointer evaluator — resolve one/many pointers + enumerate all leaf pointers of a JSON document. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (GET /json-pointer/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "JSON Pointer API",
    "version": "1.0.0",
    "description": "Deterministic RFC 6901 JSON Pointer evaluator — resolve one/many pointers + enumerate all leaf pointers of a JSON document. No LLM.",
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
      "url": "https://orbis-apis.onrender.com/json-pointer"
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
                  "name": "JSON Pointer API",
                  "version": "1.0.0",
                  "description": "Deterministic RFC 6901 JSON Pointer evaluator. Resolves one or many pointers against a supplied JSON document and can enumerate every leaf pointer. No LLM, nothing fetched, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/json-pointer/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/resolve",
                      "summary": "Resolve one or many JSON Pointers",
                      "price_usdc": 0.005
                    },
                    {
                      "method": "POST",
                      "path": "/enumerate",
                      "summary": "List every leaf pointer in a document",
                      "price_usdc": 0.006
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL resolve + reasoning",
                      "price_usdc": 0.009
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/resolve",
                      "price_usdc": 0.005,
                      "currency": "USDC"
                    },
                    {
                      "path": "/enumerate",
                      "price_usdc": 0.006,
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
    "/resolve": {
      "post": {
        "operationId": "resolve",
        "summary": "Resolve one or many JSON Pointers",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResolveResponse"
                },
                "example": {
                  "trace_id": "jptr-1780000000000",
                  "request_id": "jptr-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "document_type": "object",
                  "requested": 7,
                  "found_count": 5,
                  "missing_count": 2,
                  "results": [
                    {
                      "pointer": "/user/name",
                      "found": true,
                      "value": "Ada",
                      "type": "string"
                    },
                    {
                      "pointer": "/user/roles/0",
                      "found": true,
                      "value": "admin",
                      "type": "string"
                    },
                    {
                      "pointer": "/user/a~1b",
                      "found": true,
                      "value": 1,
                      "type": "number"
                    },
                    {
                      "pointer": "/items/1",
                      "found": true,
                      "value": 20,
                      "type": "number"
                    },
                    {
                      "pointer": "/active",
                      "found": true,
                      "value": null,
                      "type": "null"
                    },
                    {
                      "pointer": "/user/missing",
                      "found": false,
                      "reason": "key \"missing\" at index 1 does not exist."
                    },
                    {
                      "pointer": "/items/5",
                      "found": false,
                      "reason": "array index 5 at index 1 is out of bounds (length 2)."
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "resolution": 1
                  },
                  "recommended_actions_priority_order": [
                    "Resolved 5/7 pointer(s); 2 not found."
                  ],
                  "chain_to": [
                    {
                      "api": "json-patch",
                      "reason": "Mutate the document at these pointers with RFC 6902 add/remove/replace operations."
                    },
                    {
                      "api": "json-schema-validator",
                      "reason": "Validate the document these pointers address against a JSON Schema."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true
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
                "$ref": "#/components/schemas/ResolveRequest"
              },
              "example": {
                "document": {
                  "user": {
                    "name": "Ada",
                    "roles": [
                      "admin",
                      "editor"
                    ],
                    "a/b": 1
                  },
                  "items": [
                    10,
                    20
                  ],
                  "active": null
                },
                "pointers": [
                  "/user/name",
                  "/user/roles/0",
                  "/user/a~1b",
                  "/items/1",
                  "/active",
                  "/user/missing",
                  "/items/5"
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
    "/enumerate": {
      "post": {
        "operationId": "enumerate",
        "summary": "List every leaf pointer in a document",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EnumerateResponse"
                },
                "example": {
                  "trace_id": "jptr-1780000000000",
                  "request_id": "jptr-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "document_type": "object",
                  "leaf_count": 5,
                  "truncated": false,
                  "entries": [
                    {
                      "pointer": "/user/name",
                      "value": "Ada",
                      "type": "string"
                    },
                    {
                      "pointer": "/user/active",
                      "value": true,
                      "type": "boolean"
                    },
                    {
                      "pointer": "/tags/0",
                      "value": "x",
                      "type": "string"
                    },
                    {
                      "pointer": "/tags/1",
                      "value": "y",
                      "type": "string"
                    },
                    {
                      "pointer": "/meta",
                      "value": {},
                      "type": "object"
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "enumeration": 1
                  },
                  "recommended_actions_priority_order": [
                    "Enumerated 5 leaf pointer(s)."
                  ],
                  "chain_to": [
                    {
                      "api": "json-patch",
                      "reason": "Mutate the document at these pointers with RFC 6902 add/remove/replace operations."
                    },
                    {
                      "api": "json-schema-validator",
                      "reason": "Validate the document these pointers address against a JSON Schema."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true
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
                "$ref": "#/components/schemas/EnumerateRequest"
              },
              "example": {
                "document": {
                  "user": {
                    "name": "Ada",
                    "active": true
                  },
                  "tags": [
                    "x",
                    "y"
                  ],
                  "meta": {}
                }
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
        "summary": "ONE-CALL resolve + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "jptr-1780000000000",
                  "request_id": "jptr-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "document_type": "object",
                  "requested": 7,
                  "found_count": 5,
                  "missing_count": 2,
                  "results": [
                    {
                      "pointer": "/user/name",
                      "found": true,
                      "value": "Ada",
                      "type": "string"
                    },
                    {
                      "pointer": "/user/roles/0",
                      "found": true,
                      "value": "admin",
                      "type": "string"
                    },
                    {
                      "pointer": "/user/a~1b",
                      "found": true,
                      "value": 1,
                      "type": "number"
                    },
                    {
                      "pointer": "/items/1",
                      "found": true,
                      "value": 20,
                      "type": "number"
                    },
                    {
                      "pointer": "/active",
                      "found": true,
                      "value": null,
                      "type": "null"
                    },
                    {
                      "pointer": "/user/missing",
                      "found": false,
                      "reason": "key \"missing\" at index 1 does not exist."
                    },
                    {
                      "pointer": "/items/5",
                      "found": false,
                      "reason": "array index 5 at index 1 is out of bounds (length 2)."
                    }
                  ],
                  "reasoning": {
                    "why_result_generated": "Resolved 7 JSON Pointer(s) against a object document: 5 found, 2 missing.",
                    "key_factors": [
                      "Found: /user/name, /user/roles/0, /user/a~1b, /items/1, /active.",
                      "Missing: /user/missing (key \"missing\" at index 1 does not exist.); /items/5 (array index 5 at index 1 is out of bounds (length 2).)."
                    ],
                    "invalidators": [
                      "Pointers follow RFC 6901: tokens are ~1→\"/\" and ~0→\"~\" unescaped; array indices must be \"0\" or have no leading zeros; \"-\" (end-of-array) is reported as not-found because it addresses no existing element.",
                      "A pointer is \"not found\" (not an error) when the path does not exist in this document; only malformed pointers (not starting with \"/\") are reported via reason without a value.",
                      "Resolution reflects only the supplied document; a value of null is a real found value, distinguished from missing by the found flag."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "resolution": 1
                  },
                  "recommended_actions_priority_order": [
                    "Resolved 5/7 pointer(s); 2 not found."
                  ],
                  "chain_to": [
                    {
                      "api": "json-patch",
                      "reason": "Mutate the document at these pointers with RFC 6902 add/remove/replace operations."
                    },
                    {
                      "api": "json-schema-validator",
                      "reason": "Validate the document these pointers address against a JSON Schema."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true
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
                "$ref": "#/components/schemas/ResolveRequest"
              },
              "example": {
                "document": {
                  "user": {
                    "name": "Ada",
                    "roles": [
                      "admin",
                      "editor"
                    ],
                    "a/b": 1
                  },
                  "items": [
                    10,
                    20
                  ],
                  "active": null
                },
                "pointers": [
                  "/user/name",
                  "/user/roles/0",
                  "/user/a~1b",
                  "/items/1",
                  "/active",
                  "/user/missing",
                  "/items/5"
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
          "latency_ms"
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
          "automation_safe"
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
          }
        }
      },
      "ConfidencePerSection": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "resolution": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "enumeration": {
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
      "ResolveEntry": {
        "type": "object",
        "required": [
          "pointer",
          "found"
        ],
        "additionalProperties": false,
        "properties": {
          "pointer": {
            "type": "string"
          },
          "found": {
            "type": "boolean"
          },
          "value": {
            "description": "The value at the pointer (present only when found; null is a valid found value).",
            "type": [
              "string",
              "number",
              "boolean",
              "null",
              "array",
              "object"
            ]
          },
          "type": {
            "type": "string",
            "description": "JSON type of the found value."
          },
          "reason": {
            "type": "string",
            "description": "Why a pointer was not found, or why it is malformed."
          }
        }
      },
      "ResolveCore": {
        "type": "object",
        "required": [
          "document_type",
          "requested",
          "found_count",
          "missing_count",
          "results"
        ],
        "properties": {
          "document_type": {
            "type": "string"
          },
          "requested": {
            "type": "integer",
            "minimum": 0
          },
          "found_count": {
            "type": "integer",
            "minimum": 0
          },
          "missing_count": {
            "type": "integer",
            "minimum": 0
          },
          "results": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "pointer",
                "found"
              ],
              "additionalProperties": false,
              "properties": {
                "pointer": {
                  "type": "string"
                },
                "found": {
                  "type": "boolean"
                },
                "value": {
                  "description": "The value at the pointer (present only when found; null is a valid found value).",
                  "type": [
                    "string",
                    "number",
                    "boolean",
                    "null",
                    "array",
                    "object"
                  ]
                },
                "type": {
                  "type": "string",
                  "description": "JSON type of the found value."
                },
                "reason": {
                  "type": "string",
                  "description": "Why a pointer was not found, or why it is malformed."
                }
              }
            }
          }
        }
      },
      "PointerEntry": {
        "type": "object",
        "required": [
          "pointer",
          "value",
          "type"
        ],
        "additionalProperties": false,
        "properties": {
          "pointer": {
            "type": "string"
          },
          "value": {
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
          "type": {
            "type": "string"
          }
        }
      },
      "EnumerateCore": {
        "type": "object",
        "required": [
          "document_type",
          "leaf_count",
          "truncated",
          "entries"
        ],
        "properties": {
          "document_type": {
            "type": "string"
          },
          "leaf_count": {
            "type": "integer",
            "minimum": 0
          },
          "truncated": {
            "type": "boolean"
          },
          "entries": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "pointer",
                "value",
                "type"
              ],
              "additionalProperties": false,
              "properties": {
                "pointer": {
                  "type": "string"
                },
                "value": {
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
                "type": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "ResolveRequest": {
        "type": "object",
        "required": [
          "document"
        ],
        "additionalProperties": false,
        "properties": {
          "document": {
            "description": "Any JSON document to resolve against.",
            "type": [
              "string",
              "number",
              "boolean",
              "null",
              "array",
              "object"
            ]
          },
          "pointer": {
            "type": "string",
            "description": "A single RFC 6901 JSON Pointer."
          },
          "pointers": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Multiple JSON Pointers (alternative to \"pointer\")."
          }
        }
      },
      "EnumerateRequest": {
        "type": "object",
        "required": [
          "document"
        ],
        "additionalProperties": false,
        "properties": {
          "document": {
            "description": "Any JSON document to enumerate.",
            "type": [
              "string",
              "number",
              "boolean",
              "null",
              "array",
              "object"
            ]
          },
          "max": {
            "type": "integer",
            "minimum": 1,
            "description": "Max leaf pointers to return (default 5000)."
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
          "x402_compatible"
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
          }
        }
      },
      "ResolveResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/ResolveCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "EnumerateResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/EnumerateCore"
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
            "$ref": "#/components/schemas/ResolveCore"
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

## Live example responses
### POST /resolve (found + escaped ~1 + null value + missing + out-of-bounds)
Request:
```json
{
  "document": {
    "user": {
      "name": "Ada",
      "roles": [
        "admin",
        "editor"
      ],
      "a/b": 1
    },
    "items": [
      10,
      20
    ],
    "active": null
  },
  "pointers": [
    "/user/name",
    "/user/roles/0",
    "/user/a~1b",
    "/items/1",
    "/active",
    "/user/missing",
    "/items/5"
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "s9smgn2e-1781576000892",
  "request_id": "s9smgn2e-1781576000892",
  "computed_at": "2026-06-16T02:13:20.892Z",
  "success": true,
  "latency_ms": 0,
  "document_type": "object",
  "requested": 7,
  "found_count": 5,
  "missing_count": 2,
  "results": [
    {
      "pointer": "/user/name",
      "found": true,
      "value": "Ada",
      "type": "string"
    },
    {
      "pointer": "/user/roles/0",
      "found": true,
      "value": "admin",
      "type": "string"
    },
    {
      "pointer": "/user/a~1b",
      "found": true,
      "value": 1,
      "type": "number"
    },
    {
      "pointer": "/items/1",
      "found": true,
      "value": 20,
      "type": "number"
    },
    {
      "pointer": "/active",
      "found": true,
      "value": null,
      "type": "null"
    },
    {
      "pointer": "/user/missing",
      "found": false,
      "reason": "key \"missing\" at index 1 does not exist."
    },
    {
      "pointer": "/items/5",
      "found": false,
      "reason": "array index 5 at index 1 is out of bounds (length 2)."
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "resolution": 1
  },
  "recommended_actions_priority_order": [
    "Resolved 5/7 pointer(s); 2 not found."
  ],
  "chain_to": [
    {
      "api": "json-patch",
      "reason": "Mutate the document at these pointers with RFC 6902 add/remove/replace operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the document these pointers address against a JSON Schema."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /enumerate (nested + empty object/array leaves)
Request:
```json
{
  "document": {
    "user": {
      "name": "Ada",
      "active": true
    },
    "tags": [
      "x",
      "y"
    ],
    "meta": {},
    "empties": []
  }
}
```
Response (HTTP 200):
```json
{
  "trace_id": "k32i7ybc-1781576000898",
  "request_id": "k32i7ybc-1781576000898",
  "computed_at": "2026-06-16T02:13:20.898Z",
  "success": true,
  "latency_ms": 0,
  "document_type": "object",
  "leaf_count": 6,
  "truncated": false,
  "entries": [
    {
      "pointer": "/user/name",
      "value": "Ada",
      "type": "string"
    },
    {
      "pointer": "/user/active",
      "value": true,
      "type": "boolean"
    },
    {
      "pointer": "/tags/0",
      "value": "x",
      "type": "string"
    },
    {
      "pointer": "/tags/1",
      "value": "y",
      "type": "string"
    },
    {
      "pointer": "/meta",
      "value": {},
      "type": "object"
    },
    {
      "pointer": "/empties",
      "value": [],
      "type": "array"
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "enumeration": 1
  },
  "recommended_actions_priority_order": [
    "Enumerated 6 leaf pointer(s)."
  ],
  "chain_to": [
    {
      "api": "json-patch",
      "reason": "Mutate the document at these pointers with RFC 6902 add/remove/replace operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the document these pointers address against a JSON Schema."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /lookup (resolve + reasoning)
Request:
```json
{
  "document": {
    "a": {
      "b": [
        1,
        2
      ]
    }
  },
  "pointer": "/a/b/1"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "xob3732y-1781576000901",
  "request_id": "xob3732y-1781576000901",
  "computed_at": "2026-06-16T02:13:20.901Z",
  "success": true,
  "latency_ms": 0,
  "document_type": "object",
  "requested": 1,
  "found_count": 1,
  "missing_count": 0,
  "results": [
    {
      "pointer": "/a/b/1",
      "found": true,
      "value": 2,
      "type": "number"
    }
  ],
  "reasoning": {
    "why_result_generated": "Resolved 1 JSON Pointer(s) against a object document: 1 found, 0 missing.",
    "key_factors": [
      "Found: /a/b/1.",
      "Missing: (none)."
    ],
    "invalidators": [
      "Pointers follow RFC 6901: tokens are ~1→\"/\" and ~0→\"~\" unescaped; array indices must be \"0\" or have no leading zeros; \"-\" (end-of-array) is reported as not-found because it addresses no existing element.",
      "A pointer is \"not found\" (not an error) when the path does not exist in this document; only malformed pointers (not starting with \"/\") are reported via reason without a value.",
      "Resolution reflects only the supplied document; a value of null is a real found value, distinguished from missing by the found flag."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "resolution": 1
  },
  "recommended_actions_priority_order": [
    "Resolved 1/1 pointer(s); 0 not found."
  ],
  "chain_to": [
    {
      "api": "json-patch",
      "reason": "Mutate the document at these pointers with RFC 6902 add/remove/replace operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the document these pointers address against a JSON Schema."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /resolve (error: no pointer/pointers)
Request:
```json
{
  "document": {
    "a": 1
  }
}
```
Response (HTTP 400):
```json
{
  "trace_id": "npag8hnh-1781576000905",
  "request_id": "npag8hnh-1781576000905",
  "computed_at": "2026-06-16T02:13:20.905Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "Provide \"pointer\" (string) or \"pointers\" (string[])."
  }
}
```

---

# json-patch

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { parsePointer, resolveTokens, escapeToken, Json } from '../../_aplus/jsonptr';

// Deterministic RFC 6902 JSON Patch engine. /apply runs an ordered patch
// (add/remove/replace/move/copy/test) against a document atomically; /diff
// generates a patch that transforms one document into another. Pure computation,
// operating on a clone — the input is never mutated. No LLM, nothing stored.

const router = Router();

const OPS = ['add', 'remove', 'replace', 'move', 'copy', 'test'];
const MAX_OPS = 5000;

export interface TestResult { index: number; path: string; passed: boolean; }
export interface ApplyCore {
  operation_count: number;
  applied: boolean;
  document?: Json;
  failed_at_index?: number;
  failure_reason?: string;
  test_results: TestResult[];
}
export interface DiffCore { operation_count: number; patch: PatchOp[]; }

interface PatchOp { op: string; path: string; from?: string; value?: Json; }

function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual((a as any)[k], (b as any)[k]));
  }
  return false;
}

const clone = (v: Json): Json => structuredClone(v);
const isArrIdx = (t: string) => t === '0' || /^[1-9][0-9]*$/.test(t);

// Locate the parent container of a pointer's last token. allowAppend permits index===length / "-".
function parent(doc: Json, tokens: string[]): { ok: true; container: Json[] | { [k: string]: Json }; last: string } | { ok: false; reason: string } {
  const r = resolveTokens(doc, tokens.slice(0, -1));
  if (!r.found) return { ok: false, reason: r.reason || 'parent path not found' };
  const c = r.value as Json;
  if (c === null || typeof c !== 'object') return { ok: false, reason: 'parent is not an object or array' };
  return { ok: true, container: c as any, last: tokens[tokens.length - 1] };
}

function addOp(doc: Json, tokens: string[], value: Json): { ok: true; doc: Json } | { ok: false; reason: string } {
  if (tokens.length === 0) return { ok: true, doc: clone(value) };
  const p = parent(doc, tokens);
  if (!p.ok) return p;
  if (Array.isArray(p.container)) {
    const arr = p.container;
    if (p.last === '-') { arr.push(clone(value)); return { ok: true, doc }; }
    if (!isArrIdx(p.last)) return { ok: false, reason: `"${p.last}" is not a valid array index for add.` };
    const idx = Number(p.last);
    if (idx > arr.length) return { ok: false, reason: `add index ${idx} is out of bounds (length ${arr.length}).` };
    arr.splice(idx, 0, clone(value));
  } else {
    (p.container as any)[p.last] = clone(value);
  }
  return { ok: true, doc };
}

function removeOp(doc: Json, tokens: string[]): { ok: true; doc: Json } | { ok: false; reason: string } {
  if (tokens.length === 0) return { ok: false, reason: 'cannot remove the whole document (path "").' };
  const p = parent(doc, tokens);
  if (!p.ok) return p;
  if (Array.isArray(p.container)) {
    if (!isArrIdx(p.last)) return { ok: false, reason: `"${p.last}" is not a valid array index for remove.` };
    const idx = Number(p.last);
    if (idx >= p.container.length) return { ok: false, reason: `remove index ${idx} out of bounds (length ${p.container.length}).` };
    p.container.splice(idx, 1);
  } else {
    if (!Object.prototype.hasOwnProperty.call(p.container, p.last)) return { ok: false, reason: `key "${p.last}" does not exist for remove.` };
    delete (p.container as any)[p.last];
  }
  return { ok: true, doc };
}

function replaceOp(doc: Json, tokens: string[], value: Json): { ok: true; doc: Json } | { ok: false; reason: string } {
  const exists = resolveTokens(doc, tokens);
  if (!exists.found) return { ok: false, reason: `replace target does not exist: ${exists.reason}` };
  if (tokens.length === 0) return { ok: true, doc: clone(value) };
  const p = parent(doc, tokens) as { ok: true; container: any; last: string };
  if (Array.isArray(p.container)) p.container[Number(p.last)] = clone(value);
  else p.container[p.last] = clone(value);
  return { ok: true, doc };
}

function applyOne(doc: Json, op: PatchOp): { ok: true; doc: Json; test?: boolean } | { ok: false; reason: string } {
  const pp = parsePointer(op.path);
  if ('error' in pp) return { ok: false, reason: pp.error };
  const tokens = pp.tokens;
  switch (op.op) {
    case 'add': return addOp(doc, tokens, op.value as Json);
    case 'remove': return removeOp(doc, tokens);
    case 'replace': return replaceOp(doc, tokens, op.value as Json);
    case 'test': {
      const r = resolveTokens(doc, tokens);
      const passed = r.found && deepEqual(r.value as Json, op.value as Json);
      return passed ? { ok: true, doc, test: true } : { ok: false, reason: `test failed at ${op.path}: value does not match.` };
    }
    case 'move':
    case 'copy': {
      const fp = parsePointer(op.from as string);
      if ('error' in fp) return { ok: false, reason: `invalid "from": ${fp.error}` };
      const src = resolveTokens(doc, fp.tokens);
      if (!src.found) return { ok: false, reason: `"from" path does not exist: ${src.reason}` };
      // move into own subtree is illegal
      if (op.op === 'move' && tokens.length >= fp.tokens.length && fp.tokens.every((t, i) => t === tokens[i])) {
        return { ok: false, reason: 'cannot move a value into one of its own children.' };
      }
      const val = clone(src.value as Json);
      let work = doc;
      if (op.op === 'move') { const rm = removeOp(work, fp.tokens); if (!rm.ok) return rm; work = rm.doc; }
      return addOp(work, tokens, val);
    }
    default: return { ok: false, reason: `unknown op "${op.op}".` };
  }
}

function doApply(body: any): { error: string } | { result: ApplyCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body) || !('document' in body)) return { error: 'Provide an object with a "document" and a "patch" array.' };
  if (!Array.isArray(body.patch)) return { error: '"patch" must be an array of RFC 6902 operations.' };
  if (body.patch.length > MAX_OPS) return { error: `"patch" exceeds the ${MAX_OPS}-operation limit.` };
  const ops: PatchOp[] = [];
  for (let i = 0; i < body.patch.length; i++) {
    const o = body.patch[i];
    if (o === null || typeof o !== 'object' || Array.isArray(o)) return { error: `patch[${i}] must be an object.` };
    if (!OPS.includes(o.op)) return { error: `patch[${i}].op must be one of: ${OPS.join(', ')}.` };
    if (typeof o.path !== 'string') return { error: `patch[${i}].path must be a string.` };
    if ((o.op === 'add' || o.op === 'replace' || o.op === 'test') && !('value' in o)) return { error: `patch[${i}] (${o.op}) requires a "value".` };
    if ((o.op === 'move' || o.op === 'copy') && typeof o.from !== 'string') return { error: `patch[${i}] (${o.op}) requires a string "from".` };
    ops.push({ op: o.op, path: o.path, from: o.from, value: o.value });
  }

  let work = clone(body.document as Json);
  const test_results: TestResult[] = [];
  for (let i = 0; i < ops.length; i++) {
    const r = applyOne(work, ops[i]);
    if (ops[i].op === 'test') test_results.push({ index: i, path: ops[i].path, passed: r.ok });
    if (!r.ok) return { result: { operation_count: ops.length, applied: false, failed_at_index: i, failure_reason: r.reason, test_results } };
    work = r.doc;
  }
  return { result: { operation_count: ops.length, applied: true, document: work, test_results } };
}

// --- diff (generate a patch transforming `from` into `to`) ---
function diff(from: Json, to: Json, base: string, out: PatchOp[]): void {
  if (deepEqual(from, to)) return;
  const aObj = from !== null && typeof from === 'object' && !Array.isArray(from);
  const bObj = to !== null && typeof to === 'object' && !Array.isArray(to);
  const aArr = Array.isArray(from), bArr = Array.isArray(to);
  if (aObj && bObj) {
    const fa = from as { [k: string]: Json }, fb = to as { [k: string]: Json };
    for (const k of Object.keys(fa)) if (!Object.prototype.hasOwnProperty.call(fb, k)) out.push({ op: 'remove', path: `${base}/${escapeToken(k)}` });
    for (const k of Object.keys(fb)) {
      const p = `${base}/${escapeToken(k)}`;
      if (!Object.prototype.hasOwnProperty.call(fa, k)) out.push({ op: 'add', path: p, value: fb[k] });
      else diff(fa[k], fb[k], p, out);
    }
  } else if (aArr && bArr) {
    const common = Math.min(from.length, to.length);
    for (let i = 0; i < common; i++) diff(from[i], to[i], `${base}/${i}`, out);
    for (let i = from.length; i < to.length; i++) out.push({ op: 'add', path: `${base}/-`, value: to[i] });
    for (let i = from.length - 1; i >= to.length; i--) out.push({ op: 'remove', path: `${base}/${i}` });
  } else {
    out.push({ op: 'replace', path: base === '' ? '' : base, value: to });
  }
}

function doDiff(body: any): { error: string } | { result: DiffCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body) || !('from' in body) || !('to' in body)) return { error: 'Provide an object with "from" and "to" documents.' };
  const out: PatchOp[] = [];
  diff(body.from as Json, body.to as Json, '', out);
  return { result: { operation_count: out.length, patch: out } };
}

const CHAIN_TO = [
  { api: 'json-pointer', reason: 'Resolve or enumerate the pointers used by these patch operations.' },
  { api: 'json-schema-validator', reason: 'Validate the patched document against a JSON Schema.' },
];
const INVALIDATORS = [
  'Patches apply atomically per RFC 6902: on the first failing operation (bad path, out-of-bounds index, missing target, or failed test) the whole patch is rejected and no document is returned.',
  'The input document is never mutated — operations run on a deep clone; "move into own subtree" is rejected as illegal.',
  'diff is deterministic and correct (applying it transforms from→to) but not guaranteed minimal: array changes are compared index-wise, so an insertion mid-array may yield replace+append rather than a single insert.',
  'Whole-document operations: add/replace with path "" replace the entire document; remove with path "" is rejected BY DESIGN (RFC 6902 removes a value from its parent, and the root has no parent) — to empty a document, replace at "" with the desired value.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'JSON Patch API', version: '1.0.0',
    description: 'Deterministic RFC 6902 JSON Patch engine. /apply runs an ordered patch (add/remove/replace/move/copy/test) atomically against a document; /diff generates a patch transforming one document into another. Operates on a clone — input never mutated. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/json-patch/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/apply', summary: 'Apply an RFC 6902 patch to a document', price_usdc: 0.006 },
      { method: 'POST', path: '/diff', summary: 'Generate a patch transforming from→to', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL apply + reasoning', price_usdc: 0.011 },
    ],
    pricing: [
      { path: '/apply', price_usdc: 0.006, currency: 'USDC' },
      { path: '/diff', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/apply', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doApply(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ apply: 1 }, [v.applied ? `Applied all ${v.operation_count} operation(s).` : `Patch rejected at operation ${v.failed_at_index}: ${v.failure_reason}`]) });
});

router.post('/diff', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doDiff(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, { ...v, ...TAIL({ diff: 1 }, [`Generated a ${v.operation_count}-operation patch transforming from→to.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = doApply(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: v.applied
        ? `Applied ${v.operation_count} operation(s) atomically; ${v.test_results.length} test op(s) evaluated.`
        : `Patch rejected at operation ${v.failed_at_index}: ${v.failure_reason}`,
      key_factors: [
        `Applied: ${v.applied}.`,
        `Test ops: ${v.test_results.map((t) => `${t.path}=${t.passed ? 'pass' : 'fail'}`).join(', ') || '(none)'}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ apply: 1 }, [v.applied ? `Applied all ${v.operation_count} operation(s).` : `Patch rejected at operation ${v.failed_at_index}: ${v.failure_reason}`]),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, CellValue } from '../../_aplus/specparts';
import { applyExample, diffExample, lookupExample } from './examples';

const PatchOp = {
  type: 'object', required: ['op', 'path'], additionalProperties: false,
  properties: {
    op: { type: 'string', enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'] },
    path: { type: 'string', description: 'RFC 6901 JSON Pointer target.' },
    from: { type: 'string', description: 'Source pointer (move/copy only).' },
    value: { ...CellValue, description: 'Operand value (add/replace/test).' },
  },
};
const TestResult = {
  type: 'object', required: ['index', 'path', 'passed'], additionalProperties: false,
  properties: { index: { type: 'integer', minimum: 0 }, path: { type: 'string' }, passed: { type: 'boolean' } },
};
const ApplyCore = {
  type: 'object', required: ['operation_count', 'applied', 'test_results'],
  properties: {
    operation_count: { type: 'integer', minimum: 0 },
    applied: { type: 'boolean' },
    document: { ...CellValue, description: 'The patched document (present only when applied=true).' },
    failed_at_index: { type: 'integer', minimum: 0, description: 'Index of the operation that failed (when applied=false).' },
    failure_reason: { type: 'string' },
    test_results: { type: 'array', items: TestResult },
  },
};
const DiffCore = {
  type: 'object', required: ['operation_count', 'patch'],
  properties: { operation_count: { type: 'integer', minimum: 0 }, patch: { type: 'array', items: PatchOp } },
};
const ApplyRequest = {
  type: 'object', required: ['document', 'patch'], additionalProperties: false,
  properties: {
    document: { ...CellValue, description: 'Any JSON document to patch.' },
    patch: { type: 'array', items: PatchOp, description: 'Ordered RFC 6902 operations.' },
  },
};
const DiffRequest = {
  type: 'object', required: ['from', 'to'], additionalProperties: false,
  properties: { from: { ...CellValue, description: 'Source document.' }, to: { ...CellValue, description: 'Target document.' } },
};

const applyReq = {
  document: { name: 'Ada', roles: ['admin'], age: 30 },
  patch: [
    { op: 'add', path: '/roles/-', value: 'editor' },
    { op: 'replace', path: '/age', value: 31 },
    { op: 'test', path: '/roles/0', value: 'admin' },
    { op: 'remove', path: '/name' },
  ],
};
const diffReq = { from: { a: 1, b: [1, 2], c: 'x' }, to: { a: 2, b: [1, 2, 3], d: true } };

const disc = {
  name: 'JSON Patch API', version: '1.0.0',
  description: 'Deterministic RFC 6902 JSON Patch engine. /apply runs an ordered patch (add/remove/replace/move/copy/test) atomically against a document; /diff generates a patch transforming one document into another. Operates on a clone — input never mutated. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/json-patch/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/apply', summary: 'Apply an RFC 6902 patch to a document', price_usdc: 0.006 },
    { method: 'POST', path: '/diff', summary: 'Generate a patch transforming from→to', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL apply + reasoning', price_usdc: 0.011 },
  ],
  pricing: [
    { path: '/apply', price_usdc: 0.006, currency: 'USDC' },
    { path: '/diff', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('apply', 'diff'), _Tail: Tail,
  PatchOp, TestResult, ApplyCore, DiffCore, ApplyRequest, DiffRequest, DiscoveryResponse: discoverySchema(),
  ApplyResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ApplyCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  DiffResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DiffCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ApplyCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/apply', summary: 'Apply an RFC 6902 patch to a document', operationId: 'apply', priceUsdc: 0.006, requestSchemaRef: 'ApplyRequest', responseSchemaRef: 'ApplyResponse', requestExample: applyReq, responseExample: applyExample },
  { method: 'post', path: '/diff', summary: 'Generate a patch transforming from→to', operationId: 'diff', priceUsdc: 0.007, requestSchemaRef: 'DiffRequest', responseSchemaRef: 'DiffResponse', requestExample: diffReq, responseExample: diffExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL apply + reasoning', operationId: 'lookup', priceUsdc: 0.011, oneCall: true, requestSchemaRef: 'ApplyRequest', responseSchemaRef: 'LookupResponse', requestExample: applyReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'json-patch', title: 'JSON Patch API', version: '1.0.0',
  description: 'Deterministic RFC 6902 JSON Patch engine — atomic apply (add/remove/replace/move/copy/test) + from→to diff. Operates on a clone; input never mutated. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (GET /json-patch/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "JSON Patch API",
    "version": "1.0.0",
    "description": "Deterministic RFC 6902 JSON Patch engine — atomic apply (add/remove/replace/move/copy/test) + from→to diff. Operates on a clone; input never mutated. No LLM.",
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
      "url": "https://orbis-apis.onrender.com/json-patch"
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
                  "name": "JSON Patch API",
                  "version": "1.0.0",
                  "description": "Deterministic RFC 6902 JSON Patch engine. /apply runs an ordered patch (add/remove/replace/move/copy/test) atomically against a document; /diff generates a patch transforming one document into another. Operates on a clone — input never mutated. No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/json-patch/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/apply",
                      "summary": "Apply an RFC 6902 patch to a document",
                      "price_usdc": 0.006
                    },
                    {
                      "method": "POST",
                      "path": "/diff",
                      "summary": "Generate a patch transforming from→to",
                      "price_usdc": 0.007
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL apply + reasoning",
                      "price_usdc": 0.011
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/apply",
                      "price_usdc": 0.006,
                      "currency": "USDC"
                    },
                    {
                      "path": "/diff",
                      "price_usdc": 0.007,
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
    "/apply": {
      "post": {
        "operationId": "apply",
        "summary": "Apply an RFC 6902 patch to a document",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApplyResponse"
                },
                "example": {
                  "trace_id": "jpat-1780000000000",
                  "request_id": "jpat-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "operation_count": 4,
                  "applied": true,
                  "document": {
                    "roles": [
                      "admin",
                      "editor"
                    ],
                    "age": 31
                  },
                  "test_results": [
                    {
                      "index": 2,
                      "path": "/roles/0",
                      "passed": true
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "apply": 1
                  },
                  "recommended_actions_priority_order": [
                    "Applied all 4 operation(s)."
                  ],
                  "chain_to": [
                    {
                      "api": "json-pointer",
                      "reason": "Resolve or enumerate the pointers used by these patch operations."
                    },
                    {
                      "api": "json-schema-validator",
                      "reason": "Validate the patched document against a JSON Schema."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true
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
                "$ref": "#/components/schemas/ApplyRequest"
              },
              "example": {
                "document": {
                  "name": "Ada",
                  "roles": [
                    "admin"
                  ],
                  "age": 30
                },
                "patch": [
                  {
                    "op": "add",
                    "path": "/roles/-",
                    "value": "editor"
                  },
                  {
                    "op": "replace",
                    "path": "/age",
                    "value": 31
                  },
                  {
                    "op": "test",
                    "path": "/roles/0",
                    "value": "admin"
                  },
                  {
                    "op": "remove",
                    "path": "/name"
                  }
                ]
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
    "/diff": {
      "post": {
        "operationId": "diff",
        "summary": "Generate a patch transforming from→to",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DiffResponse"
                },
                "example": {
                  "trace_id": "jpat-1780000000000",
                  "request_id": "jpat-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "operation_count": 4,
                  "patch": [
                    {
                      "op": "remove",
                      "path": "/c"
                    },
                    {
                      "op": "replace",
                      "path": "/a",
                      "value": 2
                    },
                    {
                      "op": "add",
                      "path": "/b/-",
                      "value": 3
                    },
                    {
                      "op": "add",
                      "path": "/d",
                      "value": true
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "diff": 1
                  },
                  "recommended_actions_priority_order": [
                    "Generated a 4-operation patch transforming from→to."
                  ],
                  "chain_to": [
                    {
                      "api": "json-pointer",
                      "reason": "Resolve or enumerate the pointers used by these patch operations."
                    },
                    {
                      "api": "json-schema-validator",
                      "reason": "Validate the patched document against a JSON Schema."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true
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
                "$ref": "#/components/schemas/DiffRequest"
              },
              "example": {
                "from": {
                  "a": 1,
                  "b": [
                    1,
                    2
                  ],
                  "c": "x"
                },
                "to": {
                  "a": 2,
                  "b": [
                    1,
                    2,
                    3
                  ],
                  "d": true
                }
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.007,
          "currency": "USDC"
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "ONE-CALL apply + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "jpat-1780000000000",
                  "request_id": "jpat-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "operation_count": 4,
                  "applied": true,
                  "document": {
                    "roles": [
                      "admin",
                      "editor"
                    ],
                    "age": 31
                  },
                  "test_results": [
                    {
                      "index": 2,
                      "path": "/roles/0",
                      "passed": true
                    }
                  ],
                  "reasoning": {
                    "why_result_generated": "Applied 4 operation(s) atomically; 1 test op(s) evaluated.",
                    "key_factors": [
                      "Applied: true.",
                      "Test ops: /roles/0=pass."
                    ],
                    "invalidators": [
                      "Patches apply atomically per RFC 6902: on the first failing operation (bad path, out-of-bounds index, missing target, or failed test) the whole patch is rejected and no document is returned.",
                      "The input document is never mutated — operations run on a deep clone; \"move into own subtree\" is rejected as illegal.",
                      "diff is deterministic and correct (applying it transforms from→to) but not guaranteed minimal: array changes are compared index-wise, so an insertion mid-array may yield replace+append rather than a single insert.",
                      "Whole-document operations: add/replace with path \"\" replace the entire document; remove with path \"\" is rejected BY DESIGN (RFC 6902 removes a value from its parent, and the root has no parent) — to empty a document, replace at \"\" with the desired value."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "apply": 1
                  },
                  "recommended_actions_priority_order": [
                    "Applied all 4 operation(s)."
                  ],
                  "chain_to": [
                    {
                      "api": "json-pointer",
                      "reason": "Resolve or enumerate the pointers used by these patch operations."
                    },
                    {
                      "api": "json-schema-validator",
                      "reason": "Validate the patched document against a JSON Schema."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true
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
                "$ref": "#/components/schemas/ApplyRequest"
              },
              "example": {
                "document": {
                  "name": "Ada",
                  "roles": [
                    "admin"
                  ],
                  "age": 30
                },
                "patch": [
                  {
                    "op": "add",
                    "path": "/roles/-",
                    "value": "editor"
                  },
                  {
                    "op": "replace",
                    "path": "/age",
                    "value": 31
                  },
                  {
                    "op": "test",
                    "path": "/roles/0",
                    "value": "admin"
                  },
                  {
                    "op": "remove",
                    "path": "/name"
                  }
                ]
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
          "latency_ms"
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
          "automation_safe"
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
          }
        }
      },
      "ConfidencePerSection": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "apply": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "diff": {
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
      "PatchOp": {
        "type": "object",
        "required": [
          "op",
          "path"
        ],
        "additionalProperties": false,
        "properties": {
          "op": {
            "type": "string",
            "enum": [
              "add",
              "remove",
              "replace",
              "move",
              "copy",
              "test"
            ]
          },
          "path": {
            "type": "string",
            "description": "RFC 6901 JSON Pointer target."
          },
          "from": {
            "type": "string",
            "description": "Source pointer (move/copy only)."
          },
          "value": {
            "description": "Operand value (add/replace/test).",
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
      },
      "TestResult": {
        "type": "object",
        "required": [
          "index",
          "path",
          "passed"
        ],
        "additionalProperties": false,
        "properties": {
          "index": {
            "type": "integer",
            "minimum": 0
          },
          "path": {
            "type": "string"
          },
          "passed": {
            "type": "boolean"
          }
        }
      },
      "ApplyCore": {
        "type": "object",
        "required": [
          "operation_count",
          "applied",
          "test_results"
        ],
        "properties": {
          "operation_count": {
            "type": "integer",
            "minimum": 0
          },
          "applied": {
            "type": "boolean"
          },
          "document": {
            "description": "The patched document (present only when applied=true).",
            "type": [
              "string",
              "number",
              "boolean",
              "null",
              "array",
              "object"
            ]
          },
          "failed_at_index": {
            "type": "integer",
            "minimum": 0,
            "description": "Index of the operation that failed (when applied=false)."
          },
          "failure_reason": {
            "type": "string"
          },
          "test_results": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "index",
                "path",
                "passed"
              ],
              "additionalProperties": false,
              "properties": {
                "index": {
                  "type": "integer",
                  "minimum": 0
                },
                "path": {
                  "type": "string"
                },
                "passed": {
                  "type": "boolean"
                }
              }
            }
          }
        }
      },
      "DiffCore": {
        "type": "object",
        "required": [
          "operation_count",
          "patch"
        ],
        "properties": {
          "operation_count": {
            "type": "integer",
            "minimum": 0
          },
          "patch": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "op",
                "path"
              ],
              "additionalProperties": false,
              "properties": {
                "op": {
                  "type": "string",
                  "enum": [
                    "add",
                    "remove",
                    "replace",
                    "move",
                    "copy",
                    "test"
                  ]
                },
                "path": {
                  "type": "string",
                  "description": "RFC 6901 JSON Pointer target."
                },
                "from": {
                  "type": "string",
                  "description": "Source pointer (move/copy only)."
                },
                "value": {
                  "description": "Operand value (add/replace/test).",
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
            }
          }
        }
      },
      "ApplyRequest": {
        "type": "object",
        "required": [
          "document",
          "patch"
        ],
        "additionalProperties": false,
        "properties": {
          "document": {
            "description": "Any JSON document to patch.",
            "type": [
              "string",
              "number",
              "boolean",
              "null",
              "array",
              "object"
            ]
          },
          "patch": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "op",
                "path"
              ],
              "additionalProperties": false,
              "properties": {
                "op": {
                  "type": "string",
                  "enum": [
                    "add",
                    "remove",
                    "replace",
                    "move",
                    "copy",
                    "test"
                  ]
                },
                "path": {
                  "type": "string",
                  "description": "RFC 6901 JSON Pointer target."
                },
                "from": {
                  "type": "string",
                  "description": "Source pointer (move/copy only)."
                },
                "value": {
                  "description": "Operand value (add/replace/test).",
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
            },
            "description": "Ordered RFC 6902 operations."
          }
        }
      },
      "DiffRequest": {
        "type": "object",
        "required": [
          "from",
          "to"
        ],
        "additionalProperties": false,
        "properties": {
          "from": {
            "description": "Source document.",
            "type": [
              "string",
              "number",
              "boolean",
              "null",
              "array",
              "object"
            ]
          },
          "to": {
            "description": "Target document.",
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
          "x402_compatible"
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
          }
        }
      },
      "ApplyResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/ApplyCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "DiffResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/DiffCore"
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
            "$ref": "#/components/schemas/ApplyCore"
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

## Live example responses
### POST /apply (add append + replace + passing test + remove)
Request:
```json
{
  "document": {
    "name": "Ada",
    "roles": [
      "admin"
    ],
    "age": 30
  },
  "patch": [
    {
      "op": "add",
      "path": "/roles/-",
      "value": "editor"
    },
    {
      "op": "replace",
      "path": "/age",
      "value": 31
    },
    {
      "op": "test",
      "path": "/roles/0",
      "value": "admin"
    },
    {
      "op": "remove",
      "path": "/name"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "3j0njg4i-1781576000926",
  "request_id": "3j0njg4i-1781576000926",
  "computed_at": "2026-06-16T02:13:20.926Z",
  "success": true,
  "latency_ms": 0,
  "operation_count": 4,
  "applied": true,
  "document": {
    "roles": [
      "admin",
      "editor"
    ],
    "age": 31
  },
  "test_results": [
    {
      "index": 2,
      "path": "/roles/0",
      "passed": true
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "apply": 1
  },
  "recommended_actions_priority_order": [
    "Applied all 4 operation(s)."
  ],
  "chain_to": [
    {
      "api": "json-pointer",
      "reason": "Resolve or enumerate the pointers used by these patch operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the patched document against a JSON Schema."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /apply (atomic: failing test rejects whole patch, no document)
Request:
```json
{
  "document": {
    "a": 1
  },
  "patch": [
    {
      "op": "test",
      "path": "/a",
      "value": 2
    },
    {
      "op": "add",
      "path": "/b",
      "value": 9
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "rvlpadkh-1781576000931",
  "request_id": "rvlpadkh-1781576000931",
  "computed_at": "2026-06-16T02:13:20.931Z",
  "success": true,
  "latency_ms": 0,
  "operation_count": 2,
  "applied": false,
  "failed_at_index": 0,
  "failure_reason": "test failed at /a: value does not match.",
  "test_results": [
    {
      "index": 0,
      "path": "/a",
      "passed": false
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "apply": 1
  },
  "recommended_actions_priority_order": [
    "Patch rejected at operation 0: test failed at /a: value does not match."
  ],
  "chain_to": [
    {
      "api": "json-pointer",
      "reason": "Resolve or enumerate the pointers used by these patch operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the patched document against a JSON Schema."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /apply (move into own subtree rejected)
Request:
```json
{
  "document": {
    "a": {
      "b": 1
    }
  },
  "patch": [
    {
      "op": "move",
      "from": "/a",
      "path": "/a/b"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "xpl9s0jb-1781576000935",
  "request_id": "xpl9s0jb-1781576000935",
  "computed_at": "2026-06-16T02:13:20.935Z",
  "success": true,
  "latency_ms": 0,
  "operation_count": 1,
  "applied": false,
  "failed_at_index": 0,
  "failure_reason": "cannot move a value into one of its own children.",
  "test_results": [],
  "confidence_score": 1,
  "confidence_per_section": {
    "apply": 1
  },
  "recommended_actions_priority_order": [
    "Patch rejected at operation 0: cannot move a value into one of its own children."
  ],
  "chain_to": [
    {
      "api": "json-pointer",
      "reason": "Resolve or enumerate the pointers used by these patch operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the patched document against a JSON Schema."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /diff (generate patch from→to; round-trippable)
Request:
```json
{
  "from": {
    "a": 1,
    "b": [
      1,
      2
    ],
    "c": "x"
  },
  "to": {
    "a": 2,
    "b": [
      1,
      2,
      3
    ],
    "d": true
  }
}
```
Response (HTTP 200):
```json
{
  "trace_id": "dnajld4c-1781576000938",
  "request_id": "dnajld4c-1781576000938",
  "computed_at": "2026-06-16T02:13:20.938Z",
  "success": true,
  "latency_ms": 0,
  "operation_count": 4,
  "patch": [
    {
      "op": "remove",
      "path": "/c"
    },
    {
      "op": "replace",
      "path": "/a",
      "value": 2
    },
    {
      "op": "add",
      "path": "/b/-",
      "value": 3
    },
    {
      "op": "add",
      "path": "/d",
      "value": true
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "diff": 1
  },
  "recommended_actions_priority_order": [
    "Generated a 4-operation patch transforming from→to."
  ],
  "chain_to": [
    {
      "api": "json-pointer",
      "reason": "Resolve or enumerate the pointers used by these patch operations."
    },
    {
      "api": "json-schema-validator",
      "reason": "Validate the patched document against a JSON Schema."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /apply (error: patch not an array)
Request:
```json
{
  "document": {},
  "patch": "nope"
}
```
Response (HTTP 400):
```json
{
  "trace_id": "qn72xbh4-1781576000942",
  "request_id": "qn72xbh4-1781576000942",
  "computed_at": "2026-06-16T02:13:20.942Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"patch\" must be an array of RFC 6902 operations."
  }
}
```

---

# sensitive-data-detector

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic sensitive-data (PII) detector. Finds emails, phone numbers, US
// SSNs, credit-card numbers (Luhn-validated), and IPv4/IPv6 addresses in a text
// blob using fixed regex rules, returns their spans, counts, a redacted copy, and
// a heuristic risk level. 100% deterministic — no LLM, nothing fetched or stored
// (distinct from the LLM-based pii-detection-api).

const router = Router();

const MAX_TEXT = 200_000;
const TYPES = ['email', 'ssn', 'credit_card', 'phone', 'ipv4', 'ipv6'] as const;
type PiiType = typeof TYPES[number];

// Precedence for overlap resolution (higher = wins): Luhn-checked card and the
// rigid SSN shape are the most specific; phone is the loosest so it loses ties.
const PRECEDENCE: Record<PiiType, number> = { credit_card: 6, ssn: 5, email: 4, ipv4: 3, ipv6: 2, phone: 1 };

const PATTERNS: Record<PiiType, RegExp> = {
  email: /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  credit_card: /\b\d(?:[ \-]?\d){12,18}\b/g, // 13–19 digits; starts & ends on a digit (no leading/trailing separator)
  phone: /(?:\+?\d{1,3}[\s.\-]?)?(?:\(\d{3}\)|\d{3})[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g,
  ipv4: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  ipv6: /\b(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}\b/g,
};

function luhnValid(s: string): boolean {
  const digits = s.replace(/[^\d]/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}

export interface Finding { type: PiiType; value: string; start: number; end: number; }
export interface ScanCore {
  text_length: number;
  has_pii: boolean;
  finding_count: number;
  counts_by_type: Record<string, number>;
  findings: Finding[];
  redacted_text: string;
  risk_level: 'none' | 'low' | 'medium' | 'high';
}

function maskFor(f: Finding, style: string): string {
  if (style === 'stars') return '*'.repeat(f.end - f.start);
  if (style === 'type') return `[${f.type.toUpperCase()}]`;
  return `[REDACTED_${f.type.toUpperCase()}]`;
}

function scan(text: string, types: PiiType[], maskStyle: string): ScanCore {
  const raw: Finding[] = [];
  for (const t of types) {
    for (const m of text.matchAll(PATTERNS[t])) {
      const value = m[0];
      const start = m.index ?? 0;
      if (t === 'credit_card' && !luhnValid(value)) continue;
      raw.push({ type: t, value, start, end: start + value.length });
    }
  }
  // Resolve overlaps: sort by start, then longer, then higher precedence; keep greedily.
  raw.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start) || PRECEDENCE[b.type] - PRECEDENCE[a.type]);
  const kept: Finding[] = [];
  let lastEnd = -1;
  for (const f of raw) { if (f.start >= lastEnd) { kept.push(f); lastEnd = f.end; } }

  const counts: Record<string, number> = {};
  for (const f of kept) counts[f.type] = (counts[f.type] || 0) + 1;

  // Redact left→right from the kept (already start-sorted) spans.
  let redacted = '', cursor = 0;
  for (const f of kept) { redacted += text.slice(cursor, f.start) + maskFor(f, maskStyle); cursor = f.end; }
  redacted += text.slice(cursor);

  const has = (t: PiiType) => (counts[t] || 0) > 0;
  const risk: ScanCore['risk_level'] =
    has('credit_card') || has('ssn') ? 'high'
      : has('email') || has('phone') ? 'medium'
        : has('ipv4') || has('ipv6') ? 'low' : 'none';

  return {
    text_length: text.length, has_pii: kept.length > 0, finding_count: kept.length,
    counts_by_type: counts, findings: kept, redacted_text: redacted, risk_level: risk,
  };
}

function parse(body: any): { error: string } | { text: string; types: PiiType[]; maskStyle: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "text" string.' };
  if (typeof body.text !== 'string') return { error: '"text" must be a string.' };
  if (body.text.length > MAX_TEXT) return { error: `"text" exceeds the ${MAX_TEXT}-character limit (got ${body.text.length}).` };
  let types: PiiType[] = [...TYPES];
  if (body.types !== undefined) {
    if (!Array.isArray(body.types) || body.types.length === 0 || !body.types.every((t: unknown) => (TYPES as readonly string[]).includes(t as string))) {
      return { error: `"types" must be a non-empty array drawn from: ${TYPES.join(', ')}.` };
    }
    types = body.types as PiiType[];
  }
  let maskStyle = 'label';
  if (body.mask_style !== undefined) {
    if (!['label', 'stars', 'type'].includes(body.mask_style)) return { error: '"mask_style" must be one of: label, stars, type.' };
    maskStyle = body.mask_style;
  }
  return { text: body.text, types, maskStyle };
}

const CHAIN_TO = [
  { api: 'data-encryption-advisor', reason: 'Get encryption/tokenization recommendations for the PII categories detected here.' },
  { api: 'data-classification', reason: 'Classify which columns of a dataset carry these PII types.' },
];
const INVALIDATORS = [
  'Detection is pattern-based and deterministic: it flags strings that MATCH the shape of each type, not strings proven to be real PII — a random 9-digit-pattern is reported as an SSN, and a number passing the Luhn check is not necessarily an issued card.',
  'Coverage is limited to email/SSN/credit-card/phone/IPv4/IPv6 with US-centric SSN/phone shapes; passports, national IDs, addresses, and names are NOT detected.',
  'Overlapping matches are resolved by earliest-start, then longest, then type precedence (card/SSN beat phone); a different segmentation could group digits differently.',
];

const TAIL = (r: ScanCore) => ({
  confidence_score: 0.85, confidence_per_section: { detection: 1, classification: 0.8, risk: 0.7 },
  recommended_actions_priority_order: [
    `${r.finding_count} sensitive item(s) found — risk ${r.risk_level}.` + (r.has_pii ? ` Types: ${Object.keys(r.counts_by_type).join(', ')}.` : ''),
    r.has_pii ? 'Use redacted_text for logs/LLM prompts; never persist the raw values.' : 'No sensitive patterns detected in the supplied text.',
    r.risk_level === 'high' ? 'High-risk PII (SSN/PAN) present — encrypt at rest and restrict access; chain to data-encryption-advisor.' : 'Review medium/low findings for false positives before acting.',
  ],
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Sensitive Data Detector API', version: '1.0.0',
    description: 'Deterministic PII detector. Finds emails, phone numbers, US SSNs, Luhn-validated credit-card numbers, and IPv4/IPv6 addresses in text using fixed regex rules, returning spans, counts, a redacted copy, and a heuristic risk level. No LLM, nothing fetched or stored.',
    openapi_url: 'https://orbis-apis.onrender.com/sensitive-data-detector/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Detect & redact PII in text', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL scan + reasoning', price_usdc: 0.015 },
    ],
    pricing: [
      { path: '/scan', price_usdc: 0.008, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/scan', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = scan(p.text, p.types, p.maskStyle);
  respond(res, t0, { ...r, ...TAIL(r) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = scan(p.text, p.types, p.maskStyle);
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Scanned ${r.text_length} character(s) for ${p.types.length} PII type(s): ${r.finding_count} finding(s), risk ${r.risk_level}.`,
      key_factors: [
        `Counts: ${Object.entries(r.counts_by_type).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}.`,
        `Credit-card matches are Luhn-validated; SSN/phone use US-centric shapes.`,
        `Risk derived from the highest-severity type present.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(r),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { scanExample, lookupExample } from './examples';

const TYPE_ENUM = ['email', 'ssn', 'credit_card', 'phone', 'ipv4', 'ipv6'];

const Finding = {
  type: 'object', required: ['type', 'value', 'start', 'end'], additionalProperties: false,
  properties: {
    type: { type: 'string', enum: TYPE_ENUM },
    value: { type: 'string', description: 'The matched substring.' },
    start: { type: 'integer', minimum: 0 },
    end: { type: 'integer', minimum: 0 },
  },
};
const ScanCore = {
  type: 'object', required: ['text_length', 'has_pii', 'finding_count', 'counts_by_type', 'findings', 'redacted_text', 'risk_level'],
  properties: {
    text_length: { type: 'integer', minimum: 0 },
    has_pii: { type: 'boolean' },
    finding_count: { type: 'integer', minimum: 0 },
    counts_by_type: { type: 'object', additionalProperties: { type: 'integer', minimum: 0 }, description: 'Count of findings per PII type.' },
    findings: { type: 'array', items: Finding },
    redacted_text: { type: 'string', description: 'The input with detected spans masked.' },
    risk_level: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
  },
};
const ScanRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: {
    text: { type: 'string', description: 'Text to scan for sensitive data (≤200,000 chars).' },
    types: { type: 'array', items: { type: 'string', enum: TYPE_ENUM }, description: 'Restrict detection to these types (default: all).' },
    mask_style: { type: 'string', enum: ['label', 'stars', 'type'], description: 'Redaction style: "[REDACTED_EMAIL]" (label), "****" (stars), or "[EMAIL]" (type). Default label.' },
  },
};

const scanReq = {
  text: 'Contact Ada at ada@example.com or (555) 123-4567. SSN 123-45-6789, card 4111 1111 1111 1111, host 192.168.1.1.',
};

const disc = {
  name: 'Sensitive Data Detector API', version: '1.0.0',
  description: 'Deterministic PII detector. Finds emails, phone numbers, US SSNs, Luhn-validated credit-card numbers, and IPv4/IPv6 addresses in text using fixed regex rules, returning spans, counts, a redacted copy, and a heuristic risk level. No LLM, nothing fetched or stored.',
  openapi_url: 'https://orbis-apis.onrender.com/sensitive-data-detector/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/scan', summary: 'Detect & redact PII in text', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL scan + reasoning', price_usdc: 0.015 },
  ],
  pricing: [
    { path: '/scan', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.015, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('detection', 'classification', 'risk'), _Tail: Tail,
  Finding, ScanCore, ScanRequest, DiscoveryResponse: discoverySchema(),
  ScanResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScanCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScanCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/scan', summary: 'Detect & redact PII in text', operationId: 'scan', priceUsdc: 0.008, requestSchemaRef: 'ScanRequest', responseSchemaRef: 'ScanResponse', requestExample: scanReq, responseExample: scanExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL scan + reasoning', operationId: 'lookup', priceUsdc: 0.015, oneCall: true, requestSchemaRef: 'ScanRequest', responseSchemaRef: 'LookupResponse', requestExample: scanReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'sensitive-data-detector', title: 'Sensitive Data Detector API', version: '1.0.0',
  description: 'Deterministic PII detector — email/SSN/credit-card(Luhn)/phone/IPv4/IPv6 spans + counts + redacted text + risk level. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (GET /sensitive-data-detector/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Sensitive Data Detector API",
    "version": "1.0.0",
    "description": "Deterministic PII detector — email/SSN/credit-card(Luhn)/phone/IPv4/IPv6 spans + counts + redacted text + risk level. No LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-security-tool": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/sensitive-data-detector"
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
                  "name": "Sensitive Data Detector API",
                  "version": "1.0.0",
                  "description": "Deterministic PII detector. Finds emails, phone numbers, US SSNs, Luhn-validated credit-card numbers, and IPv4/IPv6 addresses in text using fixed regex rules, returning spans, counts, a redacted copy, and a heuristic risk level. No LLM, nothing fetched or stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/sensitive-data-detector/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/scan",
                      "summary": "Detect & redact PII in text",
                      "price_usdc": 0.008
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL scan + reasoning",
                      "price_usdc": 0.015
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/scan",
                      "price_usdc": 0.008,
                      "currency": "USDC"
                    },
                    {
                      "path": "/lookup",
                      "price_usdc": 0.015,
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
    "/scan": {
      "post": {
        "operationId": "scan",
        "summary": "Detect & redact PII in text",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ScanResponse"
                },
                "example": {
                  "trace_id": "sdd-1780000000000",
                  "request_id": "sdd-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "text_length": 110,
                  "has_pii": true,
                  "finding_count": 5,
                  "counts_by_type": {
                    "email": 1,
                    "phone": 1,
                    "ssn": 1,
                    "credit_card": 1,
                    "ipv4": 1
                  },
                  "findings": [
                    {
                      "type": "email",
                      "value": "ada@example.com",
                      "start": 15,
                      "end": 30
                    },
                    {
                      "type": "phone",
                      "value": "(555) 123-4567",
                      "start": 34,
                      "end": 48
                    },
                    {
                      "type": "ssn",
                      "value": "123-45-6789",
                      "start": 54,
                      "end": 65
                    },
                    {
                      "type": "credit_card",
                      "value": "4111 1111 1111 1111",
                      "start": 72,
                      "end": 91
                    },
                    {
                      "type": "ipv4",
                      "value": "192.168.1.1",
                      "start": 98,
                      "end": 109
                    }
                  ],
                  "redacted_text": "Contact Ada at [REDACTED_EMAIL] or [REDACTED_PHONE]. SSN [REDACTED_SSN], card [REDACTED_CREDIT_CARD], host [REDACTED_IPV4].",
                  "risk_level": "high",
                  "confidence_score": 0.85,
                  "confidence_per_section": {
                    "detection": 1,
                    "classification": 0.8,
                    "risk": 0.7
                  },
                  "recommended_actions_priority_order": [
                    "5 sensitive item(s) found — risk high. Types: email, phone, ssn, credit_card, ipv4.",
                    "Use redacted_text for logs/LLM prompts; never persist the raw values.",
                    "High-risk PII (SSN/PAN) present — encrypt at rest and restrict access; chain to data-encryption-advisor."
                  ],
                  "chain_to": [
                    {
                      "api": "data-encryption-advisor",
                      "reason": "Get encryption/tokenization recommendations for the PII categories detected here."
                    },
                    {
                      "api": "data-classification",
                      "reason": "Classify which columns of a dataset carry these PII types."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true
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
                "$ref": "#/components/schemas/ScanRequest"
              },
              "example": {
                "text": "Contact Ada at ada@example.com or (555) 123-4567. SSN 123-45-6789, card 4111 1111 1111 1111, host 192.168.1.1."
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.008,
          "currency": "USDC"
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "ONE-CALL scan + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "sdd-1780000000000",
                  "request_id": "sdd-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "text_length": 110,
                  "has_pii": true,
                  "finding_count": 5,
                  "counts_by_type": {
                    "email": 1,
                    "phone": 1,
                    "ssn": 1,
                    "credit_card": 1,
                    "ipv4": 1
                  },
                  "findings": [
                    {
                      "type": "email",
                      "value": "ada@example.com",
                      "start": 15,
                      "end": 30
                    },
                    {
                      "type": "phone",
                      "value": "(555) 123-4567",
                      "start": 34,
                      "end": 48
                    },
                    {
                      "type": "ssn",
                      "value": "123-45-6789",
                      "start": 54,
                      "end": 65
                    },
                    {
                      "type": "credit_card",
                      "value": "4111 1111 1111 1111",
                      "start": 72,
                      "end": 91
                    },
                    {
                      "type": "ipv4",
                      "value": "192.168.1.1",
                      "start": 98,
                      "end": 109
                    }
                  ],
                  "redacted_text": "Contact Ada at [REDACTED_EMAIL] or [REDACTED_PHONE]. SSN [REDACTED_SSN], card [REDACTED_CREDIT_CARD], host [REDACTED_IPV4].",
                  "risk_level": "high",
                  "reasoning": {
                    "why_result_generated": "Scanned 110 character(s) for 6 PII type(s): 5 finding(s), risk high.",
                    "key_factors": [
                      "Counts: email=1, phone=1, ssn=1, credit_card=1, ipv4=1.",
                      "Credit-card matches are Luhn-validated; SSN/phone use US-centric shapes.",
                      "Risk derived from the highest-severity type present."
                    ],
                    "invalidators": [
                      "Detection is pattern-based and deterministic: it flags strings that MATCH the shape of each type, not strings proven to be real PII — a random 9-digit-pattern is reported as an SSN, and a number passing the Luhn check is not necessarily an issued card.",
                      "Coverage is limited to email/SSN/credit-card/phone/IPv4/IPv6 with US-centric SSN/phone shapes; passports, national IDs, addresses, and names are NOT detected.",
                      "Overlapping matches are resolved by earliest-start, then longest, then type precedence (card/SSN beat phone); a different segmentation could group digits differently."
                    ]
                  },
                  "confidence_score": 0.85,
                  "confidence_per_section": {
                    "detection": 1,
                    "classification": 0.8,
                    "risk": 0.7
                  },
                  "recommended_actions_priority_order": [
                    "5 sensitive item(s) found — risk high. Types: email, phone, ssn, credit_card, ipv4.",
                    "Use redacted_text for logs/LLM prompts; never persist the raw values.",
                    "High-risk PII (SSN/PAN) present — encrypt at rest and restrict access; chain to data-encryption-advisor."
                  ],
                  "chain_to": [
                    {
                      "api": "data-encryption-advisor",
                      "reason": "Get encryption/tokenization recommendations for the PII categories detected here."
                    },
                    {
                      "api": "data-classification",
                      "reason": "Classify which columns of a dataset carry these PII types."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true
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
                "$ref": "#/components/schemas/ScanRequest"
              },
              "example": {
                "text": "Contact Ada at ada@example.com or (555) 123-4567. SSN 123-45-6789, card 4111 1111 1111 1111, host 192.168.1.1."
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.015,
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
          "latency_ms"
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
          "automation_safe"
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
          }
        }
      },
      "ConfidencePerSection": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "detection": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "classification": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "risk": {
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
      "Finding": {
        "type": "object",
        "required": [
          "type",
          "value",
          "start",
          "end"
        ],
        "additionalProperties": false,
        "properties": {
          "type": {
            "type": "string",
            "enum": [
              "email",
              "ssn",
              "credit_card",
              "phone",
              "ipv4",
              "ipv6"
            ]
          },
          "value": {
            "type": "string",
            "description": "The matched substring."
          },
          "start": {
            "type": "integer",
            "minimum": 0
          },
          "end": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "ScanCore": {
        "type": "object",
        "required": [
          "text_length",
          "has_pii",
          "finding_count",
          "counts_by_type",
          "findings",
          "redacted_text",
          "risk_level"
        ],
        "properties": {
          "text_length": {
            "type": "integer",
            "minimum": 0
          },
          "has_pii": {
            "type": "boolean"
          },
          "finding_count": {
            "type": "integer",
            "minimum": 0
          },
          "counts_by_type": {
            "type": "object",
            "additionalProperties": {
              "type": "integer",
              "minimum": 0
            },
            "description": "Count of findings per PII type."
          },
          "findings": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "type",
                "value",
                "start",
                "end"
              ],
              "additionalProperties": false,
              "properties": {
                "type": {
                  "type": "string",
                  "enum": [
                    "email",
                    "ssn",
                    "credit_card",
                    "phone",
                    "ipv4",
                    "ipv6"
                  ]
                },
                "value": {
                  "type": "string",
                  "description": "The matched substring."
                },
                "start": {
                  "type": "integer",
                  "minimum": 0
                },
                "end": {
                  "type": "integer",
                  "minimum": 0
                }
              }
            }
          },
          "redacted_text": {
            "type": "string",
            "description": "The input with detected spans masked."
          },
          "risk_level": {
            "type": "string",
            "enum": [
              "none",
              "low",
              "medium",
              "high"
            ]
          }
        }
      },
      "ScanRequest": {
        "type": "object",
        "required": [
          "text"
        ],
        "additionalProperties": false,
        "properties": {
          "text": {
            "type": "string",
            "description": "Text to scan for sensitive data (≤200,000 chars)."
          },
          "types": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "email",
                "ssn",
                "credit_card",
                "phone",
                "ipv4",
                "ipv6"
              ]
            },
            "description": "Restrict detection to these types (default: all)."
          },
          "mask_style": {
            "type": "string",
            "enum": [
              "label",
              "stars",
              "type"
            ],
            "description": "Redaction style: \"[REDACTED_EMAIL]\" (label), \"****\" (stars), or \"[EMAIL]\" (type). Default label."
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
          "x402_compatible"
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
          }
        }
      },
      "ScanResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/ScanCore"
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
            "$ref": "#/components/schemas/ScanCore"
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

## Live example responses
### POST /scan (email/phone/SSN/Luhn-card/IPv4 + redaction + risk high)
Request:
```json
{
  "text": "Contact Ada at ada@example.com or (555) 123-4567. SSN 123-45-6789, card 4111 1111 1111 1111, host 192.168.1.1."
}
```
Response (HTTP 200):
```json
{
  "trace_id": "8l16wclf-1781576000951",
  "request_id": "8l16wclf-1781576000951",
  "computed_at": "2026-06-16T02:13:20.951Z",
  "success": true,
  "latency_ms": 0,
  "text_length": 110,
  "has_pii": true,
  "finding_count": 5,
  "counts_by_type": {
    "email": 1,
    "phone": 1,
    "ssn": 1,
    "credit_card": 1,
    "ipv4": 1
  },
  "findings": [
    {
      "type": "email",
      "value": "ada@example.com",
      "start": 15,
      "end": 30
    },
    {
      "type": "phone",
      "value": "(555) 123-4567",
      "start": 34,
      "end": 48
    },
    {
      "type": "ssn",
      "value": "123-45-6789",
      "start": 54,
      "end": 65
    },
    {
      "type": "credit_card",
      "value": "4111 1111 1111 1111",
      "start": 72,
      "end": 91
    },
    {
      "type": "ipv4",
      "value": "192.168.1.1",
      "start": 98,
      "end": 109
    }
  ],
  "redacted_text": "Contact Ada at [REDACTED_EMAIL] or [REDACTED_PHONE]. SSN [REDACTED_SSN], card [REDACTED_CREDIT_CARD], host [REDACTED_IPV4].",
  "risk_level": "high",
  "confidence_score": 0.85,
  "confidence_per_section": {
    "detection": 1,
    "classification": 0.8,
    "risk": 0.7
  },
  "recommended_actions_priority_order": [
    "5 sensitive item(s) found — risk high. Types: email, phone, ssn, credit_card, ipv4.",
    "Use redacted_text for logs/LLM prompts; never persist the raw values.",
    "High-risk PII (SSN/PAN) present — encrypt at rest and restrict access; chain to data-encryption-advisor."
  ],
  "chain_to": [
    {
      "api": "data-encryption-advisor",
      "reason": "Get encryption/tokenization recommendations for the PII categories detected here."
    },
    {
      "api": "data-classification",
      "reason": "Classify which columns of a dataset carry these PII types."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /scan (types filter + mask_style=stars; non-Luhn 16-digit NOT flagged)
Request:
```json
{
  "text": "card 1234 5678 9012 3456 and email x@y.io",
  "types": [
    "email",
    "credit_card"
  ],
  "mask_style": "stars"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "7brcop7o-1781576000956",
  "request_id": "7brcop7o-1781576000956",
  "computed_at": "2026-06-16T02:13:20.956Z",
  "success": true,
  "latency_ms": 1,
  "text_length": 41,
  "has_pii": true,
  "finding_count": 1,
  "counts_by_type": {
    "email": 1
  },
  "findings": [
    {
      "type": "email",
      "value": "x@y.io",
      "start": 35,
      "end": 41
    }
  ],
  "redacted_text": "card 1234 5678 9012 3456 and email ******",
  "risk_level": "medium",
  "confidence_score": 0.85,
  "confidence_per_section": {
    "detection": 1,
    "classification": 0.8,
    "risk": 0.7
  },
  "recommended_actions_priority_order": [
    "1 sensitive item(s) found — risk medium. Types: email.",
    "Use redacted_text for logs/LLM prompts; never persist the raw values.",
    "Review medium/low findings for false positives before acting."
  ],
  "chain_to": [
    {
      "api": "data-encryption-advisor",
      "reason": "Get encryption/tokenization recommendations for the PII categories detected here."
    },
    {
      "api": "data-classification",
      "reason": "Classify which columns of a dataset carry these PII types."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /lookup (scan + reasoning)
Request:
```json
{
  "text": "no PII here, just text."
}
```
Response (HTTP 200):
```json
{
  "trace_id": "b0z7j2qz-1781576000961",
  "request_id": "b0z7j2qz-1781576000961",
  "computed_at": "2026-06-16T02:13:20.961Z",
  "success": true,
  "latency_ms": 0,
  "text_length": 23,
  "has_pii": false,
  "finding_count": 0,
  "counts_by_type": {},
  "findings": [],
  "redacted_text": "no PII here, just text.",
  "risk_level": "none",
  "reasoning": {
    "why_result_generated": "Scanned 23 character(s) for 6 PII type(s): 0 finding(s), risk none.",
    "key_factors": [
      "Counts: none.",
      "Credit-card matches are Luhn-validated; SSN/phone use US-centric shapes.",
      "Risk derived from the highest-severity type present."
    ],
    "invalidators": [
      "Detection is pattern-based and deterministic: it flags strings that MATCH the shape of each type, not strings proven to be real PII — a random 9-digit-pattern is reported as an SSN, and a number passing the Luhn check is not necessarily an issued card.",
      "Coverage is limited to email/SSN/credit-card/phone/IPv4/IPv6 with US-centric SSN/phone shapes; passports, national IDs, addresses, and names are NOT detected.",
      "Overlapping matches are resolved by earliest-start, then longest, then type precedence (card/SSN beat phone); a different segmentation could group digits differently."
    ]
  },
  "confidence_score": 0.85,
  "confidence_per_section": {
    "detection": 1,
    "classification": 0.8,
    "risk": 0.7
  },
  "recommended_actions_priority_order": [
    "0 sensitive item(s) found — risk none.",
    "No sensitive patterns detected in the supplied text.",
    "Review medium/low findings for false positives before acting."
  ],
  "chain_to": [
    {
      "api": "data-encryption-advisor",
      "reason": "Get encryption/tokenization recommendations for the PII categories detected here."
    },
    {
      "api": "data-classification",
      "reason": "Classify which columns of a dataset carry these PII types."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /scan (error: missing text)
Request:
```json
{}
```
Response (HTTP 400):
```json
{
  "trace_id": "7eh3rxhw-1781576000963",
  "request_id": "7eh3rxhw-1781576000963",
  "computed_at": "2026-06-16T02:13:20.963Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"text\" must be a string."
  }
}
```

---

# data-encryption-advisor

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic data-encryption advisor. Maps supplied data categories +
// regulatory context + environment to an encryption rubric: classification level,
// at-rest / in-transit recommendations, per-category field-level handling, key-
// management guidance, and compliance notes. Rule-based, advisory — no LLM,
// nothing fetched or stored.

const router = Router();

type Level = 'public' | 'internal' | 'confidential' | 'restricted';
const CATEGORY_SEVERITY: Record<string, number> = {
  public: 0, general: 1, pii: 2, financial: 2, health: 2, phi: 3, pci: 3, credentials: 3, biometric: 3,
};
const ENVIRONMENTS = ['cloud', 'on_prem', 'hybrid'];
const FRAMEWORKS = ['gdpr', 'hipaa', 'pci-dss', 'ccpa', 'sox'];

const LEVELS: Level[] = ['public', 'internal', 'confidential', 'restricted'];
const SCORE_BY_LEVEL: Record<Level, number> = { public: 10, internal: 35, confidential: 70, restricted: 95 };
const ROTATION_BY_LEVEL: Record<Level, number | null> = { public: null, internal: 365, confidential: 180, restricted: 90 };

const FIELD_HANDLING: Record<string, string> = {
  pci: 'Tokenize or format-preserving-encrypt the PAN; never store CVV; render PAN unreadable everywhere it is stored.',
  credentials: 'Use a one-way password hash (argon2id / bcrypt / scrypt) with a per-secret salt — do NOT use reversible encryption for credentials.',
  phi: 'Apply field/column-level encryption with strict access logging for electronic PHI.',
  pii: 'Field-level encryption or pseudonymization for direct identifiers; minimize and segregate.',
  biometric: 'Store only irreversible derived templates (hashed); never retain raw biometric samples.',
};
const COMPLIANCE_NOTE: Record<string, string> = {
  gdpr: 'GDPR Art. 32/34: encrypt personal data at rest and in transit; pseudonymization can reduce breach-notification scope.',
  hipaa: 'HIPAA 45 CFR 164.312: encryption is an addressable safeguard for ePHI at rest and in transit.',
  'pci-dss': 'PCI-DSS Req. 3 & 4: render PAN unreadable with strong crypto/tokenization, protect keys, and use TLS for transmission.',
  ccpa: 'CCPA/CPRA: encryption and redaction of personal information can limit statutory-damages exposure after a breach.',
  sox: 'SOX: encrypt financial reporting data and enforce key-access separation of duties with audit logging.',
};

export interface AtRest { recommended: boolean; algorithm: string; key_bits: number; key_management: string; rotation_days: number | null; }
export interface InTransit { recommended: boolean; min_tls: string; mutual_tls: boolean; }
export interface FieldHandling { category: string; technique: string; }
export interface ComplianceNote { framework: string; note: string; }
export interface AdviceCore {
  classification: Level;
  sensitivity_score: number;
  categories: string[];
  at_rest: AtRest;
  in_transit: InTransit;
  field_level: FieldHandling[];
  key_management: string[];
  compliance_notes: ComplianceNote[];
  additional_controls: string[];
}

function advise(categories: string[], regulatory: string[], environment: string): AdviceCore {
  const maxSev = Math.max(...categories.map((c) => CATEGORY_SEVERITY[c]));
  const classification = LEVELS[maxSev];

  const kmBase = environment === 'on_prem' ? 'an on-prem HSM or self-managed KMS'
    : environment === 'hybrid' ? 'a cloud KMS bridged to an on-prem HSM' : 'a managed cloud KMS';
  const at_rest: AtRest = {
    recommended: maxSev >= 1,
    algorithm: 'AES-256-GCM',
    key_bits: 256,
    key_management: maxSev >= 3 ? `HSM-backed keys via ${kmBase} with envelope encryption` : `envelope encryption via ${kmBase}`,
    rotation_days: ROTATION_BY_LEVEL[classification],
  };
  const in_transit: InTransit = { recommended: true, min_tls: 'TLS 1.3', mutual_tls: maxSev >= 3 };

  const field_level: FieldHandling[] = categories
    .filter((c) => FIELD_HANDLING[c])
    .map((c) => ({ category: c, technique: FIELD_HANDLING[c] }));

  const key_management = [
    `Rotate data-encryption keys${at_rest.rotation_days ? ` every ${at_rest.rotation_days} days` : ' on a defined schedule'} and on suspected compromise.`,
    'Use envelope encryption (data keys wrapped by a key-encryption key); never hardcode keys — store them in a secrets manager / KMS.',
    'Enforce least-privilege and separation of duties for key access; log and alert on all key use.',
  ];
  const additional_controls = [
    'Encrypt backups, snapshots, and exports to the same standard as primary storage.',
    'Mask or redact sensitive fields in logs and LLM prompts (see sensitive-data-detector).',
    maxSev >= 2 ? 'Restrict access on a need-to-know basis and retain access audit logs.' : 'Document the data classification and review it as the data set evolves.',
  ];

  const compliance_notes: ComplianceNote[] = regulatory.map((f) => ({ framework: f, note: COMPLIANCE_NOTE[f] }));

  return {
    classification, sensitivity_score: SCORE_BY_LEVEL[classification], categories,
    at_rest, in_transit, field_level, key_management, compliance_notes, additional_controls,
  };
}

function parse(body: any): { error: string } | { categories: string[]; regulatory: string[]; environment: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "data_categories" array.' };
  if (!Array.isArray(body.data_categories) || body.data_categories.length === 0) return { error: '"data_categories" must be a non-empty array.' };
  const cats = Object.keys(CATEGORY_SEVERITY);
  for (const c of body.data_categories) if (!cats.includes(c)) return { error: `data_categories contains "${c}"; allowed: ${cats.join(', ')}.` };
  const categories = [...new Set(body.data_categories as string[])];

  let regulatory: string[] = [];
  if (body.regulatory !== undefined) {
    if (!Array.isArray(body.regulatory) || !body.regulatory.every((f: unknown) => FRAMEWORKS.includes(f as string))) {
      return { error: `"regulatory" must be an array drawn from: ${FRAMEWORKS.join(', ')}.` };
    }
    regulatory = [...new Set(body.regulatory as string[])];
  }
  let environment = 'cloud';
  if (body.environment !== undefined) {
    if (!ENVIRONMENTS.includes(body.environment)) return { error: `"environment" must be one of: ${ENVIRONMENTS.join(', ')}.` };
    environment = body.environment;
  }
  return { categories, regulatory, environment };
}

const CHAIN_TO = [
  { api: 'sensitive-data-detector', reason: 'Find the actual PII spans in your payloads that these controls should protect.' },
  { api: 'jwt-claims-designer', reason: 'Design token claims that avoid embedding the sensitive data covered here.' },
];
const INVALIDATORS = [
  'Recommendations are a deterministic rubric mapped from the supplied categories/regulatory/environment — they are general best-practice guidance, NOT legal advice or a substitute for a compliance assessment.',
  'Classification is the maximum severity across the supplied categories; categories not provided are not considered, and credentials are flagged for one-way hashing rather than reversible encryption.',
  'Compliance notes summarize common obligations for the named frameworks at a high level; consult the controlling regulation and your DPO/auditor for specifics.',
];

const TAIL = (r: AdviceCore) => ({
  confidence_score: 0.8, confidence_per_section: { classification: 1, recommendations: 0.8 },
  recommended_actions_priority_order: [
    `Classification: ${r.classification} (sensitivity ${r.sensitivity_score}/100). Encrypt at rest with ${r.at_rest.algorithm}; ${r.in_transit.min_tls}${r.in_transit.mutual_tls ? ' + mTLS' : ''} in transit.`,
    r.field_level.length ? `Apply field-level handling for: ${r.field_level.map((f) => f.category).join(', ')}.` : 'No category-specific field handling required.',
    r.at_rest.rotation_days ? `Rotate keys every ${r.at_rest.rotation_days} days via ${r.at_rest.key_management}.` : 'Define a key-rotation schedule appropriate to the data.',
  ],
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Encryption Advisor API', version: '1.0.0',
    description: 'Deterministic data-encryption advisor. Maps data categories + regulatory context + environment to an encryption rubric: classification, at-rest/in-transit recommendations, per-category field handling, key-management guidance, and compliance notes. Rule-based, advisory. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-encryption-advisor/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/advise', summary: 'Get an encryption rubric for the supplied data', price_usdc: 0.009 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL advice + reasoning', price_usdc: 0.016 },
    ],
    pricing: [
      { path: '/advise', price_usdc: 0.009, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.016, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/advise', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = advise(p.categories, p.regulatory, p.environment);
  respond(res, t0, { ...r, ...TAIL(r) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = advise(p.categories, p.regulatory, p.environment);
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Classified ${r.categories.length} category(ies) as ${r.classification}; produced at-rest/in-transit/field-level/key-management guidance${r.compliance_notes.length ? ` and ${r.compliance_notes.length} compliance note(s)` : ''}.`,
      key_factors: [
        `Highest-severity category drives classification ${r.classification}.`,
        `In-transit mTLS ${r.in_transit.mutual_tls ? 'required (restricted data)' : 'not required at this level'}; key rotation ${r.at_rest.rotation_days ?? 'scheduled'} day(s).`,
        `Field-level handling for: ${r.field_level.map((f) => f.category).join(', ') || 'none'}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(r),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { adviseExample, lookupExample } from './examples';

const LEVEL_ENUM = ['public', 'internal', 'confidential', 'restricted'];
const CATEGORY_ENUM = ['public', 'general', 'pii', 'financial', 'health', 'phi', 'pci', 'credentials', 'biometric'];
const FRAMEWORK_ENUM = ['gdpr', 'hipaa', 'pci-dss', 'ccpa', 'sox'];
const ENV_ENUM = ['cloud', 'on_prem', 'hybrid'];

const AtRest = {
  type: 'object', required: ['recommended', 'algorithm', 'key_bits', 'key_management', 'rotation_days'], additionalProperties: false,
  properties: {
    recommended: { type: 'boolean' },
    algorithm: { type: 'string' },
    key_bits: { type: 'integer' },
    key_management: { type: 'string' },
    rotation_days: { type: ['integer', 'null'] },
  },
};
const InTransit = {
  type: 'object', required: ['recommended', 'min_tls', 'mutual_tls'], additionalProperties: false,
  properties: { recommended: { type: 'boolean' }, min_tls: { type: 'string' }, mutual_tls: { type: 'boolean' } },
};
const FieldHandling = {
  type: 'object', required: ['category', 'technique'], additionalProperties: false,
  properties: { category: { type: 'string' }, technique: { type: 'string' } },
};
const ComplianceNote = {
  type: 'object', required: ['framework', 'note'], additionalProperties: false,
  properties: { framework: { type: 'string', enum: FRAMEWORK_ENUM }, note: { type: 'string' } },
};
const AdviceCore = {
  type: 'object', required: ['classification', 'sensitivity_score', 'categories', 'at_rest', 'in_transit', 'field_level', 'key_management', 'compliance_notes', 'additional_controls'],
  properties: {
    classification: { type: 'string', enum: LEVEL_ENUM },
    sensitivity_score: { type: 'integer', minimum: 0, maximum: 100 },
    categories: { type: 'array', items: { type: 'string' } },
    at_rest: AtRest,
    in_transit: InTransit,
    field_level: { type: 'array', items: FieldHandling },
    key_management: { type: 'array', items: { type: 'string' } },
    compliance_notes: { type: 'array', items: ComplianceNote },
    additional_controls: { type: 'array', items: { type: 'string' } },
  },
};
const AdviseRequest = {
  type: 'object', required: ['data_categories'], additionalProperties: false,
  properties: {
    data_categories: { type: 'array', minItems: 1, items: { type: 'string', enum: CATEGORY_ENUM }, description: 'Categories of data being protected.' },
    regulatory: { type: 'array', items: { type: 'string', enum: FRAMEWORK_ENUM }, description: 'Applicable regulatory frameworks (optional).' },
    environment: { type: 'string', enum: ENV_ENUM, description: 'Hosting environment (affects key-management guidance). Default cloud.' },
  },
};

const adviseReq = { data_categories: ['pii', 'pci', 'credentials'], regulatory: ['gdpr', 'pci-dss'], environment: 'cloud' };

const disc = {
  name: 'Data Encryption Advisor API', version: '1.0.0',
  description: 'Deterministic data-encryption advisor. Maps data categories + regulatory context + environment to an encryption rubric: classification, at-rest/in-transit recommendations, per-category field handling, key-management guidance, and compliance notes. Rule-based, advisory. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-encryption-advisor/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/advise', summary: 'Get an encryption rubric for the supplied data', price_usdc: 0.009 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL advice + reasoning', price_usdc: 0.016 },
  ],
  pricing: [
    { path: '/advise', price_usdc: 0.009, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.016, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('classification', 'recommendations'), _Tail: Tail,
  AtRest, InTransit, FieldHandling, ComplianceNote, AdviceCore, AdviseRequest, DiscoveryResponse: discoverySchema(),
  AdviseResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AdviceCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AdviceCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/advise', summary: 'Get an encryption rubric for the supplied data', operationId: 'advise', priceUsdc: 0.009, requestSchemaRef: 'AdviseRequest', responseSchemaRef: 'AdviseResponse', requestExample: adviseReq, responseExample: adviseExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL advice + reasoning', operationId: 'lookup', priceUsdc: 0.016, oneCall: true, requestSchemaRef: 'AdviseRequest', responseSchemaRef: 'LookupResponse', requestExample: adviseReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'data-encryption-advisor', title: 'Data Encryption Advisor API', version: '1.0.0',
  description: 'Deterministic data-encryption advisor — data categories + regulatory + environment → encryption rubric (classification, at-rest/in-transit, field-level, key-management, compliance notes). No LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (GET /data-encryption-advisor/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Data Encryption Advisor API",
    "version": "1.0.0",
    "description": "Deterministic data-encryption advisor — data categories + regulatory + environment → encryption rubric (classification, at-rest/in-transit, field-level, key-management, compliance notes). No LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-security-tool": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/data-encryption-advisor"
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
                  "name": "Data Encryption Advisor API",
                  "version": "1.0.0",
                  "description": "Deterministic data-encryption advisor. Maps data categories + regulatory context + environment to an encryption rubric: classification, at-rest/in-transit recommendations, per-category field handling, key-management guidance, and compliance notes. Rule-based, advisory. No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/data-encryption-advisor/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/advise",
                      "summary": "Get an encryption rubric for the supplied data",
                      "price_usdc": 0.009
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL advice + reasoning",
                      "price_usdc": 0.016
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/advise",
                      "price_usdc": 0.009,
                      "currency": "USDC"
                    },
                    {
                      "path": "/lookup",
                      "price_usdc": 0.016,
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
    "/advise": {
      "post": {
        "operationId": "advise",
        "summary": "Get an encryption rubric for the supplied data",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AdviseResponse"
                },
                "example": {
                  "trace_id": "dea-1780000000000",
                  "request_id": "dea-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "classification": "restricted",
                  "sensitivity_score": 95,
                  "categories": [
                    "pii",
                    "pci",
                    "credentials"
                  ],
                  "at_rest": {
                    "recommended": true,
                    "algorithm": "AES-256-GCM",
                    "key_bits": 256,
                    "key_management": "HSM-backed keys via a managed cloud KMS with envelope encryption",
                    "rotation_days": 90
                  },
                  "in_transit": {
                    "recommended": true,
                    "min_tls": "TLS 1.3",
                    "mutual_tls": true
                  },
                  "field_level": [
                    {
                      "category": "pii",
                      "technique": "Field-level encryption or pseudonymization for direct identifiers; minimize and segregate."
                    },
                    {
                      "category": "pci",
                      "technique": "Tokenize or format-preserving-encrypt the PAN; never store CVV; render PAN unreadable everywhere it is stored."
                    },
                    {
                      "category": "credentials",
                      "technique": "Use a one-way password hash (argon2id / bcrypt / scrypt) with a per-secret salt — do NOT use reversible encryption for credentials."
                    }
                  ],
                  "key_management": [
                    "Rotate data-encryption keys every 90 days and on suspected compromise.",
                    "Use envelope encryption (data keys wrapped by a key-encryption key); never hardcode keys — store them in a secrets manager / KMS.",
                    "Enforce least-privilege and separation of duties for key access; log and alert on all key use."
                  ],
                  "compliance_notes": [
                    {
                      "framework": "gdpr",
                      "note": "GDPR Art. 32/34: encrypt personal data at rest and in transit; pseudonymization can reduce breach-notification scope."
                    },
                    {
                      "framework": "pci-dss",
                      "note": "PCI-DSS Req. 3 & 4: render PAN unreadable with strong crypto/tokenization, protect keys, and use TLS for transmission."
                    }
                  ],
                  "additional_controls": [
                    "Encrypt backups, snapshots, and exports to the same standard as primary storage.",
                    "Mask or redact sensitive fields in logs and LLM prompts (see sensitive-data-detector).",
                    "Restrict access on a need-to-know basis and retain access audit logs."
                  ],
                  "confidence_score": 0.8,
                  "confidence_per_section": {
                    "classification": 1,
                    "recommendations": 0.8
                  },
                  "recommended_actions_priority_order": [
                    "Classification: restricted (sensitivity 95/100). Encrypt at rest with AES-256-GCM; TLS 1.3 + mTLS in transit.",
                    "Apply field-level handling for: pii, pci, credentials.",
                    "Rotate keys every 90 days via HSM-backed keys via a managed cloud KMS with envelope encryption."
                  ],
                  "chain_to": [
                    {
                      "api": "sensitive-data-detector",
                      "reason": "Find the actual PII spans in your payloads that these controls should protect."
                    },
                    {
                      "api": "jwt-claims-designer",
                      "reason": "Design token claims that avoid embedding the sensitive data covered here."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true
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
                "$ref": "#/components/schemas/AdviseRequest"
              },
              "example": {
                "data_categories": [
                  "pii",
                  "pci",
                  "credentials"
                ],
                "regulatory": [
                  "gdpr",
                  "pci-dss"
                ],
                "environment": "cloud"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.009,
          "currency": "USDC"
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "ONE-CALL advice + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "dea-1780000000000",
                  "request_id": "dea-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "classification": "restricted",
                  "sensitivity_score": 95,
                  "categories": [
                    "pii",
                    "pci",
                    "credentials"
                  ],
                  "at_rest": {
                    "recommended": true,
                    "algorithm": "AES-256-GCM",
                    "key_bits": 256,
                    "key_management": "HSM-backed keys via a managed cloud KMS with envelope encryption",
                    "rotation_days": 90
                  },
                  "in_transit": {
                    "recommended": true,
                    "min_tls": "TLS 1.3",
                    "mutual_tls": true
                  },
                  "field_level": [
                    {
                      "category": "pii",
                      "technique": "Field-level encryption or pseudonymization for direct identifiers; minimize and segregate."
                    },
                    {
                      "category": "pci",
                      "technique": "Tokenize or format-preserving-encrypt the PAN; never store CVV; render PAN unreadable everywhere it is stored."
                    },
                    {
                      "category": "credentials",
                      "technique": "Use a one-way password hash (argon2id / bcrypt / scrypt) with a per-secret salt — do NOT use reversible encryption for credentials."
                    }
                  ],
                  "key_management": [
                    "Rotate data-encryption keys every 90 days and on suspected compromise.",
                    "Use envelope encryption (data keys wrapped by a key-encryption key); never hardcode keys — store them in a secrets manager / KMS.",
                    "Enforce least-privilege and separation of duties for key access; log and alert on all key use."
                  ],
                  "compliance_notes": [
                    {
                      "framework": "gdpr",
                      "note": "GDPR Art. 32/34: encrypt personal data at rest and in transit; pseudonymization can reduce breach-notification scope."
                    },
                    {
                      "framework": "pci-dss",
                      "note": "PCI-DSS Req. 3 & 4: render PAN unreadable with strong crypto/tokenization, protect keys, and use TLS for transmission."
                    }
                  ],
                  "additional_controls": [
                    "Encrypt backups, snapshots, and exports to the same standard as primary storage.",
                    "Mask or redact sensitive fields in logs and LLM prompts (see sensitive-data-detector).",
                    "Restrict access on a need-to-know basis and retain access audit logs."
                  ],
                  "reasoning": {
                    "why_result_generated": "Classified 3 category(ies) as restricted; produced at-rest/in-transit/field-level/key-management guidance and 2 compliance note(s).",
                    "key_factors": [
                      "Highest-severity category drives classification restricted.",
                      "In-transit mTLS required (restricted data); key rotation 90 day(s).",
                      "Field-level handling for: pii, pci, credentials."
                    ],
                    "invalidators": [
                      "Recommendations are a deterministic rubric mapped from the supplied categories/regulatory/environment — they are general best-practice guidance, NOT legal advice or a substitute for a compliance assessment.",
                      "Classification is the maximum severity across the supplied categories; categories not provided are not considered, and credentials are flagged for one-way hashing rather than reversible encryption.",
                      "Compliance notes summarize common obligations for the named frameworks at a high level; consult the controlling regulation and your DPO/auditor for specifics."
                    ]
                  },
                  "confidence_score": 0.8,
                  "confidence_per_section": {
                    "classification": 1,
                    "recommendations": 0.8
                  },
                  "recommended_actions_priority_order": [
                    "Classification: restricted (sensitivity 95/100). Encrypt at rest with AES-256-GCM; TLS 1.3 + mTLS in transit.",
                    "Apply field-level handling for: pii, pci, credentials.",
                    "Rotate keys every 90 days via HSM-backed keys via a managed cloud KMS with envelope encryption."
                  ],
                  "chain_to": [
                    {
                      "api": "sensitive-data-detector",
                      "reason": "Find the actual PII spans in your payloads that these controls should protect."
                    },
                    {
                      "api": "jwt-claims-designer",
                      "reason": "Design token claims that avoid embedding the sensitive data covered here."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true
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
                "$ref": "#/components/schemas/AdviseRequest"
              },
              "example": {
                "data_categories": [
                  "pii",
                  "pci",
                  "credentials"
                ],
                "regulatory": [
                  "gdpr",
                  "pci-dss"
                ],
                "environment": "cloud"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.016,
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
          "latency_ms"
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
          "automation_safe"
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
          }
        }
      },
      "ConfidencePerSection": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "classification": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "recommendations": {
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
      "AtRest": {
        "type": "object",
        "required": [
          "recommended",
          "algorithm",
          "key_bits",
          "key_management",
          "rotation_days"
        ],
        "additionalProperties": false,
        "properties": {
          "recommended": {
            "type": "boolean"
          },
          "algorithm": {
            "type": "string"
          },
          "key_bits": {
            "type": "integer"
          },
          "key_management": {
            "type": "string"
          },
          "rotation_days": {
            "type": [
              "integer",
              "null"
            ]
          }
        }
      },
      "InTransit": {
        "type": "object",
        "required": [
          "recommended",
          "min_tls",
          "mutual_tls"
        ],
        "additionalProperties": false,
        "properties": {
          "recommended": {
            "type": "boolean"
          },
          "min_tls": {
            "type": "string"
          },
          "mutual_tls": {
            "type": "boolean"
          }
        }
      },
      "FieldHandling": {
        "type": "object",
        "required": [
          "category",
          "technique"
        ],
        "additionalProperties": false,
        "properties": {
          "category": {
            "type": "string"
          },
          "technique": {
            "type": "string"
          }
        }
      },
      "ComplianceNote": {
        "type": "object",
        "required": [
          "framework",
          "note"
        ],
        "additionalProperties": false,
        "properties": {
          "framework": {
            "type": "string",
            "enum": [
              "gdpr",
              "hipaa",
              "pci-dss",
              "ccpa",
              "sox"
            ]
          },
          "note": {
            "type": "string"
          }
        }
      },
      "AdviceCore": {
        "type": "object",
        "required": [
          "classification",
          "sensitivity_score",
          "categories",
          "at_rest",
          "in_transit",
          "field_level",
          "key_management",
          "compliance_notes",
          "additional_controls"
        ],
        "properties": {
          "classification": {
            "type": "string",
            "enum": [
              "public",
              "internal",
              "confidential",
              "restricted"
            ]
          },
          "sensitivity_score": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100
          },
          "categories": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "at_rest": {
            "type": "object",
            "required": [
              "recommended",
              "algorithm",
              "key_bits",
              "key_management",
              "rotation_days"
            ],
            "additionalProperties": false,
            "properties": {
              "recommended": {
                "type": "boolean"
              },
              "algorithm": {
                "type": "string"
              },
              "key_bits": {
                "type": "integer"
              },
              "key_management": {
                "type": "string"
              },
              "rotation_days": {
                "type": [
                  "integer",
                  "null"
                ]
              }
            }
          },
          "in_transit": {
            "type": "object",
            "required": [
              "recommended",
              "min_tls",
              "mutual_tls"
            ],
            "additionalProperties": false,
            "properties": {
              "recommended": {
                "type": "boolean"
              },
              "min_tls": {
                "type": "string"
              },
              "mutual_tls": {
                "type": "boolean"
              }
            }
          },
          "field_level": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "category",
                "technique"
              ],
              "additionalProperties": false,
              "properties": {
                "category": {
                  "type": "string"
                },
                "technique": {
                  "type": "string"
                }
              }
            }
          },
          "key_management": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "compliance_notes": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "framework",
                "note"
              ],
              "additionalProperties": false,
              "properties": {
                "framework": {
                  "type": "string",
                  "enum": [
                    "gdpr",
                    "hipaa",
                    "pci-dss",
                    "ccpa",
                    "sox"
                  ]
                },
                "note": {
                  "type": "string"
                }
              }
            }
          },
          "additional_controls": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "AdviseRequest": {
        "type": "object",
        "required": [
          "data_categories"
        ],
        "additionalProperties": false,
        "properties": {
          "data_categories": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string",
              "enum": [
                "public",
                "general",
                "pii",
                "financial",
                "health",
                "phi",
                "pci",
                "credentials",
                "biometric"
              ]
            },
            "description": "Categories of data being protected."
          },
          "regulatory": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "gdpr",
                "hipaa",
                "pci-dss",
                "ccpa",
                "sox"
              ]
            },
            "description": "Applicable regulatory frameworks (optional)."
          },
          "environment": {
            "type": "string",
            "enum": [
              "cloud",
              "on_prem",
              "hybrid"
            ],
            "description": "Hosting environment (affects key-management guidance). Default cloud."
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
          "x402_compatible"
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
          }
        }
      },
      "AdviseResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/AdviceCore"
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
            "$ref": "#/components/schemas/AdviceCore"
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

## Live example responses
### POST /advise (pii+pci+credentials → restricted; credentials→hashing)
Request:
```json
{
  "data_categories": [
    "pii",
    "pci",
    "credentials"
  ],
  "regulatory": [
    "gdpr",
    "pci-dss"
  ],
  "environment": "cloud"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "k3hxjqsn-1781576000971",
  "request_id": "k3hxjqsn-1781576000971",
  "computed_at": "2026-06-16T02:13:20.971Z",
  "success": true,
  "latency_ms": 0,
  "classification": "restricted",
  "sensitivity_score": 95,
  "categories": [
    "pii",
    "pci",
    "credentials"
  ],
  "at_rest": {
    "recommended": true,
    "algorithm": "AES-256-GCM",
    "key_bits": 256,
    "key_management": "HSM-backed keys via a managed cloud KMS with envelope encryption",
    "rotation_days": 90
  },
  "in_transit": {
    "recommended": true,
    "min_tls": "TLS 1.3",
    "mutual_tls": true
  },
  "field_level": [
    {
      "category": "pii",
      "technique": "Field-level encryption or pseudonymization for direct identifiers; minimize and segregate."
    },
    {
      "category": "pci",
      "technique": "Tokenize or format-preserving-encrypt the PAN; never store CVV; render PAN unreadable everywhere it is stored."
    },
    {
      "category": "credentials",
      "technique": "Use a one-way password hash (argon2id / bcrypt / scrypt) with a per-secret salt — do NOT use reversible encryption for credentials."
    }
  ],
  "key_management": [
    "Rotate data-encryption keys every 90 days and on suspected compromise.",
    "Use envelope encryption (data keys wrapped by a key-encryption key); never hardcode keys — store them in a secrets manager / KMS.",
    "Enforce least-privilege and separation of duties for key access; log and alert on all key use."
  ],
  "compliance_notes": [
    {
      "framework": "gdpr",
      "note": "GDPR Art. 32/34: encrypt personal data at rest and in transit; pseudonymization can reduce breach-notification scope."
    },
    {
      "framework": "pci-dss",
      "note": "PCI-DSS Req. 3 & 4: render PAN unreadable with strong crypto/tokenization, protect keys, and use TLS for transmission."
    }
  ],
  "additional_controls": [
    "Encrypt backups, snapshots, and exports to the same standard as primary storage.",
    "Mask or redact sensitive fields in logs and LLM prompts (see sensitive-data-detector).",
    "Restrict access on a need-to-know basis and retain access audit logs."
  ],
  "confidence_score": 0.8,
  "confidence_per_section": {
    "classification": 1,
    "recommendations": 0.8
  },
  "recommended_actions_priority_order": [
    "Classification: restricted (sensitivity 95/100). Encrypt at rest with AES-256-GCM; TLS 1.3 + mTLS in transit.",
    "Apply field-level handling for: pii, pci, credentials.",
    "Rotate keys every 90 days via HSM-backed keys via a managed cloud KMS with envelope encryption."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Find the actual PII spans in your payloads that these controls should protect."
    },
    {
      "api": "jwt-claims-designer",
      "reason": "Design token claims that avoid embedding the sensitive data covered here."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /advise (general only → internal, on_prem)
Request:
```json
{
  "data_categories": [
    "general"
  ],
  "environment": "on_prem"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "zx4cn8kx-1781576000974",
  "request_id": "zx4cn8kx-1781576000974",
  "computed_at": "2026-06-16T02:13:20.974Z",
  "success": true,
  "latency_ms": 0,
  "classification": "internal",
  "sensitivity_score": 35,
  "categories": [
    "general"
  ],
  "at_rest": {
    "recommended": true,
    "algorithm": "AES-256-GCM",
    "key_bits": 256,
    "key_management": "envelope encryption via an on-prem HSM or self-managed KMS",
    "rotation_days": 365
  },
  "in_transit": {
    "recommended": true,
    "min_tls": "TLS 1.3",
    "mutual_tls": false
  },
  "field_level": [],
  "key_management": [
    "Rotate data-encryption keys every 365 days and on suspected compromise.",
    "Use envelope encryption (data keys wrapped by a key-encryption key); never hardcode keys — store them in a secrets manager / KMS.",
    "Enforce least-privilege and separation of duties for key access; log and alert on all key use."
  ],
  "compliance_notes": [],
  "additional_controls": [
    "Encrypt backups, snapshots, and exports to the same standard as primary storage.",
    "Mask or redact sensitive fields in logs and LLM prompts (see sensitive-data-detector).",
    "Document the data classification and review it as the data set evolves."
  ],
  "confidence_score": 0.8,
  "confidence_per_section": {
    "classification": 1,
    "recommendations": 0.8
  },
  "recommended_actions_priority_order": [
    "Classification: internal (sensitivity 35/100). Encrypt at rest with AES-256-GCM; TLS 1.3 in transit.",
    "No category-specific field handling required.",
    "Rotate keys every 365 days via envelope encryption via an on-prem HSM or self-managed KMS."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Find the actual PII spans in your payloads that these controls should protect."
    },
    {
      "api": "jwt-claims-designer",
      "reason": "Design token claims that avoid embedding the sensitive data covered here."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /lookup (advice + reasoning)
Request:
```json
{
  "data_categories": [
    "phi"
  ],
  "regulatory": [
    "hipaa"
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "r4c19vb3-1781576000976",
  "request_id": "r4c19vb3-1781576000976",
  "computed_at": "2026-06-16T02:13:20.976Z",
  "success": true,
  "latency_ms": 1,
  "classification": "restricted",
  "sensitivity_score": 95,
  "categories": [
    "phi"
  ],
  "at_rest": {
    "recommended": true,
    "algorithm": "AES-256-GCM",
    "key_bits": 256,
    "key_management": "HSM-backed keys via a managed cloud KMS with envelope encryption",
    "rotation_days": 90
  },
  "in_transit": {
    "recommended": true,
    "min_tls": "TLS 1.3",
    "mutual_tls": true
  },
  "field_level": [
    {
      "category": "phi",
      "technique": "Apply field/column-level encryption with strict access logging for electronic PHI."
    }
  ],
  "key_management": [
    "Rotate data-encryption keys every 90 days and on suspected compromise.",
    "Use envelope encryption (data keys wrapped by a key-encryption key); never hardcode keys — store them in a secrets manager / KMS.",
    "Enforce least-privilege and separation of duties for key access; log and alert on all key use."
  ],
  "compliance_notes": [
    {
      "framework": "hipaa",
      "note": "HIPAA 45 CFR 164.312: encryption is an addressable safeguard for ePHI at rest and in transit."
    }
  ],
  "additional_controls": [
    "Encrypt backups, snapshots, and exports to the same standard as primary storage.",
    "Mask or redact sensitive fields in logs and LLM prompts (see sensitive-data-detector).",
    "Restrict access on a need-to-know basis and retain access audit logs."
  ],
  "reasoning": {
    "why_result_generated": "Classified 1 category(ies) as restricted; produced at-rest/in-transit/field-level/key-management guidance and 1 compliance note(s).",
    "key_factors": [
      "Highest-severity category drives classification restricted.",
      "In-transit mTLS required (restricted data); key rotation 90 day(s).",
      "Field-level handling for: phi."
    ],
    "invalidators": [
      "Recommendations are a deterministic rubric mapped from the supplied categories/regulatory/environment — they are general best-practice guidance, NOT legal advice or a substitute for a compliance assessment.",
      "Classification is the maximum severity across the supplied categories; categories not provided are not considered, and credentials are flagged for one-way hashing rather than reversible encryption.",
      "Compliance notes summarize common obligations for the named frameworks at a high level; consult the controlling regulation and your DPO/auditor for specifics."
    ]
  },
  "confidence_score": 0.8,
  "confidence_per_section": {
    "classification": 1,
    "recommendations": 0.8
  },
  "recommended_actions_priority_order": [
    "Classification: restricted (sensitivity 95/100). Encrypt at rest with AES-256-GCM; TLS 1.3 + mTLS in transit.",
    "Apply field-level handling for: phi.",
    "Rotate keys every 90 days via HSM-backed keys via a managed cloud KMS with envelope encryption."
  ],
  "chain_to": [
    {
      "api": "sensitive-data-detector",
      "reason": "Find the actual PII spans in your payloads that these controls should protect."
    },
    {
      "api": "jwt-claims-designer",
      "reason": "Design token claims that avoid embedding the sensitive data covered here."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /advise (error: empty data_categories)
Request:
```json
{
  "data_categories": []
}
```
Response (HTTP 400):
```json
{
  "trace_id": "nip1raz4-1781576000977",
  "request_id": "nip1raz4-1781576000977",
  "computed_at": "2026-06-16T02:13:20.977Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"data_categories\" must be a non-empty array."
  }
}
```

---

# jwt-claims-designer

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic JWT claims DESIGNER. Given a token profile (type, issuer,
// audience, scopes, TTL, signing alg), generates a recommended registered +
// custom claim set, sensible TTLs, an example payload, signing-algorithm advice,
// and security recommendations / anti-patterns. This GENERATES a design — it does
// not decode (jwt-decoder) or validate against a policy (jwt-claim-policy-validator).
// Rule-based, no LLM, nothing stored.

const router = Router();

const TOKEN_TYPES = ['access', 'id', 'refresh'];
const SUBJECT_TYPES = ['user', 'service'];
const KNOWN_ALGS = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512'];
const DEFAULT_TTL: Record<string, number> = { access: 900, id: 3600, refresh: 2592000 };
const IAT_EXAMPLE = 1700000000; // fixed reference instant so the example payload is deterministic

export interface RegisteredClaim { claim: string; include: boolean; required: boolean; value_or_format: string; rationale: string; }
export interface CustomClaim { claim: string; value_or_format: string; rationale: string; }
export interface AlgorithmAdvice { provided: string | null; recommended: string[]; avoid: string[]; note: string; }
export interface DesignCore {
  token_type: string;
  subject_type: string;
  recommended_ttl_seconds: number;
  registered_claims: RegisteredClaim[];
  custom_claims: CustomClaim[];
  example_payload: Record<string, unknown>;
  algorithm: AlgorithmAdvice;
  security_recommendations: string[];
  anti_patterns: string[];
}

interface Profile { tokenType: string; issuer: string; audience: string | string[]; subjectType: string; scopes: string[]; ttl: number; algorithm: string | null; }

function design(p: Profile): DesignCore {
  const { tokenType, issuer, audience, subjectType, scopes, ttl, algorithm } = p;
  const subValue = subjectType === 'service' ? 'svc-client-abc (the service/client identifier)' : 'user-123 (stable, non-reassignable user id)';
  const needsJti = tokenType === 'refresh';

  const registered_claims: RegisteredClaim[] = [
    { claim: 'iss', include: true, required: true, value_or_format: issuer, rationale: 'Identifies the issuer; verifiers must check it.' },
    { claim: 'sub', include: true, required: true, value_or_format: subValue, rationale: 'Principal the token is about; keep it stable and opaque.' },
    { claim: 'aud', include: true, required: true, value_or_format: Array.isArray(audience) ? audience.join(', ') : audience, rationale: 'Intended recipient(s); verifiers must reject tokens not meant for them.' },
    { claim: 'exp', include: true, required: true, value_or_format: `iat + ${ttl}s (UNIX seconds)`, rationale: 'Expiry; keep short for access tokens.' },
    { claim: 'iat', include: true, required: true, value_or_format: 'issue time (UNIX seconds)', rationale: 'Issue time; supports max-age and freshness checks.' },
    { claim: 'nbf', include: true, required: false, value_or_format: '= iat (UNIX seconds)', rationale: 'Not-before; defend against early use / clock games.' },
    { claim: 'jti', include: needsJti || tokenType === 'access', required: needsJti, value_or_format: 'unique token id (UUID)', rationale: needsJti ? 'Required to support refresh-token revocation/rotation.' : 'Enables per-token revocation and replay detection.' },
  ];

  const custom_claims: CustomClaim[] = [];
  if (tokenType === 'access') {
    custom_claims.push({ claim: 'scope', value_or_format: scopes.length ? scopes.join(' ') : 'space-delimited scopes', rationale: 'Least-privilege authorization the token grants.' });
    custom_claims.push({ claim: 'client_id', value_or_format: 'client-abc', rationale: 'OAuth client that requested the token.' });
  } else if (tokenType === 'id') {
    custom_claims.push({ claim: 'auth_time', value_or_format: 'UNIX seconds of authentication', rationale: 'When the end-user authenticated (OIDC).' });
    custom_claims.push({ claim: 'nonce', value_or_format: 'echo of the request nonce', rationale: 'Binds the ID token to the auth request; mitigates replay.' });
    if (Array.isArray(audience) && audience.length > 1) custom_claims.push({ claim: 'azp', value_or_format: 'authorized party (client_id)', rationale: 'Required by OIDC when there are multiple audiences.' });
  } else { // refresh
    custom_claims.push({ claim: 'client_id', value_or_format: 'client-abc', rationale: 'Binds the refresh token to its client.' });
  }

  const example_payload: Record<string, unknown> = {
    iss: issuer, sub: subjectType === 'service' ? 'svc-client-abc' : 'user-123', aud: audience,
    iat: IAT_EXAMPLE, nbf: IAT_EXAMPLE, exp: IAT_EXAMPLE + ttl,
  };
  if (registered_claims.find((c) => c.claim === 'jti')!.include) example_payload.jti = '5f3b2a1c-0d9e-4b8a-9c1f-2e7d6a4b3c2d';
  for (const c of custom_claims) {
    if (c.claim === 'scope') example_payload.scope = scopes.length ? scopes.join(' ') : 'read write';
    else if (c.claim === 'client_id') example_payload.client_id = 'client-abc';
    else if (c.claim === 'auth_time') example_payload.auth_time = IAT_EXAMPLE;
    else if (c.claim === 'nonce') example_payload.nonce = 'n-0S6_WzA2Mj';
    else if (c.claim === 'azp') example_payload.azp = 'client-abc';
  }

  const usesHS = algorithm ? algorithm.startsWith('HS') : false;
  const algorithm_advice: AlgorithmAdvice = {
    provided: algorithm,
    recommended: ['RS256', 'ES256'],
    avoid: ['none', 'HS256 (across service boundaries)'],
    note: usesHS
      ? 'HS* uses a shared secret — every verifier can also mint tokens. Prefer RS256/ES256 in distributed systems so verifiers hold only the public key.'
      : 'Asymmetric signing (RS256/ES256) lets verifiers validate with a public key while only the issuer can sign. Never accept alg:none or let clients choose the alg.',
  };

  const security_recommendations = [
    `Keep ${tokenType} tokens short-lived (recommended ${ttl}s)${tokenType === 'access' ? '; use refresh tokens for longevity.' : '.'}`,
    'Always validate iss, aud, exp, and nbf on the verifier; allow ~60s clock-skew leeway.',
    needsJti ? 'Track jti and rotate refresh tokens; maintain a revocation list.' : 'Include jti to enable revocation and replay detection.',
    'Never put passwords, secrets, full PII, or payment data in claims — a JWT is base64-encoded, not encrypted.',
    'Scope tokens narrowly (least privilege via scope + aud).',
  ];
  const anti_patterns = [
    'Long-lived or non-expiring access tokens.',
    'Accepting alg:none or trusting the alg header from the client.',
    'Embedding sensitive data (PII/secrets) in claims.',
    'Skipping aud/iss validation, so a token for service A is accepted by service B.',
  ];

  return {
    token_type: tokenType, subject_type: subjectType, recommended_ttl_seconds: ttl,
    registered_claims, custom_claims, example_payload, algorithm: algorithm_advice,
    security_recommendations, anti_patterns,
  };
}

function parse(body: any): { error: string } | { profile: Profile } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "token_type", "issuer", and "audience".' };
  if (!TOKEN_TYPES.includes(body.token_type)) return { error: `"token_type" must be one of: ${TOKEN_TYPES.join(', ')}.` };
  if (typeof body.issuer !== 'string' || body.issuer === '') return { error: '"issuer" must be a non-empty string.' };
  let audience: string | string[];
  if (typeof body.audience === 'string' && body.audience !== '') audience = body.audience;
  else if (Array.isArray(body.audience) && body.audience.length > 0 && body.audience.every((a: unknown) => typeof a === 'string' && a !== '')) audience = body.audience as string[];
  else return { error: '"audience" must be a non-empty string or array of non-empty strings.' };

  let subjectType = 'user';
  if (body.subject_type !== undefined) {
    if (!SUBJECT_TYPES.includes(body.subject_type)) return { error: `"subject_type" must be one of: ${SUBJECT_TYPES.join(', ')}.` };
    subjectType = body.subject_type;
  }
  let scopes: string[] = [];
  if (body.scopes !== undefined) {
    if (!Array.isArray(body.scopes) || !body.scopes.every((s: unknown) => typeof s === 'string' && s !== '')) return { error: '"scopes" must be an array of non-empty strings.' };
    scopes = body.scopes as string[];
  }
  let ttl = DEFAULT_TTL[body.token_type];
  if (body.ttl_seconds !== undefined) {
    if (typeof body.ttl_seconds !== 'number' || !Number.isInteger(body.ttl_seconds) || body.ttl_seconds < 1 || body.ttl_seconds > 31536000) return { error: '"ttl_seconds" must be an integer in [1, 31536000].' };
    ttl = body.ttl_seconds;
  }
  let algorithm: string | null = null;
  if (body.algorithm !== undefined) {
    if (!KNOWN_ALGS.includes(body.algorithm)) return { error: `"algorithm" must be one of: ${KNOWN_ALGS.join(', ')}.` };
    algorithm = body.algorithm;
  }
  return { profile: { tokenType: body.token_type, issuer: body.issuer, audience, subjectType, scopes, ttl, algorithm } };
}

const CHAIN_TO = [
  { api: 'jwt-claim-policy-validator', reason: 'Validate real tokens against the claim policy this design implies.' },
  { api: 'jwt-decoder', reason: 'Decode and inspect an issued token built from this design.' },
];
const INVALIDATORS = [
  'This generates a recommended claim DESIGN from the supplied profile; it does not mint, sign, decode, or validate tokens, and example_payload uses placeholder values + a fixed reference iat.',
  'Recommendations follow JWT/OAuth/OIDC best practice (RFC 7519 / RFC 9068 / OIDC Core) but are general guidance — your IdP, framework, or threat model may require different claims.',
  'TTLs are sensible defaults per token type (access 900s, id 3600s, refresh 2592000s) overridable via ttl_seconds; tune to your risk tolerance.',
];

const TAIL = (r: DesignCore) => ({
  confidence_score: 0.85, confidence_per_section: { claims: 1, recommendations: 0.8 },
  recommended_actions_priority_order: [
    `Issue ${r.token_type} tokens with the ${r.registered_claims.filter((c) => c.include).length} registered + ${r.custom_claims.length} custom claim(s) shown; TTL ${r.recommended_ttl_seconds}s.`,
    `Sign with ${r.algorithm.recommended.join(' or ')}; ${r.algorithm.provided ? `provided alg = ${r.algorithm.provided}.` : 'avoid HS256 across services and never accept alg:none.'}`,
    'Validate iss/aud/exp/nbf on every verifier and keep sensitive data out of claims.',
  ],
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'JWT Claims Designer API', version: '1.0.0',
    description: 'Deterministic JWT claims designer. From a token profile (type/issuer/audience/scopes/TTL/alg) it generates a recommended registered + custom claim set, TTLs, an example payload, signing-algorithm advice, and security recommendations. Generates a design — does not decode or validate. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/jwt-claims-designer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/design', summary: 'Design a recommended JWT claim set', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL design + reasoning', price_usdc: 0.014 },
    ],
    pricing: [
      { path: '/design', price_usdc: 0.008, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/design', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = design(p.profile);
  respond(res, t0, { ...r, ...TAIL(r) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = design(p.profile);
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Designed a ${r.token_type}-token claim set for a ${r.subject_type} subject: ${r.registered_claims.filter((c) => c.include).length} registered + ${r.custom_claims.length} custom claim(s), TTL ${r.recommended_ttl_seconds}s.`,
      key_factors: [
        `Registered claims: ${r.registered_claims.filter((c) => c.include).map((c) => c.claim).join(', ')}.`,
        `Custom claims: ${r.custom_claims.map((c) => c.claim).join(', ') || 'none'}.`,
        `Algorithm advice: prefer ${r.algorithm.recommended.join('/')}${r.algorithm.provided ? ` (provided ${r.algorithm.provided})` : ''}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(r),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, CellValue } from '../../_aplus/specparts';
import { designExample, lookupExample } from './examples';

const TOKEN_ENUM = ['access', 'id', 'refresh'];
const SUBJECT_ENUM = ['user', 'service'];
const ALG_ENUM = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512'];

const RegisteredClaim = {
  type: 'object', required: ['claim', 'include', 'required', 'value_or_format', 'rationale'], additionalProperties: false,
  properties: {
    claim: { type: 'string' }, include: { type: 'boolean' }, required: { type: 'boolean' },
    value_or_format: { type: 'string' }, rationale: { type: 'string' },
  },
};
const CustomClaim = {
  type: 'object', required: ['claim', 'value_or_format', 'rationale'], additionalProperties: false,
  properties: { claim: { type: 'string' }, value_or_format: { type: 'string' }, rationale: { type: 'string' } },
};
const AlgorithmAdvice = {
  type: 'object', required: ['provided', 'recommended', 'avoid', 'note'], additionalProperties: false,
  properties: {
    provided: { type: ['string', 'null'] },
    recommended: { type: 'array', items: { type: 'string' } },
    avoid: { type: 'array', items: { type: 'string' } },
    note: { type: 'string' },
  },
};
const DesignCore = {
  type: 'object', required: ['token_type', 'subject_type', 'recommended_ttl_seconds', 'registered_claims', 'custom_claims', 'example_payload', 'algorithm', 'security_recommendations', 'anti_patterns'],
  properties: {
    token_type: { type: 'string', enum: TOKEN_ENUM },
    subject_type: { type: 'string', enum: SUBJECT_ENUM },
    recommended_ttl_seconds: { type: 'integer', minimum: 1 },
    registered_claims: { type: 'array', items: RegisteredClaim },
    custom_claims: { type: 'array', items: CustomClaim },
    example_payload: { type: 'object', additionalProperties: CellValue, description: 'A concrete example claims object with placeholder values.' },
    algorithm: AlgorithmAdvice,
    security_recommendations: { type: 'array', items: { type: 'string' } },
    anti_patterns: { type: 'array', items: { type: 'string' } },
  },
};
const DesignRequest = {
  type: 'object', required: ['token_type', 'issuer', 'audience'], additionalProperties: false,
  properties: {
    token_type: { type: 'string', enum: TOKEN_ENUM },
    issuer: { type: 'string', description: 'The "iss" value.' },
    audience: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], description: 'The "aud" value (string or array).' },
    subject_type: { type: 'string', enum: SUBJECT_ENUM, description: 'Whether the subject is a user or a service (default user).' },
    scopes: { type: 'array', items: { type: 'string' }, description: 'Scopes to embed (access tokens).' },
    ttl_seconds: { type: 'integer', minimum: 1, maximum: 31536000, description: 'Override the default TTL for this token type.' },
    algorithm: { type: 'string', enum: ALG_ENUM, description: 'Intended signing algorithm (triggers tailored advice).' },
  },
};

const designReq = {
  token_type: 'access', issuer: 'https://auth.example.com', audience: ['https://api.example.com'],
  subject_type: 'user', scopes: ['read:orders', 'write:orders'], ttl_seconds: 900, algorithm: 'HS256',
};

const disc = {
  name: 'JWT Claims Designer API', version: '1.0.0',
  description: 'Deterministic JWT claims designer. From a token profile (type/issuer/audience/scopes/TTL/alg) it generates a recommended registered + custom claim set, TTLs, an example payload, signing-algorithm advice, and security recommendations. Generates a design — does not decode or validate. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/jwt-claims-designer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/design', summary: 'Design a recommended JWT claim set', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL design + reasoning', price_usdc: 0.014 },
  ],
  pricing: [
    { path: '/design', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('claims', 'recommendations'), _Tail: Tail,
  RegisteredClaim, CustomClaim, AlgorithmAdvice, DesignCore, DesignRequest, DiscoveryResponse: discoverySchema(),
  DesignResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DesignCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DesignCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/design', summary: 'Design a recommended JWT claim set', operationId: 'design', priceUsdc: 0.008, requestSchemaRef: 'DesignRequest', responseSchemaRef: 'DesignResponse', requestExample: designReq, responseExample: designExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL design + reasoning', operationId: 'lookup', priceUsdc: 0.014, oneCall: true, requestSchemaRef: 'DesignRequest', responseSchemaRef: 'LookupResponse', requestExample: designReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'jwt-claims-designer', title: 'JWT Claims Designer API', version: '1.0.0',
  description: 'Deterministic JWT claims designer — token profile → recommended registered+custom claims, TTLs, example payload, signing-alg advice, security recs. Generates a design (not decode/validate). No LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (GET /jwt-claims-designer/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "JWT Claims Designer API",
    "version": "1.0.0",
    "description": "Deterministic JWT claims designer — token profile → recommended registered+custom claims, TTLs, example payload, signing-alg advice, security recs. Generates a design (not decode/validate). No LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-security-tool": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/jwt-claims-designer"
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
                  "name": "JWT Claims Designer API",
                  "version": "1.0.0",
                  "description": "Deterministic JWT claims designer. From a token profile (type/issuer/audience/scopes/TTL/alg) it generates a recommended registered + custom claim set, TTLs, an example payload, signing-algorithm advice, and security recommendations. Generates a design — does not decode or validate. No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/jwt-claims-designer/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/design",
                      "summary": "Design a recommended JWT claim set",
                      "price_usdc": 0.008
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL design + reasoning",
                      "price_usdc": 0.014
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/design",
                      "price_usdc": 0.008,
                      "currency": "USDC"
                    },
                    {
                      "path": "/lookup",
                      "price_usdc": 0.014,
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
    "/design": {
      "post": {
        "operationId": "design",
        "summary": "Design a recommended JWT claim set",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DesignResponse"
                },
                "example": {
                  "trace_id": "jcd-1780000000000",
                  "request_id": "jcd-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "token_type": "access",
                  "subject_type": "user",
                  "recommended_ttl_seconds": 900,
                  "registered_claims": [
                    {
                      "claim": "iss",
                      "include": true,
                      "required": true,
                      "value_or_format": "https://auth.example.com",
                      "rationale": "Identifies the issuer; verifiers must check it."
                    },
                    {
                      "claim": "sub",
                      "include": true,
                      "required": true,
                      "value_or_format": "user-123 (stable, non-reassignable user id)",
                      "rationale": "Principal the token is about; keep it stable and opaque."
                    },
                    {
                      "claim": "aud",
                      "include": true,
                      "required": true,
                      "value_or_format": "https://api.example.com",
                      "rationale": "Intended recipient(s); verifiers must reject tokens not meant for them."
                    },
                    {
                      "claim": "exp",
                      "include": true,
                      "required": true,
                      "value_or_format": "iat + 900s (UNIX seconds)",
                      "rationale": "Expiry; keep short for access tokens."
                    },
                    {
                      "claim": "iat",
                      "include": true,
                      "required": true,
                      "value_or_format": "issue time (UNIX seconds)",
                      "rationale": "Issue time; supports max-age and freshness checks."
                    },
                    {
                      "claim": "nbf",
                      "include": true,
                      "required": false,
                      "value_or_format": "= iat (UNIX seconds)",
                      "rationale": "Not-before; defend against early use / clock games."
                    },
                    {
                      "claim": "jti",
                      "include": true,
                      "required": false,
                      "value_or_format": "unique token id (UUID)",
                      "rationale": "Enables per-token revocation and replay detection."
                    }
                  ],
                  "custom_claims": [
                    {
                      "claim": "scope",
                      "value_or_format": "read:orders write:orders",
                      "rationale": "Least-privilege authorization the token grants."
                    },
                    {
                      "claim": "client_id",
                      "value_or_format": "client-abc",
                      "rationale": "OAuth client that requested the token."
                    }
                  ],
                  "example_payload": {
                    "iss": "https://auth.example.com",
                    "sub": "user-123",
                    "aud": [
                      "https://api.example.com"
                    ],
                    "iat": 1700000000,
                    "nbf": 1700000000,
                    "exp": 1700000900,
                    "jti": "5f3b2a1c-0d9e-4b8a-9c1f-2e7d6a4b3c2d",
                    "scope": "read:orders write:orders",
                    "client_id": "client-abc"
                  },
                  "algorithm": {
                    "provided": "HS256",
                    "recommended": [
                      "RS256",
                      "ES256"
                    ],
                    "avoid": [
                      "none",
                      "HS256 (across service boundaries)"
                    ],
                    "note": "HS* uses a shared secret — every verifier can also mint tokens. Prefer RS256/ES256 in distributed systems so verifiers hold only the public key."
                  },
                  "security_recommendations": [
                    "Keep access tokens short-lived (recommended 900s); use refresh tokens for longevity.",
                    "Always validate iss, aud, exp, and nbf on the verifier; allow ~60s clock-skew leeway.",
                    "Include jti to enable revocation and replay detection.",
                    "Never put passwords, secrets, full PII, or payment data in claims — a JWT is base64-encoded, not encrypted.",
                    "Scope tokens narrowly (least privilege via scope + aud)."
                  ],
                  "anti_patterns": [
                    "Long-lived or non-expiring access tokens.",
                    "Accepting alg:none or trusting the alg header from the client.",
                    "Embedding sensitive data (PII/secrets) in claims.",
                    "Skipping aud/iss validation, so a token for service A is accepted by service B."
                  ],
                  "confidence_score": 0.85,
                  "confidence_per_section": {
                    "claims": 1,
                    "recommendations": 0.8
                  },
                  "recommended_actions_priority_order": [
                    "Issue access tokens with the 7 registered + 2 custom claim(s) shown; TTL 900s.",
                    "Sign with RS256 or ES256; provided alg = HS256.",
                    "Validate iss/aud/exp/nbf on every verifier and keep sensitive data out of claims."
                  ],
                  "chain_to": [
                    {
                      "api": "jwt-claim-policy-validator",
                      "reason": "Validate real tokens against the claim policy this design implies."
                    },
                    {
                      "api": "jwt-decoder",
                      "reason": "Decode and inspect an issued token built from this design."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true
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
                "$ref": "#/components/schemas/DesignRequest"
              },
              "example": {
                "token_type": "access",
                "issuer": "https://auth.example.com",
                "audience": [
                  "https://api.example.com"
                ],
                "subject_type": "user",
                "scopes": [
                  "read:orders",
                  "write:orders"
                ],
                "ttl_seconds": 900,
                "algorithm": "HS256"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.008,
          "currency": "USDC"
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "ONE-CALL design + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "jcd-1780000000000",
                  "request_id": "jcd-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "token_type": "access",
                  "subject_type": "user",
                  "recommended_ttl_seconds": 900,
                  "registered_claims": [
                    {
                      "claim": "iss",
                      "include": true,
                      "required": true,
                      "value_or_format": "https://auth.example.com",
                      "rationale": "Identifies the issuer; verifiers must check it."
                    },
                    {
                      "claim": "sub",
                      "include": true,
                      "required": true,
                      "value_or_format": "user-123 (stable, non-reassignable user id)",
                      "rationale": "Principal the token is about; keep it stable and opaque."
                    },
                    {
                      "claim": "aud",
                      "include": true,
                      "required": true,
                      "value_or_format": "https://api.example.com",
                      "rationale": "Intended recipient(s); verifiers must reject tokens not meant for them."
                    },
                    {
                      "claim": "exp",
                      "include": true,
                      "required": true,
                      "value_or_format": "iat + 900s (UNIX seconds)",
                      "rationale": "Expiry; keep short for access tokens."
                    },
                    {
                      "claim": "iat",
                      "include": true,
                      "required": true,
                      "value_or_format": "issue time (UNIX seconds)",
                      "rationale": "Issue time; supports max-age and freshness checks."
                    },
                    {
                      "claim": "nbf",
                      "include": true,
                      "required": false,
                      "value_or_format": "= iat (UNIX seconds)",
                      "rationale": "Not-before; defend against early use / clock games."
                    },
                    {
                      "claim": "jti",
                      "include": true,
                      "required": false,
                      "value_or_format": "unique token id (UUID)",
                      "rationale": "Enables per-token revocation and replay detection."
                    }
                  ],
                  "custom_claims": [
                    {
                      "claim": "scope",
                      "value_or_format": "read:orders write:orders",
                      "rationale": "Least-privilege authorization the token grants."
                    },
                    {
                      "claim": "client_id",
                      "value_or_format": "client-abc",
                      "rationale": "OAuth client that requested the token."
                    }
                  ],
                  "example_payload": {
                    "iss": "https://auth.example.com",
                    "sub": "user-123",
                    "aud": [
                      "https://api.example.com"
                    ],
                    "iat": 1700000000,
                    "nbf": 1700000000,
                    "exp": 1700000900,
                    "jti": "5f3b2a1c-0d9e-4b8a-9c1f-2e7d6a4b3c2d",
                    "scope": "read:orders write:orders",
                    "client_id": "client-abc"
                  },
                  "algorithm": {
                    "provided": "HS256",
                    "recommended": [
                      "RS256",
                      "ES256"
                    ],
                    "avoid": [
                      "none",
                      "HS256 (across service boundaries)"
                    ],
                    "note": "HS* uses a shared secret — every verifier can also mint tokens. Prefer RS256/ES256 in distributed systems so verifiers hold only the public key."
                  },
                  "security_recommendations": [
                    "Keep access tokens short-lived (recommended 900s); use refresh tokens for longevity.",
                    "Always validate iss, aud, exp, and nbf on the verifier; allow ~60s clock-skew leeway.",
                    "Include jti to enable revocation and replay detection.",
                    "Never put passwords, secrets, full PII, or payment data in claims — a JWT is base64-encoded, not encrypted.",
                    "Scope tokens narrowly (least privilege via scope + aud)."
                  ],
                  "anti_patterns": [
                    "Long-lived or non-expiring access tokens.",
                    "Accepting alg:none or trusting the alg header from the client.",
                    "Embedding sensitive data (PII/secrets) in claims.",
                    "Skipping aud/iss validation, so a token for service A is accepted by service B."
                  ],
                  "reasoning": {
                    "why_result_generated": "Designed a access-token claim set for a user subject: 7 registered + 2 custom claim(s), TTL 900s.",
                    "key_factors": [
                      "Registered claims: iss, sub, aud, exp, iat, nbf, jti.",
                      "Custom claims: scope, client_id.",
                      "Algorithm advice: prefer RS256/ES256 (provided HS256)."
                    ],
                    "invalidators": [
                      "This generates a recommended claim DESIGN from the supplied profile; it does not mint, sign, decode, or validate tokens, and example_payload uses placeholder values + a fixed reference iat.",
                      "Recommendations follow JWT/OAuth/OIDC best practice (RFC 7519 / RFC 9068 / OIDC Core) but are general guidance — your IdP, framework, or threat model may require different claims.",
                      "TTLs are sensible defaults per token type (access 900s, id 3600s, refresh 2592000s) overridable via ttl_seconds; tune to your risk tolerance."
                    ]
                  },
                  "confidence_score": 0.85,
                  "confidence_per_section": {
                    "claims": 1,
                    "recommendations": 0.8
                  },
                  "recommended_actions_priority_order": [
                    "Issue access tokens with the 7 registered + 2 custom claim(s) shown; TTL 900s.",
                    "Sign with RS256 or ES256; provided alg = HS256.",
                    "Validate iss/aud/exp/nbf on every verifier and keep sensitive data out of claims."
                  ],
                  "chain_to": [
                    {
                      "api": "jwt-claim-policy-validator",
                      "reason": "Validate real tokens against the claim policy this design implies."
                    },
                    {
                      "api": "jwt-decoder",
                      "reason": "Decode and inspect an issued token built from this design."
                    }
                  ],
                  "privacy": {
                    "data_stored": false,
                    "retention": "none"
                  },
                  "execution_metadata": {
                    "model": "deterministic",
                    "automation_safe": true
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
                "$ref": "#/components/schemas/DesignRequest"
              },
              "example": {
                "token_type": "access",
                "issuer": "https://auth.example.com",
                "audience": [
                  "https://api.example.com"
                ],
                "subject_type": "user",
                "scopes": [
                  "read:orders",
                  "write:orders"
                ],
                "ttl_seconds": 900,
                "algorithm": "HS256"
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.014,
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
          "latency_ms"
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
          "automation_safe"
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
          }
        }
      },
      "ConfidencePerSection": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "claims": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "recommendations": {
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
      "RegisteredClaim": {
        "type": "object",
        "required": [
          "claim",
          "include",
          "required",
          "value_or_format",
          "rationale"
        ],
        "additionalProperties": false,
        "properties": {
          "claim": {
            "type": "string"
          },
          "include": {
            "type": "boolean"
          },
          "required": {
            "type": "boolean"
          },
          "value_or_format": {
            "type": "string"
          },
          "rationale": {
            "type": "string"
          }
        }
      },
      "CustomClaim": {
        "type": "object",
        "required": [
          "claim",
          "value_or_format",
          "rationale"
        ],
        "additionalProperties": false,
        "properties": {
          "claim": {
            "type": "string"
          },
          "value_or_format": {
            "type": "string"
          },
          "rationale": {
            "type": "string"
          }
        }
      },
      "AlgorithmAdvice": {
        "type": "object",
        "required": [
          "provided",
          "recommended",
          "avoid",
          "note"
        ],
        "additionalProperties": false,
        "properties": {
          "provided": {
            "type": [
              "string",
              "null"
            ]
          },
          "recommended": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "avoid": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "note": {
            "type": "string"
          }
        }
      },
      "DesignCore": {
        "type": "object",
        "required": [
          "token_type",
          "subject_type",
          "recommended_ttl_seconds",
          "registered_claims",
          "custom_claims",
          "example_payload",
          "algorithm",
          "security_recommendations",
          "anti_patterns"
        ],
        "properties": {
          "token_type": {
            "type": "string",
            "enum": [
              "access",
              "id",
              "refresh"
            ]
          },
          "subject_type": {
            "type": "string",
            "enum": [
              "user",
              "service"
            ]
          },
          "recommended_ttl_seconds": {
            "type": "integer",
            "minimum": 1
          },
          "registered_claims": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "claim",
                "include",
                "required",
                "value_or_format",
                "rationale"
              ],
              "additionalProperties": false,
              "properties": {
                "claim": {
                  "type": "string"
                },
                "include": {
                  "type": "boolean"
                },
                "required": {
                  "type": "boolean"
                },
                "value_or_format": {
                  "type": "string"
                },
                "rationale": {
                  "type": "string"
                }
              }
            }
          },
          "custom_claims": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "claim",
                "value_or_format",
                "rationale"
              ],
              "additionalProperties": false,
              "properties": {
                "claim": {
                  "type": "string"
                },
                "value_or_format": {
                  "type": "string"
                },
                "rationale": {
                  "type": "string"
                }
              }
            }
          },
          "example_payload": {
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
            },
            "description": "A concrete example claims object with placeholder values."
          },
          "algorithm": {
            "type": "object",
            "required": [
              "provided",
              "recommended",
              "avoid",
              "note"
            ],
            "additionalProperties": false,
            "properties": {
              "provided": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "recommended": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "avoid": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "note": {
                "type": "string"
              }
            }
          },
          "security_recommendations": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "anti_patterns": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "DesignRequest": {
        "type": "object",
        "required": [
          "token_type",
          "issuer",
          "audience"
        ],
        "additionalProperties": false,
        "properties": {
          "token_type": {
            "type": "string",
            "enum": [
              "access",
              "id",
              "refresh"
            ]
          },
          "issuer": {
            "type": "string",
            "description": "The \"iss\" value."
          },
          "audience": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            ],
            "description": "The \"aud\" value (string or array)."
          },
          "subject_type": {
            "type": "string",
            "enum": [
              "user",
              "service"
            ],
            "description": "Whether the subject is a user or a service (default user)."
          },
          "scopes": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Scopes to embed (access tokens)."
          },
          "ttl_seconds": {
            "type": "integer",
            "minimum": 1,
            "maximum": 31536000,
            "description": "Override the default TTL for this token type."
          },
          "algorithm": {
            "type": "string",
            "enum": [
              "HS256",
              "HS384",
              "HS512",
              "RS256",
              "RS384",
              "RS512",
              "ES256",
              "ES384",
              "ES512",
              "PS256",
              "PS384",
              "PS512"
            ],
            "description": "Intended signing algorithm (triggers tailored advice)."
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
          "x402_compatible"
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
          }
        }
      },
      "DesignResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/DesignCore"
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
            "$ref": "#/components/schemas/DesignCore"
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

## Live example responses
### POST /design (access token, HS256 → shared-secret warning)
Request:
```json
{
  "token_type": "access",
  "issuer": "https://auth.example.com",
  "audience": [
    "https://api.example.com"
  ],
  "scopes": [
    "read:orders",
    "write:orders"
  ],
  "ttl_seconds": 900,
  "algorithm": "HS256"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "bbvvglfe-1781576000981",
  "request_id": "bbvvglfe-1781576000981",
  "computed_at": "2026-06-16T02:13:20.981Z",
  "success": true,
  "latency_ms": 0,
  "token_type": "access",
  "subject_type": "user",
  "recommended_ttl_seconds": 900,
  "registered_claims": [
    {
      "claim": "iss",
      "include": true,
      "required": true,
      "value_or_format": "https://auth.example.com",
      "rationale": "Identifies the issuer; verifiers must check it."
    },
    {
      "claim": "sub",
      "include": true,
      "required": true,
      "value_or_format": "user-123 (stable, non-reassignable user id)",
      "rationale": "Principal the token is about; keep it stable and opaque."
    },
    {
      "claim": "aud",
      "include": true,
      "required": true,
      "value_or_format": "https://api.example.com",
      "rationale": "Intended recipient(s); verifiers must reject tokens not meant for them."
    },
    {
      "claim": "exp",
      "include": true,
      "required": true,
      "value_or_format": "iat + 900s (UNIX seconds)",
      "rationale": "Expiry; keep short for access tokens."
    },
    {
      "claim": "iat",
      "include": true,
      "required": true,
      "value_or_format": "issue time (UNIX seconds)",
      "rationale": "Issue time; supports max-age and freshness checks."
    },
    {
      "claim": "nbf",
      "include": true,
      "required": false,
      "value_or_format": "= iat (UNIX seconds)",
      "rationale": "Not-before; defend against early use / clock games."
    },
    {
      "claim": "jti",
      "include": true,
      "required": false,
      "value_or_format": "unique token id (UUID)",
      "rationale": "Enables per-token revocation and replay detection."
    }
  ],
  "custom_claims": [
    {
      "claim": "scope",
      "value_or_format": "read:orders write:orders",
      "rationale": "Least-privilege authorization the token grants."
    },
    {
      "claim": "client_id",
      "value_or_format": "client-abc",
      "rationale": "OAuth client that requested the token."
    }
  ],
  "example_payload": {
    "iss": "https://auth.example.com",
    "sub": "user-123",
    "aud": [
      "https://api.example.com"
    ],
    "iat": 1700000000,
    "nbf": 1700000000,
    "exp": 1700000900,
    "jti": "5f3b2a1c-0d9e-4b8a-9c1f-2e7d6a4b3c2d",
    "scope": "read:orders write:orders",
    "client_id": "client-abc"
  },
  "algorithm": {
    "provided": "HS256",
    "recommended": [
      "RS256",
      "ES256"
    ],
    "avoid": [
      "none",
      "HS256 (across service boundaries)"
    ],
    "note": "HS* uses a shared secret — every verifier can also mint tokens. Prefer RS256/ES256 in distributed systems so verifiers hold only the public key."
  },
  "security_recommendations": [
    "Keep access tokens short-lived (recommended 900s); use refresh tokens for longevity.",
    "Always validate iss, aud, exp, and nbf on the verifier; allow ~60s clock-skew leeway.",
    "Include jti to enable revocation and replay detection.",
    "Never put passwords, secrets, full PII, or payment data in claims — a JWT is base64-encoded, not encrypted.",
    "Scope tokens narrowly (least privilege via scope + aud)."
  ],
  "anti_patterns": [
    "Long-lived or non-expiring access tokens.",
    "Accepting alg:none or trusting the alg header from the client.",
    "Embedding sensitive data (PII/secrets) in claims.",
    "Skipping aud/iss validation, so a token for service A is accepted by service B."
  ],
  "confidence_score": 0.85,
  "confidence_per_section": {
    "claims": 1,
    "recommendations": 0.8
  },
  "recommended_actions_priority_order": [
    "Issue access tokens with the 7 registered + 2 custom claim(s) shown; TTL 900s.",
    "Sign with RS256 or ES256; provided alg = HS256.",
    "Validate iss/aud/exp/nbf on every verifier and keep sensitive data out of claims."
  ],
  "chain_to": [
    {
      "api": "jwt-claim-policy-validator",
      "reason": "Validate real tokens against the claim policy this design implies."
    },
    {
      "api": "jwt-decoder",
      "reason": "Decode and inspect an issued token built from this design."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /design (refresh token → jti required, minimal claims)
Request:
```json
{
  "token_type": "refresh",
  "issuer": "https://auth.example.com",
  "audience": "https://auth.example.com",
  "subject_type": "service"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "sxgfkl4q-1781576000983",
  "request_id": "sxgfkl4q-1781576000983",
  "computed_at": "2026-06-16T02:13:20.983Z",
  "success": true,
  "latency_ms": 1,
  "token_type": "refresh",
  "subject_type": "service",
  "recommended_ttl_seconds": 2592000,
  "registered_claims": [
    {
      "claim": "iss",
      "include": true,
      "required": true,
      "value_or_format": "https://auth.example.com",
      "rationale": "Identifies the issuer; verifiers must check it."
    },
    {
      "claim": "sub",
      "include": true,
      "required": true,
      "value_or_format": "svc-client-abc (the service/client identifier)",
      "rationale": "Principal the token is about; keep it stable and opaque."
    },
    {
      "claim": "aud",
      "include": true,
      "required": true,
      "value_or_format": "https://auth.example.com",
      "rationale": "Intended recipient(s); verifiers must reject tokens not meant for them."
    },
    {
      "claim": "exp",
      "include": true,
      "required": true,
      "value_or_format": "iat + 2592000s (UNIX seconds)",
      "rationale": "Expiry; keep short for access tokens."
    },
    {
      "claim": "iat",
      "include": true,
      "required": true,
      "value_or_format": "issue time (UNIX seconds)",
      "rationale": "Issue time; supports max-age and freshness checks."
    },
    {
      "claim": "nbf",
      "include": true,
      "required": false,
      "value_or_format": "= iat (UNIX seconds)",
      "rationale": "Not-before; defend against early use / clock games."
    },
    {
      "claim": "jti",
      "include": true,
      "required": true,
      "value_or_format": "unique token id (UUID)",
      "rationale": "Required to support refresh-token revocation/rotation."
    }
  ],
  "custom_claims": [
    {
      "claim": "client_id",
      "value_or_format": "client-abc",
      "rationale": "Binds the refresh token to its client."
    }
  ],
  "example_payload": {
    "iss": "https://auth.example.com",
    "sub": "svc-client-abc",
    "aud": "https://auth.example.com",
    "iat": 1700000000,
    "nbf": 1700000000,
    "exp": 1702592000,
    "jti": "5f3b2a1c-0d9e-4b8a-9c1f-2e7d6a4b3c2d",
    "client_id": "client-abc"
  },
  "algorithm": {
    "provided": null,
    "recommended": [
      "RS256",
      "ES256"
    ],
    "avoid": [
      "none",
      "HS256 (across service boundaries)"
    ],
    "note": "Asymmetric signing (RS256/ES256) lets verifiers validate with a public key while only the issuer can sign. Never accept alg:none or let clients choose the alg."
  },
  "security_recommendations": [
    "Keep refresh tokens short-lived (recommended 2592000s).",
    "Always validate iss, aud, exp, and nbf on the verifier; allow ~60s clock-skew leeway.",
    "Track jti and rotate refresh tokens; maintain a revocation list.",
    "Never put passwords, secrets, full PII, or payment data in claims — a JWT is base64-encoded, not encrypted.",
    "Scope tokens narrowly (least privilege via scope + aud)."
  ],
  "anti_patterns": [
    "Long-lived or non-expiring access tokens.",
    "Accepting alg:none or trusting the alg header from the client.",
    "Embedding sensitive data (PII/secrets) in claims.",
    "Skipping aud/iss validation, so a token for service A is accepted by service B."
  ],
  "confidence_score": 0.85,
  "confidence_per_section": {
    "claims": 1,
    "recommendations": 0.8
  },
  "recommended_actions_priority_order": [
    "Issue refresh tokens with the 7 registered + 1 custom claim(s) shown; TTL 2592000s.",
    "Sign with RS256 or ES256; avoid HS256 across services and never accept alg:none.",
    "Validate iss/aud/exp/nbf on every verifier and keep sensitive data out of claims."
  ],
  "chain_to": [
    {
      "api": "jwt-claim-policy-validator",
      "reason": "Validate real tokens against the claim policy this design implies."
    },
    {
      "api": "jwt-decoder",
      "reason": "Decode and inspect an issued token built from this design."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /lookup (id token + reasoning)
Request:
```json
{
  "token_type": "id",
  "issuer": "https://auth.example.com",
  "audience": [
    "client-1",
    "client-2"
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "nrg9a2th-1781576000991",
  "request_id": "nrg9a2th-1781576000991",
  "computed_at": "2026-06-16T02:13:20.991Z",
  "success": true,
  "latency_ms": 1,
  "token_type": "id",
  "subject_type": "user",
  "recommended_ttl_seconds": 3600,
  "registered_claims": [
    {
      "claim": "iss",
      "include": true,
      "required": true,
      "value_or_format": "https://auth.example.com",
      "rationale": "Identifies the issuer; verifiers must check it."
    },
    {
      "claim": "sub",
      "include": true,
      "required": true,
      "value_or_format": "user-123 (stable, non-reassignable user id)",
      "rationale": "Principal the token is about; keep it stable and opaque."
    },
    {
      "claim": "aud",
      "include": true,
      "required": true,
      "value_or_format": "client-1, client-2",
      "rationale": "Intended recipient(s); verifiers must reject tokens not meant for them."
    },
    {
      "claim": "exp",
      "include": true,
      "required": true,
      "value_or_format": "iat + 3600s (UNIX seconds)",
      "rationale": "Expiry; keep short for access tokens."
    },
    {
      "claim": "iat",
      "include": true,
      "required": true,
      "value_or_format": "issue time (UNIX seconds)",
      "rationale": "Issue time; supports max-age and freshness checks."
    },
    {
      "claim": "nbf",
      "include": true,
      "required": false,
      "value_or_format": "= iat (UNIX seconds)",
      "rationale": "Not-before; defend against early use / clock games."
    },
    {
      "claim": "jti",
      "include": false,
      "required": false,
      "value_or_format": "unique token id (UUID)",
      "rationale": "Enables per-token revocation and replay detection."
    }
  ],
  "custom_claims": [
    {
      "claim": "auth_time",
      "value_or_format": "UNIX seconds of authentication",
      "rationale": "When the end-user authenticated (OIDC)."
    },
    {
      "claim": "nonce",
      "value_or_format": "echo of the request nonce",
      "rationale": "Binds the ID token to the auth request; mitigates replay."
    },
    {
      "claim": "azp",
      "value_or_format": "authorized party (client_id)",
      "rationale": "Required by OIDC when there are multiple audiences."
    }
  ],
  "example_payload": {
    "iss": "https://auth.example.com",
    "sub": "user-123",
    "aud": [
      "client-1",
      "client-2"
    ],
    "iat": 1700000000,
    "nbf": 1700000000,
    "exp": 1700003600,
    "auth_time": 1700000000,
    "nonce": "n-0S6_WzA2Mj",
    "azp": "client-abc"
  },
  "algorithm": {
    "provided": null,
    "recommended": [
      "RS256",
      "ES256"
    ],
    "avoid": [
      "none",
      "HS256 (across service boundaries)"
    ],
    "note": "Asymmetric signing (RS256/ES256) lets verifiers validate with a public key while only the issuer can sign. Never accept alg:none or let clients choose the alg."
  },
  "security_recommendations": [
    "Keep id tokens short-lived (recommended 3600s).",
    "Always validate iss, aud, exp, and nbf on the verifier; allow ~60s clock-skew leeway.",
    "Include jti to enable revocation and replay detection.",
    "Never put passwords, secrets, full PII, or payment data in claims — a JWT is base64-encoded, not encrypted.",
    "Scope tokens narrowly (least privilege via scope + aud)."
  ],
  "anti_patterns": [
    "Long-lived or non-expiring access tokens.",
    "Accepting alg:none or trusting the alg header from the client.",
    "Embedding sensitive data (PII/secrets) in claims.",
    "Skipping aud/iss validation, so a token for service A is accepted by service B."
  ],
  "reasoning": {
    "why_result_generated": "Designed a id-token claim set for a user subject: 6 registered + 3 custom claim(s), TTL 3600s.",
    "key_factors": [
      "Registered claims: iss, sub, aud, exp, iat, nbf.",
      "Custom claims: auth_time, nonce, azp.",
      "Algorithm advice: prefer RS256/ES256."
    ],
    "invalidators": [
      "This generates a recommended claim DESIGN from the supplied profile; it does not mint, sign, decode, or validate tokens, and example_payload uses placeholder values + a fixed reference iat.",
      "Recommendations follow JWT/OAuth/OIDC best practice (RFC 7519 / RFC 9068 / OIDC Core) but are general guidance — your IdP, framework, or threat model may require different claims.",
      "TTLs are sensible defaults per token type (access 900s, id 3600s, refresh 2592000s) overridable via ttl_seconds; tune to your risk tolerance."
    ]
  },
  "confidence_score": 0.85,
  "confidence_per_section": {
    "claims": 1,
    "recommendations": 0.8
  },
  "recommended_actions_priority_order": [
    "Issue id tokens with the 6 registered + 3 custom claim(s) shown; TTL 3600s.",
    "Sign with RS256 or ES256; avoid HS256 across services and never accept alg:none.",
    "Validate iss/aud/exp/nbf on every verifier and keep sensitive data out of claims."
  ],
  "chain_to": [
    {
      "api": "jwt-claim-policy-validator",
      "reason": "Validate real tokens against the claim policy this design implies."
    },
    {
      "api": "jwt-decoder",
      "reason": "Decode and inspect an issued token built from this design."
    }
  ],
  "privacy": {
    "data_stored": false,
    "retention": "none"
  },
  "execution_metadata": {
    "model": "deterministic",
    "automation_safe": true
  }
}
```

### POST /design (error: missing audience)
Request:
```json
{
  "token_type": "access",
  "issuer": "https://auth.example.com"
}
```
Response (HTTP 400):
```json
{
  "trace_id": "vnuxo1y8-1781576000994",
  "request_id": "vnuxo1y8-1781576000994",
  "computed_at": "2026-06-16T02:13:20.994Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"audience\" must be a non-empty string or array of non-empty strings."
  }
}
```

