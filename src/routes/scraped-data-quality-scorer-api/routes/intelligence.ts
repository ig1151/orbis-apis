import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY, round, clamp } from '../../_aplus/util';
import { parseRows, columnsOf, isMissing, asNum, asKey, mean, gradeOf, Row } from '../../_aplus/dataset';

// Deterministic quality scorer for SCRAPED / EXTRACTED datasets. Unlike a generic
// pipeline scorer (which scores pipeline health) or a schema validator (which checks
// records against an expected schema), this scores the intrinsic quality of already-
// extracted data with scrape-specific dimensions: extraction completeness, duplicate
// extraction, HTML/whitespace noise, placeholder/boilerplate values, and per-column
// type consistency. Returns a 0–100 score, per-dimension subscores, per-field
// breakdown, and issues. No reference schema needed, no fetching, no LLM, nothing stored.

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}([T\s]\d{2}:\d{2}|$)/;

// Boilerplate / placeholder tokens commonly emitted by scrapers when a field is
// effectively empty (compared case-insensitively against the trimmed value).
const PLACEHOLDERS = new Set([
  'n/a', 'na', 'null', 'undefined', 'none', 'nil', '-', '--', '—', '–', '...', '…',
  'tbd', 'to be determined', 'unknown', 'no data', 'not available', 'not found',
  '#n/a', '#ref!', '#value!', '#name?', 'lorem ipsum',
]);
const HTML_ENTITY_RE = /&[a-zA-Z]+;|&#\d+;/;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/; // control chars, excluding tab/newline/CR

const WEIGHTS = { completeness: 0.30, uniqueness: 0.15, cleanliness: 0.20, placeholder_freedom: 0.20, consistency: 0.15 };

type ScrapeType = 'boolean' | 'number' | 'date' | 'string';
function valType(v: unknown): ScrapeType {
  if (typeof v === 'boolean' || v === 'true' || v === 'false') return 'boolean';
  if (asNum(v) !== null) return 'number'; // integers folded into number — scraped numerics mix freely
  if (typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v))) return 'date';
  return 'string';
}

function isPlaceholder(v: unknown): boolean {
  return typeof v === 'string' && PLACEHOLDERS.has(v.trim().toLowerCase());
}

interface NoiseFlags { untrimmed: boolean; html_entity: boolean; control_char: boolean; truncated: boolean; }
function noiseOf(v: unknown): NoiseFlags {
  if (typeof v !== 'string') return { untrimmed: false, html_entity: false, control_char: false, truncated: false };
  const trimmed = v.trim();
  return {
    untrimmed: trimmed !== '' && v !== trimmed,
    html_entity: HTML_ENTITY_RE.test(v),
    control_char: CONTROL_RE.test(v),
    truncated: trimmed.endsWith('…') || (trimmed.length >= 4 && trimmed.endsWith('...')),
  };
}
const anyNoise = (n: NoiseFlags) => n.untrimmed || n.html_entity || n.control_char || n.truncated;

export interface FieldReport {
  name: string;
  fill_rate: number;
  placeholder_rate: number;
  noise_rate: number;
  truncated_count: number;
  dominant_type: ScrapeType | null;
  type_consistency: number;
}
export interface Subscores {
  completeness: number; uniqueness: number; cleanliness: number; placeholder_freedom: number; consistency: number;
}
export interface ScoreCore {
  row_count: number; column_count: number; total_cells: number;
  duplicate_row_count: number;
  placeholder_cell_count: number; noise_cell_count: number; missing_cell_count: number;
  subscores: Subscores;
  score: number; grade: string;
  weights_used: typeof WEIGHTS;
  fields: FieldReport[];
  issues: string[];
}

function scoreRows(rows: Row[], columns: string[]): ScoreCore {
  const n = rows.length;
  const totalCells = n * columns.length;

  // Duplicate rows (exact match on the column projection, first occurrence kept).
  const seen = new Set<string>();
  let dupRows = 0;
  for (const r of rows) {
    const key = columns.map((c) => asKey(r[c])).join('');
    if (seen.has(key)) dupRows++; else seen.add(key);
  }

  let missingCells = 0, placeholderCells = 0, noiseCells = 0;
  const fields: FieldReport[] = [];

  for (const col of columns) {
    let present = 0, placeholder = 0, noise = 0, truncated = 0;
    const typeCounts = new Map<ScrapeType, number>();
    for (const r of rows) {
      const v = r[col];
      if (isMissing(v, true)) { missingCells++; continue; }
      present++;
      if (isPlaceholder(v)) { placeholder++; placeholderCells++; }
      const nf = noiseOf(v);
      if (anyNoise(nf)) { noise++; noiseCells++; }
      if (nf.truncated) truncated++;
      const t = valType(v);
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
    }
    let dominant: ScrapeType | null = null, domCount = 0;
    for (const [t, c] of typeCounts) if (c > domCount || (c === domCount && dominant !== null && t < dominant)) { dominant = t; domCount = c; }
    const typeConsistency = present > 0 ? round(domCount / present, 4) : 1;
    fields.push({
      name: col,
      fill_rate: round(present / n, 4),
      placeholder_rate: round(placeholder / n, 4),
      noise_rate: round(noise / n, 4),
      truncated_count: truncated,
      dominant_type: dominant,
      type_consistency: typeConsistency,
    });
  }

  const completeness = totalCells > 0 ? (totalCells - missingCells) / totalCells : 1;
  const uniqueness = n > 0 ? 1 - dupRows / n : 1;
  const cleanliness = totalCells > 0 ? 1 - noiseCells / totalCells : 1;
  const placeholderFreedom = totalCells > 0 ? 1 - placeholderCells / totalCells : 1;
  const consistency = columns.length > 0 ? mean(fields.map((f) => f.type_consistency)) : 1;

  const subscores: Subscores = {
    completeness: round(completeness, 4), uniqueness: round(uniqueness, 4),
    cleanliness: round(cleanliness, 4), placeholder_freedom: round(placeholderFreedom, 4),
    consistency: round(consistency, 4),
  };

  const score = round(clamp(
    (completeness * WEIGHTS.completeness + uniqueness * WEIGHTS.uniqueness + cleanliness * WEIGHTS.cleanliness +
     placeholderFreedom * WEIGHTS.placeholder_freedom + consistency * WEIGHTS.consistency) * 100, 0, 100), 1);

  const issues: string[] = [];
  if (dupRows > 0) issues.push(`${dupRows} duplicate row(s) (${(dupRows / n * 100).toFixed(1)}%) — likely double-extraction.`);
  for (const f of fields) {
    if (f.fill_rate < 0.9) issues.push(`Column "${f.name}": only ${(f.fill_rate * 100).toFixed(1)}% of rows populated.`);
    if (f.placeholder_rate > 0.1) issues.push(`Column "${f.name}": ${(f.placeholder_rate * 100).toFixed(1)}% placeholder/boilerplate values.`);
    if (f.noise_rate > 0.05) issues.push(`Column "${f.name}": ${(f.noise_rate * 100).toFixed(1)}% noisy values (whitespace/HTML entities/control chars/truncation).`);
    if (f.type_consistency < 0.9) issues.push(`Column "${f.name}": mixed value types (dominant ${f.dominant_type} only ${(f.type_consistency * 100).toFixed(1)}% consistent).`);
  }

  return {
    row_count: n, column_count: columns.length, total_cells: totalCells,
    duplicate_row_count: dupRows,
    placeholder_cell_count: placeholderCells, noise_cell_count: noiseCells, missing_cell_count: missingCells,
    subscores, score, grade: gradeOf(score), weights_used: WEIGHTS, fields, issues,
  };
}

