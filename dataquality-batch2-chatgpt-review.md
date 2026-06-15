# Data-Quality Batch 2 — ChatGPT Review Bundle v2 (Orbis A+ data-shaping tools)

Date: 2026-06-14 · PR #42 merged to main; review fixes on branch aplus/data-quality-batch2-review-fixes · tsc clean · smoke 30/30 green

## v2 — fixes applied since the first audit (please confirm each landed)
1. **Normalizer — coercion visibility.** Added `total_cells_type_changed` (and per-column `cells_type_changed`): the subset of changed cells whose JSON type changed via a coercion op (to_number/to_integer/to_boolean/to_date_iso). A recommended-action calls it out when >0.
2. **Mapper — target collisions surfaced.** Added `target_collisions[]` = `{ target, sources[], winner }` for any output field written by two or more mappings (last-write-wins is kept and documented; the winner is named). A recommended-action and invalidator explain it.
3. **Transformer — richer failure reasons.** Arithmetic ops now emit `failure_codes: { non_numeric_operand, divide_by_zero }` alongside the `failures` total, so a null result is no longer ambiguous.
4. **Aggregator — explicit typed group rows.** Group output now uses a dedicated, documented `GroupRow` schema (typed cell-map: group-key columns + numeric/null aggregation results), not the generic input row schema.
5. **Classification — optional column-name hint.** Detection stays value-first; when value matching is below the 80% threshold but the column NAME hints a type AND >=50% of values still corroborate, the column is labeled with `column_name_hint_used: true` (top-level `name_hint_used_count`). Classification confidence drops to 0.7 when any hint is used. Disable with `use_column_name_hints: false`. Honesty-preserving: a name never fabricates a type the values contradict.

5 deterministic data-shaping APIs that transform a posted dataset (array of row objects) and return the reshaped rows plus per-operation stats. No external data, no storage, **no LLM call anywhere** — built on the shared `src/routes/_aplus/` scaffold plus the `dataset.ts` helper (column typing, null/empty detection, numeric coercion, quantiles).

- **data-normalizer** — applies an ordered list of canonicalization ops per column (whitespace, case, unicode NFC/NFKC, accent-strip, punctuation, number/boolean/date coercion); returns normalized rows + per-column cells-changed counts.
- **data-mapper** — applies a field-mapping spec (rename + optional cast + default); returns remapped records + per-mapping applied/defaults/cast-failure stats; optional unmapped-column carry-through.
- **data-transformer** — applies a declarative row pipeline (concat, arithmetic, split, filter) with NO expression eval; returns transformed rows + per-operation effect summary.
- **data-aggregator** — groups by zero+ columns and computes count/count_distinct/sum/avg/min/max/median/percentile per group.
- **data-classification** — per column, infers a semantic type (email/phone/url/ipv4/uuid/credit_card/ssn/zip/date/datetime/currency/boolean/integer/number/json/free_text) + PII flag/category via regex + Luhn/IPv4 checksums over a value sample.

## This is the FIRST review of batch 2. Carry the lessons from the batch-1 audit:
- NO generic `{type:"object"}` schemas — dataset rows use the shared typed `rowSchema()` (scalar/null/array/object map).
- Confidence honesty: exact deterministic transforms report confidence 1; any heuristic (e.g. classification match-rate, type inference) must be <1 with explicit invalidators.
- Deterministic only, no LLM, nothing stored; examples must equal live output (drift-guarded by smoke).

## Please grade each API (A+/A/B/...) on:
1. **Correctness** of the deterministic transforms (normalization ops incl. unicode/accents/coercions; mapping rename+cast+default with cast-failure accounting; transformer concat/arithmetic/split/filter incl. divide-by-zero and missing-value handling; aggregator group-by + count/distinct/sum/avg/min/max/median/percentile incl. all-null columns; classifier semantic-type precedence, match-rate threshold, Luhn + IPv4 checksums, PII categorization).
2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata; reasoning block on /lookup).
3. **Honesty** (no fabrication; output computed only from the posted rows; nothing stored; classifier match-rate is a sample heuristic and framed as such; deterministic transforms claim confidence 1 only because they are exact).
4. **OpenAPI 3.1** schema rigor (allOf + unevaluatedProperties:false; typed 200/400/500; oneOf op/mapping/aggregation variants; x-pricing; requestExample replays cleanly == responseExample).
5. **Agent-usability** (clear field names, actionable recommended_actions, sensible chain_to targets — e.g. normalizer→mapper→transformer→aggregator, classifier→quality-rules/completeness from batch 1).
Flag any bug, statistical/transform error (division-by-zero, mis-coercion, off-by-one in counts, mis-inferred semantic type, percentile interpolation), input-size footgun (note the global JSON limit was raised 100kb→1mb for these), or schema/response drift.

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

## Shared dataset helper — `src/routes/_aplus/dataset.ts`
```ts
// Shared deterministic helpers for the Data-Quality / Pipeline A+ APIs. Every
// input is a dataset passed in the request body (an array of row objects) — no
// fetching, no storage. Pure functions only, no LLM.

export const MAX_ROWS = 20000;
export const MAX_COLS = 300;

export type Row = Record<string, unknown>;

/** Validate `rows`: a non-empty array of JSON objects, bounded in size. */
export function parseRows(v: unknown, field = 'rows'): { error: string } | { rows: Row[] } {
  if (!Array.isArray(v)) return { error: `"${field}" must be an array of row objects.` };
  if (v.length === 0) return { error: `"${field}" must contain at least one row.` };
  if (v.length > MAX_ROWS) return { error: `"${field}" exceeds the ${MAX_ROWS}-row limit (got ${v.length}).` };
  for (let i = 0; i < v.length; i++) {
    const r = v[i];
    if (r === null || typeof r !== 'object' || Array.isArray(r)) return { error: `"${field}"[${i}] must be a JSON object.` };
  }
  return { rows: v as Row[] };
}

/** Column list: an explicit string[] if supplied & valid, else the union of keys (first-seen order). */
export function columnsOf(rows: Row[], declared?: unknown): string[] {
  if (Array.isArray(declared) && declared.length > 0 && declared.every((c) => typeof c === 'string')) {
    return (declared as string[]).slice(0, MAX_COLS);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (!seen.has(k)) { seen.add(k); out.push(k); if (out.length >= MAX_COLS) return out; }
    }
  }
  return out;
}

/** A value counts as "missing" if null/undefined, or (optionally) an empty/whitespace string. */
export function isMissing(v: unknown, blankAsMissing = true): boolean {
  if (v === undefined || v === null) return true;
  if (blankAsMissing && typeof v === 'string' && v.trim() === '') return true;
  return false;
}

/** Finite number, or a numeric string, else null. */
export function asNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') { const n = Number(v); return Number.isFinite(n) ? n : null; }
  return null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}([T\s]\d{2}:\d{2}|$)/;

/** Infer a column's effective type from its non-missing values. */
export function inferType(values: unknown[]): 'empty' | 'boolean' | 'integer' | 'number' | 'date' | 'string' {
  if (values.length === 0) return 'empty';
  let allNum = true, allInt = true, allBool = true, allDate = true;
  for (const v of values) {
    const isBool = typeof v === 'boolean' || v === 'true' || v === 'false';
    if (!isBool) allBool = false;
    const n = asNum(v);
    if (n === null) { allNum = false; allInt = false; }
    else if (!Number.isInteger(n)) allInt = false;
    const isDate = typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));
    if (!isDate) allDate = false;
  }
  if (allBool) return 'boolean';
  if (allInt) return 'integer';
  if (allNum) return 'number';
  if (allDate) return 'date';
  return 'string';
}

/** Canonical string form of a value, for categorical counting / equality. */
export function asKey(v: unknown): string {
  if (v === undefined) return ' undefined';
  if (v === null) return ' null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }
export function stddev(xs: number[]): number { const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / xs.length); }

/** Linear-interpolated quantile of an already-sorted ascending array. */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

/** Population Stability Index over a numeric column using baseline quantile bin edges. */
export function psiNumeric(baseline: number[], current: number[], bins = 10): number {
  if (baseline.length === 0 || current.length === 0) return 0;
  const sortedB = [...baseline].sort((a, z) => a - z);
  const edges: number[] = [];
  for (let i = 1; i < bins; i++) edges.push(quantile(sortedB, i / bins));
  const uniq = Array.from(new Set(edges)).sort((a, z) => a - z);
  const binOf = (x: number) => { let i = 0; while (i < uniq.length && x > uniq[i]) i++; return i; };
  const nb = uniq.length + 1;
  const bc = new Array(nb).fill(0);
  const cc = new Array(nb).fill(0);
  for (const x of baseline) bc[binOf(x)]++;
  for (const x of current) cc[binOf(x)]++;
  let psi = 0;
  for (let i = 0; i < nb; i++) {
    const pb = bc[i] / baseline.length || 0;
    const pc = cc[i] / current.length || 0;
    const pbA = pb === 0 ? 0.0001 : pb;
    const pcA = pc === 0 ? 0.0001 : pc;
    psi += (pcA - pbA) * Math.log(pcA / pbA);
  }
  return psi;
}

/** Population Stability Index over categorical frequencies. */
export function psiCategorical(baseline: string[], current: string[]): number {
  if (baseline.length === 0 || current.length === 0) return 0;
  const cats = new Set([...baseline, ...current]);
  const cb = new Map<string, number>();
  const cc = new Map<string, number>();
  for (const v of baseline) cb.set(v, (cb.get(v) || 0) + 1);
  for (const v of current) cc.set(v, (cc.get(v) || 0) + 1);
  let psi = 0;
  for (const c of cats) {
    const pb = (cb.get(c) || 0) / baseline.length;
    const pc = (cc.get(c) || 0) / current.length;
    const pbA = pb === 0 ? 0.0001 : pb;
    const pcA = pc === 0 ? 0.0001 : pc;
    psi += (pcA - pbA) * Math.log(pcA / pbA);
  }
  return psi;
}

/** Standard PSI banding (industry convention, not a guarantee). */
export function driftLevel(psi: number): 'none' | 'minor' | 'major' {
  if (psi < 0.1) return 'none';
  if (psi < 0.25) return 'minor';
  return 'major';
}

/** Sample-size confidence in [0,1]: low for tiny n, saturating toward 1.
 *  Deterministic & monotonic (1 − 1/√n, capped 0.99): n=4→0.5, n=30→0.82,
 *  n=100→0.9, large n→0.99. Use for statistics whose reliability grows with
 *  sample size (e.g. PSI/drift) so we don't claim certainty on a handful of rows. */
export function sampleConfidence(n: number): number {
  if (n <= 0) return 0;
  return Math.min(0.99, Math.round((1 - 1 / Math.sqrt(n)) * 100) / 100);
}

/** Letter grade from a 0–100 score (shared banding). */
export function gradeOf(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  return score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F';
}
```

## Shared spec parts — `src/routes/_aplus/specparts.ts`
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

---

# data-normalizer

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { parseRows, asNum, isMissing, Row } from '../../_aplus/dataset';

// Deterministic data normalizer. Applies an ordered list of canonicalization
// operations (whitespace, case, unicode, number, boolean, date) per column to a
// posted dataset and returns the normalized rows plus per-column change counts.
// Pure string/number transforms, no LLM, nothing stored.

const router = Router();

const OPS = [
  'trim', 'collapse_whitespace', 'lowercase', 'uppercase', 'title_case',
  'strip_accents', 'nfc', 'nfkc', 'remove_punctuation', 'remove_non_numeric',
  'to_number', 'to_integer', 'to_boolean', 'to_date_iso',
] as const;
type Op = typeof OPS[number];

export interface ColumnNorm { column: string; operations: Op[]; cells_changed: number; cells_type_changed: number; }
export interface NormalizeCore {
  row_count: number;
  columns_normalized: number;
  total_cells_changed: number;
  total_cells_type_changed: number;
  per_column: ColumnNorm[];
  rows: Row[];
}

