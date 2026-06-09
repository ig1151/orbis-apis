import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic canonical parsing (cheerio) --------------------------------------------

function normalize(u: string): string {
  return (u || '').trim().replace(/#.*$/, '').replace(/\/$/, '').toLowerCase();
}
function hostOf(u: string): string | null {
  try { return new URL(u).host.toLowerCase(); } catch { return null; }
}

function parse(html: string, pageUrl: string | null) {
  const $ = cheerio.load(html);
  const links = $('link[rel="canonical"]');
  const hrefs = links.map((_, el) => ($(el).attr('href') || '').trim()).get().filter(Boolean);
  const canonical_url = hrefs[0] || null;
  const canonical_tag_present = links.length > 0;
  const hasNextPrev = $('link[rel="next"], link[rel="prev"]').length > 0;

  const issues: { type: string; description: string }[] = [];
  if (!canonical_tag_present) issues.push({ type: 'missing_canonical', description: 'No <link rel="canonical"> tag found' });
  if (hrefs.length > 1) issues.push({ type: 'multiple_canonicals', description: `${hrefs.length} canonical tags found; only one is allowed` });
  if (canonical_url && !/^https?:\/\//i.test(canonical_url)) issues.push({ type: 'relative_canonical', description: 'Canonical URL is relative; Google recommends absolute URLs' });

  const match = !!(canonical_url && pageUrl && normalize(canonical_url) === normalize(pageUrl));
  const self_referencing = match;
  return { $, canonical_url, canonical_tag_present, hasNextPrev, issues, match, self_referencing };
}

function check(html: string, pageUrl: string | null) {
  const p = parse(html, pageUrl);
  if (pageUrl && p.canonical_url && !p.match) p.issues.push({ type: 'canonical_mismatch', description: 'Canonical URL does not match the page URL' });
  return {
    canonical_url: p.canonical_url,
    page_url: pageUrl,
    match: p.match,
    canonical_tag_present: p.canonical_tag_present,
    self_referencing: p.self_referencing,
    issues: p.issues,
  };
}

function validate(html: string, pageUrl: string | null) {
  const p = parse(html, pageUrl);
  const absolute_url = !!(p.canonical_url && /^https?:\/\//i.test(p.canonical_url));
  const cHost = p.canonical_url ? hostOf(p.canonical_url) : null;
  const pHost = pageUrl ? hostOf(pageUrl) : null;
  const cross_domain = !!(cHost && pHost && cHost !== pHost);
  const pagination_issue = p.hasNextPrev && !!pageUrl && !!p.canonical_url && !p.match;

  const warnings: string[] = [];
  if (cross_domain) warnings.push('Canonical points to a different domain (cross-domain canonical)');
  if (pagination_issue) warnings.push('Paginated page canonicalizes to a different URL; verify this is intended');
  if (!absolute_url && p.canonical_url) warnings.push('Canonical URL is not absolute');
  if (!pHost) warnings.push('Page URL not supplied (options.url); domain checks skipped');

  const valid = p.canonical_tag_present && absolute_url && !cross_domain && p.issues.filter(i => i.type !== 'canonical_mismatch').length === 0;
  const seo_impact: 'none' | 'low' | 'medium' | 'high' =
    !p.canonical_tag_present ? 'medium' : cross_domain ? 'high' : pagination_issue ? 'medium' : warnings.length ? 'low' : 'none';
  return { valid, absolute_url, cross_domain, pagination_issue, warnings, seo_impact };
}

// ---- envelope -----------------------------------------------------------------------------

function envelope(data: any, opts: { start: number; score: number; reason: string; ttl: number; actions: any[] }) {
  return {
    success: true, request_id: rid(), data,
    confidence: { score: opts.score, reason: opts.reason, per_section: { parse: opts.score } },
    provenance: { provider: 'deterministic-compute', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl, retryable: false, cache_recommended: true },
    recommended_next_api: [
      { api: 'canonical-url-checker', endpoint: '/canonical-intelligence', reason: 'Full check + validate in one call' },
      { api: 'indexability-checker', endpoint: '/check', reason: 'Confirm the page is actually indexable' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}
const requireHtml = (input: any): string | null => (typeof input === 'string' && input.trim()) ? input : null;
const pageUrlOf = (options: any): string | null => options?.url || options?.page_url || null;

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Canonical URL Checker API', info: '/canonical-url-checker/info', openapi: '/canonical-url-checker/openapi.json', health: 'ok' });
});

router.post('/check', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const data = check(html, pageUrlOf(options));
  res.json(envelope(data, {
    start, score: 1, ttl: 86400,
    reason: data.canonical_tag_present ? 'Deterministic canonical tag check' : 'No canonical tag found',
    actions: data.issues.slice(0, 3).map(i => ({ priority: 'high' as const, action: `Resolve: ${i.type}`, reason: i.description })),
  }));
});

router.post('/validate', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const data = validate(html, pageUrlOf(options));
  res.json(envelope(data, {
    start, score: 1, ttl: 86400, reason: 'Deterministic canonical validation',
    actions: data.warnings.slice(0, 3).map(w => ({ priority: data.seo_impact === 'high' ? 'high' as const : 'medium' as const, action: 'Review canonical configuration', reason: w })),
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({ success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'check', next_api: 'canonical-url-checker', next_endpoint: '/canonical-intelligence', blocking_flags: [], confidence: { score: 0.98, reason: 'Input valid', per_section: { execution_ready: 0.98 } }, provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' }, recommended_next_api: [{ api: 'canonical-url-checker', endpoint: '/canonical-intelligence', reason: 'Full intelligence in one call' }], recommended_actions_priority_order: [{ priority: 'high', action: 'Call /canonical-intelligence', reason: 'Single-request analysis' }], execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true } });
});

router.post('/canonical-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const pageUrl = pageUrlOf(options);
  const c = check(html, pageUrl);
  const v = validate(html, pageUrl);
  const overall_score = (c.canonical_tag_present ? 50 : 0) + (v.absolute_url ? 20 : 0) + (!v.cross_domain ? 15 : 0) + (c.issues.length === 0 ? 15 : 0);
  const data = {
    check: c, validate: v, overall_score,
    key_findings: [
      c.canonical_tag_present ? `Canonical: ${c.canonical_url}` : 'No canonical tag',
      pageUrl ? (c.match ? 'Self-referencing canonical' : 'Canonical differs from page URL') : 'Page URL not supplied for match check',
      `SEO impact: ${v.seo_impact}`,
    ],
    summary: c.canonical_tag_present ? `Canonical ${c.self_referencing ? 'self-references' : 'points elsewhere'}; score ${overall_score}/100.` : 'No canonical tag found on the page.',
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400, reason: 'Deterministic combined canonical intelligence',
    actions: [{ priority: c.issues.length ? 'high' : 'low', action: c.issues.length ? 'Resolve canonical issues' : 'Canonical configuration is sound', reason: `Score ${overall_score}/100` }],
  }));
});

export default router;
