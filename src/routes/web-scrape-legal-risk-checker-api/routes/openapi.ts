import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const REGION_ENUM = ['EU', 'UK', 'US', 'other'];
const LEVEL_ENUM = ['low', 'moderate', 'high', 'severe'];
const FlagRow = { type: 'object', required: ['flag', 'present', 'weight_applied', 'note'], additionalProperties: false, properties: { flag: { type: 'string' }, present: { type: 'boolean' }, weight_applied: { type: 'number' }, note: { type: 'string' } } };
const RiskCore = {
  type: 'object', required: ['region', 'risk_score', 'legal_risk_level', 'do_not_proceed', 'flags', 'triggered_flags', 'robots_policy_note', 'legal_disclaimer'],
  properties: {
    region: { type: 'string', enum: REGION_ENUM }, risk_score: { type: 'number', minimum: 0, maximum: 100 },
    legal_risk_level: { type: 'string', enum: LEVEL_ENUM }, do_not_proceed: { type: 'boolean' },
    flags: { type: 'array', items: { $ref: '#/components/schemas/FlagRow' } },
    triggered_flags: { type: 'array', items: { type: 'string' } },
    robots_policy_note: { type: 'string' }, legal_disclaimer: { type: 'string' },
  },
};
const BOOL = { type: 'boolean' };
const AssessRequest = {
  type: 'object', additionalProperties: false,
  properties: {
    region: { type: 'string', enum: REGION_ENUM, default: 'other' },
    robots_disallows: BOOL, behind_login: BOOL, tos_prohibits_scraping: BOOL, personal_data: BOOL,
    special_category_data: BOOL, copyrighted_content: BOOL, commercial_use: BOOL, bypasses_access_controls: BOOL,
  },
  description: 'Declare the facts about the target; omitted flags are treated as false.',
};

const FLAGS = [
  { flag: 'robots_disallows', present: false, weight_applied: 0, note: 'robots.txt permits the target paths.' },
  { flag: 'behind_login', present: false, weight_applied: 0, note: 'Content is publicly reachable without login.' },
  { flag: 'tos_prohibits_scraping', present: false, weight_applied: 0, note: 'No explicit ToS prohibition declared.' },
  { flag: 'personal_data', present: true, weight_applied: 25, note: 'Collecting personal data triggers privacy law (GDPR/CCPA) — you need a lawful basis and retention limits.' },
  { flag: 'special_category_data', present: false, weight_applied: 0, note: 'No sensitive-category data.' },
  { flag: 'copyrighted_content', present: false, weight_applied: 0, note: 'No substantial copyrighted reproduction.' },
  { flag: 'commercial_use', present: true, weight_applied: 5, note: 'Commercial use raises the stakes on every other flag.' },
  { flag: 'bypasses_access_controls', present: false, weight_applied: 0, note: 'No access controls are being bypassed.' },
];
const DISC = 'Informational compliance rubric, not legal advice. Scraping legality depends on jurisdiction, the specific site, and how data is used — consult a qualified lawyer for any commercial or PII-bearing crawl.';
const CORE_EXAMPLE = { region: 'EU', risk_score: 30, legal_risk_level: 'moderate', do_not_proceed: false, flags: FLAGS, triggered_flags: ['personal_data', 'commercial_use'], robots_policy_note: 'Honor robots.txt and any Crawl-delay; re-check it before each run.', legal_disclaimer: DISC };
const ACTS = ['Legal-risk 30/100 (moderate). Honor robots.txt and any Crawl-delay; re-check it before each run.', 'Minimize and lawfully justify any personal data; set retention limits and honor deletion requests.', 'Identify your crawler honestly (User-Agent + contact), rate-limit, and cache to reduce load.'];
const TAIL = {
  confidence_score: 0.7, confidence_per_section: { scoring: 1, legal_interpretation: 0.5 }, recommended_actions_priority_order: ACTS,
  chain_to: [
    { api: 'robots-txt-parser', reason: 'Verify the real robots.txt disallow rules and crawl-delay for the target.' },
    { api: 'web-scrape-rate-limiter', reason: 'Once permitted, schedule a polite, compliant crawl rate.' },
  ],
  privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('scoring', 'legal_interpretation'), _Tail: Tail, FlagRow, RiskCore, AssessRequest,
  DiscoveryResponse: discoverySchema(),
  AssessResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RiskCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/RiskCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ_EXAMPLE = { region: 'EU', personal_data: true, commercial_use: true };
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/assess', summary: 'Score scrape compliance risk from declared facts', operationId: 'assess', priceUsdc: 0.006,
    requestSchemaRef: 'AssessRequest', responseSchemaRef: 'AssessResponse', requestExample: REQ_EXAMPLE,
    responseExample: { trace_id: 'wsl1-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL risk + reasoning + compliance guidance', operationId: 'lookup', priceUsdc: 0.012, oneCall: true,
    requestSchemaRef: 'AssessRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ_EXAMPLE,
    responseExample: {
      trace_id: 'wsl2-1780000000000', computed_at: '2026-06-11T12:00:00.000Z', success: true, latency_ms: 0, ...CORE_EXAMPLE,
      reasoning: { why_result_generated: 'Summed 2 triggered flag weight(s) → 30/100 (moderate).', key_factors: ['personal_data: +25.', 'commercial_use: +5.'], invalidators: ['Score reflects only the facts you declared — a wrong/omitted flag changes it.', 'Legality varies by jurisdiction and case law; this rubric is not a legal determination.', 'Public availability does not equal permission to scrape, store, or republish.'] },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'web-scrape-legal-risk-checker', title: 'Web Scrape Legal Risk Checker API', version: '1.0.0',
  description: 'Deterministic, defensive scrape compliance-risk rubric. You declare facts about a target (robots, login, ToS, PII, copyright, commercial use, access-control circumvention); it returns a 0–100 risk score, a legal-risk level, per-flag contributions, and responsible-scraping guidance. It does NOT bypass protections — circumvention is flagged "do not proceed". Not legal advice.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
