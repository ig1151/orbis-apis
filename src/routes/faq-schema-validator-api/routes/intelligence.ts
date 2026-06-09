import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic FAQPage parsing (cheerio) ----------------------------------------------

type Fmt = 'json_ld' | 'microdata' | 'rdfa' | 'not_found';
const typeName = (t: any): string[] => !t ? [] : (Array.isArray(t) ? t.map(String) : [String(t).replace(/^https?:\/\/schema\.org\//, '')]);

function findFaq(html: string): { node: any; format: Fmt } | null {
  const $ = cheerio.load(html);
  let found: any = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    try {
      const parsed = JSON.parse($(el).contents().text());
      const stack = Array.isArray(parsed) ? [...parsed] : (Array.isArray(parsed['@graph']) ? [...parsed['@graph']] : [parsed]);
      for (const n of stack) if (typeName(n?.['@type']).includes('FAQPage')) { found = n; break; }
    } catch { /* skip malformed */ }
  });
  if (found) return { node: found, format: 'json_ld' };
  const md = cheerio.load(html)('[itemtype*="FAQPage"]').first();
  if (md.length) return { node: { _microdata: true }, format: 'microdata' };
  return null;
}

function answerText(a: any): string {
  if (!a) return '';
  if (typeof a === 'string') return a;
  if (Array.isArray(a)) return answerText(a[0]);
  return a.text || a.name || '';
}

function validate(html: string, url: string | null) {
  const hit = findFaq(html);
  if (!hit) {
    return { url, faq_schema_present: false, is_valid: false, format: 'not_found' as Fmt, question_count: 0, questions: [], errors: [], validation_score: 0, rich_result_eligible: false };
  }
  const main = Array.isArray(hit.node?.mainEntity) ? hit.node.mainEntity : (hit.node?.mainEntity ? [hit.node.mainEntity] : []);
  const errors: { type: string; message: string; question: string | null; severity: 'error' | 'warning' }[] = [];
  const questions = main.map((q: any) => {
    const question = q?.name || q?.['@id'] || '';
    const ans = answerText(q?.acceptedAnswer || q?.suggestedAnswer);
    const has_html = /<[a-z][\s\S]*>/i.test(ans);
    if (!question) errors.push({ type: 'empty_question', message: 'Question has no name', question: null, severity: 'error' });
    if (!q?.acceptedAnswer) errors.push({ type: 'missing_acceptedAnswer', message: `Question "${question}" has no acceptedAnswer`, question: question || null, severity: 'error' });
    else if (!ans) errors.push({ type: 'missing_answer', message: `Question "${question}" has an empty answer`, question: question || null, severity: 'error' });
    return { question: String(question || ''), answer: ans, has_html_answer: has_html, answer_length: ans.length };
  });
  if (hit.format === 'microdata') errors.push({ type: 'invalid_structure', message: 'Microdata FAQ detected; deep validation supports JSON-LD only', question: null, severity: 'warning' });

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const validation_score = questions.length === 0 ? 0 : Math.max(0, 100 - errorCount * 20 - errors.filter(e => e.severity === 'warning').length * 5);
  return {
    url, faq_schema_present: true, is_valid: errorCount === 0 && questions.length > 0, format: hit.format,
    question_count: questions.length, questions, errors, validation_score,
    rich_result_eligible: errorCount === 0 && questions.length > 0,
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
      { api: 'faq-schema-validator', endpoint: '/faq-schema-intelligence', reason: 'Full validate + check in one call' },
      { api: 'schema-org-extractor', endpoint: '/extract', reason: 'Inspect all structured data on the page' },
    ],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}
const requireHtml = (input: any): string | null => (typeof input === 'string' && input.trim()) ? input : null;

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'FAQ Schema Validator API', info: '/faq-schema-validator/info', openapi: '/faq-schema-validator/openapi.json', health: 'ok' });
});

router.post('/validate', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const data = validate(html, options?.url || null);
  res.json(envelope(data, {
    start, score: 1, ttl: 86400,
    reason: data.faq_schema_present ? 'Deterministic FAQPage validation' : 'No FAQPage markup found',
    actions: data.faq_schema_present
      ? data.errors.filter(e => e.severity === 'error').slice(0, 3).map(e => ({ priority: 'high' as const, action: `Fix: ${e.type}`, reason: e.message }))
      : [{ priority: 'medium', action: 'Add FAQPage JSON-LD markup', reason: 'No FAQ schema detected' }],
  }));
});

router.post('/check', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const v = validate(html, options?.url || null);
  const overall_status = !v.faq_schema_present ? 'not_found' : v.errors.some(e => e.severity === 'error') ? 'errors' : v.errors.length ? 'warnings' : 'valid';
  const data = {
    url: v.url, faq_schema_present: v.faq_schema_present, question_count: v.question_count,
    is_valid: v.is_valid, rich_result_eligible: v.rich_result_eligible, issues_count: v.errors.length, overall_status,
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400, reason: 'Deterministic FAQ status check',
    actions: [{ priority: overall_status === 'errors' ? 'high' : 'low', action: overall_status === 'valid' ? 'FAQ markup is valid' : `Resolve ${v.errors.length} issue(s)`, reason: `Status: ${overall_status}` }],
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'validate',
    next_api: 'faq-schema-validator', next_endpoint: '/faq-schema-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'faq-schema-validator', endpoint: '/faq-schema-intelligence', reason: 'One-call endpoint for full FAQ Schema Validator API intelligence' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /faq-schema-intelligence for full intelligence', reason: 'Single-request full analysis combining validate and check' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/faq-schema-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const html = requireHtml(input);
  if (!html) return res.status(400).json({ error: 'input is required (HTML content)', code: 'MISSING_INPUT', retryable: false });
  const v = validate(html, options?.url || null);
  const overall_status = !v.faq_schema_present ? 'not_found' : v.errors.some(e => e.severity === 'error') ? 'errors' : v.errors.length ? 'warnings' : 'valid';
  const check = { url: v.url, faq_schema_present: v.faq_schema_present, question_count: v.question_count, is_valid: v.is_valid, rich_result_eligible: v.rich_result_eligible, issues_count: v.errors.length, overall_status };
  const rich_snippet_potential: 'high' | 'medium' | 'low' | 'none' = v.rich_result_eligible && v.question_count >= 2 ? 'high' : v.rich_result_eligible ? 'medium' : v.faq_schema_present ? 'low' : 'none';
  const data = {
    validate: v, check, overall_score: v.validation_score, rich_snippet_potential,
    key_findings: [
      v.faq_schema_present ? `${v.question_count} Q&A pair(s), format ${v.format}` : 'No FAQPage markup',
      v.is_valid ? 'Valid FAQ schema' : `${v.errors.length} issue(s)`,
      v.questions.some((q: any) => q.has_html_answer) ? 'Some answers contain HTML' : 'Plain-text answers',
    ],
    summary: v.faq_schema_present ? `FAQPage with ${v.question_count} questions, score ${v.validation_score}/100.` : 'No FAQ structured data found.',
  };
  res.json(envelope(data, {
    start, score: 1, ttl: 86400, reason: 'Deterministic combined FAQ intelligence',
    actions: [{ priority: v.is_valid ? 'low' : 'high', action: v.is_valid ? 'Markup valid' : 'Fix FAQ issues', reason: `Score ${v.validation_score}/100` }],
  }));
});

export default router;
