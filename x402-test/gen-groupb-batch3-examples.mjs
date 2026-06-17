// Capture live output for the 5 Group B batch-3 dev-tools and write each api's
// routes/examples.ts (smoke drift-guard compares published examples vs live output,
// ignoring volatile envelope fields). Start server on :3939, then run this.
import { writeFileSync } from 'node:fs';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';

const tableRows = [{ name: 'Alice', role: 'Engineer', commits: 142 }, { name: 'Bob', role: 'Designer', commits: 37 }];
const mermaid = 'flowchart LR\n  A[Start] --> B{Decision}\n  B -->|yes| C[Ship]\n  B -->|no| A';

// api dir → { exportName: [endpointPath, requestBody] } — request bodies MUST equal the
// spec requestExamples so live output equals the published responseExample.
const APIS = {
  'checksum': {
    hashExample: ['/checksum/hash', { text: 'hello world' }],
    verifyExample: ['/checksum/verify', { text: 'hello world', algorithm: 'sha256', expected: 'B94D27B9934D3E08A52E52D7DA7DABFAC484EFE37A5380EE9088F7ACE2EFCDE9' }],
    lookupExample: ['/checksum/lookup', { text: 'hello world' }],
  },
  'duration-humanizer': {
    humanizeExample: ['/duration-humanizer/humanize', { milliseconds: 93784000 }],
    parseExample: ['/duration-humanizer/parse', { text: '1d 2h 3m 4s' }],
    lookupExample: ['/duration-humanizer/lookup', { milliseconds: 93784000 }],
  },
  'html-entities': {
    encodeExample: ['/html-entities/encode', { text: 'Tom & Jerry <3 "quotes" — café', mode: 'non_ascii' }],
    decodeExample: ['/html-entities/decode', { text: 'Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#8212; caf&#233;' }],
    lookupExample: ['/html-entities/lookup', { text: 'Tom & Jerry <3 "quotes" — café', mode: 'non_ascii' }],
  },
  'mermaid-validator': {
    validateExample: ['/mermaid-validator/validate', { diagram: mermaid }],
    lookupExample: ['/mermaid-validator/lookup', { diagram: mermaid }],
  },
  'table-formatter': {
    markdownExample: ['/table-formatter/markdown', { rows: tableRows, align: ['left', 'left', 'right'] }],
    asciiExample: ['/table-formatter/ascii', { rows: tableRows }],
    lookupExample: ['/table-formatter/lookup', { rows: tableRows, align: ['left', 'left', 'right'] }],
  },
};

const norm = (o) => ({ ...o, trace_id: 'gbx-1780000000000', request_id: 'gbx-1780000000000', computed_at: '2026-06-16T12:00:00.000Z', latency_ms: 1 });

for (const [dir, exports] of Object.entries(APIS)) {
  let out = '// AUTO-GENERATED from live output by x402-test/gen-groupb-batch3-examples.mjs — do not hand-edit.\n';
  for (const [name, [path, body]] of Object.entries(exports)) {
    const r = await fetch(`${B}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.success) throw new Error(`${path} returned failure: ${JSON.stringify(j)}`);
    out += `export const ${name} = ${JSON.stringify(norm(j), null, 2)};\n`;
  }
  writeFileSync(new URL(`../src/routes/${dir}-api/routes/examples.ts`, import.meta.url), out);
  console.log(`wrote src/routes/${dir}-api/routes/examples.ts`);
}
