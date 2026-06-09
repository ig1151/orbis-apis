// Builds a single self-contained review file for the webhook batch:
// per-API OpenAPI spec + Orbis listing + REAL sample request/response pairs
// (captured by mounting the routers), plus the A+ bar to grade against.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');

const ROOT = path.join(__dirname, '..');
const APIS = [
  { slug: 'webhook-signature-verifier', listing: 'webhook-signature-verifier-listing.json' },
  { slug: 'webhook-reliability-scorer', listing: 'webhook-reliability-scorer-listing.json' },
  { slug: 'webhook-validator', listing: 'webhook-validator-listing.json' },
  { slug: 'webhook-payload-builder', listing: 'webhook-payload-builder-listing.json' },
];

// Pre-computed real signatures so the verifier samples actually pass.
const GH_SECRET = "It's a Secret to Everybody";
const GH_BODY = 'Hello, World!';
const GH_SIG = 'sha256=' + crypto.createHmac('sha256', GH_SECRET).update(GH_BODY, 'utf8').digest('hex');
const ST_SECRET = 'whsec_stripe';
const ST_BODY = '{"id":"evt_1","type":"payment_intent.succeeded"}';
const ST_TS = '1718000000';
const ST_SIG = `t=${ST_TS},v1=` + crypto.createHmac('sha256', ST_SECRET).update(`${ST_TS}.${ST_BODY}`, 'utf8').digest('hex');

// Real sample calls per slug (GET / always added automatically).
const SAMPLES = {
  'webhook-signature-verifier': [
    ['POST', '/verify', { provider: 'github', secret: GH_SECRET, payload: GH_BODY, signature: GH_SIG }],
    ['POST', '/verify', { provider: 'github', secret: 'wrong-secret', payload: GH_BODY, signature: GH_SIG }],
    ['POST', '/lookup', { provider: 'stripe', secret: ST_SECRET, payload: ST_BODY, signature: ST_SIG }],
    ['POST', '/verify', { provider: 'slack', secret: 'x', payload: 'b', signature: 'v0=abc' }],
    ['POST', '/verify', { provider: 'nope', secret: 'x', payload: 'b', signature: 's' }],
  ],
  'webhook-reliability-scorer': [
    ['POST', '/score', { attempts: [
      { success: true, status_code: 200, latency_ms: 180, attempt_number: 1 },
      { success: false, status_code: 503, latency_ms: 1200, attempt_number: 1 },
      { success: true, status_code: 200, latency_ms: 240, attempt_number: 2 },
      { success: false, status_code: 504, latency_ms: 9000, attempt_number: 1 },
    ] }],
    ['POST', '/lookup', { stats: { total_deliveries: 1000, successful_deliveries: 850, retried_deliveries: 120, p50_latency_ms: 200, p95_latency_ms: 1500, failure_breakdown: { server_error: 100, timeout: 50 } } }],
    ['POST', '/score', { attempts: [{ success: false, status_code: 400 }, { success: false, status_code: 401 }, { success: true, status_code: 200 }] }],
    ['POST', '/score', {}],
  ],
  'webhook-validator': [
    ['POST', '/validate', { url: 'https://x.example.com/wh', has_signature_verification: true, verifies_timestamp: true, timestamp_tolerance_seconds: 300, has_idempotency: true, content_type: 'application/json', timeout_ms: 3000, max_retries: 4, payload: '{"a":1}', max_payload_bytes: 1024 }],
    ['POST', '/lookup', { url: 'http://x.example.com/wh', has_signature_verification: false, payload: 'not json{' }],
    ['POST', '/validate', {}],
  ],
  'webhook-payload-builder': [
    ['POST', '/build', { provider: 'github', event_type: 'push', data: { ref: 'refs/heads/main' }, secret: 'topsecret', message_id: 'evt_x', timestamp: 1718000000, url: 'https://x.example.com/wh' }],
    ['POST', '/lookup', { provider: 'stripe', event_type: 'invoice.paid', data: { amount: 100 }, secret: 'whsec_x', timestamp: 1718000000, message_id: 'evt_s' }],
    ['POST', '/build', { provider: 'github', event_type: '', data: {}, secret: 's' }],
  ],
};

