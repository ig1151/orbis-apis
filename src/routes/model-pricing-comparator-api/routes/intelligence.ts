import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { intIn, round, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import {
  lookupModel, allModels, costFor, ModelPrice,
  PRICING_TABLE_VERSION, PRICING_TABLE_UPDATED_AT, PRICING_INVALIDATORS,
} from '../../_aplus/llm-pricing';

// Deterministic model pricing comparator. Given an input/output token split and a
// call count, costs every requested model (or the whole table) and ranks them
// cheapest-first. Tokens are supplied (not estimated), so costs are EXACT against
// the static, versioned pricing table — only the table's snapshot date qualifies
// them. Unknown requested models are reported in unknown_models, never guessed.

const router = Router();

export interface Row { model: string; provider: string; source: string; input_cost_usd: number; output_cost_usd: number; total_cost_usd: number; total_cost_for_all_calls_usd: number; }
export interface CompareCore {
  input_tokens: number; output_tokens: number; calls: number; model_count: number;
  rows: Row[];
  cheapest_model: string; most_expensive_model: string;
  cheapest_cost_usd: number; most_expensive_cost_usd: number; savings_vs_most_expensive_usd: number;
  unknown_models: string[];
  pricing_table_version: string; pricing_table_updated_at: string;
}

export function compare(body: any): { error: string } | { result: CompareCore } {
  const input_tokens = intIn(body?.input_tokens);
  const output_tokens = intIn(body?.output_tokens);
  if (input_tokens === undefined || input_tokens < 0) return { error: 'Provide "input_tokens" as a non-negative integer.' };
  if (output_tokens === undefined || output_tokens < 0) return { error: 'Provide "output_tokens" as a non-negative integer.' };

  const calls = intIn(body?.calls) ?? 1;
  if (calls < 1) return { error: '"calls" must be a positive integer (default 1).' };

  let prices: ModelPrice[];
  const unknown_models: string[] = [];
  if (body?.models !== undefined) {
    if (!Array.isArray(body.models) || body.models.length === 0) return { error: '"models" must be a non-empty array of model ids if provided.' };
    const seen = new Set<string>();
    prices = [];
    for (const m of body.models) {
      const p = lookupModel(m);
      if (p) { if (!seen.has(p.model)) { seen.add(p.model); prices.push(p); } }
      else unknown_models.push(typeof m === 'string' ? m : String(m));
    }
    if (prices.length === 0) return { error: 'None of the requested models are in the pricing table.', };
  } else {
    prices = allModels();
  }

  const rows: Row[] = prices.map((p) => {
    const c = costFor(p, input_tokens, output_tokens);
    return { model: p.model, provider: p.provider, source: p.source, input_cost_usd: c.input_cost_usd, output_cost_usd: c.output_cost_usd, total_cost_usd: c.total_cost_usd, total_cost_for_all_calls_usd: round(c.total_cost_usd * calls, 6) };
  });
  // cheapest first; tie-break by model id for determinism
  rows.sort((a, b) => (a.total_cost_usd - b.total_cost_usd) || a.model.localeCompare(b.model));

  const cheapest = rows[0];
  const dearest = rows[rows.length - 1];
  const savings_vs_most_expensive_usd = round((dearest.total_cost_usd - cheapest.total_cost_usd) * calls, 6);

  return {
    result: {
      input_tokens, output_tokens, calls, model_count: rows.length, rows,
      cheapest_model: cheapest.model, most_expensive_model: dearest.model,
      cheapest_cost_usd: cheapest.total_cost_usd, most_expensive_cost_usd: dearest.total_cost_usd, savings_vs_most_expensive_usd,
      unknown_models,
      pricing_table_version: PRICING_TABLE_VERSION, pricing_table_updated_at: PRICING_TABLE_UPDATED_AT,
    },
  };
}

function actions(r: CompareCore): string[] {
  const out = [`Cheapest: ${r.cheapest_model} at $${r.cheapest_cost_usd}/call (${r.input_tokens} in + ${r.output_tokens} out).`];
  if (r.model_count > 1) out.push(`vs ${r.most_expensive_model} at $${r.most_expensive_cost_usd}/call — ${r.calls > 1 ? `$${r.savings_vs_most_expensive_usd} saved across ${r.calls} calls` : `$${r.savings_vs_most_expensive_usd} cheaper per call`}.`);
  if (r.unknown_models.length) out.push(`Not priced (skipped): ${r.unknown_models.join(', ')}.`);
  return out;
}

const CHAIN_TO = [
  { api: 'llm-token-counter', reason: 'Estimate the input/output tokens to feed this comparison.' },
  { api: 'conversation-cost-ledger', reason: 'Tally actual spend once a model is chosen.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Model Pricing Comparator API', version: '1.0.0',
    description: 'Deterministic LLM pricing comparator. An input/output token split + call count → exact USD cost for every requested model (or the whole static table), ranked cheapest-first, with savings vs the most expensive. Tokens are supplied so costs are exact; only the pricing snapshot date qualifies them. Unknown models are reported, never guessed.',
    openapi_url: 'https://orbis-apis.onrender.com/model-pricing-comparator/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/compare', summary: 'Rank models by cost for a token split', price_usdc: 0.004 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL comparison + reasoning', price_usdc: 0.008 },
    ],
    pricing: [
      { path: '/compare', price_usdc: 0.004, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.008, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/compare', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = compare(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result,
    confidence_score: 1, confidence_per_section: { pricing: 1 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = compare(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Costed ${v.model_count} model(s) for ${v.input_tokens} in + ${v.output_tokens} out × ${v.calls} call(s); cheapest ${v.cheapest_model} ($${v.cheapest_cost_usd}/call).`,
      key_factors: [`Token split: ${v.input_tokens} in / ${v.output_tokens} out.`, `${v.model_count} models ranked; cheapest ${v.cheapest_model}, dearest ${v.most_expensive_model}.`, v.unknown_models.length ? `Skipped unknown: ${v.unknown_models.join(', ')}.` : 'All requested models priced.'],
      invalidators: PRICING_INVALIDATORS,
    },
    confidence_score: 1, confidence_per_section: { pricing: 1 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
