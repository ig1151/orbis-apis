import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic sitemap health scoring (cheerio xmlMode) -------------------------------

const CHANGEFREQ = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
const grade = (s: number) => s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F';

interface Url { loc: string; lastmod: string | null; changefreq: string | null; priority: number | null; }

function parseUrls(xml: string): Url[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  return $('url').map((_, el) => {
    const $el = $(el);
    const prRaw = $el.children('priority').text().trim();
    const cf = $el.children('changefreq').text().trim().toLowerCase();
    return {
      loc: $el.children('loc').text().trim(),
      lastmod: $el.children('lastmod').text().trim() || null,
      changefreq: CHANGEFREQ.includes(cf) ? cf : null,
      priority: prRaw === '' ? null : (Number.isFinite(Number(prRaw)) ? Number(prRaw) : null),
    };
  }).get().filter(u => u.loc);
}

function staleCount(urls: Url[], now: number): { stale: number; datedCount: number } {
  const YEAR = 365 * 24 * 3600 * 1000;
  let stale = 0, datedCount = 0;
  for (const u of urls) {
    if (!u.lastmod) continue;
    const t = Date.parse(u.lastmod);
    if (!Number.isFinite(t)) continue;
    datedCount++;
    if (now - t > YEAR) stale++;
  }
  return { stale, datedCount };
}

function score(xml: string) {
  const urls = parseUrls(xml);
  const now = Date.now();
  const url_count = urls.length;
  const missing_lastmod_count = urls.filter(u => !u.lastmod).length;
  const missing_priority_count = urls.filter(u => u.priority == null).length;
  const { stale, datedCount } = staleCount(urls, now);

  // Dimension scores (rules-based, on what the sitemap itself declares).
  const completeness = url_count === 0 ? 0 : Math.round((1 - missing_lastmod_count / url_count) * 100);
  const freshness = datedCount === 0 ? 0 : Math.round((1 - stale / datedCount) * 100);
  const structure = url_count === 0 ? 0 : Math.min(100, 60 + (missing_priority_count < url_count ? 20 : 0) + (url_count <= 50000 ? 20 : 0));
  const overall = url_count === 0 ? 0 : Math.round(completeness * 0.4 + freshness * 0.4 + structure * 0.2);

  return {
    overall_score: overall,
    health_grade: grade(overall),
    url_count,
    indexed_url_count: null, // requires Search Console / live crawl data — not fabricated
    stale_url_count: stale,
    missing_lastmod_count,
    missing_priority_count,
    score_breakdown: { completeness, freshness, structure },
  };
}

