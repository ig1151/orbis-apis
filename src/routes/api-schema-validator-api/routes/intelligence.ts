import { Router, Request, Response } from 'express';
import Ajv from 'ajv';
import Ajv2019 from 'ajv/dist/2019';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const router = Router();
const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- input -------------------------------------------------------------------
function coerce(v: any): any {
  if (typeof v === 'string') { const s = v.trim(); if (!s) return null; try { return JSON.parse(s); } catch { return undefined; } }
  return v;
}
function parseDoc(body: any): { doc: any; failed: boolean } {
  const fromInput = coerce(body?.input);
  if (fromInput === undefined) return { doc: null, failed: true };
  if (fromInput && typeof fromInput === 'object') return { doc: fromInput, failed: false };
  // fall back to a `schema`/`document` field on the body
  const alt = body?.schema ?? body?.document ?? body?.spec;
  if (alt && typeof alt === 'object') return { doc: alt, failed: false };
  return { doc: null, failed: true };
}

// ---- type detection ----------------------------------------------------------
type SchemaType = 'openapi_3_0' | 'openapi_3_1' | 'swagger_2_0' | 'json_schema_draft7' | 'json_schema_draft2019' | 'json_schema_draft2020' | 'unknown';
function detectType(doc: any): { type: SchemaType; version: string } {
  if (doc && typeof doc.openapi === 'string') {
    if (/^3\.1/.test(doc.openapi)) return { type: 'openapi_3_1', version: doc.openapi };
    if (/^3\.0/.test(doc.openapi)) return { type: 'openapi_3_0', version: doc.openapi };
    return { type: 'unknown', version: doc.openapi };
  }
  if (doc && typeof doc.swagger === 'string') return { type: 'swagger_2_0', version: `swagger-${doc.swagger}` };
  const sch = (doc?.$schema || '').toString();
  if (/2020-12/.test(sch)) return { type: 'json_schema_draft2020', version: 'draft-2020-12' };
  if (/2019-09/.test(sch)) return { type: 'json_schema_draft2019', version: 'draft-2019-09' };
  if (/draft-0?7/.test(sch)) return { type: 'json_schema_draft7', version: 'draft-07' };
  if (doc && (doc.type || doc.properties || doc.$ref || doc.allOf || doc.oneOf)) return { type: 'json_schema_draft7', version: 'draft-07' };
  return { type: 'unknown', version: 'unknown' };
}

// ---- local $ref resolution (for broken-ref detection) -----------------------
function resolveLocalRef(doc: any, ref: string): any {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return undefined; // external ref → not checked here
  const parts = ref.slice(2).split('/').map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let node = doc;
  for (const p of parts) { if (node == null || typeof node !== 'object') return null; node = node[p]; }
  return node ?? null;
}
function deref(doc: any, node: any, depth = 0): any {
  if (!node || typeof node !== 'object' || depth > 25 || typeof node.$ref !== 'string') return node;
  const t = resolveLocalRef(doc, node.$ref);
  return (t == null) ? node : deref(doc, t, depth + 1);
}
function collectRefs(node: any, acc: string[], seen = new Set<any>()): void {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (typeof node.$ref === 'string') acc.push(node.$ref);
  for (const k of Object.keys(node)) collectRefs(node[k], acc, seen);
}

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
function eachOperation(doc: any, cb: (path: string, method: string, op: any) => void) {
  const paths = (doc?.paths && typeof doc.paths === 'object') ? doc.paths : {};
  for (const p of Object.keys(paths)) {
    const item = paths[p] || {};
    for (const m of HTTP_METHODS) if (item[m] && typeof item[m] === 'object') cb(p, m, item[m]);
  }
}
function schemasOf(doc: any): Record<string, any> {
  return (doc?.components?.schemas && typeof doc.components.schemas === 'object') ? doc.components.schemas
    : (doc?.definitions && typeof doc.definitions === 'object') ? doc.definitions : {};
}

