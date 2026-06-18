// Live-verify the 5 Group D finance APIs against the Render origin directly.
// Hits each endpoint with the canonical example body, asserts success:true,
// and prints the headline numeric result. No wallet/payment — the paywall is
// at the orbisapi.com proxy; Render is the origin and answers directly.
const B = process.env.SMOKE_BASE || 'https://orbis-apis.onrender.com';
const TIMEOUT_MS = 40000;

// path -> body. Bodies mirror x402-test/gen-groupd-examples.mjs.
const CASES = [
  ['/npv-irr/npv',        { rate: 8, cashflows: [-1000, 300, 400, 500, 300] },                                                  j => j.npv],
  ['/npv-irr/irr',        { cashflows: [-1000, 300, 400, 500, 300] },                                                           j => j.irr_percent ?? j.irr],
  ['/npv-irr/lookup',     { rate: 8, cashflows: [-1000, 300, 400, 500, 300] },                                                  j => `npv=${j.npv} irr=${j.irr_percent ?? j.irr}`],
  ['/black-scholes/price',{ spot: 100, strike: 105, time_to_expiry_years: 0.5, volatility: 20, risk_free_rate: 4, dividend_yield: 1, type: 'call' }, j => j.price],
  ['/black-scholes/greeks',{ spot: 100, strike: 105, time_to_expiry_years: 0.5, volatility: 20, risk_free_rate: 4, dividend_yield: 1, type: 'call' }, j => `delta=${j.delta} gamma=${j.gamma}`],
  ['/black-scholes/lookup',{ spot: 100, strike: 105, time_to_expiry_years: 0.5, volatility: 20, risk_free_rate: 4, dividend_yield: 1, type: 'call' }, j => `price=${j.price}`],
  ['/bond-analytics/price',{ face: 1000, coupon_rate: 5, years_to_maturity: 10, frequency: 2, yield_rate: 6 },                  j => j.price],
  ['/bond-analytics/yield',{ face: 1000, coupon_rate: 5, years_to_maturity: 10, frequency: 2, price: 925.61 },                 j => j.yield_percent ?? j.yield],
  ['/bond-analytics/lookup',{ face: 1000, coupon_rate: 5, years_to_maturity: 10, frequency: 2, yield_rate: 6 },                j => `price=${j.price}`],
  ['/dcf-valuation/value',{ cashflows: [120, 135, 150, 165, 180], discount_rate: 10, terminal_growth_rate: 2.5, net_debt: 200, shares_outstanding: 100 }, j => `ev=${j.enterprise_value} per_share=${j.value_per_share}`],
  ['/dcf-valuation/lookup',{ cashflows: [120, 135, 150, 165, 180], discount_rate: 10, terminal_growth_rate: 2.5, net_debt: 200, shares_outstanding: 100 }, j => `ev=${j.enterprise_value}`],
  ['/risk-ratios/sharpe', { returns: [2.1, -1.2, 3.4, 0.8, -0.5, 1.9, 2.7, -1.1], risk_free_rate: 0.2, periods_per_year: 12 }, j => j.sharpe_ratio ?? j.sharpe],
  ['/risk-ratios/sortino',{ returns: [2.1, -1.2, 3.4, 0.8, -0.5, 1.9, 2.7, -1.1], minimum_acceptable_return: 0, periods_per_year: 12 }, j => j.sortino_ratio ?? j.sortino],
  ['/risk-ratios/lookup', { returns: [2.1, -1.2, 3.4, 0.8, -0.5, 1.9, 2.7, -1.1], risk_free_rate: 0.2, minimum_acceptable_return: 0, periods_per_year: 12 }, j => `sharpe=${j.sharpe_ratio ?? j.sharpe}`],
];

let pass = 0, fail = 0;
for (const [path, body, pick] of CASES) {
  const start = Date.now();
  try {
    const r = await fetch(`${B}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Date.now() - start;
    const j = await r.json().catch(() => ({}));
    if (r.status === 200 && j.success === true) {
      pass++;
      console.log(`OK   ${String(ms).padStart(5)}ms  ${path.padEnd(26)} ${pick(j)}`);
    } else {
      fail++;
      console.log(`FAIL ${String(ms).padStart(5)}ms  ${path.padEnd(26)} HTTP ${r.status} ${JSON.stringify(j).slice(0, 160)}`);
    }
  } catch (e) {
    fail++;
    console.log(`ERR        ${path.padEnd(26)} ${e.name === 'TimeoutError' ? 'TIMEOUT' : e.message}`);
  }
}
console.log(`\n=== Group D batch-1 live-verify: ${pass}/${CASES.length} pass, ${fail} fail ===`);
process.exit(fail ? 1 : 0);
