// Smoke test for deterministic rewrites batch 6: openapi-diff-checker, mcp-compatibility-validator.
// Mounts the compiled routers and drives them via supertest-style express app. No network, no LLM.
const express = require('express');

function load(p) { const m = require(p); return m.default || m; }
const diffRouter = load('../dist/routes/openapi-diff-checker-api/routes/intelligence.js');
const mcpRouter = load('../dist/routes/mcp-compatibility-validator-api/routes/intelligence.js');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use('/openapi-diff-checker', diffRouter);
app.use('/mcp-compatibility-validator', mcpRouter);

let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) { pass++; console.log('  PASS', name); } else { fail++; console.log('  FAIL', name, extra != null ? JSON.stringify(extra).slice(0, 300) : ''); } }

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (path, body) => {
    const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, json: await r.json() };
  };

  // ---- fixtures ----
  const v1 = {
    openapi: '3.0.0', info: { version: '1.0.0' },
    paths: {
      '/users': { get: { responses: { '200': {} } }, post: { parameters: [{ name: 'role', in: 'query', schema: { type: 'string' } }], responses: { '201': {} } } },
      '/legacy': { get: { responses: { '200': {} } } },
    },
    components: { schemas: { User: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } }, required: ['id'] }, Old: { type: 'object' } } },
  };
  const v2 = {
    openapi: '3.0.0', info: { version: '2.0.0' },
    paths: {
      '/users': { get: { responses: { '200': {} } }, post: { parameters: [{ name: 'role', in: 'query', required: true, schema: { type: 'integer' } }, { name: 'team', in: 'query', required: true, schema: { type: 'string' } }], responses: { '201': {} } } },
      '/teams': { get: { responses: { '200': {} } } },
    },
    components: { schemas: { User: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } }, required: ['id', 'email'] }, Team: { type: 'object' } } },
  };

  console.log('# openapi-diff-checker /diff');
  let r = await post('/openapi-diff-checker/diff', { old_spec: v1, new_spec: v2 });
  check('200', r.status === 200, r.status);
  check('success', r.json.success === true);
  check('model deterministic', r.json.execution_metadata.model === 'deterministic');
  check('added path /teams', r.json.data.added_paths.includes('GET /teams'), r.json.data.added_paths);
  check('removed path /legacy', r.json.data.removed_paths.includes('GET /legacy'), r.json.data.removed_paths);
  check('added schema Team', r.json.data.added_schemas.includes('Team'));
  check('removed schema Old', r.json.data.removed_schemas.includes('Old'));
  check('versions', r.json.data.version_old === '1.0.0' && r.json.data.version_new === '2.0.0');
  check('total_changes > 0', r.json.data.total_changes_count > 0, r.json.data.total_changes_count);

  console.log('# openapi-diff-checker /breaking-changes');
  r = await post('/openapi-diff-checker/breaking-changes', { input: JSON.stringify({ old: v1, new: v2 }) });
  check('200', r.status === 200);
  check('has_breaking_changes', r.json.data.has_breaking_changes === true);
  check('semver major', r.json.data.recommended_semver_bump === 'major', r.json.data.recommended_semver_bump);
  check('detects removed op breaking', r.json.data.breaking_changes.some(b => /legacy/.test(b.path)));
  check('detects param type change', r.json.data.breaking_changes.some(b => b.change_type === 'parameter_type_changed'));
  check('detects required prop added', r.json.data.breaking_changes.some(b => b.change_type === 'required_property_added'));

  console.log('# openapi-diff-checker no-change → patch');
  r = await post('/openapi-diff-checker/breaking-changes', { old: v1, new: v1 });
  check('no breaking', r.json.data.has_breaking_changes === false);
  check('semver patch', r.json.data.recommended_semver_bump === 'patch', r.json.data.recommended_semver_bump);

  console.log('# openapi-diff-checker /diff-intelligence');
  r = await post('/openapi-diff-checker/diff-intelligence', { old: v1, new: v2 });
  check('200', r.status === 200);
  check('overall_score < 100', r.json.data.overall_score < 100, r.json.data.overall_score);
  check('key_findings present', Array.isArray(r.json.data.key_findings) && r.json.data.key_findings.length > 0);

  console.log('# openapi-diff-checker error handling');
  r = await post('/openapi-diff-checker/diff', {});
  check('400 missing input', r.status === 400, r.status);
  r = await post('/openapi-diff-checker/diff', { input: 'not json at all' });
  check('200 success:false on unparseable', r.status === 200 && r.json.success === false, r.json);
  r = await post('/openapi-diff-checker/diff', { old_spec: v1 });
  check('200 success:false missing new', r.status === 200 && r.json.success === false && r.json.data.missing.includes('new'), r.json.data);

  // ---- MCP ----
  const goodManifest = {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {}, resources: {} },
    transport: { type: 'stdio' },
    tools: [
      { name: 'get_weather', description: 'Get current weather', inputSchema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }, annotations: { readOnlyHint: true } },
      { name: 'send_email', description: 'Send an email', inputSchema: { type: 'object', properties: { to: { type: 'string' }, body: { type: 'string' } } } },
    ],
    resources: [{ uri: 'file:///x' }],
  };
  const badManifest = {
    tools: [
      { name: 'bad name!', inputSchema: { type: 'string' } },
      { name: 'dup', description: 'a', inputSchema: { type: 'object' } },
      { name: 'dup', description: 'b' }, // missing inputSchema + duplicate
    ],
  };

  console.log('# mcp /validate good');
  r = await post('/mcp-compatibility-validator/validate', { input: goodManifest });
  check('200', r.status === 200);
  check('is_valid true', r.json.data.is_valid === true, r.json.data.errors);
  check('tools valid', r.json.data.tool_definitions_valid === true);
  check('transport stdio', r.json.data.transport_type === 'stdio', r.json.data.transport_type);
  check('conformance 100ish', r.json.data.spec_conformance_score >= 90, r.json.data.spec_conformance_score);
  check('version detected', r.json.data.mcp_version_detected === '2024-11-05');

  console.log('# mcp /validate bad');
  r = await post('/mcp-compatibility-validator/validate', { input: badManifest });
  check('is_valid false', r.json.data.is_valid === false);
  check('has name error', r.json.data.errors.some(e => /name/.test(e.message)));
  check('has duplicate error', r.json.data.errors.some(e => /Duplicate/.test(e.message)));
  check('has missing inputSchema error', r.json.data.errors.some(e => /inputSchema/i.test(e.message)));
  check('score reduced', r.json.data.spec_conformance_score < 100);

  console.log('# mcp /check good');
  r = await post('/mcp-compatibility-validator/check', { input: goodManifest });
  check('claude compat', r.json.data.compatible_with_claude === true);
  check('openai compat', r.json.data.compatible_with_openai === true);
  check('gemini compat', r.json.data.compatible_with_gemini === true);
  check('annotations present', r.json.data.security_annotations_present === true);
  check('matrix 3 rows', Array.isArray(r.json.data.compatibility_matrix) && r.json.data.compatibility_matrix.length === 3);

  console.log('# mcp /check bad');
  r = await post('/mcp-compatibility-validator/check', { input: badManifest });
  check('not claude compat', r.json.data.compatible_with_claude === false);
  check('name conflicts dup', r.json.data.tool_name_conflicts.includes('dup'));
  check('breaking issues present', r.json.data.breaking_issues.length > 0);

  console.log('# mcp single bare tool + intelligence');
  r = await post('/mcp-compatibility-validator/mcp-intelligence', { input: { name: 'do_thing', description: 'x', inputSchema: { type: 'object' } } });
  check('200', r.status === 200);
  check('1 tool detected', r.json.data.tool_definitions_valid === true, r.json.data);
  check('overall_score present', typeof r.json.data.overall_score === 'number');

  console.log('# mcp error handling');
  r = await post('/mcp-compatibility-validator/validate', {});
  check('400 missing input', r.status === 400);
  r = await post('/mcp-compatibility-validator/validate', { input: '{not valid json' });
  check('200 success:false unparseable', r.status === 200 && r.json.success === false, r.json);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
});