// JSON-type category of a cell value, used to flag coercions (e.g. string→number).
function jsType(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

const TRUE_SET = new Set(['true', '1', 'yes', 'y', 't']);
const FALSE_SET = new Set(['false', '0', 'no', 'n', 'f']);

function applyOp(v: unknown, op: Op): unknown {
  // Conversions operate on any non-missing value; string ops coerce to string.
  if (op === 'to_number') { const n = asNum(v); return n === null ? v : n; }
  if (op === 'to_integer') { const n = asNum(v); return n === null ? v : Math.trunc(n); }
  if (op === 'to_boolean') { const k = String(v).trim().toLowerCase(); return TRUE_SET.has(k) ? true : FALSE_SET.has(k) ? false : v; }
  if (op === 'to_date_iso') { const t = Date.parse(String(v)); return Number.isNaN(t) ? v : new Date(t).toISOString().slice(0, 10); }
  let s = String(v);
  switch (op) {
    case 'trim': s = s.trim(); break;
    case 'collapse_whitespace': s = s.replace(/\s+/g, ' ').trim(); break;
    case 'lowercase': s = s.toLowerCase(); break;
    case 'uppercase': s = s.toUpperCase(); break;
    case 'title_case': s = s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); break;
    case 'strip_accents': s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); break;
    case 'nfc': s = s.normalize('NFC'); break;
    case 'nfkc': s = s.normalize('NFKC'); break;
    case 'remove_punctuation': s = s.replace(/[!-/:-@[-`{-~]/g, ''); break;
    case 'remove_non_numeric': s = s.replace(/[^0-9.\-]/g, ''); break;
  }
  return s;
}

function normalize(body: any): { error: string } | { result: NormalizeCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "rows" and "rules".' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;
  if (!Array.isArray(body.rules) || body.rules.length === 0) return { error: '"rules" must be a non-empty array of { column, operations } objects.' };

  const rules: { column: string; operations: Op[] }[] = [];
  for (let i = 0; i < body.rules.length; i++) {
    const r = body.rules[i];
    if (r === null || typeof r !== 'object' || Array.isArray(r)) return { error: `rules[${i}] must be an object.` };
    if (typeof r.column !== 'string' || r.column === '') return { error: `rules[${i}].column must be a non-empty string.` };
    if (!Array.isArray(r.operations) || r.operations.length === 0) return { error: `rules[${i}].operations must be a non-empty array.` };
    for (const op of r.operations) if (!OPS.includes(op)) return { error: `rules[${i}] has unknown operation "${op}". Allowed: ${OPS.join(', ')}.` };
    rules.push({ column: r.column, operations: r.operations as Op[] });
  }

  const out: Row[] = p.rows.map((r) => ({ ...r }));
  const per_column: ColumnNorm[] = [];
  let totalChanged = 0;
  let totalTypeChanged = 0;
  for (const rule of rules) {
    let changed = 0;
    let typeChanged = 0;
    for (const row of out) {
      const orig = row[rule.column];
      if (isMissing(orig, false) && orig !== '') continue; // null/undefined pass through; '' is normalizable
      if (!(rule.column in row)) continue;
      let val: unknown = orig;
      for (const op of rule.operations) val = applyOp(val, op);
      if (JSON.stringify(val) !== JSON.stringify(orig)) {
        row[rule.column] = val; changed++;
        if (jsType(val) !== jsType(orig)) typeChanged++;
      }
    }
    totalChanged += changed;
    totalTypeChanged += typeChanged;
    per_column.push({ column: rule.column, operations: rule.operations, cells_changed: changed, cells_type_changed: typeChanged });
  }

  return {
    result: {
      row_count: out.length,
      columns_normalized: per_column.length,
      total_cells_changed: totalChanged,
      total_cells_type_changed: totalTypeChanged,
      per_column,
      rows: out,
    },
  };
}

const CHAIN_TO = [
  { api: 'data-quality-rules', reason: 'Validate the normalized dataset against not_null/type/regex rules.' },
  { api: 'data-classification', reason: 'Re-infer column semantics now that values are canonicalized.' },
];
const INVALIDATORS = [
  'Operations apply in the given order; reordering (e.g. lowercase before strip_accents) can change the result.',
  'String operations coerce the value to a string first, so applying e.g. trim to a number returns a string; use to_number/to_integer last to convert back.',
  'null/undefined values pass through unchanged (no fabrication); empty strings ARE normalized. to_number/to_date_iso leave unparseable values as-is.',
];

function actions(r: NormalizeCore): string[] {
  const out: string[] = [];
  if (r.total_cells_changed === 0) out.push('No cells changed — the dataset already matches the requested canonical form.');
  else {
    const top = [...r.per_column].sort((a, b) => b.cells_changed - a.cells_changed)[0];
    out.push(`Normalized ${r.total_cells_changed} cell(s) across ${r.columns_normalized} column(s); most changes in "${top.column}" (${top.cells_changed}).`);
    if (r.total_cells_type_changed > 0) out.push(`${r.total_cells_type_changed} cell(s) changed JSON type (coercion, e.g. string→number/boolean/date) — confirm downstream consumers expect the new types.`);
  }
  out.push('Persist the returned rows or chain to data-quality-rules to confirm conformance.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Normalizer API', version: '1.0.0',
    description: 'Deterministic data normalizer. Applies ordered canonicalization operations (whitespace, case, unicode, number, boolean, date) per column and returns normalized rows with per-column change counts. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-normalizer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/normalize', summary: 'Normalize a dataset', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL normalize + reasoning', price_usdc: 0.011 },
    ],
    pricing: [
      { path: '/normalize', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: NormalizeCore) => ({
  confidence_score: 1, confidence_per_section: { normalization: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/normalize', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = normalize(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = normalize(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Applied normalization rules to ${v.columns_normalized} column(s) over ${v.row_count} row(s); ${v.total_cells_changed} cell(s) changed.`,
      key_factors: v.per_column.map((c) => `${c.column}: [${c.operations.join(' → ')}] changed ${c.cells_changed}.`),
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema } from '../../_aplus/specparts';

const OP_ENUM = ['trim', 'collapse_whitespace', 'lowercase', 'uppercase', 'title_case', 'strip_accents', 'nfc', 'nfkc', 'remove_punctuation', 'remove_non_numeric', 'to_number', 'to_integer', 'to_boolean', 'to_date_iso'];
const Row = rowSchema();
const ColumnNorm = {
  type: 'object', required: ['column', 'operations', 'cells_changed', 'cells_type_changed'], additionalProperties: false,
  properties: {
    column: { type: 'string' },
    operations: { type: 'array', items: { type: 'string', enum: OP_ENUM } },
    cells_changed: { type: 'integer', minimum: 0 },
    cells_type_changed: { type: 'integer', minimum: 0, description: 'Subset of cells_changed whose JSON type changed (coercion, e.g. string→number/boolean/date).' },
  },
};
const NormalizeCore = {
  type: 'object', required: ['row_count', 'columns_normalized', 'total_cells_changed', 'total_cells_type_changed', 'per_column', 'rows'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    columns_normalized: { type: 'integer', minimum: 0 },
    total_cells_changed: { type: 'integer', minimum: 0 },
    total_cells_type_changed: { type: 'integer', minimum: 0, description: 'Total cells whose JSON type changed via coercion ops (to_number/to_integer/to_boolean/to_date_iso).' },
    per_column: { type: 'array', items: ColumnNorm },
    rows: { type: 'array', items: Row },
  },
};
const NormRule = {
  type: 'object', required: ['column', 'operations'], additionalProperties: false,
  properties: {
    column: { type: 'string' },
    operations: { type: 'array', minItems: 1, items: { type: 'string', enum: OP_ENUM } },
  },
};
const NormalizeRequest = {
  type: 'object', required: ['rows', 'rules'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to normalize.' },
    rules: { type: 'array', items: NormRule, minItems: 1, description: 'Ordered per-column normalization operations.' },
  },
};

const CORE = {
  row_count: 2, columns_normalized: 2, total_cells_changed: 4, total_cells_type_changed: 0,
  per_column: [
    { column: 'name', operations: ['trim', 'title_case'], cells_changed: 2, cells_type_changed: 0 },
    { column: 'city', operations: ['strip_accents', 'lowercase'], cells_changed: 2, cells_type_changed: 0 },
  ],
  rows: [{ name: 'Alice', city: 'sao paulo' }, { name: 'Bob', city: 'sao paulo' }],
};
const CHAIN = [
  { api: 'data-quality-rules', reason: 'Validate the normalized dataset against not_null/type/regex rules.' },
  { api: 'data-classification', reason: 'Re-infer column semantics now that values are canonicalized.' },
];
const INVALIDATORS = [
  'Operations apply in the given order; reordering (e.g. lowercase before strip_accents) can change the result.',
  'String operations coerce the value to a string first, so applying e.g. trim to a number returns a string; use to_number/to_integer last to convert back.',
  'null/undefined values pass through unchanged (no fabrication); empty strings ARE normalized. to_number/to_date_iso leave unparseable values as-is.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { normalization: 1 },
  recommended_actions_priority_order: [
    'Normalized 4 cell(s) across 2 column(s); most changes in "name" (2).',
    'Persist the returned rows or chain to data-quality-rules to confirm conformance.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('normalization'), _Tail: Tail,
  ColumnNorm, NormalizeCore, NormRule, NormalizeRequest, DiscoveryResponse: discoverySchema(),
  NormalizeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/NormalizeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/NormalizeCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dnm-1780000000000', request_id: 'dnm-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  rows: [{ name: '  Alice  ', city: 'são paulo' }, { name: 'BOB', city: 'SÃO PAULO' }],
  rules: [
    { column: 'name', operations: ['trim', 'title_case'] },
    { column: 'city', operations: ['strip_accents', 'lowercase'] },
  ],
};
const disc = {
  name: 'Data Normalizer API', version: '1.0.0',
  description: 'Deterministic data normalizer. Applies ordered canonicalization operations (whitespace, case, unicode, number, boolean, date) per column and returns normalized rows with per-column change counts. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-normalizer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/normalize', summary: 'Normalize a dataset', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL normalize + reasoning', price_usdc: 0.011 },
  ],
  pricing: [
    { path: '/normalize', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/normalize', summary: 'Normalize a dataset', operationId: 'normalize', priceUsdc: 0.006,
    requestSchemaRef: 'NormalizeRequest', responseSchemaRef: 'NormalizeResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL normalize + reasoning', operationId: 'lookup', priceUsdc: 0.011, oneCall: true,
    requestSchemaRef: 'NormalizeRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Applied normalization rules to 2 column(s) over 2 row(s); 4 cell(s) changed.',
        key_factors: ['name: [trim → title_case] changed 2.', 'city: [strip_accents → lowercase] changed 2.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-normalizer', title: 'Data Normalizer API', version: '1.0.0',
  description: 'Deterministic data normalizer — ordered per-column canonicalization (whitespace/case/unicode/number/boolean/date) returning normalized rows. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /data-normalizer/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Data Normalizer API",
    "version": "1.0.0",
    "description": "Deterministic data normalizer — ordered per-column canonicalization (whitespace/case/unicode/number/boolean/date) returning normalized rows. No LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-data-quality": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/data-normalizer"
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
                  "name": "Data Normalizer API",
                  "version": "1.0.0",
                  "description": "Deterministic data normalizer. Applies ordered canonicalization operations (whitespace, case, unicode, number, boolean, date) per column and returns normalized rows with per-column change counts. No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/data-normalizer/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/normalize",
                      "summary": "Normalize a dataset",
                      "price_usdc": 0.006
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL normalize + reasoning",
                      "price_usdc": 0.011
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/normalize",
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
    "/normalize": {
      "post": {
        "operationId": "normalize",
        "summary": "Normalize a dataset",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NormalizeResponse"
                },
                "example": {
                  "trace_id": "dnm-1780000000000",
                  "request_id": "dnm-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "row_count": 2,
                  "columns_normalized": 2,
                  "total_cells_changed": 4,
                  "total_cells_type_changed": 0,
                  "per_column": [
                    {
                      "column": "name",
                      "operations": [
                        "trim",
                        "title_case"
                      ],
                      "cells_changed": 2,
                      "cells_type_changed": 0
                    },
                    {
                      "column": "city",
                      "operations": [
                        "strip_accents",
                        "lowercase"
                      ],
                      "cells_changed": 2,
                      "cells_type_changed": 0
                    }
                  ],
                  "rows": [
                    {
                      "name": "Alice",
                      "city": "sao paulo"
                    },
                    {
                      "name": "Bob",
                      "city": "sao paulo"
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "normalization": 1
                  },
                  "recommended_actions_priority_order": [
                    "Normalized 4 cell(s) across 2 column(s); most changes in \"name\" (2).",
                    "Persist the returned rows or chain to data-quality-rules to confirm conformance."
                  ],
                  "chain_to": [
                    {
                      "api": "data-quality-rules",
                      "reason": "Validate the normalized dataset against not_null/type/regex rules."
                    },
                    {
                      "api": "data-classification",
                      "reason": "Re-infer column semantics now that values are canonicalized."
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
                "$ref": "#/components/schemas/NormalizeRequest"
              },
              "example": {
                "rows": [
                  {
                    "name": "  Alice  ",
                    "city": "são paulo"
                  },
                  {
                    "name": "BOB",
                    "city": "SÃO PAULO"
                  }
                ],
                "rules": [
                  {
                    "column": "name",
                    "operations": [
                      "trim",
                      "title_case"
                    ]
                  },
                  {
                    "column": "city",
                    "operations": [
                      "strip_accents",
                      "lowercase"
                    ]
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
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "ONE-CALL normalize + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "dnm-1780000000000",
                  "request_id": "dnm-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "row_count": 2,
                  "columns_normalized": 2,
                  "total_cells_changed": 4,
                  "total_cells_type_changed": 0,
                  "per_column": [
                    {
                      "column": "name",
                      "operations": [
                        "trim",
                        "title_case"
                      ],
                      "cells_changed": 2,
                      "cells_type_changed": 0
                    },
                    {
                      "column": "city",
                      "operations": [
                        "strip_accents",
                        "lowercase"
                      ],
                      "cells_changed": 2,
                      "cells_type_changed": 0
                    }
                  ],
                  "rows": [
                    {
                      "name": "Alice",
                      "city": "sao paulo"
                    },
                    {
                      "name": "Bob",
                      "city": "sao paulo"
                    }
                  ],
                  "reasoning": {
                    "why_result_generated": "Applied normalization rules to 2 column(s) over 2 row(s); 4 cell(s) changed.",
                    "key_factors": [
                      "name: [trim → title_case] changed 2.",
                      "city: [strip_accents → lowercase] changed 2."
                    ],
                    "invalidators": [
                      "Operations apply in the given order; reordering (e.g. lowercase before strip_accents) can change the result.",
                      "String operations coerce the value to a string first, so applying e.g. trim to a number returns a string; use to_number/to_integer last to convert back.",
                      "null/undefined values pass through unchanged (no fabrication); empty strings ARE normalized. to_number/to_date_iso leave unparseable values as-is."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "normalization": 1
                  },
                  "recommended_actions_priority_order": [
                    "Normalized 4 cell(s) across 2 column(s); most changes in \"name\" (2).",
                    "Persist the returned rows or chain to data-quality-rules to confirm conformance."
                  ],
                  "chain_to": [
                    {
                      "api": "data-quality-rules",
                      "reason": "Validate the normalized dataset against not_null/type/regex rules."
                    },
                    {
                      "api": "data-classification",
                      "reason": "Re-infer column semantics now that values are canonicalized."
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
                "$ref": "#/components/schemas/NormalizeRequest"
              },
              "example": {
                "rows": [
                  {
                    "name": "  Alice  ",
                    "city": "são paulo"
                  },
                  {
                    "name": "BOB",
                    "city": "SÃO PAULO"
                  }
                ],
                "rules": [
                  {
                    "column": "name",
                    "operations": [
                      "trim",
                      "title_case"
                    ]
                  },
                  {
                    "column": "city",
                    "operations": [
                      "strip_accents",
                      "lowercase"
                    ]
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
          "normalization": {
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
      "ColumnNorm": {
        "type": "object",
        "required": [
          "column",
          "operations",
          "cells_changed",
          "cells_type_changed"
        ],
        "additionalProperties": false,
        "properties": {
          "column": {
            "type": "string"
          },
          "operations": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "trim",
                "collapse_whitespace",
                "lowercase",
                "uppercase",
                "title_case",
                "strip_accents",
                "nfc",
                "nfkc",
                "remove_punctuation",
                "remove_non_numeric",
                "to_number",
                "to_integer",
                "to_boolean",
                "to_date_iso"
              ]
            }
          },
          "cells_changed": {
            "type": "integer",
            "minimum": 0
          },
          "cells_type_changed": {
            "type": "integer",
            "minimum": 0,
            "description": "Subset of cells_changed whose JSON type changed (coercion, e.g. string→number/boolean/date)."
          }
        }
      },
      "NormalizeCore": {
        "type": "object",
        "required": [
          "row_count",
          "columns_normalized",
          "total_cells_changed",
          "total_cells_type_changed",
          "per_column",
          "rows"
        ],
        "properties": {
          "row_count": {
            "type": "integer",
            "minimum": 0
          },
          "columns_normalized": {
            "type": "integer",
            "minimum": 0
          },
          "total_cells_changed": {
            "type": "integer",
            "minimum": 0
          },
          "total_cells_type_changed": {
            "type": "integer",
            "minimum": 0,
            "description": "Total cells whose JSON type changed via coercion ops (to_number/to_integer/to_boolean/to_date_iso)."
          },
          "per_column": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "column",
                "operations",
                "cells_changed",
                "cells_type_changed"
              ],
              "additionalProperties": false,
              "properties": {
                "column": {
                  "type": "string"
                },
                "operations": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "enum": [
                      "trim",
                      "collapse_whitespace",
                      "lowercase",
                      "uppercase",
                      "title_case",
                      "strip_accents",
                      "nfc",
                      "nfkc",
                      "remove_punctuation",
                      "remove_non_numeric",
                      "to_number",
                      "to_integer",
                      "to_boolean",
                      "to_date_iso"
                    ]
                  }
                },
                "cells_changed": {
                  "type": "integer",
                  "minimum": 0
                },
                "cells_type_changed": {
                  "type": "integer",
                  "minimum": 0,
                  "description": "Subset of cells_changed whose JSON type changed (coercion, e.g. string→number/boolean/date)."
                }
              }
            }
          },
          "rows": {
            "type": "array",
            "items": {
              "type": "object",
              "description": "A dataset row as a flat JSON object (column → value).",
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
            }
          }
        }
      },
      "NormRule": {
        "type": "object",
        "required": [
          "column",
          "operations"
        ],
        "additionalProperties": false,
        "properties": {
          "column": {
            "type": "string"
          },
          "operations": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string",
              "enum": [
                "trim",
                "collapse_whitespace",
                "lowercase",
                "uppercase",
                "title_case",
                "strip_accents",
                "nfc",
                "nfkc",
                "remove_punctuation",
                "remove_non_numeric",
                "to_number",
                "to_integer",
                "to_boolean",
                "to_date_iso"
              ]
            }
          }
        }
      },
      "NormalizeRequest": {
        "type": "object",
        "required": [
          "rows",
          "rules"
        ],
        "additionalProperties": false,
        "properties": {
          "rows": {
            "type": "array",
            "items": {
              "type": "object",
              "description": "A dataset row as a flat JSON object (column → value).",
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
            "minItems": 1,
            "description": "Dataset rows to normalize."
          },
          "rules": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "column",
                "operations"
              ],
              "additionalProperties": false,
              "properties": {
                "column": {
                  "type": "string"
                },
                "operations": {
                  "type": "array",
                  "minItems": 1,
                  "items": {
                    "type": "string",
                    "enum": [
                      "trim",
                      "collapse_whitespace",
                      "lowercase",
                      "uppercase",
                      "title_case",
                      "strip_accents",
                      "nfc",
                      "nfkc",
                      "remove_punctuation",
                      "remove_non_numeric",
                      "to_number",
                      "to_integer",
                      "to_boolean",
                      "to_date_iso"
                    ]
                  }
                }
              }
            },
            "minItems": 1,
            "description": "Ordered per-column normalization operations."
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
      "NormalizeResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/NormalizeCore"
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
            "$ref": "#/components/schemas/NormalizeCore"
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
### POST /normalize (trim + collapse + title_case + to_number)
Request:
```json
{
  "rows": [
    {
      "name": "  john   SMITH ",
      "age": " 30 "
    },
    {
      "name": "JANE doe",
      "age": "42"
    },
    {
      "name": "bob   jones  ",
      "age": "NaN"
    }
  ],
  "rules": [
    {
      "column": "name",
      "operations": [
        "trim",
        "collapse_whitespace",
        "title_case"
      ]
    },
    {
      "column": "age",
      "operations": [
        "to_number"
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "svx0yw3g-1781475534218",
  "request_id": "svx0yw3g-1781475534218",
  "computed_at": "2026-06-14T22:18:54.218Z",
  "success": true,
  "latency_ms": 0,
  "row_count": 3,
  "columns_normalized": 2,
  "total_cells_changed": 5,
  "total_cells_type_changed": 2,
  "per_column": [
    {
      "column": "name",
      "operations": [
        "trim",
        "collapse_whitespace",
        "title_case"
      ],
      "cells_changed": 3,
      "cells_type_changed": 0
    },
    {
      "column": "age",
      "operations": [
        "to_number"
      ],
      "cells_changed": 2,
      "cells_type_changed": 2
    }
  ],
  "rows": [
    {
      "name": "John Smith",
      "age": 30
    },
    {
      "name": "Jane Doe",
      "age": 42
    },
    {
      "name": "Bob Jones",
      "age": "NaN"
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "normalization": 1
  },
  "recommended_actions_priority_order": [
    "Normalized 5 cell(s) across 2 column(s); most changes in \"name\" (3).",
    "2 cell(s) changed JSON type (coercion, e.g. string→number/boolean/date) — confirm downstream consumers expect the new types.",
    "Persist the returned rows or chain to data-quality-rules to confirm conformance."
  ],
  "chain_to": [
    {
      "api": "data-quality-rules",
      "reason": "Validate the normalized dataset against not_null/type/regex rules."
    },
    {
      "api": "data-classification",
      "reason": "Re-infer column semantics now that values are canonicalized."
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

### POST /lookup (strip_accents + nfkc + to_boolean → reasoning block)
Request:
```json
{
  "rows": [
    {
      "city": "Mëxico",
      "active": "YES"
    },
    {
      "city": "São Paulo",
      "active": "n"
    }
  ],
  "rules": [
    {
      "column": "city",
      "operations": [
        "strip_accents",
        "nfkc"
      ]
    },
    {
      "column": "active",
      "operations": [
        "to_boolean"
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "82kcqwkm-1781475534222",
  "request_id": "82kcqwkm-1781475534222",
  "computed_at": "2026-06-14T22:18:54.222Z",
  "success": true,
  "latency_ms": 0,
  "row_count": 2,
  "columns_normalized": 2,
  "total_cells_changed": 4,
  "total_cells_type_changed": 2,
  "per_column": [
    {
      "column": "city",
      "operations": [
        "strip_accents",
        "nfkc"
      ],
      "cells_changed": 2,
      "cells_type_changed": 0
    },
    {
      "column": "active",
      "operations": [
        "to_boolean"
      ],
      "cells_changed": 2,
      "cells_type_changed": 2
    }
  ],
  "rows": [
    {
      "city": "Mexico",
      "active": true
    },
    {
      "city": "Sao Paulo",
      "active": false
    }
  ],
  "reasoning": {
    "why_result_generated": "Applied normalization rules to 2 column(s) over 2 row(s); 4 cell(s) changed.",
    "key_factors": [
      "city: [strip_accents → nfkc] changed 2.",
      "active: [to_boolean] changed 2."
    ],
    "invalidators": [
      "Operations apply in the given order; reordering (e.g. lowercase before strip_accents) can change the result.",
      "String operations coerce the value to a string first, so applying e.g. trim to a number returns a string; use to_number/to_integer last to convert back.",
      "null/undefined values pass through unchanged (no fabrication); empty strings ARE normalized. to_number/to_date_iso leave unparseable values as-is."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "normalization": 1
  },
  "recommended_actions_priority_order": [
    "Normalized 4 cell(s) across 2 column(s); most changes in \"city\" (2).",
    "2 cell(s) changed JSON type (coercion, e.g. string→number/boolean/date) — confirm downstream consumers expect the new types.",
    "Persist the returned rows or chain to data-quality-rules to confirm conformance."
  ],
  "chain_to": [
    {
      "api": "data-quality-rules",
      "reason": "Validate the normalized dataset against not_null/type/regex rules."
    },
    {
      "api": "data-classification",
      "reason": "Re-infer column semantics now that values are canonicalized."
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

### POST /normalize (no-op — values already canonical)
Request:
```json
{
  "rows": [
    {
      "code": "ABC"
    },
    {
      "code": "DEF"
    }
  ],
  "rules": [
    {
      "column": "code",
      "operations": [
        "uppercase"
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "mgkbdvr3-1781475534225",
  "request_id": "mgkbdvr3-1781475534225",
  "computed_at": "2026-06-14T22:18:54.225Z",
  "success": true,
  "latency_ms": 0,
  "row_count": 2,
  "columns_normalized": 1,
  "total_cells_changed": 0,
  "total_cells_type_changed": 0,
  "per_column": [
    {
      "column": "code",
      "operations": [
        "uppercase"
      ],
      "cells_changed": 0,
      "cells_type_changed": 0
    }
  ],
  "rows": [
    {
      "code": "ABC"
    },
    {
      "code": "DEF"
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "normalization": 1
  },
  "recommended_actions_priority_order": [
    "No cells changed — the dataset already matches the requested canonical form.",
    "Persist the returned rows or chain to data-quality-rules to confirm conformance."
  ],
  "chain_to": [
    {
      "api": "data-quality-rules",
      "reason": "Validate the normalized dataset against not_null/type/regex rules."
    },
    {
      "api": "data-classification",
      "reason": "Re-infer column semantics now that values are canonicalized."
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

### POST /normalize (error: missing rules)
Request:
```json
{
  "rows": [
    {
      "a": 1
    }
  ]
}
```
Response (HTTP 400):
```json
{
  "trace_id": "su2y2t2v-1781475534230",
  "request_id": "su2y2t2v-1781475534230",
  "computed_at": "2026-06-14T22:18:54.230Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"rules\" must be a non-empty array of { column, operations } objects."
  }
}
```

---

# data-mapper

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { parseRows, asNum, isMissing, Row } from '../../_aplus/dataset';

// Deterministic data mapper. Applies a field-mapping spec (rename + optional cast
// + default) to a posted dataset and returns the remapped records plus per-mapping
// stats. Optionally carries unmapped source columns through. No LLM, nothing stored.

const router = Router();

const CASTS = ['string', 'number', 'integer', 'boolean', 'date'] as const;
type Cast = typeof CASTS[number];

const TRUE_SET = new Set(['true', '1', 'yes', 'y', 't']);
const FALSE_SET = new Set(['false', '0', 'no', 'n', 'f']);

export interface MappingStat { from: string; to: string; cast: Cast | null; applied: number; defaults_used: number; cast_failures: number; }
export interface TargetCollision { target: string; sources: string[]; winner: string; }
export interface MapCore {
  row_count: number;
  mappings_applied: number;
  output_columns: string[];
  total_cast_failures: number;
  total_defaults_used: number;
  target_collisions: TargetCollision[];
  per_mapping: MappingStat[];
  rows: Row[];
}

// Returns { value } on success, { failed: true } if the cast could not be applied.
function castValue(v: unknown, cast: Cast): { value: unknown } | { failed: true } {
  switch (cast) {
    case 'string': return { value: String(v) };
    case 'number': { const n = asNum(v); return n === null ? { failed: true } : { value: n }; }
    case 'integer': { const n = asNum(v); return n === null ? { failed: true } : { value: Math.trunc(n) }; }
    case 'boolean': { const k = String(v).trim().toLowerCase(); return TRUE_SET.has(k) ? { value: true } : FALSE_SET.has(k) ? { value: false } : { failed: true }; }
    case 'date': { const t = Date.parse(String(v)); return Number.isNaN(t) ? { failed: true } : { value: new Date(t).toISOString().slice(0, 10) }; }
  }
}

function map(body: any): { error: string } | { result: MapCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "rows" and "mappings".' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;
  if (!Array.isArray(body.mappings) || body.mappings.length === 0) return { error: '"mappings" must be a non-empty array of { from, to } objects.' };
  const dropUnmapped = body.drop_unmapped === undefined ? true : body.drop_unmapped === true;

  const mappings: { from: string; to: string; cast: Cast | null; hasDefault: boolean; def: unknown }[] = [];
  for (let i = 0; i < body.mappings.length; i++) {
    const m = body.mappings[i];
    if (m === null || typeof m !== 'object' || Array.isArray(m)) return { error: `mappings[${i}] must be an object.` };
    if (typeof m.from !== 'string' || m.from === '') return { error: `mappings[${i}].from must be a non-empty string.` };
    if (typeof m.to !== 'string' || m.to === '') return { error: `mappings[${i}].to must be a non-empty string.` };
    if (m.cast !== undefined && !CASTS.includes(m.cast)) return { error: `mappings[${i}].cast must be one of: ${CASTS.join(', ')}.` };
    mappings.push({ from: m.from, to: m.to, cast: m.cast ?? null, hasDefault: 'default' in m, def: m.default });
  }

  const mappedSources = new Set(mappings.map((m) => m.from));
  const stats: MappingStat[] = mappings.map((m) => ({ from: m.from, to: m.to, cast: m.cast, applied: 0, defaults_used: 0, cast_failures: 0 }));
  const outColumns = new Set<string>();
  const rows: Row[] = [];

  // Detect target collisions up front (deterministic from the spec): two+ mappings
  // writing the same "to" field. Last mapping in order wins (last-write-wins).
  const byTarget = new Map<string, string[]>();
  for (const m of mappings) { const arr = byTarget.get(m.to) ?? []; arr.push(m.from); byTarget.set(m.to, arr); }
  const target_collisions: TargetCollision[] = [...byTarget.entries()]
    .filter(([, froms]) => froms.length > 1)
    .map(([target, froms]) => ({ target, sources: froms, winner: froms[froms.length - 1] }));

  for (const row of p.rows) {
    const outRow: Row = {};
    if (!dropUnmapped) for (const k of Object.keys(row)) if (!mappedSources.has(k)) { outRow[k] = row[k]; outColumns.add(k); }
    mappings.forEach((m, i) => {
      let val: unknown;
      const present = (m.from in row) && !isMissing(row[m.from], false);
      if (!present) {
        if (!m.hasDefault) return; // nothing to write for this row
        val = m.def; stats[i].defaults_used++;
      } else {
        val = row[m.from];
        if (m.cast) { const c = castValue(val, m.cast); if ('failed' in c) { stats[i].cast_failures++; val = null; } else val = c.value; }
      }
      outRow[m.to] = val;
      outColumns.add(m.to);
      stats[i].applied++;
    });
    rows.push(outRow);
  }

  return {
    result: {
      row_count: rows.length,
      mappings_applied: mappings.length,
      output_columns: [...outColumns],
      total_cast_failures: stats.reduce((a, s) => a + s.cast_failures, 0),
      total_defaults_used: stats.reduce((a, s) => a + s.defaults_used, 0),
      target_collisions,
      per_mapping: stats,
      rows,
    },
  };
}

const CHAIN_TO = [
  { api: 'data-normalizer', reason: 'Canonicalize the mapped values (case/whitespace/date) after renaming.' },
  { api: 'data-quality-rules', reason: 'Enforce types and required fields on the mapped schema.' },
];
const INVALIDATORS = [
  'A source column missing in a row is skipped unless that mapping supplies a "default"; no value is fabricated.',
  'Failed casts (e.g. "abc" → number) set the target to null and are counted in cast_failures — they are not dropped silently.',
  'With drop_unmapped=false, unmapped source columns are carried through under their original names; a mapping target can overwrite them.',
  'target_collisions lists targets written by two or more mappings (last-write-wins); it does NOT include a mapping overwriting a carried-through unmapped column of the same name.',
];

function actions(r: MapCore): string[] {
  const out = [`Mapped ${r.mappings_applied} field(s) over ${r.row_count} row(s) → ${r.output_columns.length} output column(s).`];
  if (r.target_collisions.length > 0) out.push(`${r.target_collisions.length} target collision(s) — e.g. "${r.target_collisions[0].target}" written by [${r.target_collisions[0].sources.join(', ')}], "${r.target_collisions[0].winner}" wins (last-write). De-duplicate targets if unintended.`);
  if (r.total_cast_failures > 0) out.push(`${r.total_cast_failures} cast failure(s) set to null — inspect source values or relax the cast.`);
  if (r.total_defaults_used > 0) out.push(`${r.total_defaults_used} default(s) filled for missing sources.`);
  if (r.total_cast_failures === 0 && r.total_defaults_used === 0 && r.target_collisions.length === 0) out.push('Clean mapping — no collisions, cast failures, or defaults needed.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Mapper API', version: '1.0.0',
    description: 'Deterministic data mapper. Applies a field-mapping spec (rename + optional cast + default) to a dataset and returns remapped records with per-mapping stats. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-mapper/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/map', summary: 'Map/rename/cast dataset fields', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL map + reasoning', price_usdc: 0.011 },
    ],
    pricing: [
      { path: '/map', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: MapCore) => ({
  confidence_score: 1, confidence_per_section: { mapping: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/map', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = map(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = map(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Applied ${v.mappings_applied} mapping(s) over ${v.row_count} row(s); ${v.total_cast_failures} cast failure(s), ${v.total_defaults_used} default(s) used.`,
      key_factors: v.per_mapping.map((m) => `${m.from} → ${m.to}${m.cast ? ` (${m.cast})` : ''}: applied ${m.applied}, failures ${m.cast_failures}.`),
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema, CellValue } from '../../_aplus/specparts';

const CAST_ENUM = ['string', 'number', 'integer', 'boolean', 'date'];
const Row = rowSchema();
const MappingStat = {
  type: 'object', required: ['from', 'to', 'cast', 'applied', 'defaults_used', 'cast_failures'], additionalProperties: false,
  properties: {
    from: { type: 'string' }, to: { type: 'string' },
    cast: { type: ['string', 'null'], enum: [...CAST_ENUM, null] },
    applied: { type: 'integer', minimum: 0 },
    defaults_used: { type: 'integer', minimum: 0 },
    cast_failures: { type: 'integer', minimum: 0 },
  },
};
const TargetCollision = {
  type: 'object', required: ['target', 'sources', 'winner'], additionalProperties: false,
  properties: {
    target: { type: 'string', description: 'Output field written by more than one mapping.' },
    sources: { type: 'array', items: { type: 'string' }, minItems: 2, description: 'Source columns mapped to this target, in spec order.' },
    winner: { type: 'string', description: 'Source whose value wins (last mapping in order — last-write-wins).' },
  },
};
const MapCore = {
  type: 'object', required: ['row_count', 'mappings_applied', 'output_columns', 'total_cast_failures', 'total_defaults_used', 'target_collisions', 'per_mapping', 'rows'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    mappings_applied: { type: 'integer', minimum: 0 },
    output_columns: { type: 'array', items: { type: 'string' } },
    total_cast_failures: { type: 'integer', minimum: 0 },
    total_defaults_used: { type: 'integer', minimum: 0 },
    target_collisions: { type: 'array', items: TargetCollision, description: 'Targets written by two or more mappings (last-write-wins).' },
    per_mapping: { type: 'array', items: MappingStat },
    rows: { type: 'array', items: Row },
  },
};
const Mapping = {
  type: 'object', required: ['from', 'to'], additionalProperties: false,
  properties: {
    from: { type: 'string', description: 'Source column name.' },
    to: { type: 'string', description: 'Target column name.' },
    cast: { type: 'string', enum: CAST_ENUM, description: 'Optional type cast applied to the value.' },
    default: { ...CellValue, description: 'Value used when the source column is missing in a row.' },
  },
};
const MapRequest = {
  type: 'object', required: ['rows', 'mappings'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to map.' },
    mappings: { type: 'array', items: Mapping, minItems: 1, description: 'Field mappings (rename + optional cast + default).' },
    drop_unmapped: { type: 'boolean', description: 'Drop source columns that are not a mapping target (default true).' },
  },
};

const CORE = {
  row_count: 2, mappings_applied: 3, output_columns: ['given_name', 'age', 'country'],
  total_cast_failures: 1, total_defaults_used: 2, target_collisions: [],
  per_mapping: [
    { from: 'first', to: 'given_name', cast: null, applied: 2, defaults_used: 0, cast_failures: 0 },
    { from: 'age', to: 'age', cast: 'integer', applied: 2, defaults_used: 0, cast_failures: 1 },
    { from: 'country', to: 'country', cast: null, applied: 2, defaults_used: 2, cast_failures: 0 },
  ],
  rows: [
    { given_name: 'Ann', age: 30, country: 'US' },
    { given_name: 'Bob', age: null, country: 'US' },
  ],
};
const CHAIN = [
  { api: 'data-normalizer', reason: 'Canonicalize the mapped values (case/whitespace/date) after renaming.' },
  { api: 'data-quality-rules', reason: 'Enforce types and required fields on the mapped schema.' },
];
const INVALIDATORS = [
  'A source column missing in a row is skipped unless that mapping supplies a "default"; no value is fabricated.',
  'Failed casts (e.g. "abc" → number) set the target to null and are counted in cast_failures — they are not dropped silently.',
  'With drop_unmapped=false, unmapped source columns are carried through under their original names; a mapping target can overwrite them.',
  'target_collisions lists targets written by two or more mappings (last-write-wins); it does NOT include a mapping overwriting a carried-through unmapped column of the same name.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { mapping: 1 },
  recommended_actions_priority_order: [
    'Mapped 3 field(s) over 2 row(s) → 3 output column(s).',
    '1 cast failure(s) set to null — inspect source values or relax the cast.',
    '2 default(s) filled for missing sources.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('mapping'), _Tail: Tail,
  MappingStat, MapCore, Mapping, MapRequest, DiscoveryResponse: discoverySchema(),
  MapResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/MapCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/MapCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dmp-1780000000000', request_id: 'dmp-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  rows: [{ first: 'Ann', last: 'Lee', age: '30' }, { first: 'Bob', last: 'Ng', age: 'x' }],
  mappings: [
    { from: 'first', to: 'given_name' },
    { from: 'age', to: 'age', cast: 'integer' },
    { from: 'country', to: 'country', default: 'US' },
  ],
  drop_unmapped: true,
};
const disc = {
  name: 'Data Mapper API', version: '1.0.0',
  description: 'Deterministic data mapper. Applies a field-mapping spec (rename + optional cast + default) to a dataset and returns remapped records with per-mapping stats. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-mapper/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/map', summary: 'Map/rename/cast dataset fields', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL map + reasoning', price_usdc: 0.011 },
  ],
  pricing: [
    { path: '/map', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/map', summary: 'Map/rename/cast dataset fields', operationId: 'map', priceUsdc: 0.006,
    requestSchemaRef: 'MapRequest', responseSchemaRef: 'MapResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL map + reasoning', operationId: 'lookup', priceUsdc: 0.011, oneCall: true,
    requestSchemaRef: 'MapRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Applied 3 mapping(s) over 2 row(s); 1 cast failure(s), 2 default(s) used.',
        key_factors: ['first → given_name: applied 2, failures 0.', 'age → age (integer): applied 2, failures 1.', 'country → country: applied 2, failures 0.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-mapper', title: 'Data Mapper API', version: '1.0.0',
  description: 'Deterministic data mapper — applies a field-mapping spec (rename + cast + default) returning remapped records with per-mapping stats. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /data-mapper/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Data Mapper API",
    "version": "1.0.0",
    "description": "Deterministic data mapper — applies a field-mapping spec (rename + cast + default) returning remapped records with per-mapping stats. No LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-data-quality": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/data-mapper"
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
                  "name": "Data Mapper API",
                  "version": "1.0.0",
                  "description": "Deterministic data mapper. Applies a field-mapping spec (rename + optional cast + default) to a dataset and returns remapped records with per-mapping stats. No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/data-mapper/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/map",
                      "summary": "Map/rename/cast dataset fields",
                      "price_usdc": 0.006
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL map + reasoning",
                      "price_usdc": 0.011
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/map",
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
    "/map": {
      "post": {
        "operationId": "map",
        "summary": "Map/rename/cast dataset fields",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MapResponse"
                },
                "example": {
                  "trace_id": "dmp-1780000000000",
                  "request_id": "dmp-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "row_count": 2,
                  "mappings_applied": 3,
                  "output_columns": [
                    "given_name",
                    "age",
                    "country"
                  ],
                  "total_cast_failures": 1,
                  "total_defaults_used": 2,
                  "target_collisions": [],
                  "per_mapping": [
                    {
                      "from": "first",
                      "to": "given_name",
                      "cast": null,
                      "applied": 2,
                      "defaults_used": 0,
                      "cast_failures": 0
                    },
                    {
                      "from": "age",
                      "to": "age",
                      "cast": "integer",
                      "applied": 2,
                      "defaults_used": 0,
                      "cast_failures": 1
                    },
                    {
                      "from": "country",
                      "to": "country",
                      "cast": null,
                      "applied": 2,
                      "defaults_used": 2,
                      "cast_failures": 0
                    }
                  ],
                  "rows": [
                    {
                      "given_name": "Ann",
                      "age": 30,
                      "country": "US"
                    },
                    {
                      "given_name": "Bob",
                      "age": null,
                      "country": "US"
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "mapping": 1
                  },
                  "recommended_actions_priority_order": [
                    "Mapped 3 field(s) over 2 row(s) → 3 output column(s).",
                    "1 cast failure(s) set to null — inspect source values or relax the cast.",
                    "2 default(s) filled for missing sources."
                  ],
                  "chain_to": [
                    {
                      "api": "data-normalizer",
                      "reason": "Canonicalize the mapped values (case/whitespace/date) after renaming."
                    },
                    {
                      "api": "data-quality-rules",
                      "reason": "Enforce types and required fields on the mapped schema."
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
                "$ref": "#/components/schemas/MapRequest"
              },
              "example": {
                "rows": [
                  {
                    "first": "Ann",
                    "last": "Lee",
                    "age": "30"
                  },
                  {
                    "first": "Bob",
                    "last": "Ng",
                    "age": "x"
                  }
                ],
                "mappings": [
                  {
                    "from": "first",
                    "to": "given_name"
                  },
                  {
                    "from": "age",
                    "to": "age",
                    "cast": "integer"
                  },
                  {
                    "from": "country",
                    "to": "country",
                    "default": "US"
                  }
                ],
                "drop_unmapped": true
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
        "summary": "ONE-CALL map + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "dmp-1780000000000",
                  "request_id": "dmp-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "row_count": 2,
                  "mappings_applied": 3,
                  "output_columns": [
                    "given_name",
                    "age",
                    "country"
                  ],
                  "total_cast_failures": 1,
                  "total_defaults_used": 2,
                  "target_collisions": [],
                  "per_mapping": [
                    {
                      "from": "first",
                      "to": "given_name",
                      "cast": null,
                      "applied": 2,
                      "defaults_used": 0,
                      "cast_failures": 0
                    },
                    {
                      "from": "age",
                      "to": "age",
                      "cast": "integer",
                      "applied": 2,
                      "defaults_used": 0,
                      "cast_failures": 1
                    },
                    {
                      "from": "country",
                      "to": "country",
                      "cast": null,
                      "applied": 2,
                      "defaults_used": 2,
                      "cast_failures": 0
                    }
                  ],
                  "rows": [
                    {
                      "given_name": "Ann",
                      "age": 30,
                      "country": "US"
                    },
                    {
                      "given_name": "Bob",
                      "age": null,
                      "country": "US"
                    }
                  ],
                  "reasoning": {
                    "why_result_generated": "Applied 3 mapping(s) over 2 row(s); 1 cast failure(s), 2 default(s) used.",
                    "key_factors": [
                      "first → given_name: applied 2, failures 0.",
                      "age → age (integer): applied 2, failures 1.",
                      "country → country: applied 2, failures 0."
                    ],
                    "invalidators": [
                      "A source column missing in a row is skipped unless that mapping supplies a \"default\"; no value is fabricated.",
                      "Failed casts (e.g. \"abc\" → number) set the target to null and are counted in cast_failures — they are not dropped silently.",
                      "With drop_unmapped=false, unmapped source columns are carried through under their original names; a mapping target can overwrite them.",
                      "target_collisions lists targets written by two or more mappings (last-write-wins); it does NOT include a mapping overwriting a carried-through unmapped column of the same name."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "mapping": 1
                  },
                  "recommended_actions_priority_order": [
                    "Mapped 3 field(s) over 2 row(s) → 3 output column(s).",
                    "1 cast failure(s) set to null — inspect source values or relax the cast.",
                    "2 default(s) filled for missing sources."
                  ],
                  "chain_to": [
                    {
                      "api": "data-normalizer",
                      "reason": "Canonicalize the mapped values (case/whitespace/date) after renaming."
                    },
                    {
                      "api": "data-quality-rules",
                      "reason": "Enforce types and required fields on the mapped schema."
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
                "$ref": "#/components/schemas/MapRequest"
              },
              "example": {
                "rows": [
                  {
                    "first": "Ann",
                    "last": "Lee",
                    "age": "30"
                  },
                  {
                    "first": "Bob",
                    "last": "Ng",
                    "age": "x"
                  }
                ],
                "mappings": [
                  {
                    "from": "first",
                    "to": "given_name"
                  },
                  {
                    "from": "age",
                    "to": "age",
                    "cast": "integer"
                  },
                  {
                    "from": "country",
                    "to": "country",
                    "default": "US"
                  }
                ],
                "drop_unmapped": true
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
          "mapping": {
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
      "MappingStat": {
        "type": "object",
        "required": [
          "from",
          "to",
          "cast",
          "applied",
          "defaults_used",
          "cast_failures"
        ],
        "additionalProperties": false,
        "properties": {
          "from": {
            "type": "string"
          },
          "to": {
            "type": "string"
          },
          "cast": {
            "type": [
              "string",
              "null"
            ],
            "enum": [
              "string",
              "number",
              "integer",
              "boolean",
              "date",
              null
            ]
          },
          "applied": {
            "type": "integer",
            "minimum": 0
          },
          "defaults_used": {
            "type": "integer",
            "minimum": 0
          },
          "cast_failures": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "MapCore": {
        "type": "object",
        "required": [
          "row_count",
          "mappings_applied",
          "output_columns",
          "total_cast_failures",
          "total_defaults_used",
          "target_collisions",
          "per_mapping",
          "rows"
        ],
        "properties": {
          "row_count": {
            "type": "integer",
            "minimum": 0
          },
          "mappings_applied": {
            "type": "integer",
            "minimum": 0
          },
          "output_columns": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "total_cast_failures": {
            "type": "integer",
            "minimum": 0
          },
          "total_defaults_used": {
            "type": "integer",
            "minimum": 0
          },
          "target_collisions": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "target",
                "sources",
                "winner"
              ],
              "additionalProperties": false,
              "properties": {
                "target": {
                  "type": "string",
                  "description": "Output field written by more than one mapping."
                },
                "sources": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "minItems": 2,
                  "description": "Source columns mapped to this target, in spec order."
                },
                "winner": {
                  "type": "string",
                  "description": "Source whose value wins (last mapping in order — last-write-wins)."
                }
              }
            },
            "description": "Targets written by two or more mappings (last-write-wins)."
          },
          "per_mapping": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "from",
                "to",
                "cast",
                "applied",
                "defaults_used",
                "cast_failures"
              ],
              "additionalProperties": false,
              "properties": {
                "from": {
                  "type": "string"
                },
                "to": {
                  "type": "string"
                },
                "cast": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "string",
                    "number",
                    "integer",
                    "boolean",
                    "date",
                    null
                  ]
                },
                "applied": {
                  "type": "integer",
                  "minimum": 0
                },
                "defaults_used": {
                  "type": "integer",
                  "minimum": 0
                },
                "cast_failures": {
                  "type": "integer",
                  "minimum": 0
                }
              }
            }
          },
          "rows": {
            "type": "array",
            "items": {
              "type": "object",
              "description": "A dataset row as a flat JSON object (column → value).",
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
            }
          }
        }
      },
      "Mapping": {
        "type": "object",
        "required": [
          "from",
          "to"
        ],
        "additionalProperties": false,
        "properties": {
          "from": {
            "type": "string",
            "description": "Source column name."
          },
          "to": {
            "type": "string",
            "description": "Target column name."
          },
          "cast": {
            "type": "string",
            "enum": [
              "string",
              "number",
              "integer",
              "boolean",
              "date"
            ],
            "description": "Optional type cast applied to the value."
          },
          "default": {
            "description": "Value used when the source column is missing in a row.",
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
      "MapRequest": {
        "type": "object",
        "required": [
          "rows",
          "mappings"
        ],
        "additionalProperties": false,
        "properties": {
          "rows": {
            "type": "array",
            "items": {
              "type": "object",
              "description": "A dataset row as a flat JSON object (column → value).",
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
            "minItems": 1,
            "description": "Dataset rows to map."
          },
          "mappings": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "from",
                "to"
              ],
              "additionalProperties": false,
              "properties": {
                "from": {
                  "type": "string",
                  "description": "Source column name."
                },
                "to": {
                  "type": "string",
                  "description": "Target column name."
                },
                "cast": {
                  "type": "string",
                  "enum": [
                    "string",
                    "number",
                    "integer",
                    "boolean",
                    "date"
                  ],
                  "description": "Optional type cast applied to the value."
                },
                "default": {
                  "description": "Value used when the source column is missing in a row.",
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
            "minItems": 1,
            "description": "Field mappings (rename + optional cast + default)."
          },
          "drop_unmapped": {
            "type": "boolean",
            "description": "Drop source columns that are not a mapping target (default true)."
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
      "MapResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/MapCore"
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
            "$ref": "#/components/schemas/MapCore"
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
### POST /map (rename + cast + default, drop unmapped)
Request:
```json
{
  "rows": [
    {
      "user_id": "1",
      "signup": "2024-01-02",
      "plan": "pro"
    },
    {
      "user_id": "2",
      "signup": "not-a-date"
    }
  ],
  "mappings": [
    {
      "from": "user_id",
      "to": "id",
      "cast": "integer"
    },
    {
      "from": "signup",
      "to": "created_at",
      "cast": "date"
    },
    {
      "from": "plan",
      "to": "tier",
      "default": "free"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "expnfm9i-1781475534240",
  "request_id": "expnfm9i-1781475534240",
  "computed_at": "2026-06-14T22:18:54.240Z",
  "success": true,
  "latency_ms": 0,
  "row_count": 2,
  "mappings_applied": 3,
  "output_columns": [
    "id",
    "created_at",
    "tier"
  ],
  "total_cast_failures": 1,
  "total_defaults_used": 1,
  "target_collisions": [],
  "per_mapping": [
    {
      "from": "user_id",
      "to": "id",
      "cast": "integer",
      "applied": 2,
      "defaults_used": 0,
      "cast_failures": 0
    },
    {
      "from": "signup",
      "to": "created_at",
      "cast": "date",
      "applied": 2,
      "defaults_used": 0,
      "cast_failures": 1
    },
    {
      "from": "plan",
      "to": "tier",
      "cast": null,
      "applied": 2,
      "defaults_used": 1,
      "cast_failures": 0
    }
  ],
  "rows": [
    {
      "id": 1,
      "created_at": "2024-01-02",
      "tier": "pro"
    },
    {
      "id": 2,
      "created_at": null,
      "tier": "free"
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "mapping": 1
  },
  "recommended_actions_priority_order": [
    "Mapped 3 field(s) over 2 row(s) → 3 output column(s).",
    "1 cast failure(s) set to null — inspect source values or relax the cast.",
    "1 default(s) filled for missing sources."
  ],
  "chain_to": [
    {
      "api": "data-normalizer",
      "reason": "Canonicalize the mapped values (case/whitespace/date) after renaming."
    },
    {
      "api": "data-quality-rules",
      "reason": "Enforce types and required fields on the mapped schema."
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

### POST /lookup (cast failure + carry unmapped → reasoning block)
Request:
```json
{
  "rows": [
    {
      "amount": "12.50",
      "currency": "USD",
      "note": "keep me"
    }
  ],
  "mappings": [
    {
      "from": "amount",
      "to": "price",
      "cast": "number"
    }
  ],
  "drop_unmapped": false
}
```
Response (HTTP 200):
```json
{
  "trace_id": "ua904xzd-1781475534244",
  "request_id": "ua904xzd-1781475534244",
  "computed_at": "2026-06-14T22:18:54.244Z",
  "success": true,
  "latency_ms": 1,
  "row_count": 1,
  "mappings_applied": 1,
  "output_columns": [
    "currency",
    "note",
    "price"
  ],
  "total_cast_failures": 0,
  "total_defaults_used": 0,
  "target_collisions": [],
  "per_mapping": [
    {
      "from": "amount",
      "to": "price",
      "cast": "number",
      "applied": 1,
      "defaults_used": 0,
      "cast_failures": 0
    }
  ],
  "rows": [
    {
      "currency": "USD",
      "note": "keep me",
      "price": 12.5
    }
  ],
  "reasoning": {
    "why_result_generated": "Applied 1 mapping(s) over 1 row(s); 0 cast failure(s), 0 default(s) used.",
    "key_factors": [
      "amount → price (number): applied 1, failures 0."
    ],
    "invalidators": [
      "A source column missing in a row is skipped unless that mapping supplies a \"default\"; no value is fabricated.",
      "Failed casts (e.g. \"abc\" → number) set the target to null and are counted in cast_failures — they are not dropped silently.",
      "With drop_unmapped=false, unmapped source columns are carried through under their original names; a mapping target can overwrite them.",
      "target_collisions lists targets written by two or more mappings (last-write-wins); it does NOT include a mapping overwriting a carried-through unmapped column of the same name."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "mapping": 1
  },
  "recommended_actions_priority_order": [
    "Mapped 1 field(s) over 1 row(s) → 3 output column(s).",
    "Clean mapping — no collisions, cast failures, or defaults needed."
  ],
  "chain_to": [
    {
      "api": "data-normalizer",
      "reason": "Canonicalize the mapped values (case/whitespace/date) after renaming."
    },
    {
      "api": "data-quality-rules",
      "reason": "Enforce types and required fields on the mapped schema."
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

### POST /map (target collision — two mappings write "id", last wins)
Request:
```json
{
  "rows": [
    {
      "legacy_id": "7",
      "uuid": "u-7"
    },
    {
      "legacy_id": "8",
      "uuid": "u-8"
    }
  ],
  "mappings": [
    {
      "from": "legacy_id",
      "to": "id",
      "cast": "integer"
    },
    {
      "from": "uuid",
      "to": "id"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "0kmdvzeo-1781475534251",
  "request_id": "0kmdvzeo-1781475534251",
  "computed_at": "2026-06-14T22:18:54.251Z",
  "success": true,
  "latency_ms": 1,
  "row_count": 2,
  "mappings_applied": 2,
  "output_columns": [
    "id"
  ],
  "total_cast_failures": 0,
  "total_defaults_used": 0,
  "target_collisions": [
    {
      "target": "id",
      "sources": [
        "legacy_id",
        "uuid"
      ],
      "winner": "uuid"
    }
  ],
  "per_mapping": [
    {
      "from": "legacy_id",
      "to": "id",
      "cast": "integer",
      "applied": 2,
      "defaults_used": 0,
      "cast_failures": 0
    },
    {
      "from": "uuid",
      "to": "id",
      "cast": null,
      "applied": 2,
      "defaults_used": 0,
      "cast_failures": 0
    }
  ],
  "rows": [
    {
      "id": "u-7"
    },
    {
      "id": "u-8"
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "mapping": 1
  },
  "recommended_actions_priority_order": [
    "Mapped 2 field(s) over 2 row(s) → 1 output column(s).",
    "1 target collision(s) — e.g. \"id\" written by [legacy_id, uuid], \"uuid\" wins (last-write). De-duplicate targets if unintended."
  ],
  "chain_to": [
    {
      "api": "data-normalizer",
      "reason": "Canonicalize the mapped values (case/whitespace/date) after renaming."
    },
    {
      "api": "data-quality-rules",
      "reason": "Enforce types and required fields on the mapped schema."
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

### POST /map (error: empty mappings)
Request:
```json
{
  "rows": [
    {
      "a": 1
    }
  ],
  "mappings": []
}
```
Response (HTTP 400):
```json
{
  "trace_id": "pz5q16g8-1781475534253",
  "request_id": "pz5q16g8-1781475534253",
  "computed_at": "2026-06-14T22:18:54.253Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"mappings\" must be a non-empty array of { from, to } objects."
  }
}
```

---

# data-transformer

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';
import { parseRows, asNum, asKey, isMissing, Row } from '../../_aplus/dataset';

// Deterministic data transformer. Applies an ordered pipeline of declarative row
// transforms — concat, arithmetic, split, filter — to a posted dataset and returns
// the transformed rows with a per-operation effect summary. No expression eval, no
// LLM, nothing stored.

const router = Router();

const OPS = ['concat', 'arithmetic', 'split', 'filter'] as const;
const ARITH = ['+', '-', '*', '/'] as const;
const PREDS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'not_null', 'is_null'] as const;

export interface FailureCodes { non_numeric_operand: number; divide_by_zero: number; }
export interface OpResult { op: string; detail: string; rows_removed?: number; cells_written?: number; failures?: number; failure_codes?: FailureCodes; }
export interface TransformCore {
  rows_in: number;
  rows_out: number;
  operations_applied: number;
  per_operation: OpResult[];
  rows: Row[];
}

function arithmetic(vals: number[], operator: string): number | null {
  if (vals.length === 0) return null;
  let acc = vals[0];
  for (let i = 1; i < vals.length; i++) {
    if (operator === '+') acc += vals[i];
    else if (operator === '-') acc -= vals[i];
    else if (operator === '*') acc *= vals[i];
    else if (operator === '/') { if (vals[i] === 0) return null; acc /= vals[i]; }
  }
  return acc;
}

function predicateOk(v: unknown, pred: string, value: unknown): boolean {
  const missing = isMissing(v, false);
  if (pred === 'not_null') return !missing;
  if (pred === 'is_null') return missing;
  if (missing) return false;
  switch (pred) {
    case 'eq': return asKey(v) === asKey(value);
    case 'ne': return asKey(v) !== asKey(value);
    case 'contains': return String(v).includes(String(value));
    case 'in': return Array.isArray(value) && value.map(asKey).includes(asKey(v));
    case 'gt': case 'gte': case 'lt': case 'lte': {
      const a = asNum(v), b = asNum(value);
      if (a === null || b === null) return false;
      return pred === 'gt' ? a > b : pred === 'gte' ? a >= b : pred === 'lt' ? a < b : a <= b;
    }
    default: return false;
  }
}

function transform(body: any): { error: string } | { result: TransformCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "rows" and "operations".' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;
  if (!Array.isArray(body.operations) || body.operations.length === 0) return { error: '"operations" must be a non-empty array.' };
  if (body.operations.length > 50) return { error: '"operations" exceeds the 50-operation limit.' };

  // validate ops up front
  const ops = body.operations as any[];
  for (let i = 0; i < ops.length; i++) {
    const o = ops[i];
    if (o === null || typeof o !== 'object' || Array.isArray(o)) return { error: `operations[${i}] must be an object.` };
    if (!OPS.includes(o.op)) return { error: `operations[${i}].op must be one of: ${OPS.join(', ')}.` };
    if (o.op === 'concat') {
      if (!Array.isArray(o.columns) || o.columns.length === 0 || typeof o.target !== 'string') return { error: `operations[${i}] (concat) needs "columns" (non-empty) and "target".` };
    } else if (o.op === 'arithmetic') {
      if (!Array.isArray(o.columns) || o.columns.length < 1 || typeof o.target !== 'string') return { error: `operations[${i}] (arithmetic) needs "columns" and "target".` };
      if (!ARITH.includes(o.operator)) return { error: `operations[${i}] (arithmetic).operator must be one of: ${ARITH.join(' ')}.` };
    } else if (o.op === 'split') {
      if (typeof o.column !== 'string' || typeof o.separator !== 'string' || !Array.isArray(o.into) || o.into.length === 0) return { error: `operations[${i}] (split) needs "column", "separator", and "into" (non-empty).` };
    } else if (o.op === 'filter') {
      if (typeof o.column !== 'string' || !PREDS.includes(o.predicate)) return { error: `operations[${i}] (filter) needs "column" and "predicate" in: ${PREDS.join(', ')}.` };
    }
  }

  let rows: Row[] = p.rows.map((r) => ({ ...r }));
  const per_operation: OpResult[] = [];

  for (const o of ops) {
    if (o.op === 'concat') {
      const sep = typeof o.separator === 'string' ? o.separator : '';
      let written = 0;
      for (const row of rows) {
        const parts = o.columns.map((c: string) => (isMissing(row[c], false) ? '' : String(row[c])));
        row[o.target] = parts.join(sep); written++;
      }
      per_operation.push({ op: 'concat', detail: `${o.columns.join(`+`)} → ${o.target}`, cells_written: written });
    } else if (o.op === 'arithmetic') {
      let written = 0, nonNumeric = 0, divZero = 0;
      for (const row of rows) {
        const nums = o.columns.map((c: string) => asNum(row[c]));
        if (nums.some((n: number | null) => n === null)) { row[o.target] = null; nonNumeric++; written++; continue; }
        const res = arithmetic(nums as number[], o.operator);
        row[o.target] = res === null ? null : round(res, 6); if (res === null) divZero++; written++;
      }
      per_operation.push({ op: 'arithmetic', detail: `${o.columns.join(` ${o.operator} `)} → ${o.target}`, cells_written: written, failures: nonNumeric + divZero, failure_codes: { non_numeric_operand: nonNumeric, divide_by_zero: divZero } });
    } else if (o.op === 'split') {
      let written = 0;
      for (const row of rows) {
        const src = isMissing(row[o.column], false) ? '' : String(row[o.column]);
        const parts = src.split(o.separator);
        o.into.forEach((t: string, idx: number) => { row[t] = parts[idx] !== undefined ? parts[idx] : null; });
        written++;
      }
      per_operation.push({ op: 'split', detail: `${o.column} → [${o.into.join(', ')}]`, cells_written: written });
    } else if (o.op === 'filter') {
      const before = rows.length;
      rows = rows.filter((row) => predicateOk(row[o.column], o.predicate, o.value));
      per_operation.push({ op: 'filter', detail: `${o.column} ${o.predicate}${o.value !== undefined ? ` ${JSON.stringify(o.value)}` : ''}`, rows_removed: before - rows.length });
    }
  }

  return { result: { rows_in: p.rows.length, rows_out: rows.length, operations_applied: ops.length, per_operation, rows } };
}

const CHAIN_TO = [
  { api: 'data-aggregator', reason: 'Group and aggregate the transformed rows.' },
  { api: 'data-quality-rules', reason: 'Validate the derived columns before promoting downstream.' },
];
const INVALIDATORS = [
  'Operations run in order; a filter early in the pipeline changes which rows later derivations see.',
  'arithmetic / numeric predicates use numeric parsing (numeric strings accepted); a non-numeric operand sets the derived value to null (counted in failures) and division by zero yields null.',
  'concat/split coerce values to strings; missing values become "" in concat and null in split target columns. No expressions are evaluated.',
];

function actions(r: TransformCore): string[] {
  const out = [`Applied ${r.operations_applied} operation(s): ${r.rows_in} → ${r.rows_out} row(s).`];
  const fails = r.per_operation.reduce((a, o) => a + (o.failures ?? 0), 0);
  if (fails > 0) {
    const nn = r.per_operation.reduce((a, o) => a + (o.failure_codes?.non_numeric_operand ?? 0), 0);
    const dz = r.per_operation.reduce((a, o) => a + (o.failure_codes?.divide_by_zero ?? 0), 0);
    out.push(`${fails} derivation failure(s) set to null (non_numeric_operand: ${nn}, divide_by_zero: ${dz}) — see per_operation.failure_codes.`);
  }
  out.push('Chain to data-aggregator or data-quality-rules on the transformed rows.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Transformer API', version: '1.0.0',
    description: 'Deterministic data transformer. Applies an ordered pipeline of declarative row transforms (concat, arithmetic, split, filter) and returns the transformed rows with a per-operation effect summary. No expression eval, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-transformer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/transform', summary: 'Transform dataset rows', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL transform + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/transform', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: TransformCore) => ({
  confidence_score: 1, confidence_per_section: { transformation: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/transform', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = transform(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = transform(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Ran ${v.operations_applied} operation(s) over ${v.rows_in} row(s) → ${v.rows_out} row(s).`,
      key_factors: v.per_operation.map((o) => `${o.op}: ${o.detail}${o.rows_removed !== undefined ? ` (removed ${o.rows_removed})` : ''}${o.cells_written !== undefined ? ` (wrote ${o.cells_written})` : ''}.`),
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema, CellValue } from '../../_aplus/specparts';

const PRED_ENUM = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'not_null', 'is_null'];
const Row = rowSchema();
const FailureCodes = {
  type: 'object', required: ['non_numeric_operand', 'divide_by_zero'], additionalProperties: false,
  properties: {
    non_numeric_operand: { type: 'integer', minimum: 0, description: 'Rows where an operand could not be parsed as a number; result set to null.' },
    divide_by_zero: { type: 'integer', minimum: 0, description: 'Rows where a "/" operation hit a zero divisor; result set to null.' },
  },
};
const OpResult = {
  type: 'object', required: ['op', 'detail'], additionalProperties: false,
  properties: {
    op: { type: 'string', enum: ['concat', 'arithmetic', 'split', 'filter'] },
    detail: { type: 'string' },
    rows_removed: { type: 'integer', minimum: 0 },
    cells_written: { type: 'integer', minimum: 0 },
    failures: { type: 'integer', minimum: 0 },
    failure_codes: { ...FailureCodes, description: 'Failure breakdown for arithmetic ops (present only on arithmetic).' },
  },
};
const TransformCore = {
  type: 'object', required: ['rows_in', 'rows_out', 'operations_applied', 'per_operation', 'rows'],
  properties: {
    rows_in: { type: 'integer', minimum: 0 },
    rows_out: { type: 'integer', minimum: 0 },
    operations_applied: { type: 'integer', minimum: 0 },
    per_operation: { type: 'array', items: OpResult },
    rows: { type: 'array', items: Row },
  },
};
// Each operation variant is closed and discriminated by "op".
const ConcatOp = { type: 'object', additionalProperties: false, required: ['op', 'target', 'columns'], properties: { op: { const: 'concat' }, target: { type: 'string' }, columns: { type: 'array', minItems: 1, items: { type: 'string' } }, separator: { type: 'string' } } };
const ArithOp = { type: 'object', additionalProperties: false, required: ['op', 'target', 'columns', 'operator'], properties: { op: { const: 'arithmetic' }, target: { type: 'string' }, columns: { type: 'array', minItems: 1, items: { type: 'string' } }, operator: { type: 'string', enum: ['+', '-', '*', '/'] } } };
const SplitOp = { type: 'object', additionalProperties: false, required: ['op', 'column', 'separator', 'into'], properties: { op: { const: 'split' }, column: { type: 'string' }, separator: { type: 'string' }, into: { type: 'array', minItems: 1, items: { type: 'string' } } } };
const FilterOp = { type: 'object', additionalProperties: false, required: ['op', 'column', 'predicate'], properties: { op: { const: 'filter' }, column: { type: 'string' }, predicate: { type: 'string', enum: PRED_ENUM }, value: { ...CellValue, description: 'Comparison value (array for the "in" predicate; omit for not_null/is_null).' } } };
const Operation = { oneOf: [ConcatOp, ArithOp, SplitOp, FilterOp], description: 'A declarative transform; shape depends on "op".' };
const TransformRequest = {
  type: 'object', required: ['rows', 'operations'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to transform.' },
    operations: { type: 'array', items: Operation, minItems: 1, description: 'Ordered transform pipeline.' },
  },
};

const CORE = {
  rows_in: 3, rows_out: 2, operations_applied: 3,
  per_operation: [
    { op: 'concat', detail: 'first+last → full_name', cells_written: 3 },
    { op: 'arithmetic', detail: 'qty * price → total', cells_written: 3, failures: 0, failure_codes: { non_numeric_operand: 0, divide_by_zero: 0 } },
    { op: 'filter', detail: 'total gt 0', rows_removed: 1 },
  ],
  rows: [
    { first: 'Ann', last: 'Lee', qty: '2', price: '10', full_name: 'Ann Lee', total: 20 },
    { first: 'Bob', last: 'Ng', qty: '3', price: '5', full_name: 'Bob Ng', total: 15 },
  ],
};
const CHAIN = [
  { api: 'data-aggregator', reason: 'Group and aggregate the transformed rows.' },
  { api: 'data-quality-rules', reason: 'Validate the derived columns before promoting downstream.' },
];
const INVALIDATORS = [
  'Operations run in order; a filter early in the pipeline changes which rows later derivations see.',
  'arithmetic / numeric predicates use numeric parsing (numeric strings accepted); a non-numeric operand sets the derived value to null (counted in failures) and division by zero yields null.',
  'concat/split coerce values to strings; missing values become "" in concat and null in split target columns. No expressions are evaluated.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { transformation: 1 },
  recommended_actions_priority_order: [
    'Applied 3 operation(s): 3 → 2 row(s).',
    'Chain to data-aggregator or data-quality-rules on the transformed rows.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('transformation'), _Tail: Tail,
  OpResult, TransformCore, Operation, TransformRequest, DiscoveryResponse: discoverySchema(),
  TransformResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TransformCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/TransformCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dtf-1780000000000', request_id: 'dtf-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  rows: [
    { first: 'Ann', last: 'Lee', qty: '2', price: '10' },
    { first: 'Bob', last: 'Ng', qty: '3', price: '5' },
    { first: 'Cy', last: 'Xu', qty: '0', price: '9' },
  ],
  operations: [
    { op: 'concat', target: 'full_name', columns: ['first', 'last'], separator: ' ' },
    { op: 'arithmetic', target: 'total', columns: ['qty', 'price'], operator: '*' },
    { op: 'filter', column: 'total', predicate: 'gt', value: 0 },
  ],
};
const disc = {
  name: 'Data Transformer API', version: '1.0.0',
  description: 'Deterministic data transformer. Applies an ordered pipeline of declarative row transforms (concat, arithmetic, split, filter) and returns the transformed rows with a per-operation effect summary. No expression eval, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-transformer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/transform', summary: 'Transform dataset rows', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL transform + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/transform', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/transform', summary: 'Transform dataset rows', operationId: 'transform', priceUsdc: 0.007,
    requestSchemaRef: 'TransformRequest', responseSchemaRef: 'TransformResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL transform + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'TransformRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Ran 3 operation(s) over 3 row(s) → 2 row(s).',
        key_factors: ['concat: first+last → full_name (wrote 3).', 'arithmetic: qty * price → total (wrote 3).', 'filter: total gt 0 (removed 1).'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-transformer', title: 'Data Transformer API', version: '1.0.0',
  description: 'Deterministic data transformer — ordered declarative pipeline (concat/arithmetic/split/filter) returning transformed rows. No expression eval, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /data-transformer/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Data Transformer API",
    "version": "1.0.0",
    "description": "Deterministic data transformer — ordered declarative pipeline (concat/arithmetic/split/filter) returning transformed rows. No expression eval, no LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-data-quality": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/data-transformer"
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
                  "name": "Data Transformer API",
                  "version": "1.0.0",
                  "description": "Deterministic data transformer. Applies an ordered pipeline of declarative row transforms (concat, arithmetic, split, filter) and returns the transformed rows with a per-operation effect summary. No expression eval, no LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/data-transformer/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/transform",
                      "summary": "Transform dataset rows",
                      "price_usdc": 0.007
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL transform + reasoning",
                      "price_usdc": 0.012
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/transform",
                      "price_usdc": 0.007,
                      "currency": "USDC"
                    },
                    {
                      "path": "/lookup",
                      "price_usdc": 0.012,
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
    "/transform": {
      "post": {
        "operationId": "transform",
        "summary": "Transform dataset rows",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TransformResponse"
                },
                "example": {
                  "trace_id": "dtf-1780000000000",
                  "request_id": "dtf-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "rows_in": 3,
                  "rows_out": 2,
                  "operations_applied": 3,
                  "per_operation": [
                    {
                      "op": "concat",
                      "detail": "first+last → full_name",
                      "cells_written": 3
                    },
                    {
                      "op": "arithmetic",
                      "detail": "qty * price → total",
                      "cells_written": 3,
                      "failures": 0,
                      "failure_codes": {
                        "non_numeric_operand": 0,
                        "divide_by_zero": 0
                      }
                    },
                    {
                      "op": "filter",
                      "detail": "total gt 0",
                      "rows_removed": 1
                    }
                  ],
                  "rows": [
                    {
                      "first": "Ann",
                      "last": "Lee",
                      "qty": "2",
                      "price": "10",
                      "full_name": "Ann Lee",
                      "total": 20
                    },
                    {
                      "first": "Bob",
                      "last": "Ng",
                      "qty": "3",
                      "price": "5",
                      "full_name": "Bob Ng",
                      "total": 15
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "transformation": 1
                  },
                  "recommended_actions_priority_order": [
                    "Applied 3 operation(s): 3 → 2 row(s).",
                    "Chain to data-aggregator or data-quality-rules on the transformed rows."
                  ],
                  "chain_to": [
                    {
                      "api": "data-aggregator",
                      "reason": "Group and aggregate the transformed rows."
                    },
                    {
                      "api": "data-quality-rules",
                      "reason": "Validate the derived columns before promoting downstream."
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
                "$ref": "#/components/schemas/TransformRequest"
              },
              "example": {
                "rows": [
                  {
                    "first": "Ann",
                    "last": "Lee",
                    "qty": "2",
                    "price": "10"
                  },
                  {
                    "first": "Bob",
                    "last": "Ng",
                    "qty": "3",
                    "price": "5"
                  },
                  {
                    "first": "Cy",
                    "last": "Xu",
                    "qty": "0",
                    "price": "9"
                  }
                ],
                "operations": [
                  {
                    "op": "concat",
                    "target": "full_name",
                    "columns": [
                      "first",
                      "last"
                    ],
                    "separator": " "
                  },
                  {
                    "op": "arithmetic",
                    "target": "total",
                    "columns": [
                      "qty",
                      "price"
                    ],
                    "operator": "*"
                  },
                  {
                    "op": "filter",
                    "column": "total",
                    "predicate": "gt",
                    "value": 0
                  }
                ]
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
        "summary": "ONE-CALL transform + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "dtf-1780000000000",
                  "request_id": "dtf-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "rows_in": 3,
                  "rows_out": 2,
                  "operations_applied": 3,
                  "per_operation": [
                    {
                      "op": "concat",
                      "detail": "first+last → full_name",
                      "cells_written": 3
                    },
                    {
                      "op": "arithmetic",
                      "detail": "qty * price → total",
                      "cells_written": 3,
                      "failures": 0,
                      "failure_codes": {
                        "non_numeric_operand": 0,
                        "divide_by_zero": 0
                      }
                    },
                    {
                      "op": "filter",
                      "detail": "total gt 0",
                      "rows_removed": 1
                    }
                  ],
                  "rows": [
                    {
                      "first": "Ann",
                      "last": "Lee",
                      "qty": "2",
                      "price": "10",
                      "full_name": "Ann Lee",
                      "total": 20
                    },
                    {
                      "first": "Bob",
                      "last": "Ng",
                      "qty": "3",
                      "price": "5",
                      "full_name": "Bob Ng",
                      "total": 15
                    }
                  ],
                  "reasoning": {
                    "why_result_generated": "Ran 3 operation(s) over 3 row(s) → 2 row(s).",
                    "key_factors": [
                      "concat: first+last → full_name (wrote 3).",
                      "arithmetic: qty * price → total (wrote 3).",
                      "filter: total gt 0 (removed 1)."
                    ],
                    "invalidators": [
                      "Operations run in order; a filter early in the pipeline changes which rows later derivations see.",
                      "arithmetic / numeric predicates use numeric parsing (numeric strings accepted); a non-numeric operand sets the derived value to null (counted in failures) and division by zero yields null.",
                      "concat/split coerce values to strings; missing values become \"\" in concat and null in split target columns. No expressions are evaluated."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "transformation": 1
                  },
                  "recommended_actions_priority_order": [
                    "Applied 3 operation(s): 3 → 2 row(s).",
                    "Chain to data-aggregator or data-quality-rules on the transformed rows."
                  ],
                  "chain_to": [
                    {
                      "api": "data-aggregator",
                      "reason": "Group and aggregate the transformed rows."
                    },
                    {
                      "api": "data-quality-rules",
                      "reason": "Validate the derived columns before promoting downstream."
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
                "$ref": "#/components/schemas/TransformRequest"
              },
              "example": {
                "rows": [
                  {
                    "first": "Ann",
                    "last": "Lee",
                    "qty": "2",
                    "price": "10"
                  },
                  {
                    "first": "Bob",
                    "last": "Ng",
                    "qty": "3",
                    "price": "5"
                  },
                  {
                    "first": "Cy",
                    "last": "Xu",
                    "qty": "0",
                    "price": "9"
                  }
                ],
                "operations": [
                  {
                    "op": "concat",
                    "target": "full_name",
                    "columns": [
                      "first",
                      "last"
                    ],
                    "separator": " "
                  },
                  {
                    "op": "arithmetic",
                    "target": "total",
                    "columns": [
                      "qty",
                      "price"
                    ],
                    "operator": "*"
                  },
                  {
                    "op": "filter",
                    "column": "total",
                    "predicate": "gt",
                    "value": 0
                  }
                ]
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.012,
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
          "transformation": {
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
      "OpResult": {
        "type": "object",
        "required": [
          "op",
          "detail"
        ],
        "additionalProperties": false,
        "properties": {
          "op": {
            "type": "string",
            "enum": [
              "concat",
              "arithmetic",
              "split",
              "filter"
            ]
          },
          "detail": {
            "type": "string"
          },
          "rows_removed": {
            "type": "integer",
            "minimum": 0
          },
          "cells_written": {
            "type": "integer",
            "minimum": 0
          },
          "failures": {
            "type": "integer",
            "minimum": 0
          },
          "failure_codes": {
            "type": "object",
            "required": [
              "non_numeric_operand",
              "divide_by_zero"
            ],
            "additionalProperties": false,
            "properties": {
              "non_numeric_operand": {
                "type": "integer",
                "minimum": 0,
                "description": "Rows where an operand could not be parsed as a number; result set to null."
              },
              "divide_by_zero": {
                "type": "integer",
                "minimum": 0,
                "description": "Rows where a \"/\" operation hit a zero divisor; result set to null."
              }
            },
            "description": "Failure breakdown for arithmetic ops (present only on arithmetic)."
          }
        }
      },
      "TransformCore": {
        "type": "object",
        "required": [
          "rows_in",
          "rows_out",
          "operations_applied",
          "per_operation",
          "rows"
        ],
        "properties": {
          "rows_in": {
            "type": "integer",
            "minimum": 0
          },
          "rows_out": {
            "type": "integer",
            "minimum": 0
          },
          "operations_applied": {
            "type": "integer",
            "minimum": 0
          },
          "per_operation": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "op",
                "detail"
              ],
              "additionalProperties": false,
              "properties": {
                "op": {
                  "type": "string",
                  "enum": [
                    "concat",
                    "arithmetic",
                    "split",
                    "filter"
                  ]
                },
                "detail": {
                  "type": "string"
                },
                "rows_removed": {
                  "type": "integer",
                  "minimum": 0
                },
                "cells_written": {
                  "type": "integer",
                  "minimum": 0
                },
                "failures": {
                  "type": "integer",
                  "minimum": 0
                },
                "failure_codes": {
                  "type": "object",
                  "required": [
                    "non_numeric_operand",
                    "divide_by_zero"
                  ],
                  "additionalProperties": false,
                  "properties": {
                    "non_numeric_operand": {
                      "type": "integer",
                      "minimum": 0,
                      "description": "Rows where an operand could not be parsed as a number; result set to null."
                    },
                    "divide_by_zero": {
                      "type": "integer",
                      "minimum": 0,
                      "description": "Rows where a \"/\" operation hit a zero divisor; result set to null."
                    }
                  },
                  "description": "Failure breakdown for arithmetic ops (present only on arithmetic)."
                }
              }
            }
          },
          "rows": {
            "type": "array",
            "items": {
              "type": "object",
              "description": "A dataset row as a flat JSON object (column → value).",
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
            }
          }
        }
      },
      "Operation": {
        "oneOf": [
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "op",
              "target",
              "columns"
            ],
            "properties": {
              "op": {
                "const": "concat"
              },
              "target": {
                "type": "string"
              },
              "columns": {
                "type": "array",
                "minItems": 1,
                "items": {
                  "type": "string"
                }
              },
              "separator": {
                "type": "string"
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "op",
              "target",
              "columns",
              "operator"
            ],
            "properties": {
              "op": {
                "const": "arithmetic"
              },
              "target": {
                "type": "string"
              },
              "columns": {
                "type": "array",
                "minItems": 1,
                "items": {
                  "type": "string"
                }
              },
              "operator": {
                "type": "string",
                "enum": [
                  "+",
                  "-",
                  "*",
                  "/"
                ]
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "op",
              "column",
              "separator",
              "into"
            ],
            "properties": {
              "op": {
                "const": "split"
              },
              "column": {
                "type": "string"
              },
              "separator": {
                "type": "string"
              },
              "into": {
                "type": "array",
                "minItems": 1,
                "items": {
                  "type": "string"
                }
              }
            }
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "op",
              "column",
              "predicate"
            ],
            "properties": {
              "op": {
                "const": "filter"
              },
              "column": {
                "type": "string"
              },
              "predicate": {
                "type": "string",
                "enum": [
                  "eq",
                  "ne",
                  "gt",
                  "gte",
                  "lt",
                  "lte",
                  "contains",
                  "in",
                  "not_null",
                  "is_null"
                ]
              },
              "value": {
                "description": "Comparison value (array for the \"in\" predicate; omit for not_null/is_null).",
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
        ],
        "description": "A declarative transform; shape depends on \"op\"."
      },
      "TransformRequest": {
        "type": "object",
        "required": [
          "rows",
          "operations"
        ],
        "additionalProperties": false,
        "properties": {
          "rows": {
            "type": "array",
            "items": {
              "type": "object",
              "description": "A dataset row as a flat JSON object (column → value).",
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
            "minItems": 1,
            "description": "Dataset rows to transform."
          },
          "operations": {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "op",
                    "target",
                    "columns"
                  ],
                  "properties": {
                    "op": {
                      "const": "concat"
                    },
                    "target": {
                      "type": "string"
                    },
                    "columns": {
                      "type": "array",
                      "minItems": 1,
                      "items": {
                        "type": "string"
                      }
                    },
                    "separator": {
                      "type": "string"
                    }
                  }
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "op",
                    "target",
                    "columns",
                    "operator"
                  ],
                  "properties": {
                    "op": {
                      "const": "arithmetic"
                    },
                    "target": {
                      "type": "string"
                    },
                    "columns": {
                      "type": "array",
                      "minItems": 1,
                      "items": {
                        "type": "string"
                      }
                    },
                    "operator": {
                      "type": "string",
                      "enum": [
                        "+",
                        "-",
                        "*",
                        "/"
                      ]
                    }
                  }
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "op",
                    "column",
                    "separator",
                    "into"
                  ],
                  "properties": {
                    "op": {
                      "const": "split"
                    },
                    "column": {
                      "type": "string"
                    },
                    "separator": {
                      "type": "string"
                    },
                    "into": {
                      "type": "array",
                      "minItems": 1,
                      "items": {
                        "type": "string"
                      }
                    }
                  }
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "op",
                    "column",
                    "predicate"
                  ],
                  "properties": {
                    "op": {
                      "const": "filter"
                    },
                    "column": {
                      "type": "string"
                    },
                    "predicate": {
                      "type": "string",
                      "enum": [
                        "eq",
                        "ne",
                        "gt",
                        "gte",
                        "lt",
                        "lte",
                        "contains",
                        "in",
                        "not_null",
                        "is_null"
                      ]
                    },
                    "value": {
                      "description": "Comparison value (array for the \"in\" predicate; omit for not_null/is_null).",
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
              ],
              "description": "A declarative transform; shape depends on \"op\"."
            },
            "minItems": 1,
            "description": "Ordered transform pipeline."
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
      "TransformResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/TransformCore"
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
            "$ref": "#/components/schemas/TransformCore"
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
### POST /transform (concat + arithmetic + filter pipeline)
Request:
```json
{
  "rows": [
    {
      "first": "Ann",
      "last": "Lee",
      "qty": 3,
      "price": 10
    },
    {
      "first": "Bob",
      "last": "Ng",
      "qty": 0,
      "price": 5
    },
    {
      "first": "Cy",
      "last": "Fox",
      "qty": 2,
      "price": 7
    }
  ],
  "operations": [
    {
      "op": "concat",
      "columns": [
        "first",
        "last"
      ],
      "separator": " ",
      "target": "full_name"
    },
    {
      "op": "arithmetic",
      "columns": [
        "qty",
        "price"
      ],
      "operator": "*",
      "target": "total"
    },
    {
      "op": "filter",
      "column": "qty",
      "predicate": "gt",
      "value": 0
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "4rdhfc68-1781475534260",
  "request_id": "4rdhfc68-1781475534260",
  "computed_at": "2026-06-14T22:18:54.260Z",
  "success": true,
  "latency_ms": 1,
  "rows_in": 3,
  "rows_out": 2,
  "operations_applied": 3,
  "per_operation": [
    {
      "op": "concat",
      "detail": "first+last → full_name",
      "cells_written": 3
    },
    {
      "op": "arithmetic",
      "detail": "qty * price → total",
      "cells_written": 3,
      "failures": 0,
      "failure_codes": {
        "non_numeric_operand": 0,
        "divide_by_zero": 0
      }
    },
    {
      "op": "filter",
      "detail": "qty gt 0",
      "rows_removed": 1
    }
  ],
  "rows": [
    {
      "first": "Ann",
      "last": "Lee",
      "qty": 3,
      "price": 10,
      "full_name": "Ann Lee",
      "total": 30
    },
    {
      "first": "Cy",
      "last": "Fox",
      "qty": 2,
      "price": 7,
      "full_name": "Cy Fox",
      "total": 14
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "transformation": 1
  },
  "recommended_actions_priority_order": [
    "Applied 3 operation(s): 3 → 2 row(s).",
    "Chain to data-aggregator or data-quality-rules on the transformed rows."
  ],
  "chain_to": [
    {
      "api": "data-aggregator",
      "reason": "Group and aggregate the transformed rows."
    },
    {
      "api": "data-quality-rules",
      "reason": "Validate the derived columns before promoting downstream."
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

### POST /lookup (split + divide-by-zero guard → reasoning block)
Request:
```json
{
  "rows": [
    {
      "path": "a/b/c",
      "num": 10,
      "den": 0
    }
  ],
  "operations": [
    {
      "op": "split",
      "column": "path",
      "separator": "/",
      "into": [
        "p1",
        "p2",
        "p3"
      ]
    },
    {
      "op": "arithmetic",
      "columns": [
        "num",
        "den"
      ],
      "operator": "/",
      "target": "ratio"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "gwvnsitx-1781475534263",
  "request_id": "gwvnsitx-1781475534263",
  "computed_at": "2026-06-14T22:18:54.263Z",
  "success": true,
  "latency_ms": 0,
  "rows_in": 1,
  "rows_out": 1,
  "operations_applied": 2,
  "per_operation": [
    {
      "op": "split",
      "detail": "path → [p1, p2, p3]",
      "cells_written": 1
    },
    {
      "op": "arithmetic",
      "detail": "num / den → ratio",
      "cells_written": 1,
      "failures": 1,
      "failure_codes": {
        "non_numeric_operand": 0,
        "divide_by_zero": 1
      }
    }
  ],
  "rows": [
    {
      "path": "a/b/c",
      "num": 10,
      "den": 0,
      "p1": "a",
      "p2": "b",
      "p3": "c",
      "ratio": null
    }
  ],
  "reasoning": {
    "why_result_generated": "Ran 2 operation(s) over 1 row(s) → 1 row(s).",
    "key_factors": [
      "split: path → [p1, p2, p3] (wrote 1).",
      "arithmetic: num / den → ratio (wrote 1)."
    ],
    "invalidators": [
      "Operations run in order; a filter early in the pipeline changes which rows later derivations see.",
      "arithmetic / numeric predicates use numeric parsing (numeric strings accepted); a non-numeric operand sets the derived value to null (counted in failures) and division by zero yields null.",
      "concat/split coerce values to strings; missing values become \"\" in concat and null in split target columns. No expressions are evaluated."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "transformation": 1
  },
  "recommended_actions_priority_order": [
    "Applied 2 operation(s): 1 → 1 row(s).",
    "1 derivation failure(s) set to null (non_numeric_operand: 0, divide_by_zero: 1) — see per_operation.failure_codes.",
    "Chain to data-aggregator or data-quality-rules on the transformed rows."
  ],
  "chain_to": [
    {
      "api": "data-aggregator",
      "reason": "Group and aggregate the transformed rows."
    },
    {
      "api": "data-quality-rules",
      "reason": "Validate the derived columns before promoting downstream."
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

### POST /transform (filter removes nothing)
Request:
```json
{
  "rows": [
    {
      "v": 5
    },
    {
      "v": 9
    }
  ],
  "operations": [
    {
      "op": "filter",
      "column": "v",
      "predicate": "gte",
      "value": 1
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "98nuoito-1781475534265",
  "request_id": "98nuoito-1781475534265",
  "computed_at": "2026-06-14T22:18:54.265Z",
  "success": true,
  "latency_ms": 0,
  "rows_in": 2,
  "rows_out": 2,
  "operations_applied": 1,
  "per_operation": [
    {
      "op": "filter",
      "detail": "v gte 1",
      "rows_removed": 0
    }
  ],
  "rows": [
    {
      "v": 5
    },
    {
      "v": 9
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "transformation": 1
  },
  "recommended_actions_priority_order": [
    "Applied 1 operation(s): 2 → 2 row(s).",
    "Chain to data-aggregator or data-quality-rules on the transformed rows."
  ],
  "chain_to": [
    {
      "api": "data-aggregator",
      "reason": "Group and aggregate the transformed rows."
    },
    {
      "api": "data-quality-rules",
      "reason": "Validate the derived columns before promoting downstream."
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

### POST /transform (error: missing operations)
Request:
```json
{
  "rows": [
    {
      "a": 1
    }
  ]
}
```
Response (HTTP 400):
```json
{
  "trace_id": "9hsjaxlw-1781475534266",
  "request_id": "9hsjaxlw-1781475534266",
  "computed_at": "2026-06-14T22:18:54.266Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"operations\" must be a non-empty array."
  }
}
```

---

# data-aggregator

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';
import { parseRows, asNum, asKey, isMissing, mean, quantile, Row } from '../../_aplus/dataset';

// Deterministic data aggregator. Groups a posted dataset by zero or more columns
// and computes aggregation functions (count, count_distinct, sum, avg, min, max,
// median, percentile) per group. Pure arithmetic, no LLM, nothing stored.

const router = Router();

const FUNCS = ['count', 'count_distinct', 'sum', 'avg', 'min', 'max', 'median', 'percentile'] as const;
type Func = typeof FUNCS[number];

export interface AggSpec { column: string | null; func: Func; percentile: number | null; as: string; }
export interface AggregateCore {
  row_count: number;
  group_count: number;
  group_by: string[];
  aggregations: AggSpec[];
  groups: Row[];
}

function compute(rowsInGroup: Row[], spec: AggSpec): number | null {
  if (spec.func === 'count') return rowsInGroup.length;
  const col = spec.column!;
  const present = rowsInGroup.map((r) => r[col]).filter((v) => !isMissing(v, false));
  if (spec.func === 'count_distinct') return new Set(present.map(asKey)).size;
  const nums = present.map(asNum).filter((n): n is number => n !== null);
  if (nums.length === 0) return null;
  switch (spec.func) {
    case 'sum': return round(nums.reduce((a, b) => a + b, 0), 6);
    case 'avg': return round(mean(nums), 6);
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    case 'median': return round(quantile([...nums].sort((a, b) => a - b), 0.5), 6);
    case 'percentile': return round(quantile([...nums].sort((a, b) => a - b), spec.percentile! / 100), 6);
    default: return null;
  }
}

function aggregate(body: any): { error: string } | { result: AggregateCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "rows" and "aggregations".' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;

  let groupBy: string[] = [];
  if (body.group_by !== undefined) {
    if (!Array.isArray(body.group_by) || !body.group_by.every((x: unknown) => typeof x === 'string')) return { error: '"group_by" must be an array of column-name strings.' };
    groupBy = body.group_by as string[];
  }
  if (!Array.isArray(body.aggregations) || body.aggregations.length === 0) return { error: '"aggregations" must be a non-empty array.' };

  const specs: AggSpec[] = [];
  for (let i = 0; i < body.aggregations.length; i++) {
    const a = body.aggregations[i];
    if (a === null || typeof a !== 'object' || Array.isArray(a)) return { error: `aggregations[${i}] must be an object.` };
    if (!FUNCS.includes(a.func)) return { error: `aggregations[${i}].func must be one of: ${FUNCS.join(', ')}.` };
    const needsCol = a.func !== 'count';
    if (needsCol && (typeof a.column !== 'string' || a.column === '')) return { error: `aggregations[${i}] (${a.func}) needs a "column".` };
    let pct: number | null = null;
    if (a.func === 'percentile') {
      pct = asNum(a.percentile);
      if (pct === null || pct < 0 || pct > 100) return { error: `aggregations[${i}] (percentile) needs "percentile" in [0,100].` };
    }
    const col = needsCol ? (a.column as string) : null;
    const as = typeof a.as === 'string' && a.as ? a.as : a.func === 'count' ? 'count' : a.func === 'percentile' ? `p${pct}_${col}` : `${a.func}_${col}`;
    specs.push({ column: col, func: a.func, percentile: pct, as });
  }

  // Group rows by the tuple of group_by values.
  const groupsMap = new Map<string, { keys: Row; rows: Row[] }>();
  for (const r of p.rows) {
    const keyObj: Row = {};
    for (const g of groupBy) keyObj[g] = r[g] === undefined ? null : r[g];
    const k = groupBy.map((g) => asKey(r[g])).join('');
    let entry = groupsMap.get(k);
    if (!entry) { entry = { keys: keyObj, rows: [] }; groupsMap.set(k, entry); }
    entry.rows.push(r);
  }

  const groups: Row[] = [];
  for (const { keys, rows } of groupsMap.values()) {
    const out: Row = { ...keys };
    for (const spec of specs) out[spec.as] = compute(rows, spec);
    groups.push(out);
  }

  return { result: { row_count: p.rows.length, group_count: groups.length, group_by: groupBy, aggregations: specs, groups } };
}

const CHAIN_TO = [
  { api: 'data-profiler', reason: 'Profile the aggregated output to sanity-check distributions.' },
  { api: 'data-drift-detector', reason: 'Compare this aggregate against a prior period to detect shifts.' },
];
const INVALIDATORS = [
  'Numeric aggregations (sum/avg/min/max/median/percentile) parse numeric strings and ignore missing/non-numeric values; a group with no numeric values returns null for that aggregation.',
  'count counts all rows in the group; count_distinct and column-based functions count only non-missing values.',
  'percentile uses linear interpolation between order statistics (same convention as the profiler); group_by=[] aggregates the whole dataset into one group.',
];

function actions(r: AggregateCore): string[] {
  const out = [`Aggregated ${r.row_count} row(s) into ${r.group_count} group(s) by [${r.group_by.join(', ') || '(none — global)'}] with ${r.aggregations.length} function(s).`];
  out.push('Persist the grouped rows or chain to data-profiler / data-drift-detector on the output.');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Aggregator API', version: '1.0.0',
    description: 'Deterministic data aggregator. Groups a dataset by zero or more columns and computes count/count_distinct/sum/avg/min/max/median/percentile per group. Pure arithmetic, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-aggregator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/aggregate', summary: 'Group-by + aggregate a dataset', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL aggregate + reasoning', price_usdc: 0.011 },
    ],
    pricing: [
      { path: '/aggregate', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: AggregateCore) => ({
  confidence_score: 1, confidence_per_section: { aggregation: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/aggregate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = aggregate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = aggregate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Grouped ${v.row_count} row(s) by [${v.group_by.join(', ') || 'global'}] into ${v.group_count} group(s); computed ${v.aggregations.length} aggregation(s).`,
      key_factors: [
        `Group keys: ${v.group_by.join(', ') || '(whole dataset)'}.`,
        `Aggregations: ${v.aggregations.map((a) => a.as).join(', ')}.`,
        `Groups produced: ${v.group_count}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema, CellValue } from '../../_aplus/specparts';

const FUNC_ENUM = ['count', 'count_distinct', 'sum', 'avg', 'min', 'max', 'median', 'percentile'];
const Row = rowSchema();
// A group output row is a typed cell-map (NOT a generic object): keys are the
// group_by column values plus one field per aggregation (named by its `as`). Values
// are either a group-key value or a numeric/null aggregation result.
const GroupRow = {
  type: 'object',
  description: 'One aggregated group: group-key columns + one field per aggregation (numeric or null). Typed cell-map, not a free-form object.',
  additionalProperties: CellValue,
};
const AggSpec = {
  type: 'object', required: ['column', 'func', 'percentile', 'as'], additionalProperties: false,
  properties: {
    column: { type: ['string', 'null'] },
    func: { type: 'string', enum: FUNC_ENUM },
    percentile: { type: ['number', 'null'], minimum: 0, maximum: 100 },
    as: { type: 'string' },
  },
};
const AggregateCore = {
  type: 'object', required: ['row_count', 'group_count', 'group_by', 'aggregations', 'groups'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    group_count: { type: 'integer', minimum: 0 },
    group_by: { type: 'array', items: { type: 'string' } },
    aggregations: { type: 'array', items: AggSpec },
    groups: { type: 'array', items: GroupRow },
  },
};
const Aggregation = {
  type: 'object', required: ['func'], additionalProperties: false,
  properties: {
    column: { type: 'string', description: 'Column to aggregate (required for all funcs except count).' },
    func: { type: 'string', enum: FUNC_ENUM },
    percentile: { type: 'number', minimum: 0, maximum: 100, description: 'Required when func=percentile.' },
    as: { type: 'string', description: 'Output field name (default derived from func/column).' },
  },
};
const AggregateRequest = {
  type: 'object', required: ['rows', 'aggregations'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to aggregate.' },
    group_by: { type: 'array', items: { type: 'string' }, description: 'Columns to group by (omit/empty for a single global group).' },
    aggregations: { type: 'array', items: Aggregation, minItems: 1, description: 'Aggregation functions to compute per group.' },
  },
};

const CORE = {
  row_count: 4, group_count: 2, group_by: ['tier'],
  aggregations: [
    { column: null, func: 'count', percentile: null, as: 'count' },
    { column: 'amount', func: 'sum', percentile: null, as: 'sum_amount' },
    { column: 'amount', func: 'avg', percentile: null, as: 'avg_amount' },
  ],
  groups: [
    { tier: 'free', count: 2, sum_amount: 30, avg_amount: 15 },
    { tier: 'pro', count: 2, sum_amount: 80, avg_amount: 40 },
  ],
};
const CHAIN = [
  { api: 'data-profiler', reason: 'Profile the aggregated output to sanity-check distributions.' },
  { api: 'data-drift-detector', reason: 'Compare this aggregate against a prior period to detect shifts.' },
];
const INVALIDATORS = [
  'Numeric aggregations (sum/avg/min/max/median/percentile) parse numeric strings and ignore missing/non-numeric values; a group with no numeric values returns null for that aggregation.',
  'count counts all rows in the group; count_distinct and column-based functions count only non-missing values.',
  'percentile uses linear interpolation between order statistics (same convention as the profiler); group_by=[] aggregates the whole dataset into one group.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { aggregation: 1 },
  recommended_actions_priority_order: [
    'Aggregated 4 row(s) into 2 group(s) by [tier] with 3 function(s).',
    'Persist the grouped rows or chain to data-profiler / data-drift-detector on the output.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('aggregation'), _Tail: Tail,
  AggSpec, AggregateCore, Aggregation, AggregateRequest, DiscoveryResponse: discoverySchema(),
  AggregateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AggregateCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/AggregateCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dag-1780000000000', request_id: 'dag-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  rows: [
    { tier: 'free', amount: '10' },
    { tier: 'pro', amount: '30' },
    { tier: 'pro', amount: '50' },
    { tier: 'free', amount: '20' },
  ],
  group_by: ['tier'],
  aggregations: [
    { func: 'count' },
    { column: 'amount', func: 'sum' },
    { column: 'amount', func: 'avg', as: 'avg_amount' },
  ],
};
const disc = {
  name: 'Data Aggregator API', version: '1.0.0',
  description: 'Deterministic data aggregator. Groups a dataset by zero or more columns and computes count/count_distinct/sum/avg/min/max/median/percentile per group. Pure arithmetic, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-aggregator/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/aggregate', summary: 'Group-by + aggregate a dataset', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL aggregate + reasoning', price_usdc: 0.011 },
  ],
  pricing: [
    { path: '/aggregate', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/aggregate', summary: 'Group-by + aggregate a dataset', operationId: 'aggregate', priceUsdc: 0.006,
    requestSchemaRef: 'AggregateRequest', responseSchemaRef: 'AggregateResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL aggregate + reasoning', operationId: 'lookup', priceUsdc: 0.011, oneCall: true,
    requestSchemaRef: 'AggregateRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Grouped 4 row(s) by [tier] into 2 group(s); computed 3 aggregation(s).',
        key_factors: ['Group keys: tier.', 'Aggregations: count, sum_amount, avg_amount.', 'Groups produced: 2.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-aggregator', title: 'Data Aggregator API', version: '1.0.0',
  description: 'Deterministic data aggregator — group-by + count/sum/avg/min/max/median/percentile per group. Pure arithmetic, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /data-aggregator/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Data Aggregator API",
    "version": "1.0.0",
    "description": "Deterministic data aggregator — group-by + count/sum/avg/min/max/median/percentile per group. Pure arithmetic, no LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-data-quality": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/data-aggregator"
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
                  "name": "Data Aggregator API",
                  "version": "1.0.0",
                  "description": "Deterministic data aggregator. Groups a dataset by zero or more columns and computes count/count_distinct/sum/avg/min/max/median/percentile per group. Pure arithmetic, no LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/data-aggregator/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/aggregate",
                      "summary": "Group-by + aggregate a dataset",
                      "price_usdc": 0.006
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL aggregate + reasoning",
                      "price_usdc": 0.011
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/aggregate",
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
    "/aggregate": {
      "post": {
        "operationId": "aggregate",
        "summary": "Group-by + aggregate a dataset",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AggregateResponse"
                },
                "example": {
                  "trace_id": "dag-1780000000000",
                  "request_id": "dag-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "row_count": 4,
                  "group_count": 2,
                  "group_by": [
                    "tier"
                  ],
                  "aggregations": [
                    {
                      "column": null,
                      "func": "count",
                      "percentile": null,
                      "as": "count"
                    },
                    {
                      "column": "amount",
                      "func": "sum",
                      "percentile": null,
                      "as": "sum_amount"
                    },
                    {
                      "column": "amount",
                      "func": "avg",
                      "percentile": null,
                      "as": "avg_amount"
                    }
                  ],
                  "groups": [
                    {
                      "tier": "free",
                      "count": 2,
                      "sum_amount": 30,
                      "avg_amount": 15
                    },
                    {
                      "tier": "pro",
                      "count": 2,
                      "sum_amount": 80,
                      "avg_amount": 40
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "aggregation": 1
                  },
                  "recommended_actions_priority_order": [
                    "Aggregated 4 row(s) into 2 group(s) by [tier] with 3 function(s).",
                    "Persist the grouped rows or chain to data-profiler / data-drift-detector on the output."
                  ],
                  "chain_to": [
                    {
                      "api": "data-profiler",
                      "reason": "Profile the aggregated output to sanity-check distributions."
                    },
                    {
                      "api": "data-drift-detector",
                      "reason": "Compare this aggregate against a prior period to detect shifts."
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
                "$ref": "#/components/schemas/AggregateRequest"
              },
              "example": {
                "rows": [
                  {
                    "tier": "free",
                    "amount": "10"
                  },
                  {
                    "tier": "pro",
                    "amount": "30"
                  },
                  {
                    "tier": "pro",
                    "amount": "50"
                  },
                  {
                    "tier": "free",
                    "amount": "20"
                  }
                ],
                "group_by": [
                  "tier"
                ],
                "aggregations": [
                  {
                    "func": "count"
                  },
                  {
                    "column": "amount",
                    "func": "sum"
                  },
                  {
                    "column": "amount",
                    "func": "avg",
                    "as": "avg_amount"
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
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "ONE-CALL aggregate + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "dag-1780000000000",
                  "request_id": "dag-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "row_count": 4,
                  "group_count": 2,
                  "group_by": [
                    "tier"
                  ],
                  "aggregations": [
                    {
                      "column": null,
                      "func": "count",
                      "percentile": null,
                      "as": "count"
                    },
                    {
                      "column": "amount",
                      "func": "sum",
                      "percentile": null,
                      "as": "sum_amount"
                    },
                    {
                      "column": "amount",
                      "func": "avg",
                      "percentile": null,
                      "as": "avg_amount"
                    }
                  ],
                  "groups": [
                    {
                      "tier": "free",
                      "count": 2,
                      "sum_amount": 30,
                      "avg_amount": 15
                    },
                    {
                      "tier": "pro",
                      "count": 2,
                      "sum_amount": 80,
                      "avg_amount": 40
                    }
                  ],
                  "reasoning": {
                    "why_result_generated": "Grouped 4 row(s) by [tier] into 2 group(s); computed 3 aggregation(s).",
                    "key_factors": [
                      "Group keys: tier.",
                      "Aggregations: count, sum_amount, avg_amount.",
                      "Groups produced: 2."
                    ],
                    "invalidators": [
                      "Numeric aggregations (sum/avg/min/max/median/percentile) parse numeric strings and ignore missing/non-numeric values; a group with no numeric values returns null for that aggregation.",
                      "count counts all rows in the group; count_distinct and column-based functions count only non-missing values.",
                      "percentile uses linear interpolation between order statistics (same convention as the profiler); group_by=[] aggregates the whole dataset into one group."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "aggregation": 1
                  },
                  "recommended_actions_priority_order": [
                    "Aggregated 4 row(s) into 2 group(s) by [tier] with 3 function(s).",
                    "Persist the grouped rows or chain to data-profiler / data-drift-detector on the output."
                  ],
                  "chain_to": [
                    {
                      "api": "data-profiler",
                      "reason": "Profile the aggregated output to sanity-check distributions."
                    },
                    {
                      "api": "data-drift-detector",
                      "reason": "Compare this aggregate against a prior period to detect shifts."
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
                "$ref": "#/components/schemas/AggregateRequest"
              },
              "example": {
                "rows": [
                  {
                    "tier": "free",
                    "amount": "10"
                  },
                  {
                    "tier": "pro",
                    "amount": "30"
                  },
                  {
                    "tier": "pro",
                    "amount": "50"
                  },
                  {
                    "tier": "free",
                    "amount": "20"
                  }
                ],
                "group_by": [
                  "tier"
                ],
                "aggregations": [
                  {
                    "func": "count"
                  },
                  {
                    "column": "amount",
                    "func": "sum"
                  },
                  {
                    "column": "amount",
                    "func": "avg",
                    "as": "avg_amount"
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
          "aggregation": {
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
      "AggSpec": {
        "type": "object",
        "required": [
          "column",
          "func",
          "percentile",
          "as"
        ],
        "additionalProperties": false,
        "properties": {
          "column": {
            "type": [
              "string",
              "null"
            ]
          },
          "func": {
            "type": "string",
            "enum": [
              "count",
              "count_distinct",
              "sum",
              "avg",
              "min",
              "max",
              "median",
              "percentile"
            ]
          },
          "percentile": {
            "type": [
              "number",
              "null"
            ],
            "minimum": 0,
            "maximum": 100
          },
          "as": {
            "type": "string"
          }
        }
      },
      "AggregateCore": {
        "type": "object",
        "required": [
          "row_count",
          "group_count",
          "group_by",
          "aggregations",
          "groups"
        ],
        "properties": {
          "row_count": {
            "type": "integer",
            "minimum": 0
          },
          "group_count": {
            "type": "integer",
            "minimum": 0
          },
          "group_by": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "aggregations": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "column",
                "func",
                "percentile",
                "as"
              ],
              "additionalProperties": false,
              "properties": {
                "column": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "func": {
                  "type": "string",
                  "enum": [
                    "count",
                    "count_distinct",
                    "sum",
                    "avg",
                    "min",
                    "max",
                    "median",
                    "percentile"
                  ]
                },
                "percentile": {
                  "type": [
                    "number",
                    "null"
                  ],
                  "minimum": 0,
                  "maximum": 100
                },
                "as": {
                  "type": "string"
                }
              }
            }
          },
          "groups": {
            "type": "array",
            "items": {
              "type": "object",
              "description": "One aggregated group: group-key columns + one field per aggregation (numeric or null). Typed cell-map, not a free-form object.",
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
            }
          }
        }
      },
      "Aggregation": {
        "type": "object",
        "required": [
          "func"
        ],
        "additionalProperties": false,
        "properties": {
          "column": {
            "type": "string",
            "description": "Column to aggregate (required for all funcs except count)."
          },
          "func": {
            "type": "string",
            "enum": [
              "count",
              "count_distinct",
              "sum",
              "avg",
              "min",
              "max",
              "median",
              "percentile"
            ]
          },
          "percentile": {
            "type": "number",
            "minimum": 0,
            "maximum": 100,
            "description": "Required when func=percentile."
          },
          "as": {
            "type": "string",
            "description": "Output field name (default derived from func/column)."
          }
        }
      },
      "AggregateRequest": {
        "type": "object",
        "required": [
          "rows",
          "aggregations"
        ],
        "additionalProperties": false,
        "properties": {
          "rows": {
            "type": "array",
            "items": {
              "type": "object",
              "description": "A dataset row as a flat JSON object (column → value).",
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
            "minItems": 1,
            "description": "Dataset rows to aggregate."
          },
          "group_by": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Columns to group by (omit/empty for a single global group)."
          },
          "aggregations": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "func"
              ],
              "additionalProperties": false,
              "properties": {
                "column": {
                  "type": "string",
                  "description": "Column to aggregate (required for all funcs except count)."
                },
                "func": {
                  "type": "string",
                  "enum": [
                    "count",
                    "count_distinct",
                    "sum",
                    "avg",
                    "min",
                    "max",
                    "median",
                    "percentile"
                  ]
                },
                "percentile": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 100,
                  "description": "Required when func=percentile."
                },
                "as": {
                  "type": "string",
                  "description": "Output field name (default derived from func/column)."
                }
              }
            },
            "minItems": 1,
            "description": "Aggregation functions to compute per group."
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
      "AggregateResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/AggregateCore"
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
            "$ref": "#/components/schemas/AggregateCore"
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
### POST /aggregate (group_by + sum/avg/count_distinct)
Request:
```json
{
  "rows": [
    {
      "region": "us",
      "user": "a",
      "revenue": 100
    },
    {
      "region": "us",
      "user": "b",
      "revenue": 50
    },
    {
      "region": "eu",
      "user": "a",
      "revenue": 30
    }
  ],
  "group_by": [
    "region"
  ],
  "aggregations": [
    {
      "func": "count"
    },
    {
      "func": "sum",
      "column": "revenue",
      "as": "total_rev"
    },
    {
      "func": "avg",
      "column": "revenue",
      "as": "avg_rev"
    },
    {
      "func": "count_distinct",
      "column": "user",
      "as": "users"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "025dxzgx-1781475534270",
  "request_id": "025dxzgx-1781475534270",
  "computed_at": "2026-06-14T22:18:54.270Z",
  "success": true,
  "latency_ms": 0,
  "row_count": 3,
  "group_count": 2,
  "group_by": [
    "region"
  ],
  "aggregations": [
    {
      "column": null,
      "func": "count",
      "percentile": null,
      "as": "count"
    },
    {
      "column": "revenue",
      "func": "sum",
      "percentile": null,
      "as": "total_rev"
    },
    {
      "column": "revenue",
      "func": "avg",
      "percentile": null,
      "as": "avg_rev"
    },
    {
      "column": "user",
      "func": "count_distinct",
      "percentile": null,
      "as": "users"
    }
  ],
  "groups": [
    {
      "region": "us",
      "count": 2,
      "total_rev": 150,
      "avg_rev": 75,
      "users": 2
    },
    {
      "region": "eu",
      "count": 1,
      "total_rev": 30,
      "avg_rev": 30,
      "users": 1
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "aggregation": 1
  },
  "recommended_actions_priority_order": [
    "Aggregated 3 row(s) into 2 group(s) by [region] with 4 function(s).",
    "Persist the grouped rows or chain to data-profiler / data-drift-detector on the output."
  ],
  "chain_to": [
    {
      "api": "data-profiler",
      "reason": "Profile the aggregated output to sanity-check distributions."
    },
    {
      "api": "data-drift-detector",
      "reason": "Compare this aggregate against a prior period to detect shifts."
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

### POST /lookup (median + percentile, no group_by → reasoning block)
Request:
```json
{
  "rows": [
    {
      "latency": 10
    },
    {
      "latency": 20
    },
    {
      "latency": 30
    },
    {
      "latency": 40
    },
    {
      "latency": 100
    }
  ],
  "aggregations": [
    {
      "func": "median",
      "column": "latency",
      "as": "p50"
    },
    {
      "func": "percentile",
      "column": "latency",
      "percentile": 95,
      "as": "p95"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "eswwepoq-1781475534272",
  "request_id": "eswwepoq-1781475534272",
  "computed_at": "2026-06-14T22:18:54.272Z",
  "success": true,
  "latency_ms": 0,
  "row_count": 5,
  "group_count": 1,
  "group_by": [],
  "aggregations": [
    {
      "column": "latency",
      "func": "median",
      "percentile": null,
      "as": "p50"
    },
    {
      "column": "latency",
      "func": "percentile",
      "percentile": 95,
      "as": "p95"
    }
  ],
  "groups": [
    {
      "p50": 30,
      "p95": 88
    }
  ],
  "reasoning": {
    "why_result_generated": "Grouped 5 row(s) by [global] into 1 group(s); computed 2 aggregation(s).",
    "key_factors": [
      "Group keys: (whole dataset).",
      "Aggregations: p50, p95.",
      "Groups produced: 1."
    ],
    "invalidators": [
      "Numeric aggregations (sum/avg/min/max/median/percentile) parse numeric strings and ignore missing/non-numeric values; a group with no numeric values returns null for that aggregation.",
      "count counts all rows in the group; count_distinct and column-based functions count only non-missing values.",
      "percentile uses linear interpolation between order statistics (same convention as the profiler); group_by=[] aggregates the whole dataset into one group."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "aggregation": 1
  },
  "recommended_actions_priority_order": [
    "Aggregated 5 row(s) into 1 group(s) by [(none — global)] with 2 function(s).",
    "Persist the grouped rows or chain to data-profiler / data-drift-detector on the output."
  ],
  "chain_to": [
    {
      "api": "data-profiler",
      "reason": "Profile the aggregated output to sanity-check distributions."
    },
    {
      "api": "data-drift-detector",
      "reason": "Compare this aggregate against a prior period to detect shifts."
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

### POST /aggregate (column all-null → null result, no div-by-zero)
Request:
```json
{
  "rows": [
    {
      "x": null
    },
    {
      "x": null
    }
  ],
  "aggregations": [
    {
      "func": "avg",
      "column": "x",
      "as": "avg_x"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "ttrqib3z-1781475534274",
  "request_id": "ttrqib3z-1781475534274",
  "computed_at": "2026-06-14T22:18:54.274Z",
  "success": true,
  "latency_ms": 0,
  "row_count": 2,
  "group_count": 1,
  "group_by": [],
  "aggregations": [
    {
      "column": "x",
      "func": "avg",
      "percentile": null,
      "as": "avg_x"
    }
  ],
  "groups": [
    {
      "avg_x": null
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "aggregation": 1
  },
  "recommended_actions_priority_order": [
    "Aggregated 2 row(s) into 1 group(s) by [(none — global)] with 1 function(s).",
    "Persist the grouped rows or chain to data-profiler / data-drift-detector on the output."
  ],
  "chain_to": [
    {
      "api": "data-profiler",
      "reason": "Profile the aggregated output to sanity-check distributions."
    },
    {
      "api": "data-drift-detector",
      "reason": "Compare this aggregate against a prior period to detect shifts."
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

### POST /aggregate (error: unknown func)
Request:
```json
{
  "rows": [
    {
      "a": 1
    }
  ],
  "aggregations": [
    {
      "func": "bogus",
      "column": "a"
    }
  ]
}
```
Response (HTTP 400):
```json
{
  "trace_id": "nqtxciza-1781475534275",
  "request_id": "nqtxciza-1781475534275",
  "computed_at": "2026-06-14T22:18:54.275Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "aggregations[0].func must be one of: count, count_distinct, sum, avg, min, max, median, percentile."
  }
}
```

---

# data-classification

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';
import { parseRows, columnsOf, isMissing, asNum, asKey, inferType, Row } from '../../_aplus/dataset';

// Deterministic data classifier. For each column, infers a semantic type
// (email/phone/url/ip/uuid/credit_card/ssn/zip/date/datetime/currency/boolean/
// integer/number/json/free_text) and a PII flag/category from regex + checksum
// heuristics over the values. No LLM, nothing stored. Heuristic — see invalidators.

const router = Router();
const MATCH_THRESHOLD = 0.8;
const MAX_SAMPLE = 2000;

interface Detector { type: string; pii: boolean; pii_category: string | null; test: (s: string) => boolean; }

function luhnOk(s: string): boolean {
  const d = s.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(d)) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}
function ipv4Ok(s: string): boolean {
  const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  return !!m && m.slice(1).every((o) => Number(o) <= 255);
}

// Precedence: most specific first. First detector at/above threshold wins.
const DETECTORS: Detector[] = [
  { type: 'uuid', pii: false, pii_category: null, test: (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) },
  { type: 'email', pii: true, pii_category: 'contact', test: (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) },
  { type: 'url', pii: false, pii_category: null, test: (s) => /^https?:\/\/[^\s]+$/i.test(s) },
  { type: 'ipv4', pii: true, pii_category: 'network_identifier', test: ipv4Ok },
  { type: 'credit_card', pii: true, pii_category: 'financial', test: luhnOk },
  { type: 'ssn', pii: true, pii_category: 'national_id', test: (s) => /^\d{3}-\d{2}-\d{4}$/.test(s) },
  { type: 'zip_code', pii: false, pii_category: null, test: (s) => /^\d{5}(-\d{4})?$/.test(s) },
  { type: 'phone', pii: true, pii_category: 'contact', test: (s) => /^\+?[\d\s().-]{7,}$/.test(s) && (s.replace(/\D/g, '').length >= 7 && s.replace(/\D/g, '').length <= 15) },
  { type: 'datetime', pii: false, pii_category: null, test: (s) => /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s) && !Number.isNaN(Date.parse(s)) },
  { type: 'date', pii: false, pii_category: null, test: (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) },
  { type: 'currency', pii: false, pii_category: null, test: (s) => /^[$€£¥]\s?\d[\d,]*(\.\d+)?$/.test(s) },
  { type: 'boolean', pii: false, pii_category: null, test: (s) => /^(true|false|yes|no)$/i.test(s) },
  { type: 'integer', pii: false, pii_category: null, test: (s) => { const n = asNum(s); return n !== null && Number.isInteger(n); } },
  { type: 'number', pii: false, pii_category: null, test: (s) => asNum(s) !== null },
  { type: 'json', pii: false, pii_category: null, test: (s) => { const t = s.trim(); if (!/^[[{]/.test(t)) return false; try { JSON.parse(t); return true; } catch { return false; } } },
];

export interface ColumnClass {
  column: string;
  inferred_type: string;
  semantic_type: string;
  pii: boolean;
  pii_category: string | null;
  match_rate: number;
  sample_size: number;
  distinct_count: number;
  column_name_hint_used: boolean;
}
export interface ClassifyCore {
  row_count: number;
  column_count: number;
  pii_column_count: number;
  pii_columns: string[];
  name_hint_used_count: number;
  columns: ColumnClass[];
}

// Column-name → semantic-type hints. Used ONLY to lower the match threshold when
// value-first detection finds no winner; the sampled values must still corroborate
// the hinted type (>= HINT_THRESHOLD) so a name never fabricates a type the data
// contradicts. Most specific names first.
const NAME_HINTS: { re: RegExp; type: string }[] = [
  { re: /datetime|timestamp/i, type: 'datetime' },
  { re: /(^|[_\s])date([_\s]|$)|_at$|_on$|_dt$|birth|dob/i, type: 'date' },
  { re: /e[-_\s]?mail/i, type: 'email' },
  { re: /phone|mobile|telephone|msisdn|(^|[_\s])tel([_\s]|$)/i, type: 'phone' },
  { re: /ssn|social[-_\s]?security/i, type: 'ssn' },
  { re: /uuid|guid/i, type: 'uuid' },
  { re: /url|link|href|website/i, type: 'url' },
  { re: /(^|[_\s])ip([_\s]|$)|ip[-_\s]?addr/i, type: 'ipv4' },
  { re: /credit[-_\s]?card|card[-_\s]?(no|num|number)|(^|[_\s])ccn?([_\s]|$)/i, type: 'credit_card' },
  { re: /zip|postal/i, type: 'zip_code' },
];
const HINT_THRESHOLD = 0.5;
const DETECTOR_BY_TYPE = new Map(DETECTORS.map((d) => [d.type, d]));

function classifyColumn(col: string, rows: Row[], useHints: boolean): ColumnClass {
  const present = rows.map((r) => r[col]).filter((v) => !isMissing(v, false));
  const sample = present.slice(0, MAX_SAMPLE);
  const strs = sample.map((v) => String(v).trim());
  const distinct = new Set(present.map(asKey)).size;
  let best: { d: Detector; rate: number } | null = null;
  if (strs.length > 0) {
    for (const d of DETECTORS) {
      let m = 0;
      for (const s of strs) if (d.test(s)) m++;
      const rate = m / strs.length;
      if (rate >= MATCH_THRESHOLD) { best = { d, rate }; break; }
    }
  }
  const inferred = inferType(present);
  if (best) {
    return {
      column: col, inferred_type: inferred, semantic_type: best.d.type,
      pii: best.d.pii, pii_category: best.d.pii_category,
      match_rate: round(best.rate, 4), sample_size: strs.length, distinct_count: distinct,
      column_name_hint_used: false,
    };
  }
  // Value-first found no winner. Fall back to a column-name hint IF the values still
  // corroborate the hinted type at >= HINT_THRESHOLD (never fabricate from the name alone).
  if (useHints && strs.length > 0) {
    const hint = NAME_HINTS.find((h) => h.re.test(col));
    const d = hint && DETECTOR_BY_TYPE.get(hint.type);
    if (d) {
      let m = 0;
      for (const s of strs) if (d.test(s)) m++;
      const rate = m / strs.length;
      if (rate >= HINT_THRESHOLD) {
        return {
          column: col, inferred_type: inferred, semantic_type: d.type,
          pii: d.pii, pii_category: d.pii_category,
          match_rate: round(rate, 4), sample_size: strs.length, distinct_count: distinct,
          column_name_hint_used: true,
        };
      }
    }
  }
  return { column: col, inferred_type: inferred, semantic_type: strs.length ? 'free_text' : 'empty', pii: false, pii_category: null, match_rate: 0, sample_size: strs.length, distinct_count: distinct, column_name_hint_used: false };
}

function classify(body: any): { error: string } | { result: ClassifyCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "rows" array.' };
  const p = parseRows(body.rows);
  if ('error' in p) return p;
  const cols = columnsOf(p.rows, body.columns);
  if (cols.length === 0) return { error: 'No columns found in the dataset.' };
  if (body.use_column_name_hints !== undefined && typeof body.use_column_name_hints !== 'boolean') return { error: '"use_column_name_hints" must be a boolean.' };
  const useHints = body.use_column_name_hints === undefined ? true : body.use_column_name_hints;
  const columns = cols.map((c) => classifyColumn(c, p.rows, useHints));
  const piiCols = columns.filter((c) => c.pii).map((c) => c.column);
  const hintCount = columns.filter((c) => c.column_name_hint_used).length;
  return { result: { row_count: p.rows.length, column_count: cols.length, pii_column_count: piiCols.length, pii_columns: piiCols, name_hint_used_count: hintCount, columns } };
}

const CHAIN_TO = [
  { api: 'data-quality-rules', reason: 'Turn semantic types into regex/format validation rules.' },
  { api: 'data-normalizer', reason: 'Canonicalize detected emails/phones/dates before storage.' },
];
const INVALIDATORS = [
  'Classification is heuristic (regex + Luhn checksum), not authoritative: a 9-digit id can read as a phone, and free-form text columns may be mislabeled. Verify before acting on PII flags.',
  'A column is labeled only if at least 80% of sampled non-missing values match a detector; columns are sampled to the first 2000 values for speed.',
  'PII detection finds format-based identifiers (email/phone/ssn/credit_card/ip) only — it does NOT detect names, addresses, or free-text PII, so absence of a flag is not proof a column is PII-free.',
  'Detection is value-first. column_name_hint_used=true means value matching fell below 80% but the column NAME hinted a type AND >=50% of values still matched it; treat those labels as lower-confidence (see match_rate). Set use_column_name_hints=false to disable.',
];

function actions(r: ClassifyCore): string[] {
  const out: string[] = [];
  if (r.pii_column_count > 0) out.push(`${r.pii_column_count} likely-PII column(s): ${r.pii_columns.join(', ')} — review handling/encryption/retention before storing.`);
  else out.push('No format-based PII columns detected (note: names/addresses/free-text PII are not detected).');
  if (r.name_hint_used_count > 0) out.push(`${r.name_hint_used_count} column(s) labeled via a column-name hint (value match <80%, >=50%) — verify these before acting; set use_column_name_hints=false to disable.`);
  out.push('Use the semantic types to generate validation rules (chain to data-quality-rules).');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Classification API', version: '1.0.0',
    description: 'Deterministic data classifier. Infers a per-column semantic type and PII flag/category from regex and checksum heuristics over the values. Heuristic, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-classification/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/classify', summary: 'Classify dataset columns (semantic + PII)', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL classify + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/classify', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

// Confidence reflects the heuristic nature: detection is regex/checksum based, not
// authoritative, and PII coverage is format-only (see INVALIDATORS).
const TAIL = (_r: ClassifyCore) => {
  // Name-hint labels are below the value-match threshold → lower classification confidence.
  const classification = _r.name_hint_used_count > 0 ? 0.7 : 0.85;
  return {
    confidence_score: Math.min(0.8, classification), confidence_per_section: { classification, pii_detection: 0.8 },
    recommended_actions_priority_order: actions(_r),
    chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  };
};

router.post('/classify', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = classify(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = classify(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Classified ${v.column_count} column(s) over ${v.row_count} row(s); ${v.pii_column_count} flagged as likely PII.`,
      key_factors: v.columns.map((c) => `${c.column}: ${c.semantic_type}${c.pii ? ` [PII:${c.pii_category}]` : ''} (match ${c.match_rate}).`),
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema } from '../../_aplus/specparts';

const SEMANTIC_ENUM = ['uuid', 'email', 'url', 'ipv4', 'credit_card', 'ssn', 'zip_code', 'phone', 'datetime', 'date', 'currency', 'boolean', 'integer', 'number', 'json', 'free_text', 'empty'];
const INFERRED_ENUM = ['empty', 'boolean', 'integer', 'number', 'date', 'string'];
const Row = rowSchema();
const ColumnClass = {
  type: 'object',
  required: ['column', 'inferred_type', 'semantic_type', 'pii', 'pii_category', 'match_rate', 'sample_size', 'distinct_count'],
  additionalProperties: false,
  properties: {
    column: { type: 'string' },
    inferred_type: { type: 'string', enum: INFERRED_ENUM },
    semantic_type: { type: 'string', enum: SEMANTIC_ENUM },
    pii: { type: 'boolean' },
    pii_category: { type: ['string', 'null'], enum: ['contact', 'network_identifier', 'financial', 'national_id', null] },
    match_rate: { type: 'number', minimum: 0, maximum: 1 },
    sample_size: { type: 'integer', minimum: 0 },
    distinct_count: { type: 'integer', minimum: 0 },
    column_name_hint_used: { type: 'boolean', description: 'True when value matching fell below the 80% threshold but the column NAME hinted this type and >=50% of values still matched it (lower-confidence label — see match_rate).' },
  },
};
const ClassifyCore = {
  type: 'object', required: ['row_count', 'column_count', 'pii_column_count', 'pii_columns', 'name_hint_used_count', 'columns'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    column_count: { type: 'integer', minimum: 0 },
    pii_column_count: { type: 'integer', minimum: 0 },
    pii_columns: { type: 'array', items: { type: 'string' } },
    name_hint_used_count: { type: 'integer', minimum: 0, description: 'Number of columns labeled via a column-name hint rather than value-first detection.' },
    columns: { type: 'array', items: ColumnClass },
  },
};
const ClassifyRequest = {
  type: 'object', required: ['rows'], additionalProperties: false,
  properties: {
    rows: { type: 'array', items: Row, minItems: 1, description: 'Dataset rows to classify.' },
    columns: { type: 'array', items: { type: 'string' }, description: 'Optional explicit column list (default: union of row keys).' },
    use_column_name_hints: { type: 'boolean', description: 'Allow column-name hints to label a column when value matching is below threshold but >=50% of values still corroborate (default true). Set false for value-only classification.' },
  },
};

const CORE = {
  row_count: 3, column_count: 4, pii_column_count: 2, pii_columns: ['email', 'phone'], name_hint_used_count: 0,
  columns: [
    { column: 'email', inferred_type: 'string', semantic_type: 'email', pii: true, pii_category: 'contact', match_rate: 1, sample_size: 3, distinct_count: 3, column_name_hint_used: false },
    { column: 'phone', inferred_type: 'string', semantic_type: 'phone', pii: true, pii_category: 'contact', match_rate: 1, sample_size: 3, distinct_count: 3, column_name_hint_used: false },
    { column: 'age', inferred_type: 'integer', semantic_type: 'integer', pii: false, pii_category: null, match_rate: 1, sample_size: 3, distinct_count: 3, column_name_hint_used: false },
    { column: 'note', inferred_type: 'string', semantic_type: 'free_text', pii: false, pii_category: null, match_rate: 0, sample_size: 3, distinct_count: 3, column_name_hint_used: false },
  ],
};
const CHAIN = [
  { api: 'data-quality-rules', reason: 'Turn semantic types into regex/format validation rules.' },
  { api: 'data-normalizer', reason: 'Canonicalize detected emails/phones/dates before storage.' },
];
const INVALIDATORS = [
  'Classification is heuristic (regex + Luhn checksum), not authoritative: a 9-digit id can read as a phone, and free-form text columns may be mislabeled. Verify before acting on PII flags.',
  'A column is labeled only if at least 80% of sampled non-missing values match a detector; columns are sampled to the first 2000 values for speed.',
  'PII detection finds format-based identifiers (email/phone/ssn/credit_card/ip) only — it does NOT detect names, addresses, or free-text PII, so absence of a flag is not proof a column is PII-free.',
  'Detection is value-first. column_name_hint_used=true means value matching fell below 80% but the column NAME hinted a type AND >=50% of values still matched it; treat those labels as lower-confidence (see match_rate). Set use_column_name_hints=false to disable.',
];
const TAIL = {
  confidence_score: 0.8, confidence_per_section: { classification: 0.85, pii_detection: 0.8 },
  recommended_actions_priority_order: [
    '2 likely-PII column(s): email, phone — review handling/encryption/retention before storing.',
    'Use the semantic types to generate validation rules (chain to data-quality-rules).',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('classification', 'pii_detection'), _Tail: Tail,
  ColumnClass, ClassifyCore, ClassifyRequest, DiscoveryResponse: discoverySchema(),
  ClassifyResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ClassifyCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ClassifyCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dcl-1780000000000', request_id: 'dcl-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  rows: [
    { email: 'a@x.com', phone: '555-123-4567', age: '30', note: 'hello world' },
    { email: 'b@y.com', phone: '555-987-6543', age: '41', note: 'foo bar baz' },
    { email: 'c@z.com', phone: '555-111-2222', age: '22', note: 'lorem ipsum' },
  ],
};
const disc = {
  name: 'Data Classification API', version: '1.0.0',
  description: 'Deterministic data classifier. Infers a per-column semantic type and PII flag/category from regex and checksum heuristics over the values. Heuristic, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-classification/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/classify', summary: 'Classify dataset columns (semantic + PII)', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL classify + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/classify', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/classify', summary: 'Classify dataset columns (semantic + PII)', operationId: 'classify', priceUsdc: 0.007,
    requestSchemaRef: 'ClassifyRequest', responseSchemaRef: 'ClassifyResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL classify + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'ClassifyRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Classified 4 column(s) over 3 row(s); 2 flagged as likely PII.',
        key_factors: ['email: email [PII:contact] (match 1).', 'phone: phone [PII:contact] (match 1).', 'age: integer (match 1).', 'note: free_text (match 0).'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-classification', title: 'Data Classification API', version: '1.0.0',
  description: 'Deterministic data classifier — per-column semantic type + PII flag from regex/checksum heuristics. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /data-classification/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Data Classification API",
    "version": "1.0.0",
    "description": "Deterministic data classifier — per-column semantic type + PII flag from regex/checksum heuristics. No LLM.",
    "x-agent-callable": true,
    "x-mcp-compatible": true,
    "x402-compatible": true,
    "x-agent-marketplace-ready": true,
    "x-pay-per-call-optimized": true,
    "x-data-quality": true,
    "x-human-approval-required": false
  },
  "servers": [
    {
      "url": "https://orbis-apis.onrender.com/data-classification"
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
                  "name": "Data Classification API",
                  "version": "1.0.0",
                  "description": "Deterministic data classifier. Infers a per-column semantic type and PII flag/category from regex and checksum heuristics over the values. Heuristic, no LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/data-classification/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/classify",
                      "summary": "Classify dataset columns (semantic + PII)",
                      "price_usdc": 0.007
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL classify + reasoning",
                      "price_usdc": 0.012
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/classify",
                      "price_usdc": 0.007,
                      "currency": "USDC"
                    },
                    {
                      "path": "/lookup",
                      "price_usdc": 0.012,
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
    "/classify": {
      "post": {
        "operationId": "classify",
        "summary": "Classify dataset columns (semantic + PII)",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ClassifyResponse"
                },
                "example": {
                  "trace_id": "dcl-1780000000000",
                  "request_id": "dcl-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "row_count": 3,
                  "column_count": 4,
                  "pii_column_count": 2,
                  "pii_columns": [
                    "email",
                    "phone"
                  ],
                  "name_hint_used_count": 0,
                  "columns": [
                    {
                      "column": "email",
                      "inferred_type": "string",
                      "semantic_type": "email",
                      "pii": true,
                      "pii_category": "contact",
                      "match_rate": 1,
                      "sample_size": 3,
                      "distinct_count": 3,
                      "column_name_hint_used": false
                    },
                    {
                      "column": "phone",
                      "inferred_type": "string",
                      "semantic_type": "phone",
                      "pii": true,
                      "pii_category": "contact",
                      "match_rate": 1,
                      "sample_size": 3,
                      "distinct_count": 3,
                      "column_name_hint_used": false
                    },
                    {
                      "column": "age",
                      "inferred_type": "integer",
                      "semantic_type": "integer",
                      "pii": false,
                      "pii_category": null,
                      "match_rate": 1,
                      "sample_size": 3,
                      "distinct_count": 3,
                      "column_name_hint_used": false
                    },
                    {
                      "column": "note",
                      "inferred_type": "string",
                      "semantic_type": "free_text",
                      "pii": false,
                      "pii_category": null,
                      "match_rate": 0,
                      "sample_size": 3,
                      "distinct_count": 3,
                      "column_name_hint_used": false
                    }
                  ],
                  "confidence_score": 0.8,
                  "confidence_per_section": {
                    "classification": 0.85,
                    "pii_detection": 0.8
                  },
                  "recommended_actions_priority_order": [
                    "2 likely-PII column(s): email, phone — review handling/encryption/retention before storing.",
                    "Use the semantic types to generate validation rules (chain to data-quality-rules)."
                  ],
                  "chain_to": [
                    {
                      "api": "data-quality-rules",
                      "reason": "Turn semantic types into regex/format validation rules."
                    },
                    {
                      "api": "data-normalizer",
                      "reason": "Canonicalize detected emails/phones/dates before storage."
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
                "$ref": "#/components/schemas/ClassifyRequest"
              },
              "example": {
                "rows": [
                  {
                    "email": "a@x.com",
                    "phone": "555-123-4567",
                    "age": "30",
                    "note": "hello world"
                  },
                  {
                    "email": "b@y.com",
                    "phone": "555-987-6543",
                    "age": "41",
                    "note": "foo bar baz"
                  },
                  {
                    "email": "c@z.com",
                    "phone": "555-111-2222",
                    "age": "22",
                    "note": "lorem ipsum"
                  }
                ]
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
        "summary": "ONE-CALL classify + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "dcl-1780000000000",
                  "request_id": "dcl-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "row_count": 3,
                  "column_count": 4,
                  "pii_column_count": 2,
                  "pii_columns": [
                    "email",
                    "phone"
                  ],
                  "name_hint_used_count": 0,
                  "columns": [
                    {
                      "column": "email",
                      "inferred_type": "string",
                      "semantic_type": "email",
                      "pii": true,
                      "pii_category": "contact",
                      "match_rate": 1,
                      "sample_size": 3,
                      "distinct_count": 3,
                      "column_name_hint_used": false
                    },
                    {
                      "column": "phone",
                      "inferred_type": "string",
                      "semantic_type": "phone",
                      "pii": true,
                      "pii_category": "contact",
                      "match_rate": 1,
                      "sample_size": 3,
                      "distinct_count": 3,
                      "column_name_hint_used": false
                    },
                    {
                      "column": "age",
                      "inferred_type": "integer",
                      "semantic_type": "integer",
                      "pii": false,
                      "pii_category": null,
                      "match_rate": 1,
                      "sample_size": 3,
                      "distinct_count": 3,
                      "column_name_hint_used": false
                    },
                    {
                      "column": "note",
                      "inferred_type": "string",
                      "semantic_type": "free_text",
                      "pii": false,
                      "pii_category": null,
                      "match_rate": 0,
                      "sample_size": 3,
                      "distinct_count": 3,
                      "column_name_hint_used": false
                    }
                  ],
                  "reasoning": {
                    "why_result_generated": "Classified 4 column(s) over 3 row(s); 2 flagged as likely PII.",
                    "key_factors": [
                      "email: email [PII:contact] (match 1).",
                      "phone: phone [PII:contact] (match 1).",
                      "age: integer (match 1).",
                      "note: free_text (match 0)."
                    ],
                    "invalidators": [
                      "Classification is heuristic (regex + Luhn checksum), not authoritative: a 9-digit id can read as a phone, and free-form text columns may be mislabeled. Verify before acting on PII flags.",
                      "A column is labeled only if at least 80% of sampled non-missing values match a detector; columns are sampled to the first 2000 values for speed.",
                      "PII detection finds format-based identifiers (email/phone/ssn/credit_card/ip) only — it does NOT detect names, addresses, or free-text PII, so absence of a flag is not proof a column is PII-free.",
                      "Detection is value-first. column_name_hint_used=true means value matching fell below 80% but the column NAME hinted a type AND >=50% of values still matched it; treat those labels as lower-confidence (see match_rate). Set use_column_name_hints=false to disable."
                    ]
                  },
                  "confidence_score": 0.8,
                  "confidence_per_section": {
                    "classification": 0.85,
                    "pii_detection": 0.8
                  },
                  "recommended_actions_priority_order": [
                    "2 likely-PII column(s): email, phone — review handling/encryption/retention before storing.",
                    "Use the semantic types to generate validation rules (chain to data-quality-rules)."
                  ],
                  "chain_to": [
                    {
                      "api": "data-quality-rules",
                      "reason": "Turn semantic types into regex/format validation rules."
                    },
                    {
                      "api": "data-normalizer",
                      "reason": "Canonicalize detected emails/phones/dates before storage."
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
                "$ref": "#/components/schemas/ClassifyRequest"
              },
              "example": {
                "rows": [
                  {
                    "email": "a@x.com",
                    "phone": "555-123-4567",
                    "age": "30",
                    "note": "hello world"
                  },
                  {
                    "email": "b@y.com",
                    "phone": "555-987-6543",
                    "age": "41",
                    "note": "foo bar baz"
                  },
                  {
                    "email": "c@z.com",
                    "phone": "555-111-2222",
                    "age": "22",
                    "note": "lorem ipsum"
                  }
                ]
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.012,
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
          "pii_detection": {
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
      "ColumnClass": {
        "type": "object",
        "required": [
          "column",
          "inferred_type",
          "semantic_type",
          "pii",
          "pii_category",
          "match_rate",
          "sample_size",
          "distinct_count"
        ],
        "additionalProperties": false,
        "properties": {
          "column": {
            "type": "string"
          },
          "inferred_type": {
            "type": "string",
            "enum": [
              "empty",
              "boolean",
              "integer",
              "number",
              "date",
              "string"
            ]
          },
          "semantic_type": {
            "type": "string",
            "enum": [
              "uuid",
              "email",
              "url",
              "ipv4",
              "credit_card",
              "ssn",
              "zip_code",
              "phone",
              "datetime",
              "date",
              "currency",
              "boolean",
              "integer",
              "number",
              "json",
              "free_text",
              "empty"
            ]
          },
          "pii": {
            "type": "boolean"
          },
          "pii_category": {
            "type": [
              "string",
              "null"
            ],
            "enum": [
              "contact",
              "network_identifier",
              "financial",
              "national_id",
              null
            ]
          },
          "match_rate": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "sample_size": {
            "type": "integer",
            "minimum": 0
          },
          "distinct_count": {
            "type": "integer",
            "minimum": 0
          },
          "column_name_hint_used": {
            "type": "boolean",
            "description": "True when value matching fell below the 80% threshold but the column NAME hinted this type and >=50% of values still matched it (lower-confidence label — see match_rate)."
          }
        }
      },
      "ClassifyCore": {
        "type": "object",
        "required": [
          "row_count",
          "column_count",
          "pii_column_count",
          "pii_columns",
          "name_hint_used_count",
          "columns"
        ],
        "properties": {
          "row_count": {
            "type": "integer",
            "minimum": 0
          },
          "column_count": {
            "type": "integer",
            "minimum": 0
          },
          "pii_column_count": {
            "type": "integer",
            "minimum": 0
          },
          "pii_columns": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "name_hint_used_count": {
            "type": "integer",
            "minimum": 0,
            "description": "Number of columns labeled via a column-name hint rather than value-first detection."
          },
          "columns": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "column",
                "inferred_type",
                "semantic_type",
                "pii",
                "pii_category",
                "match_rate",
                "sample_size",
                "distinct_count"
              ],
              "additionalProperties": false,
              "properties": {
                "column": {
                  "type": "string"
                },
                "inferred_type": {
                  "type": "string",
                  "enum": [
                    "empty",
                    "boolean",
                    "integer",
                    "number",
                    "date",
                    "string"
                  ]
                },
                "semantic_type": {
                  "type": "string",
                  "enum": [
                    "uuid",
                    "email",
                    "url",
                    "ipv4",
                    "credit_card",
                    "ssn",
                    "zip_code",
                    "phone",
                    "datetime",
                    "date",
                    "currency",
                    "boolean",
                    "integer",
                    "number",
                    "json",
                    "free_text",
                    "empty"
                  ]
                },
                "pii": {
                  "type": "boolean"
                },
                "pii_category": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "contact",
                    "network_identifier",
                    "financial",
                    "national_id",
                    null
                  ]
                },
                "match_rate": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1
                },
                "sample_size": {
                  "type": "integer",
                  "minimum": 0
                },
                "distinct_count": {
                  "type": "integer",
                  "minimum": 0
                },
                "column_name_hint_used": {
                  "type": "boolean",
                  "description": "True when value matching fell below the 80% threshold but the column NAME hinted this type and >=50% of values still matched it (lower-confidence label — see match_rate)."
                }
              }
            }
          }
        }
      },
      "ClassifyRequest": {
        "type": "object",
        "required": [
          "rows"
        ],
        "additionalProperties": false,
        "properties": {
          "rows": {
            "type": "array",
            "items": {
              "type": "object",
              "description": "A dataset row as a flat JSON object (column → value).",
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
            "minItems": 1,
            "description": "Dataset rows to classify."
          },
          "columns": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Optional explicit column list (default: union of row keys)."
          },
          "use_column_name_hints": {
            "type": "boolean",
            "description": "Allow column-name hints to label a column when value matching is below threshold but >=50% of values still corroborate (default true). Set false for value-only classification."
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
      "ClassifyResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/ClassifyCore"
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
            "$ref": "#/components/schemas/ClassifyCore"
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
### POST /classify (email/phone/uuid/credit_card detection + PII flags)
Request:
```json
{
  "rows": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "a@x.com",
      "card": "4111 1111 1111 1111",
      "note": "hello there friend"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "b@y.org",
      "card": "5500 0000 0000 0004",
      "note": "just a comment"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "yavcyhlj-1781475534282",
  "request_id": "yavcyhlj-1781475534282",
  "computed_at": "2026-06-14T22:18:54.282Z",
  "success": true,
  "latency_ms": 3,
  "row_count": 2,
  "column_count": 4,
  "pii_column_count": 2,
  "pii_columns": [
    "email",
    "card"
  ],
  "name_hint_used_count": 0,
  "columns": [
    {
      "column": "id",
      "inferred_type": "string",
      "semantic_type": "uuid",
      "pii": false,
      "pii_category": null,
      "match_rate": 1,
      "sample_size": 2,
      "distinct_count": 2,
      "column_name_hint_used": false
    },
    {
      "column": "email",
      "inferred_type": "string",
      "semantic_type": "email",
      "pii": true,
      "pii_category": "contact",
      "match_rate": 1,
      "sample_size": 2,
      "distinct_count": 2,
      "column_name_hint_used": false
    },
    {
      "column": "card",
      "inferred_type": "string",
      "semantic_type": "credit_card",
      "pii": true,
      "pii_category": "financial",
      "match_rate": 1,
      "sample_size": 2,
      "distinct_count": 2,
      "column_name_hint_used": false
    },
    {
      "column": "note",
      "inferred_type": "string",
      "semantic_type": "free_text",
      "pii": false,
      "pii_category": null,
      "match_rate": 0,
      "sample_size": 2,
      "distinct_count": 2,
      "column_name_hint_used": false
    }
  ],
  "confidence_score": 0.8,
  "confidence_per_section": {
    "classification": 0.85,
    "pii_detection": 0.8
  },
  "recommended_actions_priority_order": [
    "2 likely-PII column(s): email, card — review handling/encryption/retention before storing.",
    "Use the semantic types to generate validation rules (chain to data-quality-rules)."
  ],
  "chain_to": [
    {
      "api": "data-quality-rules",
      "reason": "Turn semantic types into regex/format validation rules."
    },
    {
      "api": "data-normalizer",
      "reason": "Canonicalize detected emails/phones/dates before storage."
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

### POST /lookup (ssn/ipv4/date + free_text fallback → reasoning block)
Request:
```json
{
  "rows": [
    {
      "ssn": "123-45-6789",
      "ip": "192.168.1.1",
      "born": "1990-05-01",
      "bio": "a longer free text description here"
    },
    {
      "ssn": "987-65-4321",
      "ip": "10.0.0.255",
      "born": "1985-12-31",
      "bio": "another descriptive sentence value"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "w5znf0cd-1781475534286",
  "request_id": "w5znf0cd-1781475534286",
  "computed_at": "2026-06-14T22:18:54.286Z",
  "success": true,
  "latency_ms": 1,
  "row_count": 2,
  "column_count": 4,
  "pii_column_count": 3,
  "pii_columns": [
    "ssn",
    "ip",
    "born"
  ],
  "name_hint_used_count": 0,
  "columns": [
    {
      "column": "ssn",
      "inferred_type": "string",
      "semantic_type": "ssn",
      "pii": true,
      "pii_category": "national_id",
      "match_rate": 1,
      "sample_size": 2,
      "distinct_count": 2,
      "column_name_hint_used": false
    },
    {
      "column": "ip",
      "inferred_type": "string",
      "semantic_type": "ipv4",
      "pii": true,
      "pii_category": "network_identifier",
      "match_rate": 1,
      "sample_size": 2,
      "distinct_count": 2,
      "column_name_hint_used": false
    },
    {
      "column": "born",
      "inferred_type": "date",
      "semantic_type": "phone",
      "pii": true,
      "pii_category": "contact",
      "match_rate": 1,
      "sample_size": 2,
      "distinct_count": 2,
      "column_name_hint_used": false
    },
    {
      "column": "bio",
      "inferred_type": "string",
      "semantic_type": "free_text",
      "pii": false,
      "pii_category": null,
      "match_rate": 0,
      "sample_size": 2,
      "distinct_count": 2,
      "column_name_hint_used": false
    }
  ],
  "reasoning": {
    "why_result_generated": "Classified 4 column(s) over 2 row(s); 3 flagged as likely PII.",
    "key_factors": [
      "ssn: ssn [PII:national_id] (match 1).",
      "ip: ipv4 [PII:network_identifier] (match 1).",
      "born: phone [PII:contact] (match 1).",
      "bio: free_text (match 0)."
    ],
    "invalidators": [
      "Classification is heuristic (regex + Luhn checksum), not authoritative: a 9-digit id can read as a phone, and free-form text columns may be mislabeled. Verify before acting on PII flags.",
      "A column is labeled only if at least 80% of sampled non-missing values match a detector; columns are sampled to the first 2000 values for speed.",
      "PII detection finds format-based identifiers (email/phone/ssn/credit_card/ip) only — it does NOT detect names, addresses, or free-text PII, so absence of a flag is not proof a column is PII-free.",
      "Detection is value-first. column_name_hint_used=true means value matching fell below 80% but the column NAME hinted a type AND >=50% of values still matched it; treat those labels as lower-confidence (see match_rate). Set use_column_name_hints=false to disable."
    ]
  },
  "confidence_score": 0.8,
  "confidence_per_section": {
    "classification": 0.85,
    "pii_detection": 0.8
  },
  "recommended_actions_priority_order": [
    "3 likely-PII column(s): ssn, ip, born — review handling/encryption/retention before storing.",
    "Use the semantic types to generate validation rules (chain to data-quality-rules)."
  ],
  "chain_to": [
    {
      "api": "data-quality-rules",
      "reason": "Turn semantic types into regex/format validation rules."
    },
    {
      "api": "data-normalizer",
      "reason": "Canonicalize detected emails/phones/dates before storage."
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

### POST /classify (column-name hint — "email_address" sparse values, match<80% but >=50%)
Request:
```json
{
  "rows": [
    {
      "email_address": "a@x.com"
    },
    {
      "email_address": "b@y.com"
    },
    {
      "email_address": "unknown"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "8wpu8ep2-1781475534288",
  "request_id": "8wpu8ep2-1781475534288",
  "computed_at": "2026-06-14T22:18:54.288Z",
  "success": true,
  "latency_ms": 1,
  "row_count": 3,
  "column_count": 1,
  "pii_column_count": 1,
  "pii_columns": [
    "email_address"
  ],
  "name_hint_used_count": 1,
  "columns": [
    {
      "column": "email_address",
      "inferred_type": "string",
      "semantic_type": "email",
      "pii": true,
      "pii_category": "contact",
      "match_rate": 0.6667,
      "sample_size": 3,
      "distinct_count": 3,
      "column_name_hint_used": true
    }
  ],
  "confidence_score": 0.7,
  "confidence_per_section": {
    "classification": 0.7,
    "pii_detection": 0.8
  },
  "recommended_actions_priority_order": [
    "1 likely-PII column(s): email_address — review handling/encryption/retention before storing.",
    "1 column(s) labeled via a column-name hint (value match <80%, >=50%) — verify these before acting; set use_column_name_hints=false to disable.",
    "Use the semantic types to generate validation rules (chain to data-quality-rules)."
  ],
  "chain_to": [
    {
      "api": "data-quality-rules",
      "reason": "Turn semantic types into regex/format validation rules."
    },
    {
      "api": "data-normalizer",
      "reason": "Canonicalize detected emails/phones/dates before storage."
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

### POST /classify (error: no rows)
Request:
```json
{}
```
Response (HTTP 400):
```json
{
  "trace_id": "mge1wf14-1781475534290",
  "request_id": "mge1wf14-1781475534290",
  "computed_at": "2026-06-14T22:18:54.290Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"rows\" must be an array of row objects."
  }
}
```

