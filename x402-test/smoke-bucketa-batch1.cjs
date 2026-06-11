// Bucket A batch 1 validator: mounts each router, validates every live response
// against the published OpenAPI schema (ajv 2020), drift-guards each embedded spec
// responseExample, exercises 400 paths, and asserts deterministic logic.
const express = require('express');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'data-validator': { router: require('../dist/routes/data-validator-api/routes/intelligence').default, spec: require('../dist/routes/data-validator-api/routes/openapi').spec },
  'random-data-generator': { router: require('../dist/routes/random-data-generator-api/routes/intelligence').default, spec: require('../dist/routes/random-data-generator-api/routes/openapi').spec },
  'web-content-diff-checker': { router: require('../dist/routes/web-content-diff-checker-api/routes/intelligence').default, spec: require('../dist/routes/web-content-diff-checker-api/routes/openapi').spec },
  'web-vitals-grader': { router: require('../dist/routes/web-vitals-grader-api/routes/intelligence').default, spec: require('../dist/routes/web-vitals-grader-api/routes/openapi').spec },
  'web-content-type-classifier': { router: require('../dist/routes/web-content-type-classifier-api/routes/intelligence').default, spec: require('../dist/routes/web-content-type-classifier-api/routes/openapi').spec },
};

const app = express();
app.use(express.json({ limit: '2mb' }));
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
function driftGuard(slug) {
  const { spec } = APIS[slug];
  for (const [path, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) {
    const media = op.responses?.['200']?.content?.['application/json']; if (!media?.example) continue;
    check(slug, `spec example ${method.toUpperCase()} ${path}`, (media.schema?.$ref || '').split('/').pop(), media.example);
  }
}
async function call(base, method, path, body) {
  const res = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json() };
}

