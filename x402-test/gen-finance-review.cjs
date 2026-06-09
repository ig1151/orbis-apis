// Builds a single self-contained review file for the finance batch:
// per-API OpenAPI spec + Orbis listing + REAL sample request/response pairs
// (captured by mounting the routers), plus the A+ bar to grade against.
const fs = require('fs');
const path = require('path');
const express = require('express');

const ROOT = path.join(__dirname, '..');
const APIS = [
  { slug: 'refinance-calculator', listing: 'refinance-calculator-listing.json' },
  { slug: 'mortgage-refinance', listing: 'mortgage-refinance-listing.json' },
  { slug: 'emergency-fund-calculator', listing: 'emergency-fund-calculator-listing.json' },
  { slug: 'financial-health-checker', listing: 'financial-health-checker-listing.json' },
  { slug: 'personal-finance-agent', listing: 'personal-finance-agent-listing.json' },
];

// Real sample calls per slug (GET / always added automatically).
const SAMPLES = {
  'refinance-calculator': [
    ['POST', '/calculate', { current_balance: 280000, current_rate: 7.25, current_remaining_months: 324, new_rate: 6.0, new_term_months: 360, closing_costs: 4500 }],
    ['POST', '/lookup', { current_balance: 280000, current_rate: 7.25, current_remaining_months: 324, new_rate: 6.0, new_term_months: 360, closing_costs: 4500 }],
    ['POST', '/calculate', { current_balance: -1, current_rate: 6, current_remaining_months: 120, new_rate: 5, new_term_months: 120 }],
  ],
  'mortgage-refinance': [
    ['POST', '/analyze', { home_value: 480000, current_balance: 360000, current_rate: 7.5, current_remaining_months: 348, new_rate: 6.125, new_term_months: 360, closing_costs: 6000, pmi_monthly: 180 }],
    ['POST', '/lookup', { home_value: 480000, current_balance: 360000, current_rate: 7.5, current_remaining_months: 348, new_rate: 6.125, new_term_months: 360, closing_costs: 6000, pmi_monthly: 180 }],
  ],
  'emergency-fund-calculator': [
    ['POST', '/calculate', { monthly_expenses: 4200, current_savings: 6000, monthly_contribution: 500, dependents: 2, job_stability: 'variable' }],
    ['POST', '/lookup', { monthly_expenses: 4200, current_savings: 6000, monthly_contribution: 500, dependents: 2, job_stability: 'variable' }],
  ],
  'financial-health-checker': [
    ['POST', '/score', { monthly_income: 6500, monthly_expenses: 4200, monthly_debt_payments: 1500, monthly_savings: 800, liquid_savings: 12000, total_assets: 95000, total_liabilities: 240000 }],
    ['POST', '/lookup', { monthly_income: 6500, monthly_expenses: 4200, monthly_debt_payments: 1500, monthly_savings: 800, liquid_savings: 12000, total_assets: 95000, total_liabilities: 240000 }],
  ],
  'personal-finance-agent': [
    ['POST', '/lookup', { monthly_income: 6500, monthly_expenses: 4200, monthly_debt_payments: 1500, monthly_savings: 800, liquid_savings: 12000, total_assets: 95000, total_liabilities: 240000, dependents: 2, job_stability: 'variable', loan: { current_balance: 280000, current_rate: 7.25, current_remaining_months: 324, new_rate: 6.0, new_term_months: 360, closing_costs: 4500 } }],
    ['POST', '/lookup', { monthly_income: 6500, monthly_expenses: 4200, monthly_debt_payments: 1500, monthly_savings: 800, liquid_savings: 12000, total_assets: 95000, total_liabilities: 240000, dependents: 2, job_stability: 'variable' }],
  ],
};

const app = express();
app.use(express.json({ limit: '2mb' }));
const specs = {};
for (const { slug } of APIS) {
  const dir = slug + '-api';
  app.use('/' + slug, require(path.join(ROOT, 'dist/routes', dir, 'routes/intelligence')).default);
  specs[slug] = require(path.join(ROOT, 'dist/routes', dir, 'routes/openapi')).spec;
}

async function call(base, method, p, body) {
  const res = await fetch(`${base}${p}`, { method, headers: { 'content-type': 'application/json' }, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}

const REVIEW = {
  batch: 'finance',
  generated_for: 'ChatGPT A+ review before Orbis listing',
  date: '2026-06-09',
  review_instructions:
    'Grade each API against the A+ agent-native bar and the finance-specific rules below. Flag any schema/response mismatch, missing A+ field, pricing concern, fabrication risk, or correctness bug in the math. Return a letter grade (A+/A/B/...) per API with concrete fixes.',
  aplus_standard: {
    global: [
      'OpenAPI 3.1; x-agent-callable / x-mcp-compatible / x402-compatible / x-agent-marketplace-ready / x-pay-per-call-optimized',
      'ApiKeyAuth (X-API-Key) + global security; root GET / discovery with typed 200',
      'fully-typed 200 schemas (no generic object); typed 400 + 500; endpoint-level x-pricing (USDC)',
      'envelope on every response: trace_id, computed_at, success, latency_ms; confidence_score',
      'reasoning {why_result_generated, key_factors, invalidators}; recommended_actions_priority_order; chain_to [{api,reason}]',
      'privacy {data_stored, retention}; one-call /lookup where useful (x-one-call: true)',
      'Orbis listing JSON with endpointPricing + logoUrl + tags + keywords + tiers + endpoints',
    ],
    finance_rules: [
      'financial_disclaimer on every response',
      'x-human-approval-required when output influences debt/investing/lending/insurance/refinancing',
      'assumptions + sensitivity_analysis where the result is a projection (refinance/mortgage)',
      'risk_level; deterministic real math (no LLM-fabricated numbers) → confidence always 1.0',
    ],
  },
  determinism_note: 'All five APIs compute in real arithmetic (src/routes/_aplus/finance.ts). No LLM calls. Confidence is 1.0 by construction.',
  apis: [],
};

const server = app.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const { slug, listing } of APIS) {
      const sample_calls = [];
      const disc = await call(base, 'GET', `/${slug}/`);
      sample_calls.push({ method: 'GET', path: '/', request: null, status: disc.status, response: disc.body });
      for (const [method, p, body] of SAMPLES[slug]) {
        const r = await call(base, method, `/${slug}${p}`, body);
        sample_calls.push({ method, path: p, request: body, status: r.status, response: r.body });
      }
      REVIEW.apis.push({
        slug,
        listing: JSON.parse(fs.readFileSync(path.join(ROOT, listing), 'utf8')),
        openapi_spec: specs[slug],
        sample_calls,
      });
    }
    fs.writeFileSync(path.join(ROOT, 'batch-finance-specs-for-review.json'), JSON.stringify(REVIEW, null, 2));
    const sz = fs.statSync(path.join(ROOT, 'batch-finance-specs-for-review.json')).size;
    console.log(`wrote batch-finance-specs-for-review.json (${(sz / 1024).toFixed(0)} KB, ${REVIEW.apis.length} APIs, ${REVIEW.apis.reduce((n, a) => n + a.sample_calls.length, 0)} sample calls)`);
  } catch (e) { console.error(e); process.exit(1); }
  finally { server.close(); }
});
