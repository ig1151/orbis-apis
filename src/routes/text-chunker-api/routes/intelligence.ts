import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { str, intIn, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { estimateTokens, TOKEN_ESTIMATOR_CONFIDENCE } from '../../_aplus/llm-pricing';

// Deterministic RAG text chunker. Splits text by token budget (char-approximated),
// fixed characters, sentences, or paragraphs, with overlap, and returns each chunk
// with exact char offsets and an ESTIMATED token count. Char offsets are exact;
// the 'tokens' strategy approximates token windows via a chars-per-token ratio,
// and all per-chunk token counts are offline heuristic estimates.

const router = Router();
const MAX_CHARS = 200_000;
const MAX_CHUNKS = 5_000;
const CHARS_PER_TOKEN = 4; // rough cross-model average used only to size token windows

type Strategy = 'tokens' | 'characters' | 'sentences' | 'paragraphs';

export interface ChunkRow { index: number; text: string; char_start: number; char_end: number; char_count: number; estimated_tokens: number; }
export interface ChunkCore {
  strategy: Strategy; chunk_count: number; total_chars: number; total_estimated_tokens: number;
  max_tokens: number; max_chars: number | null; overlap: number; is_estimate: boolean;
  chunks: ChunkRow[];
}

function charWindows(text: string, windowChars: number, overlapChars: number): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let start = 0;
  const n = text.length;
  while (start < n) {
    let end = Math.min(n, start + windowChars);
    // gentle word-boundary snap: avoid splitting mid-word if a nearby space exists
    if (end < n && /\S/.test(text[end])) {
      const lookback = Math.floor(windowChars * 0.2);
      const ws = text.lastIndexOf(' ', end);
      if (ws > start && end - ws <= lookback) end = ws + 1;
    }
    out.push({ start, end });
    if (end >= n) break;
    const next = end - overlapChars;
    start = next > start ? next : end; // guarantee forward progress
  }
  return out;
}

function unitWindows(units: { start: number; end: number }[], text: string, maxTokens: number, overlapUnits: number): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let i = 0;
  while (i < units.length) {
    let j = i, tok = 0;
    while (j < units.length) {
      const t = estimateTokens(text.slice(units[j].start, units[j].end));
      if (j > i && tok + t > maxTokens) break;
      tok += t; j++;
    }
    out.push({ start: units[i].start, end: units[j - 1].end });
    if (j >= units.length) break;
    const next = j - overlapUnits;
    i = next > i ? next : j; // forward progress
  }
  return out;
}

function sentenceUnits(text: string): { start: number; end: number }[] {
  const re = /[^.!?]*[.!?]+|[^.!?]+$/g;
  const units: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].trim() !== '') units.push({ start: m.index, end: m.index + m[0].length });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return units.length ? units : [{ start: 0, end: text.length }];
}

function paragraphUnits(text: string): { start: number; end: number }[] {
  const blocks = text.split(/\n[ \t]*\n/);
  const units: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const b of blocks) {
    const idx = text.indexOf(b, cursor);
    if (idx < 0) continue;
    if (b.trim() !== '') units.push({ start: idx, end: idx + b.length });
    cursor = idx + b.length;
  }
  return units.length ? units : [{ start: 0, end: text.length }];
}

