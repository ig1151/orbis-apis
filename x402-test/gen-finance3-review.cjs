// Builds a single self-contained review file for finance batch 2:
// per-API OpenAPI spec + Orbis listing (from the bundle) + REAL sample
// request/response pairs (captured by mounting the routers), plus the A+ bar.
const fs = require('fs');
const path = require('path');
const express = require('express');

const ROOT = path.join(__dirname, '..');
const bundle = JSON.parse(fs.readFileSync(path.join(ROOT, 'batch-finance3-orbis-listings.json'), 'utf8'));
const listingBySlug = Object.fromEntries(bundle.map(l => [l.baseUrl.split('/').pop(), l]));

const APIS = {
  'credit-score-estimator': { router: require('../dist/routes/credit-score-estimator-api/routes/intelligence').default, spec: require('../dist/routes/credit-score-estimator-api/routes/openapi').spec },
  'insurance-needs-calculator': { router: require('../dist/routes/insurance-needs-calculator-api/routes/intelligence').default, spec: require('../dist/routes/insurance-needs-calculator-api/routes/openapi').spec },
  'loan-affordability-calculator': { router: require('../dist/routes/loan-affordability-calculator-api/routes/intelligence').default, spec: require('../dist/routes/loan-affordability-calculator-api/routes/openapi').spec },
  'rent-vs-buy-calculator': { router: require('../dist/routes/rent-vs-buy-calculator-api/routes/intelligence').default, spec: require('../dist/routes/rent-vs-buy-calculator-api/routes/openapi').spec },
  'dti-calculator': { router: require('../dist/routes/dti-calculator-api/routes/intelligence').default, spec: require('../dist/routes/dti-calculator-api/routes/openapi').spec },
};

const SAMPLES = {
  'credit-score-estimator': [
    ['POST', '/estimate', { on_time_payment_pct: 98, credit_utilization_pct: 22, avg_account_age_years: 6, num_credit_types: 3, hard_inquiries_last_12mo: 1, derogatory_marks: 0 }],
    ['POST', '/lookup', { on_time_payment_pct: 70, credit_utilization_pct: 95, avg_account_age_years: 1, num_credit_types: 1, hard_inquiries_last_12mo: 6, derogatory_marks: 3 }],
    ['POST', '/estimate', { on_time_payment_pct: 150 }],
  ],
  'insurance-needs-calculator': [
    ['POST', '/calculate', { annual_income: 90000, years_income_replacement: 10, non_mortgage_debt: 25000, mortgage_balance: 280000, education_fund_needed: 120000, existing_coverage: 100000, liquid_assets: 50000 }],
    ['POST', '/lookup', { annual_income: 90000, years_income_replacement: 10, non_mortgage_debt: 25000, mortgage_balance: 280000, education_fund_needed: 120000, existing_coverage: 100000, liquid_assets: 50000 }],
    ['POST', '/calculate', { annual_income: 0 }],
  ],
  'loan-affordability-calculator': [
    ['POST', '/calculate', { annual_income: 120000, monthly_debt_payments: 600, down_payment: 60000, annual_rate: 6.5, property_tax_insurance_monthly: 450 }],
    ['POST', '/lookup', { annual_income: 120000, monthly_debt_payments: 600, down_payment: 60000, annual_rate: 6.5, property_tax_insurance_monthly: 450 }],
    ['POST', '/calculate', { annual_income: 60000, monthly_debt_payments: 2000, annual_rate: 6.5 }],
  ],
  'rent-vs-buy-calculator': [
    ['POST', '/compare', { home_price: 450000, down_payment: 90000, annual_rate: 6.5, monthly_rent: 2400, years: 7 }],
    ['POST', '/lookup', { home_price: 450000, down_payment: 90000, annual_rate: 6.5, monthly_rent: 2400, years: 7 }],
    ['POST', '/compare', { home_price: 450000, down_payment: 90000, annual_rate: 6.5, monthly_rent: 2400, years: 7, home_appreciation_pct: 8 }],
  ],
  'dti-calculator': [
    ['POST', '/calculate', { gross_monthly_income: 8000, housing_payment: 2000, other_monthly_debt: 700 }],
    ['POST', '/lookup', { gross_monthly_income: 8000, housing_payment: 2000, other_monthly_debt: 700 }],
    ['POST', '/calculate', { annual_income: 60000, housing_payment: 2000, other_monthly_debt: 1200 }],
  ],
};

const A_PLUS_BAR = 'Grade each finance API A+…F on: (1) correctness of the deterministic math (amortization/FV/compound-interest/ratios); (2) no fabrication — every field derivable from inputs, null where unknown; (3) typed response schema (no bare object), envelope (trace_id/computed_at/success/latency_ms), confidence, recommended_actions_priority_order, chain_to, reasoning on /lookup, financial_disclaimer; (4) x402 endpoint pricing + x-human-approval-required where decisions carry risk; (5) robustness/edge cases (never-payoff, retire<current, no-lever, insolvent). Note any schema that self-rejects (additionalProperties:false on an allOf branch).';

async function main() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  for (const [slug, { router }] of Object.entries(APIS)) app.use('/' + slug, router);
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}`;

  const out = { batch: 'finance-3', a_plus_bar: A_PLUS_BAR, apis: [] };
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
  fs.writeFileSync(path.join(ROOT, 'batch-finance3-specs-for-review.json'), JSON.stringify(out, null, 2));
  console.log('wrote batch-finance3-specs-for-review.json —', out.apis.length, 'APIs,', out.apis.reduce((s, a) => s + a.samples.length, 0), 'sample calls');
}
main();
