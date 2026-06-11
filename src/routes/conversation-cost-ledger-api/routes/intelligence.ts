import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, intIn, round, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import {
  lookupModel, estimateTokens, costFor, TOKEN_ESTIMATOR_CONFIDENCE,
  PRICING_TABLE_VERSION, PRICING_TABLE_UPDATED_AT, PRICING_INVALIDATORS,
} from '../../_aplus/llm-pricing';

// Deterministic conversation cost ledger. Tallies input/output tokens across a
// message log (supplied tokens or text to estimate), prices them against a static
// table, and optionally projects spend for N more turns. Assistant messages count
// as output; all other roles count as input. NOTE: this is naive per-message
// billing — real chat APIs re-send prior context as input each turn, so cumulative
// input is higher (stated as an invalidator). Cost given tokens is exact.

const router = Router();
const MAX_MESSAGES = 5000;

export interface LedgerCore {
  model: string | null; provider: string | null; found: boolean;
  message_count: number; total_input_tokens: number; total_output_tokens: number; total_tokens: number;
  input_cost_usd: number | null; output_cost_usd: number | null; total_cost_usd: number | null;
  is_estimate: boolean;
  projected_turns: number;
  projected_input_tokens: number | null; projected_output_tokens: number | null;
  projected_additional_cost_usd: number | null; projected_total_cost_usd: number | null;
  pricing_table_version: string; pricing_table_updated_at: string;
}

export function tally(body: any): { error: string } | { result: LedgerCore } {
  const raw = body?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return { error: '"messages" must be a non-empty array of {role, tokens?, text?}.' };
  if (raw.length > MAX_MESSAGES) return { error: `"messages" exceeds the ${MAX_MESSAGES}-item limit (${raw.length}).` };

  const modelIn = body?.model;
  if (typeof modelIn !== 'string') return { error: 'Provide "model" as a string model id.' };
  const price = lookupModel(modelIn);
  const found = price !== null;

  let total_input_tokens = 0, total_output_tokens = 0, anyEstimated = false;
  let inputMsgs = 0, outputMsgs = 0;
  for (let i = 0; i < raw.length; i++) {
    const m = raw[i] ?? {};
    const isOutput = m.role === 'assistant';
    const tk = intIn(m.tokens);
    let tokens: number;
    if (tk !== undefined) {
      if (tk < 0) return { error: `messages[${i}].tokens must be 0 or greater.` };
      tokens = tk;
    } else {
      const text = str(m.text);
      if (text === undefined) return { error: `messages[${i}] needs either "tokens" or non-empty "text".` };
      tokens = estimateTokens(text); anyEstimated = true;
    }
    if (isOutput) { total_output_tokens += tokens; outputMsgs++; } else { total_input_tokens += tokens; inputMsgs++; }
  }

  let input_cost_usd: number | null = null, output_cost_usd: number | null = null, total_cost_usd: number | null = null;
  if (price) {
    const c = costFor(price, total_input_tokens, total_output_tokens);
    input_cost_usd = c.input_cost_usd; output_cost_usd = c.output_cost_usd; total_cost_usd = c.total_cost_usd;
  }

  // Projection
  const projected_turns = intIn(body?.projected_turns) ?? 0;
  if (projected_turns < 0) return { error: '"projected_turns" must be 0 or greater.' };
  let projected_input_tokens: number | null = null, projected_output_tokens: number | null = null;
  let projected_additional_cost_usd: number | null = null, projected_total_cost_usd: number | null = null;
  if (projected_turns > 0) {
    const avgIn = num(body?.avg_input_tokens_per_turn);
    const avgOut = num(body?.avg_output_tokens_per_turn);
    if (avgIn !== undefined && avgIn < 0) return { error: '"avg_input_tokens_per_turn" must be 0 or greater.' };
    if (avgOut !== undefined && avgOut < 0) return { error: '"avg_output_tokens_per_turn" must be 0 or greater.' };
    const perInput = avgIn ?? (inputMsgs > 0 ? total_input_tokens / inputMsgs : 0);
    const perOutput = avgOut ?? (outputMsgs > 0 ? total_output_tokens / outputMsgs : 0);
    projected_input_tokens = Math.round(perInput * projected_turns);
    projected_output_tokens = Math.round(perOutput * projected_turns);
    if (price) {
      const pc = costFor(price, projected_input_tokens, projected_output_tokens);
      projected_additional_cost_usd = pc.total_cost_usd;
      projected_total_cost_usd = round((total_cost_usd ?? 0) + pc.total_cost_usd, 6);
    }
  }

  return {
    result: {
      model: price ? price.model : modelIn, provider: price ? price.provider : null, found,
      message_count: raw.length, total_input_tokens, total_output_tokens, total_tokens: total_input_tokens + total_output_tokens,
      input_cost_usd, output_cost_usd, total_cost_usd,
      is_estimate: anyEstimated,
      projected_turns, projected_input_tokens, projected_output_tokens, projected_additional_cost_usd, projected_total_cost_usd,
      pricing_table_version: PRICING_TABLE_VERSION, pricing_table_updated_at: PRICING_TABLE_UPDATED_AT,
    },
  };
}

