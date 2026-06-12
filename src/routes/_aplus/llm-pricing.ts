// Static, versioned LLM pricing table + an APPROXIMATE offline token estimator.
//
// DETERMINISM / NO-UPSTREAM: this module never calls a tokenizer or pricing
// endpoint. That keeps the A+ cost APIs purely input→output (no upstream to
// 502) — but it means token counts are HEURISTIC ESTIMATES, never the model's
// real tokenizer. Every estimate is therefore returned with confidence < 1.0
// and an explicit "approximate tokenizer" invalidator. Cost, GIVEN a token
// count, is exact arithmetic from the static table below.
//
// Prices are a point-in-time snapshot. "Pricing-table changed" / "provider
// billing changed" are explicit invalidators on every cost result. Unknown
// models return found:false — we never guess a price.
//
// Anthropic prices: from the bundled claude-api reference (source:'reference').
// Other providers: best-effort public snapshot (source:'public-snapshot') —
// lower-confidence, correct only as of PRICING_TABLE_UPDATED_AT.

export const PRICING_TABLE_VERSION = '2026-06-11';
export const PRICING_TABLE_UPDATED_AT = '2026-06-11T00:00:00.000Z';

export interface ModelPrice {
  model: string;             // canonical id
  provider: string;
  input_per_mtok: number;    // USD per 1,000,000 input tokens
  output_per_mtok: number;   // USD per 1,000,000 output tokens
  context_window: number;    // tokens
  max_output_tokens: number | null;
  source: 'reference' | 'public-snapshot';
}

// Canonical table. Keys are canonical model ids; ALIASES (below) map friendly
// names onto these. Batch pricing is 0.5x and cache reads ~0.1x of input — see
// helpers. No `exact_tokenizer` field: this service has none, by design.
const TABLE: Record<string, ModelPrice> = {
  // ---- Anthropic (authoritative reference) ----
  'claude-fable-5':   { model: 'claude-fable-5',   provider: 'anthropic', input_per_mtok: 10, output_per_mtok: 50, context_window: 1_000_000, max_output_tokens: 128_000, source: 'reference' },
  'claude-mythos-5':  { model: 'claude-mythos-5',  provider: 'anthropic', input_per_mtok: 10, output_per_mtok: 50, context_window: 1_000_000, max_output_tokens: 128_000, source: 'reference' },
  'claude-opus-4-8':  { model: 'claude-opus-4-8',  provider: 'anthropic', input_per_mtok: 5,  output_per_mtok: 25, context_window: 1_000_000, max_output_tokens: 128_000, source: 'reference' },
  'claude-opus-4-7':  { model: 'claude-opus-4-7',  provider: 'anthropic', input_per_mtok: 5,  output_per_mtok: 25, context_window: 1_000_000, max_output_tokens: 128_000, source: 'reference' },
  'claude-opus-4-6':  { model: 'claude-opus-4-6',  provider: 'anthropic', input_per_mtok: 5,  output_per_mtok: 25, context_window: 1_000_000, max_output_tokens: 128_000, source: 'reference' },
  'claude-opus-4-5':  { model: 'claude-opus-4-5',  provider: 'anthropic', input_per_mtok: 5,  output_per_mtok: 25, context_window: 200_000,   max_output_tokens: 64_000,  source: 'reference' },
  'claude-sonnet-4-6':{ model: 'claude-sonnet-4-6',provider: 'anthropic', input_per_mtok: 3,  output_per_mtok: 15, context_window: 1_000_000, max_output_tokens: 64_000,  source: 'reference' },
  'claude-sonnet-4-5':{ model: 'claude-sonnet-4-5',provider: 'anthropic', input_per_mtok: 3,  output_per_mtok: 15, context_window: 200_000,   max_output_tokens: 64_000,  source: 'reference' },
  'claude-haiku-4-5': { model: 'claude-haiku-4-5', provider: 'anthropic', input_per_mtok: 1,  output_per_mtok: 5,  context_window: 200_000,   max_output_tokens: 64_000,  source: 'reference' },

  // ---- OpenAI (public snapshot) ----
  'gpt-4o':          { model: 'gpt-4o',          provider: 'openai', input_per_mtok: 2.5,  output_per_mtok: 10,  context_window: 128_000, max_output_tokens: 16_384, source: 'public-snapshot' },
  'gpt-4o-mini':     { model: 'gpt-4o-mini',     provider: 'openai', input_per_mtok: 0.15, output_per_mtok: 0.6, context_window: 128_000, max_output_tokens: 16_384, source: 'public-snapshot' },
  'gpt-4-turbo':     { model: 'gpt-4-turbo',     provider: 'openai', input_per_mtok: 10,   output_per_mtok: 30,  context_window: 128_000, max_output_tokens: 4_096,  source: 'public-snapshot' },

  // ---- Google (public snapshot) ----
  'gemini-1.5-pro':   { model: 'gemini-1.5-pro',   provider: 'google', input_per_mtok: 1.25,  output_per_mtok: 5,   context_window: 2_000_000, max_output_tokens: 8_192, source: 'public-snapshot' },
  'gemini-1.5-flash': { model: 'gemini-1.5-flash', provider: 'google', input_per_mtok: 0.075, output_per_mtok: 0.3, context_window: 1_000_000, max_output_tokens: 8_192, source: 'public-snapshot' },
};

