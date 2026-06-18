import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, chainTo, round } from '../../_aplus/finance';

// Deterministic Kelly-criterion bet/position sizing. /kelly returns the optimal Kelly
// fraction, fractional Kelly, edge and expected log-growth from a win probability and
// payoff; /risk-of-ruin returns the classic gambler's-ruin probability for flat even-money
// bets. Pure math — no LLM, nothing stored. (Distinct from the LLM crypto position-sizing
// service: this is the closed-form Kelly calculation, no execution gating.)

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
function numField(v: unknown): number | undefined { return typeof v === 'number' && Number.isFinite(v) ? v : undefined; }

function logGrowth(f: number, p: number, b: number, a: number): number | null {
  const win = 1 + f * b, loss = 1 - f * a;
  if (win <= 0 || loss <= 0) return null;
  return p * Math.log(win) + (1 - p) * Math.log(loss);
}

export interface KellyCore {
  win_probability: number; loss_probability: number; win_payoff: number; loss_fraction: number;
  kelly_multiplier: number; edge: number; expected_value_per_unit: number;
  kelly_fraction: number; fractional_kelly_fraction: number; favorable: boolean;
  expected_log_growth_full: number | null; expected_log_growth_fractional: number | null;
  bankroll: number | null; recommended_stake: number | null; recommendation: string;
}
export interface RuinCore {
  win_probability: number; loss_probability: number; bankroll_units: number;
  risk_of_ruin: number; survival_probability: number; favorable: boolean; assumptions: string;
}

function kelly(p: number, b: number, a: number, mult: number, bankroll: number | undefined): KellyCore {
  const q = 1 - p;
  const fStar = p / a - q / b;            // generalized Kelly fraction
  const fClamped = Math.max(0, fStar);     // never recommend a negative (short) stake here
  const frac = fClamped * mult;
  const ev = p * b - q * a;                // expected value per unit staked
  const favorable = fStar > 0;
  const stake = bankroll !== undefined ? round(bankroll * frac, 6) : null;
  return {
    win_probability: p, loss_probability: round(q, 6), win_payoff: b, loss_fraction: a, kelly_multiplier: mult,
    edge: round(ev, 6), expected_value_per_unit: round(ev, 6),
    kelly_fraction: round(fStar, 6), fractional_kelly_fraction: round(frac, 6), favorable,
    expected_log_growth_full: favorable ? roundN(logGrowth(fClamped, p, b, a)) : 0,
    expected_log_growth_fractional: favorable ? roundN(logGrowth(frac, p, b, a)) : 0,
    bankroll: bankroll ?? null, recommended_stake: favorable ? stake : (bankroll !== undefined ? 0 : null),
    recommendation: favorable
      ? `Stake ${round(frac * 100, 4)}% of bankroll (fractional Kelly ×${mult} of the ${round(fStar * 100, 4)}% full Kelly).`
      : 'No favorable edge (Kelly fraction ≤ 0) — do not bet.',
  };
}
function roundN(x: number | null): number | null { return x === null ? null : round(x, 8); }

// Classic gambler's ruin for flat even-money unit bets: P(ruin) = (q/p)^N if p>0.5 else 1.
function riskOfRuin(p: number, units: number): RuinCore {
  const q = 1 - p;
  let ror: number;
  if (p <= 0.5) ror = 1;
  else ror = Math.pow(q / p, units);
  return {
    win_probability: p, loss_probability: round(q, 6), bankroll_units: units,
    risk_of_ruin: round(ror, 8), survival_probability: round(1 - ror, 8), favorable: p > 0.5,
    assumptions: 'Flat even-money (1:1) bets of one unit; ruin = bankroll hits 0. P(ruin) = (q/p)^units when p>0.5, else 1.',
  };
}

function readKelly(b: any): { error: string } | { p: number; b: number; a: number; mult: number; bankroll?: number } {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return { error: 'Provide win_probability and win_payoff.' };
  const p = numField(b.win_probability);
  if (p === undefined || p <= 0 || p >= 1) return { error: '"win_probability" must be a number strictly between 0 and 1.' };
  const payoff = numField(b.win_payoff);
  if (payoff === undefined || payoff <= 0) return { error: '"win_payoff" must be a positive number (net amount won per unit staked, i.e. b in b:1 odds).' };
  let a = 1; if (b.loss_fraction !== undefined) { const x = numField(b.loss_fraction); if (x === undefined || x <= 0 || x > 1) return { error: '"loss_fraction" must be in (0, 1] (fraction of the stake lost on a loss; default 1).' }; a = x; }
  let mult = 1; if (b.kelly_multiplier !== undefined) { const x = numField(b.kelly_multiplier); if (x === undefined || x <= 0 || x > 1) return { error: '"kelly_multiplier" must be in (0, 1] (fractional-Kelly scaler; default 1 = full Kelly).' }; mult = x; }
  let bankroll: number | undefined; if (b.bankroll !== undefined) { const x = numField(b.bankroll); if (x === undefined || x <= 0) return { error: '"bankroll" must be a positive number.' }; bankroll = x; }
  return { p, b: payoff, a, mult, bankroll };
}

