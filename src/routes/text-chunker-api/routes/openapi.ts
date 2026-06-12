import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const ChunkRow = {
  type: 'object', required: ['index', 'text', 'char_start', 'char_end', 'char_count', 'estimated_tokens'], additionalProperties: false,
  properties: { index: { type: 'integer' }, text: { type: 'string' }, char_start: { type: 'integer' }, char_end: { type: 'integer' }, char_count: { type: 'integer' }, estimated_tokens: { type: 'integer' } },
};
const ChunkCore = {
  type: 'object',
  required: ['strategy', 'chunk_count', 'total_chars', 'total_estimated_tokens', 'max_tokens', 'max_chars', 'overlap', 'is_estimate', 'chunks'],
  properties: {
    strategy: { type: 'string', enum: ['tokens', 'characters', 'sentences', 'paragraphs'] },
    chunk_count: { type: 'integer' }, total_chars: { type: 'integer' }, total_estimated_tokens: { type: 'integer' },
    max_tokens: { type: 'integer' }, max_chars: { type: ['integer', 'null'] }, overlap: { type: 'integer' }, is_estimate: { type: 'boolean', enum: [true] },
    chunks: { type: 'array', items: { $ref: '#/components/schemas/ChunkRow' } },
  },
};

const ChunkRequest = {
  type: 'object', required: ['text'], additionalProperties: false,
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 200000 },
    strategy: { type: 'string', enum: ['tokens', 'characters', 'sentences', 'paragraphs'], description: 'Default tokens.' },
    max_tokens: { type: 'integer', minimum: 1, description: 'Target tokens per chunk (tokens/sentences/paragraphs strategies). Default 512.' },
    max_chars: { type: 'integer', minimum: 1, description: 'Chars per chunk for the characters strategy. Default 2000.' },
    overlap: { type: 'integer', minimum: 0, description: 'Overlap between chunks — tokens (tokens), chars (characters), or units (sentences/paragraphs). Default 0.' },
  },
};

const TXT = 'Vector search retrieves relevant passages. The model then answers using them.';
const CORE = {
  strategy: 'sentences', chunk_count: 1, total_chars: 77, total_estimated_tokens: 17,
  max_tokens: 512, max_chars: null, overlap: 0, is_estimate: true,
  chunks: [{ index: 0, text: TXT, char_start: 0, char_end: 77, char_count: 77, estimated_tokens: 17 }],
};
const ACTS = [
  'Split into 1 chunk(s) by sentences; ~17 tokens total (estimate).',
  'Char offsets (char_start/char_end) are exact and contiguous (with overlap) over the source text.',
];
const CHAIN = [
  { api: 'llm-token-counter', reason: 'Get a token + cost estimate for an individual chunk.' },
  { api: 'context-budget-planner', reason: 'Plan how many chunks fit a model context window per call.' },
];
const TAIL = {
  confidence_score: 0.7, confidence_per_section: { chunking: 1, tokens: 0.7 }, recommended_actions_priority_order: ACTS,
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('chunking', 'tokens'), _Tail: Tail, ChunkRow, ChunkCore, ChunkRequest,
  DiscoveryResponse: discoverySchema(),
  ChunkResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ChunkCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ChunkCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'txc-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = { text: TXT, strategy: 'sentences', max_tokens: 512 };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/chunk', summary: 'Split text into chunks with offsets', operationId: 'chunk', priceUsdc: 0.005,
    requestSchemaRef: 'ChunkRequest', responseSchemaRef: 'ChunkResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL chunking + reasoning', operationId: 'lookup', priceUsdc: 0.009, oneCall: true,
    requestSchemaRef: 'ChunkRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '77 characters split by sentences into 1 chunk(s), ~17 tokens total.',
        key_factors: ['Strategy: sentences (max_tokens 512).', 'Overlap: 0.', 'Char offsets are exact; token counts are estimates.'],
        invalidators: ['Per-chunk token counts are an offline heuristic estimate, not the model tokenizer.', 'The tokens strategy sizes windows at ~4 chars/token; real token boundaries differ by model and content.', 'Changing strategy, max size, or overlap changes the chunk boundaries.'],
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'text-chunker', title: 'Text Chunker / Splitter API (RAG)', version: '1.0.0',
  description: 'Deterministic RAG text splitter. Splits text by token budget (char-approximated), fixed characters, sentences, or paragraphs, with overlap, returning each chunk with exact char offsets and an estimated token count. Char offsets are exact; token counts are offline heuristic estimates.',
  endpoints, schemas, infoExtensions: { 'x-llm-infra': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
