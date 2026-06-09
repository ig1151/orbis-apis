const express = require('express');
const http = require('http');

const ROUTERS = {
  'keyword-density': '../dist/routes/keyword-density-api/routes/intelligence.js',
  'citation-formatter': '../dist/routes/citation-formatter-api/routes/intelligence.js',
  'email-syntax-validator': '../dist/routes/email-syntax-validator-api/routes/intelligence.js',
  'rate-limit-estimator': '../dist/routes/rate-limit-estimator-api/routes/intelligence.js',
  'cache-ttl-recommender': '../dist/routes/cache-ttl-recommender-api/routes/intelligence.js',
  'retry-strategy-recommender': '../dist/routes/retry-strategy-recommender-api/routes/intelligence.js',
};

const app = express();
app.use(express.json());
for (const [name, p] of Object.entries(ROUTERS)) {
  const mod = require(p);
  app.use('/' + name, mod.default || mod);
}

const CASES = [
  ['keyword-density', '/analyze', { input: 'SEO keyword density matters. Keyword density helps SEO. Density density density.', options: { title: 'SEO keyword guide', top_n: 5 } }],
  ['keyword-density', '/optimize', { input: 'cloud security cloud security best practices for cloud', options: { target_keywords: ['cloud', 'security'] } }],
  ['keyword-density', '/compare', { input: 'apples oranges apples', options: { compare_to: 'oranges bananas oranges' } }],
  ['keyword-density', '/keyword-intelligence', { input: 'agent native api agent native api for agents and agents'.repeat(6) }],
  ['keyword-density', '/execution-gate', { input: 'x' }],

  ['citation-formatter', '/format', { options: { style: 'apa', fields: { authors: ['Smith, John A', 'Doe, Jane'], title: 'Deep Learning for APIs', year: 2021, journal: 'Journal of AI', volume: 12, issue: 3, pages: '45-67', doi: '10.1000/xyz123' } } }],
  ['citation-formatter', '/format', { input: 'Smith, J. (2020). A study of caching. Journal of Systems, 5(2), 100-110.', options: { style: 'mla' } }],
  ['citation-formatter', '/convert', { input: 'Doe, J. (2019). Title here. Some Journal, 1(1), 1-9.', options: { target_style: 'ieee' } }],
  ['citation-formatter', '/formatter-intelligence', { options: { fields: { authors: ['Lee, K'], title: 'Edge Caching', year: 2022, publisher: 'TechPress' } } }],

  ['email-syntax-validator', '/validate', { input: 'user.name@example.com' }],
  ['email-syntax-validator', '/validate', { input: 'bad@@gmial.com' }],
  ['email-syntax-validator', '/batch', { inputs: ['a@b.com', 'nope', 'x@y.io'] }],
  ['email-syntax-validator', '/email-syntax-intelligence', { input: 'foo@bar' }],

  ['rate-limit-estimator', '/estimate', { input: 'X-RateLimit-Limit: 100\nX-RateLimit-Remaining: 95\nX-RateLimit-Reset: 60' }],
  ['rate-limit-estimator', '/estimate', { input: 'no headers here at all' }],
  ['rate-limit-estimator', '/analyze', { input: 'x', options: { requests: [{ status: 200, latency_ms: 50 }, { status: 429, latency_ms: 80 }, { status: 200, latency_ms: 60 }] } }],
  ['rate-limit-estimator', '/rate-limit-intelligence', { input: 'RateLimit-Limit: 1000\nRateLimit-Reset: 1893456000' }],

  ['cache-ttl-recommender', '/recommend', { input: 'logo.png immutable asset' }],
  ['cache-ttl-recommender', '/recommend', { input: 'live stock ticker feed', options: {} }],
  ['cache-ttl-recommender', '/analyze', { input: 'Cache-Control: max-age=31536000', options: { content_type: 'application/json' } }],
  ['cache-ttl-recommender', '/cache-ttl-intelligence', { input: 'blog article page' }],

  ['retry-strategy-recommender', '/recommend', { input: 'got 429 Too Many Requests' }],
  ['retry-strategy-recommender', '/recommend', { input: 'auth failed', options: { status_codes: [401] } }],
  ['retry-strategy-recommender', '/analyze', { input: 'errors: 500 503 429 400' }],
  ['retry-strategy-recommender', '/retry-intelligence', { input: 'ETIMEDOUT then 504', options: { method: 'GET' } }],

  // error path
  ['keyword-density', '/analyze', {}, 400],
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
  for (const [api, path, body, expect] of CASES) {
    const exp = expect || 200;
    const r = await post(port, '/' + api + path, body);
    let parsed; try { parsed = JSON.parse(r.body); } catch { parsed = null; }
    const ok = r.status === exp && parsed && (exp === 400 ? parsed.code === 'MISSING_INPUT' : parsed.success === true);
    if (ok) { pass++; } else { fail++; }
    const tag = ok ? 'PASS' : 'FAIL';
    let detail = '';
    if (parsed && parsed.success) {
      const d = parsed.data || {};
      detail = JSON.stringify(d).slice(0, 130);
    } else if (parsed) detail = JSON.stringify(parsed).slice(0, 120);
    else detail = r.body.slice(0, 120);
    console.log(`${tag} [${r.status}] ${api}${path} :: ${detail}`);
  }
  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  server.close();
  process.exit(fail ? 1 : 0);
});
