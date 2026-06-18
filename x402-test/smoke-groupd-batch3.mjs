// Smoke + drift guard for Group D batch 3 (break-even / correlation-beta /
// kelly-criterion / payback-period / unit-economics).
// (1) validate every endpoint's published responseExample against its OpenAPI schema;
// (2) replay the published requestExample live and assert it equals the example
// (ignoring volatile envelope fields); (3) numeric sanity checks; (4) 400 error paths.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const SLUGS = ['break-even', 'correlation-beta', 'kelly-criterion', 'payback-period', 'unit-economics'];
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
const near = (a, b, eps = 0.01) => typeof a === 'number' && Math.abs(a - b) <= eps;
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
  const r = await post('break-even', '/units', { fixed_costs: 50000, price_per_unit: 40, variable_cost_per_unit: 25, target_profit: 20000, current_units: 5000 });
  log(r.status === 200 && near(r.json.contribution_margin_per_unit, 15) && near(r.json.break_even_units, 3333.33) && near(r.json.target_profit_units, 4666.67),
    `break-even — cm/unit 15, BE 3333.33u, target 4666.67u (got cm=${r.json.contribution_margin_per_unit}, be=${r.json.break_even_units})`);
}
{
  const r = await post('correlation-beta', '/correlation', { series_a: [1, 2, 3, 4], series_b: [2, 4, 6, 8] });
  log(r.status === 200 && near(r.json.correlation, 1), `correlation-beta — perfectly collinear ⇒ r=1 (got ${r.json.correlation})`);
}
{
  const r = await post('kelly-criterion', '/kelly', { win_probability: 0.55, win_payoff: 1, kelly_multiplier: 0.5, bankroll: 10000 });
  log(r.status === 200 && near(r.json.kelly_fraction, 0.10) && near(r.json.fractional_kelly_fraction, 0.05),
    `kelly-criterion — p.55 b1 ⇒ f*=0.10, half=0.05 (got ${r.json.kelly_fraction}/${r.json.fractional_kelly_fraction})`);
}
{
  const r = await post('payback-period', '/simple', { initial_investment: 100000, cashflows: [30000, 30000, 30000, 30000, 30000], periods_per_year: 1 });
  log(r.status === 200 && near(r.json.payback_periods, 3.3333, 0.001) && r.json.recovered === true,
    `payback-period — 100k / 30k/yr ⇒ 3.333 periods recovered (got ${r.json.payback_periods}, rec=${r.json.recovered})`);
}
{
  const r = await post('unit-economics', '/ltv-cac', { arpu: 100, gross_margin_percent: 80, cac: 400, monthly_churn_rate: 0.05 });
  log(r.status === 200 && near(r.json.ltv, 1600) && near(r.json.ltv_cac_ratio, 4) && near(r.json.cac_payback_periods, 5),
    `unit-economics — LTV 1600, ratio 4, payback 5 (got ltv=${r.json.ltv}, ratio=${r.json.ltv_cac_ratio})`);
}

// Error paths → 400.
const errs = [
  ['break-even', '/units', { fixed_costs: 50000, price_per_unit: 25, variable_cost_per_unit: 40 }], // contribution <= 0
  ['break-even', '/revenue', { fixed_costs: 50000, contribution_margin_ratio: 0 }], // ratio out of range
  ['correlation-beta', '/correlation', { series_a: [1, 2, 3], series_b: [1, 2] }], // length mismatch
  ['correlation-beta', '/beta', { asset_returns: [1], benchmark_returns: [1] }], // too few points
  ['kelly-criterion', '/kelly', { win_probability: 1.5, win_payoff: 1 }], // prob out of range
  ['payback-period', '/simple', { initial_investment: 100000, cashflows: 'nope' }], // not an array
  ['unit-economics', '/ltv-cac', { arpu: 100, gross_margin_percent: 80, cac: 400, monthly_churn_rate: 0 }], // zero churn ⇒ infinite life
];
for (const [slug, path, body] of errs) {
  const { status, json } = await post(slug, path, body);
  log(status === 400 && json.success === false, `${slug}${path} — invalid input → 400 (${status}, ${json?.error?.code})`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
