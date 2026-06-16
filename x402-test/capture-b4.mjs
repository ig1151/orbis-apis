// Capture live B4 responses and emit normalized example objects (envelope fixed)
// for pasting into each openapi.ts. Run against the local dev server (PORT=3939).
const BASE = process.env.BASE || 'http://localhost:3939';

const wsmReq = {
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
};
const stsReq = {
  html: '<html><body><h1 class="title">Hello World</h1><a class="nav" href="/about">About</a><a class="nav" href="/contact">Contact</a><p class="price">$19.99</p></body></html>',
  tests: [
    { name: 'title_text', selector: 'h1.title', assert: { exists: true, count: 1, equals: 'Hello World' } },
    { name: 'nav_links', selector: 'a.nav', assert: { min_count: 2, attr: 'href', non_empty: true } },
    { name: 'price_format', selector: 'p.price', assert: { matches: '^\\$\\d+\\.\\d{2}$' } },
    { name: 'no_banner', selector: '.promo-banner', assert: { exists: false } },
  ],
};
const sdqReq = {
  rows: [
    { title: 'Widget A', price: '$9.99', url: 'https://shop.com/a', stock: '12' },
    { title: 'Widget B ', price: 'N/A', url: 'https://shop.com/b', stock: '7' },
    { title: 'Tom &amp; Jerry', price: '$14.50', url: 'https://shop.com/c', stock: 'unknown' },
    { title: 'Widget A', price: '$9.99', url: 'https://shop.com/a', stock: '12' },
    { title: 'Long description that was cut o…', price: '', url: 'https://shop.com/e', stock: '3' },
  ],
};

const APIS = [
  { slug: 'website-structure-mapper', main: 'map', prefix: 'wsm', req: wsmReq },
  { slug: 'scraper-test-suite', main: 'run', prefix: 'sts', req: stsReq },
  { slug: 'scraped-data-quality-scorer', main: 'score', prefix: 'sdq', req: sdqReq },
];

function normalize(obj, prefix) {
  const id = `${prefix}-1780000000000`;
  return { ...obj, trace_id: id, request_id: id, computed_at: '2026-06-15T12:00:00.000Z', latency_ms: 1 };
}

async function post(slug, path, body) {
  const r = await fetch(`${BASE}/${slug}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
}

const out = {};
for (const a of APIS) {
  const main = await post(a.slug, a.main, a.req);
  const look = await post(a.slug, 'lookup', a.req);
  if (main.status !== 200 || look.status !== 200) { console.error(`FAIL ${a.slug}: main=${main.status} lookup=${look.status}`, JSON.stringify(main.json).slice(0, 300)); process.exit(1); }
  out[a.slug] = { main: normalize(main.json, a.prefix), lookup: normalize(look.json, a.prefix) };
}
const fs = await import('node:fs');
fs.writeFileSync('x402-test/capture-b4-results.json', JSON.stringify(out, null, 2));
console.log('captured', Object.keys(out).join(', '));
