import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { str, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic linter for LLM tool / function-calling JSON schemas. Walks a tool
// definition ({name, description, parameters|input_schema}) and flags pitfalls that
// make models call the tool wrong: missing types/descriptions, objects that don't
// pin additionalProperties:false, required keys absent from properties, $ref and
// composition keywords many providers don't resolve, deep nesting, bad tool names.
// Pure rule checks — no LLM. Rules are best-practice heuristics; provider support
// varies (stated as an invalidator), so confidence is high but < 1.0.

const router = Router();
const NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_NODES = 4000;
const MAX_DEPTH = 6;

type Severity = 'error' | 'warning' | 'info';
export interface Finding { severity: Severity; code: string; path: string; message: string; }
export interface LintCore {
  tool_name: string | null; has_parameters: boolean; property_count: number;
  findings: Finding[]; counts: { error: number; warning: number; info: number; total: number };
  lint_score: number; passed: boolean;
}

const PRIM = new Set(['string', 'number', 'integer', 'boolean', 'null']);

export function lint(body: any): { error: string } | { result: LintCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Provide a tool definition object with a "parameters" or "input_schema" JSON Schema.' };
  }
  const tool = (body.tool && typeof body.tool === 'object') ? body.tool : body;
  const findings: Finding[] = [];
  const add = (severity: Severity, code: string, path: string, message: string) => findings.push({ severity, code, path, message });

  // ---- tool-level ----
  const name = tool.name;
  if (name === undefined || name === null || name === '') add('error', 'TOOL_NAME_MISSING', 'name', 'Tool has no "name".');
  else if (typeof name !== 'string' || !NAME_RE.test(name)) add('error', 'TOOL_NAME_INVALID', 'name', 'Tool "name" must match ^[a-zA-Z0-9_-]{1,64}$ (provider tool-name constraint).');

  const desc = tool.description;
  if (typeof desc !== 'string' || desc.trim() === '') add('warning', 'TOOL_DESCRIPTION_MISSING', 'description', 'Tool has no "description" — models rely on it to decide when to call.');
  else if (desc.trim().length < 12) add('info', 'TOOL_DESCRIPTION_SHORT', 'description', 'Tool "description" is very short; add intent, inputs, and when to use it.');

  const schema = (tool.parameters && typeof tool.parameters === 'object') ? tool.parameters
    : (tool.input_schema && typeof tool.input_schema === 'object') ? tool.input_schema : undefined;
  const schemaKey = tool.parameters !== undefined ? 'parameters' : 'input_schema';

  let property_count = 0;
  let has_parameters = false;
  if (schema === undefined) {
    add('info', 'NO_PARAMETERS', 'parameters', 'No "parameters"/"input_schema" — tool takes no arguments (intended only for zero-arg tools).');
  } else if (Array.isArray(schema)) {
    add('error', 'PARAMETERS_NOT_OBJECT', schemaKey, '"parameters"/"input_schema" must be a JSON Schema object, not an array.');
  } else {
    has_parameters = true;
    if (schema.type !== undefined && schema.type !== 'object') {
      add('warning', 'ROOT_NOT_OBJECT', schemaKey, 'Top-level tool schema should be type "object" so arguments are a named map.');
    }
    if (schema.properties && typeof schema.properties === 'object') property_count = Object.keys(schema.properties).length;

    // ---- recursive schema walk ----
    let nodes = 0;
    let truncated = false;
    const walk = (node: any, path: string, depth: number) => {
      if (truncated) return;
      if (++nodes > MAX_NODES) { truncated = true; return; }
      if (node === null || typeof node !== 'object' || Array.isArray(node)) {
        add('warning', 'SCHEMA_NODE_NOT_OBJECT', path, 'Schema node is not an object.');
        return;
      }
      if (depth > MAX_DEPTH) { add('warning', 'DEEP_NESTING', path, `Schema nests deeper than ${MAX_DEPTH} levels — models lose track of deeply nested arguments.`); return; }

      if (node.$ref !== undefined) add('warning', 'REF_UNSUPPORTED', path, '$ref is not reliably resolved by all tool-calling providers; inline the schema instead.');
      for (const k of ['oneOf', 'anyOf', 'allOf']) {
        if (node[k] !== undefined) {
          add('info', 'COMPOSITION_KEYWORD', `${path}.${k}`, `"${k}" composition is handled inconsistently across models; prefer a flat schema or an enum where possible.`);
          if (Array.isArray(node[k])) node[k].forEach((s: any, i: number) => walk(s, `${path}.${k}[${i}]`, depth + 1));
        }
      }

      const hasComposition = node.$ref !== undefined || node.oneOf || node.anyOf || node.allOf || node.enum !== undefined || node.const !== undefined;
      if (node.type === undefined && !hasComposition) {
        add('warning', 'MISSING_TYPE', path, 'Schema node has no "type" (and no enum/const/composition) — ambiguous for the model.');
      }

      if (node.enum !== undefined) {
        if (!Array.isArray(node.enum) || node.enum.length === 0) add('error', 'ENUM_EMPTY', `${path}.enum`, '"enum" must be a non-empty array.');
        else if (node.enum.some((v: any) => v !== null && typeof v === 'object')) add('warning', 'ENUM_NON_PRIMITIVE', `${path}.enum`, '"enum" contains non-primitive values; models reproduce primitive enums far more reliably.');
      }

      const t = node.type;
      if (t === 'object' || (node.properties !== undefined)) {
        const props = node.properties;
        if (props === undefined || typeof props !== 'object') {
          if (node.additionalProperties === undefined) add('warning', 'OBJECT_NO_PROPERTIES', path, 'Object schema declares no "properties" and no "additionalProperties" — the model gets no field guidance.');
        } else {
          if (node.additionalProperties !== false) add('warning', 'ADDITIONAL_PROPERTIES_NOT_FALSE', path, 'Set "additionalProperties": false so the model cannot invent extra arguments.');
          const req = Array.isArray(node.required) ? node.required : [];
          for (const r of req) if (!(r in props)) add('error', 'REQUIRED_NOT_IN_PROPERTIES', `${path}.required`, `Required property "${r}" is not defined in "properties".`);
          for (const [pk, pv] of Object.entries(props)) {
            const ppath = `${path}.properties.${pk}`;
            if (pv && typeof pv === 'object' && !Array.isArray(pv)) {
              if (typeof (pv as any).description !== 'string' || !(pv as any).description.trim()) add('info', 'PROPERTY_NO_DESCRIPTION', ppath, `Property "${pk}" has no "description".`);
            }
            walk(pv, ppath, depth + 1);
          }
        }
      }
      if (t === 'array' || node.items !== undefined) {
        if (node.items === undefined) add('warning', 'ARRAY_NO_ITEMS', path, 'Array schema has no "items" — element shape is unspecified.');
        else if (Array.isArray(node.items)) node.items.forEach((it: any, i: number) => walk(it, `${path}.items[${i}]`, depth + 1));
        else walk(node.items, `${path}.items`, depth + 1);
      }
    };
    walk(schema, schemaKey, 1);
    if (truncated) add('info', 'SCHEMA_TRUNCATED', schemaKey, `Schema exceeds ${MAX_NODES} nodes; linting stopped early.`);
  }

  const counts = { error: 0, warning: 0, info: 0, total: findings.length };
  for (const f of findings) counts[f.severity]++;
  let lint_score = 100 - counts.error * 25 - counts.warning * 8 - counts.info * 2;
  if (lint_score < 0) lint_score = 0;

  return {
    result: {
      tool_name: typeof name === 'string' ? name : null,
      has_parameters, property_count, findings, counts, lint_score, passed: counts.error === 0,
    },
  };
}

