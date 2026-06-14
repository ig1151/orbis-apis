// Assembles the Data-Quality batch 3 ChatGPT review bundle:
// header + grading criteria + shared scaffold + per-API (intelligence.ts, openapi.ts,
// generated OpenAPI spec, live example responses).
import { readFileSync, writeFileSync } from 'node:fs';

const B = 'http://localhost:3939';
const ROOT = '/workspaces/orbis-apis';

const APIS = [
  {
    slug: 'data-lineage-tracker', title: 'data-lineage-tracker',
    calls: [
      ['POST /track (DAG: extract→join→aggregate)', '/track', {
        steps: [
          { id: 's1', operation: 'extract', inputs: ['raw_events'], outputs: ['clean_events'] },
          { id: 's2', operation: 'join', inputs: ['clean_events', 'users'], outputs: ['enriched_events'] },
          { id: 's3', operation: 'aggregate', inputs: ['enriched_events'], outputs: ['daily_metrics'] },
        ],
      }],
      ['POST /lookup (cycle detection → topological_order null)', '/lookup', {
        steps: [
          { id: 'a', inputs: ['x'], outputs: ['y'] },
          { id: 'b', inputs: ['y'], outputs: ['z'] },
          { id: 'c', inputs: ['z'], outputs: ['x'] },
        ],
      }],
      ['POST /track (single step — source→sink)', '/track', { steps: [{ id: 'only', inputs: ['a'], outputs: ['b'] }] }],
      ['POST /track (error: empty steps)', '/track', { steps: [] }],
    ],
  },
  {
    slug: 'data-catalog-builder', title: 'data-catalog-builder',
    calls: [
      ['POST /build (rows-inferred + explicit-columns datasets)', '/build', {
        datasets: [
          { name: 'users', rows: [{ id: 1, email: 'a@x.com', signup_date: '2024-01-02', plan: 'pro' }, { id: 2, email: 'b@y.com', signup_date: '2024-01-03', plan: 'free' }, { id: 3, email: 'c@z.com', signup_date: '2024-01-04', plan: 'pro' }] },
          { name: 'events', columns: [{ name: 'event_id', type: 'string' }, { name: 'amount', type: 'number' }, { name: 'created_at', type: 'date' }] },
        ],
      }],
      ['POST /lookup (nulls + categorical + PK candidate → reasoning)', '/lookup', {
        datasets: [{ name: 'orders', rows: [{ order_id: 'o1', status: 'paid', phone: '555-1' }, { order_id: 'o2', status: 'paid', phone: null }, { order_id: 'o3', status: 'refunded', phone: '555-3' }] }] }],
      ['POST /build (schema-only dataset)', '/build', { datasets: [{ name: 'logs', columns: [{ name: 'ts', type: 'date' }, { name: 'level' }] }] }],
      ['POST /build (error: neither rows nor columns)', '/build', { datasets: [{ name: 'x' }] }],
    ],
  },
  {
    slug: 'scrape-data-merger', title: 'scrape-data-merger',
    calls: [
      ['POST /merge (non_null strategy + conflict + dedup)', '/merge', {
        key: 'id', strategy: 'non_null',
        sources: [
          { name: 'siteA', records: [{ id: '1', name: 'Acme', phone: '555-1', email: null }, { id: '2', name: 'Beta', phone: '555-2' }] },
          { name: 'siteB', records: [{ id: '1', name: 'Acme Inc', email: 'info@acme.com' }, { id: '3', name: 'Gamma' }] },
        ],
      }],
      ['POST /lookup (coalesce + dropped no-key → reasoning)', '/lookup', {
        key: 'sku', strategy: 'coalesce',
        sources: [
          { name: 'feed1', records: [{ sku: 'A', price: null, title: 'A1' }, { nokey: true }] },
          { name: 'feed2', records: [{ sku: 'A', price: '9.99' }] },
        ],
      }],
      ['POST /merge (composite key, first strategy)', '/merge', {
        key: ['region', 'id'], strategy: 'first',
        sources: [{ name: 's', records: [{ region: 'us', id: '1', v: 'a' }, { region: 'us', id: '1', v: 'b' }, { region: 'eu', id: '1', v: 'c' }] }],
      }],
      ['POST /merge (error: missing sources)', '/merge', { key: 'id' }],
    ],
  },
  {
    slug: 'scrape-data-enricher', title: 'scrape-data-enricher',
    calls: [
      ['POST /enrich (concat + lookup_map + regex_extract + coalesce + constant)', '/enrich', {
        records: [
          { first: 'Ann', last: 'Lee', country: 'US', url: 'https://acme.com/p/1', mobile: '555-1' },
          { first: 'Bob', last: 'Ng', country: 'XX', url: 'not-a-url' },
        ],
        rules: [
          { type: 'concat', sources: ['first', 'last'], target: 'full_name', separator: ' ' },
          { type: 'lookup_map', source: 'country', target: 'country_name', map: { US: 'United States', FR: 'France' }, default: 'Unknown' },
          { type: 'regex_extract', source: 'url', target: 'domain', pattern: 'https?://([^/]+)' },
          { type: 'coalesce', sources: ['mobile', 'phone'], target: 'contact' },
          { type: 'constant', target: 'source_tag', value: 'scrape' },
        ],
      }],
      ['POST /lookup (regex group 0 whole-match → reasoning)', '/lookup', {
        records: [{ code: 'SKU-12345-X' }],
        rules: [{ type: 'regex_extract', source: 'code', target: 'digits', pattern: '\\d{5}', group: 0 }],
      }],
      ['POST /enrich (ReDoS-guard: nested unbounded quantifier rejected)', '/enrich', {
        records: [{ a: 'x' }], rules: [{ type: 'regex_extract', source: 'a', target: 'b', pattern: '(a+)+' }],
      }],
      ['POST /enrich (error: missing rules)', '/enrich', { records: [{ a: 1 }] }],
    ],
  },
  {
    slug: 'scrape-data-pipeline-validator', title: 'scrape-data-pipeline-validator',
    calls: [
      ['POST /validate (type + format mismatch + broken selector → FAIL)', '/validate', {
        records: [
          { title: 'Widget A', price: '9.99', url: 'https://shop.com/a' },
          { title: 'Widget B', price: 'N/A', url: 'https://shop.com/b' },
          { title: 'Widget C', price: '14.50', url: 'not-a-url' },
        ],
        expected_schema: { fields: [{ name: 'title', type: 'string', required: true }, { name: 'price', type: 'number', required: true }, { name: 'url', type: 'string', required: true, format: 'url' }, { name: 'sku', type: 'string', required: true }] },
        selectors: [{ field: 'price', selector: '.price' }, { field: 'sku', selector: '.sku' }],
        min_coverage: 0.9,
      }],
      ['POST /lookup (clean data → PASS, score 100 → reasoning)', '/lookup', {
        records: [{ t: 'A', u: 'https://a.com' }, { t: 'B', u: 'https://b.com' }],
        expected_schema: { fields: [{ name: 't', type: 'string', required: true }, { name: 'u', type: 'string', required: true, format: 'url' }] },
      }],
      ['POST /validate (optional field missing → not penalized)', '/validate', {
        records: [{ id: '1' }, { id: '2' }],
        expected_schema: { fields: [{ name: 'id', type: 'string', required: true }, { name: 'note', type: 'string', required: false }] },
      }],
      ['POST /validate (error: no expected_schema)', '/validate', { records: [{ a: 1 }] }],
    ],
  },
];