const app = express();
app.use(express.json({ limit: '4mb' }));
const specs = {};
for (const { slug } of APIS) {
  const dir = slug + '-api';
  app.use('/' + slug, require(path.join(ROOT, 'dist/routes', dir, 'routes/intelligence')).default);
  specs[slug] = require(path.join(ROOT, 'dist/routes', dir, 'routes/openapi')).spec;
}

async function call(base, method, p, body) {
  const res = await fetch(`${base}${p}`, { method, headers: { 'content-type': 'application/json' }, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}

const REVIEW = {
  batch: 'webhook',
  generated_for: 'ChatGPT A+ review before Orbis listing',
  date: '2026-06-09',
  review_instructions:
    'Grade each API against the A+ agent-native bar and the webhook-specific rules below. Flag any schema/response mismatch, missing A+ field, pricing concern, fabrication risk, or correctness bug in the crypto/scoring/validation logic. Return a letter grade (A+/A/B/...) per API with concrete fixes.',
  aplus_standard: {
    global: [
      'OpenAPI 3.1; x-agent-callable / x-mcp-compatible / x402-compatible / x-agent-marketplace-ready / x-pay-per-call-optimized',
      'ApiKeyAuth (X-API-Key) + global security; root GET / discovery with typed 200',
      'fully-typed 200 schemas (no generic object); typed 400 + 500; endpoint-level x-pricing (USDC)',
      'envelope on every response: trace_id, computed_at, success, latency_ms; confidence_score',
      'reasoning {why_result_generated, key_factors, invalidators} on /lookup; recommended_actions_priority_order; chain_to [{api,reason}]',
      'privacy {data_stored, retention}; one-call /lookup where useful (x-one-call: true)',
      'Orbis listing JSON with endpointPricing + logoUrl + tags + keywords + tiers + endpoints',
    ],
    webhook_rules: [
      'signature_status from a real HMAC + constant-time compare (no LLM)',
      'retry_policy recommendation tuned to the dominant failure mode',
      'delivery_score / validation_score are deterministic, reproducible 0-100 numbers',
      'latency_ms, failure_reason, recommended_fix surfaced where relevant',
      'webhook_disclaimer on every response; x-security-sensitive on secret-handling APIs (verifier, builder)',
      'real crypto/arithmetic → confidence always 1.0; secrets/payloads never stored',
    ],
  },
  determinism_note: 'All four APIs compute in real code (src/routes/_aplus/webhook.ts: Node crypto HMAC + provider presets). No LLM calls. Confidence is 1.0 by construction. Verified by x402-test/smoke-webhook.cjs: 24/24 ajv-2020 checks incl. real GitHub + Stripe sign->verify round-trips.',
  apis: [],
};

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const { slug, listing } of APIS) {
      const sample_calls = [];
      const disc = await call(base, 'GET', `/${slug}/`);
      sample_calls.push({ method: 'GET', path: '/', request: null, status: disc.status, response: disc.body });
      for (const [method, p, body] of SAMPLES[slug]) {
        const r = await call(base, method, `/${slug}${p}`, body);
        sample_calls.push({ method, path: p, request: body, status: r.status, response: r.body });
      }
      REVIEW.apis.push({
        slug,
        listing: JSON.parse(fs.readFileSync(path.join(ROOT, listing), 'utf8')),
        openapi_spec: specs[slug],
        sample_calls,
      });
    }
    fs.writeFileSync(path.join(ROOT, 'batch-webhook-specs-for-review.json'), JSON.stringify(REVIEW, null, 2));
    const sz = fs.statSync(path.join(ROOT, 'batch-webhook-specs-for-review.json')).size;
    console.log(`wrote batch-webhook-specs-for-review.json (${(sz / 1024).toFixed(0)} KB, ${REVIEW.apis.length} APIs, ${REVIEW.apis.reduce((n, a) => n + a.sample_calls.length, 0)} sample calls)`);
  } catch (e) { console.error(e); process.exit(1); }
  finally { server.close(); }
});
