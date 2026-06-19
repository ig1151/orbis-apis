import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, str, round, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic token-approval risk scanner. Scores a CALLER-SUPPLIED list of
// active ERC-20 approvals (allowances) for drain exposure: unlimited allowances,
// flagged/unverified spenders, and stale grants. It does NOT fetch the chain — it
// scores the approvals you pass in — so it is advisory, not a verdict on a live
// wallet. Higher score = higher risk. No LLM, nothing stored.

const router = Router();

const DISCLAIMER =
  'Heuristic risk scoring over the approvals you supplied — not on-chain analysis, not financial/compliance advice. Inputs are trusted as given; a wrong or stale input changes the result. Revoking an approval is an on-chain transaction you must execute yourself.';

const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;
// An allowance is treated as effectively unlimited if flagged, the literal string
// 'unlimited'/'max', or a numeric value at/above the practical uint256 ceiling.
const UNLIMITED_FLOOR = 1e30;

export type RiskBand = 'low' | 'medium' | 'high' | 'severe';

export interface ApprovalRow {
  token: string;
  spender: string;
  is_unlimited: boolean;
  risk_score: number;
  risk_band: RiskBand;
  revoke_recommended: boolean;
  reasons: string[];
}

export interface ScanResult {
  total_approvals: number;
  unlimited_count: number;
  flagged_spender_count: number;
  stale_count: number;
  unverified_spender_count: number;
  exposure_score: number; // 0-100 portfolio-level drain exposure
  exposure_band: RiskBand;
  approvals: ApprovalRow[];
  revoke_priority: ApprovalRow[]; // highest-risk first, revoke_recommended only
}

function isUnlimited(a: any): boolean {
  if (truthy(a.is_unlimited)) return true;
  const raw = a.allowance;
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (s === 'unlimited' || s === 'max' || s === 'infinite') return true;
    const n = Number(s);
    return Number.isFinite(n) && n >= UNLIMITED_FLOOR;
  }
  if (typeof raw === 'number') return raw >= UNLIMITED_FLOOR;
  return false;
}

function scoreApproval(a: any): ApprovalRow {
  const token = str(a.token_symbol) ?? str(a.token) ?? 'unknown-token';
  const spender = str(a.spender_label) ?? str(a.spender) ?? 'unknown-spender';
  const unlimited = isUnlimited(a);
  const lastUsed = num(a.last_used_days);
  const reasons: string[] = [];
  let pts = 0;

  if (truthy(a.spender_flagged)) {
    pts += 50;
    reasons.push('Spender is flagged/blocklisted — revoke immediately.');
  }
  if (unlimited) {
    pts += 30;
    reasons.push('Unlimited allowance — the spender can move your entire balance of this token.');
  }
  // Explicit unverified vs unknown verification status are scored differently.
  if (a.spender_verified === false || a.spender_verified === 'false') {
    pts += 15;
    reasons.push('Spender contract is unverified — source code cannot be reviewed.');
  } else if (a.spender_verified === undefined) {
    pts += 5;
    reasons.push('Spender verification status unknown — treat with caution.');
  }
  if (lastUsed !== undefined) {
    if (lastUsed >= 365) {
      pts += 15;
      reasons.push(`Stale approval — unused for ${Math.round(lastUsed)}d; likely safe to revoke.`);
    } else if (lastUsed >= 180) {
      pts += 10;
      reasons.push(`Aging approval — unused for ${Math.round(lastUsed)}d.`);
    }
  }
  // A large-but-finite allowance is a milder signal than unlimited.
  if (!unlimited) {
    const amt = num(a.allowance);
    if (amt !== undefined && amt >= 1_000_000) {
      pts += 4;
      reasons.push('Large finite allowance — more than a typical single-use approval.');
    }
  }
  if (reasons.length === 0) reasons.push('Bounded, recently-used approval to a known spender — low concern.');

  const risk_score = clamp(round(pts, 0), 0, 100);
  const hardHigh = truthy(a.spender_flagged);
  let risk_band: RiskBand = risk_score >= 75 ? 'severe' : risk_score >= 50 ? 'high' : risk_score >= 25 ? 'medium' : 'low';
  if (hardHigh && (risk_band === 'low' || risk_band === 'medium')) risk_band = 'high';

  return { token, spender, is_unlimited: unlimited, risk_score, risk_band, revoke_recommended: risk_score >= 25 || hardHigh, reasons };
}

