// Group A batch 2 validator: live responses ajv-2020 vs published schema, spec
// responseExample drift guard, 400 paths, determinism check (volatile fields
// excluded), and deterministic logic asserts for the 5 schema/format/transform
// APIs: tool-schema-linter, function-arg-validator, json-repair,
// prompt-template-renderer, sse-parser.
const express = require('express');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'tool-schema-linter': { router: require('../dist/routes/tool-schema-linter-api/routes/intelligence').default, spec: require('../dist/routes/tool-schema-linter-api/routes/openapi').spec },
  'function-arg-validator': { router: require('../dist/routes/function-arg-validator-api/routes/intelligence').default, spec: require('../dist/routes/function-arg-validator-api/routes/openapi').spec },
  'json-repair': { router: require('../dist/routes/json-repair-api/routes/intelligence').default, spec: require('../dist/routes/json-repair-api/routes/openapi').spec },
  'prompt-template-renderer': { router: require('../dist/routes/prompt-template-renderer-api/routes/intelligence').default, spec: require('../dist/routes/prompt-template-renderer-api/routes/openapi').spec },
  'sse-parser': { router: require('../dist/routes/sse-parser-api/routes/intelligence').default, spec: require('../dist/routes/sse-parser-api/routes/openapi').spec },
};

const app = express();
app.use(express.json({ limit: '4mb' }));
for (const [slug, { router }] of Object.entries(APIS)) app.use('/' + slug, router);

const validators = {};
for (const [slug, { spec }] of Object.entries(APIS)) {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  ajv.addSchema(spec, slug);
  validators[slug] = (name, data) => { const v = ajv.getSchema(`${slug}#/components/schemas/${name}`); if (!v) throw new Error(`no schema ${name}`); return { ok: v(data), errors: v.errors }; };
}

let pass = 0, fail = 0;
function check(slug, label, name, data, extra) {
  const { ok, errors } = validators[slug](name, data);
  let msg = ''; if (ok && extra) { const e = extra(data); if (e) msg = ' — ASSERT: ' + e; }
  if (ok && !msg) { pass++; console.log(`  ✓ ${label} → ${name}`); }
  else { fail++; console.log(`  ✗ ${label} → ${name}${msg}`); if (!ok) console.log('    ' + JSON.stringify(errors)); }
}
function assert(label, cond, detail) { if (cond) { pass++; console.log(`  ✓ ${label}`); } else { fail++; console.log(`  ✗ ${label} — ${detail}`); } }
function driftGuard(slug) {
  const { spec } = APIS[slug];
  for (const [path, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) {
    const media = op.responses?.['200']?.content?.['application/json']; if (!media?.example) continue;
    check(slug, `spec example ${method.toUpperCase()} ${path}`, (media.schema?.$ref || '').split('/').pop(), media.example);
  }
}
const VOLATILE = new Set(['trace_id', 'request_id', 'computed_at', 'latency_ms']);
function stripVolatile(o) { const c = JSON.parse(JSON.stringify(o)); for (const k of VOLATILE) delete c[k]; return c; }
async function call(base, method, path, body) {
  const res = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json() };
}