// Friendly aliases → canonical ids (lowercased lookup).
const ALIASES: Record<string, string> = {
  'opus': 'claude-opus-4-8', 'claude-opus': 'claude-opus-4-8', 'opus-4.8': 'claude-opus-4-8',
  'sonnet': 'claude-sonnet-4-6', 'claude-sonnet': 'claude-sonnet-4-6',
  'haiku': 'claude-haiku-4-5', 'claude-haiku': 'claude-haiku-4-5',
  'fable': 'claude-fable-5', 'fable-5': 'claude-fable-5',
  'gpt4o': 'gpt-4o', 'gpt-4o-2024': 'gpt-4o',
  'gemini-pro': 'gemini-1.5-pro', 'gemini-flash': 'gemini-1.5-flash',
};

/** Look up a model price by canonical id or alias. Returns null if unknown (never guess). */
export function lookupModel(model: unknown): ModelPrice | null {
  if (typeof model !== 'string') return null;
  const key = model.trim().toLowerCase();
  if (TABLE[key]) return TABLE[key];
  const alias = ALIASES[key];
  if (alias && TABLE[alias]) return TABLE[alias];
  return null;
}

/** Every canonical model in the table (for the comparator / discovery). */
export function allModels(): ModelPrice[] {
  return Object.values(TABLE);
}

// ---- APPROXIMATE token estimator (offline heuristic — NOT a real tokenizer) ----
//
// Blends a chars/4 estimate with a words*4/3 estimate, then nudges up for code-
// like density (lots of punctuation/whitespace tokenizes higher). This is a
// rough cross-model approximation; real counts vary by model/tokenizer and the
// Fable-5 tokenizer in particular runs ~30% higher. Always confidence < 1.0.
export const TOKEN_ESTIMATOR_CONFIDENCE = 0.7;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const chars = text.length;
  const words = (text.trim().match(/\S+/g) || []).length;
  const byChars = chars / 4;
  const byWords = words * 1.333;
  // punctuation/symbol density → more tokens (code, JSON, markup)
  const symbols = (text.match(/[^\w\s]/g) || []).length;
  const symbolBoost = (symbols / Math.max(chars, 1)) * (chars / 8);
  const est = (byChars * 0.5) + (byWords * 0.5) + symbolBoost;
  return Math.max(words > 0 ? 1 : 0, Math.ceil(est));
}

/** USD cost for a given token split against a model price. Exact arithmetic. */
export function costFor(p: ModelPrice, inputTokens: number, outputTokens: number): {
  input_cost_usd: number; output_cost_usd: number; total_cost_usd: number;
} {
  const input_cost_usd = (inputTokens / 1_000_000) * p.input_per_mtok;
  const output_cost_usd = (outputTokens / 1_000_000) * p.output_per_mtok;
  // round to 6 dp (sub-cent precision matters for per-call agent budgeting)
  const r = (n: number) => Math.round((n + Number.EPSILON) * 1e6) / 1e6;
  return { input_cost_usd: r(input_cost_usd), output_cost_usd: r(output_cost_usd), total_cost_usd: r(input_cost_usd + output_cost_usd) };
}

