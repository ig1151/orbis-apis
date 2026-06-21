// Smoke + drift guard for Wallet Risk Pack batch 3
// (transaction-pattern-detector / wallet-funding-source-analyzer / portfolio-stablecoin-risk
//  / portfolio-yield-exposure / bridge-transfer-risk).
// (1) validate every endpoint's published responseExample against its OpenAPI schema;
// (2) replay the published requestExample live and assert it equals the example
// (ignoring volatile envelope fields); (3) numeric sanity checks; (4) 400 error paths.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const SLUGS = ['transaction-pattern-detector', 'wallet-funding-source-analyzer', 'portfolio-stablecoin-risk', 'portfolio-yield-exposure', 'bridge-transfer-risk'];
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

// Numeric sanity — transaction-pattern-detector.
{
  const body = { structuring_threshold_usd: 10000, transactions: [
    { value_usd: 9500, direction: 'in', timestamp: '2026-06-01T10:00:00Z', counterparty: '0xsource' },
    { value_usd: 9200, direction: 'in', timestamp: '2026-06-01T10:05:00Z', counterparty: '0xsource' },
    { value_usd: 9800, direction: 'in', timestamp: '2026-06-01T10:09:00Z', counterparty: '0xsource' },
    { value_usd: 28000, direction: 'out', timestamp: '2026-06-01T10:30:00Z', counterparty: '0xdest' },
    { value_usd: 250, direction: 'out', timestamp: '2026-06-01T11:00:00Z', counterparty: '0xmisc' },
  ] };
  const r = await post('transaction-pattern-detector', '/detect', body);
  log(r.status === 200 && near(r.json.aml_pattern_score, 69, 1) && r.json.patterns.structuring.detected && r.json.patterns.layering.detected && r.json.verdict === 'review' && near(r.json.total_volume_usd, 56750),
    `tpd — structuring+layering detected, score~69, total 56750 (got score=${r.json.aml_pattern_score}, detected=[${r.json.patterns_detected}], verdict=${r.json.verdict})`);
}
{
  const r = await post('transaction-pattern-detector', '/detect', { transactions: [{ value_usd: 100, direction: 'out', counterparty: '0xofac', counterparty_sanctioned: true }] });
  log(r.status === 200 && r.json.hard_block === true && r.json.verdict === 'block', `tpd — sanctioned counterparty ⇒ hard_block + block (got hb=${r.json.hard_block}, verdict=${r.json.verdict})`);
}

// Numeric sanity — wallet-funding-source-analyzer.
{
  const body = { sources: [
    { label: 'Coinbase', category: 'cex', amount_usd: 60000, kyc_level: 'full' },
    { label: 'Uniswap', category: 'dex', amount_usd: 18000 },
    { label: 'Tornado', category: 'mixer', amount_usd: 9000 },
    { label: 'EOA', amount_usd: 4000, kyc_level: 'none' },
  ] };
  const r = await post('wallet-funding-source-analyzer', '/analyze', body);
  log(r.status === 200 && near(r.json.funded_total_usd, 91000) && near(r.json.funding_risk_score, 23, 1) && near(r.json.mixer_funding_pct, 9.89, 0.1) && near(r.json.kyc_coverage_pct, 65.93, 0.1) && r.json.verdict === 'review',
    `wfs — funded 91000, risk~23, mixer~9.89%, kyc~65.93%, review (got funded=${r.json.funded_total_usd}, risk=${r.json.funding_risk_score}, mixer=${r.json.mixer_funding_pct}, verdict=${r.json.verdict})`);
}
{
  // Mixer funding >= 25% must hard-block.
  const r = await post('wallet-funding-source-analyzer', '/analyze', { sources: [{ label: 'Mix', category: 'mixer', amount_usd: 30000 }, { label: 'CEX', category: 'cex', amount_usd: 20000 }] });
  log(r.status === 200 && r.json.hard_block === true && r.json.verdict === 'block', `wfs — mixer funding ≥25% ⇒ hard_block + block (got hb=${r.json.hard_block}, mixer=${r.json.mixer_funding_pct}, verdict=${r.json.verdict})`);
}

