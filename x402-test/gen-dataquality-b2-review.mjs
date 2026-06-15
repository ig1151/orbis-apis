// Assembles the Data-Quality batch 2 ChatGPT review bundle:
// header + grading criteria + shared scaffold (incl. dataset.ts helper) +
// per-API (intelligence.ts, openapi.ts, generated OpenAPI spec, live example responses).
import { readFileSync, writeFileSync } from 'node:fs';

const B = 'http://localhost:3939';
const ROOT = '/workspaces/orbis-apis';

const APIS = [
  {
    slug: 'data-normalizer', title: 'data-normalizer',
    calls: [
      ['POST /normalize (trim + collapse + title_case + to_number)', '/normalize', {
        rows: [
          { name: '  john   SMITH ', age: ' 30 ' },
          { name: 'JANE doe', age: '42' },
          { name: 'bob   jones  ', age: 'NaN' },
        ],
        rules: [
          { column: 'name', operations: ['trim', 'collapse_whitespace', 'title_case'] },
          { column: 'age', operations: ['to_number'] },
        ],
      }],
      ['POST /lookup (strip_accents + nfkc + to_boolean → reasoning block)', '/lookup', {
        rows: [{ city: 'Mëxico', active: 'YES' }, { city: 'São Paulo', active: 'n' }],
        rules: [
          { column: 'city', operations: ['strip_accents', 'nfkc'] },
          { column: 'active', operations: ['to_boolean'] },
        ],
      }],
      ['POST /normalize (no-op — values already canonical)', '/normalize', {
        rows: [{ code: 'ABC' }, { code: 'DEF' }],
        rules: [{ column: 'code', operations: ['uppercase'] }],
      }],
      ['POST /normalize (error: missing rules)', '/normalize', { rows: [{ a: 1 }] }],
    ],
  },
  {
    slug: 'data-mapper', title: 'data-mapper',
    calls: [
      ['POST /map (rename + cast + default, drop unmapped)', '/map', {
        rows: [
          { user_id: '1', signup: '2024-01-02', plan: 'pro' },
          { user_id: '2', signup: 'not-a-date' },
        ],
        mappings: [
          { from: 'user_id', to: 'id', cast: 'integer' },
          { from: 'signup', to: 'created_at', cast: 'date' },
          { from: 'plan', to: 'tier', default: 'free' },
        ],
      }],
      ['POST /lookup (cast failure + carry unmapped → reasoning block)', '/lookup', {
        rows: [{ amount: '12.50', currency: 'USD', note: 'keep me' }],
        mappings: [{ from: 'amount', to: 'price', cast: 'number' }],
        drop_unmapped: false,
      }],
      ['POST /map (target collision — two mappings write "id", last wins)', '/map', {
        rows: [{ legacy_id: '7', uuid: 'u-7' }, { legacy_id: '8', uuid: 'u-8' }],
        mappings: [
          { from: 'legacy_id', to: 'id', cast: 'integer' },
          { from: 'uuid', to: 'id' },
        ],
      }],
      ['POST /map (error: empty mappings)', '/map', { rows: [{ a: 1 }], mappings: [] }],
    ],
  },
  {
    slug: 'data-transformer', title: 'data-transformer',
    calls: [
      ['POST /transform (concat + arithmetic + filter pipeline)', '/transform', {
        rows: [
          { first: 'Ann', last: 'Lee', qty: 3, price: 10 },
          { first: 'Bob', last: 'Ng', qty: 0, price: 5 },
          { first: 'Cy', last: 'Fox', qty: 2, price: 7 },
        ],
        operations: [
          { op: 'concat', columns: ['first', 'last'], separator: ' ', target: 'full_name' },
          { op: 'arithmetic', columns: ['qty', 'price'], operator: '*', target: 'total' },
          { op: 'filter', column: 'qty', predicate: 'gt', value: 0 },
        ],
      }],
      ['POST /lookup (split + divide-by-zero guard → reasoning block)', '/lookup', {
        rows: [{ path: 'a/b/c', num: 10, den: 0 }],
        operations: [
          { op: 'split', column: 'path', separator: '/', into: ['p1', 'p2', 'p3'] },
          { op: 'arithmetic', columns: ['num', 'den'], operator: '/', target: 'ratio' },
        ],
      }],
      ['POST /transform (filter removes nothing)', '/transform', {
        rows: [{ v: 5 }, { v: 9 }],
        operations: [{ op: 'filter', column: 'v', predicate: 'gte', value: 1 }],
      }],
      ['POST /transform (error: missing operations)', '/transform', { rows: [{ a: 1 }] }],
    ],
  },
  {
    slug: 'data-aggregator', title: 'data-aggregator',
    calls: [
      ['POST /aggregate (group_by + sum/avg/count_distinct)', '/aggregate', {
        rows: [
          { region: 'us', user: 'a', revenue: 100 },
          { region: 'us', user: 'b', revenue: 50 },
          { region: 'eu', user: 'a', revenue: 30 },
        ],
        group_by: ['region'],
        aggregations: [
          { func: 'count' },
          { func: 'sum', column: 'revenue', as: 'total_rev' },
          { func: 'avg', column: 'revenue', as: 'avg_rev' },
          { func: 'count_distinct', column: 'user', as: 'users' },
        ],
      }],
      ['POST /lookup (median + percentile, no group_by → reasoning block)', '/lookup', {
        rows: [{ latency: 10 }, { latency: 20 }, { latency: 30 }, { latency: 40 }, { latency: 100 }],
        aggregations: [
          { func: 'median', column: 'latency', as: 'p50' },
          { func: 'percentile', column: 'latency', percentile: 95, as: 'p95' },
        ],
      }],
      ['POST /aggregate (column all-null → null result, no div-by-zero)', '/aggregate', {
        rows: [{ x: null }, { x: null }],
        aggregations: [{ func: 'avg', column: 'x', as: 'avg_x' }],
      }],
      ['POST /aggregate (error: unknown func)', '/aggregate', { rows: [{ a: 1 }], aggregations: [{ func: 'bogus', column: 'a' }] }],
    ],
  },
  {
    slug: 'data-classification', title: 'data-classification',
    calls: [
      ['POST /classify (email/phone/uuid/credit_card detection + PII flags)', '/classify', {
        rows: [
          { id: '550e8400-e29b-41d4-a716-446655440000', email: 'a@x.com', card: '4111 1111 1111 1111', note: 'hello there friend' },
          { id: '550e8400-e29b-41d4-a716-446655440001', email: 'b@y.org', card: '5500 0000 0000 0004', note: 'just a comment' },
        ],
      }],
      ['POST /lookup (ssn/ipv4/date + free_text fallback → reasoning block)', '/lookup', {
        rows: [
          { ssn: '123-45-6789', ip: '192.168.1.1', born: '1990-05-01', bio: 'a longer free text description here' },
          { ssn: '987-65-4321', ip: '10.0.0.255', born: '1985-12-31', bio: 'another descriptive sentence value' },
        ],
      }],
      ['POST /classify (column-name hint — "email_address" sparse values, match<80% but >=50%)', '/classify', {
        rows: [{ email_address: 'a@x.com' }, { email_address: 'b@y.com' }, { email_address: 'unknown' }],
      }],
      ['POST /classify (error: no rows)', '/classify', {}],
    ],
  },
];