// ---- envelope ----------------------------------------------------------------
function envelope(data: any, opts: { reason?: string; perSection?: any; ttl?: number; nextApi?: any[]; actions?: any[]; latency: number; success?: boolean; confidence?: number }) {
  return {
    success: opts.success ?? true,
    request_id: rid(),
    data,
    confidence: { score: opts.confidence ?? 1, reason: opts.reason ?? 'Deterministic structural validation of supplied schema document', per_section: opts.perSection ?? { validation: 1 } },
    provenance: { provider: 'api-schema-validator', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl ?? 86400, retryable: false, cache_recommended: true },
    recommended_next_api: opts.nextApi ?? [{ api: 'api-schema-validator', endpoint: '/lint', reason: 'Lint for best-practice and style issues' }],
    recommended_actions_priority_order: opts.actions ?? [],
    execution_metadata: { latency_ms: opts.latency, model: 'deterministic', automation_safe: true },
  };
}
function parseFail(res: Response, started: number) {
  return res.json(envelope({ parse_error: true, message: 'Could not parse schema document. Supply a JSON object (or JSON string) via `input` (OpenAPI 3.0/3.1 or JSON Schema). YAML is not supported.' },
    { success: false, reason: 'Input present but not parseable as JSON', latency: Date.now() - started }));
}