async function run(base) {
  // ---- tool-schema-linter ----
  console.log('tool-schema-linter:');
  check('tool-schema-linter', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/tool-schema-linter/')).json);
  {
    const tool = { name: 'get_weather', description: 'Get the current weather for a city.', parameters: { type: 'object', properties: { city: { type: 'string', description: 'City name.' }, units: { type: 'string', enum: ['celsius', 'fahrenheit'] } }, required: ['city'] } };
    const r = (await call(base, 'POST', '/tool-schema-linter/lint', tool)).json;
    check('tool-schema-linter', 'POST /lint (well-formed w/ warnings)', 'LintResponse', r, d =>
      d.passed === true && d.tool_name === 'get_weather' && d.property_count === 2 && d.counts.error === 0
        && d.findings.some(f => f.code === 'ADDITIONAL_PROPERTIES_NOT_FALSE') && d.lint_score === 90
        && d.findings.every(f => f.rule_type === 'json_schema' || f.rule_type === 'llm_tooling_heuristic')
        && d.rule_type_counts.llm_tooling_heuristic === 2 && d.rule_type_counts.json_schema === 0 ? null : `unexpected ${d.passed}/${d.lint_score}/${JSON.stringify(d.rule_type_counts)}`);
  }
  {
    // new checks: ambiguous name, required-not-described, duplicate description, $ref tagged heuristic
    const tool = { name: 'f', description: 'A tool that does a thing.', parameters: { type: 'object', additionalProperties: false, properties: { data: { type: 'string', description: 'same' }, value: { type: 'string', description: 'same' }, ref: { $ref: '#/$defs/x' } }, required: ['data'] } };
    const r = (await call(base, 'POST', '/tool-schema-linter/lint', tool)).json;
    check('tool-schema-linter', 'POST /lint (new heuristics)', 'LintResponse', r, d =>
      d.findings.some(f => f.code === 'AMBIGUOUS_PARAM_NAME') && d.findings.some(f => f.code === 'DUPLICATE_DESCRIPTION')
        && d.findings.some(f => f.code === 'REF_UNSUPPORTED' && f.rule_type === 'llm_tooling_heuristic') ? null : `missing new findings: ${d.findings.map(f => f.code).join(',')}`);
  }
  {
    // bad: invalid name + required not in properties → errors
    const bad = { name: 'bad name!', parameters: { type: 'object', properties: { a: { type: 'string' } }, required: ['b'], additionalProperties: false } };
    const r = (await call(base, 'POST', '/tool-schema-linter/lint', bad)).json;
    check('tool-schema-linter', 'POST /lint (errors)', 'LintResponse', r, d =>
      d.passed === false && d.counts.error >= 2 && d.findings.some(f => f.code === 'TOOL_NAME_INVALID') && d.findings.some(f => f.code === 'REQUIRED_NOT_IN_PROPERTIES') ? null : `unexpected ${d.passed}/${JSON.stringify(d.counts)}`);
  }
  check('tool-schema-linter', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/tool-schema-linter/lookup', { name: 'x', description: 'A tool that does a thing.', parameters: { type: 'object', properties: {}, additionalProperties: false } })).json, d => d.reasoning && d.confidence_score === 0.9 ? null : 'expected reasoning + conf 0.9');
  assert('tool-schema-linter 400 non-object', (await call(base, 'POST', '/tool-schema-linter/lint', [])).status === 400, 'expected 400');

  // ---- function-arg-validator ----
  console.log('function-arg-validator:');
  check('function-arg-validator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/function-arg-validator/')).json);
  {
    const schema = { type: 'object', properties: { city: { type: 'string' }, days: { type: 'integer' } }, required: ['city'], additionalProperties: false };
    const r = (await call(base, 'POST', '/function-arg-validator/validate', { schema, arguments: { city: 'Denver', days: '3' } })).json;
    check('function-arg-validator', 'POST /validate (coercible)', 'ValidateResponse', r, d =>
      d.valid === false && d.error_count === 1 && d.valid_after_coercion === true && d.coercion_applied === true
        && d.coerced_arguments.days === 3 && d.errors[0].instance_path === '/days'
        && d.schema_dialect === '2020-12' && d.validation_mode === 'strict' ? null : `unexpected ${d.valid}/${d.valid_after_coercion}/${JSON.stringify(d.coerced_arguments)}`);
  }
  // advanced JSON Schema keywords (ChatGPT-requested edge cases)
  check('function-arg-validator', 'POST /validate (oneOf)', 'ValidateResponse', (await call(base, 'POST', '/function-arg-validator/validate', { schema: { oneOf: [{ type: 'string' }, { type: 'integer' }] }, arguments: 5 })).json, d => d.valid === true ? null : 'oneOf should pass for integer');
  check('function-arg-validator', 'POST /validate (if/then/else)', 'ValidateResponse', (await call(base, 'POST', '/function-arg-validator/validate', { schema: { type: 'object', if: { properties: { kind: { const: 'a' } }, required: ['kind'] }, then: { required: ['a_field'] }, properties: { kind: {}, a_field: {} } }, arguments: { kind: 'a' } })).json, d => d.valid === false && d.missing_required.includes('a_field') ? null : `if/then expected missing a_field, got ${JSON.stringify(d.missing_required)}`);
  check('function-arg-validator', 'POST /validate (patternProperties)', 'ValidateResponse', (await call(base, 'POST', '/function-arg-validator/validate', { schema: { type: 'object', patternProperties: { '^x_': { type: 'number' } }, additionalProperties: false }, arguments: { x_a: 'nope' } })).json, d => d.valid === false ? null : 'patternProperties type should fail');
  check('function-arg-validator', 'POST /validate (dependentRequired)', 'ValidateResponse', (await call(base, 'POST', '/function-arg-validator/validate', { schema: { type: 'object', properties: { card: {}, cvv: {} }, dependentRequired: { card: ['cvv'] } }, arguments: { card: '4111' } })).json, d => d.valid === false ? null : 'dependentRequired should fail without cvv');
  check('function-arg-validator', 'POST /validate (unevaluatedProperties)', 'ValidateResponse', (await call(base, 'POST', '/function-arg-validator/validate', { schema: { type: 'object', properties: { a: {} }, unevaluatedProperties: false }, arguments: { a: 1, b: 2 } })).json, d => d.valid === false ? null : 'unevaluatedProperties:false should reject b');
  check('function-arg-validator', 'POST /validate (valid)', 'ValidateResponse', (await call(base, 'POST', '/function-arg-validator/validate', { schema: { type: 'object', properties: { x: { type: 'number' } }, required: ['x'] }, arguments: { x: 1 } })).json, d => d.valid === true && d.error_count === 0 ? null : 'expected valid');
  {
    const schema = { type: 'object', properties: { a: { type: 'string' } }, required: ['a', 'b'], additionalProperties: false };
    const r = (await call(base, 'POST', '/function-arg-validator/validate', { schema, arguments: { c: 1 } })).json;
    check('function-arg-validator', 'POST /validate (missing+extra)', 'ValidateResponse', r, d =>
      d.valid === false && d.missing_required.includes('b') && d.extra_properties.includes('c') ? null : `unexpected ${JSON.stringify(d.missing_required)}/${JSON.stringify(d.extra_properties)}`);
  }
  check('function-arg-validator', 'POST /validate (args as JSON string)', 'ValidateResponse', (await call(base, 'POST', '/function-arg-validator/validate', { schema: { type: 'object', properties: { n: { type: 'integer' } } }, arguments: '{"n": 5}' })).json, d => d.valid === true ? null : 'expected valid from parsed string');
  check('function-arg-validator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/function-arg-validator/lookup', { schema: { type: 'object' }, arguments: {} })).json, d => d.reasoning && d.confidence_score === 1 ? null : 'expected reasoning');
  assert('function-arg-validator 400 bad schema', (await call(base, 'POST', '/function-arg-validator/validate', { schema: { type: 'object', properties: { x: { type: 'not-a-type' } } }, arguments: {} })).status === 400, 'expected 400 (uncompilable)');
  assert('function-arg-validator 400 no arguments', (await call(base, 'POST', '/function-arg-validator/validate', { schema: { type: 'object' } })).status === 400, 'expected 400');

  // ---- json-repair ----
  console.log('json-repair:');
  check('json-repair', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/json-repair/')).json);
  {
    const text = "```json\n{ 'name': 'Ada', age: 36, admin: True, tags: ['x','y',], note: None }\n```";
    const r = (await call(base, 'POST', '/json-repair/repair', { text })).json;
    check('json-repair', 'POST /repair (fences+quotes+py+trailing)', 'RepairResponse', r, d =>
      d.original_valid === false && d.valid_json === true && d.repaired === true
        && d.parsed.name === 'Ada' && d.parsed.admin === true && d.parsed.note === null && Array.isArray(d.parsed.tags) && d.parsed.tags.length === 2
        && d.repairs_applied.includes('stripped_code_fence') && d.repairs_applied.includes('python_literal') && d.repairs_applied.includes('removed_trailing_comma')
        && d.semantic_risk === 'medium' && d.repaired_diff.length === d.repairs_applied.length && d.repaired_diff.every(x => ['low', 'medium', 'high'].includes(x.semantic_risk))
        && d.confidence_score === 0.8 ? null : `unexpected ${d.valid_json}/${d.semantic_risk}/${JSON.stringify(d.repairs_applied)}`);
  }
  check('json-repair', 'POST /repair (high risk: bareword)', 'RepairResponse', (await call(base, 'POST', '/json-repair/repair', { text: '{a: foo}' })).json, d => d.valid_json === true && d.semantic_risk === 'high' && d.repaired_diff.some(x => x.repair === 'unquoted_value_to_string' && x.semantic_risk === 'high') ? null : `expected high risk, got ${d.semantic_risk}`);
  check('json-repair', 'POST /repair (already valid)', 'RepairResponse', (await call(base, 'POST', '/json-repair/repair', { text: '{"a":1}' })).json, d => d.original_valid === true && d.repaired === false && d.repairs_applied.length === 0 && d.confidence_score === 1 ? null : 'expected original_valid');
  check('json-repair', 'POST /repair (leading prose + unclosed)', 'RepairResponse', (await call(base, 'POST', '/json-repair/repair', { text: 'Here you go: {"a": [1, 2, 3' })).json, d => d.valid_json === true && d.parsed.a.length === 3 && (d.repairs_applied.includes('stripped_leading_text') || d.repairs_applied.includes('auto_closed_array')) ? null : `unexpected ${d.valid_json}/${JSON.stringify(d.repairs_applied)}`);
  check('json-repair', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/json-repair/lookup', { text: "{a:1}" })).json, d => d.reasoning && d.valid_json === true ? null : 'expected reasoning');

  // ---- prompt-template-renderer ----
  console.log('prompt-template-renderer:');
  check('prompt-template-renderer', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/prompt-template-renderer/')).json);
  {
    const r = (await call(base, 'POST', '/prompt-template-renderer/render', { template: 'Hello {{ user.name }}, your plan is {{ plan }}. Ref: {{ user.name }}. {{ missing }}', variables: { user: { name: 'Ada' }, plan: 'Pro', extra: 1 } })).json;
    check('prompt-template-renderer', 'POST /render (keep missing)', 'RenderResponse', r, d =>
      d.placeholder_count === 4 && d.unique_variable_count === 3 && d.all_resolved === false
        && d.missing_variables.length === 1 && d.missing_variables[0] === 'missing' && d.unused_variables.includes('extra')
        && d.syntax === 'double_brace' && d.duplicate_placeholders.includes('user.name')
        && d.resolved_variable_map['user.name'] === 'Ada' && d.resolved_variable_map.plan === 'Pro' && !('missing' in d.resolved_variable_map)
        && d.rendered === 'Hello Ada, your plan is Pro. Ref: Ada. {{ missing }}' && d.rendered_length === d.rendered.length ? null : `unexpected ${d.rendered}`);
  }
  check('prompt-template-renderer', 'POST /render (dollar_brace syntax)', 'RenderResponse', (await call(base, 'POST', '/prompt-template-renderer/render', { template: 'Hi ${name}, ${name}!', variables: { name: 'Bo' }, syntax: 'dollar_brace' })).json, d => d.syntax === 'dollar_brace' && d.rendered === 'Hi Bo, Bo!' && d.duplicate_placeholders.includes('name') ? null : `unexpected ${d.rendered}`);
  check('prompt-template-renderer', 'POST /render (empty behavior)', 'RenderResponse', (await call(base, 'POST', '/prompt-template-renderer/render', { template: 'A{{x}}B', variables: {}, missing_behavior: 'empty' })).json, d => d.rendered === 'AB' && d.missing_variables.includes('x') ? null : `unexpected ${d.rendered}`);
  check('prompt-template-renderer', 'POST /render (error behavior → null)', 'RenderResponse', (await call(base, 'POST', '/prompt-template-renderer/render', { template: '{{x}}', variables: {}, missing_behavior: 'error' })).json, d => d.rendered === null && d.rendered_length === null && d.all_resolved === false ? null : `unexpected ${d.rendered}`);
  check('prompt-template-renderer', 'POST /render (all resolved)', 'RenderResponse', (await call(base, 'POST', '/prompt-template-renderer/render', { template: 'Hi {{name}}', variables: { name: 'Bo' } })).json, d => d.all_resolved === true && d.rendered === 'Hi Bo' && d.confidence_score === 1 ? null : `unexpected ${d.rendered}`);
  check('prompt-template-renderer', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/prompt-template-renderer/lookup', { template: '{{a}}', variables: { a: 'z' } })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('prompt-template-renderer 400 no template', (await call(base, 'POST', '/prompt-template-renderer/render', { variables: {} })).status === 400, 'expected 400');

  // ---- sse-parser ----
  console.log('sse-parser:');
  check('sse-parser', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/sse-parser/')).json);
  {
    const text = 'event: message\ndata: {"delta":"Hel"}\n\ndata: {"delta":"lo"}\n\ndata: [DONE]\n\n';
    const r = (await call(base, 'POST', '/sse-parser/parse', { text })).json;
    check('sse-parser', 'POST /parse (deltas + DONE)', 'ParseResponse', r, d =>
      d.event_count === 3 && d.json_parsed_count === 2 && d.done === true
        && d.events[0].event === 'message' && d.events[0].data_json.delta === 'Hel' && d.events[2].is_done === true
        && d.stream_type_detected === 'generic' && d.assembled_text === null
        && d.byte_length === Buffer.byteLength(text, 'utf8') ? null : `unexpected ${d.event_count}/${d.stream_type_detected}/${d.assembled_text}`);
  }
  {
    const text = 'data: {"delta":"Hel"}\n\ndata: {"delta":"lo"}\n\ndata: [DONE]\n\n';
    const r = (await call(base, 'POST', '/sse-parser/parse', { text, assemble: true })).json;
    check('sse-parser', 'POST /parse (assemble generic)', 'ParseResponse', r, d => d.assembled_text === 'Hello' && d.stream_type_detected === 'generic' ? null : `unexpected assembled=${d.assembled_text}`);
  }
  {
    // OpenAI-shaped detection + content_path assembly
    const text = 'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: {"choices":[{"delta":{"content":" there"}}]}\n\ndata: [DONE]\n\n';
    const r = (await call(base, 'POST', '/sse-parser/parse', { text, assemble: true })).json;
    check('sse-parser', 'POST /parse (openai detect + assemble)', 'ParseResponse', r, d => d.stream_type_detected === 'openai' && d.assembled_text === 'Hi there' ? null : `unexpected ${d.stream_type_detected}/${d.assembled_text}`);
  }
  {
    const text = ': this is a comment\nid: 42\nevent: ping\ndata: line1\ndata: line2\n\n';
    const r = (await call(base, 'POST', '/sse-parser/parse', { text })).json;
    check('sse-parser', 'POST /parse (multiline data + comment + id)', 'ParseResponse', r, d =>
      d.event_count === 1 && d.comment_count === 1 && d.events[0].id === '42' && d.events[0].event === 'ping'
        && d.events[0].data === 'line1\nline2' && d.done === false ? null : `unexpected ${JSON.stringify(d.events)}`);
  }
  check('sse-parser', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/sse-parser/lookup', { text: 'data: hi\n\n' })).json, d => d.reasoning && d.event_count === 1 ? null : 'expected reasoning');
  assert('sse-parser 400 no text', (await call(base, 'POST', '/sse-parser/parse', {})).status === 400, 'expected 400');

  // ---- determinism (volatile fields excluded) ----
  console.log('determinism:');
  const repBody = { text: "{ 'k': 'v', n: 5, }" };
  const a = stripVolatile((await call(base, 'POST', '/json-repair/repair', repBody)).json);
  const b = stripVolatile((await call(base, 'POST', '/json-repair/repair', repBody)).json);
  assert('json-repair deterministic', JSON.stringify(a) === JSON.stringify(b), 'outputs differ');
  const sseBody = { text: 'data: {"x":1}\n\ndata: [DONE]\n\n' };
  const s1 = stripVolatile((await call(base, 'POST', '/sse-parser/parse', sseBody)).json);
  const s2 = stripVolatile((await call(base, 'POST', '/sse-parser/parse', sseBody)).json);
  assert('sse-parser deterministic', JSON.stringify(s1) === JSON.stringify(s2), 'outputs differ');

  // ---- spec drift guards ----
  console.log('spec drift guards:');
  for (const slug of Object.keys(APIS)) driftGuard(slug);
}

(async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.on('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); } catch (e) { console.error(e); fail++; }
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