async function post(path, body) {
  const r = await fetch(B + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
}
async function getSpec(slug) { const r = await fetch(`${B}/${slug}/openapi.json`); return r.json(); }

let out = '';
const p = (s) => { out += s + '\n'; };

p('# Data-Quality Batch 3 — ChatGPT Review Bundle (Orbis A+ catalog/lineage + scrape-data tools)');
p('');
p('Date: 2026-06-14 · branch aplus/data-quality-batch3 · tsc clean · smoke 30/30 green');
p('');
p('5 deterministic, STATELESS APIs (input manifest/records → computed output, nothing fetched, nothing stored, **no LLM anywhere**). Built on the shared `src/routes/_aplus/` scaffold (+ `dataset.ts` helpers).');
p('');
p('- **data-lineage-tracker** — transform manifest (steps with input/output datasets) → lineage graph: node roles/degrees/depth, edges, sources/sinks, cycle detection, topological order.');
p('- **data-catalog-builder** — dataset schemas (sample rows OR explicit columns) → catalog entries: typed columns, null rates, cardinality, primary-key candidates, heuristic tags.');
p('- **scrape-data-merger** — multiple scraped record sets → dedup/merge by (composite) key with explicit conflict strategy (first/last/non_null/coalesce); reports duplicates, dropped-no-key, conflicts.');
p('- **scrape-data-enricher** — records + deterministic rules (constant/concat/coalesce/lookup_map/regex_extract, ReDoS-guarded) → augmented records + per-rule stats.');
p('- **scrape-data-pipeline-validator** — scrape output vs expected schema (presence/type/format) + optional selector→field coverage → per-field reports, per-record validity, 0–100 score, pass/fail.');
p('');
p('## Carry the batch-1/2 lessons:');
p('- NO generic `{type:"object"}` schemas — dataset rows/records use the shared typed `rowSchema()`; variant inputs (steps/rules/specs) are closed `oneOf`/`additionalProperties:false` objects.');
p('- Confidence honesty: exact deterministic computation reports 1; any heuristic (catalog tagging/type-inference, validator score weighting) is <1 with explicit invalidators.');
p('- Stateless + deterministic; examples equal live output (drift-guarded by smoke).');
p('');
p('## Please grade each API (A+/A/B/...) on:');
p('1. **Correctness** of the deterministic computation (lineage graph: roles/degrees/depth/cycle/topo; catalog: type inference, PK candidates, tags; merger: dedup, conflict detection, the four strategies; enricher: lookup/regex/coalesce semantics + ReDoS guard; validator: presence/type/format rates, per-record validity, selector health, score).');
p('2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata; reasoning block on /lookup).');
p('3. **Honesty** (output computed only from the request; nothing stored/fetched; heuristic sections carry <1 confidence; validator "broken selector" is a signal, not a fetched fact).');
p('4. **OpenAPI 3.1** rigor (allOf + unevaluatedProperties:false; typed 200/400/500; oneOf variant inputs; x-pricing; requestExample replays cleanly == responseExample).');
p('5. **Agent-usability** (clear field names, actionable recommended_actions, sensible chain_to across the data-quality fleet).');
p('Flag any bug, graph/stat error (cycle miss, wrong topo, PK false-positive, merge conflict miscount, regex/coverage edge), input-size footgun, or schema/response drift.');
p('');
p('## Shared A+ scaffold — `src/routes/_aplus/scaffold.ts`');
p('```ts'); p(readFileSync(`${ROOT}/src/routes/_aplus/scaffold.ts`, 'utf8').trimEnd()); p('```'); p('');
p('## Shared A+ helpers — `src/routes/_aplus/util.ts`');
p('```ts'); p(readFileSync(`${ROOT}/src/routes/_aplus/util.ts`, 'utf8').trimEnd()); p('```'); p('');
p('## Shared dataset helper — `src/routes/_aplus/dataset.ts`');
p('```ts'); p(readFileSync(`${ROOT}/src/routes/_aplus/dataset.ts`, 'utf8').trimEnd()); p('```'); p('');
p('## Shared spec parts — `src/routes/_aplus/specparts.ts`');
p('```ts'); p(readFileSync(`${ROOT}/src/routes/_aplus/specparts.ts`, 'utf8').trimEnd()); p('```'); p('');

for (const api of APIS) {
  p('---'); p('');
  p(`# ${api.title}`); p('');
  p('## intelligence.ts');
  p('```ts'); p(readFileSync(`${ROOT}/src/routes/${api.slug}-api/routes/intelligence.ts`, 'utf8').trimEnd()); p('```'); p('');
  p('## openapi.ts');
  p('```ts'); p(readFileSync(`${ROOT}/src/routes/${api.slug}-api/routes/openapi.ts`, 'utf8').trimEnd()); p('```'); p('');
  p(`## Generated OpenAPI spec (served at GET /${api.slug}/openapi.json)`);
  p('```json'); p(JSON.stringify(await getSpec(api.slug), null, 2)); p('```'); p('');
  p('## Live example responses');
  for (const [label, path, body] of api.calls) {
    const { status, json } = await post(`/${api.slug}${path}`, body);
    p(`### ${label}`);
    p('Request:'); p('```json'); p(JSON.stringify(body, null, 2)); p('```');
    p(`Response (HTTP ${status}):`); p('```json'); p(JSON.stringify(json, null, 2)); p('```'); p('');
  }
}

const path = `${ROOT}/dataquality-batch3-chatgpt-review.md`;
writeFileSync(path, out);
console.log('Wrote', path, '(' + out.split('\n').length + ' lines)');
