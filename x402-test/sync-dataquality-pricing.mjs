// Syncs Data-Quality batch 1 pricing UP to the Orbis listing prices across BOTH
// price spots in each API (discovery endpoints[]/pricing[] using price_usdc, and
// the spec's priceUsdc that feeds x-pricing). Single-pass regex keyed on the
// captured numeric value, so a target value is never re-applied (handles the
// pipeline 0.006->0.01 / 0.01->0.018 swap safely).
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = '/workspaces/orbis-apis';

// slug -> { oldPrice: newPrice } for that API's price_usdc / priceUsdc fields only.
const CHANGES = {
  'data-drift-detector':           { '0.006': '0.008', '0.01': '0.015' },
  'data-quality-rules':            { '0.005': '0.006', '0.009': '0.012' },
  'data-completeness-checker':     { '0.004': '0.005', '0.008': '0.01' },
  'data-profiler':                 { '0.005': '0.008', '0.009': '0.015' },
  'data-pipeline-quality-scorer':  { '0.006': '0.01', '0.01': '0.018' },
};

const RE = /((?:price_usdc|priceUsdc): )(\d+\.\d+)/g;

for (const [slug, map] of Object.entries(CHANGES)) {
  for (const f of ['intelligence.ts', 'openapi.ts']) {
    const path = `${ROOT}/src/routes/${slug}-api/routes/${f}`;
    const before = readFileSync(path, 'utf8');
    let n = 0;
    const after = before.replace(RE, (m, prefix, val) => {
      if (map[val] !== undefined) { n++; return prefix + map[val]; }
      return m;
    });
    if (after !== before) { writeFileSync(path, after); console.log(`${slug}/${f}: ${n} price field(s) updated`); }
    else console.log(`${slug}/${f}: no change`);
  }
}