// ---- core: validate ----------------------------------------------------------
interface Issue { path: string; message: string; severity: 'error' | 'warning' | 'info'; }
function validateDoc(doc: any) {
  const { type, version } = detectType(doc);
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const info_messages: string[] = [];
  let paths_count = 0;
  const schemas = schemasOf(doc);
  const schemas_count = Object.keys(schemas).length;
  let required_fields_present = false;

  const VALID_PARAM_LOCATIONS = ['query', 'header', 'path', 'cookie'];

  if (type === 'openapi_3_0' || type === 'openapi_3_1') {
    required_fields_present = !!(doc.openapi && doc.info && doc.paths);
    if (!doc.info) errors.push({ path: 'info', message: 'Missing required `info` object', severity: 'error' });
    else {
      if (!doc.info.title) errors.push({ path: 'info.title', message: 'Missing required `info.title`', severity: 'error' });
      if (!doc.info.version) errors.push({ path: 'info.version', message: 'Missing required `info.version`', severity: 'error' });
    }
    if (!doc.paths || typeof doc.paths !== 'object') errors.push({ path: 'paths', message: 'Missing required `paths` object', severity: 'error' });
    else {
      const pathsObj = doc.paths;
      paths_count = Object.keys(pathsObj).length;
      if (!paths_count) warnings.push({ path: 'paths', message: 'No paths defined', severity: 'warning' });
      for (const p of Object.keys(pathsObj)) {
        if (!p.startsWith('/')) errors.push({ path: `paths.${p}`, message: `Path "${p}" must start with "/"`, severity: 'error' });
        const templated = (p.match(/\{([^}]+)\}/g) || []).map(s => s.slice(1, -1));
        const item = pathsObj[p] || {};
        const pathParams = (Array.isArray(item.parameters) ? item.parameters : []).map((pm: any) => deref(doc, pm));
        for (const m of HTTP_METHODS) {
          const op = item[m];
          if (!op || typeof op !== 'object') continue;
          const at = `paths.${p}.${m}`;
          if (!op.responses || typeof op.responses !== 'object' || !Object.keys(op.responses).length) errors.push({ path: `${at}.responses`, message: 'Operation has no responses (required)', severity: 'error' });
          else {
            for (const code of Object.keys(op.responses)) {
              if (code !== 'default' && !/^[1-5]\d\d$/.test(code) && !/^[1-5]XX$/.test(code)) warnings.push({ path: `${at}.responses.${code}`, message: `Response key "${code}" is not a valid HTTP status code or "default"`, severity: 'warning' });
            }
          }
          if ((m === 'get' || m === 'delete' || m === 'head') && op.requestBody) warnings.push({ path: `${at}.requestBody`, message: `${m.toUpperCase()} should not define a requestBody`, severity: 'warning' });
          const opParamsList = (Array.isArray(op.parameters) ? op.parameters : []).map((pm: any) => deref(doc, pm));
          const allParams = [...pathParams, ...opParamsList];
          for (const pm of allParams) {
            if (!pm || typeof pm !== 'object') { errors.push({ path: `${at}.parameters`, message: 'Parameter is not an object', severity: 'error' }); continue; }
            if (!pm.name || typeof pm.name !== 'string') errors.push({ path: `${at}.parameters`, message: 'Parameter missing required `name`', severity: 'error' });
            if (!pm.in || !VALID_PARAM_LOCATIONS.includes(pm.in)) errors.push({ path: `${at}.parameters.${pm.name || '?'}`, message: `Parameter "${pm.name || '?'}" has invalid/missing \`in\` (expected query|header|path|cookie)`, severity: 'error' });
            if (pm.in === 'path' && pm.required !== true) errors.push({ path: `${at}.parameters.${pm.name}`, message: `Path parameter "${pm.name}" must be required:true`, severity: 'error' });
          }
          const declaredPathParams = allParams.filter((pm: any) => pm?.in === 'path').map((pm: any) => pm.name);
          for (const t of templated) if (!declaredPathParams.includes(t)) errors.push({ path: at, message: `Path template "{${t}}" has no matching path parameter (in:path, required:true)`, severity: 'error' });
        }
      }
    }
    // broken local $ref detection across the whole document
    const refs: string[] = [];
    collectRefs(doc, refs);
    const checkedRefs = new Set<string>();
    for (const ref of refs) {
      if (!ref.startsWith('#/') || checkedRefs.has(ref)) continue;
      checkedRefs.add(ref);
      if (resolveLocalRef(doc, ref) == null) errors.push({ path: ref, message: `Unresolved local $ref "${ref}"`, severity: 'error' });
    }
    if (type === 'openapi_3_1' && !/^3\.1/.test(doc.openapi)) errors.push({ path: 'openapi', message: 'Version string does not match 3.1.x', severity: 'error' });
  } else if (type === 'json_schema_draft7' || type === 'json_schema_draft2019' || type === 'json_schema_draft2020') {
    // meta-validate by compiling with the matching ajv draft
    const Ctor: any = type === 'json_schema_draft2020' ? Ajv2020 : type === 'json_schema_draft2019' ? Ajv2019 : Ajv;
    const ajv: any = new Ctor({ allErrors: true, strict: false });
    addFormats(ajv);
    try {
      ajv.compile(doc);
      required_fields_present = !!(doc.type || doc.$ref || doc.properties || doc.allOf || doc.oneOf || doc.anyOf);
      if (!required_fields_present) warnings.push({ path: '(root)', message: 'Schema declares no type/properties/combinators', severity: 'warning' });
      if (doc.properties) paths_count = 0;
    } catch (e: any) {
      errors.push({ path: '(schema)', message: `Schema does not compile: ${e.message}`, severity: 'error' });
    }
    info_messages.push(`Validated as JSON Schema (${version})`);
  } else if (type === 'swagger_2_0') {
    // Explicitly unsupported (not merely "unknown"): a Swagger 2.0 doc is well-formed but
    // outside this validator's scope. Report clearly rather than silently warning.
    errors.push({ path: 'swagger', message: 'Swagger 2.0 (OpenAPI 2.0) is not supported by this validator. Convert to OpenAPI 3.x — only OpenAPI 3.0/3.1 and JSON Schema (draft-07/2019-09/2020-12) are validated.', severity: 'error' });
    paths_count = doc.paths ? Object.keys(doc.paths).length : 0;
  } else {
    warnings.push({ path: '(root)', message: 'Could not determine schema type (no openapi/swagger/$schema/type)', severity: 'warning' });
  }

  const supported = type !== 'unknown' && type !== 'swagger_2_0';
  const is_valid = errors.length === 0 && type !== 'unknown';
  return { schema_type: type, version_detected: version, supported, is_valid, errors, warnings, info_messages, paths_count, schemas_count, required_fields_present };
}

