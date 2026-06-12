import { Router, Request, Response } from 'express';
import { str, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { respond, fail } from '../../_aplus/scaffold';

// Deterministic prompt-template renderer + variable validator. Substitutes
// {{ var }} / {{ a.b.c }} placeholders (dotted paths into the variables object)
// and reports which variables the template references, which are missing, and
// which provided variables go unused. Missing placeholders are kept, emptied, or
// flagged per missing_behavior. Pure string templating — no logic/loops, no LLM.

const router = Router();
const MAX_CHARS = 200_000;
// {{ name }} / {{ a.b.c }} (default) and ${ name } (dollar_brace mode).
const RE_DOUBLE = /\{\{\s*([A-Za-z0-9_$][A-Za-z0-9_$.]*)\s*\}\}/g;
const RE_DOLLAR = /\$\{\s*([A-Za-z0-9_$][A-Za-z0-9_$.]*)\s*\}/g;

type Missing = 'keep' | 'empty' | 'error';
type Syntax = 'double_brace' | 'dollar_brace';

export interface RenderCore {
  syntax: Syntax;
  variables_in_template: string[]; variables_provided: string[];
  missing_variables: string[]; unused_variables: string[]; duplicate_placeholders: string[];
  resolved_variable_map: Record<string, string>;
  placeholder_count: number; unique_variable_count: number; all_resolved: boolean;
  missing_behavior: Missing; rendered: string | null; rendered_length: number | null;
}

function resolve(vars: Record<string, unknown>, path: string): unknown {
  const segs = path.split('.');
  let cur: any = vars;
  for (const s of segs) {
    if (cur === null || typeof cur !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(cur, s)) return undefined;
    cur = cur[s];
  }
  return cur;
}

function fmt(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v === undefined) return '';
  try { return JSON.stringify(v); } catch { return String(v); }
}

export function render(body: any): { error: string } | { result: RenderCore } {
  const template = str(body?.template);
  if (template === undefined) return { error: 'Provide "template" as a non-empty string.' };
  if (template.length > MAX_CHARS) return { error: `"template" exceeds the ${MAX_CHARS}-character limit (${template.length}).` };

  const varsIn = body?.variables;
  if (varsIn !== undefined && (varsIn === null || typeof varsIn !== 'object' || Array.isArray(varsIn))) {
    return { error: '"variables" must be an object mapping names to values.' };
  }
  const vars: Record<string, unknown> = varsIn ?? {};

  const mbIn = body?.missing_behavior;
  if (mbIn !== undefined && !['keep', 'empty', 'error'].includes(mbIn)) return { error: '"missing_behavior" must be one of: keep, empty, error.' };
  const missing_behavior: Missing = mbIn ?? 'keep';

  const synIn = body?.syntax;
  if (synIn !== undefined && !['double_brace', 'dollar_brace'].includes(synIn)) return { error: '"syntax" must be one of: double_brace, dollar_brace.' };
  const syntax: Syntax = synIn ?? 'double_brace';
  const RE = syntax === 'dollar_brace' ? RE_DOLLAR : RE_DOUBLE;

  // Scan placeholders (preserve first-seen order; count repeats)
  const order: string[] = [];
  const seen = new Set<string>();
  const pathCounts = new Map<string, number>();
  let placeholder_count = 0;
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(template)) !== null) {
    placeholder_count++;
    const path = m[1];
    pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
    if (!seen.has(path)) { seen.add(path); order.push(path); }
  }
  const duplicate_placeholders = order.filter((p) => (pathCounts.get(p) ?? 0) > 1);

  const missingSet = new Set<string>();
  const resolved_variable_map: Record<string, string> = {};
  for (const path of order) {
    const v = resolve(vars, path);
    if (v === undefined) missingSet.add(path);
    else resolved_variable_map[path] = fmt(v);
  }

  const variables_provided = Object.keys(vars);
  const usedRoots = new Set(order.map((p) => p.split('.')[0]));
  const unused_variables = variables_provided.filter((k) => !usedRoots.has(k));
  const all_resolved = missingSet.size === 0;

  let rendered: string | null;
  let rendered_length: number | null;
  if (missing_behavior === 'error' && !all_resolved) {
    rendered = null; rendered_length = null;
  } else {
    rendered = template.replace(RE, (whole, path) => {
      const v = resolve(vars, path);
      if (v === undefined) return missing_behavior === 'empty' ? '' : whole; // 'keep'
      return fmt(v);
    });
    rendered_length = rendered.length;
  }

  return {
    result: {
      syntax,
      variables_in_template: order, variables_provided,
      missing_variables: [...missingSet], unused_variables, duplicate_placeholders,
      resolved_variable_map,
      placeholder_count, unique_variable_count: order.length, all_resolved,
      missing_behavior, rendered, rendered_length,
    },
  };
}

function actions(r: RenderCore): string[] {
  const out: string[] = [];
  if (r.all_resolved) out.push(`All ${r.unique_variable_count} template variable(s) resolved across ${r.placeholder_count} placeholder(s).`);
  else out.push(`Missing ${r.missing_variables.length} variable(s): [${r.missing_variables.join(', ')}] — ${r.missing_behavior === 'error' ? 'rendered is null until supplied' : r.missing_behavior === 'empty' ? 'rendered with empty strings' : 'left as literal {{...}}'}.`);
  if (r.unused_variables.length) out.push(`Unused provided variable(s): [${r.unused_variables.join(', ')}].`);
  return out;
}

const CHAIN_TO = [
  { api: 'llm-token-counter', reason: 'Estimate tokens + cost of the rendered prompt.' },
  { api: 'context-budget-planner', reason: 'Check the rendered prompt fits the model context window.' },
];
const INVALIDATORS = [
  'Only {{ name }} / {{ a.b.c }} placeholders are substituted — no conditionals, loops, or filters are evaluated.',
  'Non-string values are JSON-stringified; a different serialization (e.g. quoting) changes the rendered output.',
  'A variable resolving to null/false/0 is treated as provided (not missing) and rendered literally.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Prompt Template Renderer & Variable Validator API', version: '1.0.0',
    description: 'Deterministic prompt-template renderer. Substitutes {{ var }} / {{ a.b.c }} placeholders from a variables object and reports referenced, missing, and unused variables. Missing placeholders are kept, emptied, or flagged per missing_behavior. Pure string templating — no logic, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/prompt-template-renderer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/render', summary: 'Render a template + validate variables', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL render + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/render', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/render', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = render(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 1, confidence_per_section: { render: 1 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = render(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.placeholder_count} placeholder(s), ${v.unique_variable_count} unique variable(s); ${v.all_resolved ? 'all resolved' : `${v.missing_variables.length} missing`}.`,
      key_factors: [`Referenced (${v.syntax}): ${v.variables_in_template.join(', ') || 'none'}.`, v.missing_variables.length ? `Missing: ${v.missing_variables.join(', ')}.` : 'No missing variables.', `missing_behavior=${v.missing_behavior}${v.duplicate_placeholders.length ? `; duplicated: ${v.duplicate_placeholders.join(', ')}` : ''}.`],
      invalidators: INVALIDATORS,
    },
    confidence_score: 1, confidence_per_section: { render: 1 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
