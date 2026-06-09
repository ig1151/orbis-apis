const express = require('express');
const http = require('http');

const ROUTERS = {
  'robots-txt-parser': '../dist/routes/robots-txt-parser-api/routes/intelligence.js',
  'sitemap-parser': '../dist/routes/sitemap-parser-api/routes/intelligence.js',
  'sitemap-health-score': '../dist/routes/sitemap-health-score-api/routes/intelligence.js',
  'html-to-markdown': '../dist/routes/html-to-markdown-api/routes/intelligence.js',
  'markdown-cleaner': '../dist/routes/markdown-cleaner-api/routes/intelligence.js',
};
const app = express();
app.use(express.json({ limit: '4mb' }));
for (const [n, p] of Object.entries(ROUTERS)) { const m = require(p); app.use('/' + n, m.default || m); }

const ROBOTS = `User-agent: *
Disallow: /private
Allow: /private/public
Crawl-delay: 10

User-agent: Googlebot
Disallow: /no-google

Sitemap: https://e.com/sitemap.xml`;
const ROBOTS_BLOCK = `User-agent: *\nDisallow: /`;

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://e.com/</loc><lastmod>2026-05-01</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
<url><loc>https://e.com/about</loc><lastmod>2020-01-01</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>
<url><loc>https://e.com/about</loc></url>
</urlset>`;
const SITEMAP_INDEX = `<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://e.com/s1.xml</loc></sitemap><sitemap><loc>https://e.com/s2.xml</loc></sitemap></sitemapindex>`;

const HTML = `<html><head><title>My Page</title><meta name="description" content="A test page"></head><body>
<h1>Title</h1><p>Hello <strong>world</strong> and <a href="https://x.com">link</a>.</p>
<h2>List</h2><ul><li>one</li><li>two</li></ul>
<img src="/a.png" alt="pic"><pre><code class="language-js">const x=1;</code></pre>
<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>
</body></html>`;

const MD_DIRTY = "# Title  \r\n\r\n\r\nSome   text with  nbsp here.\r\n\r\n* item\r\n+ item2\r\n\r\n## Title\r\n";
const MD_LINT = `# Heading
[bad]()
![](/img.png)
## Heading
## Empty

- a
* b`;

const CASES = [
  ['robots-txt-parser', '/parse', { input: ROBOTS }, r => r.sitemap_urls.length === 1 && r.user_agents.length === 2 && r.has_wildcard],
  ['robots-txt-parser', '/validate', { input: ROBOTS }, r => r.valid && r.googlebot_allowed && !r.all_bots_blocked],
  ['robots-txt-parser', '/validate', { input: ROBOTS_BLOCK }, r => r.all_bots_blocked && !r.googlebot_allowed],
  ['robots-txt-parser', '/robots-intelligence', { input: ROBOTS }, r => r.overall_score >= 0 && r.parse && r.validate],

  ['sitemap-parser', '/parse', { input: SITEMAP }, r => r.url_count === 3 && r.sitemap_type === 'urlset' && r.urls[0].changefreq === 'daily'],
  ['sitemap-parser', '/parse', { input: SITEMAP_INDEX }, r => r.is_sitemap_index && r.child_sitemaps.length === 2],
  ['sitemap-parser', '/validate', { input: SITEMAP }, r => r.has_duplicates && r.duplicate_urls.includes('https://e.com/about')],
  ['sitemap-parser', '/sitemap-intelligence', { input: SITEMAP }, r => r.health_grade && r.parse && r.validate],

  ['sitemap-health-score', '/score', { input: SITEMAP }, r => r.url_count === 3 && r.stale_url_count >= 1 && r.indexed_url_count === null],
  ['sitemap-health-score', '/analyze', { input: SITEMAP }, r => r.url_coverage_pct === null && r.changefreq_distribution.daily === 1],
  ['sitemap-health-score', '/sitemap-health-intelligence', { input: SITEMAP }, r => r.health_grade && r.score && r.analyze],

  ['html-to-markdown', '/convert', { html: HTML }, r => r.markdown.includes('# Title') && r.markdown.includes('**world**') && r.markdown.includes('[link](https://x.com)') && r.headings_found === 2 && r.tables_converted === 1],
  ['html-to-markdown', '/extract', { html: HTML }, r => r.title === 'My Page' && r.description === 'A test page' && r.links.length === 1 && r.word_count > 0],
  ['html-to-markdown', '/clean', { markdown: MD_DIRTY }, r => r.cleaned_markdown && r.char_count_after <= r.char_count_before],
  ['html-to-markdown', '/html-intelligence', { html: HTML }, r => r.markdown && r.seo_signals.has_title && r.seo_signals.heading_structure],
  ['html-to-markdown', '/simplify', { html: HTML }, r => r.plain_text.includes('Hello') && r.words > 0],
  ['html-to-markdown', '/batch', { items: [{ html: '<h1>Hi</h1>', label: 'a' }, { html: '<p>Yo</p>' }] }, r => r.batch_count === 2 && r.results[0].markdown.includes('# Hi')],

  ['markdown-cleaner', '/clean', { markdown: MD_DIRTY }, r => r.changes_made.length > 0 && !r.cleaned_markdown.includes(' ') && r.char_count_after < r.char_count_before],
  ['markdown-cleaner', '/format', { markdown: MD_DIRTY }, r => r.list_style_normalized && !r.formatted_markdown.includes('\n+ ')],
  ['markdown-cleaner', '/lint', { markdown: MD_LINT }, r => r.error_count >= 1 && r.issues.some(i => i.type === 'broken_link') && r.issues.some(i => i.type === 'missing_alt') && r.issues.some(i => i.type === 'duplicate_heading')],
  ['markdown-cleaner', '/extract-structure', { markdown: '---\ntitle: Doc\n---\n# H1\ntext [x](https://a.com) [y](/rel)\n## H2\n```python\nx=1\n```' }, r => r.frontmatter.title === 'Doc' && r.table_of_contents.length === 2 && r.code_languages.includes('python') && r.links.external.length === 1 && r.links.internal.length === 1],
  ['markdown-cleaner', '/markdown-intelligence', { markdown: MD_LINT }, r => r.structure.heading_count === 3 && typeof r.lint_score === 'number' && r.quality_assessment],
  ['markdown-cleaner', '/batch', { items: [{ markdown: '# ok\ntext', label: 'a' }, { markdown: '[bad]()' }] }, r => r.batch_count === 2 && r.results[1].issue_count >= 1],

  // error paths (distinct envelope: just {error})
  ['html-to-markdown', '/convert', {}, null, 400],
  ['markdown-cleaner', '/clean', {}, null, 400],
  ['sitemap-parser', '/parse', {}, null, 400, 'MISSING_INPUT'],
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
  for (const [api, path, body, assert, expect, code] of CASES) {
    const exp = expect || 200;
    const r = await post(port, '/' + api + path, body);
    let parsed; try { parsed = JSON.parse(r.body); } catch { parsed = null; }
    let ok;
    if (exp === 400) ok = r.status === 400 && parsed && (code ? parsed.code === code : !!parsed.error);
    else ok = r.status === 200 && parsed && parsed.success === true && (!assert || assert(parsed.data || parsed));
    if (ok) pass++; else fail++;
    const shown = parsed ? JSON.stringify(parsed.data || parsed).slice(0, 110) : r.body.slice(0, 110);
    console.log(`${ok ? 'PASS' : 'FAIL'} [${r.status}] ${api}${path} :: ${shown}`);
  }
  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  server.close();
  process.exit(fail ? 1 : 0);
});
