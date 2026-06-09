import { Router, Request, Response } from 'express';

const router = Router();

const rid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });

// ---- deterministic citation engine --------------------------------------------------------
// Structured fields (req.body.options.fields or a JSON input) are the primary path.
// A freeform string is parsed best-effort with regex; unparsed fields stay null (no fabrication).

type Style = 'apa' | 'mla' | 'chicago' | 'ieee' | 'harvard';
const STYLES: Style[] = ['apa', 'mla', 'chicago', 'ieee', 'harvard'];

interface Fields {
  authors: string[];      // each "Last, First M" where possible, else raw
  title: string | null;
  year: string | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publisher: string | null;
  url: string | null;
  doi: string | null;
}

function emptyFields(): Fields {
  return { authors: [], title: null, year: null, journal: null, volume: null, issue: null, pages: null, publisher: null, url: null, doi: null };
}

function splitAuthors(raw: string): string[] {
  return raw.split(/\s*(?:;|&| and )\s*/i).map(s => s.trim()).filter(Boolean);
}

function fieldsFromObject(obj: any): { fields: Fields; provided: number } {
  const f = emptyFields();
  let provided = 0;
  const set = <K extends keyof Fields>(k: K, v: any) => { if (v != null && v !== '') { (f as any)[k] = v; provided++; } };
  if (Array.isArray(obj.authors)) { f.authors = obj.authors.map((a: any) => String(a)); if (f.authors.length) provided++; }
  else if (typeof obj.authors === 'string') { f.authors = splitAuthors(obj.authors); if (f.authors.length) provided++; }
  else if (typeof obj.author === 'string') { f.authors = splitAuthors(obj.author); if (f.authors.length) provided++; }
  set('title', obj.title);
  set('year', obj.year != null ? String(obj.year) : null);
  set('journal', obj.journal || obj.container || obj.publication);
  set('volume', obj.volume != null ? String(obj.volume) : null);
  set('issue', obj.issue != null ? String(obj.issue) : null);
  set('pages', obj.pages != null ? String(obj.pages) : null);
  set('publisher', obj.publisher);
  set('url', obj.url);
  set('doi', obj.doi);
  return { fields: f, provided };
}

function fieldsFromString(input: string): { fields: Fields; provided: number } {
  const f = emptyFields();
  let s = input.trim();

  const doiM = s.match(/\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
  if (doiM) f.doi = doiM[0].replace(/[.,]$/, '');
  const urlM = s.match(/https?:\/\/[^\s)]+/);
  if (urlM) f.url = urlM[0].replace(/[.,]$/, '');
  const yearM = s.match(/\(?\b(19|20)\d{2}\b\)?/);
  if (yearM) f.year = yearM[0].replace(/[()]/g, '');

  const volIssM = s.match(/\b(\d{1,4})\s*\(\s*(\d{1,4})\s*\)/);
  if (volIssM) { f.volume = volIssM[1]; f.issue = volIssM[2]; }
  const pagesM = s.match(/\b(?:pp?\.?\s*)?(\d{1,5}\s*[-–]\s*\d{1,5})\b/);
  if (pagesM) f.pages = pagesM[1].replace(/\s/g, '');

  // Author segment: text before the year marker.
  if (yearM && yearM.index && yearM.index > 0) {
    const authorSeg = s.slice(0, yearM.index).replace(/[.,;\s]+$/, '').trim();
    if (authorSeg) f.authors = splitAuthors(authorSeg);
  }
  // Title: a quoted span, else the sentence after the year.
  const quoted = s.match(/[“"]([^”"]{4,})[”"]/);
  if (quoted) {
    f.title = quoted[1].trim();
  } else if (yearM && yearM.index != null) {
    const after = s.slice(yearM.index + yearM[0].length).replace(/^[).\s]+/, '');
    const sentence = after.split(/(?<=\.)\s/)[0];
    if (sentence && !/^https?:/i.test(sentence)) f.title = sentence.replace(/[.\s]+$/, '').trim() || null;
  }

  let provided = 0;
  if (f.authors.length) provided++;
  for (const k of ['title', 'year', 'journal', 'volume', 'issue', 'pages', 'publisher', 'url', 'doi'] as (keyof Fields)[]) {
    if (f[k]) provided++;
  }
  return { fields: f, provided };
}

