// Assembles the Group B converters ChatGPT review bundle:
// header + grading criteria + shared scaffold + per-API (intelligence.ts,
// openapi.ts, generated OpenAPI spec, live happy/error responses).
import { readFileSync, writeFileSync } from 'node:fs';

const B = process.env.SMOKE_BASE || 'http://localhost:3939';
const ROOT = '/workspaces/orbis-apis';
const SLUGS = ['data-format-converter', 'xml-json-converter'];

const ERROR_CALLS = {
  'data-format-converter': [
    ['POST /convert (error: malformed JSON)', '/convert', { data: '{bad json', from: 'json', to: 'yaml' }],
    ['POST /convert (error: array → toml unsupported)', '/convert', { data: '[1,2,3]', from: 'json', to: 'toml' }],
    ['POST /detect (error: non-string data)', '/detect', { data: 123 }],
  ],
  'xml-json-converter': [
    ['POST /to-json (error: malformed XML)', '/to-json', { xml: '<a><b></a>' }],
    ['POST /to-xml (error: array top-level)', '/to-xml', { json: [1, 2, 3] }],
    ['POST /to-xml (error: bad JSON string)', '/to-xml', { json: '{bad' }],
  ],
};

async function post(path, body) {
  const r = await fetch(B + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
}
const getSpec = async (slug) => (await fetch(`${B}/${slug}/openapi.json`)).json();

let out = '';
const p = (s) => { out += s + '\n'; };

p('# Group B Converters — ChatGPT Review Bundle (Orbis A+ developer/format tools)');
p('');
p(`Date: 2026-06-17 · tsc clean · smoke 24/24 green · live-verified on Render`);
p('');
p('Two new deterministic, agent-native converter APIs: **data-format-converter** (JSON ⇄ YAML ⇄ TOML + format detection) and **xml-json-converter** (XML ⇄ JSON).');
p('');
p('Dependencies are pure-JS (no native bindings, deploy-safe on Render): `yaml`, `@iarna/toml`, `fast-xml-parser`.');
p('');
p('## Please grade each API (A+/A/B/...) on:');
p('1. **Correctness** of the deterministic conversions (JSON/YAML/TOML structural round-trip; TOML top-level-table + no-null constraints; format detection ordering; XML validate→parse with attribute preservation; XML build).');
p('2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata; reasoning + enriched discovery with typical_use_cases/input_examples/output_examples).');
p('3. **Honesty** (no fabrication; structural-not-byte-for-byte caveats; TOML/array limits; fast-xml-parser data-model caveats; nothing stored; no LLM).');
p('4. **OpenAPI 3.1** schema rigor (allOf + unevaluatedProperties:false; typed 200/400/500; x-pricing; request/response examples).');
p('5. **Agent-usability** (clear field names, actionable recommended_actions, sensible chain_to targets).');
p('Flag any bug, incorrect output, security footgun (e.g. XML entity expansion / billion-laughs, prototype pollution via __proto__ keys), or schema/response drift.');
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
    p('Request:'); p('```json'); p(JSON.stringify(reqEx, null, 2)); p('```');
    p(`Response (HTTP ${status}):`); p('```json'); p(JSON.stringify(json, null, 2)); p('```');
    p('');
  }
  p('## Live error / edge responses');
  for (const [label, path, body] of (ERROR_CALLS[slug] || [])) {
    const { status, json } = await post(`/${slug}${path}`, body);
    p(`### ${label}`);
    p('Request:'); p('```json'); p(JSON.stringify(body, null, 2)); p('```');
    p(`Response (HTTP ${status}):`); p('```json'); p(JSON.stringify(json, null, 2)); p('```');
    p('');
  }
}

const outPath = `${ROOT}/groupb-converters-chatgpt-review.md`;
writeFileSync(outPath, out);
console.log('Wrote', outPath, '(' + out.split('\n').length + ' lines)');
