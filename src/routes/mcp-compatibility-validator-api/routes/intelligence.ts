import { Router, Request, Response } from 'express';
const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// MCP / OpenAI / Gemini tool-name pattern.
const NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;
// Practical description ceilings used by major clients (chars).
const DESC_LIMIT = 1024;

// ---- input parsing ----------------------------------------------------------
function coerce(v: any): any {
  if (typeof v === 'string') { const s = v.trim(); if (!s) return null; try { return JSON.parse(s); } catch { return undefined; } }
  return v;
}

// Returns { manifest, tools, resources, prompts, parseFailed }.
function parseManifest(body: any): { manifest: any; tools: any[]; resources: any[]; prompts: any[]; parseFailed: boolean } {
  let inp = coerce(body?.input);
  if (inp === undefined) return { manifest: null, tools: [], resources: [], prompts: [], parseFailed: true };
  const m = (inp && typeof inp === 'object') ? inp : (body && typeof body === 'object' ? body : {});
  let tools: any[] = [];
  if (Array.isArray(m.tools)) tools = m.tools;
  else if (Array.isArray(m)) tools = m;
  else if (m.tool && typeof m.tool === 'object') tools = [m.tool];
  else if (m.name && (m.inputSchema || m.input_schema || m.parameters)) tools = [m]; // bare single tool
  const resources = Array.isArray(m.resources) ? m.resources : [];
  const prompts = Array.isArray(m.prompts) ? m.prompts : [];
  return { manifest: m, tools, resources, prompts, parseFailed: false };
}

function inputSchemaOf(tool: any): any { return tool?.inputSchema ?? tool?.input_schema ?? tool?.parameters ?? null; }

// ---- envelope ---------------------------------------------------------------
function envelope(data: any, opts: { confidence?: number; reason?: string; perSection?: any; ttl?: number; nextApi?: any[]; actions?: any[]; latency: number; success?: boolean }) {
  return {
    success: opts.success ?? true,
    request_id: rid(),
    data,
    confidence: { score: opts.confidence ?? 1, reason: opts.reason ?? 'Deterministic shape/JSON-Schema validation of supplied MCP manifest', per_section: opts.perSection ?? { validation: 1 } },
    provenance: { provider: 'mcp-compatibility-validator', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl ?? 86400, retryable: false, cache_recommended: true },
    recommended_next_api: opts.nextApi ?? [{ api: 'mcp-compatibility-validator', endpoint: '/check', reason: 'Check per-client (Claude/OpenAI/Gemini) compatibility' }],
    recommended_actions_priority_order: opts.actions ?? [],
    execution_metadata: { latency_ms: opts.latency, model: 'deterministic', automation_safe: true },
  };
}

function parseFailResponse(res: Response, started: number) {
  return res.json(envelope({
    parse_error: true,
    message: 'Could not parse MCP manifest. Supply a JSON object (or JSON string) via `input` — either a full server manifest {tools:[...]}, a single tool {name,inputSchema}, or an array of tools.',
  }, { success: false, reason: 'Input present but not parseable as JSON', latency: Date.now() - started }));
}

// ---- validation core --------------------------------------------------------
function isPlausibleJsonSchema(s: any): boolean {
  if (!s || typeof s !== 'object') return false;
  return typeof s.type === 'string' || typeof s.properties === 'object' || Array.isArray(s.oneOf) || Array.isArray(s.anyOf) || Array.isArray(s.allOf) || typeof s.$ref === 'string';
}

