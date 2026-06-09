import { Router, Request, Response } from 'express';

// Deterministic URL-structure scoring — real URL parsing + fixed SEO heuristics. No LLM.
const router = Router();
const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); });
const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'is', 'are', 'page', 'html', 'php']);
const gradeFor = (s: number) => (s >= 90 ? 'A' : s >= 75 ? 'B' : s >= 60 ? 'C' : s >= 40 ? 'D' : 'F');

function parse(input: string) {
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`); } catch { return null; }
  const segments = u.pathname.split('/').filter(Boolean);
  const query: Record<string, string> = {};
  u.searchParams.forEach((v, k) => { query[k] = v; });
  return { u, segments, query };
}
function score(input: string, opts: any = {}) {
  const p = parse(input);
  if (!p) return null;
  const { u, segments } = p;
  const path = u.pathname;
  const url_length = (u.host + u.pathname + u.search).length;
  const depth = segments.length;
  const pathWords = segments.join('-').split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const uses_hyphens = path.includes('-');
  const uses_underscores = path.includes('_');
  const has_stop_words = pathWords.some((w) => STOP.has(w.toLowerCase()));
  const has_numbers = /\d/.test(path) && !/^\/?\d{4}\//.test(path);
  const is_lowercase = path === path.toLowerCase();
  const targets: string[] = Array.isArray(opts.target_keywords) ? opts.target_keywords.map((k: string) => String(k).toLowerCase()) : [];
  const meaningful = pathWords.filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()));
  const has_keywords = targets.length ? targets.some((k) => path.toLowerCase().includes(k)) : meaningful.length > 0;

  const length_score = url_length <= 60 ? 100 : url_length <= 75 ? 85 : url_length <= 100 ? 60 : url_length <= 130 ? 35 : 15;
  const depth_score = depth <= 2 ? 100 : depth === 3 ? 85 : depth === 4 ? 60 : 35;
  const hyphen_score = uses_underscores ? 40 : uses_hyphens ? 100 : depth === 0 ? 100 : 70;
  const keyword_score = targets.length ? (has_keywords ? 100 : 30) : (meaningful.length ? 90 : 50);
  let readability_score = 100;
  if (!is_lowercase) readability_score -= 25;
  if (has_stop_words) readability_score -= 15;
  if (has_numbers) readability_score -= 15;
  if (uses_underscores) readability_score -= 15;
  if (Object.keys(p.query).length > 2) readability_score -= 15;
  readability_score = Math.max(0, readability_score);
  const overall = Math.round(length_score * 0.2 + depth_score * 0.2 + hyphen_score * 0.15 + keyword_score * 0.25 + readability_score * 0.2);
  return {
    url: u.href, overall_score: overall, grade: gradeFor(overall),
    length_score, keyword_score, hyphen_score, depth_score, readability_score,
    url_length, depth, has_keywords, uses_hyphens, has_stop_words, has_numbers, is_lowercase,
    _p: p,
  };
}
function analyze(input: string) {
  const s = score(input);
  if (!s) return null;
  const { u, segments } = s._p;
  const issues: { type: string; severity: string; description: string; fix: string }[] = [];
  if (!s.is_lowercase) issues.push({ type: 'uppercase', severity: 'warning', description: 'URL path contains uppercase characters.', fix: 'Lowercase the entire path.' });
  if (s.uses_hyphens === false && s.depth > 0 && u.pathname.includes('_')) issues.push({ type: 'underscores', severity: 'warning', description: 'Underscores used as word separators.', fix: 'Use hyphens (-) instead of underscores (_).' });
  if (s.has_stop_words) issues.push({ type: 'stop_words', severity: 'info', description: 'Path contains stop words.', fix: 'Remove low-value stop words from the slug.' });
  if (s.url_length > 75) issues.push({ type: 'length', severity: s.url_length > 100 ? 'error' : 'warning', description: `URL is ${s.url_length} chars.`, fix: 'Shorten to under 75 characters.' });
  if (s.depth > 3) issues.push({ type: 'depth', severity: 'warning', description: `Path is ${s.depth} levels deep.`, fix: 'Flatten the hierarchy to ≤3 levels.' });
  if (s.has_numbers) issues.push({ type: 'numbers', severity: 'info', description: 'Path contains numeric IDs.', fix: 'Prefer descriptive keywords over numeric IDs where possible.' });
  const query: Record<string, string> = {};
  u.searchParams.forEach((v, k) => { query[k] = v; });
  const suggested_url = `${u.protocol}//${u.host}/${segments.join('/').toLowerCase().replace(/_/g, '-')}`;
  return { url: u.href, protocol: u.protocol.replace(':', ''), domain: u.host, path_segments: segments, query_params: query, fragment: u.hash ? u.hash.slice(1) : null, issues, suggested_url };
}
function env(data: any, perSection: Record<string, number>, actions: { priority: string; action: string; reason: string }[], t0: number) {
  return {
    success: true, request_id: rid(), data,
    confidence: { score: 1.0, reason: 'Deterministic URL parsing + fixed SEO scoring.', per_section: perSection },
    provenance: { provider: 'deterministic', retrieved_at: new Date().toISOString(), source_type: 'api_call' as const },
    cache: { recommended_ttl_seconds: 86400, retryable: false, cache_recommended: true },
    recommended_next_api: [{ api: 'slug-generator', endpoint: '/generate', reason: 'Regenerate a clean slug for low-scoring paths.' }, { api: 'canonical-url-checker', endpoint: '/check', reason: 'Verify canonical tagging.' }],
    recommended_actions_priority_order: actions,
    execution_metadata: { latency_ms: Date.now() - t0, model: 'deterministic', automation_safe: true },
  };
}
const missing = (res: Response) => res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
const badUrl = (res: Response) => res.status(400).json({ error: 'input is not a parseable URL', code: 'INVALID_URL', retryable: false });

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'URL Structure Scorer API', info: '/url-structure-scorer/info', openapi: '/url-structure-scorer/openapi.json', health: 'ok' });
});

