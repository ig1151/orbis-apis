import { Router, Request, Response } from 'express';

// Deterministic URL-slug generation/validation — pure string transforms, no LLM.
const router = Router();

function rid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }); }
const DEFAULT_STOP = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'is', 'are', 'was', 'be']);

// Latin-1/common diacritic transliteration to ASCII (deterministic, no deps).
const TRANSLIT: Record<string, string> = { à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', ā: 'a', æ: 'ae', ç: 'c', è: 'e', é: 'e', ê: 'e', ë: 'e', ē: 'e', ì: 'i', í: 'i', î: 'i', ï: 'i', ī: 'i', ñ: 'n', ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o', ō: 'o', œ: 'oe', ù: 'u', ú: 'u', û: 'u', ü: 'u', ū: 'u', ý: 'y', ÿ: 'y', ß: 'ss', þ: 'th', ð: 'd' };
function transliterate(s: string): string {
  return s.normalize('NFKC').replace(/[^\x00-\x7F]/g, (ch) => TRANSLIT[ch.toLowerCase()] ?? '');
}

type Opts = { separator?: string; lowercase?: boolean; max_length?: number; remove_stop_words?: boolean; strict_ascii?: boolean };
function slugify(input: string, o: Opts = {}) {
  const sep = (typeof o.separator === 'string' && o.separator.length ? o.separator : '-')[0];
  const lower = o.lowercase !== false;
  let s = String(input).trim().replace(/&/g, ' and ');
  if (o.strict_ascii !== false) s = transliterate(s);
  if (lower) s = s.toLowerCase();
  let words = s.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (o.remove_stop_words) {
    const filtered = words.filter((w) => !DEFAULT_STOP.has(w.toLowerCase()));
    if (filtered.length) words = filtered; // never strip to empty
  }
  let slug = words.join(sep);
  const max = typeof o.max_length === 'number' && o.max_length > 0 ? Math.floor(o.max_length) : 0;
  let truncated = false;
  if (max && slug.length > max) {
    slug = slug.slice(0, max);
    const cut = slug.lastIndexOf(sep);
    if (cut > 0) slug = slug.slice(0, cut);
    slug = slug.replace(new RegExp(`\\${sep}+$`), '');
    truncated = true;
  }
  return { slug, separator: sep, word_count: words.length, length: slug.length, truncated, lowercase: lower };
}

const SLUG_RE = (sep: string) => new RegExp(`^[a-z0-9]+(?:\\${sep}[a-z0-9]+)*$`);
function validateSlug(candidate: string, o: Opts = {}) {
  const sep = (typeof o.separator === 'string' && o.separator.length ? o.separator : '-')[0];
  const issues: string[] = [];
  if (!candidate) issues.push('empty');
  if (candidate !== candidate.trim()) issues.push('leading_or_trailing_whitespace');
  if (/[A-Z]/.test(candidate)) issues.push('contains_uppercase');
  if (/\s/.test(candidate)) issues.push('contains_whitespace');
  if (/[^a-zA-Z0-9\-_]/.test(candidate)) issues.push('contains_special_or_non_ascii');
  if (new RegExp(`\\${sep}{2,}`).test(candidate)) issues.push('consecutive_separators');
  if (new RegExp(`^\\${sep}|\\${sep}$`).test(candidate)) issues.push('leading_or_trailing_separator');
  const normalized = slugify(candidate, o).slug;
  const valid = issues.length === 0 && SLUG_RE(sep).test(candidate);
  return { valid, issues, normalized, matches_normalized: candidate === normalized, separator: sep };
}

function splitBatch(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((x) => String(x)).filter((s) => s.trim());
  return String(input).split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
}