export function scan(body: any): { error: string } | { result: ScanResult } {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Provide a JSON object with an "approvals" array.' };
  const list = body.approvals;
  if (!Array.isArray(list) || list.length === 0)
    return { error: 'Provide a non-empty "approvals" array; each item is an approval (token, spender, allowance/is_unlimited, …).' };
  if (list.length > 500) return { error: 'Too many approvals — limit 500 per call.' };
  if (!list.every((a) => a && typeof a === 'object' && !Array.isArray(a)))
    return { error: 'Every approvals[] item must be a JSON object.' };

  const approvals = list.map(scoreApproval);
  const unlimited_count = approvals.filter((a) => a.is_unlimited).length;
  const flagged_spender_count = list.filter((a) => truthy(a.spender_flagged)).length;
  const stale_count = list.filter((a) => { const d = num(a.last_used_days); return d !== undefined && d >= 180; }).length;
  const unverified_spender_count = list.filter((a) => a.spender_verified === false || a.spender_verified === 'false').length;

  // Portfolio exposure: dominated by the worst approval, lifted by breadth of risky grants.
  const maxRisk = approvals.reduce((m, a) => Math.max(m, a.risk_score), 0);
  const riskyCount = approvals.filter((a) => a.revoke_recommended).length;
  const exposure_score = clamp(round(maxRisk + Math.min(20, (riskyCount - 1) * 4), 0), 0, 100);
  const exposure_band: RiskBand = exposure_score >= 75 ? 'severe' : exposure_score >= 50 ? 'high' : exposure_score >= 25 ? 'medium' : 'low';

  const revoke_priority = approvals
    .filter((a) => a.revoke_recommended)
    .sort((x, y) => y.risk_score - x.risk_score);

  return {
    result: {
      total_approvals: approvals.length, unlimited_count, flagged_spender_count, stale_count, unverified_spender_count,
      exposure_score, exposure_band, approvals, revoke_priority,
    },
  };
}

function actions(r: ScanResult): string[] {
  const out = [`Scanned ${r.total_approvals} approval(s): exposure ${r.exposure_score}/100 (${r.exposure_band}); ${r.revoke_priority.length} recommended for revocation.`];
  if (r.flagged_spender_count > 0) out.push(`Revoke the ${r.flagged_spender_count} flagged-spender approval(s) immediately — these are the highest drain risk.`);
  if (r.unlimited_count > 0) out.push(`Reduce ${r.unlimited_count} unlimited allowance(s) to a bounded amount, or revoke if unused.`);
  if (r.stale_count > 0) out.push(`Revoke ${r.stale_count} stale approval(s) (unused 180d+) to shrink the attack surface.`);
  if (r.revoke_priority.length === 0) out.push('No high-risk approvals in the supplied set; continue periodic review.');
  return out;
}

const CHAIN_TO = [
  { api: 'wallet-risk-bundle', reason: 'Fold this approval exposure into a single wallet trust verdict alongside address risk and reputation.' },
  { api: 'web3-wallet-risk-scorer', reason: 'Feed unlimited_approvals_count and total approvals into a full wallet-risk rubric.' },
  { api: 'wallet-address-risk', reason: 'Cross-check the wallet or a suspicious spender address against on-chain/label sources.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Token Approval Risk Scanner API', version: '1.0.0',
    description: 'Deterministic scanner for ERC-20 token approvals (allowances). Flags unlimited allowances, flagged/unverified spenders, and stale grants, scores per-approval and portfolio drain exposure, and returns a revoke-priority list. Scores the approvals you supply — no chain fetch. No LLM, nothing stored.',
    openapi_url: 'https://orbis-apis.onrender.com/token-approval-risk-scanner/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/scan', summary: 'Score approvals and return a revoke-priority list', price_usdc: 0.02 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL scan + reasoning + prioritized actions', price_usdc: 0.035 },
    ],
    pricing: [
      { path: '/scan', price_usdc: 0.02, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.035, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/scan', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = scan(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, risk_disclaimer: DISCLAIMER,
    confidence_score: 0.85, confidence_per_section: { scoring: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = scan(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v, risk_disclaimer: DISCLAIMER,
    reasoning: {
      why_result_generated: `Scored ${v.total_approvals} approval(s); worst per-approval risk and breadth of risky grants set exposure to ${v.exposure_score}/100 (${v.exposure_band}).`,
      key_factors: [
        `${v.unlimited_count} unlimited allowance(s).`,
        `${v.flagged_spender_count} flagged spender(s).`,
        `${v.stale_count} stale approval(s) (180d+).`,
        `${v.unverified_spender_count} unverified spender(s).`,
      ],
      invalidators: [
        'Scores only the approvals you supplied — it does not query the chain to confirm they are still active.',
        'A spender flagged after your snapshot would not be reflected; re-scan against fresh data.',
        'Heuristic weights are opinionated; a different rubric would rank the same approvals differently.',
      ],
    },
    confidence_score: 0.85, confidence_per_section: { scoring: 1, interpretation: 0.7 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