// Numeric sanity — portfolio-stablecoin-risk.
{
  const body = { holdings: [
    { symbol: 'USDC', issuer: 'Circle', amount_usd: 120000, collateral_type: 'fiat', attestation: 'audited' },
    { symbol: 'USDT', issuer: 'Tether', amount_usd: 60000, collateral_type: 'fiat', attestation: 'attested' },
    { symbol: 'DAI', issuer: 'MakerDAO', amount_usd: 30000, collateral_type: 'crypto', attestation: 'attested' },
    { symbol: 'USTC', issuer: 'Terra', amount_usd: 10000, collateral_type: 'algorithmic', attestation: 'none', current_price: 0.85 },
  ] };
  const r = await post('portfolio-stablecoin-risk', '/assess', body);
  log(r.status === 200 && near(r.json.total_stablecoin_usd, 220000) && near(r.json.stablecoin_risk_score, 13, 1) && near(r.json.max_depeg_pct, 15) && r.json.hard_block === true && r.json.verdict === 'block',
    `psr — total 220000, low score 13, depeg 15% ⇒ hard_block + block (got total=${r.json.total_stablecoin_usd}, score=${r.json.stablecoin_risk_score}, depeg=${r.json.max_depeg_pct}, hb=${r.json.hard_block}, verdict=${r.json.verdict})`);
}

// Numeric sanity — portfolio-yield-exposure.
{
  const body = { positions: [
    { protocol: 'Aave', type: 'lending', amount_usd: 80000, apy_pct: 4.5, audited: true },
    { protocol: 'Curve', type: 'lp', amount_usd: 40000, apy_pct: 9, is_stable_pair: true, audited: true },
    { protocol: 'Uniswap', type: 'lp', amount_usd: 25000, apy_pct: 22, il_risk: 'high', audited: true },
    { protocol: 'NewFarm', type: 'farm', amount_usd: 15000, apy_pct: 180, reward_token: 'FARM', lockup_days: 30 },
  ] };
  const r = await post('portfolio-yield-exposure', '/analyze', body);
  log(r.status === 200 && near(r.json.total_yield_position_usd, 160000) && near(r.json.weighted_apy_pct, 24.81, 0.1) && near(r.json.yield_risk_score, 18, 1) && near(r.json.il_exposure_pct, 25, 0.5) && r.json.verdict === 'review',
    `pye — total 160000, apy~24.81, risk~18, IL~25%, review (got total=${r.json.total_yield_position_usd}, apy=${r.json.weighted_apy_pct}, risk=${r.json.yield_risk_score}, il=${r.json.il_exposure_pct}, verdict=${r.json.verdict})`);
}

// Numeric sanity — bridge-transfer-risk.
{
  const body = { amount_usd: 250000, bridge: 'X', bridge_type: 'lock_mint', dest_liquidity_usd: 2000000, bridge_tvl_usd: 40000000, audited: true };
  const r = await post('bridge-transfer-risk', '/assess', body);
  log(r.status === 200 && near(r.json.bridge_risk_score, 55, 1) && near(r.json.estimated_slippage_pct, 11.11, 0.1) && near(r.json.trust_score, 67, 1) && r.json.verdict === 'review',
    `btr — risk~55, slippage~11.11%, trust~67, review (got risk=${r.json.bridge_risk_score}, slippage=${r.json.estimated_slippage_pct}, trust=${r.json.trust_score}, verdict=${r.json.verdict})`);
}
{
  // A previously-exploited bridge must hard-block.
  const r = await post('bridge-transfer-risk', '/assess', { amount_usd: 1000, bridge: 'Hacked', exploited_before: true });
  log(r.status === 200 && r.json.hard_block === true && r.json.verdict === 'block', `btr — exploited_before ⇒ hard_block + block (got hb=${r.json.hard_block}, verdict=${r.json.verdict})`);
}

// Error paths → 400.
const errs = [
  ['transaction-pattern-detector', '/detect', {}],
  ['transaction-pattern-detector', '/lookup', { transactions: 'nope' }],
  ['wallet-funding-source-analyzer', '/analyze', {}],
  ['wallet-funding-source-analyzer', '/lookup', { sources: [] }],
  ['portfolio-stablecoin-risk', '/assess', {}],
  ['portfolio-stablecoin-risk', '/lookup', { holdings: [42] }],
  ['portfolio-yield-exposure', '/analyze', {}],
  ['portfolio-yield-exposure', '/lookup', { positions: 'nope' }],
  ['bridge-transfer-risk', '/assess', {}],
  ['bridge-transfer-risk', '/lookup', { amount_usd: 0 }],
];
for (const [slug, path, body] of errs) {
  const { status, json } = await post(slug, path, body);
  log(status === 400 && json.success === false, `${slug}${path} — invalid input → 400 (${status}, ${json?.error?.code})`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
