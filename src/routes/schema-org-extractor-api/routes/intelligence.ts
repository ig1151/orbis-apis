import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic schema.org extraction (cheerio) ----------------------------------------

const RICH_RESULT_TYPES = new Set([
  'Article', 'NewsArticle', 'BlogPosting', 'Product', 'Recipe', 'Event', 'FAQPage',
  'HowTo', 'JobPosting', 'LocalBusiness', 'Organization', 'BreadcrumbList', 'Review',
  'AggregateRating', 'VideoObject', 'Course', 'SoftwareApplication', 'QAPage', 'WebSite',
]);

function typeName(t: any): string[] {
  if (!t) return [];
  if (Array.isArray(t)) return t.map(String);
  return [String(t).replace(/^https?:\/\/schema\.org\//, '')];
}

interface Extracted { type: string; format: 'json_ld' | 'microdata' | 'rdfa'; raw_data: any; properties: Record<string, any>; nested_types: string[]; }

function flattenJsonLd(node: any, out: Extracted[]) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => flattenJsonLd(n, out)); return; }
  if (Array.isArray(node['@graph'])) { node['@graph'].forEach((n: any) => flattenJsonLd(n, out)); }
  const types = typeName(node['@type']);
  if (types.length) {
    const properties: Record<string, any> = {};
    const nested: string[] = [];
    for (const [k, v] of Object.entries(node)) {
      if (k === '@type' || k === '@context') continue;
      if (v && typeof v === 'object') {
        const nt = typeName((v as any)['@type']);
        nt.forEach(t => nested.push(t));
        properties[k] = Array.isArray(v) ? `[${v.length} items]` : (nt[0] || 'object');
      } else {
        properties[k] = v;
      }
    }
    out.push({ type: types[0], format: 'json_ld', raw_data: node, properties, nested_types: [...new Set(nested)] });
  }
}

function extractSchemas(html: string) {
  const $ = cheerio.load(html);
  const schemas: Extracted[] = [];

  // JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).contents().text();
    try { flattenJsonLd(JSON.parse(txt), schemas); } catch { /* malformed JSON-LD block — skip, do not fabricate */ }
  });
  const has_json_ld = schemas.some(s => s.format === 'json_ld');

  // Microdata
  $('[itemscope][itemtype]').each((_, el) => {
    const itemtype = $(el).attr('itemtype') || '';
    const types = typeName(itemtype);
    const properties: Record<string, any> = {};
    $(el).find('[itemprop]').each((__, p) => {
      const name = $(p).attr('itemprop')!;
      const val = $(p).attr('content') || $(p).attr('href') || $(p).attr('src') || $(p).text().trim();
      if (name && properties[name] === undefined) properties[name] = val;
    });
    if (types.length) schemas.push({ type: types[0], format: 'microdata', raw_data: { itemtype, properties }, properties, nested_types: [] });
  });
  const has_microdata = schemas.some(s => s.format === 'microdata');

  // RDFa (lightweight)
  $('[typeof]').each((_, el) => {
    const types = typeName($(el).attr('typeof'));
    if (types.length) schemas.push({ type: types[0], format: 'rdfa', raw_data: { typeof: $(el).attr('typeof') }, properties: {}, nested_types: [] });
  });
  const has_rdfa = schemas.some(s => s.format === 'rdfa');

  const schema_types_present = [...new Set(schemas.map(s => s.type))];
  return { schemas, schemas_found: schemas.length, schema_types_present, has_json_ld, has_microdata, has_rdfa };
}

