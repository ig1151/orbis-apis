// Shared deterministic helpers for the non-finance A+ APIs (web, web3, data,
// generators, validators). Pure functions only — no LLM, no fabricated data.
// Network is allowed ONLY in explicitly live-but-bounded APIs (e.g. WebSocket
// tester) and must always carry a tight AbortController/timeout.

/** Coerce to a finite number, else undefined. Accepts numeric strings. */
export function num(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Coerce to a non-empty trimmed string, else undefined. */
export function str(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim() !== '') return v;
  return undefined;
}

/** Coerce to a non-negative integer (count), else undefined. */
export function intIn(v: unknown): number | undefined {
  const n = num(v);
  if (n === undefined) return undefined;
  return Number.isInteger(n) ? n : Math.trunc(n);
}

/** Round to `dp` decimal places (default 2), half-up. */
export function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Clamp into [lo, hi]. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export const EXECUTION_METADATA = { model: 'deterministic' as const, automation_safe: true };
export const PRIVACY = { data_stored: false, retention: 'none' as const };
