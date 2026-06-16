import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { EXECUTION_METADATA, FINANCIAL_DISCLAIMER, round, normCdf, normPdf } from '../../_aplus/finance';

// Deterministic Black-Scholes-Merton European option pricing + greeks. Closed-form
// math (with continuous dividend yield); no LLM, nothing stored. Outputs are the
// MODEL value implied by the inputs — not a market quote.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };

interface BSInput { S: number; K: number; T: number; sigma: number; r: number; q: number; type: 'call' | 'put' }

function parseBS(body: any): { error: string } | { i: BSInput } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide spot, strike, time_to_expiry_years, volatility, risk_free_rate, type.' };
  const S = body.spot, K = body.strike, T = body.time_to_expiry_years, vol = body.volatility, rf = body.risk_free_rate;
  const q = body.dividend_yield ?? 0;
  const type = body.type;
  const fin = (x: any) => typeof x === 'number' && Number.isFinite(x);
  if (!fin(S) || S <= 0) return { error: '"spot" must be a positive number.' };
  if (!fin(K) || K <= 0) return { error: '"strike" must be a positive number.' };
  if (!fin(T) || T <= 0) return { error: '"time_to_expiry_years" must be a positive number (years).' };
  if (!fin(vol) || vol <= 0) return { error: '"volatility" must be a positive number (annual percent, e.g. 20 for 20%).' };
  if (!fin(rf)) return { error: '"risk_free_rate" must be a number (annual percent).' };
  if (!fin(q)) return { error: '"dividend_yield" must be a number (annual percent).' };
  if (type !== 'call' && type !== 'put') return { error: '"type" must be "call" or "put".' };
  return { i: { S, K, T, sigma: vol / 100, r: rf / 100, q: q / 100, type } };
}

export interface Greeks { delta: number; gamma: number; vega: number; theta: number; rho: number }
export interface BSResult {
  type: 'call' | 'put';
  price: number;
  d1: number; d2: number;
  intrinsic_value: number; time_value: number;
  greeks: Greeks;
}

function compute(i: BSInput): BSResult {
  const { S, K, T, sigma, r, q, type } = i;
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const eqT = Math.exp(-q * T), erT = Math.exp(-r * T);
  const Nd1 = normCdf(d1), Nd2 = normCdf(d2), pd1 = normPdf(d1);
  let price: number, delta: number, theta: number, rho: number;
  if (type === 'call') {
    price = S * eqT * Nd1 - K * erT * Nd2;
    delta = eqT * Nd1;
    theta = (-(S * eqT * pd1 * sigma) / (2 * sqrtT) - r * K * erT * Nd2 + q * S * eqT * Nd1);
    rho = K * T * erT * Nd2;
  } else {
    price = K * erT * normCdf(-d2) - S * eqT * normCdf(-d1);
    delta = -eqT * normCdf(-d1);
    theta = (-(S * eqT * pd1 * sigma) / (2 * sqrtT) + r * K * erT * normCdf(-d2) - q * S * eqT * normCdf(-d1));
    rho = -K * T * erT * normCdf(-d2);
  }
  const gamma = (eqT * pd1) / (S * sigma * sqrtT);
  const vega = S * eqT * pd1 * sqrtT; // per 1.00 vol
  const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  return {
    type, price: round(price, 6), d1: round(d1, 6), d2: round(d2, 6),
    intrinsic_value: round(intrinsic, 6), time_value: round(price - intrinsic, 6),
    greeks: {
      delta: round(delta, 6),
      gamma: round(gamma, 6),
      vega: round(vega / 100, 6),   // per 1% vol move
      theta: round(theta / 365, 6), // per calendar day
      rho: round(rho / 100, 6),     // per 1% rate move
    },
  };
}

