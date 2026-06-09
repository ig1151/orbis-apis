import { Router, Request, Response } from 'express';
const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- input coercion ---------------------------------------------------------
function coerceSpec(v: any): any | null {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  }
  return null;
}
// Pull the (old, new) spec pair from a flexible request body.
function extractPair(body: any): { old: any | null; neu: any | null; nonJsonString: boolean } {
  let inp = body?.input;
  let nonJsonString = false;
  if (typeof inp === 'string') {
    try { inp = JSON.parse(inp); } catch { nonJsonString = true; inp = undefined; }
  }
  const src = (inp && typeof inp === 'object') ? inp : body || {};
  const oldRaw = src.old_spec ?? src.spec_old ?? src.old ?? src.from ?? src.spec_a ?? src.a ??
    body?.old_spec ?? body?.old ?? body?.from ?? body?.spec_a;
  const newRaw = src.new_spec ?? src.spec_new ?? src.new ?? src.to ?? src.spec_b ?? src.b ??
    body?.new_spec ?? body?.new ?? body?.to ?? body?.spec_b;
  return { old: coerceSpec(oldRaw), neu: coerceSpec(newRaw), nonJsonString };
}

// ---- envelope ---------------------------------------------------------------
function envelope(data: any, opts: { confidence?: number; reason?: string; perSection?: any; ttl?: number; nextApi?: any[]; actions?: any[]; latency: number; success?: boolean }) {
  return {
    success: opts.success ?? true,
    request_id: rid(),
    data,
    confidence: { score: opts.confidence ?? 1, reason: opts.reason ?? 'Deterministic structural diff of supplied OpenAPI specs', per_section: opts.perSection ?? { diff: 1 } },
    provenance: { provider: 'openapi-diff-checker', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl ?? 86400, retryable: false, cache_recommended: true },
    recommended_next_api: opts.nextApi ?? [{ api: 'openapi-diff-checker', endpoint: '/breaking-changes', reason: 'Classify which changes break clients' }],
    recommended_actions_priority_order: opts.actions ?? [],
    execution_metadata: { latency_ms: opts.latency, model: 'deterministic', automation_safe: true },
  };
}

function badSpecResponse(res: Response, started: number, missing: string[]) {
  return res.json(envelope({
    parse_error: true,
    message: `Could not parse OpenAPI spec(s): ${missing.join(' and ')}. Supply specs as JSON objects (or JSON strings) via old_spec/new_spec (aliases: old/new, from/to, spec_a/spec_b), or as input:{old,new}. YAML is not supported.`,
    missing,
  }, { success: false, confidence: 1, reason: 'Input present but specs not parseable as JSON', latency: Date.now() - started }));
}

// ---- diff core --------------------------------------------------------------
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

function operations(spec: any): Map<string, any> {
  const ops = new Map<string, any>();
  const paths = (spec && typeof spec.paths === 'object' && spec.paths) || {};
  for (const p of Object.keys(paths)) {
    const item = paths[p] || {};
    for (const m of HTTP_METHODS) {
      if (item[m] && typeof item[m] === 'object') ops.set(`${m.toUpperCase()} ${p}`, item[m]);
    }
  }
  return ops;
}

function paramKey(pm: any): string { return `${pm?.in || 'unknown'}:${pm?.name || 'unnamed'}`; }
function paramType(pm: any): string { return pm?.schema?.type || pm?.type || 'unspecified'; }

// Merge path-level + operation-level parameters into a keyed map.
function opParams(spec: any, opPath: string, op: any): Map<string, any> {
  const map = new Map<string, any>();
  const path = opPath.slice(opPath.indexOf(' ') + 1);
  const pathItem = spec?.paths?.[path] || {};
  for (const pm of (Array.isArray(pathItem.parameters) ? pathItem.parameters : [])) map.set(paramKey(pm), pm);
  for (const pm of (Array.isArray(op?.parameters) ? op.parameters : [])) map.set(paramKey(pm), pm);
  return map;
}

function schemasOf(spec: any): Record<string, any> {
  return (spec?.components?.schemas && typeof spec.components.schemas === 'object') ? spec.components.schemas
    : (spec?.definitions && typeof spec.definitions === 'object') ? spec.definitions // swagger 2.0
    : {};
}

function versionOf(spec: any): string { return spec?.info?.version || 'unknown'; }

// Stable structural comparison for "modified" detection.
function stableStringify(o: any): string {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + stableStringify(o[k])).join(',') + '}';
}

interface Change { path: string; change_type: string; description: string; }
interface BreakingChange extends Change { impact: 'critical' | 'major' | 'minor'; }