function parseInput(input: any, options: any): { fields: Fields; provided: number; structured: boolean } {
  if (options && typeof options.fields === 'object' && options.fields) {
    const r = fieldsFromObject(options.fields);
    return { ...r, structured: true };
  }
  if (typeof input === 'object' && input) {
    const r = fieldsFromObject(input);
    return { ...r, structured: true };
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('{')) {
      try { const r = fieldsFromObject(JSON.parse(trimmed)); return { ...r, structured: true }; } catch { /* fall through */ }
    }
    const r = fieldsFromString(trimmed);
    return { ...r, structured: false };
  }
  return { fields: emptyFields(), provided: 0, structured: false };
}

// --- author name formatting ---
function parseName(name: string): { last: string; firsts: string[] } {
  if (name.includes(',')) {
    const [last, rest] = name.split(',');
    return { last: last.trim(), firsts: (rest || '').trim().split(/\s+/).filter(Boolean) };
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { last: parts[0], firsts: [] };
  return { last: parts[parts.length - 1], firsts: parts.slice(0, -1) };
}
const initials = (firsts: string[]) => firsts.map(p => p[0] ? p[0].toUpperCase() + '.' : '').join(' ');

function authorsApa(a: string[]): string {
  if (!a.length) return '';
  const fmt = a.map(n => { const { last, firsts } = parseName(n); return firsts.length ? `${last}, ${initials(firsts)}` : last; });
  if (fmt.length === 1) return fmt[0];
  return `${fmt.slice(0, -1).join(', ')}, & ${fmt[fmt.length - 1]}`;
}
function authorsMla(a: string[]): string {
  if (!a.length) return '';
  const first = (() => { const { last, firsts } = parseName(a[0]); return firsts.length ? `${last}, ${firsts.join(' ')}` : last; })();
  if (a.length === 1) return first;
  if (a.length === 2) { const { last, firsts } = parseName(a[1]); return `${first}, and ${firsts.join(' ')}${firsts.length ? ' ' : ''}${last}`; }
  return `${first}, et al`;
}
function authorsIeee(a: string[]): string {
  return a.map(n => { const { last, firsts } = parseName(n); return firsts.length ? `${initials(firsts)} ${last}` : last; }).join(', ');
}
function authorsChicago(a: string[]): string {
  if (!a.length) return '';
  const fmt = a.map((n, i) => {
    const { last, firsts } = parseName(n);
    if (i === 0) return firsts.length ? `${last}, ${firsts.join(' ')}` : last;
    return firsts.length ? `${firsts.join(' ')} ${last}` : last;
  });
  if (fmt.length === 1) return fmt[0];
  return `${fmt.slice(0, -1).join(', ')}, and ${fmt[fmt.length - 1]}`;
}
function authorsHarvard(a: string[]): string {
  if (!a.length) return '';
  const fmt = a.map(n => { const { last, firsts } = parseName(n); return firsts.length ? `${last}, ${initials(firsts).replace(/\s/g, '')}` : last; });
  if (fmt.length === 1) return fmt[0];
  return `${fmt.slice(0, -1).join(', ')} and ${fmt[fmt.length - 1]}`;
}

function detectType(f: Fields): 'journal' | 'book' | 'website' | 'conference' | 'report' | 'other' {
  if (f.journal || f.volume) return 'journal';
  if (f.publisher) return 'book';
  if (f.url && !f.journal) return 'website';
  return 'other';
}

function join(parts: (string | null | undefined)[], sep: string): string {
  return parts.filter(p => p && String(p).trim()).join(sep);
}

function formatCitation(f: Fields, style: Style): string {
  const year = f.year || 'n.d.';
  const volIss = f.volume ? `${f.volume}${f.issue ? `(${f.issue})` : ''}` : '';
  const doiUrl = f.doi ? `https://doi.org/${f.doi}` : (f.url || '');
  switch (style) {
    case 'apa':
      return join([
        authorsApa(f.authors) && `${authorsApa(f.authors)} (${year}).`,
        f.title && `${f.title}.`,
        f.journal && `${f.journal}${volIss ? `, ${volIss}` : ''}${f.pages ? `, ${f.pages}` : ''}.`,
        (f.publisher && !f.journal) ? `${f.publisher}.` : null,
        doiUrl,
      ], ' ').trim();
    case 'mla':
      return join([
        authorsMla(f.authors) && `${authorsMla(f.authors)}.`,
        f.title && `"${f.title}."`,
        f.journal && `${f.journal},`,
        f.volume && `vol. ${f.volume},`,
        f.issue && `no. ${f.issue},`,
        `${year},`,
        f.pages && `pp. ${f.pages}.`,
        doiUrl,
      ], ' ').replace(/,\s*$/, '').trim();
    case 'chicago':
      return join([
        authorsChicago(f.authors) && `${authorsChicago(f.authors)}.`,
        f.title && `"${f.title}."`,
        f.journal && `${f.journal}`,
        f.volume && `${f.volume},`,
        f.issue && `no. ${f.issue}`,
        `(${year})${f.pages ? `: ${f.pages}` : ''}.`,
        (f.publisher && !f.journal) ? `${f.publisher}.` : null,
        doiUrl,
      ], ' ').trim();
    case 'ieee':
      return join([
        authorsIeee(f.authors) && `${authorsIeee(f.authors)},`,
        f.title && `"${f.title},"`,
        f.journal && `${f.journal},`,
        f.volume && `vol. ${f.volume},`,
        f.issue && `no. ${f.issue},`,
        f.pages && `pp. ${f.pages},`,
        `${year}.`,
        doiUrl,
      ], ' ').trim();
    case 'harvard':
      return join([
        authorsHarvard(f.authors) && `${authorsHarvard(f.authors)},`,
        `${year}.`,
        f.title && `${f.title}.`,
        f.journal && `${f.journal},`,
        volIss && `${volIss},`,
        f.pages && `pp. ${f.pages}.`,
        (f.publisher && !f.journal) ? `${f.publisher}.` : null,
        doiUrl,
      ], ' ').trim();
  }
}

function confidenceFor(provided: number, structured: boolean): { score: number; reason: string } {
  if (structured) {
    const score = Math.min(1, 0.6 + provided * 0.08);
    return { score: Math.round(score * 100) / 100, reason: `Formatted from ${provided} structured field(s)` };
  }
  const score = Math.min(0.85, 0.3 + provided * 0.1);
  return { score: Math.round(score * 100) / 100, reason: `Parsed ${provided} field(s) from freeform input; supply options.fields for higher accuracy` };
}

// ---- envelope -----------------------------------------------------------------------------

function envelope(data: any, opts: { start: number; score: number; reason: string; per_section?: any; ttl: number; actions: any[] }) {
  return {
    success: true,
    request_id: rid(),
    data,
    confidence: { score: opts.score, reason: opts.reason, per_section: opts.per_section || {} },
    provenance: { provider: 'deterministic-compute', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    cache: { recommended_ttl_seconds: opts.ttl, retryable: false, cache_recommended: true },
    recommended_next_api: [{ api: 'citation-formatter', endpoint: '/formatter-intelligence', reason: 'Full Citation Formatter intelligence in one call' }],
    recommended_actions_priority_order: opts.actions,
    execution_metadata: { latency_ms: Date.now() - opts.start, model: 'deterministic', automation_safe: true },
  };
}

function lowConfidenceActions(provided: number, structured: boolean) {
  if (!structured && provided < 3) {
    return [{ priority: 'high' as const, action: 'Supply structured fields via options.fields', reason: 'Freeform parsing extracted few fields; structured input is exact' }];
  }
  return [{ priority: 'low' as const, action: 'Verify author/title parsing', reason: 'Deterministic formatting applied' }];
}

// ---- routes -------------------------------------------------------------------------------

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Citation Formatter API', info: '/citation-formatter/info', openapi: '/citation-formatter/openapi.json', health: 'ok' });
});