function detectTransport(m: any): 'stdio' | 'http' | 'sse' | 'websocket' | 'unknown' {
  if (!m || typeof m !== 'object') return 'unknown';
  const t = (m.transport?.type || m.transport || m.type || '').toString().toLowerCase();
  if (t === 'stdio' || m.command) return 'stdio';
  if (t === 'sse') return 'sse';
  if (t === 'websocket' || t === 'ws') return 'websocket';
  if (t === 'http' || t === 'streamable-http' || t === 'streamable_http') return 'http';
  const url = (m.url || m.endpoint || m.transport?.url || '').toString();
  if (/^wss?:\/\//i.test(url)) return 'websocket';
  if (/^https?:\/\//i.test(url)) return 'http';
  return 'unknown';
}

function detectAuth(m: any): 'oauth2' | 'api_key' | 'none' | 'unknown' {
  if (!m || typeof m !== 'object') return 'unknown';
  const blob = JSON.stringify(m).toLowerCase();
  if (m.auth?.type) {
    const a = m.auth.type.toString().toLowerCase();
    if (a.includes('oauth')) return 'oauth2';
    if (a.includes('key') || a.includes('token') || a.includes('bearer')) return 'api_key';
    if (a === 'none') return 'none';
  }
  if (/oauth2?/.test(blob)) return 'oauth2';
  if (/"(api[_-]?key|bearer|authorization)"/.test(blob)) return 'api_key';
  if (m.auth === false || m.authentication === 'none') return 'none';
  return 'none';
}

interface Issue { path: string; message: string; severity: 'error' | 'warning' | 'info'; }

function validateTools(tools: any[]) {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const seenNames = new Map<string, number>();
  let allValid = true;
  tools.forEach((tool, i) => {
    const where = `tools[${i}]`;
    const name = tool?.name;
    if (!name || typeof name !== 'string') { errors.push({ path: `${where}.name`, message: 'Tool name missing or not a string', severity: 'error' }); allValid = false; }
    else {
      if (!NAME_RE.test(name)) { errors.push({ path: `${where}.name`, message: `Tool name "${name}" violates ^[a-zA-Z0-9_-]{1,64}$ (required by Claude/OpenAI/Gemini)`, severity: 'error' }); allValid = false; }
      seenNames.set(name, (seenNames.get(name) || 0) + 1);
    }
    const desc = tool?.description;
    if (!desc || typeof desc !== 'string' || !desc.trim()) warnings.push({ path: `${where}.description`, message: 'Tool has no description; agents rely on it for tool selection', severity: 'warning' });
    else if (desc.length > DESC_LIMIT) warnings.push({ path: `${where}.description`, message: `Description ${desc.length} chars exceeds practical client limit (~${DESC_LIMIT})`, severity: 'warning' });
    const schema = inputSchemaOf(tool);
    if (!schema) { errors.push({ path: `${where}.inputSchema`, message: 'Missing inputSchema (required by MCP and all major clients)', severity: 'error' }); allValid = false; }
    else if (!isPlausibleJsonSchema(schema)) { errors.push({ path: `${where}.inputSchema`, message: 'inputSchema is not a valid JSON Schema object', severity: 'error' }); allValid = false; }
    else {
      if (schema.type && schema.type !== 'object') warnings.push({ path: `${where}.inputSchema.type`, message: `inputSchema.type is "${schema.type}"; clients expect "object" at the top level`, severity: 'warning' });
      if (schema.properties && typeof schema.properties === 'object') {
        for (const [p, def] of Object.entries<any>(schema.properties)) {
          if (!def || typeof def !== 'object' || (!def.type && !def.$ref && !def.oneOf && !def.anyOf && !def.allOf && !def.enum)) {
            warnings.push({ path: `${where}.inputSchema.properties.${p}`, message: `Property "${p}" has no type/$ref; some clients reject untyped params`, severity: 'warning' });
          }
        }
      }
    }
  });
  for (const [n, c] of seenNames) if (c > 1) errors.push({ path: 'tools', message: `Duplicate tool name "${n}" (${c}×); names must be unique`, severity: 'error' });
  return { errors, warnings, allValid };
}

// ---- routes -----------------------------------------------------------------
router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'MCP Compatibility Validator API', info: '/mcp-compatibility-validator/info', openapi: '/mcp-compatibility-validator/openapi.json', health: 'ok' });
});

