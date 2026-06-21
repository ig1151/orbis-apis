// Capture live output for Wallet Risk Pack batch 3 and write each api's routes/examples.ts.
// Request bodies MUST equal the spec requestExamples so the smoke drift-guard's live
// output equals the published responseExample. Start the server on :3939, then run.
import { writeFileSync } from 'node:fs';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';

const TPD_REQ = {
  wallet: '0xsubject',
  structuring_threshold_usd: 10000,
  transactions: [
    { value_usd: 9500, direction: 'in', timestamp: '2026-06-01T10:00:00Z', counterparty: '0xsource' },
    { value_usd: 9200, direction: 'in', timestamp: '2026-06-01T10:05:00Z', counterparty: '0xsource' },
    { value_usd: 9800, direction: 'in', timestamp: '2026-06-01T10:09:00Z', counterparty: '0xsource' },
    { value_usd: 28000, direction: 'out', timestamp: '2026-06-01T10:30:00Z', counterparty: '0xdest' },
    { value_usd: 250, direction: 'out', timestamp: '2026-06-01T11:00:00Z', counterparty: '0xmisc' },
  ],
};

const WFS_REQ = {
  wallet: '0xsubject',
  sources: [
    { label: 'Coinbase', address: '0xcb', category: 'cex', amount_usd: 60000, kyc_level: 'full' },
    { label: 'Uniswap', address: '0xuni', category: 'dex', amount_usd: 18000 },
    { label: 'Tornado Cash', address: '0xtc', category: 'mixer', amount_usd: 9000 },
    { label: 'Unknown EOA', address: '0xeoa', amount_usd: 4000, kyc_level: 'none' },
  ],
};

const PSR_REQ = {
  portfolio: 'treasury',
  holdings: [
    { symbol: 'USDC', issuer: 'Circle', amount_usd: 120000, collateral_type: 'fiat', attestation: 'audited' },
    { symbol: 'USDT', issuer: 'Tether', amount_usd: 60000, collateral_type: 'fiat', attestation: 'attested' },
    { symbol: 'DAI', issuer: 'MakerDAO', amount_usd: 30000, collateral_type: 'crypto', attestation: 'attested' },
    { symbol: 'USTC', issuer: 'Terra', amount_usd: 10000, collateral_type: 'algorithmic', attestation: 'none', current_price: 0.85 },
  ],
};

const PYE_REQ = {
  portfolio: 'defi-book',
  positions: [
    { protocol: 'Aave', type: 'lending', amount_usd: 80000, apy_pct: 4.5, audited: true },
    { protocol: 'Curve', type: 'lp', amount_usd: 40000, apy_pct: 9, is_stable_pair: true, audited: true },
    { protocol: 'Uniswap', type: 'lp', amount_usd: 25000, apy_pct: 22, il_risk: 'high', audited: true },
    { protocol: 'NewFarm', type: 'farm', amount_usd: 15000, apy_pct: 180, reward_token: 'FARM', lockup_days: 30 },
  ],
};

const BTR_REQ = {
  amount_usd: 250000,
  bridge: 'ExampleBridge',
  bridge_type: 'lock_mint',
  source_chain: 'ethereum',
  dest_chain: 'arbitrum',
  dest_liquidity_usd: 2000000,
  bridge_tvl_usd: 40000000,
  audited: true,
};

const APIS = {
  'transaction-pattern-detector': {
    detectExample: ['/transaction-pattern-detector/detect', TPD_REQ],
    lookupExample: ['/transaction-pattern-detector/lookup', TPD_REQ],
  },
  'wallet-funding-source-analyzer': {
    analyzeExample: ['/wallet-funding-source-analyzer/analyze', WFS_REQ],
    lookupExample: ['/wallet-funding-source-analyzer/lookup', WFS_REQ],
  },
  'portfolio-stablecoin-risk': {
    assessExample: ['/portfolio-stablecoin-risk/assess', PSR_REQ],
    lookupExample: ['/portfolio-stablecoin-risk/lookup', PSR_REQ],
  },
  'portfolio-yield-exposure': {
    analyzeExample: ['/portfolio-yield-exposure/analyze', PYE_REQ],
    lookupExample: ['/portfolio-yield-exposure/lookup', PYE_REQ],
  },
  'bridge-transfer-risk': {
    assessExample: ['/bridge-transfer-risk/assess', BTR_REQ],
    lookupExample: ['/bridge-transfer-risk/lookup', BTR_REQ],
  },
};

const norm = (o) => ({ ...o, trace_id: 'wrp-1780000000000', request_id: 'wrp-1780000000000', computed_at: '2026-06-21T12:00:00.000Z', latency_ms: 1 });

for (const [slug, exports] of Object.entries(APIS)) {
  let out = '// AUTO-GENERATED from live output by x402-test/gen-walletrisk-b3-examples.mjs — do not hand-edit.\n';
  for (const [name, [path, body]] of Object.entries(exports)) {
    const r = await fetch(`${B}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.success) throw new Error(`${path} returned failure: ${JSON.stringify(j)}`);
    out += `export const ${name}: any = ${JSON.stringify(norm(j), null, 2)};\n`;
  }
  writeFileSync(new URL(`../src/routes/${slug}-api/routes/examples.ts`, import.meta.url), out);
  console.log(`wrote src/routes/${slug}-api/routes/examples.ts`);
}
