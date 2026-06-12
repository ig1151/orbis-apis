// Group F batch 1 validator: live responses ajv-2020 vs published schema, spec
// responseExample drift guard, 400 paths, determinism (volatile fields excluded),
// and deterministic logic asserts for the 5 security/policy APIs:
// password-strength-analyzer, passphrase-generator, totp-hotp-generator,
// secret-scanner, csp-builder-linter.
const express = require('express');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'password-strength-analyzer': { router: require('../dist/routes/password-strength-analyzer-api/routes/intelligence').default, spec: require('../dist/routes/password-strength-analyzer-api/routes/openapi').spec },
  'passphrase-generator': { router: require('../dist/routes/passphrase-generator-api/routes/intelligence').default, spec: require('../dist/routes/passphrase-generator-api/routes/openapi').spec },
  'totp-hotp-generator': { router: require('../dist/routes/totp-hotp-generator-api/routes/intelligence').default, spec: require('../dist/routes/totp-hotp-generator-api/routes/openapi').spec },
  'secret-scanner': { router: require('../dist/routes/secret-scanner-api/routes/intelligence').default, spec: require('../dist/routes/secret-scanner-api/routes/openapi').spec },
  'csp-builder-linter': { router: require('../dist/routes/csp-builder-linter-api/routes/intelligence').default, spec: require('../dist/routes/csp-builder-linter-api/routes/openapi').spec },
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
  // ---- password-strength-analyzer ----
  console.log('password-strength-analyzer:');
  check('password-strength-analyzer', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/password-strength-analyzer/')).json);
  check('password-strength-analyzer', 'POST /analyze (mixed)', 'AnalyzeResponse', (await call(base, 'POST', '/password-strength-analyzer/analyze', { password: 'Tk9$mWp2' })).json, d =>
    d.length === 8 && d.charset_pool_size === 95 && d.entropy_bits === 52.56 && d.score === 2 && d.strength === 'fair'
      && d.crack_times.offline_fast_hash_1e10_per_sec === 'days' && d.confidence_score === 0.9 ? null : `unexpected ${d.entropy_bits}/${d.score}/${d.strength}`);
  check('password-strength-analyzer', 'POST /analyze (common)', 'AnalyzeResponse', (await call(base, 'POST', '/password-strength-analyzer/analyze', { password: 'password' })).json, d =>
    d.is_common_password === true && d.score === 0 && d.strength === 'very weak' ? null : `expected common→0 got ${d.score}`);
  check('password-strength-analyzer', 'POST /analyze (all digits)', 'AnalyzeResponse', (await call(base, 'POST', '/password-strength-analyzer/analyze', { password: '46927183' })).json, d =>
    d.charset_pool_size === 10 && d.warnings.some(w => /All digits/.test(w)) ? null : `unexpected pool ${d.charset_pool_size}`);
  check('password-strength-analyzer', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/password-strength-analyzer/lookup', { password: 'Xz!9qLm2Wp7$' })).json, d => d.reasoning && d.score >= 2 ? null : 'expected reasoning');
  assert('password-strength-analyzer 400 missing password', (await call(base, 'POST', '/password-strength-analyzer/analyze', {})).status === 400, 'expected 400');
  assert('password-strength-analyzer 400 empty', (await call(base, 'POST', '/password-strength-analyzer/analyze', { password: '' })).status === 400, 'expected 400');

  // ---- passphrase-generator ----
  console.log('passphrase-generator:');
  check('passphrase-generator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/passphrase-generator/')).json);
  {
    const r = (await call(base, 'POST', '/passphrase-generator/generate', { words: 6 })).json;
    const expected = Math.round(6 * Math.log2(r.list_size) * 100) / 100;
    check('passphrase-generator', 'POST /generate (6 words)', 'GenerateResponse', r, d =>
      d.words === 6 && d.count === 1 && d.passphrases.length === 1 && d.entropy_bits === expected
        && d.passphrases[0].split('-').length === 6 && d.confidence_score === 1 ? null : `unexpected entropy ${d.entropy_bits} vs ${expected}`);
  }
  {
    const r = (await call(base, 'POST', '/passphrase-generator/generate', { words: 4, count: 5, separator: '_', include_number: true })).json;
    const expected = Math.round((4 * Math.log2(r.list_size) + Math.log2(10)) * 100) / 100;
    check('passphrase-generator', 'POST /generate (count+number)', 'GenerateResponse', r, d =>
      d.count === 5 && d.passphrases.length === 5 && d.include_number === true && d.entropy_bits === expected
        && d.passphrases.every(p => p.split('_').length === 5) ? null : `unexpected ${d.entropy_bits}/${d.passphrases.length}`);
  }
  check('passphrase-generator', 'POST /generate (capitalize)', 'GenerateResponse', (await call(base, 'POST', '/passphrase-generator/generate', { words: 5, capitalize: true })).json, d =>
    d.capitalize === true && d.passphrases[0].split('-').every(w => /^[A-Z]/.test(w)) ? null : 'expected capitalized words');
  check('passphrase-generator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/passphrase-generator/lookup', { words: 8 })).json, d => d.reasoning && d.words === 8 ? null : 'expected reasoning');
  assert('passphrase-generator 400 words too low', (await call(base, 'POST', '/passphrase-generator/generate', { words: 2 })).status === 400, 'expected 400');
  assert('passphrase-generator 400 count too high', (await call(base, 'POST', '/passphrase-generator/generate', { count: 99 })).status === 400, 'expected 400');

  // ---- totp-hotp-generator ----
  console.log('totp-hotp-generator:');
  const S = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // RFC test seed "12345678901234567890"
  check('totp-hotp-generator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/totp-hotp-generator/')).json);
  check('totp-hotp-generator', 'POST /generate (HOTP RFC4226 c0)', 'GenerateResponse', (await call(base, 'POST', '/totp-hotp-generator/generate', { secret: S, type: 'hotp', counter: 0 })).json, d =>
    d.code === '755224' && d.type === 'hotp' && d.counter === 0 ? null : `expected 755224 got ${d.code}`);
  check('totp-hotp-generator', 'POST /generate (TOTP RFC6238 T59)', 'GenerateResponse', (await call(base, 'POST', '/totp-hotp-generator/generate', { secret: S, timestamp: 59 })).json, d =>
    d.code === '287082' && d.counter === 1 && d.period === 30 && d.seconds_remaining === 1 ? null : `expected 287082 got ${d.code}`);
  check('totp-hotp-generator', 'POST /generate (TOTP 8-digit)', 'GenerateResponse', (await call(base, 'POST', '/totp-hotp-generator/generate', { secret: S, timestamp: 59, digits: 8 })).json, d =>
    d.code === '94287082' && d.digits === 8 ? null : `expected 94287082 got ${d.code}`);
  check('totp-hotp-generator', 'POST /verify (valid)', 'VerifyResponse', (await call(base, 'POST', '/totp-hotp-generator/verify', { secret: S, code: '287082', timestamp: 59, window: 1 })).json, d =>
    d.valid === true && d.matched_counter === 1 && d.matched_offset === 0 ? null : `expected valid got ${d.valid}`);
  check('totp-hotp-generator', 'POST /verify (wrong code)', 'VerifyResponse', (await call(base, 'POST', '/totp-hotp-generator/verify', { secret: S, code: '000000', timestamp: 59 })).json, d =>
    d.valid === false && d.matched_counter === null ? null : 'expected invalid');
  check('totp-hotp-generator', 'POST /secret', 'SecretResponse', (await call(base, 'POST', '/totp-hotp-generator/secret', { issuer: 'Acme', account: 'a@b.com', bytes: 20 })).json, d =>
    d.bytes === 20 && /^[A-Z2-7]+$/.test(d.secret) && d.otpauth_uri.startsWith('otpauth://totp/') && d.otpauth_uri.includes('issuer=Acme') ? null : `unexpected ${d.otpauth_uri}`);
  check('totp-hotp-generator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/totp-hotp-generator/lookup', { secret: S, timestamp: 59 })).json, d => d.reasoning && d.code === '287082' ? null : 'expected reasoning');
  assert('totp-hotp-generator 400 bad secret', (await call(base, 'POST', '/totp-hotp-generator/generate', { secret: '!!!!', type: 'hotp', counter: 0 })).status === 400, 'expected 400');
  assert('totp-hotp-generator 400 hotp no counter', (await call(base, 'POST', '/totp-hotp-generator/generate', { secret: S, type: 'hotp' })).status === 400, 'expected 400');

  // ---- secret-scanner ----
  console.log('secret-scanner:');
  check('secret-scanner', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/secret-scanner/')).json);
  {
    const text = "AWS_KEY=AKIAIOSFODNN7EXAMPLE\npassword = 'hunter2isnotsecure123'";
    const r = (await call(base, 'POST', '/secret-scanner/scan', { text })).json;
    check('secret-scanner', 'POST /scan (aws+generic)', 'ScanResponse', r, d =>
      d.has_secrets === true && d.finding_count === 2 && d.by_type.aws_access_key_id === 1
        && d.findings[0].type === 'aws_access_key_id' && d.findings[0].line === 1 && d.findings[0].column === 9
        && d.findings[0].match_preview === 'AKIA…LE' && d.confidence_score === 0.85 ? null : `unexpected ${JSON.stringify(d.by_type)}`);
  }
  check('secret-scanner', 'POST /scan (no redact)', 'ScanResponse', (await call(base, 'POST', '/secret-scanner/scan', { text: 'token=ghp_0123456789abcdefghijklmnopqrstuvwxyz', redact: false })).json, d =>
    d.has_secrets === true && d.findings.some(f => f.type === 'github_token' && f.match_preview.startsWith('ghp_')) ? null : 'expected raw github token');
  check('secret-scanner', 'POST /scan (clean)', 'ScanResponse', (await call(base, 'POST', '/secret-scanner/scan', { text: 'just some ordinary prose with no credentials here' })).json, d =>
    d.has_secrets === false && d.finding_count === 0 ? null : 'expected no secrets');
  check('secret-scanner', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/secret-scanner/lookup', { text: 'AKIAIOSFODNN7EXAMPLE' })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('secret-scanner 400 missing text', (await call(base, 'POST', '/secret-scanner/scan', {})).status === 400, 'expected 400');

  // ---- csp-builder-linter ----
  console.log('csp-builder-linter:');
  check('csp-builder-linter', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/csp-builder-linter/')).json);
  {
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.example.com; img-src *";
    const r = (await call(base, 'POST', '/csp-builder-linter/lint', { csp })).json;
    check('csp-builder-linter', 'POST /lint (weak policy)', 'LintResponse', r, d =>
      d.score === 28 && d.grade === 'F' && d.passed === false && d.by_severity.high === 2
        && d.findings[0].code === 'UNSAFE_INLINE_SCRIPT' && d.confidence_score === 0.9 ? null : `unexpected ${d.score}/${d.grade}/${d.findings[0]?.code}`);
  }
  check('csp-builder-linter', 'POST /lint (strong policy)', 'LintResponse', (await call(base, 'POST', '/csp-builder-linter/lint', { csp: "default-src 'none'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" })).json, d =>
    d.by_severity.high === 0 && d.passed === true && d.grade === 'A' ? null : `expected clean got ${d.grade}/${JSON.stringify(d.by_severity)}`);
  {
    const r = (await call(base, 'POST', '/csp-builder-linter/build', { directives: { 'default-src': ['self'], 'script-src': ['self', 'https://cdn.example.com'], 'object-src': ['none'] } })).json;
    check('csp-builder-linter', 'POST /build', 'BuildResponse', r, d =>
      d.policy === "default-src 'self'; script-src 'self' https://cdn.example.com; object-src 'none'" && d.header_name === 'Content-Security-Policy' && d.directive_count === 3 ? null : `unexpected ${d.policy}`);
  }
  check('csp-builder-linter', 'POST /build (report-only)', 'BuildResponse', (await call(base, 'POST', '/csp-builder-linter/build', { directives: { 'default-src': 'self' }, report_only: true })).json, d =>
    d.header_name === 'Content-Security-Policy-Report-Only' && d.policy === "default-src 'self'" ? null : 'expected report-only');
  check('csp-builder-linter', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/csp-builder-linter/lookup', { csp: "default-src 'self'" })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('csp-builder-linter 400 empty csp', (await call(base, 'POST', '/csp-builder-linter/lint', { csp: '' })).status === 400, 'expected 400');
  assert('csp-builder-linter 400 unknown directive', (await call(base, 'POST', '/csp-builder-linter/build', { directives: { 'bogus-src': ['self'] } })).status === 400, 'expected 400');

  // ---- determinism (exclude volatile + random generators) ----
  console.log('determinism:');
  const pwBody = { password: 'Zq7#tVm2Lp9!' };
  const p1 = stripVolatile((await call(base, 'POST', '/password-strength-analyzer/analyze', pwBody)).json);
  const p2 = stripVolatile((await call(base, 'POST', '/password-strength-analyzer/analyze', pwBody)).json);
  assert('password-strength-analyzer deterministic', JSON.stringify(p1) === JSON.stringify(p2), 'outputs differ');
  const otpBody = { secret: S, timestamp: 1234567890 };
  const o1 = stripVolatile((await call(base, 'POST', '/totp-hotp-generator/generate', otpBody)).json);
  const o2 = stripVolatile((await call(base, 'POST', '/totp-hotp-generator/generate', otpBody)).json);
  assert('totp-hotp-generator deterministic', JSON.stringify(o1) === JSON.stringify(o2), 'outputs differ');
  const cspBody = { csp: "default-src 'self'; script-src *" };
  const c1 = stripVolatile((await call(base, 'POST', '/csp-builder-linter/lint', cspBody)).json);
  const c2 = stripVolatile((await call(base, 'POST', '/csp-builder-linter/lint', cspBody)).json);
  assert('csp-builder-linter deterministic', JSON.stringify(c1) === JSON.stringify(c2), 'outputs differ');

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
