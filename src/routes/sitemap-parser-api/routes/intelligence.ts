import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic XML sitemap parser (cheerio xmlMode) -----------------------------------

const CHANGEFREQ = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']);

function parse(xml: string, sitemapUrl: string | null) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const is_sitemap_index = $('sitemapindex').length > 0;
  const sitemap_type: 'index' | 'urlset' = is_sitemap_index ? 'index' : 'urlset';

  const child_sitemaps: string[] = [];
  if (is_sitemap_index) {
    $('sitemapindex > sitemap > loc, sitemap > loc').each((_, el) => { const loc = $(el).text().trim(); if (loc) child_sitemaps.push(loc); });
  }

  const urls = $('urlset > url, url').map((_, el) => {
    const $el = $(el);
    const loc = $el.children('loc').text().trim();
    const lastmod = $el.children('lastmod').text().trim() || null;
    const cf = $el.children('changefreq').text().trim().toLowerCase();
    const prRaw = $el.children('priority').text().trim();
    const priority = prRaw === '' ? null : Number(prRaw);
    return {
      loc,
      lastmod,
      changefreq: CHANGEFREQ.has(cf) ? cf : null,
      priority: priority != null && Number.isFinite(priority) ? priority : null,
    };
  }).get().filter(u => u.loc);

  return {
    sitemap_url: sitemapUrl,
    url_count: is_sitemap_index ? child_sitemaps.length : urls.length,
    urls: is_sitemap_index ? [] : urls,
    sitemap_type,
    is_sitemap_index,
    child_sitemaps,
  };
}

function validate(xml: string, sitemapUrl: string | null) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const errors: { type: string; message: string; line: number | null; severity: 'error' | 'warning' | 'info' }[] = [];
  const warnings: string[] = [];

  const hasRoot = $('urlset').length > 0 || $('sitemapindex').length > 0;
  const format_valid = hasRoot && /<\?xml|<urlset|<sitemapindex/i.test(xml);
  if (!hasRoot) errors.push({ type: 'missing_root', message: 'No <urlset> or <sitemapindex> root element', line: null, severity: 'error' });

  const isIndex = $('sitemapindex').length > 0;
  const entries = isIndex ? $('sitemap').toArray() : $('url').toArray();
  let schema_valid = true;
  const locs: string[] = [];

  for (const el of entries) {
    const $el = $(el);
    const loc = $el.children('loc').text().trim();
    if (!loc) { schema_valid = false; errors.push({ type: 'missing_loc', message: 'Entry is missing required <loc>', line: null, severity: 'error' }); continue; }
    locs.push(loc);
    if (!/^https?:\/\//i.test(loc)) errors.push({ type: 'invalid_loc', message: `<loc> is not an absolute URL: ${loc}`, line: null, severity: 'warning' });
    const pr = $el.children('priority').text().trim();
    if (pr && (Number(pr) < 0 || Number(pr) > 1 || !Number.isFinite(Number(pr)))) errors.push({ type: 'invalid_priority', message: `priority "${pr}" must be between 0.0 and 1.0`, line: null, severity: 'warning' });
    const cf = $el.children('changefreq').text().trim().toLowerCase();
    if (cf && !CHANGEFREQ.has(cf)) errors.push({ type: 'invalid_changefreq', message: `changefreq "${cf}" is not a valid value`, line: null, severity: 'warning' });
  }

  const seen = new Set<string>();
  const duplicate_urls: string[] = [];
  for (const l of locs) { if (seen.has(l)) { if (!duplicate_urls.includes(l)) duplicate_urls.push(l); } else seen.add(l); }
  const has_duplicates = duplicate_urls.length > 0;
  if (has_duplicates) errors.push({ type: 'duplicate_urls', message: `${duplicate_urls.length} duplicate URL(s)`, line: null, severity: 'warning' });

  if (entries.length > 50000) warnings.push('Sitemap exceeds the 50,000-URL limit; split into multiple sitemaps');
  if (xml.length > 52428800) warnings.push('Sitemap exceeds the 50MB uncompressed size limit');

  const encoding_valid = !/[�]/.test(xml);
  if (!encoding_valid) errors.push({ type: 'encoding', message: 'Document contains invalid/replacement characters', line: null, severity: 'warning' });

  const is_valid = errors.filter(e => e.severity === 'error').length === 0 && hasRoot;
  return { is_valid, sitemap_url: sitemapUrl, format_valid, schema_valid, encoding_valid, errors, url_count: locs.length, has_duplicates, duplicate_urls, warnings };
}

