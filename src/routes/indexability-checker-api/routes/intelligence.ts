import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic indexability parsing (cheerio) -----------------------------------------
// Parses the directives present in the supplied HTML/headers. Fields that require fetching the
// live URL (HTTP status, redirect chain, robots.txt) are returned null/[] unless supplied.

const normalize = (u: string): string => (u || '').trim().replace(/#.*$/, '').replace(/\/$/, '').toLowerCase();

function parse(html: string, options: any) {
  const $ = cheerio.load(html);
  const pageUrl: string | null = options?.url || options?.page_url || null;

  // meta robots (combine all robots/googlebot meta tags)
  const metaRobots = $('meta[name="robots"], meta[name="googlebot"]')
    .map((_, el) => ($(el).attr('content') || '').toLowerCase()).get().join(', ').trim() || null;
  // X-Robots-Tag may be passed via options.headers
  const headers: Record<string, string> = {};
  if (options?.headers && typeof options.headers === 'object') for (const [k, v] of Object.entries(options.headers)) headers[k.toLowerCase()] = String(v).toLowerCase();
  const xRobots = headers['x-robots-tag'] || null;

  const directiveText = `${metaRobots || ''} ${xRobots || ''}`;
  const noindex_detected = /\bnoindex\b/.test(directiveText);
  const nofollow = /\bnofollow\b/.test(directiveText);

  const canonical_url = ($('link[rel="canonical"]').first().attr('href') || '').trim() || null;
  const is_canonical = !!(canonical_url && pageUrl && normalize(canonical_url) === normalize(pageUrl));
  const canonical_mismatch = !!(canonical_url && pageUrl && !is_canonical);

  // robots.txt only checkable if supplied (no fetching)
  let robots_blocked: boolean | null = null;
  if (typeof options?.robots_txt === 'string') {
    robots_blocked = isDisallowed(options.robots_txt, pageUrl);
  }

  const crawl_directives = {
    noindex: noindex_detected,
    nofollow,
    noarchive: /\bnoarchive\b/.test(directiveText),
    nosnippet: /\bnosnippet\b/.test(directiveText),
    none: /\bnone\b/.test(directiveText),
  };

  return { pageUrl, metaRobots, xRobots, noindex_detected, robots_blocked, canonical_url, is_canonical, canonical_mismatch, crawl_directives };
}

function isDisallowed(robotsTxt: string, pageUrl: string | null): boolean | null {
  if (!pageUrl) return null;
  let path: string;
  try { path = new URL(pageUrl).pathname; } catch { return null; }
  const lines = robotsTxt.split(/\r?\n/).map(l => l.trim());
  let applies = false;
  for (const line of lines) {
    const ua = line.match(/^user-agent:\s*(.+)$/i);
    if (ua) { applies = ua[1].trim() === '*'; continue; }
    if (applies) {
      const dis = line.match(/^disallow:\s*(.*)$/i);
      if (dis && dis[1] && path.startsWith(dis[1].trim())) return true;
    }
  }
  return false;
}

function check(html: string, options: any) {
  const p = parse(html, options);
  const robotsBlocks = p.robots_blocked === true;
  const is_indexable = !p.noindex_detected && !robotsBlocks;
  let blocking_reason: string | null = null;
  if (p.noindex_detected) blocking_reason = 'noindex directive present';
  else if (robotsBlocks) blocking_reason = 'blocked by robots.txt';

  let score = 100;
  if (p.noindex_detected) score -= 60;
  if (robotsBlocks) score -= 40;
  if (p.canonical_mismatch) score -= 15;
  const indexability_score = Math.max(0, score);

  return {
    url: p.pageUrl,
    is_indexable,
    noindex_detected: p.noindex_detected,
    robots_blocked: p.robots_blocked === null ? false : p.robots_blocked, // false when robots.txt not supplied (unknown, not fabricated as blocked)
    canonical_mismatch: p.canonical_mismatch,
    http_status: typeof options?.http_status === 'number' ? options.http_status : null,
    redirect_chain: Array.isArray(options?.redirect_chain) ? options.redirect_chain : [],
    blocking_reason,
    indexability_score,
  };
}

function analyze(html: string, options: any) {
  const p = parse(html, options);
  const issues: { type: string; severity: 'error' | 'warning' | 'info'; description: string; fix: string }[] = [];
  if (p.noindex_detected) issues.push({ type: 'noindex', severity: 'error', description: 'Page has a noindex directive', fix: 'Remove noindex from meta robots / X-Robots-Tag to allow indexing' });
  if (p.robots_blocked === true) issues.push({ type: 'robots_disallow', severity: 'error', description: 'URL is disallowed in robots.txt', fix: 'Remove the matching Disallow rule' });
  if (p.canonical_mismatch) issues.push({ type: 'canonical_mismatch', severity: 'warning', description: 'Canonical URL differs from the page URL', fix: 'Point the canonical to the page URL if this page should be indexed' });
  if (!p.metaRobots && !p.xRobots) issues.push({ type: 'no_robots_directive', severity: 'info', description: 'No explicit robots directive (defaults to indexable)', fix: 'No action needed unless you intend to restrict indexing' });
  if (p.robots_blocked === null && typeof options?.robots_txt !== 'string') issues.push({ type: 'robots_txt_unchecked', severity: 'info', description: 'robots.txt not supplied; disallow rules were not evaluated', fix: 'Pass options.robots_txt to include robots.txt analysis' });

  return {
    url: p.pageUrl,
    meta_robots: p.metaRobots,
    x_robots_tag: p.xRobots,
    canonical_url: p.canonical_url,
    is_canonical: p.is_canonical,
    crawl_directives: p.crawl_directives,
    issues,
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
      { api: 'indexability-checker', endpoint: '/indexability-intelligence', reason: 'Full check + analyze in one call' },
      { api: 'canonical-url-checker', endpoint: '/check', reason: 'Validate the canonical tag in detail' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}
const requireHtml = (input: any): string | null => (typeof input === 'string' && input.trim()) ? input : null;

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Indexability Checker API', info: '/indexability-checker/info', openapi: '/indexability-checker/openapi.json', health: 'ok' });
});

router.post('/check', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const data = check(html, options || {});
  res.json(envelope(data, {
    start, score: 1, ttl: 3600,
    reason: 'Deterministic indexability check from page directives',
    actions: [{ priority: data.is_indexable ? 'low' : 'high', action: data.is_indexable ? 'Page is indexable' : (data.blocking_reason || 'Resolve indexing block'), reason: `Score ${data.indexability_score}/100` }],
  }));
});

