import { Router, Request, Response } from 'express';
import Ajv from 'ajv';
import Ajv2019 from 'ajv/dist/2019';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const router = Router();

function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }
const now = () => new Date().toISOString();

// ---- ajv selection by draft -------------------------------------------------
function draftOf(schema: any): { version: string; ctor: 'draft07' | 'draft2019' | 'draft2020' } {
  const s = (schema?.$schema || '').toString();
  if (/2020-12/.test(s)) return { version: 'draft-2020-12', ctor: 'draft2020' };
  if (/2019-09/.test(s)) return { version: 'draft-2019-09', ctor: 'draft2019' };
  return { version: 'draft-07', ctor: 'draft07' };
}
function makeAjv(ctor: 'draft07' | 'draft2019' | 'draft2020'): any {
  const opts = { allErrors: true, strict: false, validateFormats: true };
  const inst = ctor === 'draft2020' ? new (Ajv2020 as any)(opts) : ctor === 'draft2019' ? new (Ajv2019 as any)(opts) : new (Ajv as any)(opts);
  addFormats(inst);
  return inst;
}

// Map an ajv error to the published error shape.
function mapError(e: any) {
  return {
    path: e.instancePath || '(root)',
    message: e.message || 'validation error',
    keyword: e.keyword || 'unknown',
    schema_path: e.schemaPath || '',
    params: e.params || {},
  };
}

function countLeaves(v: any): number {
  if (v === null || typeof v !== 'object') return 1;
  if (Array.isArray(v)) return v.reduce((s, x) => s + countLeaves(x), 0) || 1;
  const keys = Object.keys(v);
  return keys.length ? keys.reduce((s, k) => s + countLeaves(v[k]), 0) : 1;
}

// ---- deterministic schema inference (for /generate) -------------------------
const FMT = {
  'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  uri: /^https?:\/\/[^\s]+$/i,
};
function detectFormat(s: string): string | null {
  for (const [fmt, re] of Object.entries(FMT)) if (re.test(s)) return fmt;
  return null;
}
function inferSchema(value: any, strict: boolean): any {
  if (value === null) return { type: 'null' };
  if (Array.isArray(value)) {
    if (!value.length) return { type: 'array', items: {} };
    // merge item schemas shallowly: use first element's schema as representative
    return { type: 'array', items: inferSchema(value[0], strict) };
  }
  const t = typeof value;
  if (t === 'string') { const f = detectFormat(value); return f ? { type: 'string', format: f } : { type: 'string' }; }
  if (t === 'number') return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
  if (t === 'boolean') return { type: 'boolean' };
  if (t === 'object') {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const k of Object.keys(value)) {
      properties[k] = inferSchema(value[k], strict);
      if (strict && value[k] !== null) required.push(k);
    }
    const out: any = { type: 'object', properties };
    if (required.length) out.required = required;
    if (strict) out.additionalProperties = false;
    return out;
  }
  return {};
}

// ---- envelope helpers (preserve published trace_id/source_provenance shape) --
function provenance(freshness = 1.0) { return { provider: 'json-schema-validator', retrieved_at: now(), freshness_score: freshness }; }

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'JSON Schema Validator API', info: '/json-schema-validator/info', openapi: '/json-schema-validator/openapi.json', health: 'ok' });
});