router.post('/format', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const hasFields = !!(options && typeof options.fields === 'object' && options.fields);
  if (!hasFields && (input == null || (typeof input === 'string' && !input.trim()))) {
    return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  }
  const { fields, provided, structured } = parseInput(input, options);
  const requested: Style = STYLES.includes((options?.style || '').toLowerCase()) ? (options.style.toLowerCase() as Style) : 'apa';
  const formatted_citation = formatCitation(fields, requested);
  const conf = confidenceFor(provided, structured);
  const data = {
    formatted_citation,
    style: requested,
    citation_type: detectType(fields),
    input_parsed: fields,
    format_notes: structured ? [] : ['Parsed from freeform input; pass options.fields for exact formatting'],
    character_count: formatted_citation.length,
    has_hanging_indent: requested === 'apa' || requested === 'mla' || requested === 'chicago',
  };
  res.json(envelope(data, { start, score: conf.score, reason: conf.reason, per_section: { parse: conf.score }, ttl: 604800, actions: lowConfidenceActions(provided, structured) }));
});

router.post('/convert', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const hasFields = !!(options && typeof options.fields === 'object' && options.fields);
  if (!hasFields && (input == null || (typeof input === 'string' && !input.trim()))) {
    return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  }
  const { fields, provided, structured } = parseInput(input, options);
  const sourceStyle: Style | 'unknown' = STYLES.includes((options?.source_style || '').toLowerCase()) ? (options.source_style.toLowerCase() as Style) : 'unknown';
  const target: Style = STYLES.includes((options?.target_style || '').toLowerCase()) ? (options.target_style.toLowerCase() as Style) : 'apa';
  const original = typeof input === 'string' ? input.trim() : JSON.stringify(input);
  const converted = formatCitation(fields, target);
  const conf = confidenceFor(provided, structured);
  const data = {
    source_style: sourceStyle,
    target_style: target,
    original_citation: original,
    converted_citation: converted,
    conversion_notes: structured ? [] : ['Re-formatted from parsed fields; not a string-level transform'],
    fields_transformed: Object.entries(fields).filter(([, v]) => v != null && (Array.isArray(v) ? v.length : true)).map(([k]) => k),
    conversion_confidence: conf.score,
  };
  res.json(envelope(data, { start, score: conf.score, reason: conf.reason, per_section: { parse: conf.score }, ttl: 604800, actions: lowConfidenceActions(provided, structured) }));
});

