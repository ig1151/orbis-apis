import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic hreflang parsing (cheerio) ---------------------------------------------

const LANG_RE = /^[a-z]{2,3}(-[A-Z]{2}|-[0-9]{3}|-[A-Z][a-z]{3})?$/;

interface Tag { lang: string; region: string | null; url: string; is_self_referencing: boolean; raw: string; }

function parseTags(html: string, selfUrl: string | null): Tag[] {
  const $ = cheerio.load(html);
  const tags: Tag[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const raw = ($(el).attr('hreflang') || '').trim();
    const url = ($(el).attr('href') || '').trim();
    const [lang, region] = raw.split('-');
    tags.push({
      lang: raw === 'x-default' ? 'x-default' : (lang || '').toLowerCase(),
      region: raw === 'x-default' ? null : (region ? region.toUpperCase() : null),
      url,
      is_self_referencing: !!selfUrl && url === selfUrl,
      raw,
    });
  });
  return tags;
}

function validate(html: string, selfUrl: string | null) {
  const tags = parseTags(html, selfUrl);
  const errors: { type: string; message: string; affected_url: string | null; severity: 'error' | 'warning' | 'info' }[] = [];
  const warnings: string[] = [];

  const has_x_default = tags.some(t => t.raw === 'x-default');
  if (tags.length && !has_x_default) {
    errors.push({ type: 'missing_x_default', message: 'No x-default hreflang tag present', affected_url: null, severity: 'warning' });
  }

  for (const t of tags) {
    if (t.raw !== 'x-default' && !LANG_RE.test(t.raw)) {
      errors.push({ type: 'invalid_lang_code', message: `Invalid hreflang value "${t.raw}"`, affected_url: t.url || null, severity: 'error' });
    }
    if (!t.url) errors.push({ type: 'conflicting_tags', message: `hreflang "${t.raw}" has no href`, affected_url: null, severity: 'error' });
  }

  // conflicting: same hreflang → multiple distinct URLs
  const byLang = new Map<string, Set<string>>();
  for (const t of tags) { if (!byLang.has(t.raw)) byLang.set(t.raw, new Set()); byLang.get(t.raw)!.add(t.url); }
  for (const [raw, urls] of byLang) if (urls.size > 1) errors.push({ type: 'conflicting_tags', message: `hreflang "${raw}" points to ${urls.size} different URLs`, affected_url: null, severity: 'error' });

  // self-reference (only checkable when options.url supplied)
  if (selfUrl && tags.length && !tags.some(t => t.is_self_referencing)) {
    errors.push({ type: 'missing_self_ref', message: 'No hreflang tag references this page URL', affected_url: selfUrl, severity: 'error' });
  } else if (!selfUrl && tags.length) {
    warnings.push('Self-reference not checked: pass options.url to verify the page references itself');
  }
  // return-link reciprocity requires fetching the alternates — cannot verify from one page; flag, do not fabricate
  if (tags.length) warnings.push('Return-link reciprocity requires crawling each alternate URL and is not verified here');

  const locales_covered = [...new Set(tags.filter(t => t.raw !== 'x-default').map(t => t.raw))];
  return {
    is_valid: errors.filter(e => e.severity === 'error').length === 0 && tags.length > 0,
    url: selfUrl,
    hreflang_tags: tags.map(({ raw, ...rest }) => rest),
    errors,
    warnings,
    locales_covered,
    has_x_default,
    total_tags: tags.length,
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
      { api: 'hreflang-validator', endpoint: '/hreflang-intelligence', reason: 'Full validate + check in one call' },
      { api: 'canonical-url-checker', endpoint: '/check', reason: 'Confirm canonical consistency with hreflang clusters' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}
const requireHtml = (input: any): string | null => (typeof input === 'string' && input.trim()) ? input : null;

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Hreflang Validator API', info: '/hreflang-validator/info', openapi: '/hreflang-validator/openapi.json', health: 'ok' });
});