router.post('/validate', (req: Request, res: Response) => {
  const started = Date.now();
  if (!req.body?.input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const { manifest, tools, resources, prompts, parseFailed } = parseManifest(req.body);
  if (parseFailed) return parseFailResponse(res, started);
  const tv = validateTools(tools);
  const transport = detectTransport(manifest);
  // resources/prompts shape checks
  const resourcesValid = resources.every(r => r && typeof r === 'object' && (typeof r.uri === 'string' || typeof r.uriTemplate === 'string'));
  const promptsValid = prompts.every(p => p && typeof p === 'object' && typeof p.name === 'string');
  const errors = [...tv.errors];
  const warnings = [...tv.warnings];
  if (!tools.length) warnings.push({ path: 'tools', message: 'No tools found in manifest', severity: 'warning' });
  if (resources.length && !resourcesValid) errors.push({ path: 'resources', message: 'One or more resources missing uri/uriTemplate', severity: 'error' });
  if (prompts.length && !promptsValid) errors.push({ path: 'prompts', message: 'One or more prompts missing name', severity: 'error' });

  const requiredCaps: string[] = [];
  if (tools.length) requiredCaps.push('tools');
  if (resources.length) requiredCaps.push('resources');
  if (prompts.length) requiredCaps.push('prompts');
  const declaredCaps = (manifest?.capabilities && typeof manifest.capabilities === 'object') ? Object.keys(manifest.capabilities) : [];
  const missingCaps = requiredCaps.filter(c => declaredCaps.length > 0 && !declaredCaps.includes(c));

  // conformance score: start 100, -15 per error, -3 per warning
  const score = Math.max(0, 100 - errors.length * 15 - warnings.length * 3);
  const is_valid = errors.length === 0;
  const mcpVersion = manifest?.protocolVersion || manifest?.mcp_version || manifest?.protocol_version || 'unspecified';

  const data = {
    mcp_version_detected: mcpVersion,
    is_valid,
    tool_definitions_valid: tv.allValid && tools.length > 0,
    resource_definitions_valid: resourcesValid,
    prompt_definitions_valid: promptsValid,
    transport_type: transport,
    errors,
    warnings,
    required_capabilities_present: declaredCaps,
    missing_capabilities: missingCaps,
    spec_conformance_score: score,
    tools_count: tools.length,
  };
  res.json(envelope(data, {
    latency: Date.now() - started,
    reason: `${errors.length} error(s), ${warnings.length} warning(s), conformance ${score}/100`,
    actions: errors.length ? [{ priority: 'high', action: 'Fix tool definition errors', reason: 'Manifest will be rejected by clients' }] : warnings.length ? [{ priority: 'medium', action: 'Address warnings', reason: 'Improves agent tool selection' }] : [{ priority: 'low', action: 'Run /check for per-client compatibility', reason: 'Confirm Claude/OpenAI/Gemini support' }],
  }));
});

router.post('/check', (req: Request, res: Response) => {
  const started = Date.now();
  if (!req.body?.input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const { manifest, tools, parseFailed } = parseManifest(req.body);
  if (parseFailed) return parseFailResponse(res, started);

  const tool_name_conflicts: string[] = [];
  const seen = new Map<string, number>();
  for (const t of tools) if (typeof t?.name === 'string') seen.set(t.name, (seen.get(t.name) || 0) + 1);
  for (const [n, c] of seen) if (c > 1) tool_name_conflicts.push(n);

  const nameViolations: string[] = [];
  const parameter_type_issues: { tool: string; issue: string }[] = [];
  const description_length_issues: { tool: string; length: number }[] = [];
  let hasAnnotations = false;
  tools.forEach((t, i) => {
    const nm = typeof t?.name === 'string' ? t.name : `tools[${i}]`;
    if (typeof t?.name !== 'string' || !NAME_RE.test(t.name)) nameViolations.push(nm);
    const schema = inputSchemaOf(t);
    if (!schema || !isPlausibleJsonSchema(schema)) parameter_type_issues.push({ tool: nm, issue: 'Missing or invalid inputSchema (JSON Schema object required)' });
    else if (schema.type && schema.type !== 'object') parameter_type_issues.push({ tool: nm, issue: `Top-level inputSchema.type "${schema.type}" not "object"` });
    if (typeof t?.description === 'string' && t.description.length > DESC_LIMIT) description_length_issues.push({ tool: nm, length: t.description.length });
    if (t?.annotations && typeof t.annotations === 'object') hasAnnotations = true;
  });

  // Per-client compatibility: all three require valid name pattern + JSON-schema params.
  const blockingNameOrSchema = nameViolations.length > 0 || parameter_type_issues.length > 0 || tool_name_conflicts.length > 0;
  const compatible_with_claude = !blockingNameOrSchema && tools.length > 0;
  const compatible_with_openai = !blockingNameOrSchema && tools.length > 0;
  const compatible_with_gemini = !blockingNameOrSchema && tools.length > 0;

  const breaking_issues: string[] = [];
  if (tool_name_conflicts.length) breaking_issues.push(`Duplicate tool names: ${tool_name_conflicts.join(', ')}`);
  if (nameViolations.length) breaking_issues.push(`Invalid tool name(s): ${nameViolations.join(', ')}`);
  if (parameter_type_issues.length) breaking_issues.push(`${parameter_type_issues.length} tool(s) with invalid inputSchema`);
  if (!tools.length) breaking_issues.push('No tools defined');
  const non_breaking_issues: string[] = [];
  if (description_length_issues.length) non_breaking_issues.push(`${description_length_issues.length} over-long description(s)`);
  if (!hasAnnotations) non_breaking_issues.push('No MCP tool annotations (readOnlyHint/destructiveHint) present');

  const auth = detectAuth(manifest);
  const note = blockingNameOrSchema ? 'Fix breaking issues before use' : tools.length ? 'Compatible' : 'No tools to expose';

  const data = {
    compatible_with_claude,
    compatible_with_openai,
    compatible_with_gemini,
    tool_name_conflicts,
    parameter_type_issues,
    description_length_issues,
    security_annotations_present: hasAnnotations,
    authentication_scheme_detected: auth,
    breaking_issues,
    non_breaking_issues,
    compatibility_matrix: [
      { client: 'claude', compatible: compatible_with_claude, notes: note },
      { client: 'openai', compatible: compatible_with_openai, notes: note },
      { client: 'gemini', compatible: compatible_with_gemini, notes: note },
    ],
  };
  res.json(envelope(data, {
    latency: Date.now() - started,
    perSection: { compatibility: 1 },
    reason: `${breaking_issues.length} breaking, ${non_breaking_issues.length} non-breaking issue(s)`,
    nextApi: [{ api: 'mcp-compatibility-validator', endpoint: '/validate', reason: 'Full spec conformance detail' }],
    actions: breaking_issues.length ? [{ priority: 'high', action: 'Resolve breaking issues', reason: 'Tools will not load in clients' }] : [{ priority: 'low', action: 'Ship manifest', reason: 'Compatible with major clients' }],
  }));
});

router.post('/execution-gate', (_req: Request, res: Response) => {
  const { input, objective } = _req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'analyze', next_api: 'mcp-compatibility-validator', next_endpoint: '/mcp-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'mcp-compatibility-validator', endpoint: '/mcp-intelligence', reason: 'Full MCP compatibility intelligence in one call' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /mcp-intelligence', reason: 'Single-request full analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

router.post('/mcp-intelligence', (req: Request, res: Response) => {
  const started = Date.now();
  if (!req.body?.input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const { manifest, tools, resources, prompts, parseFailed } = parseManifest(req.body);
  if (parseFailed) return parseFailResponse(res, started);

  const tv = validateTools(tools);
  const transport = detectTransport(manifest);
  const auth = detectAuth(manifest);
  const errors = tv.errors;
  const warnings = tv.warnings;
  const score = Math.max(0, 100 - errors.length * 15 - warnings.length * 3);
  const is_valid = errors.length === 0;

  const seen = new Map<string, number>();
  for (const t of tools) if (typeof t?.name === 'string') seen.set(t.name, (seen.get(t.name) || 0) + 1);
  const conflicts = [...seen].filter(([, c]) => c > 1).map(([n]) => n);
  const blocking = errors.length > 0 || conflicts.length > 0;
  const compatAll = !blocking && tools.length > 0;

  const key_findings: string[] = [];
  key_findings.push(`${tools.length} tool(s), transport=${transport}, auth=${auth}`);
  if (errors.length) key_findings.push(`${errors.length} blocking error(s)`);
  if (conflicts.length) key_findings.push(`name conflicts: ${conflicts.join(', ')}`);
  if (!errors.length && !conflicts.length) key_findings.push('No blocking issues');

  const overall_score = Math.max(0, score - conflicts.length * 15);
  const data = {
    mcp_version_detected: manifest?.protocolVersion || manifest?.mcp_version || 'unspecified',
    is_valid,
    tool_definitions_valid: tv.allValid && tools.length > 0,
    transport_type: transport,
    authentication_scheme_detected: auth,
    errors,
    warnings,
    spec_conformance_score: score,
    tool_name_conflicts: conflicts,
    compatible_with_claude: compatAll,
    compatible_with_openai: compatAll,
    compatible_with_gemini: compatAll,
    resources_count: resources.length,
    prompts_count: prompts.length,
    overall_score,
    key_findings,
    summary: blocking
      ? `Manifest has ${errors.length} error(s)/${conflicts.length} conflict(s) → not client-ready (score ${overall_score}/100).`
      : `Manifest is valid and compatible with Claude/OpenAI/Gemini (score ${overall_score}/100).`,
  };
  res.json(envelope(data, {
    latency: Date.now() - started,
    perSection: { validation: 1, compatibility: 1 },
    reason: `${errors.length} errors, conformance ${overall_score}/100`,
    actions: blocking ? [{ priority: 'high', action: 'Fix errors/conflicts', reason: 'Manifest not loadable' }] : [{ priority: 'low', action: 'Ship manifest', reason: 'Valid and compatible' }],
  }));
});

export default router;