function computeDiff(oldSpec: any, newSpec: any) {
  const oldOps = operations(oldSpec);
  const newOps = operations(newSpec);
  const added_paths: string[] = [];
  const removed_paths: string[] = [];
  const modified_paths: { path: string; changes: Change[] }[] = [];

  // breaking / non-breaking accumulators
  const breaking: BreakingChange[] = [];
  const nonBreaking: Change[] = [];

  const added_parameters: { path: string; parameter: string; required: boolean }[] = [];
  const removed_parameters: { path: string; parameter: string; required: boolean }[] = [];

  for (const key of newOps.keys()) {
    if (!oldOps.has(key)) {
      added_paths.push(key);
      nonBreaking.push({ path: key, change_type: 'operation_added', description: `Operation ${key} was added` });
    }
  }
  for (const key of oldOps.keys()) {
    if (!newOps.has(key)) {
      removed_paths.push(key);
      breaking.push({ path: key, change_type: 'operation_removed', description: `Operation ${key} was removed`, impact: 'critical' });
    }
  }
  // modified operations (present in both)
  for (const key of oldOps.keys()) {
    if (!newOps.has(key)) continue;
    const oldOp = oldOps.get(key);
    const newOp = newOps.get(key);
    const changes: Change[] = [];

    // parameter diff
    const oldP = opParams(oldSpec, key, oldOp);
    const newP = opParams(newSpec, key, newOp);
    for (const [pk, pm] of newP) {
      if (!oldP.has(pk)) {
        const required = !!pm.required;
        added_parameters.push({ path: key, parameter: pk, required });
        changes.push({ path: key, change_type: 'parameter_added', description: `Parameter ${pk} added (${required ? 'required' : 'optional'})` });
        if (required) breaking.push({ path: key, change_type: 'required_parameter_added', description: `Required parameter ${pk} added to ${key}`, impact: 'major' });
        else nonBreaking.push({ path: key, change_type: 'optional_parameter_added', description: `Optional parameter ${pk} added to ${key}` });
      } else {
        const before = oldP.get(pk);
        if (paramType(before) !== paramType(pm)) {
          changes.push({ path: key, change_type: 'parameter_type_changed', description: `Parameter ${pk} type ${paramType(before)} → ${paramType(pm)}` });
          breaking.push({ path: key, change_type: 'parameter_type_changed', description: `Parameter ${pk} on ${key} changed type ${paramType(before)} → ${paramType(pm)}`, impact: 'major' });
        }
        if (!before.required && pm.required) {
          changes.push({ path: key, change_type: 'parameter_now_required', description: `Parameter ${pk} became required` });
          breaking.push({ path: key, change_type: 'parameter_now_required', description: `Parameter ${pk} on ${key} became required`, impact: 'major' });
        } else if (before.required && !pm.required) {
          changes.push({ path: key, change_type: 'parameter_now_optional', description: `Parameter ${pk} became optional` });
          nonBreaking.push({ path: key, change_type: 'parameter_now_optional', description: `Parameter ${pk} on ${key} became optional` });
        }
      }
    }
    for (const [pk, pm] of oldP) {
      if (!newP.has(pk)) {
        const required = !!pm.required;
        removed_parameters.push({ path: key, parameter: pk, required });
        changes.push({ path: key, change_type: 'parameter_removed', description: `Parameter ${pk} removed` });
        // removing a param is non-breaking for clients still sending it; flag minor
        breaking.push({ path: key, change_type: 'parameter_removed', description: `Parameter ${pk} removed from ${key}`, impact: 'minor' });
      }
    }

    // response code diff
    const oldResp = Object.keys(oldOp?.responses || {});
    const newResp = Object.keys(newOp?.responses || {});
    for (const code of oldResp) if (!newResp.includes(code)) {
      changes.push({ path: key, change_type: 'response_removed', description: `Response ${code} removed` });
      if (/^2/.test(code)) breaking.push({ path: key, change_type: 'success_response_removed', description: `Success response ${code} removed from ${key}`, impact: 'major' });
    }
    for (const code of newResp) if (!oldResp.includes(code)) {
      changes.push({ path: key, change_type: 'response_added', description: `Response ${code} added` });
      nonBreaking.push({ path: key, change_type: 'response_added', description: `Response ${code} added to ${key}` });
    }

    if (changes.length) modified_paths.push({ path: key, changes });
  }

  // schema diff
  const oldS = schemasOf(oldSpec);
  const newS = schemasOf(newSpec);
  const added_schemas: string[] = [];
  const removed_schemas: string[] = [];
  const modified_schemas: { schema: string; changes: Change[] }[] = [];
  for (const name of Object.keys(newS)) if (!(name in oldS)) {
    added_schemas.push(name);
    nonBreaking.push({ path: `#/components/schemas/${name}`, change_type: 'schema_added', description: `Schema ${name} added` });
  }
  for (const name of Object.keys(oldS)) if (!(name in newS)) {
    removed_schemas.push(name);
    breaking.push({ path: `#/components/schemas/${name}`, change_type: 'schema_removed', description: `Schema ${name} removed`, impact: 'major' });
  }
  for (const name of Object.keys(oldS)) {
    if (!(name in newS)) continue;
    const changes: Change[] = [];
    const oldProps = (oldS[name]?.properties && typeof oldS[name].properties === 'object') ? oldS[name].properties : {};
    const newProps = (newS[name]?.properties && typeof newS[name].properties === 'object') ? newS[name].properties : {};
    const oldReq: string[] = Array.isArray(oldS[name]?.required) ? oldS[name].required : [];
    const newReq: string[] = Array.isArray(newS[name]?.required) ? newS[name].required : [];
    for (const f of Object.keys(newProps)) if (!(f in oldProps)) {
      changes.push({ path: `${name}.${f}`, change_type: 'property_added', description: `Property ${f} added` });
      if (newReq.includes(f) && !oldReq.includes(f)) breaking.push({ path: `${name}.${f}`, change_type: 'required_property_added', description: `Required property ${name}.${f} added`, impact: 'major' });
      else nonBreaking.push({ path: `${name}.${f}`, change_type: 'optional_property_added', description: `Optional property ${name}.${f} added` });
    }
    for (const f of Object.keys(oldProps)) if (!(f in newProps)) {
      changes.push({ path: `${name}.${f}`, change_type: 'property_removed', description: `Property ${f} removed` });
      breaking.push({ path: `${name}.${f}`, change_type: 'property_removed', description: `Property ${name}.${f} removed`, impact: 'major' });
    }
    for (const f of Object.keys(oldProps)) {
      if (!(f in newProps)) continue;
      const ot = oldProps[f]?.type || 'unspecified';
      const nt = newProps[f]?.type || 'unspecified';
      if (ot !== nt) {
        changes.push({ path: `${name}.${f}`, change_type: 'property_type_changed', description: `Property ${f} type ${ot} → ${nt}` });
        breaking.push({ path: `${name}.${f}`, change_type: 'property_type_changed', description: `Property ${name}.${f} type ${ot} → ${nt}`, impact: 'major' });
      } else if (stableStringify(oldProps[f]) !== stableStringify(newProps[f])) {
        changes.push({ path: `${name}.${f}`, change_type: 'property_modified', description: `Property ${f} definition changed` });
      }
      if (newReq.includes(f) && !oldReq.includes(f)) breaking.push({ path: `${name}.${f}`, change_type: 'property_now_required', description: `Property ${name}.${f} became required`, impact: 'major' });
    }
    if (changes.length) modified_schemas.push({ schema: name, changes });
  }

  const total_changes_count = added_paths.length + removed_paths.length + modified_paths.length +
    added_schemas.length + removed_schemas.length + modified_schemas.length +
    added_parameters.length + removed_parameters.length;

  return {
    diff: {
      added_paths, removed_paths, modified_paths,
      added_schemas, removed_schemas, modified_schemas,
      added_parameters, removed_parameters,
      version_old: versionOf(oldSpec), version_new: versionOf(newSpec),
      total_changes_count,
    },
    breaking, nonBreaking,
  };
}