// ---- Embedding models (input-only pricing; public snapshot) ----
export interface EmbeddingPrice {
  model: string; provider: string;
  price_per_mtok: number;          // USD per 1,000,000 input tokens
  default_dimensions: number;      // vector size emitted by default
  max_dimensions: number;          // largest selectable dimension count
  max_input_tokens: number;        // per-item token cap
  source: 'public-snapshot';
}

const EMBEDDING_TABLE: Record<string, EmbeddingPrice> = {
  'text-embedding-3-small': { model: 'text-embedding-3-small', provider: 'openai', price_per_mtok: 0.02, default_dimensions: 1536, max_dimensions: 1536, max_input_tokens: 8191, source: 'public-snapshot' },
  'text-embedding-3-large': { model: 'text-embedding-3-large', provider: 'openai', price_per_mtok: 0.13, default_dimensions: 3072, max_dimensions: 3072, max_input_tokens: 8191, source: 'public-snapshot' },
  'text-embedding-ada-002': { model: 'text-embedding-ada-002', provider: 'openai', price_per_mtok: 0.10, default_dimensions: 1536, max_dimensions: 1536, max_input_tokens: 8191, source: 'public-snapshot' },
  'embed-english-v3.0':     { model: 'embed-english-v3.0',     provider: 'cohere', price_per_mtok: 0.10, default_dimensions: 1024, max_dimensions: 1024, max_input_tokens: 512,  source: 'public-snapshot' },
  'embed-multilingual-v3.0':{ model: 'embed-multilingual-v3.0',provider: 'cohere', price_per_mtok: 0.10, default_dimensions: 1024, max_dimensions: 1024, max_input_tokens: 512,  source: 'public-snapshot' },
};

const EMBEDDING_ALIASES: Record<string, string> = {
  'text-embedding-3-small': 'text-embedding-3-small', 'embedding-3-small': 'text-embedding-3-small', '3-small': 'text-embedding-3-small',
  'text-embedding-3-large': 'text-embedding-3-large', 'embedding-3-large': 'text-embedding-3-large', '3-large': 'text-embedding-3-large',
  'ada-002': 'text-embedding-ada-002', 'ada': 'text-embedding-ada-002',
  'cohere-embed-english': 'embed-english-v3.0', 'cohere-embed-multilingual': 'embed-multilingual-v3.0',
};

/** Look up an embedding model price by id or alias. Returns null if unknown. */
export function lookupEmbeddingModel(model: unknown): EmbeddingPrice | null {
  if (typeof model !== 'string') return null;
  const key = model.trim().toLowerCase();
  if (EMBEDDING_TABLE[key]) return EMBEDDING_TABLE[key];
  const alias = EMBEDDING_ALIASES[key];
  if (alias && EMBEDDING_TABLE[alias]) return EMBEDDING_TABLE[alias];
  return null;
}

/** Every embedding model in the table. */
export function allEmbeddingModels(): EmbeddingPrice[] {
  return Object.values(EMBEDDING_TABLE);
}

/** USD embedding cost for a token count. Exact arithmetic. */
export function embeddingCost(p: EmbeddingPrice, tokens: number): number {
  return Math.round(((tokens / 1_000_000) * p.price_per_mtok + Number.EPSILON) * 1e6) / 1e6;
}

/** Standard invalidators every cost/token result should carry. */
export const PRICING_INVALIDATORS = [
  `Static pricing snapshot (table version ${PRICING_TABLE_VERSION}); provider price changes after this date are not reflected.`,
  'Token counts are an offline heuristic estimate, NOT the model\'s real tokenizer — actual counts differ (e.g. the Fable-5 tokenizer runs ~30% higher).',
  'Hidden system/tool/thinking tokens, prompt-cache writes/reads, and batch (0.5x) or cache-read (~0.1x) discounts are not included unless you supply them.',
];
