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

/** Standard disclaimer string reused across every finance API. */
export const FINANCIAL_DISCLAIMER =
  'This result is an informational, deterministic calculation based solely on the inputs you provided. ' +
  'It is not financial, tax, legal, or investment advice and is not a guarantee of any outcome, rate, or approval. ' +
  'Consult a licensed professional before making borrowing, refinancing, investing, or insurance decisions.';