router.post('/score', (req: Request, res: Response) => {
  const t0 = Date.now(); const { input, options } = req.body || {}; if (!input) return missing(res);
  const s = score(String(input), options || {}); if (!s) return badUrl(res);
  delete (s as any)._p;
  res.json(env(s, { score: 1.0 }, [{ priority: s.overall_score < 60 ? 'high' : 'low', action: s.overall_score < 60 ? 'Restructure URL — below SEO threshold.' : 'URL structure is solid.', reason: `Score ${s.overall_score}/100 (grade ${s.grade}).` }], t0));
});

router.post('/analyze', (req: Request, res: Response) => {
  const t0 = Date.now(); const { input } = req.body || {}; if (!input) return missing(res);
  const a = analyze(String(input)); if (!a) return badUrl(res);
  res.json(env(a, { analyze: 1.0 }, [{ priority: a.issues.length ? 'high' : 'low', action: a.issues.length ? `Fix ${a.issues.length} structural issue(s); suggested: ${a.suggested_url}` : 'No structural issues.', reason: a.issues.map((i) => i.type).join(', ') || 'clean' }], t0));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body || {}; if (!input) return missing(res);
  res.json({
    success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'analyze',
    next_api: 'url-structure-scorer', next_endpoint: '/url-structure-intelligence', blocking_flags: [],
    confidence: { score: 1.0, reason: 'Input present and valid', per_section: { execution_ready: 1.0 } },
    provenance: { provider: 'deterministic', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'url-structure-scorer', endpoint: '/url-structure-intelligence', reason: 'Full URL Structure Scorer intelligence in one call' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /url-structure-intelligence', reason: 'Single-request full analysis' }],
    execution_metadata: { latency_ms: 1, model: 'deterministic', automation_safe: true },
  });
});

router.post('/url-structure-intelligence', (req: Request, res: Response) => {
  const t0 = Date.now(); const { input, options } = req.body || {}; if (!input) return missing(res);
  const s = score(String(input), options || {}); const a = analyze(String(input));
  if (!s || !a) return badUrl(res);
  delete (s as any)._p;
  const findings = [`Score ${s.overall_score}/100 (grade ${s.grade}).`, `${s.url_length} chars, depth ${s.depth}.`, a.issues.length ? `${a.issues.length} issue(s): ${a.issues.map((i) => i.type).join(', ')}.` : 'No structural issues.'];
  res.json(env({ score: s, analyze: a, overall_score: s.overall_score, grade: s.grade, key_findings: findings, summary: `URL scores ${s.overall_score}/100 (${s.grade}); ${a.issues.length} issue(s).` }, { score: 1.0, analyze: 1.0 },
    [{ priority: s.overall_score < 60 ? 'high' : 'low', action: s.overall_score < 60 ? `Adopt suggested URL: ${a.suggested_url}` : 'No change needed.', reason: `Grade ${s.grade}.` }], t0));
});

export default router;
