import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, intIn, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import {
  lookupModel, estimateTokens, costFor, TOKEN_ESTIMATOR_CONFIDENCE,
  PRICING_TABLE_VERSION, PRICING_TABLE_UPDATED_AT, PRICING_INVALIDATORS,
} from '../../_aplus/llm-pricing';

// Deterministic LLM token + cost estimator. Given text and a model id, returns
// an APPROXIMATE token count (offline heuristic — NOT the model's real tokenizer)
// and, when output tokens are supplied, the exact USD cost from a static, versioned
// pricing table. Unknown model → found:false and null prices (never guessed).
// Token counts are always estimates → confidence < 1.0; cost given tokens is exact.

const router = Router();

const MAX_CHARS = 200_000;

export interface CountCore {
  model: string | null; provider: string | null; found: boolean;
  input_text_chars: number; input_tokens: number; output_tokens: number; total_tokens: number;
  is_estimate: boolean;
  input_cost_usd: number | null; output_cost_usd: number | null; total_cost_usd: number | null;
  pricing_table_version: string; pricing_table_updated_at: string;
}

export function count(body: any): { error: string } | { result: CountCore } {
  const text = str(body?.text);
  if (text === undefined) return { error: 'Provide "text" as a non-empty string.' };
  if (text.length > MAX_CHARS) return { error: `"text" exceeds the ${MAX_CHARS}-character limit (${text.length}).` };

  const output_tokens = intIn(body?.output_tokens);
  if (output_tokens !== undefined && output_tokens < 0) return { error: '"output_tokens" must be 0 or greater.' };

  const modelIn = body?.model;
  if (modelIn !== undefined && typeof modelIn !== 'string') return { error: '"model" must be a string model id if provided.' };
  const price = modelIn !== undefined ? lookupModel(modelIn) : null;
  const found = price !== null;

  const input_tokens = estimateTokens(text);
  const out = output_tokens ?? 0;
  const total_tokens = input_tokens + out;

  let input_cost_usd: number | null = null, output_cost_usd: number | null = null, total_cost_usd: number | null = null;
  if (price) {
    const c = costFor(price, input_tokens, out);
    input_cost_usd = c.input_cost_usd; output_cost_usd = c.output_cost_usd; total_cost_usd = c.total_cost_usd;
  }

  return {
    result: {
      model: price ? price.model : (typeof modelIn === 'string' ? modelIn : null),
      provider: price ? price.provider : null,
      found,
      input_text_chars: text.length, input_tokens, output_tokens: out, total_tokens,
      is_estimate: true,
      input_cost_usd, output_cost_usd, total_cost_usd,
      pricing_table_version: PRICING_TABLE_VERSION, pricing_table_updated_at: PRICING_TABLE_UPDATED_AT,
    },
  };
}

function actions(r: CountCore): string[] {
  const out = [`~${r.input_tokens} input tokens estimated from ${r.input_text_chars} characters (offline heuristic — verify against the model's real tokenizer for billing).`];
  if (r.found && r.total_cost_usd !== null) out.push(`Estimated cost on ${r.model}: $${r.total_cost_usd} (${r.input_tokens} in + ${r.output_tokens} out).`);
  else if (r.model && !r.found) out.push(`Model "${r.model}" not in the pricing table — cost not computed. Call model-pricing-comparator for supported models.`);
  else out.push('No model supplied — pass "model" to get a cost estimate.');
  return out;
}

const CHAIN_TO = [
  { api: 'model-pricing-comparator', reason: 'Compare this token count\'s cost across every model in the table.' },
  { api: 'context-budget-planner', reason: 'Check whether this many tokens fits a model\'s context window.' },
];

function conf(found: boolean) {
  return { tokens: TOKEN_ESTIMATOR_CONFIDENCE, cost: found ? TOKEN_ESTIMATOR_CONFIDENCE : 0 };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'LLM Token Counter & Cost Estimator API', version: '1.0.0',
    description: 'Deterministic, offline token + cost estimator. Text + model id → approximate token count and exact USD cost from a static, versioned pricing table. Token counts are heuristic estimates (not the model tokenizer); cost given tokens is exact. Unknown model → found:false.',
    openapi_url: 'https://orbis-apis.onrender.com/llm-token-counter/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/count', summary: 'Estimate tokens + cost for one text', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL token + cost estimate + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/count', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/count', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = count(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: TOKEN_ESTIMATOR_CONFIDENCE, confidence_per_section: conf(r.result.found),
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = count(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Estimated ~${v.input_tokens} input + ${v.output_tokens} output tokens${v.found ? `; cost $${v.total_cost_usd} on ${v.model}` : v.model ? `; model "${v.model}" not priced` : '; no model supplied'}.`,
      key_factors: [`${v.input_text_chars} input characters → ~${v.input_tokens} tokens (heuristic).`, v.found ? `Priced against ${v.model} (${v.provider}).` : 'No matching model price.', 'Cost given a token count is exact arithmetic.'],
      invalidators: PRICING_INVALIDATORS,
    },
    confidence_score: TOKEN_ESTIMATOR_CONFIDENCE, confidence_per_section: conf(v.found),
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
