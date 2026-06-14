// Assembles the Data-Quality batch 1 ChatGPT review bundle:
// header + grading criteria + shared scaffold (incl. dataset.ts helper) +
// per-API (intelligence.ts, openapi.ts, generated OpenAPI spec, live example responses).
import { readFileSync, writeFileSync } from 'node:fs';

const B = 'http://localhost:3939';
const ROOT = '/workspaces/orbis-apis';

const APIS = [
  {
    slug: 'data-drift-detector', title: 'data-drift-detector',
    calls: [
      ['POST /detect (categorical shift + numeric stability)', '/detect', {
        baseline: [{ age: 30, tier: 'free' }, { age: 32, tier: 'pro' }, { age: 28, tier: 'free' }, { age: 34, tier: 'pro' }],
        current: [{ age: 30, tier: 'pro' }, { age: 32, tier: 'enterprise' }, { age: 28, tier: 'pro' }, { age: 34, tier: 'pro' }],
      }],
      ['POST /lookup (new category appears → reasoning block)', '/lookup', {
        baseline: [{ region: 'us' }, { region: 'us' }, { region: 'eu' }],
        current: [{ region: 'us' }, { region: 'apac' }, { region: 'apac' }],
      }],
      ['POST /detect (no drift — identical distributions)', '/detect', {
        baseline: [{ score: 1 }, { score: 2 }, { score: 3 }],
        current: [{ score: 1 }, { score: 2 }, { score: 3 }],
      }],
      ['POST /detect (error: empty baseline)', '/detect', { baseline: [] }],
    ],
  },
  {
    slug: 'data-quality-rules', title: 'data-quality-rules',
    calls: [
      ['POST /check (not_null + range + regex)', '/check', {
        rows: [{ id: 1, email: 'a@x.com', age: 30 }, { id: 2, email: 'b@x.com', age: 41 }, { id: 3, email: 'c@x.com', age: 200 }],
        rules: [
          { column: 'email', type: 'not_null' },
          { column: 'age', type: 'range', min: 0, max: 120 },
          { column: 'email', type: 'regex', pattern: '^[^@]+@[^@]+$' },
        ],
      }],
      ['POST /lookup (unique violation → reasoning block)', '/lookup', {
        rows: [{ id: 1 }, { id: 2 }, { id: 2 }],
        rules: [{ column: 'id', type: 'unique' }],
      }],
      ['POST /check (all pass)', '/check', {
        rows: [{ id: 1, age: 20 }, { id: 2, age: 40 }],
        rules: [{ column: 'age', type: 'range', min: 0, max: 120 }],
      }],
      ['POST /check (error: missing rules)', '/check', { rows: [{ a: 1 }] }],
    ],
  },
  {
    slug: 'data-completeness-checker', title: 'data-completeness-checker',
    calls: [
      ['POST /check (null/empty/missing fields + required column)', '/check', {
        rows: [{ id: 1, name: 'Ann', phone: '555-1' }, { id: 2, name: 'Bob', phone: '' }, { id: 3, name: 'Cy' }],
        required_columns: ['id'],
      }],
      ['POST /lookup (required column missing in a row → reasoning block)', '/lookup', {
        rows: [{ id: 1, ssn: 'x' }, { id: 2 }],
        required_columns: ['id', 'ssn'],
      }],
      ['POST /check (fully complete dataset)', '/check', {
        rows: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
      }],
      ['POST /check (error: no rows)', '/check', {}],
    ],
  },
  {
    slug: 'data-profiler', title: 'data-profiler',
    calls: [
      ['POST /profile (categorical cardinality + frequencies)', '/profile', {
        rows: [{ id: 1, tier: 'free' }, { id: 2, tier: 'pro' }, { id: 3, tier: 'pro' }],
      }],
      ['POST /lookup (numeric stats: min/max/mean/nulls → reasoning block)', '/lookup', {
        rows: [{ amount: 10 }, { amount: 20 }, { amount: 30 }, { amount: null }],
      }],
      ['POST /profile (mixed-type column)', '/profile', {
        rows: [{ v: 1 }, { v: 'two' }, { v: true }],
      }],
      ['POST /profile (error: rows not an array)', '/profile', { rows: 'nope' }],
    ],
  },
  {
    slug: 'data-pipeline-quality-scorer', title: 'data-pipeline-quality-scorer',
    calls: [
      ['POST /score (completeness + uniqueness + type-conformance composite)', '/score', {
        rows: [
          { id: 1, tier: 'free', phone: '555-1' },
          { id: 2, tier: 'pro', phone: '555-2' },
          { id: 3, tier: 'pro', phone: '' },
          { id: 3, tier: 'pro', phone: '' },
        ],
        expected_types: { id: 'integer' },
      }],
      ['POST /lookup (type mismatch penalty → reasoning block)', '/lookup', {
        rows: [{ id: 1 }, { id: 'two' }, { id: 3 }],
        expected_types: { id: 'integer' },
      }],
      ['POST /score (clean dataset → high score)', '/score', {
        rows: [{ id: 1 }, { id: 2 }, { id: 3 }],
        expected_types: { id: 'integer' },
      }],
      ['POST /score (error: unknown expected type)', '/score', { rows: [{ a: 1 }], expected_types: { a: 'bogus' } }],
    ],
  },
];

