// Smoke + drift guard for Group D finance batch 1 (npv-irr/black-scholes/bond/dcf/risk).
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const SLUGS = ['npv-irr', 'black-scholes', 'bond-analytics', 'dcf-valuation', 'risk-ratios'];
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

const errs = [
  ['npv-irr/npv', { cashflows: [-1, 1] }],                 // missing rate
  ['npv-irr/irr', { cashflows: [1] }],                     // too short
  ['black-scholes/price', { spot: 100, strike: 100, time_to_expiry_years: 1, volatility: 0, risk_free_rate: 4, type: 'call' }], // vol 0
  ['black-scholes/greeks', { spot: 100, strike: 100, time_to_expiry_years: 1, volatility: 20, risk_free_rate: 4, type: 'bogus' }], // bad type
  ['bond-analytics/price', { coupon_rate: 5, years_to_maturity: 10 }],   // missing yield_rate
  ['bond-analytics/yield', { coupon_rate: 5, years_to_maturity: 10, price: -1 }], // bad price
  ['dcf-valuation/value', { cashflows: [10], discount_rate: 5, terminal_growth_rate: 6 }], // g>=r
  ['risk-ratios/sharpe', { returns: [1] }],                // too short
];
for (const [p, body] of errs) {
  const { status, json } = await getJson(`${B}/${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  log(status === 400 && json.success === false, `${p} — invalid input → 400 (${status}, ${json?.error?.code})`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