function semverBump(breaking: BreakingChange[], nonBreaking: Change[]): 'major' | 'minor' | 'patch' {
  if (breaking.length) return 'major';
  if (nonBreaking.length) return 'minor';
  return 'patch';
}

// ---- routes -----------------------------------------------------------------
router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'OpenAPI Diff Checker API', info: '/openapi-diff-checker/info', openapi: '/openapi-diff-checker/openapi.json', health: 'ok' });
});

router.post('/diff', (req: Request, res: Response) => {
  const started = Date.now();
  if (!req.body?.input && !(req.body?.old_spec || req.body?.old || req.body?.from)) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const { old, neu } = extractPair(req.body);
  const missing: string[] = [];
  if (!old) missing.push('old');
  if (!neu) missing.push('new');
  if (missing.length) return badSpecResponse(res, started, missing);
  const { diff } = computeDiff(old, neu);
  res.json(envelope(diff, {
    latency: Date.now() - started,
    reason: `Structural diff: ${diff.total_changes_count} change(s)`,
    actions: diff.total_changes_count ? [{ priority: 'high', action: 'Run /breaking-changes', reason: 'Determine client impact and semver bump' }] : [{ priority: 'low', action: 'No changes detected', reason: 'Specs are structurally equivalent' }],
  }));
});