function run(body: any): { error: string } | { result: ScoreCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with a "rows" array.' };
  const p = parseRows(body.rows, 'rows');
  if ('error' in p) return p;
  const columns = columnsOf(p.rows, body.columns);
  if (columns.length === 0) return { error: 'No columns found; rows have no keys and no "columns" were supplied.' };
  return { result: scoreRows(p.rows, columns) };
}

const CHAIN_TO = [
  { api: 'scrape-data-pipeline-validator', reason: 'Check these records against an explicit expected schema (presence/type/format) for pass/fail.' },
  { api: 'scrape-data-enricher', reason: 'Repair low-fill or placeholder fields with deterministic enrichment rules.' },
  { api: 'data-quality-rules', reason: 'Codify the quality thresholds found here as reusable not-null/range/regex rules.' },
];
const INVALIDATORS = [
  'This scores intrinsic, schema-free quality of already-extracted data; it does NOT compare against an expected schema (use scrape-data-pipeline-validator) or score pipeline health (use data-pipeline-quality-scorer).',
  'Placeholder detection matches a fixed token list (n/a, null, —, …, lorem ipsum, etc.); domain-specific sentinels (e.g. "0", "999") are NOT treated as placeholders.',
  'Noise = leading/trailing whitespace, HTML entities (&amp;), control characters, or truncation markers (…/...); decoded-but-wrong text cannot be detected.',
  'Type consistency folds integers into "number"; the overall score is a weighted blend (weights_used) — a heuristic, not a certified quality guarantee.',
];

function actions(r: ScoreCore): string[] {
  const out = [`Quality score ${r.score}/100 (${r.grade}) over ${r.row_count} row(s) × ${r.column_count} column(s).`];
  const lows = Object.entries(r.subscores).filter(([, v]) => v < 0.9).sort((a, b) => a[1] - b[1]).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`);
  if (lows.length) out.push(`Weakest dimension(s): ${lows.join(', ')}.`);
  if (r.duplicate_row_count > 0) out.push(`De-duplicate: ${r.duplicate_row_count} duplicate row(s) detected.`);
  if (r.issues.length) out.push(`${r.issues.length} field issue(s) flagged — see issues[].`);
  out.push('Chain to scrape-data-pipeline-validator to enforce an expected schema, or scrape-data-enricher to repair weak fields.');
  return out;
}

const TAIL = (r: ScoreCore) => ({
  confidence_score: 0.8, confidence_per_section: { measurement: 1, scoring: 0.8 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Scraped Data Quality Scorer API', version: '1.0.0',
    description: 'Deterministic quality scorer for scraped/extracted datasets. Scores extraction completeness, duplicate extraction, HTML/whitespace noise, placeholder/boilerplate values, and per-column type consistency into a 0–100 score with per-dimension subscores, per-field breakdown and issues. No reference schema, no fetching, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/scraped-data-quality-scorer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/score', summary: 'Score a scraped/extracted dataset', price_usdc: 0.01 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL score + reasoning', price_usdc: 0.018 },
    ],
    pricing: [
      { path: '/score', price_usdc: 0.01, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.018, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/score', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = run(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = run(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Scored ${v.row_count} row(s) × ${v.column_count} column(s): ${v.score}/100 (${v.grade}).`,
      key_factors: [
        `Subscores — completeness ${v.subscores.completeness}, uniqueness ${v.subscores.uniqueness}, cleanliness ${v.subscores.cleanliness}, placeholder_freedom ${v.subscores.placeholder_freedom}, consistency ${v.subscores.consistency}.`,
        `${v.missing_cell_count} missing, ${v.placeholder_cell_count} placeholder, ${v.noise_cell_count} noisy cell(s); ${v.duplicate_row_count} duplicate row(s).`,
        `Issues flagged: ${v.issues.length}.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
