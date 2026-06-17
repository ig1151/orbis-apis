// Capture live output for the 2 Group B converter APIs and write each api's
// routes/examples.ts. Request bodies MUST equal the spec requestExamples so the
// smoke drift-guard's live output equals the published responseExample.
// Start the server on :3939, then run this.
import { writeFileSync } from 'node:fs';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';

const APIS = {
  'data-format-converter': {
    convertExample: ['/data-format-converter/convert', { data: 'name = "demo"\nport = 8080', from: 'toml', to: 'json' }],
    detectExample: ['/data-format-converter/detect', { data: 'name: demo\nport: 8080' }],
    lookupExample: ['/data-format-converter/lookup', { data: 'name = "demo"\nport = 8080', from: 'toml', to: 'json' }],
  },
  'xml-json-converter': {
    toJsonExample: ['/xml-json-converter/to-json', { xml: '<note id="1"><to>Ada</to><body>Hi</body></note>' }],
    toXmlExample: ['/xml-json-converter/to-xml', { json: { note: { '@_id': '1', to: 'Ada', body: 'Hi' } } }],
    lookupExample: ['/xml-json-converter/lookup', { xml: '<note id="1"><to>Ada</to><body>Hi</body></note>' }],
  },
};

const norm = (o) => ({ ...o, trace_id: 'gbx-1780000000000', request_id: 'gbx-1780000000000', computed_at: '2026-06-16T12:00:00.000Z', latency_ms: 1 });

for (const [dir, exports] of Object.entries(APIS)) {
  let out = '// AUTO-GENERATED from live output by x402-test/gen-groupb-converters-examples.mjs — do not hand-edit.\n';
  for (const [name, [path, body]] of Object.entries(exports)) {
    const r = await fetch(`${B}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.success) throw new Error(`${path} returned failure: ${JSON.stringify(j)}`);
    out += `export const ${name} = ${JSON.stringify(norm(j), null, 2)};\n`;
  }
  writeFileSync(new URL(`../src/routes/${dir}-api/routes/examples.ts`, import.meta.url), out);
  console.log(`wrote src/routes/${dir}-api/routes/examples.ts`);
}
