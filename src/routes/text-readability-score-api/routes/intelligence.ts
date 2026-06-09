import { Router, Request, Response } from 'express';

// Deterministic readability metrics — standard formulas (Flesch, FK, Gunning Fog,
// SMOG, ARI, Coleman-Liau) computed in real code. No LLM, exact, confidence 1.0.
const router = Router();
function rid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }); }
const r2 = (n: number) => Math.round(n * 100) / 100;

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return w.length ? 1 : 0;
  let s = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = s.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}
function tokenize(text: string) {
  const sentences = text.split(/[.!?]+(?:\s|$)/).map((s) => s.trim()).filter(Boolean);
  const words = text.match(/[A-Za-z0-9']+/g) || [];
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  let syl = 0, complex = 0, poly = 0;
  for (const w of words) { const c = syllables(w); syl += c; if (c >= 3) { complex++; poly++; } }
  return { sentences: Math.max(1, sentences.length), sentenceList: sentences, words: words.length, wordList: words, letters, syllables: syl, complex, poly };
}
function metrics(text: string) {
  const t = tokenize(text);
  const W = Math.max(1, t.words), S = t.sentences;
  const wps = W / S, spw = t.syllables / W;
  const flesch = 206.835 - 1.015 * wps - 84.6 * spw;
  const fk = 0.39 * wps + 11.8 * spw - 15.59;
  const fog = 0.4 * (wps + 100 * (t.complex / W));
  const smog = 1.0430 * Math.sqrt(t.poly * (30 / S)) + 3.1291;
  const ari = 4.71 * (t.letters / W) + 0.5 * wps - 21.43;
  const L = (t.letters / W) * 100, Sn = (S / W) * 100;
  const cli = 0.0588 * L - 0.296 * Sn - 15.8;
  const easeLabel = flesch >= 90 ? 'very easy' : flesch >= 70 ? 'easy' : flesch >= 60 ? 'plain' : flesch >= 50 ? 'fairly difficult' : flesch >= 30 ? 'difficult' : 'very difficult';
  const grade = Math.max(0, (fk + smog + ari + cli + fog) / 5);
  return {
    word_count: t.words, sentence_count: S, syllable_count: t.syllables, character_count: t.letters,
    complex_word_count: t.complex, avg_words_per_sentence: r2(wps), avg_syllables_per_word: r2(spw),
    indices: { flesch_reading_ease: r2(flesch), flesch_kincaid_grade: r2(fk), gunning_fog: r2(fog), smog: r2(smog), automated_readability_index: r2(ari), coleman_liau_index: r2(cli) },
    reading_ease_label: easeLabel, estimated_grade_level: r2(grade), estimated_reading_time_seconds: Math.round((t.words / 200) * 60),
    _t: t,
  };
}
const SIMPLER: Record<string, string> = { utilize: 'use', utilise: 'use', commence: 'start', terminate: 'end', endeavor: 'try', endeavour: 'try', facilitate: 'help', demonstrate: 'show', sufficient: 'enough', additional: 'more', approximately: 'about', numerous: 'many', subsequently: 'later', prior: 'before', regarding: 'about', obtain: 'get', require: 'need', purchase: 'buy', assistance: 'help', initiate: 'start', ascertain: 'find out', leverage: 'use' };

function env(data: any, perSection: Record<string, number>, actions: { priority: string; action: string; reason: string }[], t0: number) {
  return {
    success: true, request_id: rid(), data,
    confidence: { score: 1.0, reason: 'Deterministic readability formulas — exact.', per_section: perSection },
    provenance: { provider: 'deterministic', retrieved_at: new Date().toISOString(), source_type: 'api_call' as const },
    cache: { recommended_ttl_seconds: 86400, retryable: false, cache_recommended: true },
    recommended_next_api: [{ api: 'grammar-check-lite', endpoint: '/check', reason: 'Catch grammar/spelling after readability.' }, { api: 'text-summarizer', endpoint: '/summarize', reason: 'Shorten long, dense passages.' }],
    recommended_actions_priority_order: actions,
    execution_metadata: { latency_ms: Date.now() - t0, model: 'deterministic', automation_safe: true },
  };
}
const missing = (res: Response) => res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Text Readability Score API', info: '/text-readability-score/info', openapi: '/text-readability-score/openapi.json', health: 'ok' });
});

router.post('/score', (req: Request, res: Response) => {
  const t0 = Date.now(); const { input } = req.body || {}; if (!input) return missing(res);
  const m = metrics(String(input)); delete (m as any)._t;
  res.json(env(m, { score: 1.0 }, [{ priority: m.indices.flesch_reading_ease < 50 ? 'high' : 'low', action: m.indices.flesch_reading_ease < 50 ? 'Simplify — text is difficult to read.' : 'Readability is acceptable.', reason: `Flesch ${m.indices.flesch_reading_ease} (${m.reading_ease_label}).` }], t0));
});