async function run(base) {
  // ---- data-validator ----
  console.log('data-validator:');
  check('data-validator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/data-validator/')).json);
  check('data-validator', 'POST /validate (luhn ok)', 'ValidateResponse', (await call(base, 'POST', '/data-validator/validate', { value: '4242 4242 4242 4242', type: 'luhn' })).json, d => d.valid === true && d.normalized === '4242424242424242' ? null : 'expected valid luhn');
  check('data-validator', 'POST /validate (luhn bad)', 'ValidateResponse', (await call(base, 'POST', '/data-validator/validate', { value: '4242 4242 4242 4241', type: 'luhn' })).json, d => d.valid === false ? null : 'expected invalid luhn');
  check('data-validator', 'POST /validate (IBAN ok)', 'ValidateResponse', (await call(base, 'POST', '/data-validator/validate', { value: 'GB82 WEST 1234 5698 7654 32', type: 'iban' })).json, d => d.valid === true ? null : 'expected valid IBAN');
  check('data-validator', 'POST /validate (ISBN-13 ok)', 'ValidateResponse', (await call(base, 'POST', '/data-validator/validate', { value: '978-0-306-40615-7', type: 'isbn' })).json, d => d.valid === true ? null : 'expected valid ISBN-13');
  check('data-validator', 'POST /validate (UPC-A ok)', 'ValidateResponse', (await call(base, 'POST', '/data-validator/validate', { value: '036000291452', type: 'ean' })).json, d => d.valid === true ? null : 'expected valid UPC');
  check('data-validator', 'POST /validate (routing ok)', 'ValidateResponse', (await call(base, 'POST', '/data-validator/validate', { value: '021000021', type: 'routing' })).json, d => d.valid === true ? null : 'expected valid routing');
  check('data-validator', 'POST /validate (e164 ok)', 'ValidateResponse', (await call(base, 'POST', '/data-validator/validate', { value: '+14155552671', type: 'e164' })).json, d => d.valid === true ? null : 'expected valid e164');
  check('data-validator', 'POST /validate (email bad)', 'ValidateResponse', (await call(base, 'POST', '/data-validator/validate', { value: 'not-an-email', type: 'email' })).json, d => d.valid === false ? null : 'expected invalid email');
  check('data-validator', 'POST /validate (json ok)', 'ValidateResponse', (await call(base, 'POST', '/data-validator/validate', { value: '{"a":1}', type: 'json' })).json, d => d.valid === true ? null : 'expected valid json');
  check('data-validator', 'POST /lookup (auto)', 'LookupResponse', (await call(base, 'POST', '/data-validator/lookup', { value: '4242424242424242' })).json, d => d.detected_type === 'luhn' && Array.isArray(d.all_checks) && d.all_checks.length === 8 ? null : 'expected luhn + 8 checks');
  const dvBad = await call(base, 'POST', '/data-validator/validate', {});
  check('data-validator', 'POST /validate (no value -> 400)', 'Error400', dvBad.json, () => dvBad.status === 400 ? null : `status ${dvBad.status}`);
  const dvBadType = await call(base, 'POST', '/data-validator/validate', { value: 'x', type: 'bogus' });
  check('data-validator', 'POST /validate (bad type -> 400)', 'Error400', dvBadType.json, () => dvBadType.status === 400 ? null : `status ${dvBadType.status}`);
  driftGuard('data-validator');

  // ---- random-data-generator ----
  console.log('random-data-generator:');
  check('random-data-generator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/random-data-generator/')).json);
  const g1 = (await call(base, 'POST', '/random-data-generator/generate', { type: 'uuid', count: 3, seed: 'demo' })).json;
  const g2 = (await call(base, 'POST', '/random-data-generator/generate', { type: 'uuid', count: 3, seed: 'demo' })).json;
  check('random-data-generator', 'POST /generate (uuid seeded)', 'GenerateResponse', g1, d => d.values.length === 3 && /^[0-9a-f-]{36}$/.test(d.values[0]) ? null : 'expected 3 uuids');
  check('random-data-generator', 'seed reproducible', 'GenerateResponse', g2, d => JSON.stringify(d.values) === JSON.stringify(g1.values) ? null : 'same seed must reproduce values');
  check('random-data-generator', 'POST /generate (integer range)', 'GenerateResponse', (await call(base, 'POST', '/random-data-generator/generate', { type: 'integer', count: 50, seed: 's', min: 10, max: 20 })).json, d => d.values.every(v => v >= 10 && v <= 20) ? null : 'integers out of range');
  check('random-data-generator', 'POST /generate (address)', 'GenerateResponse', (await call(base, 'POST', '/random-data-generator/generate', { type: 'address', count: 1, seed: 's' })).json, d => typeof d.values[0] === 'object' && d.values[0].zip ? null : 'expected address object');
  check('random-data-generator', 'POST /lookup (rows)', 'LookupResponse', (await call(base, 'POST', '/random-data-generator/lookup', { fields: { id: 'uuid', email: 'email', age: 'integer' }, count: 4, seed: 'demo' })).json, d => d.rows.length === 4 && d.columns.length === 3 && d.rows[0].email.includes('@') ? null : 'expected 4 rows x 3 cols');
  const rdBad = await call(base, 'POST', '/random-data-generator/generate', { type: 'nope' });
  check('random-data-generator', 'POST /generate (bad type -> 400)', 'Error400', rdBad.json, () => rdBad.status === 400 ? null : `status ${rdBad.status}`);
  const rdBig = await call(base, 'POST', '/random-data-generator/generate', { type: 'uuid', count: 99999 });
  check('random-data-generator', 'POST /generate (count too big -> 400)', 'Error400', rdBig.json, () => rdBig.status === 400 ? null : `status ${rdBig.status}`);
  driftGuard('random-data-generator');

  // ---- web-content-diff-checker ----
  console.log('web-content-diff-checker:');
  check('web-content-diff-checker', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web-content-diff-checker/')).json);
  check('web-content-diff-checker', 'POST /diff (line)', 'DiffResponse', (await call(base, 'POST', '/web-content-diff-checker/diff', { a: 'line1\nline2\nline3', b: 'line1\nline2 changed\nline3\nline4' })).json, d => d.total_a === 3 && d.total_b === 4 && d.added === 2 && d.removed === 1 && d.unchanged === 2 ? null : `unexpected counts a${d.added}/r${d.removed}/u${d.unchanged}`);
  check('web-content-diff-checker', 'POST /diff (identical)', 'DiffResponse', (await call(base, 'POST', '/web-content-diff-checker/diff', { a: 'same', b: 'same' })).json, d => d.identical === true && d.similarity_pct === 100 ? null : 'expected identical 100%');
  check('web-content-diff-checker', 'POST /lookup (word)', 'LookupResponse', (await call(base, 'POST', '/web-content-diff-checker/lookup', { a: 'the quick brown fox', b: 'the slow brown fox', mode: 'word' })).json, d => d.mode === 'word' && d.identical === false ? null : 'expected word diff');
  const wdBad = await call(base, 'POST', '/web-content-diff-checker/diff', { a: 'only a' });
  check('web-content-diff-checker', 'POST /diff (missing b -> 400)', 'Error400', wdBad.json, () => wdBad.status === 400 ? null : `status ${wdBad.status}`);
  driftGuard('web-content-diff-checker');

  // ---- web-vitals-grader ----
  console.log('web-vitals-grader:');
  check('web-vitals-grader', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web-vitals-grader/')).json);
  check('web-vitals-grader', 'POST /grade (mixed)', 'GradeResponse', (await call(base, 'POST', '/web-vitals-grader/grade', { lcp_ms: 3200, inp_ms: 150, cls: 0.05 })).json, d => d.passes_cwv === false && d.grade === 'B' && d.score === 86.7 ? null : `expected B/86.7, got ${d.grade}/${d.score}`);
  check('web-vitals-grader', 'POST /grade (all good -> pass)', 'GradeResponse', (await call(base, 'POST', '/web-vitals-grader/grade', { lcp_ms: 2000, inp_ms: 150, cls: 0.05 })).json, d => d.passes_cwv === true && d.grade === 'A' ? null : 'expected pass + A');
  check('web-vitals-grader', 'POST /grade (poor)', 'GradeResponse', (await call(base, 'POST', '/web-vitals-grader/grade', { lcp_ms: 6000, inp_ms: 800, cls: 0.4 })).json, d => d.overall_rating === 'poor' && d.grade === 'F' ? null : 'expected poor/F');
  check('web-vitals-grader', 'POST /lookup (fid fallback)', 'LookupResponse', (await call(base, 'POST', '/web-vitals-grader/lookup', { lcp_ms: 2400, fid_ms: 90, cls: 0.08 })).json, d => d.metrics.some(m => m.metric === 'INP') && d.passes_cwv === true ? null : 'expected INP from fid + pass');
  const wvBad = await call(base, 'POST', '/web-vitals-grader/grade', { fcp_ms: 1000 });
  check('web-vitals-grader', 'POST /grade (no core -> 400)', 'Error400', wvBad.json, () => wvBad.status === 400 ? null : `status ${wvBad.status}`);
  driftGuard('web-vitals-grader');

  // ---- web-content-type-classifier ----
  console.log('web-content-type-classifier:');
  check('web-content-type-classifier', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web-content-type-classifier/')).json);
  check('web-content-type-classifier', 'POST /classify (pdf url)', 'ClassifyResponse', (await call(base, 'POST', '/web-content-type-classifier/classify', { url: 'https://example.com/report.pdf' })).json, d => d.category === 'pdf' && d.is_binary === true && d.source === 'extension' ? null : 'expected pdf');
  check('web-content-type-classifier', 'POST /classify (mime wins)', 'ClassifyResponse', (await call(base, 'POST', '/web-content-type-classifier/classify', { url: 'https://x.com/a.pdf', mime: 'text/html' })).json, d => d.category === 'webpage' && d.source === 'mime' ? null : 'mime should win -> webpage');
  check('web-content-type-classifier', 'POST /classify (extensionless url)', 'ClassifyResponse', (await call(base, 'POST', '/web-content-type-classifier/classify', { url: 'https://example.com/blog/post' })).json, d => d.category === 'webpage' ? null : 'expected webpage');
  check('web-content-type-classifier', 'POST /classify (unknown)', 'ClassifyResponse', (await call(base, 'POST', '/web-content-type-classifier/classify', { extension: 'xyz' })).json, d => d.category === 'unknown' ? null : 'expected unknown');
  check('web-content-type-classifier', 'POST /lookup (json mime)', 'LookupResponse', (await call(base, 'POST', '/web-content-type-classifier/lookup', { mime: 'application/json; charset=utf-8' })).json, d => d.category === 'data' && d.is_text === true ? null : 'expected data/text');
  const wcBad = await call(base, 'POST', '/web-content-type-classifier/classify', {});
  check('web-content-type-classifier', 'POST /classify (empty -> 400)', 'Error400', wcBad.json, () => wcBad.status === 400 ? null : `status ${wcBad.status}`);
  driftGuard('web-content-type-classifier');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

const server = app.listen(0, () => run(`http://127.0.0.1:${server.address().port}`).catch(e => { console.error(e); process.exit(1); }));
