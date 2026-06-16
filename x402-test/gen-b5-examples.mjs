// Generate per-API examples.ts from captured live B5 responses.
// Export name per endpoint = "<path-without-slash>Example" (e.g. /resolve → resolveExample).
import fs from 'node:fs';
const cap = JSON.parse(fs.readFileSync('x402-test/capture-b5-results.json', 'utf8'));
for (const [slug, byPath] of Object.entries(cap)) {
  let body = '// AUTO-GENERATED from live output by x402-test/gen-b5-examples.mjs — do not hand-edit.\n';
  body += '// Regenerate: start the server, run capture-b5.mjs then gen-b5-examples.mjs.\n';
  for (const [path, resp] of Object.entries(byPath)) {
    const name = path.replace('/', '') + 'Example';
    body += `export const ${name} = ${JSON.stringify(resp, null, 2)};\n\n`;
  }
  const file = `src/routes/${slug}-api/routes/examples.ts`;
  fs.writeFileSync(file, body);
  console.log('wrote', file);
}
