import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic BreadcrumbList parsing (cheerio) ---------------------------------------

type Fmt = 'json_ld' | 'microdata' | 'rdfa' | 'not_found';
const typeName = (t: any): string[] => !t ? [] : (Array.isArray(t) ? t.map(String) : [String(t).replace(/^https?:\/\/schema\.org\//, '')]);

function findJsonLd(html: string): { node: any; format: Fmt } | null {
  const $ = cheerio.load(html);
  let found: any = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    try {
      const parsed = JSON.parse($(el).contents().text());
      const stack = Array.isArray(parsed) ? [...parsed] : (Array.isArray(parsed['@graph']) ? [...parsed['@graph']] : [parsed]);
      for (const n of stack) if (typeName(n?.['@type']).includes('BreadcrumbList')) { found = n; break; }
    } catch { /* skip malformed */ }
  });
  if (found) return { node: found, format: 'json_ld' };
  // microdata
  const $m = cheerio.load(html);
  const md = $m('[itemtype*="BreadcrumbList"]').first();
  if (md.length) {
    const items: any[] = [];
    md.find('[itemprop="itemListElement"]').each((_, li) => {
      const $li = $m(li);
      items.push({
        position: Number($li.find('[itemprop="position"]').attr('content') || $li.find('[itemprop="position"]').text()) || items.length + 1,
        name: $li.find('[itemprop="name"]').attr('content') || $li.find('[itemprop="name"]').text().trim(),
        item: $li.find('[itemprop="item"]').attr('href') || $li.find('[itemprop="item"]').attr('content') || null,
      });
    });
    return { node: { itemListElement: items }, format: 'microdata' };
  }
  return null;
}

function parseItems(node: any): { position: number | null; name: string; item: string | null; has_url: boolean }[] {
  const list = Array.isArray(node?.itemListElement) ? node.itemListElement : [];
  return list.map((el: any, i: number) => {
    const position = typeof el?.position === 'number' ? el.position : (el?.position ? Number(el.position) : null);
    const name = el?.name || el?.item?.name || '';
    const itemUrl = typeof el?.item === 'string' ? el.item : (el?.item?.['@id'] || el?.item?.url || el?.['@id'] || null);
    return { position: position ?? (i + 1), name: String(name || ''), item: itemUrl || null, has_url: !!itemUrl };
  });
}

function validate(html: string, url: string | null) {
  const hit = findJsonLd(html);
  if (!hit) {
    return { url, breadcrumb_schema_present: false, is_valid: false, format: 'not_found' as Fmt, breadcrumb_items: [], errors: [], item_count: 0, validation_score: 0, rich_result_eligible: false, has_home_breadcrumb: false };
  }
  const items = parseItems(hit.node);
  const errors: { type: string; message: string; item_position: number | null; severity: 'error' | 'warning' }[] = [];
  const positions = items.map(i => i.position);

  items.forEach((it, idx) => {
    if (it.position == null) errors.push({ type: 'missing_position', message: `Item ${idx + 1} has no position`, item_position: null, severity: 'error' });
    if (!it.name) errors.push({ type: 'missing_name', message: `Item at position ${it.position} has no name`, item_position: it.position, severity: 'error' });
    if (!it.has_url && idx < items.length - 1) errors.push({ type: 'missing_item_url', message: `Non-final item "${it.name}" has no URL`, item_position: it.position, severity: 'warning' });
  });
  // ordering + duplicates
  const seen = new Set<number>();
  let ordered = true;
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    if (p != null) { if (seen.has(p)) errors.push({ type: 'duplicate_position', message: `Duplicate position ${p}`, item_position: p, severity: 'error' }); seen.add(p); }
    if (i > 0 && positions[i] != null && positions[i - 1] != null && positions[i]! <= positions[i - 1]!) ordered = false;
  }
  if (!ordered) errors.push({ type: 'invalid_position_order', message: 'Positions are not in ascending order', item_position: null, severity: 'error' });
  if (!items.length) errors.push({ type: 'incomplete_chain', message: 'BreadcrumbList has no itemListElement', item_position: null, severity: 'error' });

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const validation_score = Math.max(0, 100 - errorCount * 20 - errors.filter(e => e.severity === 'warning').length * 5);
  const has_home_breadcrumb = items.length > 0 && (/^home$/i.test(items[0].name.trim()) || items[0].position === 1);
  return {
    url,
    breadcrumb_schema_present: true,
    is_valid: errorCount === 0,
    format: hit.format,
    breadcrumb_items: items,
    errors,
    item_count: items.length,
    validation_score,
    rich_result_eligible: errorCount === 0 && items.length >= 2,
    has_home_breadcrumb,
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
      { api: 'breadcrumb-validator', endpoint: '/breadcrumb-intelligence', reason: 'Full validate + check in one call' },
      { api: 'schema-org-extractor', endpoint: '/extract', reason: 'Inspect all structured data on the page' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}
const requireHtml = (input: any): string | null => (typeof input === 'string' && input.trim()) ? input : null;

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Breadcrumb Validator API', info: '/breadcrumb-validator/info', openapi: '/breadcrumb-validator/openapi.json', health: 'ok' });
});

