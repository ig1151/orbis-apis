// Capture live output for the 5 Group D finance APIs and write each api's
// routes/examples.ts. Start server on :3939, then run this.
import { writeFileSync } from 'node:fs';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';

const APIS = {
  'npv-irr': {
    npvExample: ['/npv-irr/npv', { rate: 8, cashflows: [-1000, 300, 400, 500, 300] }],
    irrExample: ['/npv-irr/irr', { cashflows: [-1000, 300, 400, 500, 300] }],
    lookupExample: ['/npv-irr/lookup', { rate: 8, cashflows: [-1000, 300, 400, 500, 300] }],
  },
  'black-scholes': {
    priceExample: ['/black-scholes/price', { spot: 100, strike: 105, time_to_expiry_years: 0.5, volatility: 20, risk_free_rate: 4, dividend_yield: 1, type: 'call' }],
    greeksExample: ['/black-scholes/greeks', { spot: 100, strike: 105, time_to_expiry_years: 0.5, volatility: 20, risk_free_rate: 4, dividend_yield: 1, type: 'call' }],
    lookupExample: ['/black-scholes/lookup', { spot: 100, strike: 105, time_to_expiry_years: 0.5, volatility: 20, risk_free_rate: 4, dividend_yield: 1, type: 'call' }],
  },
  'bond-analytics': {
    priceExample: ['/bond-analytics/price', { face: 1000, coupon_rate: 5, years_to_maturity: 10, frequency: 2, yield_rate: 6 }],
    yieldExample: ['/bond-analytics/yield', { face: 1000, coupon_rate: 5, years_to_maturity: 10, frequency: 2, price: 925.61 }],
    lookupExample: ['/bond-analytics/lookup', { face: 1000, coupon_rate: 5, years_to_maturity: 10, frequency: 2, yield_rate: 6 }],
  },
  'dcf-valuation': {
    valueExample: ['/dcf-valuation/value', { cashflows: [120, 135, 150, 165, 180], discount_rate: 10, terminal_growth_rate: 2.5, net_debt: 200, shares_outstanding: 100 }],
    lookupExample: ['/dcf-valuation/lookup', { cashflows: [120, 135, 150, 165, 180], discount_rate: 10, terminal_growth_rate: 2.5, net_debt: 200, shares_outstanding: 100 }],
  },
  'risk-ratios': {
    sharpeExample: ['/risk-ratios/sharpe', { returns: [2.1, -1.2, 3.4, 0.8, -0.5, 1.9, 2.7, -1.1], risk_free_rate: 0.2, periods_per_year: 12 }],
    sortinoExample: ['/risk-ratios/sortino', { returns: [2.1, -1.2, 3.4, 0.8, -0.5, 1.9, 2.7, -1.1], minimum_acceptable_return: 0, periods_per_year: 12 }],
    lookupExample: ['/risk-ratios/lookup', { returns: [2.1, -1.2, 3.4, 0.8, -0.5, 1.9, 2.7, -1.1], risk_free_rate: 0.2, minimum_acceptable_return: 0, periods_per_year: 12 }],
  },
};

const norm = (o) => ({ ...o, trace_id: 'gdx-1780000000000', request_id: 'gdx-1780000000000', computed_at: '2026-06-16T12:00:00.000Z', latency_ms: 1 });

for (const [dir, exports] of Object.entries(APIS)) {
  let out = '// AUTO-GENERATED from live output by x402-test/gen-groupd-examples.mjs — do not hand-edit.\n';
  for (const [name, [path, body]] of Object.entries(exports)) {
    const r = await fetch(`${B}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.success) throw new Error(`${path} returned failure: ${JSON.stringify(j)}`);
    out += `export const ${name} = ${JSON.stringify(norm(j), null, 2)};\n`;
  }
  writeFileSync(new URL(`../src/routes/${dir}-api/routes/examples.ts`, import.meta.url), out);
  console.log(`wrote src/routes/${dir}-api/routes/examples.ts`);
}
