// Assembles the Data-Quality batch 4 ChatGPT review bundle:
// header + grading criteria + shared scaffold + per-API (intelligence.ts, openapi.ts,
// generated OpenAPI spec, live example responses incl. edge cases + error paths).
import { readFileSync, writeFileSync } from 'node:fs';

const B = 'http://localhost:3939';
const ROOT = '/workspaces/orbis-apis';

const APIS = [
  {
    slug: 'website-structure-mapper', title: 'website-structure-mapper',
    calls: [
      ['POST /map (home_url given + sitemap diff + orphan/dead-end/dangling)', '/map', {
        pages: [
          { url: 'https://shop.example.com/', links: ['/products', '/about', 'https://twitter.com/shop'] },
          { url: 'https://shop.example.com/products', links: ['/', '/products/widget', '/products/gadget'] },
          { url: 'https://shop.example.com/products/widget', links: ['/products'] },
          { url: 'https://shop.example.com/products/gadget', links: ['/products', '/missing-page'] },
          { url: 'https://shop.example.com/about', links: ['/'] },
          { url: 'https://shop.example.com/legacy', links: [] },
        ],
        home_url: 'https://shop.example.com/',
        sitemap: ['https://shop.example.com/', 'https://shop.example.com/products', 'https://shop.example.com/contact'],
      }],
      ['POST /lookup (home_url INFERRED → confidence 0.9, home_inferred true)', '/lookup', {
        pages: [
          { url: 'https://blog.example.com/posts/a', links: ['/posts/b'] },
          { url: 'https://blog.example.com/posts/b', links: ['/posts/a'] },
        ],
      }],
      ['POST /map (relative-link resolution + external + invalid link counting)', '/map', {
        pages: [
          { url: 'https://site.test/', links: ['about', 'https://x.com/ext', 'mailto:a@b.com', 'javascript:void(0)'] },
          { url: 'https://site.test/about', links: ['./'] },
        ],
        home_url: 'https://site.test/',
      }],
      ['POST /map (error: empty pages)', '/map', { pages: [] }],
    ],
  },
  {
    slug: 'scraper-test-suite', title: 'scraper-test-suite',
    calls: [
      ['POST /run (mix: pass + assertion-fail + zero-match + invalid-selector graceful)', '/run', {
        html: '<html><body><h1 class="title">Hello</h1><a class="nav" href="/a">A</a><a class="nav" href="/b">B</a><span class="qty">3</span></body></html>',
        tests: [
          { name: 'title_ok', selector: 'h1.title', assert: { exists: true, equals: 'Hello' } },
          { name: 'title_wrong', selector: 'h1.title', assert: { equals: 'Goodbye' } },
          { name: 'nav_attr', selector: 'a.nav', assert: { min_count: 2, attr: 'href', non_empty: true } },
          { name: 'missing_elem', selector: '.price', assert: { exists: true } },
          { name: 'bad_selector', selector: 'div[unclosed', assert: { exists: true } },
        ],
      }],
      ['POST /lookup (all pass: equals + attr + regex + exists:false)', '/lookup', {
        html: '<html><body><h1 class="title">Hello World</h1><a class="nav" href="/about">About</a><a class="nav" href="/contact">Contact</a><p class="price">$19.99</p></body></html>',
        tests: [
          { name: 'title_text', selector: 'h1.title', assert: { exists: true, count: 1, equals: 'Hello World' } },
          { name: 'nav_links', selector: 'a.nav', assert: { min_count: 2, attr: 'href', non_empty: true } },
          { name: 'price_format', selector: 'p.price', assert: { matches: '^\\$\\d+\\.\\d{2}$' } },
          { name: 'no_banner', selector: '.promo-banner', assert: { exists: false } },
        ],
      }],
      ['POST /run (ReDoS guard: nested unbounded quantifier rejected → 400)', '/run', {
        html: '<p>x</p>', tests: [{ name: 'redos', selector: 'p', assert: { matches: '(a+)+' } }],
      }],
      ['POST /run (error: missing tests)', '/run', { html: '<a></a>' }],
    ],
  },
  {
    slug: 'scraped-data-quality-scorer', title: 'scraped-data-quality-scorer',
    calls: [
      ['POST /score (messy: dup row + placeholder + HTML-entity/whitespace/truncation noise + missing + mixed types)', '/score', {
        rows: [
          { title: 'Widget A', price: '$9.99', url: 'https://shop.com/a', stock: '12' },
          { title: 'Widget B ', price: 'N/A', url: 'https://shop.com/b', stock: '7' },
          { title: 'Tom &amp; Jerry', price: '$14.50', url: 'https://shop.com/c', stock: 'unknown' },
          { title: 'Widget A', price: '$9.99', url: 'https://shop.com/a', stock: '12' },
          { title: 'Long description that was cut o…', price: '', url: 'https://shop.com/e', stock: '3' },
        ],
      }],
      ['POST /lookup (clean dataset → high score, empty issues)', '/lookup', {
        rows: [
          { id: '1', name: 'Acme', city: 'Denver' },
          { id: '2', name: 'Beta', city: 'Boulder' },
          { id: '3', name: 'Gamma', city: 'Aspen' },
        ],
      }],
      ['POST /score (heavy placeholder + truncation column)', '/score', {
        rows: [
          { desc: 'real value here', code: 'AB1' },
          { desc: 'N/A', code: 'AB2' },
          { desc: 'tbd', code: 'AB3' },
          { desc: 'another long blurb that got…', code: 'AB4' },
        ],
      }],
      ['POST /score (error: missing rows)', '/score', {}],
    ],
  },
];

