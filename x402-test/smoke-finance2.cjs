// Finance batch 2 validator.
// Mounts each API's router, hits every endpoint with real HTTP, validates each
// response against the published OpenAPI schema (ajv 2020), validates every
// embedded spec responseExample against its schema (drift guard), exercises the
// 400 path, and asserts the deterministic math.
const express = require('express');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'debt-payoff-planner': {
    router: require('../dist/routes/debt-payoff-planner-api/routes/intelligence').default,
    spec: require('../dist/routes/debt-payoff-planner-api/routes/openapi').spec,
  },
  'retirement-planner': {
    router: require('../dist/routes/retirement-planner-api/routes/intelligence').default,
    spec: require('../dist/routes/retirement-planner-api/routes/openapi').spec,
  },
  'savings-goal-optimizer': {
    router: require('../dist/routes/savings-goal-optimizer-api/routes/intelligence').default,
    spec: require('../dist/routes/savings-goal-optimizer-api/routes/openapi').spec,
  },
  'budget-planner': {
    router: require('../dist/routes/budget-planner-api/routes/intelligence').default,
    spec: require('../dist/routes/budget-planner-api/routes/openapi').spec,
  },
  'net-worth-tracker': {
    router: require('../dist/routes/net-worth-tracker-api/routes/intelligence').default,
    spec: require('../dist/routes/net-worth-tracker-api/routes/openapi').spec,
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
    return { ok: v(data), errors: v.errors };
  };
}

let pass = 0, fail = 0;
function check(slug, label, schemaName, data, extra) {
  const { ok, errors } = validators[slug](schemaName, data);
  let extraMsg = '';
  if (ok && extra) { const e = extra(data); if (e) extraMsg = ' — ASSERT FAILED: ' + e; }
  const good = ok && !extraMsg;
  if (good) { pass++; console.log(`  ✓ ${label} → ${schemaName}`); }
  else { fail++; console.log(`  ✗ ${label} → ${schemaName}${extraMsg}`); if (!ok) console.log('    ' + JSON.stringify(errors)); }
}

// Drift guard: every endpoint's embedded responseExample must validate against its own response schema.
function driftGuard(slug) {
  const { spec } = APIS[slug];
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const media = op.responses?.['200']?.content?.['application/json'];
      if (!media?.example) continue;
      const ref = media.schema?.$ref || '';
      const schemaName = ref.split('/').pop();
      check(slug, `spec example ${method.toUpperCase()} ${path}`, schemaName, media.example);
    }
  }
}