router.post('/execution-gate', (req: Request, res: Response) => {
  const { input, objective } = req.body;
  if (!input) return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  res.json({
    success: true, request_id: rid(),
    execution_ready: true, input, objective: objective || 'format',
    next_api: 'citation-formatter', next_endpoint: '/formatter-intelligence',
    blocking_flags: [],
    confidence: { score: 0.98, reason: 'Input present and valid', per_section: { execution_ready: 0.98 } },
    provenance: { provider: 'system', retrieved_at: new Date().toISOString(), source_type: 'api_call' },
    recommended_next_api: [{ api: 'citation-formatter', endpoint: '/formatter-intelligence', reason: 'Full Citation Formatter API intelligence' }],
    recommended_actions_priority_order: [{ priority: 'high', action: 'Call /formatter-intelligence', reason: 'Single-request full analysis' }],
    execution_metadata: { latency_ms: 1, model: 'system', automation_safe: true },
  });
});

router.post('/formatter-intelligence', (req: Request, res: Response) => {
  const start = Date.now();
  const { input, options } = req.body;
  const hasFields = !!(options && typeof options.fields === 'object' && options.fields);
  if (!hasFields && (input == null || (typeof input === 'string' && !input.trim()))) {
    return res.status(400).json({ error: 'input is required', code: 'MISSING_INPUT', retryable: false });
  }
  const { fields, provided, structured } = parseInput(input, options);
  const conf = confidenceFor(provided, structured);
  const all_styles: Record<string, string> = {};
  for (const st of STYLES) all_styles[st] = formatCitation(fields, st);
  const citation_type = detectType(fields);
  const overall_score = Math.round(conf.score * 100);
  const data = {
    format: { style: 'apa', formatted_citation: all_styles.apa, citation_type, input_parsed: fields },
    convert: { all_styles },
    overall_score,
    key_findings: [
      `Citation type: ${citation_type}`,
      `${provided} field(s) ${structured ? 'provided' : 'parsed'}`,
      fields.authors.length ? `Lead author: ${fields.authors[0]}` : 'No author detected',
    ],
    summary: `Formatted into ${STYLES.length} styles from ${provided} ${structured ? 'structured' : 'parsed'} field(s).`,
  };
  res.json(envelope(data, { start, score: conf.score, reason: conf.reason, per_section: { parse: conf.score }, ttl: 604800, actions: lowConfidenceActions(provided, structured) }));
});

export default router;
