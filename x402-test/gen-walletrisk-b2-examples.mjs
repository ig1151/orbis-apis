// Capture live output for Wallet Risk Pack batch 2 (counterparty-exposure-graph,
// multi-wallet-portfolio-risk-rollup) and write each api's routes/examples.ts.
// Request bodies MUST equal the spec requestExamples (REQ) so the smoke drift-guard's
// live output equals the published responseExample. Start the server on :3939, then run.
import { writeFileSync } from 'node:fs';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';

const CP_REQ = {
  subject: '0xsubject',
  counterparties: [
    { label: 'Binance Hot Wallet', address: '0xbnb', category: 'cex', inflow_usd: 50000, outflow_usd: 20000, tx_count: 42 },
    { label: 'Uniswap Router', address: '0xuni', category: 'defi', inflow_usd: 12000, outflow_usd: 15000, tx_count: 30 },
    { label: 'Tornado Cash', address: '0xtc', category: 'mixer', inflow_usd: 0, outflow_usd: 8000, tx_count: 3 },
    { label: 'Suspicious EOA', address: '0xeoa', inflow_usd: 1000, outflow_usd: 500, tx_count: 5, flagged: true },
  ],
};
const RU_REQ = {
  wallets: [
    { label: 'Treasury', address: '0xtre', value_usd: 250000, risk_score: 15 },
    { label: 'Hot Wallet', address: '0xhot', value_usd: 40000, approval_exposure_score: 65 },
    { label: 'Degen Wallet', address: '0xdeg', value_usd: 12000, risk_score: 80 },
    { label: 'Flagged Wallet', address: '0xflg', value_usd: 5000, flagged: true },
    { label: 'Cold Storage', address: '0xcld', value_usd: 100000 },
  ],
};

const APIS = {
  'counterparty-exposure-graph': {
    analyzeExample: ['/counterparty-exposure-graph/analyze', CP_REQ],
    lookupExample: ['/counterparty-exposure-graph/lookup', CP_REQ],
  },
  'multi-wallet-portfolio-risk-rollup': {
    rollupExample: ['/multi-wallet-portfolio-risk-rollup/rollup', RU_REQ],
    lookupExample: ['/multi-wallet-portfolio-risk-rollup/lookup', RU_REQ],
  },
};

const norm = (o) => ({ ...o, trace_id: 'wrp-1780000000000', request_id: 'wrp-1780000000000', computed_at: '2026-06-19T12:00:00.000Z', latency_ms: 1 });

for (const [slug, exports] of Object.entries(APIS)) {
  let out = '// AUTO-GENERATED from live output by x402-test/gen-walletrisk-b2-examples.mjs — do not hand-edit.\n';
  for (const [name, [path, body]] of Object.entries(exports)) {
    const r = await fetch(`${B}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.success) throw new Error(`${path} returned failure: ${JSON.stringify(j)}`);
    out += `export const ${name}: any = ${JSON.stringify(norm(j), null, 2)};\n`;
  }
  writeFileSync(new URL(`../src/routes/${slug}-api/routes/examples.ts`, import.meta.url), out);
  console.log(`wrote src/routes/${slug}-api/routes/examples.ts`);
}
