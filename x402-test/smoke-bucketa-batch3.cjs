// Bucket A batch 3 validator: live responses ajv-2020 vs published schema,
// spec responseExample drift guard, 400 paths, deterministic logic asserts.
const express = require('express');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'web-scrape-planner': { router: require('../dist/routes/web-scrape-planner-api/routes/intelligence').default, spec: require('../dist/routes/web-scrape-planner-api/routes/openapi').spec },
  'web-scrape-legal-risk-checker': { router: require('../dist/routes/web-scrape-legal-risk-checker-api/routes/intelligence').default, spec: require('../dist/routes/web-scrape-legal-risk-checker-api/routes/openapi').spec },
  'web-scrape-monitoring-scorer': { router: require('../dist/routes/web-scrape-monitoring-scorer-api/routes/intelligence').default, spec: require('../dist/routes/web-scrape-monitoring-scorer-api/routes/openapi').spec },
  'country-currency-data': { router: require('../dist/routes/country-currency-data-api/routes/intelligence').default, spec: require('../dist/routes/country-currency-data-api/routes/openapi').spec },
  'finance-payments': { router: require('../dist/routes/finance-payments-api/routes/intelligence').default, spec: require('../dist/routes/finance-payments-api/routes/openapi').spec },
};

const app = express();
app.use(express.json({ limit: '2mb' }));
for (const [slug, { router }] of Object.entries(APIS)) app.use('/' + slug, router);

const validators = {};
for (const [slug, { spec }] of Object.entries(APIS)) {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  ajv.addSchema(spec, slug);
  validators[slug] = (name, data) => { const v = ajv.getSchema(`${slug}#/components/schemas/${name}`); if (!v) throw new Error(`no schema ${name}`); return { ok: v(data), errors: v.errors }; };
}

let pass = 0, fail = 0;
function check(slug, label, name, data, extra) {
  const { ok, errors } = validators[slug](name, data);
  let msg = ''; if (ok && extra) { const e = extra(data); if (e) msg = ' — ASSERT: ' + e; }
  if (ok && !msg) { pass++; console.log(`  ✓ ${label} → ${name}`); }
  else { fail++; console.log(`  ✗ ${label} → ${name}${msg}`); if (!ok) console.log('    ' + JSON.stringify(errors)); }
}
function driftGuard(slug) {
  const { spec } = APIS[slug];
  for (const [path, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) {
    const media = op.responses?.['200']?.content?.['application/json']; if (!media?.example) continue;
    check(slug, `spec example ${method.toUpperCase()} ${path}`, (media.schema?.$ref || '').split('/').pop(), media.example);
  }
}
async function call(base, method, path, body) {
  const res = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json() };
}

