# Data-Quality Batch 4 — ChatGPT Review Bundle (Orbis A+ scraping infra + scraped-data scorer)

Date: 2026-06-15 · branch aplus/data-quality-batch4 · PR #45 · tsc clean · smoke 18/18 green

3 deterministic, STATELESS APIs (input manifest/HTML/records → computed output, nothing fetched, nothing stored, **no LLM anywhere**). Built on the shared `src/routes/_aplus/` scaffold (+ `dataset.ts` helpers). `scraper-test-suite` parses HTML with **cheerio**.

- **website-structure-mapper** — crawl manifest (pages with outbound links, optional sitemap) → internal navigation graph: click depth from home (BFS), in/out degree, page roles (home/hub/orphan/dead_end/normal), top-level sections, unreachable pages, dangling internal links, sitemap diff. Confidence 1 when home_url given; 0.9 when inferred.
- **scraper-test-suite** — sample HTML + selector tests (assertions: exists/count/min_count/max_count/equals/contains/matches/non_empty, optional `attr` extraction) → per-test pass/fail, extracted values, score/grade. Regex assertions ReDoS-guarded; invalid selectors fail gracefully (not 500).
- **scraped-data-quality-scorer** — extracted/scraped dataset → 0–100 quality score over scrape-specific dimensions (completeness, uniqueness, cleanliness = HTML-entity/whitespace/control/truncation noise, placeholder-freedom, type-consistency) with per-field breakdown + issues. Schema-free.

## Differentiation (please sanity-check this is genuinely distinct):
- **scraped-data-quality-scorer** scores *intrinsic, schema-free* quality of already-extracted data. It is NOT `data-pipeline-quality-scorer` (B1 — generic pipeline health) and NOT `scrape-data-pipeline-validator` (B3 — checks records against an *explicit expected schema*, pass/fail). Stated in its invalidators.
- **website-structure-mapper** is a deterministic no-fetch graph builder over a supplied manifest — distinct from the live AI crawler `web-navigation-api`.

## Carry the batch-1/2/3 lessons:
- NO generic `{type:"object"}` schemas — dataset rows use the shared typed `rowSchema()`; variant inputs (pages/tests/assertions) are closed `additionalProperties:false` objects.
- Confidence honesty: exact deterministic computation reports 1; heuristics (mapper home inference, scorer blended weights) are <1 with explicit invalidators.
- Stateless + deterministic; OpenAPI examples are GENERATED from live output (`routes/examples.ts`) and drift-guarded by smoke.

## Please grade each API (A+/A/B/...) on:
1. **Correctness** of the deterministic computation (mapper: URL normalization, internal/external/dangling link classification, BFS click depth, roles, sections, reachability, sitemap diff; test-suite: cheerio selector matching, each assertion type, attr vs text extraction, graceful invalid-selector handling, ReDoS guard; scorer: each of the 5 dimensions + per-column type consistency + duplicate detection + the blended score/weights).
2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata; reasoning block on /lookup).
3. **Honesty** (computed only from the request; nothing stored/fetched; mapper "dangling" link is a signal not a fetched 404; scorer placeholder list + blended score are heuristics with <1 confidence; test-suite proves a selector works on the *snapshot*, not the live page).
4. **OpenAPI 3.1** rigor (allOf + unevaluatedProperties:false; typed 200/400/500; closed objects; x-pricing; requestExample replays cleanly == responseExample).
5. **Agent-usability** (clear field names, actionable recommended_actions, sensible chain_to across the data-quality fleet, pricing sanity).
Flag any bug, graph/stat error (wrong depth/role/reachability, sitemap-diff edge, selector/assertion mis-eval, ReDoS bypass, noise/placeholder false-positive or miss, dup miscount, denominator choice), input-size footgun, or schema/response drift.

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

# website-structure-mapper

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';

// Deterministic website structure & navigation mapper. Given a crawl manifest
// (pages, each with its outbound links) — plus an optional declared sitemap —
// computes the internal navigation graph: per-page click depth from the home
// page, in/out degree, roles (home/hub/orphan/dead_end/normal), top-level
// sections, unreachable pages, dangling internal links, and a sitemap diff.
// Pure graph computation over the SUPPLIED manifest — no fetching, no LLM,
// nothing stored.

const router = Router();

const MAX_PAGES = 5000;
const MAX_LINKS_PER_PAGE = 3000;

type Role = 'home' | 'hub' | 'orphan' | 'dead_end' | 'normal';

export interface NodeInfo {
  url: string; path: string; section: string;
  depth: number | null; in_degree: number; out_degree: number;
  role: Role; reachable: boolean;
}
export interface Edge { from: string; to: string; }
export interface SectionCount { section: string; page_count: number; }
export interface DanglingLink { from: string; to: string; }
export interface SitemapDiff { provided: boolean; missing_from_sitemap: string[]; missing_from_crawl: string[]; }

export interface StructureCore {
  host: string;
  page_count: number;
  internal_link_count: number;
  external_link_count: number;
  invalid_link_count: number;
  home_url: string;
  home_inferred: boolean;
  max_depth: number;
  sections: SectionCount[];
  orphan_pages: string[];
  dead_end_pages: string[];
  hub_pages: string[];
  unreachable_pages: string[];
  dangling_internal_links: DanglingLink[];
  nodes: NodeInfo[];
  edges: Edge[];
  sitemap_diff: SitemapDiff;
}

interface PageIn { url: string; links: string[]; }

function normUrl(u: URL): string {
  let path = u.pathname || '/';
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  // drop hash; keep query string; lowercase scheme + host (host includes port)
  return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`;
}

function pathOf(normalized: string): string {
  try { const u = new URL(normalized); return (u.pathname || '/'); } catch { return '/'; }
}

function sectionOf(path: string): string {
  const seg = path.split('/').filter((s) => s !== '');
  return seg.length === 0 ? '(root)' : seg[0];
}

function parse(body: any): { error: string } | { pages: PageIn[]; homeRaw: string | null; sitemap: string[] | null; hubMin: number } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "pages" array.' };
  if (!Array.isArray(body.pages) || body.pages.length === 0) return { error: '"pages" must be a non-empty array of { url, links } objects.' };
  if (body.pages.length > MAX_PAGES) return { error: `"pages" exceeds the ${MAX_PAGES}-page limit (got ${body.pages.length}).` };

  const pages: PageIn[] = [];
  for (let i = 0; i < body.pages.length; i++) {
    const p = body.pages[i];
    if (p === null || typeof p !== 'object' || Array.isArray(p)) return { error: `pages[${i}] must be an object.` };
    if (typeof p.url !== 'string' || p.url === '') return { error: `pages[${i}].url must be a non-empty string.` };
    let links: string[] = [];
    if (p.links !== undefined) {
      if (!Array.isArray(p.links)) return { error: `pages[${i}].links must be an array of URL strings.` };
      if (p.links.length > MAX_LINKS_PER_PAGE) return { error: `pages[${i}].links exceeds the ${MAX_LINKS_PER_PAGE}-link limit.` };
      if (!p.links.every((l: unknown) => typeof l === 'string')) return { error: `pages[${i}].links must contain only URL strings.` };
      links = p.links as string[];
    }
    pages.push({ url: p.url, links });
  }

  let homeRaw: string | null = null;
  if (body.home_url !== undefined) {
    if (typeof body.home_url !== 'string' || body.home_url === '') return { error: '"home_url" must be a non-empty string when provided.' };
    homeRaw = body.home_url;
  }

  let sitemap: string[] | null = null;
  if (body.sitemap !== undefined) {
    if (!Array.isArray(body.sitemap) || !body.sitemap.every((s: unknown) => typeof s === 'string')) return { error: '"sitemap" must be an array of URL strings when provided.' };
    sitemap = body.sitemap as string[];
  }

  let hubMin = 5;
  if (body.hub_min_out_degree !== undefined) {
    if (typeof body.hub_min_out_degree !== 'number' || !Number.isInteger(body.hub_min_out_degree) || body.hub_min_out_degree < 1) {
      return { error: '"hub_min_out_degree" must be a positive integer when provided.' };
    }
    hubMin = body.hub_min_out_degree;
  }

  return { pages, homeRaw, sitemap, hubMin };
}

function build(input: { pages: PageIn[]; homeRaw: string | null; sitemap: string[] | null; hubMin: number }): { error: string } | { result: StructureCore } {
  const { pages, homeRaw, sitemap, hubMin } = input;

  // Normalize page URLs (invalid → error: pages are the graph's spine).
  const nodeSet = new Set<string>();
  const normalizedPages: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    let u: URL;
    try { u = new URL(pages[i].url); } catch { return { error: `pages[${i}].url "${pages[i].url}" is not a valid absolute URL.` }; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: `pages[${i}].url must use http(s).` };
    const n = normUrl(u);
    normalizedPages.push(n);
    nodeSet.add(n);
  }

  // Determine the site host: from home_url if given, else the most common page host
  // (ties broken lexicographically) so the result is deterministic.
  let siteHost: string;
  let homeNorm: string | null = null;
  let homeInferred = true;
  if (homeRaw) {
    let hu: URL;
    try { hu = new URL(homeRaw); } catch { return { error: `"home_url" "${homeRaw}" is not a valid absolute URL.` }; }
    siteHost = hu.host.toLowerCase();
    homeNorm = normUrl(hu);
    homeInferred = false;
  } else {
    const hostCounts = new Map<string, number>();
    for (const n of normalizedPages) { const h = new URL(n).host.toLowerCase(); hostCounts.set(h, (hostCounts.get(h) || 0) + 1); }
    siteHost = [...hostCounts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
  }

  // Infer home: prefer the root path on the site host, else the on-host page with the
  // fewest path segments (ties lexicographic).
  if (!homeNorm || !nodeSet.has(homeNorm)) {
    const onHost = normalizedPages.filter((n) => new URL(n).host.toLowerCase() === siteHost);
    const ranked = [...new Set(onHost)].sort((a, b) => {
      const sa = pathOf(a).split('/').filter(Boolean).length, sb = pathOf(b).split('/').filter(Boolean).length;
      return sa - sb || (a < b ? -1 : 1);
    });
    homeNorm = ranked[0] ?? normalizedPages.slice().sort()[0];
    homeInferred = true;
  }

  // Build internal edges (deduped), tally external / invalid / dangling links.
  const adj = new Map<string, Set<string>>();
  const inDeg = new Map<string, number>();
  const outDeg = new Map<string, number>();
  for (const n of nodeSet) { adj.set(n, new Set()); inDeg.set(n, 0); outDeg.set(n, 0); }

  let externalLinks = 0, invalidLinks = 0;
  const externalSeen = new Set<string>();
  const danglingSeen = new Set<string>();
  const dangling: DanglingLink[] = [];

  for (let i = 0; i < pages.length; i++) {
    const fromNorm = normalizedPages[i];
    for (const raw of pages[i].links) {
      let lu: URL;
      try { lu = new URL(raw, pages[i].url); } catch { invalidLinks++; continue; }
      if (lu.protocol !== 'http:' && lu.protocol !== 'https:') { invalidLinks++; continue; }
      const target = normUrl(lu);
      const sameHost = lu.host.toLowerCase() === siteHost;
      if (!sameHost) {
        const k = `${fromNorm} ${target}`;
        if (!externalSeen.has(k)) { externalSeen.add(k); externalLinks++; }
        continue;
      }
      if (target === fromNorm) continue; // self-link is not a navigation hop
      if (nodeSet.has(target)) {
        if (!adj.get(fromNorm)!.has(target)) {
          adj.get(fromNorm)!.add(target);
          outDeg.set(fromNorm, outDeg.get(fromNorm)! + 1);
          inDeg.set(target, inDeg.get(target)! + 1);
        }
      } else {
        const k = `${fromNorm} ${target}`;
        if (!danglingSeen.has(k)) { danglingSeen.add(k); dangling.push({ from: fromNorm, to: target }); }
      }
    }
  }

  const edges: Edge[] = [];
  for (const from of [...nodeSet].sort()) for (const to of [...adj.get(from)!].sort()) edges.push({ from, to });

  // BFS click-depth from home over internal edges.
  const depth = new Map<string, number>();
  depth.set(homeNorm, 0);
  const queue = [homeNorm];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = depth.get(cur)!;
    for (const nb of [...adj.get(cur)!].sort()) {
      if (!depth.has(nb)) { depth.set(nb, d + 1); queue.push(nb); }
    }
  }

  const nodes: NodeInfo[] = [...nodeSet].sort().map((n) => {
    const ind = inDeg.get(n)!, outd = outDeg.get(n)!;
    const reachable = depth.has(n);
    const path = pathOf(n);
    let role: Role;
    if (n === homeNorm) role = 'home';
    else if (ind === 0) role = 'orphan';
    else if (outd === 0) role = 'dead_end';
    else if (outd >= hubMin) role = 'hub';
    else role = 'normal';
    return { url: n, path, section: sectionOf(path), depth: reachable ? depth.get(n)! : null, in_degree: ind, out_degree: outd, role, reachable };
  });

  const sectionMap = new Map<string, number>();
  for (const node of nodes) sectionMap.set(node.section, (sectionMap.get(node.section) || 0) + 1);
  const sections: SectionCount[] = [...sectionMap.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([section, page_count]) => ({ section, page_count }));

  const orphan_pages = nodes.filter((n) => n.role !== 'home' && n.in_degree === 0).map((n) => n.url);
  const dead_end_pages = nodes.filter((n) => n.out_degree === 0).map((n) => n.url);
  const hub_pages = nodes.filter((n) => n.out_degree >= hubMin).map((n) => n.url);
  const unreachable_pages = nodes.filter((n) => !n.reachable).map((n) => n.url);
  const max_depth = nodes.reduce((m, n) => (n.depth !== null && n.depth > m ? n.depth : m), 0);

  // Sitemap diff (host-filtered, normalized).
  let sitemap_diff: SitemapDiff = { provided: false, missing_from_sitemap: [], missing_from_crawl: [] };
  if (sitemap) {
    const smSet = new Set<string>();
    for (const s of sitemap) {
      try { const su = new URL(s); if (su.host.toLowerCase() === siteHost) smSet.add(normUrl(su)); } catch { /* skip unparseable sitemap entries */ }
    }
    const crawled = new Set([...nodeSet].filter((n) => new URL(n).host.toLowerCase() === siteHost));
    sitemap_diff = {
      provided: true,
      missing_from_sitemap: [...crawled].filter((n) => !smSet.has(n)).sort(),
      missing_from_crawl: [...smSet].filter((n) => !crawled.has(n)).sort(),
    };
  }

  return {
    result: {
      host: siteHost,
      page_count: nodeSet.size,
      internal_link_count: edges.length,
      external_link_count: externalLinks,
      invalid_link_count: invalidLinks,
      home_url: homeNorm,
      home_inferred: homeInferred,
      max_depth,
      sections,
      orphan_pages, dead_end_pages, hub_pages, unreachable_pages,
      dangling_internal_links: dangling.sort((a, b) => (a.from + a.to < b.from + b.to ? -1 : 1)),
      nodes, edges, sitemap_diff,
    },
  };
}

const CHAIN_TO = [
  { api: 'scrape-data-pipeline-validator', reason: 'Validate the data scraped from these pages against an expected schema.' },
  { api: 'data-lineage-tracker', reason: 'Model the crawl/transform steps that consume these pages as a lineage graph.' },
];

function invalidators(r: StructureCore): string[] {
  return [
    'The graph is built only from the supplied pages/links; pages or links not provided are invisible — no live crawling is performed.',
    r.home_inferred
      ? `home_url was inferred (${r.home_url}); pass home_url explicitly to fix the depth-0 root and recompute click depths.`
      : 'Click depth is measured from the supplied home_url over internal links only.',
    'A "dangling" internal link points to a same-host URL that is not among the supplied pages — it may be uncrawled rather than broken (this API does not fetch to confirm).',
    'URLs are normalized by lowercasing host, dropping the fragment, and trimming a trailing slash; query strings are kept, so ?a=1 and ?a=2 are distinct pages.',
  ];
}

function actions(r: StructureCore): string[] {
  const out: string[] = [];
  out.push(`${r.page_count} page(s), ${r.internal_link_count} internal link(s); home ${r.home_url}${r.home_inferred ? ' (inferred)' : ''}, max click depth ${r.max_depth}.`);
  if (r.orphan_pages.length) out.push(`${r.orphan_pages.length} orphan page(s) with no inbound internal links — add navigation links to them.`);
  if (r.unreachable_pages.length) out.push(`${r.unreachable_pages.length} page(s) unreachable from home — they cannot be navigated to.`);
  if (r.dead_end_pages.length) out.push(`${r.dead_end_pages.length} dead-end page(s) with no outbound internal links.`);
  if (r.dangling_internal_links.length) out.push(`${r.dangling_internal_links.length} dangling internal link(s) point to uncrawled/missing pages — verify they resolve.`);
  if (r.sitemap_diff.provided && (r.sitemap_diff.missing_from_crawl.length || r.sitemap_diff.missing_from_sitemap.length)) {
    out.push(`Sitemap diff: ${r.sitemap_diff.missing_from_crawl.length} in sitemap but not crawled, ${r.sitemap_diff.missing_from_sitemap.length} crawled but absent from sitemap.`);
  }
  return out;
}

const TAIL = (r: StructureCore) => ({
  confidence_score: r.home_inferred ? 0.9 : 1,
  confidence_per_section: { structure: 1, navigation: r.home_inferred ? 0.9 : 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Website Structure & Navigation Mapper API', version: '1.0.0',
    description: 'Deterministic website structure & navigation mapper. Turns a crawl manifest (pages + their outbound links, optional sitemap) into an internal navigation graph: click depth from home, in/out degree, page roles (home/hub/orphan/dead_end), top-level sections, unreachable pages, dangling links, and a sitemap diff. No fetching, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/website-structure-mapper/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/map', summary: 'Build a navigation graph from a crawl manifest', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL structure map + reasoning', price_usdc: 0.014 },
    ],
    pricing: [
      { path: '/map', price_usdc: 0.008, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/map', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = build(p);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = build(p);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Mapped ${v.page_count} page(s) and ${v.internal_link_count} internal link(s) into a navigation graph rooted at ${v.home_url}.`,
      key_factors: [
        `Sections: ${v.sections.map((s) => `${s.section} (${s.page_count})`).join(', ') || '(none)'}.`,
        `Orphans: ${v.orphan_pages.length}, dead-ends: ${v.dead_end_pages.length}, unreachable: ${v.unreachable_pages.length}, max depth ${v.max_depth}.`,
        v.sitemap_diff.provided ? `Sitemap diff: ${v.sitemap_diff.missing_from_crawl.length} missing-from-crawl, ${v.sitemap_diff.missing_from_sitemap.length} missing-from-sitemap.` : 'No sitemap supplied for comparison.',
      ],
      invalidators: invalidators(v),
    },
    ...TAIL(v),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { mapExample, lookupExample } from './examples';