async function post(path, body) {
  const r = await fetch(B + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
}
async function getSpec(slug) { const r = await fetch(`${B}/${slug}/openapi.json`); return r.json(); }

let out = '';
const p = (s) => { out += s + '\n'; };

p('# Data-Quality Batch 4 — ChatGPT Review Bundle (Orbis A+ scraping infra + scraped-data scorer)');
p('');
p('Date: 2026-06-15 · branch aplus/data-quality-batch4 · PR #45 · tsc clean · smoke 18/18 green');
p('');
p('3 deterministic, STATELESS APIs (input manifest/HTML/records → computed output, nothing fetched, nothing stored, **no LLM anywhere**). Built on the shared `src/routes/_aplus/` scaffold (+ `dataset.ts` helpers). `scraper-test-suite` parses HTML with **cheerio**.');
p('');
p('- **website-structure-mapper** — crawl manifest (pages with outbound links, optional sitemap) → internal navigation graph: click depth from home (BFS), in/out degree, page roles (home/hub/orphan/dead_end/normal), top-level sections, unreachable pages, dangling internal links, sitemap diff. Confidence 1 when home_url given; 0.9 when inferred.');
p('- **scraper-test-suite** — sample HTML + selector tests (assertions: exists/count/min_count/max_count/equals/contains/matches/non_empty, optional `attr` extraction) → per-test pass/fail, extracted values, score/grade. Regex assertions ReDoS-guarded; invalid selectors fail gracefully (not 500).');
p('- **scraped-data-quality-scorer** — extracted/scraped dataset → 0–100 quality score over scrape-specific dimensions (completeness, uniqueness, cleanliness = HTML-entity/whitespace/control/truncation noise, placeholder-freedom, type-consistency) with per-field breakdown + issues. Schema-free.');
p('');
p('## Differentiation (please sanity-check this is genuinely distinct):');
p('- **scraped-data-quality-scorer** scores *intrinsic, schema-free* quality of already-extracted data. It is NOT `data-pipeline-quality-scorer` (B1 — generic pipeline health) and NOT `scrape-data-pipeline-validator` (B3 — checks records against an *explicit expected schema*, pass/fail). Stated in its invalidators.');
p('- **website-structure-mapper** is a deterministic no-fetch graph builder over a supplied manifest — distinct from the live AI crawler `web-navigation-api`.');
p('');
p('## Carry the batch-1/2/3 lessons:');
p('- NO generic `{type:"object"}` schemas — dataset rows use the shared typed `rowSchema()`; variant inputs (pages/tests/assertions) are closed `additionalProperties:false` objects.');
p('- Confidence honesty: exact deterministic computation reports 1; heuristics (mapper home inference, scorer blended weights) are <1 with explicit invalidators.');
p('- Stateless + deterministic; OpenAPI examples are GENERATED from live output (`routes/examples.ts`) and drift-guarded by smoke.');
p('');
p('## Please grade each API (A+/A/B/...) on:');
p('1. **Correctness** of the deterministic computation (mapper: URL normalization, internal/external/dangling link classification, BFS click depth, roles, sections, reachability, sitemap diff; test-suite: cheerio selector matching, each assertion type, attr vs text extraction, graceful invalid-selector handling, ReDoS guard; scorer: each of the 5 dimensions + per-column type consistency + duplicate detection + the blended score/weights).');
p('2. **A+ envelope completeness** (trace_id/request_id, computed_at, success, latency_ms, confidence_score, confidence_per_section, recommended_actions_priority_order, chain_to, privacy, execution_metadata; reasoning block on /lookup).');
p('3. **Honesty** (computed only from the request; nothing stored/fetched; mapper "dangling" link is a signal not a fetched 404; scorer placeholder list + blended score are heuristics with <1 confidence; test-suite proves a selector works on the *snapshot*, not the live page).');
p('4. **OpenAPI 3.1** rigor (allOf + unevaluatedProperties:false; typed 200/400/500; closed objects; x-pricing; requestExample replays cleanly == responseExample).');
p('5. **Agent-usability** (clear field names, actionable recommended_actions, sensible chain_to across the data-quality fleet, pricing sanity).');
p('Flag any bug, graph/stat error (wrong depth/role/reachability, sitemap-diff edge, selector/assertion mis-eval, ReDoS bypass, noise/placeholder false-positive or miss, dup miscount, denominator choice), input-size footgun, or schema/response drift.');
p('');
p('## Shared A+ scaffold — `src/routes/_aplus/scaffold.ts`');
p('```ts'); p(readFileSync(`${ROOT}/src/routes/_aplus/scaffold.ts`, 'utf8').trimEnd()); p('```'); p('');
p('## Shared A+ helpers — `src/routes/_aplus/util.ts`');
p('```ts'); p(readFileSync(`${ROOT}/src/routes/_aplus/util.ts`, 'utf8').trimEnd()); p('```'); p('');
p('## Shared dataset helper — `src/routes/_aplus/dataset.ts`');
p('```ts'); p(readFileSync(`${ROOT}/src/routes/_aplus/dataset.ts`, 'utf8').trimEnd()); p('```'); p('');
p('## Shared spec parts — `src/routes/_aplus/specparts.ts`');
p('```ts'); p(readFileSync(`${ROOT}/src/routes/_aplus/specparts.ts`, 'utf8').trimEnd()); p('```'); p('');

for (const api of APIS) {
  p('---'); p('');
  p(`# ${api.title}`); p('');
  p('## intelligence.ts');
  p('```ts'); p(readFileSync(`${ROOT}/src/routes/${api.slug}-api/routes/intelligence.ts`, 'utf8').trimEnd()); p('```'); p('');
  p('## openapi.ts');
  p('```ts'); p(readFileSync(`${ROOT}/src/routes/${api.slug}-api/routes/openapi.ts`, 'utf8').trimEnd()); p('```'); p('');
  p(`## Generated OpenAPI spec (served at GET /${api.slug}/openapi.json)`);
  p('```json'); p(JSON.stringify(await getSpec(api.slug), null, 2)); p('```'); p('');
  p('## Live example responses');
  for (const [label, path, body] of api.calls) {
    const { status, json } = await post(`/${api.slug}${path}`, body);
    p(`### ${label}`);
    p('Request:'); p('```json'); p(JSON.stringify(body, null, 2)); p('```');
    p(`Response (HTTP ${status}):`); p('```json'); p(JSON.stringify(json, null, 2)); p('```'); p('');
  }
}

const path = `${ROOT}/dataquality-batch4-chatgpt-review.md`;
writeFileSync(path, out);
console.log('Wrote', path, '(' + out.split('\n').length + ' lines)');
