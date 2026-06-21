import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic AML transaction-pattern detector. Takes a CALLER-SUPPLIED, time-ordered
// sequence of transactions (value_usd, direction, timestamp, optional counterparty/flags)
// and flags the classic money-laundering patterns over that sequence: structuring
// (amounts kept just under a reporting threshold), layering / rapid pass-through, high
// velocity bursts, round-tripping with a single counterparty, and amount anomalies. It
// does NOT fetch the chain — it analyzes the transactions you pass in — so it is
// advisory, not a verdict on a live wallet. Higher score = more suspicious. No LLM,
// nothing stored.

const router = Router();

const DISCLAIMER =
  'Pattern detection over the transactions you supplied — not on-chain analysis, not a Suspicious Activity Report or legal/compliance determination. Inputs are trusted as given; a transaction you omit is excluded, not assumed clean. Patterns are heuristics that warrant review, not proof of illicit activity.';

const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;

export type Band = 'low' | 'medium' | 'high' | 'severe';
export type Verdict = 'allow' | 'review' | 'block';

const bandOf = (s: number): Band => (s >= 75 ? 'severe' : s >= 50 ? 'high' : s >= 25 ? 'medium' : 'low');

interface Tx {
  index: number;
  ts_ms: number | null;
  value_usd: number;
  direction: 'in' | 'out' | 'unknown';
  counterparty: string | null;
  flagged: boolean;
  sanctioned: boolean;
}

export interface PatternResult {
  detected: boolean;
  severity: number; // 0-100
  band: Band;
  count: number;
  detail: string;
  evidence_tx_indices: number[];
}

export interface DetectResult {
  wallet: string | null;
  transaction_count: number;
  scored_transaction_count: number;
  time_ordered: boolean;
  total_volume_usd: number;
  inflow_usd: number;
  outflow_usd: number;
  structuring_threshold_usd: number;
  layering_window_minutes: number;
  patterns: {
    structuring: PatternResult;
    layering: PatternResult;
    high_velocity: PatternResult;
    round_tripping: PatternResult;
    amount_anomaly: PatternResult;
  };
  patterns_detected: string[];
  aml_pattern_score: number; // 0-100
  pattern_band: Band;
  verdict: Verdict;
  hard_block: boolean;
  flagged_counterparty_count: number;
  sanctioned_counterparty_involved: boolean;
  reasons: string[];
}