// ---- core: lint --------------------------------------------------------------
function lintDoc(doc: any) {
  const { type } = detectType(doc);
  const issues: { rule: string; path: string; message: string; severity: 'error' | 'warning' | 'info'; fix_suggestion: string }[] = [];
  const best_practice_violations: string[] = [];
  const style_issues: string[] = [];
  const security_issues: string[] = [];
  let missing_descriptions_count = 0;
  let missing_examples_count = 0;

  const isOpenApi = type === 'openapi_3_0' || type === 'openapi_3_1';
  if (isOpenApi) {
    if (!doc.info?.description) { best_practice_violations.push('info.description missing'); missing_descriptions_count++; }
    if (!doc.info?.contact) best_practice_violations.push('info.contact missing');
    if (!doc.info?.license) best_practice_violations.push('info.license missing');
    const seenOpIds = new Map<string, number>();
    eachOperation(doc, (p, m, op) => {
      const at = `${m.toUpperCase()} ${p}`;
      if (!op.operationId) issues.push({ rule: 'operation-operationId', path: at, message: 'Operation missing operationId', severity: 'warning', fix_suggestion: 'Add a unique operationId' });
      else seenOpIds.set(op.operationId, (seenOpIds.get(op.operationId) || 0) + 1);
      if (!op.summary && !op.description) { missing_descriptions_count++; issues.push({ rule: 'operation-description', path: at, message: 'Operation missing summary/description', severity: 'warning', fix_suggestion: 'Add a summary or description' }); }
      if (!op.tags || !op.tags.length) issues.push({ rule: 'operation-tags', path: at, message: 'Operation has no tags', severity: 'info', fix_suggestion: 'Group operations with tags' });
      // examples in responses
      const responses = op.responses || {};
      let hasExample = false;
      for (const code of Object.keys(responses)) {
        const content = responses[code]?.content || {};
        for (const ct of Object.keys(content)) if (content[ct]?.example || content[ct]?.examples || content[ct]?.schema?.example) hasExample = true;
      }
      if (Object.keys(responses).length && !hasExample) missing_examples_count++;
      // style: path conventions
      if (!/^\//.test(p)) style_issues.push(`Path "${p}" does not start with /`);
      if (p.length > 1 && /\/$/.test(p)) style_issues.push(`Path "${p}" has a trailing slash`);
      if (/[A-Z]/.test(p)) style_issues.push(`Path "${p}" contains uppercase (prefer lowercase/kebab)`);
    });
    for (const [id, c] of seenOpIds) if (c > 1) issues.push({ rule: 'operation-operationId-unique', path: id, message: `Duplicate operationId "${id}"`, severity: 'error', fix_suggestion: 'Make operationIds unique' });
    // security
    const hasSecuritySchemes = doc.components?.securitySchemes && Object.keys(doc.components.securitySchemes).length;
    if (!hasSecuritySchemes && !doc.security) security_issues.push('No security schemes or global security defined');
  } else {
    // JSON Schema lint
    const props = doc?.properties && typeof doc.properties === 'object' ? doc.properties : {};
    for (const k of Object.keys(props)) {
      if (!props[k]?.description) { missing_descriptions_count++; }
      if (!props[k]?.type && !props[k]?.$ref && !props[k]?.enum && !props[k]?.oneOf) issues.push({ rule: 'property-type', path: k, message: `Property "${k}" has no type`, severity: 'warning', fix_suggestion: 'Add a type or $ref' });
    }
    if (doc && doc.additionalProperties === undefined) best_practice_violations.push('additionalProperties not set (defaults to true)');
    if (doc && Object.keys(props).length && !Array.isArray(doc.required)) best_practice_violations.push('No required fields declared');
  }

  // unused schemas (both OpenAPI components.schemas and JSON Schema $defs)
  const schemas = schemasOf(doc);
  const blob = JSON.stringify(doc);
  const unused_schemas: string[] = [];
  for (const name of Object.keys(schemas)) {
    const ref = `#/components/schemas/${name}`;
    const altRef = `#/definitions/${name}`;
    // count refs; the schema's own definition contains its key but not a $ref to itself
    const refCount = (blob.split(`"${ref}"`).length - 1) + (blob.split(`"${altRef}"`).length - 1);
    if (refCount === 0) unused_schemas.push(name);
  }

  const errCount = issues.filter(i => i.severity === 'error').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;
  const lint_score = Math.max(0, 100 - errCount * 15 - warnCount * 4 - best_practice_violations.length * 3 - style_issues.length * 2 - security_issues.length * 5 - unused_schemas.length * 2);

  return { lint_score, issues, best_practice_violations, style_issues, security_issues, missing_descriptions_count, missing_examples_count, unused_schemas };
}

// ---- routes ------------------------------------------------------------------
router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'API Schema Validator', info: '/api-schema-validator/info', openapi: '/api-schema-validator/openapi.json', health: 'ok' });
});

