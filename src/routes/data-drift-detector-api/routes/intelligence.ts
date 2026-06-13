import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';
import { round } from '../../_aplus/util';
import { parseRows, columnsOf, isMissing, asNum, inferType, asKey, psiNumeric, psiCategorical, driftLevel, Row } from '../../_aplus/dataset';

// Deterministic data-drift detector. Compares a baseline dataset against a
// current dataset column-by-column and computes the Population Stability Index
// (PSI) — numeric columns via baseline quantile bins, categorical columns via
// category frequencies — plus new/dropped categories and missing-rate shift.
// Pure statistics, no LLM, nothing stored.

const router = Router();

export interface ColumnDrift {
  column: string;
  type: 'numeric' | 'categorical';
  psi: number;
  drift_level: 'none' | 'minor' | 'major';
  baseline_missing_rate: number;
  current_missing_rate: number;
  details: Record<string, unknown>;
}
export interface DriftCore {
  columns_compared: number;
  baseline_rows: number;
  current_rows: number;
  drifted_columns: number;
  max_psi: number;
  most_drifted_column: string | null;
  has_significant_drift: boolean;
  per_column: ColumnDrift[];
}

function detect(body: any): { error: string } | { result: DriftCore } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an object with "baseline" and "current" row arrays.' };
  const b = parseRows(body.baseline, 'baseline');
  if ('error' in b) return b;
  const c = parseRows(body.current, 'current');
  if ('error' in c) return c;

  // Columns to compare: explicit list, else the intersection of both datasets' columns.
  let cols: string[];
  if (Array.isArray(body.columns) && body.columns.length && body.columns.every((x: unknown) => typeof x === 'string')) {
    cols = body.columns as string[];
  } else {
    const bc = new Set(columnsOf(b.rows));
    cols = columnsOf(c.rows).filter((k) => bc.has(k));
  }
  if (cols.length === 0) return { error: 'No common columns between baseline and current (and none supplied via "columns").' };

  const per_column: ColumnDrift[] = [];
  for (const col of cols) {
    const bVals = b.rows.map((r: Row) => r[col]);
    const cVals = c.rows.map((r: Row) => r[col]);
    const bPresent = bVals.filter((v) => !isMissing(v));
    const cPresent = cVals.filter((v) => !isMissing(v));
    const bMiss = round((bVals.length - bPresent.length) / bVals.length, 4);
    const cMiss = round((cVals.length - cPresent.length) / cVals.length, 4);

    // Treat the column as numeric only if BOTH sides are predominantly numeric.
    const bType = inferType(bPresent);
    const cType = inferType(cPresent);
    const numericType = (t: string) => t === 'integer' || t === 'number';
    let drift: ColumnDrift;
    if (numericType(bType) && numericType(cType)) {
      const bn = bPresent.map(asNum).filter((n): n is number => n !== null);
      const cn = cPresent.map(asNum).filter((n): n is number => n !== null);
      const psi = round(psiNumeric(bn, cn), 4);
      const bMean = bn.length ? round(bn.reduce((a, x) => a + x, 0) / bn.length, 4) : null;
      const cMean = cn.length ? round(cn.reduce((a, x) => a + x, 0) / cn.length, 4) : null;
      drift = {
        column: col, type: 'numeric', psi, drift_level: driftLevel(psi),
        baseline_missing_rate: bMiss, current_missing_rate: cMiss,
        details: { baseline_mean: bMean, current_mean: cMean, mean_shift: bMean !== null && cMean !== null ? round(cMean - bMean, 4) : null, bins: 10 },
      };
    } else {
      const bk = bPresent.map(asKey);
      const ck = cPresent.map(asKey);
      const psi = round(psiCategorical(bk, ck), 4);
      const bSet = new Set(bk);
      const cSet = new Set(ck);
      const newCats = [...cSet].filter((x) => !bSet.has(x)).slice(0, 25);
      const dropped = [...bSet].filter((x) => !cSet.has(x)).slice(0, 25);
      drift = {
        column: col, type: 'categorical', psi, drift_level: driftLevel(psi),
        baseline_missing_rate: bMiss, current_missing_rate: cMiss,
        details: { baseline_categories: bSet.size, current_categories: cSet.size, new_categories: newCats, dropped_categories: dropped },
      };
    }
    per_column.push(drift);
  }

  per_column.sort((x, y) => y.psi - x.psi);
  const drifted = per_column.filter((d) => d.drift_level !== 'none');
  const maxPsi = per_column.length ? per_column[0].psi : 0;
  return {
    result: {
      columns_compared: cols.length,
      baseline_rows: b.rows.length,
      current_rows: c.rows.length,
      drifted_columns: drifted.length,
      max_psi: maxPsi,
      most_drifted_column: per_column.length && per_column[0].drift_level !== 'none' ? per_column[0].column : null,
      has_significant_drift: per_column.some((d) => d.drift_level === 'major'),
      per_column,
    },
  };
}

const CHAIN_TO = [
  { api: 'data-profiler', reason: 'Profile the drifted columns to see exactly how their distributions changed.' },
  { api: 'data-quality-rules', reason: 'Encode the baseline expectations as rules and re-check the current dataset.' },
];
const INVALIDATORS = [
  'PSI bands (none <0.1, minor <0.25, major ≥0.25) are the industry-standard convention, not a statistical guarantee — calibrate thresholds to your domain.',
  'PSI is sensitive to bin count and to small samples; with few rows a high PSI can be noise rather than real drift.',
  'A column is compared numerically only if BOTH sides parse as numeric; mixed-type columns are compared as categories.',
];

function actions(r: DriftCore): string[] {
  const out: string[] = [];
  if (r.has_significant_drift) out.push(`Major drift on ${r.most_drifted_column} (PSI ${r.max_psi}) — investigate before trusting downstream models/aggregates.`);
  else if (r.drifted_columns > 0) out.push(`Minor drift on ${r.drifted_columns} column(s); monitor but no immediate action required.`);
  else out.push('No significant drift detected across the compared columns.');
  out.push('Confirm baseline and current windows are comparable (same population, no schema change).');
  return out;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Data Drift Detector API', version: '1.0.0',
    description: 'Deterministic data-drift detector. Compares a baseline vs current dataset column-by-column and computes Population Stability Index (PSI), new/dropped categories, and missing-rate shift. Pure statistics, no LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/data-drift-detector/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/detect', summary: 'Detect column-level drift (PSI)', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL detect + reasoning', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/detect', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

const TAIL = (r: DriftCore) => ({
  confidence_score: 1, confidence_per_section: { drift_statistics: 1 },
  recommended_actions_priority_order: actions(r),
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
});

router.post('/detect', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = detect(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, { ...r.result, ...TAIL(r.result) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = detect(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Compared ${v.columns_compared} column(s) across ${v.baseline_rows} baseline vs ${v.current_rows} current rows; ${v.drifted_columns} drifted (max PSI ${v.max_psi}).`,
      key_factors: [
        `Most drifted: ${v.most_drifted_column ?? 'none'} (PSI ${v.max_psi}).`,
        `Significant (major) drift present: ${v.has_significant_drift}.`,
        `Numeric columns use 10 baseline quantile bins; categorical use frequency PSI.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL(v),
  });
});

export default router;