async function post(path, body) {
  const r = await fetch(B + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await r.json();
  return { status: r.status, json };
}
async function getSpec(slug) {
  const r = await fetch(`${B}/${slug}/openapi.json`);
  return r.json();
}

let out = '';
const p = (s) => { out += s + '\n'; };

p('# Data-Quality Batch 1 — ChatGPT Review Bundle v2 (Orbis A+ dataset quality/pipeline tools)');
p('');
p('Date: 2026-06-14 · PR #41 (open vs main) · tsc clean · smoke 30/30 green');
p('');
p('## v2 — fixes applied since the first audit (please confirm each landed)');
p('1. **Confidence is now honesty-calibrated.** Drift confidence is sample-size aware (1 − 1/√n on the smaller dataset; n=4→0.5, n=40→0.84). Profiler splits `profiling:1` (exact stats) from `type_inference:0.85` (heuristic), score 0.85. Pipeline scorer splits `measures:1` (exact dimensions) from `weighting:0.8` (heuristic blend), score 0.8, and now exposes `weighting_profile` + `weights_used`. Completeness/Rules stay at 1 (exact counts) with an added "exact sample, not a population estimate" invalidator.');
p('2. **No generic object schemas.** Dataset rows are now a typed map (`additionalProperties` = scalar/null/array/object via the shared `rowSchema()`), not `{type:"object"}`. Drift `details` is a `oneOf` of typed `NumericDriftDetails` / `CategoricalDriftDetails`.');
p('3. **Regex correctness + safety bug fixed (data-quality-rules).** `g`/`y` flags are stripped (they made `RegExp.test()` stateful via `lastIndex`); invalid flag chars are rejected; patterns >300 chars are rejected; nested-unbounded-quantifier patterns (e.g. `(a+)+`) are rejected to bound ReDoS over up to 20k rows. Documented in an invalidator.');
p('4. **Rule schema tightened.** `Rule` is now a `oneOf` of per-type variants, each `additionalProperties:false`, with `value`/`expected`/`values` fully typed.');
p('');
p('5 deterministic dataset-analysis APIs that score data quality from a posted dataset (array of row objects). No external data, no storage, **no LLM call anywhere** — built on the shared `src/routes/_aplus/` scaffold plus a new `dataset.ts` helper (column typing, null/empty detection, cardinality, numeric stats).');
p('');
p('## Please grade each API (A+/A/B/...) on:');
p('1. **Correctness** of the deterministic statistics (drift via categorical frequency shift + numeric range/mean stability and new/dropped categories; rule evaluation for not_null/unique/range/regex/allowed_values; completeness as null/empty/missing-field rates + required-column enforcement; profiling stats min/max/mean/cardinality/null-rate/inferred-type; composite pipeline score combining completeness + uniqueness + type-conformance).');
p('2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata; reasoning block on /lookup).');
p('3. **Honesty** (no fabrication; stats computed only from the posted rows; nothing stored; confidence reflects sample size — small datasets should NOT claim high confidence; drift on tiny samples framed as directional, not conclusive).');
p('4. **OpenAPI 3.1** schema rigor (allOf + unevaluatedProperties:false; typed 200/400/500; x-pricing; requestExample replays cleanly).');
p('5. **Agent-usability** (clear field names, actionable recommended_actions, sensible chain_to targets across the 5 APIs).');
p('Flag any bug, statistical error (e.g. division-by-zero on empty columns, mis-inferred types, off-by-one in rates), input-size footgun (large payloads — note the global JSON limit was raised 100kb→1mb for these), or schema/response drift.');
p('');
p('## Shared A+ scaffold — `src/routes/_aplus/scaffold.ts`');
p('```ts');
p(readFileSync(`${ROOT}/src/routes/_aplus/scaffold.ts`, 'utf8').trimEnd());
p('```');
p('');
p('## Shared A+ helpers — `src/routes/_aplus/util.ts`');
p('```ts');
p(readFileSync(`${ROOT}/src/routes/_aplus/util.ts`, 'utf8').trimEnd());
p('```');
p('');
p('## Shared dataset helper — `src/routes/_aplus/dataset.ts`');
p('```ts');
p(readFileSync(`${ROOT}/src/routes/_aplus/dataset.ts`, 'utf8').trimEnd());
p('```');
p('');

for (const api of APIS) {
  p('---');
  p('');
  p(`# ${api.title}`);
  p('');
  p('## intelligence.ts');
  p('```ts');
  p(readFileSync(`${ROOT}/src/routes/${api.slug}-api/routes/intelligence.ts`, 'utf8').trimEnd());
  p('```');
  p('');
  p('## openapi.ts');
  p('```ts');
  p(readFileSync(`${ROOT}/src/routes/${api.slug}-api/routes/openapi.ts`, 'utf8').trimEnd());
  p('```');
  p('');
  p(`## Generated OpenAPI spec (served at GET /${api.slug}/openapi.json)`);
  p('```json');
  p(JSON.stringify(await getSpec(api.slug), null, 2));
  p('```');
  p('');
  p('## Live example responses');
  for (const [label, path, body] of api.calls) {
    const { status, json } = await post(`/${api.slug}${path}`, body);
    p(`### ${label}`);
    p('Request:');
    p('```json');
    p(JSON.stringify(body, null, 2));
    p('```');
    p(`Response (HTTP ${status}):`);
    p('```json');
    p(JSON.stringify(json, null, 2));
    p('```');
    p('');
  }
}

const path = `${ROOT}/dataquality-batch1-chatgpt-review.md`;
writeFileSync(path, out);
console.log('Wrote', path, '(' + out.split('\n').length + ' lines)');
