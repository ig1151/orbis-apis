// Group A batch 1 validator: live responses ajv-2020 vs published schema, spec
// responseExample drift guard, 400 paths, determinism check (volatile fields
// excluded), and deterministic logic asserts for the 5 LLM-infra APIs:
// llm-token-counter, context-budget-planner, text-chunker,
// conversation-cost-ledger, model-pricing-comparator.
const express = require('express');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'llm-token-counter': { router: require('../dist/routes/llm-token-counter-api/routes/intelligence').default, spec: require('../dist/routes/llm-token-counter-api/routes/openapi').spec },
  'context-budget-planner': { router: require('../dist/routes/context-budget-planner-api/routes/intelligence').default, spec: require('../dist/routes/context-budget-planner-api/routes/openapi').spec },
  'text-chunker': { router: require('../dist/routes/text-chunker-api/routes/intelligence').default, spec: require('../dist/routes/text-chunker-api/routes/openapi').spec },
  'conversation-cost-ledger': { router: require('../dist/routes/conversation-cost-ledger-api/routes/intelligence').default, spec: require('../dist/routes/conversation-cost-ledger-api/routes/openapi').spec },
  'model-pricing-comparator': { router: require('../dist/routes/model-pricing-comparator-api/routes/intelligence').default, spec: require('../dist/routes/model-pricing-comparator-api/routes/openapi').spec },
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
  // ---- llm-token-counter ----
  console.log('llm-token-counter:');
  check('llm-token-counter', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/llm-token-counter/')).json);
  {
    const r = (await call(base, 'POST', '/llm-token-counter/count', { text: 'Hello world, this is a test of the token estimator.', model: 'opus', output_tokens: 100 })).json;
    check('llm-token-counter', 'POST /count (opus alias)', 'CountResponse', r, d =>
      d.found === true && d.model === 'claude-opus-4-8' && d.is_estimate === true && d.total_tokens === d.input_tokens + d.output_tokens
        && d.total_cost_usd !== null && Math.abs(d.total_cost_usd - (d.input_cost_usd + d.output_cost_usd)) < 1e-9 ? null : `unexpected ${d.found}/${d.model}/${d.total_cost_usd}`);
    assert('llm-token-counter cost exact (opus 5/25)', Math.abs(r.output_cost_usd - (r.output_tokens / 1e6) * 25) < 1e-9, `out cost ${r.output_cost_usd}`);
  }
  check('llm-token-counter', 'POST /count (unknown model)', 'CountResponse', (await call(base, 'POST', '/llm-token-counter/count', { text: 'hi', model: 'not-a-model' })).json, d => d.found === false && d.total_cost_usd === null ? null : 'expected found:false + null cost');
  check('llm-token-counter', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/llm-token-counter/lookup', { text: 'Summarize this.', model: 'claude-haiku-4-5', output_tokens: 50 })).json, d => d.found === true && d.reasoning && d.confidence_score === 0.7 ? null : 'expected reasoning + conf 0.7');
  assert('llm-token-counter 400 no text', (await call(base, 'POST', '/llm-token-counter/count', { model: 'opus' })).status === 400, 'expected 400');

  // ---- context-budget-planner ----
  console.log('context-budget-planner:');
  check('context-budget-planner', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/context-budget-planner/')).json);
  {
    // forces overflow: tiny explicit window
    const r = (await call(base, 'POST', '/context-budget-planner/plan', { messages: [{ tokens: 100 }, { tokens: 100 }, { tokens: 100 }], context_window: 250, reserve_output_tokens: 50 })).json;
    check('context-budget-planner', 'POST /plan (overflow)', 'PlanResponse', r, d =>
      d.available_input_tokens === 200 && d.total_input_tokens === 300 && d.fits === false && d.overflow_tokens === 100
        && d.trim_plan.fits_after_trim === true && d.trim_plan.tokens_after_trim <= 200 && d.is_estimate === false && d.confidence_score === 1 ? null : `unexpected ${d.fits}/${d.overflow_tokens}/${JSON.stringify(d.trim_plan)}`);
    assert('context-budget-planner drop_oldest drops index 0', r.trim_plan.dropped_indices[0] === 0, `dropped ${JSON.stringify(r.trim_plan.dropped_indices)}`);
  }
  {
    const r = (await call(base, 'POST', '/context-budget-planner/plan', { messages: [{ tokens: 10, priority: 5 }, { tokens: 200, priority: 0 }, { tokens: 10, priority: 9 }], context_window: 120, strategy: 'drop_lowest_priority' })).json;
    assert('context-budget-planner drop_lowest_priority drops index 1', r.trim_plan.dropped_indices.includes(1) && r.fits === false, `dropped ${JSON.stringify(r.trim_plan.dropped_indices)}`);
  }
  check('context-budget-planner', 'POST /plan (model window + estimate)', 'PlanResponse', (await call(base, 'POST', '/context-budget-planner/plan', { messages: [{ text: 'a short message' }], model: 'claude-opus-4-8' })).json, d => d.found === true && d.context_window === 1000000 && d.fits === true && d.is_estimate === true && d.confidence_score === 0.7 ? null : `unexpected ${d.context_window}/${d.is_estimate}`);
  check('context-budget-planner', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/context-budget-planner/lookup', { messages: [{ tokens: 5 }], context_window: 100 })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('context-budget-planner 400 no window', (await call(base, 'POST', '/context-budget-planner/plan', { messages: [{ tokens: 5 }] })).status === 400, 'expected 400');
  assert('context-budget-planner 400 empty messages', (await call(base, 'POST', '/context-budget-planner/plan', { messages: [], context_window: 100 })).status === 400, 'expected 400');

  // ---- text-chunker ----
  console.log('text-chunker:');
  check('text-chunker', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/text-chunker/')).json);
  {
    const text = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen';
    const r = (await call(base, 'POST', '/text-chunker/chunk', { text, strategy: 'characters', max_chars: 30, overlap: 5 })).json;
    check('text-chunker', 'POST /chunk (characters)', 'ChunkResponse', r, d =>
      d.strategy === 'characters' && d.chunk_count >= 2 && d.total_chars === text.length && d.confidence_per_section.chunking === 1 ? null : `unexpected ${d.strategy}/${d.chunk_count}`);
    // offsets: contiguous-with-overlap & in-range & text matches slice
    let okOff = true;
    for (let i = 0; i < r.chunks.length; i++) {
      const c = r.chunks[i];
      if (c.char_start < 0 || c.char_end > text.length || c.text !== text.slice(c.char_start, c.char_end)) okOff = false;
      if (i > 0 && c.char_start > r.chunks[i - 1].char_end) okOff = false; // no gap
    }
    assert('text-chunker char offsets exact & gapless', okOff, JSON.stringify(r.chunks.map(c => [c.char_start, c.char_end])));
    assert('text-chunker overlap present', r.chunks.length > 1 && r.chunks[1].char_start < r.chunks[0].char_end, 'expected overlap');
  }
  check('text-chunker', 'POST /chunk (sentences)', 'ChunkResponse', (await call(base, 'POST', '/text-chunker/chunk', { text: 'First sentence here. Second one follows! And a third?', strategy: 'sentences', max_tokens: 4 })).json, d => d.strategy === 'sentences' && d.chunk_count >= 2 ? null : `unexpected ${d.chunk_count}`);
  check('text-chunker', 'POST /chunk (tokens default)', 'ChunkResponse', (await call(base, 'POST', '/text-chunker/chunk', { text: 'a '.repeat(500) })).json, d => d.strategy === 'tokens' && d.chunk_count >= 1 && d.confidence_per_section.chunking === 0.8 ? null : `unexpected ${d.strategy}`);
  check('text-chunker', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/text-chunker/lookup', { text: 'Para one.\n\nPara two.', strategy: 'paragraphs' })).json, d => d.reasoning && d.chunk_count >= 1 ? null : 'expected reasoning');
  assert('text-chunker 400 overlap>=window', (await call(base, 'POST', '/text-chunker/chunk', { text: 'x', strategy: 'characters', max_chars: 10, overlap: 10 })).status === 400, 'expected 400');
  assert('text-chunker 400 no text', (await call(base, 'POST', '/text-chunker/chunk', {})).status === 400, 'expected 400');

  // ---- conversation-cost-ledger ----
  console.log('conversation-cost-ledger:');
  check('conversation-cost-ledger', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/conversation-cost-ledger/')).json);
  {
    const r = (await call(base, 'POST', '/conversation-cost-ledger/tally', { model: 'claude-opus-4-8', messages: [{ role: 'user', tokens: 100 }, { role: 'assistant', tokens: 300 }], projected_turns: 2 })).json;
    check('conversation-cost-ledger', 'POST /tally (exact + projection)', 'TallyResponse', r, d =>
      d.found === true && d.total_input_tokens === 100 && d.total_output_tokens === 300 && d.is_estimate === false
        && Math.abs(d.input_cost_usd - (100 / 1e6) * 5) < 1e-9 && Math.abs(d.output_cost_usd - (300 / 1e6) * 25) < 1e-9
        && d.projected_turns === 2 && d.projected_total_cost_usd !== null && d.confidence_score === 1 ? null : `unexpected ${d.found}/${d.total_cost_usd}/${d.projected_total_cost_usd}`);
    assert('conversation-cost-ledger projection >= base', r.projected_total_cost_usd >= r.total_cost_usd, `${r.projected_total_cost_usd} < ${r.total_cost_usd}`);
  }
  check('conversation-cost-ledger', 'POST /tally (estimate, no projection)', 'TallyResponse', (await call(base, 'POST', '/conversation-cost-ledger/tally', { model: 'haiku', messages: [{ role: 'user', text: 'hello there' }] })).json, d => d.is_estimate === true && d.projected_turns === 0 && d.projected_total_cost_usd === null && d.confidence_score === 0.7 ? null : `unexpected ${d.is_estimate}/${d.projected_turns}`);
  check('conversation-cost-ledger', 'POST /tally (unknown model)', 'TallyResponse', (await call(base, 'POST', '/conversation-cost-ledger/tally', { model: 'nope', messages: [{ role: 'user', tokens: 10 }] })).json, d => d.found === false && d.total_cost_usd === null ? null : 'expected found:false');
  check('conversation-cost-ledger', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/conversation-cost-ledger/lookup', { model: 'opus', messages: [{ role: 'user', tokens: 10 }] })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('conversation-cost-ledger 400 no model', (await call(base, 'POST', '/conversation-cost-ledger/tally', { messages: [{ role: 'user', tokens: 1 }] })).status === 400, 'expected 400');

  // ---- model-pricing-comparator ----
  console.log('model-pricing-comparator:');
  check('model-pricing-comparator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/model-pricing-comparator/')).json);
  {
    const r = (await call(base, 'POST', '/model-pricing-comparator/compare', { input_tokens: 1000, output_tokens: 1000, models: ['claude-opus-4-8', 'gpt-4o-mini', 'claude-haiku-4-5'], calls: 3 })).json;
    check('model-pricing-comparator', 'POST /compare', 'CompareResponse', r, d =>
      d.model_count === 3 && d.cheapest_model === 'gpt-4o-mini' && d.most_expensive_model === 'claude-opus-4-8'
        && Math.abs(d.cheapest_cost_usd - 0.00075) < 1e-9 && Math.abs(d.most_expensive_cost_usd - 0.03) < 1e-9
        && Math.abs(d.savings_vs_most_expensive_usd - (0.03 - 0.00075) * 3) < 1e-9 && d.confidence_score === 1 ? null : `unexpected ${d.cheapest_model}/${d.savings_vs_most_expensive_usd}`);
    // sorted ascending
    let sorted = true; for (let i = 1; i < r.rows.length; i++) if (r.rows[i].total_cost_usd < r.rows[i - 1].total_cost_usd) sorted = false;
    assert('model-pricing-comparator rows sorted cheapest-first', sorted, JSON.stringify(r.rows.map(x => x.total_cost_usd)));
    assert('model-pricing-comparator all-calls = total*calls', Math.abs(r.rows[0].total_cost_for_all_calls_usd - r.rows[0].total_cost_usd * 3) < 1e-9, `${r.rows[0].total_cost_for_all_calls_usd}`);
  }
  check('model-pricing-comparator', 'POST /compare (all models + unknown)', 'CompareResponse', (await call(base, 'POST', '/model-pricing-comparator/compare', { input_tokens: 500, output_tokens: 0, models: ['opus', 'bogus-model'] })).json, d => d.model_count === 1 && d.unknown_models.includes('bogus-model') ? null : `unexpected ${d.model_count}/${JSON.stringify(d.unknown_models)}`);
  check('model-pricing-comparator', 'POST /compare (whole table)', 'CompareResponse', (await call(base, 'POST', '/model-pricing-comparator/compare', { input_tokens: 100, output_tokens: 100 })).json, d => d.model_count >= 5 ? null : `expected full table, got ${d.model_count}`);
  check('model-pricing-comparator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/model-pricing-comparator/lookup', { input_tokens: 100, output_tokens: 100, models: ['opus'] })).json, d => d.reasoning ? null : 'expected reasoning');
  assert('model-pricing-comparator 400 no tokens', (await call(base, 'POST', '/model-pricing-comparator/compare', { input_tokens: 100 })).status === 400, 'expected 400');
  assert('model-pricing-comparator 400 all unknown', (await call(base, 'POST', '/model-pricing-comparator/compare', { input_tokens: 100, output_tokens: 100, models: ['x', 'y'] })).status === 400, 'expected 400');

  // ---- determinism (volatile fields excluded) ----
  console.log('determinism:');
  const detBody = { text: 'Deterministic check of the chunker output.', strategy: 'characters', max_chars: 12, overlap: 3 };
  const a = stripVolatile((await call(base, 'POST', '/text-chunker/chunk', detBody)).json);
  const b = stripVolatile((await call(base, 'POST', '/text-chunker/chunk', detBody)).json);
  assert('text-chunker deterministic (non-volatile equal)', JSON.stringify(a) === JSON.stringify(b), 'outputs differ');
  const cmp = { input_tokens: 1234, output_tokens: 567 };
  const c1 = stripVolatile((await call(base, 'POST', '/model-pricing-comparator/compare', cmp)).json);
  const c2 = stripVolatile((await call(base, 'POST', '/model-pricing-comparator/compare', cmp)).json);
  assert('model-pricing-comparator deterministic', JSON.stringify(c1) === JSON.stringify(c2), 'outputs differ');

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