function actions(r: LedgerCore): string[] {
  const out: string[] = [];
  if (r.found && r.total_cost_usd !== null) out.push(`Conversation cost so far on ${r.model}: $${r.total_cost_usd} (${r.total_input_tokens} in + ${r.total_output_tokens} out).`);
  else out.push(`Model "${r.model}" not in the pricing table — tokens tallied but cost not computed.`);
  if (r.projected_turns > 0 && r.projected_total_cost_usd !== null) out.push(`Projected to $${r.projected_total_cost_usd} after ${r.projected_turns} more turn(s).`);
  out.push('Naive per-message tally — real chat APIs re-send prior context as input each turn, so cumulative input cost is higher.');
  return out;
}

const CHAIN_TO = [
  { api: 'model-pricing-comparator', reason: 'Compare this conversation\'s cost across other models.' },
  { api: 'context-budget-planner', reason: 'Check whether the running context still fits the window.' },
];

function conf(r: LedgerCore) {
  const exact = !r.is_estimate;
  const base = exact ? 1 : TOKEN_ESTIMATOR_CONFIDENCE;
  const sections: Record<string, number> = { usage: base, cost: r.found ? base : 0 };
  if (r.projected_turns > 0) sections.projection = 0.6; // projection from averages is inherently approximate
  return { score: exact ? (r.found ? 1 : 0.85) : TOKEN_ESTIMATOR_CONFIDENCE, sections };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Conversation Cost Ledger API', version: '1.0.0',
    description: 'Deterministic conversation cost ledger. Tallies input/output tokens across a message log (supplied tokens or text to estimate), prices them against a static table, and optionally projects spend for N more turns. Assistant = output, other roles = input. Naive per-message billing; cost given tokens is exact.',
    openapi_url: 'https://orbis-apis.onrender.com/conversation-cost-ledger/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/tally', summary: 'Tally + price a conversation', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL tally + projection + reasoning', price_usdc: 0.009 },
    ],
    pricing: [
      { path: '/tally', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/tally', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = tally(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const c = conf(r.result);
  respond(res, t0, {
    ...r.result,
    confidence_score: c.score, confidence_per_section: c.sections,
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = tally(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  const c = conf(v);
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.message_count} messages → ${v.total_input_tokens} in + ${v.total_output_tokens} out${v.found ? `; $${v.total_cost_usd} on ${v.model}` : `; model "${v.model}" not priced`}${v.projected_turns > 0 && v.projected_total_cost_usd !== null ? `; projected $${v.projected_total_cost_usd} after ${v.projected_turns} turns` : ''}.`,
      key_factors: [`${v.total_input_tokens} input / ${v.total_output_tokens} output tokens.`, v.found ? `Priced against ${v.model} (${v.provider}).` : 'No matching model price.', v.is_estimate ? 'Some tokens estimated offline.' : 'All token counts supplied directly (exact cost).'],
      invalidators: [
        ...PRICING_INVALIDATORS,
        'Naive per-message tally: real chat APIs re-send prior context as input each turn, so cumulative input is higher than the sum of message inputs.',
        ...(v.projected_turns > 0 ? ['Projection multiplies average per-turn tokens by the requested turns — actual future turns will vary.'] : []),
      ],
    },
    confidence_score: c.score, confidence_per_section: c.sections,
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
