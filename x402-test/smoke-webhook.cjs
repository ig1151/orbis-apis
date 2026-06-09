// Webhook batch validator.
// Mounts each webhook API's router, hits every endpoint with real HTTP, and
// validates each response against the published OpenAPI schema using ajv 2020,
// plus deterministic crypto / scoring assertions (incl. a real sign→verify round-trip).
const express = require('express');
const crypto = require('crypto');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'webhook-signature-verifier': {
    router: require('../dist/routes/webhook-signature-verifier-api/routes/intelligence').default,
    spec: require('../dist/routes/webhook-signature-verifier-api/routes/openapi').spec,
  },
  'webhook-reliability-scorer': {
    router: require('../dist/routes/webhook-reliability-scorer-api/routes/intelligence').default,
    spec: require('../dist/routes/webhook-reliability-scorer-api/routes/openapi').spec,
  },
  'webhook-validator': {
    router: require('../dist/routes/webhook-validator-api/routes/intelligence').default,
    spec: require('../dist/routes/webhook-validator-api/routes/openapi').spec,
  },
  'webhook-payload-builder': {
    router: require('../dist/routes/webhook-payload-builder-api/routes/intelligence').default,
    spec: require('../dist/routes/webhook-payload-builder-api/routes/openapi').spec,
  },
};

const app = express();
app.use(express.json({ limit: '4mb' }));
for (const [slug, { router }] of Object.entries(APIS)) app.use('/' + slug, router);

const validators = {};
for (const [slug, { spec }] of Object.entries(APIS)) {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  ajv.addSchema(spec, slug);
  validators[slug] = (schemaName, data) => {
    const v = ajv.getSchema(`${slug}#/components/schemas/${schemaName}`);
    if (!v) throw new Error(`no schema ${schemaName} in ${slug}`);
    const ok = v(data);
    return { ok, errors: v.errors };
  };
}

let pass = 0, fail = 0;
function check(slug, label, schemaName, data, extra) {
  const { ok, errors } = validators[slug](schemaName, data);
  let extraMsg = '';
  if (ok && extra) { const e = extra(data); if (e) extraMsg = ' — ASSERT FAILED: ' + e; }
  const good = ok && !extraMsg;
  if (good) { pass++; console.log(`  ✓ ${label} → ${schemaName}`); }
  else {
    fail++;
    console.log(`  ✗ ${label} → ${schemaName}${extraMsg}`);
    if (!ok) console.log('    ' + JSON.stringify(errors));
  }
}