export function chunk(body: any): { error: string } | { result: ChunkCore } {
  const text = str(body?.text);
  if (text === undefined) return { error: 'Provide "text" as a non-empty string.' };
  if (text.length > MAX_CHARS) return { error: `"text" exceeds the ${MAX_CHARS}-character limit (${text.length}).` };

  const stratIn = body?.strategy;
  const strategy: Strategy = stratIn === undefined ? 'tokens' : stratIn;
  if (!['tokens', 'characters', 'sentences', 'paragraphs'].includes(strategy)) {
    return { error: '"strategy" must be one of: tokens, characters, sentences, paragraphs.' };
  }

  const max_tokens = intIn(body?.max_tokens) ?? 512;
  if (max_tokens <= 0) return { error: '"max_tokens" must be a positive integer.' };
  const overlap = intIn(body?.overlap) ?? 0;
  if (overlap < 0) return { error: '"overlap" must be 0 or greater.' };

  let windows: { start: number; end: number }[];
  let max_chars: number | null = null;

  if (strategy === 'characters') {
    max_chars = intIn(body?.max_chars) ?? 2000;
    if (max_chars <= 0) return { error: '"max_chars" must be a positive integer.' };
    if (overlap >= max_chars) return { error: '"overlap" (chars) must be less than "max_chars".' };
    windows = charWindows(text, max_chars, overlap);
  } else if (strategy === 'tokens') {
    const windowChars = max_tokens * CHARS_PER_TOKEN;
    const overlapChars = overlap * CHARS_PER_TOKEN;
    if (overlapChars >= windowChars) return { error: '"overlap" (tokens) must be less than "max_tokens".' };
    windows = charWindows(text, windowChars, overlapChars);
  } else {
    const units = strategy === 'sentences' ? sentenceUnits(text) : paragraphUnits(text);
    windows = unitWindows(units, text, max_tokens, overlap);
  }

  if (windows.length > MAX_CHUNKS) return { error: `Configuration produces ${windows.length} chunks, over the ${MAX_CHUNKS} limit. Increase max_tokens/max_chars.` };

  const chunks: ChunkRow[] = windows.map((w, i) => {
    const slice = text.slice(w.start, w.end);
    return { index: i, text: slice, char_start: w.start, char_end: w.end, char_count: slice.length, estimated_tokens: estimateTokens(slice) };
  });
  const total_estimated_tokens = chunks.reduce((s, c) => s + c.estimated_tokens, 0);

  return {
    result: { strategy, chunk_count: chunks.length, total_chars: text.length, total_estimated_tokens, max_tokens, max_chars, overlap, is_estimate: true, chunks },
  };
}

function actions(r: ChunkCore): string[] {
  const out = [`Split into ${r.chunk_count} chunk(s) by ${r.strategy}${r.overlap > 0 ? ` with ${r.overlap} overlap` : ''}; ~${r.total_estimated_tokens} tokens total (estimate).`];
  if (r.strategy === 'tokens') out.push('Token windows are char-approximated (~4 chars/token) — chunk sizes are heuristic, not exact tokenizer boundaries.');
  out.push('Char offsets (char_start/char_end) are exact and contiguous (with overlap) over the source text.');
  return out;
}

const CHAIN_TO = [
  { api: 'llm-token-counter', reason: 'Get a token + cost estimate for an individual chunk.' },
  { api: 'context-budget-planner', reason: 'Plan how many chunks fit a model context window per call.' },
];

function confSec(strategy: Strategy) {
  return { chunking: strategy === 'tokens' ? 0.8 : 1, tokens: TOKEN_ESTIMATOR_CONFIDENCE };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Text Chunker / Splitter API (RAG)', version: '1.0.0',
    description: 'Deterministic RAG text splitter. Splits text by token budget (char-approximated), fixed characters, sentences, or paragraphs, with overlap, returning each chunk with exact char offsets and an estimated token count. Char offsets are exact; token counts are offline heuristic estimates.',
    openapi_url: 'https://orbis-apis.onrender.com/text-chunker/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/chunk', summary: 'Split text into chunks with offsets', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL chunking + reasoning', price_usdc: 0.009 },
    ],
    pricing: [
      { path: '/chunk', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/chunk', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = chunk(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: TOKEN_ESTIMATOR_CONFIDENCE, confidence_per_section: confSec(r.result.strategy),
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = chunk(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.total_chars} characters split by ${v.strategy} into ${v.chunk_count} chunk(s), ~${v.total_estimated_tokens} tokens total.`,
      key_factors: [`Strategy: ${v.strategy}${v.strategy === 'characters' ? ` (max_chars ${v.max_chars})` : ` (max_tokens ${v.max_tokens})`}.`, `Overlap: ${v.overlap}.`, 'Char offsets are exact; token counts are estimates.'],
      invalidators: ['Per-chunk token counts are an offline heuristic estimate, not the model tokenizer.', 'The tokens strategy sizes windows at ~4 chars/token; real token boundaries differ by model and content.', 'Changing strategy, max size, or overlap changes the chunk boundaries.'],
    },
    confidence_score: TOKEN_ESTIMATOR_CONFIDENCE, confidence_per_section: confSec(v.strategy),
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
