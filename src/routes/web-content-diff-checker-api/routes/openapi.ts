import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const DiffOp = { type: 'object', required: ['op', 'value'], additionalProperties: false, properties: { op: { type: 'string', enum: ['equal', 'add', 'remove'] }, value: { type: 'string' } } };

const DiffCore = {
  type: 'object',
  required: ['mode', 'identical', 'similarity_pct', 'added', 'removed', 'unchanged', 'total_a', 'total_b', 'diff_ops', 'unified_diff'],
  properties: {
    mode: { type: 'string', enum: ['line', 'word'] },
    identical: { type: 'boolean' },
    similarity_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Sørensen–Dice token similarity (2·LCS / (|a|+|b|)).' },
    added: { type: 'integer', minimum: 0 }, removed: { type: 'integer', minimum: 0 }, unchanged: { type: 'integer', minimum: 0 },
    total_a: { type: 'integer', minimum: 0 }, total_b: { type: 'integer', minimum: 0 },
    diff_ops: { type: 'array', items: { $ref: '#/components/schemas/DiffOp' } },
    unified_diff: { type: 'string', description: "Unified-style diff: ' ' context, '-' removed, '+' added." },
  },
};

const DiffRequest = {
  type: 'object', required: ['a', 'b'], additionalProperties: false,
  properties: {
    a: { type: 'string', description: 'First version (e.g. old page body).' },
    b: { type: 'string', description: 'Second version (e.g. new page body).' },
    mode: { type: 'string', enum: ['line', 'word'], default: 'line' },
  },
};

const A = 'line1\nline2\nline3';
const B = 'line1\nline2 changed\nline3\nline4';
const CORE_EXAMPLE = {
  mode: 'line', identical: false, similarity_pct: 57.14, added: 2, removed: 1, unchanged: 2, total_a: 3, total_b: 4,
  diff_ops: [
    { op: 'equal', value: 'line1' }, { op: 'remove', value: 'line2' }, { op: 'add', value: 'line2 changed' },
    { op: 'equal', value: 'line3' }, { op: 'add', value: 'line4' },
  ],
  unified_diff: ' line1\n-line2\n+line2 changed\n line3\n+line4',
};
const TAIL = (acts: string[], extra: Record<string, number> = {}) => ({
  confidence_score: 1, confidence_per_section: { diff: 1, similarity: 1, ...extra },
  recommended_actions_priority_order: acts,
  chain_to: [
    { api: 'website-change-monitor', reason: 'Schedule recurring checks once you know what a meaningful diff looks like.' },
    { api: 'web-content-freshness-scorer', reason: 'Combine change magnitude with publish/modified dates to score freshness.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
});

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('diff', 'similarity'), _Tail: Tail, DiffOp, DiffCore, DiffRequest,
  DiscoveryResponse: discoverySchema(),
  DiffResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DiffCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DiffCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/diff', summary: 'Diff two texts → similarity %, counts, ops, unified diff', operationId: 'diff', priceUsdc: 0.005,
    requestSchemaRef: 'DiffRequest', responseSchemaRef: 'DiffResponse', requestExample: { a: A, b: B, mode: 'line' },
    responseExample: { trace_id: 'wcd1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL(['Content is 57.14% similar: 2 line(s) added, 1 removed.', 'Substantial change — re-index or re-summarize the new version.']) },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL diff + reasoning + change guidance', operationId: 'lookup', priceUsdc: 0.01, oneCall: true,
    requestSchemaRef: 'DiffRequest', responseSchemaRef: 'LookupResponse', requestExample: { a: A, b: B },
    responseExample: {
      trace_id: 'wcd2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      reasoning: { why_result_generated: 'LCS line diff: 2 unchanged, 2 added, 1 removed → 57.14% similar.', key_factors: ['3 vs 4 lines.', 'Identical: false.', 'Similarity 57.14%.'], invalidators: ['Similarity is token-based; reordering content lowers it even when wording is unchanged.', 'Whitespace/markup differences count as changes in line mode.', 'A near-identical % can still hide a single critical edit (e.g. a price or date).'] },
      ...TAIL(['Content is 57.14% similar: 2 line(s) added, 1 removed.', 'Substantial change — re-index or re-summarize the new version.']),
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web-content-diff-checker', title: 'Web Content Diff Checker API', version: '1.0.0',
  description: 'Deterministic LCS text diff between two page bodies/snapshots: line or word mode, Sørensen–Dice similarity %, add/remove/unchanged counts, op list, and a unified-diff string. Pure compute — no LLM, no fetch (you supply both texts).',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