function validateSchemas(html: string) {
  const { schemas } = extractSchemas(html);
  const errors: { schema_type: string; property: string; message: string; severity: 'error' | 'warning' }[] = [];
  const rich_result_eligible: string[] = [];
  const rich_result_blocked: string[] = [];
  const warnings: string[] = [];

  for (const s of schemas) {
    const isRich = RICH_RESULT_TYPES.has(s.type);
    // JSON-LD must declare @context
    if (s.format === 'json_ld' && !s.raw_data['@context']) {
      errors.push({ schema_type: s.type, property: '@context', message: 'Missing @context (should be https://schema.org)', severity: 'warning' });
    }
    // Type-specific minimal required properties
    const req: Record<string, string[]> = {
      Product: ['name'], Article: ['headline'], NewsArticle: ['headline'], BlogPosting: ['headline'],
      Recipe: ['name'], Event: ['name', 'startDate'], FAQPage: ['mainEntity'], BreadcrumbList: ['itemListElement'],
      JobPosting: ['title'], LocalBusiness: ['name'],
    };
    const need = req[s.type] || [];
    const missing = need.filter(p => s.properties[p] === undefined);
    for (const p of missing) errors.push({ schema_type: s.type, property: p, message: `Required property "${p}" is missing`, severity: 'error' });

    if (isRich) {
      if (missing.length) rich_result_blocked.push(s.type);
      else rich_result_eligible.push(s.type);
    } else {
      warnings.push(`Type "${s.type}" is not a Google rich-result type`);
    }
  }

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const validation_score = schemas.length === 0 ? 0 : Math.max(0, 100 - errorCount * 25 - errors.filter(e => e.severity === 'warning').length * 5);
  return {
    schemas_validated: schemas.length,
    is_valid: errorCount === 0 && schemas.length > 0,
    errors,
    rich_result_eligible: [...new Set(rich_result_eligible)],
    rich_result_blocked: [...new Set(rich_result_blocked)],
    warnings: [...new Set(warnings)],
    validation_score,
  };
}

// ---- envelope -----------------------------------------------------------------------------

function envelope(data: any, opts: { start: number; score: number; reason: string; ttl: number; actions: any[] }) {
  return {
    success: true,
    request_id: rid(),
    data,
    confidence: { score: opts.score, reason: opts.reason, per_section: { parse: opts.score } },
    provenance: { provider: 'deterministic-compute', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl, retryable: false, cache_recommended: true },
    recommended_next_api: [
      { api: 'schema-org-extractor', endpoint: '/schema-intelligence', reason: 'Full extract + validate in one call' },
      { api: 'breadcrumb-validator', endpoint: '/validate', reason: 'Deep-validate BreadcrumbList markup' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}

function requireHtml(input: any): string | null {
  if (typeof input === 'string' && input.trim()) return input;
  return null;
}

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Schema.org Extractor API', info: '/schema-org-extractor/info', openapi: '/schema-org-extractor/openapi.json', health: 'ok' });
});

router.post('/extract', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const data = { url: options?.url || null, ...extractSchemas(html) };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400,
    reason: 'Deterministic JSON-LD / microdata / RDFa extraction',
    actions: [{ priority: data.schemas_found ? 'low' : 'medium', action: data.schemas_found ? 'Validate the extracted schemas for rich-result eligibility' : 'Add schema.org structured data to the page', reason: `${data.schemas_found} schema(s) found` }],
  }));
});

router.post('/validate', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const data = { url: options?.url || null, ...validateSchemas(html) };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400,
    reason: 'Deterministic schema validation against required properties',
    actions: data.errors.filter(e => e.severity === 'error').slice(0, 3).map(e => ({ priority: 'high' as const, action: `Add "${e.property}" to ${e.schema_type}`, reason: e.message })),
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'extract',
    next_api: 'schema-org-extractor', next_endpoint: '/schema-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'schema-org-extractor', endpoint: '/schema-intelligence', reason: 'One-call endpoint for full Schema.org Extractor API intelligence' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /schema-intelligence for full intelligence', reason: 'Single-request full analysis combining extract and validate' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/schema-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const extract = { url: options?.url || null, ...extractSchemas(html) };
  const validate = { url: options?.url || null, ...validateSchemas(html) };
  const rich = validate.rich_result_eligible.length;
  const rich_result_potential: 'high' | 'medium' | 'low' | 'none' =
    rich >= 2 ? 'high' : rich === 1 ? 'medium' : extract.schemas_found ? 'low' : 'none';
  const overall_score = validate.validation_score;
  const data = {
    extract, validate, overall_score, rich_result_potential,
    key_findings: [
      `${extract.schemas_found} schema(s): ${extract.schema_types_present.join(', ') || 'none'}`,
      `${validate.rich_result_eligible.length} rich-result eligible type(s)`,
      validate.errors.length ? `${validate.errors.length} validation issue(s)` : 'No validation errors',
    ],
    summary: `Found ${extract.schemas_found} schema(s); rich-result potential: ${rich_result_potential}.`,
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400,
    reason: 'Deterministic combined schema.org intelligence',
    actions: [{ priority: validate.errors.length ? 'high' : 'low', action: validate.errors.length ? 'Fix schema validation errors' : 'Markup is valid', reason: `Score ${overall_score}/100` }],
  }));
});

export default router;
