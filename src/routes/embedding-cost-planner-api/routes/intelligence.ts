import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, intIn, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import {
  lookupEmbeddingModel, embeddingCost, estimateTokens, TOKEN_ESTIMATOR_CONFIDENCE,
  PRICING_TABLE_VERSION, PRICING_TABLE_UPDATED_AT, PRICING_INVALIDATORS,
} from '../../_aplus/llm-pricing';

// Deterministic embedding cost + batch planner. From documents (or a token total,
// or doc_count × avg tokens), an embedding model, and a batch size, computes the
// exact embedding cost (given tokens) from a static, versioned price table, the
// vector storage footprint, the number of batch requests, and how many documents
// exceed the model's per-item token cap. Token counts from text are heuristic
// estimates; cost given tokens is exact. Unknown model → found:false.

const router = Router();
const MAX_DOCS = 100_000;

export interface EmbedCore {
  model: string | null; provider: string | null; found: boolean;
  doc_count: number; total_tokens: number; is_estimate: boolean;
  price_per_mtok: number | null; embedding_cost_usd: number | null;
  dimensions: number; bytes_per_dim: number; vector_bytes: number; total_vector_storage_bytes: number;
  batch_size: number; batch_count: number;
  max_input_tokens: number | null; docs_over_token_limit: number;
  pricing_table_version: string; pricing_table_updated_at: string;
}

export function plan(body: any): { error: string } | { result: EmbedCore } {
  const modelIn = body?.model;
  if (typeof modelIn !== 'string') return { error: 'Provide "model" as an embedding model id (e.g. text-embedding-3-small).' };
  const price = lookupEmbeddingModel(modelIn);
  const found = price !== null;

  // Determine doc_count + total_tokens from one of three input shapes.
  let doc_count: number, total_tokens: number, is_estimate: boolean;
  let docs_over_token_limit = 0;
  const docs = body?.documents;
  const totalIn = intIn(body?.total_tokens);
  const avg = num(body?.avg_tokens_per_doc);
  if (Array.isArray(docs)) {
    if (docs.length === 0) return { error: '"documents" must be a non-empty array of strings.' };
    if (docs.length > MAX_DOCS) return { error: `"documents" exceeds the ${MAX_DOCS}-item limit (${docs.length}).` };
    doc_count = docs.length; total_tokens = 0; is_estimate = true;
    const cap = price?.max_input_tokens;
    for (let i = 0; i < docs.length; i++) {
      const t = typeof docs[i] === 'string' ? estimateTokens(docs[i]) : 0;
      total_tokens += t;
      if (cap !== undefined && t > cap) docs_over_token_limit++;
    }
  } else if (totalIn !== undefined) {
    if (totalIn < 0) return { error: '"total_tokens" must be 0 or greater.' };
    total_tokens = totalIn; doc_count = intIn(body?.doc_count) ?? 1; is_estimate = false;
    if (doc_count < 1) return { error: '"doc_count" must be a positive integer.' };
  } else if (avg !== undefined) {
    const dc = intIn(body?.doc_count);
    if (dc === undefined || dc < 1) return { error: 'With "avg_tokens_per_doc", also provide a positive "doc_count".' };
    if (avg < 0) return { error: '"avg_tokens_per_doc" must be 0 or greater.' };
    if (dc > MAX_DOCS) return { error: `"doc_count" exceeds the ${MAX_DOCS} limit.` };
    doc_count = dc; total_tokens = Math.round(avg * dc); is_estimate = true;
  } else {
    return { error: 'Provide one of: "documents" (string[]), "total_tokens", or "doc_count"+"avg_tokens_per_doc".' };
  }

  const dimIn = intIn(body?.dimensions);
  const maxDims = price?.max_dimensions;
  if (dimIn !== undefined) {
    if (dimIn < 1) return { error: '"dimensions" must be a positive integer.' };
    if (maxDims !== undefined && dimIn > maxDims) return { error: `"dimensions" (${dimIn}) exceeds ${price!.model}'s max of ${maxDims}.` };
  }
  const dimensions = dimIn ?? (price?.default_dimensions ?? 1536);
  const bytes_per_dim = intIn(body?.bytes_per_dim) ?? 4;
  if (bytes_per_dim < 1) return { error: '"bytes_per_dim" must be a positive integer (e.g. 4 for float32).' };

  const batch_size = intIn(body?.batch_size) ?? 96;
  if (batch_size < 1) return { error: '"batch_size" must be a positive integer.' };

  const vector_bytes = dimensions * bytes_per_dim;
  const total_vector_storage_bytes = doc_count * vector_bytes;
  const batch_count = Math.ceil(doc_count / batch_size);
  const embedding_cost_usd = price ? embeddingCost(price, total_tokens) : null;

  return {
    result: {
      model: price ? price.model : modelIn, provider: price ? price.provider : null, found,
      doc_count, total_tokens, is_estimate,
      price_per_mtok: price ? price.price_per_mtok : null, embedding_cost_usd,
      dimensions, bytes_per_dim, vector_bytes, total_vector_storage_bytes,
      batch_size, batch_count,
      max_input_tokens: price ? price.max_input_tokens : null, docs_over_token_limit,
      pricing_table_version: PRICING_TABLE_VERSION, pricing_table_updated_at: PRICING_TABLE_UPDATED_AT,
    },
  };
}

