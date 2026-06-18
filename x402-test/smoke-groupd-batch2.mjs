// Smoke + drift guard for Group D batch 2 (returns-analytics / max-drawdown /
// value-at-risk / compound-interest / wacc).
// (1) validate every endpoint's published responseExample against its OpenAPI schema;
// (2) replay the published requestExample live and assert it equals the example
// (ignoring volatile envelope fields); (3) numeric sanity checks; (4) 400 error paths.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const SLUGS = ['returns-analytics', 'max-drawdown', 'value-at-risk', 'compound-interest', 'wacc'];
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
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
async function getJson(url, opts) { const r = await fetch(url, opts); return { status: r.status, json: await r.json() }; }
const post = (slug, path, body) => getJson(`${B}/${slug}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

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

// Numeric sanity checks against known-good values.
{
  const r = await post('returns-analytics', '/cagr', { begin_value: 100, end_value: 121, periods: 2, periods_per_year: 1 });
  log(r.status === 200 && near(r.json.cagr_percent, 10), `returns-analytics — (121/100)^(1/2)-1 = 10% CAGR (got ${r.json.cagr_percent})`);
}
{
  const r = await post('max-drawdown', '/analyze', { values: [100, 120, 90, 95, 130] });
  log(r.status === 200 && near(r.json.max_drawdown_percent, -25) && r.json.peak_index === 1 && r.json.trough_index === 2 && r.json.recovered === true,
    `max-drawdown — peak100→120, trough90 = -25% recovered (got ${r.json.max_drawdown_percent}%, rec=${r.json.recovered})`);
}
{
  const r = await post('value-at-risk', '/parametric', { returns: [1, 1, 1, 1, 1], confidence: 0.95 });
  log(r.status === 200 && near(r.json.z_score, -1.6449, 0.01), `value-at-risk — z(0.05) ≈ -1.645 (got ${r.json.z_score})`);
}
{
  const r = await post('compound-interest', '/effective-rate', { nominal_annual_rate_percent: 6, compounds_per_year: 12 });
  log(r.status === 200 && near(r.json.effective_annual_rate_percent, 6.1678, 0.001), `compound-interest — 6% / 12 ⇒ EAR 6.1678% (got ${r.json.effective_annual_rate_percent})`);
}
{
  const r = await post('wacc', '/wacc', { equity_value: 600000, debt_value: 400000, cost_of_equity_percent: 9, cost_of_debt_percent: 5, tax_rate_percent: 21 });
  // 0.6*9 + 0.4*5*0.79 = 5.4 + 1.58 = 6.98
  log(r.status === 200 && near(r.json.wacc_percent, 6.98), `wacc — 0.6·9 + 0.4·5·(1-.21) = 6.98% (got ${r.json.wacc_percent})`);
}

// Error paths → 400.
const errs = [
  ['returns-analytics', '/summary', { values: [100] }],
  ['returns-analytics', '/cagr', { begin_value: 0, end_value: 1, periods: 1 }],
  ['max-drawdown', '/analyze', { values: 'nope' }],
  ['value-at-risk', '/historical', { returns: [1, 2], confidence: 1.5 }],
  ['compound-interest', '/future-value', { principal: 100, annual_rate_percent: 5, years: -1 }],
  ['wacc', '/wacc', { equity_value: 0, debt_value: 0, cost_of_equity_percent: 9, cost_of_debt_percent: 5 }],
  ['wacc', '/capm', { risk_free_percent: 4, beta: 1.2 }], // no ERP nor market return
];
for (const [slug, path, body] of errs) {
  const { status, json } = await post(slug, path, body);
  log(status === 400 && json.success === false, `${slug}${path} — invalid input → 400 (${status}, ${json?.error?.code})`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