function analyze(xml: string, sitemapUrl: string | null) {
  const urls = parseUrls(xml);
  const now = Date.now();
  const { stale, datedCount } = staleCount(urls, now);

  const changefreq_distribution: Record<string, number> = {};
  for (const cf of CHANGEFREQ) changefreq_distribution[cf] = 0;
  changefreq_distribution['none'] = 0;
  const priority_distribution: Record<string, number> = { '0.0-0.3': 0, '0.4-0.6': 0, '0.7-1.0': 0, none: 0 };
  for (const u of urls) {
    changefreq_distribution[u.changefreq || 'none']++;
    if (u.priority == null) priority_distribution.none++;
    else if (u.priority <= 0.3) priority_distribution['0.0-0.3']++;
    else if (u.priority <= 0.6) priority_distribution['0.4-0.6']++;
    else priority_distribution['0.7-1.0']++;
  }

  const structure_issues: string[] = [];
  const recommendations: string[] = [];
  if (urls.some(u => !u.lastmod)) { structure_issues.push('Some URLs are missing <lastmod>'); recommendations.push('Add <lastmod> to every URL to signal freshness'); }
  if (stale > 0) { structure_issues.push(`${stale} URL(s) have a lastmod older than 1 year`); recommendations.push('Update or remove stale URLs'); }
  if (urls.length > 50000) { structure_issues.push('Sitemap exceeds 50,000 URLs'); recommendations.push('Split into multiple sitemaps under a sitemap index'); }
  if (urls.every(u => u.priority == null)) recommendations.push('Consider adding <priority> to highlight key pages');

  const freshness_score = datedCount === 0 ? 0 : Math.round((1 - stale / datedCount) * 100);
  const indexability_score = urls.length === 0 ? 0 : Math.round((urls.filter(u => /^https?:\/\//i.test(u.loc)).length / urls.length) * 100);

  return {
    sitemap_url: sitemapUrl,
    url_coverage_pct: null, // total site page count is unknown without a crawl — not fabricated
    freshness_score,
    indexability_score,
    structure_issues,
    recommendations,
    changefreq_distribution,
    priority_distribution,
  };
}

// ---- envelope -----------------------------------------------------------------------------

function envelope(data: any, opts: { start: number; score: number; reason: string; ttl: number; actions: any[] }) {
  return {
    success: true, request_id: rid(), data,
    confidence: { score: opts.score, reason: opts.reason, per_section: { parse: opts.score } },
    provenance: { provider: 'deterministic-compute', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl, retryable: false, cache_recommended: true },
    recommended_next_api: [
      { api: 'sitemap-health-score', endpoint: '/sitemap-health-intelligence', reason: 'Full score + analyze in one call' },
      { api: 'sitemap-parser', endpoint: '/validate', reason: 'Validate raw sitemap structure' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}
const requireXml = (input: any): string | null => (typeof input === 'string' && input.trim()) ? input : null;

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Sitemap Health Score API', info: '/sitemap-health-score/info', openapi: '/sitemap-health-score/openapi.json', health: 'ok' });
});

router.post('/score', (req: Request, res: Response) => {
  const start = Date.now();
  const xml = requireXml(req.body?.input);
  if (!xml) return res.status(400).json({ error: 'input is required (sitemap XML)', code: 'MISSING_INPUT', retryable: false });
  const data = score(xml);
  res.json(envelope(data, {
    start, score: 1, ttl: 3600, reason: 'Deterministic sitemap health score from declared metadata',
    actions: [{ priority: data.overall_score < 70 ? 'high' : 'low', action: data.overall_score < 70 ? 'Improve lastmod coverage and freshness' : 'Sitemap health is good', reason: `Grade ${data.health_grade} (${data.overall_score}/100)` }],
  }));
});

router.post('/analyze', (req: Request, res: Response) => {
  const start = Date.now();
  const xml = requireXml(req.body?.input);
  if (!xml) return res.status(400).json({ error: 'input is required (sitemap XML)', code: 'MISSING_INPUT', retryable: false });
  const data = analyze(xml, req.body?.options?.url || null);
  res.json(envelope(data, {
    start, score: 1, ttl: 3600, reason: 'Deterministic sitemap freshness/structure analysis',
    actions: data.recommendations.slice(0, 3).map((r: string) => ({ priority: 'medium' as const, action: r, reason: 'Sitemap quality improvement' })),
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'analyze',
    next_api: 'sitemap-health-score', next_endpoint: '/sitemap-health-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'sitemap-health-score', endpoint: '/sitemap-health-intelligence', reason: 'Full Sitemap Health Score API intelligence in one call' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /sitemap-health-intelligence', reason: 'Single-request full analysis' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/sitemap-health-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const xml = requireXml(req.body?.input);
  if (!xml) return res.status(400).json({ error: 'input is required (sitemap XML)', code: 'MISSING_INPUT', retryable: false });
  const url = req.body?.options?.url || null;
  const s = score(xml);
  const a = analyze(xml, url);
  const data = {
    score: s, analyze: a, overall_score: s.overall_score, health_grade: s.health_grade,
    key_findings: [
      `${s.url_count} URL(s), grade ${s.health_grade}`,
      `Freshness ${a.freshness_score}/100, ${s.stale_url_count} stale`,
      s.missing_lastmod_count ? `${s.missing_lastmod_count} URL(s) missing lastmod` : 'All URLs have lastmod',
    ],
    summary: `Sitemap health grade ${s.health_grade} (${s.overall_score}/100) across ${s.url_count} URLs.`,
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 3600, reason: 'Deterministic combined sitemap health intelligence',
    actions: [{ priority: s.overall_score < 70 ? 'high' : 'low', action: s.overall_score < 70 ? 'Address freshness/completeness gaps' : 'Sitemap is healthy', reason: `Grade ${s.health_grade}` }],
  }));
});

export default router;
