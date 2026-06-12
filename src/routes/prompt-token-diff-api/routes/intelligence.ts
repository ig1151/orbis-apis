import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { str, intIn, round, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import {
  lookupModel, estimateTokens, costFor, TOKEN_ESTIMATOR_CONFIDENCE,
  PRICING_TABLE_VERSION, PRICING_TABLE_UPDATED_AT, PRICING_INVALIDATORS,
} from '../../_aplus/llm-pricing';

// Deterministic prompt token + cost diff. Compares two prompt versions (a -> b)
// and reports the token, character, and word deltas plus, if a model is given,
// the USD cost delta from a static price table. Useful for measuring whether a
// prompt edit cheapened or inflated the call. Token counts are heuristic estimates
// (confidence 0.7); cost given tokens is exact. No LLM.

const router = Router();
const MAX_CHARS = 200_000;

function words(s: string): number { return (s.trim().match(/\S+/g) || []).length; }

export interface DiffCore {
  model: string | null; provider: string | null; found: boolean;
  tokens_a: number; tokens_b: number; delta_tokens: number; pct_change: number | null;
  chars_a: number; chars_b: number; delta_chars: number;
  words_a: number; words_b: number; delta_words: number;
  output_tokens: number;
  cost_a_usd: number | null; cost_b_usd: number | null; delta_cost_usd: number | null;
  direction: 'increase' | 'decrease' | 'no_change'; is_estimate: boolean;
  pricing_table_version: string; pricing_table_updated_at: string;
}

export function diff(body: any): { error: string } | { result: DiffCore } {
  const a = str(body?.a);
  const b = str(body?.b);
  if (a === undefined) return { error: 'Provide "a" as the original prompt string.' };
  if (b === undefined) return { error: 'Provide "b" as the revised prompt string.' };
  if (a.length > MAX_CHARS || b.length > MAX_CHARS) return { error: `Prompts must each be ≤ ${MAX_CHARS} characters.` };

  const output_tokens = intIn(body?.output_tokens) ?? 0;
  if (output_tokens < 0) return { error: '"output_tokens" must be 0 or greater.' };

  const modelIn = body?.model;
  if (modelIn !== undefined && typeof modelIn !== 'string') return { error: '"model" must be a string model id if provided.' };
  const price = modelIn !== undefined ? lookupModel(modelIn) : null;
  const found = price !== null;

  const tokens_a = estimateTokens(a), tokens_b = estimateTokens(b);
  const delta_tokens = tokens_b - tokens_a;
  const pct_change = tokens_a > 0 ? round((delta_tokens / tokens_a) * 100, 2) : null;

  let cost_a_usd: number | null = null, cost_b_usd: number | null = null, delta_cost_usd: number | null = null;
  if (price) {
    cost_a_usd = costFor(price, tokens_a, output_tokens).total_cost_usd;
    cost_b_usd = costFor(price, tokens_b, output_tokens).total_cost_usd;
    delta_cost_usd = round(cost_b_usd - cost_a_usd, 6);
  }

  const direction = delta_tokens > 0 ? 'increase' : delta_tokens < 0 ? 'decrease' : 'no_change';

  return {
    result: {
      model: price ? price.model : (typeof modelIn === 'string' ? modelIn : null), provider: price ? price.provider : null, found,
      tokens_a, tokens_b, delta_tokens, pct_change,
      chars_a: a.length, chars_b: b.length, delta_chars: b.length - a.length,
      words_a: words(a), words_b: words(b), delta_words: words(b) - words(a),
      output_tokens, cost_a_usd, cost_b_usd, delta_cost_usd, direction, is_estimate: true,
      pricing_table_version: PRICING_TABLE_VERSION, pricing_table_updated_at: PRICING_TABLE_UPDATED_AT,
    },
  };
}

function actions(r: DiffCore): string[] {
  const sign = r.delta_tokens > 0 ? '+' : '';
  const out = [`Prompt B is ${r.direction === 'no_change' ? 'unchanged in tokens' : `${sign}${r.delta_tokens} tokens (${sign}${r.pct_change ?? 0}%)`} vs A (~${r.tokens_a} → ~${r.tokens_b}).`];
  if (r.found && r.delta_cost_usd !== null) {
    const cs = r.delta_cost_usd > 0 ? '+' : '';
    out.push(`Cost on ${r.model}: ${cs}$${r.delta_cost_usd} per call${r.output_tokens > 0 ? ` (incl. ${r.output_tokens} output tokens)` : ' (prompt input only)'}.`);
  } else if (r.model && !r.found) out.push(`Model "${r.model}" not priced — token delta only.`);
  else out.push('Pass "model" to get the per-call cost delta.');
  return out;
}

const CHAIN_TO = [
  { api: 'llm-token-counter', reason: 'Get the absolute token + cost for either prompt version.' },
  { api: 'model-pricing-comparator', reason: 'See the delta across other models.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Prompt Token Diff API', version: '1.0.0',
    description: 'Deterministic prompt token + cost diff. Compares two prompt versions (a → b) and returns token, character, and word deltas plus, if a model is given, the USD cost delta from a static price table. Token counts are heuristic estimates; cost given tokens is exact. No LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/prompt-token-diff/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/diff', summary: 'Token + cost delta between two prompts', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL diff + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/diff', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/diff', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = diff(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, confidence_score: TOKEN_ESTIMATOR_CONFIDENCE, confidence_per_section: { tokens: TOKEN_ESTIMATOR_CONFIDENCE, cost: r.result.found ? TOKEN_ESTIMATOR_CONFIDENCE : 0 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = diff(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `~${v.tokens_a} → ~${v.tokens_b} tokens (${v.delta_tokens >= 0 ? '+' : ''}${v.delta_tokens}, ${v.direction})${v.found ? `; ${v.delta_cost_usd! >= 0 ? '+' : ''}$${v.delta_cost_usd} on ${v.model}` : ''}.`,
      key_factors: [`Tokens: ${v.tokens_a} → ${v.tokens_b} (${v.pct_change ?? 0}%).`, `Chars ${v.delta_chars >= 0 ? '+' : ''}${v.delta_chars}, words ${v.delta_words >= 0 ? '+' : ''}${v.delta_words}.`, v.found ? `Priced on ${v.model}.` : 'No model priced.'],
      invalidators: PRICING_INVALIDATORS,
    },
    confidence_score: TOKEN_ESTIMATOR_CONFIDENCE, confidence_per_section: { tokens: TOKEN_ESTIMATOR_CONFIDENCE, cost: v.found ? TOKEN_ESTIMATOR_CONFIDENCE : 0 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
