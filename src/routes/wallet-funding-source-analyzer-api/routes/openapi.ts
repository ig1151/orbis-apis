import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { analyzeExample, lookupExample } from './examples';

const BAND_ENUM = ['low', 'medium', 'high', 'severe'];
const VERDICT_ENUM = ['allow', 'review', 'block'];
const RISK_SOURCE_ENUM = ['sanctioned', 'flagged', 'supplied', 'category', 'default'];
const KYC_ENUM = ['none', 'basic', 'full', 'unknown'];
const strArr = { type: 'array', items: { type: 'string' } };

const SourceInput = {
  type: 'object', additionalProperties: false,
  description: 'One funding source. amount_usd drives the weighting; category/kyc_level/risk_score drive the risk; flagged/sanctioned override upward.',
  properties: {
    label: { type: 'string', description: 'Human label (falls back to address).' },
    name: { type: 'string', description: 'Alias for label.' },
    address: { type: 'string', description: 'Source address (echoed; not validated against the chain).' },
    source: { type: 'string', description: 'Alias for label.' },
    category: { type: 'string', description: 'e.g. cex, fiat_onramp, defi, dex, bridge, p2p, otc, mixer, airdrop, unknown. Drives the default risk.' },
    amount_usd: { type: 'number', minimum: 0, description: 'USD received from this source.' },
    value_usd: { type: 'number', minimum: 0, description: 'Alias for amount_usd.' },
    kyc_level: { type: 'string', enum: ['none', 'basic', 'full'], description: 'KYC level of the source. full discounts risk; none nudges it up.' },
    kyc: { type: 'string', description: 'Alias for kyc_level.' },
    risk_score: { type: 'number', minimum: 0, maximum: 100, description: 'Explicit source risk, higher = riskier. Overrides the category default.' },
    flagged: { type: 'boolean', description: 'Flagged/blocklisted — forces risk to at least 90.' },
    blocklisted: { type: 'boolean', description: 'Alias for flagged.' },
    sanctioned: { type: 'boolean', description: 'Sanctioned — forces risk to 100 and hard-blocks the verdict.' },
  },
};

const AnalyzeRequest = {
  type: 'object', additionalProperties: false, required: ['sources'],
  properties: {
    wallet: { type: 'string', description: 'Subject wallet address/label (echoed for labeling).' },
    address: { type: 'string', description: 'Alias for wallet.' },
    sources: { type: 'array', minItems: 1, maxItems: 1000, items: { $ref: '#/components/schemas/SourceInput' } },
  },
};

const SourceRow = {
  type: 'object', additionalProperties: false,
  required: ['label', 'address', 'category', 'amount_usd', 'funding_share_pct', 'kyc_level', 'risk_score', 'risk_source', 'kyc_adjusted', 'flagged', 'sanctioned', 'weighted_risk_contribution', 'reasons'],
  properties: {
    label: { type: 'string' }, address: { type: ['string', 'null'] }, category: { type: 'string' },
    amount_usd: { type: 'number' }, funding_share_pct: { type: 'number', minimum: 0, maximum: 100 },
    kyc_level: { type: 'string', enum: KYC_ENUM },
    risk_score: { type: 'number', minimum: 0, maximum: 100 },
    risk_source: { type: 'string', enum: RISK_SOURCE_ENUM },
    kyc_adjusted: { type: 'boolean' }, flagged: { type: 'boolean' }, sanctioned: { type: 'boolean' },
    weighted_risk_contribution: { type: 'number' },
    reasons: strArr,
  },
};
const CategoryStat = {
  type: 'object', additionalProperties: false, required: ['category', 'amount_usd', 'share_pct', 'source_count'],
  properties: { category: { type: 'string' }, amount_usd: { type: 'number' }, share_pct: { type: 'number', minimum: 0, maximum: 100 }, source_count: { type: 'integer', minimum: 0 } },
};
const Concentration = {
  type: 'object', additionalProperties: false, required: ['hhi', 'band', 'top_source_share_pct', 'top3_share_pct'],
  properties: { hhi: { type: 'number', minimum: 0, maximum: 1 }, band: { type: 'string', enum: ['low', 'moderate', 'high'] }, top_source_share_pct: { type: 'number', minimum: 0, maximum: 100 }, top3_share_pct: { type: 'number', minimum: 0, maximum: 100 } },
};

