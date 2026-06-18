import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, chainTo, round, cagr, maxDrawdown } from '../../_aplus/finance';

// Deterministic maximum drawdown analytics from a value (NAV/price) series.
// /analyze finds the worst peak-to-trough decline, its depth, the peak/trough/recovery
// points, and the Calmar ratio (CAGR ÷ |max drawdown|). Pure arithmetic — no LLM,
// nothing stored.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const MAX_VALUES = 5000;

function parseValues(body: any): { error: string } | { values: number[]; ppy: number } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a "values" array of the level series (NAV/price).' };
  const v = body.values;
  if (!Array.isArray(v) || v.length < 2) return { error: '"values" must be an array of at least 2 level observations.' };
  if (v.length > MAX_VALUES) return { error: `"values" exceeds the ${MAX_VALUES}-observation limit.` };
  for (let i = 0; i < v.length; i++) {
    if (typeof v[i] !== 'number' || !Number.isFinite(v[i])) return { error: `values[${i}] must be a finite number.` };
    if (v[i] <= 0) return { error: `values[${i}] must be positive (levels, not returns).` };
  }
  const ppy = body.periods_per_year ?? 12;
  if (typeof ppy !== 'number' || !Number.isFinite(ppy) || ppy <= 0) return { error: '"periods_per_year" must be a positive number (default 12).' };
  return { values: v, ppy };
}

export interface DrawdownCore {
  observations: number; periods_per_year: number; max_drawdown_percent: number;
  peak_index: number; trough_index: number; peak_value: number; trough_value: number;
  drawdown_periods: number; recovery_index: number | null; recovery_periods: number | null;
  recovered: boolean; cagr_percent: number; calmar_ratio: number | null;
}

function analyze(values: number[], ppy: number): DrawdownCore {
  const dd = maxDrawdown(values);
  const years = (values.length - 1) / ppy;
  const g = cagr(values[0], values[values.length - 1], years); // fraction
  const ddAbs = Math.abs(dd.max_drawdown_pct) / 100; // fraction
  const calmar = ddAbs === 0 ? null : g / ddAbs;
  return {
    observations: values.length, periods_per_year: ppy,
    max_drawdown_percent: round(dd.max_drawdown_pct, 6),
    peak_index: dd.peak_index, trough_index: dd.trough_index,
    peak_value: dd.peak_value, trough_value: dd.trough_value,
    drawdown_periods: dd.trough_index - dd.peak_index,
    recovery_index: dd.recovery_index,
    recovery_periods: dd.recovery_index === null ? null : dd.recovery_index - dd.trough_index,
    recovered: dd.recovery_index !== null,
    cagr_percent: round(g * 100, 6),
    calmar_ratio: calmar === null ? null : round(calmar, 6),
  };
}

const CHAIN_TO = [
  { api: 'risk-ratios', reason: 'Pair drawdown with Sharpe/Sortino for a fuller risk picture.' },
  { api: 'value-at-risk', reason: 'Estimate tail loss over a single period from the return series.' },
];
const INVALIDATORS = [
  '"values" are LEVELS (NAV/price). The max drawdown is the largest peak-to-trough percentage decline; it is reported as a NEGATIVE percent. Feeding returns instead of levels gives meaningless results.',
  'recovery_index is the first observation that regains the prior peak value; if the series never recovers, recovered=false and recovery_periods=null. The drawdown can still be ongoing at the end of the series.',
  'Calmar = CAGR ÷ |max drawdown| over the supplied window; it is sensitive to the sample length and to periods_per_year. With zero drawdown the ratio is undefined (null).',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, calculation_certainty: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: chainTo(CHAIN_TO), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

export const DISCOVERY = {
  name: 'Max Drawdown API', version: '1.0.0',
  description: 'Deterministic maximum drawdown analytics from a value (NAV/price) series. /analyze finds the worst peak-to-trough decline, its depth, the peak/trough/recovery points, drawdown & recovery duration, and the Calmar ratio (CAGR ÷ |max drawdown|). No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/max-drawdown/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['max_drawdown', 'peak_trough_detection', 'recovery_period', 'calmar_ratio'],
  typical_use_cases: [
    'Measure the worst peak-to-trough loss of a strategy or portfolio',
    'Check whether and how quickly an equity curve recovered from its deepest drawdown',
    'Compute the Calmar ratio to compare return against drawdown risk',
  ],
  input_examples: [
    { endpoint: '/analyze', body: { values: [100, 120, 90, 95, 130], periods_per_year: 12 } },
  ],
  output_examples: [
    { endpoint: '/analyze', response: { max_drawdown_percent: -25, peak_index: 1, trough_index: 2, recovery_index: 4, recovered: true } },
  ],
  endpoints: [
    { method: 'POST', path: '/analyze', summary: 'Max drawdown, peak/trough/recovery, Calmar', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL drawdown analysis + reasoning', price_usdc: 0.013 },
  ],
  pricing: [
    { path: '/analyze', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.013, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/analyze', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseValues(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const v = analyze(p.values, p.ppy);
  respond(res, t0, { ...v, ...TAIL({ drawdown: 1 }, [
    `Max drawdown ${v.max_drawdown_percent}% from index ${v.peak_index} to ${v.trough_index}${v.recovered ? `, recovered by index ${v.recovery_index}` : ', not yet recovered'}.`,
  ]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseValues(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const v = analyze(p.values, p.ppy);
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: `Scanned ${v.observations} levels for the largest peak-to-trough decline: ${v.max_drawdown_percent}% (peak ${v.peak_value} @${v.peak_index} → trough ${v.trough_value} @${v.trough_index}), ${v.recovered ? `recovered after ${v.recovery_periods} period(s)` : 'no recovery within the window'}.`,
      key_factors: [`Max drawdown ${v.max_drawdown_percent}%.`, `Drawdown lasted ${v.drawdown_periods} period(s).`, `Calmar ${v.calmar_ratio ?? 'undefined'} (CAGR ${v.cagr_percent}%).`],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ drawdown: 1 }, [
      v.recovered ? `Recovered from the ${v.max_drawdown_percent}% drawdown after ${v.recovery_periods} period(s).` : `Still below the prior peak — ${v.max_drawdown_percent}% drawdown unrecovered.`,
    ]),
  });
});

export default router;