async function call(base, method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method, headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function run(base) {
  // ---- Signature Verifier (with a real GitHub-style round trip) ----
  console.log('webhook-signature-verifier:');
  check('webhook-signature-verifier', 'GET /', 'DiscoveryResponse', await call(base, 'GET', '/webhook-signature-verifier/'));

  const ghSecret = 'It\'s a Secret to Everybody';
  const ghBody = 'Hello, World!';
  const ghSig = 'sha256=' + crypto.createHmac('sha256', ghSecret).update(ghBody, 'utf8').digest('hex');
  const ghReq = { provider: 'github', secret: ghSecret, payload: ghBody, signature: ghSig };
  const ghOk = await call(base, 'POST', '/webhook-signature-verifier/verify', ghReq);
  check('webhook-signature-verifier', 'POST /verify (github valid)', 'VerifyResponse', ghOk, (d) =>
    d.signature_status === 'valid' && d.match === true && d.recommended_fix === null && d.computed_signature === ghSig &&
    d.computed_signature_preview === 'sha256=' + ghSig.slice(7, 15) + '…' ? null : `expected valid: ${JSON.stringify({ s: d.signature_status, c: d.computed_signature, p: d.computed_signature_preview })}`);

  const ghBad = await call(base, 'POST', '/webhook-signature-verifier/verify', { ...ghReq, secret: 'wrong-secret' });
  check('webhook-signature-verifier', 'POST /verify (github wrong secret)', 'VerifyResponse', ghBad, (d) =>
    d.signature_status === 'invalid' && d.match === false && typeof d.recommended_fix === 'string' ? null : `expected invalid: ${d.signature_status}`);

  // Stripe round-trip: signature carries its own timestamp.
  const stSecret = 'whsec_stripe';
  const stBody = '{"id":"evt_1","type":"payment_intent.succeeded"}';
  const stTs = '1718000000';
  const stDigest = crypto.createHmac('sha256', stSecret).update(`${stTs}.${stBody}`, 'utf8').digest('hex');
  const stReq = { provider: 'stripe', secret: stSecret, payload: stBody, signature: `t=${stTs},v1=${stDigest}` };
  const stOk = await call(base, 'POST', '/webhook-signature-verifier/lookup', stReq);
  check('webhook-signature-verifier', 'POST /lookup (stripe valid, ts from header)', 'LookupResponse', stOk, (d) =>
    d.signature_status === 'valid' && d.match === true && d.reasoning && d.confidence_score === 1.0 ? null : `stripe lookup: ${JSON.stringify({ s: d.signature_status })}`);

  // Slack missing timestamp → missing_timestamp.
  const slMissing = await call(base, 'POST', '/webhook-signature-verifier/verify', { provider: 'slack', secret: 'x', payload: 'b', signature: 'v0=abc' });
  check('webhook-signature-verifier', 'POST /verify (slack missing ts)', 'VerifyResponse', slMissing, (d) =>
    d.signature_status === 'missing_timestamp' && d.computed_signature === null ? null : `expected missing_timestamp: ${d.signature_status}`);

  const svBad = await call(base, 'POST', '/webhook-signature-verifier/verify', { provider: 'nope', secret: 'x', payload: 'b', signature: 's' });
  check('webhook-signature-verifier', 'POST /verify (bad provider → 400)', 'Error400', svBad, (d) => d.error && d.error.code === 'invalid_request' ? null : 'expected invalid_request');

  // ---- Reliability Scorer ----
  console.log('webhook-reliability-scorer:');
  check('webhook-reliability-scorer', 'GET /', 'DiscoveryResponse', await call(base, 'GET', '/webhook-reliability-scorer/'));

  const attempts = { attempts: [
    { success: true, status_code: 200, latency_ms: 180, attempt_number: 1 },
    { success: false, status_code: 503, latency_ms: 1200, attempt_number: 1 },
    { success: true, status_code: 200, latency_ms: 240, attempt_number: 2 },
    { success: false, status_code: 504, latency_ms: 9000, attempt_number: 1 },
  ] };
  const sc = await call(base, 'POST', '/webhook-reliability-scorer/score', attempts);
  check('webhook-reliability-scorer', 'POST /score (attempts)', 'ScoreResponse', sc, (d) =>
    d.total_deliveries === 4 && d.successful_deliveries === 2 && d.success_rate === 0.5 && d.retry_rate === 0.25 &&
    d.latency && d.latency.max_ms === 9000 && d.failure_reason.length === 2 ? null : `score: ${JSON.stringify({ sr: d.success_rate, rr: d.retry_rate, fr: d.failure_reason })}`);

  const allOk = await call(base, 'POST', '/webhook-reliability-scorer/score', { attempts: [
    { success: true, status_code: 200, latency_ms: 100 },
    { success: true, status_code: 200, latency_ms: 120 },
  ] });
  check('webhook-reliability-scorer', 'POST /score (all healthy)', 'ScoreResponse', allOk, (d) =>
    d.delivery_score === 100 && d.health_status === 'healthy' && d.failed_deliveries === 0 && d.failure_reason.length === 0 ? null : `expected healthy: ${JSON.stringify({ ds: d.delivery_score, hs: d.health_status })}`);

  const statsReq = { stats: { total_deliveries: 1000, successful_deliveries: 850, retried_deliveries: 120, p50_latency_ms: 200, p95_latency_ms: 1500, failure_breakdown: { server_error: 100, timeout: 50 } } };
  const stl = await call(base, 'POST', '/webhook-reliability-scorer/lookup', statsReq);
  check('webhook-reliability-scorer', 'POST /lookup (stats)', 'LookupResponse', stl, (d) =>
    d.total_deliveries === 1000 && d.success_rate === 0.85 && d.reasoning && d.latency && d.latency.p95_ms === 1500 &&
    d.failure_reason.some((f) => f.category === 'server_error' && f.count === 100) ? null : `stats lookup: ${JSON.stringify({ sr: d.success_rate, lat: d.latency })}`);

  // client-error dominated → no-retry policy
  const clientErr = await call(base, 'POST', '/webhook-reliability-scorer/score', { attempts: [
    { success: false, status_code: 400 }, { success: false, status_code: 401 }, { success: true, status_code: 200 },
  ] });
  check('webhook-reliability-scorer', 'POST /score (4xx → no-retry policy)', 'ScoreResponse', clientErr, (d) =>
    d.failure_reason[0].category === 'client_error' && d.retry_policy.recommended_max_retries === 0 ? null : `expected no-retry: ${JSON.stringify(d.retry_policy)}`);

  const scBad = await call(base, 'POST', '/webhook-reliability-scorer/score', {});
  check('webhook-reliability-scorer', 'POST /score (empty → 400)', 'Error400', scBad, (d) => d.error && d.error.code === 'invalid_request' ? null : 'expected invalid_request');
  const scBad2 = await call(base, 'POST', '/webhook-reliability-scorer/score', { stats: { total_deliveries: 10, successful_deliveries: 20 } });
  check('webhook-reliability-scorer', 'POST /score (successful>total → 400)', 'Error400', scBad2, (d) => d.error && d.error.code === 'invalid_request' ? null : 'expected invalid_request');

  // ---- Validator ----
  console.log('webhook-validator:');
  check('webhook-validator', 'GET /', 'DiscoveryResponse', await call(base, 'GET', '/webhook-validator/'));

  const goodCfg = { url: 'https://x.example.com/wh', has_signature_verification: true, verifies_timestamp: true, timestamp_tolerance_seconds: 300, has_idempotency: true, content_type: 'application/json', timeout_ms: 3000, max_retries: 4, payload: '{"a":1}', max_payload_bytes: 1024 };
  const gv = await call(base, 'POST', '/webhook-validator/validate', goodCfg);
  check('webhook-validator', 'POST /validate (all good)', 'ValidateResponse', gv, (d) =>
    d.verdict === 'production_ready' && d.failed === 0 && d.warnings === 0 && d.critical_issues === 0 && d.validation_score === 100 ? null : `expected ready: ${JSON.stringify({ v: d.verdict, s: d.validation_score, w: d.warnings })}`);

  const badCfg = { url: 'http://x.example.com/wh', has_signature_verification: false, payload: 'not json{' };
  const bv = await call(base, 'POST', '/webhook-validator/lookup', badCfg);
  check('webhook-validator', 'POST /lookup (insecure + bad json)', 'LookupResponse', bv, (d) =>
    d.verdict === 'not_production_ready' && d.critical_issues >= 1 &&
    d.checks.find((c) => c.id === 'https').status === 'fail' &&
    d.checks.find((c) => c.id === 'signature_verification').status === 'fail' &&
    d.checks.find((c) => c.id === 'payload_json').status === 'fail' && d.reasoning ? null : `expected not-ready: ${JSON.stringify({ v: d.verdict, ci: d.critical_issues })}`);

  const vBad = await call(base, 'POST', '/webhook-validator/validate', {});
  check('webhook-validator', 'POST /validate (empty → 400)', 'Error400', vBad, (d) => d.error && d.error.code === 'invalid_request' ? null : 'expected invalid_request');

  // ---- Payload Builder (round-trips into the verifier) ----
  console.log('webhook-payload-builder:');
  check('webhook-payload-builder', 'GET /', 'DiscoveryResponse', await call(base, 'GET', '/webhook-payload-builder/'));

  const buildReq = { provider: 'github', event_type: 'push', data: { ref: 'refs/heads/main' }, secret: 'topsecret', message_id: 'evt_x', timestamp: 1718000000, url: 'https://x.example.com/wh' };
  const bb = await call(base, 'POST', '/webhook-payload-builder/build', buildReq);
  check('webhook-payload-builder', 'POST /build (github)', 'BuildResponse', bb, (d) =>
    d.provider === 'github' && d.headers['X-Hub-Signature-256'] === d.signature && d.signature.startsWith('sha256=') &&
    d.request.method === 'POST' && d.request.body === d.body && d.message_id === 'evt_x' && d.secret_echoed === false ? null : `build shape: ${JSON.stringify({ h: d.headers, sig: d.signature, se: d.secret_echoed })}`);
  // Independent recompute of the github signature over the returned body.
  check('webhook-payload-builder', 'build signature matches independent HMAC', 'BuildResponse', bb, (d) => {
    const expect = 'sha256=' + crypto.createHmac('sha256', 'topsecret').update(d.body, 'utf8').digest('hex');
    return d.signature === expect ? null : `sig mismatch: ${d.signature} vs ${expect}`;
  });
  // Round-trip: feed the built signature back into the verifier → valid.
  const rt = await call(base, 'POST', '/webhook-signature-verifier/verify', { provider: 'github', secret: 'topsecret', payload: bb.body, signature: bb.signature });
  check('webhook-signature-verifier', 'verify the built github payload (round-trip)', 'VerifyResponse', rt, (d) =>
    d.signature_status === 'valid' && d.match === true ? null : `round-trip failed: ${d.signature_status}`);

  // Stripe build round-trip (timestamped scheme).
  const stripeBuild = await call(base, 'POST', '/webhook-payload-builder/lookup', { provider: 'stripe', event_type: 'invoice.paid', data: { amount: 100 }, secret: 'whsec_x', timestamp: 1718000000, message_id: 'evt_s' });
  check('webhook-payload-builder', 'POST /lookup (stripe)', 'LookupResponse', stripeBuild, (d) =>
    d.headers['Stripe-Signature'].startsWith('t=1718000000,v1=') && d.reasoning && d.timestamp === 1718000000 ? null : `stripe build: ${JSON.stringify(d.headers)}`);
  const stripeRt = await call(base, 'POST', '/webhook-signature-verifier/verify', { provider: 'stripe', secret: 'whsec_x', payload: stripeBuild.body, signature: stripeBuild.headers['Stripe-Signature'] });
  check('webhook-signature-verifier', 'verify the built stripe payload (round-trip)', 'VerifyResponse', stripeRt, (d) =>
    d.signature_status === 'valid' && d.match === true ? null : `stripe round-trip failed: ${d.signature_status}`);

  const bBad = await call(base, 'POST', '/webhook-payload-builder/build', { provider: 'github', event_type: '', data: {}, secret: 's' });
  check('webhook-payload-builder', 'POST /build (empty event_type → 400)', 'Error400', bBad, (d) => d.error && d.error.code === 'invalid_request' ? null : 'expected invalid_request');

  // ---- Embedded responseExample drift guard: every example in every spec must
  // validate against the schema it is declared under. Catches hand-written
  // example/response divergence (e.g. a stale delivery_score).
  console.log('openapi responseExample validation:');
  for (const [slug, { spec }] of Object.entries(APIS)) {
    for (const [p, ops] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        const media = op.responses?.['200']?.content?.['application/json'];
        if (!media?.example) continue;
        const ref = media.schema?.$ref?.split('/').pop();
        if (!ref) continue;
        check(slug, `example ${method.toUpperCase()} ${p}`, ref, media.example);
      }
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

const server = app.listen(0, async () => {
  const port = server.address().port;
  try { await run(`http://127.0.0.1:${port}`); }
  catch (e) { console.error(e); process.exit(1); }
  finally { server.close(); }
});
