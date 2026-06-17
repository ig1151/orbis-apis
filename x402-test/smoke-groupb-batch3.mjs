// Smoke + drift guard for Group B batch 3 (checksum/duration-humanizer/html-entities/
// mermaid-validator/table-formatter).
// (1) validate every endpoint's published responseExample against its OpenAPI schema;
// (2) replay the published requestExample live and assert it equals the example
// (ignoring volatile envelope fields); (3) assert error paths return 400.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const SLUGS = ['checksum', 'duration-humanizer', 'html-entities', 'mermaid-validator', 'table-formatter'];
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
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
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
      log(ok, `${slug} ${method.toUpperCase()} ${path} — example matches schema${ok ? '' : ' :: ' + JSON.stringify(validate.errors?.slice(0, 2))}`);
      if (method === 'post') {
        const reqEx = op.requestBody?.content?.['application/json']?.example;
        const { status, json } = await getJson(`${B}/${slug}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(reqEx) });
        log(status === 200 && deepEq(strip(json), strip(example)), `${slug} POST ${path} — live output equals published example (HTTP ${status})`);
      }
    }
  }
}

// Error paths → 400.
const errs = [
  ['checksum/hash', { text: 123 }],
  ['checksum/verify', { text: 'x', algorithm: 'bogus', expected: 'aa' }],
  ['duration-humanizer/humanize', { milliseconds: 1.5 }],
  ['duration-humanizer/parse', { text: '3 fortnights' }],
  ['html-entities/encode', { text: 'x', mode: 'bogus' }],
  ['html-entities/decode', {}],
  ['mermaid-validator/validate', { diagram: 123 }],
  ['table-formatter/markdown', { rows: 'nope' }],
  ['table-formatter/ascii', { rows: [['a', 'b']] }], // array rows w/o columns → 400
  ['table-formatter/lookup', { rows: [{ a: 1 }], align: ['left', 'right'] }], // align length mismatch
];
for (const [p, body] of errs) {
  const { status, json } = await getJson(`${B}/${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  log(status === 400 && json.success === false, `${p} — invalid input → 400 (${status}, ${json?.error?.code})`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
