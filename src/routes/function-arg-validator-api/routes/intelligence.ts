import { Router, Request, Response } from 'express';
import Ajv2020, { ErrorObject } from 'ajv/dist/2020';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic validator for LLM function-call / tool-call arguments against a
// JSON Schema, powered by ajv (2020 dialect). Reports pass/fail with normalized
// errors, the missing-required and unexpected-extra keys, and a second "coercion"
// pass (string→number/boolean, defaults applied) showing whether light coercion
// would make the arguments valid — useful when a model emits stringified numbers.
// Real JSON Schema validation (confidence 1.0); only the dialect/provider caveats
// qualify it. No LLM.

const router = Router();
const MAX_BYTES = 256 * 1024;
const MAX_ERRORS = 100;

export interface NormErr { instance_path: string; keyword: string; message: string; }
export interface ArgCore {
  schema_dialect: string; validation_mode: string;
  valid: boolean; error_count: number; errors: NormErr[];
  missing_required: string[]; extra_properties: string[];
  coercion_applied: boolean; valid_after_coercion: boolean; coerced_arguments: unknown;
}

function normalize(errs: ErrorObject[] | null | undefined): NormErr[] {
  if (!errs) return [];
  return errs.slice(0, MAX_ERRORS).map((e) => ({
    instance_path: e.instancePath || '/',
    keyword: e.keyword,
    message: e.message || 'invalid',
  }));
}

export function validateArgs(body: any): { error: string } | { result: ArgCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "schema" (JSON Schema) and "arguments".' };
  const schema = body.schema;
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) return { error: '"schema" must be a JSON Schema object.' };
  if (!('arguments' in body)) return { error: 'Provide "arguments" (an object, or a JSON string to parse) to validate.' };

  let args = body.arguments;
  let parsed_from_string = false;
  if (typeof args === 'string') {
    try { args = JSON.parse(args); parsed_from_string = true; }
    catch { return { error: '"arguments" is a string but not valid JSON — repair it first (see json-repair).' }; }
  }

  if (JSON.stringify(schema).length > MAX_BYTES) return { error: `"schema" exceeds the ${MAX_BYTES}-byte limit.` };
  let argsBytes: string;
  try { argsBytes = JSON.stringify(args ?? null); } catch { return { error: '"arguments" is not JSON-serializable.' }; }
  if (argsBytes.length > MAX_BYTES) return { error: `"arguments" exceeds the ${MAX_BYTES}-byte limit.` };

  // Strict validation
  let strictValidate: any;
  try {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    strictValidate = ajv.compile(schema);
  } catch (e: any) {
    return { error: `"schema" is not a compilable JSON Schema: ${e?.message || e}` };
  }
  const valid = strictValidate(args) === true;
  const errors = normalize(strictValidate.errors);

  const missing_required: string[] = [];
  const extra_properties: string[] = [];
  for (const e of strictValidate.errors || []) {
    if (e.keyword === 'required' && e.params && typeof (e.params as any).missingProperty === 'string') missing_required.push((e.params as any).missingProperty);
    if (e.keyword === 'additionalProperties' && e.params && typeof (e.params as any).additionalProperty === 'string') extra_properties.push((e.params as any).additionalProperty);
  }

  // Coercion pass (does not mutate the strict result)
  let valid_after_coercion = valid;
  let coerced_arguments: unknown = args;
  let coercion_applied = false;
  try {
    const clone = JSON.parse(argsBytes);
    const ajvC = new Ajv2020({ strict: false, allErrors: true, coerceTypes: true, useDefaults: true });
    const cv = ajvC.compile(schema);
    valid_after_coercion = cv(clone) === true;
    coerced_arguments = clone;
    coercion_applied = JSON.stringify(clone) !== argsBytes;
  } catch { /* keep strict values */ }

  return {
    result: {
      schema_dialect: '2020-12', validation_mode: 'strict',
      valid, error_count: errors.length, errors,
      missing_required: [...new Set(missing_required)], extra_properties: [...new Set(extra_properties)],
      coercion_applied, valid_after_coercion, coerced_arguments,
    },
  };
}

function actions(r: ArgCore): string[] {
  const out: string[] = [];
  if (r.valid) out.push('Arguments are valid against the schema — safe to dispatch the tool call.');
  else {
    out.push(`Invalid: ${r.error_count} error(s)${r.missing_required.length ? `, missing [${r.missing_required.join(', ')}]` : ''}${r.extra_properties.length ? `, unexpected [${r.extra_properties.join(', ')}]` : ''}.`);
    if (!r.valid && r.valid_after_coercion) out.push('Light coercion (string→number/boolean, defaults) WOULD make it valid — use coerced_arguments instead of re-prompting.');
    else out.push('Coercion does not fix it — re-prompt the model with the error messages.');
  }
  return out;
}

const CHAIN_TO = [
  { api: 'json-repair', reason: 'Salvage a malformed arguments JSON string before validating.' },
  { api: 'tool-schema-linter', reason: 'Lint the schema itself if validation keeps failing unexpectedly.' },
];
const CONF = { validation: 1, coercion: 0.9 };
const INVALIDATORS = [
  'Validation uses the JSON Schema 2020-12 dialect (ajv, strict:false); a provider that targets a different draft may accept/reject differently.',
  'The coercion pass is a convenience (ajv coerceTypes + defaults) — your provider may not coerce, so re-prompting can still be required.',
  'Schemas with remote $ref are not fetched; such refs fail to compile and return a 400.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Function-Call Argument Validator API', version: '1.0.0',
    description: 'Deterministic validator for LLM function/tool-call arguments against a JSON Schema (ajv, 2020-12 dialect). Returns pass/fail, normalized errors, missing-required and unexpected-extra keys, and a coercion pass showing whether string→number/boolean coercion + defaults would make the arguments valid. No LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/function-arg-validator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/validate', summary: 'Validate arguments against a JSON Schema', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL validation + coercion + reasoning', price_usdc: 0.009 },
    ],
    pricing: [
      { path: '/validate', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/validate', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = validateArgs(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 1, confidence_per_section: CONF,
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = validateArgs(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.valid ? 'Valid' : `Invalid (${v.error_count} error(s))`}${!v.valid && v.valid_after_coercion ? '; valid after coercion' : ''}.`,
      key_factors: [v.valid ? 'Passed strict validation.' : `Strict errors: ${v.error_count}.`, v.missing_required.length ? `Missing required: ${v.missing_required.join(', ')}.` : 'No missing required keys.', v.coercion_applied ? `Coercion changed the arguments; valid_after_coercion=${v.valid_after_coercion}.` : 'No coercion changed the arguments.'],
      invalidators: INVALIDATORS,
    },
    confidence_score: 1, confidence_per_section: CONF,
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
