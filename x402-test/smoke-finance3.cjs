// Finance batch 3 validator: mounts each router, validates every live response
// against the published OpenAPI schema (ajv 2020), validates each embedded spec
// responseExample (drift guard), exercises 400 paths + edge cases, asserts math.
const express = require('express');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'credit-score-estimator': { router: require('../dist/routes/credit-score-estimator-api/routes/intelligence').default, spec: require('../dist/routes/credit-score-estimator-api/routes/openapi').spec },
  'insurance-needs-calculator': { router: require('../dist/routes/insurance-needs-calculator-api/routes/intelligence').default, spec: require('../dist/routes/insurance-needs-calculator-api/routes/openapi').spec },
  'loan-affordability-calculator': { router: require('../dist/routes/loan-affordability-calculator-api/routes/intelligence').default, spec: require('../dist/routes/loan-affordability-calculator-api/routes/openapi').spec },
  'rent-vs-buy-calculator': { router: require('../dist/routes/rent-vs-buy-calculator-api/routes/intelligence').default, spec: require('../dist/routes/rent-vs-buy-calculator-api/routes/openapi').spec },
  'dti-calculator': { router: require('../dist/routes/dti-calculator-api/routes/intelligence').default, spec: require('../dist/routes/dti-calculator-api/routes/openapi').spec },
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
  // credit-score-estimator
  console.log('credit-score-estimator:');
  check('credit-score-estimator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/credit-score-estimator/')).json);
  const cReq = { on_time_payment_pct: 98, credit_utilization_pct: 22, avg_account_age_years: 6, num_credit_types: 3, hard_inquiries_last_12mo: 1, derogatory_marks: 0 };
  check('credit-score-estimator', 'POST /estimate', 'EstimateResponse', (await call(base, 'POST', '/credit-score-estimator/estimate', cReq)).json, d =>
    d.estimated_score === 800 && d.rating === 'exceptional' && d.is_estimate === true ? null : 'expected 800/exceptional');
  check('credit-score-estimator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/credit-score-estimator/lookup', cReq)).json, d =>
    d.confidence_score === 0.6 && d.execution_metadata.model === 'deterministic' ? null : 'confidence 0.6 + deterministic expected');
  check('credit-score-estimator', 'POST /estimate (poor profile)', 'EstimateResponse', (await call(base, 'POST', '/credit-score-estimator/estimate', { on_time_payment_pct: 70, credit_utilization_pct: 95, avg_account_age_years: 1, num_credit_types: 1, hard_inquiries_last_12mo: 6, derogatory_marks: 3 })).json, d =>
    d.estimated_score < 580 && d.rating === 'poor' ? null : `expected poor, got ${d.estimated_score}`);
  const cBad = await call(base, 'POST', '/credit-score-estimator/estimate', { on_time_payment_pct: 150, credit_utilization_pct: 10, avg_account_age_years: 5, num_credit_types: 3 });
  check('credit-score-estimator', 'POST /estimate (bad pct -> 400)', 'Error400', cBad.json, () => cBad.status === 400 ? null : `status ${cBad.status}`);
  driftGuard('credit-score-estimator');

  // insurance-needs-calculator
  console.log('insurance-needs-calculator:');
  check('insurance-needs-calculator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/insurance-needs-calculator/')).json);
  const iReq = { annual_income: 90000, years_income_replacement: 10, non_mortgage_debt: 25000, mortgage_balance: 280000, education_fund_needed: 120000, final_expenses: 15000, existing_coverage: 100000, liquid_assets: 50000 };
  check('insurance-needs-calculator', 'POST /calculate', 'CalculateResponse', (await call(base, 'POST', '/insurance-needs-calculator/calculate', iReq)).json, d =>
    d.total_need === 1340000 && d.coverage_gap === 1190000 && d.recommended_coverage === 1200000 && d.adequately_insured === false ? null : 'insurance math off');
  check('insurance-needs-calculator', 'POST /calculate (adequately insured)', 'CalculateResponse', (await call(base, 'POST', '/insurance-needs-calculator/calculate', { annual_income: 50000, years_income_replacement: 2, existing_coverage: 500000 })).json, d =>
    d.adequately_insured === true && d.coverage_gap === 0 && d.recommended_coverage === 0 ? null : 'expected adequately insured, 0 gap');
  check('insurance-needs-calculator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/insurance-needs-calculator/lookup', iReq)).json, d => d.sensitivity_analysis.length === 4 ? null : 'expected 4 sensitivity rows');
  const iBad = await call(base, 'POST', '/insurance-needs-calculator/calculate', { annual_income: 0 });
  check('insurance-needs-calculator', 'POST /calculate (income 0 -> 400)', 'Error400', iBad.json, () => iBad.status === 400 ? null : `status ${iBad.status}`);

  // loan-affordability-calculator
  console.log('loan-affordability-calculator:');
  check('loan-affordability-calculator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/loan-affordability-calculator/')).json);
  const lReq = { annual_income: 120000, monthly_debt_payments: 600, down_payment: 60000, annual_rate: 6.5, term_months: 360, property_tax_insurance_monthly: 450 };
  check('loan-affordability-calculator', 'POST /calculate', 'CalculateResponse', (await call(base, 'POST', '/loan-affordability-calculator/calculate', lReq)).json, d =>
    Math.abs(d.max_purchase_price - 431795.43) < 1 && d.binding_constraint === 'front_end_dti' ? null : `afford math off (${d.max_purchase_price})`);
  check('loan-affordability-calculator', 'POST /calculate (debt-buried)', 'CalculateResponse', (await call(base, 'POST', '/loan-affordability-calculator/calculate', { annual_income: 60000, monthly_debt_payments: 2000, annual_rate: 6.5 })).json, d =>
    d.max_loan_amount === 0 && d.binding_constraint === 'back_end_dti' ? null : 'expected 0 loan when debt consumes DTI');
  check('loan-affordability-calculator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/loan-affordability-calculator/lookup', lReq)).json, d => d.sensitivity_analysis.length === 5 ? null : 'expected 5 rows');
  const lBad = await call(base, 'POST', '/loan-affordability-calculator/calculate', { annual_income: 100000, annual_rate: 99 });
  check('loan-affordability-calculator', 'POST /calculate (bad rate -> 400)', 'Error400', lBad.json, () => lBad.status === 400 ? null : `status ${lBad.status}`);
  driftGuard('loan-affordability-calculator');

  // rent-vs-buy-calculator
  console.log('rent-vs-buy-calculator:');
  check('rent-vs-buy-calculator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/rent-vs-buy-calculator/')).json);
  const rReq = { home_price: 450000, down_payment: 90000, annual_rate: 6.5, term_months: 360, monthly_rent: 2400, years: 7 };
  check('rent-vs-buy-calculator', 'POST /compare', 'CompareResponse', (await call(base, 'POST', '/rent-vs-buy-calculator/compare', rReq)).json, d =>
    ['buy', 'rent', 'similar'].includes(d.recommendation) && typeof d.net_buy_cost === 'number' ? null : 'rent-vs-buy shape off');
  check('rent-vs-buy-calculator', 'POST /compare (high appreciation -> buy)', 'CompareResponse', (await call(base, 'POST', '/rent-vs-buy-calculator/compare', { ...rReq, home_appreciation_pct: 8 })).json, d =>
    d.recommendation === 'buy' && d.breakeven_year !== null ? null : 'high appreciation should favor buying');
  check('rent-vs-buy-calculator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/rent-vs-buy-calculator/lookup', rReq)).json, d => d.sensitivity_analysis.length === 5 ? null : 'expected 5 rows');
  const rBad = await call(base, 'POST', '/rent-vs-buy-calculator/compare', { home_price: 0, monthly_rent: 2000, annual_rate: 6 });
  check('rent-vs-buy-calculator', 'POST /compare (price 0 -> 400)', 'Error400', rBad.json, () => rBad.status === 400 ? null : `status ${rBad.status}`);

  // dti-calculator
  console.log('dti-calculator:');
  check('dti-calculator', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/dti-calculator/')).json);
  const dReq = { gross_monthly_income: 8000, housing_payment: 2000, other_monthly_debt: 700 };
  check('dti-calculator', 'POST /calculate', 'CalculateResponse', (await call(base, 'POST', '/dti-calculator/calculate', dReq)).json, d =>
    d.back_end_dti_pct === 33.8 && d.qualification === 'strong' && d.front_end_dti_pct === 25 ? null : 'dti math off');
  check('dti-calculator', 'POST /calculate (high risk)', 'CalculateResponse', (await call(base, 'POST', '/dti-calculator/calculate', { annual_income: 60000, housing_payment: 2000, other_monthly_debt: 1200 })).json, d =>
    d.qualification === 'high_risk' && d.back_end_dti_pct > 50 ? null : 'expected high_risk over 50%');
  check('dti-calculator', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/dti-calculator/lookup', dReq)).json, d => d.thresholds.back_end_qm_limit_pct === 43 ? null : 'thresholds missing');
  const dBad = await call(base, 'POST', '/dti-calculator/calculate', { housing_payment: 2000 });
  check('dti-calculator', 'POST /calculate (no income -> 400)', 'Error400', dBad.json, () => dBad.status === 400 ? null : `status ${dBad.status}`);
  driftGuard('dti-calculator');

  console.log('drift guards:');
  driftGuard('insurance-needs-calculator');
  driftGuard('rent-vs-buy-calculator');

  console.log(`\n${pass}/${pass + fail} checks passed`);
  process.exit(fail ? 1 : 0);
}
const srv = app.listen(0, () => run(`http://127.0.0.1:${srv.address().port}`));