function readRuin(b: any): { error: string } | { p: number; units: number } {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return { error: 'Provide win_probability and bankroll_units.' };
  const p = numField(b.win_probability);
  if (p === undefined || p <= 0 || p >= 1) return { error: '"win_probability" must be a number strictly between 0 and 1.' };
  const units = numField(b.bankroll_units);
  if (units === undefined || units < 1 || !Number.isInteger(units)) return { error: '"bankroll_units" must be a positive integer (number of one-unit bets the bankroll covers).' };
  return { p, units };
}

const CHAIN_TO = [
  { api: 'risk-ratios', reason: 'Translate the chosen stake into portfolio-level risk-adjusted metrics.' },
  { api: 'max-drawdown', reason: 'Stress-test the equity path of the sizing strategy.' },
];
const INVALIDATORS = [
  'Kelly maximizes long-run LOG growth and assumes the win probability and payoff are accurate and stationary; overstated edge leads to oversized bets and large drawdowns. Practitioners commonly use fractional Kelly (½ or less).',
  'win_payoff is the NET odds b (profit per unit staked on a win); loss_fraction is the fraction of the stake lost on a loss (default 1). f* = p/loss_fraction − q/win_payoff.',
  'The /risk-of-ruin figure assumes FLAT even-money one-unit bets, not Kelly-proportional staking; it is a separate classical model, not the ruin probability of the Kelly fraction above.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, calculation_certainty: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: chainTo(CHAIN_TO), privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

export const DISCOVERY = {
  name: 'Kelly Criterion API', version: '1.0.0',
  description: 'Deterministic Kelly-criterion bet/position sizing. /kelly returns the optimal and fractional Kelly fraction, edge and expected log-growth; /risk-of-ruin returns the classic gambler\'s-ruin probability for flat even-money bets. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/kelly-criterion/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['kelly_fraction', 'fractional_kelly', 'expected_log_growth', 'edge', 'risk_of_ruin'],
  typical_use_cases: [
    'Size a bet or trade as a fraction of bankroll from a win probability and payoff',
    'Apply a fractional-Kelly (½ Kelly) multiplier to temper variance',
    'Estimate risk of ruin for a flat-staking strategy',
  ],
  input_examples: [
    { endpoint: '/kelly', body: { win_probability: 0.55, win_payoff: 1, kelly_multiplier: 0.5, bankroll: 10000 } },
    { endpoint: '/risk-of-ruin', body: { win_probability: 0.55, bankroll_units: 20 } },
  ],
  output_examples: [
    { endpoint: '/kelly', response: { kelly_fraction: 0.1, fractional_kelly_fraction: 0.05, recommended_stake: 500 } },
    { endpoint: '/risk-of-ruin', response: { risk_of_ruin: 0.01386, survival_probability: 0.98614 } },
  ],
  endpoints: [
    { method: 'POST', path: '/kelly', summary: 'Optimal + fractional Kelly stake', price_usdc: 0.007 },
    { method: 'POST', path: '/risk-of-ruin', summary: 'Gambler\'s-ruin probability (flat even-money bets)', price_usdc: 0.006 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL Kelly stake + interpretation + reasoning', price_usdc: 0.012 },
  ],
  pricing: [
    { path: '/kelly', price_usdc: 0.007, currency: 'USDC' },
    { path: '/risk-of-ruin', price_usdc: 0.006, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/kelly', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readKelly(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = kelly(r.p, r.b, r.a, r.mult, r.bankroll);
  respond(res, t0, { ...v, ...TAIL({ kelly: 1 }, [v.recommendation]) });
});

router.post('/risk-of-ruin', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readRuin(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = riskOfRuin(r.p, r.units);
  respond(res, t0, { ...v, ...TAIL({ risk_of_ruin: 1 }, [`Risk of ruin ${round(v.risk_of_ruin * 100, 4)}% over a ${v.bankroll_units}-unit bankroll (flat even-money bets).`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = readKelly(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = kelly(r.p, r.b, r.a, r.mult, r.bankroll);
  respond(res, t0, {
    ...v,
    reasoning: {
      why_result_generated: v.favorable
        ? `Edge is positive (EV ${v.edge}/unit). Full Kelly = p/loss_fraction − q/win_payoff = ${v.kelly_fraction}; applying the ×${v.kelly_multiplier} multiplier gives a ${v.fractional_kelly_fraction} stake fraction${v.recommended_stake !== null ? ` ($${v.recommended_stake} of $${v.bankroll})` : ''}.`
        : `Edge is non-positive (EV ${v.edge}/unit), so the Kelly fraction is ≤ 0 — the bet should be skipped.`,
      key_factors: [
        `Kelly fraction ${v.kelly_fraction} (fractional ${v.fractional_kelly_fraction}).`,
        `Edge / EV per unit ${v.edge}.`,
        `Expected log-growth ${v.expected_log_growth_fractional} at the fractional stake.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ kelly: 1 }, [v.recommendation, 'Consider fractional Kelly (≤ ½) to reduce drawdown risk.']),
  });
});

export default router;