async function post(path, body) {
  const r = await fetch(B + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await r.json();
  return { status: r.status, json };
}
async function getSpec(slug) {
  const r = await fetch(`${B}/${slug}/openapi.json`);
  return r.json();
}

let out = '';
const p = (s) => { out += s + '\n'; };

p('# Data-Quality Batch 2 — ChatGPT Review Bundle v2 (Orbis A+ data-shaping tools)');
p('');
p('Date: 2026-06-14 · PR #42 merged to main; review fixes on branch aplus/data-quality-batch2-review-fixes · tsc clean · smoke 30/30 green');
p('');
p('## v2 — fixes applied since the first audit (please confirm each landed)');
p('1. **Normalizer — coercion visibility.** Added `total_cells_type_changed` (and per-column `cells_type_changed`): the subset of changed cells whose JSON type changed via a coercion op (to_number/to_integer/to_boolean/to_date_iso). A recommended-action calls it out when >0.');
p('2. **Mapper — target collisions surfaced.** Added `target_collisions[]` = `{ target, sources[], winner }` for any output field written by two or more mappings (last-write-wins is kept and documented; the winner is named). A recommended-action and invalidator explain it.');
p('3. **Transformer — richer failure reasons.** Arithmetic ops now emit `failure_codes: { non_numeric_operand, divide_by_zero }` alongside the `failures` total, so a null result is no longer ambiguous.');
p('4. **Aggregator — explicit typed group rows.** Group output now uses a dedicated, documented `GroupRow` schema (typed cell-map: group-key columns + numeric/null aggregation results), not the generic input row schema.');
p('5. **Classification — optional column-name hint.** Detection stays value-first; when value matching is below the 80% threshold but the column NAME hints a type AND >=50% of values still corroborate, the column is labeled with `column_name_hint_used: true` (top-level `name_hint_used_count`). Classification confidence drops to 0.7 when any hint is used. Disable with `use_column_name_hints: false`. Honesty-preserving: a name never fabricates a type the values contradict.');
p('');
p('5 deterministic data-shaping APIs that transform a posted dataset (array of row objects) and return the reshaped rows plus per-operation stats. No external data, no storage, **no LLM call anywhere** — built on the shared `src/routes/_aplus/` scaffold plus the `dataset.ts` helper (column typing, null/empty detection, numeric coercion, quantiles).');
p('');
p('- **data-normalizer** — applies an ordered list of canonicalization ops per column (whitespace, case, unicode NFC/NFKC, accent-strip, punctuation, number/boolean/date coercion); returns normalized rows + per-column cells-changed counts.');
p('- **data-mapper** — applies a field-mapping spec (rename + optional cast + default); returns remapped records + per-mapping applied/defaults/cast-failure stats; optional unmapped-column carry-through.');
p('- **data-transformer** — applies a declarative row pipeline (concat, arithmetic, split, filter) with NO expression eval; returns transformed rows + per-operation effect summary.');
p('- **data-aggregator** — groups by zero+ columns and computes count/count_distinct/sum/avg/min/max/median/percentile per group.');
p('- **data-classification** — per column, infers a semantic type (email/phone/url/ipv4/uuid/credit_card/ssn/zip/date/datetime/currency/boolean/integer/number/json/free_text) + PII flag/category via regex + Luhn/IPv4 checksums over a value sample.');
p('');
p('## This is the FIRST review of batch 2. Carry the lessons from the batch-1 audit:');
p('- NO generic `{type:"object"}` schemas — dataset rows use the shared typed `rowSchema()` (scalar/null/array/object map).');
p('- Confidence honesty: exact deterministic transforms report confidence 1; any heuristic (e.g. classification match-rate, type inference) must be <1 with explicit invalidators.');
p('- Deterministic only, no LLM, nothing stored; examples must equal live output (drift-guarded by smoke).');
p('');
p('## Please grade each API (A+/A/B/...) on:');
p('1. **Correctness** of the deterministic transforms (normalization ops incl. unicode/accents/coercions; mapping rename+cast+default with cast-failure accounting; transformer concat/arithmetic/split/filter incl. divide-by-zero and missing-value handling; aggregator group-by + count/distinct/sum/avg/min/max/median/percentile incl. all-null columns; classifier semantic-type precedence, match-rate threshold, Luhn + IPv4 checksums, PII categorization).');
p('2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata; reasoning block on /lookup).');
p('3. **Honesty** (no fabrication; output computed only from the posted rows; nothing stored; classifier match-rate is a sample heuristic and framed as such; deterministic transforms claim confidence 1 only because they are exact).');
p('4. **OpenAPI 3.1** schema rigor (allOf + unevaluatedProperties:false; typed 200/400/500; oneOf op/mapping/aggregation variants; x-pricing; requestExample replays cleanly == responseExample).');
p('5. **Agent-usability** (clear field names, actionable recommended_actions, sensible chain_to targets — e.g. normalizer→mapper→transformer→aggregator, classifier→quality-rules/completeness from batch 1).');
p('Flag any bug, statistical/transform error (division-by-zero, mis-coercion, off-by-one in counts, mis-inferred semantic type, percentile interpolation), input-size footgun (note the global JSON limit was raised 100kb→1mb for these), or schema/response drift.');
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
p('## Shared dataset helper — `src/routes/_aplus/dataset.ts`');
p('```ts');
p(readFileSync(`${ROOT}/src/routes/_aplus/dataset.ts`, 'utf8').trimEnd());
p('```');
p('');
p('## Shared spec parts — `src/routes/_aplus/specparts.ts`');
p('```ts');
p(readFileSync(`${ROOT}/src/routes/_aplus/specparts.ts`, 'utf8').trimEnd());
p('```');
p('');

for (const api of APIS) {
  p('---');
  p('');
  p(`# ${api.title}`);
  p('');
  p('## intelligence.ts');
  p('```ts');
  p(readFileSync(`${ROOT}/src/routes/${api.slug}-api/routes/intelligence.ts`, 'utf8').trimEnd());
  p('```');
  p('');
  p('## openapi.ts');
  p('```ts');
  p(readFileSync(`${ROOT}/src/routes/${api.slug}-api/routes/openapi.ts`, 'utf8').trimEnd());
  p('```');
  p('');
  p(`## Generated OpenAPI spec (served at GET /${api.slug}/openapi.json)`);
  p('```json');
  p(JSON.stringify(await getSpec(api.slug), null, 2));
  p('```');
  p('');
  p('## Live example responses');
  for (const [label, path, body] of api.calls) {
    const { status, json } = await post(`/${api.slug}${path}`, body);
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

const path = `${ROOT}/dataquality-batch2-chatgpt-review.md`;
writeFileSync(path, out);
console.log('Wrote', path, '(' + out.split('\n').length + ' lines)');
