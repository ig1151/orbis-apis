// Shared, deterministic personal-finance math for the A+ finance APIs.
// Pure functions only — no LLM, no network, no randomness. Every value is
// computed in real code so confidence is exact and results are reproducible.

/** Monthly periodic rate from an annual percentage rate (e.g. 6.5 -> 0.00541…). */
export function monthlyRate(annualPct: number): number {
  return annualPct / 100 / 12;
}

/** Round to `dp` decimal places (default 2) with half-up behavior. */
export function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
}

/**
 * Standard fully-amortizing monthly payment for a loan.
 * principal: starting balance; annualPct: nominal annual rate; months: term.
 * Handles the 0% case (straight-line) without dividing by zero.
 */
export function monthlyPayment(principal: number, annualPct: number, months: number): number {
  if (months <= 0) return 0;
  const r = monthlyRate(annualPct);
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

/**
 * Number of months to fully amortize a balance given a fixed monthly payment.
 * Returns null when the payment is too small to ever cover the interest
 * (payment <= balance * monthlyRate) — i.e. the balance never reaches zero.
 */
export function remainingMonths(balance: number, annualPct: number, payment: number): number | null {
  if (balance <= 0) return 0;
  const r = monthlyRate(annualPct);
  if (r === 0) return payment > 0 ? Math.ceil(balance / payment) : null;
  if (payment <= balance * r) return null; // payment never covers monthly interest
  const n = -Math.log(1 - (r * balance) / payment) / Math.log(1 + r);
  return Math.ceil(n);
}

/** Total interest paid over the life of a loan (payment * months - principal). */
export function totalInterest(principal: number, payment: number, months: number): number {
  return payment * months - principal;
}

/** Loan-to-value ratio as a fraction (balance / value). value<=0 -> null. */
export function ltv(balance: number, value: number): number | null {
  if (value <= 0) return null;
  return balance / value;
}

/** Coerce a value to a finite non-negative number, or return undefined. */
export function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

/** Clamp n into [lo, hi]. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Future value of a starting balance plus a fixed end-of-period contribution,
 * compounded for `periods` at periodic rate `r`. Handles r === 0.
 *   FV = PV·(1+r)^n + PMT·((1+r)^n − 1)/r
 */
export function futureValue(present: number, contribution: number, r: number, periods: number): number {
  if (periods <= 0) return present;
  if (r === 0) return present + contribution * periods;
  const f = Math.pow(1 + r, periods);
  return present * f + contribution * ((f - 1) / r);
}

/**
 * Number of periods for `present` + per-period `contribution` (at rate `r`) to
 * reach `target`. Returns null when it can never be reached (no growth and no
 * contribution, or contribution ≤ 0 with present already below target at r=0).
 */
export function periodsToTarget(present: number, contribution: number, r: number, target: number): number | null {
  if (present >= target) return 0;
  if (r === 0) return contribution > 0 ? Math.ceil((target - present) / contribution) : null;
  // grows if present·r + contribution > 0 (i.e. period-over-period balance increases)
  if (present * r + contribution <= 0) return null;
  const n = Math.log((target * r + contribution) / (present * r + contribution)) / Math.log(1 + r);
  return n > 0 ? Math.ceil(n) : 0;
}

/**
 * Per-period contribution required to grow `present` to `target` over `periods`
 * at periodic rate `r`. Can be negative when `present` already overshoots.
 */
export function requiredContribution(present: number, target: number, r: number, periods: number): number {
  if (periods <= 0) return target - present;
  if (r === 0) return (target - present) / periods;
  const f = Math.pow(1 + r, periods);
  return (target - present * f) * r / (f - 1);
}

/** Real (inflation-adjusted) periodic rate from nominal and inflation annual %s. */
export function realMonthlyRate(nominalAnnualPct: number, inflationAnnualPct: number): number {
  const realAnnual = (1 + nominalAnnualPct / 100) / (1 + inflationAnnualPct / 100) - 1;
  return realAnnual / 12;
}

/**
 * Maximum loan principal a fixed monthly payment can support at annual rate
 * `annualPct` over `months`. Inverse of monthlyPayment(). Handles the 0% case.
 */
export function maxLoanForPayment(payment: number, annualPct: number, months: number): number {
  if (months <= 0 || payment <= 0) return 0;
  const r = monthlyRate(annualPct);
  if (r === 0) return payment * months;
  return payment * (1 - Math.pow(1 + r, -months)) / r;
}

/** Deterministic-compute marker for execution_metadata on every finance response. */
export const EXECUTION_METADATA = { model: 'deterministic' as const, automation_safe: true };

/** Standard disclaimer string reused across every finance API. */
export const FINANCIAL_DISCLAIMER =
  'This result is an informational, deterministic calculation based solely on the inputs you provided. ' +
  'It is not financial, tax, legal, or investment advice and is not a guarantee of any outcome, rate, or approval. ' +
  'Consult a licensed professional before making borrowing, refinancing, investing, or insurance decisions.';

// ---- Shared quantitative-finance primitives (Group D) — pure, deterministic ----

/** Net present value of a cashflow series (index 0 = t=0) at a per-period decimal rate. */
export function npv(rate: number, cashflows: number[]): number {
  let acc = 0;
  for (let t = 0; t < cashflows.length; t++) acc += cashflows[t] / Math.pow(1 + rate, t);
  return acc;
}

/**
 * Internal rate of return (per-period, decimal) for a cashflow series, via a
 * bracket scan + bisection. Returns null when no sign change is found in the
 * scanned range (no real IRR, or multiple IRRs that the scan can't bracket).
 */
export function irr(cashflows: number[]): number | null {
  const f = (r: number) => npv(r, cashflows);
  // Scan for a sign change across a wide rate range (-99% .. +1000% per period).
  let prevR = -0.99, prevV = f(prevR);
  const step = 0.01;
  for (let r = -0.99 + step; r <= 10.0001; r += step) {
    const v = f(r);
    if (Number.isFinite(prevV) && Number.isFinite(v) && (prevV === 0 || prevV * v < 0)) {
      let lo = prevR, hi = r, flo = prevV;
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2, fmid = f(mid);
        if (Math.abs(fmid) < 1e-9 || (hi - lo) / 2 < 1e-10) return mid;
        if (flo * fmid < 0) hi = mid; else { lo = mid; flo = fmid; }
      }
      return (lo + hi) / 2;
    }
    prevR = r; prevV = v;
  }
  return null;
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Standard deviation. sample=true uses the (n-1) divisor; false uses n (population). */
export function stdev(xs: number[], sample = true): number {
  const n = xs.length;
  if (n < 2) return 0;
  const m = mean(xs);
  const ss = xs.reduce((a, x) => a + (x - m) * (x - m), 0);
  return Math.sqrt(ss / (sample ? n - 1 : n));
}

/** Downside deviation below a minimum-acceptable per-period return (n divisor). */
export function downsideDeviation(xs: number[], mar: number): number {
  if (!xs.length) return 0;
  const ss = xs.reduce((a, x) => { const d = Math.min(0, x - mar); return a + d * d; }, 0);
  return Math.sqrt(ss / xs.length);
}

/** Standard normal CDF via the Abramowitz & Stegun erf approximation (|err| < 1.5e-7). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/** Standard normal PDF. */
export function normPdf(x: number): number {
  return Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);
}

