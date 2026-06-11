import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, clamp, round, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic wallet-risk rubric over CALLER-SUPPLIED features (age, tx count,
// approvals, counterparties, flags). It does NOT fetch the chain — it scores the
// facts you pass in. Higher score = higher risk. Advisory only (confidence < 1 +
// disclaimer): a score is a heuristic, never a verdict on a real address.

const router = Router();
const DISCLAIMER = 'Heuristic risk score over the wallet features you supplied — not on-chain analysis, not financial/compliance advice, and not a verdict on any real address. Inputs are trusted as given; a wrong input changes the score.';
const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;

const FIELDS = ['age_days', 'tx_count', 'unique_counterparties', 'token_approvals_count', 'unlimited_approvals_count', 'failed_tx_ratio', 'interacted_with_flagged', 'funded_by_mixer'];

export interface FactorRow { factor: string; points: number; note: string; }
export type RiskBand = 'low' | 'medium' | 'high' | 'severe';
export interface WalletRiskResult {
  risk_score: number; risk_band: RiskBand; factors: FactorRow[]; risk_factors: string[]; mitigants: string[];
}

export function scoreWallet(body: any): { error: string } | { result: WalletRiskResult } {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a JSON object of wallet features (age_days, tx_count, approvals, flags…).' };
  if (!FIELDS.some((f) => body[f] !== undefined)) return { error: `Provide at least one wallet feature: ${FIELDS.join(', ')}.` };

  const age_days = num(body.age_days);
  const tx_count = num(body.tx_count);
  const counterparties = num(body.unique_counterparties);
  const approvals = num(body.token_approvals_count);
  const unlimited = num(body.unlimited_approvals_count);
  const failedRatio = num(body.failed_tx_ratio);

  const factors: FactorRow[] = [];
  const add = (factor: string, points: number, note: string) => { if (points !== 0) factors.push({ factor, points, note }); };

  if (truthy(body.funded_by_mixer)) add('funded_by_mixer', 30, 'Funded via a mixer/tumbler — a strong obfuscation signal.');
  if (truthy(body.interacted_with_flagged)) add('interacted_with_flagged', 25, 'Interacted with a flagged/sanctioned address.');
  if (unlimited !== undefined && unlimited > 0) add('unlimited_approvals', clamp(Math.round(unlimited * 6), 0, 24), `${unlimited} unlimited token approval(s) — broad drain exposure if any spender is malicious.`);
  if (failedRatio !== undefined && failedRatio >= 0.3) add('high_failed_tx_ratio', 12, `High failed-transaction ratio (${round(failedRatio, 2)}) — bot/probing or careless signing pattern.`);
  if (age_days !== undefined && age_days < 30) add('new_wallet', age_days < 7 ? 15 : 8, `Young wallet (${age_days}d old) — limited history to judge.`);
  if (tx_count !== undefined && tx_count < 5) add('low_activity', 10, `Very low activity (${tx_count} tx) — possible burner/fresh wallet.`);
  if (approvals !== undefined && approvals > 20) add('high_approval_exposure', 6, `${approvals} live approvals — large attack surface; revoke stale ones.`);

  if (age_days !== undefined && tx_count !== undefined && age_days >= 365 && tx_count >= 100) add('established_history', -12, `Established wallet (${age_days}d, ${tx_count} tx) — longer track record lowers risk.`);
  if (counterparties !== undefined && counterparties >= 50) add('diverse_counterparties', -6, `${counterparties} unique counterparties — organic, diverse usage.`);

  const raw = factors.reduce((s, f) => s + f.points, 0);
  const risk_score = clamp(round(raw, 0), 0, 100);
  const hardHigh = truthy(body.funded_by_mixer) || truthy(body.interacted_with_flagged);
  let risk_band: RiskBand = risk_score >= 75 ? 'severe' : risk_score >= 50 ? 'high' : risk_score >= 25 ? 'medium' : 'low';
  if (hardHigh && (risk_band === 'low' || risk_band === 'medium')) risk_band = 'high';

  return {
    result: {
      risk_score, risk_band, factors,
      risk_factors: factors.filter((f) => f.points > 0).map((f) => f.factor),
      mitigants: factors.filter((f) => f.points < 0).map((f) => f.factor),
    },
  };
}

function actions(r: WalletRiskResult): string[] {
  const out = [`Wallet risk ${r.risk_score}/100 (${r.risk_band}) from ${r.risk_factors.length} risk factor(s) and ${r.mitigants.length} mitigant(s).`];
  if (r.risk_factors.includes('funded_by_mixer') || r.risk_factors.includes('interacted_with_flagged')) out.push('Tainted-funds/flagged-counterparty signal present — apply enhanced due diligence before transacting or onboarding.');
  if (r.risk_factors.includes('unlimited_approvals') || r.risk_factors.includes('high_approval_exposure')) out.push('Revoke stale/unlimited token approvals to shrink the drain surface.');
  if (r.risk_band === 'low') out.push('No strong risk signals in the supplied features; continue normal monitoring.');
  return out;
}

const CHAIN_TO = [
  { api: 'wallet-address-risk', reason: 'Cross-check the address against on-chain/label data sources for a live signal.' },
  { api: 'web3-security-checklist', reason: 'If this wallet deploys contracts, assess their audit-readiness too.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web3 Wallet Risk Scorer API', version: '1.0.0',
    description: 'Deterministic wallet-risk rubric over caller-supplied features (age, tx count, approvals, counterparties, mixer/flagged signals). Returns a 0–100 risk score, a band, and per-factor contributions. Scores the facts you pass in — no chain fetch — so it is advisory, not a verdict on a real address. No LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/web3-wallet-risk-scorer/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/score', summary: 'Score wallet risk from declared features', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL risk score + reasoning + guidance', price_usdc: 0.01 },
    ],
    pricing: [
      { path: '/score', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.01, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/score', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = scoreWallet(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, risk_disclaimer: DISCLAIMER,
    confidence_score: 0.75, confidence_per_section: { scoring: 1, interpretation: 0.6 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = scoreWallet(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v, risk_disclaimer: DISCLAIMER,
    reasoning: {
      why_result_generated: `Summed ${v.factors.length} factor contribution(s) → ${v.risk_score}/100 (${v.risk_band}).`,
      key_factors: v.factors.slice(0, 6).map((f) => `${f.factor}: ${f.points > 0 ? '+' : ''}${f.points}.`),
      invalidators: ['The score reflects only the features you supplied — it does not verify them against the chain.', 'Heuristic weights are opinionated; a different rubric would score the same wallet differently.', 'Absence of a flag is treated as benign, which a real investigation might not assume.'],
    },
    confidence_score: 0.75, confidence_per_section: { scoring: 1, interpretation: 0.6 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
