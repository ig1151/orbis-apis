import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { num, clamp, round, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic, DEFENSIVE smart-contract audit-readiness checklist. The caller
// declares which security practices a contract follows (audit, access control,
// reentrancy protection, timelock, multisig, tests, etc.); we score readiness
// 0–100, grade it, and list missing items + red flags. It is a self-assessment
// rubric — NOT an audit and NOT a guarantee — so confidence is < 1 with a
// disclaimer. It does not analyze bytecode or find vulnerabilities for you.

const router = Router();
const DISCLAIMER = 'Audit-readiness self-assessment from declared facts — NOT a security audit, formal verification, or guarantee. A high score does not mean a contract is safe; commission an independent audit before mainnet deployment.';
const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;

interface Item { key: string; weight: number; critical: boolean; yes: string; no: string; }
const ITEMS: Item[] = [
  { key: 'external_audit', weight: 25, critical: true, yes: 'Independently audited by a reputable firm.', no: 'No independent audit — the single biggest gap before mainnet.' },
  { key: 'verified_source', weight: 10, critical: false, yes: 'Source code verified on the block explorer.', no: 'Source not verified — users cannot inspect what they interact with.' },
  { key: 'access_control', weight: 10, critical: true, yes: 'Privileged functions are gated by access control.', no: 'Privileged functions lack access control — high risk of unauthorized state changes.' },
  { key: 'reentrancy_protection', weight: 10, critical: false, yes: 'Reentrancy guarded (nonReentrant / checks-effects-interactions).', no: 'No declared reentrancy protection on external-call paths.' },
  { key: 'timelock_on_upgrades', weight: 10, critical: false, yes: 'Upgrades/admin actions sit behind a timelock.', no: 'No timelock — admin changes can take effect with no warning window.' },
  { key: 'multisig_admin', weight: 10, critical: false, yes: 'Admin/owner is a multisig, not a single EOA.', no: 'Admin is a single key — one compromise controls the contract.' },
  { key: 'adequate_test_coverage', weight: 10, critical: false, yes: 'Adequate automated test coverage of critical paths.', no: 'Test coverage is inadequate or undeclared.' },
  { key: 'pause_mechanism', weight: 5, critical: false, yes: 'Has an emergency pause / circuit breaker.', no: 'No emergency pause to contain an active incident.' },
  { key: 'bug_bounty', weight: 5, critical: false, yes: 'Active bug-bounty program.', no: 'No bug-bounty incentive for responsible disclosure.' },
  { key: 'no_known_vulns', weight: 5, critical: false, yes: 'No unresolved known vulnerabilities declared.', no: 'Known vulnerabilities are unresolved or undeclared.' },
];

interface RedFlag { key: string; note: string; }
const RED_FLAGS: RedFlag[] = [
  { key: 'owner_can_drain_funds', note: 'Owner can unilaterally withdraw user funds — a rug-pull vector. Do not deploy/interact until removed or tightly governed.' },
  { key: 'upgradeable_without_timelock', note: 'Contract is upgradeable with no timelock — admin can swap logic instantly. Do not deploy until upgrades are time-locked + multisig-gated.' },
  { key: 'unresolved_critical_findings', note: 'Unresolved critical audit findings — must be fixed and re-reviewed before deployment.' },
];

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export interface ChecklistRow { item: string; weight: number; critical: boolean; present: boolean; note: string; }
export interface ChecklistResult {
  readiness_score: number; grade: Grade; readiness_level: 'not_ready' | 'high_risk' | 'developing' | 'strong'; do_not_deploy: boolean;
  checklist: ChecklistRow[]; missing_critical: string[]; red_flags_triggered: string[]; items_passed: number; items_total: number;
}

export function assess(body: any): { error: string } | { result: ChecklistResult } {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a JSON object declaring the contract security facts (external_audit, access_control, etc.).' };

  // adequate_test_coverage can be declared directly or inferred from a percentage.
  const covPct = num(body?.test_coverage_pct);
  const bodyEff: Record<string, unknown> = { ...body };
  if (bodyEff.adequate_test_coverage === undefined && covPct !== undefined) bodyEff.adequate_test_coverage = covPct >= 80;

  const checklist: ChecklistRow[] = ITEMS.map((it) => {
    const present = truthy(bodyEff[it.key]);
    return { item: it.key, weight: it.weight, critical: it.critical, present, note: present ? it.yes : it.no };
  });
  const readiness_score = clamp(round(checklist.reduce((s, r) => s + (r.present ? r.weight : 0), 0), 0), 0, 100);
  const red_flags_triggered = RED_FLAGS.filter((f) => truthy(body[f.key])).map((f) => f.key);
  const do_not_deploy = red_flags_triggered.length > 0;
  const missing_critical = checklist.filter((r) => r.critical && !r.present).map((r) => r.item);

  let grade: Grade = readiness_score >= 90 ? 'A' : readiness_score >= 75 ? 'B' : readiness_score >= 60 ? 'C' : readiness_score >= 40 ? 'D' : 'F';
  if (do_not_deploy && (grade === 'A' || grade === 'B')) grade = 'C'; // a red flag caps the headline grade
  const readiness_level: ChecklistResult['readiness_level'] = do_not_deploy ? 'high_risk' : readiness_score >= 75 ? 'strong' : readiness_score >= 50 ? 'developing' : 'not_ready';

  return {
    result: {
      readiness_score, grade, readiness_level, do_not_deploy, checklist, missing_critical, red_flags_triggered,
      items_passed: checklist.filter((r) => r.present).length, items_total: ITEMS.length,
    },
  };
}

function actions(r: ChecklistResult): string[] {
  const out: string[] = [];
  RED_FLAGS.filter((f) => r.red_flags_triggered.includes(f.key)).forEach((f) => out.push(f.note));
  out.push(`Audit-readiness ${r.readiness_score}/100 (grade ${r.grade}, ${r.readiness_level}); ${r.items_passed}/${r.items_total} practices in place.`);
  if (r.missing_critical.length) out.push(`Close critical gaps first: ${r.missing_critical.join(', ')}.`);
  if (!r.do_not_deploy && r.readiness_score < 90) out.push('Address the unchecked items above and commission an independent audit before mainnet.');
  return out;
}

const CHAIN_TO = [
  { api: 'web3-wallet-risk-scorer', reason: 'Score the deploying/admin wallet’s risk profile from its declared features.' },
  { api: 'layer2-comparison', reason: 'Pick a settlement/L2 target appropriate for the contract’s risk and cost profile.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web3 Security Checklist API', version: '1.0.0',
    description: 'Deterministic, defensive smart-contract audit-readiness checklist. Declare which security practices the contract follows; returns a 0–100 readiness score, a grade, per-item pass/fail, missing critical items, and red-flag warnings (e.g. owner can drain funds). A self-assessment rubric, not an audit. No bytecode analysis, no LLM.',
    openapi_url: 'https://orbis-apis.onrender.com/web3-security-checklist/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/assess', summary: 'Score audit-readiness from declared facts', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL readiness + reasoning + remediation guidance', price_usdc: 0.012 },
    ],
    pricing: [
      { path: '/assess', price_usdc: 0.006, currency: 'USDC' },
      { path: '/lookup', price_usdc: 0.012, currency: 'USDC' },
    ],
    x402_compatible: true,
  });
});

router.post('/assess', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = assess(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  respond(res, t0, {
    ...r.result, security_disclaimer: DISCLAIMER,
    confidence_score: 0.7, confidence_per_section: { scoring: 1, security_interpretation: 0.5 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = assess(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v, security_disclaimer: DISCLAIMER,
    reasoning: {
      why_result_generated: `Summed ${v.items_passed}/${v.items_total} declared practices → ${v.readiness_score}/100 (grade ${v.grade})${v.do_not_deploy ? '; a red flag caps it and forces do_not_deploy' : ''}.`,
      key_factors: [`Score ${v.readiness_score}/100.`, v.missing_critical.length ? `Missing critical: ${v.missing_critical.join(', ')}.` : 'No critical items missing.', v.red_flags_triggered.length ? `Red flags: ${v.red_flags_triggered.join(', ')}.` : 'No red flags.'],
      invalidators: ['Score reflects only the practices you declared — a wrong/omitted answer changes it.', 'This is a checklist, not an audit: a perfect score does not prove the code is safe.', 'New vulnerability classes or business-logic bugs are not captured by these items.'],
    },
    confidence_score: 0.7, confidence_per_section: { scoring: 1, security_interpretation: 0.5 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
