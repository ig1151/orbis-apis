import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { analyzeExample, lookupExample } from './examples';

const BAND_ENUM = ['low', 'medium', 'high', 'severe'];
const VERDICT_ENUM = ['allow', 'review', 'block'];
const RISK_SOURCE_ENUM = ['sanctioned', 'flagged', 'supplied', 'category', 'default'];
const strArr = { type: 'array', items: { type: 'string' } };

const CounterpartyInput = {
  type: 'object', additionalProperties: false,
  description: 'One counterparty edge. Provide inflow/outflow USD and tx counts; optionally a risk_score (0-100), category, and flagged/sanctioned booleans.',
  properties: {
    label: { type: 'string', description: 'Human label (falls back to address).' },
    name: { type: 'string', description: 'Alias for label.' },
    address: { type: 'string', description: 'Counterparty address (echoed; not validated against the chain).' },
    category: { type: 'string', description: 'e.g. cex, defi, dex, bridge, mixer, eoa, contract, gambling, scam. Drives the default risk when no risk_score is supplied.' },
    inflow_usd: { type: 'number', minimum: 0, description: 'USD the subject received from this counterparty.' },
    outflow_usd: { type: 'number', minimum: 0, description: 'USD the subject sent to this counterparty.' },
    tx_count: { type: 'integer', minimum: 0 },
    risk_score: { type: 'number', minimum: 0, maximum: 100, description: 'Explicit counterparty risk, higher = riskier. Overrides the category default.' },
    flagged: { type: 'boolean', description: 'Flagged/blocklisted — forces risk to at least 90.' },
    blocklisted: { type: 'boolean', description: 'Alias for flagged.' },
    sanctioned: { type: 'boolean', description: 'Sanctioned — forces risk to 100 and hard-blocks the verdict.' },
  },
};

const AnalyzeRequest = {
  type: 'object', additionalProperties: false, required: ['counterparties'],
  properties: {
    subject: { type: 'string', description: 'Subject wallet address/label (echoed for labeling).' },
    address: { type: 'string', description: 'Alias for subject.' },
    counterparties: { type: 'array', minItems: 1, maxItems: 1000, items: { $ref: '#/components/schemas/CounterpartyInput' } },
  },
};

const CounterpartyRow = {
  type: 'object', additionalProperties: false,
  required: ['label', 'address', 'category', 'gross_volume_usd', 'inflow_usd', 'outflow_usd', 'net_flow_usd', 'tx_count', 'exposure_pct', 'risk_score', 'risk_source', 'flagged', 'sanctioned', 'weighted_risk_contribution', 'reasons'],
  properties: {
    label: { type: 'string' }, address: { type: ['string', 'null'] }, category: { type: 'string' },
    gross_volume_usd: { type: 'number' }, inflow_usd: { type: 'number' }, outflow_usd: { type: 'number' }, net_flow_usd: { type: 'number' },
    tx_count: { type: 'integer', minimum: 0 },
    exposure_pct: { type: 'number', minimum: 0, maximum: 100 },
    risk_score: { type: 'number', minimum: 0, maximum: 100 },
    risk_source: { type: 'string', enum: RISK_SOURCE_ENUM },
    flagged: { type: 'boolean' }, sanctioned: { type: 'boolean' },
    weighted_risk_contribution: { type: 'number' },
    reasons: strArr,
  },
};
const CategoryStat = {
  type: 'object', additionalProperties: false, required: ['category', 'gross_volume_usd', 'share_pct', 'counterparty_count'],
  properties: { category: { type: 'string' }, gross_volume_usd: { type: 'number' }, share_pct: { type: 'number', minimum: 0, maximum: 100 }, counterparty_count: { type: 'integer', minimum: 0 } },
};
const Concentration = {
  type: 'object', additionalProperties: false, required: ['hhi', 'band', 'top_counterparty_share_pct', 'top3_share_pct'],
  properties: { hhi: { type: 'number', minimum: 0, maximum: 1 }, band: { type: 'string', enum: ['low', 'moderate', 'high'] }, top_counterparty_share_pct: { type: 'number', minimum: 0, maximum: 100 }, top3_share_pct: { type: 'number', minimum: 0, maximum: 100 } },
};

