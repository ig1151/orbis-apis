// Smoke + drift guard for Group B converters (data-format-converter / xml-json-converter).
// (1) validate every endpoint's published responseExample against its OpenAPI schema;
// (2) replay the published requestExample live and assert it equals the example
// (ignoring volatile envelope fields); (3) assert error paths return 400.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const SLUGS = ['data-format-converter', 'xml-json-converter'];
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

// Round-trip sanity: JSON → YAML → JSON and XML → JSON → XML preserve the data model.
{
  const obj = { name: 'demo', nested: { a: 1, b: [true, 'x'] } };
  const toYaml = await getJson(`${B}/data-format-converter/convert`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: JSON.stringify(obj), from: 'json', to: 'yaml' }) });
  const backToJson = await getJson(`${B}/data-format-converter/convert`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: toYaml.json.output, from: 'yaml', to: 'json' }) });
  log(toYaml.status === 200 && backToJson.status === 200 && deepEq(JSON.parse(backToJson.json.output), obj), 'data-format-converter — JSON→YAML→JSON round-trips');
}
{
  const xml = '<root a="1"><item>x</item><item>y</item></root>';
  const j = await getJson(`${B}/xml-json-converter/to-json`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ xml }) });
  const back = await getJson(`${B}/xml-json-converter/to-xml`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ json: j.json.json, format: false }) });
  log(j.status === 200 && back.status === 200 && back.json.xml.includes('<item>x</item>') && back.json.xml.includes('<item>y</item>'), 'xml-json-converter — XML→JSON→XML preserves repeated elements');
}

// Error paths → 400.
const errs = [
  ['data-format-converter/convert', { data: '{bad json', from: 'json', to: 'yaml' }],
  ['data-format-converter/convert', { data: '{}', from: 'json', to: 'bogus' }],
  ['data-format-converter/convert', { data: '[1,2,3]', from: 'json', to: 'toml' }], // array → toml fails
  ['data-format-converter/detect', { data: 123 }],
  ['xml-json-converter/to-json', { xml: '<a><b></a>' }], // malformed XML
  ['xml-json-converter/to-json', { xml: 123 }],
  ['xml-json-converter/to-xml', { json: [1, 2, 3] }], // array top-level → 400
  ['xml-json-converter/to-xml', { json: '{bad' }], // bad JSON string → 400
];
for (const [p, body] of errs) {
  const { status, json } = await getJson(`${B}/${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  log(status === 400 && json.success === false, `${p} — invalid input → 400 (${status}, ${json?.error?.code})`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
