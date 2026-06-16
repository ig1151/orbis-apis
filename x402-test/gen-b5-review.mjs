// Assembles the batch 5 ChatGPT review bundle: header + grading criteria + shared
// scaffold (incl. jsonptr.ts) + per-API (intelligence.ts, openapi.ts, generated
// OpenAPI spec, live responses incl. edge cases + error paths).
import { readFileSync, writeFileSync } from 'node:fs';
const B = 'http://localhost:3939';
const ROOT = '/workspaces/orbis-apis';

const APIS = [
  {
    slug: 'json-pointer', title: 'json-pointer',
    calls: [
      ['POST /resolve (found + escaped ~1 + null value + missing + out-of-bounds)', '/resolve', { document: { user: { name: 'Ada', roles: ['admin', 'editor'], 'a/b': 1 }, items: [10, 20], active: null }, pointers: ['/user/name', '/user/roles/0', '/user/a~1b', '/items/1', '/active', '/user/missing', '/items/5'] }],
      ['POST /enumerate (nested + empty object/array leaves)', '/enumerate', { document: { user: { name: 'Ada', active: true }, tags: ['x', 'y'], meta: {}, empties: [] } }],
      ['POST /lookup (resolve + reasoning)', '/lookup', { document: { a: { b: [1, 2] } }, pointer: '/a/b/1' }],
      ['POST /resolve (error: no pointer/pointers)', '/resolve', { document: { a: 1 } }],
    ],
  },
  {
    slug: 'json-patch', title: 'json-patch',
    calls: [
      ['POST /apply (add append + replace + passing test + remove)', '/apply', { document: { name: 'Ada', roles: ['admin'], age: 30 }, patch: [{ op: 'add', path: '/roles/-', value: 'editor' }, { op: 'replace', path: '/age', value: 31 }, { op: 'test', path: '/roles/0', value: 'admin' }, { op: 'remove', path: '/name' }] }],
      ['POST /apply (atomic: failing test rejects whole patch, no document)', '/apply', { document: { a: 1 }, patch: [{ op: 'test', path: '/a', value: 2 }, { op: 'add', path: '/b', value: 9 }] }],
      ['POST /apply (move into own subtree rejected)', '/apply', { document: { a: { b: 1 } }, patch: [{ op: 'move', from: '/a', path: '/a/b' }] }],
      ['POST /diff (generate patch from→to; round-trippable)', '/diff', { from: { a: 1, b: [1, 2], c: 'x' }, to: { a: 2, b: [1, 2, 3], d: true } }],
      ['POST /apply (error: patch not an array)', '/apply', { document: {}, patch: 'nope' }],
    ],
  },
  {
    slug: 'sensitive-data-detector', title: 'sensitive-data-detector',
    calls: [
      ['POST /scan (email/phone/SSN/Luhn-card/IPv4 + redaction + risk high)', '/scan', { text: 'Contact Ada at ada@example.com or (555) 123-4567. SSN 123-45-6789, card 4111 1111 1111 1111, host 192.168.1.1.' }],
      ['POST /scan (types filter + mask_style=stars; non-Luhn 16-digit NOT flagged)', '/scan', { text: 'card 1234 5678 9012 3456 and email x@y.io', types: ['email', 'credit_card'], mask_style: 'stars' }],
      ['POST /lookup (scan + reasoning)', '/lookup', { text: 'no PII here, just text.' }],
      ['POST /scan (error: missing text)', '/scan', {}],
    ],
  },
  {
    slug: 'data-encryption-advisor', title: 'data-encryption-advisor',
    calls: [
      ['POST /advise (pii+pci+credentials → restricted; credentials→hashing)', '/advise', { data_categories: ['pii', 'pci', 'credentials'], regulatory: ['gdpr', 'pci-dss'], environment: 'cloud' }],
      ['POST /advise (general only → internal, on_prem)', '/advise', { data_categories: ['general'], environment: 'on_prem' }],
      ['POST /lookup (advice + reasoning)', '/lookup', { data_categories: ['phi'], regulatory: ['hipaa'] }],
      ['POST /advise (error: empty data_categories)', '/advise', { data_categories: [] }],
    ],
  },
  {
    slug: 'jwt-claims-designer', title: 'jwt-claims-designer',
    calls: [
      ['POST /design (access token, HS256 → shared-secret warning)', '/design', { token_type: 'access', issuer: 'https://auth.example.com', audience: ['https://api.example.com'], scopes: ['read:orders', 'write:orders'], ttl_seconds: 900, algorithm: 'HS256' }],
      ['POST /design (refresh token → jti required, minimal claims)', '/design', { token_type: 'refresh', issuer: 'https://auth.example.com', audience: 'https://auth.example.com', subject_type: 'service' }],
      ['POST /lookup (id token + reasoning)', '/lookup', { token_type: 'id', issuer: 'https://auth.example.com', audience: ['client-1', 'client-2'] }],
      ['POST /design (error: missing audience)', '/design', { token_type: 'access', issuer: 'https://auth.example.com' }],
    ],
  },
];

