import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, intIn, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { lookupModel, estimateTokens, TOKEN_ESTIMATOR_CONFIDENCE } from '../../_aplus/llm-pricing';

// Deterministic context-window budget planner. Given a list of messages (with
// supplied tokens OR text to estimate), a context window (explicit or from a
// model id) and an output reserve, computes whether the prompt fits and — if not
// — a deterministic trim plan (drop oldest, or drop lowest priority first) that
// brings it under budget. Token counts from text are heuristic estimates.

const router = Router();
const MAX_MESSAGES = 2000;

type Strategy = 'drop_oldest' | 'drop_lowest_priority';

interface MsgRow { index: number; role: string | null; tokens: number; source: 'provided' | 'estimated'; priority: number; }

export interface PlanCore {
  model: string | null; found: boolean;
  context_window: number; reserve_output_tokens: number; available_input_tokens: number;
  message_count: number; total_input_tokens: number; is_estimate: boolean;
  fits: boolean; overflow_tokens: number;
  messages: { index: number; role: string | null; tokens: number; source: 'provided' | 'estimated' }[];
  trim_plan: { strategy: Strategy; dropped_indices: number[]; kept_indices: number[]; dropped_tokens: number; tokens_after_trim: number; fits_after_trim: boolean };
}

export function plan(body: any): { error: string } | { result: PlanCore } {
  const raw = body?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return { error: '"messages" must be a non-empty array of {role?, text?, tokens?, priority?}.' };
  if (raw.length > MAX_MESSAGES) return { error: `"messages" exceeds the ${MAX_MESSAGES}-item limit (${raw.length}).` };

  const strategy: Strategy = body?.strategy === 'drop_lowest_priority' ? 'drop_lowest_priority' : 'drop_oldest';
  if (body?.strategy !== undefined && body.strategy !== 'drop_oldest' && body.strategy !== 'drop_lowest_priority') {
    return { error: '"strategy" must be "drop_oldest" or "drop_lowest_priority".' };
  }

  const rows: MsgRow[] = [];
  let anyEstimated = false;
  for (let i = 0; i < raw.length; i++) {
    const m = raw[i] ?? {};
    const tk = intIn(m.tokens);
    let tokens: number, source: 'provided' | 'estimated';
    if (tk !== undefined) {
      if (tk < 0) return { error: `messages[${i}].tokens must be 0 or greater.` };
      tokens = tk; source = 'provided';
    } else {
      const text = str(m.text);
      if (text === undefined) return { error: `messages[${i}] needs either "tokens" or non-empty "text".` };
      tokens = estimateTokens(text); source = 'estimated'; anyEstimated = true;
    }
    const priority = num(m.priority) ?? 0;
    rows.push({ index: i, role: typeof m.role === 'string' ? m.role : null, tokens, source, priority });
  }

  const modelIn = body?.model;
  if (modelIn !== undefined && typeof modelIn !== 'string') return { error: '"model" must be a string model id if provided.' };
  const price = modelIn !== undefined ? lookupModel(modelIn) : null;

  const cwIn = intIn(body?.context_window);
  if (cwIn !== undefined && cwIn <= 0) return { error: '"context_window" must be a positive integer.' };
  const context_window = cwIn ?? (price ? price.context_window : undefined);
  if (context_window === undefined) return { error: 'Provide "context_window" or a known "model" to derive the window.' };

  const reserve_output_tokens = intIn(body?.reserve_output_tokens) ?? 0;
  if (reserve_output_tokens < 0) return { error: '"reserve_output_tokens" must be 0 or greater.' };
  if (reserve_output_tokens >= context_window) return { error: '"reserve_output_tokens" must be less than the context window.' };
  const available_input_tokens = context_window - reserve_output_tokens;

  const total_input_tokens = rows.reduce((s, r) => s + r.tokens, 0);
  const fits = total_input_tokens <= available_input_tokens;
  const overflow_tokens = Math.max(0, total_input_tokens - available_input_tokens);

  // Deterministic drop order. drop_oldest: lowest index first. drop_lowest_priority:
  // lowest priority first, oldest (lowest index) as the tie-break.
  const dropOrder = [...rows].sort((a, b) =>
    strategy === 'drop_oldest' ? a.index - b.index : (a.priority - b.priority) || (a.index - b.index));
  const dropped: number[] = [];
  let running = total_input_tokens;
  for (const r of dropOrder) {
    if (running <= available_input_tokens) break;
    dropped.push(r.index); running -= r.tokens;
  }
  dropped.sort((a, b) => a - b);
  const droppedSet = new Set(dropped);
  const kept_indices = rows.map((r) => r.index).filter((i) => !droppedSet.has(i));
  const dropped_tokens = total_input_tokens - running;

  return {
    result: {
      model: price ? price.model : (typeof modelIn === 'string' ? modelIn : null),
      found: price !== null,
      context_window, reserve_output_tokens, available_input_tokens,
      message_count: rows.length, total_input_tokens, is_estimate: anyEstimated,
      fits, overflow_tokens,
      messages: rows.map((r) => ({ index: r.index, role: r.role, tokens: r.tokens, source: r.source })),
      trim_plan: { strategy, dropped_indices: dropped, kept_indices, dropped_tokens, tokens_after_trim: running, fits_after_trim: running <= available_input_tokens },
    },
  };
}