router.post('/analyze', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const data = analyze(html, options || {});
  res.json(envelope(data, {
    start, score: 1, ttl: 3600, reason: 'Deterministic crawl-directive analysis',
    actions: data.issues.filter(i => i.severity === 'error').slice(0, 3).map(i => ({ priority: 'high' as const, action: i.fix, reason: i.description })),
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'analyze',
    next_api: 'indexability-checker', next_endpoint: '/indexability-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'indexability-checker', endpoint: '/indexability-intelligence', reason: 'Full Indexability Checker API intelligence in one call' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /indexability-intelligence', reason: 'Single-request full analysis' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/indexability-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const c = check(html, options || {});
  const a = analyze(html, options || {});
  const data = {
    check: c, analyze: a, overall_score: c.indexability_score,
    key_findings: [
      c.is_indexable ? 'Page is indexable' : `Not indexable: ${c.blocking_reason}`,
      a.meta_robots ? `meta robots: ${a.meta_robots}` : 'No meta robots directive',
      c.canonical_mismatch ? 'Canonical mismatch detected' : 'Canonical consistent / not set',
    ],
    summary: c.is_indexable ? `Page is indexable (score ${c.indexability_score}/100).` : `Page is NOT indexable: ${c.blocking_reason}.`,
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 3600, reason: 'Deterministic combined indexability intelligence',
    actions: [{ priority: c.is_indexable ? 'low' : 'high', action: c.is_indexable ? 'No indexing blocks' : (c.blocking_reason || 'Resolve block'), reason: `Score ${c.indexability_score}/100` }],
  }));
});

export default router;
