import { Router, Request, Response } from 'express';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic keyword-density engine -------------------------------------------------

const STOP_WORDS = new Set([
  'a','an','and','are','as','at','be','but','by','for','from','has','have','he','her','his','i',
  'in','is','it','its','of','on','or','that','the','their','them','they','this','to','was','were',
  'will','with','you','your','we','our','us','not','no','do','does','did','so','if','then','than',
  'too','very','can','could','should','would','may','might','must','shall','about','into','over',
  'after','before','above','below','up','down','out','off','again','further','once','here','there',
  'all','any','both','each','few','more','most','other','some','such','only','own','same','s','t',
  'she','him','me','my','myself','what','which','who','whom','these','those','am','been','being',
  'because','until','while','of','between','through','during','how','when','where','why',
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9'’-]*[a-z0-9]|[a-z0-9]/g) || []);
}

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

interface FreqEntry { keyword: string; count: number; density: number; }

function frequencies(tokens: string[], removeStop: boolean): { entries: FreqEntry[]; total: number; stopRemoved: number } {
  const total = tokens.length;
  const counts = new Map<string, number>();
  let stopRemoved = 0;
  for (const tok of tokens) {
    if (removeStop && STOP_WORDS.has(tok)) { stopRemoved++; continue; }
    counts.set(tok, (counts.get(tok) || 0) + 1);
  }
  const entries: FreqEntry[] = [...counts.entries()]
    .map(([keyword, count]) => ({ keyword, count, density: total ? round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword));
  return { entries, total, stopRemoved };
}

function bigrams(tokens: string[], topN: number) {
  const counts = new Map<string, number>();
  for (let i = 0; i < tokens.length - 1; i++) {
    const phrase = `${tokens[i]} ${tokens[i + 1]}`;
    counts.set(phrase, (counts.get(phrase) || 0) + 1);
  }
  const totalBigrams = Math.max(0, tokens.length - 1);
  return [...counts.entries()]
    .map(([phrase, count]) => ({ phrase, count, density: totalBigrams ? round((count / totalBigrams) * 100) : 0 }))
    .filter(b => b.count > 1)
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
    .slice(0, topN);
}

function densityRating(topDensity: number, wordCount: number): 'optimal' | 'over_stuffed' | 'under_optimized' | 'thin' {
  if (wordCount < 50) return 'thin';
  if (topDensity > 4) return 'over_stuffed';
  if (topDensity >= 1) return 'optimal';
  if (topDensity >= 0.3) return 'under_optimized';
  return 'thin';
}

function analyzeText(input: string, options: any) {
  const removeStop = options?.remove_stop_words !== false;
  const topN = Math.min(Math.max(parseInt(options?.top_n, 10) || 10, 1), 50);
  const title: string = typeof options?.title === 'string' ? options.title.toLowerCase() : '';
  const headings: string = Array.isArray(options?.headings) ? options.headings.join(' ').toLowerCase()
    : (typeof options?.headings === 'string' ? options.headings.toLowerCase() : '');

  const tokens = tokenize(input);
  const { entries, total, stopRemoved } = frequencies(tokens, removeStop);
  const top = entries.slice(0, topN).map(e => ({
    keyword: e.keyword,
    count: e.count,
    density: e.density,
    in_title: !!title && title.includes(e.keyword),
    in_headings: !!headings && headings.includes(e.keyword),
  }));
  const topDensity = top.length ? top[0].density : 0;
  return {
    word_count: total,
    unique_words: entries.length,
    top_keywords: top,
    bigrams: bigrams(tokens, topN),
    stop_words_removed: stopRemoved,
    density_rating: densityRating(topDensity, total),
  };
}

function optimizeText(input: string, options: any) {
  const idealMin = typeof options?.ideal_min === 'number' ? options.ideal_min : 1;
  const idealMax = typeof options?.ideal_max === 'number' ? options.ideal_max : 3;
  const idealMid = (idealMin + idealMax) / 2;

  const tokens = tokenize(input);
  const { entries, total } = frequencies(tokens, true);
  const densityOf = (kw: string) => {
    const e = entries.find(x => x.keyword === kw.toLowerCase());
    return e ? e.density : 0;
  };

  let targets: string[] = [];
  if (Array.isArray(options?.target_keywords)) targets = options.target_keywords.map((s: any) => String(s));
  else if (Array.isArray(options?.keywords)) targets = options.keywords.map((s: any) => String(s));
  else targets = entries.slice(0, 3).map(e => e.keyword);

  const recommendations = targets.map(kw => {
    const current = densityOf(kw);
    const action: 'increase' | 'decrease' | 'maintain' =
      current < idealMin ? 'increase' : current > idealMax ? 'decrease' : 'maintain';
    const idealCount = Math.round((idealMid / 100) * total);
    const currentCount = entries.find(e => e.keyword === kw.toLowerCase())?.count || 0;
    return {
      keyword: kw,
      current_density: current,
      target_density: idealMid,
      action,
      suggested_additions: action === 'increase' ? Math.max(0, idealCount - currentCount) : 0,
    };
  });

  return {
    target_keywords: targets,
    recommendations,
    ideal_density_range: { min: idealMin, max: idealMax },
  };
}

function compareText(input: string, options: any) {
  const text2: string = typeof options?.compare_to === 'string' ? options.compare_to
    : (typeof options?.text2 === 'string' ? options.text2 : '');

  const a = frequencies(tokenize(input), true);
  const b = frequencies(tokenize(text2), true);
  const dMap = (f: typeof a) => new Map(f.entries.map(e => [e.keyword, e.density]));
  const da = dMap(a), db = dMap(b);
  const all = new Set<string>([...da.keys(), ...db.keys()]);

  const topKeys = new Set<string>([
    ...a.entries.slice(0, 25).map(e => e.keyword),
    ...b.entries.slice(0, 25).map(e => e.keyword),
  ]);

  const gap_analysis = [...all].filter(k => topKeys.has(k)).map(keyword => {
    const d1 = da.get(keyword) || 0;
    const d2 = db.get(keyword) || 0;
    const opportunity: 'url1_advantage' | 'url2_advantage' | 'parity' =
      Math.abs(d1 - d2) < 0.2 ? 'parity' : d1 > d2 ? 'url1_advantage' : 'url2_advantage';
    return { keyword, url1_density: d1, url2_density: d2, opportunity };
  }).sort((x, y) => (y.url1_density + y.url2_density) - (x.url1_density + x.url2_density)).slice(0, 25);

  return {
    gap_analysis,
    unique_to_url1: a.entries.filter(e => !db.has(e.keyword)).slice(0, 15).map(e => e.keyword),
    unique_to_url2: b.entries.filter(e => !da.has(e.keyword)).slice(0, 15).map(e => e.keyword),
  };
}

function seoScore(analysis: ReturnType<typeof analyzeText>): number {
  let score = 50;
  if (analysis.density_rating === 'optimal') score += 35;
  else if (analysis.density_rating === 'under_optimized') score += 10;
  else if (analysis.density_rating === 'over_stuffed') score -= 10;
  else score -= 20; // thin
  // diversity bonus
  const diversity = analysis.word_count ? analysis.unique_words / analysis.word_count : 0;
  score += Math.round(Math.min(15, diversity * 30));
  return Math.max(0, Math.min(100, score));
}

// ---- envelope -----------------------------------------------------------------------------

function envelope(data: any, opts: {
  start: number;
  score: number;
  reason: string;
  per_section?: Record<string, number>;
  ttl: number;
  next_api: { api: string; endpoint: string; reason: string }[];
  actions: { priority: 'high' | 'medium' | 'low'; action: string; reason: string }[];
}) {
  return {
    success: true,
    request_id: rid(),
    data,
    confidence: { score: opts.score, reason: opts.reason, per_section: opts.per_section || {} },
    provenance: { provider: 'deterministic-compute', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl, retryable: false, cache_recommended: true },
    recommended_next_api: opts.next_api,
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}

const NEXT_API = [
  { api: 'keyword-density', endpoint: '/keyword-intelligence', reason: 'One-call endpoint for full Keyword Density intelligence' },
  { api: 'serp-snippet-preview', endpoint: '/serp-snippet-preview', reason: 'Preview how the page renders in search results' },
];

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Keyword Density API', info: '/keyword-density/info', openapi: '/keyword-density/openapi.json', health: 'ok' });
});

router.post('/analyze', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  if (!input || typeof input !== 'string') return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const data = analyzeText(input, options);
  res.json(envelope(data, {
    start, score: 1, reason: 'Deterministic token-frequency analysis',
    per_section: { density: 1, top_keywords: 1 }, ttl: 86400, next_api: NEXT_API,
    actions: [{ priority: data.density_rating === 'over_stuffed' ? 'high' : 'medium', action: data.density_rating === 'over_stuffed' ? 'Reduce keyword repetition to avoid over-optimization' : 'Review top keywords against target terms', reason: `Density rating: ${data.density_rating}` }],
  }));
});

