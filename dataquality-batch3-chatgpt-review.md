# Data-Quality Batch 3 — ChatGPT Review Bundle (Orbis A+ catalog/lineage + scrape-data tools)

Date: 2026-06-14 · branch aplus/data-quality-batch3 · tsc clean · smoke 30/30 green

5 deterministic, STATELESS APIs (input manifest/records → computed output, nothing fetched, nothing stored, **no LLM anywhere**). Built on the shared `src/routes/_aplus/` scaffold (+ `dataset.ts` helpers).

- **data-lineage-tracker** — transform manifest (steps with input/output datasets) → lineage graph: node roles/degrees/depth, edges, sources/sinks, cycle detection, topological order.
- **data-catalog-builder** — dataset schemas (sample rows OR explicit columns) → catalog entries: typed columns, null rates, cardinality, primary-key candidates, heuristic tags.
- **scrape-data-merger** — multiple scraped record sets → dedup/merge by (composite) key with explicit conflict strategy (first/last/non_null/coalesce); reports duplicates, dropped-no-key, conflicts.
- **scrape-data-enricher** — records + deterministic rules (constant/concat/coalesce/lookup_map/regex_extract, ReDoS-guarded) → augmented records + per-rule stats.
- **scrape-data-pipeline-validator** — scrape output vs expected schema (presence/type/format) + optional selector→field coverage → per-field reports, per-record validity, 0–100 score, pass/fail.

## Carry the batch-1/2 lessons:
- NO generic `{type:"object"}` schemas — dataset rows/records use the shared typed `rowSchema()`; variant inputs (steps/rules/specs) are closed `oneOf`/`additionalProperties:false` objects.
- Confidence honesty: exact deterministic computation reports 1; any heuristic (catalog tagging/type-inference, validator score weighting) is <1 with explicit invalidators.
- Stateless + deterministic; examples equal live output (drift-guarded by smoke).

## Please grade each API (A+/A/B/...) on:
1. **Correctness** of the deterministic computation (lineage graph: roles/degrees/depth/cycle/topo; catalog: type inference, PK candidates, tags; merger: dedup, conflict detection, the four strategies; enricher: lookup/regex/coalesce semantics + ReDoS guard; validator: presence/type/format rates, per-record validity, selector health, score).
2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata; reasoning block on /lookup).
3. **Honesty** (output computed only from the request; nothing stored/fetched; heuristic sections carry <1 confidence; validator "broken selector" is a signal, not a fetched fact).
4. **OpenAPI 3.1** rigor (allOf + unevaluatedProperties:false; typed 200/400/500; oneOf variant inputs; x-pricing; requestExample replays cleanly == responseExample).
5. **Agent-usability** (clear field names, actionable recommended_actions, sensible chain_to across the data-quality fleet).
Flag any bug, graph/stat error (cycle miss, wrong topo, PK false-positive, merge conflict miscount, regex/coverage edge), input-size footgun, or schema/response drift.

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

# data-lineage-tracker

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic data lineage tracker. Given a transform manifest (ordered steps,
// each with input + output dataset names), computes the lineage graph: nodes with
// roles/degrees/depth, edges, sources/sinks, cycle detection, and a topological
// order. Pure graph computation, no LLM, nothing stored.

const router = Router();

const MAX_STEPS = 2000;

type Role = 'source' | 'intermediate' | 'sink' | 'isolated';

export interface NodeInfo { name: string; role: Role; in_degree: number; out_degree: number; depth: number; }
export interface Edge { from: string; to: string; via: string; }
export interface LineageCore {
  step_count: number;
  node_count: number;
  edge_count: number;
  sources: string[];
  sinks: string[];
  has_cycle: boolean;
  cycle: string[];
  topological_order: string[] | null;
  max_depth: number;
  nodes: NodeInfo[];
  edges: Edge[];
}

interface Step { id: string; operation: string | null; inputs: string[]; outputs: string[]; }

function parseSteps(body: any): { error: string } | { steps: Step[] } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "steps" array.' };
  if (!Array.isArray(body.steps) || body.steps.length === 0) return { error: '"steps" must be a non-empty array of transform steps.' };
  if (body.steps.length > MAX_STEPS) return { error: `"steps" exceeds the ${MAX_STEPS}-step limit.` };
  const steps: Step[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < body.steps.length; i++) {
    const s = body.steps[i];
    if (s === null || typeof s !== 'object' || Array.isArray(s)) return { error: `steps[${i}] must be an object.` };
    if (typeof s.id !== 'string' || s.id === '') return { error: `steps[${i}].id must be a non-empty string.` };
    if (ids.has(s.id)) return { error: `steps[${i}].id "${s.id}" is duplicated; step ids must be unique.` };
    ids.add(s.id);
    const strArr = (v: unknown, name: string): string[] | { error: string } => {
      if (!Array.isArray(v) || v.length === 0 || !v.every((x) => typeof x === 'string' && x !== '')) return { error: `steps[${i}].${name} must be a non-empty array of dataset-name strings.` };
      return v as string[];
    };
    const inputs = strArr(s.inputs, 'inputs');
    if ('error' in (inputs as any)) return inputs as { error: string };
    const outputs = strArr(s.outputs, 'outputs');
    if ('error' in (outputs as any)) return outputs as { error: string };
    if (s.operation !== undefined && typeof s.operation !== 'string') return { error: `steps[${i}].operation must be a string when present.` };
    steps.push({ id: s.id, operation: s.operation ?? null, inputs: inputs as string[], outputs: outputs as string[] });
  }
  return { steps };
}

function buildLineage(steps: Step[]): LineageCore {
  // Edges (deduped) + node set.
  const edgeKey = new Set<string>();
  const edges: Edge[] = [];
  const nodeSet = new Set<string>();
  const adj = new Map<string, Set<string>>(); // from -> to
  const inDeg = new Map<string, number>();
  const outDeg = new Map<string, number>();
  const touch = (n: string) => { if (!nodeSet.has(n)) { nodeSet.add(n); adj.set(n, new Set()); inDeg.set(n, 0); outDeg.set(n, 0); } };

  for (const st of steps) {
    for (const i of st.inputs) touch(i);
    for (const o of st.outputs) touch(o);
    for (const i of st.inputs) for (const o of st.outputs) {
      if (i === o) continue; // self-edge: a step reading and writing the same dataset name is not a lineage hop
      const k = `${i} ${o} ${st.id}`;
      if (edgeKey.has(k)) continue;
      edgeKey.add(k);
      edges.push({ from: i, to: o, via: st.id });
      if (!adj.get(i)!.has(o)) { adj.get(i)!.add(o); inDeg.set(o, (inDeg.get(o) || 0) + 1); outDeg.set(i, (outDeg.get(i) || 0) + 1); }
    }
  }

  const nodes = [...nodeSet];

  // Kahn topological sort over the simple graph (adj is deduped).
  const indegWork = new Map(nodes.map((n) => [n, inDeg.get(n) || 0]));
  const queue = nodes.filter((n) => (indegWork.get(n) || 0) === 0).sort();
  const topo: string[] = [];
  const depth = new Map<string, number>(nodes.map((n) => [n, 0]));
  const q = [...queue];
  while (q.length) {
    const n = q.shift()!;
    topo.push(n);
    const succ = [...adj.get(n)!].sort();
    for (const m of succ) {
      depth.set(m, Math.max(depth.get(m)!, depth.get(n)! + 1));
      indegWork.set(m, indegWork.get(m)! - 1);
      if (indegWork.get(m) === 0) q.push(m);
    }
  }
  const hasCycle = topo.length !== nodes.length;
  const cycle = hasCycle ? findCycle(nodes, adj) : [];

  const sources = nodes.filter((n) => (inDeg.get(n) || 0) === 0 && (outDeg.get(n) || 0) > 0).sort();
  const sinks = nodes.filter((n) => (outDeg.get(n) || 0) === 0 && (inDeg.get(n) || 0) > 0).sort();

  const nodeInfos: NodeInfo[] = nodes.sort().map((n) => {
    const ind = inDeg.get(n) || 0, outd = outDeg.get(n) || 0;
    const role: Role = ind === 0 && outd === 0 ? 'isolated' : ind === 0 ? 'source' : outd === 0 ? 'sink' : 'intermediate';
    return { name: n, role, in_degree: ind, out_degree: outd, depth: hasCycle ? 0 : depth.get(n)! };
  });

  const maxDepth = hasCycle ? 0 : Math.max(0, ...nodeInfos.map((n) => n.depth));

  return {
    step_count: steps.length,
    node_count: nodes.length,
    edge_count: edges.length,
    sources,
    sinks,
    has_cycle: hasCycle,
    cycle,
    topological_order: hasCycle ? null : topo,
    max_depth: maxDepth,
    nodes: nodeInfos,
    edges,
  };
}

// Returns one cycle (node path, first→...→first) via DFS, or [] if none.
function findCycle(nodes: string[], adj: Map<string, Set<string>>): string[] {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>(nodes.map((n) => [n, WHITE]));
  const stack: string[] = [];
  let found: string[] = [];
  const dfs = (u: string): boolean => {
    color.set(u, GRAY); stack.push(u);
    for (const v of [...adj.get(u)!].sort()) {
      if (found.length) return true;
      if (color.get(v) === GRAY) { const idx = stack.indexOf(v); found = [...stack.slice(idx), v]; return true; }
      if (color.get(v) === WHITE && dfs(v)) return true;
    }
    color.set(u, BLACK); stack.pop();
    return false;
  };
  for (const n of nodes.sort()) { if (color.get(n) === WHITE && dfs(n)) break; }
  return found;
}

const CHAIN_TO = [
  { api: 'data-catalog-builder', reason: 'Document the datasets (nodes) discovered in this lineage graph.' },
  { api: 'data-pipeline-quality-scorer', reason: 'Score the data flowing through the pipeline these steps describe.' },
];
const INVALIDATORS = [
  'Lineage is computed only from the supplied manifest; datasets or steps not listed are invisible (no inference of hidden dependencies).',
  'A step whose inputs and outputs share a name produces no self-edge (in-place updates are not lineage hops).',
  'When a cycle is present, topological_order is null and node depths are reported as 0 — resolve the cycle for a valid ordering.',
];

function actions(r: LineageCore): string[] {
  const out: string[] = [];
  if (r.has_cycle) out.push(`Cycle detected (${r.cycle.join(' → ')}) — the pipeline is not a DAG; break the loop before scheduling.`);
  out.push(`${r.node_count} dataset(s), ${r.edge_count} edge(s): ${r.sources.length} source(s), ${r.sinks.length} sink(s), max depth ${r.max_depth}.`);
  if (!r.has_cycle) out.push('Use topological_order as a safe execution/refresh sequence.');
  return out;
}