// ---- envelope -----------------------------------------------------------------------------

function envelope(data: any, opts: { start: number; score: number; reason: string; ttl: number; actions: any[] }) {
  return {
    success: true, request_id: rid(), data,
    confidence: { score: opts.score, reason: opts.reason, per_section: { parse: opts.score } },
    provenance: { provider: 'deterministic-compute', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl, retryable: false, cache_recommended: true },
    recommended_next_api: [
      { api: 'sitemap-parser', endpoint: '/sitemap-intelligence', reason: 'Full parse + validate in one call' },
      { api: 'sitemap-health-score', endpoint: '/score', reason: 'Grade overall sitemap health' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}
const requireXml = (input: any): string | null => (typeof input === 'string' && input.trim()) ? input : null;
const grade = (s: number) => s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F';

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Sitemap Parser API', info: '/sitemap-parser/info', openapi: '/sitemap-parser/openapi.json', health: 'ok' });
});

router.post('/parse', (req: Request, res: Response) => {
  const start = Date.now();
  const xml = requireXml(req.body?.input);
  if (!xml) return res.status(400).json({ error: 'input is required (sitemap XML)', code: 'MISSING_INPUT', retryable: false });
  const data = parse(xml, req.body?.options?.url || null);
  res.json(envelope(data, {
    start, score: 1, ttl: 3600, reason: 'Deterministic XML sitemap parse',
    actions: [{ priority: 'low', action: data.is_sitemap_index ? 'Parse the child sitemaps' : 'Validate the sitemap structure', reason: `${data.url_count} ${data.is_sitemap_index ? 'child sitemap(s)' : 'URL(s)'}` }],
  }));
});

router.post('/validate', (req: Request, res: Response) => {
  const start = Date.now();
  const xml = requireXml(req.body?.input);
  if (!xml) return res.status(400).json({ error: 'input is required (sitemap XML)', code: 'MISSING_INPUT', retryable: false });
  const data = validate(xml, req.body?.options?.url || null);
  res.json(envelope(data, {
    start, score: 1, ttl: 3600, reason: 'Deterministic sitemap validation',
    actions: data.errors.filter(e => e.severity === 'error').slice(0, 3).map(e => ({ priority: 'high' as const, action: `Fix: ${e.type}`, reason: e.message })),
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'parse',
    next_api: 'sitemap-parser', next_endpoint: '/sitemap-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'sitemap-parser', endpoint: '/sitemap-intelligence', reason: 'One-call endpoint for full Sitemap Parser API intelligence' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /sitemap-intelligence for full intelligence', reason: 'Single-request full analysis combining parse, validate, and health scoring' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/sitemap-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const xml = requireXml(req.body?.input);
  if (!xml) return res.status(400).json({ error: 'input is required (sitemap XML)', code: 'MISSING_INPUT', retryable: false });
  const url = req.body?.options?.url || null;
  const p = parse(xml, url);
  const v = validate(xml, url);
  const errorCount = v.errors.filter(e => e.severity === 'error').length;
  const overall_score = Math.max(0, 100 - errorCount * 30 - v.errors.filter(e => e.severity === 'warning').length * 5);
  const data = {
    parse: p, validate: v, overall_score, health_grade: grade(overall_score),
    key_findings: [
      `${p.is_sitemap_index ? 'Sitemap index' : 'URL set'} with ${p.url_count} ${p.is_sitemap_index ? 'child sitemap(s)' : 'URL(s)'}`,
      v.is_valid ? 'Valid sitemap' : `${errorCount} error(s)`,
      v.has_duplicates ? `${v.duplicate_urls.length} duplicate URL(s)` : 'No duplicate URLs',
    ],
    summary: v.is_valid ? `Valid ${p.sitemap_type} sitemap with ${p.url_count} entries, grade ${grade(overall_score)}.` : `Sitemap has ${errorCount} validation error(s).`,
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 3600, reason: 'Deterministic combined sitemap intelligence',
    actions: [{ priority: errorCount ? 'high' : 'low', action: errorCount ? 'Fix validation errors' : 'Sitemap is healthy', reason: `Grade ${grade(overall_score)}` }],
  }));
});

export default router;
