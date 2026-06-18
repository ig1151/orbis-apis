// Capture live output for the 5 Group D batch-3 quant APIs and write each api's
// routes/examples.ts. Request bodies MUST equal the spec requestExamples so the
// smoke drift-guard's live output equals the published responseExample.
// Start the server on :3939, then run this.
import { writeFileSync } from 'node:fs';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';

const APIS = {
  'break-even': {
    unitsExample: ['/break-even/units', { fixed_costs: 50000, price_per_unit: 40, variable_cost_per_unit: 25, target_profit: 20000, current_units: 5000 }],
    revenueExample: ['/break-even/revenue', { fixed_costs: 50000, contribution_margin_ratio: 0.375, current_revenue: 200000 }],
    lookupExample: ['/break-even/lookup', { fixed_costs: 50000, price_per_unit: 40, variable_cost_per_unit: 25, target_profit: 20000, current_units: 5000 }],
  },
  'correlation-beta': {
    correlationExample: ['/correlation-beta/correlation', { series_a: [1.2, -0.8, 2.1, -3.4, 0.5], series_b: [0.9, -0.5, 1.7, -2.9, 0.2] }],
    betaExample: ['/correlation-beta/beta', { asset_returns: [1.2, -0.8, 2.1, -3.4, 0.5], benchmark_returns: [0.9, -0.5, 1.7, -2.9, 0.2], periods_per_year: 252 }],
    lookupExample: ['/correlation-beta/lookup', { asset_returns: [1.2, -0.8, 2.1, -3.4, 0.5], benchmark_returns: [0.9, -0.5, 1.7, -2.9, 0.2], periods_per_year: 252 }],
  },
  'kelly-criterion': {
    kellyExample: ['/kelly-criterion/kelly', { win_probability: 0.55, win_payoff: 1, kelly_multiplier: 0.5, bankroll: 10000 }],
    ruinExample: ['/kelly-criterion/risk-of-ruin', { win_probability: 0.55, bankroll_units: 20 }],
    lookupExample: ['/kelly-criterion/lookup', { win_probability: 0.55, win_payoff: 1, kelly_multiplier: 0.5, bankroll: 10000 }],
  },
  'payback-period': {
    simpleExample: ['/payback-period/simple', { initial_investment: 100000, cashflows: [30000, 30000, 30000, 30000, 30000], periods_per_year: 1 }],
    discountedExample: ['/payback-period/discounted', { initial_investment: 100000, cashflows: [30000, 30000, 30000, 30000, 30000], discount_rate_percent: 10, periods_per_year: 1 }],
    lookupExample: ['/payback-period/lookup', { initial_investment: 100000, cashflows: [30000, 30000, 30000, 30000, 30000], discount_rate_percent: 10, periods_per_year: 1 }],
  },
  'unit-economics': {
    ltvCacExample: ['/unit-economics/ltv-cac', { arpu: 100, gross_margin_percent: 80, cac: 400, monthly_churn_rate: 0.05 }],
    marginsExample: ['/unit-economics/margins', { revenue: 100000, cogs: 30000, variable_costs: 15000 }],
    lookupExample: ['/unit-economics/lookup', { arpu: 100, gross_margin_percent: 80, cac: 400, monthly_churn_rate: 0.05 }],
  },
};

const norm = (o) => ({ ...o, trace_id: 'gbx-1780000000000', request_id: 'gbx-1780000000000', computed_at: '2026-06-16T12:00:00.000Z', latency_ms: 1 });

for (const [slug, exports] of Object.entries(APIS)) {
  let out = '// AUTO-GENERATED from live output by x402-test/gen-groupd-batch3-examples.mjs — do not hand-edit.\n';
  for (const [name, [path, body]] of Object.entries(exports)) {
    const r = await fetch(`${B}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.success) throw new Error(`${path} returned failure: ${JSON.stringify(j)}`);
    out += `export const ${name}: any = ${JSON.stringify(norm(j), null, 2)};\n`;
  }
  writeFileSync(new URL(`../src/routes/${slug}-api/routes/examples.ts`, import.meta.url), out);
  console.log(`wrote src/routes/${slug}-api/routes/examples.ts`);
}