const ROLE_ENUM = ['home', 'hub', 'orphan', 'dead_end', 'normal'];

const NodeInfo = {
  type: 'object', required: ['url', 'path', 'section', 'depth', 'in_degree', 'out_degree', 'role', 'reachable'], additionalProperties: false,
  properties: {
    url: { type: 'string' },
    path: { type: 'string' },
    section: { type: 'string', description: 'Top-level path segment, or "(root)" for the site root.' },
    depth: { type: ['integer', 'null'], minimum: 0, description: 'Click depth from home over internal links; null if unreachable from home.' },
    in_degree: { type: 'integer', minimum: 0 },
    out_degree: { type: 'integer', minimum: 0 },
    role: { type: 'string', enum: ROLE_ENUM },
    reachable: { type: 'boolean' },
  },
};
const Edge = {
  type: 'object', required: ['from', 'to'], additionalProperties: false,
  properties: { from: { type: 'string' }, to: { type: 'string' } },
};
const SectionCount = {
  type: 'object', required: ['section', 'page_count'], additionalProperties: false,
  properties: { section: { type: 'string' }, page_count: { type: 'integer', minimum: 0 } },
};
const DanglingLink = {
  type: 'object', required: ['from', 'to'], additionalProperties: false,
  properties: { from: { type: 'string' }, to: { type: 'string', description: 'Same-host URL not among the supplied pages.' } },
};
const SitemapDiff = {
  type: 'object', required: ['provided', 'missing_from_sitemap', 'missing_from_crawl'], additionalProperties: false,
  properties: {
    provided: { type: 'boolean' },
    missing_from_sitemap: { type: 'array', items: { type: 'string' }, description: 'Crawled pages absent from the declared sitemap.' },
    missing_from_crawl: { type: 'array', items: { type: 'string' }, description: 'Sitemap URLs not present among crawled pages.' },
  },
};
const StructureCore = {
  type: 'object',
  required: ['host', 'page_count', 'internal_link_count', 'external_link_count', 'invalid_link_count', 'home_url', 'home_inferred', 'max_depth', 'sections', 'orphan_pages', 'dead_end_pages', 'hub_pages', 'unreachable_pages', 'dangling_internal_links', 'nodes', 'edges', 'sitemap_diff'],
  properties: {
    host: { type: 'string' },
    page_count: { type: 'integer', minimum: 0 },
    internal_link_count: { type: 'integer', minimum: 0 },
    external_link_count: { type: 'integer', minimum: 0 },
    invalid_link_count: { type: 'integer', minimum: 0 },
    home_url: { type: 'string' },
    home_inferred: { type: 'boolean' },
    max_depth: { type: 'integer', minimum: 0 },
    sections: { type: 'array', items: SectionCount },
    orphan_pages: { type: 'array', items: { type: 'string' } },
    dead_end_pages: { type: 'array', items: { type: 'string' } },
    hub_pages: { type: 'array', items: { type: 'string' } },
    unreachable_pages: { type: 'array', items: { type: 'string' } },
    dangling_internal_links: { type: 'array', items: DanglingLink },
    nodes: { type: 'array', items: NodeInfo },
    edges: { type: 'array', items: Edge },
    sitemap_diff: SitemapDiff,
  },
};
const PageInput = {
  type: 'object', required: ['url'], additionalProperties: false,
  properties: {
    url: { type: 'string', description: 'Absolute http(s) page URL.' },
    links: { type: 'array', items: { type: 'string' }, description: 'Outbound link URLs found on the page (absolute or relative to url).' },
  },
};
const MapRequest = {
  type: 'object', required: ['pages'], additionalProperties: false,
  properties: {
    pages: { type: 'array', minItems: 1, items: PageInput, description: 'Crawl manifest: each page with its outbound links.' },
    home_url: { type: 'string', description: 'Optional entry/home URL (fixes the depth-0 root). Inferred when omitted.' },
    sitemap: { type: 'array', items: { type: 'string' }, description: 'Optional declared sitemap URLs to diff against the crawl.' },
    hub_min_out_degree: { type: 'integer', minimum: 1, description: 'Out-degree at/above which a page is labeled a hub (default 5).' },
  },
};

