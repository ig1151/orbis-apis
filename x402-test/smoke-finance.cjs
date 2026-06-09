// Finance batch validator.
// Mounts each finance API's router, hits every endpoint with real HTTP, and
// validates each response against the published OpenAPI schema using ajv 2020,
// plus deterministic math assertions.
const express = require('express');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'refinance-calculator': {
    router: require('../dist/routes/refinance-calculator-api/routes/intelligence').default,
    spec: require('../dist/routes/refinance-calculator-api/routes/openapi').spec,
  },
  'mortgage-refinance': {
    router: require('../dist/routes/mortgage-refinance-api/routes/intelligence').default,
    spec: require('../dist/routes/mortgage-refinance-api/routes/openapi').spec,
  },
  'emergency-fund-calculator': {
    router: require('../dist/routes/emergency-fund-calculator-api/routes/intelligence').default,
    spec: require('../dist/routes/emergency-fund-calculator-api/routes/openapi').spec,
  },
  'financial-health-checker': {
    router: require('../dist/routes/financial-health-checker-api/routes/intelligence').default,
    spec: require('../dist/routes/financial-health-checker-api/routes/openapi').spec,
  },
  'personal-finance-agent': {
    router: require('../dist/routes/personal-finance-agent-api/routes/intelligence').default,
    spec: require('../dist/routes/personal-finance-agent-api/routes/openapi').spec,
  },
};

const app = express();
app.use(express.json({ limit: '2mb' }));
for (const [slug, { router }] of Object.entries(APIS)) app.use('/' + slug, router);

const validators = {};
for (const [slug, { spec }] of Object.entries(APIS)) {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  ajv.addSchema(spec, slug);
  validators[slug] = (schemaName, data) => {
    const v = ajv.getSchema(`${slug}#/components/schemas/${schemaName}`);
    if (!v) throw new Error(`no schema ${schemaName} in ${slug}`);
    const ok = v(data);
    return { ok, errors: v.errors };
  };
}

let pass = 0, fail = 0;
function check(slug, label, schemaName, data, extra) {
  const { ok, errors } = validators[slug](schemaName, data);
  let extraMsg = '';
  if (ok && extra) { const e = extra(data); if (e) extraMsg = ' — ASSERT FAILED: ' + e; }
  const good = ok && !extraMsg;
  if (good) { pass++; console.log(`  ✓ ${label} → ${schemaName}`); }
  else {
    fail++;
    console.log(`  ✗ ${label} → ${schemaName}${extraMsg}`);
    if (!ok) console.log('    ' + JSON.stringify(errors));
  }
}

