// Smoke + drift guard for regex-tester (Group B batch 2).
// (1) validate every endpoint's published responseExample against its OpenAPI schema;
// (2) replay the published requestExample live and assert it equals the example
// (ignoring volatile envelope fields); (3) assert error/refusal paths return 400.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const SLUGS = ['regex-tester'];
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

// Error + ReDoS-refusal paths → 400.
const errs = [
  ['regex-tester/analyze', {}, 'invalid_request'],                                  // missing pattern
  ['regex-tester/analyze', { pattern: '(', flags: '' }, null],                      // invalid pattern still 200 (valid:false), so expect 200 not 400 — handled below
  ['regex-tester/test', { pattern: '\\w+' }, 'invalid_request'],                    // missing inputs
  ['regex-tester/test', { pattern: '(a+)+$', inputs: ['aaa'] }, 'redos_risk'],      // catastrophic → refused
  ['regex-tester/test', { pattern: 'x', flags: 'q', inputs: ['x'] }, 'invalid_request'], // bad flag
];
for (const [p, body, code] of errs) {
  if (code === null) continue; // skip the documented 200 case here; covered by a dedicated check below
  const { status, json } = await getJson(`${B}/${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  log(status === 400 && json.success === false && json.error?.code === code, `${p} — invalid → 400 ${code} (got ${status}, ${json?.error?.code})`);
}

// Invalid-but-parseable pattern: /analyze returns 200 valid:false (does NOT 400).
{
  const { status, json } = await getJson(`${B}/regex-tester/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pattern: '(', flags: '' }) });
  log(status === 200 && json.success === true && json.valid === false && typeof json.compile_error === 'string', `regex-tester/analyze — uncompilable pattern → 200 valid:false (HTTP ${status})`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
