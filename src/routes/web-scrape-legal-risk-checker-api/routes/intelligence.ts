import { Router, Request, Response } from 'express';
import { respond, fail } from '../../_aplus/scaffold';
import { str, clamp, EXECUTION_METADATA, PRIVACY } from '../../_aplus/util';

// Deterministic, DEFENSIVE scrape legal-risk rubric. The caller declares facts
// about a target (robots disallow, login wall, ToS, PII, copyright, commercial
// use, access-control circumvention); we score compliance risk and recommend how
// to scrape responsibly. It does NOT help bypass anything — circumvention raises
// risk to severe and is flagged "do not proceed". Not legal advice.

const router = Router();
const LEGAL_DISCLAIMER = 'Informational compliance rubric, not legal advice. Scraping legality depends on jurisdiction, the specific site, and how data is used — consult a qualified lawyer for any commercial or PII-bearing crawl.';

interface FlagDef { key: string; weight: (b: any, region: string) => number; note: (present: boolean) => string; }
const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 1;

const FLAGS: FlagDef[] = [
  { key: 'robots_disallows', weight: () => 20, note: (p) => p ? 'robots.txt disallows these paths — scraping them ignores the site\'s stated policy.' : 'robots.txt permits the target paths.' },
  { key: 'behind_login', weight: () => 15, note: (p) => p ? 'Content is behind authentication — scraping it may breach the account terms you agreed to.' : 'Content is publicly reachable without login.' },
  { key: 'tos_prohibits_scraping', weight: () => 20, note: (p) => p ? 'Terms of Service explicitly prohibit scraping — a clear contractual risk.' : 'No explicit ToS prohibition declared.' },
  { key: 'personal_data', weight: (_b, region) => (region === 'EU' || region === 'UK' ? 25 : 15), note: (p) => p ? 'Collecting personal data triggers privacy law (GDPR/CCPA) — you need a lawful basis and retention limits.' : 'No personal data collected.' },
  { key: 'special_category_data', weight: () => 25, note: (p) => p ? 'Sensitive/special-category data (health, biometric, political) — high bar; usually requires explicit consent.' : 'No sensitive-category data.' },
  { key: 'copyrighted_content', weight: () => 15, note: (p) => p ? 'Reproducing substantial copyrighted content risks infringement; prefer facts/links over wholesale copies.' : 'No substantial copyrighted reproduction.' },
  { key: 'commercial_use', weight: () => 5, note: (p) => p ? 'Commercial use raises the stakes on every other flag.' : 'Non-commercial / internal use.' },
  { key: 'bypasses_access_controls', weight: () => 30, note: (p) => p ? 'Circumventing CAPTCHAs/paywalls/rate-limits or other access controls — DO NOT PROCEED; this risks anti-circumvention/CFAA-type liability.' : 'No access controls are being bypassed.' },
];

export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe';
export interface FlagRow { flag: string; present: boolean; weight_applied: number; note: string; }
export interface RiskResult {
  region: string; risk_score: number; legal_risk_level: RiskLevel; do_not_proceed: boolean;
  flags: FlagRow[]; triggered_flags: string[]; robots_policy_note: string;
}

const REGIONS = ['EU', 'UK', 'US', 'other'];

export function assess(body: any): { error: string } | { result: RiskResult } {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a JSON object declaring the scrape facts (robots_disallows, personal_data, etc.).' };
  const region = (str(body?.region)?.toUpperCase() ?? 'OTHER');
  const reg = REGIONS.includes(region) ? region : (region === 'OTHER' ? 'other' : 'other');

  const flags: FlagRow[] = FLAGS.map((f) => {
    const present = truthy(body?.[f.key]);
    return { flag: f.key, present, weight_applied: present ? f.weight(body, reg) : 0, note: f.note(present) };
  });
  const raw = flags.reduce((s, f) => s + f.weight_applied, 0);
  const risk_score = clamp(raw, 0, 100);
  const bypass = flags.find((f) => f.flag === 'bypasses_access_controls')?.present === true;
  const level: RiskLevel = bypass || risk_score >= 70 ? 'severe' : risk_score >= 45 ? 'high' : risk_score >= 20 ? 'moderate' : 'low';
  const robots_present = flags.find((f) => f.flag === 'robots_disallows')?.present === true;
  return {
    result: {
      region: reg, risk_score, legal_risk_level: level, do_not_proceed: bypass,
      flags, triggered_flags: flags.filter((f) => f.present).map((f) => f.flag),
      robots_policy_note: robots_present ? 'Target paths are disallowed by robots.txt — do not crawl them.' : 'Honor robots.txt and any Crawl-delay; re-check it before each run.',
    },
  };
}