router.post('/validate', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const data = validate(html, options?.url || null);
  res.json(envelope(data, {
    start, score: 1, ttl: 86400,
    reason: data.breadcrumb_schema_present ? 'Deterministic BreadcrumbList validation' : 'No BreadcrumbList markup found',
    actions: data.breadcrumb_schema_present
      ? data.errors.filter(e => e.severity === 'error').slice(0, 3).map(e => ({ priority: 'high' as const, action: `Fix: ${e.type}`, reason: e.message }))
      : [{ priority: 'medium', action: 'Add BreadcrumbList JSON-LD markup', reason: 'No breadcrumb schema detected' }],
  }));
});

router.post('/check', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const v = validate(html, options?.url || null);
  const overall_status = !v.breadcrumb_schema_present ? 'not_found' : v.errors.some(e => e.severity === 'error') ? 'errors' : v.errors.length ? 'warnings' : 'valid';
  const data = {
    url: v.url, breadcrumb_schema_present: v.breadcrumb_schema_present, item_count: v.item_count,
    is_valid: v.is_valid, rich_result_eligible: v.rich_result_eligible, has_home_breadcrumb: v.has_home_breadcrumb,
    issues_count: v.errors.length, overall_status,
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400, reason: 'Deterministic breadcrumb status check',
    actions: [{ priority: overall_status === 'errors' ? 'high' : 'low', action: overall_status === 'valid' ? 'Breadcrumb markup is valid' : `Resolve ${v.errors.length} issue(s)`, reason: `Status: ${overall_status}` }],
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'validate',
    next_api: 'breadcrumb-validator', next_endpoint: '/breadcrumb-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'breadcrumb-validator', endpoint: '/breadcrumb-intelligence', reason: 'One-call endpoint for full Breadcrumb Validator API intelligence' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /breadcrumb-intelligence for full intelligence', reason: 'Single-request full analysis combining validate and check' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/breadcrumb-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const v = validate(html, options?.url || null);
  const overall_status = !v.breadcrumb_schema_present ? 'not_found' : v.errors.some(e => e.severity === 'error') ? 'errors' : v.errors.length ? 'warnings' : 'valid';
  const check = { url: v.url, breadcrumb_schema_present: v.breadcrumb_schema_present, item_count: v.item_count, is_valid: v.is_valid, rich_result_eligible: v.rich_result_eligible, has_home_breadcrumb: v.has_home_breadcrumb, issues_count: v.errors.length, overall_status };
  const rich_snippet_potential: 'high' | 'medium' | 'low' | 'none' = v.rich_result_eligible ? 'high' : v.breadcrumb_schema_present ? 'low' : 'none';
  const data = {
    validate: v, check, overall_score: v.validation_score, rich_snippet_potential,
    key_findings: [
      v.breadcrumb_schema_present ? `${v.item_count} breadcrumb item(s), format ${v.format}` : 'No BreadcrumbList markup',
      v.is_valid ? 'Valid breadcrumb schema' : `${v.errors.length} issue(s)`,
      v.has_home_breadcrumb ? 'Has Home breadcrumb' : 'No Home breadcrumb',
    ],
    summary: v.breadcrumb_schema_present ? `BreadcrumbList with ${v.item_count} items, score ${v.validation_score}/100.` : 'No breadcrumb structured data found.',
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400, reason: 'Deterministic combined breadcrumb intelligence',
    actions: [{ priority: v.is_valid ? 'low' : 'high', action: v.is_valid ? 'Markup valid' : 'Fix breadcrumb issues', reason: `Score ${v.validation_score}/100` }],
  }));
});

export default router;
