// Smoke + drift guard for Data-Quality batch 3 (catalog/lineage + scrape-data).
// For each API: (1) validate every endpoint's published responseExample against its
// OpenAPI schema (ajv 2020); (2) replay the published requestExample against the live
// endpoint and assert the response equals the example (ignoring volatile envelope
// fields); (3) assert error paths return 400.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const B = 'http://localhost:3939';
const SLUGS = ['data-lineage-tracker', 'data-catalog-builder', 'scrape-data-merger', 'scrape-data-enricher', 'scrape-data-pipeline-validator'];
const VOLATILE = new Set(['trace_id', 'request_id', 'computed_at', 'latency_ms']);

function strip(o) {
  if (Array.isArray(o)) return o.map(strip);
  if (o && typeof o === 'object') {
    const out = {};
    for (const k of Object.keys(o).sort()) if (!VOLATILE.has(k)) out[k] = strip(o[k]);
    return out;
  }
  return o;
}
function deepEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
async function getJson(url, opts) { const r = await fetch(url, opts); return { status: r.status, json: await r.json() }; }

let pass = 0, fail = 0;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); ok ? pass++ : fail++; };

for (const slug of SLUGS) {
  const { json: spec } = await getJson(`${B}/${slug}/openapi.json`);
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);

  for (const [path, ops] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      const ref = op.responses?.['200']?.content?.['application/json']?.schema?.$ref;
      const example = op.responses?.['200']?.content?.['application/json']?.example;
      if (!ref || !example) continue;
      const validate = ajv.compile({ $ref: ref, components: spec.components });
      const ok = validate(example);
      log(ok, `${slug} ${method.toUpperCase()} ${path} — example matches schema${ok ? '' : ' :: ' + JSON.stringify(validate.errors?.slice(0, 3))}`);

      if (method === 'post') {
        const reqEx = op.requestBody?.content?.['application/json']?.example;
        const { status, json } = await getJson(`${B}/${slug}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(reqEx) });
        const drift = status === 200 && deepEq(strip(json), strip(example));
        log(drift, `${slug} POST ${path} — live output equals published example (HTTP ${status})`);
      }
    }
  }
}

// error paths → 400
const errs = [
  ['data-lineage-tracker/track', { steps: [] }],
  ['data-catalog-builder/build', { datasets: [{ name: 'x' }] }],
  ['scrape-data-merger/merge', { sources: [{ name: 'a', records: [{ id: 1 }] }] }],
  ['scrape-data-enricher/enrich', { records: [{ a: 1 }] }],
  ['scrape-data-pipeline-validator/validate', { records: [{ a: 1 }] }],
];
for (const [p, body] of errs) {
  const { status, json } = await getJson(`${B}/${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  log(status === 400 && json.success === false, `${p} — invalid input → 400 (${status}, ${json?.error?.code})`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
