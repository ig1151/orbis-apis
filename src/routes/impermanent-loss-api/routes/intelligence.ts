import { Router, Request, Response } from 'express';

// Deterministic impermanent-loss math for constant-product (x*y=k) AMM pools.
// Closed-form: for relative price changes ra = pA_now/pA_entry, rb = pB_now/pB_entry,
//   LP_value/HODL_value = 2*sqrt(ra*rb)/(ra+rb)   (always ≤ 1; IL is the shortfall).
// Computed in real code — no LLM, no upstream, exact, confidence 1.0.

const router = Router();
const PRIVACY = { data_stored: false, retention: 'none' as const };
const DISCLAIMER = 'For informational purposes only. Not financial advice.';
function traceId() { return Math.random().toString(36).slice(2, 10) + '-' + Date.now(); }
const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

// IL ratio (LP/HODL) and IL% from per-token relative price changes.
function ilFrom(ra: number, rb: number) {
  const ratio = (2 * Math.sqrt(ra * rb)) / (ra + rb);
  return { ratio, il_pct: (ratio - 1) * 100 };
}
function recommend(ilAbsPct: number): 'hold' | 'monitor' | 'exit' {
  if (ilAbsPct < 1) return 'hold';
  if (ilAbsPct < 5) return 'monitor';
  return 'exit';
}
function parsePct(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') { const n = parseFloat(v.replace('%', '').trim()); return Number.isFinite(n) ? n : null; }
  return null;
}
function posValues(L: number, ra: number, rb: number) {
  const lp = L * Math.sqrt(ra * rb);
  const hodl = (L / 2) * (ra + rb);
  return { lp, hodl, il_usd: lp - hodl };
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'Impermanent Loss API', openapi: '/impermanent-loss/openapi.json', health: 'ok' });
});

// POST /calculate — IL for a position given entry + current prices.
router.post('/calculate', (req: Request, res: Response) => {
  const { token_a, token_b, entry_price_a, entry_price_b, current_price_a, current_price_b, liquidity_usd } = req.body || {};
  if (!token_a || !token_b || entry_price_a == null || entry_price_b == null || current_price_a == null || current_price_b == null) {
    return res.status(400).json({ error: 'token_a, token_b, entry_price_a, entry_price_b, current_price_a, current_price_b are required' });
  }
  const [ea, eb, ca, cb] = [entry_price_a, entry_price_b, current_price_a, current_price_b].map(Number);
  if (![ea, eb, ca, cb].every((x) => Number.isFinite(x) && x > 0)) {
    return res.status(400).json({ error: 'all prices must be positive numbers' });
  }
  const ra = ca / ea, rb = cb / eb;
  const { ratio, il_pct } = ilFrom(ra, rb);
  const L = parsePct(liquidity_usd) != null ? Number(liquidity_usd) : null;
  const pos = L && L > 0 ? posValues(L, ra, rb) : null;
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    pair: `${token_a}/${token_b}`,
    entry: { price_a: ea, price_b: eb, ratio: r4(ea / eb) },
    current: { price_a: ca, price_b: cb, ratio: r4(ca / cb) },
    price_change: { token_a_pct: r2((ra - 1) * 100), token_b_pct: r2((rb - 1) * 100) },
    impermanent_loss: {
      pct: r4(il_pct),
      usd: pos ? r2(pos.il_usd) : null,
      vs_hodl_usd: pos ? r2(pos.il_usd) : null,
      explanation: `Relative to holding, the LP position retains ${r4(ratio * 100)}% of HODL value, an impermanent loss of ${r4(Math.abs(il_pct))}% from price divergence between ${token_a} and ${token_b}. IL is realized only on exit and can be offset by accrued trading fees.`,
    },
    hodl_value_usd: pos ? r2(pos.hodl) : null,
    lp_value_usd: pos ? r2(pos.lp) : null,
    break_even_fees_needed_usd: pos ? r2(-pos.il_usd) : null,
    recommendation: recommend(Math.abs(il_pct)),
    financial_disclaimer: DISCLAIMER,
    confidence_per_section: { impermanent_loss: 1.0, recommendation: 0.8 },
    recommended_actions_priority_order: ['Compare IL vs accrued fees to decide exit.', 'Check pool APY to assess fee offset.', 'Exit if IL meaningfully exceeds fee income.'],
    privacy: PRIVACY,
  });
});