// Examples are filled from live output (drift-guarded by the smoke test).
const reqEx = {
  pages: [
    { url: 'https://shop.example.com/', links: ['/products', '/about', 'https://twitter.com/shop'] },
    { url: 'https://shop.example.com/products', links: ['/', '/products/widget', '/products/gadget'] },
    { url: 'https://shop.example.com/products/widget', links: ['/products'] },
    { url: 'https://shop.example.com/products/gadget', links: ['/products', '/missing-page'] },
    { url: 'https://shop.example.com/about', links: ['/'] },
    { url: 'https://shop.example.com/legacy', links: [] },
  ],
  home_url: 'https://shop.example.com/',
  sitemap: ['https://shop.example.com/', 'https://shop.example.com/products', 'https://shop.example.com/contact'],
};
const disc = {
  name: 'Website Structure & Navigation Mapper API', version: '1.0.0',
  description: 'Deterministic website structure & navigation mapper. Turns a crawl manifest (pages + their outbound links, optional sitemap) into an internal navigation graph: click depth from home, in/out degree, page roles (home/hub/orphan/dead_end), top-level sections, unreachable pages, dangling links, and a sitemap diff. No fetching, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/website-structure-mapper/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/map', summary: 'Build a navigation graph from a crawl manifest', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL structure map + reasoning', price_usdc: 0.014 },
  ],
  pricing: [
    { path: '/map', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('structure', 'navigation'), _Tail: Tail,
  NodeInfo, Edge, SectionCount, DanglingLink, SitemapDiff, StructureCore, PageInput, MapRequest, DiscoveryResponse: discoverySchema(),
  MapResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/StructureCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/StructureCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/map', summary: 'Build a navigation graph from a crawl manifest', operationId: 'map', priceUsdc: 0.008,
    requestSchemaRef: 'MapRequest', responseSchemaRef: 'MapResponse', requestExample: reqEx,
    responseExample: mapExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL structure map + reasoning', operationId: 'lookup', priceUsdc: 0.014, oneCall: true,
    requestSchemaRef: 'MapRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'website-structure-mapper', title: 'Website Structure & Navigation Mapper API', version: '1.0.0',
  description: 'Deterministic website structure & navigation mapper — crawl manifest → internal navigation graph (click depth, roles, sections, orphans, dead-ends, dangling links, sitemap diff). No fetching, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /website-structure-mapper/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Website Structure & Navigation Mapper API",
    "version": "1.0.0",
    "description": "Deterministic website structure & navigation mapper — crawl manifest → internal navigation graph (click depth, roles, sections, orphans, dead-ends, dangling links, sitemap diff). No fetching, no LLM.",
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
      "url": "https://orbis-apis.onrender.com/website-structure-mapper"
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
                  "name": "Website Structure & Navigation Mapper API",
                  "version": "1.0.0",
                  "description": "Deterministic website structure & navigation mapper. Turns a crawl manifest (pages + their outbound links, optional sitemap) into an internal navigation graph: click depth from home, in/out degree, page roles (home/hub/orphan/dead_end), top-level sections, unreachable pages, dangling links, and a sitemap diff. No fetching, no LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/website-structure-mapper/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/map",
                      "summary": "Build a navigation graph from a crawl manifest",
                      "price_usdc": 0.008
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL structure map + reasoning",
                      "price_usdc": 0.014
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/map",
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
    "/map": {
      "post": {
        "operationId": "map",
        "summary": "Build a navigation graph from a crawl manifest",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MapResponse"
                },
                "example": {
                  "trace_id": "wsm-1780000000000",
                  "request_id": "wsm-1780000000000",
                  "computed_at": "2026-06-15T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "host": "shop.example.com",
                  "page_count": 6,
                  "internal_link_count": 8,
                  "external_link_count": 1,
                  "invalid_link_count": 0,
                  "home_url": "https://shop.example.com/",
                  "home_inferred": false,
                  "max_depth": 2,
                  "sections": [
                    {
                      "section": "products",
                      "page_count": 3
                    },
                    {
                      "section": "(root)",
                      "page_count": 1
                    },
                    {
                      "section": "about",
                      "page_count": 1
                    },
                    {
                      "section": "legacy",
                      "page_count": 1
                    }
                  ],
                  "orphan_pages": [
                    "https://shop.example.com/legacy"
                  ],
                  "dead_end_pages": [
                    "https://shop.example.com/legacy"
                  ],
                  "hub_pages": [],
                  "unreachable_pages": [
                    "https://shop.example.com/legacy"
                  ],
                  "dangling_internal_links": [
                    {
                      "from": "https://shop.example.com/products/gadget",
                      "to": "https://shop.example.com/missing-page"
                    }
                  ],
                  "nodes": [
                    {
                      "url": "https://shop.example.com/",
                      "path": "/",
                      "section": "(root)",
                      "depth": 0,
                      "in_degree": 2,
                      "out_degree": 2,
                      "role": "home",
                      "reachable": true
                    },
                    {
                      "url": "https://shop.example.com/about",
                      "path": "/about",
                      "section": "about",
                      "depth": 1,
                      "in_degree": 1,
                      "out_degree": 1,
                      "role": "normal",
                      "reachable": true
                    },
                    {
                      "url": "https://shop.example.com/legacy",
                      "path": "/legacy",
                      "section": "legacy",
                      "depth": null,
                      "in_degree": 0,
                      "out_degree": 0,
                      "role": "orphan",
                      "reachable": false
                    },
                    {
                      "url": "https://shop.example.com/products",
                      "path": "/products",
                      "section": "products",
                      "depth": 1,
                      "in_degree": 3,
                      "out_degree": 3,
                      "role": "normal",
                      "reachable": true
                    },
                    {
                      "url": "https://shop.example.com/products/gadget",
                      "path": "/products/gadget",
                      "section": "products",
                      "depth": 2,
                      "in_degree": 1,
                      "out_degree": 1,
                      "role": "normal",
                      "reachable": true
                    },
                    {
                      "url": "https://shop.example.com/products/widget",
                      "path": "/products/widget",
                      "section": "products",
                      "depth": 2,
                      "in_degree": 1,
                      "out_degree": 1,
                      "role": "normal",
                      "reachable": true
                    }
                  ],
                  "edges": [
                    {
                      "from": "https://shop.example.com/",
                      "to": "https://shop.example.com/about"
                    },
                    {
                      "from": "https://shop.example.com/",
                      "to": "https://shop.example.com/products"
                    },
                    {
                      "from": "https://shop.example.com/about",
                      "to": "https://shop.example.com/"
                    },
                    {
                      "from": "https://shop.example.com/products",
                      "to": "https://shop.example.com/"
                    },
                    {
                      "from": "https://shop.example.com/products",
                      "to": "https://shop.example.com/products/gadget"
                    },
                    {
                      "from": "https://shop.example.com/products",
                      "to": "https://shop.example.com/products/widget"
                    },
                    {
                      "from": "https://shop.example.com/products/gadget",
                      "to": "https://shop.example.com/products"
                    },
                    {
                      "from": "https://shop.example.com/products/widget",
                      "to": "https://shop.example.com/products"
                    }
                  ],
                  "sitemap_diff": {
                    "provided": true,
                    "missing_from_sitemap": [
                      "https://shop.example.com/about",
                      "https://shop.example.com/legacy",
                      "https://shop.example.com/products/gadget",
                      "https://shop.example.com/products/widget"
                    ],
                    "missing_from_crawl": [
                      "https://shop.example.com/contact"
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "structure": 1,
                    "navigation": 1
                  },
                  "recommended_actions_priority_order": [
                    "6 page(s), 8 internal link(s); home https://shop.example.com/, max click depth 2.",
                    "1 orphan page(s) with no inbound internal links — add navigation links to them.",
                    "1 page(s) unreachable from home — they cannot be navigated to.",
                    "1 dead-end page(s) with no outbound internal links.",
                    "1 dangling internal link(s) point to uncrawled/missing pages — verify they resolve.",
                    "Sitemap diff: 1 in sitemap but not crawled, 4 crawled but absent from sitemap."
                  ],
                  "chain_to": [
                    {
                      "api": "scrape-data-pipeline-validator",
                      "reason": "Validate the data scraped from these pages against an expected schema."
                    },
                    {
                      "api": "data-lineage-tracker",
                      "reason": "Model the crawl/transform steps that consume these pages as a lineage graph."
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
                "pages": [
                  {
                    "url": "https://shop.example.com/",
                    "links": [
                      "/products",
                      "/about",
                      "https://twitter.com/shop"
                    ]
                  },
                  {
                    "url": "https://shop.example.com/products",
                    "links": [
                      "/",
                      "/products/widget",
                      "/products/gadget"
                    ]
                  },
                  {
                    "url": "https://shop.example.com/products/widget",
                    "links": [
                      "/products"
                    ]
                  },
                  {
                    "url": "https://shop.example.com/products/gadget",
                    "links": [
                      "/products",
                      "/missing-page"
                    ]
                  },
                  {
                    "url": "https://shop.example.com/about",
                    "links": [
                      "/"
                    ]
                  },
                  {
                    "url": "https://shop.example.com/legacy",
                    "links": []
                  }
                ],
                "home_url": "https://shop.example.com/",
                "sitemap": [
                  "https://shop.example.com/",
                  "https://shop.example.com/products",
                  "https://shop.example.com/contact"
                ]
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
        "summary": "ONE-CALL structure map + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "wsm-1780000000000",
                  "request_id": "wsm-1780000000000",
                  "computed_at": "2026-06-15T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "host": "shop.example.com",
                  "page_count": 6,
                  "internal_link_count": 8,
                  "external_link_count": 1,
                  "invalid_link_count": 0,
                  "home_url": "https://shop.example.com/",
                  "home_inferred": false,
                  "max_depth": 2,
                  "sections": [
                    {
                      "section": "products",
                      "page_count": 3
                    },
                    {
                      "section": "(root)",
                      "page_count": 1
                    },
                    {
                      "section": "about",
                      "page_count": 1
                    },
                    {
                      "section": "legacy",
                      "page_count": 1
                    }
                  ],
                  "orphan_pages": [
                    "https://shop.example.com/legacy"
                  ],
                  "dead_end_pages": [
                    "https://shop.example.com/legacy"
                  ],
                  "hub_pages": [],
                  "unreachable_pages": [
                    "https://shop.example.com/legacy"
                  ],
                  "dangling_internal_links": [
                    {
                      "from": "https://shop.example.com/products/gadget",
                      "to": "https://shop.example.com/missing-page"
                    }
                  ],
                  "nodes": [
                    {
                      "url": "https://shop.example.com/",
                      "path": "/",
                      "section": "(root)",
                      "depth": 0,
                      "in_degree": 2,
                      "out_degree": 2,
                      "role": "home",
                      "reachable": true
                    },
                    {
                      "url": "https://shop.example.com/about",
                      "path": "/about",
                      "section": "about",
                      "depth": 1,
                      "in_degree": 1,
                      "out_degree": 1,
                      "role": "normal",
                      "reachable": true
                    },
                    {
                      "url": "https://shop.example.com/legacy",
                      "path": "/legacy",
                      "section": "legacy",
                      "depth": null,
                      "in_degree": 0,
                      "out_degree": 0,
                      "role": "orphan",
                      "reachable": false
                    },
                    {
                      "url": "https://shop.example.com/products",
                      "path": "/products",
                      "section": "products",
                      "depth": 1,
                      "in_degree": 3,
                      "out_degree": 3,
                      "role": "normal",
                      "reachable": true
                    },
                    {
                      "url": "https://shop.example.com/products/gadget",
                      "path": "/products/gadget",
                      "section": "products",
                      "depth": 2,
                      "in_degree": 1,
                      "out_degree": 1,
                      "role": "normal",
                      "reachable": true
                    },
                    {
                      "url": "https://shop.example.com/products/widget",
                      "path": "/products/widget",
                      "section": "products",
                      "depth": 2,
                      "in_degree": 1,
                      "out_degree": 1,
                      "role": "normal",
                      "reachable": true
                    }
                  ],
                  "edges": [
                    {
                      "from": "https://shop.example.com/",
                      "to": "https://shop.example.com/about"
                    },
                    {
                      "from": "https://shop.example.com/",
                      "to": "https://shop.example.com/products"
                    },
                    {
                      "from": "https://shop.example.com/about",
                      "to": "https://shop.example.com/"
                    },
                    {
                      "from": "https://shop.example.com/products",
                      "to": "https://shop.example.com/"
                    },
                    {
                      "from": "https://shop.example.com/products",
                      "to": "https://shop.example.com/products/gadget"
                    },
                    {
                      "from": "https://shop.example.com/products",
                      "to": "https://shop.example.com/products/widget"
                    },
                    {
                      "from": "https://shop.example.com/products/gadget",
                      "to": "https://shop.example.com/products"
                    },
                    {
                      "from": "https://shop.example.com/products/widget",
                      "to": "https://shop.example.com/products"
                    }
                  ],
                  "sitemap_diff": {
                    "provided": true,
                    "missing_from_sitemap": [
                      "https://shop.example.com/about",
                      "https://shop.example.com/legacy",
                      "https://shop.example.com/products/gadget",
                      "https://shop.example.com/products/widget"
                    ],
                    "missing_from_crawl": [
                      "https://shop.example.com/contact"
                    ]
                  },
                  "reasoning": {
                    "why_result_generated": "Mapped 6 page(s) and 8 internal link(s) into a navigation graph rooted at https://shop.example.com/.",
                    "key_factors": [
                      "Sections: products (3), (root) (1), about (1), legacy (1).",
                      "Orphans: 1, dead-ends: 1, unreachable: 1, max depth 2.",
                      "Sitemap diff: 1 missing-from-crawl, 4 missing-from-sitemap."
                    ],
                    "invalidators": [
                      "The graph is built only from the supplied pages/links; pages or links not provided are invisible — no live crawling is performed.",
                      "Click depth is measured from the supplied home_url over internal links only.",
                      "A \"dangling\" internal link points to a same-host URL that is not among the supplied pages — it may be uncrawled rather than broken (this API does not fetch to confirm).",
                      "URLs are normalized by lowercasing host, dropping the fragment, and trimming a trailing slash; query strings are kept, so ?a=1 and ?a=2 are distinct pages."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "structure": 1,
                    "navigation": 1
                  },
                  "recommended_actions_priority_order": [
                    "6 page(s), 8 internal link(s); home https://shop.example.com/, max click depth 2.",
                    "1 orphan page(s) with no inbound internal links — add navigation links to them.",
                    "1 page(s) unreachable from home — they cannot be navigated to.",
                    "1 dead-end page(s) with no outbound internal links.",
                    "1 dangling internal link(s) point to uncrawled/missing pages — verify they resolve.",
                    "Sitemap diff: 1 in sitemap but not crawled, 4 crawled but absent from sitemap."
                  ],
                  "chain_to": [
                    {
                      "api": "scrape-data-pipeline-validator",
                      "reason": "Validate the data scraped from these pages against an expected schema."
                    },
                    {
                      "api": "data-lineage-tracker",
                      "reason": "Model the crawl/transform steps that consume these pages as a lineage graph."
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
                "pages": [
                  {
                    "url": "https://shop.example.com/",
                    "links": [
                      "/products",
                      "/about",
                      "https://twitter.com/shop"
                    ]
                  },
                  {
                    "url": "https://shop.example.com/products",
                    "links": [
                      "/",
                      "/products/widget",
                      "/products/gadget"
                    ]
                  },
                  {
                    "url": "https://shop.example.com/products/widget",
                    "links": [
                      "/products"
                    ]
                  },
                  {
                    "url": "https://shop.example.com/products/gadget",
                    "links": [
                      "/products",
                      "/missing-page"
                    ]
                  },
                  {
                    "url": "https://shop.example.com/about",
                    "links": [
                      "/"
                    ]
                  },
                  {
                    "url": "https://shop.example.com/legacy",
                    "links": []
                  }
                ],
                "home_url": "https://shop.example.com/",
                "sitemap": [
                  "https://shop.example.com/",
                  "https://shop.example.com/products",
                  "https://shop.example.com/contact"
                ]
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
          "structure": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "navigation": {
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
          "url",
          "path",
          "section",
          "depth",
          "in_degree",
          "out_degree",
          "role",
          "reachable"
        ],
        "additionalProperties": false,
        "properties": {
          "url": {
            "type": "string"
          },
          "path": {
            "type": "string"
          },
          "section": {
            "type": "string",
            "description": "Top-level path segment, or \"(root)\" for the site root."
          },
          "depth": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 0,
            "description": "Click depth from home over internal links; null if unreachable from home."
          },
          "in_degree": {
            "type": "integer",
            "minimum": 0
          },
          "out_degree": {
            "type": "integer",
            "minimum": 0
          },
          "role": {
            "type": "string",
            "enum": [
              "home",
              "hub",
              "orphan",
              "dead_end",
              "normal"
            ]
          },
          "reachable": {
            "type": "boolean"
          }
        }
      },
      "Edge": {
        "type": "object",
        "required": [
          "from",
          "to"
        ],
        "additionalProperties": false,
        "properties": {
          "from": {
            "type": "string"
          },
          "to": {
            "type": "string"
          }
        }
      },
      "SectionCount": {
        "type": "object",
        "required": [
          "section",
          "page_count"
        ],
        "additionalProperties": false,
        "properties": {
          "section": {
            "type": "string"
          },
          "page_count": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "DanglingLink": {
        "type": "object",
        "required": [
          "from",
          "to"
        ],
        "additionalProperties": false,
        "properties": {
          "from": {
            "type": "string"
          },
          "to": {
            "type": "string",
            "description": "Same-host URL not among the supplied pages."
          }
        }
      },
      "SitemapDiff": {
        "type": "object",
        "required": [
          "provided",
          "missing_from_sitemap",
          "missing_from_crawl"
        ],
        "additionalProperties": false,
        "properties": {
          "provided": {
            "type": "boolean"
          },
          "missing_from_sitemap": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Crawled pages absent from the declared sitemap."
          },
          "missing_from_crawl": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Sitemap URLs not present among crawled pages."
          }
        }
      },
      "StructureCore": {
        "type": "object",
        "required": [
          "host",
          "page_count",
          "internal_link_count",
          "external_link_count",
          "invalid_link_count",
          "home_url",
          "home_inferred",
          "max_depth",
          "sections",
          "orphan_pages",
          "dead_end_pages",
          "hub_pages",
          "unreachable_pages",
          "dangling_internal_links",
          "nodes",
          "edges",
          "sitemap_diff"
        ],
        "properties": {
          "host": {
            "type": "string"
          },
          "page_count": {
            "type": "integer",
            "minimum": 0
          },
          "internal_link_count": {
            "type": "integer",
            "minimum": 0
          },
          "external_link_count": {
            "type": "integer",
            "minimum": 0
          },
          "invalid_link_count": {
            "type": "integer",
            "minimum": 0
          },
          "home_url": {
            "type": "string"
          },
          "home_inferred": {
            "type": "boolean"
          },
          "max_depth": {
            "type": "integer",
            "minimum": 0
          },
          "sections": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "section",
                "page_count"
              ],
              "additionalProperties": false,
              "properties": {
                "section": {
                  "type": "string"
                },
                "page_count": {
                  "type": "integer",
                  "minimum": 0
                }
              }
            }
          },
          "orphan_pages": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "dead_end_pages": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "hub_pages": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "unreachable_pages": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "dangling_internal_links": {
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
                  "type": "string"
                },
                "to": {
                  "type": "string",
                  "description": "Same-host URL not among the supplied pages."
                }
              }
            }
          },
          "nodes": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "url",
                "path",
                "section",
                "depth",
                "in_degree",
                "out_degree",
                "role",
                "reachable"
              ],
              "additionalProperties": false,
              "properties": {
                "url": {
                  "type": "string"
                },
                "path": {
                  "type": "string"
                },
                "section": {
                  "type": "string",
                  "description": "Top-level path segment, or \"(root)\" for the site root."
                },
                "depth": {
                  "type": [
                    "integer",
                    "null"
                  ],
                  "minimum": 0,
                  "description": "Click depth from home over internal links; null if unreachable from home."
                },
                "in_degree": {
                  "type": "integer",
                  "minimum": 0
                },
                "out_degree": {
                  "type": "integer",
                  "minimum": 0
                },
                "role": {
                  "type": "string",
                  "enum": [
                    "home",
                    "hub",
                    "orphan",
                    "dead_end",
                    "normal"
                  ]
                },
                "reachable": {
                  "type": "boolean"
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
                "to"
              ],
              "additionalProperties": false,
              "properties": {
                "from": {
                  "type": "string"
                },
                "to": {
                  "type": "string"
                }
              }
            }
          },
          "sitemap_diff": {
            "type": "object",
            "required": [
              "provided",
              "missing_from_sitemap",
              "missing_from_crawl"
            ],
            "additionalProperties": false,
            "properties": {
              "provided": {
                "type": "boolean"
              },
              "missing_from_sitemap": {
                "type": "array",
                "items": {
                  "type": "string"
                },
                "description": "Crawled pages absent from the declared sitemap."
              },
              "missing_from_crawl": {
                "type": "array",
                "items": {
                  "type": "string"
                },
                "description": "Sitemap URLs not present among crawled pages."
              }
            }
          }
        }
      },
      "PageInput": {
        "type": "object",
        "required": [
          "url"
        ],
        "additionalProperties": false,
        "properties": {
          "url": {
            "type": "string",
            "description": "Absolute http(s) page URL."
          },
          "links": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Outbound link URLs found on the page (absolute or relative to url)."
          }
        }
      },
      "MapRequest": {
        "type": "object",
        "required": [
          "pages"
        ],
        "additionalProperties": false,
        "properties": {
          "pages": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": [
                "url"
              ],
              "additionalProperties": false,
              "properties": {
                "url": {
                  "type": "string",
                  "description": "Absolute http(s) page URL."
                },
                "links": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "description": "Outbound link URLs found on the page (absolute or relative to url)."
                }
              }
            },
            "description": "Crawl manifest: each page with its outbound links."
          },
          "home_url": {
            "type": "string",
            "description": "Optional entry/home URL (fixes the depth-0 root). Inferred when omitted."
          },
          "sitemap": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Optional declared sitemap URLs to diff against the crawl."
          },
          "hub_min_out_degree": {
            "type": "integer",
            "minimum": 1,
            "description": "Out-degree at/above which a page is labeled a hub (default 5)."
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
            "$ref": "#/components/schemas/StructureCore"
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
            "$ref": "#/components/schemas/StructureCore"
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
### POST /map (home_url given + sitemap diff + orphan/dead-end/dangling)
Request:
```json
{
  "pages": [
    {
      "url": "https://shop.example.com/",
      "links": [
        "/products",
        "/about",
        "https://twitter.com/shop"
      ]
    },
    {
      "url": "https://shop.example.com/products",
      "links": [
        "/",
        "/products/widget",
        "/products/gadget"
      ]
    },
    {
      "url": "https://shop.example.com/products/widget",
      "links": [
        "/products"
      ]
    },
    {
      "url": "https://shop.example.com/products/gadget",
      "links": [
        "/products",
        "/missing-page"
      ]
    },
    {
      "url": "https://shop.example.com/about",
      "links": [
        "/"
      ]
    },
    {
      "url": "https://shop.example.com/legacy",
      "links": []
    }
  ],
  "home_url": "https://shop.example.com/",
  "sitemap": [
    "https://shop.example.com/",
    "https://shop.example.com/products",
    "https://shop.example.com/contact"
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "o817ooio-1781567165456",
  "request_id": "o817ooio-1781567165456",
  "computed_at": "2026-06-15T23:46:05.456Z",
  "success": true,
  "latency_ms": 2,
  "host": "shop.example.com",
  "page_count": 6,
  "internal_link_count": 8,
  "external_link_count": 1,
  "invalid_link_count": 0,
  "home_url": "https://shop.example.com/",
  "home_inferred": false,
  "max_depth": 2,
  "sections": [
    {
      "section": "products",
      "page_count": 3
    },
    {
      "section": "(root)",
      "page_count": 1
    },
    {
      "section": "about",
      "page_count": 1
    },
    {
      "section": "legacy",
      "page_count": 1
    }
  ],
  "orphan_pages": [
    "https://shop.example.com/legacy"
  ],
  "dead_end_pages": [
    "https://shop.example.com/legacy"
  ],
  "hub_pages": [],
  "unreachable_pages": [
    "https://shop.example.com/legacy"
  ],
  "dangling_internal_links": [
    {
      "from": "https://shop.example.com/products/gadget",
      "to": "https://shop.example.com/missing-page"
    }
  ],
  "nodes": [
    {
      "url": "https://shop.example.com/",
      "path": "/",
      "section": "(root)",
      "depth": 0,
      "in_degree": 2,
      "out_degree": 2,
      "role": "home",
      "reachable": true
    },
    {
      "url": "https://shop.example.com/about",
      "path": "/about",
      "section": "about",
      "depth": 1,
      "in_degree": 1,
      "out_degree": 1,
      "role": "normal",
      "reachable": true
    },
    {
      "url": "https://shop.example.com/legacy",
      "path": "/legacy",
      "section": "legacy",
      "depth": null,
      "in_degree": 0,
      "out_degree": 0,
      "role": "orphan",
      "reachable": false
    },
    {
      "url": "https://shop.example.com/products",
      "path": "/products",
      "section": "products",
      "depth": 1,
      "in_degree": 3,
      "out_degree": 3,
      "role": "normal",
      "reachable": true
    },
    {
      "url": "https://shop.example.com/products/gadget",
      "path": "/products/gadget",
      "section": "products",
      "depth": 2,
      "in_degree": 1,
      "out_degree": 1,
      "role": "normal",
      "reachable": true
    },
    {
      "url": "https://shop.example.com/products/widget",
      "path": "/products/widget",
      "section": "products",
      "depth": 2,
      "in_degree": 1,
      "out_degree": 1,
      "role": "normal",
      "reachable": true
    }
  ],
  "edges": [
    {
      "from": "https://shop.example.com/",
      "to": "https://shop.example.com/about"
    },
    {
      "from": "https://shop.example.com/",
      "to": "https://shop.example.com/products"
    },
    {
      "from": "https://shop.example.com/about",
      "to": "https://shop.example.com/"
    },
    {
      "from": "https://shop.example.com/products",
      "to": "https://shop.example.com/"
    },
    {
      "from": "https://shop.example.com/products",
      "to": "https://shop.example.com/products/gadget"
    },
    {
      "from": "https://shop.example.com/products",
      "to": "https://shop.example.com/products/widget"
    },
    {
      "from": "https://shop.example.com/products/gadget",
      "to": "https://shop.example.com/products"
    },
    {
      "from": "https://shop.example.com/products/widget",
      "to": "https://shop.example.com/products"
    }
  ],
  "sitemap_diff": {
    "provided": true,
    "missing_from_sitemap": [
      "https://shop.example.com/about",
      "https://shop.example.com/legacy",
      "https://shop.example.com/products/gadget",
      "https://shop.example.com/products/widget"
    ],
    "missing_from_crawl": [
      "https://shop.example.com/contact"
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "structure": 1,
    "navigation": 1
  },
  "recommended_actions_priority_order": [
    "6 page(s), 8 internal link(s); home https://shop.example.com/, max click depth 2.",
    "1 orphan page(s) with no inbound internal links — add navigation links to them.",
    "1 page(s) unreachable from home — they cannot be navigated to.",
    "1 dead-end page(s) with no outbound internal links.",
    "1 dangling internal link(s) point to uncrawled/missing pages — verify they resolve.",
    "Sitemap diff: 1 in sitemap but not crawled, 4 crawled but absent from sitemap."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the data scraped from these pages against an expected schema."
    },
    {
      "api": "data-lineage-tracker",
      "reason": "Model the crawl/transform steps that consume these pages as a lineage graph."
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

### POST /lookup (home_url INFERRED → confidence 0.9, home_inferred true)
Request:
```json
{
  "pages": [
    {
      "url": "https://blog.example.com/posts/a",
      "links": [
        "/posts/b"
      ]
    },
    {
      "url": "https://blog.example.com/posts/b",
      "links": [
        "/posts/a"
      ]
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "8uwycv34-1781567165472",
  "request_id": "8uwycv34-1781567165472",
  "computed_at": "2026-06-15T23:46:05.472Z",
  "success": true,
  "latency_ms": 5,
  "host": "blog.example.com",
  "page_count": 2,
  "internal_link_count": 2,
  "external_link_count": 0,
  "invalid_link_count": 0,
  "home_url": "https://blog.example.com/posts/a",
  "home_inferred": true,
  "max_depth": 1,
  "sections": [
    {
      "section": "posts",
      "page_count": 2
    }
  ],
  "orphan_pages": [],
  "dead_end_pages": [],
  "hub_pages": [],
  "unreachable_pages": [],
  "dangling_internal_links": [],
  "nodes": [
    {
      "url": "https://blog.example.com/posts/a",
      "path": "/posts/a",
      "section": "posts",
      "depth": 0,
      "in_degree": 1,
      "out_degree": 1,
      "role": "home",
      "reachable": true
    },
    {
      "url": "https://blog.example.com/posts/b",
      "path": "/posts/b",
      "section": "posts",
      "depth": 1,
      "in_degree": 1,
      "out_degree": 1,
      "role": "normal",
      "reachable": true
    }
  ],
  "edges": [
    {
      "from": "https://blog.example.com/posts/a",
      "to": "https://blog.example.com/posts/b"
    },
    {
      "from": "https://blog.example.com/posts/b",
      "to": "https://blog.example.com/posts/a"
    }
  ],
  "sitemap_diff": {
    "provided": false,
    "missing_from_sitemap": [],
    "missing_from_crawl": []
  },
  "reasoning": {
    "why_result_generated": "Mapped 2 page(s) and 2 internal link(s) into a navigation graph rooted at https://blog.example.com/posts/a.",
    "key_factors": [
      "Sections: posts (2).",
      "Orphans: 0, dead-ends: 0, unreachable: 0, max depth 1.",
      "No sitemap supplied for comparison."
    ],
    "invalidators": [
      "The graph is built only from the supplied pages/links; pages or links not provided are invisible — no live crawling is performed.",
      "home_url was inferred (https://blog.example.com/posts/a); pass home_url explicitly to fix the depth-0 root and recompute click depths.",
      "A \"dangling\" internal link points to a same-host URL that is not among the supplied pages — it may be uncrawled rather than broken (this API does not fetch to confirm).",
      "URLs are normalized by lowercasing host, dropping the fragment, and trimming a trailing slash; query strings are kept, so ?a=1 and ?a=2 are distinct pages."
    ]
  },
  "confidence_score": 0.9,
  "confidence_per_section": {
    "structure": 1,
    "navigation": 0.9
  },
  "recommended_actions_priority_order": [
    "2 page(s), 2 internal link(s); home https://blog.example.com/posts/a (inferred), max click depth 1."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the data scraped from these pages against an expected schema."
    },
    {
      "api": "data-lineage-tracker",
      "reason": "Model the crawl/transform steps that consume these pages as a lineage graph."
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

### POST /map (relative-link resolution + external + invalid link counting)
Request:
```json
{
  "pages": [
    {
      "url": "https://site.test/",
      "links": [
        "about",
        "https://x.com/ext",
        "mailto:a@b.com",
        "javascript:void(0)"
      ]
    },
    {
      "url": "https://site.test/about",
      "links": [
        "./"
      ]
    }
  ],
  "home_url": "https://site.test/"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "p7oe05sa-1781567165481",
  "request_id": "p7oe05sa-1781567165481",
  "computed_at": "2026-06-15T23:46:05.481Z",
  "success": true,
  "latency_ms": 0,
  "host": "site.test",
  "page_count": 2,
  "internal_link_count": 2,
  "external_link_count": 1,
  "invalid_link_count": 2,
  "home_url": "https://site.test/",
  "home_inferred": false,
  "max_depth": 1,
  "sections": [
    {
      "section": "(root)",
      "page_count": 1
    },
    {
      "section": "about",
      "page_count": 1
    }
  ],
  "orphan_pages": [],
  "dead_end_pages": [],
  "hub_pages": [],
  "unreachable_pages": [],
  "dangling_internal_links": [],
  "nodes": [
    {
      "url": "https://site.test/",
      "path": "/",
      "section": "(root)",
      "depth": 0,
      "in_degree": 1,
      "out_degree": 1,
      "role": "home",
      "reachable": true
    },
    {
      "url": "https://site.test/about",
      "path": "/about",
      "section": "about",
      "depth": 1,
      "in_degree": 1,
      "out_degree": 1,
      "role": "normal",
      "reachable": true
    }
  ],
  "edges": [
    {
      "from": "https://site.test/",
      "to": "https://site.test/about"
    },
    {
      "from": "https://site.test/about",
      "to": "https://site.test/"
    }
  ],
  "sitemap_diff": {
    "provided": false,
    "missing_from_sitemap": [],
    "missing_from_crawl": []
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "structure": 1,
    "navigation": 1
  },
  "recommended_actions_priority_order": [
    "2 page(s), 2 internal link(s); home https://site.test/, max click depth 1."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the data scraped from these pages against an expected schema."
    },
    {
      "api": "data-lineage-tracker",
      "reason": "Model the crawl/transform steps that consume these pages as a lineage graph."
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

### POST /map (error: empty pages)
Request:
```json
{
  "pages": []
}
```
Response (HTTP 400):
```json
{
  "trace_id": "qerp0bpx-1781567165486",
  "request_id": "qerp0bpx-1781567165486",
  "computed_at": "2026-06-15T23:46:05.486Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"pages\" must be a non-empty array of { url, links } objects."
  }
}
```

---

# scraper-test-suite

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round } from '../../_aplus/util';
import { gradeOf } from '../../_aplus/dataset';

// Deterministic web-scraper test suite & validator. Given a sample HTML document
// and a list of selector tests with assertions (exists / count / equals / contains
// / matches / non_empty, optionally on an attribute), parses the HTML with a real
// HTML parser (cheerio) and reports per-test pass/fail, extracted values, an
// overall score and grade. Use it to assert a scraper's selectors still extract
// what they should against a captured page. No fetching, no LLM, nothing stored.

const router = Router();

const MAX_HTML = 1_000_000;        // chars; bounds the parse surface (≈ request body cap)
const MAX_TESTS = 200;
const MAX_SAMPLE_VALUES = 50;
const MAX_REGEX_LEN = 300;

// Conservative catastrophic-backtracking ("ReDoS") guard — flags a group that is
// itself quantified by */+ and whose body contains another unbounded quantifier,
// e.g. (a+)+, (.+)*. May over-reject; that trade-off is intended for caller-supplied
// regex. (Mirrors data-quality-rules-api.)
function looksCatastrophic(src: string): boolean {
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== ')') continue;
    const next = src[i + 1];
    const quantified = next === '+' || next === '*' || (next === '{' && /^\{\d*,\d*\}/.test(src.slice(i + 1)));
    if (!quantified) continue;
    let depth = 0, open = -1;
    for (let j = i; j >= 0; j--) {
      if (src[j] === ')') depth++;
      else if (src[j] === '(') { depth--; if (depth === 0) { open = j; break; } }
    }
    if (open === -1) continue;
    const body = src.slice(open + 1, i);
    if (/[+*]|\{\d*,\}/.test(body)) return true;
  }
  return false;
}

type AssertionType = 'exists' | 'count' | 'min_count' | 'max_count' | 'equals' | 'contains' | 'matches' | 'non_empty';
const ASSERT_KEYS = ['exists', 'count', 'min_count', 'max_count', 'equals', 'contains', 'matches', 'non_empty', 'attr'];

export interface AssertionResult { type: AssertionType; expected: unknown; actual: unknown; pass: boolean; }
export interface TestResult {
  name: string; selector: string; extraction_mode: string;
  matched_count: number; extracted_value: string | null; sample_values: (string | null)[];
  assertions: AssertionResult[]; error: string | null; passed: boolean;
}
export interface SuiteCore {
  test_count: number; passed_count: number; failed_count: number; all_passed: boolean;
  score: number; grade: string; results: TestResult[];
}

interface TestSpec { name: string; selector: string; assert: Record<string, unknown>; }

function parse(body: any): { error: string } | { html: string; tests: TestSpec[] } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "html" and "tests".' };
  if (typeof body.html !== 'string') return { error: '"html" must be a string.' };
  if (body.html.length > MAX_HTML) return { error: `"html" exceeds the ${MAX_HTML}-character limit (got ${body.html.length}).` };
  if (!Array.isArray(body.tests) || body.tests.length === 0) return { error: '"tests" must be a non-empty array of selector tests.' };
  if (body.tests.length > MAX_TESTS) return { error: `"tests" exceeds the ${MAX_TESTS}-test limit.` };

  const tests: TestSpec[] = [];
  const names = new Set<string>();
  for (let i = 0; i < body.tests.length; i++) {
    const t = body.tests[i];
    if (t === null || typeof t !== 'object' || Array.isArray(t)) return { error: `tests[${i}] must be an object.` };
    if (typeof t.name !== 'string' || t.name === '') return { error: `tests[${i}].name must be a non-empty string.` };
    if (names.has(t.name)) return { error: `tests[${i}].name "${t.name}" is duplicated; test names must be unique.` };
    names.add(t.name);
    if (typeof t.selector !== 'string' || t.selector === '') return { error: `tests[${i}].selector must be a non-empty string.` };
    let assert: Record<string, unknown> = {};
    if (t.assert !== undefined) {
      if (t.assert === null || typeof t.assert !== 'object' || Array.isArray(t.assert)) return { error: `tests[${i}].assert must be an object.` };
      assert = t.assert as Record<string, unknown>;
      for (const k of Object.keys(assert)) if (!ASSERT_KEYS.includes(k)) return { error: `tests[${i}].assert has unknown key "${k}". Allowed: ${ASSERT_KEYS.join(', ')}.` };
      const intKeys = ['count', 'min_count', 'max_count'];
      for (const k of intKeys) if (assert[k] !== undefined && (typeof assert[k] !== 'number' || !Number.isInteger(assert[k]) || (assert[k] as number) < 0)) return { error: `tests[${i}].assert.${k} must be a non-negative integer.` };
      for (const k of ['exists', 'non_empty']) if (assert[k] !== undefined && typeof assert[k] !== 'boolean') return { error: `tests[${i}].assert.${k} must be a boolean.` };
      for (const k of ['equals', 'contains', 'matches', 'attr']) if (assert[k] !== undefined && typeof assert[k] !== 'string') return { error: `tests[${i}].assert.${k} must be a string.` };
      if (typeof assert.matches === 'string') {
        if (assert.matches.length > MAX_REGEX_LEN) return { error: `tests[${i}].assert.matches exceeds the ${MAX_REGEX_LEN}-character regex limit.` };
        if (looksCatastrophic(assert.matches)) return { error: `tests[${i}].assert.matches rejected: nested unbounded quantifiers risk catastrophic backtracking — simplify it.` };
        try { new RegExp(assert.matches); } catch { return { error: `tests[${i}].assert.matches is not a valid regular expression.` }; }
      }
    }
    tests.push({ name: t.name, selector: t.selector, assert });
  }
  return { html: body.html, tests };
}

function runTest($: cheerio.CheerioAPI, t: TestSpec): TestResult {
  const attr = typeof t.assert.attr === 'string' ? t.assert.attr : null;
  const extraction_mode = attr ? `attr:${attr}` : 'text';
  let sel: cheerio.Cheerio<any>;
  try { sel = $(t.selector); } catch (e: any) {
    return { name: t.name, selector: t.selector, extraction_mode, matched_count: 0, extracted_value: null, sample_values: [], assertions: [], error: `invalid_selector: ${e?.message ?? 'unparseable CSS selector'}`, passed: false };
  }
  const matched_count = sel.length;
  const valueOf = (el: any): string | null => {
    if (attr) { const a = $(el).attr(attr); return a === undefined ? null : a; }
    return $(el).text().trim();
  };
  const extracted_value = matched_count > 0 ? valueOf(sel.get(0)) : null;
  const sample_values: (string | null)[] = sel.toArray().slice(0, MAX_SAMPLE_VALUES).map((el) => valueOf(el));

  const assertions: AssertionResult[] = [];
  const a = t.assert;
  const push = (type: AssertionType, expected: unknown, actual: unknown, pass: boolean) => assertions.push({ type, expected, actual, pass });
  if (typeof a.exists === 'boolean') push('exists', a.exists, matched_count > 0, (matched_count > 0) === a.exists);
  if (typeof a.count === 'number') push('count', a.count, matched_count, matched_count === a.count);
  if (typeof a.min_count === 'number') push('min_count', a.min_count, matched_count, matched_count >= a.min_count);
  if (typeof a.max_count === 'number') push('max_count', a.max_count, matched_count, matched_count <= a.max_count);
  if (typeof a.equals === 'string') push('equals', a.equals, extracted_value, extracted_value === a.equals);
  if (typeof a.contains === 'string') push('contains', a.contains, extracted_value, typeof extracted_value === 'string' && extracted_value.includes(a.contains));
  if (typeof a.matches === 'string') { const re = new RegExp(a.matches); push('matches', a.matches, extracted_value, typeof extracted_value === 'string' && re.test(extracted_value)); }
  if (typeof a.non_empty === 'boolean') { const ne = extracted_value !== null && extracted_value.trim() !== ''; push('non_empty', a.non_empty, ne, ne === a.non_empty); }
  // No explicit assertions → implicit "element exists".
  if (assertions.length === 0) push('exists', true, matched_count > 0, matched_count > 0);

  const passed = assertions.every((x) => x.pass);
  return { name: t.name, selector: t.selector, extraction_mode, matched_count, extracted_value, sample_values, assertions, error: null, passed };
}

function build(html: string, tests: TestSpec[]): SuiteCore {
  const $ = cheerio.load(html);
  const results = tests.map((t) => runTest($, t));
  const passed_count = results.filter((r) => r.passed).length;
  const failed_count = results.length - passed_count;
  const score = round((passed_count / results.length) * 100, 1);
  return {
    test_count: results.length, passed_count, failed_count, all_passed: failed_count === 0,
    score, grade: gradeOf(score), results,
  };
}

const CHAIN_TO = [
  { api: 'scrape-data-pipeline-validator', reason: 'Validate the records these selectors extract against an expected schema across many pages.' },
  { api: 'website-structure-mapper', reason: 'Map the site’s navigation graph to discover the pages these selectors should run against.' },
];
const INVALIDATORS = [
  'Tests run only against the supplied HTML snapshot — they prove a selector works on this capture, not on the live (possibly changed) page.',
  'HTML is parsed leniently by cheerio (like a browser): malformed markup is auto-corrected, so a selector may match more/less than a strict parser would.',
  'Text extraction uses the concatenated text of all descendants, trimmed; attribute extraction reads the first matched element’s attribute (null if absent).',
  'Regex assertions are safety-bounded: patterns over 300 chars or with nested unbounded quantifiers (e.g. (a+)+) are rejected before evaluation.',
];

function actions(r: SuiteCore): string[] {
  const out = [`${r.passed_count}/${r.test_count} test(s) passed — score ${r.score}/100 (${r.grade}), ${r.all_passed ? 'ALL PASSED' : 'FAILURES PRESENT'}.`];
  const failing = r.results.filter((x) => !x.passed);
  const invalidSel = failing.filter((x) => x.error).map((x) => x.name);
  if (invalidSel.length) out.push(`Invalid selector(s): ${invalidSel.join(', ')} — fix the CSS syntax.`);
  const zeroMatch = failing.filter((x) => !x.error && x.matched_count === 0).map((x) => x.name);
  if (zeroMatch.length) out.push(`Selector(s) matched nothing (likely changed markup): ${zeroMatch.join(', ')}.`);
  const assertFail = failing.filter((x) => !x.error && x.matched_count > 0).map((x) => x.name);
  if (assertFail.length) out.push(`Assertion failure(s) on matched elements: ${assertFail.join(', ')} — compare expected vs actual.`);
  return out;
}

const TAIL = (r: SuiteCore) => ({
  confidence_score: 1, confidence_per_section: { extraction: 1, assertions: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Scraper Test Suite & Validator API', version: '1.0.0',
    description: 'Deterministic scraper test suite. Parses a supplied HTML snapshot with a real HTML parser (cheerio) and runs selector assertions (exists/count/equals/contains/matches/non_empty, optionally on an attribute), returning per-test pass/fail, extracted values, score and grade. No fetching, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/scraper-test-suite/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/run', summary: 'Run selector assertions against sample HTML', price_usdc: 0.008 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL run + reasoning', price_usdc: 0.014 },
    ],
    pricing: [
      { path: '/run', price_usdc: 0.008, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/run', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = build(p.html, p.tests);
  respond(res, t0, { ...r, ...TAIL(r) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const r = build(p.html, p.tests);
  respond(res, t0, {
    ...r,
    reasoning: {
      why_result_generated: `Ran ${r.test_count} selector test(s) against the supplied HTML: ${r.passed_count} passed, ${r.failed_count} failed (score ${r.score}/100).`,
      key_factors: [
        `Result: ${r.all_passed ? 'ALL PASSED' : 'FAILURES PRESENT'} (grade ${r.grade}).`,
        `Failing test(s): ${r.results.filter((x) => !x.passed).map((x) => x.name).join(', ') || 'none'}.`,
        `Selector error(s): ${r.results.filter((x) => x.error).map((x) => x.name).join(', ') || 'none'}.`,
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
import { runExample, lookupExample } from './examples';

const ASSERT_TYPE_ENUM = ['exists', 'count', 'min_count', 'max_count', 'equals', 'contains', 'matches', 'non_empty'];
const Scalar = { type: ['string', 'number', 'boolean', 'null'] };

const AssertSpec = {
  type: 'object', additionalProperties: false,
  description: 'Assertions for one selector. Any subset; with none provided, an implicit exists=true is checked.',
  properties: {
    exists: { type: 'boolean', description: 'Whether the selector should match ≥1 element.' },
    count: { type: 'integer', minimum: 0, description: 'Exact match count.' },
    min_count: { type: 'integer', minimum: 0 },
    max_count: { type: 'integer', minimum: 0 },
    equals: { type: 'string', description: 'Extracted value must equal this exactly.' },
    contains: { type: 'string', description: 'Extracted value must contain this substring.' },
    matches: { type: 'string', description: 'Extracted value must match this regex (≤300 chars, no nested unbounded quantifiers).' },
    attr: { type: 'string', description: 'Extract this attribute of the first match instead of its text.' },
    non_empty: { type: 'boolean', description: 'Whether the extracted value must be non-empty.' },
  },
};
const TestSpec = {
  type: 'object', required: ['name', 'selector'], additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Unique test name.' },
    selector: { type: 'string', description: 'CSS selector to evaluate.' },
    assert: AssertSpec,
  },
};
const RunRequest = {
  type: 'object', required: ['html', 'tests'], additionalProperties: false,
  properties: {
    html: { type: 'string', description: 'HTML snapshot to test against (≤1,000,000 chars).' },
    tests: { type: 'array', minItems: 1, items: TestSpec, description: 'Selector tests with assertions.' },
  },
};

const AssertionResult = {
  type: 'object', required: ['type', 'expected', 'actual', 'pass'], additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ASSERT_TYPE_ENUM },
    expected: Scalar,
    actual: Scalar,
    pass: { type: 'boolean' },
  },
};
const TestResult = {
  type: 'object', required: ['name', 'selector', 'extraction_mode', 'matched_count', 'extracted_value', 'sample_values', 'assertions', 'error', 'passed'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    selector: { type: 'string' },
    extraction_mode: { type: 'string', description: '"text" or "attr:<name>".' },
    matched_count: { type: 'integer', minimum: 0 },
    extracted_value: { type: ['string', 'null'], description: 'Value from the first matched element (text or attribute).' },
    sample_values: { type: 'array', items: { type: ['string', 'null'] }, description: 'Up to 50 extracted values.' },
    assertions: { type: 'array', items: AssertionResult },
    error: { type: ['string', 'null'], description: 'Non-null when the selector itself is invalid.' },
    passed: { type: 'boolean' },
  },
};
const SuiteCore = {
  type: 'object', required: ['test_count', 'passed_count', 'failed_count', 'all_passed', 'score', 'grade', 'results'],
  properties: {
    test_count: { type: 'integer', minimum: 0 },
    passed_count: { type: 'integer', minimum: 0 },
    failed_count: { type: 'integer', minimum: 0 },
    all_passed: { type: 'boolean' },
    score: { type: 'number', minimum: 0, maximum: 100 },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    results: { type: 'array', items: TestResult },
  },
};

const reqEx = {
  html: '<html><body><h1 class="title">Hello World</h1><a class="nav" href="/about">About</a><a class="nav" href="/contact">Contact</a><p class="price">$19.99</p></body></html>',
  tests: [
    { name: 'title_text', selector: 'h1.title', assert: { exists: true, count: 1, equals: 'Hello World' } },
    { name: 'nav_links', selector: 'a.nav', assert: { min_count: 2, attr: 'href', non_empty: true } },
    { name: 'price_format', selector: 'p.price', assert: { matches: '^\\$\\d+\\.\\d{2}$' } },
    { name: 'no_banner', selector: '.promo-banner', assert: { exists: false } },
  ],
};
const disc = {
  name: 'Web Scraper Test Suite & Validator API', version: '1.0.0',
  description: 'Deterministic scraper test suite. Parses a supplied HTML snapshot with a real HTML parser (cheerio) and runs selector assertions (exists/count/equals/contains/matches/non_empty, optionally on an attribute), returning per-test pass/fail, extracted values, score and grade. No fetching, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/scraper-test-suite/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/run', summary: 'Run selector assertions against sample HTML', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL run + reasoning', price_usdc: 0.014 },
  ],
  pricing: [
    { path: '/run', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('extraction', 'assertions'), _Tail: Tail,
  AssertSpec, TestSpec, RunRequest, AssertionResult, TestResult, SuiteCore, DiscoveryResponse: discoverySchema(),
  RunResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SuiteCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SuiteCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/run', summary: 'Run selector assertions against sample HTML', operationId: 'run', priceUsdc: 0.008,
    requestSchemaRef: 'RunRequest', responseSchemaRef: 'RunResponse', requestExample: reqEx,
    responseExample: runExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL run + reasoning', operationId: 'lookup', priceUsdc: 0.014, oneCall: true,
    requestSchemaRef: 'RunRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'scraper-test-suite', title: 'Web Scraper Test Suite & Validator API', version: '1.0.0',
  description: 'Deterministic scraper test suite — sample HTML + selector assertions → per-test pass/fail, extracted values, score and grade (cheerio-parsed). No fetching, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /scraper-test-suite/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Web Scraper Test Suite & Validator API",
    "version": "1.0.0",
    "description": "Deterministic scraper test suite — sample HTML + selector assertions → per-test pass/fail, extracted values, score and grade (cheerio-parsed). No fetching, no LLM.",
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
      "url": "https://orbis-apis.onrender.com/scraper-test-suite"
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
                  "name": "Web Scraper Test Suite & Validator API",
                  "version": "1.0.0",
                  "description": "Deterministic scraper test suite. Parses a supplied HTML snapshot with a real HTML parser (cheerio) and runs selector assertions (exists/count/equals/contains/matches/non_empty, optionally on an attribute), returning per-test pass/fail, extracted values, score and grade. No fetching, no LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/scraper-test-suite/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/run",
                      "summary": "Run selector assertions against sample HTML",
                      "price_usdc": 0.008
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL run + reasoning",
                      "price_usdc": 0.014
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/run",
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
    "/run": {
      "post": {
        "operationId": "run",
        "summary": "Run selector assertions against sample HTML",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RunResponse"
                },
                "example": {
                  "trace_id": "sts-1780000000000",
                  "request_id": "sts-1780000000000",
                  "computed_at": "2026-06-15T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "test_count": 4,
                  "passed_count": 4,
                  "failed_count": 0,
                  "all_passed": true,
                  "score": 100,
                  "grade": "A",
                  "results": [
                    {
                      "name": "title_text",
                      "selector": "h1.title",
                      "extraction_mode": "text",
                      "matched_count": 1,
                      "extracted_value": "Hello World",
                      "sample_values": [
                        "Hello World"
                      ],
                      "assertions": [
                        {
                          "type": "exists",
                          "expected": true,
                          "actual": true,
                          "pass": true
                        },
                        {
                          "type": "count",
                          "expected": 1,
                          "actual": 1,
                          "pass": true
                        },
                        {
                          "type": "equals",
                          "expected": "Hello World",
                          "actual": "Hello World",
                          "pass": true
                        }
                      ],
                      "error": null,
                      "passed": true
                    },
                    {
                      "name": "nav_links",
                      "selector": "a.nav",
                      "extraction_mode": "attr:href",
                      "matched_count": 2,
                      "extracted_value": "/about",
                      "sample_values": [
                        "/about",
                        "/contact"
                      ],
                      "assertions": [
                        {
                          "type": "min_count",
                          "expected": 2,
                          "actual": 2,
                          "pass": true
                        },
                        {
                          "type": "non_empty",
                          "expected": true,
                          "actual": true,
                          "pass": true
                        }
                      ],
                      "error": null,
                      "passed": true
                    },
                    {
                      "name": "price_format",
                      "selector": "p.price",
                      "extraction_mode": "text",
                      "matched_count": 1,
                      "extracted_value": "$19.99",
                      "sample_values": [
                        "$19.99"
                      ],
                      "assertions": [
                        {
                          "type": "matches",
                          "expected": "^\\$\\d+\\.\\d{2}$",
                          "actual": "$19.99",
                          "pass": true
                        }
                      ],
                      "error": null,
                      "passed": true
                    },
                    {
                      "name": "no_banner",
                      "selector": ".promo-banner",
                      "extraction_mode": "text",
                      "matched_count": 0,
                      "extracted_value": null,
                      "sample_values": [],
                      "assertions": [
                        {
                          "type": "exists",
                          "expected": false,
                          "actual": false,
                          "pass": true
                        }
                      ],
                      "error": null,
                      "passed": true
                    }
                  ],
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "extraction": 1,
                    "assertions": 1
                  },
                  "recommended_actions_priority_order": [
                    "4/4 test(s) passed — score 100/100 (A), ALL PASSED."
                  ],
                  "chain_to": [
                    {
                      "api": "scrape-data-pipeline-validator",
                      "reason": "Validate the records these selectors extract against an expected schema across many pages."
                    },
                    {
                      "api": "website-structure-mapper",
                      "reason": "Map the site’s navigation graph to discover the pages these selectors should run against."
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
                "$ref": "#/components/schemas/RunRequest"
              },
              "example": {
                "html": "<html><body><h1 class=\"title\">Hello World</h1><a class=\"nav\" href=\"/about\">About</a><a class=\"nav\" href=\"/contact\">Contact</a><p class=\"price\">$19.99</p></body></html>",
                "tests": [
                  {
                    "name": "title_text",
                    "selector": "h1.title",
                    "assert": {
                      "exists": true,
                      "count": 1,
                      "equals": "Hello World"
                    }
                  },
                  {
                    "name": "nav_links",
                    "selector": "a.nav",
                    "assert": {
                      "min_count": 2,
                      "attr": "href",
                      "non_empty": true
                    }
                  },
                  {
                    "name": "price_format",
                    "selector": "p.price",
                    "assert": {
                      "matches": "^\\$\\d+\\.\\d{2}$"
                    }
                  },
                  {
                    "name": "no_banner",
                    "selector": ".promo-banner",
                    "assert": {
                      "exists": false
                    }
                  }
                ]
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
        "summary": "ONE-CALL run + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "sts-1780000000000",
                  "request_id": "sts-1780000000000",
                  "computed_at": "2026-06-15T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "test_count": 4,
                  "passed_count": 4,
                  "failed_count": 0,
                  "all_passed": true,
                  "score": 100,
                  "grade": "A",
                  "results": [
                    {
                      "name": "title_text",
                      "selector": "h1.title",
                      "extraction_mode": "text",
                      "matched_count": 1,
                      "extracted_value": "Hello World",
                      "sample_values": [
                        "Hello World"
                      ],
                      "assertions": [
                        {
                          "type": "exists",
                          "expected": true,
                          "actual": true,
                          "pass": true
                        },
                        {
                          "type": "count",
                          "expected": 1,
                          "actual": 1,
                          "pass": true
                        },
                        {
                          "type": "equals",
                          "expected": "Hello World",
                          "actual": "Hello World",
                          "pass": true
                        }
                      ],
                      "error": null,
                      "passed": true
                    },
                    {
                      "name": "nav_links",
                      "selector": "a.nav",
                      "extraction_mode": "attr:href",
                      "matched_count": 2,
                      "extracted_value": "/about",
                      "sample_values": [
                        "/about",
                        "/contact"
                      ],
                      "assertions": [
                        {
                          "type": "min_count",
                          "expected": 2,
                          "actual": 2,
                          "pass": true
                        },
                        {
                          "type": "non_empty",
                          "expected": true,
                          "actual": true,
                          "pass": true
                        }
                      ],
                      "error": null,
                      "passed": true
                    },
                    {
                      "name": "price_format",
                      "selector": "p.price",
                      "extraction_mode": "text",
                      "matched_count": 1,
                      "extracted_value": "$19.99",
                      "sample_values": [
                        "$19.99"
                      ],
                      "assertions": [
                        {
                          "type": "matches",
                          "expected": "^\\$\\d+\\.\\d{2}$",
                          "actual": "$19.99",
                          "pass": true
                        }
                      ],
                      "error": null,
                      "passed": true
                    },
                    {
                      "name": "no_banner",
                      "selector": ".promo-banner",
                      "extraction_mode": "text",
                      "matched_count": 0,
                      "extracted_value": null,
                      "sample_values": [],
                      "assertions": [
                        {
                          "type": "exists",
                          "expected": false,
                          "actual": false,
                          "pass": true
                        }
                      ],
                      "error": null,
                      "passed": true
                    }
                  ],
                  "reasoning": {
                    "why_result_generated": "Ran 4 selector test(s) against the supplied HTML: 4 passed, 0 failed (score 100/100).",
                    "key_factors": [
                      "Result: ALL PASSED (grade A).",
                      "Failing test(s): none.",
                      "Selector error(s): none."
                    ],
                    "invalidators": [
                      "Tests run only against the supplied HTML snapshot — they prove a selector works on this capture, not on the live (possibly changed) page.",
                      "HTML is parsed leniently by cheerio (like a browser): malformed markup is auto-corrected, so a selector may match more/less than a strict parser would.",
                      "Text extraction uses the concatenated text of all descendants, trimmed; attribute extraction reads the first matched element’s attribute (null if absent).",
                      "Regex assertions are safety-bounded: patterns over 300 chars or with nested unbounded quantifiers (e.g. (a+)+) are rejected before evaluation."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "extraction": 1,
                    "assertions": 1
                  },
                  "recommended_actions_priority_order": [
                    "4/4 test(s) passed — score 100/100 (A), ALL PASSED."
                  ],
                  "chain_to": [
                    {
                      "api": "scrape-data-pipeline-validator",
                      "reason": "Validate the records these selectors extract against an expected schema across many pages."
                    },
                    {
                      "api": "website-structure-mapper",
                      "reason": "Map the site’s navigation graph to discover the pages these selectors should run against."
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
                "$ref": "#/components/schemas/RunRequest"
              },
              "example": {
                "html": "<html><body><h1 class=\"title\">Hello World</h1><a class=\"nav\" href=\"/about\">About</a><a class=\"nav\" href=\"/contact\">Contact</a><p class=\"price\">$19.99</p></body></html>",
                "tests": [
                  {
                    "name": "title_text",
                    "selector": "h1.title",
                    "assert": {
                      "exists": true,
                      "count": 1,
                      "equals": "Hello World"
                    }
                  },
                  {
                    "name": "nav_links",
                    "selector": "a.nav",
                    "assert": {
                      "min_count": 2,
                      "attr": "href",
                      "non_empty": true
                    }
                  },
                  {
                    "name": "price_format",
                    "selector": "p.price",
                    "assert": {
                      "matches": "^\\$\\d+\\.\\d{2}$"
                    }
                  },
                  {
                    "name": "no_banner",
                    "selector": ".promo-banner",
                    "assert": {
                      "exists": false
                    }
                  }
                ]
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
          "extraction": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "assertions": {
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
      "AssertSpec": {
        "type": "object",
        "additionalProperties": false,
        "description": "Assertions for one selector. Any subset; with none provided, an implicit exists=true is checked.",
        "properties": {
          "exists": {
            "type": "boolean",
            "description": "Whether the selector should match ≥1 element."
          },
          "count": {
            "type": "integer",
            "minimum": 0,
            "description": "Exact match count."
          },
          "min_count": {
            "type": "integer",
            "minimum": 0
          },
          "max_count": {
            "type": "integer",
            "minimum": 0
          },
          "equals": {
            "type": "string",
            "description": "Extracted value must equal this exactly."
          },
          "contains": {
            "type": "string",
            "description": "Extracted value must contain this substring."
          },
          "matches": {
            "type": "string",
            "description": "Extracted value must match this regex (≤300 chars, no nested unbounded quantifiers)."
          },
          "attr": {
            "type": "string",
            "description": "Extract this attribute of the first match instead of its text."
          },
          "non_empty": {
            "type": "boolean",
            "description": "Whether the extracted value must be non-empty."
          }
        }
      },
      "TestSpec": {
        "type": "object",
        "required": [
          "name",
          "selector"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "description": "Unique test name."
          },
          "selector": {
            "type": "string",
            "description": "CSS selector to evaluate."
          },
          "assert": {
            "type": "object",
            "additionalProperties": false,
            "description": "Assertions for one selector. Any subset; with none provided, an implicit exists=true is checked.",
            "properties": {
              "exists": {
                "type": "boolean",
                "description": "Whether the selector should match ≥1 element."
              },
              "count": {
                "type": "integer",
                "minimum": 0,
                "description": "Exact match count."
              },
              "min_count": {
                "type": "integer",
                "minimum": 0
              },
              "max_count": {
                "type": "integer",
                "minimum": 0
              },
              "equals": {
                "type": "string",
                "description": "Extracted value must equal this exactly."
              },
              "contains": {
                "type": "string",
                "description": "Extracted value must contain this substring."
              },
              "matches": {
                "type": "string",
                "description": "Extracted value must match this regex (≤300 chars, no nested unbounded quantifiers)."
              },
              "attr": {
                "type": "string",
                "description": "Extract this attribute of the first match instead of its text."
              },
              "non_empty": {
                "type": "boolean",
                "description": "Whether the extracted value must be non-empty."
              }
            }
          }
        }
      },
      "RunRequest": {
        "type": "object",
        "required": [
          "html",
          "tests"
        ],
        "additionalProperties": false,
        "properties": {
          "html": {
            "type": "string",
            "description": "HTML snapshot to test against (≤1,000,000 chars)."
          },
          "tests": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": [
                "name",
                "selector"
              ],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string",
                  "description": "Unique test name."
                },
                "selector": {
                  "type": "string",
                  "description": "CSS selector to evaluate."
                },
                "assert": {
                  "type": "object",
                  "additionalProperties": false,
                  "description": "Assertions for one selector. Any subset; with none provided, an implicit exists=true is checked.",
                  "properties": {
                    "exists": {
                      "type": "boolean",
                      "description": "Whether the selector should match ≥1 element."
                    },
                    "count": {
                      "type": "integer",
                      "minimum": 0,
                      "description": "Exact match count."
                    },
                    "min_count": {
                      "type": "integer",
                      "minimum": 0
                    },
                    "max_count": {
                      "type": "integer",
                      "minimum": 0
                    },
                    "equals": {
                      "type": "string",
                      "description": "Extracted value must equal this exactly."
                    },
                    "contains": {
                      "type": "string",
                      "description": "Extracted value must contain this substring."
                    },
                    "matches": {
                      "type": "string",
                      "description": "Extracted value must match this regex (≤300 chars, no nested unbounded quantifiers)."
                    },
                    "attr": {
                      "type": "string",
                      "description": "Extract this attribute of the first match instead of its text."
                    },
                    "non_empty": {
                      "type": "boolean",
                      "description": "Whether the extracted value must be non-empty."
                    }
                  }
                }
              }
            },
            "description": "Selector tests with assertions."
          }
        }
      },
      "AssertionResult": {
        "type": "object",
        "required": [
          "type",
          "expected",
          "actual",
          "pass"
        ],
        "additionalProperties": false,
        "properties": {
          "type": {
            "type": "string",
            "enum": [
              "exists",
              "count",
              "min_count",
              "max_count",
              "equals",
              "contains",
              "matches",
              "non_empty"
            ]
          },
          "expected": {
            "type": [
              "string",
              "number",
              "boolean",
              "null"
            ]
          },
          "actual": {
            "type": [
              "string",
              "number",
              "boolean",
              "null"
            ]
          },
          "pass": {
            "type": "boolean"
          }
        }
      },
      "TestResult": {
        "type": "object",
        "required": [
          "name",
          "selector",
          "extraction_mode",
          "matched_count",
          "extracted_value",
          "sample_values",
          "assertions",
          "error",
          "passed"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "selector": {
            "type": "string"
          },
          "extraction_mode": {
            "type": "string",
            "description": "\"text\" or \"attr:<name>\"."
          },
          "matched_count": {
            "type": "integer",
            "minimum": 0
          },
          "extracted_value": {
            "type": [
              "string",
              "null"
            ],
            "description": "Value from the first matched element (text or attribute)."
          },
          "sample_values": {
            "type": "array",
            "items": {
              "type": [
                "string",
                "null"
              ]
            },
            "description": "Up to 50 extracted values."
          },
          "assertions": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "type",
                "expected",
                "actual",
                "pass"
              ],
              "additionalProperties": false,
              "properties": {
                "type": {
                  "type": "string",
                  "enum": [
                    "exists",
                    "count",
                    "min_count",
                    "max_count",
                    "equals",
                    "contains",
                    "matches",
                    "non_empty"
                  ]
                },
                "expected": {
                  "type": [
                    "string",
                    "number",
                    "boolean",
                    "null"
                  ]
                },
                "actual": {
                  "type": [
                    "string",
                    "number",
                    "boolean",
                    "null"
                  ]
                },
                "pass": {
                  "type": "boolean"
                }
              }
            }
          },
          "error": {
            "type": [
              "string",
              "null"
            ],
            "description": "Non-null when the selector itself is invalid."
          },
          "passed": {
            "type": "boolean"
          }
        }
      },
      "SuiteCore": {
        "type": "object",
        "required": [
          "test_count",
          "passed_count",
          "failed_count",
          "all_passed",
          "score",
          "grade",
          "results"
        ],
        "properties": {
          "test_count": {
            "type": "integer",
            "minimum": 0
          },
          "passed_count": {
            "type": "integer",
            "minimum": 0
          },
          "failed_count": {
            "type": "integer",
            "minimum": 0
          },
          "all_passed": {
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
          },
          "results": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name",
                "selector",
                "extraction_mode",
                "matched_count",
                "extracted_value",
                "sample_values",
                "assertions",
                "error",
                "passed"
              ],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string"
                },
                "selector": {
                  "type": "string"
                },
                "extraction_mode": {
                  "type": "string",
                  "description": "\"text\" or \"attr:<name>\"."
                },
                "matched_count": {
                  "type": "integer",
                  "minimum": 0
                },
                "extracted_value": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "description": "Value from the first matched element (text or attribute)."
                },
                "sample_values": {
                  "type": "array",
                  "items": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "description": "Up to 50 extracted values."
                },
                "assertions": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": [
                      "type",
                      "expected",
                      "actual",
                      "pass"
                    ],
                    "additionalProperties": false,
                    "properties": {
                      "type": {
                        "type": "string",
                        "enum": [
                          "exists",
                          "count",
                          "min_count",
                          "max_count",
                          "equals",
                          "contains",
                          "matches",
                          "non_empty"
                        ]
                      },
                      "expected": {
                        "type": [
                          "string",
                          "number",
                          "boolean",
                          "null"
                        ]
                      },
                      "actual": {
                        "type": [
                          "string",
                          "number",
                          "boolean",
                          "null"
                        ]
                      },
                      "pass": {
                        "type": "boolean"
                      }
                    }
                  }
                },
                "error": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "description": "Non-null when the selector itself is invalid."
                },
                "passed": {
                  "type": "boolean"
                }
              }
            }
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
      "RunResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/SuiteCore"
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
            "$ref": "#/components/schemas/SuiteCore"
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
### POST /run (mix: pass + assertion-fail + zero-match + invalid-selector graceful)
Request:
```json
{
  "html": "<html><body><h1 class=\"title\">Hello</h1><a class=\"nav\" href=\"/a\">A</a><a class=\"nav\" href=\"/b\">B</a><span class=\"qty\">3</span></body></html>",
  "tests": [
    {
      "name": "title_ok",
      "selector": "h1.title",
      "assert": {
        "exists": true,
        "equals": "Hello"
      }
    },
    {
      "name": "title_wrong",
      "selector": "h1.title",
      "assert": {
        "equals": "Goodbye"
      }
    },
    {
      "name": "nav_attr",
      "selector": "a.nav",
      "assert": {
        "min_count": 2,
        "attr": "href",
        "non_empty": true
      }
    },
    {
      "name": "missing_elem",
      "selector": ".price",
      "assert": {
        "exists": true
      }
    },
    {
      "name": "bad_selector",
      "selector": "div[unclosed",
      "assert": {
        "exists": true
      }
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "6qpf78x7-1781567165541",
  "request_id": "6qpf78x7-1781567165541",
  "computed_at": "2026-06-15T23:46:05.541Z",
  "success": true,
  "latency_ms": 43,
  "test_count": 5,
  "passed_count": 2,
  "failed_count": 3,
  "all_passed": false,
  "score": 40,
  "grade": "F",
  "results": [
    {
      "name": "title_ok",
      "selector": "h1.title",
      "extraction_mode": "text",
      "matched_count": 1,
      "extracted_value": "Hello",
      "sample_values": [
        "Hello"
      ],
      "assertions": [
        {
          "type": "exists",
          "expected": true,
          "actual": true,
          "pass": true
        },
        {
          "type": "equals",
          "expected": "Hello",
          "actual": "Hello",
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    },
    {
      "name": "title_wrong",
      "selector": "h1.title",
      "extraction_mode": "text",
      "matched_count": 1,
      "extracted_value": "Hello",
      "sample_values": [
        "Hello"
      ],
      "assertions": [
        {
          "type": "equals",
          "expected": "Goodbye",
          "actual": "Hello",
          "pass": false
        }
      ],
      "error": null,
      "passed": false
    },
    {
      "name": "nav_attr",
      "selector": "a.nav",
      "extraction_mode": "attr:href",
      "matched_count": 2,
      "extracted_value": "/a",
      "sample_values": [
        "/a",
        "/b"
      ],
      "assertions": [
        {
          "type": "min_count",
          "expected": 2,
          "actual": 2,
          "pass": true
        },
        {
          "type": "non_empty",
          "expected": true,
          "actual": true,
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    },
    {
      "name": "missing_elem",
      "selector": ".price",
      "extraction_mode": "text",
      "matched_count": 0,
      "extracted_value": null,
      "sample_values": [],
      "assertions": [
        {
          "type": "exists",
          "expected": true,
          "actual": false,
          "pass": false
        }
      ],
      "error": null,
      "passed": false
    },
    {
      "name": "bad_selector",
      "selector": "div[unclosed",
      "extraction_mode": "text",
      "matched_count": 0,
      "extracted_value": null,
      "sample_values": [],
      "assertions": [],
      "error": "invalid_selector: Attribute selector didn't terminate",
      "passed": false
    }
  ],
  "confidence_score": 1,
  "confidence_per_section": {
    "extraction": 1,
    "assertions": 1
  },
  "recommended_actions_priority_order": [
    "2/5 test(s) passed — score 40/100 (F), FAILURES PRESENT.",
    "Invalid selector(s): bad_selector — fix the CSS syntax.",
    "Selector(s) matched nothing (likely changed markup): missing_elem.",
    "Assertion failure(s) on matched elements: title_wrong — compare expected vs actual."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the records these selectors extract against an expected schema across many pages."
    },
    {
      "api": "website-structure-mapper",
      "reason": "Map the site’s navigation graph to discover the pages these selectors should run against."
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

### POST /lookup (all pass: equals + attr + regex + exists:false)
Request:
```json
{
  "html": "<html><body><h1 class=\"title\">Hello World</h1><a class=\"nav\" href=\"/about\">About</a><a class=\"nav\" href=\"/contact\">Contact</a><p class=\"price\">$19.99</p></body></html>",
  "tests": [
    {
      "name": "title_text",
      "selector": "h1.title",
      "assert": {
        "exists": true,
        "count": 1,
        "equals": "Hello World"
      }
    },
    {
      "name": "nav_links",
      "selector": "a.nav",
      "assert": {
        "min_count": 2,
        "attr": "href",
        "non_empty": true
      }
    },
    {
      "name": "price_format",
      "selector": "p.price",
      "assert": {
        "matches": "^\\$\\d+\\.\\d{2}$"
      }
    },
    {
      "name": "no_banner",
      "selector": ".promo-banner",
      "assert": {
        "exists": false
      }
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "md0pj1hk-1781567165553",
  "request_id": "md0pj1hk-1781567165553",
  "computed_at": "2026-06-15T23:46:05.553Z",
  "success": true,
  "latency_ms": 6,
  "test_count": 4,
  "passed_count": 4,
  "failed_count": 0,
  "all_passed": true,
  "score": 100,
  "grade": "A",
  "results": [
    {
      "name": "title_text",
      "selector": "h1.title",
      "extraction_mode": "text",
      "matched_count": 1,
      "extracted_value": "Hello World",
      "sample_values": [
        "Hello World"
      ],
      "assertions": [
        {
          "type": "exists",
          "expected": true,
          "actual": true,
          "pass": true
        },
        {
          "type": "count",
          "expected": 1,
          "actual": 1,
          "pass": true
        },
        {
          "type": "equals",
          "expected": "Hello World",
          "actual": "Hello World",
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    },
    {
      "name": "nav_links",
      "selector": "a.nav",
      "extraction_mode": "attr:href",
      "matched_count": 2,
      "extracted_value": "/about",
      "sample_values": [
        "/about",
        "/contact"
      ],
      "assertions": [
        {
          "type": "min_count",
          "expected": 2,
          "actual": 2,
          "pass": true
        },
        {
          "type": "non_empty",
          "expected": true,
          "actual": true,
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    },
    {
      "name": "price_format",
      "selector": "p.price",
      "extraction_mode": "text",
      "matched_count": 1,
      "extracted_value": "$19.99",
      "sample_values": [
        "$19.99"
      ],
      "assertions": [
        {
          "type": "matches",
          "expected": "^\\$\\d+\\.\\d{2}$",
          "actual": "$19.99",
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    },
    {
      "name": "no_banner",
      "selector": ".promo-banner",
      "extraction_mode": "text",
      "matched_count": 0,
      "extracted_value": null,
      "sample_values": [],
      "assertions": [
        {
          "type": "exists",
          "expected": false,
          "actual": false,
          "pass": true
        }
      ],
      "error": null,
      "passed": true
    }
  ],
  "reasoning": {
    "why_result_generated": "Ran 4 selector test(s) against the supplied HTML: 4 passed, 0 failed (score 100/100).",
    "key_factors": [
      "Result: ALL PASSED (grade A).",
      "Failing test(s): none.",
      "Selector error(s): none."
    ],
    "invalidators": [
      "Tests run only against the supplied HTML snapshot — they prove a selector works on this capture, not on the live (possibly changed) page.",
      "HTML is parsed leniently by cheerio (like a browser): malformed markup is auto-corrected, so a selector may match more/less than a strict parser would.",
      "Text extraction uses the concatenated text of all descendants, trimmed; attribute extraction reads the first matched element’s attribute (null if absent).",
      "Regex assertions are safety-bounded: patterns over 300 chars or with nested unbounded quantifiers (e.g. (a+)+) are rejected before evaluation."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "extraction": 1,
    "assertions": 1
  },
  "recommended_actions_priority_order": [
    "4/4 test(s) passed — score 100/100 (A), ALL PASSED."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Validate the records these selectors extract against an expected schema across many pages."
    },
    {
      "api": "website-structure-mapper",
      "reason": "Map the site’s navigation graph to discover the pages these selectors should run against."
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

### POST /run (ReDoS guard: nested unbounded quantifier rejected → 400)
Request:
```json
{
  "html": "<p>x</p>",
  "tests": [
    {
      "name": "redos",
      "selector": "p",
      "assert": {
        "matches": "(a+)+"
      }
    }
  ]
}
```
Response (HTTP 400):
```json
{
  "trace_id": "lsr6xlug-1781567165560",
  "request_id": "lsr6xlug-1781567165560",
  "computed_at": "2026-06-15T23:46:05.560Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "tests[0].assert.matches rejected: nested unbounded quantifiers risk catastrophic backtracking — simplify it."
  }
}
```

### POST /run (error: missing tests)
Request:
```json
{
  "html": "<a></a>"
}
```
Response (HTTP 400):
```json
{
  "trace_id": "ggu1g8wy-1781567165567",
  "request_id": "ggu1g8wy-1781567165567",
  "computed_at": "2026-06-15T23:46:05.567Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"tests\" must be a non-empty array of selector tests."
  }
}
```

---

# scraped-data-quality-scorer

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round, clamp } from '../../_aplus/util';
import { parseRows, columnsOf, isMissing, asNum, asKey, mean, gradeOf, Row } from '../../_aplus/dataset';

// Deterministic quality scorer for SCRAPED / EXTRACTED datasets. Unlike a generic
// pipeline scorer (which scores pipeline health) or a schema validator (which checks
// records against an expected schema), this scores the intrinsic quality of already-
// extracted data with scrape-specific dimensions: extraction completeness, duplicate
// extraction, HTML/whitespace noise, placeholder/boilerplate values, and per-column
// type consistency. Returns a 0–100 score, per-dimension subscores, per-field
// breakdown, and issues. No reference schema needed, no fetching, no LLM, nothing stored.

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}([T\s]\d{2}:\d{2}|$)/;

// Boilerplate / placeholder tokens commonly emitted by scrapers when a field is
// effectively empty (compared case-insensitively against the trimmed value).
const PLACEHOLDERS = new Set([
  'n/a', 'na', 'null', 'undefined', 'none', 'nil', '-', '--', '—', '–', '...', '…',
  'tbd', 'to be determined', 'unknown', 'no data', 'not available', 'not found',
  '#n/a', '#ref!', '#value!', '#name?', 'lorem ipsum',
]);
const HTML_ENTITY_RE = /&[a-zA-Z]+;|&#\d+;/;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/; // control chars, excluding tab/newline/CR

const WEIGHTS = { completeness: 0.30, uniqueness: 0.15, cleanliness: 0.20, placeholder_freedom: 0.20, consistency: 0.15 };

type ScrapeType = 'boolean' | 'number' | 'date' | 'string';
function valType(v: unknown): ScrapeType {
  if (typeof v === 'boolean' || v === 'true' || v === 'false') return 'boolean';
  if (asNum(v) !== null) return 'number'; // integers folded into number — scraped numerics mix freely
  if (typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v))) return 'date';
  return 'string';
}

function isPlaceholder(v: unknown): boolean {
  return typeof v === 'string' && PLACEHOLDERS.has(v.trim().toLowerCase());
}

interface NoiseFlags { untrimmed: boolean; html_entity: boolean; control_char: boolean; truncated: boolean; }
function noiseOf(v: unknown): NoiseFlags {
  if (typeof v !== 'string') return { untrimmed: false, html_entity: false, control_char: false, truncated: false };
  const trimmed = v.trim();
  return {
    untrimmed: trimmed !== '' && v !== trimmed,
    html_entity: HTML_ENTITY_RE.test(v),
    control_char: CONTROL_RE.test(v),
    truncated: trimmed.endsWith('…') || (trimmed.length >= 4 && trimmed.endsWith('...')),
  };
}
const anyNoise = (n: NoiseFlags) => n.untrimmed || n.html_entity || n.control_char || n.truncated;

export interface FieldReport {
  name: string;
  fill_rate: number;
  placeholder_rate: number;
  noise_rate: number;
  truncated_count: number;
  dominant_type: ScrapeType | null;
  type_consistency: number;
}
export interface Subscores {
  completeness: number; uniqueness: number; cleanliness: number; placeholder_freedom: number; consistency: number;
}
export interface ScoreCore {
  row_count: number; column_count: number; total_cells: number;
  duplicate_row_count: number;
  placeholder_cell_count: number; noise_cell_count: number; missing_cell_count: number;
  subscores: Subscores;
  score: number; grade: string;
  weights_used: typeof WEIGHTS;
  fields: FieldReport[];
  issues: string[];
}

function scoreRows(rows: Row[], columns: string[]): ScoreCore {
  const n = rows.length;
  const totalCells = n * columns.length;

  // Duplicate rows (exact match on the column projection, first occurrence kept).
  const seen = new Set<string>();
  let dupRows = 0;
  for (const r of rows) {
    const key = columns.map((c) => asKey(r[c])).join('');
    if (seen.has(key)) dupRows++; else seen.add(key);
  }

  let missingCells = 0, placeholderCells = 0, noiseCells = 0;
  const fields: FieldReport[] = [];

  for (const col of columns) {
    let present = 0, placeholder = 0, noise = 0, truncated = 0;
    const typeCounts = new Map<ScrapeType, number>();
    for (const r of rows) {
      const v = r[col];
      if (isMissing(v, true)) { missingCells++; continue; }
      present++;
      if (isPlaceholder(v)) { placeholder++; placeholderCells++; }
      const nf = noiseOf(v);
      if (anyNoise(nf)) { noise++; noiseCells++; }
      if (nf.truncated) truncated++;
      const t = valType(v);
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
    }
    let dominant: ScrapeType | null = null, domCount = 0;
    for (const [t, c] of typeCounts) if (c > domCount || (c === domCount && dominant !== null && t < dominant)) { dominant = t; domCount = c; }
    const typeConsistency = present > 0 ? round(domCount / present, 4) : 1;
    fields.push({
      name: col,
      fill_rate: round(present / n, 4),
      placeholder_rate: round(placeholder / n, 4),
      noise_rate: round(noise / n, 4),
      truncated_count: truncated,
      dominant_type: dominant,
      type_consistency: typeConsistency,
    });
  }

  const completeness = totalCells > 0 ? (totalCells - missingCells) / totalCells : 1;
  const uniqueness = n > 0 ? 1 - dupRows / n : 1;
  const cleanliness = totalCells > 0 ? 1 - noiseCells / totalCells : 1;
  const placeholderFreedom = totalCells > 0 ? 1 - placeholderCells / totalCells : 1;
  const consistency = columns.length > 0 ? mean(fields.map((f) => f.type_consistency)) : 1;

  const subscores: Subscores = {
    completeness: round(completeness, 4), uniqueness: round(uniqueness, 4),
    cleanliness: round(cleanliness, 4), placeholder_freedom: round(placeholderFreedom, 4),
    consistency: round(consistency, 4),
  };

  const score = round(clamp(
    (completeness * WEIGHTS.completeness + uniqueness * WEIGHTS.uniqueness + cleanliness * WEIGHTS.cleanliness +
     placeholderFreedom * WEIGHTS.placeholder_freedom + consistency * WEIGHTS.consistency) * 100, 0, 100), 1);

  const issues: string[] = [];
  if (dupRows > 0) issues.push(`${dupRows} duplicate row(s) (${(dupRows / n * 100).toFixed(1)}%) — likely double-extraction.`);
  for (const f of fields) {
    if (f.fill_rate < 0.9) issues.push(`Column "${f.name}": only ${(f.fill_rate * 100).toFixed(1)}% of rows populated.`);
    if (f.placeholder_rate > 0.1) issues.push(`Column "${f.name}": ${(f.placeholder_rate * 100).toFixed(1)}% placeholder/boilerplate values.`);
    if (f.noise_rate > 0.05) issues.push(`Column "${f.name}": ${(f.noise_rate * 100).toFixed(1)}% noisy values (whitespace/HTML entities/control chars/truncation).`);
    if (f.type_consistency < 0.9) issues.push(`Column "${f.name}": mixed value types (dominant ${f.dominant_type} only ${(f.type_consistency * 100).toFixed(1)}% consistent).`);
  }

  return {
    row_count: n, column_count: columns.length, total_cells: totalCells,
    duplicate_row_count: dupRows,
    placeholder_cell_count: placeholderCells, noise_cell_count: noiseCells, missing_cell_count: missingCells,
    subscores, score, grade: gradeOf(score), weights_used: WEIGHTS, fields, issues,
  };
}

function run(body: any): { error: string } | { result: ScoreCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "rows" array.' };
  const p = parseRows(body.rows, 'rows');
  if ('error' in p) return p;
  const columns = columnsOf(p.rows, body.columns);
  if (columns.length === 0) return { error: 'No columns found; rows have no keys and no "columns" were supplied.' };
  return { result: scoreRows(p.rows, columns) };
}

const CHAIN_TO = [
  { api: 'scrape-data-pipeline-validator', reason: 'Check these records against an explicit expected schema (presence/type/format) for pass/fail.' },
  { api: 'scrape-data-enricher', reason: 'Repair low-fill or placeholder fields with deterministic enrichment rules.' },
  { api: 'data-quality-rules', reason: 'Codify the quality thresholds found here as reusable not-null/range/regex rules.' },
];
const INVALIDATORS = [
  'This scores intrinsic, schema-free quality of already-extracted data; it does NOT compare against an expected schema (use scrape-data-pipeline-validator) or score pipeline health (use data-pipeline-quality-scorer).',
  'Placeholder detection matches a fixed token list (n/a, null, —, …, lorem ipsum, etc.); domain-specific sentinels (e.g. "0", "999") are NOT treated as placeholders.',
  'Noise = leading/trailing whitespace, HTML entities (&amp;), control characters, or truncation markers (…/...); decoded-but-wrong text cannot be detected.',
  'Type consistency folds integers into "number"; the overall score is a weighted blend (weights_used) — a heuristic, not a certified quality guarantee.',
];

function actions(r: ScoreCore): string[] {
  const out = [`Quality score ${r.score}/100 (${r.grade}) over ${r.row_count} row(s) × ${r.column_count} column(s).`];
  const lows = Object.entries(r.subscores).filter(([, v]) => v < 0.9).sort((a, b) => a[1] - b[1]).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`);
  if (lows.length) out.push(`Weakest dimension(s): ${lows.join(', ')}.`);
  if (r.duplicate_row_count > 0) out.push(`De-duplicate: ${r.duplicate_row_count} duplicate row(s) detected.`);
  if (r.issues.length) out.push(`${r.issues.length} field issue(s) flagged — see issues[].`);
  out.push('Chain to scrape-data-pipeline-validator to enforce an expected schema, or scrape-data-enricher to repair weak fields.');
  return out;
}

const TAIL = (r: ScoreCore) => ({
  confidence_score: 0.8, confidence_per_section: { measurement: 1, scoring: 0.8 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Scraped Data Quality Scorer API', version: '1.0.0',
    description: 'Deterministic quality scorer for scraped/extracted datasets. Scores extraction completeness, duplicate extraction, HTML/whitespace noise, placeholder/boilerplate values, and per-column type consistency into a 0–100 score with per-dimension subscores, per-field breakdown and issues. No reference schema, no fetching, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/scraped-data-quality-scorer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/score', summary: 'Score a scraped/extracted dataset', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL score + reasoning', price_usdc: 0.018 },
    ],
    pricing: [
      { path: '/score', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.018, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/score', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = run(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = run(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Scored ${v.row_count} row(s) × ${v.column_count} column(s): ${v.score}/100 (${v.grade}).`,
      key_factors: [
        `Subscores — completeness ${v.subscores.completeness}, uniqueness ${v.subscores.uniqueness}, cleanliness ${v.subscores.cleanliness}, placeholder_freedom ${v.subscores.placeholder_freedom}, consistency ${v.subscores.consistency}.`,
        `${v.missing_cell_count} missing, ${v.placeholder_cell_count} placeholder, ${v.noise_cell_count} noisy cell(s); ${v.duplicate_row_count} duplicate row(s).`,
        `Issues flagged: ${v.issues.length}.`,
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
import { scoreExample, lookupExample } from './examples';

const TYPE_ENUM = ['boolean', 'number', 'date', 'string'];
const unit = (description: string) => ({ type: 'number', minimum: 0, maximum: 1, description });

const FieldReport = {
  type: 'object', required: ['name', 'fill_rate', 'placeholder_rate', 'noise_rate', 'truncated_count', 'dominant_type', 'type_consistency'], additionalProperties: false,
  properties: {
    name: { type: 'string' },
    fill_rate: unit('Fraction of rows with a non-missing value.'),
    placeholder_rate: unit('Fraction of rows holding a placeholder/boilerplate token.'),
    noise_rate: unit('Fraction of rows with whitespace/HTML-entity/control-char/truncation noise.'),
    truncated_count: { type: 'integer', minimum: 0 },
    dominant_type: { type: ['string', 'null'], enum: [...TYPE_ENUM, null] },
    type_consistency: unit('Share of present values matching the dominant type.'),
  },
};
const Subscores = {
  type: 'object', required: ['completeness', 'uniqueness', 'cleanliness', 'placeholder_freedom', 'consistency'], additionalProperties: false,
  properties: {
    completeness: unit('Non-missing cell rate.'),
    uniqueness: unit('1 − duplicate-row rate.'),
    cleanliness: unit('1 − noisy-cell rate.'),
    placeholder_freedom: unit('1 − placeholder-cell rate.'),
    consistency: unit('Mean per-column dominant-type share.'),
  },
};
const Weights = {
  type: 'object', required: ['completeness', 'uniqueness', 'cleanliness', 'placeholder_freedom', 'consistency'], additionalProperties: false,
  properties: {
    completeness: { type: 'number' }, uniqueness: { type: 'number' }, cleanliness: { type: 'number' },
    placeholder_freedom: { type: 'number' }, consistency: { type: 'number' },
  },
};
const ScoreCore = {
  type: 'object',
  required: ['row_count', 'column_count', 'total_cells', 'duplicate_row_count', 'placeholder_cell_count', 'noise_cell_count', 'missing_cell_count', 'subscores', 'score', 'grade', 'weights_used', 'fields', 'issues'],
  properties: {
    row_count: { type: 'integer', minimum: 0 },
    column_count: { type: 'integer', minimum: 0 },
    total_cells: { type: 'integer', minimum: 0 },
    duplicate_row_count: { type: 'integer', minimum: 0 },
    placeholder_cell_count: { type: 'integer', minimum: 0 },
    noise_cell_count: { type: 'integer', minimum: 0 },
    missing_cell_count: { type: 'integer', minimum: 0 },
    subscores: Subscores,
    score: { type: 'number', minimum: 0, maximum: 100 },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    weights_used: Weights,
    fields: { type: 'array', items: FieldReport },
    issues: { type: 'array', items: { type: 'string' } },
  },
};
const ScoreRequest = {
  type: 'object', required: ['rows'], additionalProperties: false,
  properties: {
    rows: { type: 'array', minItems: 1, items: rowSchema('A scraped/extracted record (column → value).'), description: 'The scraped dataset to score.' },
    columns: { type: 'array', items: { type: 'string' }, description: 'Optional explicit column list; defaults to the union of row keys.' },
  },
};

const reqEx = {
  rows: [
    { title: 'Widget A', price: '$9.99', url: 'https://shop.com/a', stock: '12' },
    { title: 'Widget B ', price: 'N/A', url: 'https://shop.com/b', stock: '7' },
    { title: 'Tom &amp; Jerry', price: '$14.50', url: 'https://shop.com/c', stock: 'unknown' },
    { title: 'Widget A', price: '$9.99', url: 'https://shop.com/a', stock: '12' },
    { title: 'Long description that was cut o…', price: '', url: 'https://shop.com/e', stock: '3' },
  ],
};
const disc = {
  name: 'Scraped Data Quality Scorer API', version: '1.0.0',
  description: 'Deterministic quality scorer for scraped/extracted datasets. Scores extraction completeness, duplicate extraction, HTML/whitespace noise, placeholder/boilerplate values, and per-column type consistency into a 0–100 score with per-dimension subscores, per-field breakdown and issues. No reference schema, no fetching, no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/scraped-data-quality-scorer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/score', summary: 'Score a scraped/extracted dataset', price_usdc: 0.01 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL score + reasoning', price_usdc: 0.018 },
  ],
  pricing: [
    { path: '/score', price_usdc: 0.01, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.018, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('measurement', 'scoring'), _Tail: Tail,
  FieldReport, Subscores, Weights, ScoreCore, ScoreRequest, DiscoveryResponse: discoverySchema(),
  ScoreResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScoreCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ScoreCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/score', summary: 'Score a scraped/extracted dataset', operationId: 'score', priceUsdc: 0.01,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'ScoreResponse', requestExample: reqEx,
    responseExample: scoreExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL score + reasoning', operationId: 'lookup', priceUsdc: 0.018, oneCall: true,
    requestSchemaRef: 'ScoreRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'scraped-data-quality-scorer', title: 'Scraped Data Quality Scorer API', version: '1.0.0',
  description: 'Deterministic scraped/extracted-data quality scorer — completeness, duplicate extraction, HTML/whitespace noise, placeholder values, type consistency → 0–100 score + subscores + issues. No schema, no fetching, no LLM.',
  endpoints, schemas, infoExtensions: { 'x-data-quality': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /scraped-data-quality-scorer/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Scraped Data Quality Scorer API",
    "version": "1.0.0",
    "description": "Deterministic scraped/extracted-data quality scorer — completeness, duplicate extraction, HTML/whitespace noise, placeholder values, type consistency → 0–100 score + subscores + issues. No schema, no fetching, no LLM.",
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
      "url": "https://orbis-apis.onrender.com/scraped-data-quality-scorer"
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
                  "name": "Scraped Data Quality Scorer API",
                  "version": "1.0.0",
                  "description": "Deterministic quality scorer for scraped/extracted datasets. Scores extraction completeness, duplicate extraction, HTML/whitespace noise, placeholder/boilerplate values, and per-column type consistency into a 0–100 score with per-dimension subscores, per-field breakdown and issues. No reference schema, no fetching, no LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/scraped-data-quality-scorer/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/score",
                      "summary": "Score a scraped/extracted dataset",
                      "price_usdc": 0.01
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL score + reasoning",
                      "price_usdc": 0.018
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/score",
                      "price_usdc": 0.01,
                      "currency": "USDC"
                    },
                    {
                      "path": "/lookup",
                      "price_usdc": 0.018,
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
    "/score": {
      "post": {
        "operationId": "score",
        "summary": "Score a scraped/extracted dataset",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ScoreResponse"
                },
                "example": {
                  "trace_id": "sdq-1780000000000",
                  "request_id": "sdq-1780000000000",
                  "computed_at": "2026-06-15T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "row_count": 5,
                  "column_count": 4,
                  "total_cells": 20,
                  "duplicate_row_count": 1,
                  "placeholder_cell_count": 2,
                  "noise_cell_count": 3,
                  "missing_cell_count": 1,
                  "subscores": {
                    "completeness": 0.95,
                    "uniqueness": 0.8,
                    "cleanliness": 0.85,
                    "placeholder_freedom": 0.9,
                    "consistency": 0.95
                  },
                  "score": 89.8,
                  "grade": "B",
                  "weights_used": {
                    "completeness": 0.3,
                    "uniqueness": 0.15,
                    "cleanliness": 0.2,
                    "placeholder_freedom": 0.2,
                    "consistency": 0.15
                  },
                  "fields": [
                    {
                      "name": "title",
                      "fill_rate": 1,
                      "placeholder_rate": 0,
                      "noise_rate": 0.6,
                      "truncated_count": 1,
                      "dominant_type": "string",
                      "type_consistency": 1
                    },
                    {
                      "name": "price",
                      "fill_rate": 0.8,
                      "placeholder_rate": 0.2,
                      "noise_rate": 0,
                      "truncated_count": 0,
                      "dominant_type": "string",
                      "type_consistency": 1
                    },
                    {
                      "name": "url",
                      "fill_rate": 1,
                      "placeholder_rate": 0,
                      "noise_rate": 0,
                      "truncated_count": 0,
                      "dominant_type": "string",
                      "type_consistency": 1
                    },
                    {
                      "name": "stock",
                      "fill_rate": 1,
                      "placeholder_rate": 0.2,
                      "noise_rate": 0,
                      "truncated_count": 0,
                      "dominant_type": "number",
                      "type_consistency": 0.8
                    }
                  ],
                  "issues": [
                    "1 duplicate row(s) (20.0%) — likely double-extraction.",
                    "Column \"title\": 60.0% noisy values (whitespace/HTML entities/control chars/truncation).",
                    "Column \"price\": only 80.0% of rows populated.",
                    "Column \"price\": 20.0% placeholder/boilerplate values.",
                    "Column \"stock\": 20.0% placeholder/boilerplate values.",
                    "Column \"stock\": mixed value types (dominant number only 80.0% consistent)."
                  ],
                  "confidence_score": 0.8,
                  "confidence_per_section": {
                    "measurement": 1,
                    "scoring": 0.8
                  },
                  "recommended_actions_priority_order": [
                    "Quality score 89.8/100 (B) over 5 row(s) × 4 column(s).",
                    "Weakest dimension(s): uniqueness 80%, cleanliness 85%.",
                    "De-duplicate: 1 duplicate row(s) detected.",
                    "6 field issue(s) flagged — see issues[].",
                    "Chain to scrape-data-pipeline-validator to enforce an expected schema, or scrape-data-enricher to repair weak fields."
                  ],
                  "chain_to": [
                    {
                      "api": "scrape-data-pipeline-validator",
                      "reason": "Check these records against an explicit expected schema (presence/type/format) for pass/fail."
                    },
                    {
                      "api": "scrape-data-enricher",
                      "reason": "Repair low-fill or placeholder fields with deterministic enrichment rules."
                    },
                    {
                      "api": "data-quality-rules",
                      "reason": "Codify the quality thresholds found here as reusable not-null/range/regex rules."
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
                "$ref": "#/components/schemas/ScoreRequest"
              },
              "example": {
                "rows": [
                  {
                    "title": "Widget A",
                    "price": "$9.99",
                    "url": "https://shop.com/a",
                    "stock": "12"
                  },
                  {
                    "title": "Widget B ",
                    "price": "N/A",
                    "url": "https://shop.com/b",
                    "stock": "7"
                  },
                  {
                    "title": "Tom &amp; Jerry",
                    "price": "$14.50",
                    "url": "https://shop.com/c",
                    "stock": "unknown"
                  },
                  {
                    "title": "Widget A",
                    "price": "$9.99",
                    "url": "https://shop.com/a",
                    "stock": "12"
                  },
                  {
                    "title": "Long description that was cut o…",
                    "price": "",
                    "url": "https://shop.com/e",
                    "stock": "3"
                  }
                ]
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.01,
          "currency": "USDC"
        }
      }
    },
    "/lookup": {
      "post": {
        "operationId": "lookup",
        "summary": "ONE-CALL score + reasoning",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LookupResponse"
                },
                "example": {
                  "trace_id": "sdq-1780000000000",
                  "request_id": "sdq-1780000000000",
                  "computed_at": "2026-06-15T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "row_count": 5,
                  "column_count": 4,
                  "total_cells": 20,
                  "duplicate_row_count": 1,
                  "placeholder_cell_count": 2,
                  "noise_cell_count": 3,
                  "missing_cell_count": 1,
                  "subscores": {
                    "completeness": 0.95,
                    "uniqueness": 0.8,
                    "cleanliness": 0.85,
                    "placeholder_freedom": 0.9,
                    "consistency": 0.95
                  },
                  "score": 89.8,
                  "grade": "B",
                  "weights_used": {
                    "completeness": 0.3,
                    "uniqueness": 0.15,
                    "cleanliness": 0.2,
                    "placeholder_freedom": 0.2,
                    "consistency": 0.15
                  },
                  "fields": [
                    {
                      "name": "title",
                      "fill_rate": 1,
                      "placeholder_rate": 0,
                      "noise_rate": 0.6,
                      "truncated_count": 1,
                      "dominant_type": "string",
                      "type_consistency": 1
                    },
                    {
                      "name": "price",
                      "fill_rate": 0.8,
                      "placeholder_rate": 0.2,
                      "noise_rate": 0,
                      "truncated_count": 0,
                      "dominant_type": "string",
                      "type_consistency": 1
                    },
                    {
                      "name": "url",
                      "fill_rate": 1,
                      "placeholder_rate": 0,
                      "noise_rate": 0,
                      "truncated_count": 0,
                      "dominant_type": "string",
                      "type_consistency": 1
                    },
                    {
                      "name": "stock",
                      "fill_rate": 1,
                      "placeholder_rate": 0.2,
                      "noise_rate": 0,
                      "truncated_count": 0,
                      "dominant_type": "number",
                      "type_consistency": 0.8
                    }
                  ],
                  "issues": [
                    "1 duplicate row(s) (20.0%) — likely double-extraction.",
                    "Column \"title\": 60.0% noisy values (whitespace/HTML entities/control chars/truncation).",
                    "Column \"price\": only 80.0% of rows populated.",
                    "Column \"price\": 20.0% placeholder/boilerplate values.",
                    "Column \"stock\": 20.0% placeholder/boilerplate values.",
                    "Column \"stock\": mixed value types (dominant number only 80.0% consistent)."
                  ],
                  "reasoning": {
                    "why_result_generated": "Scored 5 row(s) × 4 column(s): 89.8/100 (B).",
                    "key_factors": [
                      "Subscores — completeness 0.95, uniqueness 0.8, cleanliness 0.85, placeholder_freedom 0.9, consistency 0.95.",
                      "1 missing, 2 placeholder, 3 noisy cell(s); 1 duplicate row(s).",
                      "Issues flagged: 6."
                    ],
                    "invalidators": [
                      "This scores intrinsic, schema-free quality of already-extracted data; it does NOT compare against an expected schema (use scrape-data-pipeline-validator) or score pipeline health (use data-pipeline-quality-scorer).",
                      "Placeholder detection matches a fixed token list (n/a, null, —, …, lorem ipsum, etc.); domain-specific sentinels (e.g. \"0\", \"999\") are NOT treated as placeholders.",
                      "Noise = leading/trailing whitespace, HTML entities (&amp;), control characters, or truncation markers (…/...); decoded-but-wrong text cannot be detected.",
                      "Type consistency folds integers into \"number\"; the overall score is a weighted blend (weights_used) — a heuristic, not a certified quality guarantee."
                    ]
                  },
                  "confidence_score": 0.8,
                  "confidence_per_section": {
                    "measurement": 1,
                    "scoring": 0.8
                  },
                  "recommended_actions_priority_order": [
                    "Quality score 89.8/100 (B) over 5 row(s) × 4 column(s).",
                    "Weakest dimension(s): uniqueness 80%, cleanliness 85%.",
                    "De-duplicate: 1 duplicate row(s) detected.",
                    "6 field issue(s) flagged — see issues[].",
                    "Chain to scrape-data-pipeline-validator to enforce an expected schema, or scrape-data-enricher to repair weak fields."
                  ],
                  "chain_to": [
                    {
                      "api": "scrape-data-pipeline-validator",
                      "reason": "Check these records against an explicit expected schema (presence/type/format) for pass/fail."
                    },
                    {
                      "api": "scrape-data-enricher",
                      "reason": "Repair low-fill or placeholder fields with deterministic enrichment rules."
                    },
                    {
                      "api": "data-quality-rules",
                      "reason": "Codify the quality thresholds found here as reusable not-null/range/regex rules."
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
                "$ref": "#/components/schemas/ScoreRequest"
              },
              "example": {
                "rows": [
                  {
                    "title": "Widget A",
                    "price": "$9.99",
                    "url": "https://shop.com/a",
                    "stock": "12"
                  },
                  {
                    "title": "Widget B ",
                    "price": "N/A",
                    "url": "https://shop.com/b",
                    "stock": "7"
                  },
                  {
                    "title": "Tom &amp; Jerry",
                    "price": "$14.50",
                    "url": "https://shop.com/c",
                    "stock": "unknown"
                  },
                  {
                    "title": "Widget A",
                    "price": "$9.99",
                    "url": "https://shop.com/a",
                    "stock": "12"
                  },
                  {
                    "title": "Long description that was cut o…",
                    "price": "",
                    "url": "https://shop.com/e",
                    "stock": "3"
                  }
                ]
              }
            }
          }
        },
        "x-pricing": {
          "model": "per_call",
          "price_usdc": 0.018,
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
          "measurement": {
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
          "fill_rate",
          "placeholder_rate",
          "noise_rate",
          "truncated_count",
          "dominant_type",
          "type_consistency"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string"
          },
          "fill_rate": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Fraction of rows with a non-missing value."
          },
          "placeholder_rate": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Fraction of rows holding a placeholder/boilerplate token."
          },
          "noise_rate": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Fraction of rows with whitespace/HTML-entity/control-char/truncation noise."
          },
          "truncated_count": {
            "type": "integer",
            "minimum": 0
          },
          "dominant_type": {
            "type": [
              "string",
              "null"
            ],
            "enum": [
              "boolean",
              "number",
              "date",
              "string",
              null
            ]
          },
          "type_consistency": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Share of present values matching the dominant type."
          }
        }
      },
      "Subscores": {
        "type": "object",
        "required": [
          "completeness",
          "uniqueness",
          "cleanliness",
          "placeholder_freedom",
          "consistency"
        ],
        "additionalProperties": false,
        "properties": {
          "completeness": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Non-missing cell rate."
          },
          "uniqueness": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "1 − duplicate-row rate."
          },
          "cleanliness": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "1 − noisy-cell rate."
          },
          "placeholder_freedom": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "1 − placeholder-cell rate."
          },
          "consistency": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Mean per-column dominant-type share."
          }
        }
      },
      "Weights": {
        "type": "object",
        "required": [
          "completeness",
          "uniqueness",
          "cleanliness",
          "placeholder_freedom",
          "consistency"
        ],
        "additionalProperties": false,
        "properties": {
          "completeness": {
            "type": "number"
          },
          "uniqueness": {
            "type": "number"
          },
          "cleanliness": {
            "type": "number"
          },
          "placeholder_freedom": {
            "type": "number"
          },
          "consistency": {
            "type": "number"
          }
        }
      },
      "ScoreCore": {
        "type": "object",
        "required": [
          "row_count",
          "column_count",
          "total_cells",
          "duplicate_row_count",
          "placeholder_cell_count",
          "noise_cell_count",
          "missing_cell_count",
          "subscores",
          "score",
          "grade",
          "weights_used",
          "fields",
          "issues"
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
          "total_cells": {
            "type": "integer",
            "minimum": 0
          },
          "duplicate_row_count": {
            "type": "integer",
            "minimum": 0
          },
          "placeholder_cell_count": {
            "type": "integer",
            "minimum": 0
          },
          "noise_cell_count": {
            "type": "integer",
            "minimum": 0
          },
          "missing_cell_count": {
            "type": "integer",
            "minimum": 0
          },
          "subscores": {
            "type": "object",
            "required": [
              "completeness",
              "uniqueness",
              "cleanliness",
              "placeholder_freedom",
              "consistency"
            ],
            "additionalProperties": false,
            "properties": {
              "completeness": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "Non-missing cell rate."
              },
              "uniqueness": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "1 − duplicate-row rate."
              },
              "cleanliness": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "1 − noisy-cell rate."
              },
              "placeholder_freedom": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "1 − placeholder-cell rate."
              },
              "consistency": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "Mean per-column dominant-type share."
              }
            }
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
          },
          "weights_used": {
            "type": "object",
            "required": [
              "completeness",
              "uniqueness",
              "cleanliness",
              "placeholder_freedom",
              "consistency"
            ],
            "additionalProperties": false,
            "properties": {
              "completeness": {
                "type": "number"
              },
              "uniqueness": {
                "type": "number"
              },
              "cleanliness": {
                "type": "number"
              },
              "placeholder_freedom": {
                "type": "number"
              },
              "consistency": {
                "type": "number"
              }
            }
          },
          "fields": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "name",
                "fill_rate",
                "placeholder_rate",
                "noise_rate",
                "truncated_count",
                "dominant_type",
                "type_consistency"
              ],
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string"
                },
                "fill_rate": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1,
                  "description": "Fraction of rows with a non-missing value."
                },
                "placeholder_rate": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1,
                  "description": "Fraction of rows holding a placeholder/boilerplate token."
                },
                "noise_rate": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1,
                  "description": "Fraction of rows with whitespace/HTML-entity/control-char/truncation noise."
                },
                "truncated_count": {
                  "type": "integer",
                  "minimum": 0
                },
                "dominant_type": {
                  "type": [
                    "string",
                    "null"
                  ],
                  "enum": [
                    "boolean",
                    "number",
                    "date",
                    "string",
                    null
                  ]
                },
                "type_consistency": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1,
                  "description": "Share of present values matching the dominant type."
                }
              }
            }
          },
          "issues": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "ScoreRequest": {
        "type": "object",
        "required": [
          "rows"
        ],
        "additionalProperties": false,
        "properties": {
          "rows": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "description": "A scraped/extracted record (column → value).",
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
            "description": "The scraped dataset to score."
          },
          "columns": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Optional explicit column list; defaults to the union of row keys."
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
      "ScoreResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/ScoreCore"
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
            "$ref": "#/components/schemas/ScoreCore"
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
### POST /score (messy: dup row + placeholder + HTML-entity/whitespace/truncation noise + missing + mixed types)
Request:
```json
{
  "rows": [
    {
      "title": "Widget A",
      "price": "$9.99",
      "url": "https://shop.com/a",
      "stock": "12"
    },
    {
      "title": "Widget B ",
      "price": "N/A",
      "url": "https://shop.com/b",
      "stock": "7"
    },
    {
      "title": "Tom &amp; Jerry",
      "price": "$14.50",
      "url": "https://shop.com/c",
      "stock": "unknown"
    },
    {
      "title": "Widget A",
      "price": "$9.99",
      "url": "https://shop.com/a",
      "stock": "12"
    },
    {
      "title": "Long description that was cut o…",
      "price": "",
      "url": "https://shop.com/e",
      "stock": "3"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "m5nlg1w5-1781567165583",
  "request_id": "m5nlg1w5-1781567165583",
  "computed_at": "2026-06-15T23:46:05.583Z",
  "success": true,
  "latency_ms": 3,
  "row_count": 5,
  "column_count": 4,
  "total_cells": 20,
  "duplicate_row_count": 1,
  "placeholder_cell_count": 2,
  "noise_cell_count": 3,
  "missing_cell_count": 1,
  "subscores": {
    "completeness": 0.95,
    "uniqueness": 0.8,
    "cleanliness": 0.85,
    "placeholder_freedom": 0.9,
    "consistency": 0.95
  },
  "score": 89.8,
  "grade": "B",
  "weights_used": {
    "completeness": 0.3,
    "uniqueness": 0.15,
    "cleanliness": 0.2,
    "placeholder_freedom": 0.2,
    "consistency": 0.15
  },
  "fields": [
    {
      "name": "title",
      "fill_rate": 1,
      "placeholder_rate": 0,
      "noise_rate": 0.6,
      "truncated_count": 1,
      "dominant_type": "string",
      "type_consistency": 1
    },
    {
      "name": "price",
      "fill_rate": 0.8,
      "placeholder_rate": 0.2,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "string",
      "type_consistency": 1
    },
    {
      "name": "url",
      "fill_rate": 1,
      "placeholder_rate": 0,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "string",
      "type_consistency": 1
    },
    {
      "name": "stock",
      "fill_rate": 1,
      "placeholder_rate": 0.2,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "number",
      "type_consistency": 0.8
    }
  ],
  "issues": [
    "1 duplicate row(s) (20.0%) — likely double-extraction.",
    "Column \"title\": 60.0% noisy values (whitespace/HTML entities/control chars/truncation).",
    "Column \"price\": only 80.0% of rows populated.",
    "Column \"price\": 20.0% placeholder/boilerplate values.",
    "Column \"stock\": 20.0% placeholder/boilerplate values.",
    "Column \"stock\": mixed value types (dominant number only 80.0% consistent)."
  ],
  "confidence_score": 0.8,
  "confidence_per_section": {
    "measurement": 1,
    "scoring": 0.8
  },
  "recommended_actions_priority_order": [
    "Quality score 89.8/100 (B) over 5 row(s) × 4 column(s).",
    "Weakest dimension(s): uniqueness 80%, cleanliness 85%.",
    "De-duplicate: 1 duplicate row(s) detected.",
    "6 field issue(s) flagged — see issues[].",
    "Chain to scrape-data-pipeline-validator to enforce an expected schema, or scrape-data-enricher to repair weak fields."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Check these records against an explicit expected schema (presence/type/format) for pass/fail."
    },
    {
      "api": "scrape-data-enricher",
      "reason": "Repair low-fill or placeholder fields with deterministic enrichment rules."
    },
    {
      "api": "data-quality-rules",
      "reason": "Codify the quality thresholds found here as reusable not-null/range/regex rules."
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

### POST /lookup (clean dataset → high score, empty issues)
Request:
```json
{
  "rows": [
    {
      "id": "1",
      "name": "Acme",
      "city": "Denver"
    },
    {
      "id": "2",
      "name": "Beta",
      "city": "Boulder"
    },
    {
      "id": "3",
      "name": "Gamma",
      "city": "Aspen"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "0k26wo2m-1781567165588",
  "request_id": "0k26wo2m-1781567165588",
  "computed_at": "2026-06-15T23:46:05.588Z",
  "success": true,
  "latency_ms": 0,
  "row_count": 3,
  "column_count": 3,
  "total_cells": 9,
  "duplicate_row_count": 0,
  "placeholder_cell_count": 0,
  "noise_cell_count": 0,
  "missing_cell_count": 0,
  "subscores": {
    "completeness": 1,
    "uniqueness": 1,
    "cleanliness": 1,
    "placeholder_freedom": 1,
    "consistency": 1
  },
  "score": 100,
  "grade": "A",
  "weights_used": {
    "completeness": 0.3,
    "uniqueness": 0.15,
    "cleanliness": 0.2,
    "placeholder_freedom": 0.2,
    "consistency": 0.15
  },
  "fields": [
    {
      "name": "id",
      "fill_rate": 1,
      "placeholder_rate": 0,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "number",
      "type_consistency": 1
    },
    {
      "name": "name",
      "fill_rate": 1,
      "placeholder_rate": 0,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "string",
      "type_consistency": 1
    },
    {
      "name": "city",
      "fill_rate": 1,
      "placeholder_rate": 0,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "string",
      "type_consistency": 1
    }
  ],
  "issues": [],
  "reasoning": {
    "why_result_generated": "Scored 3 row(s) × 3 column(s): 100/100 (A).",
    "key_factors": [
      "Subscores — completeness 1, uniqueness 1, cleanliness 1, placeholder_freedom 1, consistency 1.",
      "0 missing, 0 placeholder, 0 noisy cell(s); 0 duplicate row(s).",
      "Issues flagged: 0."
    ],
    "invalidators": [
      "This scores intrinsic, schema-free quality of already-extracted data; it does NOT compare against an expected schema (use scrape-data-pipeline-validator) or score pipeline health (use data-pipeline-quality-scorer).",
      "Placeholder detection matches a fixed token list (n/a, null, —, …, lorem ipsum, etc.); domain-specific sentinels (e.g. \"0\", \"999\") are NOT treated as placeholders.",
      "Noise = leading/trailing whitespace, HTML entities (&amp;), control characters, or truncation markers (…/...); decoded-but-wrong text cannot be detected.",
      "Type consistency folds integers into \"number\"; the overall score is a weighted blend (weights_used) — a heuristic, not a certified quality guarantee."
    ]
  },
  "confidence_score": 0.8,
  "confidence_per_section": {
    "measurement": 1,
    "scoring": 0.8
  },
  "recommended_actions_priority_order": [
    "Quality score 100/100 (A) over 3 row(s) × 3 column(s).",
    "Chain to scrape-data-pipeline-validator to enforce an expected schema, or scrape-data-enricher to repair weak fields."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Check these records against an explicit expected schema (presence/type/format) for pass/fail."
    },
    {
      "api": "scrape-data-enricher",
      "reason": "Repair low-fill or placeholder fields with deterministic enrichment rules."
    },
    {
      "api": "data-quality-rules",
      "reason": "Codify the quality thresholds found here as reusable not-null/range/regex rules."
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

### POST /score (heavy placeholder + truncation column)
Request:
```json
{
  "rows": [
    {
      "desc": "real value here",
      "code": "AB1"
    },
    {
      "desc": "N/A",
      "code": "AB2"
    },
    {
      "desc": "tbd",
      "code": "AB3"
    },
    {
      "desc": "another long blurb that got…",
      "code": "AB4"
    }
  ]
}
```
Response (HTTP 200):
```json
{
  "trace_id": "nkgsvfk8-1781567165590",
  "request_id": "nkgsvfk8-1781567165590",
  "computed_at": "2026-06-15T23:46:05.590Z",
  "success": true,
  "latency_ms": 0,
  "row_count": 4,
  "column_count": 2,
  "total_cells": 8,
  "duplicate_row_count": 0,
  "placeholder_cell_count": 2,
  "noise_cell_count": 1,
  "missing_cell_count": 0,
  "subscores": {
    "completeness": 1,
    "uniqueness": 1,
    "cleanliness": 0.875,
    "placeholder_freedom": 0.75,
    "consistency": 1
  },
  "score": 92.5,
  "grade": "A",
  "weights_used": {
    "completeness": 0.3,
    "uniqueness": 0.15,
    "cleanliness": 0.2,
    "placeholder_freedom": 0.2,
    "consistency": 0.15
  },
  "fields": [
    {
      "name": "desc",
      "fill_rate": 1,
      "placeholder_rate": 0.5,
      "noise_rate": 0.25,
      "truncated_count": 1,
      "dominant_type": "string",
      "type_consistency": 1
    },
    {
      "name": "code",
      "fill_rate": 1,
      "placeholder_rate": 0,
      "noise_rate": 0,
      "truncated_count": 0,
      "dominant_type": "string",
      "type_consistency": 1
    }
  ],
  "issues": [
    "Column \"desc\": 50.0% placeholder/boilerplate values.",
    "Column \"desc\": 25.0% noisy values (whitespace/HTML entities/control chars/truncation)."
  ],
  "confidence_score": 0.8,
  "confidence_per_section": {
    "measurement": 1,
    "scoring": 0.8
  },
  "recommended_actions_priority_order": [
    "Quality score 92.5/100 (A) over 4 row(s) × 2 column(s).",
    "Weakest dimension(s): placeholder_freedom 75%, cleanliness 88%.",
    "2 field issue(s) flagged — see issues[].",
    "Chain to scrape-data-pipeline-validator to enforce an expected schema, or scrape-data-enricher to repair weak fields."
  ],
  "chain_to": [
    {
      "api": "scrape-data-pipeline-validator",
      "reason": "Check these records against an explicit expected schema (presence/type/format) for pass/fail."
    },
    {
      "api": "scrape-data-enricher",
      "reason": "Repair low-fill or placeholder fields with deterministic enrichment rules."
    },
    {
      "api": "data-quality-rules",
      "reason": "Codify the quality thresholds found here as reusable not-null/range/regex rules."
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

### POST /score (error: missing rows)
Request:
```json
{}
```
Response (HTTP 400):
```json
{
  "trace_id": "2t38pjou-1781567165591",
  "request_id": "2t38pjou-1781567165591",
  "computed_at": "2026-06-15T23:46:05.591Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"rows\" must be an array of row objects."
  }
}
```