const GraphCore = {
  type: 'object',
  required: ['subject', 'total_counterparties', 'total_gross_volume_usd', 'total_inflow_usd', 'total_outflow_usd', 'net_flow_usd', 'concentration', 'flagged_exposure_pct', 'sanctioned_exposure_pct', 'mixer_exposure_pct', 'category_breakdown', 'risk_weighted_exposure_score', 'exposure_band', 'verdict', 'hard_block', 'counterparties', 'top_counterparties', 'flagged_counterparties', 'risk_disclaimer'],
  properties: {
    subject: { type: ['string', 'null'] },
    total_counterparties: { type: 'integer', minimum: 0 },
    total_gross_volume_usd: { type: 'number' }, total_inflow_usd: { type: 'number' }, total_outflow_usd: { type: 'number' }, net_flow_usd: { type: 'number' },
    concentration: { $ref: '#/components/schemas/Concentration' },
    flagged_exposure_pct: { type: 'number', minimum: 0, maximum: 100 },
    sanctioned_exposure_pct: { type: 'number', minimum: 0, maximum: 100 },
    mixer_exposure_pct: { type: 'number', minimum: 0, maximum: 100 },
    category_breakdown: { type: 'array', items: { $ref: '#/components/schemas/CategoryStat' } },
    risk_weighted_exposure_score: { type: 'number', minimum: 0, maximum: 100 },
    exposure_band: { type: 'string', enum: BAND_ENUM }, verdict: { type: 'string', enum: VERDICT_ENUM }, hard_block: { type: 'boolean' },
    counterparties: { type: 'array', items: { $ref: '#/components/schemas/CounterpartyRow' } },
    top_counterparties: { type: 'array', items: { $ref: '#/components/schemas/CounterpartyRow' } },
    flagged_counterparties: { type: 'array', items: { $ref: '#/components/schemas/CounterpartyRow' } },
    risk_disclaimer: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('graph', 'interpretation'), _Tail: Tail,
  CounterpartyInput, AnalyzeRequest, CounterpartyRow, CategoryStat, Concentration, GraphCore, DiscoveryResponse: discoverySchema(),
  AnalyzeResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/GraphCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/GraphCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = {
  subject: '0xsubject',
  counterparties: [
    { label: 'Binance Hot Wallet', address: '0xbnb', category: 'cex', inflow_usd: 50000, outflow_usd: 20000, tx_count: 42 },
    { label: 'Uniswap Router', address: '0xuni', category: 'defi', inflow_usd: 12000, outflow_usd: 15000, tx_count: 30 },
    { label: 'Tornado Cash', address: '0xtc', category: 'mixer', inflow_usd: 0, outflow_usd: 8000, tx_count: 3 },
    { label: 'Suspicious EOA', address: '0xeoa', inflow_usd: 1000, outflow_usd: 500, tx_count: 5, flagged: true },
  ],
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/analyze', summary: 'Build the exposure graph and score counterparty risk', operationId: 'analyze', priceUsdc: 0.025,
    requestSchemaRef: 'AnalyzeRequest', responseSchemaRef: 'AnalyzeResponse', requestExample: REQ, responseExample: analyzeExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL analysis + reasoning + prioritized actions', operationId: 'lookup', priceUsdc: 0.04, oneCall: true,
    requestSchemaRef: 'AnalyzeRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ, responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'counterparty-exposure-graph', title: 'Counterparty Exposure Graph API', version: '1.0.0',
  description: 'Deterministic counterparty exposure graph. From a caller-supplied set of counterparties (inflow/outflow USD, tx counts, optional risk/category/flags) it computes volume-weighted counterparty risk, concentration (HHI), flagged/sanctioned/mixer exposure shares, a category breakdown, and a ranked top-counterparty list with an allow/review/block verdict. Analyzes the edges you supply — no chain fetch. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