async function run(base) {
  // ---- web-scrape-planner ----
  console.log('web-scrape-planner:');
  check('web-scrape-planner', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web-scrape-planner/')).json);
  check('web-scrape-planner', 'POST /plan', 'PlanResponse', (await call(base, 'POST', '/web-scrape-planner/plan', { total_pages: 5200, requested_rps: 2, concurrency: 4, batch_size: 1000, retry_overhead_pct: 10 })).json, d => d.effective_rps === 2 && d.total_batches === 6 && d.last_batch_pages === 200 && d.pages_with_retries === 5720 && d.estimated_total_seconds === 2860 && d.estimated_total_human === '47m 40s' && d.sample_schedule.length === 6 ? null : `unexpected ${d.total_batches}/${d.estimated_total_seconds}/${d.estimated_total_human}`);
  check('web-scrape-planner', 'POST /plan (crawl-delay)', 'PlanResponse', (await call(base, 'POST', '/web-scrape-planner/plan', { total_pages: 100, crawl_delay_s: 2, batch_size: 50 })).json, d => d.effective_rps === 0.5 && d.total_batches === 2 && d.estimated_total_seconds === 200 ? null : `unexpected ${d.effective_rps}/${d.estimated_total_seconds}`);
  check('web-scrape-planner', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/web-scrape-planner/lookup', { total_pages: 5200, requested_rps: 2, batch_size: 1000, retry_overhead_pct: 10 })).json, d => d.total_batches === 6 && d.reasoning && d.reasoning.key_factors.length >= 3 ? null : 'expected reasoning + 6 batches');
  const wspBad = await call(base, 'POST', '/web-scrape-planner/plan', {});
  check('web-scrape-planner', 'POST /plan (no pages -> 400)', 'Error400', wspBad.json, () => wspBad.status === 400 ? null : `status ${wspBad.status}`);
  driftGuard('web-scrape-planner');

  // ---- web-scrape-legal-risk-checker ----
  console.log('web-scrape-legal-risk-checker:');
  check('web-scrape-legal-risk-checker', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web-scrape-legal-risk-checker/')).json);
  check('web-scrape-legal-risk-checker', 'POST /assess (EU PII + commercial)', 'AssessResponse', (await call(base, 'POST', '/web-scrape-legal-risk-checker/assess', { region: 'EU', personal_data: true, commercial_use: true })).json, d => d.risk_score === 30 && d.legal_risk_level === 'moderate' && d.do_not_proceed === false && d.region === 'EU' ? null : `unexpected ${d.risk_score}/${d.legal_risk_level}`);
  check('web-scrape-legal-risk-checker', 'POST /assess (circumvention -> severe)', 'AssessResponse', (await call(base, 'POST', '/web-scrape-legal-risk-checker/assess', { bypasses_access_controls: true })).json, d => d.do_not_proceed === true && d.legal_risk_level === 'severe' ? null : `expected severe/do_not_proceed got ${d.legal_risk_level}/${d.do_not_proceed}`);
  check('web-scrape-legal-risk-checker', 'POST /assess (clean -> low)', 'AssessResponse', (await call(base, 'POST', '/web-scrape-legal-risk-checker/assess', { region: 'US' })).json, d => d.risk_score === 0 && d.legal_risk_level === 'low' && d.triggered_flags.length === 0 ? null : `expected low/0 got ${d.legal_risk_level}/${d.risk_score}`);
  check('web-scrape-legal-risk-checker', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/web-scrape-legal-risk-checker/lookup', { region: 'EU', personal_data: true, commercial_use: true })).json, d => d.risk_score === 30 && d.reasoning && d.legal_disclaimer ? null : 'expected reasoning + disclaimer');
  const wslBad = await call(base, 'POST', '/web-scrape-legal-risk-checker/assess', [1, 2]);
  check('web-scrape-legal-risk-checker', 'POST /assess (array body -> 400)', 'Error400', wslBad.json, () => wslBad.status === 400 ? null : `status ${wslBad.status}`);
  driftGuard('web-scrape-legal-risk-checker');

  // ---- web-scrape-monitoring-scorer ----
  console.log('web-scrape-monitoring-scorer:');
  check('web-scrape-monitoring-scorer', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web-scrape-monitoring-scorer/')).json);
  check('web-scrape-monitoring-scorer', 'POST /score (counts+window)', 'ScoreResponse', (await call(base, 'POST', '/web-scrape-monitoring-scorer/score', { changes_observed: 12, observation_window_days: 30, importance: 'high', staleness_tolerance_hours: 24 })).json, d => d.change_rate_per_day === 0.4 && d.mean_change_interval_days === 2.5 && d.volatility === 'moderate' && d.recommended_check_interval_hours === 24 && d.cadence_capped_by === 'staleness_tolerance' && d.monitoring_priority_score === 51.2 && d.priority_band === 'high' ? null : `unexpected ${d.recommended_check_interval_hours}/${d.monitoring_priority_score}/${d.priority_band}`);
  check('web-scrape-monitoring-scorer', 'POST /score (static)', 'ScoreResponse', (await call(base, 'POST', '/web-scrape-monitoring-scorer/score', { change_rate_per_day: 0, importance: 'low' })).json, d => d.volatility === 'static' && d.recommended_check_interval_hours === 720 && d.mean_change_interval_days === -1 ? null : `expected static/720 got ${d.volatility}/${d.recommended_check_interval_hours}`);
  check('web-scrape-monitoring-scorer', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/web-scrape-monitoring-scorer/lookup', { mean_change_interval_days: 2.5, importance: 'high', staleness_tolerance_hours: 24 })).json, d => d.recommended_check_interval_hours === 24 && d.reasoning ? null : 'expected 24h + reasoning');
  const wsmBad = await call(base, 'POST', '/web-scrape-monitoring-scorer/score', { importance: 'high' });
  check('web-scrape-monitoring-scorer', 'POST /score (no signal -> 400)', 'Error400', wsmBad.json, () => wsmBad.status === 400 ? null : `status ${wsmBad.status}`);
  driftGuard('web-scrape-monitoring-scorer');

  // ---- country-currency-data ----
  console.log('country-currency-data:');
  check('country-currency-data', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/country-currency-data/')).json);
  check('country-currency-data', 'POST /country (JP)', 'CountryResponse', (await call(base, 'POST', '/country-currency-data/country', { query: 'JP' })).json, d => d.found === true && d.country.name === 'Japan' && d.country.currency === 'JPY' && d.currency.code === 'JPY' ? null : `unexpected ${d.country && d.country.name}`);
  check('country-currency-data', 'POST /country (dial code)', 'CountryResponse', (await call(base, 'POST', '/country-currency-data/country', { query: '+81' })).json, d => d.found === true && d.country.iso2 === 'JP' ? null : 'expected JP from +81');
  check('country-currency-data', 'POST /country (not found)', 'CountryResponse', (await call(base, 'POST', '/country-currency-data/country', { query: 'Atlantis' })).json, d => d.found === false && d.country === null ? null : 'expected found:false');
  check('country-currency-data', 'POST /currency (EUR)', 'CurrencyResponse', (await call(base, 'POST', '/country-currency-data/currency', { code: 'EUR' })).json, d => d.found === true && JSON.stringify(d.used_by) === JSON.stringify(['DE', 'FR', 'IT', 'ES', 'NL', 'IE', 'PT', 'BE', 'AT', 'FI']) ? null : `unexpected used_by ${JSON.stringify(d.used_by)}`);
  check('country-currency-data', 'POST /format (USD)', 'FormatResponse', (await call(base, 'POST', '/country-currency-data/format', { amount: 1234567.5, currency: 'USD' })).json, d => d.formatted === '$1,234,567.50 USD' && d.minor_units === 2 ? null : `unexpected ${d.formatted}`);
  check('country-currency-data', 'POST /format (JPY 0 minor)', 'FormatResponse', (await call(base, 'POST', '/country-currency-data/format', { amount: 1500, currency: 'JPY' })).json, d => d.formatted === '¥1,500 JPY' ? null : `unexpected ${d.formatted}`);
  check('country-currency-data', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/country-currency-data/lookup', { country: 'France', amount: 2500 })).json, d => d.country.iso2 === 'FR' && d.currency.code === 'EUR' && d.formatted === '€2,500.00 EUR' && d.reasoning ? null : `unexpected ${d.formatted}`);
  const ccdNoAmt = await call(base, 'POST', '/country-currency-data/format', { currency: 'USD' });
  check('country-currency-data', 'POST /format (no amount -> 400)', 'Error400', ccdNoAmt.json, () => ccdNoAmt.status === 400 ? null : `status ${ccdNoAmt.status}`);
  const ccdBadCur = await call(base, 'POST', '/country-currency-data/format', { amount: 5, currency: 'ZZZ' });
  check('country-currency-data', 'POST /format (bad currency -> 400)', 'Error400', ccdBadCur.json, () => ccdBadCur.status === 400 ? null : `status ${ccdBadCur.status}`);
  driftGuard('country-currency-data');

  // ---- finance-payments ----
  console.log('finance-payments:');
  check('finance-payments', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/finance-payments/')).json);
  check('finance-payments', 'POST /installment', 'InstallmentResponse', (await call(base, 'POST', '/finance-payments/installment', { principal: 10000, apr: 6, term_months: 12 })).json, d => d.monthly_payment === 860.66 && d.total_interest === 327.97 && d.total_paid === 10327.97 && d.schedule.length === 12 ? null : `unexpected ${d.monthly_payment}/${d.total_interest}/${d.total_paid}`);
  check('finance-payments', 'POST /installment (0% APR)', 'InstallmentResponse', (await call(base, 'POST', '/finance-payments/installment', { principal: 12000, apr: 0, term_months: 12 })).json, d => d.monthly_payment === 1000 && d.total_interest === 0 && d.total_paid === 12000 && d.schedule[0].interest === 0 ? null : `unexpected 0%% APR ${d.monthly_payment}/${d.total_interest}/${d.total_paid}`);
  check('finance-payments', 'POST /fee-split', 'FeeResponse', (await call(base, 'POST', '/finance-payments/fee-split', { amount: 100, fee_percent: 2.9, fixed_fee: 0.3, target_net: 100 })).json, d => d.fee_total === 3.2 && d.net_amount === 96.8 && d.gross_up_for_net === 103.3 ? null : `unexpected ${d.fee_total}/${d.net_amount}/${d.gross_up_for_net}`);
  check('finance-payments', 'POST /settlement (equal 3-way)', 'SettlementResponse', (await call(base, 'POST', '/finance-payments/settlement', { amount: 1000, parties: [{ name: 'alice', weight: 1 }, { name: 'bob', weight: 1 }, { name: 'carol', weight: 1 }] })).json, d => d.allocated_total === 1000 && JSON.stringify(d.allocations.map(a => a.amount)) === JSON.stringify([333.34, 333.33, 333.33]) ? null : `unexpected ${JSON.stringify(d.allocations.map(a => a.amount))}`);
  check('finance-payments', 'POST /lookup (with fee)', 'LookupResponse', (await call(base, 'POST', '/finance-payments/lookup', { principal: 10000, apr: 6, term_months: 12, fee_percent: 2.9, fixed_fee: 0.3 })).json, d => d.monthly_payment === 860.66 && d.per_payment_fee === 25.26 && d.net_per_payment === 835.4 && d.reasoning ? null : `unexpected ${d.per_payment_fee}/${d.net_per_payment}`);
  const fpBad = await call(base, 'POST', '/finance-payments/installment', { apr: 6, term_months: 12 });
  check('finance-payments', 'POST /installment (no principal -> 400)', 'Error400', fpBad.json, () => fpBad.status === 400 ? null : `status ${fpBad.status}`);
  const fpSetBad = await call(base, 'POST', '/finance-payments/settlement', { amount: 100 });
  check('finance-payments', 'POST /settlement (no parties -> 400)', 'Error400', fpSetBad.json, () => fpSetBad.status === 400 ? null : `status ${fpSetBad.status}`);
  driftGuard('finance-payments');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

const server = app.listen(0, () => run(`http://127.0.0.1:${server.address().port}`).catch(e => { console.error(e); process.exit(1); }));