const FundingCore = {
  type: 'object',
  required: ['wallet', 'source_count', 'funded_total_usd', 'funding_risk_score', 'funding_risk_band', 'kyc_coverage_pct', 'full_kyc_pct', 'unknown_source_pct', 'mixer_funding_pct', 'flagged_funding_pct', 'sanctioned_funding_pct', 'concentration', 'category_breakdown', 'verdict', 'hard_block', 'sources', 'top_sources', 'high_risk_sources', 'risk_disclaimer'],
  properties: {
    wallet: { type: ['string', 'null'] },
    source_count: { type: 'integer', minimum: 0 }, funded_total_usd: { type: 'number' },
    funding_risk_score: { type: 'number', minimum: 0, maximum: 100 }, funding_risk_band: { type: 'string', enum: BAND_ENUM },
    kyc_coverage_pct: { type: 'number', minimum: 0, maximum: 100 }, full_kyc_pct: { type: 'number', minimum: 0, maximum: 100 },
    unknown_source_pct: { type: 'number', minimum: 0, maximum: 100 },
    mixer_funding_pct: { type: 'number', minimum: 0, maximum: 100 },
    flagged_funding_pct: { type: 'number', minimum: 0, maximum: 100 },
    sanctioned_funding_pct: { type: 'number', minimum: 0, maximum: 100 },
    concentration: { $ref: '#/components/schemas/Concentration' },
    category_breakdown: { type: 'array', items: { $ref: '#/components/schemas/CategoryStat' } },
    verdict: { type: 'string', enum: VERDICT_ENUM }, hard_block: { type: 'boolean' },
    sources: { type: 'array', items: { $ref: '#/components/schemas/SourceRow' } },
    top_sources: { type: 'array', items: { $ref: '#/components/schemas/SourceRow' } },
    high_risk_sources: { type: 'array', items: { $ref: '#/components/schemas/SourceRow' } },
    risk_disclaimer: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('provenance', 'interpretation'), _Tail: Tail,
  SourceInput, AnalyzeRequest, SourceRow, CategoryStat, Concentration, FundingCore, DiscoveryResponse: discoverySchema(),
  AnalyzeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/FundingCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/FundingCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = {
  wallet: '0xsubject',
  sources: [
    { label: 'Coinbase', address: '0xcb', category: 'cex', amount_usd: 60000, kyc_level: 'full' },
    { label: 'Uniswap', address: '0xuni', category: 'dex', amount_usd: 18000 },
    { label: 'Tornado Cash', address: '0xtc', category: 'mixer', amount_usd: 9000 },
    { label: 'Unknown EOA', address: '0xeoa', amount_usd: 4000, kyc_level: 'none' },
  ],
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/analyze', summary: 'Score the provenance of supplied funding sources', operationId: 'analyze', priceUsdc: 0.025,
    requestSchemaRef: 'AnalyzeRequest', responseSchemaRef: 'AnalyzeResponse', requestExample: REQ, responseExample: analyzeExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL analysis + reasoning + prioritized actions', operationId: 'lookup', priceUsdc: 0.04, oneCall: true,
    requestSchemaRef: 'AnalyzeRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ, responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'wallet-funding-source-analyzer', title: 'Wallet Funding Source Analyzer API', version: '1.0.0',
  description: 'Deterministic wallet funding-source analyzer. From a caller-supplied set of inflow sources (USD amounts, optional category/KYC level/flags) it scores provenance: value-weighted funding risk, KYC coverage, unknown/mixer/flagged/sanctioned funding shares, source concentration (HHI), a category breakdown, and an allow/review/block verdict. Analyzes the sources you supply — no chain fetch. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
