// Builds a single self-contained review file for finance batch 2:
// per-API OpenAPI spec + Orbis listing (from the bundle) + REAL sample
// request/response pairs (captured by mounting the routers), plus the A+ bar.
const fs = require('fs');
const path = require('path');
const express = require('express');

const ROOT = path.join(__dirname, '..');
const bundle = JSON.parse(fs.readFileSync(path.join(ROOT, 'batch-finance2-orbis-listings.json'), 'utf8'));
const listingBySlug = Object.fromEntries(bundle.map(l => [l.baseUrl.split('/').pop(), l]));

const APIS = {
  'debt-payoff-planner': { router: require('../dist/routes/debt-payoff-planner-api/routes/intelligence').default, spec: require('../dist/routes/debt-payoff-planner-api/routes/openapi').spec },
  'retirement-planner': { router: require('../dist/routes/retirement-planner-api/routes/intelligence').default, spec: require('../dist/routes/retirement-planner-api/routes/openapi').spec },
  'savings-goal-optimizer': { router: require('../dist/routes/savings-goal-optimizer-api/routes/intelligence').default, spec: require('../dist/routes/savings-goal-optimizer-api/routes/openapi').spec },
  'budget-planner': { router: require('../dist/routes/budget-planner-api/routes/intelligence').default, spec: require('../dist/routes/budget-planner-api/routes/openapi').spec },
  'net-worth-tracker': { router: require('../dist/routes/net-worth-tracker-api/routes/intelligence').default, spec: require('../dist/routes/net-worth-tracker-api/routes/openapi').spec },
};

const SAMPLES = {
  'debt-payoff-planner': [
    ['POST', '/plan', { debts: [{ name: 'Credit Card', balance: 6000, apr: 24.99, min_payment: 150 }, { name: 'Medical Bill', balance: 2500, apr: 0, min_payment: 75 }, { name: 'Auto Loan', balance: 15000, apr: 6.9, min_payment: 320 }], extra_monthly_payment: 250 }],
    ['POST', '/lookup', { debts: [{ name: 'Credit Card', balance: 6000, apr: 24.99, min_payment: 150 }, { name: 'Medical Bill', balance: 2500, apr: 0, min_payment: 75 }, { name: 'Auto Loan', balance: 15000, apr: 6.9, min_payment: 320 }], extra_monthly_payment: 250 }],
    ['POST', '/plan', { debts: [] }],
  ],
  'retirement-planner': [
    ['POST', '/project', { current_age: 35, retirement_age: 65, current_savings: 50000, monthly_contribution: 1000, annual_return_pct: 7, inflation_pct: 3, desired_annual_retirement_income: 60000, current_annual_income: 90000 }],
    ['POST', '/lookup', { current_age: 35, retirement_age: 65, current_savings: 50000, monthly_contribution: 1000, annual_return_pct: 7, inflation_pct: 3, desired_annual_retirement_income: 60000, current_annual_income: 90000 }],
    ['POST', '/project', { current_age: 70, retirement_age: 65 }],
  ],
  'savings-goal-optimizer': [
    ['POST', '/calculate', { goal_amount: 30000, current_savings: 5000, monthly_contribution: 800, annual_return_pct: 4 }],
    ['POST', '/calculate', { goal_amount: 30000, current_savings: 5000, target_months: 30, annual_return_pct: 4 }],
    ['POST', '/lookup', { goal_amount: 30000, current_savings: 5000, monthly_contribution: 800, target_months: 24, annual_return_pct: 4 }],
  ],
  'budget-planner': [
    ['POST', '/analyze', { monthly_income: 6000, expenses: [{ category: 'Rent', amount: 1900, classification: 'need' }, { category: 'Dining Out', amount: 500, classification: 'want' }, { category: '401k', amount: 900, classification: 'savings' }] }],
    ['POST', '/analyze', { monthly_income: 5000, needs: 3000, wants: 1500, savings: 800 }],
    ['POST', '/lookup', { monthly_income: 6000, expenses: [{ category: 'Rent', amount: 1900, classification: 'need' }, { category: 'Dining Out', amount: 500, classification: 'want' }, { category: '401k', amount: 900, classification: 'savings' }] }],
  ],
  'net-worth-tracker': [
    ['POST', '/calculate', { assets: [{ name: 'Checking', value: 12000, type: 'liquid' }, { name: 'Brokerage', value: 65000, type: 'investment' }, { name: 'Home', value: 420000, type: 'real_estate' }], liabilities: [{ name: 'Mortgage', balance: 310000, type: 'mortgage' }], age: 40, annual_income: 95000 }],
    ['POST', '/calculate', { total_assets: 50000, total_liabilities: 80000 }],
    ['POST', '/lookup', { assets: [{ name: 'Checking', value: 12000, type: 'liquid' }, { name: 'Brokerage', value: 65000, type: 'investment' }, { name: 'Home', value: 420000, type: 'real_estate' }], liabilities: [{ name: 'Mortgage', balance: 310000, type: 'mortgage' }], age: 40, annual_income: 95000 }],
  ],
};

const A_PLUS_BAR = 'Grade each finance API A+…F on: (1) correctness of the deterministic math (amortization/FV/compound-interest/ratios); (2) no fabrication — every field derivable from inputs, null where unknown; (3) typed response schema (no bare object), envelope (trace_id/computed_at/success/latency_ms), confidence, recommended_actions_priority_order, chain_to, reasoning on /lookup, financial_disclaimer; (4) x402 endpoint pricing + x-human-approval-required where decisions carry risk; (5) robustness/edge cases (never-payoff, retire<current, no-lever, insolvent). Note any schema that self-rejects (additionalProperties:false on an allOf branch).';

async function main() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  for (const [slug, { router }] of Object.entries(APIS)) app.use('/' + slug, router);
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}`;

  const out = { batch: 'finance-2', a_plus_bar: A_PLUS_BAR, apis: [] };
  for (const [slug, { spec }] of Object.entries(APIS)) {
    const calls = [['GET', '/', undefined], ...(SAMPLES[slug] || [])];
    const samples = [];
    for (const [method, p, body] of calls) {
      const res = await fetch(`${base}/${slug}${p}`, { method, headers: { 'content-type': 'application/json' }, body: body !== undefined ? JSON.stringify(body) : undefined });
      samples.push({ method, path: p, request: body ?? null, status: res.status, response: await res.json() });
    }
    out.apis.push({ slug, listing: listingBySlug[slug] || null, openapi: spec, samples });
  }
  srv.close();
  fs.writeFileSync(path.join(ROOT, 'batch-finance2-specs-for-review.json'), JSON.stringify(out, null, 2));
  console.log('wrote batch-finance2-specs-for-review.json —', out.apis.length, 'APIs,', out.apis.reduce((s, a) => s + a.samples.length, 0), 'sample calls');
}
main();