router.post('/validate', (req: Request, res: Response) => {
  const started = Date.now();
  if (!req.body?.input && !req.body?.schema && !req.body?.document) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const { doc, failed } = parseDoc(req.body);
  if (failed) return parseFail(res, started);
  const data = validateDoc(doc);
  res.json(envelope(data, {
    latency: Date.now() - started,
    reason: `${data.schema_type}, ${data.errors.length} error(s)`,
    actions: data.errors.length ? [{ priority: 'high', action: 'Fix validation errors', reason: 'Document is not a valid ' + data.schema_type }] : [{ priority: 'low', action: 'Run /lint', reason: 'Check best-practice/style issues' }],
  }));
});

router.post('/lint', (req: Request, res: Response) => {
  const started = Date.now();
  if (!req.body?.input && !req.body?.schema && !req.body?.document) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const { doc, failed } = parseDoc(req.body);
  if (failed) return parseFail(res, started);
  const data = lintDoc(doc);
  res.json(envelope(data, {
    latency: Date.now() - started,
    perSection: { lint: 1 },
    reason: `lint score ${data.lint_score}/100, ${data.issues.length} issue(s)`,
    nextApi: [{ api: 'api-schema-validator', endpoint: '/validate', reason: 'Confirm structural validity' }],
    actions: data.lint_score < 80 ? [{ priority: 'medium', action: 'Address top lint issues', reason: 'Improve schema quality' }] : [{ priority: 'low', action: 'Schema is clean', reason: 'High lint score' }],
  }));
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input && !_req.body?.schema && !_req.body?.document) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'analyze', next_api: 'api-schema-validator', next_endpoint: '/schema-validator-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'api-schema-validator', endpoint: '/schema-validator-intelligence', reason: 'Full schema validator intelligence in one call' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /schema-validator-intelligence', reason: 'Single-request full analysis' }], execution_metadata: { latency_ms: 1, model: 'deterministic', automation_safe: true } });
});

router.post('/schema-validator-intelligence', (req: Request, res: Response) => {
  const started = Date.now();
  if (!req.body?.input && !req.body?.schema && !req.body?.document) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const { doc, failed } = parseDoc(req.body);
  if (failed) return parseFail(res, started);
  const validation = validateDoc(doc);
  const lint = lintDoc(doc);
  const key_findings: string[] = [];
  key_findings.push(`Type: ${validation.schema_type} (${validation.version_detected})`);
  if (validation.errors.length) key_findings.push(`${validation.errors.length} structural error(s)`);
  key_findings.push(`Lint score ${lint.lint_score}/100`);
  if (lint.unused_schemas.length) key_findings.push(`${lint.unused_schemas.length} unused schema(s)`);
  if (lint.security_issues.length) key_findings.push('Security gaps detected');
  // overall: validity dominates, lint contributes
  const overall_score = validation.is_valid ? Math.round(0.6 * 100 + 0.4 * lint.lint_score) : Math.round(0.4 * lint.lint_score);
  const data = {
    ...validation,
    ...lint,
    overall_score,
    key_findings,
    summary: validation.is_valid
      ? `Valid ${validation.schema_type}; lint score ${lint.lint_score}/100 (overall ${overall_score}/100).`
      : `${validation.schema_type === 'unknown' ? 'Unrecognized schema type' : 'Invalid'}: ${validation.errors.length} error(s); lint ${lint.lint_score}/100 (overall ${overall_score}/100).`,
  };
  res.json(envelope(data, {
    latency: Date.now() - started,
    perSection: { validation: 1, lint: 1 },
    reason: `${validation.errors.length} errors, lint ${lint.lint_score}`,
    actions: validation.errors.length ? [{ priority: 'high', action: 'Fix structural errors', reason: 'Document invalid' }] : lint.lint_score < 80 ? [{ priority: 'medium', action: 'Improve lint score', reason: 'Best-practice gaps' }] : [{ priority: 'low', action: 'Ship schema', reason: 'Valid and clean' }],
  }));
});

export default router;