router.post('/optimize', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  if (!input || typeof input !== 'string') return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const data = optimizeText(input, options);
  res.json(envelope(data, {
    start, score: 1, reason: 'Deterministic density optimization vs ideal range',
    per_section: { recommendations: 1 }, ttl: 86400, next_api: NEXT_API,
    actions: data.recommendations.filter(r => r.action !== 'maintain').slice(0, 3).map(r => ({
      priority: 'medium' as const, action: `${r.action === 'increase' ? 'Increase' : 'Reduce'} usage of "${r.keyword}"`, reason: `Current ${r.current_density}% vs target ${r.target_density}%`,
    })),
  }));
});

router.post('/compare', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  if (!input || typeof input !== 'string') return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const data = compareText(input, options);
  const hasSecond = typeof options?.compare_to === 'string' || typeof options?.text2 === 'string';
  res.json(envelope(data, {
    start, score: hasSecond ? 1 : 0.5, reason: hasSecond ? 'Deterministic keyword gap analysis' : 'No comparison text supplied (options.compare_to); single-document view only',
    per_section: { gap_analysis: hasSecond ? 1 : 0.5 }, ttl: 86400, next_api: NEXT_API,
    actions: [{ priority: 'medium', action: 'Target keywords where the comparison document has an advantage', reason: 'Close measurable density gaps' }],
  }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'analyze',
    next_api: 'keyword-density', next_endpoint: '/keyword-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: NEXT_API,
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /keyword-intelligence for full intelligence', reason: 'One-call delivers all outputs in a single request' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/keyword-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  if (!input || typeof input !== 'string') return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  const analysis = analyzeText(input, options);
  const optimization = optimizeText(input, options);
  const seo_score = seoScore(analysis);
  const key_findings = [
    `${analysis.word_count} words, ${analysis.unique_words} unique`,
    `Density rating: ${analysis.density_rating}`,
    analysis.top_keywords[0] ? `Top keyword "${analysis.top_keywords[0].keyword}" at ${analysis.top_keywords[0].density}%` : 'No keywords detected',
  ];
  const data = {
    density_rating: analysis.density_rating,
    analysis,
    optimization,
    seo_score,
    overall_score: seo_score,
    key_findings,
    summary: `Document scores ${seo_score}/100 for keyword optimization (${analysis.density_rating}).`,
  };
  res.json(envelope(data, {
    start, score: 1, reason: 'Deterministic combined keyword intelligence',
    per_section: { analysis: 1, optimization: 1, seo_score: 1 }, ttl: 86400, next_api: NEXT_API,
    actions: [{ priority: analysis.density_rating === 'optimal' ? 'low' : 'high', action: 'Adjust keyword density toward the 1–3% optimal range', reason: `Current rating: ${analysis.density_rating}` }],
  }));
});

export default router;
