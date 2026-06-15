// Generate per-API examples.ts files from the captured live B4 responses, so the
// OpenAPI response examples are byte-for-byte the real output (drift-guarded by smoke).
import fs from 'node:fs';
const cap = JSON.parse(fs.readFileSync('x402-test/capture-b4-results.json', 'utf8'));
const MAIN = { 'website-structure-mapper': 'map', 'scraper-test-suite': 'run', 'scraped-data-quality-scorer': 'score' };
for (const [slug, mainName] of Object.entries(MAIN)) {
  const { main, lookup } = cap[slug];
  const body = `// AUTO-GENERATED from live output by x402-test/gen-b4-examples.mjs — do not hand-edit.\n` +
    `// Regenerate after changing the route: start the server, run capture-b4.mjs then gen-b4-examples.mjs.\n` +
    `export const ${mainName}Example = ${JSON.stringify(main, null, 2)};\n\n` +
    `export const lookupExample = ${JSON.stringify(lookup, null, 2)};\n`;
  const path = `src/routes/${slug}-api/routes/examples.ts`;
  fs.writeFileSync(path, body);
  console.log('wrote', path);
}
