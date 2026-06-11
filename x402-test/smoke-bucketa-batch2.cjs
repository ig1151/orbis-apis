// Bucket A batch 2 validator: live responses ajv-2020 vs published schema,
// spec responseExample drift guard, 400 paths, deterministic logic asserts.
const express = require('express');
const Ajv2020 = require('ajv/dist/2020');

const APIS = {
  'web-performance-budget-checker': { router: require('../dist/routes/web-performance-budget-checker-api/routes/intelligence').default, spec: require('../dist/routes/web-performance-budget-checker-api/routes/openapi').spec },
  'web-scrape-rate-limiter': { router: require('../dist/routes/web-scrape-rate-limiter-api/routes/intelligence').default, spec: require('../dist/routes/web-scrape-rate-limiter-api/routes/openapi').spec },
  'web-content-freshness-scorer': { router: require('../dist/routes/web-content-freshness-scorer-api/routes/intelligence').default, spec: require('../dist/routes/web-content-freshness-scorer-api/routes/openapi').spec },
  'web-archive-url-builder': { router: require('../dist/routes/web-archive-url-builder-api/routes/intelligence').default, spec: require('../dist/routes/web-archive-url-builder-api/routes/openapi').spec },
  'web-scrape-cost-roi-analyzer': { router: require('../dist/routes/web-scrape-cost-roi-analyzer-api/routes/intelligence').default, spec: require('../dist/routes/web-scrape-cost-roi-analyzer-api/routes/openapi').spec },
};

const app = express();
app.use(express.json({ limit: '2mb' }));
for (const [slug, { router }] of Object.entries(APIS)) app.use('/' + slug, router);

const validators = {};
for (const [slug, { spec }] of Object.entries(APIS)) {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  ajv.addSchema(spec, slug);
  validators[slug] = (name, data) => { const v = ajv.getSchema(`${slug}#/components/schemas/${name}`); if (!v) throw new Error(`no schema ${name}`); return { ok: v(data), errors: v.errors }; };
}

let pass = 0, fail = 0;
function check(slug, label, name, data, extra) {
  const { ok, errors } = validators[slug](name, data);
  let msg = ''; if (ok && extra) { const e = extra(data); if (e) msg = ' — ASSERT: ' + e; }
  if (ok && !msg) { pass++; console.log(`  ✓ ${label} → ${name}`); }
  else { fail++; console.log(`  ✗ ${label} → ${name}${msg}`); if (!ok) console.log('    ' + JSON.stringify(errors)); }
}
function driftGuard(slug) {
  const { spec } = APIS[slug];
  for (const [path, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) {
    const media = op.responses?.['200']?.content?.['application/json']; if (!media?.example) continue;
    check(slug, `spec example ${method.toUpperCase()} ${path}`, (media.schema?.$ref || '').split('/').pop(), media.example);
  }
}
async function call(base, method, path, body) {
  const res = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json() };
}

