# Group B Converters — ChatGPT Review Bundle (Orbis A+ developer/format tools)

Date: 2026-06-17 · tsc clean · smoke 24/24 green · live-verified on Render

Two new deterministic, agent-native converter APIs: **data-format-converter** (JSON ⇄ YAML ⇄ TOML + format detection) and **xml-json-converter** (XML ⇄ JSON).

Dependencies are pure-JS (no native bindings, deploy-safe on Render): `yaml`, `@iarna/toml`, `fast-xml-parser`.

## Please grade each API (A+/A/B/...) on:
1. **Correctness** of the deterministic conversions (JSON/YAML/TOML structural round-trip; TOML top-level-table + no-null constraints; format detection ordering; XML validate→parse with attribute preservation; XML build).
2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata; reasoning + enriched discovery with typical_use_cases/input_examples/output_examples).
3. **Honesty** (no fabrication; structural-not-byte-for-byte caveats; TOML/array limits; fast-xml-parser data-model caveats; nothing stored; no LLM).
4. **OpenAPI 3.1** schema rigor (allOf + unevaluatedProperties:false; typed 200/400/500; x-pricing; request/response examples).
5. **Agent-usability** (clear field names, actionable recommended_actions, sensible chain_to targets).
Flag any bug, incorrect output, security footgun (e.g. XML entity expansion / billion-laughs, prototype pollution via __proto__ keys), or schema/response drift.

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

# data-format-converter

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import YAML from 'yaml';
import TOML from '@iarna/toml';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic config/data format converter. /convert parses the input in `from`
// (json | yaml | toml) and re-serializes it as `to`; /detect reports which of the
// three formats the input parses as. Pure parse/serialize via the `yaml` and
// `@iarna/toml` libraries + native JSON — no LLM, nothing stored.

const router = Router();

const MAX_INPUT_LEN = 1_000_000; // characters of the input string
const FORMATS = ['json', 'yaml', 'toml'] as const;
type Format = (typeof FORMATS)[number];
const FORMAT_SET = new Set<string>(FORMATS);

function parseFormat(data: string, fmt: Format): unknown {
  if (fmt === 'json') return JSON.parse(data);
  if (fmt === 'yaml') return YAML.parse(data);
  return TOML.parse(data);
}

function serializeFormat(value: unknown, fmt: Format, indent: number): string {
  if (fmt === 'json') return JSON.stringify(value, null, indent);
  if (fmt === 'yaml') return YAML.stringify(value);
  // @iarna/toml requires a plain-object (table) document; it throws on arrays/scalars/null.
  return TOML.stringify(value as TOML.JsonMap);
}

function valueType(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v; // object | string | number | boolean | undefined
}

export interface ConvertCore { from: Format; to: Format; value_type: string; output: string; output_length: number }
export interface DetectCore { detected_format: Format | null; parses_as: Record<Format, boolean> }

function detect(data: string): DetectCore {
  const parses_as = { json: false, yaml: false, toml: false } as Record<Format, boolean>;
  for (const f of FORMATS) { try { parseFormat(data, f); parses_as[f] = true; } catch { /* not this format */ } }
  // Prefer the most specific format. JSON is the strictest; YAML is a JSON superset, so a
  // pure-JSON document also parses as YAML. TOML is distinct. Order: json → toml → yaml.
  const detected_format: Format | null = parses_as.json ? 'json' : parses_as.toml ? 'toml' : parses_as.yaml ? 'yaml' : null;
  return { detected_format, parses_as };
}

function readConvert(b: Record<string, unknown>): { error: string } | { data: string; from: Format; to: Format; indent: number } {
  if (typeof b.data !== 'string') return { error: '"data" must be a string.' };
  if (b.data.length > MAX_INPUT_LEN) return { error: `"data" exceeds the ${MAX_INPUT_LEN}-character limit.` };
  if (typeof b.from !== 'string' || !FORMAT_SET.has(b.from)) return { error: `"from" must be one of ${FORMATS.join(', ')}.` };
  if (typeof b.to !== 'string' || !FORMAT_SET.has(b.to)) return { error: `"to" must be one of ${FORMATS.join(', ')}.` };
  let indent = 2;
  if (b.indent !== undefined) {
    if (typeof b.indent !== 'number' || !Number.isInteger(b.indent) || b.indent < 0 || b.indent > 10) return { error: '"indent" must be an integer between 0 and 10.' };
    indent = b.indent;
  }
  return { data: b.data, from: b.from as Format, to: b.to as Format, indent };
}

function runConvert(data: string, from: Format, to: Format, indent: number): { error: string } | ConvertCore {
  let value: unknown;
  try { value = parseFormat(data, from); }
  catch (e) { return { error: `Input is not valid ${from}: ${(e as Error).message}` }; }
  let output: string;
  try { output = serializeFormat(value, to, indent); }
  catch (e) { return { error: `Cannot serialize the parsed value to ${to}: ${(e as Error).message}` }; }
  return { from, to, value_type: valueType(value), output, output_length: output.length };
}