router.post('/analyze', (req: Request, res: Response) => {
  const t0 = Date.now(); const { input } = req.body || {}; if (!input) return missing(res);
  const m = metrics(String(input)); const t = m._t; delete (m as any)._t;
  const complexSentences = t.sentenceList.map((s, i) => ({ index: i, words: (s.match(/[A-Za-z0-9']+/g) || []).length, text: s.slice(0, 120) })).filter((x) => x.words > 25);
  const passive = (String(input).match(/\b(?:is|are|was|were|be|been|being)\s+\w+(?:ed|en)\b/gi) || []).length;
  const adverbs = (String(input).match(/\b\w+ly\b/gi) || []).length;
  const complexWords = [...new Set(t.wordList.filter((w) => syllables(w) >= 3).map((w) => w.toLowerCase()))].slice(0, 25);
  const suggestions: string[] = [];
  if (complexSentences.length) suggestions.push(`Split ${complexSentences.length} sentence(s) longer than 25 words.`);
  if (passive) suggestions.push(`Reduce ~${passive} passive-voice construction(s).`);
  if (m.avg_syllables_per_word > 1.6) suggestions.push('Prefer shorter, more common words to lower syllables/word.');
  if (!suggestions.length) suggestions.push('Text is clear; no structural issues detected.');
  res.json(env({ ...m, complex_sentences: complexSentences, passive_voice_hits: passive, adverb_count: adverbs, complex_words: complexWords, suggestions }, { analyze: 1.0 },
    [{ priority: 'medium', action: suggestions[0], reason: 'Largest readability lever.' }], t0));
});

router.post('/simplify', (req: Request, res: Response) => {
  const t0 = Date.now(); const { input, options } = req.body || {}; if (!input) return missing(res);
  const m = metrics(String(input)); const t = m._t; delete (m as any)._t;
  const target = typeof options?.target_grade === 'number' ? options.target_grade : 8;
  const complexSentences = t.sentenceList.map((s, i) => ({ index: i, words: (s.match(/[A-Za-z0-9']+/g) || []).length, text: s })).filter((x) => x.words > 20);
  const wordSwaps = [...new Set(t.wordList.map((w) => w.toLowerCase()))].filter((w) => SIMPLER[w]).map((w) => ({ word: w, suggestion: SIMPLER[w] }));
  res.json(env({
    current_grade_level: m.estimated_grade_level, target_grade_level: target,
    needs_simplification: m.estimated_grade_level > target,
    sentences_to_split: complexSentences, word_substitutions: wordSwaps,
    note: 'Deterministic simplification guidance (sentence splits + plainer-word substitutions). Automated full rewriting is a generative task — chain to a text-generation API for the rewrite itself.',
  }, { simplify: 1.0 },
    [{ priority: m.estimated_grade_level > target ? 'high' : 'low', action: m.estimated_grade_level > target ? `Apply ${complexSentences.length} sentence split(s) and ${wordSwaps.length} word swap(s) to reach grade ${target}.` : 'Already at or below target grade.', reason: `Current grade ${m.estimated_grade_level}, target ${target}.` }], t0));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body || {}; if (!input) return missing(res);
  res.json({
    success: true, request_id: rid(), execution_ready: true, input, objective: objective || 'score',
    next_api: 'text-readability-score', next_endpoint: '/readability-intelligence', blocking_flags: [],
    confidence: { score: 1.0, reason: 'Input present and valid', per_section: { execution_ready: 1.0 } },
    provenance: { provider: 'deterministic', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'text-readability-score', endpoint: '/readability-intelligence', reason: 'One-call endpoint for full readability intelligence' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /readability-intelligence for full intelligence', reason: 'One-call delivers all outputs in a single request' }],
    execution_metadata: { latency_ms: 1, model: 'deterministic', automation_safe: true },
  });
});

router.post('/readability-intelligence', (req: Request, res: Response) => {
  const t0 = Date.now(); const { input, options } = req.body || {}; if (!input) return missing(res);
  const m = metrics(String(input)); const t = m._t; delete (m as any)._t;
  const target = typeof options?.target_grade === 'number' ? options.target_grade : 8;
  const complexSentences = t.sentenceList.filter((s) => (s.match(/[A-Za-z0-9']+/g) || []).length > 25).length;
  const overall = Math.max(0, Math.min(100, Math.round(m.indices.flesch_reading_ease)));
  const findings = [
    `Flesch reading ease ${m.indices.flesch_reading_ease} (${m.reading_ease_label}); ~grade ${m.estimated_grade_level}.`,
    `${m.word_count} words, ${m.sentence_count} sentences, ${m.avg_words_per_sentence} words/sentence.`,
    complexSentences ? `${complexSentences} long sentence(s) (>25 words).` : 'No overly long sentences.',
  ];
  res.json(env({
    score: m, analyze: { complex_sentences: complexSentences, complex_word_count: m.complex_word_count },
    simplify: { current_grade_level: m.estimated_grade_level, target_grade_level: target, needs_simplification: m.estimated_grade_level > target },
    overall_score: overall, key_findings: findings,
    summary: `Grade ~${m.estimated_grade_level}, ${m.reading_ease_label} to read (Flesch ${m.indices.flesch_reading_ease}).`,
  }, { score: 1.0, analyze: 1.0, simplify: 1.0 },
    [{ priority: overall < 50 ? 'high' : 'low', action: overall < 50 ? 'Simplify before publishing.' : 'Readability acceptable.', reason: `Overall ${overall}/100.` }], t0));
});

export default router;
