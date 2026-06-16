// Capture live output for the 5 Group B batch-2 dev-tools and write each api's
// routes/examples.ts (smoke drift-guard compares published examples vs live output,
// ignoring volatile envelope fields). Start server on :3939, then run this.
import { writeFileSync } from 'node:fs';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';

const book = { store: { book: [{ title: 'A', price: 8 }, { title: 'B', price: 12 }] } };

// api dir → { exportName: [endpointPath, requestBody] }
const APIS = {
  'color-converter': {
    convertExample: ['/color-converter/convert', { color: 'hsl(204, 70%, 53%)' }],
    contrastExample: ['/color-converter/contrast', { foreground: '#777777', background: '#ffffff' }],
    suggestExample: ['/color-converter/suggest-accessible', { foreground: '#9bbcd6', background: '#ffffff', level: 'AA', text_size: 'normal' }],
    lookupExample: ['/color-converter/lookup', { color: 'hsl(204, 70%, 53%)' }],
  },
  'case-converter': {
    convertExample: ['/case-converter/convert', { text: 'XMLHttpRequest', to: 'snake' }],
    detectExample: ['/case-converter/detect', { text: 'user_profile_id' }],
    normalizeKeysExample: ['/case-converter/normalize-keys', { value: { userId: 1, ShippingAddress: { zipCode: '94103', CountryCode: 'US' }, lineItems: [{ ProductId: 'a' }] }, to: 'snake' }],
    lookupExample: ['/case-converter/lookup', { text: 'user_profile_id' }],
  },
  'url-tools': {
    parseExample: ['/url-tools/parse', { url: 'https://user:pw@Example.com:443/a//b?z=2&a=1&a=3#frag' }],
    buildExample: ['/url-tools/build', { protocol: 'https', hostname: 'api.example.com', pathname: '/v1/search', query: { q: 'agent native', page: 2, tag: ['a', 'b'] } }],
    canonicalizeExample: ['/url-tools/canonicalize', { url: 'https://Example.com:443/path?b=2&a=1' }],
    lookupExample: ['/url-tools/lookup', { url: 'https://user:pw@Example.com:443/a//b?z=2&a=1&a=3#frag' }],
  },
  'glob-to-regex': {
    convertExample: ['/glob-to-regex/convert', { glob: 'src/**/*.{ts,tsx}' }],
    testExample: ['/glob-to-regex/test', { glob: 'src/**/*.{ts,tsx}', paths: ['src/index.ts', 'src/routes/a/b.tsx', 'src/x.js', 'README.md'] }],
    lookupExample: ['/glob-to-regex/lookup', { glob: 'src/**/*.{ts,tsx}', paths: ['src/index.ts', 'src/routes/a/b.tsx', 'src/x.js', 'README.md'] }],
  },
  'jsonpath': {
    queryExample: ['/jsonpath/query', { document: book, path: '$.store.book[*].title' }],
    valueExample: ['/jsonpath/value', { document: book, path: '$..book[-1].title' }],
    batchExample: ['/jsonpath/batch', { document: book, paths: ['$.store.book[*].title', '$.store.book[*].price', '$.store.missing'] }],
    lookupExample: ['/jsonpath/lookup', { document: book, path: '$.store.book[*].title' }],
  },
};

const norm = (o) => ({ ...o, trace_id: 'gbx-1780000000000', request_id: 'gbx-1780000000000', computed_at: '2026-06-16T12:00:00.000Z', latency_ms: 1 });

for (const [dir, exports] of Object.entries(APIS)) {
  let out = '// AUTO-GENERATED from live output by x402-test/gen-groupb-devtools-examples.mjs — do not hand-edit.\n';
  for (const [name, [path, body]] of Object.entries(exports)) {
    const r = await fetch(`${B}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.success) throw new Error(`${path} returned failure: ${JSON.stringify(j)}`);
    out += `export const ${name} = ${JSON.stringify(norm(j), null, 2)};\n`;
  }
  writeFileSync(new URL(`../src/routes/${dir}-api/routes/examples.ts`, import.meta.url), out);
  console.log(`wrote src/routes/${dir}-api/routes/examples.ts`);
}
