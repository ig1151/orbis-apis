// Smoke test for deterministic rewrites batch 7: json-schema-validator, api-schema-validator (ajv).
// Mounts compiled routers; no network, no LLM.
const express = require('express');
function load(p) { const m = require(p); return m.default || m; }
const jsv = load('../dist/routes/json-schema-validator-api/routes/intelligence.js');
const asv = load('../dist/routes/api-schema-validator-api/routes/intelligence.js');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use('/json-schema-validator', jsv);
app.use('/api-schema-validator', asv);

let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) { pass++; console.log('  PASS', name); } else { fail++; console.log('  FAIL', name, extra != null ? JSON.stringify(extra).slice(0, 300) : ''); } }

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (path, body) => { const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json() }; };

  const userSchema = { $schema: 'http://json-schema.org/draft-07/schema#', type: 'object', properties: { id: { type: 'string' }, age: { type: 'integer' }, email: { type: 'string', format: 'email' } }, required: ['id', 'email'], additionalProperties: false };

  console.log('# json-schema-validator /validate (valid)');
  let r = await post('/json-schema-validator/validate', { json_data: { id: 'u1', age: 30, email: 'a@b.com' }, schema: userSchema });
  check('200', r.status === 200);
  check('is_valid true', r.json.is_valid === true, r.json.errors);
  check('error_count 0', r.json.error_count === 0);
  check('draft-07 detected', r.json.schema_version === 'draft-07');

  console.log('# json-schema-validator /validate (invalid: bad type + missing required + extra + bad format)');
  r = await post('/json-schema-validator/validate', { json_data: { id: 'u1', age: 'thirty', extra: 1 }, schema: userSchema });
  check('is_valid false', r.json.is_valid === false);
  check('has type error', r.json.errors.some(e => e.keyword === 'type'), r.json.errors);
  check('has required error', r.json.errors.some(e => e.keyword === 'required'));
  check('has additionalProperties error', r.json.errors.some(e => e.keyword === 'additionalProperties'));

  console.log('# json-schema-validator /validate (invalid schema)');
  r = await post('/json-schema-validator/validate', { json_data: {}, schema: { type: 'not_a_real_type' } });
  check('success false on bad schema', r.json.success === false && r.json.is_valid === false, r.json);

  console.log('# json-schema-validator /generate');
  r = await post('/json-schema-validator/generate', { json_sample: { id: 'x', count: 5, price: 1.5, when: '2026-06-09T00:00:00Z', mail: 'a@b.com', tags: ['x'] }, strict: true });
  check('200', r.status === 200);
  check('object type', r.json.schema.type === 'object');
  check('integer inferred', r.json.schema.properties.count.type === 'integer', r.json.schema.properties.count);
  check('number inferred', r.json.schema.properties.price.type === 'number');
  check('date-time format', r.json.schema.properties.when.format === 'date-time', r.json.schema.properties.when);
  check('email format', r.json.schema.properties.mail.format === 'email');
  check('array type', r.json.schema.properties.tags.type === 'array');
  check('self validation passes', r.json.self_validation_passed === true);
  check('required all (strict)', r.json.required_fields.length === 6, r.json.required_fields);

  console.log('# json-schema-validator /compare (breaking)');
  const sA = { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } }, required: ['id'] };
  const sB = { type: 'object', properties: { id: { type: 'integer' }, email: { type: 'string' } }, required: ['id', 'email'] };
  r = await post('/json-schema-validator/compare', { schema_a: sA, schema_b: sB });
  check('not compatible', r.json.compatible === false);
  check('name removed', r.json.removals.includes('name'));
  check('email added', r.json.additions.includes('email'));
  check('id type changed', r.json.type_changes.some(t => /id/.test(t)));
  check('migration major', r.json.migration_complexity === 'major' || r.json.migration_complexity === 'moderate', r.json.migration_complexity);

  console.log('# json-schema-validator /compare (compatible)');
  r = await post('/json-schema-validator/compare', { schema_a: sA, schema_b: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, nick: { type: 'string' } }, required: ['id'] } });
  check('compatible true', r.json.compatible === true);
  check('migration trivial', r.json.migration_complexity === 'trivial', r.json.migration_complexity);

  console.log('# json-schema-validator /fix');
  r = await post('/json-schema-validator/fix', { json_data: { age: '30', extra: 1 }, schema: userSchema });
  check('200', r.status === 200);
  check('has fixes', r.json.fixes.length > 0, r.json.fixes);
  check('coerced age to int', r.json.corrected_json.age === 30, r.json.corrected_json);
  check('removed extra', !('extra' in r.json.corrected_json));
  check('added required id/email', 'id' in r.json.corrected_json && 'email' in r.json.corrected_json);

  console.log('# json-schema-validator /schema-intelligence (no schema → infer)');
  r = await post('/json-schema-validator/schema-intelligence', { json_data: { id: 'a', n: 1 } });
  check('200', r.status === 200);
  check('quality score number', typeof r.json.schema_quality_score === 'number');
  check('recommended_schema present', r.json.recommended_schema && r.json.recommended_schema.type === 'object');

  console.log('# json-schema-validator /batch');
  r = await post('/json-schema-validator/batch', { validations: [ { json_data: { id: 'a', email: 'a@b.com' }, schema: userSchema, label: 'ok' }, { json_data: { age: 1 }, schema: userSchema, label: 'bad' } ] });
  check('batch_count 2', r.json.batch_count === 2);
  check('valid_count 1', r.json.valid_count === 1, r.json.results);
  check('invalid_count 1', r.json.invalid_count === 1);

  // ---- api-schema-validator ----
  const openapi = {
    openapi: '3.0.3', info: { title: 'X', version: '1.0.0' },
    paths: { '/items': { get: { operationId: 'listItems', summary: 'List', tags: ['items'], responses: { '200': { description: 'ok', content: { 'application/json': { example: [] } } } } } } },
    components: { schemas: { Item: { type: 'object', properties: { id: { type: 'string' } } }, Unused: { type: 'object' } }, securitySchemes: { apiKey: { type: 'apiKey', in: 'header', name: 'X-Key' } } },
  };
  // reference Item so only Unused is unused
  openapi.paths['/items'].get.responses['200'].content['application/json'].schema = { $ref: '#/components/schemas/Item' };

  console.log('# api-schema-validator /validate (valid openapi 3.0)');
  r = await post('/api-schema-validator/validate', { input: openapi });
  check('200', r.status === 200);
  check('type openapi_3_0', r.json.data.schema_type === 'openapi_3_0', r.json.data.schema_type);
  check('is_valid true', r.json.data.is_valid === true, r.json.data.errors);
  check('paths_count 1', r.json.data.paths_count === 1);
  check('schemas_count 2', r.json.data.schemas_count === 2);
  check('model deterministic', r.json.execution_metadata.model === 'deterministic');

  console.log('# api-schema-validator /validate (invalid openapi: missing info.version + op without responses)');
  const badOpenapi = { openapi: '3.0.0', info: { title: 'X' }, paths: { '/x': { get: {} } } };
  r = await post('/api-schema-validator/validate', { input: JSON.stringify(badOpenapi) });
  check('is_valid false', r.json.data.is_valid === false);
  check('missing version error', r.json.data.errors.some(e => /version/.test(e.message)));
  check('missing responses error', r.json.data.errors.some(e => /responses/.test(e.message)));

  console.log('# api-schema-validator /validate (json schema via ajv)');
  r = await post('/api-schema-validator/validate', { input: userSchema });
  check('type json_schema_draft7', r.json.data.schema_type === 'json_schema_draft7', r.json.data.schema_type);
  check('valid json schema', r.json.data.is_valid === true, r.json.data.errors);

  console.log('# api-schema-validator /validate (broken json schema)');
  r = await post('/api-schema-validator/validate', { input: { $schema: 'http://json-schema.org/draft-07/schema#', type: 'object', properties: { x: { type: 'bogus' } } } });
  check('broken schema invalid', r.json.data.is_valid === false, r.json.data.errors);

  console.log('# api-schema-validator /lint');
  r = await post('/api-schema-validator/lint', { input: openapi });
  check('200', r.status === 200);
  check('lint_score number', typeof r.json.data.lint_score === 'number');
  check('Unused detected', r.json.data.unused_schemas.includes('Unused'), r.json.data.unused_schemas);
  check('Item not unused', !r.json.data.unused_schemas.includes('Item'));
  check('info.description flagged', r.json.data.best_practice_violations.some(v => /description/.test(v)));

  console.log('# api-schema-validator /lint (security gap)');
  r = await post('/api-schema-validator/lint', { input: badOpenapi });
  check('security issue flagged', r.json.data.security_issues.length > 0, r.json.data.security_issues);

  console.log('# api-schema-validator /schema-validator-intelligence');
  r = await post('/api-schema-validator/schema-validator-intelligence', { input: openapi });
  check('200', r.status === 200);
  check('overall_score number', typeof r.json.data.overall_score === 'number');
  check('key_findings', Array.isArray(r.json.data.key_findings) && r.json.data.key_findings.length > 0);

  console.log('# api-schema-validator error handling');
  r = await post('/api-schema-validator/validate', {});
  check('400 missing input', r.status === 400);
  r = await post('/api-schema-validator/validate', { input: 'totally not json' });
  check('200 success:false unparseable', r.status === 200 && r.json.success === false, r.json);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
});