function envelope(data: any, perSection: Record<string, number>, nextApi: { api: string; endpoint: string; reason: string }[], actions: { priority: string; action: string; reason: string }[], t0: number) {
  return {
    success: true, request_id: rid(), data,
    confidence: { score: 1.0, reason: 'Deterministic string transformation — exact result.', per_section: perSection },
    provenance: { provider: 'deterministic', retrieved_at: new Date().toISOString(), source_type: 'api_call' as const },
    cache: { recommended_ttl_seconds: 86400, retryable: false, cache_recommended: true },
    recommended_next_api: nextApi,
    recommended_actions_priority_order: actions,
    execution_metadata: { latency_ms: Date.now() - t0, model: 'deterministic', automation_safe: true },
  };
}
const NEXT = [{ api: 'serp-snippet-preview', endpoint: '/preview', reason: 'Preview how the slugged URL appears in search results.' }, { api: 'canonical-url-checker', endpoint: '/check', reason: 'Validate canonical tagging for the new URL.' }];
const missing = (res: Response) => res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Slug Generator API', info: '/slug-generator/info', openapi: '/slug-generator/openapi.json', health: 'ok' });
});

router.post('/generate', (req: Request, res: Response) => {
  const t0 = Date.now(); const { input, options } = req.body || {};
  if (!input) return missing(res);
  const r = slugify(String(input), options || {});
  res.json(envelope({ input: String(input), ...r }, { generate: 1.0 }, NEXT,
    [{ priority: 'high', action: 'Use the slug in the URL path.', reason: 'RFC 3986-safe, lowercase, separator-normalized.' }], t0));
});

router.post('/validate', (req: Request, res: Response) => {
  const t0 = Date.now(); const { input, options } = req.body || {};
  if (!input) return missing(res);
  const v = validateSlug(String(input), options || {});
  res.json(envelope({ input: String(input), ...v }, { validate: 1.0 }, NEXT,
    v.valid ? [{ priority: 'low', action: 'Slug is valid — no change needed.', reason: 'Matches slug grammar.' }]
            : [{ priority: 'high', action: `Replace with normalized slug "${v.normalized}".`, reason: `Issues: ${v.issues.join(', ')}.` }], t0));
});

router.post('/batch', (req: Request, res: Response) => {
  const t0 = Date.now(); const { input, options } = req.body || {};
  if (!input) return missing(res);
  const items = splitBatch(input).map((text) => ({ input: text, ...slugify(text, options || {}) }));
  res.json(envelope({ count: items.length, items }, { batch: 1.0 }, NEXT,
    [{ priority: 'medium', action: 'De-duplicate any colliding slugs before persisting.', reason: 'Distinct titles can normalize to the same slug.' }], t0));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body || {};
  if (!input) return missing(res);
  res.json({
    success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'generate',
    next_api: 'slug-generator', next_endpoint: '/slug-intelligence', blocking_flags: [],
    confidence: { score: 1.0, reason: 'Input present and valid', per_section: { execution_ready: 1.0 } },
    provenance: { provider: 'deterministic', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'slug-generator', endpoint: '/slug-intelligence', reason: 'One-call endpoint for full Slug Generator intelligence' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /slug-intelligence for full intelligence', reason: 'One-call delivers all outputs in a single request' }],
    execution_metadata: { latency_ms: 1, model: 'deterministic', automation_safe: true },
  });
});

router.post('/slug-intelligence', (req: Request, res: Response) => {
  const t0 = Date.now(); const { input, options } = req.body || {};
  if (!input) return missing(res);
  const gen = slugify(String(input), options || {});
  const val = validateSlug(gen.slug, options || {});
  const findings: string[] = [];
  if (gen.truncated) findings.push(`Slug truncated to ${gen.length} chars at the max_length boundary.`);
  if (gen.length > 60) findings.push('Slug exceeds 60 chars — consider shortening for SEO.');
  if (String(input).split(/[^a-zA-Z0-9]+/).filter(Boolean).length !== gen.word_count) findings.push('Stop words or empty tokens were removed.');
  if (!findings.length) findings.push('Clean, SEO-friendly slug with no issues.');
  const score = Math.max(0, 100 - (gen.length > 60 ? 20 : 0) - (gen.length > 75 ? 20 : 0) - (val.valid ? 0 : 30));
  res.json(envelope({
    input: String(input), generate: gen, validate: val,
    overall_score: score, key_findings: findings,
    summary: `Generated slug "${gen.slug}" (${gen.length} chars, ${gen.word_count} words); valid=${val.valid}.`,
  }, { generate: 1.0, validate: 1.0, score: 1.0 }, NEXT,
    [{ priority: 'high', action: 'Adopt the generated slug.', reason: `Score ${score}/100.` }], t0));
});

export default router;