async function run(base) {
  // ---- web-performance-budget-checker ----
  console.log('web-performance-budget-checker:');
  check('web-performance-budget-checker', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web-performance-budget-checker/')).json);
  const wpbReq = { resources: [{ type: 'html', size_kb: 30, count: 1 }, { type: 'css', size_kb: 60, count: 3 }, { type: 'js', size_kb: 520, count: 8 }, { type: 'image', size_kb: 1200, count: 20 }] };
  check('web-performance-budget-checker', 'POST /check', 'CheckResponse', (await call(base, 'POST', '/web-performance-budget-checker/check', wpbReq)).json, d => d.total.size_kb === 1810 && d.passes === false && d.failing_classes.includes('js') && d.failing_classes.includes('image') ? null : `unexpected total/${d.total.size_kb} failing/${d.failing_classes}`);
  check('web-performance-budget-checker', 'POST /check (class_totals pass)', 'CheckResponse', (await call(base, 'POST', '/web-performance-budget-checker/check', { class_totals: { js: { size_kb: 100 }, image: { size_kb: 200 } } })).json, d => d.passes === true ? null : 'expected pass');
  check('web-performance-budget-checker', 'POST /lookup (override budget)', 'LookupResponse', (await call(base, 'POST', '/web-performance-budget-checker/lookup', { class_totals: { js: { size_kb: 200 } }, budgets: { js: 150 } })).json, d => d.by_class.find(c => c.class === 'js').status === 'fail' ? null : 'expected js fail after override');
  const wpbBad = await call(base, 'POST', '/web-performance-budget-checker/check', {});
  check('web-performance-budget-checker', 'POST /check (empty -> 400)', 'Error400', wpbBad.json, () => wpbBad.status === 400 ? null : `status ${wpbBad.status}`);
  driftGuard('web-performance-budget-checker');

  // ---- web-scrape-rate-limiter ----
  console.log('web-scrape-rate-limiter:');
  check('web-scrape-rate-limiter', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web-scrape-rate-limiter/')).json);
  check('web-scrape-rate-limiter', 'POST /plan (crawl-delay)', 'PlanResponse', (await call(base, 'POST', '/web-scrape-rate-limiter/plan', { crawl_delay_s: 10, requested_rps: 1, requested_concurrency: 4, pages: 500 })).json, d => d.effective_rps === 0.1 && d.recommended_concurrency === 1 && d.violates_crawl_delay === true && d.estimated_duration_seconds === 5000 && d.confidence_score === 0.85 && d.confidence_per_section.compliance === 0.7 ? null : `unexpected ${d.effective_rps}/${d.estimated_duration_seconds}/conf ${d.confidence_score}`);
  check('web-scrape-rate-limiter', 'POST /plan (no crawl-delay)', 'PlanResponse', (await call(base, 'POST', '/web-scrape-rate-limiter/plan', { requested_rps: 5, requested_concurrency: 3, pages: 100 })).json, d => d.basis === 'politeness_default' && d.effective_rps === 1 && d.throttled === true ? null : 'expected politeness throttle to 1 rps');
  check('web-scrape-rate-limiter', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/web-scrape-rate-limiter/lookup', { crawl_delay_s: 2, pages: 10 })).json, d => d.effective_rps === 0.5 && d.estimated_duration_seconds === 20 ? null : 'expected 0.5 rps / 20s');
  const wsrBad = await call(base, 'POST', '/web-scrape-rate-limiter/plan', { crawl_delay_s: -1 });
  check('web-scrape-rate-limiter', 'POST /plan (neg delay -> 400)', 'Error400', wsrBad.json, () => wsrBad.status === 400 ? null : `status ${wsrBad.status}`);
  driftGuard('web-scrape-rate-limiter');

  // ---- web-content-freshness-scorer ----
  console.log('web-content-freshness-scorer:');
  check('web-content-freshness-scorer', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web-content-freshness-scorer/')).json);
  check('web-content-freshness-scorer', 'POST /score (stale)', 'ScoreResponse', (await call(base, 'POST', '/web-content-freshness-scorer/score', { published_date: '2025-01-01', modified_date: '2025-06-01', as_of: '2026-06-11', half_life_days: 180 })).json, d => d.band === 'stale' && d.was_updated === true && Math.abs(d.age_days - 375) < 1 && d.confidence_score === 0.85 && d.confidence_per_section.score === 0.7 ? null : `unexpected band ${d.band} age ${d.age_days}/conf ${d.confidence_score}`);
  check('web-content-freshness-scorer', 'POST /score (fresh)', 'ScoreResponse', (await call(base, 'POST', '/web-content-freshness-scorer/score', { modified_date: '2026-06-01', as_of: '2026-06-11', half_life_days: 180 })).json, d => d.band === 'fresh' && d.freshness_score >= 95 ? null : `expected fresh, got ${d.band}/${d.freshness_score}`);
  check('web-content-freshness-scorer', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/web-content-freshness-scorer/lookup', { published_date: '2024-01-01', as_of: '2026-06-11' })).json, d => d.days_since_modified === null && d.published_date !== null ? null : 'expected null modified');
  const wcfBad = await call(base, 'POST', '/web-content-freshness-scorer/score', { published_date: 'not-a-date' });
  check('web-content-freshness-scorer', 'POST /score (bad date -> 400)', 'Error400', wcfBad.json, () => wcfBad.status === 400 ? null : `status ${wcfBad.status}`);
  const wcfFut = await call(base, 'POST', '/web-content-freshness-scorer/score', { modified_date: '2030-01-01', as_of: '2026-06-11' });
  check('web-content-freshness-scorer', 'POST /score (future -> 400)', 'Error400', wcfFut.json, () => wcfFut.status === 400 ? null : `status ${wcfFut.status}`);
  driftGuard('web-content-freshness-scorer');

  // ---- web-archive-url-builder ----
  console.log('web-archive-url-builder:');
  check('web-archive-url-builder', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web-archive-url-builder/')).json);
  check('web-archive-url-builder', 'POST /build (ts)', 'BuildResponse', (await call(base, 'POST', '/web-archive-url-builder/build', { url: 'example.com/article', timestamp: '2023-06-15T12:00:00Z' })).json, d => d.timestamp.wayback_14 === '20230615120000' && d.archives.wayback.snapshot_url.includes('20230615120000') && d.normalized_url === 'https://example.com/article' ? null : 'unexpected wayback build');
  check('web-archive-url-builder', 'POST /build (epoch + service)', 'BuildResponse', (await call(base, 'POST', '/web-archive-url-builder/build', { url: 'https://x.com', timestamp: '1686830400', service: 'wayback' })).json, d => d.timestamp.wayback_14.length === 14 && !('archive_today' in d.archives) && 'wayback' in d.archives ? null : 'expected wayback-only + parsed epoch');
  check('web-archive-url-builder', 'POST /build (no ts)', 'BuildResponse', (await call(base, 'POST', '/web-archive-url-builder/build', { url: 'example.com' })).json, d => d.timestamp === null && d.archives.wayback.snapshot_url === null ? null : 'expected null timestamp + null snapshot');
  check('web-archive-url-builder', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/web-archive-url-builder/lookup', { url: 'https://example.com', timestamp: '20230101' })).json, d => d.timestamp.wayback_14 === '20230101000000' ? null : 'expected YYYYMMDD parse');
  const wauBadTs = await call(base, 'POST', '/web-archive-url-builder/build', { url: 'example.com', timestamp: 'never' });
  check('web-archive-url-builder', 'POST /build (bad ts -> 400)', 'Error400', wauBadTs.json, () => wauBadTs.status === 400 ? null : `status ${wauBadTs.status}`);
  const wauNoUrl = await call(base, 'POST', '/web-archive-url-builder/build', {});
  check('web-archive-url-builder', 'POST /build (no url -> 400)', 'Error400', wauNoUrl.json, () => wauNoUrl.status === 400 ? null : `status ${wauNoUrl.status}`);
  driftGuard('web-archive-url-builder');

  // ---- web-scrape-cost-roi-analyzer ----
  console.log('web-scrape-cost-roi-analyzer:');
  check('web-scrape-cost-roi-analyzer', 'GET /', 'DiscoveryResponse', (await call(base, 'GET', '/web-scrape-cost-roi-analyzer/')).json);
  check('web-scrape-cost-roi-analyzer', 'POST /analyze (positive)', 'AnalyzeResponse', (await call(base, 'POST', '/web-scrape-cost-roi-analyzer/analyze', { pages: 10000, cost_per_page: 0.002, fixed_cost: 50, value_per_page: 0.02 })).json, d => d.total_cost === 70 && d.net_value === 130 && d.roi_pct === 185.71 && d.break_even_pages === 2778 && d.verdict === 'positive' && d.confidence_score === 0.85 && d.confidence_per_section.roi === 0.7 ? null : `unexpected ${d.total_cost}/${d.net_value}/${d.roi_pct}/${d.break_even_pages}/${d.verdict}/conf ${d.confidence_score}`);
  check('web-scrape-cost-roi-analyzer', 'POST /analyze (no profit / break-even)', 'AnalyzeResponse', (await call(base, 'POST', '/web-scrape-cost-roi-analyzer/analyze', { pages: 1000, cost_per_page: 0.01, value_per_page: 0.01 })).json, d => d.net_value === 0 && d.roi_pct === 0 && d.profitable === false && d.verdict === 'marginal' && d.break_even_pages === null ? null : `expected zero-profit marginal, got net ${d.net_value}/roi ${d.roi_pct}/${d.verdict}`);
  check('web-scrape-cost-roi-analyzer', 'POST /analyze (negative)', 'AnalyzeResponse', (await call(base, 'POST', '/web-scrape-cost-roi-analyzer/analyze', { pages: 1000, cost_per_page: 0.05, value_per_page: 0.01 })).json, d => d.verdict === 'negative' && d.profitable === false && d.break_even_pages === null ? null : 'expected negative + no break-even');
  check('web-scrape-cost-roi-analyzer', 'POST /analyze (components + total_value)', 'AnalyzeResponse', (await call(base, 'POST', '/web-scrape-cost-roi-analyzer/analyze', { pages: 100, cost_components: { proxy: 0.001, compute: 0.001 }, total_value: 50 })).json, d => d.cost_per_page === 0.002 && d.cost_component_total === 0.002 && d.total_value === 50 ? null : 'expected summed components');
  check('web-scrape-cost-roi-analyzer', 'POST /lookup', 'LookupResponse', (await call(base, 'POST', '/web-scrape-cost-roi-analyzer/lookup', { pages: 500, cost_per_page: 0.01, value_per_page: 0.1 })).json, d => d.verdict === 'strong_roi' ? null : `expected strong_roi got ${d.verdict}`);
  const wscBad = await call(base, 'POST', '/web-scrape-cost-roi-analyzer/analyze', { pages: 100 });
  check('web-scrape-cost-roi-analyzer', 'POST /analyze (no cost/value -> 400)', 'Error400', wscBad.json, () => wscBad.status === 400 ? null : `status ${wscBad.status}`);
  driftGuard('web-scrape-cost-roi-analyzer');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

const server = app.listen(0, () => run(`http://127.0.0.1:${server.address().port}`).catch(e => { console.error(e); process.exit(1); }));