function actions(r: PlanCore): string[] {
  const out: string[] = [];
  if (r.fits) out.push(`Prompt fits: ${r.total_input_tokens} input tokens within the ${r.available_input_tokens}-token budget (window ${r.context_window} − ${r.reserve_output_tokens} reserved).`);
  else out.push(`Over budget by ${r.overflow_tokens} tokens — drop ${r.trim_plan.dropped_indices.length} message(s) [${r.trim_plan.dropped_indices.join(', ')}] via ${r.trim_plan.strategy} to fit.`);
  if (r.is_estimate) out.push('Some message tokens were estimated offline — confirm with the real tokenizer before relying on the fit at the margin.');
  return out;
}

const CHAIN_TO = [
  { api: 'text-chunker', reason: 'Split oversized messages into window-sized chunks instead of dropping them.' },
  { api: 'llm-token-counter', reason: 'Estimate tokens + cost for an individual message before planning.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Context Window Budget Planner API', version: '1.0.0',
    description: 'Deterministic context-window budget planner. Messages (supplied tokens or text to estimate) + a window (explicit or from a model id) + an output reserve → fits/overflow and a deterministic trim plan (drop oldest or drop lowest priority). Token counts from text are heuristic estimates.',
    openapi_url: 'https://orbis-apis.onrender.com/context-budget-planner/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/plan', summary: 'Fit check + trim plan', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL plan + reasoning', price_usdc: 0.009 },
    ],
    pricing: [
      { path: '/plan', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

function conf(isEst: boolean) {
  const c = isEst ? TOKEN_ESTIMATOR_CONFIDENCE : 1;
  return { score: isEst ? TOKEN_ESTIMATOR_CONFIDENCE : 1, sections: { budget: c, trim: c } };
}

router.post('/plan', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = plan(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const c = conf(r.result.is_estimate);
  respond(res, t0, {
    ...r.result,
    confidence_score: c.score, confidence_per_section: c.sections,
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = plan(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  const c = conf(v.is_estimate);
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.total_input_tokens} input tokens vs ${v.available_input_tokens} available → ${v.fits ? 'fits' : `over by ${v.overflow_tokens}, drop ${v.trim_plan.dropped_indices.length} message(s)`}.`,
      key_factors: [`Window ${v.context_window}${v.found ? ` (from ${v.model})` : ''} − ${v.reserve_output_tokens} reserved = ${v.available_input_tokens} for input.`, `${v.message_count} messages, ${v.total_input_tokens} tokens total.`, `Trim strategy: ${v.trim_plan.strategy}.`],
      invalidators: ['Fit/overflow depend on the supplied or estimated token counts — estimated counts are an offline heuristic and may differ from the model tokenizer.', 'Hidden system/tool/thinking tokens are not counted unless you include them as messages.', 'A different reserve or window (e.g. a different model) changes the budget.'],
    },
    confidence_score: c.score, confidence_per_section: c.sections,
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
