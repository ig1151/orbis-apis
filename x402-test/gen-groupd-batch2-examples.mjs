// Capture live output for the 5 Group D batch-2 quant APIs and write each api's
// routes/examples.ts. Request bodies MUST equal the spec requestExamples so the
// smoke drift-guard's live output equals the published responseExample.
// Start the server on :3939, then run this.
import { writeFileSync } from 'node:fs';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';

const series = [100, 108, 102, 115, 121];
const ddSeries = [100, 120, 90, 95, 130];
const rets = [1.2, -0.8, 2.1, -3.4, 0.5, -1.1, 1.8, -2.2, 0.9, -0.3];

const APIS = {
  'returns-analytics': {
    summaryExample: ['/returns-analytics/summary', { values: series, periods_per_year: 12 }],
    cagrExample: ['/returns-analytics/cagr', { begin_value: 100, end_value: 121, periods: 4, periods_per_year: 12 }],
    lookupExample: ['/returns-analytics/lookup', { values: series, periods_per_year: 12 }],
  },
  'max-drawdown': {
    analyzeExample: ['/max-drawdown/analyze', { values: ddSeries, periods_per_year: 12 }],
    lookupExample: ['/max-drawdown/lookup', { values: ddSeries, periods_per_year: 12 }],
  },
  'value-at-risk': {
    historicalExample: ['/value-at-risk/historical', { returns: rets, confidence: 0.95 }],
    parametricExample: ['/value-at-risk/parametric', { returns: rets, confidence: 0.95 }],
    lookupExample: ['/value-at-risk/lookup', { returns: rets, confidence: 0.95 }],
  },
  'compound-interest': {
    futureValueExample: ['/compound-interest/future-value', { principal: 10000, annual_rate_percent: 6, years: 10, compounds_per_year: 12, contribution: 200 }],
    effectiveRateExample: ['/compound-interest/effective-rate', { nominal_annual_rate_percent: 6, compounds_per_year: 12 }],
    lookupExample: ['/compound-interest/lookup', { principal: 10000, annual_rate_percent: 6, years: 10, compounds_per_year: 12, contribution: 200 }],
  },
  'wacc': {
    waccExample: ['/wacc/wacc', { equity_value: 600000, debt_value: 400000, cost_of_equity_percent: 9, cost_of_debt_percent: 5, tax_rate_percent: 21 }],
    capmExample: ['/wacc/capm', { risk_free_percent: 4, beta: 1.2, market_return_percent: 10 }],
    lookupExample: ['/wacc/lookup', { equity_value: 600000, debt_value: 400000, cost_of_debt_percent: 5, tax_rate_percent: 21, risk_free_percent: 4, beta: 1.2, market_return_percent: 10 }],
  },
};

const norm = (o) => ({ ...o, trace_id: 'gbx-1780000000000', request_id: 'gbx-1780000000000', computed_at: '2026-06-16T12:00:00.000Z', latency_ms: 1 });

for (const [dir, exports] of Object.entries(APIS)) {
  let out = '// AUTO-GENERATED from live output by x402-test/gen-groupd-batch2-examples.mjs — do not hand-edit.\n';
  for (const [name, [path, body]] of Object.entries(exports)) {
    const r = await fetch(`${B}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.success) throw new Error(`${path} returned failure: ${JSON.stringify(j)}`);
    out += `export const ${name} = ${JSON.stringify(norm(j), null, 2)};\n`;
  }
  writeFileSync(new URL(`../src/routes/${dir}-api/routes/examples.ts`, import.meta.url), out);
  console.log(`wrote src/routes/${dir}-api/routes/examples.ts`);
}