/** Inverse standard-normal CDF (quantile) via Acklam's rational approximation. p in (0,1). */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const plow = 0.02425, phigh = 1 - plow;
  let q: number, r: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= phigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/** Compound annual growth rate (as a fraction) from begin→end over `years` (>0). */
export function cagr(begin: number, end: number, years: number): number {
  return Math.pow(end / begin, 1 / years) - 1;
}

/** Linear-interpolation percentile of a numeric array. p in [0,1]. Does not mutate input. */
export function percentile(xs: number[], p: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 1) return s[0];
  const idx = p * (s.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export interface DrawdownResult {
  max_drawdown_pct: number; peak_index: number; trough_index: number;
  peak_value: number; trough_value: number; recovery_index: number | null;
}
/** Maximum peak-to-trough drawdown of an equity/value series, as a NEGATIVE percent. */
export function maxDrawdown(values: number[]): DrawdownResult {
  let peak = values[0], peakIdx = 0, maxDD = 0, ddPeakIdx = 0, ddTroughIdx = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > peak) { peak = values[i]; peakIdx = i; }
    const dd = (values[i] - peak) / peak; // <= 0
    if (dd < maxDD) { maxDD = dd; ddPeakIdx = peakIdx; ddTroughIdx = i; }
  }
  // First index after the trough that recovers to the prior peak value.
  let recovery: number | null = null;
  const peakVal = values[ddPeakIdx];
  for (let i = ddTroughIdx + 1; i < values.length; i++) { if (values[i] >= peakVal) { recovery = i; break; } }
  return {
    max_drawdown_pct: maxDD * 100, peak_index: ddPeakIdx, trough_index: ddTroughIdx,
    peak_value: values[ddPeakIdx], trough_value: values[ddTroughIdx], recovery_index: recovery,
  };
}