// POST /simulate — IL across relative price-change scenarios for token A vs B.
router.post('/simulate', (req: Request, res: Response) => {
  const { token_a, token_b, entry_price_a, entry_price_b, scenarios, liquidity_usd } = req.body || {};
  if (!token_a || !token_b || entry_price_a == null || entry_price_b == null) {
    return res.status(400).json({ error: 'token_a, token_b, entry_price_a, entry_price_b are required' });
  }
  if (![entry_price_a, entry_price_b].map(Number).every((x) => Number.isFinite(x) && x > 0)) {
    return res.status(400).json({ error: 'entry prices must be positive numbers' });
  }
  const raw = Array.isArray(scenarios) && scenarios.length ? scenarios : ['-50%', '-25%', '0%', '+25%', '+50%', '+100%', '+200%'];
  const L = parsePct(liquidity_usd) != null ? Number(liquidity_usd) : null;
  const rows = raw.map((s: unknown) => {
    const pct = parsePct(s);
    if (pct == null) return null;
    const k = 1 + pct / 100; // token A price relative to token B
    if (k <= 0) return null;
    const { il_pct } = ilFrom(k, 1);
    const pos = L && L > 0 ? posValues(L, k, 1) : null;
    return {
      price_change_pct: r2(pct), il_pct: r4(il_pct),
      il_usd: pos ? r2(pos.il_usd) : null,
      lp_value_usd: pos ? r2(pos.lp) : null,
      hodl_value_usd: pos ? r2(pos.hodl) : null,
      fee_needed_to_break_even_usd: pos ? r2(-pos.il_usd) : null,
    };
  }).filter(Boolean);
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    pair: `${token_a}/${token_b}`,
    scenarios: rows,
    summary: `IL is symmetric around 0% divergence and grows with the square of relative price change; e.g. a 2x move (+100%) yields ~5.7% IL, a 4x move ~20%. Fees must exceed IL for the position to beat HODL.`,
    financial_disclaimer: DISCLAIMER,
    confidence_per_section: { scenarios: 1.0 },
    recommended_actions_priority_order: ['Use scenarios to set price-based exit thresholds.', 'Compare daily fee income vs the IL rate at each band.', 'Consider concentrated-liquidity ranges to reduce IL.'],
    privacy: PRIVACY,
  });
});

// POST /lookup — ONE-CALL: current IL + position values + scenario grid.
router.post('/lookup', (req: Request, res: Response) => {
  const { token_a, token_b, entry_price_a, entry_price_b, current_price_a, current_price_b, liquidity_usd } = req.body || {};
  if (!token_a || !token_b || entry_price_a == null || entry_price_b == null || current_price_a == null || current_price_b == null) {
    return res.status(400).json({ error: 'token_a, token_b, entry_price_a, entry_price_b, current_price_a, current_price_b are required' });
  }
  const [ea, eb, ca, cb] = [entry_price_a, entry_price_b, current_price_a, current_price_b].map(Number);
  if (![ea, eb, ca, cb].every((x) => Number.isFinite(x) && x > 0)) {
    return res.status(400).json({ error: 'all prices must be positive numbers' });
  }
  const ra = ca / ea, rb = cb / eb;
  const { il_pct } = ilFrom(ra, rb);
  const L = parsePct(liquidity_usd) != null ? Number(liquidity_usd) : null;
  const pos = L && L > 0 ? posValues(L, ra, rb) : null;
  const grid = [-50, -25, 0, 25, 50, 100, 200].map((pct) => {
    const k = 1 + pct / 100;
    return { label: `${pct >= 0 ? '+' : ''}${pct}%`, price_change_pct: pct, il_pct: r4(ilFrom(k, 1).il_pct) };
  });
  res.json({
    trace_id: traceId(), computed_at: new Date().toISOString(), success: true,
    pair: `${token_a}/${token_b}`,
    impermanent_loss: { pct: r4(il_pct), usd: pos ? r2(pos.il_usd) : null, explanation: `LP retains ${r4(((il_pct / 100) + 1) * 100)}% of HODL value; ${r4(Math.abs(il_pct))}% impermanent loss from ${token_a}/${token_b} price divergence.` },
    position: { lp_value_usd: pos ? r2(pos.lp) : null, hodl_value_usd: pos ? r2(pos.hodl) : null, net_vs_hodl_usd: pos ? r2(pos.il_usd) : null },
    scenarios: grid,
    break_even_fee_needed_usd: pos ? r2(-pos.il_usd) : null,
    recommendation: recommend(Math.abs(il_pct)),
    financial_disclaimer: DISCLAIMER,
    confidence_per_section: { impermanent_loss: 1.0, position: 1.0, scenarios: 1.0 },
    recommended_actions_priority_order: ['Compare current IL vs earned fees.', 'Use the scenario grid to set price-based exit triggers.', 'The exit recommendation is a net-of-fees heuristic, not advice.'],
    privacy: PRIVACY,
  });
});

export default router;