const CHAIN_TO = [
  { api: 'risk-ratios', reason: 'Score the risk-adjusted return of a strategy built from these options.' },
  { api: 'npv-irr', reason: 'Discount the option strategy cashflows to a present value or IRR.' },
];
const INVALIDATORS = [
  'This is the Black-Scholes-Merton MODEL value for a EUROPEAN option with continuous dividend yield — exact given the inputs, but it is not a market quote and assumes lognormal prices, constant volatility, no transaction costs, and no early exercise (so it under-prices American puts).',
  'volatility, risk_free_rate, and dividend_yield are ANNUAL percents; time_to_expiry is in YEARS. Garbage-in: an implied vol from a different day or annualization changes everything.',
  'Greeks are reported in trader-friendly units: vega per +1% volatility, rho per +1% rate, theta per calendar day (1/365 of annual). delta/gamma are per $1 of spot.',
];

const TAIL = (sectionConf: Record<string, number>, actions: string[]) => ({
  confidence_score: 1, confidence_per_section: sectionConf,
  recommended_actions_priority_order: actions,
  chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA, financial_disclaimer: FINANCIAL_DISCLAIMER,
});

const DISCOVERY = {
  name: 'Black-Scholes Option Pricing API', version: '1.0.0',
  description: 'Deterministic Black-Scholes-Merton European option pricing and greeks (with continuous dividend yield). /price returns the model price + d1/d2 + intrinsic/time value; /greeks returns delta, gamma, vega, theta, rho. Closed-form math — no LLM, nothing stored. Model value, not a market quote.',
  openapi_url: 'https://orbis-apis.onrender.com/black-scholes/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  capabilities: ['option_pricing', 'black_scholes', 'option_greeks', 'derivatives', 'implied_value'],
  endpoints: [
    { method: 'POST', path: '/price', summary: 'Black-Scholes model price + d1/d2', price_usdc: 0.01 },
    { method: 'POST', path: '/greeks', summary: 'Delta, gamma, vega, theta, rho', price_usdc: 0.012 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL price + greeks + reasoning', price_usdc: 0.018 },
  ],
  pricing: [
    { path: '/price', price_usdc: 0.01, currency: 'USDC' },
    { path: '/greeks', price_usdc: 0.012, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.018, currency: 'USDC' },
  ],
  x402_compatible: true,
};

router.get('/', (_req: Request, res: Response) => res.json(DISCOVERY));

router.post('/price', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseBS(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const v = compute(p.i);
  respond(res, t0, {
    type: v.type, price: v.price, d1: v.d1, d2: v.d2, intrinsic_value: v.intrinsic_value, time_value: v.time_value,
    ...TAIL({ price: 1 }, [`Model ${v.type} price is ${v.price} (${v.intrinsic_value} intrinsic + ${v.time_value} time value).`, 'Call /greeks for delta/gamma/vega/theta/rho before hedging.']),
  });
});

router.post('/greeks', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseBS(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const v = compute(p.i);
  respond(res, t0, { type: v.type, price: v.price, greeks: v.greeks, ...TAIL({ greeks: 1 }, [`Delta ${v.greeks.delta} — hedge with ${Math.abs(v.greeks.delta)} share(s) of the underlying per option.`, `Theta ${v.greeks.theta}/day, vega ${v.greeks.vega}/1% vol.`]) });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const p = parseBS(req.body);
  if ('error' in p) return fail(res, t0, 400, 'invalid_request', p.error);
  const v = compute(p.i);
  respond(res, t0, {
    type: v.type, price: v.price, d1: v.d1, d2: v.d2, intrinsic_value: v.intrinsic_value, time_value: v.time_value, greeks: v.greeks,
    reasoning: {
      why_result_generated: `Priced a European ${v.type} with the Black-Scholes-Merton closed form (d1=${v.d1}, d2=${v.d2}) and differentiated it for the greeks.`,
      key_factors: [
        `Price ${v.price} = ${v.intrinsic_value} intrinsic + ${v.time_value} time value.`,
        `Delta ${v.greeks.delta}, gamma ${v.greeks.gamma}.`,
        `Theta ${v.greeks.theta}/day, vega ${v.greeks.vega}/1% vol, rho ${v.greeks.rho}/1% rate.`,
      ],
      invalidators: INVALIDATORS,
    },
    ...TAIL({ price: 1, greeks: 1 }, [`Model ${v.type} value ${v.price}; delta-hedge with ${Math.abs(v.greeks.delta)} share(s) per contract.`]),
  });
});

export default router;