// ---- /validate --------------------------------------------------------------
router.post('/validate', (req: Request, res: Response) => {
  const { json_data, schema } = req.body;
  if (json_data === undefined) return res.status(400).json({ error: 'json_data is required' });
  if (!schema) return res.status(400).json({ error: 'schema is required' });
  const { version, ctor } = draftOf(schema);
  const ajv = makeAjv(ctor);
  let validate: any;
  try { validate = ajv.compile(schema); }
  catch (e: any) {
    return res.json({
      trace_id: traceId(), computed_at: now(), success: false, is_valid: false,
      errors: [{ path: '(schema)', message: `Invalid schema: ${e.message}`, keyword: 'schema_compile', schema_path: '' }],
      warnings: [], schema_version: version, validated_fields: 0, error_count: 1, warning_count: 0,
      source_provenance: provenance(), cache_ttl_seconds: 60, cache_recommended: false,
      recommended_next_api: 'json-schema-validator', recommended_next_endpoint: '/generate',
      automation_safe: true, confidence_per_section: { validation: 1 },
      recommended_actions_priority_order: ['Fix the schema definition', 'Re-validate'],
      privacy: { data_stored: false, retention: 'none' },
    });
  }
  const valid = validate(json_data);
  const errors = (validate.errors || []).map(mapError);
  res.json({
    trace_id: traceId(), computed_at: now(), success: true,
    is_valid: valid, errors, warnings: [], schema_version: version,
    validated_fields: countLeaves(json_data), error_count: errors.length, warning_count: 0,
    source_provenance: provenance(), cache_ttl_seconds: 60, cache_recommended: true,
    recommended_next_api: 'json-schema-validator', recommended_next_endpoint: valid ? '/schema-intelligence' : '/fix',
    automation_safe: true, confidence_per_section: { validation: 1 },
    recommended_actions_priority_order: valid ? ['Data is valid', 'Proceed'] : ['Call /fix to repair errors', 'Resolve listed errors', 're-validate'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// ---- /generate --------------------------------------------------------------
router.post('/generate', (req: Request, res: Response) => {
  const { json_sample, schema_version, strict } = req.body;
  if (json_sample === undefined) return res.status(400).json({ error: 'json_sample is required' });
  const strictMode = strict ?? true;
  const inferred = inferSchema(json_sample, strictMode);
  const dialect = schema_version === 'draft-2020-12' ? 'https://json-schema.org/draft/2020-12/schema'
    : schema_version === 'draft-2019-09' ? 'https://json-schema.org/draft/2019-09/schema'
    : 'http://json-schema.org/draft-07/schema#';
  const schema = { $schema: dialect, ...inferred };
  const props = (inferred.type === 'object' && inferred.properties) ? inferred.properties : {};
  const required: string[] = Array.isArray(inferred.required) ? inferred.required : [];
  const allFields = Object.keys(props);
  const nullable_fields = allFields.filter(k => props[k]?.type === 'null');
  const optional_fields = allFields.filter(k => !required.includes(k));
  // verify the generated schema actually compiles + validates the sample
  const { ctor } = draftOf(schema);
  let selfValid = true;
  try { selfValid = makeAjv(ctor).compile(schema)(json_sample); } catch { selfValid = false; }
  res.json({
    trace_id: traceId(), computed_at: now(), success: true, schema,
    schema_version: schema_version || 'draft-07',
    fields_detected: allFields.length || (inferred.type === 'array' ? 1 : 0),
    nullable_fields, optional_fields, required_fields: required,
    self_validation_passed: selfValid,
    source_provenance: provenance(0.95), cache_ttl_seconds: 3600, cache_recommended: true,
    recommended_next_api: 'json-schema-validator', recommended_next_endpoint: '/validate',
    automation_safe: true, confidence_per_section: { schema: 1 },
    recommended_actions_priority_order: ['Review inferred types', 'Add descriptions/constraints', 'Validate real data'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// ---- /compare ---------------------------------------------------------------
function propsOf(s: any): Record<string, any> { return (s?.properties && typeof s.properties === 'object') ? s.properties : {}; }
function requiredOf(s: any): string[] { return Array.isArray(s?.required) ? s.required : []; }

router.post('/compare', (req: Request, res: Response) => {
  const { schema_a, schema_b } = req.body;
  if (!schema_a || !schema_b) return res.status(400).json({ error: 'schema_a and schema_b are required' });
  const pa = propsOf(schema_a), pb = propsOf(schema_b);
  const ra = requiredOf(schema_a), rb = requiredOf(schema_b);
  const additions: string[] = [];
  const removals: string[] = [];
  const type_changes: string[] = [];
  const breaking_changes: { field: string; change: string; impact: string }[] = [];

  for (const f of Object.keys(pb)) if (!(f in pa)) {
    additions.push(f);
    const nowReq = rb.includes(f);
    breaking_changes.push({ field: f, change: 'added', impact: nowReq ? 'breaking' : 'non-breaking' });
  }
  for (const f of Object.keys(pa)) if (!(f in pb)) {
    removals.push(f);
    breaking_changes.push({ field: f, change: 'removed', impact: 'breaking' });
  }
  for (const f of Object.keys(pa)) {
    if (!(f in pb)) continue;
    const ta = pa[f]?.type, tb = pb[f]?.type;
    if (ta !== tb) { type_changes.push(`${f}: ${ta} → ${tb}`); breaking_changes.push({ field: f, change: 'type_changed', impact: 'breaking' }); }
    if (!ra.includes(f) && rb.includes(f)) breaking_changes.push({ field: f, change: 'required_changed', impact: 'breaking' });
  }
  const breakingCount = breaking_changes.filter(c => c.impact === 'breaking').length;
  const compatible = breakingCount === 0;
  const migration_complexity = breakingCount === 0 ? (additions.length ? 'trivial' : 'none') : breakingCount <= 2 ? 'moderate' : 'major';
  res.json({
    trace_id: traceId(), computed_at: now(), success: true, compatible,
    breaking_changes, additions, removals, type_changes, migration_complexity,
    migration_guide: compatible
      ? (additions.length ? `Backward compatible; ${additions.length} optional field(s) added.` : 'Schemas are equivalent.')
      : `${breakingCount} breaking change(s): review removed fields, type changes, and newly-required fields before migrating clients.`,
    source_provenance: provenance(), cache_ttl_seconds: 3600, cache_recommended: true,
    recommended_next_api: 'json-schema-validator', recommended_next_endpoint: '/schema-intelligence',
    automation_safe: true, confidence_per_section: { comparison: 1 },
    recommended_actions_priority_order: compatible ? ['Safe to deploy', 'Tag minor/patch release'] : ['Review breaking changes', 'Plan migration', 'Bump major version'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// ---- /execution-gate (already deterministic; unchanged) ---------------------
router.post('/execution-gate', (req: Request, res: Response) => {
  const { json_data, objective } = req.body;
  if (json_data === undefined) return res.status(400).json({ error: 'json_data is required' });
  res.json({
    trace_id: traceId(), computed_at: now(), success: true,
    execution_ready: true, objective: objective || 'schema_validation',
    next_api: 'json-schema-validator', next_endpoint: '/validate',
    blocking_flags: [], flag_definitions: { NO_DATA: 'json_data is required', NO_SCHEMA: 'schema is required for validation' },
    source_provenance: { provider: 'system', retrieved_at: now(), freshness_score: 1.0 },
    cache_ttl_seconds: 0, cache_recommended: false,
    recommended_next_api: 'json-schema-validator', recommended_next_endpoint: '/generate',
    automation_safe: true, confidence_per_section: { execution_ready: 1 },
    recommended_actions_priority_order: ['Generate schema from sample', 'Validate data', 'Fix errors'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// ---- /schema-intelligence ---------------------------------------------------
router.post('/schema-intelligence', (req: Request, res: Response) => {
  const { json_data, schema, context } = req.body;
  if (json_data === undefined) return res.status(400).json({ error: 'json_data is required' });

  // If no schema supplied, infer one from the data.
  const effSchema = (schema && Object.keys(schema).length) ? schema : { $schema: 'http://json-schema.org/draft-07/schema#', ...inferSchema(json_data, true) };
  const { version, ctor } = draftOf(effSchema);
  const ajv = makeAjv(ctor);
  let is_valid = false; let compileErr: string | null = null; let errors: any[] = [];
  try { const v = ajv.compile(effSchema); is_valid = !!v(json_data); errors = (v.errors || []).map(mapError); }
  catch (e: any) { compileErr = e.message; }

  // deterministic quality scoring of the schema
  const issues: { path: string; issue: string; severity: string }[] = [];
  const improvement_suggestions: string[] = [];
  const props = propsOf(effSchema);
  const propKeys = Object.keys(props);
  let typed = 0, described = 0;
  for (const k of propKeys) {
    if (props[k]?.type || props[k]?.$ref || props[k]?.enum) typed++; else issues.push({ path: k, issue: 'Property has no type', severity: 'warning' });
    if (props[k]?.description) described++;
  }
  if (!effSchema.$schema) issues.push({ path: '(root)', issue: 'No $schema dialect declared', severity: 'info' });
  if (effSchema.type === 'object' && !requiredOf(effSchema).length) improvement_suggestions.push('Declare required fields to enforce presence');
  if (propKeys.length && described < propKeys.length) improvement_suggestions.push('Add descriptions to properties for better documentation');
  if (effSchema.additionalProperties === undefined) improvement_suggestions.push('Set additionalProperties:false to reject unknown fields');
  if (compileErr) issues.push({ path: '(schema)', issue: `Schema does not compile: ${compileErr}`, severity: 'error' });

  const completeness_score = propKeys.length ? Math.round((typed / propKeys.length) * 100) / 100 : (effSchema.type ? 1 : 0);
  const descScore = propKeys.length ? described / propKeys.length : 0;
  const schema_quality_score = Math.round((0.5 * completeness_score + 0.3 * descScore + 0.2 * (requiredOf(effSchema).length ? 1 : 0)) * 100) / 100;
  const inferred_purpose = effSchema.type === 'object'
    ? `Object with ${propKeys.length} propert${propKeys.length === 1 ? 'y' : 'ies'}${requiredOf(effSchema).length ? `, ${requiredOf(effSchema).length} required` : ''}`
    : `Schema of type ${effSchema.type || 'unspecified'}`;

  res.json({
    trace_id: traceId(), computed_at: now(), success: true,
    is_valid, schema_version: version, schema_quality_score, completeness_score,
    errors, issues, improvement_suggestions, inferred_purpose,
    api_compatibility: ['REST', 'GraphQL', 'gRPC'].filter(() => true),
    recommended_schema: (schema && Object.keys(schema).length) ? undefined : effSchema,
    context: context || 'API response',
    source_provenance: provenance(), cache_ttl_seconds: 3600, cache_recommended: true,
    recommended_next_api: 'json-schema-validator', recommended_next_endpoint: is_valid ? '/compare' : '/fix',
    automation_safe: true, confidence_per_section: { validation: 1, recommendations: 0.9 },
    recommended_actions_priority_order: ['Apply improvement suggestions', 'Validate with refined schema', 'Document schema'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// ---- /fix -------------------------------------------------------------------
router.post('/fix', (req: Request, res: Response) => {
  const { json_data, schema, errors: providedErrors } = req.body;
  if (json_data === undefined) return res.status(400).json({ error: 'json_data is required' });

  // Recompute errors from schema when available (authoritative); else use provided.
  let ajvErrors: any[] = [];
  if (schema && Object.keys(schema).length) {
    const { ctor } = draftOf(schema);
    try { const v = makeAjv(ctor).compile(schema); if (!v(json_data)) ajvErrors = v.errors || []; }
    catch { /* invalid schema → fall back to provided errors */ }
  }
  const errs = ajvErrors.length ? ajvErrors : (Array.isArray(providedErrors) ? providedErrors : []);

  const corrected = JSON.parse(JSON.stringify(json_data));
  const fixes: any[] = [];
  const manual_review_needed: string[] = [];

  const getParent = (instancePath: string) => {
    const parts = instancePath.split('/').filter(Boolean).map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'));
    let node = corrected;
    for (let i = 0; i < parts.length - 1; i++) { if (node == null) return { node: null, key: null }; node = node[parts[i]]; }
    return { node, key: parts[parts.length - 1] ?? null };
  };

  for (const e of errs) {
    const kw = e.keyword;
    const ip = e.instancePath || '';
    if (kw === 'required') {
      const missing = e.params?.missingProperty;
      const { node } = getParent(ip + '/' + (missing || ''));
      const defVal = (schema && schema.properties && schema.properties[missing] && 'default' in schema.properties[missing]) ? schema.properties[missing].default : null;
      if (node && typeof node === 'object' && missing) { node[missing] = defVal; }
      fixes.push({ path: (ip || '') + '/' + missing, issue: `Missing required property "${missing}"`, suggested_value: defVal, fix_type: 'add_required', auto_applied: !!(node && missing) });
    } else if (kw === 'additionalProperties') {
      const extra = e.params?.additionalProperty;
      const { node } = getParent(ip + '/x');
      if (node && typeof node === 'object' && extra in node) delete node[extra];
      fixes.push({ path: (ip || '') + '/' + extra, issue: `Unexpected property "${extra}"`, suggested_value: undefined, fix_type: 'remove_field', auto_applied: true });
    } else if (kw === 'type') {
      const want = e.params?.type;
      const { node, key } = getParent(ip);
      let coerced: any; let ok = false;
      if (node && key != null) {
        const cur = node[key];
        if (want === 'string') { coerced = String(cur); ok = true; }
        else if ((want === 'number' || want === 'integer') && !isNaN(Number(cur))) { coerced = want === 'integer' ? Math.trunc(Number(cur)) : Number(cur); ok = true; }
        else if (want === 'boolean' && (cur === 'true' || cur === 'false')) { coerced = cur === 'true'; ok = true; }
        if (ok) node[key] = coerced;
      }
      fixes.push({ path: ip || '(root)', issue: `Expected type ${Array.isArray(want) ? want.join('|') : want}`, suggested_value: ok ? coerced : null, fix_type: 'change_type', auto_applied: ok });
      if (!ok) manual_review_needed.push(`${ip || '(root)'}: cannot safely coerce to ${want}`);
    } else if (kw === 'enum') {
      const allowed = e.params?.allowedValues;
      fixes.push({ path: ip || '(root)', issue: `Value not in enum`, suggested_value: Array.isArray(allowed) ? allowed[0] : null, fix_type: 'change_value', auto_applied: false });
      manual_review_needed.push(`${ip || '(root)'}: choose one of ${JSON.stringify(allowed)}`);
    } else {
      fixes.push({ path: ip || '(root)', issue: e.message || kw || 'validation error', suggested_value: null, fix_type: 'change_value', auto_applied: false });
      manual_review_needed.push(`${ip || '(root)'}: ${e.message || kw}`);
    }
  }

  // verify corrected json validates (when a schema is present)
  let corrected_valid: boolean | null = null;
  if (schema && Object.keys(schema).length) {
    const { ctor } = draftOf(schema);
    try { corrected_valid = !!makeAjv(ctor).compile(schema)(corrected); } catch { corrected_valid = null; }
  }
  const autoCount = fixes.filter(f => f.auto_applied).length;
  res.json({
    trace_id: traceId(), computed_at: now(), success: true,
    fixes, corrected_json: corrected, corrected_valid,
    fix_confidence: fixes.length ? Math.round((autoCount / fixes.length) * 100) / 100 : 1,
    auto_fixable: manual_review_needed.length === 0 && fixes.length > 0,
    manual_review_needed,
    source_provenance: provenance(), cache_ttl_seconds: 60, cache_recommended: false,
    recommended_next_api: 'json-schema-validator', recommended_next_endpoint: '/validate',
    automation_safe: true, confidence_per_section: { fixes: fixes.length ? Math.round((autoCount / fixes.length) * 100) / 100 : 1 },
    recommended_actions_priority_order: ['Review auto-applied fixes', 'Resolve manual items', 'Re-validate corrected_json'],
    privacy: { data_stored: false, retention: 'none' },
  });
});

// ---- /batch -----------------------------------------------------------------
router.post('/batch', (req: Request, res: Response) => {
  const { validations } = req.body;
  if (!Array.isArray(validations) || validations.length === 0) return res.status(400).json({ error: 'validations array is required' });
  if (validations.length > 20) return res.status(400).json({ error: 'Maximum 20 validations per batch' });
  const results = validations.map((v: { json_data: any; schema: any; label?: string }) => {
    if (v.json_data === undefined || !v.schema) return { label: v.label || '', is_valid: false, error_count: 1, first_error: 'json_data and schema are required', success: false };
    const { ctor } = draftOf(v.schema);
    try {
      const validate = makeAjv(ctor).compile(v.schema);
      const ok = validate(v.json_data);
      const errs = validate.errors || [];
      return { label: v.label || '', is_valid: !!ok, error_count: errs.length, first_error: errs[0] ? `${errs[0].instancePath || '(root)'} ${errs[0].message}` : null, success: true };
    } catch (e: any) {
      return { label: v.label || '', is_valid: false, error_count: 1, first_error: `Invalid schema: ${e.message}`, success: false };
    }
  });
  res.json({
    trace_id: traceId(), computed_at: now(), success: true,
    batch_count: validations.length, results,
    valid_count: results.filter(r => r.is_valid).length,
    invalid_count: results.filter(r => !r.is_valid).length,
    source_provenance: provenance(), cache_ttl_seconds: 60, cache_recommended: true,
    recommended_next_api: 'json-schema-validator', recommended_next_endpoint: '/fix',
    automation_safe: true, privacy: { data_stored: false, retention: 'none' },
  });
});

export default router;