function actions(r: LintCore): string[] {
  const out: string[] = [];
  if (r.passed) out.push(`No errors — tool schema is structurally callable (score ${r.lint_score}/100, ${r.counts.warning} warning(s), ${r.counts.info} note(s)).`);
  else out.push(`${r.counts.error} error(s) make this tool risky to call — fix them first (score ${r.lint_score}/100).`);
  const first = r.findings.find((f) => f.severity === 'error') || r.findings.find((f) => f.severity === 'warning');
  if (first) out.push(`Top issue: [${first.code}] at ${first.path} — ${first.message}`);
  out.push('Lint rules are best-practice heuristics; confirm against your specific provider\'s tool-use docs.');
  return out;
}

const CHAIN_TO = [
  { api: 'function-arg-validator', reason: 'Validate concrete tool-call arguments against this schema.' },
  { api: 'json-repair', reason: 'Salvage a malformed tool-call arguments blob before validating it.' },
];
const CONF = { lint: 0.9 };
const INVALIDATORS = [
  'Lint rules are best-practice heuristics for LLM tool-calling, not a JSON Schema spec conformance check.',
  'Provider support varies — some models handle $ref/oneOf/anyOf fine while others do not; verify against your provider.',
  'A high score means structurally sound, not that the descriptions actually guide the model well.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Tool / Function-Schema Linter API', version: '1.0.0',
    description: 'Deterministic linter for LLM tool / function-calling JSON schemas. Flags pitfalls that make models call tools wrong: missing types/descriptions, additionalProperties not pinned to false, required keys absent from properties, $ref/composition keywords, deep nesting, and invalid tool names. Pure rule checks — no LLM. Returns findings, counts, a lint score and pass/fail.',
    openapi_url: 'https://orbis-apis.onrender.com/tool-schema-linter/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/lint', summary: 'Lint a tool/function schema', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL lint + reasoning', price_usdc: 0.009 },
    ],
    pricing: [
      { path: '/lint', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/lint', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = lint(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 0.9, confidence_per_section: CONF,
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = lint(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.findings.length} finding(s) (${v.counts.error} error, ${v.counts.warning} warning, ${v.counts.info} info) → score ${v.lint_score}/100, ${v.passed ? 'passed' : 'failed'}.`,
      key_factors: [`Tool "${v.tool_name ?? '(unnamed)'}", ${v.property_count} top-level propert${v.property_count === 1 ? 'y' : 'ies'}.`, v.passed ? 'No structural errors.' : `${v.counts.error} error(s) block reliable calling.`, 'Score = 100 − 25·errors − 8·warnings − 2·info (floored at 0).'],
      invalidators: INVALIDATORS,
    },
    confidence_score: 0.9, confidence_per_section: CONF,
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
