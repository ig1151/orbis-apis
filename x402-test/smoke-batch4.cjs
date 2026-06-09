const express = require('express');
const http = require('http');

const ROUTERS = {
  'schema-org-extractor': '../dist/routes/schema-org-extractor-api/routes/intelligence.js',
  'canonical-url-checker': '../dist/routes/canonical-url-checker-api/routes/intelligence.js',
  'hreflang-validator': '../dist/routes/hreflang-validator-api/routes/intelligence.js',
  'breadcrumb-validator': '../dist/routes/breadcrumb-validator-api/routes/intelligence.js',
  'faq-schema-validator': '../dist/routes/faq-schema-validator-api/routes/intelligence.js',
  'indexability-checker': '../dist/routes/indexability-checker-api/routes/intelligence.js',
};

const app = express();
app.use(express.json({ limit: '2mb' }));
for (const [name, p] of Object.entries(ROUTERS)) { const m = require(p); app.use('/' + name, m.default || m); }

const PRODUCT_LD = `<html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Widget","offers":{"@type":"Offer","price":"9.99"}}</script>
</head><body>x</body></html>`;

const BREADCRUMB_LD = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://e.com/"},{"@type":"ListItem","position":2,"name":"Docs","item":"https://e.com/docs"}]}</script></head><body></body></html>`;

const BREADCRUMB_BAD = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":2,"name":"Docs"},{"@type":"ListItem","position":1}]}</script></head><body></body></html>`;

const FAQ_LD = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"What is it?","acceptedAnswer":{"@type":"Answer","text":"A thing."}},{"@type":"Question","name":"Cost?","acceptedAnswer":{"@type":"Answer","text":"Free."}}]}</script></head><body></body></html>`;

const FAQ_BAD = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"No answer here"}]}</script></head><body></body></html>`;

const HREFLANG = `<html><head>
<link rel="alternate" hreflang="en-US" href="https://e.com/us"/>
<link rel="alternate" hreflang="fr-FR" href="https://e.com/fr"/>
<link rel="alternate" hreflang="x-default" href="https://e.com/"/>
</head><body></body></html>`;

const HREFLANG_BAD = `<html><head>
<link rel="alternate" hreflang="english" href="https://e.com/us"/>
<link rel="alternate" hreflang="en-US" href="https://e.com/a"/>
<link rel="alternate" hreflang="en-US" href="https://e.com/b"/>
</head><body></body></html>`;

const CANON_OK = `<html><head><link rel="canonical" href="https://e.com/page"/></head><body></body></html>`;
const CANON_CROSS = `<html><head><link rel="canonical" href="https://other.com/page"/><link rel="next" href="https://e.com/page?p=2"/></head><body></body></html>`;
const NOINDEX = `<html><head><meta name="robots" content="noindex, nofollow"/><link rel="canonical" href="https://e.com/other"/></head><body></body></html>`;
const INDEXABLE = `<html><head><meta name="robots" content="index, follow"/><link rel="canonical" href="https://e.com/page"/></head><body></body></html>`;

const CASES = [
  ['schema-org-extractor', '/extract', { input: PRODUCT_LD, options: { url: 'https://e.com/p' } }, r => r.schemas_found === 1 && r.has_json_ld && r.schema_types_present.includes('Product')],
  ['schema-org-extractor', '/validate', { input: PRODUCT_LD }, r => r.rich_result_eligible.includes('Product')],
  ['schema-org-extractor', '/extract', { input: '<html><body>no schema</body></html>' }, r => r.schemas_found === 0],
  ['schema-org-extractor', '/schema-intelligence', { input: PRODUCT_LD }, r => r.rich_result_potential && r.overall_score >= 0],

  ['breadcrumb-validator', '/validate', { input: BREADCRUMB_LD }, r => r.is_valid && r.item_count === 2 && r.has_home_breadcrumb],
  ['breadcrumb-validator', '/validate', { input: BREADCRUMB_BAD }, r => !r.is_valid && r.errors.length > 0],
  ['breadcrumb-validator', '/check', { input: BREADCRUMB_LD }, r => r.overall_status === 'valid'],
  ['breadcrumb-validator', '/breadcrumb-intelligence', { input: BREADCRUMB_LD }, r => r.rich_snippet_potential === 'high'],

  ['faq-schema-validator', '/validate', { input: FAQ_LD }, r => r.is_valid && r.question_count === 2],
  ['faq-schema-validator', '/validate', { input: FAQ_BAD }, r => !r.is_valid && r.errors.some(e => e.type === 'missing_acceptedAnswer')],
  ['faq-schema-validator', '/faq-schema-intelligence', { input: FAQ_LD }, r => r.rich_snippet_potential === 'high'],

  ['hreflang-validator', '/validate', { input: HREFLANG, options: { url: 'https://e.com/us' } }, r => r.is_valid && r.has_x_default && r.total_tags === 3],
  ['hreflang-validator', '/validate', { input: HREFLANG_BAD }, r => !r.is_valid && r.errors.some(e => e.type === 'invalid_lang_code') && r.errors.some(e => e.type === 'conflicting_tags')],
  ['hreflang-validator', '/check', { input: HREFLANG }, r => r.hreflang_count === 3 && r.has_x_default],
  ['hreflang-validator', '/hreflang-intelligence', { input: HREFLANG, options: { url: 'https://e.com/us' } }, r => r.seo_impact === 'none'],

  ['canonical-url-checker', '/check', { input: CANON_OK, options: { url: 'https://e.com/page' } }, r => r.match && r.self_referencing && r.canonical_tag_present],
  ['canonical-url-checker', '/validate', { input: CANON_CROSS, options: { url: 'https://e.com/page' } }, r => r.cross_domain && r.seo_impact === 'high'],
  ['canonical-url-checker', '/canonical-intelligence', { input: CANON_OK, options: { url: 'https://e.com/page' } }, r => r.overall_score === 100],

  ['indexability-checker', '/check', { input: NOINDEX, options: { url: 'https://e.com/page' } }, r => !r.is_indexable && r.noindex_detected && r.blocking_reason],
  ['indexability-checker', '/check', { input: INDEXABLE, options: { url: 'https://e.com/page' } }, r => r.is_indexable && r.indexability_score === 100],
  ['indexability-checker', '/analyze', { input: NOINDEX, options: { url: 'https://e.com/page' } }, r => r.issues.some(i => i.type === 'noindex')],
  ['indexability-checker', '/indexability-intelligence', { input: INDEXABLE, options: { url: 'https://e.com/page' } }, r => r.check.is_indexable],

  // error path
  ['schema-org-extractor', '/extract', {}, null, 400],
];

function post(port, path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', e => resolve({ status: 0, body: String(e) }));
    req.write(data); req.end();
  });
}

const server = app.listen(0, async () => {
  const port = server.address().port;
  let pass = 0, fail = 0;
  for (const [api, path, body, assert, expect] of CASES) {
    const exp = expect || 200;
    const r = await post(port, '/' + api + path, body);
    let parsed; try { parsed = JSON.parse(r.body); } catch { parsed = null; }
    let ok;
    if (exp === 400) ok = r.status === 400 && parsed && parsed.code === 'MISSING_INPUT';
    else ok = r.status === 200 && parsed && parsed.success === true && (!assert || assert(parsed.data));
    if (ok) pass++; else fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'} [${r.status}] ${api}${path} :: ${parsed && parsed.data ? JSON.stringify(parsed.data).slice(0, 120) : r.body.slice(0, 120)}`);
  }
  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  server.close();
  process.exit(fail ? 1 : 0);
});