const TAIL = (_r: LineageCore) => ({
  confidence_score: 1, confidence_per_section: { lineage: 1 },
  recommended_actions_priority_order: actions(_r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Lineage Tracker API', version: '1.0.0',
    description: 'Deterministic data lineage tracker. Turns a transform manifest (steps with input/output datasets) into a lineage graph with roles, degrees, depth, cycle detection, and a topological order. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-lineage-tracker/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/track', summary: 'Build a lineage graph from a transform manifest', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL lineage + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/track', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/track', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseSteps(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const result = buildLineage(p.steps);
  respond(res, t0, { ...result, ...TAIL(result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseSteps(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = buildLineage(p.steps);
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Resolved ${r.step_count} step(s) into a graph of ${r.node_count} dataset(s) and ${r.edge_count} edge(s).`,
      key_factors: [
        `Sources: ${r.sources.join(', ') || '(none)'}.`,
        `Sinks: ${r.sinks.join(', ') || '(none)'}.`,
        r.has_cycle ? `Cycle: ${r.cycle.join(' → ')}.` : `Acyclic; max depth ${r.max_depth}.`,
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

const ROLE_ENUM = ['source', 'intermediate', 'sink', 'isolated'];
const NodeInfo = {
  type: 'object', required: ['name', 'role', 'in_degree', 'out_degree', 'depth'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    role: { type: 'string', enum: ROLE_ENUM },
    in_degree: { type: 'integer', minimum: 0 },
    out_degree: { type: 'integer', minimum: 0 },
    depth: { type: 'integer', minimum: 0, description: 'Longest path length from any source (0 for sources; 0 for all nodes when a cycle is present).' },
  },
};
const Edge = {
  type: 'object', required: ['from', 'to', 'via'], additionalProperties: false,
  properties: {
    from: { type: 'string', description: 'Upstream dataset.' },
    to: { type: 'string', description: 'Downstream dataset.' },
    via: { type: 'string', description: 'Step id that produced this hop.' },
  },
};
const LineageCore = {
  type: 'object',
  required: ['step_count', 'node_count', 'edge_count', 'sources', 'sinks', 'has_cycle', 'cycle', 'topological_order', 'max_depth', 'nodes', 'edges'],
  properties: {
    step_count: { type: 'integer', minimum: 0 },
    node_count: { type: 'integer', minimum: 0 },
    edge_count: { type: 'integer', minimum: 0 },
    sources: { type: 'array', items: { type: 'string' } },
    sinks: { type: 'array', items: { type: 'string' } },
    has_cycle: { type: 'boolean' },
    cycle: { type: 'array', items: { type: 'string' }, description: 'One detected cycle as a node path (first repeats at end); empty when acyclic.' },
    topological_order: { type: ['array', 'null'], items: { type: 'string' }, description: 'A valid execution order, or null when a cycle is present.' },
    max_depth: { type: 'integer', minimum: 0 },
    nodes: { type: 'array', items: NodeInfo },
    edges: { type: 'array', items: Edge },
  },
};
const Step = {
  type: 'object', required: ['id', 'inputs', 'outputs'], additionalProperties: false,
  properties: {
    id: { type: 'string', description: 'Unique step identifier.' },
    operation: { type: 'string', description: 'Optional operation label (e.g. join, aggregate).' },
    inputs: { type: 'array', minItems: 1, items: { type: 'string' }, description: 'Upstream dataset names this step reads.' },
    outputs: { type: 'array', minItems: 1, items: { type: 'string' }, description: 'Dataset names this step produces.' },
  },
};
const TrackRequest = {
  type: 'object', required: ['steps'], additionalProperties: false,
  properties: {
    steps: { type: 'array', minItems: 1, items: Step, description: 'Ordered transform manifest.' },
  },
};

const CORE = {
  step_count: 3, node_count: 5, edge_count: 4,
  sources: ['raw_events', 'users'], sinks: ['daily_metrics'],
  has_cycle: false, cycle: [],
  topological_order: ['raw_events', 'users', 'clean_events', 'enriched_events', 'daily_metrics'],
  max_depth: 3,
  nodes: [
    { name: 'clean_events', role: 'intermediate', in_degree: 1, out_degree: 1, depth: 1 },
    { name: 'daily_metrics', role: 'sink', in_degree: 1, out_degree: 0, depth: 3 },
    { name: 'enriched_events', role: 'intermediate', in_degree: 2, out_degree: 1, depth: 2 },
    { name: 'raw_events', role: 'source', in_degree: 0, out_degree: 1, depth: 0 },
    { name: 'users', role: 'source', in_degree: 0, out_degree: 1, depth: 0 },
  ],
  edges: [
    { from: 'raw_events', to: 'clean_events', via: 's1' },
    { from: 'clean_events', to: 'enriched_events', via: 's2' },
    { from: 'users', to: 'enriched_events', via: 's2' },
    { from: 'enriched_events', to: 'daily_metrics', via: 's3' },
  ],
};
const CHAIN = [
  { api: 'data-catalog-builder', reason: 'Document the datasets (nodes) discovered in this lineage graph.' },
  { api: 'data-pipeline-quality-scorer', reason: 'Score the data flowing through the pipeline these steps describe.' },
];
const INVALIDATORS = [
  'Lineage is computed only from the supplied manifest; datasets or steps not listed are invisible (no inference of hidden dependencies).',
  'A step whose inputs and outputs share a name produces no self-edge (in-place updates are not lineage hops).',
  'When a cycle is present, topological_order is null and node depths are reported as 0 — resolve the cycle for a valid ordering.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { lineage: 1 },
  recommended_actions_priority_order: [
    '5 dataset(s), 4 edge(s): 2 source(s), 1 sink(s), max depth 3.',
    'Use topological_order as a safe execution/refresh sequence.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('lineage'), _Tail: Tail,
  NodeInfo, Edge, LineageCore, Step, TrackRequest, DiscoveryResponse: discoverySchema(),
  TrackResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LineageCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/LineageCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dlt-1780000000000', request_id: 'dlt-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  steps: [
    { id: 's1', operation: 'extract', inputs: ['raw_events'], outputs: ['clean_events'] },
    { id: 's2', operation: 'join', inputs: ['clean_events', 'users'], outputs: ['enriched_events'] },
    { id: 's3', operation: 'aggregate', inputs: ['enriched_events'], outputs: ['daily_metrics'] },
  ],
};
const disc = {
  name: 'Data Lineage Tracker API', version: '1.0.0',
  description: 'Deterministic data lineage tracker. Turns a transform manifest (steps with input/output datasets) into a lineage graph with roles, degrees, depth, cycle detection, and a topological order. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-lineage-tracker/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/track', summary: 'Build a lineage graph from a transform manifest', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL lineage + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/track', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/track', summary: 'Build a lineage graph from a transform manifest', operationId: 'track', priceUsdc: 0.007,
    requestSchemaRef: 'TrackRequest', responseSchemaRef: 'TrackResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL lineage + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'TrackRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Resolved 3 step(s) into a graph of 5 dataset(s) and 4 edge(s).',
        key_factors: ['Sources: raw_events, users.', 'Sinks: daily_metrics.', 'Acyclic; max depth 3.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-lineage-tracker', title: 'Data Lineage Tracker API', version: '1.0.0',
  description: 'Deterministic data lineage tracker — transform manifest → lineage graph (roles, degrees, depth, cycle detection, topological order). No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /data-lineage-tracker/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Data Lineage Tracker API",
    "version": "1.0.0",
    "description": "Deterministic data lineage tracker — transform manifest → lineage graph (roles, degrees, depth, cycle detection, topological order). No LLM.",
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
      "url": "https://orbis-apis.onrender.com/data-lineage-tracker"
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
                  "name": "Data Lineage Tracker API",
                  "version": "1.0.0",
                  "description": "Deterministic data lineage tracker. Turns a transform manifest (steps with input/output datasets) into a lineage graph with roles, degrees, depth, cycle detection, and a topological order. No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/data-lineage-tracker/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/track",
                      "summary": "Build a lineage graph from a transform manifest",
                      "price_usdc": 0.007
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL lineage + reasoning",
                      "price_usdc": 0.012
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/track",
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
    "/track": {
      "post": {
        "operationId": "track",
        "summary": "Build a lineage graph from a transform manifest",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TrackResponse"
                },
                "example": {
                  "trace_id": "dlt-1780000000000",
                  "request_id": "dlt-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "step_count": 3,
                  "node_count": 5,
                  "edge_count": 4,
                  "sources": [
                    "raw_events",
                    "users"
                  ],
                  "sinks": [
                    "daily_metrics"
                  ],
                  "has_cycle": false,
                  "cycle": [],
                  "topological_order": [
                    "raw_events",
                    "users",
                    "clean_events",
                    "enriched_events",
                    "daily_metrics"
                  ],
                  "max_depth": 3,
                  "nodes": [
                    {
                      "name": "clean_events",
                      "role": "intermediate",
                      "in_degree": 1,
                      "out_degree": 1,
                      "depth": 1
                    },
                    {
                      "name": "daily_metrics",
                      "role": "sink",
                      "in_degree": 1,
                      "out_degree": 0,
                      "depth": 3
                    },
                    {
                      "name": "enriched_events",
                      "role": "intermediate",
                      "in_degree": 2,
                      "out_degree": 1,
                      "depth": 2
                    },
                    {
                      "name": "raw_events",
                      "role": "source",
                      "in_degree": 0,
                      "out_degree": 1,
                      "depth": 0
                    },
                    {
                      "name": "users",
                      "role": "source",
                      "in_degree": 0,
                      "out_degree": 1,
                      "depth": 0
                    }
                  ],
                  "edges": [
                    {
                      "from": "raw_events",
                      "to": "clean_events",
                      "via": "s1"
                    },
                    {
                      "from": "clean_events",
                      "to": "enriched_events",
                      "via": "s2"
                    },
                    {
                      "from": "users",
                      "to": "enriched_events",
                      "via": "s2"
                    },
                    {
                      "from": "enriched_events",
                      "to": "daily_metrics",
                      "via": "s3"
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "lineage": 1
                  },
                  "recommended_actions_priority_order": [
                    "5 dataset(s), 4 edge(s): 2 source(s), 1 sink(s), max depth 3.",
                    "Use topological_order as a safe execution/refresh sequence."
                  ],
                  "chain_to": [
                    {
                      "api": "data-catalog-builder",
                      "reason": "Document the datasets (nodes) discovered in this lineage graph."
                    },
                    {
                      "api": "data-pipeline-quality-scorer",
                      "reason": "Score the data flowing through the pipeline these steps describe."
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
                "$ref": "#/components/schemas/TrackRequest"
              },
              "example": {
                "steps": [
                  {
                    "id": "s1",
                    "operation": "extract",
                    "inputs": [
                      "raw_events"
                    ],
                    "outputs": [
                      "clean_events"
                    ]
                  },
                  {
                    "id": "s2",
                    "operation": "join",
                    "inputs": [
                      "clean_events",
                      "users"
                    ],
                    "outputs": [
                      "enriched_events"
                    ]
                  },
                  {
                    "id": "s3",
                    "operation": "aggregate",
                    "inputs": [
                      "enriched_events"
                    ],
                    "outputs": [
                      "daily_metrics"
                    ]
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
        "summary": "ONE-CALL lineage + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "dlt-1780000000000",
                  "request_id": "dlt-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "step_count": 3,
                  "node_count": 5,
                  "edge_count": 4,
                  "sources": [
                    "raw_events",
                    "users"
                  ],
                  "sinks": [
                    "daily_metrics"
                  ],
                  "has_cycle": false,
                  "cycle": [],
                  "topological_order": [
                    "raw_events",
                    "users",
                    "clean_events",
                    "enriched_events",
                    "daily_metrics"
                  ],
                  "max_depth": 3,
                  "nodes": [
                    {
                      "name": "clean_events",
                      "role": "intermediate",
                      "in_degree": 1,
                      "out_degree": 1,
                      "depth": 1
                    },
                    {
                      "name": "daily_metrics",
                      "role": "sink",
                      "in_degree": 1,
                      "out_degree": 0,
                      "depth": 3
                    },
                    {
                      "name": "enriched_events",
                      "role": "intermediate",
                      "in_degree": 2,
                      "out_degree": 1,
                      "depth": 2
                    },
                    {
                      "name": "raw_events",
                      "role": "source",
                      "in_degree": 0,
                      "out_degree": 1,
                      "depth": 0
                    },
                    {
                      "name": "users",
                      "role": "source",
                      "in_degree": 0,
                      "out_degree": 1,
                      "depth": 0
                    }
                  ],
                  "edges": [
                    {
                      "from": "raw_events",
                      "to": "clean_events",
                      "via": "s1"
                    },
                    {
                      "from": "clean_events",
                      "to": "enriched_events",
                      "via": "s2"
                    },
                    {
                      "from": "users",
                      "to": "enriched_events",
                      "via": "s2"
                    },
                    {
                      "from": "enriched_events",
                      "to": "daily_metrics",
                      "via": "s3"
                    }
                  ],
                  "reasoning": {
                    "why_result_generated": "Resolved 3 step(s) into a graph of 5 dataset(s) and 4 edge(s).",
                    "key_factors": [
                      "Sources: raw_events, users.",
                      "Sinks: daily_metrics.",
                      "Acyclic; max depth 3."
                    ],
                    "invalidators": [
                      "Lineage is computed only from the supplied manifest; datasets or steps not listed are invisible (no inference of hidden dependencies).",
                      "A step whose inputs and outputs share a name produces no self-edge (in-place updates are not lineage hops).",
                      "When a cycle is present, topological_order is null and node depths are reported as 0 — resolve the cycle for a valid ordering."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "lineage": 1
                  },
                  "recommended_actions_priority_order": [
                    "5 dataset(s), 4 edge(s): 2 source(s), 1 sink(s), max depth 3.",
                    "Use topological_order as a safe execution/refresh sequence."
                  ],
                  "chain_to": [
                    {
                      "api": "data-catalog-builder",
                      "reason": "Document the datasets (nodes) discovered in this lineage graph."
                    },
                    {
                      "api": "data-pipeline-quality-scorer",
                      "reason": "Score the data flowing through the pipeline these steps describe."
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
                "$ref": "#/components/schemas/TrackRequest"
              },
              "example": {
                "steps": [
                  {
                    "id": "s1",
                    "operation": "extract",
                    "inputs": [
                      "raw_events"
                    ],
                    "outputs": [
                      "clean_events"
                    ]
                  },
                  {
                    "id": "s2",
                    "operation": "join",
                    "inputs": [
                      "clean_events",
                      "users"
                    ],
                    "outputs": [
                      "enriched_events"
                    ]
                  },
                  {
                    "id": "s3",
                    "operation": "aggregate",
                    "inputs": [
                      "enriched_events"
                    ],
                    "outputs": [
                      "daily_metrics"
                    ]
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
          "lineage": {
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
      "NodeInfo": {
        "type": "object",
        "required": [
          "name",
          "role",
          "in_degree",
          "out_degree",
          "depth"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "role": {
            "type": "string",
            "enum": [
              "source",
              "intermediate",
              "sink",
              "isolated"
            ]
          },
          "in_degree": {
            "type": "integer",
            "minimum": 0
          },
          "out_degree": {
            "type": "integer",
            "minimum": 0
          },
          "depth": {
            "type": "integer",
            "minimum": 0,
            "description": "Longest path length from any source (0 for sources; 0 for all nodes when a cycle is present)."
          }
        }
      },
      "Edge": {
        "type": "object",
        "required": [
          "from",
          "to",
          "via"
        ],
        "additionalProperties": false,
        "properties": {
          "from": {
            "type": "string",
            "description": "Upstream dataset."
          },
          "to": {
            "type": "string",
            "description": "Downstream dataset."
          },
          "via": {
            "type": "string",
            "description": "Step id that produced this hop."
          }
        }
      },
      "LineageCore": {
        "type": "object",
        "required": [
          "step_count",
          "node_count",
          "edge_count",
          "sources",
          "sinks",
          "has_cycle",
          "cycle",
          "topological_order",
          "max_depth",
          "nodes",
          "edges"
        ],
        "properties": {
          "step_count": {
            "type": "integer",
            "minimum": 0
          },
          "node_count": {
            "type": "integer",
            "minimum": 0
          },
          "edge_count": {
            "type": "integer",
            "minimum": 0
          },
          "sources": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "sinks": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "has_cycle": {
            "type": "boolean"
          },
          "cycle": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "One detected cycle as a node path (first repeats at end); empty when acyclic."
          },
          "topological_order": {
            "type": [
              "array",
              "null"
            ],
            "items": {
              "type": "string"
            },
            "description": "A valid execution order, or null when a cycle is present."
          },
          "max_depth": {
            "type": "integer",
            "minimum": 0
          },
          "nodes": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name",
                "role",
                "in_degree",
                "out_degree",
                "depth"
              ],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string"
                },
                "role": {
                  "type": "string",
                  "enum": [
                    "source",
                    "intermediate",
                    "sink",
                    "isolated"
                  ]
                },
                "in_degree": {
                  "type": "integer",
                  "minimum": 0
                },
                "out_degree": {
                  "type": "integer",
                  "minimum": 0
                },
                "depth": {
                  "type": "integer",
                  "minimum": 0,
                  "description": "Longest path length from any source (0 for sources; 0 for all nodes when a cycle is present)."
                }
              }
            }
          },
          "edges": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "from",
                "to",
                "via"
              ],
              "additionalProperties": false,
              "properties": {
                "from": {
                  "type": "string",
                  "description": "Upstream dataset."
                },
                "to": {
                  "type": "string",
                  "description": "Downstream dataset."
                },
                "via": {
                  "type": "string",
                  "description": "Step id that produced this hop."
                }
              }
            }
          }
        }
      },
      "Step": {
        "type": "object",
        "required": [
          "id",
          "inputs",
          "outputs"
        ],
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique step identifier."
          },
          "operation": {
            "type": "string",
            "description": "Optional operation label (e.g. join, aggregate)."
          },
          "inputs": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string"
            },
            "description": "Upstream dataset names this step reads."
          },
          "outputs": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string"
            },
            "description": "Dataset names this step produces."
          }
        }
      },
      "TrackRequest": {
        "type": "object",
        "required": [
          "steps"
        ],
        "additionalProperties": false,
        "properties": {
          "steps": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": [
                "id",
                "inputs",
                "outputs"
              ],
              "additionalProperties": false,
              "properties": {
                "id": {
                  "type": "string",
                  "description": "Unique step identifier."
                },
                "operation": {
                  "type": "string",
                  "description": "Optional operation label (e.g. join, aggregate)."
                },
                "inputs": {
                  "type": "array",
                  "minItems": 1,
                  "items": {
                    "type": "string"
                  },
                  "description": "Upstream dataset names this step reads."
                },
                "outputs": {
                  "type": "array",
                  "minItems": 1,
                  "items": {
                    "type": "string"
                  },
                  "description": "Dataset names this step produces."
                }
              }
            },
            "description": "Ordered transform manifest."
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
      "TrackResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/LineageCore"
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
            "$ref": "#/components/schemas/LineageCore"
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
### POST /track (DAG: extract→join→aggregate)
Request:
```json
{
  "steps": [
    {
      "id": "s1",
      "operation": "extract",
      "inputs": [
        "raw_events"
      ],
      "outputs": [
        "clean_events"
      ]
    },
    {
      "id": "s2",
      "operation": "join",
      "inputs": [
        "clean_events",
        "users"
      ],
      "outputs": [
        "enriched_events"
      ]
    },
    {
      "id": "s3",
      "operation": "aggregate",
      "inputs": [
        "enriched_events"
      ],
      "outputs": [
        "daily_metrics"
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "qec5rxhb-1781478372093",
  "request_id": "qec5rxhb-1781478372093",
  "computed_at": "2026-06-14T23:06:12.093Z",
  "success": true,
  "latency_ms": 0,
  "step_count": 3,
  "node_count": 5,
  "edge_count": 4,
  "sources": [
    "raw_events",
    "users"
  ],
  "sinks": [
    "daily_metrics"
  ],
  "has_cycle": false,
  "cycle": [],
  "topological_order": [
    "raw_events",
    "users",
    "clean_events",
    "enriched_events",
    "daily_metrics"
  ],
  "max_depth": 3,
  "nodes": [
    {
      "name": "clean_events",
      "role": "intermediate",
      "in_degree": 1,
      "out_degree": 1,
      "depth": 1
    },
    {
      "name": "daily_metrics",
      "role": "sink",
      "in_degree": 1,
      "out_degree": 0,
      "depth": 3
    },
    {
      "name": "enriched_events",
      "role": "intermediate",
      "in_degree": 2,
      "out_degree": 1,
      "depth": 2
    },
    {
      "name": "raw_events",
      "role": "source",
      "in_degree": 0,
      "out_degree": 1,
      "depth": 0
    },
    {
      "name": "users",
      "role": "source",
      "in_degree": 0,
      "out_degree": 1,
      "depth": 0
    }
  ],
  "edges": [
    {
      "from": "raw_events",
      "to": "clean_events",
      "via": "s1"
    },
    {
      "from": "clean_events",
      "to": "enriched_events",
      "via": "s2"
    },
    {
      "from": "users",
      "to": "enriched_events",
      "via": "s2"
    },
    {
      "from": "enriched_events",
      "to": "daily_metrics",
      "via": "s3"
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "lineage": 1
  },
  "recommended_actions_priority_order": [
    "5 dataset(s), 4 edge(s): 2 source(s), 1 sink(s), max depth 3.",
    "Use topological_order as a safe execution/refresh sequence."
  ],
  "chain_to": [
    {
      "api": "data-catalog-builder",
      "reason": "Document the datasets (nodes) discovered in this lineage graph."
    },
    {
      "api": "data-pipeline-quality-scorer",
      "reason": "Score the data flowing through the pipeline these steps describe."
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

### POST /lookup (cycle detection → topological_order null)
Request:
```json
{
  "steps": [
    {
      "id": "a",
      "inputs": [
        "x"
      ],
      "outputs": [
        "y"
      ]
    },
    {
      "id": "b",
      "inputs": [
        "y"
      ],
      "outputs": [
        "z"
      ]
    },
    {
      "id": "c",
      "inputs": [
        "z"
      ],
      "outputs": [
        "x"
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "ifwangov-1781478372102",
  "request_id": "ifwangov-1781478372102",
  "computed_at": "2026-06-14T23:06:12.102Z",
  "success": true,
  "latency_ms": 0,
  "step_count": 3,
  "node_count": 3,
  "edge_count": 3,
  "sources": [],
  "sinks": [],
  "has_cycle": true,
  "cycle": [
    "x",
    "y",
    "z",
    "x"
  ],
  "topological_order": null,
  "max_depth": 0,
  "nodes": [
    {
      "name": "x",
      "role": "intermediate",
      "in_degree": 1,
      "out_degree": 1,
      "depth": 0
    },
    {
      "name": "y",
      "role": "intermediate",
      "in_degree": 1,
      "out_degree": 1,
      "depth": 0
    },
    {
      "name": "z",
      "role": "intermediate",
      "in_degree": 1,
      "out_degree": 1,
      "depth": 0
    }
  ],
  "edges": [
    {
      "from": "x",
      "to": "y",
      "via": "a"
    },
    {
      "from": "y",
      "to": "z",
      "via": "b"
    },
    {
      "from": "z",
      "to": "x",
      "via": "c"
    }
  ],
  "reasoning": {
    "why_result_generated": "Resolved 3 step(s) into a graph of 3 dataset(s) and 3 edge(s).",
    "key_factors": [
      "Sources: (none).",
      "Sinks: (none).",
      "Cycle: x → y → z → x."
    ],
    "invalidators": [
      "Lineage is computed only from the supplied manifest; datasets or steps not listed are invisible (no inference of hidden dependencies).",
      "A step whose inputs and outputs share a name produces no self-edge (in-place updates are not lineage hops).",
      "When a cycle is present, topological_order is null and node depths are reported as 0 — resolve the cycle for a valid ordering."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "lineage": 1
  },
  "recommended_actions_priority_order": [
    "Cycle detected (x → y → z → x) — the pipeline is not a DAG; break the loop before scheduling.",
    "3 dataset(s), 3 edge(s): 0 source(s), 0 sink(s), max depth 0."
  ],
  "chain_to": [
    {
      "api": "data-catalog-builder",
      "reason": "Document the datasets (nodes) discovered in this lineage graph."
    },
    {
      "api": "data-pipeline-quality-scorer",
      "reason": "Score the data flowing through the pipeline these steps describe."
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

### POST /track (single step — source→sink)
Request:
```json
{
  "steps": [
    {
      "id": "only",
      "inputs": [
        "a"
      ],
      "outputs": [
        "b"
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "jwtvjvfy-1781478372108",
  "request_id": "jwtvjvfy-1781478372108",
  "computed_at": "2026-06-14T23:06:12.108Z",
  "success": true,
  "latency_ms": 0,
  "step_count": 1,
  "node_count": 2,
  "edge_count": 1,
  "sources": [
    "a"
  ],
  "sinks": [
    "b"
  ],
  "has_cycle": false,
  "cycle": [],
  "topological_order": [
    "a",
    "b"
  ],
  "max_depth": 1,
  "nodes": [
    {
      "name": "a",
      "role": "source",
      "in_degree": 0,
      "out_degree": 1,
      "depth": 0
    },
    {
      "name": "b",
      "role": "sink",
      "in_degree": 1,
      "out_degree": 0,
      "depth": 1
    }
  ],
  "edges": [
    {
      "from": "a",
      "to": "b",
      "via": "only"
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "lineage": 1
  },
  "recommended_actions_priority_order": [
    "2 dataset(s), 1 edge(s): 1 source(s), 1 sink(s), max depth 1.",
    "Use topological_order as a safe execution/refresh sequence."
  ],
  "chain_to": [
    {
      "api": "data-catalog-builder",
      "reason": "Document the datasets (nodes) discovered in this lineage graph."
    },
    {
      "api": "data-pipeline-quality-scorer",
      "reason": "Score the data flowing through the pipeline these steps describe."
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

### POST /track (error: empty steps)
Request:
```json
{
  "steps": []
}
```
Response (HTTP 400):
```json
{
  "trace_id": "vmxtt1ca-1781478372110",
  "request_id": "vmxtt1ca-1781478372110",
  "computed_at": "2026-06-14T23:06:12.110Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"steps\" must be a non-empty array of transform steps."
  }
}
```

---

# data-catalog-builder

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';
import { parseRows, columnsOf, inferType, isMissing, asKey, Row } from '../../_aplus/dataset';

// Deterministic data catalog builder. Turns one or more dataset schemas — supplied
// either as sample rows (types inferred) or as explicit column definitions — into a
// catalog entry per dataset: typed columns, null rates, cardinality, primary-key
// candidates, and heuristic tags. No LLM, nothing stored.

const router = Router();

const MAX_DATASETS = 100;
const TYPE_ENUM = ['empty', 'boolean', 'integer', 'number', 'date', 'string'];
type CellValue = string | number | boolean | null | unknown[] | Record<string, unknown>;

export interface CatalogColumn {
  name: string;
  type: string;
  nullable: boolean;
  null_rate: number | null;
  distinct_count: number | null;
  sample_values: CellValue[];
  tags: string[];
}
export interface CatalogDataset {
  name: string;
  source: 'rows' | 'columns';
  row_count: number | null;
  column_count: number;
  primary_key_candidates: string[];
  columns: CatalogColumn[];
  tags: string[];
}
export interface CatalogCore { dataset_count: number; datasets: CatalogDataset[]; }

const ID_RE = /(^|_)id$|^id$|uuid|guid/i;
const TEMPORAL_RE = /date|time|_at$|_on$|timestamp|dob|birth/i;
const MEASURE_RE = /amount|price|qty|quantity|count|total|cost|revenue|score|rate|balance|age/i;
const PII_RE = /email|phone|ssn|(^|_)name$|full_?name|address|dob|birth|zip|postal/i;

function columnTags(name: string, type: string, unique: boolean, categorical: boolean): string[] {
  const tags: string[] = [];
  if (ID_RE.test(name) || unique) tags.push('identifier');
  if (type === 'date' || TEMPORAL_RE.test(name)) tags.push('temporal');
  if ((type === 'number' || type === 'integer') && MEASURE_RE.test(name)) tags.push('measure');
  if (PII_RE.test(name)) tags.push('pii_candidate');
  if (type === 'boolean') tags.push('boolean_flag');
  if (categorical) tags.push('categorical');
  return tags;
}

function buildFromRows(name: string, rows: Row[]): CatalogDataset {
  const cols = columnsOf(rows);
  const rowCount = rows.length;
  const columns: CatalogColumn[] = [];
  const pkCandidates: string[] = [];
  for (const c of cols) {
    const values = rows.map((r) => r[c]);
    const present = values.filter((v) => !isMissing(v, false));
    const type = inferType(present);
    const nullCount = rowCount - present.length;
    const distinctKeys = new Set(present.map(asKey));
    const distinct = distinctKeys.size;
    const nullRate = round(nullCount / rowCount, 4);
    // sample: up to 5 distinct, first-seen order
    const seen = new Set<string>();
    const sample: CellValue[] = [];
    for (const v of present) { const k = asKey(v); if (!seen.has(k)) { seen.add(k); sample.push(v as CellValue); if (sample.length >= 5) break; } }
    const unique = rowCount > 1 && nullCount === 0 && distinct === rowCount;
    const categorical = (type === 'string' || type === 'boolean') && distinct > 0 && distinct <= Math.max(2, Math.floor(rowCount * 0.5)) && !unique;
    if (unique) pkCandidates.push(c);
    columns.push({ name: c, type, nullable: nullCount > 0, null_rate: nullRate, distinct_count: distinct, sample_values: sample, tags: columnTags(c, type, unique, categorical) });
  }
  return { name, source: 'rows', row_count: rowCount, column_count: columns.length, primary_key_candidates: pkCandidates, columns, tags: datasetTags(columns) };
}

function buildFromColumns(name: string, decl: { name: string; type: string }[]): CatalogDataset {
  const columns: CatalogColumn[] = decl.map((d) => ({
    name: d.name, type: d.type, nullable: true, null_rate: null, distinct_count: null, sample_values: [],
    tags: columnTags(d.name, d.type, false, false),
  }));
  return { name, source: 'columns', row_count: null, column_count: columns.length, primary_key_candidates: [], columns, tags: datasetTags(columns) };
}

function datasetTags(columns: CatalogColumn[]): string[] {
  const tags: string[] = [];
  const has = (t: string) => columns.some((c) => c.tags.includes(t));
  if (has('pii_candidate')) tags.push('has_pii');
  if (has('temporal')) tags.push('has_temporal');
  if (has('identifier')) tags.push('has_identifier');
  if (columns.filter((c) => c.tags.includes('measure')).length >= 2) tags.push('fact_table');
  return tags;
}

function build(body: any): { error: string } | { result: CatalogCore; anyInferred: boolean } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "datasets" array.' };
  if (!Array.isArray(body.datasets) || body.datasets.length === 0) return { error: '"datasets" must be a non-empty array.' };
  if (body.datasets.length > MAX_DATASETS) return { error: `"datasets" exceeds the ${MAX_DATASETS}-dataset limit.` };
  const out: CatalogDataset[] = [];
  let anyInferred = false;
  for (let i = 0; i < body.datasets.length; i++) {
    const d = body.datasets[i];
    if (d === null || typeof d !== 'object' || Array.isArray(d)) return { error: `datasets[${i}] must be an object.` };
    if (typeof d.name !== 'string' || d.name === '') return { error: `datasets[${i}].name must be a non-empty string.` };
    const hasRows = d.rows !== undefined;
    const hasCols = d.columns !== undefined;
    if (hasRows === hasCols) return { error: `datasets[${i}] ("${d.name}") must supply exactly one of "rows" or "columns".` };
    if (hasRows) {
      const p = parseRows(d.rows, `datasets[${i}].rows`);
      if ('error' in p) return p;
      anyInferred = true;
      out.push(buildFromRows(d.name, p.rows));
    } else {
      if (!Array.isArray(d.columns) || d.columns.length === 0) return { error: `datasets[${i}].columns must be a non-empty array.` };
      const decl: { name: string; type: string }[] = [];
      for (let j = 0; j < d.columns.length; j++) {
        const c = d.columns[j];
        if (c === null || typeof c !== 'object' || Array.isArray(c)) return { error: `datasets[${i}].columns[${j}] must be an object.` };
        if (typeof c.name !== 'string' || c.name === '') return { error: `datasets[${i}].columns[${j}].name must be a non-empty string.` };
        const type = c.type === undefined ? 'string' : c.type;
        if (!TYPE_ENUM.includes(type)) return { error: `datasets[${i}].columns[${j}].type must be one of: ${TYPE_ENUM.join(', ')}.` };
        decl.push({ name: c.name, type });
      }
      out.push(buildFromColumns(d.name, decl));
    }
  }
  return { result: { dataset_count: out.length, datasets: out }, anyInferred };
}

const CHAIN_TO = [
  { api: 'data-classification', reason: 'Confirm semantic/PII types on the catalogued columns from sampled values.' },
  { api: 'data-lineage-tracker', reason: 'Connect these catalogued datasets into a lineage graph.' },
];
const INVALIDATORS = [
  'Column types and stats are derived only from the supplied rows/columns; with explicit columns, null_rate/distinct_count/sample_values are null/empty (no data to measure).',
  'Tags are heuristic (name + type patterns): identifier/temporal/measure/pii_candidate/boolean_flag/categorical — verify before treating pii_candidate as authoritative PII.',
  'primary_key_candidates require a fully-populated, all-distinct column over >1 row; they are candidates, not enforced keys.',
];

function actions(r: CatalogCore): string[] {
  const out = [`Catalogued ${r.dataset_count} dataset(s), ${r.datasets.reduce((a, d) => a + d.column_count, 0)} column(s) total.`];
  const pii = r.datasets.filter((d) => d.tags.includes('has_pii')).map((d) => d.name);
  if (pii.length) out.push(`Possible PII in: ${pii.join(', ')} — review handling before publishing the catalog.`);
  const pk = r.datasets.filter((d) => d.primary_key_candidates.length > 0);
  if (pk.length) out.push(`Primary-key candidate(s) found in ${pk.length} dataset(s); confirm before declaring keys.`);
  out.push('Chain to data-classification to validate semantic types from values.');
  return out;
}

const TAIL = (anyInferred: boolean, r: CatalogCore) => ({
  confidence_score: 0.85,
  confidence_per_section: { catalog: 1, type_inference: anyInferred ? 0.9 : 1, tagging: 0.85 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Catalog Builder API', version: '1.0.0',
    description: 'Deterministic data catalog builder. Turns dataset schemas (sample rows or explicit columns) into catalog entries with typed columns, null rates, cardinality, primary-key candidates, and heuristic tags. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-catalog-builder/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/build', summary: 'Build catalog entries for one or more datasets', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL catalog + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/build', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/build', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = build(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.anyInferred, r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = build(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Built catalog entries for ${v.dataset_count} dataset(s) with ${v.datasets.reduce((a, d) => a + d.column_count, 0)} column(s).`,
      key_factors: v.datasets.map((d) => `${d.name}: ${d.column_count} col(s)${d.row_count !== null ? `, ${d.row_count} row(s)` : ' (schema only)'}; tags [${d.tags.join(', ') || 'none'}].`),
      invalidators: INVALIDATORS,
    },
    ...TAIL(r.anyInferred, v),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema, CellValue } from '../../_aplus/specparts';

const TYPE_ENUM = ['empty', 'boolean', 'integer', 'number', 'date', 'string'];
const COL_TAG_ENUM = ['identifier', 'temporal', 'measure', 'pii_candidate', 'boolean_flag', 'categorical'];
const DS_TAG_ENUM = ['has_pii', 'has_temporal', 'has_identifier', 'fact_table'];
const Row = rowSchema();

const CatalogColumn = {
  type: 'object', required: ['name', 'type', 'nullable', 'null_rate', 'distinct_count', 'sample_values', 'tags'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: TYPE_ENUM },
    nullable: { type: 'boolean' },
    null_rate: { type: ['number', 'null'], minimum: 0, maximum: 1, description: 'Null/blank rate (null when built from explicit columns).' },
    distinct_count: { type: ['integer', 'null'], minimum: 0, description: 'Distinct non-missing values (null when built from explicit columns).' },
    sample_values: { type: 'array', items: CellValue, maxItems: 5, description: 'Up to 5 distinct sample values (empty when built from explicit columns).' },
    tags: { type: 'array', items: { type: 'string', enum: COL_TAG_ENUM } },
  },
};
const CatalogDataset = {
  type: 'object', required: ['name', 'source', 'row_count', 'column_count', 'primary_key_candidates', 'columns', 'tags'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    source: { type: 'string', enum: ['rows', 'columns'], description: 'Whether the entry was built from sample rows or explicit column defs.' },
    row_count: { type: ['integer', 'null'], minimum: 0 },
    column_count: { type: 'integer', minimum: 0 },
    primary_key_candidates: { type: 'array', items: { type: 'string' }, description: 'Columns that are fully populated and all-distinct over >1 row.' },
    columns: { type: 'array', items: CatalogColumn },
    tags: { type: 'array', items: { type: 'string', enum: DS_TAG_ENUM } },
  },
};
const CatalogCore = {
  type: 'object', required: ['dataset_count', 'datasets'],
  properties: {
    dataset_count: { type: 'integer', minimum: 0 },
    datasets: { type: 'array', items: CatalogDataset },
  },
};
const ColumnDef = {
  type: 'object', required: ['name'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: TYPE_ENUM, description: 'Declared column type (default string).' },
  },
};
const DatasetInput = {
  type: 'object', required: ['name'], additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Dataset name.' },
    rows: { type: 'array', items: Row, minItems: 1, description: 'Sample rows to infer the schema from (supply rows XOR columns).' },
    columns: { type: 'array', items: ColumnDef, minItems: 1, description: 'Explicit column definitions (supply rows XOR columns).' },
  },
};
const BuildRequest = {
  type: 'object', required: ['datasets'], additionalProperties: false,
  properties: {
    datasets: { type: 'array', items: DatasetInput, minItems: 1, description: 'Datasets to catalog. Each supplies exactly one of rows or columns.' },
  },
};

const CORE = {
  dataset_count: 2,
  datasets: [
    {
      name: 'users', source: 'rows', row_count: 3, column_count: 4,
      primary_key_candidates: ['id', 'email', 'signup_date'],
      columns: [
        { name: 'id', type: 'integer', nullable: false, null_rate: 0, distinct_count: 3, sample_values: [1, 2, 3], tags: ['identifier'] },
        { name: 'email', type: 'string', nullable: false, null_rate: 0, distinct_count: 3, sample_values: ['a@x.com', 'b@y.com', 'c@z.com'], tags: ['identifier', 'pii_candidate'] },
        { name: 'signup_date', type: 'date', nullable: false, null_rate: 0, distinct_count: 3, sample_values: ['2024-01-02', '2024-01-03', '2024-01-04'], tags: ['identifier', 'temporal'] },
        { name: 'plan', type: 'string', nullable: false, null_rate: 0, distinct_count: 2, sample_values: ['pro', 'free'], tags: ['categorical'] },
      ],
      tags: ['has_pii', 'has_temporal', 'has_identifier'],
    },
    {
      name: 'events', source: 'columns', row_count: null, column_count: 3,
      primary_key_candidates: [],
      columns: [
        { name: 'event_id', type: 'string', nullable: true, null_rate: null, distinct_count: null, sample_values: [], tags: ['identifier'] },
        { name: 'amount', type: 'number', nullable: true, null_rate: null, distinct_count: null, sample_values: [], tags: ['measure'] },
        { name: 'created_at', type: 'date', nullable: true, null_rate: null, distinct_count: null, sample_values: [], tags: ['temporal'] },
      ],
      tags: ['has_temporal', 'has_identifier'],
    },
  ],
};
const CHAIN = [
  { api: 'data-classification', reason: 'Confirm semantic/PII types on the catalogued columns from sampled values.' },
  { api: 'data-lineage-tracker', reason: 'Connect these catalogued datasets into a lineage graph.' },
];
const INVALIDATORS = [
  'Column types and stats are derived only from the supplied rows/columns; with explicit columns, null_rate/distinct_count/sample_values are null/empty (no data to measure).',
  'Tags are heuristic (name + type patterns): identifier/temporal/measure/pii_candidate/boolean_flag/categorical — verify before treating pii_candidate as authoritative PII.',
  'primary_key_candidates require a fully-populated, all-distinct column over >1 row; they are candidates, not enforced keys.',
];
const TAIL = {
  confidence_score: 0.85,
  confidence_per_section: { catalog: 1, type_inference: 0.9, tagging: 0.85 },
  recommended_actions_priority_order: [
    'Catalogued 2 dataset(s), 7 column(s) total.',
    'Possible PII in: users — review handling before publishing the catalog.',
    'Primary-key candidate(s) found in 1 dataset(s); confirm before declaring keys.',
    'Chain to data-classification to validate semantic types from values.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('catalog', 'type_inference', 'tagging'), _Tail: Tail,
  CatalogColumn, CatalogDataset, CatalogCore, ColumnDef, DatasetInput, BuildRequest, DiscoveryResponse: discoverySchema(),
  BuildResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CatalogCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/CatalogCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'dcb-1780000000000', request_id: 'dcb-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  datasets: [
    {
      name: 'users',
      rows: [
        { id: 1, email: 'a@x.com', signup_date: '2024-01-02', plan: 'pro' },
        { id: 2, email: 'b@y.com', signup_date: '2024-01-03', plan: 'free' },
        { id: 3, email: 'c@z.com', signup_date: '2024-01-04', plan: 'pro' },
      ],
    },
    {
      name: 'events',
      columns: [
        { name: 'event_id', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'created_at', type: 'date' },
      ],
    },
  ],
};
const disc = {
  name: 'Data Catalog Builder API', version: '1.0.0',
  description: 'Deterministic data catalog builder. Turns dataset schemas (sample rows or explicit columns) into catalog entries with typed columns, null rates, cardinality, primary-key candidates, and heuristic tags. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-catalog-builder/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/build', summary: 'Build catalog entries for one or more datasets', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL catalog + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/build', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/build', summary: 'Build catalog entries for one or more datasets', operationId: 'build', priceUsdc: 0.007,
    requestSchemaRef: 'BuildRequest', responseSchemaRef: 'BuildResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL catalog + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'BuildRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Built catalog entries for 2 dataset(s) with 7 column(s).',
        key_factors: [
          'users: 4 col(s), 3 row(s); tags [has_pii, has_temporal, has_identifier].',
          'events: 3 col(s) (schema only); tags [has_temporal, has_identifier].',
        ],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'data-catalog-builder', title: 'Data Catalog Builder API', version: '1.0.0',
  description: 'Deterministic data catalog builder — dataset schemas (rows or columns) → catalog entries with typed columns, stats, PK candidates, and heuristic tags. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /data-catalog-builder/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Data Catalog Builder API",
    "version": "1.0.0",
    "description": "Deterministic data catalog builder — dataset schemas (rows or columns) → catalog entries with typed columns, stats, PK candidates, and heuristic tags. No LLM.",
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
      "url": "https://orbis-apis.onrender.com/data-catalog-builder"
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
                  "name": "Data Catalog Builder API",
                  "version": "1.0.0",
                  "description": "Deterministic data catalog builder. Turns dataset schemas (sample rows or explicit columns) into catalog entries with typed columns, null rates, cardinality, primary-key candidates, and heuristic tags. No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/data-catalog-builder/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/build",
                      "summary": "Build catalog entries for one or more datasets",
                      "price_usdc": 0.007
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL catalog + reasoning",
                      "price_usdc": 0.012
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/build",
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
    "/build": {
      "post": {
        "operationId": "build",
        "summary": "Build catalog entries for one or more datasets",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/BuildResponse"
                },
                "example": {
                  "trace_id": "dcb-1780000000000",
                  "request_id": "dcb-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "dataset_count": 2,
                  "datasets": [
                    {
                      "name": "users",
                      "source": "rows",
                      "row_count": 3,
                      "column_count": 4,
                      "primary_key_candidates": [
                        "id",
                        "email",
                        "signup_date"
                      ],
                      "columns": [
                        {
                          "name": "id",
                          "type": "integer",
                          "nullable": false,
                          "null_rate": 0,
                          "distinct_count": 3,
                          "sample_values": [
                            1,
                            2,
                            3
                          ],
                          "tags": [
                            "identifier"
                          ]
                        },
                        {
                          "name": "email",
                          "type": "string",
                          "nullable": false,
                          "null_rate": 0,
                          "distinct_count": 3,
                          "sample_values": [
                            "a@x.com",
                            "b@y.com",
                            "c@z.com"
                          ],
                          "tags": [
                            "identifier",
                            "pii_candidate"
                          ]
                        },
                        {
                          "name": "signup_date",
                          "type": "date",
                          "nullable": false,
                          "null_rate": 0,
                          "distinct_count": 3,
                          "sample_values": [
                            "2024-01-02",
                            "2024-01-03",
                            "2024-01-04"
                          ],
                          "tags": [
                            "identifier",
                            "temporal"
                          ]
                        },
                        {
                          "name": "plan",
                          "type": "string",
                          "nullable": false,
                          "null_rate": 0,
                          "distinct_count": 2,
                          "sample_values": [
                            "pro",
                            "free"
                          ],
                          "tags": [
                            "categorical"
                          ]
                        }
                      ],
                      "tags": [
                        "has_pii",
                        "has_temporal",
                        "has_identifier"
                      ]
                    },
                    {
                      "name": "events",
                      "source": "columns",
                      "row_count": null,
                      "column_count": 3,
                      "primary_key_candidates": [],
                      "columns": [
                        {
                          "name": "event_id",
                          "type": "string",
                          "nullable": true,
                          "null_rate": null,
                          "distinct_count": null,
                          "sample_values": [],
                          "tags": [
                            "identifier"
                          ]
                        },
                        {
                          "name": "amount",
                          "type": "number",
                          "nullable": true,
                          "null_rate": null,
                          "distinct_count": null,
                          "sample_values": [],
                          "tags": [
                            "measure"
                          ]
                        },
                        {
                          "name": "created_at",
                          "type": "date",
                          "nullable": true,
                          "null_rate": null,
                          "distinct_count": null,
                          "sample_values": [],
                          "tags": [
                            "temporal"
                          ]
                        }
                      ],
                      "tags": [
                        "has_temporal",
                        "has_identifier"
                      ]
                    }
                  ],
                  "confidence_score": 0.85,
                  "confidence_per_section": {
                    "catalog": 1,
                    "type_inference": 0.9,
                    "tagging": 0.85
                  },
                  "recommended_actions_priority_order": [
                    "Catalogued 2 dataset(s), 7 column(s) total.",
                    "Possible PII in: users — review handling before publishing the catalog.",
                    "Primary-key candidate(s) found in 1 dataset(s); confirm before declaring keys.",
                    "Chain to data-classification to validate semantic types from values."
                  ],
                  "chain_to": [
                    {
                      "api": "data-classification",
                      "reason": "Confirm semantic/PII types on the catalogued columns from sampled values."
                    },
                    {
                      "api": "data-lineage-tracker",
                      "reason": "Connect these catalogued datasets into a lineage graph."
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
                "$ref": "#/components/schemas/BuildRequest"
              },
              "example": {
                "datasets": [
                  {
                    "name": "users",
                    "rows": [
                      {
                        "id": 1,
                        "email": "a@x.com",
                        "signup_date": "2024-01-02",
                        "plan": "pro"
                      },
                      {
                        "id": 2,
                        "email": "b@y.com",
                        "signup_date": "2024-01-03",
                        "plan": "free"
                      },
                      {
                        "id": 3,
                        "email": "c@z.com",
                        "signup_date": "2024-01-04",
                        "plan": "pro"
                      }
                    ]
                  },
                  {
                    "name": "events",
                    "columns": [
                      {
                        "name": "event_id",
                        "type": "string"
                      },
                      {
                        "name": "amount",
                        "type": "number"
                      },
                      {
                        "name": "created_at",
                        "type": "date"
                      }
                    ]
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
        "summary": "ONE-CALL catalog + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "dcb-1780000000000",
                  "request_id": "dcb-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "dataset_count": 2,
                  "datasets": [
                    {
                      "name": "users",
                      "source": "rows",
                      "row_count": 3,
                      "column_count": 4,
                      "primary_key_candidates": [
                        "id",
                        "email",
                        "signup_date"
                      ],
                      "columns": [
                        {
                          "name": "id",
                          "type": "integer",
                          "nullable": false,
                          "null_rate": 0,
                          "distinct_count": 3,
                          "sample_values": [
                            1,
                            2,
                            3
                          ],
                          "tags": [
                            "identifier"
                          ]
                        },
                        {
                          "name": "email",
                          "type": "string",
                          "nullable": false,
                          "null_rate": 0,
                          "distinct_count": 3,
                          "sample_values": [
                            "a@x.com",
                            "b@y.com",
                            "c@z.com"
                          ],
                          "tags": [
                            "identifier",
                            "pii_candidate"
                          ]
                        },
                        {
                          "name": "signup_date",
                          "type": "date",
                          "nullable": false,
                          "null_rate": 0,
                          "distinct_count": 3,
                          "sample_values": [
                            "2024-01-02",
                            "2024-01-03",
                            "2024-01-04"
                          ],
                          "tags": [
                            "identifier",
                            "temporal"
                          ]
                        },
                        {
                          "name": "plan",
                          "type": "string",
                          "nullable": false,
                          "null_rate": 0,
                          "distinct_count": 2,
                          "sample_values": [
                            "pro",
                            "free"
                          ],
                          "tags": [
                            "categorical"
                          ]
                        }
                      ],
                      "tags": [
                        "has_pii",
                        "has_temporal",
                        "has_identifier"
                      ]
                    },
                    {
                      "name": "events",
                      "source": "columns",
                      "row_count": null,
                      "column_count": 3,
                      "primary_key_candidates": [],
                      "columns": [
                        {
                          "name": "event_id",
                          "type": "string",
                          "nullable": true,
                          "null_rate": null,
                          "distinct_count": null,
                          "sample_values": [],
                          "tags": [
                            "identifier"
                          ]
                        },
                        {
                          "name": "amount",
                          "type": "number",
                          "nullable": true,
                          "null_rate": null,
                          "distinct_count": null,
                          "sample_values": [],
                          "tags": [
                            "measure"
                          ]
                        },
                        {
                          "name": "created_at",
                          "type": "date",
                          "nullable": true,
                          "null_rate": null,
                          "distinct_count": null,
                          "sample_values": [],
                          "tags": [
                            "temporal"
                          ]
                        }
                      ],
                      "tags": [
                        "has_temporal",
                        "has_identifier"
                      ]
                    }
                  ],
                  "reasoning": {
                    "why_result_generated": "Built catalog entries for 2 dataset(s) with 7 column(s).",
                    "key_factors": [
                      "users: 4 col(s), 3 row(s); tags [has_pii, has_temporal, has_identifier].",
                      "events: 3 col(s) (schema only); tags [has_temporal, has_identifier]."
                    ],
                    "invalidators": [
                      "Column types and stats are derived only from the supplied rows/columns; with explicit columns, null_rate/distinct_count/sample_values are null/empty (no data to measure).",
                      "Tags are heuristic (name + type patterns): identifier/temporal/measure/pii_candidate/boolean_flag/categorical — verify before treating pii_candidate as authoritative PII.",
                      "primary_key_candidates require a fully-populated, all-distinct column over >1 row; they are candidates, not enforced keys."
                    ]
                  },
                  "confidence_score": 0.85,
                  "confidence_per_section": {
                    "catalog": 1,
                    "type_inference": 0.9,
                    "tagging": 0.85
                  },
                  "recommended_actions_priority_order": [
                    "Catalogued 2 dataset(s), 7 column(s) total.",
                    "Possible PII in: users — review handling before publishing the catalog.",
                    "Primary-key candidate(s) found in 1 dataset(s); confirm before declaring keys.",
                    "Chain to data-classification to validate semantic types from values."
                  ],
                  "chain_to": [
                    {
                      "api": "data-classification",
                      "reason": "Confirm semantic/PII types on the catalogued columns from sampled values."
                    },
                    {
                      "api": "data-lineage-tracker",
                      "reason": "Connect these catalogued datasets into a lineage graph."
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
                "$ref": "#/components/schemas/BuildRequest"
              },
              "example": {
                "datasets": [
                  {
                    "name": "users",
                    "rows": [
                      {
                        "id": 1,
                        "email": "a@x.com",
                        "signup_date": "2024-01-02",
                        "plan": "pro"
                      },
                      {
                        "id": 2,
                        "email": "b@y.com",
                        "signup_date": "2024-01-03",
                        "plan": "free"
                      },
                      {
                        "id": 3,
                        "email": "c@z.com",
                        "signup_date": "2024-01-04",
                        "plan": "pro"
                      }
                    ]
                  },
                  {
                    "name": "events",
                    "columns": [
                      {
                        "name": "event_id",
                        "type": "string"
                      },
                      {
                        "name": "amount",
                        "type": "number"
                      },
                      {
                        "name": "created_at",
                        "type": "date"
                      }
                    ]
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
          "catalog": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "type_inference": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "tagging": {
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
      "CatalogColumn": {
        "type": "object",
        "required": [
          "name",
          "type",
          "nullable",
          "null_rate",
          "distinct_count",
          "sample_values",
          "tags"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "type": {
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
          "nullable": {
            "type": "boolean"
          },
          "null_rate": {
            "type": [
              "number",
              "null"
            ],
            "minimum": 0,
            "maximum": 1,
            "description": "Null/blank rate (null when built from explicit columns)."
          },
          "distinct_count": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "description": "Distinct non-missing values (null when built from explicit columns)."
          },
          "sample_values": {
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
            },
            "maxItems": 5,
            "description": "Up to 5 distinct sample values (empty when built from explicit columns)."
          },
          "tags": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "identifier",
                "temporal",
                "measure",
                "pii_candidate",
                "boolean_flag",
                "categorical"
              ]
            }
          }
        }
      },
      "CatalogDataset": {
        "type": "object",
        "required": [
          "name",
          "source",
          "row_count",
          "column_count",
          "primary_key_candidates",
          "columns",
          "tags"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "source": {
            "type": "string",
            "enum": [
              "rows",
              "columns"
            ],
            "description": "Whether the entry was built from sample rows or explicit column defs."
          },
          "row_count": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0
          },
          "column_count": {
            "type": "integer",
            "minimum": 0
          },
          "primary_key_candidates": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Columns that are fully populated and all-distinct over >1 row."
          },
          "columns": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name",
                "type",
                "nullable",
                "null_rate",
                "distinct_count",
                "sample_values",
                "tags"
              ],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string"
                },
                "type": {
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
                "nullable": {
                  "type": "boolean"
                },
                "null_rate": {
                  "type": [
                    "number",
                    "null"
                  ],
                  "minimum": 0,
                  "maximum": 1,
                  "description": "Null/blank rate (null when built from explicit columns)."
                },
                "distinct_count": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 0,
                  "description": "Distinct non-missing values (null when built from explicit columns)."
                },
                "sample_values": {
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
                  },
                  "maxItems": 5,
                  "description": "Up to 5 distinct sample values (empty when built from explicit columns)."
                },
                "tags": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "enum": [
                      "identifier",
                      "temporal",
                      "measure",
                      "pii_candidate",
                      "boolean_flag",
                      "categorical"
                    ]
                  }
                }
              }
            }
          },
          "tags": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "has_pii",
                "has_temporal",
                "has_identifier",
                "fact_table"
              ]
            }
          }
        }
      },
      "CatalogCore": {
        "type": "object",
        "required": [
          "dataset_count",
          "datasets"
        ],
        "properties": {
          "dataset_count": {
            "type": "integer",
            "minimum": 0
          },
          "datasets": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name",
                "source",
                "row_count",
                "column_count",
                "primary_key_candidates",
                "columns",
                "tags"
              ],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string"
                },
                "source": {
                  "type": "string",
                  "enum": [
                    "rows",
                    "columns"
                  ],
                  "description": "Whether the entry was built from sample rows or explicit column defs."
                },
                "row_count": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 0
                },
                "column_count": {
                  "type": "integer",
                  "minimum": 0
                },
                "primary_key_candidates": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Columns that are fully populated and all-distinct over >1 row."
                },
                "columns": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": [
                      "name",
                      "type",
                      "nullable",
                      "null_rate",
                      "distinct_count",
                      "sample_values",
                      "tags"
                    ],
                    "additionalProperties": false,
                    "properties": {
                      "name": {
                        "type": "string"
                      },
                      "type": {
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
                      "nullable": {
                        "type": "boolean"
                      },
                      "null_rate": {
                        "type": [
                          "number",
                          "null"
                        ],
                        "minimum": 0,
                        "maximum": 1,
                        "description": "Null/blank rate (null when built from explicit columns)."
                      },
                      "distinct_count": {
                        "type": [
                          "integer",
                          "null"
                        ],
                        "minimum": 0,
                        "description": "Distinct non-missing values (null when built from explicit columns)."
                      },
                      "sample_values": {
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
                        },
                        "maxItems": 5,
                        "description": "Up to 5 distinct sample values (empty when built from explicit columns)."
                      },
                      "tags": {
                        "type": "array",
                        "items": {
                          "type": "string",
                          "enum": [
                            "identifier",
                            "temporal",
                            "measure",
                            "pii_candidate",
                            "boolean_flag",
                            "categorical"
                          ]
                        }
                      }
                    }
                  }
                },
                "tags": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "enum": [
                      "has_pii",
                      "has_temporal",
                      "has_identifier",
                      "fact_table"
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "ColumnDef": {
        "type": "object",
        "required": [
          "name"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "type": {
            "type": "string",
            "enum": [
              "empty",
              "boolean",
              "integer",
              "number",
              "date",
              "string"
            ],
            "description": "Declared column type (default string)."
          }
        }
      },
      "DatasetInput": {
        "type": "object",
        "required": [
          "name"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "description": "Dataset name."
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
            },
            "minItems": 1,
            "description": "Sample rows to infer the schema from (supply rows XOR columns)."
          },
          "columns": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name"
              ],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string"
                },
                "type": {
                  "type": "string",
                  "enum": [
                    "empty",
                    "boolean",
                    "integer",
                    "number",
                    "date",
                    "string"
                  ],
                  "description": "Declared column type (default string)."
                }
              }
            },
            "minItems": 1,
            "description": "Explicit column definitions (supply rows XOR columns)."
          }
        }
      },
      "BuildRequest": {
        "type": "object",
        "required": [
          "datasets"
        ],
        "additionalProperties": false,
        "properties": {
          "datasets": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name"
              ],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string",
                  "description": "Dataset name."
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
                  },
                  "minItems": 1,
                  "description": "Sample rows to infer the schema from (supply rows XOR columns)."
                },
                "columns": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": [
                      "name"
                    ],
                    "additionalProperties": false,
                    "properties": {
                      "name": {
                        "type": "string"
                      },
                      "type": {
                        "type": "string",
                        "enum": [
                          "empty",
                          "boolean",
                          "integer",
                          "number",
                          "date",
                          "string"
                        ],
                        "description": "Declared column type (default string)."
                      }
                    }
                  },
                  "minItems": 1,
                  "description": "Explicit column definitions (supply rows XOR columns)."
                }
              }
            },
            "minItems": 1,
            "description": "Datasets to catalog. Each supplies exactly one of rows or columns."
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
      "BuildResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/CatalogCore"
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
            "$ref": "#/components/schemas/CatalogCore"
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
### POST /build (rows-inferred + explicit-columns datasets)
Request:
```json
{
  "datasets": [
    {
      "name": "users",
      "rows": [
        {
          "id": 1,
          "email": "a@x.com",
          "signup_date": "2024-01-02",
          "plan": "pro"
        },
        {
          "id": 2,
          "email": "b@y.com",
          "signup_date": "2024-01-03",
          "plan": "free"
        },
        {
          "id": 3,
          "email": "c@z.com",
          "signup_date": "2024-01-04",
          "plan": "pro"
        }
      ]
    },
    {
      "name": "events",
      "columns": [
        {
          "name": "event_id",
          "type": "string"
        },
        {
          "name": "amount",
          "type": "number"
        },
        {
          "name": "created_at",
          "type": "date"
        }
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "h7bsi8tj-1781478372118",
  "request_id": "h7bsi8tj-1781478372118",
  "computed_at": "2026-06-14T23:06:12.118Z",
  "success": true,
  "latency_ms": 0,
  "dataset_count": 2,
  "datasets": [
    {
      "name": "users",
      "source": "rows",
      "row_count": 3,
      "column_count": 4,
      "primary_key_candidates": [
        "id",
        "email",
        "signup_date"
      ],
      "columns": [
        {
          "name": "id",
          "type": "integer",
          "nullable": false,
          "null_rate": 0,
          "distinct_count": 3,
          "sample_values": [
            1,
            2,
            3
          ],
          "tags": [
            "identifier"
          ]
        },
        {
          "name": "email",
          "type": "string",
          "nullable": false,
          "null_rate": 0,
          "distinct_count": 3,
          "sample_values": [
            "a@x.com",
            "b@y.com",
            "c@z.com"
          ],
          "tags": [
            "identifier",
            "pii_candidate"
          ]
        },
        {
          "name": "signup_date",
          "type": "date",
          "nullable": false,
          "null_rate": 0,
          "distinct_count": 3,
          "sample_values": [
            "2024-01-02",
            "2024-01-03",
            "2024-01-04"
          ],
          "tags": [
            "identifier",
            "temporal"
          ]
        },
        {
          "name": "plan",
          "type": "string",
          "nullable": false,
          "null_rate": 0,
          "distinct_count": 2,
          "sample_values": [
            "pro",
            "free"
          ],
          "tags": [
            "categorical"
          ]
        }
      ],
      "tags": [
        "has_pii",
        "has_temporal",
        "has_identifier"
      ]
    },
    {
      "name": "events",
      "source": "columns",
      "row_count": null,
      "column_count": 3,
      "primary_key_candidates": [],
      "columns": [
        {
          "name": "event_id",
          "type": "string",
          "nullable": true,
          "null_rate": null,
          "distinct_count": null,
          "sample_values": [],
          "tags": [
            "identifier"
          ]
        },
        {
          "name": "amount",
          "type": "number",
          "nullable": true,
          "null_rate": null,
          "distinct_count": null,
          "sample_values": [],
          "tags": [
            "measure"
          ]
        },
        {
          "name": "created_at",
          "type": "date",
          "nullable": true,
          "null_rate": null,
          "distinct_count": null,
          "sample_values": [],
          "tags": [
            "temporal"
          ]
        }
      ],
      "tags": [
        "has_temporal",
        "has_identifier"
      ]
    }
  ],
  "confidence_score": 0.85,
  "confidence_per_section": {
    "catalog": 1,
    "type_inference": 0.9,
    "tagging": 0.85
  },
  "recommended_actions_priority_order": [
    "Catalogued 2 dataset(s), 7 column(s) total.",
    "Possible PII in: users — review handling before publishing the catalog.",
    "Primary-key candidate(s) found in 1 dataset(s); confirm before declaring keys.",
    "Chain to data-classification to validate semantic types from values."
  ],
  "chain_to": [
    {
      "api": "data-classification",
      "reason": "Confirm semantic/PII types on the catalogued columns from sampled values."
    },
    {
      "api": "data-lineage-tracker",
      "reason": "Connect these catalogued datasets into a lineage graph."
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

### POST /lookup (nulls + categorical + PK candidate → reasoning)
Request:
```json
{
  "datasets": [
    {
      "name": "orders",
      "rows": [
        {
          "order_id": "o1",
          "status": "paid",
          "phone": "555-1"
        },
        {
          "order_id": "o2",
          "status": "paid",
          "phone": null
        },
        {
          "order_id": "o3",
          "status": "refunded",
          "phone": "555-3"
        }
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "su9lxkvp-1781478372121",
  "request_id": "su9lxkvp-1781478372121",
  "computed_at": "2026-06-14T23:06:12.121Z",
  "success": true,
  "latency_ms": 0,
  "dataset_count": 1,
  "datasets": [
    {
      "name": "orders",
      "source": "rows",
      "row_count": 3,
      "column_count": 3,
      "primary_key_candidates": [
        "order_id"
      ],
      "columns": [
        {
          "name": "order_id",
          "type": "string",
          "nullable": false,
          "null_rate": 0,
          "distinct_count": 3,
          "sample_values": [
            "o1",
            "o2",
            "o3"
          ],
          "tags": [
            "identifier"
          ]
        },
        {
          "name": "status",
          "type": "string",
          "nullable": false,
          "null_rate": 0,
          "distinct_count": 2,
          "sample_values": [
            "paid",
            "refunded"
          ],
          "tags": [
            "categorical"
          ]
        },
        {
          "name": "phone",
          "type": "string",
          "nullable": true,
          "null_rate": 0.3333,
          "distinct_count": 2,
          "sample_values": [
            "555-1",
            "555-3"
          ],
          "tags": [
            "pii_candidate",
            "categorical"
          ]
        }
      ],
      "tags": [
        "has_pii",
        "has_identifier"
      ]
    }
  ],
  "reasoning": {
    "why_result_generated": "Built catalog entries for 1 dataset(s) with 3 column(s).",
    "key_factors": [
      "orders: 3 col(s), 3 row(s); tags [has_pii, has_identifier]."
    ],
    "invalidators": [
      "Column types and stats are derived only from the supplied rows/columns; with explicit columns, null_rate/distinct_count/sample_values are null/empty (no data to measure).",
      "Tags are heuristic (name + type patterns): identifier/temporal/measure/pii_candidate/boolean_flag/categorical — verify before treating pii_candidate as authoritative PII.",
      "primary_key_candidates require a fully-populated, all-distinct column over >1 row; they are candidates, not enforced keys."
    ]
  },
  "confidence_score": 0.85,
  "confidence_per_section": {
    "catalog": 1,
    "type_inference": 0.9,
    "tagging": 0.85
  },
  "recommended_actions_priority_order": [
    "Catalogued 1 dataset(s), 3 column(s) total.",
    "Possible PII in: orders — review handling before publishing the catalog.",
    "Primary-key candidate(s) found in 1 dataset(s); confirm before declaring keys.",
    "Chain to data-classification to validate semantic types from values."
  ],
  "chain_to": [
    {
      "api": "data-classification",
      "reason": "Confirm semantic/PII types on the catalogued columns from sampled values."
    },
    {
      "api": "data-lineage-tracker",
      "reason": "Connect these catalogued datasets into a lineage graph."
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

### POST /build (schema-only dataset)
Request:
```json
{
  "datasets": [
    {
      "name": "logs",
      "columns": [
        {
          "name": "ts",
          "type": "date"
        },
        {
          "name": "level"
        }
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "u4q28ww6-1781478372124",
  "request_id": "u4q28ww6-1781478372124",
  "computed_at": "2026-06-14T23:06:12.124Z",
  "success": true,
  "latency_ms": 0,
  "dataset_count": 1,
  "datasets": [
    {
      "name": "logs",
      "source": "columns",
      "row_count": null,
      "column_count": 2,
      "primary_key_candidates": [],
      "columns": [
        {
          "name": "ts",
          "type": "date",
          "nullable": true,
          "null_rate": null,
          "distinct_count": null,
          "sample_values": [],
          "tags": [
            "temporal"
          ]
        },
        {
          "name": "level",
          "type": "string",
          "nullable": true,
          "null_rate": null,
          "distinct_count": null,
          "sample_values": [],
          "tags": []
        }
      ],
      "tags": [
        "has_temporal"
      ]
    }
  ],
  "confidence_score": 0.85,
  "confidence_per_section": {
    "catalog": 1,
    "type_inference": 1,
    "tagging": 0.85
  },
  "recommended_actions_priority_order": [
    "Catalogued 1 dataset(s), 2 column(s) total.",
    "Chain to data-classification to validate semantic types from values."
  ],
  "chain_to": [
    {
      "api": "data-classification",
      "reason": "Confirm semantic/PII types on the catalogued columns from sampled values."
    },
    {
      "api": "data-lineage-tracker",
      "reason": "Connect these catalogued datasets into a lineage graph."
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

### POST /build (error: neither rows nor columns)
Request:
```json
{
  "datasets": [
    {
      "name": "x"
    }
  ]
}
```
Response (HTTP 400):
```json
{
  "trace_id": "d0oy5oqf-1781478372126",
  "request_id": "d0oy5oqf-1781478372126",
  "computed_at": "2026-06-14T23:06:12.126Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "datasets[0] (\"x\") must supply exactly one of \"rows\" or \"columns\"."
  }
}
```

---

# scrape-data-merger

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { parseRows, isMissing, asKey, Row } from '../../_aplus/dataset';

// Deterministic scrape-data merger. Combines multiple scraped record sets, dedups
// by a (possibly composite) key, and resolves field-level conflicts with an explicit
// strategy. Reports duplicates merged, unkeyed records dropped, and conflicts found.
// Pure set operations, no LLM, nothing stored.

const router = Router();

const STRATEGIES = ['first', 'last', 'non_null', 'coalesce'] as const;
type Strategy = typeof STRATEGIES[number];
const MAX_SOURCES = 50;
const MAX_CONFLICTS = 100;

export interface SourceStat { name: string; record_count: number; }
export interface ConflictValue { source: string; value: unknown; }
export interface ConflictInfo { key: string; field: string; values: ConflictValue[]; }
export interface MergeCore {
  key: string[];
  strategy: Strategy;
  sources: SourceStat[];
  total_input: number;
  total_output: number;
  duplicates_merged: number;
  dropped_no_key: number;
  conflict_count: number;
  conflicts_truncated: boolean;
  conflicts: ConflictInfo[];
  records: Row[];
}

interface Tagged { source: string; record: Row; }

function merge(body: any): { error: string } | { result: MergeCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "key" and "sources".' };

  // key → string[]
  let key: string[];
  if (typeof body.key === 'string' && body.key !== '') key = [body.key];
  else if (Array.isArray(body.key) && body.key.length > 0 && body.key.every((k: unknown) => typeof k === 'string' && k !== '')) key = body.key as string[];
  else return { error: '"key" must be a non-empty string or array of column-name strings.' };

  const strategy: Strategy = body.strategy === undefined ? 'last' : body.strategy;
  if (!STRATEGIES.includes(strategy)) return { error: `"strategy" must be one of: ${STRATEGIES.join(', ')}.` };

  if (!Array.isArray(body.sources) || body.sources.length === 0) return { error: '"sources" must be a non-empty array of { name, records } objects.' };
  if (body.sources.length > MAX_SOURCES) return { error: `"sources" exceeds the ${MAX_SOURCES}-source limit.` };

  const sourceStats: SourceStat[] = [];
  const tagged: Tagged[] = [];
  for (let i = 0; i < body.sources.length; i++) {
    const s = body.sources[i];
    if (s === null || typeof s !== 'object' || Array.isArray(s)) return { error: `sources[${i}] must be an object.` };
    if (typeof s.name !== 'string' || s.name === '') return { error: `sources[${i}].name must be a non-empty string.` };
    const p = parseRows(s.records, `sources[${i}].records`);
    if ('error' in p) return p;
    sourceStats.push({ name: s.name, record_count: p.rows.length });
    for (const r of p.rows) tagged.push({ source: s.name, record: r });
  }

  // Group by composite key. Records missing any key field are dropped.
  const groups = new Map<string, Tagged[]>();
  const order: string[] = [];
  let droppedNoKey = 0;
  for (const t of tagged) {
    if (key.some((k) => isMissing(t.record[k], true))) { droppedNoKey++; continue; }
    const kv = key.map((k) => asKey(t.record[k])).join('');
    if (!groups.has(kv)) { groups.set(kv, []); order.push(kv); }
    groups.get(kv)!.push(t);
  }

  const conflicts: ConflictInfo[] = [];
  let conflictCount = 0;
  const records: Row[] = [];

  for (const kv of order) {
    const grp = groups.get(kv)!;
    const keyLabel = grp[0].record === undefined ? kv : key.map((k) => asKey(grp[0].record[k])).join(' / ');

    // Detect field-level conflicts (differing non-missing values within the group).
    if (grp.length > 1) {
      const fields = new Set<string>();
      for (const g of grp) for (const f of Object.keys(g.record)) if (!key.includes(f)) fields.add(f);
      for (const f of fields) {
        const seen: ConflictValue[] = [];
        const distinct = new Set<string>();
        for (const g of grp) {
          const v = g.record[f];
          if (isMissing(v, false)) continue;
          const ck = asKey(v);
          if (!distinct.has(ck)) { distinct.add(ck); seen.push({ source: g.source, value: v }); }
        }
        if (distinct.size > 1) {
          conflictCount++;
          if (conflicts.length < MAX_CONFLICTS) conflicts.push({ key: keyLabel, field: f, values: seen });
        }
      }
    }

    records.push(resolve(grp, key, strategy));
  }

  return {
    result: {
      key, strategy, sources: sourceStats,
      total_input: tagged.length,
      total_output: records.length,
      duplicates_merged: tagged.length - records.length - droppedNoKey,
      dropped_no_key: droppedNoKey,
      conflict_count: conflictCount,
      conflicts_truncated: conflictCount > conflicts.length,
      conflicts,
      records,
    },
  };
}

function resolve(grp: Tagged[], key: string[], strategy: Strategy): Row {
  if (strategy === 'first') return { ...grp[0].record };
  if (strategy === 'last') return { ...grp[grp.length - 1].record };
  // coalesce = first non-missing per field (source order); non_null = last non-missing per field.
  const out: Row = {};
  // seed key fields from the first record (they compare equal by key anyway)
  for (const k of key) out[k] = grp[0].record[k];
  const iter = strategy === 'coalesce' ? grp : [...grp].reverse(); // both walk so that the FIRST write wins
  for (const g of iter) {
    for (const [f, v] of Object.entries(g.record)) {
      if (key.includes(f)) continue;
      if (isMissing(v, false)) continue;
      if (!(f in out)) out[f] = v;
    }
  }
  // include fields that were missing everywhere as null? No — only fields seen non-missing appear,
  // plus any field present (even if missing) in at least one record should surface as null for shape stability.
  for (const g of grp) for (const f of Object.keys(g.record)) if (!key.includes(f) && !(f in out)) out[f] = null;
  return out;
}

const CHAIN_TO = [
  { api: 'scrape-data-pipeline-validator', reason: 'Validate the merged records against the expected scrape schema.' },
  { api: 'data-quality-rules', reason: 'Run uniqueness/not-null rules on the deduped output.' },
];
const INVALIDATORS = [
  'Records missing any key field are dropped (counted in dropped_no_key), not merged on a partial key.',
  'Key equality is by canonical value (1 and "1" collide); supply pre-normalized keys if that is unwanted (chain data-normalizer first).',
  'Conflicts list differing non-missing values per field; with strategy "first"/"last" the whole earliest/latest record wins regardless of per-field conflicts.',
];

function actions(r: MergeCore): string[] {
  const out = [`Merged ${r.total_input} record(s) from ${r.sources.length} source(s) → ${r.total_output} unique key(s) (${r.duplicates_merged} duplicate(s) merged, strategy "${r.strategy}").`];
  if (r.dropped_no_key > 0) out.push(`${r.dropped_no_key} record(s) dropped for missing key field(s).`);
  if (r.conflict_count > 0) out.push(`${r.conflict_count} field-level conflict(s) detected — review conflicts or pick a strategy deliberately.`);
  out.push('Chain to scrape-data-pipeline-validator or data-quality-rules on the merged output.');
  return out;
}

const TAIL = (_r: MergeCore) => ({
  confidence_score: 1, confidence_per_section: { merge: 1 },
  recommended_actions_priority_order: actions(_r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Scrape Data Merger API', version: '1.0.0',
    description: 'Deterministic scrape-data merger. Combines multiple scraped record sets, dedups by a (composite) key, and resolves field conflicts with an explicit strategy (first/last/non_null/coalesce). No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/scrape-data-merger/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/merge', summary: 'Dedup/merge scraped record sets by key', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL merge + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/merge', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/merge', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = merge(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = merge(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Deduped ${v.total_input} record(s) by [${v.key.join(', ')}] into ${v.total_output} record(s) using strategy "${v.strategy}".`,
      key_factors: [
        `Sources: ${v.sources.map((s) => `${s.name} (${s.record_count})`).join(', ')}.`,
        `${v.duplicates_merged} duplicate(s) merged, ${v.dropped_no_key} dropped for no key.`,
        `${v.conflict_count} field conflict(s).`,
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

const STRAT_ENUM = ['first', 'last', 'non_null', 'coalesce'];
const Row = rowSchema();
const SourceStat = {
  type: 'object', required: ['name', 'record_count'], additionalProperties: false,
  properties: { name: { type: 'string' }, record_count: { type: 'integer', minimum: 0 } },
};
const ConflictValue = {
  type: 'object', required: ['source', 'value'], additionalProperties: false,
  properties: { source: { type: 'string' }, value: { ...CellValue, description: 'A distinct non-missing value seen for this field.' } },
};
const ConflictInfo = {
  type: 'object', required: ['key', 'field', 'values'], additionalProperties: false,
  properties: {
    key: { type: 'string', description: 'Canonical key value of the conflicting group.' },
    field: { type: 'string' },
    values: { type: 'array', items: ConflictValue, minItems: 2 },
  },
};
const MergeCore = {
  type: 'object',
  required: ['key', 'strategy', 'sources', 'total_input', 'total_output', 'duplicates_merged', 'dropped_no_key', 'conflict_count', 'conflicts_truncated', 'conflicts', 'records'],
  properties: {
    key: { type: 'array', items: { type: 'string' } },
    strategy: { type: 'string', enum: STRAT_ENUM },
    sources: { type: 'array', items: SourceStat },
    total_input: { type: 'integer', minimum: 0 },
    total_output: { type: 'integer', minimum: 0 },
    duplicates_merged: { type: 'integer', minimum: 0 },
    dropped_no_key: { type: 'integer', minimum: 0 },
    conflict_count: { type: 'integer', minimum: 0 },
    conflicts_truncated: { type: 'boolean', description: 'True when conflict_count exceeds the returned conflicts sample.' },
    conflicts: { type: 'array', items: ConflictInfo },
    records: { type: 'array', items: Row },
  },
};
const SourceInput = {
  type: 'object', required: ['name', 'records'], additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Source label (e.g. site or feed name).' },
    records: { type: 'array', items: Row, minItems: 1, description: 'Scraped records from this source.' },
  },
};
const MergeRequest = {
  type: 'object', required: ['key', 'sources'], additionalProperties: false,
  properties: {
    key: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }], description: 'Dedup key column, or array of columns for a composite key.' },
    strategy: { type: 'string', enum: STRAT_ENUM, description: 'Conflict resolution: first/last (whole record) or non_null/coalesce (per field). Default last.' },
    sources: { type: 'array', items: SourceInput, minItems: 1, description: 'Record sets to merge, in priority order.' },
  },
};

const CORE = {
  key: ['id'], strategy: 'non_null',
  sources: [{ name: 'siteA', record_count: 2 }, { name: 'siteB', record_count: 2 }],
  total_input: 4, total_output: 3, duplicates_merged: 1, dropped_no_key: 0,
  conflict_count: 1, conflicts_truncated: false,
  conflicts: [
    { key: '1', field: 'name', values: [{ source: 'siteA', value: 'Acme' }, { source: 'siteB', value: 'Acme Inc' }] },
  ],
  records: [
    { id: '1', name: 'Acme Inc', email: 'info@acme.com', phone: '555-1' },
    { id: '2', name: 'Beta', phone: '555-2' },
    { id: '3', name: 'Gamma' },
  ],
};
const CHAIN = [
  { api: 'scrape-data-pipeline-validator', reason: 'Validate the merged records against the expected scrape schema.' },
  { api: 'data-quality-rules', reason: 'Run uniqueness/not-null rules on the deduped output.' },
];
const INVALIDATORS = [
  'Records missing any key field are dropped (counted in dropped_no_key), not merged on a partial key.',
  'Key equality is by canonical value (1 and "1" collide); supply pre-normalized keys if that is unwanted (chain data-normalizer first).',
  'Conflicts list differing non-missing values per field; with strategy "first"/"last" the whole earliest/latest record wins regardless of per-field conflicts.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { merge: 1 },
  recommended_actions_priority_order: [
    'Merged 4 record(s) from 2 source(s) → 3 unique key(s) (1 duplicate(s) merged, strategy "non_null").',
    '1 field-level conflict(s) detected — review conflicts or pick a strategy deliberately.',
    'Chain to scrape-data-pipeline-validator or data-quality-rules on the merged output.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('merge'), _Tail: Tail,
  SourceStat, ConflictValue, ConflictInfo, MergeCore, SourceInput, MergeRequest, DiscoveryResponse: discoverySchema(),
  MergeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/MergeCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/MergeCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'sdm-1780000000000', request_id: 'sdm-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  key: 'id',
  strategy: 'non_null',
  sources: [
    { name: 'siteA', records: [{ id: '1', name: 'Acme', phone: '555-1', email: null }, { id: '2', name: 'Beta', phone: '555-2' }] },
    { name: 'siteB', records: [{ id: '1', name: 'Acme Inc', email: 'info@acme.com' }, { id: '3', name: 'Gamma' }] },
  ],
};
const disc = {
  name: 'Scrape Data Merger API', version: '1.0.0',
  description: 'Deterministic scrape-data merger. Combines multiple scraped record sets, dedups by a (composite) key, and resolves field conflicts with an explicit strategy (first/last/non_null/coalesce). No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/scrape-data-merger/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/merge', summary: 'Dedup/merge scraped record sets by key', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL merge + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/merge', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/merge', summary: 'Dedup/merge scraped record sets by key', operationId: 'merge', priceUsdc: 0.007,
    requestSchemaRef: 'MergeRequest', responseSchemaRef: 'MergeResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL merge + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'MergeRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Deduped 4 record(s) by [id] into 3 record(s) using strategy "non_null".',
        key_factors: ['Sources: siteA (2), siteB (2).', '1 duplicate(s) merged, 0 dropped for no key.', '1 field conflict(s).'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'scrape-data-merger', title: 'Scrape Data Merger API', version: '1.0.0',
  description: 'Deterministic scrape-data merger — dedup/merge multiple record sets by key with explicit conflict strategy. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /scrape-data-merger/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Scrape Data Merger API",
    "version": "1.0.0",
    "description": "Deterministic scrape-data merger — dedup/merge multiple record sets by key with explicit conflict strategy. No LLM.",
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
      "url": "https://orbis-apis.onrender.com/scrape-data-merger"
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
                  "name": "Scrape Data Merger API",
                  "version": "1.0.0",
                  "description": "Deterministic scrape-data merger. Combines multiple scraped record sets, dedups by a (composite) key, and resolves field conflicts with an explicit strategy (first/last/non_null/coalesce). No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/scrape-data-merger/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/merge",
                      "summary": "Dedup/merge scraped record sets by key",
                      "price_usdc": 0.007
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL merge + reasoning",
                      "price_usdc": 0.012
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/merge",
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
    "/merge": {
      "post": {
        "operationId": "merge",
        "summary": "Dedup/merge scraped record sets by key",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MergeResponse"
                },
                "example": {
                  "trace_id": "sdm-1780000000000",
                  "request_id": "sdm-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "key": [
                    "id"
                  ],
                  "strategy": "non_null",
                  "sources": [
                    {
                      "name": "siteA",
                      "record_count": 2
                    },
                    {
                      "name": "siteB",
                      "record_count": 2
                    }
                  ],
                  "total_input": 4,
                  "total_output": 3,
                  "duplicates_merged": 1,
                  "dropped_no_key": 0,
                  "conflict_count": 1,
                  "conflicts_truncated": false,
                  "conflicts": [
                    {
                      "key": "1",
                      "field": "name",
                      "values": [
                        {
                          "source": "siteA",
                          "value": "Acme"
                        },
                        {
                          "source": "siteB",
                          "value": "Acme Inc"
                        }
                      ]
                    }
                  ],
                  "records": [
                    {
                      "id": "1",
                      "name": "Acme Inc",
                      "email": "info@acme.com",
                      "phone": "555-1"
                    },
                    {
                      "id": "2",
                      "name": "Beta",
                      "phone": "555-2"
                    },
                    {
                      "id": "3",
                      "name": "Gamma"
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "merge": 1
                  },
                  "recommended_actions_priority_order": [
                    "Merged 4 record(s) from 2 source(s) → 3 unique key(s) (1 duplicate(s) merged, strategy \"non_null\").",
                    "1 field-level conflict(s) detected — review conflicts or pick a strategy deliberately.",
                    "Chain to scrape-data-pipeline-validator or data-quality-rules on the merged output."
                  ],
                  "chain_to": [
                    {
                      "api": "scrape-data-pipeline-validator",
                      "reason": "Validate the merged records against the expected scrape schema."
                    },
                    {
                      "api": "data-quality-rules",
                      "reason": "Run uniqueness/not-null rules on the deduped output."
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
                "$ref": "#/components/schemas/MergeRequest"
              },
              "example": {
                "key": "id",
                "strategy": "non_null",
                "sources": [
                  {
                    "name": "siteA",
                    "records": [
                      {
                        "id": "1",
                        "name": "Acme",
                        "phone": "555-1",
                        "email": null
                      },
                      {
                        "id": "2",
                        "name": "Beta",
                        "phone": "555-2"
                      }
                    ]
                  },
                  {
                    "name": "siteB",
                    "records": [
                      {
                        "id": "1",
                        "name": "Acme Inc",
                        "email": "info@acme.com"
                      },
                      {
                        "id": "3",
                        "name": "Gamma"
                      }
                    ]
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
        "summary": "ONE-CALL merge + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "sdm-1780000000000",
                  "request_id": "sdm-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "key": [
                    "id"
                  ],
                  "strategy": "non_null",
                  "sources": [
                    {
                      "name": "siteA",
                      "record_count": 2
                    },
                    {
                      "name": "siteB",
                      "record_count": 2
                    }
                  ],
                  "total_input": 4,
                  "total_output": 3,
                  "duplicates_merged": 1,
                  "dropped_no_key": 0,
                  "conflict_count": 1,
                  "conflicts_truncated": false,
                  "conflicts": [
                    {
                      "key": "1",
                      "field": "name",
                      "values": [
                        {
                          "source": "siteA",
                          "value": "Acme"
                        },
                        {
                          "source": "siteB",
                          "value": "Acme Inc"
                        }
                      ]
                    }
                  ],
                  "records": [
                    {
                      "id": "1",
                      "name": "Acme Inc",
                      "email": "info@acme.com",
                      "phone": "555-1"
                    },
                    {
                      "id": "2",
                      "name": "Beta",
                      "phone": "555-2"
                    },
                    {
                      "id": "3",
                      "name": "Gamma"
                    }
                  ],
                  "reasoning": {
                    "why_result_generated": "Deduped 4 record(s) by [id] into 3 record(s) using strategy \"non_null\".",
                    "key_factors": [
                      "Sources: siteA (2), siteB (2).",
                      "1 duplicate(s) merged, 0 dropped for no key.",
                      "1 field conflict(s)."
                    ],
                    "invalidators": [
                      "Records missing any key field are dropped (counted in dropped_no_key), not merged on a partial key.",
                      "Key equality is by canonical value (1 and \"1\" collide); supply pre-normalized keys if that is unwanted (chain data-normalizer first).",
                      "Conflicts list differing non-missing values per field; with strategy \"first\"/\"last\" the whole earliest/latest record wins regardless of per-field conflicts."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "merge": 1
                  },
                  "recommended_actions_priority_order": [
                    "Merged 4 record(s) from 2 source(s) → 3 unique key(s) (1 duplicate(s) merged, strategy \"non_null\").",
                    "1 field-level conflict(s) detected — review conflicts or pick a strategy deliberately.",
                    "Chain to scrape-data-pipeline-validator or data-quality-rules on the merged output."
                  ],
                  "chain_to": [
                    {
                      "api": "scrape-data-pipeline-validator",
                      "reason": "Validate the merged records against the expected scrape schema."
                    },
                    {
                      "api": "data-quality-rules",
                      "reason": "Run uniqueness/not-null rules on the deduped output."
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
                "$ref": "#/components/schemas/MergeRequest"
              },
              "example": {
                "key": "id",
                "strategy": "non_null",
                "sources": [
                  {
                    "name": "siteA",
                    "records": [
                      {
                        "id": "1",
                        "name": "Acme",
                        "phone": "555-1",
                        "email": null
                      },
                      {
                        "id": "2",
                        "name": "Beta",
                        "phone": "555-2"
                      }
                    ]
                  },
                  {
                    "name": "siteB",
                    "records": [
                      {
                        "id": "1",
                        "name": "Acme Inc",
                        "email": "info@acme.com"
                      },
                      {
                        "id": "3",
                        "name": "Gamma"
                      }
                    ]
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
          "merge": {
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
      "SourceStat": {
        "type": "object",
        "required": [
          "name",
          "record_count"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "record_count": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "ConflictValue": {
        "type": "object",
        "required": [
          "source",
          "value"
        ],
        "additionalProperties": false,
        "properties": {
          "source": {
            "type": "string"
          },
          "value": {
            "description": "A distinct non-missing value seen for this field.",
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
      "ConflictInfo": {
        "type": "object",
        "required": [
          "key",
          "field",
          "values"
        ],
        "additionalProperties": false,
        "properties": {
          "key": {
            "type": "string",
            "description": "Canonical key value of the conflicting group."
          },
          "field": {
            "type": "string"
          },
          "values": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "source",
                "value"
              ],
              "additionalProperties": false,
              "properties": {
                "source": {
                  "type": "string"
                },
                "value": {
                  "description": "A distinct non-missing value seen for this field.",
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
            "minItems": 2
          }
        }
      },
      "MergeCore": {
        "type": "object",
        "required": [
          "key",
          "strategy",
          "sources",
          "total_input",
          "total_output",
          "duplicates_merged",
          "dropped_no_key",
          "conflict_count",
          "conflicts_truncated",
          "conflicts",
          "records"
        ],
        "properties": {
          "key": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "strategy": {
            "type": "string",
            "enum": [
              "first",
              "last",
              "non_null",
              "coalesce"
            ]
          },
          "sources": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name",
                "record_count"
              ],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string"
                },
                "record_count": {
                  "type": "integer",
                  "minimum": 0
                }
              }
            }
          },
          "total_input": {
            "type": "integer",
            "minimum": 0
          },
          "total_output": {
            "type": "integer",
            "minimum": 0
          },
          "duplicates_merged": {
            "type": "integer",
            "minimum": 0
          },
          "dropped_no_key": {
            "type": "integer",
            "minimum": 0
          },
          "conflict_count": {
            "type": "integer",
            "minimum": 0
          },
          "conflicts_truncated": {
            "type": "boolean",
            "description": "True when conflict_count exceeds the returned conflicts sample."
          },
          "conflicts": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "key",
                "field",
                "values"
              ],
              "additionalProperties": false,
              "properties": {
                "key": {
                  "type": "string",
                  "description": "Canonical key value of the conflicting group."
                },
                "field": {
                  "type": "string"
                },
                "values": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": [
                      "source",
                      "value"
                    ],
                    "additionalProperties": false,
                    "properties": {
                      "source": {
                        "type": "string"
                      },
                      "value": {
                        "description": "A distinct non-missing value seen for this field.",
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
                  "minItems": 2
                }
              }
            }
          },
          "records": {
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
      "SourceInput": {
        "type": "object",
        "required": [
          "name",
          "records"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "description": "Source label (e.g. site or feed name)."
          },
          "records": {
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
            "description": "Scraped records from this source."
          }
        }
      },
      "MergeRequest": {
        "type": "object",
        "required": [
          "key",
          "sources"
        ],
        "additionalProperties": false,
        "properties": {
          "key": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "array",
                "items": {
                  "type": "string"
                },
                "minItems": 1
              }
            ],
            "description": "Dedup key column, or array of columns for a composite key."
          },
          "strategy": {
            "type": "string",
            "enum": [
              "first",
              "last",
              "non_null",
              "coalesce"
            ],
            "description": "Conflict resolution: first/last (whole record) or non_null/coalesce (per field). Default last."
          },
          "sources": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name",
                "records"
              ],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string",
                  "description": "Source label (e.g. site or feed name)."
                },
                "records": {
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
                  "description": "Scraped records from this source."
                }
              }
            },
            "minItems": 1,
            "description": "Record sets to merge, in priority order."
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
      "MergeResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/MergeCore"
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
            "$ref": "#/components/schemas/MergeCore"
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
### POST /merge (non_null strategy + conflict + dedup)
Request:
```json
{
  "key": "id",
  "strategy": "non_null",
  "sources": [
    {
      "name": "siteA",
      "records": [
        {
          "id": "1",
          "name": "Acme",
          "phone": "555-1",
          "email": null
        },
        {
          "id": "2",
          "name": "Beta",
          "phone": "555-2"
        }
      ]
    },
    {
      "name": "siteB",
      "records": [
        {
          "id": "1",
          "name": "Acme Inc",
          "email": "info@acme.com"
        },
        {
          "id": "3",
          "name": "Gamma"
        }
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "72jitdf8-1781478372133",
  "request_id": "72jitdf8-1781478372133",
  "computed_at": "2026-06-14T23:06:12.133Z",
  "success": true,
  "latency_ms": 0,
  "key": [
    "id"
  ],
  "strategy": "non_null",
  "sources": [
    {
      "name": "siteA",
      "record_count": 2
    },
    {
      "name": "siteB",
      "record_count": 2
    }
  ],
  "total_input": 4,
  "total_output": 3,
  "duplicates_merged": 1,
  "dropped_no_key": 0,
  "conflict_count": 1,
  "conflicts_truncated": false,
  "conflicts": [
    {
      "key": "1",
      "field": "name",
      "values": [
        {
          "source": "siteA",
          "value": "Acme"
        },
        {
          "source": "siteB",
          "value": "Acme Inc"
        }
      ]
    }
  ],
  "records": [
    {
      "id": "1",
      "name": "Acme Inc",
      "email": "info@acme.com",
      "phone": "555-1"
    },
    {
      "id": "2",
      "name": "Beta",
      "phone": "555-2"
    },
    {
      "id": "3",
      "name": "Gamma"
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "merge": 1
  },
  "recommended_actions_priority_order": [
    "Merged 4 record(s) from 2 source(s) → 3 unique key(s) (1 duplicate(s) merged, strategy \"non_null\").",
    "1 field-level conflict(s) detected — review conflicts or pick a strategy deliberately.",
    "Chain to scrape-data-pipeline-validator or data-quality-rules on the merged output."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the merged records against the expected scrape schema."
    },
    {
      "api": "data-quality-rules",
      "reason": "Run uniqueness/not-null rules on the deduped output."
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

### POST /lookup (coalesce + dropped no-key → reasoning)
Request:
```json
{
  "key": "sku",
  "strategy": "coalesce",
  "sources": [
    {
      "name": "feed1",
      "records": [
        {
          "sku": "A",
          "price": null,
          "title": "A1"
        },
        {
          "nokey": true
        }
      ]
    },
    {
      "name": "feed2",
      "records": [
        {
          "sku": "A",
          "price": "9.99"
        }
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "gxtb0098-1781478372136",
  "request_id": "gxtb0098-1781478372136",
  "computed_at": "2026-06-14T23:06:12.136Z",
  "success": true,
  "latency_ms": 0,
  "key": [
    "sku"
  ],
  "strategy": "coalesce",
  "sources": [
    {
      "name": "feed1",
      "record_count": 2
    },
    {
      "name": "feed2",
      "record_count": 1
    }
  ],
  "total_input": 3,
  "total_output": 1,
  "duplicates_merged": 1,
  "dropped_no_key": 1,
  "conflict_count": 0,
  "conflicts_truncated": false,
  "conflicts": [],
  "records": [
    {
      "sku": "A",
      "title": "A1",
      "price": "9.99"
    }
  ],
  "reasoning": {
    "why_result_generated": "Deduped 3 record(s) by [sku] into 1 record(s) using strategy \"coalesce\".",
    "key_factors": [
      "Sources: feed1 (2), feed2 (1).",
      "1 duplicate(s) merged, 1 dropped for no key.",
      "0 field conflict(s)."
    ],
    "invalidators": [
      "Records missing any key field are dropped (counted in dropped_no_key), not merged on a partial key.",
      "Key equality is by canonical value (1 and \"1\" collide); supply pre-normalized keys if that is unwanted (chain data-normalizer first).",
      "Conflicts list differing non-missing values per field; with strategy \"first\"/\"last\" the whole earliest/latest record wins regardless of per-field conflicts."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "merge": 1
  },
  "recommended_actions_priority_order": [
    "Merged 3 record(s) from 2 source(s) → 1 unique key(s) (1 duplicate(s) merged, strategy \"coalesce\").",
    "1 record(s) dropped for missing key field(s).",
    "Chain to scrape-data-pipeline-validator or data-quality-rules on the merged output."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the merged records against the expected scrape schema."
    },
    {
      "api": "data-quality-rules",
      "reason": "Run uniqueness/not-null rules on the deduped output."
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

### POST /merge (composite key, first strategy)
Request:
```json
{
  "key": [
    "region",
    "id"
  ],
  "strategy": "first",
  "sources": [
    {
      "name": "s",
      "records": [
        {
          "region": "us",
          "id": "1",
          "v": "a"
        },
        {
          "region": "us",
          "id": "1",
          "v": "b"
        },
        {
          "region": "eu",
          "id": "1",
          "v": "c"
        }
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "7ys635jl-1781478372138",
  "request_id": "7ys635jl-1781478372138",
  "computed_at": "2026-06-14T23:06:12.138Z",
  "success": true,
  "latency_ms": 0,
  "key": [
    "region",
    "id"
  ],
  "strategy": "first",
  "sources": [
    {
      "name": "s",
      "record_count": 3
    }
  ],
  "total_input": 3,
  "total_output": 2,
  "duplicates_merged": 1,
  "dropped_no_key": 0,
  "conflict_count": 1,
  "conflicts_truncated": false,
  "conflicts": [
    {
      "key": "us / 1",
      "field": "v",
      "values": [
        {
          "source": "s",
          "value": "a"
        },
        {
          "source": "s",
          "value": "b"
        }
      ]
    }
  ],
  "records": [
    {
      "region": "us",
      "id": "1",
      "v": "a"
    },
    {
      "region": "eu",
      "id": "1",
      "v": "c"
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "merge": 1
  },
  "recommended_actions_priority_order": [
    "Merged 3 record(s) from 1 source(s) → 2 unique key(s) (1 duplicate(s) merged, strategy \"first\").",
    "1 field-level conflict(s) detected — review conflicts or pick a strategy deliberately.",
    "Chain to scrape-data-pipeline-validator or data-quality-rules on the merged output."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the merged records against the expected scrape schema."
    },
    {
      "api": "data-quality-rules",
      "reason": "Run uniqueness/not-null rules on the deduped output."
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

### POST /merge (error: missing sources)
Request:
```json
{
  "key": "id"
}
```
Response (HTTP 400):
```json
{
  "trace_id": "3j5dxf71-1781478372139",
  "request_id": "3j5dxf71-1781478372139",
  "computed_at": "2026-06-14T23:06:12.139Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"sources\" must be a non-empty array of { name, records } objects."
  }
}
```

---

# scrape-data-enricher

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { parseRows, isMissing, Row } from '../../_aplus/dataset';

// Deterministic scrape-data enricher. Augments scraped records with new fields via
// declarative, deterministic rules — constant, concat, coalesce, lookup_map, and
// regex_extract (ReDoS-guarded). No external lookups, no LLM, nothing stored.

const router = Router();

const RULE_TYPES = ['constant', 'concat', 'coalesce', 'lookup_map', 'regex_extract'] as const;
const MAX_RULES = 50;
const MAX_PATTERN = 300;
const SAFE_FLAGS = /^[imsu]*$/; // never g/y (stateful lastIndex), bounded set
const NESTED_QUANT = /\([^)]*[+*][^)]*\)[+*]/; // crude (a+)+ / (a*)* ReDoS guard

export interface RuleResult { type: string; target: string; cells_written: number; matched?: number; defaulted?: number; misses?: number; }
export interface EnrichCore { record_count: number; rules_applied: number; per_rule: RuleResult[]; records: Row[]; }

type Rule =
  | { type: 'constant'; target: string; value: unknown }
  | { type: 'concat'; target: string; sources: string[]; separator: string }
  | { type: 'coalesce'; target: string; sources: string[] }
  | { type: 'lookup_map'; target: string; source: string; map: Record<string, unknown>; hasDefault: boolean; def: unknown }
  | { type: 'regex_extract'; target: string; source: string; re: RegExp; group: number };

function parseRule(r: any, i: number): { error: string } | { rule: Rule } {
  if (r === null || typeof r !== 'object' || Array.isArray(r)) return { error: `rules[${i}] must be an object.` };
  if (!RULE_TYPES.includes(r.type)) return { error: `rules[${i}].type must be one of: ${RULE_TYPES.join(', ')}.` };
  if (typeof r.target !== 'string' || r.target === '') return { error: `rules[${i}].target must be a non-empty string.` };
  if (r.type === 'constant') {
    if (!('value' in r)) return { error: `rules[${i}] (constant) needs a "value".` };
    return { rule: { type: 'constant', target: r.target, value: r.value } };
  }
  if (r.type === 'concat' || r.type === 'coalesce') {
    if (!Array.isArray(r.sources) || r.sources.length === 0 || !r.sources.every((s: unknown) => typeof s === 'string' && s !== '')) return { error: `rules[${i}] (${r.type}) needs a non-empty "sources" array of column names.` };
    if (r.type === 'concat') {
      const sep = r.separator === undefined ? '' : r.separator;
      if (typeof sep !== 'string') return { error: `rules[${i}] (concat).separator must be a string.` };
      return { rule: { type: 'concat', target: r.target, sources: r.sources, separator: sep } };
    }
    return { rule: { type: 'coalesce', target: r.target, sources: r.sources } };
  }
  if (r.type === 'lookup_map') {
    if (typeof r.source !== 'string' || r.source === '') return { error: `rules[${i}] (lookup_map) needs a "source" column.` };
    if (r.map === null || typeof r.map !== 'object' || Array.isArray(r.map)) return { error: `rules[${i}] (lookup_map).map must be an object of key → value.` };
    return { rule: { type: 'lookup_map', target: r.target, source: r.source, map: r.map, hasDefault: 'default' in r, def: r.default } };
  }
  // regex_extract
  if (typeof r.source !== 'string' || r.source === '') return { error: `rules[${i}] (regex_extract) needs a "source" column.` };
  if (typeof r.pattern !== 'string' || r.pattern === '') return { error: `rules[${i}] (regex_extract) needs a "pattern" string.` };
  if (r.pattern.length > MAX_PATTERN) return { error: `rules[${i}] pattern exceeds ${MAX_PATTERN} chars.` };
  if (NESTED_QUANT.test(r.pattern)) return { error: `rules[${i}] pattern has a nested unbounded quantifier (ReDoS risk); rewrite it.` };
  const flags = r.flags === undefined ? '' : r.flags;
  if (typeof flags !== 'string' || !SAFE_FLAGS.test(flags)) return { error: `rules[${i}].flags may only contain i, m, s, u.` };
  const group = r.group === undefined ? 1 : r.group;
  if (typeof group !== 'number' || !Number.isInteger(group) || group < 0) return { error: `rules[${i}].group must be a non-negative integer (default 1).` };
  let re: RegExp;
  try { re = new RegExp(r.pattern, flags); } catch { return { error: `rules[${i}].pattern is not a valid regular expression.` }; }
  return { rule: { type: 'regex_extract', target: r.target, source: r.source, re, group } };
}

function enrich(body: any): { error: string } | { result: EnrichCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "records" and "rules".' };
  const p = parseRows(body.records, 'records');
  if ('error' in p) return p;
  if (!Array.isArray(body.rules) || body.rules.length === 0) return { error: '"rules" must be a non-empty array.' };
  if (body.rules.length > MAX_RULES) return { error: `"rules" exceeds the ${MAX_RULES}-rule limit.` };

  const rules: Rule[] = [];
  for (let i = 0; i < body.rules.length; i++) {
    const pr = parseRule(body.rules[i], i);
    if ('error' in pr) return pr;
    rules.push(pr.rule);
  }

  const records: Row[] = p.rows.map((r) => ({ ...r }));
  const per_rule: RuleResult[] = [];

  for (const rule of rules) {
    let written = 0, matched = 0, defaulted = 0, misses = 0;
    for (const row of records) {
      if (rule.type === 'constant') { row[rule.target] = rule.value; written++; continue; }
      if (rule.type === 'concat') {
        row[rule.target] = rule.sources.map((s) => (isMissing(row[s], false) ? '' : String(row[s]))).join(rule.separator); written++; continue;
      }
      if (rule.type === 'coalesce') {
        let val: unknown = null; let hit = false;
        for (const s of rule.sources) { if (!isMissing(row[s], false)) { val = row[s]; hit = true; break; } }
        row[rule.target] = val; written++; if (hit) matched++; else misses++; continue;
      }
      if (rule.type === 'lookup_map') {
        const v = row[rule.source];
        if (isMissing(v, false)) { if (rule.hasDefault) { row[rule.target] = rule.def; defaulted++; } else { row[rule.target] = null; misses++; } written++; continue; }
        const k = String(v);
        if (Object.prototype.hasOwnProperty.call(rule.map, k)) { row[rule.target] = rule.map[k]; matched++; }
        else if (rule.hasDefault) { row[rule.target] = rule.def; defaulted++; }
        else { row[rule.target] = null; misses++; }
        written++; continue;
      }
      // regex_extract
      const v = row[rule.source];
      if (isMissing(v, false)) { row[rule.target] = null; misses++; written++; continue; }
      const m = String(v).match(rule.re);
      if (m && m[rule.group] !== undefined) { row[rule.target] = m[rule.group]; matched++; }
      else { row[rule.target] = null; misses++; }
      written++;
    }
    const res: RuleResult = { type: rule.type, target: rule.target, cells_written: written };
    if (rule.type === 'coalesce' || rule.type === 'lookup_map' || rule.type === 'regex_extract') { res.matched = matched; res.misses = misses; }
    if (rule.type === 'lookup_map') res.defaulted = defaulted;
    per_rule.push(res);
  }

  return { result: { record_count: records.length, rules_applied: rules.length, per_rule, records } };
}

const CHAIN_TO = [
  { api: 'scrape-data-pipeline-validator', reason: 'Validate the enriched records against the expected schema.' },
  { api: 'data-classification', reason: 'Re-classify columns now that derived fields exist.' },
];
const INVALIDATORS = [
  'Enrichment is deterministic and local: lookup_map uses the supplied table only (no external lookups); an unmapped key uses the rule default or null.',
  'regex_extract returns the requested capture group (default group 1; group 0 = whole match) of the FIRST match, or null if no match; g/y flags are rejected.',
  'concat/coalesce treat null/empty as missing; concat renders missing as "" while coalesce skips to the next source.',
];

function actions(r: EnrichCore): string[] {
  const out = [`Applied ${r.rules_applied} rule(s) over ${r.record_count} record(s).`];
  const misses = r.per_rule.reduce((a, p) => a + (p.misses ?? 0), 0);
  if (misses > 0) out.push(`${misses} unmatched cell(s) across lookup/coalesce/regex rules set to null or default — inspect source values.`);
  out.push('Chain to scrape-data-pipeline-validator to confirm the enriched shape.');
  return out;
}

const TAIL = (_r: EnrichCore) => ({
  confidence_score: 1, confidence_per_section: { enrichment: 1 },
  recommended_actions_priority_order: actions(_r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Scrape Data Enricher API', version: '1.0.0',
    description: 'Deterministic scrape-data enricher. Augments scraped records with new fields via declarative rules (constant, concat, coalesce, lookup_map, regex_extract). No external lookups, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/scrape-data-enricher/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/enrich', summary: 'Augment records with deterministic enrichment rules', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL enrich + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/enrich', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/enrich', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = enrich(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = enrich(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Applied ${v.rules_applied} enrichment rule(s) over ${v.record_count} record(s).`,
      key_factors: v.per_rule.map((p) => `${p.type} → ${p.target}: wrote ${p.cells_written}${p.matched !== undefined ? `, matched ${p.matched}` : ''}${p.misses ? `, missed ${p.misses}` : ''}.`),
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

const RULE_TYPE_ENUM = ['constant', 'concat', 'coalesce', 'lookup_map', 'regex_extract'];
const Row = rowSchema();
const RuleResult = {
  type: 'object', required: ['type', 'target', 'cells_written'], additionalProperties: false,
  properties: {
    type: { type: 'string', enum: RULE_TYPE_ENUM },
    target: { type: 'string' },
    cells_written: { type: 'integer', minimum: 0 },
    matched: { type: 'integer', minimum: 0, description: 'Records where a value was resolved (coalesce/lookup_map/regex_extract).' },
    defaulted: { type: 'integer', minimum: 0, description: 'Records that fell back to the rule default (lookup_map).' },
    misses: { type: 'integer', minimum: 0, description: 'Records with no resolved value, set to null/default.' },
  },
};
const EnrichCore = {
  type: 'object', required: ['record_count', 'rules_applied', 'per_rule', 'records'],
  properties: {
    record_count: { type: 'integer', minimum: 0 },
    rules_applied: { type: 'integer', minimum: 0 },
    per_rule: { type: 'array', items: RuleResult },
    records: { type: 'array', items: Row },
  },
};
// Closed, discriminated rule variants.
const ConstantRule = { type: 'object', additionalProperties: false, required: ['type', 'target', 'value'], properties: { type: { const: 'constant' }, target: { type: 'string' }, value: { ...CellValue, description: 'Constant value written to every record.' } } };
const ConcatRule = { type: 'object', additionalProperties: false, required: ['type', 'target', 'sources'], properties: { type: { const: 'concat' }, target: { type: 'string' }, sources: { type: 'array', minItems: 1, items: { type: 'string' } }, separator: { type: 'string' } } };
const CoalesceRule = { type: 'object', additionalProperties: false, required: ['type', 'target', 'sources'], properties: { type: { const: 'coalesce' }, target: { type: 'string' }, sources: { type: 'array', minItems: 1, items: { type: 'string' } } } };
const LookupMapRule = { type: 'object', additionalProperties: false, required: ['type', 'target', 'source', 'map'], properties: { type: { const: 'lookup_map' }, target: { type: 'string' }, source: { type: 'string' }, map: { type: 'object', additionalProperties: CellValue, description: 'Key → value lookup table.' }, default: { ...CellValue, description: 'Value when the source value is missing or unmapped.' } } };
const RegexExtractRule = { type: 'object', additionalProperties: false, required: ['type', 'target', 'source', 'pattern'], properties: { type: { const: 'regex_extract' }, target: { type: 'string' }, source: { type: 'string' }, pattern: { type: 'string', maxLength: 300 }, flags: { type: 'string', description: 'Optional regex flags (i, m, s, u only — never g/y).' }, group: { type: 'integer', minimum: 0, description: 'Capture group to return (default 1; 0 = whole match).' } } };
const Rule = { oneOf: [ConstantRule, ConcatRule, CoalesceRule, LookupMapRule, RegexExtractRule], description: 'A deterministic enrichment rule; shape depends on "type".' };
const EnrichRequest = {
  type: 'object', required: ['records', 'rules'], additionalProperties: false,
  properties: {
    records: { type: 'array', items: Row, minItems: 1, description: 'Scraped records to enrich.' },
    rules: { type: 'array', items: Rule, minItems: 1, description: 'Ordered enrichment rules.' },
  },
};

const CORE = {
  record_count: 2, rules_applied: 5,
  per_rule: [
    { type: 'concat', target: 'full_name', cells_written: 2 },
    { type: 'lookup_map', target: 'country_name', cells_written: 2, matched: 1, misses: 0, defaulted: 1 },
    { type: 'regex_extract', target: 'domain', cells_written: 2, matched: 1, misses: 1 },
    { type: 'coalesce', target: 'contact', cells_written: 2, matched: 1, misses: 1 },
    { type: 'constant', target: 'source_tag', cells_written: 2 },
  ],
  records: [
    { first: 'Ann', last: 'Lee', country: 'US', url: 'https://acme.com/p/1', mobile: '555-1', full_name: 'Ann Lee', country_name: 'United States', domain: 'acme.com', contact: '555-1', source_tag: 'scrape' },
    { first: 'Bob', last: 'Ng', country: 'XX', url: 'not-a-url', full_name: 'Bob Ng', country_name: 'Unknown', domain: null, contact: null, source_tag: 'scrape' },
  ],
};
const CHAIN = [
  { api: 'scrape-data-pipeline-validator', reason: 'Validate the enriched records against the expected schema.' },
  { api: 'data-classification', reason: 'Re-classify columns now that derived fields exist.' },
];
const INVALIDATORS = [
  'Enrichment is deterministic and local: lookup_map uses the supplied table only (no external lookups); an unmapped key uses the rule default or null.',
  'regex_extract returns the requested capture group (default group 1; group 0 = whole match) of the FIRST match, or null if no match; g/y flags are rejected.',
  'concat/coalesce treat null/empty as missing; concat renders missing as "" while coalesce skips to the next source.',
];
const TAIL = {
  confidence_score: 1, confidence_per_section: { enrichment: 1 },
  recommended_actions_priority_order: [
    'Applied 5 rule(s) over 2 record(s).',
    '2 unmatched cell(s) across lookup/coalesce/regex rules set to null or default — inspect source values.',
    'Chain to scrape-data-pipeline-validator to confirm the enriched shape.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('enrichment'), _Tail: Tail,
  RuleResult, EnrichCore, Rule, EnrichRequest, DiscoveryResponse: discoverySchema(),
  EnrichResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EnrichCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/EnrichCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'sde-1780000000000', request_id: 'sde-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  records: [
    { first: 'Ann', last: 'Lee', country: 'US', url: 'https://acme.com/p/1', mobile: '555-1' },
    { first: 'Bob', last: 'Ng', country: 'XX', url: 'not-a-url' },
  ],
  rules: [
    { type: 'concat', sources: ['first', 'last'], target: 'full_name', separator: ' ' },
    { type: 'lookup_map', source: 'country', target: 'country_name', map: { US: 'United States', FR: 'France' }, default: 'Unknown' },
    { type: 'regex_extract', source: 'url', target: 'domain', pattern: 'https?://([^/]+)' },
    { type: 'coalesce', sources: ['mobile', 'phone'], target: 'contact' },
    { type: 'constant', target: 'source_tag', value: 'scrape' },
  ],
};
const disc = {
  name: 'Scrape Data Enricher API', version: '1.0.0',
  description: 'Deterministic scrape-data enricher. Augments scraped records with new fields via declarative rules (constant, concat, coalesce, lookup_map, regex_extract). No external lookups, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/scrape-data-enricher/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/enrich', summary: 'Augment records with deterministic enrichment rules', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL enrich + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/enrich', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/enrich', summary: 'Augment records with deterministic enrichment rules', operationId: 'enrich', priceUsdc: 0.007,
    requestSchemaRef: 'EnrichRequest', responseSchemaRef: 'EnrichResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL enrich + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'EnrichRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Applied 5 enrichment rule(s) over 2 record(s).',
        key_factors: [
          'concat → full_name: wrote 2.',
          'lookup_map → country_name: wrote 2, matched 1.',
          'regex_extract → domain: wrote 2, matched 1, missed 1.',
          'coalesce → contact: wrote 2, matched 1, missed 1.',
          'constant → source_tag: wrote 2.',
        ],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'scrape-data-enricher', title: 'Scrape Data Enricher API', version: '1.0.0',
  description: 'Deterministic scrape-data enricher — augment records via constant/concat/coalesce/lookup_map/regex_extract rules. No external lookups, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /scrape-data-enricher/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Scrape Data Enricher API",
    "version": "1.0.0",
    "description": "Deterministic scrape-data enricher — augment records via constant/concat/coalesce/lookup_map/regex_extract rules. No external lookups, no LLM.",
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
      "url": "https://orbis-apis.onrender.com/scrape-data-enricher"
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
                  "name": "Scrape Data Enricher API",
                  "version": "1.0.0",
                  "description": "Deterministic scrape-data enricher. Augments scraped records with new fields via declarative rules (constant, concat, coalesce, lookup_map, regex_extract). No external lookups, no LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/scrape-data-enricher/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/enrich",
                      "summary": "Augment records with deterministic enrichment rules",
                      "price_usdc": 0.007
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL enrich + reasoning",
                      "price_usdc": 0.012
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/enrich",
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
    "/enrich": {
      "post": {
        "operationId": "enrich",
        "summary": "Augment records with deterministic enrichment rules",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EnrichResponse"
                },
                "example": {
                  "trace_id": "sde-1780000000000",
                  "request_id": "sde-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "record_count": 2,
                  "rules_applied": 5,
                  "per_rule": [
                    {
                      "type": "concat",
                      "target": "full_name",
                      "cells_written": 2
                    },
                    {
                      "type": "lookup_map",
                      "target": "country_name",
                      "cells_written": 2,
                      "matched": 1,
                      "misses": 0,
                      "defaulted": 1
                    },
                    {
                      "type": "regex_extract",
                      "target": "domain",
                      "cells_written": 2,
                      "matched": 1,
                      "misses": 1
                    },
                    {
                      "type": "coalesce",
                      "target": "contact",
                      "cells_written": 2,
                      "matched": 1,
                      "misses": 1
                    },
                    {
                      "type": "constant",
                      "target": "source_tag",
                      "cells_written": 2
                    }
                  ],
                  "records": [
                    {
                      "first": "Ann",
                      "last": "Lee",
                      "country": "US",
                      "url": "https://acme.com/p/1",
                      "mobile": "555-1",
                      "full_name": "Ann Lee",
                      "country_name": "United States",
                      "domain": "acme.com",
                      "contact": "555-1",
                      "source_tag": "scrape"
                    },
                    {
                      "first": "Bob",
                      "last": "Ng",
                      "country": "XX",
                      "url": "not-a-url",
                      "full_name": "Bob Ng",
                      "country_name": "Unknown",
                      "domain": null,
                      "contact": null,
                      "source_tag": "scrape"
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "enrichment": 1
                  },
                  "recommended_actions_priority_order": [
                    "Applied 5 rule(s) over 2 record(s).",
                    "2 unmatched cell(s) across lookup/coalesce/regex rules set to null or default — inspect source values.",
                    "Chain to scrape-data-pipeline-validator to confirm the enriched shape."
                  ],
                  "chain_to": [
                    {
                      "api": "scrape-data-pipeline-validator",
                      "reason": "Validate the enriched records against the expected schema."
                    },
                    {
                      "api": "data-classification",
                      "reason": "Re-classify columns now that derived fields exist."
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
                "$ref": "#/components/schemas/EnrichRequest"
              },
              "example": {
                "records": [
                  {
                    "first": "Ann",
                    "last": "Lee",
                    "country": "US",
                    "url": "https://acme.com/p/1",
                    "mobile": "555-1"
                  },
                  {
                    "first": "Bob",
                    "last": "Ng",
                    "country": "XX",
                    "url": "not-a-url"
                  }
                ],
                "rules": [
                  {
                    "type": "concat",
                    "sources": [
                      "first",
                      "last"
                    ],
                    "target": "full_name",
                    "separator": " "
                  },
                  {
                    "type": "lookup_map",
                    "source": "country",
                    "target": "country_name",
                    "map": {
                      "US": "United States",
                      "FR": "France"
                    },
                    "default": "Unknown"
                  },
                  {
                    "type": "regex_extract",
                    "source": "url",
                    "target": "domain",
                    "pattern": "https?://([^/]+)"
                  },
                  {
                    "type": "coalesce",
                    "sources": [
                      "mobile",
                      "phone"
                    ],
                    "target": "contact"
                  },
                  {
                    "type": "constant",
                    "target": "source_tag",
                    "value": "scrape"
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
        "summary": "ONE-CALL enrich + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "sde-1780000000000",
                  "request_id": "sde-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "record_count": 2,
                  "rules_applied": 5,
                  "per_rule": [
                    {
                      "type": "concat",
                      "target": "full_name",
                      "cells_written": 2
                    },
                    {
                      "type": "lookup_map",
                      "target": "country_name",
                      "cells_written": 2,
                      "matched": 1,
                      "misses": 0,
                      "defaulted": 1
                    },
                    {
                      "type": "regex_extract",
                      "target": "domain",
                      "cells_written": 2,
                      "matched": 1,
                      "misses": 1
                    },
                    {
                      "type": "coalesce",
                      "target": "contact",
                      "cells_written": 2,
                      "matched": 1,
                      "misses": 1
                    },
                    {
                      "type": "constant",
                      "target": "source_tag",
                      "cells_written": 2
                    }
                  ],
                  "records": [
                    {
                      "first": "Ann",
                      "last": "Lee",
                      "country": "US",
                      "url": "https://acme.com/p/1",
                      "mobile": "555-1",
                      "full_name": "Ann Lee",
                      "country_name": "United States",
                      "domain": "acme.com",
                      "contact": "555-1",
                      "source_tag": "scrape"
                    },
                    {
                      "first": "Bob",
                      "last": "Ng",
                      "country": "XX",
                      "url": "not-a-url",
                      "full_name": "Bob Ng",
                      "country_name": "Unknown",
                      "domain": null,
                      "contact": null,
                      "source_tag": "scrape"
                    }
                  ],
                  "reasoning": {
                    "why_result_generated": "Applied 5 enrichment rule(s) over 2 record(s).",
                    "key_factors": [
                      "concat → full_name: wrote 2.",
                      "lookup_map → country_name: wrote 2, matched 1.",
                      "regex_extract → domain: wrote 2, matched 1, missed 1.",
                      "coalesce → contact: wrote 2, matched 1, missed 1.",
                      "constant → source_tag: wrote 2."
                    ],
                    "invalidators": [
                      "Enrichment is deterministic and local: lookup_map uses the supplied table only (no external lookups); an unmapped key uses the rule default or null.",
                      "regex_extract returns the requested capture group (default group 1; group 0 = whole match) of the FIRST match, or null if no match; g/y flags are rejected.",
                      "concat/coalesce treat null/empty as missing; concat renders missing as \"\" while coalesce skips to the next source."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "enrichment": 1
                  },
                  "recommended_actions_priority_order": [
                    "Applied 5 rule(s) over 2 record(s).",
                    "2 unmatched cell(s) across lookup/coalesce/regex rules set to null or default — inspect source values.",
                    "Chain to scrape-data-pipeline-validator to confirm the enriched shape."
                  ],
                  "chain_to": [
                    {
                      "api": "scrape-data-pipeline-validator",
                      "reason": "Validate the enriched records against the expected schema."
                    },
                    {
                      "api": "data-classification",
                      "reason": "Re-classify columns now that derived fields exist."
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
                "$ref": "#/components/schemas/EnrichRequest"
              },
              "example": {
                "records": [
                  {
                    "first": "Ann",
                    "last": "Lee",
                    "country": "US",
                    "url": "https://acme.com/p/1",
                    "mobile": "555-1"
                  },
                  {
                    "first": "Bob",
                    "last": "Ng",
                    "country": "XX",
                    "url": "not-a-url"
                  }
                ],
                "rules": [
                  {
                    "type": "concat",
                    "sources": [
                      "first",
                      "last"
                    ],
                    "target": "full_name",
                    "separator": " "
                  },
                  {
                    "type": "lookup_map",
                    "source": "country",
                    "target": "country_name",
                    "map": {
                      "US": "United States",
                      "FR": "France"
                    },
                    "default": "Unknown"
                  },
                  {
                    "type": "regex_extract",
                    "source": "url",
                    "target": "domain",
                    "pattern": "https?://([^/]+)"
                  },
                  {
                    "type": "coalesce",
                    "sources": [
                      "mobile",
                      "phone"
                    ],
                    "target": "contact"
                  },
                  {
                    "type": "constant",
                    "target": "source_tag",
                    "value": "scrape"
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
          "enrichment": {
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
      "RuleResult": {
        "type": "object",
        "required": [
          "type",
          "target",
          "cells_written"
        ],
        "additionalProperties": false,
        "properties": {
          "type": {
            "type": "string",
            "enum": [
              "constant",
              "concat",
              "coalesce",
              "lookup_map",
              "regex_extract"
            ]
          },
          "target": {
            "type": "string"
          },
          "cells_written": {
            "type": "integer",
            "minimum": 0
          },
          "matched": {
            "type": "integer",
            "minimum": 0,
            "description": "Records where a value was resolved (coalesce/lookup_map/regex_extract)."
          },
          "defaulted": {
            "type": "integer",
            "minimum": 0,
            "description": "Records that fell back to the rule default (lookup_map)."
          },
          "misses": {
            "type": "integer",
            "minimum": 0,
            "description": "Records with no resolved value, set to null/default."
          }
        }
      },
      "EnrichCore": {
        "type": "object",
        "required": [
          "record_count",
          "rules_applied",
          "per_rule",
          "records"
        ],
        "properties": {
          "record_count": {
            "type": "integer",
            "minimum": 0
          },
          "rules_applied": {
            "type": "integer",
            "minimum": 0
          },
          "per_rule": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "type",
                "target",
                "cells_written"
              ],
              "additionalProperties": false,
              "properties": {
                "type": {
                  "type": "string",
                  "enum": [
                    "constant",
                    "concat",
                    "coalesce",
                    "lookup_map",
                    "regex_extract"
                  ]
                },
                "target": {
                  "type": "string"
                },
                "cells_written": {
                  "type": "integer",
                  "minimum": 0
                },
                "matched": {
                  "type": "integer",
                  "minimum": 0,
                  "description": "Records where a value was resolved (coalesce/lookup_map/regex_extract)."
                },
                "defaulted": {
                  "type": "integer",
                  "minimum": 0,
                  "description": "Records that fell back to the rule default (lookup_map)."
                },
                "misses": {
                  "type": "integer",
                  "minimum": 0,
                  "description": "Records with no resolved value, set to null/default."
                }
              }
            }
          },
          "records": {
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
      "Rule": {
        "oneOf": [
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "type",
              "target",
              "value"
            ],
            "properties": {
              "type": {
                "const": "constant"
              },
              "target": {
                "type": "string"
              },
              "value": {
                "description": "Constant value written to every record.",
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
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "type",
              "target",
              "sources"
            ],
            "properties": {
              "type": {
                "const": "concat"
              },
              "target": {
                "type": "string"
              },
              "sources": {
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
              "type",
              "target",
              "sources"
            ],
            "properties": {
              "type": {
                "const": "coalesce"
              },
              "target": {
                "type": "string"
              },
              "sources": {
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
              "type",
              "target",
              "source",
              "map"
            ],
            "properties": {
              "type": {
                "const": "lookup_map"
              },
              "target": {
                "type": "string"
              },
              "source": {
                "type": "string"
              },
              "map": {
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
                "description": "Key → value lookup table."
              },
              "default": {
                "description": "Value when the source value is missing or unmapped.",
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
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "type",
              "target",
              "source",
              "pattern"
            ],
            "properties": {
              "type": {
                "const": "regex_extract"
              },
              "target": {
                "type": "string"
              },
              "source": {
                "type": "string"
              },
              "pattern": {
                "type": "string",
                "maxLength": 300
              },
              "flags": {
                "type": "string",
                "description": "Optional regex flags (i, m, s, u only — never g/y)."
              },
              "group": {
                "type": "integer",
                "minimum": 0,
                "description": "Capture group to return (default 1; 0 = whole match)."
              }
            }
          }
        ],
        "description": "A deterministic enrichment rule; shape depends on \"type\"."
      },
      "EnrichRequest": {
        "type": "object",
        "required": [
          "records",
          "rules"
        ],
        "additionalProperties": false,
        "properties": {
          "records": {
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
            "description": "Scraped records to enrich."
          },
          "rules": {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "type",
                    "target",
                    "value"
                  ],
                  "properties": {
                    "type": {
                      "const": "constant"
                    },
                    "target": {
                      "type": "string"
                    },
                    "value": {
                      "description": "Constant value written to every record.",
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
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "type",
                    "target",
                    "sources"
                  ],
                  "properties": {
                    "type": {
                      "const": "concat"
                    },
                    "target": {
                      "type": "string"
                    },
                    "sources": {
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
                    "type",
                    "target",
                    "sources"
                  ],
                  "properties": {
                    "type": {
                      "const": "coalesce"
                    },
                    "target": {
                      "type": "string"
                    },
                    "sources": {
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
                    "type",
                    "target",
                    "source",
                    "map"
                  ],
                  "properties": {
                    "type": {
                      "const": "lookup_map"
                    },
                    "target": {
                      "type": "string"
                    },
                    "source": {
                      "type": "string"
                    },
                    "map": {
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
                      "description": "Key → value lookup table."
                    },
                    "default": {
                      "description": "Value when the source value is missing or unmapped.",
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
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "type",
                    "target",
                    "source",
                    "pattern"
                  ],
                  "properties": {
                    "type": {
                      "const": "regex_extract"
                    },
                    "target": {
                      "type": "string"
                    },
                    "source": {
                      "type": "string"
                    },
                    "pattern": {
                      "type": "string",
                      "maxLength": 300
                    },
                    "flags": {
                      "type": "string",
                      "description": "Optional regex flags (i, m, s, u only — never g/y)."
                    },
                    "group": {
                      "type": "integer",
                      "minimum": 0,
                      "description": "Capture group to return (default 1; 0 = whole match)."
                    }
                  }
                }
              ],
              "description": "A deterministic enrichment rule; shape depends on \"type\"."
            },
            "minItems": 1,
            "description": "Ordered enrichment rules."
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
      "EnrichResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/EnrichCore"
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
            "$ref": "#/components/schemas/EnrichCore"
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
### POST /enrich (concat + lookup_map + regex_extract + coalesce + constant)
Request:
```json
{
  "records": [
    {
      "first": "Ann",
      "last": "Lee",
      "country": "US",
      "url": "https://acme.com/p/1",
      "mobile": "555-1"
    },
    {
      "first": "Bob",
      "last": "Ng",
      "country": "XX",
      "url": "not-a-url"
    }
  ],
  "rules": [
    {
      "type": "concat",
      "sources": [
        "first",
        "last"
      ],
      "target": "full_name",
      "separator": " "
    },
    {
      "type": "lookup_map",
      "source": "country",
      "target": "country_name",
      "map": {
        "US": "United States",
        "FR": "France"
      },
      "default": "Unknown"
    },
    {
      "type": "regex_extract",
      "source": "url",
      "target": "domain",
      "pattern": "https?://([^/]+)"
    },
    {
      "type": "coalesce",
      "sources": [
        "mobile",
        "phone"
      ],
      "target": "contact"
    },
    {
      "type": "constant",
      "target": "source_tag",
      "value": "scrape"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "nfenxrpx-1781478372147",
  "request_id": "nfenxrpx-1781478372147",
  "computed_at": "2026-06-14T23:06:12.147Z",
  "success": true,
  "latency_ms": 0,
  "record_count": 2,
  "rules_applied": 5,
  "per_rule": [
    {
      "type": "concat",
      "target": "full_name",
      "cells_written": 2
    },
    {
      "type": "lookup_map",
      "target": "country_name",
      "cells_written": 2,
      "matched": 1,
      "misses": 0,
      "defaulted": 1
    },
    {
      "type": "regex_extract",
      "target": "domain",
      "cells_written": 2,
      "matched": 1,
      "misses": 1
    },
    {
      "type": "coalesce",
      "target": "contact",
      "cells_written": 2,
      "matched": 1,
      "misses": 1
    },
    {
      "type": "constant",
      "target": "source_tag",
      "cells_written": 2
    }
  ],
  "records": [
    {
      "first": "Ann",
      "last": "Lee",
      "country": "US",
      "url": "https://acme.com/p/1",
      "mobile": "555-1",
      "full_name": "Ann Lee",
      "country_name": "United States",
      "domain": "acme.com",
      "contact": "555-1",
      "source_tag": "scrape"
    },
    {
      "first": "Bob",
      "last": "Ng",
      "country": "XX",
      "url": "not-a-url",
      "full_name": "Bob Ng",
      "country_name": "Unknown",
      "domain": null,
      "contact": null,
      "source_tag": "scrape"
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "enrichment": 1
  },
  "recommended_actions_priority_order": [
    "Applied 5 rule(s) over 2 record(s).",
    "2 unmatched cell(s) across lookup/coalesce/regex rules set to null or default — inspect source values.",
    "Chain to scrape-data-pipeline-validator to confirm the enriched shape."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the enriched records against the expected schema."
    },
    {
      "api": "data-classification",
      "reason": "Re-classify columns now that derived fields exist."
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

### POST /lookup (regex group 0 whole-match → reasoning)
Request:
```json
{
  "records": [
    {
      "code": "SKU-12345-X"
    }
  ],
  "rules": [
    {
      "type": "regex_extract",
      "source": "code",
      "target": "digits",
      "pattern": "\\d{5}",
      "group": 0
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "xpkhkk4p-1781478372151",
  "request_id": "xpkhkk4p-1781478372151",
  "computed_at": "2026-06-14T23:06:12.151Z",
  "success": true,
  "latency_ms": 0,
  "record_count": 1,
  "rules_applied": 1,
  "per_rule": [
    {
      "type": "regex_extract",
      "target": "digits",
      "cells_written": 1,
      "matched": 1,
      "misses": 0
    }
  ],
  "records": [
    {
      "code": "SKU-12345-X",
      "digits": "12345"
    }
  ],
  "reasoning": {
    "why_result_generated": "Applied 1 enrichment rule(s) over 1 record(s).",
    "key_factors": [
      "regex_extract → digits: wrote 1, matched 1."
    ],
    "invalidators": [
      "Enrichment is deterministic and local: lookup_map uses the supplied table only (no external lookups); an unmapped key uses the rule default or null.",
      "regex_extract returns the requested capture group (default group 1; group 0 = whole match) of the FIRST match, or null if no match; g/y flags are rejected.",
      "concat/coalesce treat null/empty as missing; concat renders missing as \"\" while coalesce skips to the next source."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "enrichment": 1
  },
  "recommended_actions_priority_order": [
    "Applied 1 rule(s) over 1 record(s).",
    "Chain to scrape-data-pipeline-validator to confirm the enriched shape."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the enriched records against the expected schema."
    },
    {
      "api": "data-classification",
      "reason": "Re-classify columns now that derived fields exist."
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

### POST /enrich (ReDoS-guard: nested unbounded quantifier rejected)
Request:
```json
{
  "records": [
    {
      "a": "x"
    }
  ],
  "rules": [
    {
      "type": "regex_extract",
      "source": "a",
      "target": "b",
      "pattern": "(a+)+"
    }
  ]
}
```
Response (HTTP 400):
```json
{
  "trace_id": "f8kzwq1q-1781478372153",
  "request_id": "f8kzwq1q-1781478372153",
  "computed_at": "2026-06-14T23:06:12.153Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "rules[0] pattern has a nested unbounded quantifier (ReDoS risk); rewrite it."
  }
}
```

### POST /enrich (error: missing rules)
Request:
```json
{
  "records": [
    {
      "a": 1
    }
  ]
}
```
Response (HTTP 400):
```json
{
  "trace_id": "47kmhclb-1781478372155",
  "request_id": "47kmhclb-1781478372155",
  "computed_at": "2026-06-14T23:06:12.155Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"rules\" must be a non-empty array."
  }
}
```

---

# scrape-data-pipeline-validator

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round, clamp } from '../../_aplus/util';
import { parseRows, isMissing, asNum, Row } from '../../_aplus/dataset';

// Deterministic scrape-data pipeline validator. Checks scraped output against an
// expected schema (field presence / type / format) and optional selector→field map
// (coverage health), returning per-field reports, per-record validity, a 0–100
// score, and a pass/fail. Pure measurement, no LLM, nothing stored.

const router = Router();

const TYPE_ENUM = ['string', 'number', 'integer', 'boolean', 'date'];
const FORMAT_ENUM = ['url', 'email', 'date'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}([T\s]\d{2}:\d{2}|$)/;
const FORMATS: Record<string, (s: string) => boolean> = {
  url: (s) => /^https?:\/\/[^\s]+$/i.test(s),
  email: (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
  date: (s) => DATE_RE.test(s) && !Number.isNaN(Date.parse(s)),
};

type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export interface FieldReport {
  name: string; expected_type: string | null; required: boolean; format: string | null;
  present_count: number; present_rate: number; null_rate: number;
  type_match_rate: number | null; format_match_rate: number | null;
  coverage_ok: boolean; issues: string[];
}
export interface SelectorHealth { field: string; selector: string; coverage: number; status: 'ok' | 'degraded' | 'broken'; }
export interface ValidateCore {
  record_count: number;
  min_coverage: number;
  fields: FieldReport[];
  selector_health: SelectorHealth[];
  valid_record_count: number;
  invalid_record_count: number;
  passed: boolean;
  score: number;
  grade: Grade;
}

interface FieldSpec { name: string; type: string | null; required: boolean; format: string | null; }

function typeOk(v: unknown, t: string): boolean {
  if (t === 'string') return typeof v === 'string';
  if (t === 'number') return asNum(v) !== null;
  if (t === 'integer') { const n = asNum(v); return n !== null && Number.isInteger(n); }
  if (t === 'boolean') return typeof v === 'boolean' || v === 'true' || v === 'false';
  if (t === 'date') return typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));
  return true;
}

function gradeOf(score: number): Grade {
  return score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F';
}

function validate(body: any): { error: string } | { result: ValidateCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "records" and "expected_schema".' };
  const p = parseRows(body.records, 'records');
  if ('error' in p) return p;

  const es = body.expected_schema;
  if (es === null || typeof es !== 'object' || Array.isArray(es) || !Array.isArray(es.fields) || es.fields.length === 0) {
    return { error: '"expected_schema.fields" must be a non-empty array of field specs.' };
  }
  const specs: FieldSpec[] = [];
  for (let i = 0; i < es.fields.length; i++) {
    const f = es.fields[i];
    if (f === null || typeof f !== 'object' || Array.isArray(f)) return { error: `expected_schema.fields[${i}] must be an object.` };
    if (typeof f.name !== 'string' || f.name === '') return { error: `expected_schema.fields[${i}].name must be a non-empty string.` };
    if (f.type !== undefined && !TYPE_ENUM.includes(f.type)) return { error: `expected_schema.fields[${i}].type must be one of: ${TYPE_ENUM.join(', ')}.` };
    if (f.format !== undefined && !FORMAT_ENUM.includes(f.format)) return { error: `expected_schema.fields[${i}].format must be one of: ${FORMAT_ENUM.join(', ')}.` };
    if (f.required !== undefined && typeof f.required !== 'boolean') return { error: `expected_schema.fields[${i}].required must be a boolean.` };
    specs.push({ name: f.name, type: f.type ?? null, required: f.required === true, format: f.format ?? null });
  }

  let minCoverage = 0.9;
  if (body.min_coverage !== undefined) {
    const mc = asNum(body.min_coverage);
    if (mc === null || mc < 0 || mc > 1) return { error: '"min_coverage" must be a number in [0,1].' };
    minCoverage = mc;
  }

  // optional selector → field map
  const selSpecs: { field: string; selector: string }[] = [];
  if (body.selectors !== undefined) {
    if (!Array.isArray(body.selectors)) return { error: '"selectors" must be an array of { field, selector } objects.' };
    for (let i = 0; i < body.selectors.length; i++) {
      const s = body.selectors[i];
      if (s === null || typeof s !== 'object' || Array.isArray(s) || typeof s.field !== 'string' || typeof s.selector !== 'string' || s.field === '' || s.selector === '') {
        return { error: `selectors[${i}] must be { field, selector } non-empty strings.` };
      }
      selSpecs.push({ field: s.field, selector: s.selector });
    }
  }

  const n = p.rows.length;
  const fields: FieldReport[] = [];
  const presentRateByField = new Map<string, number>();

  for (const spec of specs) {
    let present = 0, typeMatch = 0, fmtMatch = 0, typeChecked = 0, fmtChecked = 0;
    for (const row of p.rows) {
      const v = row[spec.name];
      if (isMissing(v, true)) continue;
      present++;
      if (spec.type) { typeChecked++; if (typeOk(v, spec.type)) typeMatch++; }
      if (spec.format) { fmtChecked++; if (FORMATS[spec.format](String(v))) fmtMatch++; }
    }
    const presentRate = round(present / n, 4);
    presentRateByField.set(spec.name, presentRate);
    // Rates are null when there is nothing present to check (avoids a misleading 0%).
    const typeRate = spec.type && typeChecked > 0 ? round(typeMatch / typeChecked, 4) : null;
    const fmtRate = spec.format && fmtChecked > 0 ? round(fmtMatch / fmtChecked, 4) : null;
    const coverageOk = presentRate >= minCoverage;
    const issues: string[] = [];
    if (spec.required && !coverageOk) issues.push(`required field present in only ${(presentRate * 100).toFixed(1)}% of records (< ${(minCoverage * 100).toFixed(0)}% threshold).`);
    if (typeRate !== null && typeRate < 1) issues.push(`${typeChecked - typeMatch} value(s) do not match type "${spec.type}".`);
    if (fmtRate !== null && fmtRate < 1) issues.push(`${fmtChecked - fmtMatch} value(s) do not match format "${spec.format}".`);
    fields.push({
      name: spec.name, expected_type: spec.type, required: spec.required, format: spec.format,
      present_count: present, present_rate: presentRate, null_rate: round(1 - presentRate, 4),
      type_match_rate: typeRate, format_match_rate: fmtRate, coverage_ok: coverageOk, issues,
    });
  }

  // selector health
  const selector_health: SelectorHealth[] = selSpecs.map((s) => {
    const cov = presentRateByField.has(s.field) ? presentRateByField.get(s.field)! : round(p.rows.filter((r) => !isMissing(r[s.field], true)).length / n, 4);
    const status: SelectorHealth['status'] = cov >= minCoverage ? 'ok' : cov > 0 ? 'degraded' : 'broken';
    return { field: s.field, selector: s.selector, coverage: cov, status };
  });

  // per-record validity: all required present; present values match type & format
  let valid = 0;
  for (const row of p.rows) {
    let ok = true;
    for (const spec of specs) {
      const v = row[spec.name];
      const missing = isMissing(v, true);
      if (missing) { if (spec.required) { ok = false; break; } continue; }
      if (spec.type && !typeOk(v, spec.type)) { ok = false; break; }
      if (spec.format && !FORMATS[spec.format](String(v))) { ok = false; break; }
    }
    if (ok) valid++;
  }

  // score: mean over fields of (presence + type + format) applicable sub-rates
  let scoreSum = 0;
  for (const f of fields) {
    const parts: number[] = [f.required ? f.present_rate : 1];
    if (f.type_match_rate !== null) parts.push(f.type_match_rate);
    if (f.format_match_rate !== null) parts.push(f.format_match_rate);
    scoreSum += parts.reduce((a, b) => a + b, 0) / parts.length;
  }
  const score = round(clamp((scoreSum / fields.length) * 100, 0, 100), 1);
  const hasBroken = selector_health.some((s) => s.status === 'broken');
  const passed = valid === n && !hasBroken;

  return {
    result: {
      record_count: n, min_coverage: minCoverage, fields, selector_health,
      valid_record_count: valid, invalid_record_count: n - valid,
      passed, score, grade: gradeOf(score),
    },
  };
}

const CHAIN_TO = [
  { api: 'scrape-data-enricher', reason: 'Backfill/repair the failing fields with deterministic enrichment rules.' },
  { api: 'data-quality-rules', reason: 'Codify the expected schema as reusable not-null/range/regex rules.' },
];
const INVALIDATORS = [
  'Validity is measured only against the supplied expected_schema; fields not listed are ignored and extra columns are not penalized.',
  'A "broken" selector means its mapped field was empty in every record — a strong signal the selector changed, but this API does not fetch the page to confirm.',
  'score blends presence + type + format equally per field; passed requires zero invalid records AND no broken selectors (stricter than the score alone).',
];

function actions(r: ValidateCore): string[] {
  const out = [`${r.valid_record_count}/${r.record_count} record(s) valid — score ${r.score}/100 (${r.grade}), ${r.passed ? 'PASSED' : 'FAILED'}.`];
  const broken = r.selector_health.filter((s) => s.status === 'broken').map((s) => s.selector);
  if (broken.length) out.push(`Likely broken selector(s): ${broken.join(', ')} — the mapped field was empty in every record.`);
  const failing = r.fields.filter((f) => f.issues.length > 0).map((f) => f.name);
  if (failing.length) out.push(`Fields with issues: ${failing.join(', ')} — see per-field issues.`);
  out.push('Chain to scrape-data-enricher to repair fields or data-quality-rules to codify the schema.');
  return out;
}

const TAIL = (_r: ValidateCore) => ({
  confidence_score: 0.85, confidence_per_section: { validation: 1, scoring: 0.85 },
  recommended_actions_priority_order: actions(_r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Scrape Data Pipeline Validator API', version: '1.0.0',
    description: 'Deterministic scrape-data pipeline validator. Checks scraped output against an expected schema (presence/type/format) and optional selector→field coverage, returning per-field reports, per-record validity, a 0–100 score, and pass/fail. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/scrape-data-pipeline-validator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/validate', summary: 'Validate scrape output vs expected schema/selectors', price_usdc: 0.007 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL validate + reasoning', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/validate', price_usdc: 0.007, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/validate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = validate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = validate(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Validated ${v.record_count} record(s) against ${v.fields.length} expected field(s): ${v.valid_record_count} valid, score ${v.score}/100.`,
      key_factors: [
        `Pass/fail: ${v.passed ? 'PASSED' : 'FAILED'} (grade ${v.grade}).`,
        `Fields with issues: ${v.fields.filter((f) => f.issues.length).map((f) => f.name).join(', ') || 'none'}.`,
        `Selector health: ${v.selector_health.map((s) => `${s.selector}=${s.status}`).join(', ') || 'n/a'}.`,
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
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, rowSchema } from '../../_aplus/specparts';

const TYPE_ENUM = ['string', 'number', 'integer', 'boolean', 'date'];
const FORMAT_ENUM = ['url', 'email', 'date'];
const STATUS_ENUM = ['ok', 'degraded', 'broken'];
const GRADE_ENUM = ['A', 'B', 'C', 'D', 'F'];
const Row = rowSchema();

const FieldReport = {
  type: 'object',
  required: ['name', 'expected_type', 'required', 'format', 'present_count', 'present_rate', 'null_rate', 'type_match_rate', 'format_match_rate', 'coverage_ok', 'issues'],
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    expected_type: { type: ['string', 'null'], enum: [...TYPE_ENUM, null] },
    required: { type: 'boolean' },
    format: { type: ['string', 'null'], enum: [...FORMAT_ENUM, null] },
    present_count: { type: 'integer', minimum: 0 },
    present_rate: { type: 'number', minimum: 0, maximum: 1 },
    null_rate: { type: 'number', minimum: 0, maximum: 1 },
    type_match_rate: { type: ['number', 'null'], minimum: 0, maximum: 1, description: 'Among present values; null when a type is not specified or nothing is present.' },
    format_match_rate: { type: ['number', 'null'], minimum: 0, maximum: 1, description: 'Among present values; null when a format is not specified or nothing is present.' },
    coverage_ok: { type: 'boolean', description: 'present_rate >= min_coverage.' },
    issues: { type: 'array', items: { type: 'string' } },
  },
};
const SelectorHealth = {
  type: 'object', required: ['field', 'selector', 'coverage', 'status'], additionalProperties: false,
  properties: {
    field: { type: 'string' },
    selector: { type: 'string' },
    coverage: { type: 'number', minimum: 0, maximum: 1 },
    status: { type: 'string', enum: STATUS_ENUM, description: 'ok >= min_coverage; degraded if partial; broken if the field is empty in every record.' },
  },
};
const ValidateCore = {
  type: 'object',
  required: ['record_count', 'min_coverage', 'fields', 'selector_health', 'valid_record_count', 'invalid_record_count', 'passed', 'score', 'grade'],
  properties: {
    record_count: { type: 'integer', minimum: 0 },
    min_coverage: { type: 'number', minimum: 0, maximum: 1 },
    fields: { type: 'array', items: FieldReport },
    selector_health: { type: 'array', items: SelectorHealth },
    valid_record_count: { type: 'integer', minimum: 0 },
    invalid_record_count: { type: 'integer', minimum: 0 },
    passed: { type: 'boolean' },
    score: { type: 'number', minimum: 0, maximum: 100 },
    grade: { type: 'string', enum: GRADE_ENUM },
  },
};
const FieldSpec = {
  type: 'object', required: ['name'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: TYPE_ENUM, description: 'Expected value type.' },
    required: { type: 'boolean', description: 'Whether the field must be present (default false).' },
    format: { type: 'string', enum: FORMAT_ENUM, description: 'Optional format check applied to present values.' },
  },
};
const SelectorSpec = {
  type: 'object', required: ['field', 'selector'], additionalProperties: false,
  properties: { field: { type: 'string' }, selector: { type: 'string', description: 'Selector label that should populate this field.' } },
};
const ValidateRequest = {
  type: 'object', required: ['records', 'expected_schema'], additionalProperties: false,
  properties: {
    records: { type: 'array', items: Row, minItems: 1, description: 'Scrape output records to validate.' },
    expected_schema: {
      type: 'object', required: ['fields'], additionalProperties: false,
      properties: { fields: { type: 'array', items: FieldSpec, minItems: 1 } },
      description: 'Expected field schema.',
    },
    selectors: { type: 'array', items: SelectorSpec, description: 'Optional selector→field map for coverage health.' },
    min_coverage: { type: 'number', minimum: 0, maximum: 1, description: 'Coverage threshold for required fields & selector health (default 0.9).' },
  },
};

const CORE = {
  record_count: 3, min_coverage: 0.9,
  fields: [
    { name: 'title', expected_type: 'string', required: true, format: null, present_count: 3, present_rate: 1, null_rate: 0, type_match_rate: 1, format_match_rate: null, coverage_ok: true, issues: [] },
    { name: 'price', expected_type: 'number', required: true, format: null, present_count: 3, present_rate: 1, null_rate: 0, type_match_rate: 0.6667, format_match_rate: null, coverage_ok: true, issues: ['1 value(s) do not match type "number".'] },
    { name: 'url', expected_type: 'string', required: true, format: 'url', present_count: 3, present_rate: 1, null_rate: 0, type_match_rate: 1, format_match_rate: 0.6667, coverage_ok: true, issues: ['1 value(s) do not match format "url".'] },
    { name: 'sku', expected_type: 'string', required: true, format: null, present_count: 0, present_rate: 0, null_rate: 1, type_match_rate: null, format_match_rate: null, coverage_ok: false, issues: ['required field present in only 0.0% of records (< 90% threshold).'] },
  ],
  selector_health: [
    { field: 'price', selector: '.price', coverage: 1, status: 'ok' },
    { field: 'sku', selector: '.sku', coverage: 0, status: 'broken' },
  ],
  valid_record_count: 0, invalid_record_count: 3, passed: false, score: 68.1, grade: 'D',
};
const CHAIN = [
  { api: 'scrape-data-enricher', reason: 'Backfill/repair the failing fields with deterministic enrichment rules.' },
  { api: 'data-quality-rules', reason: 'Codify the expected schema as reusable not-null/range/regex rules.' },
];
const INVALIDATORS = [
  'Validity is measured only against the supplied expected_schema; fields not listed are ignored and extra columns are not penalized.',
  'A "broken" selector means its mapped field was empty in every record — a strong signal the selector changed, but this API does not fetch the page to confirm.',
  'score blends presence + type + format equally per field; passed requires zero invalid records AND no broken selectors (stricter than the score alone).',
];
const TAIL = {
  confidence_score: 0.85, confidence_per_section: { validation: 1, scoring: 0.85 },
  recommended_actions_priority_order: [
    '0/3 record(s) valid — score 68.1/100 (D), FAILED.',
    'Likely broken selector(s): .sku — the mapped field was empty in every record.',
    'Fields with issues: price, url, sku — see per-field issues.',
    'Chain to scrape-data-enricher to repair fields or data-quality-rules to codify the schema.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('validation', 'scoring'), _Tail: Tail,
  FieldReport, SelectorHealth, ValidateCore, FieldSpec, SelectorSpec, ValidateRequest, DiscoveryResponse: discoverySchema(),
  ValidateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidateCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ValidateCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'spv-1780000000000', request_id: 'spv-1780000000000', computed_at: '2026-06-14T12:00:00.000Z', success: true, latency_ms: 1 };
const reqEx = {
  records: [
    { title: 'Widget A', price: '9.99', url: 'https://shop.com/a' },
    { title: 'Widget B', price: 'N/A', url: 'https://shop.com/b' },
    { title: 'Widget C', price: '14.50', url: 'not-a-url' },
  ],
  expected_schema: {
    fields: [
      { name: 'title', type: 'string', required: true },
      { name: 'price', type: 'number', required: true },
      { name: 'url', type: 'string', required: true, format: 'url' },
      { name: 'sku', type: 'string', required: true },
    ],
  },
  selectors: [
    { field: 'price', selector: '.price' },
    { field: 'sku', selector: '.sku' },
  ],
  min_coverage: 0.9,
};
const disc = {
  name: 'Scrape Data Pipeline Validator API', version: '1.0.0',
  description: 'Deterministic scrape-data pipeline validator. Checks scraped output against an expected schema (presence/type/format) and optional selector→field coverage, returning per-field reports, per-record validity, a 0–100 score, and pass/fail. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/scrape-data-pipeline-validator/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/validate', summary: 'Validate scrape output vs expected schema/selectors', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL validate + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/validate', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/validate', summary: 'Validate scrape output vs expected schema/selectors', operationId: 'validate', priceUsdc: 0.007,
    requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'ValidateResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL validate + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'ValidateRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: 'Validated 3 record(s) against 4 expected field(s): 0 valid, score 68.1/100.',
        key_factors: ['Pass/fail: FAILED (grade D).', 'Fields with issues: price, url, sku.', 'Selector health: .price=ok, .sku=broken.'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'scrape-data-pipeline-validator', title: 'Scrape Data Pipeline Validator API', version: '1.0.0',
  description: 'Deterministic scrape-data pipeline validator — scrape output vs expected schema/selectors → per-field reports, validity, score, pass/fail. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /scrape-data-pipeline-validator/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Scrape Data Pipeline Validator API",
    "version": "1.0.0",
    "description": "Deterministic scrape-data pipeline validator — scrape output vs expected schema/selectors → per-field reports, validity, score, pass/fail. No LLM.",
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
      "url": "https://orbis-apis.onrender.com/scrape-data-pipeline-validator"
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
                  "name": "Scrape Data Pipeline Validator API",
                  "version": "1.0.0",
                  "description": "Deterministic scrape-data pipeline validator. Checks scraped output against an expected schema (presence/type/format) and optional selector→field coverage, returning per-field reports, per-record validity, a 0–100 score, and pass/fail. No LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/scrape-data-pipeline-validator/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/validate",
                      "summary": "Validate scrape output vs expected schema/selectors",
                      "price_usdc": 0.007
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL validate + reasoning",
                      "price_usdc": 0.012
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/validate",
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
    "/validate": {
      "post": {
        "operationId": "validate",
        "summary": "Validate scrape output vs expected schema/selectors",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidateResponse"
                },
                "example": {
                  "trace_id": "spv-1780000000000",
                  "request_id": "spv-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "record_count": 3,
                  "min_coverage": 0.9,
                  "fields": [
                    {
                      "name": "title",
                      "expected_type": "string",
                      "required": true,
                      "format": null,
                      "present_count": 3,
                      "present_rate": 1,
                      "null_rate": 0,
                      "type_match_rate": 1,
                      "format_match_rate": null,
                      "coverage_ok": true,
                      "issues": []
                    },
                    {
                      "name": "price",
                      "expected_type": "number",
                      "required": true,
                      "format": null,
                      "present_count": 3,
                      "present_rate": 1,
                      "null_rate": 0,
                      "type_match_rate": 0.6667,
                      "format_match_rate": null,
                      "coverage_ok": true,
                      "issues": [
                        "1 value(s) do not match type \"number\"."
                      ]
                    },
                    {
                      "name": "url",
                      "expected_type": "string",
                      "required": true,
                      "format": "url",
                      "present_count": 3,
                      "present_rate": 1,
                      "null_rate": 0,
                      "type_match_rate": 1,
                      "format_match_rate": 0.6667,
                      "coverage_ok": true,
                      "issues": [
                        "1 value(s) do not match format \"url\"."
                      ]
                    },
                    {
                      "name": "sku",
                      "expected_type": "string",
                      "required": true,
                      "format": null,
                      "present_count": 0,
                      "present_rate": 0,
                      "null_rate": 1,
                      "type_match_rate": null,
                      "format_match_rate": null,
                      "coverage_ok": false,
                      "issues": [
                        "required field present in only 0.0% of records (< 90% threshold)."
                      ]
                    }
                  ],
                  "selector_health": [
                    {
                      "field": "price",
                      "selector": ".price",
                      "coverage": 1,
                      "status": "ok"
                    },
                    {
                      "field": "sku",
                      "selector": ".sku",
                      "coverage": 0,
                      "status": "broken"
                    }
                  ],
                  "valid_record_count": 0,
                  "invalid_record_count": 3,
                  "passed": false,
                  "score": 68.1,
                  "grade": "D",
                  "confidence_score": 0.85,
                  "confidence_per_section": {
                    "validation": 1,
                    "scoring": 0.85
                  },
                  "recommended_actions_priority_order": [
                    "0/3 record(s) valid — score 68.1/100 (D), FAILED.",
                    "Likely broken selector(s): .sku — the mapped field was empty in every record.",
                    "Fields with issues: price, url, sku — see per-field issues.",
                    "Chain to scrape-data-enricher to repair fields or data-quality-rules to codify the schema."
                  ],
                  "chain_to": [
                    {
                      "api": "scrape-data-enricher",
                      "reason": "Backfill/repair the failing fields with deterministic enrichment rules."
                    },
                    {
                      "api": "data-quality-rules",
                      "reason": "Codify the expected schema as reusable not-null/range/regex rules."
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
                "$ref": "#/components/schemas/ValidateRequest"
              },
              "example": {
                "records": [
                  {
                    "title": "Widget A",
                    "price": "9.99",
                    "url": "https://shop.com/a"
                  },
                  {
                    "title": "Widget B",
                    "price": "N/A",
                    "url": "https://shop.com/b"
                  },
                  {
                    "title": "Widget C",
                    "price": "14.50",
                    "url": "not-a-url"
                  }
                ],
                "expected_schema": {
                  "fields": [
                    {
                      "name": "title",
                      "type": "string",
                      "required": true
                    },
                    {
                      "name": "price",
                      "type": "number",
                      "required": true
                    },
                    {
                      "name": "url",
                      "type": "string",
                      "required": true,
                      "format": "url"
                    },
                    {
                      "name": "sku",
                      "type": "string",
                      "required": true
                    }
                  ]
                },
                "selectors": [
                  {
                    "field": "price",
                    "selector": ".price"
                  },
                  {
                    "field": "sku",
                    "selector": ".sku"
                  }
                ],
                "min_coverage": 0.9
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
                  "trace_id": "spv-1780000000000",
                  "request_id": "spv-1780000000000",
                  "computed_at": "2026-06-14T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "record_count": 3,
                  "min_coverage": 0.9,
                  "fields": [
                    {
                      "name": "title",
                      "expected_type": "string",
                      "required": true,
                      "format": null,
                      "present_count": 3,
                      "present_rate": 1,
                      "null_rate": 0,
                      "type_match_rate": 1,
                      "format_match_rate": null,
                      "coverage_ok": true,
                      "issues": []
                    },
                    {
                      "name": "price",
                      "expected_type": "number",
                      "required": true,
                      "format": null,
                      "present_count": 3,
                      "present_rate": 1,
                      "null_rate": 0,
                      "type_match_rate": 0.6667,
                      "format_match_rate": null,
                      "coverage_ok": true,
                      "issues": [
                        "1 value(s) do not match type \"number\"."
                      ]
                    },
                    {
                      "name": "url",
                      "expected_type": "string",
                      "required": true,
                      "format": "url",
                      "present_count": 3,
                      "present_rate": 1,
                      "null_rate": 0,
                      "type_match_rate": 1,
                      "format_match_rate": 0.6667,
                      "coverage_ok": true,
                      "issues": [
                        "1 value(s) do not match format \"url\"."
                      ]
                    },
                    {
                      "name": "sku",
                      "expected_type": "string",
                      "required": true,
                      "format": null,
                      "present_count": 0,
                      "present_rate": 0,
                      "null_rate": 1,
                      "type_match_rate": null,
                      "format_match_rate": null,
                      "coverage_ok": false,
                      "issues": [
                        "required field present in only 0.0% of records (< 90% threshold)."
                      ]
                    }
                  ],
                  "selector_health": [
                    {
                      "field": "price",
                      "selector": ".price",
                      "coverage": 1,
                      "status": "ok"
                    },
                    {
                      "field": "sku",
                      "selector": ".sku",
                      "coverage": 0,
                      "status": "broken"
                    }
                  ],
                  "valid_record_count": 0,
                  "invalid_record_count": 3,
                  "passed": false,
                  "score": 68.1,
                  "grade": "D",
                  "reasoning": {
                    "why_result_generated": "Validated 3 record(s) against 4 expected field(s): 0 valid, score 68.1/100.",
                    "key_factors": [
                      "Pass/fail: FAILED (grade D).",
                      "Fields with issues: price, url, sku.",
                      "Selector health: .price=ok, .sku=broken."
                    ],
                    "invalidators": [
                      "Validity is measured only against the supplied expected_schema; fields not listed are ignored and extra columns are not penalized.",
                      "A \"broken\" selector means its mapped field was empty in every record — a strong signal the selector changed, but this API does not fetch the page to confirm.",
                      "score blends presence + type + format equally per field; passed requires zero invalid records AND no broken selectors (stricter than the score alone)."
                    ]
                  },
                  "confidence_score": 0.85,
                  "confidence_per_section": {
                    "validation": 1,
                    "scoring": 0.85
                  },
                  "recommended_actions_priority_order": [
                    "0/3 record(s) valid — score 68.1/100 (D), FAILED.",
                    "Likely broken selector(s): .sku — the mapped field was empty in every record.",
                    "Fields with issues: price, url, sku — see per-field issues.",
                    "Chain to scrape-data-enricher to repair fields or data-quality-rules to codify the schema."
                  ],
                  "chain_to": [
                    {
                      "api": "scrape-data-enricher",
                      "reason": "Backfill/repair the failing fields with deterministic enrichment rules."
                    },
                    {
                      "api": "data-quality-rules",
                      "reason": "Codify the expected schema as reusable not-null/range/regex rules."
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
                "$ref": "#/components/schemas/ValidateRequest"
              },
              "example": {
                "records": [
                  {
                    "title": "Widget A",
                    "price": "9.99",
                    "url": "https://shop.com/a"
                  },
                  {
                    "title": "Widget B",
                    "price": "N/A",
                    "url": "https://shop.com/b"
                  },
                  {
                    "title": "Widget C",
                    "price": "14.50",
                    "url": "not-a-url"
                  }
                ],
                "expected_schema": {
                  "fields": [
                    {
                      "name": "title",
                      "type": "string",
                      "required": true
                    },
                    {
                      "name": "price",
                      "type": "number",
                      "required": true
                    },
                    {
                      "name": "url",
                      "type": "string",
                      "required": true,
                      "format": "url"
                    },
                    {
                      "name": "sku",
                      "type": "string",
                      "required": true
                    }
                  ]
                },
                "selectors": [
                  {
                    "field": "price",
                    "selector": ".price"
                  },
                  {
                    "field": "sku",
                    "selector": ".sku"
                  }
                ],
                "min_coverage": 0.9
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
          "validation": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "scoring": {
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
      "FieldReport": {
        "type": "object",
        "required": [
          "name",
          "expected_type",
          "required",
          "format",
          "present_count",
          "present_rate",
          "null_rate",
          "type_match_rate",
          "format_match_rate",
          "coverage_ok",
          "issues"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "expected_type": {
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
          "required": {
            "type": "boolean"
          },
          "format": {
            "type": [
              "string",
              "null"
            ],
            "enum": [
              "url",
              "email",
              "date",
              null
            ]
          },
          "present_count": {
            "type": "integer",
            "minimum": 0
          },
          "present_rate": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "null_rate": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "type_match_rate": {
            "type": [
              "number",
              "null"
            ],
            "minimum": 0,
            "maximum": 1,
            "description": "Among present values; null when a type is not specified or nothing is present."
          },
          "format_match_rate": {
            "type": [
              "number",
              "null"
            ],
            "minimum": 0,
            "maximum": 1,
            "description": "Among present values; null when a format is not specified or nothing is present."
          },
          "coverage_ok": {
            "type": "boolean",
            "description": "present_rate >= min_coverage."
          },
          "issues": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "SelectorHealth": {
        "type": "object",
        "required": [
          "field",
          "selector",
          "coverage",
          "status"
        ],
        "additionalProperties": false,
        "properties": {
          "field": {
            "type": "string"
          },
          "selector": {
            "type": "string"
          },
          "coverage": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "status": {
            "type": "string",
            "enum": [
              "ok",
              "degraded",
              "broken"
            ],
            "description": "ok >= min_coverage; degraded if partial; broken if the field is empty in every record."
          }
        }
      },
      "ValidateCore": {
        "type": "object",
        "required": [
          "record_count",
          "min_coverage",
          "fields",
          "selector_health",
          "valid_record_count",
          "invalid_record_count",
          "passed",
          "score",
          "grade"
        ],
        "properties": {
          "record_count": {
            "type": "integer",
            "minimum": 0
          },
          "min_coverage": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "fields": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name",
                "expected_type",
                "required",
                "format",
                "present_count",
                "present_rate",
                "null_rate",
                "type_match_rate",
                "format_match_rate",
                "coverage_ok",
                "issues"
              ],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string"
                },
                "expected_type": {
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
                "required": {
                  "type": "boolean"
                },
                "format": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "url",
                    "email",
                    "date",
                    null
                  ]
                },
                "present_count": {
                  "type": "integer",
                  "minimum": 0
                },
                "present_rate": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1
                },
                "null_rate": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1
                },
                "type_match_rate": {
                  "type": [
                    "number",
                    "null"
                  ],
                  "minimum": 0,
                  "maximum": 1,
                  "description": "Among present values; null when a type is not specified or nothing is present."
                },
                "format_match_rate": {
                  "type": [
                    "number",
                    "null"
                  ],
                  "minimum": 0,
                  "maximum": 1,
                  "description": "Among present values; null when a format is not specified or nothing is present."
                },
                "coverage_ok": {
                  "type": "boolean",
                  "description": "present_rate >= min_coverage."
                },
                "issues": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                }
              }
            }
          },
          "selector_health": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "field",
                "selector",
                "coverage",
                "status"
              ],
              "additionalProperties": false,
              "properties": {
                "field": {
                  "type": "string"
                },
                "selector": {
                  "type": "string"
                },
                "coverage": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1
                },
                "status": {
                  "type": "string",
                  "enum": [
                    "ok",
                    "degraded",
                    "broken"
                  ],
                  "description": "ok >= min_coverage; degraded if partial; broken if the field is empty in every record."
                }
              }
            }
          },
          "valid_record_count": {
            "type": "integer",
            "minimum": 0
          },
          "invalid_record_count": {
            "type": "integer",
            "minimum": 0
          },
          "passed": {
            "type": "boolean"
          },
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "grade": {
            "type": "string",
            "enum": [
              "A",
              "B",
              "C",
              "D",
              "F"
            ]
          }
        }
      },
      "FieldSpec": {
        "type": "object",
        "required": [
          "name"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "type": {
            "type": "string",
            "enum": [
              "string",
              "number",
              "integer",
              "boolean",
              "date"
            ],
            "description": "Expected value type."
          },
          "required": {
            "type": "boolean",
            "description": "Whether the field must be present (default false)."
          },
          "format": {
            "type": "string",
            "enum": [
              "url",
              "email",
              "date"
            ],
            "description": "Optional format check applied to present values."
          }
        }
      },
      "SelectorSpec": {
        "type": "object",
        "required": [
          "field",
          "selector"
        ],
        "additionalProperties": false,
        "properties": {
          "field": {
            "type": "string"
          },
          "selector": {
            "type": "string",
            "description": "Selector label that should populate this field."
          }
        }
      },
      "ValidateRequest": {
        "type": "object",
        "required": [
          "records",
          "expected_schema"
        ],
        "additionalProperties": false,
        "properties": {
          "records": {
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
            "description": "Scrape output records to validate."
          },
          "expected_schema": {
            "type": "object",
            "required": [
              "fields"
            ],
            "additionalProperties": false,
            "properties": {
              "fields": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": [
                    "name"
                  ],
                  "additionalProperties": false,
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "type": {
                      "type": "string",
                      "enum": [
                        "string",
                        "number",
                        "integer",
                        "boolean",
                        "date"
                      ],
                      "description": "Expected value type."
                    },
                    "required": {
                      "type": "boolean",
                      "description": "Whether the field must be present (default false)."
                    },
                    "format": {
                      "type": "string",
                      "enum": [
                        "url",
                        "email",
                        "date"
                      ],
                      "description": "Optional format check applied to present values."
                    }
                  }
                },
                "minItems": 1
              }
            },
            "description": "Expected field schema."
          },
          "selectors": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "field",
                "selector"
              ],
              "additionalProperties": false,
              "properties": {
                "field": {
                  "type": "string"
                },
                "selector": {
                  "type": "string",
                  "description": "Selector label that should populate this field."
                }
              }
            },
            "description": "Optional selector→field map for coverage health."
          },
          "min_coverage": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Coverage threshold for required fields & selector health (default 0.9)."
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

## Live example responses
### POST /validate (type + format mismatch + broken selector → FAIL)
Request:
```json
{
  "records": [
    {
      "title": "Widget A",
      "price": "9.99",
      "url": "https://shop.com/a"
    },
    {
      "title": "Widget B",
      "price": "N/A",
      "url": "https://shop.com/b"
    },
    {
      "title": "Widget C",
      "price": "14.50",
      "url": "not-a-url"
    }
  ],
  "expected_schema": {
    "fields": [
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "price",
        "type": "number",
        "required": true
      },
      {
        "name": "url",
        "type": "string",
        "required": true,
        "format": "url"
      },
      {
        "name": "sku",
        "type": "string",
        "required": true
      }
    ]
  },
  "selectors": [
    {
      "field": "price",
      "selector": ".price"
    },
    {
      "field": "sku",
      "selector": ".sku"
    }
  ],
  "min_coverage": 0.9
}
```
Response (HTTP 200):
```json
{
  "trace_id": "hvv15uvq-1781478372160",
  "request_id": "hvv15uvq-1781478372160",
  "computed_at": "2026-06-14T23:06:12.160Z",
  "success": true,
  "latency_ms": 0,
  "record_count": 3,
  "min_coverage": 0.9,
  "fields": [
    {
      "name": "title",
      "expected_type": "string",
      "required": true,
      "format": null,
      "present_count": 3,
      "present_rate": 1,
      "null_rate": 0,
      "type_match_rate": 1,
      "format_match_rate": null,
      "coverage_ok": true,
      "issues": []
    },
    {
      "name": "price",
      "expected_type": "number",
      "required": true,
      "format": null,
      "present_count": 3,
      "present_rate": 1,
      "null_rate": 0,
      "type_match_rate": 0.6667,
      "format_match_rate": null,
      "coverage_ok": true,
      "issues": [
        "1 value(s) do not match type \"number\"."
      ]
    },
    {
      "name": "url",
      "expected_type": "string",
      "required": true,
      "format": "url",
      "present_count": 3,
      "present_rate": 1,
      "null_rate": 0,
      "type_match_rate": 1,
      "format_match_rate": 0.6667,
      "coverage_ok": true,
      "issues": [
        "1 value(s) do not match format \"url\"."
      ]
    },
    {
      "name": "sku",
      "expected_type": "string",
      "required": true,
      "format": null,
      "present_count": 0,
      "present_rate": 0,
      "null_rate": 1,
      "type_match_rate": null,
      "format_match_rate": null,
      "coverage_ok": false,
      "issues": [
        "required field present in only 0.0% of records (< 90% threshold)."
      ]
    }
  ],
  "selector_health": [
    {
      "field": "price",
      "selector": ".price",
      "coverage": 1,
      "status": "ok"
    },
    {
      "field": "sku",
      "selector": ".sku",
      "coverage": 0,
      "status": "broken"
    }
  ],
  "valid_record_count": 0,
  "invalid_record_count": 3,
  "passed": false,
  "score": 68.1,
  "grade": "D",
  "confidence_score": 0.85,
  "confidence_per_section": {
    "validation": 1,
    "scoring": 0.85
  },
  "recommended_actions_priority_order": [
    "0/3 record(s) valid — score 68.1/100 (D), FAILED.",
    "Likely broken selector(s): .sku — the mapped field was empty in every record.",
    "Fields with issues: price, url, sku — see per-field issues.",
    "Chain to scrape-data-enricher to repair fields or data-quality-rules to codify the schema."
  ],
  "chain_to": [
    {
      "api": "scrape-data-enricher",
      "reason": "Backfill/repair the failing fields with deterministic enrichment rules."
    },
    {
      "api": "data-quality-rules",
      "reason": "Codify the expected schema as reusable not-null/range/regex rules."
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

### POST /lookup (clean data → PASS, score 100 → reasoning)
Request:
```json
{
  "records": [
    {
      "t": "A",
      "u": "https://a.com"
    },
    {
      "t": "B",
      "u": "https://b.com"
    }
  ],
  "expected_schema": {
    "fields": [
      {
        "name": "t",
        "type": "string",
        "required": true
      },
      {
        "name": "u",
        "type": "string",
        "required": true,
        "format": "url"
      }
    ]
  }
}
```
Response (HTTP 200):
```json
{
  "trace_id": "ow99g7i4-1781478372163",
  "request_id": "ow99g7i4-1781478372163",
  "computed_at": "2026-06-14T23:06:12.163Z",
  "success": true,
  "latency_ms": 0,
  "record_count": 2,
  "min_coverage": 0.9,
  "fields": [
    {
      "name": "t",
      "expected_type": "string",
      "required": true,
      "format": null,
      "present_count": 2,
      "present_rate": 1,
      "null_rate": 0,
      "type_match_rate": 1,
      "format_match_rate": null,
      "coverage_ok": true,
      "issues": []
    },
    {
      "name": "u",
      "expected_type": "string",
      "required": true,
      "format": "url",
      "present_count": 2,
      "present_rate": 1,
      "null_rate": 0,
      "type_match_rate": 1,
      "format_match_rate": 1,
      "coverage_ok": true,
      "issues": []
    }
  ],
  "selector_health": [],
  "valid_record_count": 2,
  "invalid_record_count": 0,
  "passed": true,
  "score": 100,
  "grade": "A",
  "reasoning": {
    "why_result_generated": "Validated 2 record(s) against 2 expected field(s): 2 valid, score 100/100.",
    "key_factors": [
      "Pass/fail: PASSED (grade A).",
      "Fields with issues: none.",
      "Selector health: n/a."
    ],
    "invalidators": [
      "Validity is measured only against the supplied expected_schema; fields not listed are ignored and extra columns are not penalized.",
      "A \"broken\" selector means its mapped field was empty in every record — a strong signal the selector changed, but this API does not fetch the page to confirm.",
      "score blends presence + type + format equally per field; passed requires zero invalid records AND no broken selectors (stricter than the score alone)."
    ]
  },
  "confidence_score": 0.85,
  "confidence_per_section": {
    "validation": 1,
    "scoring": 0.85
  },
  "recommended_actions_priority_order": [
    "2/2 record(s) valid — score 100/100 (A), PASSED.",
    "Chain to scrape-data-enricher to repair fields or data-quality-rules to codify the schema."
  ],
  "chain_to": [
    {
      "api": "scrape-data-enricher",
      "reason": "Backfill/repair the failing fields with deterministic enrichment rules."
    },
    {
      "api": "data-quality-rules",
      "reason": "Codify the expected schema as reusable not-null/range/regex rules."
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

### POST /validate (optional field missing → not penalized)
Request:
```json
{
  "records": [
    {
      "id": "1"
    },
    {
      "id": "2"
    }
  ],
  "expected_schema": {
    "fields": [
      {
        "name": "id",
        "type": "string",
        "required": true
      },
      {
        "name": "note",
        "type": "string",
        "required": false
      }
    ]
  }
}
```
Response (HTTP 200):
```json
{
  "trace_id": "lpowabhs-1781478372165",
  "request_id": "lpowabhs-1781478372165",
  "computed_at": "2026-06-14T23:06:12.165Z",
  "success": true,
  "latency_ms": 0,
  "record_count": 2,
  "min_coverage": 0.9,
  "fields": [
    {
      "name": "id",
      "expected_type": "string",
      "required": true,
      "format": null,
      "present_count": 2,
      "present_rate": 1,
      "null_rate": 0,
      "type_match_rate": 1,
      "format_match_rate": null,
      "coverage_ok": true,
      "issues": []
    },
    {
      "name": "note",
      "expected_type": "string",
      "required": false,
      "format": null,
      "present_count": 0,
      "present_rate": 0,
      "null_rate": 1,
      "type_match_rate": null,
      "format_match_rate": null,
      "coverage_ok": false,
      "issues": []
    }
  ],
  "selector_health": [],
  "valid_record_count": 2,
  "invalid_record_count": 0,
  "passed": true,
  "score": 100,
  "grade": "A",
  "confidence_score": 0.85,
  "confidence_per_section": {
    "validation": 1,
    "scoring": 0.85
  },
  "recommended_actions_priority_order": [
    "2/2 record(s) valid — score 100/100 (A), PASSED.",
    "Chain to scrape-data-enricher to repair fields or data-quality-rules to codify the schema."
  ],
  "chain_to": [
    {
      "api": "scrape-data-enricher",
      "reason": "Backfill/repair the failing fields with deterministic enrichment rules."
    },
    {
      "api": "data-quality-rules",
      "reason": "Codify the expected schema as reusable not-null/range/regex rules."
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

### POST /validate (error: no expected_schema)
Request:
```json
{
  "records": [
    {
      "a": 1
    }
  ]
}
```
Response (HTTP 400):
```json
{
  "trace_id": "mnt6lnou-1781478372168",
  "request_id": "mnt6lnou-1781478372168",
  "computed_at": "2026-06-14T23:06:12.168Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"expected_schema.fields\" must be a non-empty array of field specs."
  }
}
```

