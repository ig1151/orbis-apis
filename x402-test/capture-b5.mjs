// Capture live B5 responses (normalized envelope) for the OpenAPI examples.
// Run against the local dev server (PORT=3939).
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:3939';

export const APIS = [
  {
    slug: 'json-pointer', prefix: 'jptr',
    calls: [
      ['/resolve', { document: { user: { name: 'Ada', roles: ['admin', 'editor'], 'a/b': 1 }, items: [10, 20], active: null }, pointers: ['/user/name', '/user/roles/0', '/user/a~1b', '/items/1', '/active', '/user/missing', '/items/5'] }],
      ['/enumerate', { document: { user: { name: 'Ada', active: true }, tags: ['x', 'y'], meta: {} } }],
      ['/lookup', { document: { user: { name: 'Ada', roles: ['admin', 'editor'], 'a/b': 1 }, items: [10, 20], active: null }, pointers: ['/user/name', '/user/roles/0', '/user/a~1b', '/items/1', '/active', '/user/missing', '/items/5'] }],
    ],
  },
  {
    slug: 'json-patch', prefix: 'jpat',
    calls: [
      ['/apply', { document: { name: 'Ada', roles: ['admin'], age: 30 }, patch: [{ op: 'add', path: '/roles/-', value: 'editor' }, { op: 'replace', path: '/age', value: 31 }, { op: 'test', path: '/roles/0', value: 'admin' }, { op: 'remove', path: '/name' }] }],
      ['/diff', { from: { a: 1, b: [1, 2], c: 'x' }, to: { a: 2, b: [1, 2, 3], d: true } }],
      ['/lookup', { document: { name: 'Ada', roles: ['admin'], age: 30 }, patch: [{ op: 'add', path: '/roles/-', value: 'editor' }, { op: 'replace', path: '/age', value: 31 }, { op: 'test', path: '/roles/0', value: 'admin' }, { op: 'remove', path: '/name' }] }],
    ],
  },
  {
    slug: 'sensitive-data-detector', prefix: 'sdd',
    calls: [
      ['/scan', { text: 'Contact Ada at ada@example.com or (555) 123-4567. SSN 123-45-6789, card 4111 1111 1111 1111, host 192.168.1.1.' }],
      ['/lookup', { text: 'Contact Ada at ada@example.com or (555) 123-4567. SSN 123-45-6789, card 4111 1111 1111 1111, host 192.168.1.1.' }],
    ],
  },
  {
    slug: 'data-encryption-advisor', prefix: 'dea',
    calls: [
      ['/advise', { data_categories: ['pii', 'pci', 'credentials'], regulatory: ['gdpr', 'pci-dss'], environment: 'cloud' }],
      ['/lookup', { data_categories: ['pii', 'pci', 'credentials'], regulatory: ['gdpr', 'pci-dss'], environment: 'cloud' }],
    ],
  },
  {
    slug: 'jwt-claims-designer', prefix: 'jcd',
    calls: [
      ['/design', { token_type: 'access', issuer: 'https://auth.example.com', audience: ['https://api.example.com'], subject_type: 'user', scopes: ['read:orders', 'write:orders'], ttl_seconds: 900, algorithm: 'HS256' }],
      ['/lookup', { token_type: 'access', issuer: 'https://auth.example.com', audience: ['https://api.example.com'], subject_type: 'user', scopes: ['read:orders', 'write:orders'], ttl_seconds: 900, algorithm: 'HS256' }],
    ],
  },
];

function normalize(obj, prefix) {
  const id = `${prefix}-1780000000000`;
  return { ...obj, trace_id: id, request_id: id, computed_at: '2026-06-16T12:00:00.000Z', latency_ms: 1 };
}
async function post(slug, path, body) {
  const r = await fetch(`${BASE}/${slug}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = {};
  for (const a of APIS) {
    out[a.slug] = {};
    for (const [path, body] of a.calls) {
      const { status, json } = await post(a.slug, path, body);
      if (status !== 200) { console.error(`FAIL ${a.slug}${path}: ${status}`, JSON.stringify(json).slice(0, 300)); process.exit(1); }
      out[a.slug][path] = normalize(json, a.prefix);
    }
  }
  fs.writeFileSync('x402-test/capture-b5-results.json', JSON.stringify(out, null, 2));
  console.log('captured', APIS.map((a) => a.slug).join(', '));
}
