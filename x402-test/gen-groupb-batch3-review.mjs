// Assembles the Group B batch 3 ChatGPT review bundle:
// header + grading criteria + shared scaffold + per-API (intelligence.ts,
// openapi.ts, generated OpenAPI spec, live example responses + error cases).
// Request examples are pulled from each endpoint's OpenAPI requestBody example;
// error cases mirror x402-test/smoke-groupb-batch3.mjs.
import { readFileSync, writeFileSync } from 'node:fs';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const ROOT = '/workspaces/orbis-apis';

const SLUGS = ['checksum', 'duration-humanizer', 'html-entities', 'mermaid-validator', 'table-formatter'];

// Extra error / edge calls per API (mirrors the smoke drift-guard).
const ERROR_CALLS = {
  'checksum': [
    ['POST /hash (error: non-string text)', '/hash', { text: 123 }],
    ['POST /verify (error: bad algorithm)', '/verify', { text: 'x', algorithm: 'bogus', expected: 'aa' }],
  ],
  'duration-humanizer': [
    ['POST /humanize (error: non-integer ms)', '/humanize', { milliseconds: 1.5 }],
    ['POST /parse (error: unknown unit)', '/parse', { text: '3 fortnights' }],
  ],
  'html-entities': [
    ['POST /encode (error: bad mode)', '/encode', { text: 'x', mode: 'bogus' }],
    ['POST /decode (error: missing text)', '/decode', {}],
  ],
  'mermaid-validator': [
    ['POST /validate (error: non-string diagram)', '/validate', { diagram: 123 }],
  ],
  'table-formatter': [
    ['POST /markdown (error: rows not array)', '/markdown', { rows: 'nope' }],
    ['POST /ascii (error: array rows w/o columns)', '/ascii', { rows: [['a', 'b']] }],
    ['POST /lookup (error: align length mismatch)', '/lookup', { rows: [{ a: 1 }], align: ['left', 'right'] }],
  ],
};

async function post(path, body) {
  const r = await fetch(B + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
}
async function getSpec(slug) {
  const r = await fetch(`${B}/${slug}/openapi.json`);
  return r.json();
}

let out = '';
const p = (s) => { out += s + '\n'; };

p('# Group B Batch 3 — ChatGPT Review Bundle (Orbis A+ developer/encoding/format tools)');
p('');
p(`Date: 2026-06-17 · batch 3 shipped in PR #54; this bundle reflects the **post-review fix round** · tsc clean · smoke 43/43 green · live-verified on Render`);
p('');
p('Five deterministic, dependency-free, agent-native APIs: **checksum/hash**, **duration-humanizer**, **html-entities**, **mermaid-validator**, **table-formatter**.');
p('');
p('**Fixes applied from the previous review:** (1) checksum `/hash` & `/verify` now reject malformed base64 via a canonical round-trip (matching the existing hex check); (2) the `Hashes` schema uses `patternProperties` so new algorithms need no schema change; (3) discovery now includes `typical_use_cases` + `input_examples` + `output_examples`; (4) Mermaid `confidence_score` is now dynamic — 0.95 for exact delimiter/type errors, 0.85 when the verdict leans on flowchart line-level heuristics, 0.9 for structurally-clean (grammar not fully validated).');
p('');
p('## Please grade each API (A+/A/B/...) on:');
p('1. **Correctness** of the deterministic logic (CRC-32/Adler-32 hand-rolled + MD5/SHA via node:crypto; ms⇄human duration with fixed units only — no calendar months/years; HTML entity encode/decode incl. numeric + curated named map; Mermaid lexical/structural lint — NOT full grammar; GFM + ASCII table rendering with alignment).');
p('2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata side_effects/compute_class; reasoning + capabilities on /lookup).');
p('3. **Honesty** (no fabrication; nothing stored; checksum is integrity not authentication; mermaid validator is lexical/structural not a full parser; heuristic vs exact confidence framed correctly).');
p('4. **OpenAPI 3.1** schema rigor (allOf + unevaluatedProperties:false; typed 200/400/500; x-pricing; request/response examples present).');
p('5. **Agent-usability** (clear field names, actionable recommended_actions, sensible chain_to targets).');
p('Flag any bug, incorrect output, security footgun, or schema/response drift.');
p('');
p('All five are deterministic — **no LLM call anywhere** — built on the shared `src/routes/_aplus/` scaffold (+ `specparts-plus`).');
p('');
p('## Shared A+ scaffold — `src/routes/_aplus/scaffold.ts`');
p('```ts');
p(readFileSync(`${ROOT}/src/routes/_aplus/scaffold.ts`, 'utf8').trimEnd());
p('```');
p('');
p('## Shared A+ helpers — `src/routes/_aplus/util.ts`');
p('```ts');
p(readFileSync(`${ROOT}/src/routes/_aplus/util.ts`, 'utf8').trimEnd());
p('```');
p('');

for (const slug of SLUGS) {
  const spec = await getSpec(slug);
  p('---');
  p('');
  p(`# ${slug}`);
  p('');
  p('## intelligence.ts');
  p('```ts');
  p(readFileSync(`${ROOT}/src/routes/${slug}-api/routes/intelligence.ts`, 'utf8').trimEnd());
  p('```');
  p('');
  p('## openapi.ts');
  p('```ts');
  p(readFileSync(`${ROOT}/src/routes/${slug}-api/routes/openapi.ts`, 'utf8').trimEnd());
  p('```');
  p('');
  p(`## Generated OpenAPI spec (served at GET /${slug}/openapi.json)`);
  p('```json');
  p(JSON.stringify(spec, null, 2));
  p('```');
  p('');
  p('## Live example responses (happy path — replayed from each endpoint\'s published request example)');
  for (const [path, ops] of Object.entries(spec.paths)) {
    const op = ops.post;
    if (!op) continue;
    const reqEx = op.requestBody?.content?.['application/json']?.example;
    if (!reqEx) continue;
    const { status, json } = await post(`/${slug}${path}`, reqEx);
    p(`### POST ${path}`);
    p('Request:');
    p('```json');
    p(JSON.stringify(reqEx, null, 2));
    p('```');
    p(`Response (HTTP ${status}):`);
    p('```json');
    p(JSON.stringify(json, null, 2));
    p('```');
    p('');
  }
  p('## Live error / edge responses');
  for (const [label, path, body] of (ERROR_CALLS[slug] || [])) {
    const { status, json } = await post(`/${slug}${path}`, body);
    p(`### ${label}`);
    p('Request:');
    p('```json');
    p(JSON.stringify(body, null, 2));
    p('```');
    p(`Response (HTTP ${status}):`);
    p('```json');
    p(JSON.stringify(json, null, 2));
    p('```');
    p('');
  }
}

const outPath = `${ROOT}/groupb-batch3-chatgpt-review.md`;
writeFileSync(outPath, out);
console.log('Wrote', outPath, '(' + out.split('\n').length + ' lines)');
