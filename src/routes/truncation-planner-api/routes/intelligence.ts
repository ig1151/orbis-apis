import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { str, intIn, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { estimateTokens, TOKEN_ESTIMATOR_CONFIDENCE } from '../../_aplus/llm-pricing';

// Deterministic truncation / stop-sequence planner. Given text and a token budget,
// finds where to cut so the text fits — keeping the head (end), tail (start), or
// both ends (middle) — snapping to character, word, or sentence boundaries, and
// honoring stop sequences (cut at the earliest one). Char boundaries are exact;
// the token budget is converted via ~4 chars/token, so token counts are heuristic
// estimates and the kept text may land slightly over/under budget. No LLM.

const router = Router();
const MAX_CHARS = 500_000;
const CHARS_PER_TOKEN = 4;

type Strategy = 'end' | 'start' | 'middle';
type Boundary = 'character' | 'word' | 'sentence';

export interface TruncCore {
  original_chars: number; original_tokens_estimate: number; max_tokens: number; fits: boolean;
  strategy: Strategy; boundary: Boundary; ellipsis: string;
  stop_sequence_hit: { sequence: string; index: number } | null;
  truncated: boolean;
  kept_text: string; kept_chars: number; kept_tokens_estimate: number;
  removed_chars: number; removed_tokens_estimate: number; within_budget: boolean;
}

function snapBack(s: string, idx: number, boundary: Boundary): number {
  if (boundary === 'character' || idx >= s.length) return Math.min(idx, s.length);
  for (let i = Math.min(idx, s.length - 1); i > 0; i--) {
    if (boundary === 'sentence' && /[.!?]/.test(s[i])) return i + 1;
    if (boundary === 'word' && /\s/.test(s[i])) return i;
  }
  return Math.min(idx, s.length);
}
function snapForward(s: string, idx: number, boundary: Boundary): number {
  if (boundary === 'character' || idx <= 0) return Math.max(idx, 0);
  for (let i = Math.max(idx, 0); i < s.length; i++) {
    if (boundary === 'sentence' && /[.!?]/.test(s[i])) return i + 1;
    if (boundary === 'word' && /\s/.test(s[i])) return i + 1;
  }
  return Math.min(idx, s.length);
}

export function planTruncation(body: any): { error: string } | { result: TruncCore } {
  const text = str(body?.text);
  if (text === undefined) return { error: 'Provide "text" as a non-empty string.' };
  if (text.length > MAX_CHARS) return { error: `"text" exceeds the ${MAX_CHARS}-character limit (${text.length}).` };

  const max_tokens = intIn(body?.max_tokens);
  if (max_tokens === undefined || max_tokens < 1) return { error: '"max_tokens" must be a positive integer.' };

  const strategy: Strategy = body?.strategy ?? 'end';
  if (!['end', 'start', 'middle'].includes(strategy)) return { error: '"strategy" must be one of: end, start, middle.' };
  const boundary: Boundary = body?.boundary ?? 'word';
  if (!['character', 'word', 'sentence'].includes(boundary)) return { error: '"boundary" must be one of: character, word, sentence.' };
  const ellipsis = typeof body?.ellipsis === 'string' ? body.ellipsis : '…';

  const stops = body?.stop_sequences;
  if (stops !== undefined && (!Array.isArray(stops) || stops.some((s: any) => typeof s !== 'string'))) return { error: '"stop_sequences" must be an array of strings.' };

  const original_chars = text.length;
  const original_tokens_estimate = estimateTokens(text);

  // Apply earliest stop sequence first
  let stop_sequence_hit: { sequence: string; index: number } | null = null;
  let effective = text;
  if (Array.isArray(stops)) {
    let best = -1, bestSeq = '';
    for (const seq of stops) { if (seq === '') continue; const idx = text.indexOf(seq); if (idx >= 0 && (best === -1 || idx < best)) { best = idx; bestSeq = seq; } }
    if (best >= 0) { stop_sequence_hit = { sequence: bestSeq, index: best }; effective = text.slice(0, best); }
  }

  const effTokens = estimateTokens(effective);
  const fits = original_tokens_estimate <= max_tokens;

  let kept_text: string;
  let budgetTruncated = false;
  if (effTokens <= max_tokens) {
    kept_text = effective;
  } else {
    budgetTruncated = true;
    const charBudget = Math.max(0, max_tokens * CHARS_PER_TOKEN);
    const room = Math.max(0, charBudget - ellipsis.length);
    if (strategy === 'end') {
      const cut = snapBack(effective, room, boundary);
      kept_text = effective.slice(0, cut).replace(/\s+$/, '') + ellipsis;
    } else if (strategy === 'start') {
      const start = snapForward(effective, effective.length - room, boundary);
      kept_text = ellipsis + effective.slice(start).replace(/^\s+/, '');
    } else { // middle
      const half = Math.floor(room / 2);
      const headCut = snapBack(effective, half, boundary);
      const tailStart = snapForward(effective, effective.length - half, boundary);
      kept_text = effective.slice(0, headCut).replace(/\s+$/, '') + ellipsis + effective.slice(tailStart).replace(/^\s+/, '');
    }
  }

  const kept_chars = kept_text.length;
  const kept_tokens_estimate = estimateTokens(kept_text);
  const truncated = stop_sequence_hit !== null || budgetTruncated;

  return {
    result: {
      original_chars, original_tokens_estimate, max_tokens, fits,
      strategy, boundary, ellipsis,
      stop_sequence_hit, truncated,
      kept_text, kept_chars, kept_tokens_estimate,
      removed_chars: Math.max(0, original_chars - kept_chars),
      removed_tokens_estimate: Math.max(0, original_tokens_estimate - kept_tokens_estimate),
      within_budget: kept_tokens_estimate <= max_tokens,
    },
  };
}

function actions(r: TruncCore): string[] {
  const out: string[] = [];
  if (!r.truncated) out.push(`No truncation needed — ~${r.original_tokens_estimate} tokens within the ${r.max_tokens}-token budget.`);
  else out.push(`Truncated to ~${r.kept_tokens_estimate} tokens (${r.kept_chars} chars) via ${r.strategy}/${r.boundary}; removed ~${r.removed_tokens_estimate} tokens.`);
  if (r.stop_sequence_hit) out.push(`Stop sequence "${r.stop_sequence_hit.sequence}" found at char ${r.stop_sequence_hit.index} — content from there on was cut.`);
  if (r.truncated && !r.within_budget) out.push('Estimated kept tokens still exceed the budget (char→token is approximate) — lower max_tokens or verify with the real tokenizer.');
  return out;
}

const CHAIN_TO = [
  { api: 'llm-token-counter', reason: 'Confirm the kept text\'s token count and cost.' },
  { api: 'text-chunker', reason: 'Instead of dropping overflow, split it into separate chunks.' },
];
const INVALIDATORS = [
  'The token budget is converted to characters at ~4 chars/token — kept_tokens_estimate is heuristic and the result may land slightly over/under the real tokenizer count.',
  'Boundary snapping (word/sentence) trades exact budget adherence for clean cuts; character boundary is exact but can split words.',
  'stop_sequence matching is literal substring search on the provided text, case-sensitive.',
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Stop-Sequence / Truncation Planner API', version: '1.0.0',
    description: 'Deterministic truncation planner. Given text and a token budget, finds where to cut so it fits — keeping the head (end), tail (start), or both ends (middle) — snapping to character/word/sentence boundaries and honoring stop sequences. Char boundaries are exact; the token budget is char-approximated, so token counts are estimates. No LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/truncation-planner/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/plan', summary: 'Plan a budget-fitting truncation', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL truncation + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/plan', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/plan', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = planTruncation(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, confidence_score: TOKEN_ESTIMATOR_CONFIDENCE, confidence_per_section: { truncation: 1, tokens: TOKEN_ESTIMATOR_CONFIDENCE },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = planTruncation(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `~${v.original_tokens_estimate} tokens vs ${v.max_tokens} budget → ${v.truncated ? `truncated to ~${v.kept_tokens_estimate} via ${v.strategy}/${v.boundary}` : 'no truncation needed'}.`,
      key_factors: [`Original ${v.original_chars} chars / ~${v.original_tokens_estimate} tokens.`, v.stop_sequence_hit ? `Stop sequence at char ${v.stop_sequence_hit.index}.` : 'No stop sequence hit.', `Kept ~${v.kept_tokens_estimate} tokens (within_budget=${v.within_budget}).`],
      invalidators: INVALIDATORS,
    },
    confidence_score: TOKEN_ESTIMATOR_CONFIDENCE, confidence_per_section: { truncation: 1, tokens: TOKEN_ESTIMATOR_CONFIDENCE },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