function actions(r: EmbedCore): string[] {
  const out: string[] = [];
  if (r.found && r.embedding_cost_usd !== null) out.push(`Embed ${r.doc_count} doc(s) (~${r.total_tokens} tokens) on ${r.model}: $${r.embedding_cost_usd} in ${r.batch_count} batch request(s) of ≤${r.batch_size}.`);
  else out.push(`Model "${r.model}" not in the embedding price table — tokens/storage computed but cost not priced.`);
  out.push(`Vectors: ${r.dimensions}-dim → ${r.vector_bytes} bytes each, ${r.total_vector_storage_bytes} bytes total storage.`);
  if (r.docs_over_token_limit > 0) out.push(`${r.docs_over_token_limit} document(s) exceed the ${r.max_input_tokens}-token per-item cap and will be rejected/truncated — chunk them first.`);
  return out;
}

const CHAIN_TO = [
  { api: 'text-chunker', reason: 'Split documents that exceed the per-item token cap before embedding.' },
  { api: 'model-pricing-comparator', reason: 'Compare LLM (not embedding) costs for a downstream RAG generation step.' },
];

function conf(r: EmbedCore) {
  const base = r.is_estimate ? TOKEN_ESTIMATOR_CONFIDENCE : 1;
  return { score: base, sections: { tokens: base, cost: r.found ? base : 0, storage: 1 } };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Embedding Cost & Batch Planner API', version: '1.0.0',
    description: 'Deterministic embedding cost + batch planner. From documents (or a token total, or doc_count × avg tokens) + an embedding model + batch size, returns the exact embedding cost from a static price table, the vector storage footprint, the number of batch requests, and how many docs exceed the per-item token cap. Token counts from text are estimates; cost given tokens is exact.',
    openapi_url: 'https://orbis-apis.onrender.com/embedding-cost-planner/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/plan', summary: 'Embedding cost + batch + storage plan', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL plan + reasoning', price_usdc: 0.009 },
    ],
    pricing: [
      { path: '/plan', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.009, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/plan', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = plan(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const c = conf(r.result);
  respond(res, t0, {
    ...r.result, confidence_score: c.score, confidence_per_section: c.sections,
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = plan(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result; const c = conf(v);
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `${v.doc_count} doc(s), ~${v.total_tokens} tokens${v.found ? ` → $${v.embedding_cost_usd} on ${v.model}` : `; model "${v.model}" not priced`}; ${v.batch_count} batch(es); ${v.total_vector_storage_bytes} bytes of vectors.`,
      key_factors: [`${v.total_tokens} tokens at ${v.price_per_mtok !== null ? `$${v.price_per_mtok}/MTok` : 'unknown price'}.`, `${v.dimensions} dims × ${v.bytes_per_dim} bytes = ${v.vector_bytes} bytes/vector.`, v.is_estimate ? 'Token counts estimated offline.' : 'Token count supplied (exact cost).'],
      invalidators: [...PRICING_INVALIDATORS, 'Storage assumes dense float vectors at bytes_per_dim; quantized or compressed indexes store far less.', 'Batch count assumes the item-count limit binds; a per-request token limit may force more requests.'],
    },
    confidence_score: c.score, confidence_per_section: c.sections,
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
