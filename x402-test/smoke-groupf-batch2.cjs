// Group F batch 2 validator: live responses ajv-2020 vs published schema, spec
// responseExample drift guard, 400 paths, determinism, and deterministic logic
// asserts for the 6 security/policy APIs that complete Group F:
// cors-linter, dockerfile-linter, env-validator, iam-scope-simulator,
// oauth-scope-diff, jwt-claim-policy-validator.
const express = require('express');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'cors-linter': { router: require('../dist/routes/cors-linter-api/routes/intelligence').default, spec: require('../dist/routes/cors-linter-api/routes/openapi').spec },
  'dockerfile-linter': { router: require('../dist/routes/dockerfile-linter-api/routes/intelligence').default, spec: require('../dist/routes/dockerfile-linter-api/routes/openapi').spec },
  'env-validator': { router: require('../dist/routes/env-validator-api/routes/intelligence').default, spec: require('../dist/routes/env-validator-api/routes/openapi').spec },
  'iam-scope-simulator': { router: require('../dist/routes/iam-scope-simulator-api/routes/intelligence').default, spec: require('../dist/routes/iam-scope-simulator-api/routes/openapi').spec },
  'oauth-scope-diff': { router: require('../dist/routes/oauth-scope-diff-api/routes/intelligence').default, spec: require('../dist/routes/oauth-scope-diff-api/routes/openapi').spec },
  'jwt-claim-policy-validator': { router: require('../dist/routes/jwt-claim-policy-validator-api/routes/intelligence').default, spec: require('../dist/routes/jwt-claim-policy-validator-api/routes/openapi').spec },
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
  // ---- cors-linter ----
  console.log('cors-linter:');
  check('cors-linter', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/cors-linter/')).json);
  check('cors-linter', 'POST /lint (wildcard+creds)', 'LintResponse', (await call(base, 'POST', '/cors-linter/lint', { allow_origin: '*', allow_credentials: true, allow_methods: ['GET', 'POST'] })).json, d =>
    d.score === 75 && d.grade === 'C' && d.passed === false && d.by_severity.high === 1 && d.findings[0].code === 'WILDCARD_ORIGIN_WITH_CREDENTIALS' && d.confidence_score === 0.9 ? null : `unexpected ${d.score}/${d.findings[0]?.code}`);
  check('cors-linter', 'POST /lint (specific origin no vary)', 'LintResponse', (await call(base, 'POST', '/cors-linter/lint', { allow_origin: 'https://app.example.com', allow_methods: ['GET'] })).json, d =>
    d.findings.some(f => f.code === 'MISSING_VARY_ORIGIN') ? null : 'expected MISSING_VARY_ORIGIN');
  check('cors-linter', 'POST /lint (from headers)', 'LintResponse', (await call(base, 'POST', '/cors-linter/lint', { headers: { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Methods': 'GET' } })).json, d =>
    d.source === 'headers' && d.findings.some(f => f.code === 'NULL_ORIGIN_ALLOWED') ? null : 'expected null-origin from headers');
  check('cors-linter', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/cors-linter/lookup', { allow_origin: '*' })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('cors-linter 400 empty', (await call(base, 'POST', '/cors-linter/lint', {})).status === 400, 'expected 400');

  // ---- dockerfile-linter ----
  console.log('dockerfile-linter:');
  const DF = 'FROM node:latest\nRUN curl https://x.sh | bash\nENV API_KEY=sk_live_abc123\nCOPY . /app\nCMD ["node","x.js"]';
  check('dockerfile-linter', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/dockerfile-linter/')).json);
  check('dockerfile-linter', 'POST /lint (insecure)', 'LintResponse', (await call(base, 'POST', '/dockerfile-linter/lint', { dockerfile: DF })).json, d =>
    d.score === 28 && d.grade === 'F' && d.effective_user === null && d.by_severity.high === 2
      && d.findings[0].code === 'RUNS_AS_ROOT' && d.findings.some(f => f.code === 'REMOTE_EXEC_PIPE') && d.findings.some(f => f.code === 'SECRET_IN_IMAGE' || f.code === 'LATEST_TAG') ? null : `unexpected ${d.score}/${d.effective_user}`);
  check('dockerfile-linter', 'POST /lint (hardened)', 'LintResponse', (await call(base, 'POST', '/dockerfile-linter/lint', { dockerfile: 'FROM node:20.11-alpine@sha256:abc\nRUN echo hi\nUSER appuser\nHEALTHCHECK CMD true\nCOPY package.json .\nCMD ["node"]' })).json, d =>
    d.by_severity.high === 0 && d.effective_user === 'appuser' && d.passed === true ? null : `expected clean got ${d.score}/${JSON.stringify(d.by_severity)}`);
  check('dockerfile-linter', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/dockerfile-linter/lookup', { dockerfile: 'FROM alpine\nCMD sh' })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('dockerfile-linter 400 no FROM', (await call(base, 'POST', '/dockerfile-linter/lint', { dockerfile: 'RUN echo hi' })).status === 400, 'expected 400');

  // ---- env-validator ----
  console.log('env-validator:');
  check('env-validator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/env-validator/')).json);
  {
    const body = { env: 'PORT=8080\nDEBUG=maybe\nDATABASE_URL=postgres://localhost/db\n# comment\nBAD KEY=1', schema: { PORT: { type: 'port', required: true }, DEBUG: { type: 'boolean' }, API_KEY: { required: true } } };
    check('env-validator', 'POST /validate (schema fail)', 'ValidateResponse', (await call(base, 'POST', '/env-validator/validate', body)).json, d =>
      d.valid === false && d.checked_against_schema === true && d.missing_required.join(',') === 'API_KEY'
        && d.errors.some(e => e.code === 'TYPE_MISMATCH' && e.key === 'DEBUG') && d.errors.some(e => e.code === 'INVALID_KEY') && d.confidence_score === 1 ? null : `unexpected valid=${d.valid}`);
  }
  check('env-validator', 'POST /validate (format only ok)', 'ValidateResponse', (await call(base, 'POST', '/env-validator/validate', { env: 'FOO=bar\nBAZ=qux' })).json, d =>
    d.valid === true && d.checked_against_schema === false && d.keys.length === 2 ? null : `expected valid format-only got ${d.valid}`);
  check('env-validator', 'POST /validate (duplicate warn)', 'ValidateResponse', (await call(base, 'POST', '/env-validator/validate', { env: 'A=1\nA=2' })).json, d =>
    d.valid === true && d.warnings.some(w => w.code === 'DUPLICATE_KEY') ? null : 'expected duplicate warning');
  check('env-validator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/env-validator/lookup', { env: 'X=1' })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('env-validator 400 missing env', (await call(base, 'POST', '/env-validator/validate', {})).status === 400, 'expected 400');
  assert('env-validator 400 bad schema type', (await call(base, 'POST', '/env-validator/validate', { env: 'A=1', schema: { A: { type: 'nope' } } })).status === 400, 'expected 400');

  // ---- iam-scope-simulator ----
  console.log('iam-scope-simulator:');
  const POL = [{ effect: 'Allow', actions: ['s3:*'], resources: ['arn:aws:s3:::bucket/*'], sid: 'AllowS3' }, { effect: 'Deny', actions: ['s3:DeleteObject'], resources: ['*'], sid: 'DenyDelete' }];
  check('iam-scope-simulator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/iam-scope-simulator/')).json);
  check('iam-scope-simulator', 'POST /simulate (allow)', 'SimulateResponse', (await call(base, 'POST', '/iam-scope-simulator/simulate', { policies: POL, request: { action: 's3:GetObject', resource: 'arn:aws:s3:::bucket/file.txt' } })).json, d =>
    d.evaluated[0].decision === 'Allow' && d.evaluated[0].allowed === true && d.evaluated[0].deciding_statement.sid === 'AllowS3' && d.allow_count === 1 ? null : `unexpected ${d.evaluated[0].decision}`);
  check('iam-scope-simulator', 'POST /simulate (explicit deny overrides)', 'SimulateResponse', (await call(base, 'POST', '/iam-scope-simulator/simulate', { policies: POL, request: { action: 's3:DeleteObject', resource: 'arn:aws:s3:::bucket/file.txt' } })).json, d =>
    d.evaluated[0].decision === 'Deny' && d.evaluated[0].matched_allow.length === 1 && d.evaluated[0].matched_deny.length === 1 ? null : `expected Deny override got ${d.evaluated[0].decision}`);
  check('iam-scope-simulator', 'POST /simulate (implicit deny)', 'SimulateResponse', (await call(base, 'POST', '/iam-scope-simulator/simulate', { policies: POL, request: { action: 'ec2:StartInstances', resource: '*' } })).json, d =>
    d.evaluated[0].decision === 'ImplicitDeny' && d.evaluated[0].deciding_statement === null ? null : `expected ImplicitDeny got ${d.evaluated[0].decision}`);
  check('iam-scope-simulator', 'POST /simulate (batch)', 'SimulateResponse', (await call(base, 'POST', '/iam-scope-simulator/simulate', { policies: POL, requests: [{ action: 's3:GetObject', resource: 'arn:aws:s3:::bucket/a' }, { action: 's3:DeleteObject', resource: 'arn:aws:s3:::bucket/a' }] })).json, d =>
    d.request_count === 2 && d.allow_count === 1 && d.deny_count === 1 ? null : `unexpected counts`);
  check('iam-scope-simulator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/iam-scope-simulator/lookup', { policies: POL, request: { action: 's3:PutObject', resource: 'arn:aws:s3:::bucket/x' } })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('iam-scope-simulator 400 no request', (await call(base, 'POST', '/iam-scope-simulator/simulate', { policies: POL })).status === 400, 'expected 400');
  assert('iam-scope-simulator 400 bad effect', (await call(base, 'POST', '/iam-scope-simulator/simulate', { policies: [{ effect: 'Maybe', actions: ['*'], resources: ['*'] }], request: { action: 'a', resource: 'b' } })).status === 400, 'expected 400');

  // ---- oauth-scope-diff ----
  console.log('oauth-scope-diff:');
  check('oauth-scope-diff', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/oauth-scope-diff/')).json);
  check('oauth-scope-diff', 'POST /diff (missing+extra)', 'DiffResponse', (await call(base, 'POST', '/oauth-scope-diff/diff', { granted: 'openid profile email', required: ['openid', 'profile', 'offline_access'] })).json, d =>
    d.satisfied === false && d.missing.join(',') === 'offline_access' && d.extra.join(',') === 'email' && d.satisfied_count === 2 ? null : `unexpected ${JSON.stringify(d.missing)}`);
  check('oauth-scope-diff', 'POST /diff (hierarchy satisfies)', 'DiffResponse', (await call(base, 'POST', '/oauth-scope-diff/diff', { granted: ['admin'], required: ['read', 'write'], hierarchy: { admin: ['read', 'write', 'delete'] } })).json, d =>
    d.satisfied === true && d.used_hierarchy === true && d.granted_expanded.includes('delete') ? null : `expected hierarchy satisfy`);
  check('oauth-scope-diff', 'POST /diff (exact match)', 'DiffResponse', (await call(base, 'POST', '/oauth-scope-diff/diff', { granted: ['a', 'b'], required: ['a', 'b'] })).json, d =>
    d.satisfied === true && d.missing.length === 0 && d.extra.length === 0 ? null : 'expected exact satisfy');
  check('oauth-scope-diff', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/oauth-scope-diff/lookup', { granted: 'a', required: 'a b' })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('oauth-scope-diff 400 missing required', (await call(base, 'POST', '/oauth-scope-diff/diff', { granted: 'a' })).status === 400, 'expected 400');

  // ---- jwt-claim-policy-validator ----
  console.log('jwt-claim-policy-validator:');
  const CLAIMS = { iss: 'https://auth.example.com', aud: 'my-api', sub: 'user-123', exp: 2000000000, iat: 1999999000, scope: 'read' };
  check('jwt-claim-policy-validator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/jwt-claim-policy-validator/')).json);
  check('jwt-claim-policy-validator', 'POST /validate (valid claims)', 'ValidateResponse', (await call(base, 'POST', '/jwt-claim-policy-validator/validate', { claims: CLAIMS, policy: { iss: 'https://auth.example.com', aud: ['my-api'], require: ['sub', 'scope'] }, now: 1999999500 })).json, d =>
    d.valid === true && d.signature_verified === false && d.expires_in_seconds === 500 && d.violations.length === 0 ? null : `unexpected valid=${d.valid}`);
  check('jwt-claim-policy-validator', 'POST /validate (expired)', 'ValidateResponse', (await call(base, 'POST', '/jwt-claim-policy-validator/validate', { claims: { ...CLAIMS, exp: 1000 }, policy: { iss: 'https://auth.example.com' }, now: 1999999500 })).json, d =>
    d.valid === false && d.violations.some(v => v.code === 'EXPIRED') ? null : 'expected EXPIRED');
  check('jwt-claim-policy-validator', 'POST /validate (aud + iss mismatch)', 'ValidateResponse', (await call(base, 'POST', '/jwt-claim-policy-validator/validate', { claims: CLAIMS, policy: { iss: 'https://other.com', aud: ['someone-else'] }, now: 1999999500 })).json, d =>
    d.valid === false && d.violations.some(v => v.code === 'ISSUER_MISMATCH') && d.violations.some(v => v.code === 'AUDIENCE_MISMATCH') ? null : 'expected iss+aud mismatch');
  {
    // decode a real JWT (HS256 header + payload; signature ignored)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'abc', iss: 'me', exp: 2000000000 })).toString('base64url');
    const token = `${header}.${payload}.sig`;
    check('jwt-claim-policy-validator', 'POST /validate (decode token)', 'ValidateResponse', (await call(base, 'POST', '/jwt-claim-policy-validator/validate', { token, policy: { iss: 'me', require: ['sub'] }, now: 1000 })).json, d =>
      d.valid === true && d.header && d.header.alg === 'HS256' && d.claims.sub === 'abc' ? null : 'expected decoded token');
  }
  check('jwt-claim-policy-validator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/jwt-claim-policy-validator/lookup', { claims: CLAIMS, policy: { require: ['sub'] }, now: 1999999500 })).json, d => d.reasoning && d.signature_verified === false ? null : 'expected reasoning');
  assert('jwt-claim-policy-validator 400 no policy', (await call(base, 'POST', '/jwt-claim-policy-validator/validate', { claims: CLAIMS })).status === 400, 'expected 400');
  assert('jwt-claim-policy-validator 400 no token/claims', (await call(base, 'POST', '/jwt-claim-policy-validator/validate', { policy: {} })).status === 400, 'expected 400');

  // ---- determinism ----
  console.log('determinism:');
  for (const [slug, path, body] of [
    ['cors-linter', '/cors-linter/lint', { allow_origin: '*', allow_credentials: true }],
    ['dockerfile-linter', '/dockerfile-linter/lint', { dockerfile: DF }],
    ['env-validator', '/env-validator/validate', { env: 'A=1\nB=2', schema: { A: { type: 'integer' } } }],
    ['iam-scope-simulator', '/iam-scope-simulator/simulate', { policies: POL, request: { action: 's3:GetObject', resource: 'arn:aws:s3:::bucket/a' } }],
    ['oauth-scope-diff', '/oauth-scope-diff/diff', { granted: 'a b', required: 'a c' }],
    ['jwt-claim-policy-validator', '/jwt-claim-policy-validator/validate', { claims: CLAIMS, policy: { iss: 'https://auth.example.com' }, now: 1999999500 }],
  ]) {
    const a = stripVolatile((await call(base, 'POST', path, body)).json);
    const b = stripVolatile((await call(base, 'POST', path, body)).json);
    assert(`${slug} deterministic`, JSON.stringify(a) === JSON.stringify(b), 'outputs differ');
  }

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
