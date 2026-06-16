// Capture live regex-tester output and write routes/examples.ts (smoke drift-guard
// compares published examples against live output, ignoring volatile envelope fields).
// Usage: start the server on :3939, then `node x402-test/gen-regex-examples.mjs`.
import { writeFileSync } from 'node:fs';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const reqs = {
  analyzeExample: ['/regex-tester/analyze', { pattern: '(?<year>\\d{4})-(\\d{2})', flags: '' }],
  testExample: ['/regex-tester/test', { pattern: '(\\w+)@(\\w+)', flags: 'g', inputs: ['ada@dev and grace@io', 'no-email-here'] }],
  lookupExample: ['/regex-tester/lookup', { pattern: '(\\w+)@(\\w+)', flags: 'g', inputs: ['ada@dev and grace@io', 'no-email-here'] }],
};
// Normalize volatile envelope fields to stable placeholders (smoke strips them anyway).
function norm(o) {
  return { ...o, trace_id: 'regx-1780000000000', request_id: 'regx-1780000000000', computed_at: '2026-06-16T12:00:00.000Z', latency_ms: 1 };
}

let out = '// AUTO-GENERATED from live output by x402-test/gen-regex-examples.mjs — do not hand-edit.\n';
out += '// Regenerate: start the server on :3939, then run gen-regex-examples.mjs.\n';
for (const [name, [path, body]] of Object.entries(reqs)) {
  const r = await fetch(`${B}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.success) throw new Error(`${path} returned failure: ${JSON.stringify(j)}`);
  out += `export const ${name} = ${JSON.stringify(norm(j), null, 2)};\n`;
}
writeFileSync(new URL('../src/routes/regex-tester-api/routes/examples.ts', import.meta.url), out);
console.log('wrote src/routes/regex-tester-api/routes/examples.ts');