async function post(path, body) { const r = await fetch(B + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json() }; }
async function getSpec(slug) { return (await fetch(`${B}/${slug}/openapi.json`)).json(); }

let out = '';
const p = (s) => { out += s + '\n'; };

p('# Batch 5 — ChatGPT Review Bundle (Orbis A+ security + JSON dev-tools)');
p('');
p('Date: 2026-06-16 · branch aplus/batch5-security-devtools · tsc clean · smoke 34/34 green');
p('');
p('5 deterministic, STATELESS APIs (input → computed output, nothing fetched, nothing stored, **no LLM anywhere**). Built on the shared `src/routes/_aplus/` scaffold; the two JSON tools share `src/routes/_aplus/jsonptr.ts` (RFC 6901 primitives).');
p('');
p('- **json-pointer** — RFC 6901 evaluator: resolve one/many pointers (with ~0/~1 unescaping, array-index rules, null-vs-missing) + enumerate all leaf pointers.');
p('- **json-patch** — RFC 6902 engine: atomic /apply (add/remove/replace/move/copy/test, operates on a clone) + /diff (from→to, round-trippable).');
p('- **sensitive-data-detector** — deterministic PII: regex for email/SSN/phone/IPv4/IPv6 + Luhn-validated credit cards → spans, counts, redacted text, risk level. (Distinct from the LLM-based pii-detection-api — this one is 100% deterministic.)');
p('- **data-encryption-advisor** — rule-based rubric: data categories + regulatory + environment → classification, at-rest/in-transit/field-level/key-management guidance + compliance notes.');
p('- **jwt-claims-designer** — generates a recommended registered+custom claim set, TTLs, example payload, signing-alg advice. (Distinct from jwt-decoder which decodes, and jwt-claim-policy-validator which validates — this GENERATES a design.)');
p('');
p('## Please grade each API (A+/A/B/...) on:');
p('1. **Correctness** — pointer resolution & enumeration (RFC 6901 edge cases); patch apply atomicity + move/copy/test semantics + diff round-trip (RFC 6902); PII regex/Luhn precision & overlap handling & redaction; encryption rubric mapping (esp. credentials→hashing not encryption); JWT claim choices, TTLs, alg advice.');
p('2. **A+ envelope** — trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata; reasoning on /lookup.');
p('3. **Honesty / confidence calibration** — exact computation reports 1; heuristics report <1 with invalidators (PII detection classification 0.8 / risk 0.7; advisor & designer recommendations 0.8). Flag any over-claim.');
p('4. **OpenAPI 3.1 rigor** — allOf + unevaluatedProperties:false, typed 200/400/500, closed objects (no bare `{type:object}` except the typed CellValue map), x-pricing, requestExample replays == responseExample.');
p('5. **Agent-usability & security soundness** — actionable outputs, sensible chain_to, and (critically) no insecure advice. Flag anything dangerous: weak crypto defaults, reversible-encryption-for-credentials, ReDoS, alg:none acceptance, PII echoed unsafely, etc.');
p('');
for (const f of ['scaffold.ts', 'util.ts', 'specparts.ts', 'jsonptr.ts']) {
  p(`## Shared — \`src/routes/_aplus/${f}\``);
  p('```ts'); p(readFileSync(`${ROOT}/src/routes/_aplus/${f}`, 'utf8').trimEnd()); p('```'); p('');
}
for (const api of APIS) {
  p('---'); p('');
  p(`# ${api.title}`); p('');
  p('## intelligence.ts');
  p('```ts'); p(readFileSync(`${ROOT}/src/routes/${api.slug}-api/routes/intelligence.ts`, 'utf8').trimEnd()); p('```'); p('');
  p('## openapi.ts');
  p('```ts'); p(readFileSync(`${ROOT}/src/routes/${api.slug}-api/routes/openapi.ts`, 'utf8').trimEnd()); p('```'); p('');
  p(`## Generated OpenAPI spec (GET /${api.slug}/openapi.json)`);
  p('```json'); p(JSON.stringify(await getSpec(api.slug), null, 2)); p('```'); p('');
  p('## Live example responses');
  for (const [label, path, body] of api.calls) {
    const { status, json } = await post(`/${api.slug}${path}`, body);
    p(`### ${label}`);
    p('Request:'); p('```json'); p(JSON.stringify(body, null, 2)); p('```');
    p(`Response (HTTP ${status}):`); p('```json'); p(JSON.stringify(json, null, 2)); p('```'); p('');
  }
}
const path = `${ROOT}/batch5-chatgpt-review.md`;
writeFileSync(path, out);
console.log('Wrote', path, '(' + out.split('\n').length + ' lines)');