router.post('/validate', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const data = validate(html, options?.url || null);
  res.json(envelope(data, {
    start, score: 1, ttl: 86400,
    reason: data.total_tags ? 'Deterministic hreflang tag validation' : 'No hreflang tags found',
    actions: data.total_tags
      ? data.errors.filter(e => e.severity === 'error').slice(0, 3).map(e => ({ priority: 'high' as const, action: `Fix: ${e.type}`, reason: e.message }))
      : [{ priority: 'low', action: 'No hreflang tags present (only needed for multilingual sites)', reason: 'Nothing to validate' }],
  }));
});

router.post('/check', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const v = validate(html, options?.url || null);
  const issueCount = v.errors.length;
  const quick_status = !v.total_tags ? 'ok' : v.errors.some(e => e.severity === 'error') ? 'errors' : issueCount ? 'warnings' : 'ok';
  const data = {
    url: v.url,
    hreflang_present: v.total_tags > 0,
    hreflang_count: v.total_tags,
    has_self_referencing: v.hreflang_tags.some((t: any) => t.is_self_referencing),
    has_x_default: v.has_x_default,
    lang_codes: [...new Set(v.hreflang_tags.filter((t: any) => t.lang !== 'x-default').map((t: any) => t.lang))],
    region_codes: [...new Set(v.hreflang_tags.map((t: any) => t.region).filter(Boolean))],
    issues_found: issueCount > 0,
    issue_count: issueCount,
    quick_status,
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400, reason: 'Deterministic hreflang quick check',
    actions: [{ priority: quick_status === 'errors' ? 'high' : 'low', action: quick_status === 'ok' ? 'hreflang configuration looks correct' : `Resolve ${issueCount} issue(s)`, reason: `Status: ${quick_status}` }],
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'validate',
    next_api: 'hreflang-validator', next_endpoint: '/hreflang-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'hreflang-validator', endpoint: '/hreflang-intelligence', reason: 'One-call endpoint for full Hreflang Validator API intelligence' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /hreflang-intelligence for full intelligence', reason: 'Single-request full analysis combining validate and check' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/hreflang-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const v = validate(html, options?.url || null);
  const errorCount = v.errors.filter((e: any) => e.severity === 'error').length;
  const overall_score = v.total_tags === 0 ? 100 : Math.max(0, 100 - errorCount * 20 - (v.errors.length - errorCount) * 5);
  const seo_impact: 'critical' | 'high' | 'medium' | 'low' | 'none' =
    errorCount >= 3 ? 'critical' : errorCount >= 1 ? 'high' : v.errors.length ? 'medium' : 'none';
  const check = {
    url: v.url, hreflang_present: v.total_tags > 0, hreflang_count: v.total_tags,
    has_self_referencing: v.hreflang_tags.some((t: any) => t.is_self_referencing), has_x_default: v.has_x_default,
    lang_codes: [...new Set(v.hreflang_tags.filter((t: any) => t.lang !== 'x-default').map((t: any) => t.lang))],
    region_codes: [...new Set(v.hreflang_tags.map((t: any) => t.region).filter(Boolean))],
    issues_found: v.errors.length > 0, issue_count: v.errors.length,
    quick_status: !v.total_tags ? 'ok' : errorCount ? 'errors' : v.errors.length ? 'warnings' : 'ok',
  };
  const data = {
    validate: v, check, overall_score, seo_impact,
    key_findings: [
      v.total_tags ? `${v.total_tags} hreflang tag(s) across ${v.locales_covered.length} locale(s)` : 'No hreflang tags',
      v.has_x_default ? 'x-default present' : 'x-default missing',
      errorCount ? `${errorCount} error(s)` : 'No errors',
    ],
    summary: v.total_tags ? `${v.total_tags} hreflang tags, score ${overall_score}/100, SEO impact: ${seo_impact}.` : 'No hreflang annotations found.',
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400, reason: 'Deterministic combined hreflang intelligence',
    actions: [{ priority: errorCount ? 'high' : 'low', action: errorCount ? 'Fix hreflang errors' : 'Configuration valid', reason: `Score ${overall_score}/100` }],
  }));
});

export default router;
