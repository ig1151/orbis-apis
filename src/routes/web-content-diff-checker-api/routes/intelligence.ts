import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { round, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic text diff: LCS-based line or word diff with a Sørensen–Dice
// similarity %, change counts, op list, and a unified-diff string. Pure compute,
// no LLM, no fetch (caller supplies both texts — "Web Content" = comparing two
// fetched page bodies/snapshots).

const router = Router();
const MAX_TOKENS = 5000;

export type Op = 'equal' | 'add' | 'remove';
export interface DiffOp { op: Op; value: string; }

function tokenize(s: string, mode: 'line' | 'word'): string[] {
  if (mode === 'line') return s.split(/\r?\n/);
  return s.length ? s.split(/(\s+)/).filter((t) => t.length > 0) : [];
}

// Classic LCS DP + backtrack into add/remove/equal ops.
export function diffTokens(a: string[], b: string[]): { ops: DiffOp[]; lcs: number } {
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops: DiffOp[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ op: 'equal', value: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ op: 'remove', value: a[i] }); i++; }
    else { ops.push({ op: 'add', value: b[j] }); j++; }
  }
  while (i < n) ops.push({ op: 'remove', value: a[i++] });
  while (j < m) ops.push({ op: 'add', value: b[j++] });
  return { ops, lcs: dp[0][0] };
}

// Unified-style diff string: ' ' context, '-' removed, '+' added.
function unified(ops: DiffOp[]): string {
  return ops.map((o) => (o.op === 'equal' ? ' ' : o.op === 'remove' ? '-' : '+') + o.value).join('\n');
}

export interface DiffResult {
  mode: 'line' | 'word';
  identical: boolean;
  similarity_pct: number;
  added: number;
  removed: number;
  unchanged: number;
  total_a: number;
  total_b: number;
}

export function computeDiff(a: string, b: string, mode: 'line' | 'word') {
  const ta = tokenize(a, mode), tb = tokenize(b, mode);
  const { ops, lcs } = diffTokens(ta, tb);
  const added = ops.filter((o) => o.op === 'add').length;
  const removed = ops.filter((o) => o.op === 'remove').length;
  const unchanged = ops.filter((o) => o.op === 'equal').length;
  const denom = ta.length + tb.length;
  const similarity_pct = denom === 0 ? 100 : round((2 * lcs / denom) * 100, 2);
  const result: DiffResult = { mode, identical: a === b, similarity_pct, added, removed, unchanged, total_a: ta.length, total_b: tb.length };
  return { result, ops, unified: unified(ops) };
}

function actions(r: DiffResult): string[] {
  if (r.identical) return ['The two texts are byte-for-byte identical.', 'No content change — skip downstream re-processing.'];
  const out = [`Content is ${r.similarity_pct}% similar: ${r.added} ${r.mode}(s) added, ${r.removed} removed.`];
  if (r.similarity_pct >= 95) out.push('Only a minor change — likely a small edit or dynamic element; safe to treat as the same document.');
  else if (r.similarity_pct >= 50) out.push('Substantial change — re-index or re-summarize the new version.');
  else out.push('Major change (or a different document) — treat the new version as new content.');
  return out;
}

const CHAIN_TO = [
  { api: 'website-change-monitor', reason: 'Schedule recurring checks once you know what a meaningful diff looks like.' },
  { api: 'web-content-freshness-scorer', reason: 'Combine change magnitude with publish/modified dates to score freshness.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Content Diff Checker API', version: '1.0.0',
    description: 'Deterministic LCS text diff between two page bodies/snapshots: line or word mode, Sørensen–Dice similarity %, add/remove/unchanged counts, op list, and a unified-diff string. Pure compute — no LLM, no fetch (you supply both texts).',
    openapi_url: 'https://orbis-apis.onrender.com/web-content-diff-checker/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/diff', summary: 'Diff two texts → similarity %, counts, ops, unified diff', price_usdc: 0.005 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL diff + reasoning + change guidance', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/diff', price_usdc: 0.005, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

function parse(body: any): { a: string; b: string; mode: 'line' | 'word' } | { error: string } {
  if (typeof body?.a !== 'string' || typeof body?.b !== 'string') return { error: 'Provide "a" and "b" as strings (the two versions to compare).' };
  const mode = (String(body?.mode ?? 'line').toLowerCase()) as 'line' | 'word';
  if (mode !== 'line' && mode !== 'word') return { error: '"mode" must be "line" or "word".' };
  const ta = tokenize(body.a, mode).length, tb = tokenize(body.b, mode).length;
  if (ta > MAX_TOKENS || tb > MAX_TOKENS) return { error: `Each input is limited to ${MAX_TOKENS} ${mode}s (got ${Math.max(ta, tb)}).` };
  return { a: body.a, b: body.b, mode };
}

router.post('/diff', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const { result, ops, unified: u } = computeDiff(p.a, p.b, p.mode);
  respond(res, t0, {
    ...result, diff_ops: ops, unified_diff: u,
    confidence_score: 1.0, confidence_per_section: { diff: 1, similarity: 1 },
    recommended_actions_priority_order: actions(result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parse(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const { result, ops, unified: u } = computeDiff(p.a, p.b, p.mode);
  respond(res, t0, {
    ...result, diff_ops: ops, unified_diff: u,
    reasoning: {
      why_result_generated: `LCS ${p.mode} diff: ${result.unchanged} unchanged, ${result.added} added, ${result.removed} removed → ${result.similarity_pct}% similar.`,
      key_factors: [`${result.total_a} vs ${result.total_b} ${p.mode}s.`, `Identical: ${result.identical}.`, `Similarity ${result.similarity_pct}%.`],
      invalidators: ['Similarity is token-based; reordering content lowers it even when wording is unchanged.', 'Whitespace/markup differences count as changes in line mode.', 'A near-identical % can still hide a single critical edit (e.g. a price or date).'],
    },
    confidence_score: 1.0, confidence_per_section: { diff: 1, similarity: 1 },
    recommended_actions_priority_order: actions(result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