function actions(r: RiskResult): string[] {
  const out: string[] = [];
  if (r.do_not_proceed) { out.push('DO NOT PROCEED: you declared circumvention of access controls. Remove that step or obtain explicit written authorization first.'); }
  out.push(`Legal-risk ${r.risk_score}/100 (${r.legal_risk_level}). ${r.robots_policy_note}`);
  if (r.triggered_flags.includes('personal_data') || r.triggered_flags.includes('special_category_data')) out.push('Minimize and lawfully justify any personal data; set retention limits and honor deletion requests.');
  if (r.triggered_flags.includes('copyrighted_content')) out.push('Store facts/links and short excerpts rather than full copyrighted text.');
  if (r.triggered_flags.includes('tos_prohibits_scraping') || r.triggered_flags.includes('behind_login')) out.push('Seek permission or an official API/data license before scraping ToS-restricted or logged-in content.');
  out.push('Identify your crawler honestly (User-Agent + contact), rate-limit, and cache to reduce load.');
  return out;
}

const CHAIN_TO = [
  { api: 'robots-txt-parser', reason: 'Verify the real robots.txt disallow rules and crawl-delay for the target.' },
  { api: 'web-scrape-rate-limiter', reason: 'Once permitted, schedule a polite, compliant crawl rate.' },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Web Scrape Legal Risk Checker API', version: '1.0.0',
    description: 'Deterministic, defensive scrape compliance-risk rubric. You declare facts about a target (robots, login, ToS, PII, copyright, commercial use, access-control circumvention); it returns a 0–100 risk score, a legal-risk level, per-flag contributions, and responsible-scraping guidance. It does NOT bypass protections — circumvention is flagged "do not proceed". Not legal advice.',
    openapi_url: 'https://orbis-apis.onrender.com/web-scrape-legal-risk-checker/openapi.json',
    auth: { type: 'apiKey', header: 'X-API-Key' },
    endpoints: [
      { method: 'POST', path: '/assess', summary: 'Score scrape compliance risk from declared facts', price_usdc: 0.006 },
      { method: 'POST', path: '/lookup', summary: 'ONE-CALL risk + reasoning + compliance guidance', price_usdc: 0.012 },
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
    ...r.result, legal_disclaimer: LEGAL_DISCLAIMER,
    confidence_score: 0.7, confidence_per_section: { scoring: 1, legal_interpretation: 0.5 },
    recommended_actions_priority_order: actions(r.result), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

router.post('/lookup', (req: Request, res: Response) => {
  const t0 = Date.now();
  const r = assess(req.body);
  if ('error' in r) return fail(res, t0, 400, 'invalid_request', r.error);
  const v = r.result;
  respond(res, t0, {
    ...v, legal_disclaimer: LEGAL_DISCLAIMER,
    reasoning: {
      why_result_generated: `Summed ${v.triggered_flags.length} triggered flag weight(s) → ${v.risk_score}/100 (${v.legal_risk_level})${v.do_not_proceed ? '; circumvention forces severe' : ''}.`,
      key_factors: v.flags.filter((f) => f.present).map((f) => `${f.flag}: +${f.weight_applied}.`).slice(0, 6),
      invalidators: ['Score reflects only the facts you declared — a wrong/omitted flag changes it.', 'Legality varies by jurisdiction and case law; this rubric is not a legal determination.', 'Public availability does not equal permission to scrape, store, or republish.'],
    },
    confidence_score: 0.7, confidence_per_section: { scoring: 1, legal_interpretation: 0.5 },
    recommended_actions_priority_order: actions(v), chain_to: CHAIN_TO, privacy: PRIVACY, execution_metadata: EXECUTION_METADATA,
  });
});

export default router;
