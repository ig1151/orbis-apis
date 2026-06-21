// Smoke + drift guard for Wallet Risk Pack batch 2
// (counterparty-exposure-graph / multi-wallet-portfolio-risk-rollup).
// (1) validate every endpoint's published responseExample against its OpenAPI schema;
// (2) replay the published requestExample live and assert it equals the example
// (ignoring volatile envelope fields); (3) numeric sanity checks; (4) 400 error paths.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const SLUGS = ['counterparty-exposure-graph', 'multi-wallet-portfolio-risk-rollup'];
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
        const { status, json } = await post(slug, path, reqEx);
        log(status === 200 && deepEq(strip(json), strip(example)), `${slug} POST ${path} — live output equals published example (HTTP ${status})`);
      }
    }
  }
}

// Numeric sanity — counterparty-exposure-graph.
{
  const body = {
    subject: '0xs',
    counterparties: [
      { label: 'CEX', category: 'cex', inflow_usd: 50000, outflow_usd: 20000 },
      { label: 'DEX', category: 'defi', inflow_usd: 12000, outflow_usd: 15000 },
      { label: 'Mixer', category: 'mixer', outflow_usd: 8000 },
      { label: 'Flagged', inflow_usd: 1000, outflow_usd: 500, flagged: true },
    ],
  };
  const r = await post('counterparty-exposure-graph', '/analyze', body);
  log(r.status === 200 && near(r.json.total_gross_volume_usd, 106500) && near(r.json.risk_weighted_exposure_score, 25, 1) && near(r.json.mixer_exposure_pct, 7.51, 0.1) && r.json.verdict === 'review',
    `counterparty — gross 106500, rwe~25, mixer~7.51%, verdict review (got gross=${r.json.total_gross_volume_usd}, rwe=${r.json.risk_weighted_exposure_score}, mixer=${r.json.mixer_exposure_pct}, verdict=${r.json.verdict})`);
}
{
  // A sanctioned counterparty must hard-block regardless of size.
  const r = await post('counterparty-exposure-graph', '/analyze', { counterparties: [{ label: 'OFAC', inflow_usd: 1, sanctioned: true }, { label: 'CEX', category: 'cex', inflow_usd: 100000 }] });
  log(r.status === 200 && r.json.hard_block === true && r.json.verdict === 'block', `counterparty — sanctioned edge ⇒ hard_block + block (got hb=${r.json.hard_block}, verdict=${r.json.verdict})`);
}

// Numeric sanity — multi-wallet-portfolio-risk-rollup.
{
  const body = {
    wallets: [
      { label: 'Treasury', value_usd: 250000, risk_score: 15 },
      { label: 'Hot', value_usd: 40000, approval_exposure_score: 65 },
      { label: 'Degen', value_usd: 12000, risk_score: 80 },
      { label: 'Flagged', value_usd: 5000, flagged: true },
      { label: 'Cold', value_usd: 100000 },
    ],
  };
  const r = await post('multi-wallet-portfolio-risk-rollup', '/rollup', body);
  log(r.status === 200 && near(r.json.total_value_usd, 407000) && near(r.json.value_weighted_risk_score, 25, 1) && near(r.json.value_at_risk_usd, 57000) && near(r.json.equal_weighted_risk_score, 63, 1) && r.json.scored_wallet_count === 4 && r.json.unscored_wallet_count === 1 && r.json.verdict === 'review',
    `rollup — value 407000, vw~25, VaR 57000, ew~63, scored 4/unscored 1, review (got tv=${r.json.total_value_usd}, vw=${r.json.value_weighted_risk_score}, var=${r.json.value_at_risk_usd}, ew=${r.json.equal_weighted_risk_score}, verdict=${r.json.verdict})`);
}
{
  // Sanctioned wallet must hard-block the whole portfolio.
  const r = await post('multi-wallet-portfolio-risk-rollup', '/rollup', { wallets: [{ label: 'A', value_usd: 1000, sanctioned: true }, { label: 'B', value_usd: 500000, risk_score: 5 }] });
  log(r.status === 200 && r.json.hard_block === true && r.json.verdict === 'block', `rollup — sanctioned wallet ⇒ hard_block + block (got hb=${r.json.hard_block}, verdict=${r.json.verdict})`);
}

// Error paths → 400.
const errs = [
  ['counterparty-exposure-graph', '/analyze', {}],
  ['counterparty-exposure-graph', '/analyze', { counterparties: [] }],
  ['counterparty-exposure-graph', '/lookup', { counterparties: 'nope' }],
  ['multi-wallet-portfolio-risk-rollup', '/rollup', {}],
  ['multi-wallet-portfolio-risk-rollup', '/rollup', { wallets: [] }],
  ['multi-wallet-portfolio-risk-rollup', '/lookup', { wallets: [42] }],
];
for (const [slug, path, body] of errs) {
  const { status, json } = await post(slug, path, body);
  log(status === 400 && json.success === false, `${slug}${path} — invalid input → 400 (${status}, ${json?.error?.code})`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
