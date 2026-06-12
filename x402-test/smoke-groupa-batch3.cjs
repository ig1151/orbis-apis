// Group A batch 3 validator: live responses ajv-2020 vs published schema, spec
// responseExample drift guard, 400 paths, determinism check (volatile fields
// excluded), and deterministic logic asserts for the 5 cost/agent-infra APIs:
// embedding-cost-planner, idempotency-key-generator, agent-fanout-cost,
// truncation-planner, prompt-token-diff.
const express = require('express');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'embedding-cost-planner': { router: require('../dist/routes/embedding-cost-planner-api/routes/intelligence').default, spec: require('../dist/routes/embedding-cost-planner-api/routes/openapi').spec },
  'idempotency-key-generator': { router: require('../dist/routes/idempotency-key-generator-api/routes/intelligence').default, spec: require('../dist/routes/idempotency-key-generator-api/routes/openapi').spec },
  'agent-fanout-cost': { router: require('../dist/routes/agent-fanout-cost-api/routes/intelligence').default, spec: require('../dist/routes/agent-fanout-cost-api/routes/openapi').spec },
  'truncation-planner': { router: require('../dist/routes/truncation-planner-api/routes/intelligence').default, spec: require('../dist/routes/truncation-planner-api/routes/openapi').spec },
  'prompt-token-diff': { router: require('../dist/routes/prompt-token-diff-api/routes/intelligence').default, spec: require('../dist/routes/prompt-token-diff-api/routes/openapi').spec },
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
  // ---- embedding-cost-planner ----
  console.log('embedding-cost-planner:');
  check('embedding-cost-planner', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/embedding-cost-planner/')).json);
  {
    const r = (await call(base, 'POST', '/embedding-cost-planner/plan', { model: 'text-embedding-3-small', total_tokens: 1000000, doc_count: 500 })).json;
    check('embedding-cost-planner', 'POST /plan (total_tokens exact)', 'PlanResponse', r, d =>
      d.found === true && d.embedding_cost_usd === 0.02 && d.is_estimate === false && d.dimensions === 1536
        && d.vector_bytes === 6144 && d.total_vector_storage_bytes === 3072000 && d.batch_count === 6 && d.confidence_score === 1 ? null : `unexpected ${d.embedding_cost_usd}/${d.batch_count}/${d.total_vector_storage_bytes}`);
  }
  check('embedding-cost-planner', 'POST /plan (documents estimate)', 'PlanResponse', (await call(base, 'POST', '/embedding-cost-planner/plan', { model: '3-large', documents: ['hello world', 'another short doc'] })).json, d => d.found === true && d.model === 'text-embedding-3-large' && d.doc_count === 2 && d.is_estimate === true && d.dimensions === 3072 && d.confidence_score === 0.7 ? null : `unexpected ${d.model}/${d.dimensions}`);
  check('embedding-cost-planner', 'POST /plan (unknown model)', 'PlanResponse', (await call(base, 'POST', '/embedding-cost-planner/plan', { model: 'nope', total_tokens: 1000 })).json, d => d.found === false && d.embedding_cost_usd === null ? null : 'expected found:false');
  check('embedding-cost-planner', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/embedding-cost-planner/lookup', { model: 'ada-002', doc_count: 10, avg_tokens_per_doc: 500 })).json, d => d.reasoning && d.doc_count === 10 && d.total_tokens === 5000 ? null : 'expected reasoning');
  assert('embedding-cost-planner 400 no input', (await call(base, 'POST', '/embedding-cost-planner/plan', { model: '3-small' })).status === 400, 'expected 400');
  assert('embedding-cost-planner 400 dims over max', (await call(base, 'POST', '/embedding-cost-planner/plan', { model: '3-small', total_tokens: 10, dimensions: 99999 })).status === 400, 'expected 400');

  // ---- idempotency-key-generator ----
  console.log('idempotency-key-generator:');
  check('idempotency-key-generator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/idempotency-key-generator/')).json);
  {
    const body = { method: 'post', path: '/v1/charges', body: { amount: 100, currency: 'usd' }, namespace: 'payments' };
    const r1 = (await call(base, 'POST', '/idempotency-key-generator/generate', body)).json;
    check('idempotency-key-generator', 'POST /generate', 'GenerateResponse', r1, d =>
      d.algorithm === 'sha256' && d.namespace === 'payments' && d.idempotency_key === 'payments_' + d.hash_hex
        && d.short_key === d.hash_hex.slice(0, 16) && d.included_fields.join(',') === 'method,path,body' && d.confidence_score === 1 ? null : `unexpected ${d.idempotency_key}`);
    // key order-independence of object keys
    const r2 = (await call(base, 'POST', '/idempotency-key-generator/generate', { namespace: 'payments', body: { currency: 'usd', amount: 100 }, path: '/v1/charges', method: 'POST' })).json;
    assert('idempotency-key-generator stable across key order', r1.hash_hex === r2.hash_hex, `hashes differ ${r1.hash_hex} vs ${r2.hash_hex}`);
    // array order significance
    const a1 = (await call(base, 'POST', '/idempotency-key-generator/generate', { body: { items: [1, 2] } })).json;
    const a2 = (await call(base, 'POST', '/idempotency-key-generator/generate', { body: { items: [2, 1] } })).json;
    assert('idempotency-key-generator array order significant', a1.hash_hex !== a2.hash_hex, 'array order should change key');
    const a3 = (await call(base, 'POST', '/idempotency-key-generator/generate', { body: { items: [2, 1] }, sort_arrays: true })).json;
    const a4 = (await call(base, 'POST', '/idempotency-key-generator/generate', { body: { items: [1, 2] }, sort_arrays: true })).json;
    assert('idempotency-key-generator sort_arrays ignores order', a3.hash_hex === a4.hash_hex, 'sort_arrays should normalize');
  }
  check('idempotency-key-generator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/idempotency-key-generator/lookup', { path: '/x', algorithm: 'sha512' })).json, d => d.reasoning && d.algorithm === 'sha512' ? null : 'expected reasoning');
  assert('idempotency-key-generator 400 no fields', (await call(base, 'POST', '/idempotency-key-generator/generate', {})).status === 400, 'expected 400');

  // ---- agent-fanout-cost ----
  console.log('agent-fanout-cost:');
  check('agent-fanout-cost', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/agent-fanout-cost/')).json);
  {
    const nodes = [
      { id: 'planner', model: 'claude-opus-4-8', input_tokens: 500, output_tokens: 1000 },
      { id: 'worker', model: 'claude-haiku-4-5', input_tokens: 2000, output_tokens: 1500, calls: 5, depends_on: ['planner'] },
      { id: 'summarizer', model: 'claude-sonnet-4-6', input_tokens: 3000, output_tokens: 800, depends_on: ['worker'] },
    ];
    const r = (await call(base, 'POST', '/agent-fanout-cost/estimate', { nodes })).json;
    check('agent-fanout-cost', 'POST /estimate (chain)', 'EstimateResponse', r, d =>
      d.node_count === 3 && d.edge_count === 2 && d.total_calls === 7 && Math.abs(d.total_cost_usd - 0.096) < 1e-9
        && d.cost_complete === true && d.max_cost_node.id === 'worker' && Math.abs(d.max_cost_node.cost_usd - 0.0475) < 1e-9
        && d.critical_path.nodes.join('>') === 'planner>worker>summarizer' && Math.abs(d.critical_path.cost_usd - 0.096) < 1e-9 && d.confidence_score === 1 ? null : `unexpected ${d.total_cost_usd}/${JSON.stringify(d.critical_path)}`);
  }
  check('agent-fanout-cost', 'POST /estimate (unknown model partial)', 'EstimateResponse', (await call(base, 'POST', '/agent-fanout-cost/estimate', { nodes: [{ id: 'a', model: 'mystery', input_tokens: 10, output_tokens: 10 }] })).json, d => d.cost_complete === false && d.unknown_models.includes('mystery') && d.per_node[0].cost_usd === null ? null : 'expected partial');
  assert('agent-fanout-cost 400 cycle', (await call(base, 'POST', '/agent-fanout-cost/estimate', { nodes: [{ id: 'a', depends_on: ['b'] }, { id: 'b', depends_on: ['a'] }] })).status === 400, 'expected 400 cycle');
  assert('agent-fanout-cost 400 unknown dep', (await call(base, 'POST', '/agent-fanout-cost/estimate', { nodes: [{ id: 'a', depends_on: ['ghost'] }] })).status === 400, 'expected 400');
  check('agent-fanout-cost', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/agent-fanout-cost/lookup', { nodes: [{ id: 'solo', model: 'opus', input_tokens: 100, output_tokens: 100 }] })).json, d => d.reasoning && d.node_count === 1 ? null : 'expected reasoning');

  // ---- truncation-planner ----
  console.log('truncation-planner:');
  check('truncation-planner', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/truncation-planner/')).json);
  {
    const r = (await call(base, 'POST', '/truncation-planner/plan', { text: 'Answer: 42. STOP everything after this is ignored.', max_tokens: 100, stop_sequences: ['STOP'] })).json;
    check('truncation-planner', 'POST /plan (stop sequence)', 'PlanResponse', r, d =>
      d.stop_sequence_hit && d.stop_sequence_hit.index === 12 && d.truncated === true && d.kept_text === 'Answer: 42. ' && d.within_budget === true ? null : `unexpected ${JSON.stringify(d.stop_sequence_hit)}/${d.kept_text}`);
  }
  {
    // budget truncation, word boundary, keep head
    const text = ('lorem ipsum dolor sit amet '.repeat(40)).trim();
    const r = (await call(base, 'POST', '/truncation-planner/plan', { text, max_tokens: 20, strategy: 'end', boundary: 'word' })).json;
    check('truncation-planner', 'POST /plan (budget end/word)', 'PlanResponse', r, d =>
      d.truncated === true && d.kept_text.endsWith('…') && d.kept_chars < d.original_chars && !/\S$/.test(d.kept_text.slice(0, -1)) === false ? null : `unexpected kept=${d.kept_text.length}`);
    assert('truncation-planner budget reduces tokens', r.kept_tokens_estimate <= r.original_tokens_estimate, 'should reduce');
  }
  check('truncation-planner', 'POST /plan (fits, no truncation)', 'PlanResponse', (await call(base, 'POST', '/truncation-planner/plan', { text: 'short text', max_tokens: 1000 })).json, d => d.fits === true && d.truncated === false && d.kept_text === 'short text' ? null : `unexpected ${d.truncated}`);
  check('truncation-planner', 'POST /plan (middle)', 'PlanResponse', (await call(base, 'POST', '/truncation-planner/plan', { text: ('word '.repeat(200)).trim(), max_tokens: 30, strategy: 'middle', boundary: 'word' })).json, d => d.truncated === true && d.kept_text.includes('…') ? null : 'expected middle ellipsis');
  check('truncation-planner', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/truncation-planner/lookup', { text: 'hello world', max_tokens: 5 })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('truncation-planner 400 no max_tokens', (await call(base, 'POST', '/truncation-planner/plan', { text: 'x' })).status === 400, 'expected 400');

  // ---- prompt-token-diff ----
  console.log('prompt-token-diff:');
  check('prompt-token-diff', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/prompt-token-diff/')).json);
  {
    const r = (await call(base, 'POST', '/prompt-token-diff/diff', { a: 'Summarize the document.', b: 'Summarize the following document in three concise bullet points for an executive audience.', model: 'claude-opus-4-8' })).json;
    check('prompt-token-diff', 'POST /diff', 'DiffResponse', r, d =>
      d.found === true && d.tokens_a === 5 && d.tokens_b === 21 && d.delta_tokens === 16 && d.direction === 'increase'
        && d.delta_chars === 67 && d.delta_words === 10 && Math.abs(d.delta_cost_usd - 0.00008) < 1e-9 && d.confidence_score === 0.7 ? null : `unexpected ${d.tokens_a}/${d.tokens_b}/${d.delta_cost_usd}`);
  }
  check('prompt-token-diff', 'POST /diff (decrease, no model)', 'DiffResponse', (await call(base, 'POST', '/prompt-token-diff/diff', { a: 'a very long original prompt here with many words', b: 'short' })).json, d => d.direction === 'decrease' && d.delta_tokens < 0 && d.found === false && d.delta_cost_usd === null ? null : `unexpected ${d.direction}`);
  check('prompt-token-diff', 'POST /diff (no change)', 'DiffResponse', (await call(base, 'POST', '/prompt-token-diff/diff', { a: 'same text', b: 'same text' })).json, d => d.direction === 'no_change' && d.delta_tokens === 0 ? null : 'expected no_change');
  check('prompt-token-diff', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/prompt-token-diff/lookup', { a: 'x', b: 'y z', model: 'haiku' })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('prompt-token-diff 400 missing b', (await call(base, 'POST', '/prompt-token-diff/diff', { a: 'only a' })).status === 400, 'expected 400');

  // ---- determinism ----
  console.log('determinism:');
  const idBody = { method: 'GET', path: '/x', body: { z: 1, a: [3, 2, 1] } };
  const i1 = stripVolatile((await call(base, 'POST', '/idempotency-key-generator/generate', idBody)).json);
  const i2 = stripVolatile((await call(base, 'POST', '/idempotency-key-generator/generate', idBody)).json);
  assert('idempotency-key-generator deterministic', JSON.stringify(i1) === JSON.stringify(i2), 'outputs differ');
  const fnBody = { nodes: [{ id: 'a', model: 'opus', input_tokens: 100, output_tokens: 50, calls: 2 }] };
  const f1 = stripVolatile((await call(base, 'POST', '/agent-fanout-cost/estimate', fnBody)).json);
  const f2 = stripVolatile((await call(base, 'POST', '/agent-fanout-cost/estimate', fnBody)).json);
  assert('agent-fanout-cost deterministic', JSON.stringify(f1) === JSON.stringify(f2), 'outputs differ');

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