const CHAIN_TO = [
  { api: 'json-validator', reason: 'Validate the converted JSON against a JSON Schema before using it.' },
  { api: 'jsonpath', reason: 'Query or extract fields from the converted structure.' },
];
const INVALIDATORS = [
  'Conversion is structural: it round-trips the parsed data model, not byte-for-byte formatting. Comments, key ordering nuances, anchors/aliases, and whitespace are NOT preserved.',
  'TOML can only represent a top-level table (object) with no null values; converting an array, scalar, or a structure containing null TO toml fails with an explicit error.',
  'YAML is a superset of JSON, so a pure-JSON document also parses as YAML; /detect therefore reports json first when the input is valid JSON.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

export const DISCOVERY = {
  name: 'Data Format Converter API', version: '1.0.0',
  description: 'Deterministic config/data format converter. /convert parses the input as JSON, YAML or TOML and re-serializes it to another of those formats; /detect reports which formats the input parses as. Structural round-trip via the yaml and @iarna/toml libraries — no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/data-format-converter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['json_to_yaml', 'yaml_to_json', 'json_to_toml', 'toml_to_json', 'yaml_to_toml', 'format_detection'],
  typical_use_cases: [
    'Convert a YAML or TOML config file into JSON for programmatic consumption',
    'Emit a human-friendly YAML version of a JSON payload for a PR or docs',
    'Detect whether an unknown config blob is JSON, YAML or TOML before parsing it',
  ],
  input_examples: [
    { endpoint: '/convert', body: { data: 'name = "demo"\nport = 8080', from: 'toml', to: 'json' } },
    { endpoint: '/detect', body: { data: 'name: demo\nport: 8080' } },
  ],
  output_examples: [
    { endpoint: '/convert', response: { from: 'toml', to: 'json', value_type: 'object', output: '{\n  "name": "demo",\n  "port": 8080\n}' } },
    { endpoint: '/detect', response: { detected_format: 'yaml', parses_as: { json: false, yaml: true, toml: false } } },
  ],
  endpoints: [
    { method: 'POST', path: '/convert', summary: 'Convert between JSON, YAML and TOML', price_usdc: 0.006 },
    { method: 'POST', path: '/detect', summary: 'Detect which formats the input parses as', price_usdc: 0.005 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL convert + reasoning', price_usdc: 0.011 },
  ],
  pricing: [
    { path: '/convert', price_usdc: 0.006, currency: 'USDC' },
    { path: '/detect', price_usdc: 0.005, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.011, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/convert', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide "data", "from" and "to".');
  const r = readConvert(b);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const out = runConvert(r.data, r.from, r.to, r.indent);
  if ('error' in out) return fail(res, t0, 400, 'invalid_request', out.error);
  respond(res, t0, { ...out, ...TAIL({ conversion: 1 }, [`Converted ${out.from} → ${out.to} (${out.output_length} chars).`]) });
});

router.post('/detect', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "data" string.');
  if (typeof b.data !== 'string') return fail(res, t0, 400, 'invalid_request', '"data" must be a string.');
  if (b.data.length > MAX_INPUT_LEN) return fail(res, t0, 400, 'invalid_request', `"data" exceeds the ${MAX_INPUT_LEN}-character limit.`);
  const core = detect(b.data);
  respond(res, t0, { ...core, ...TAIL({ detection: 1 }, [core.detected_format ? `Input parses as ${core.detected_format}.` : 'Input does not parse as JSON, YAML or TOML.']) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide "data", "from" and "to".');
  const r = readConvert(b);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const out = runConvert(r.data, r.from, r.to, r.indent);
  if ('error' in out) return fail(res, t0, 400, 'invalid_request', out.error);
  respond(res, t0, {
    ...out,
    reasoning: {
      why_result_generated: `Parsed the input as ${out.from} (top-level ${out.value_type}) and re-serialized it as ${out.to}, producing ${out.output_length} character(s).`,
      key_factors: [`Source format: ${out.from}.`, `Target format: ${out.to}.`, `Top-level value type: ${out.value_type}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ conversion: 1 }, [`Converted ${out.from} → ${out.to} (${out.output_length} chars).`]),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { convertExample, detectExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const Format = { type: 'string', enum: ['json', 'yaml', 'toml'] };

const ConvertCore = {
  type: 'object', required: ['from', 'to', 'value_type', 'output', 'output_length'],
  properties: {
    from: Format, to: Format,
    value_type: { type: 'string', enum: ['object', 'array', 'string', 'number', 'boolean', 'null'], description: 'Top-level type of the parsed value.' },
    output: { type: 'string', description: 'The input re-serialized in the target format.' },
    output_length: { type: 'integer', minimum: 0, description: 'Character length of "output".' },
  },
};
const DetectCore = {
  type: 'object', required: ['detected_format', 'parses_as'],
  properties: {
    detected_format: { oneOf: [Format, { type: 'null' }], description: 'Most specific format the input parses as (json → toml → yaml), or null.' },
    parses_as: {
      type: 'object', additionalProperties: false, required: ['json', 'yaml', 'toml'],
      properties: { json: { type: 'boolean' }, yaml: { type: 'boolean' }, toml: { type: 'boolean' } },
    },
  },
};

const ConvertRequest = {
  type: 'object', required: ['data', 'from', 'to'], additionalProperties: false,
  properties: {
    data: { type: 'string', maxLength: 1000000, description: 'The source document.' },
    from: { ...Format, description: 'Format to parse "data" as.' },
    to: { ...Format, description: 'Format to serialize the result to.' },
    indent: { type: 'integer', minimum: 0, maximum: 10, description: 'JSON output indent (default 2; ignored for yaml/toml).' },
  },
};
const DetectRequest = {
  type: 'object', required: ['data'], additionalProperties: false,
  properties: { data: { type: 'string', maxLength: 1000000, description: 'The document to classify.' } },
};

const convertReq = { data: 'name = "demo"\nport = 8080', from: 'toml', to: 'json' };
const detectReq = { data: 'name: demo\nport: 8080' };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('conversion', 'detection'), _Tail: Tail,
  Format, ConvertCore, DetectCore, ConvertRequest, DetectRequest, DiscoveryResponse: discoverySchemaPlus(),
  ConvertResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ConvertCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  DetectResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DetectCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ConvertCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/convert', summary: 'Convert between JSON, YAML and TOML', operationId: 'convert', priceUsdc: 0.006, requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'ConvertResponse', requestExample: convertReq, responseExample: convertExample },
  { method: 'post', path: '/detect', summary: 'Detect which formats the input parses as', operationId: 'detect', priceUsdc: 0.005, requestSchemaRef: 'DetectRequest', responseSchemaRef: 'DetectResponse', requestExample: detectReq, responseExample: detectExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL convert + reasoning', operationId: 'lookup', priceUsdc: 0.011, oneCall: true, requestSchemaRef: 'ConvertRequest', responseSchemaRef: 'LookupResponse', requestExample: convertReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'data-format-converter', title: 'Data Format Converter API', version: '1.0.0',
  description: 'Deterministic config/data format converter — JSON ⇄ YAML ⇄ TOML structural conversion plus format detection. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /data-format-converter/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Data Format Converter API",
    "version": "1.0.0",
    "description": "Deterministic config/data format converter — JSON ⇄ YAML ⇄ TOML structural conversion plus format detection. No LLM.",
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
      "url": "https://orbis-apis.onrender.com/data-format-converter"
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
                  "name": "Data Format Converter API",
                  "version": "1.0.0",
                  "description": "Deterministic config/data format converter. /convert parses the input as JSON, YAML or TOML and re-serializes it to another of those formats; /detect reports which formats the input parses as. Structural round-trip via the yaml and @iarna/toml libraries — no LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/data-format-converter/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "capabilities": [
                    "json_to_yaml",
                    "yaml_to_json",
                    "json_to_toml",
                    "toml_to_json",
                    "yaml_to_toml",
                    "format_detection"
                  ],
                  "typical_use_cases": [
                    "Convert a YAML or TOML config file into JSON for programmatic consumption",
                    "Emit a human-friendly YAML version of a JSON payload for a PR or docs",
                    "Detect whether an unknown config blob is JSON, YAML or TOML before parsing it"
                  ],
                  "input_examples": [
                    {
                      "endpoint": "/convert",
                      "body": {
                        "data": "name = \"demo\"\nport = 8080",
                        "from": "toml",
                        "to": "json"
                      }
                    },
                    {
                      "endpoint": "/detect",
                      "body": {
                        "data": "name: demo\nport: 8080"
                      }
                    }
                  ],
                  "output_examples": [
                    {
                      "endpoint": "/convert",
                      "response": {
                        "from": "toml",
                        "to": "json",
                        "value_type": "object",
                        "output": "{\n  \"name\": \"demo\",\n  \"port\": 8080\n}"
                      }
                    },
                    {
                      "endpoint": "/detect",
                      "response": {
                        "detected_format": "yaml",
                        "parses_as": {
                          "json": false,
                          "yaml": true,
                          "toml": false
                        }
                      }
                    }
                  ],
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/convert",
                      "summary": "Convert between JSON, YAML and TOML",
                      "price_usdc": 0.006
                    },
                    {
                      "method": "POST",
                      "path": "/detect",
                      "summary": "Detect which formats the input parses as",
                      "price_usdc": 0.005
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL convert + reasoning",
                      "price_usdc": 0.011
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/convert",
                      "price_usdc": 0.006,
                      "currency": "USDC"
                    },
                    {
                      "path": "/detect",
                      "price_usdc": 0.005,
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
    "/convert": {
      "post": {
        "operationId": "convert",
        "summary": "Convert between JSON, YAML and TOML",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ConvertResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "from": "toml",
                  "to": "json",
                  "value_type": "object",
                  "output": "{\n  \"name\": \"demo\",\n  \"port\": 8080\n}",
                  "output_length": 36,
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "conversion": 1
                  },
                  "recommended_actions_priority_order": [
                    "Converted toml → json (36 chars)."
                  ],
                  "chain_to": [
                    {
                      "api": "json-validator",
                      "reason": "Validate the converted JSON against a JSON Schema before using it."
                    },
                    {
                      "api": "jsonpath",
                      "reason": "Query or extract fields from the converted structure."
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
                "$ref": "#/components/schemas/ConvertRequest"
              },
              "example": {
                "data": "name = \"demo\"\nport = 8080",
                "from": "toml",
                "to": "json"
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
    "/detect": {
      "post": {
        "operationId": "detect",
        "summary": "Detect which formats the input parses as",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DetectResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "detected_format": "yaml",
                  "parses_as": {
                    "json": false,
                    "yaml": true,
                    "toml": false
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "detection": 1
                  },
                  "recommended_actions_priority_order": [
                    "Input parses as yaml."
                  ],
                  "chain_to": [
                    {
                      "api": "json-validator",
                      "reason": "Validate the converted JSON against a JSON Schema before using it."
                    },
                    {
                      "api": "jsonpath",
                      "reason": "Query or extract fields from the converted structure."
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
                "$ref": "#/components/schemas/DetectRequest"
              },
              "example": {
                "data": "name: demo\nport: 8080"
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
        "summary": "ONE-CALL convert + reasoning",
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
                  "from": "toml",
                  "to": "json",
                  "value_type": "object",
                  "output": "{\n  \"name\": \"demo\",\n  \"port\": 8080\n}",
                  "output_length": 36,
                  "reasoning": {
                    "why_result_generated": "Parsed the input as toml (top-level object) and re-serialized it as json, producing 36 character(s).",
                    "key_factors": [
                      "Source format: toml.",
                      "Target format: json.",
                      "Top-level value type: object."
                    ],
                    "invalidators": [
                      "Conversion is structural: it round-trips the parsed data model, not byte-for-byte formatting. Comments, key ordering nuances, anchors/aliases, and whitespace are NOT preserved.",
                      "TOML can only represent a top-level table (object) with no null values; converting an array, scalar, or a structure containing null TO toml fails with an explicit error.",
                      "YAML is a superset of JSON, so a pure-JSON document also parses as YAML; /detect therefore reports json first when the input is valid JSON."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "conversion": 1
                  },
                  "recommended_actions_priority_order": [
                    "Converted toml → json (36 chars)."
                  ],
                  "chain_to": [
                    {
                      "api": "json-validator",
                      "reason": "Validate the converted JSON against a JSON Schema before using it."
                    },
                    {
                      "api": "jsonpath",
                      "reason": "Query or extract fields from the converted structure."
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
                "$ref": "#/components/schemas/ConvertRequest"
              },
              "example": {
                "data": "name = \"demo\"\nport = 8080",
                "from": "toml",
                "to": "json"
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
          "conversion": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "detection": {
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
      "Format": {
        "type": "string",
        "enum": [
          "json",
          "yaml",
          "toml"
        ]
      },
      "ConvertCore": {
        "type": "object",
        "required": [
          "from",
          "to",
          "value_type",
          "output",
          "output_length"
        ],
        "properties": {
          "from": {
            "type": "string",
            "enum": [
              "json",
              "yaml",
              "toml"
            ]
          },
          "to": {
            "type": "string",
            "enum": [
              "json",
              "yaml",
              "toml"
            ]
          },
          "value_type": {
            "type": "string",
            "enum": [
              "object",
              "array",
              "string",
              "number",
              "boolean",
              "null"
            ],
            "description": "Top-level type of the parsed value."
          },
          "output": {
            "type": "string",
            "description": "The input re-serialized in the target format."
          },
          "output_length": {
            "type": "integer",
            "minimum": 0,
            "description": "Character length of \"output\"."
          }
        }
      },
      "DetectCore": {
        "type": "object",
        "required": [
          "detected_format",
          "parses_as"
        ],
        "properties": {
          "detected_format": {
            "oneOf": [
              {
                "type": "string",
                "enum": [
                  "json",
                  "yaml",
                  "toml"
                ]
              },
              {
                "type": "null"
              }
            ],
            "description": "Most specific format the input parses as (json → toml → yaml), or null."
          },
          "parses_as": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "json",
              "yaml",
              "toml"
            ],
            "properties": {
              "json": {
                "type": "boolean"
              },
              "yaml": {
                "type": "boolean"
              },
              "toml": {
                "type": "boolean"
              }
            }
          }
        }
      },
      "ConvertRequest": {
        "type": "object",
        "required": [
          "data",
          "from",
          "to"
        ],
        "additionalProperties": false,
        "properties": {
          "data": {
            "type": "string",
            "maxLength": 1000000,
            "description": "The source document."
          },
          "from": {
            "type": "string",
            "enum": [
              "json",
              "yaml",
              "toml"
            ],
            "description": "Format to parse \"data\" as."
          },
          "to": {
            "type": "string",
            "enum": [
              "json",
              "yaml",
              "toml"
            ],
            "description": "Format to serialize the result to."
          },
          "indent": {
            "type": "integer",
            "minimum": 0,
            "maximum": 10,
            "description": "JSON output indent (default 2; ignored for yaml/toml)."
          }
        }
      },
      "DetectRequest": {
        "type": "object",
        "required": [
          "data"
        ],
        "additionalProperties": false,
        "properties": {
          "data": {
            "type": "string",
            "maxLength": 1000000,
            "description": "The document to classify."
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
      "ConvertResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/ConvertCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "DetectResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/DetectCore"
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
            "$ref": "#/components/schemas/ConvertCore"
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
### POST /convert
Request:
```json
{
  "data": "name = \"demo\"\nport = 8080",
  "from": "toml",
  "to": "json"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "vcp2skm4-1781739719121",
  "request_id": "vcp2skm4-1781739719121",
  "computed_at": "2026-06-17T23:41:59.121Z",
  "success": true,
  "latency_ms": 0,
  "from": "toml",
  "to": "json",
  "value_type": "object",
  "output": "{\n  \"name\": \"demo\",\n  \"port\": 8080\n}",
  "output_length": 36,
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Converted toml → json (36 chars)."
  ],
  "chain_to": [
    {
      "api": "json-validator",
      "reason": "Validate the converted JSON against a JSON Schema before using it."
    },
    {
      "api": "jsonpath",
      "reason": "Query or extract fields from the converted structure."
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

### POST /detect
Request:
```json
{
  "data": "name: demo\nport: 8080"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "stznzmow-1781739719126",
  "request_id": "stznzmow-1781739719126",
  "computed_at": "2026-06-17T23:41:59.126Z",
  "success": true,
  "latency_ms": 1,
  "detected_format": "yaml",
  "parses_as": {
    "json": false,
    "yaml": true,
    "toml": false
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "detection": 1
  },
  "recommended_actions_priority_order": [
    "Input parses as yaml."
  ],
  "chain_to": [
    {
      "api": "json-validator",
      "reason": "Validate the converted JSON against a JSON Schema before using it."
    },
    {
      "api": "jsonpath",
      "reason": "Query or extract fields from the converted structure."
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
  "data": "name = \"demo\"\nport = 8080",
  "from": "toml",
  "to": "json"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "15xwq97t-1781739719129",
  "request_id": "15xwq97t-1781739719129",
  "computed_at": "2026-06-17T23:41:59.129Z",
  "success": true,
  "latency_ms": 0,
  "from": "toml",
  "to": "json",
  "value_type": "object",
  "output": "{\n  \"name\": \"demo\",\n  \"port\": 8080\n}",
  "output_length": 36,
  "reasoning": {
    "why_result_generated": "Parsed the input as toml (top-level object) and re-serialized it as json, producing 36 character(s).",
    "key_factors": [
      "Source format: toml.",
      "Target format: json.",
      "Top-level value type: object."
    ],
    "invalidators": [
      "Conversion is structural: it round-trips the parsed data model, not byte-for-byte formatting. Comments, key ordering nuances, anchors/aliases, and whitespace are NOT preserved.",
      "TOML can only represent a top-level table (object) with no null values; converting an array, scalar, or a structure containing null TO toml fails with an explicit error.",
      "YAML is a superset of JSON, so a pure-JSON document also parses as YAML; /detect therefore reports json first when the input is valid JSON."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Converted toml → json (36 chars)."
  ],
  "chain_to": [
    {
      "api": "json-validator",
      "reason": "Validate the converted JSON against a JSON Schema before using it."
    },
    {
      "api": "jsonpath",
      "reason": "Query or extract fields from the converted structure."
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
### POST /convert (error: malformed JSON)
Request:
```json
{
  "data": "{bad json",
  "from": "json",
  "to": "yaml"
}
```
Response (HTTP 400):
```json
{
  "trace_id": "od4t7nav-1781739719131",
  "request_id": "od4t7nav-1781739719131",
  "computed_at": "2026-06-17T23:41:59.131Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "Input is not valid json: Expected property name or '}' in JSON at position 1 (line 1 column 2)"
  }
}
```

### POST /convert (error: array → toml unsupported)
Request:
```json
{
  "data": "[1,2,3]",
  "from": "json",
  "to": "toml"
}
```
Response (HTTP 400):
```json
{
  "trace_id": "5tzb1lpr-1781739719136",
  "request_id": "5tzb1lpr-1781739719136",
  "computed_at": "2026-06-17T23:41:59.136Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "Cannot serialize the parsed value to toml: Can only stringify objects, not array"
  }
}
```

### POST /detect (error: non-string data)
Request:
```json
{
  "data": 123
}
```
Response (HTTP 400):
```json
{
  "trace_id": "rnpist8o-1781739719139",
  "request_id": "rnpist8o-1781739719139",
  "computed_at": "2026-06-17T23:41:59.139Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"data\" must be a string."
  }
}
```

---

# xml-json-converter

## intelligence.ts
```ts
import { Router, Request, Response } from 'express';
import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';
import { respond, fail } from '../../_aplus/scaffold';
import { PRIVACY } from '../../_aplus/util';
import { EXECUTION_METADATA_PLUS } from '../../_aplus/specparts-plus';

// Deterministic XML ⇄ JSON converter. /to-json validates and parses XML into a JSON
// object (attributes preserved with an "@_" prefix); /to-xml serializes a JSON object
// back into XML. Pure parse/build via fast-xml-parser — no LLM, nothing stored.

const router = Router();

const MAX_INPUT_LEN = 1_000_000; // characters of the input string
const ATTR_PREFIX = '@_';

export interface ToJsonCore { json: unknown; source_length: number; root_elements: string[]; attributes_preserved: boolean }
export interface ToXmlCore { xml: string; xml_length: number }

function makeParser(preserveAttributes: boolean): XMLParser {
  return new XMLParser({ ignoreAttributes: !preserveAttributes, attributeNamePrefix: ATTR_PREFIX, parseAttributeValue: true });
}

function toJson(xml: string, preserveAttributes: boolean): { error: string } | ToJsonCore {
  const valid = XMLValidator.validate(xml);
  if (valid !== true) {
    const e = valid.err;
    return { error: `Input is not well-formed XML: ${e.msg}${e.line ? ` (line ${e.line})` : ''}.` };
  }
  let json: unknown;
  try { json = makeParser(preserveAttributes).parse(xml); }
  catch (e) { return { error: `Failed to parse XML: ${(e as Error).message}` }; }
  const root_elements = json && typeof json === 'object' && !Array.isArray(json)
    ? Object.keys(json as Record<string, unknown>).filter((k) => k !== '?xml')
    : [];
  return { json, source_length: xml.length, root_elements, attributes_preserved: preserveAttributes };
}

function toXml(value: unknown, format: boolean): { error: string } | ToXmlCore {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { error: '"json" must be a JSON object (or a JSON string that parses to an object).' };
  }
  let xml: string;
  try {
    const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: ATTR_PREFIX, format, indentBy: '  ' });
    xml = builder.build(value);
  } catch (e) { return { error: `Failed to build XML: ${(e as Error).message}` }; }
  return { xml, xml_length: xml.length };
}

// Accept a JSON object directly, or a JSON string that parses to an object.
function coerceJson(raw: unknown): { error: string } | { value: unknown } {
  if (typeof raw === 'string') {
    try { return { value: JSON.parse(raw) }; }
    catch (e) { return { error: `"json" is a string but not valid JSON: ${(e as Error).message}` }; }
  }
  return { value: raw };
}

const CHAIN_TO = [
  { api: 'data-format-converter', reason: 'Convert the resulting JSON onward to YAML or TOML.' },
  { api: 'jsonpath', reason: 'Query or extract fields from the converted JSON structure.' },
];
const INVALIDATORS = [
  'XML attributes are preserved on the JSON side with the "@_" prefix (e.g. <a id="1"/> → {"a":{"@_id":"1"}}); set preserve_attributes:false on /to-json to drop them.',
  'Conversion follows the fast-xml-parser data model: repeated sibling elements collapse into an array, text content uses the "#text" key alongside attributes, and the model is NOT guaranteed to round-trip byte-for-byte (whitespace, comments, CDATA framing and namespace prefixes may shift).',
  '/to-xml requires a JSON object at the top level; arrays or scalars are rejected. Numeric/boolean attribute values are parsed on the way in.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA_PLUS,
});

export const DISCOVERY = {
  name: 'XML JSON Converter API', version: '1.0.0',
  description: 'Deterministic XML ⇄ JSON converter. /to-json validates and parses XML into JSON (attributes preserved with an "@_" prefix); /to-xml serializes a JSON object back into XML. Structural conversion via fast-xml-parser — no LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/xml-json-converter/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['xml_to_json', 'json_to_xml', 'xml_validation', 'attribute_preservation'],
  typical_use_cases: [
    'Parse an XML API response or feed into JSON for programmatic use',
    'Serialize a JSON object back into XML for a legacy/SOAP endpoint',
    'Validate that a string is well-formed XML before processing it',
  ],
  input_examples: [
    { endpoint: '/to-json', body: { xml: '<note id="1"><to>Ada</to><body>Hi</body></note>' } },
    { endpoint: '/to-xml', body: { json: { note: { '@_id': '1', to: 'Ada', body: 'Hi' } } } },
  ],
  output_examples: [
    { endpoint: '/to-json', response: { json: { note: { to: 'Ada', body: 'Hi', '@_id': 1 } }, source_length: 47, root_elements: ['note'], attributes_preserved: true } },
    { endpoint: '/to-xml', response: { xml: '<note id="1">\n  <to>Ada</to>\n  <body>Hi</body>\n</note>\n', xml_length: 55 } },
  ],
  endpoints: [
    { method: 'POST', path: '/to-json', summary: 'Convert XML to JSON', price_usdc: 0.006 },
    { method: 'POST', path: '/to-xml', summary: 'Convert a JSON object to XML', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL XML→JSON + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/to-json', price_usdc: 0.006, currency: 'USDC' },
    { path: '/to-xml', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

function readXml(b: Record<string, unknown>): { error: string } | { xml: string; preserve: boolean } {
  if (typeof b.xml !== 'string') return { error: '"xml" must be a string.' };
  if (b.xml.length > MAX_INPUT_LEN) return { error: `"xml" exceeds the ${MAX_INPUT_LEN}-character limit.` };
  let preserve = true;
  if (b.preserve_attributes !== undefined) {
    if (typeof b.preserve_attributes !== 'boolean') return { error: '"preserve_attributes" must be a boolean.' };
    preserve = b.preserve_attributes;
  }
  return { xml: b.xml, preserve };
}

router.post('/to-json', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with an "xml" string.');
  const r = readXml(b);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const core = toJson(r.xml, r.preserve);
  if ('error' in core) return fail(res, t0, 400, 'invalid_request', core.error);
  respond(res, t0, { ...core, ...TAIL({ conversion: 1 }, [`Parsed XML into JSON with ${core.root_elements.length} root element(s).`]) });
});

router.post('/to-xml', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with a "json" object.');
  if (b.json === undefined) return fail(res, t0, 400, 'invalid_request', '"json" is required.');
  let format = true;
  if (b.format !== undefined) {
    if (typeof b.format !== 'boolean') return fail(res, t0, 400, 'invalid_request', '"format" must be a boolean.');
    format = b.format;
  }
  const coerced = coerceJson(b.json);
  if ('error' in coerced) return fail(res, t0, 400, 'invalid_request', coerced.error);
  const core = toXml(coerced.value, format);
  if ('error' in core) return fail(res, t0, 400, 'invalid_request', core.error);
  respond(res, t0, { ...core, ...TAIL({ conversion: 1 }, [`Serialized JSON into ${core.xml_length} characters of XML.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return fail(res, t0, 400, 'invalid_request', 'Provide an object with an "xml" string.');
  const r = readXml(b);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const core = toJson(r.xml, r.preserve);
  if ('error' in core) return fail(res, t0, 400, 'invalid_request', core.error);
  respond(res, t0, {
    ...core,
    reasoning: {
      why_result_generated: `Validated the input as well-formed XML and parsed it into JSON with ${core.root_elements.length} root element(s)${core.attributes_preserved ? ', preserving attributes under the "@_" prefix' : ', dropping attributes'}.`,
      key_factors: [`Source length: ${core.source_length} chars.`, `Root elements: ${core.root_elements.join(', ') || 'none'}.`, `Attributes preserved: ${core.attributes_preserved}.`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ conversion: 1 }, [`Parsed XML into JSON with ${core.root_elements.length} root element(s).`]),
  });
});

export default router;
```

## openapi.ts
```ts
import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { confSections, Tail } from '../../_aplus/specparts';
import { EnvelopeOkPlus, Error400Plus, ExecutionMetadataPlus, discoverySchemaPlus } from '../../_aplus/specparts-plus';
import { toJsonExample, toXmlExample, lookupExample } from './examples';
import { DISCOVERY as disc } from './intelligence';

const ToJsonCore = {
  type: 'object', required: ['json', 'source_length', 'root_elements', 'attributes_preserved'],
  properties: {
    json: { description: 'The parsed XML as a JSON value (object; attributes under the "@_" prefix).' },
    source_length: { type: 'integer', minimum: 0, description: 'Character length of the input XML.' },
    root_elements: { type: 'array', items: { type: 'string' }, description: 'Top-level element names (excluding the XML declaration).' },
    attributes_preserved: { type: 'boolean', description: 'Whether XML attributes were kept on the JSON side.' },
  },
};
const ToXmlCore = {
  type: 'object', required: ['xml', 'xml_length'],
  properties: {
    xml: { type: 'string', description: 'The JSON object serialized as XML.' },
    xml_length: { type: 'integer', minimum: 0, description: 'Character length of "xml".' },
  },
};

const ToJsonRequest = {
  type: 'object', required: ['xml'], additionalProperties: false,
  properties: {
    xml: { type: 'string', maxLength: 1000000, description: 'A well-formed XML document.' },
    preserve_attributes: { type: 'boolean', description: 'Keep XML attributes (prefixed "@_") in the JSON output. Default true.' },
  },
};
const ToXmlRequest = {
  type: 'object', required: ['json'], additionalProperties: false,
  properties: {
    json: { description: 'A JSON object (or a JSON string that parses to an object) to serialize as XML.' },
    format: { type: 'boolean', description: 'Pretty-print the XML with indentation. Default true.' },
  },
};

const toJsonReq = { xml: '<note id="1"><to>Ada</to><body>Hi</body></note>' };
const toXmlReq = { json: { note: { '@_id': '1', to: 'Ada', body: 'Hi' } } };

const schemas = {
  EnvelopeOk: EnvelopeOkPlus, ExecutionMetadata: ExecutionMetadataPlus, Error400: Error400Plus,
  ConfidencePerSection: confSections('conversion'), _Tail: Tail,
  ToJsonCore, ToXmlCore, ToJsonRequest, ToXmlRequest, DiscoveryResponse: discoverySchemaPlus(),
  ToJsonResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ToJsonCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  ToXmlResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ToXmlCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ToJsonCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/to-json', summary: 'Convert XML to JSON', operationId: 'toJson', priceUsdc: 0.006, requestSchemaRef: 'ToJsonRequest', responseSchemaRef: 'ToJsonResponse', requestExample: toJsonReq, responseExample: toJsonExample },
  { method: 'post', path: '/to-xml', summary: 'Convert a JSON object to XML', operationId: 'toXml', priceUsdc: 0.006, requestSchemaRef: 'ToXmlRequest', responseSchemaRef: 'ToXmlResponse', requestExample: toXmlReq, responseExample: toXmlExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL XML→JSON + reasoning', operationId: 'lookup', priceUsdc: 0.012, oneCall: true, requestSchemaRef: 'ToJsonRequest', responseSchemaRef: 'LookupResponse', requestExample: toJsonReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'xml-json-converter', title: 'XML JSON Converter API', version: '1.0.0',
  description: 'Deterministic XML ⇄ JSON converter — validate + parse XML to JSON (attributes preserved) and serialize JSON objects back to XML. No LLM.',
  endpoints, schemas, infoExtensions: { 'x-developer-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
```

## Generated OpenAPI spec (served at GET /xml-json-converter/openapi.json)
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "XML JSON Converter API",
    "version": "1.0.0",
    "description": "Deterministic XML ⇄ JSON converter — validate + parse XML to JSON (attributes preserved) and serialize JSON objects back to XML. No LLM.",
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
      "url": "https://orbis-apis.onrender.com/xml-json-converter"
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
                  "name": "XML JSON Converter API",
                  "version": "1.0.0",
                  "description": "Deterministic XML ⇄ JSON converter. /to-json validates and parses XML into JSON (attributes preserved with an \"@_\" prefix); /to-xml serializes a JSON object back into XML. Structural conversion via fast-xml-parser — no LLM, nothing stored.",
                  "openapi_url": "https://orbis-apis.onrender.com/xml-json-converter/openapi.json",
                  "auth": {
                    "type": "apiKey",
                    "header": "X-API-Key"
                  },
                  "capabilities": [
                    "xml_to_json",
                    "json_to_xml",
                    "xml_validation",
                    "attribute_preservation"
                  ],
                  "typical_use_cases": [
                    "Parse an XML API response or feed into JSON for programmatic use",
                    "Serialize a JSON object back into XML for a legacy/SOAP endpoint",
                    "Validate that a string is well-formed XML before processing it"
                  ],
                  "input_examples": [
                    {
                      "endpoint": "/to-json",
                      "body": {
                        "xml": "<note id=\"1\"><to>Ada</to><body>Hi</body></note>"
                      }
                    },
                    {
                      "endpoint": "/to-xml",
                      "body": {
                        "json": {
                          "note": {
                            "@_id": "1",
                            "to": "Ada",
                            "body": "Hi"
                          }
                        }
                      }
                    }
                  ],
                  "output_examples": [
                    {
                      "endpoint": "/to-json",
                      "response": {
                        "json": {
                          "note": {
                            "to": "Ada",
                            "body": "Hi",
                            "@_id": 1
                          }
                        },
                        "source_length": 47,
                        "root_elements": [
                          "note"
                        ],
                        "attributes_preserved": true
                      }
                    },
                    {
                      "endpoint": "/to-xml",
                      "response": {
                        "xml": "<note id=\"1\">\n  <to>Ada</to>\n  <body>Hi</body>\n</note>\n",
                        "xml_length": 55
                      }
                    }
                  ],
                  "endpoints": [
                    {
                      "method": "POST",
                      "path": "/to-json",
                      "summary": "Convert XML to JSON",
                      "price_usdc": 0.006
                    },
                    {
                      "method": "POST",
                      "path": "/to-xml",
                      "summary": "Convert a JSON object to XML",
                      "price_usdc": 0.006
                    },
                    {
                      "method": "POST",
                      "path": "/lookup",
                      "summary": "ONE-CALL XML→JSON + reasoning",
                      "price_usdc": 0.012
                    }
                  ],
                  "pricing": [
                    {
                      "path": "/to-json",
                      "price_usdc": 0.006,
                      "currency": "USDC"
                    },
                    {
                      "path": "/to-xml",
                      "price_usdc": 0.006,
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
    "/to-json": {
      "post": {
        "operationId": "toJson",
        "summary": "Convert XML to JSON",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ToJsonResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "json": {
                    "note": {
                      "to": "Ada",
                      "body": "Hi",
                      "@_id": 1
                    }
                  },
                  "source_length": 47,
                  "root_elements": [
                    "note"
                  ],
                  "attributes_preserved": true,
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "conversion": 1
                  },
                  "recommended_actions_priority_order": [
                    "Parsed XML into JSON with 1 root element(s)."
                  ],
                  "chain_to": [
                    {
                      "api": "data-format-converter",
                      "reason": "Convert the resulting JSON onward to YAML or TOML."
                    },
                    {
                      "api": "jsonpath",
                      "reason": "Query or extract fields from the converted JSON structure."
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
                "$ref": "#/components/schemas/ToJsonRequest"
              },
              "example": {
                "xml": "<note id=\"1\"><to>Ada</to><body>Hi</body></note>"
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
    "/to-xml": {
      "post": {
        "operationId": "toXml",
        "summary": "Convert a JSON object to XML",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ToXmlResponse"
                },
                "example": {
                  "trace_id": "gbx-1780000000000",
                  "request_id": "gbx-1780000000000",
                  "computed_at": "2026-06-16T12:00:00.000Z",
                  "success": true,
                  "latency_ms": 1,
                  "xml": "<note id=\"1\">\n  <to>Ada</to>\n  <body>Hi</body>\n</note>\n",
                  "xml_length": 55,
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "conversion": 1
                  },
                  "recommended_actions_priority_order": [
                    "Serialized JSON into 55 characters of XML."
                  ],
                  "chain_to": [
                    {
                      "api": "data-format-converter",
                      "reason": "Convert the resulting JSON onward to YAML or TOML."
                    },
                    {
                      "api": "jsonpath",
                      "reason": "Query or extract fields from the converted JSON structure."
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
                "$ref": "#/components/schemas/ToXmlRequest"
              },
              "example": {
                "json": {
                  "note": {
                    "@_id": "1",
                    "to": "Ada",
                    "body": "Hi"
                  }
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
        "summary": "ONE-CALL XML→JSON + reasoning",
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
                  "json": {
                    "note": {
                      "to": "Ada",
                      "body": "Hi",
                      "@_id": 1
                    }
                  },
                  "source_length": 47,
                  "root_elements": [
                    "note"
                  ],
                  "attributes_preserved": true,
                  "reasoning": {
                    "why_result_generated": "Validated the input as well-formed XML and parsed it into JSON with 1 root element(s), preserving attributes under the \"@_\" prefix.",
                    "key_factors": [
                      "Source length: 47 chars.",
                      "Root elements: note.",
                      "Attributes preserved: true."
                    ],
                    "invalidators": [
                      "XML attributes are preserved on the JSON side with the \"@_\" prefix (e.g. <a id=\"1\"/> → {\"a\":{\"@_id\":\"1\"}}); set preserve_attributes:false on /to-json to drop them.",
                      "Conversion follows the fast-xml-parser data model: repeated sibling elements collapse into an array, text content uses the \"#text\" key alongside attributes, and the model is NOT guaranteed to round-trip byte-for-byte (whitespace, comments, CDATA framing and namespace prefixes may shift).",
                      "/to-xml requires a JSON object at the top level; arrays or scalars are rejected. Numeric/boolean attribute values are parsed on the way in."
                    ]
                  },
                  "confidence_score": 1,
                  "confidence_per_section": {
                    "conversion": 1
                  },
                  "recommended_actions_priority_order": [
                    "Parsed XML into JSON with 1 root element(s)."
                  ],
                  "chain_to": [
                    {
                      "api": "data-format-converter",
                      "reason": "Convert the resulting JSON onward to YAML or TOML."
                    },
                    {
                      "api": "jsonpath",
                      "reason": "Query or extract fields from the converted JSON structure."
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
                "$ref": "#/components/schemas/ToJsonRequest"
              },
              "example": {
                "xml": "<note id=\"1\"><to>Ada</to><body>Hi</body></note>"
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
      "ToJsonCore": {
        "type": "object",
        "required": [
          "json",
          "source_length",
          "root_elements",
          "attributes_preserved"
        ],
        "properties": {
          "json": {
            "description": "The parsed XML as a JSON value (object; attributes under the \"@_\" prefix)."
          },
          "source_length": {
            "type": "integer",
            "minimum": 0,
            "description": "Character length of the input XML."
          },
          "root_elements": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Top-level element names (excluding the XML declaration)."
          },
          "attributes_preserved": {
            "type": "boolean",
            "description": "Whether XML attributes were kept on the JSON side."
          }
        }
      },
      "ToXmlCore": {
        "type": "object",
        "required": [
          "xml",
          "xml_length"
        ],
        "properties": {
          "xml": {
            "type": "string",
            "description": "The JSON object serialized as XML."
          },
          "xml_length": {
            "type": "integer",
            "minimum": 0,
            "description": "Character length of \"xml\"."
          }
        }
      },
      "ToJsonRequest": {
        "type": "object",
        "required": [
          "xml"
        ],
        "additionalProperties": false,
        "properties": {
          "xml": {
            "type": "string",
            "maxLength": 1000000,
            "description": "A well-formed XML document."
          },
          "preserve_attributes": {
            "type": "boolean",
            "description": "Keep XML attributes (prefixed \"@_\") in the JSON output. Default true."
          }
        }
      },
      "ToXmlRequest": {
        "type": "object",
        "required": [
          "json"
        ],
        "additionalProperties": false,
        "properties": {
          "json": {
            "description": "A JSON object (or a JSON string that parses to an object) to serialize as XML."
          },
          "format": {
            "type": "boolean",
            "description": "Pretty-print the XML with indentation. Default true."
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
      "ToJsonResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/ToJsonCore"
          },
          {
            "$ref": "#/components/schemas/_Tail"
          }
        ],
        "unevaluatedProperties": false
      },
      "ToXmlResponse": {
        "allOf": [
          {
            "$ref": "#/components/schemas/EnvelopeOk"
          },
          {
            "$ref": "#/components/schemas/ToXmlCore"
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
            "$ref": "#/components/schemas/ToJsonCore"
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
### POST /to-json
Request:
```json
{
  "xml": "<note id=\"1\"><to>Ada</to><body>Hi</body></note>"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "paxr682t-1781739719145",
  "request_id": "paxr682t-1781739719145",
  "computed_at": "2026-06-17T23:41:59.145Z",
  "success": true,
  "latency_ms": 1,
  "json": {
    "note": {
      "to": "Ada",
      "body": "Hi",
      "@_id": 1
    }
  },
  "source_length": 47,
  "root_elements": [
    "note"
  ],
  "attributes_preserved": true,
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Parsed XML into JSON with 1 root element(s)."
  ],
  "chain_to": [
    {
      "api": "data-format-converter",
      "reason": "Convert the resulting JSON onward to YAML or TOML."
    },
    {
      "api": "jsonpath",
      "reason": "Query or extract fields from the converted JSON structure."
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

### POST /to-xml
Request:
```json
{
  "json": {
    "note": {
      "@_id": "1",
      "to": "Ada",
      "body": "Hi"
    }
  }
}
```
Response (HTTP 200):
```json
{
  "trace_id": "0m3hzn0j-1781739719151",
  "request_id": "0m3hzn0j-1781739719151",
  "computed_at": "2026-06-17T23:41:59.151Z",
  "success": true,
  "latency_ms": 1,
  "xml": "<note id=\"1\">\n  <to>Ada</to>\n  <body>Hi</body>\n</note>\n",
  "xml_length": 55,
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Serialized JSON into 55 characters of XML."
  ],
  "chain_to": [
    {
      "api": "data-format-converter",
      "reason": "Convert the resulting JSON onward to YAML or TOML."
    },
    {
      "api": "jsonpath",
      "reason": "Query or extract fields from the converted JSON structure."
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
  "xml": "<note id=\"1\"><to>Ada</to><body>Hi</body></note>"
}
```
Response (HTTP 200):
```json
{
  "trace_id": "uaqimwof-1781739719156",
  "request_id": "uaqimwof-1781739719156",
  "computed_at": "2026-06-17T23:41:59.156Z",
  "success": true,
  "latency_ms": 0,
  "json": {
    "note": {
      "to": "Ada",
      "body": "Hi",
      "@_id": 1
    }
  },
  "source_length": 47,
  "root_elements": [
    "note"
  ],
  "attributes_preserved": true,
  "reasoning": {
    "why_result_generated": "Validated the input as well-formed XML and parsed it into JSON with 1 root element(s), preserving attributes under the \"@_\" prefix.",
    "key_factors": [
      "Source length: 47 chars.",
      "Root elements: note.",
      "Attributes preserved: true."
    ],
    "invalidators": [
      "XML attributes are preserved on the JSON side with the \"@_\" prefix (e.g. <a id=\"1\"/> → {\"a\":{\"@_id\":\"1\"}}); set preserve_attributes:false on /to-json to drop them.",
      "Conversion follows the fast-xml-parser data model: repeated sibling elements collapse into an array, text content uses the \"#text\" key alongside attributes, and the model is NOT guaranteed to round-trip byte-for-byte (whitespace, comments, CDATA framing and namespace prefixes may shift).",
      "/to-xml requires a JSON object at the top level; arrays or scalars are rejected. Numeric/boolean attribute values are parsed on the way in."
    ]
  },
  "confidence_score": 1,
  "confidence_per_section": {
    "conversion": 1
  },
  "recommended_actions_priority_order": [
    "Parsed XML into JSON with 1 root element(s)."
  ],
  "chain_to": [
    {
      "api": "data-format-converter",
      "reason": "Convert the resulting JSON onward to YAML or TOML."
    },
    {
      "api": "jsonpath",
      "reason": "Query or extract fields from the converted JSON structure."
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
### POST /to-json (error: malformed XML)
Request:
```json
{
  "xml": "<a><b></a>"
}
```
Response (HTTP 400):
```json
{
  "trace_id": "38xgo7jt-1781739719161",
  "request_id": "38xgo7jt-1781739719161",
  "computed_at": "2026-06-17T23:41:59.161Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "Input is not well-formed XML: Expected closing tag 'b' (opened in line 1, col 4) instead of closing tag 'a'. (line 1)."
  }
}
```

### POST /to-xml (error: array top-level)
Request:
```json
{
  "json": [
    1,
    2,
    3
  ]
}
```
Response (HTTP 400):
```json
{
  "trace_id": "xz6nsx3d-1781739719163",
  "request_id": "xz6nsx3d-1781739719163",
  "computed_at": "2026-06-17T23:41:59.163Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"json\" must be a JSON object (or a JSON string that parses to an object)."
  }
}
```

### POST /to-xml (error: bad JSON string)
Request:
```json
{
  "json": "{bad"
}
```
Response (HTTP 400):
```json
{
  "trace_id": "wwwem15r-1781739719165",
  "request_id": "wwwem15r-1781739719165",
  "computed_at": "2026-06-17T23:41:59.165Z",
  "success": false,
  "latency_ms": 0,
  "error": {
    "code": "invalid_request",
    "message": "\"json\" is a string but not valid JSON: Expected property name or '}' in JSON at position 1 (line 1 column 2)"
  }
}
```