function toMs(v: unknown): number | null {
  const n = num(v);
  if (n !== undefined) {
    // Heuristic: < 1e12 → seconds; else milliseconds.
    return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
  }
  const s = str(v);
  if (s !== undefined) {
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

function parseTx(t: any, i: number): Tx {
  const value_usd = Math.max(0, round(num(t.value_usd) ?? num(t.amount_usd) ?? num(t.value) ?? 0, 2));
  const dRaw = (str(t.direction) ?? '').toLowerCase();
  const direction: Tx['direction'] = dRaw === 'in' || dRaw === 'inbound' || dRaw === 'received' ? 'in'
    : dRaw === 'out' || dRaw === 'outbound' || dRaw === 'sent' ? 'out' : 'unknown';
  return {
    index: i,
    ts_ms: toMs(t.timestamp ?? t.time ?? t.ts ?? t.block_time),
    value_usd,
    direction,
    counterparty: str(t.counterparty) ?? str(t.counterparty_address) ?? str(t.to) ?? str(t.from) ?? null,
    flagged: truthy(t.counterparty_flagged) || truthy(t.flagged) || truthy(t.blocklisted),
    sanctioned: truthy(t.counterparty_sanctioned) || truthy(t.sanctioned),
  };
}

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : round((s[m - 1] + s[m]) / 2, 2);
};

function detectStructuring(txs: Tx[], threshold: number): PatternResult {
  // Amounts deliberately kept just below the reporting threshold.
  const lo = threshold * 0.6;
  const near = txs.filter((t) => t.value_usd >= lo && t.value_usd < threshold);
  const count = near.length;
  const severity = count >= 3 ? clamp(50 + (count - 3) * 12, 0, 100) : count === 2 ? 35 : count === 1 ? 15 : 0;
  return {
    detected: count >= 3,
    severity, band: bandOf(severity), count,
    detail: count === 0
      ? `No transactions in the structuring band ($${round(lo, 2)}–$${threshold}).`
      : `${count} transaction(s) sit in the structuring band ($${round(lo, 2)}–$${threshold}), just under the $${threshold} reporting threshold.`,
    evidence_tx_indices: near.map((t) => t.index),
  };
}

function detectLayering(txs: Tx[], windowMin: number): PatternResult {
  // Funds arrive then leave quickly (>=80% forwarded within the window) — pass-through.
  const windowMs = windowMin * 60 * 1000;
  const ordered = txs.filter((t) => t.ts_ms !== null).sort((a, b) => (a.ts_ms as number) - (b.ts_ms as number));
  const events: number[] = [];
  for (const inflow of ordered) {
    if (inflow.direction !== 'in' || inflow.value_usd <= 0) continue;
    let forwarded = 0;
    const t0 = inflow.ts_ms as number;
    for (const out of ordered) {
      if (out.direction === 'out' && (out.ts_ms as number) > t0 && (out.ts_ms as number) <= t0 + windowMs) {
        forwarded += out.value_usd;
      }
    }
    if (forwarded >= inflow.value_usd * 0.8) events.push(inflow.index);
  }
  const count = events.length;
  const severity = count >= 2 ? clamp(45 + (count - 2) * 18, 0, 100) : count === 1 ? 25 : 0;
  return {
    detected: count >= 2,
    severity, band: bandOf(severity), count,
    detail: count === 0
      ? `No rapid pass-through detected (no inflow with ≥80% forwarded within ${windowMin} min).`
      : `${count} inflow(s) had ≥80% of value forwarded out within ${windowMin} min — classic layering / pass-through.`,
    evidence_tx_indices: events,
  };
}

function detectVelocity(txs: Tx[]): PatternResult {
  const ordered = txs.filter((t) => t.ts_ms !== null).sort((a, b) => (a.ts_ms as number) - (b.ts_ms as number));
  let maxPerHour = 0;
  const hourMs = 3600 * 1000;
  let windowStartIdx = 0; // indices into evidence (best window)
  let bestWindow: number[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const start = ordered[i].ts_ms as number;
    const inWindow = ordered.filter((t) => (t.ts_ms as number) >= start && (t.ts_ms as number) < start + hourMs);
    if (inWindow.length > maxPerHour) { maxPerHour = inWindow.length; bestWindow = inWindow.map((t) => t.index); }
  }
  void windowStartIdx;
  const severity = maxPerHour >= 20 ? clamp(60 + (maxPerHour - 20) * 2, 0, 100) : maxPerHour >= 10 ? 45 : maxPerHour >= 5 ? 20 : 0;
  return {
    detected: maxPerHour >= 10,
    severity, band: bandOf(severity), count: maxPerHour,
    detail: ordered.length === 0
      ? 'No timestamps supplied — velocity could not be evaluated.'
      : `Peak of ${maxPerHour} transaction(s) within a single 1-hour window.`,
    evidence_tx_indices: maxPerHour >= 5 ? bestWindow : [],
  };
}

function detectRoundTripping(txs: Tx[]): PatternResult {
  // Same counterparty receives and sends roughly equal value (net ~0).
  const byCp = new Map<string, { in: number; out: number; idx: number[] }>();
  for (const t of txs) {
    if (!t.counterparty || t.value_usd <= 0 || t.direction === 'unknown') continue;
    const e = byCp.get(t.counterparty) ?? { in: 0, out: 0, idx: [] };
    if (t.direction === 'in') e.in += t.value_usd; else e.out += t.value_usd;
    e.idx.push(t.index);
    byCp.set(t.counterparty, e);
  }
  const evidence: number[] = [];
  let pairs = 0;
  for (const e of byCp.values()) {
    const mx = Math.max(e.in, e.out);
    if (e.in > 0 && e.out > 0 && mx > 0 && Math.abs(e.in - e.out) / mx <= 0.1) { pairs++; evidence.push(...e.idx); }
  }
  const severity = pairs >= 1 ? clamp(35 + (pairs - 1) * 20, 0, 100) : 0;
  return {
    detected: pairs >= 1,
    severity, band: bandOf(severity), count: pairs,
    detail: pairs === 0
      ? 'No round-tripping (no counterparty with near-equal in/out flow).'
      : `${pairs} counterparty(ies) show near-equal in/out flow (net ≈ 0) — possible round-tripping / wash activity.`,
    evidence_tx_indices: evidence,
  };
}

function detectAmountAnomaly(txs: Tx[]): PatternResult {
  const vals = txs.map((t) => t.value_usd).filter((v) => v > 0);
  if (vals.length < 3) {
    return { detected: false, severity: 0, band: 'low', count: 0, detail: 'Too few non-zero transactions to assess amount anomalies.', evidence_tx_indices: [] };
  }
  const med = median(vals);
  const max = Math.max(...vals);
  const ratio = med > 0 ? round(max / med, 2) : 0;
  const spikeTx = txs.filter((t) => t.value_usd === max).map((t) => t.index);
  const severity = ratio >= 50 ? 80 : ratio >= 20 ? 55 : ratio >= 10 ? 35 : ratio >= 5 ? 15 : 0;
  return {
    detected: ratio >= 10,
    severity, band: bandOf(severity), count: ratio,
    detail: med <= 0
      ? 'Median transaction value is 0 — amount anomaly not meaningful.'
      : `Largest transaction ($${max}) is ${ratio}× the median ($${med})${ratio >= 10 ? ' — a significant outlier.' : '.'}`,
    evidence_tx_indices: ratio >= 10 ? spikeTx : [],
  };
}

export function detect(body: any): { error: string } | { result: DetectResult } {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Provide a JSON object with a "transactions" array.' };
  const list = body.transactions;
  if (!Array.isArray(list) || list.length === 0)
    return { error: 'Provide a non-empty "transactions" array; each item is a transaction (value_usd, direction in/out, optional timestamp/counterparty/flags).' };
  if (list.length > 5000) return { error: 'Too many transactions — limit 5000 per call.' };
  if (!list.every((t) => t && typeof t === 'object' && !Array.isArray(t)))
    return { error: 'Every transactions[] item must be a JSON object.' };

  const thrRaw = num(body.structuring_threshold_usd);
  const structuring_threshold_usd = thrRaw !== undefined && thrRaw > 0 ? round(thrRaw, 2) : 10000;
  const winRaw = num(body.layering_window_minutes);
  const layering_window_minutes = winRaw !== undefined && winRaw > 0 ? Math.round(winRaw) : 60;

  const txs = list.map(parseTx);
  const scored_transaction_count = txs.filter((t) => t.value_usd > 0).length;
  const time_ordered = txs.every((t) => t.ts_ms !== null);
  const inflow_usd = round(txs.filter((t) => t.direction === 'in').reduce((s, t) => s + t.value_usd, 0), 2);
  const outflow_usd = round(txs.filter((t) => t.direction === 'out').reduce((s, t) => s + t.value_usd, 0), 2);
  const total_volume_usd = round(txs.reduce((s, t) => s + t.value_usd, 0), 2);

  const patterns = {
    structuring: detectStructuring(txs, structuring_threshold_usd),
    layering: detectLayering(txs, layering_window_minutes),
    high_velocity: detectVelocity(txs),
    round_tripping: detectRoundTripping(txs),
    amount_anomaly: detectAmountAnomaly(txs),
  };

  const all = Object.values(patterns);
  const patterns_detected = (Object.entries(patterns).filter(([, p]) => p.detected).map(([k]) => k));
  const maxSeverity = Math.max(0, ...all.map((p) => p.severity));
  const aml_pattern_score = clamp(round(maxSeverity + Math.min(20, Math.max(0, patterns_detected.length - 1) * 6), 0), 0, 100);
  const pattern_band = bandOf(aml_pattern_score);

  const flagged_counterparty_count = new Set(txs.filter((t) => t.flagged || t.sanctioned).map((t) => t.counterparty ?? `idx-${t.index}`)).size;
  const sanctioned_counterparty_involved = txs.some((t) => t.sanctioned);
  const hard_block = sanctioned_counterparty_involved;

  let verdict: Verdict;
  if (hard_block || aml_pattern_score >= 70) verdict = 'block';
  else if (aml_pattern_score >= 40 || patterns_detected.length > 0 || flagged_counterparty_count > 0) verdict = 'review';
  else verdict = 'allow';

  const reasons: string[] = [];
  if (sanctioned_counterparty_involved) reasons.push('A sanctioned counterparty is involved — hard compliance block; escalate immediately.');
  for (const [k, p] of Object.entries(patterns)) if (p.detected) reasons.push(`${k.replace(/_/g, ' ')} pattern detected: ${p.detail}`);
  if (flagged_counterparty_count > 0 && !sanctioned_counterparty_involved) reasons.push(`${flagged_counterparty_count} flagged counterparty(ies) in the sequence — review those transactions.`);
  if (!time_ordered) reasons.push('Some transactions lack timestamps — time-based patterns (layering, velocity) may be understated.');
  if (reasons.length === 0) reasons.push('No money-laundering patterns detected in the supplied transactions.');

  return {
    result: {
      wallet: str(body.wallet) ?? str(body.address) ?? null,
      transaction_count: txs.length, scored_transaction_count, time_ordered,
      total_volume_usd, inflow_usd, outflow_usd,
      structuring_threshold_usd, layering_window_minutes,
      patterns, patterns_detected,
      aml_pattern_score, pattern_band, verdict, hard_block,
      flagged_counterparty_count, sanctioned_counterparty_involved,
      reasons,
    },
  };
}

function actions(r: DetectResult): string[] {
  const out = [`Analyzed ${r.transaction_count} transactions ($${r.total_volume_usd} volume): AML pattern score ${r.aml_pattern_score}/100 (${r.pattern_band}) → verdict ${r.verdict}.`];
  if (r.sanctioned_counterparty_involved) out.push('Sanctioned counterparty present — halt and file/escalate per your compliance process.');
  if (r.patterns.structuring.detected) out.push(`Structuring: ${r.patterns.structuring.detail} Aggregate the related transfers and review intent.`);
  if (r.patterns.layering.detected) out.push(`Layering: ${r.patterns.layering.detail} Trace the forwarded funds to their destinations.`);
  if (r.patterns.round_tripping.detected) out.push(`Round-tripping: ${r.patterns.round_tripping.detail} Confirm whether volume is being inflated.`);
  if (r.patterns.high_velocity.detected) out.push(`High velocity: ${r.patterns.high_velocity.detail} Check for automated/bot or burst behavior.`);
  if (out.length === 1) out.push('No suspicious patterns; continue routine monitoring.');
  return out;
}

const CHAIN_TO = [
  { api: 'counterparty-exposure-graph', reason: 'Score the counterparties these transactions touch into a volume-weighted exposure graph.', url: 'https://orbis-apis.onrender.com/counterparty-exposure-graph' },
  { api: 'wallet-address-risk', reason: 'Check whether a counterparty address in a flagged transaction is itself high-risk.', url: 'https://orbis-apis.onrender.com/wallet-address-risk' },
  { api: 'wallet-risk-bundle', reason: 'Fold the AML pattern score into a single wallet trust verdict.', url: 'https://orbis-apis.onrender.com/wallet-risk-bundle' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Transaction Pattern Detector API', version: '1.0.0',
    description: 'Deterministic AML transaction-pattern detector. From a caller-supplied, time-ordered transaction sequence it flags structuring (amounts under a reporting threshold), layering / rapid pass-through, high-velocity bursts, round-tripping, and amount anomalies, returning per-pattern evidence, an aml_pattern_score (0-100), and an allow/review/block verdict. Analyzes the transactions you supply — no chain fetch. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/transaction-pattern-detector/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/detect', summary: 'Detect AML patterns over a transaction sequence', price_usdc: 0.025 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL detection + reasoning + prioritized actions', price_usdc: 0.04 },
    ],
    pricing: [
      { path: '/detect', price_usdc: 0.025, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.04, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/detect', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = detect(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, risk_disclaimer: DISCLAIMER,
    confidence_score: 0.8, confidence_per_section: { detection: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = detect(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v, risk_disclaimer: DISCLAIMER,
    reasoning: {
      why_result_generated: `Scanned ${v.transaction_count} transactions for money-laundering patterns; ${v.patterns_detected.length} pattern(s) detected → aml_pattern_score ${v.aml_pattern_score}/100 (${v.pattern_band}) → verdict ${v.verdict}${v.hard_block ? ' via hard-block override' : ''}.`,
      key_factors: [
        `Patterns detected: ${v.patterns_detected.length ? v.patterns_detected.join(', ') : 'none'}.`,
        `Volume $${v.total_volume_usd} (in $${v.inflow_usd} / out $${v.outflow_usd}) over ${v.transaction_count} transactions.`,
        `Structuring band count ${v.patterns.structuring.count}; layering events ${v.patterns.layering.count}; peak velocity ${v.patterns.high_velocity.count}/hr; round-trip pairs ${v.patterns.round_tripping.count}.`,
        `${v.flagged_counterparty_count} flagged counterparty(ies); sanctioned involved: ${v.sanctioned_counterparty_involved}.`,
      ],
      invalidators: [
        'Analyzes only the transactions you supplied — omitted transactions are excluded, not assumed clean.',
        'Time-based patterns (layering, velocity) require timestamps; without them they are understated.',
        'Patterns are heuristics warranting review, not proof of illicit activity; legitimate behavior can match them.',
      ],
    },
    confidence_score: 0.8, confidence_per_section: { detection: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