async function call(base, method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method, headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

async function run(base) {
  // ---------- debt-payoff-planner ----------
  console.log('debt-payoff-planner:');
  check('debt-payoff-planner', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/debt-payoff-planner/')).json);
  const dReq = { debts: [{ name: 'Credit Card', balance: 6000, apr: 24.99, min_payment: 150 }, { name: 'Medical Bill', balance: 2500, apr: 0, min_payment: 75 }, { name: 'Auto Loan', balance: 15000, apr: 6.9, min_payment: 320 }], extra_monthly_payment: 250 };
  check('debt-payoff-planner', 'POST /plan', 'PlanResponse', (await call(base, 'POST', '/debt-payoff-planner/plan', dReq)).json, d =>
    d.avalanche.total_interest_paid > d.snowball.total_interest_paid ? 'avalanche should not pay more interest than snowball'
    : !(d.interest_saved_vs_minimums > 0) ? 'expected positive interest saved vs minimums'
    : Math.abs(d.avalanche.total_paid - (d.total_debt + d.avalanche.total_interest_paid)) > 0.5 ? 'total_paid != debt + interest'
    : d.recommended_strategy !== 'avalanche' ? 'expected avalanche recommended here'
    : null);
  check('debt-payoff-planner', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/debt-payoff-planner/lookup', dReq)).json, d =>
    d.sensitivity_analysis.length === 4 && d.sensitivity_analysis[3].months_to_debt_free <= d.sensitivity_analysis[0].months_to_debt_free ? null : 'more extra payment should not lengthen payoff');
  const dBad = await call(base, 'POST', '/debt-payoff-planner/plan', { debts: [] });
  check('debt-payoff-planner', 'POST /plan (empty debts -> 400)', 'Error400', dBad.json, () => dBad.status === 400 ? null : `status ${dBad.status}`);
  // never-payoff honesty: min payment below interest, no extra
  const dNever = (await call(base, 'POST', '/debt-payoff-planner/plan', { debts: [{ name: 'CC', balance: 10000, apr: 25, min_payment: 50 }], extra_monthly_payment: 0 })).json;
  check('debt-payoff-planner', 'POST /plan (never payoff)', 'PlanResponse', dNever, d => d.never_payoff === true && d.debt_free_in_months === null ? null : 'expected never_payoff with null months');
  driftGuard('debt-payoff-planner');

  // ---------- retirement-planner ----------
  console.log('retirement-planner:');
  check('retirement-planner', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/retirement-planner/')).json);
  const rReq = { current_age: 35, retirement_age: 65, current_savings: 50000, monthly_contribution: 1000, annual_return_pct: 7, inflation_pct: 3, desired_annual_retirement_income: 60000, current_annual_income: 90000 };
  check('retirement-planner', 'POST /project', 'ProjectResponse', (await call(base, 'POST', '/retirement-planner/project', rReq)).json, d =>
    d.months_to_retirement !== 360 ? 'expected 360 months'
    : d.nest_egg_target_todays_dollars !== 1500000 ? 'nest egg = income/0.04 = 1.5M'
    : !(d.projected_balance > d.total_contributions + 50000) ? 'growth should be positive at 7%'
    : d.on_track !== false ? 'should be behind target here'
    : null);
  check('retirement-planner', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/retirement-planner/lookup', rReq)).json, d =>
    d.sensitivity_analysis.length === 5 && d.required_monthly_contribution_for_target > 1000 ? null : 'required contribution to close gap should exceed current');
  const rBad = await call(base, 'POST', '/retirement-planner/project', { current_age: 70, retirement_age: 65 });
  check('retirement-planner', 'POST /project (retire<current -> 400)', 'Error400', rBad.json, () => rBad.status === 400 ? null : `status ${rBad.status}`);

  // ---------- savings-goal-optimizer ----------
  console.log('savings-goal-optimizer:');
  check('savings-goal-optimizer', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/savings-goal-optimizer/')).json);
  check('savings-goal-optimizer', 'POST /calculate (time)', 'CalculateResponse', (await call(base, 'POST', '/savings-goal-optimizer/calculate', { goal_amount: 30000, current_savings: 5000, monthly_contribution: 800, annual_return_pct: 4 })).json, d =>
    d.mode === 'time_to_goal' && d.months_to_goal === 30 && d.reaches_goal === true ? null : 'expected time_to_goal, 30 months');
  check('savings-goal-optimizer', 'POST /calculate (required)', 'CalculateResponse', (await call(base, 'POST', '/savings-goal-optimizer/calculate', { goal_amount: 30000, current_savings: 5000, target_months: 30, annual_return_pct: 4 })).json, d =>
    d.mode === 'required_contribution' && d.required_monthly_contribution > 700 && d.required_monthly_contribution < 900 ? null : 'required contribution should land near 800');
  check('savings-goal-optimizer', 'POST /lookup (projection)', 'LookupResponse', (await call(base, 'POST', '/savings-goal-optimizer/lookup', { goal_amount: 30000, current_savings: 5000, monthly_contribution: 800, target_months: 24, annual_return_pct: 4 })).json, d =>
    d.mode === 'projection' && typeof d.reaches_goal === 'boolean' && d.projected_balance_at_target !== null ? null : 'projection mode fields missing');
  const sBad = await call(base, 'POST', '/savings-goal-optimizer/calculate', { goal_amount: 30000 });
  check('savings-goal-optimizer', 'POST /calculate (no lever -> 400)', 'Error400', sBad.json, () => sBad.status === 400 ? null : `status ${sBad.status}`);

  // ---------- budget-planner ----------
  console.log('budget-planner:');
  check('budget-planner', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/budget-planner/')).json);
  const bReq = { monthly_income: 6000, expenses: [{ category: 'Rent', amount: 1900, classification: 'need' }, { category: 'Groceries', amount: 600, classification: 'need' }, { category: 'Utilities', amount: 300, classification: 'need' }, { category: 'Dining Out', amount: 500, classification: 'want' }, { category: 'Streaming', amount: 80, classification: 'want' }, { category: '401k', amount: 900, classification: 'savings' }] };
  check('budget-planner', 'POST /analyze (expenses)', 'AnalyzeResponse', (await call(base, 'POST', '/budget-planner/analyze', bReq)).json, d =>
    d.total_needs === 2800 && d.needs_pct === 46.7 && d.status === 'surplus' && d.category_breakdown.length === 6 ? null : 'budget math/breakdown off');
  check('budget-planner', 'POST /analyze (totals)', 'AnalyzeResponse', (await call(base, 'POST', '/budget-planner/analyze', { monthly_income: 5000, needs: 3000, wants: 1500, savings: 800 })).json, d =>
    d.status === 'overspending' && d.unallocated === -300 && d.category_breakdown.length === 0 ? null : 'expected overspending, -300 unallocated, no breakdown');
  check('budget-planner', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/budget-planner/lookup', bReq)).json);
  const bBad = await call(base, 'POST', '/budget-planner/analyze', { monthly_income: 6000 });
  check('budget-planner', 'POST /analyze (no expenses/totals -> 400)', 'Error400', bBad.json, () => bBad.status === 400 ? null : `status ${bBad.status}`);

  // ---------- net-worth-tracker ----------
  console.log('net-worth-tracker:');
  check('net-worth-tracker', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/net-worth-tracker/')).json);
  const nReq = { assets: [{ name: 'Checking', value: 12000, type: 'liquid' }, { name: 'Brokerage', value: 65000, type: 'investment' }, { name: '401k', value: 140000, type: 'retirement' }, { name: 'Home', value: 420000, type: 'real_estate' }], liabilities: [{ name: 'Mortgage', balance: 310000, type: 'mortgage' }, { name: 'Auto Loan', balance: 14000, type: 'auto' }], age: 40, annual_income: 95000 };
  check('net-worth-tracker', 'POST /calculate', 'CalculateResponse', (await call(base, 'POST', '/net-worth-tracker/calculate', nReq)).json, d =>
    d.net_worth === 313000 && d.liquid_assets === 77000 && d.prosperity_tier === 'average_accumulator' && Math.abs(d.debt_to_asset_ratio - 0.5086) < 0.001 ? null : 'net worth math off');
  check('net-worth-tracker', 'POST /calculate (totals, no benchmark)', 'CalculateResponse', (await call(base, 'POST', '/net-worth-tracker/calculate', { total_assets: 50000, total_liabilities: 80000 })).json, d =>
    d.net_worth === -30000 && d.solvent === false && d.prosperity_tier === null && d.liquid_assets === null ? null : 'expected insolvent, null tier/liquid');
  check('net-worth-tracker', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/net-worth-tracker/lookup', nReq)).json);
  const nBad = await call(base, 'POST', '/net-worth-tracker/calculate', { liabilities: [{ name: 'CC', balance: 1000 }] });
  check('net-worth-tracker', 'POST /calculate (no assets -> 400)', 'Error400', nBad.json, () => nBad.status === 400 ? null : `status ${nBad.status}`);
  driftGuard('net-worth-tracker');

  // drift guards for the remaining specs
  console.log('drift guards:');
  driftGuard('retirement-planner');
  driftGuard('savings-goal-optimizer');
  driftGuard('budget-planner');

  console.log(`\n${pass}/${pass + fail} checks passed`);
  process.exit(fail ? 1 : 0);
}

const srv = app.listen(0, () => run(`http://127.0.0.1:${srv.address().port}`));