router.post('/breaking-changes', (req: Request, res: Response) => {
  const started = Date.now();
  if (!req.body?.input && !(req.body?.old_spec || req.body?.old || req.body?.from)) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const { old, neu } = extractPair(req.body);
  const missing: string[] = [];
  if (!old) missing.push('old');
  if (!neu) missing.push('new');
  if (missing.length) return badSpecResponse(res, started, missing);
  const { breaking, nonBreaking } = computeDiff(old, neu);
  const bump = semverBump(breaking, nonBreaking);
  const data = {
    has_breaking_changes: breaking.length > 0,
    breaking_changes: breaking,
    non_breaking_changes: nonBreaking,
    recommended_semver_bump: bump,
    migration_guide_summary: breaking.length
      ? `${breaking.length} breaking change(s) require a ${bump} version bump. Review removed operations/schemas and tightened parameters before upgrading clients.`
      : nonBreaking.length ? `No breaking changes; ${nonBreaking.length} additive change(s) → ${bump} bump.` : 'No changes detected.',
  };
  res.json(envelope(data, {
    latency: Date.now() - started,
    perSection: { breaking_changes: 1 },
    reason: `${breaking.length} breaking, ${nonBreaking.length} non-breaking`,
    nextApi: [{ api: 'openapi-diff-checker', endpoint: '/diff', reason: 'Full structural change list' }],
    actions: breaking.length ? [{ priority: 'high', action: `Plan a ${bump} release`, reason: 'Breaking changes detected' }] : [{ priority: 'low', action: `Tag ${bump} release`, reason: 'Backward-compatible changes only' }],
  }));
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input && !(_req.body?.old_spec || _req.body?.old)) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'analyze', next_api: 'openapi-diff-checker', next_endpoint: '/diff-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'openapi-diff-checker', endpoint: '/diff-intelligence', reason: 'Full OpenAPI diff intelligence in one call' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /diff-intelligence', reason: 'Single-request full analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

router.post('/diff-intelligence', (req: Request, res: Response) => {
  const started = Date.now();
  if (!req.body?.input && !(req.body?.old_spec || req.body?.old || req.body?.from)) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const { old, neu } = extractPair(req.body);
  const missing: string[] = [];
  if (!old) missing.push('old');
  if (!neu) missing.push('new');
  if (missing.length) return badSpecResponse(res, started, missing);
  const { diff, breaking, nonBreaking } = computeDiff(old, neu);
  const bump = semverBump(breaking, nonBreaking);
  // overall_score: 100 = no breaking changes, decreasing with breaking severity
  const severityWeight = breaking.reduce((s, b) => s + (b.impact === 'critical' ? 25 : b.impact === 'major' ? 12 : 4), 0);
  const overall_score = Math.max(0, 100 - severityWeight);
  const key_findings: string[] = [];
  if (diff.removed_paths.length) key_findings.push(`${diff.removed_paths.length} operation(s) removed`);
  if (diff.added_paths.length) key_findings.push(`${diff.added_paths.length} operation(s) added`);
  if (breaking.length) key_findings.push(`${breaking.length} breaking change(s)`);
  if (diff.removed_schemas.length) key_findings.push(`${diff.removed_schemas.length} schema(s) removed`);
  if (!key_findings.length) key_findings.push('No changes detected');
  const data = {
    ...diff,
    has_breaking_changes: breaking.length > 0,
    breaking_changes: breaking,
    non_breaking_changes: nonBreaking,
    recommended_semver_bump: bump,
    overall_score,
    key_findings,
    summary: breaking.length
      ? `${diff.total_changes_count} change(s); ${breaking.length} breaking → recommend ${bump} bump (score ${overall_score}/100).`
      : `${diff.total_changes_count} change(s), all backward-compatible → ${bump} bump (score ${overall_score}/100).`,
  };
  res.json(envelope(data, {
    latency: Date.now() - started,
    perSection: { diff: 1, breaking_changes: 1 },
    reason: `${diff.total_changes_count} changes, ${breaking.length} breaking`,
    actions: breaking.length ? [{ priority: 'high', action: `Plan ${bump} release & migration`, reason: 'Breaking changes present' }] : [{ priority: 'medium', action: `Tag ${bump} release`, reason: 'Additive/no changes' }],
  }));
});

export default router;