async function call(base, method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method, headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function run(base) {
  // ---- Refinance Calculator ----
  console.log('refinance-calculator:');
  check('refinance-calculator', 'GET /', 'DiscoveryResponse', await call(base, 'GET', '/refinance-calculator/'));
  const rReq = { current_balance: 280000, current_rate: 7.25, current_remaining_months: 324, new_rate: 6.0, new_term_months: 360, closing_costs: 4500 };
  const rc = await call(base, 'POST', '/refinance-calculator/calculate', rReq);
  check('refinance-calculator', 'POST /calculate', 'CalculateResponse', rc, (d) =>
    d.new_monthly_payment < d.current_monthly_payment && d.monthly_savings > 0 && d.break_even_months === Math.ceil(4500 / d.monthly_savings) ? null : `math: save=${d.monthly_savings} be=${d.break_even_months}`);
  const rl = await call(base, 'POST', '/refinance-calculator/lookup', rReq);
  check('refinance-calculator', 'POST /lookup', 'LookupResponse', rl, (d) =>
    d.sensitivity_analysis.length === 5 && d.confidence_score === 1.0 && typeof d.financial_disclaimer === 'string' ? null : 'lookup shape');
  // higher new rate → no savings → break_even null, risk high
  const rNo = await call(base, 'POST', '/refinance-calculator/calculate', { current_balance: 100000, current_rate: 4, current_remaining_months: 120, new_rate: 8, new_term_months: 120, closing_costs: 3000 });
  check('refinance-calculator', 'POST /calculate (no savings)', 'CalculateResponse', rNo, (d) =>
    d.monthly_savings < 0 && d.break_even_months === null && d.worth_it === false && d.risk_level === 'high' ? null : `expected no-savings: ${JSON.stringify({ s: d.monthly_savings, be: d.break_even_months })}`);
  const rBad = await call(base, 'POST', '/refinance-calculator/calculate', { current_balance: -1, current_rate: 6, current_remaining_months: 120, new_rate: 5, new_term_months: 120 });
  check('refinance-calculator', 'POST /calculate (bad → 400)', 'Error400', rBad, (d) => d.error && d.error.code === 'invalid_request' ? null : 'expected invalid_request');

  // ---- Mortgage Refinance ----
  console.log('mortgage-refinance:');
  check('mortgage-refinance', 'GET /', 'DiscoveryResponse', await call(base, 'GET', '/mortgage-refinance/'));
  const mReq = { home_value: 480000, current_balance: 360000, current_rate: 7.5, current_remaining_months: 348, new_rate: 6.125, new_term_months: 360, closing_costs: 6000, pmi_monthly: 180 };
  const ma = await call(base, 'POST', '/mortgage-refinance/analyze', mReq);
  check('mortgage-refinance', 'POST /analyze', 'AnalyzeResponse', ma, (d) =>
    Math.abs(d.ltv - 0.75) < 1e-9 && d.pmi_removal_eligible === true && d.new_pmi_monthly === 0 ? null : `ltv/pmi: ${d.ltv}/${d.pmi_removal_eligible}`);
  const ml = await call(base, 'POST', '/mortgage-refinance/lookup', mReq);
  check('mortgage-refinance', 'POST /lookup', 'LookupResponse', ml, (d) => d.sensitivity_analysis.length === 5 && d.reasoning ? null : 'lookup shape');
  // high LTV (>80%) keeps PMI
  const mHighLtv = await call(base, 'POST', '/mortgage-refinance/analyze', { home_value: 400000, current_balance: 380000, current_rate: 7, current_remaining_months: 348, new_rate: 6.5, new_term_months: 360, pmi_monthly: 200 });
  check('mortgage-refinance', 'POST /analyze (high LTV keeps PMI)', 'AnalyzeResponse', mHighLtv, (d) =>
    d.ltv > 0.8 && d.pmi_removal_eligible === false && d.new_pmi_monthly === 200 ? null : `expected PMI kept: ltv=${d.ltv} pmi=${d.new_pmi_monthly}`);
  const mBad = await call(base, 'POST', '/mortgage-refinance/analyze', { home_value: 0, current_balance: 100000, current_rate: 6, current_remaining_months: 120, new_rate: 5, new_term_months: 120 });
  check('mortgage-refinance', 'POST /analyze (bad → 400)', 'Error400', mBad, (d) => d.error && d.error.code === 'invalid_request' ? null : 'expected invalid_request');

  // ---- Emergency Fund Calculator ----
  console.log('emergency-fund-calculator:');
  check('emergency-fund-calculator', 'GET /', 'DiscoveryResponse', await call(base, 'GET', '/emergency-fund-calculator/'));
  const efReq = { monthly_expenses: 4200, current_savings: 6000, monthly_contribution: 500, dependents: 2, job_stability: 'variable' };
  const ef = await call(base, 'POST', '/emergency-fund-calculator/calculate', efReq);
  check('emergency-fund-calculator', 'POST /calculate', 'CalculateResponse', ef, (d) =>
    d.recommended_target_months === 8 && d.recommended_target_amount === 33600 && d.gap === 27600 && d.months_to_goal === Math.ceil(27600 / 500) ? null : `math: tgt=${d.recommended_target_months} amt=${d.recommended_target_amount} gap=${d.gap} m2g=${d.months_to_goal}`);
  const efl = await call(base, 'POST', '/emergency-fund-calculator/lookup', efReq);
  check('emergency-fund-calculator', 'POST /lookup', 'LookupResponse', efl, (d) => d.reasoning && d.status === 'underfunded' ? null : 'lookup shape');
  // fully funded: no contribution, big savings → months_to_goal 0, status fully_funded
  const efFull = await call(base, 'POST', '/emergency-fund-calculator/calculate', { monthly_expenses: 3000, current_savings: 30000, job_stability: 'stable' });
  check('emergency-fund-calculator', 'POST /calculate (fully funded)', 'CalculateResponse', efFull, (d) =>
    d.status === 'fully_funded' && d.gap === 0 && d.months_to_goal === 0 && d.funded_percent === 100 ? null : `expected funded: ${JSON.stringify({ s: d.status, g: d.gap })}`);
  // no contribution + gap → months_to_goal null
  const efNull = await call(base, 'POST', '/emergency-fund-calculator/calculate', { monthly_expenses: 3000, current_savings: 1000, monthly_contribution: 0, job_stability: 'stable' });
  check('emergency-fund-calculator', 'POST /calculate (no contribution → null m2g)', 'CalculateResponse', efNull, (d) =>
    d.months_to_goal === null && d.gap > 0 && d.status === 'critical' ? null : `expected null m2g: ${JSON.stringify({ m: d.months_to_goal, s: d.status })}`);
  const efBad = await call(base, 'POST', '/emergency-fund-calculator/calculate', { monthly_expenses: 3000, job_stability: 'whatever' });
  check('emergency-fund-calculator', 'POST /calculate (bad stability → 400)', 'Error400', efBad, (d) => d.error && d.error.code === 'invalid_request' ? null : 'expected invalid_request');

  // ---- Financial Health Checker ----
  console.log('financial-health-checker:');
  check('financial-health-checker', 'GET /', 'DiscoveryResponse', await call(base, 'GET', '/financial-health-checker/'));
  const hReq = { monthly_income: 6500, monthly_expenses: 4200, monthly_debt_payments: 1500, monthly_savings: 800, liquid_savings: 12000, total_assets: 95000, total_liabilities: 240000 };
  const hs = await call(base, 'POST', '/financial-health-checker/score', hReq);
  check('financial-health-checker', 'POST /score', 'ScoreResponse', hs, (d) =>
    d.health_score >= 0 && d.health_score <= 100 && d.component_scores.solvency === 0 && ['A', 'B', 'C', 'D', 'F'].includes(d.grade) ? null : `score shape: ${JSON.stringify(d.component_scores)}`);
  const hl = await call(base, 'POST', '/financial-health-checker/lookup', hReq);
  check('financial-health-checker', 'POST /lookup', 'LookupResponse', hl, (d) => d.reasoning && d.recommended_actions_priority_order.length > 0 ? null : 'lookup shape');
  // strong profile → grade A, low risk
  const hStrong = await call(base, 'POST', '/financial-health-checker/score', { monthly_income: 10000, monthly_expenses: 4000, monthly_debt_payments: 800, monthly_savings: 3000, liquid_savings: 30000, total_assets: 500000, total_liabilities: 100000 });
  check('financial-health-checker', 'POST /score (strong → A/low)', 'ScoreResponse', hStrong, (d) =>
    d.grade === 'A' && d.risk_level === 'low' && d.health_score >= 90 ? null : `expected A/low: ${d.grade}/${d.risk_level}/${d.health_score}`);
  const hBad = await call(base, 'POST', '/financial-health-checker/score', { monthly_income: 0 });
  check('financial-health-checker', 'POST /score (bad → 400)', 'Error400', hBad, (d) => d.error && d.error.code === 'invalid_request' ? null : 'expected invalid_request');

  // ---- Personal Finance Agent (aggregator) ----
  console.log('personal-finance-agent:');
  check('personal-finance-agent', 'GET /', 'DiscoveryResponse', await call(base, 'GET', '/personal-finance-agent/'));
  const pReq = { monthly_income: 6500, monthly_expenses: 4200, monthly_debt_payments: 1500, monthly_savings: 800, liquid_savings: 12000, total_assets: 95000, total_liabilities: 240000, dependents: 2, job_stability: 'variable', loan: { current_balance: 280000, current_rate: 7.25, current_remaining_months: 324, new_rate: 6.0, new_term_months: 360, closing_costs: 4500 } };
  const pl = await call(base, 'POST', '/personal-finance-agent/lookup', pReq);
  check('personal-finance-agent', 'POST /lookup (with loan)', 'LookupResponse', pl, (d) =>
    d.refinance_summary && d.refinance_summary.worth_it === true && d.action_plan.length >= 1 && d.action_plan[0].priority === 1 && d.top_priority === d.action_plan[0].area ? null : `agg shape: ${JSON.stringify(d.top_priority)}`);
  // without loan → refinance_summary null
  const { loan, ...pNoLoan } = pReq;
  const pl2 = await call(base, 'POST', '/personal-finance-agent/lookup', pNoLoan);
  check('personal-finance-agent', 'POST /lookup (no loan → null refi)', 'LookupResponse', pl2, (d) =>
    d.refinance_summary === null && d.action_plan.every((a) => a.area !== 'refinance') ? null : `expected null refi: ${JSON.stringify(d.refinance_summary)}`);
  const pBadLoan = await call(base, 'POST', '/personal-finance-agent/lookup', { monthly_income: 6500, monthly_expenses: 4200, loan: { current_balance: 1 } });
  check('personal-finance-agent', 'POST /lookup (bad loan → 400)', 'Error400', pBadLoan, (d) => d.error && d.error.code === 'invalid_loan' ? null : 'expected invalid_loan');
  const pBad = await call(base, 'POST', '/personal-finance-agent/lookup', { monthly_income: 6500 });
  check('personal-finance-agent', 'POST /lookup (missing expenses → 400)', 'Error400', pBad, (d) => d.error && d.error.code === 'invalid_request' ? null : 'expected invalid_request');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

const server = app.listen(0, async () => {
  const port = server.address().port;
  try { await run(`http://127.0.0.1:${port}`); }
  catch (e) { console.error(e); process.exit(1); }
  finally { server.close(); }
});
