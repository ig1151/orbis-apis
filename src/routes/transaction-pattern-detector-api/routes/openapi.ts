import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { detectExample, lookupExample } from './examples';

const BAND_ENUM = ['low', 'medium', 'high', 'severe'];
const VERDICT_ENUM = ['allow', 'review', 'block'];
const strArr = { type: 'array', items: { type: 'string' } };
const intArr = { type: 'array', items: { type: 'integer', minimum: 0 } };

const TxInput = {
  type: 'object', additionalProperties: false,
  description: 'One transaction. value_usd and direction drive the analysis; timestamp enables the time-based patterns; counterparty enables round-tripping.',
  properties: {
    value_usd: { type: 'number', minimum: 0, description: 'USD value moved.' },
    amount_usd: { type: 'number', minimum: 0, description: 'Alias for value_usd.' },
    value: { type: 'number', minimum: 0, description: 'Alias for value_usd.' },
    direction: { type: 'string', description: 'in/inbound/received or out/outbound/sent.' },
    timestamp: { type: ['string', 'number'], description: 'ISO 8601 string, or epoch seconds/milliseconds.' },
    time: { type: ['string', 'number'], description: 'Alias for timestamp.' },
    counterparty: { type: 'string', description: 'Counterparty label or address (enables round-tripping detection).' },
    counterparty_address: { type: 'string', description: 'Alias for counterparty.' },
    counterparty_flagged: { type: 'boolean', description: 'Counterparty is flagged/blocklisted.' },
    counterparty_sanctioned: { type: 'boolean', description: 'Counterparty is sanctioned — forces a hard block.' },
  },
};

const DetectRequest = {
  type: 'object', additionalProperties: false, required: ['transactions'],
  properties: {
    wallet: { type: 'string', description: 'Subject wallet address/label (echoed for labeling).' },
    address: { type: 'string', description: 'Alias for wallet.' },
    transactions: { type: 'array', minItems: 1, maxItems: 5000, items: { $ref: '#/components/schemas/TxInput' } },
    structuring_threshold_usd: { type: 'number', minimum: 0, description: 'Reporting threshold for structuring detection (default 10000).' },
    layering_window_minutes: { type: 'integer', minimum: 1, description: 'Window for pass-through/layering detection (default 60).' },
  },
};

const PatternResult = {
  type: 'object', additionalProperties: false,
  required: ['detected', 'severity', 'band', 'count', 'detail', 'evidence_tx_indices'],
  properties: {
    detected: { type: 'boolean' },
    severity: { type: 'number', minimum: 0, maximum: 100 },
    band: { type: 'string', enum: BAND_ENUM },
    count: { type: 'number', description: 'Pattern-specific count (e.g. near-threshold tx count, peak tx/hour, round-trip pairs, or max/median ratio).' },
    detail: { type: 'string' },
    evidence_tx_indices: intArr,
  },
};

const Patterns = {
  type: 'object', additionalProperties: false,
  required: ['structuring', 'layering', 'high_velocity', 'round_tripping', 'amount_anomaly'],
  properties: {
    structuring: { $ref: '#/components/schemas/PatternResult' },
    layering: { $ref: '#/components/schemas/PatternResult' },
    high_velocity: { $ref: '#/components/schemas/PatternResult' },
    round_tripping: { $ref: '#/components/schemas/PatternResult' },
    amount_anomaly: { $ref: '#/components/schemas/PatternResult' },
  },
};

const DetectCore = {
  type: 'object',
  required: ['wallet', 'transaction_count', 'scored_transaction_count', 'time_ordered', 'total_volume_usd', 'inflow_usd', 'outflow_usd', 'structuring_threshold_usd', 'layering_window_minutes', 'patterns', 'patterns_detected', 'aml_pattern_score', 'pattern_band', 'verdict', 'hard_block', 'flagged_counterparty_count', 'sanctioned_counterparty_involved', 'reasons', 'risk_disclaimer'],
  properties: {
    wallet: { type: ['string', 'null'] },
    transaction_count: { type: 'integer', minimum: 0 },
    scored_transaction_count: { type: 'integer', minimum: 0 },
    time_ordered: { type: 'boolean' },
    total_volume_usd: { type: 'number' }, inflow_usd: { type: 'number' }, outflow_usd: { type: 'number' },
    structuring_threshold_usd: { type: 'number' }, layering_window_minutes: { type: 'integer' },
    patterns: { $ref: '#/components/schemas/Patterns' },
    patterns_detected: strArr,
    aml_pattern_score: { type: 'number', minimum: 0, maximum: 100 },
    pattern_band: { type: 'string', enum: BAND_ENUM },
    verdict: { type: 'string', enum: VERDICT_ENUM }, hard_block: { type: 'boolean' },
    flagged_counterparty_count: { type: 'integer', minimum: 0 },
    sanctioned_counterparty_involved: { type: 'boolean' },
    reasons: strArr,
    risk_disclaimer: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('detection', 'interpretation'), _Tail: Tail,
  TxInput, DetectRequest, PatternResult, Patterns, DetectCore, DiscoveryResponse: discoverySchema(),
  DetectResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DetectCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DetectCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = {
  wallet: '0xsubject',
  structuring_threshold_usd: 10000,
  transactions: [
    { value_usd: 9500, direction: 'in', timestamp: '2026-06-01T10:00:00Z', counterparty: '0xsource' },
    { value_usd: 9200, direction: 'in', timestamp: '2026-06-01T10:05:00Z', counterparty: '0xsource' },
    { value_usd: 9800, direction: 'in', timestamp: '2026-06-01T10:09:00Z', counterparty: '0xsource' },
    { value_usd: 28000, direction: 'out', timestamp: '2026-06-01T10:30:00Z', counterparty: '0xdest' },
    { value_usd: 250, direction: 'out', timestamp: '2026-06-01T11:00:00Z', counterparty: '0xmisc' },
  ],
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/detect', summary: 'Detect AML patterns over a transaction sequence', operationId: 'detect', priceUsdc: 0.025,
    requestSchemaRef: 'DetectRequest', responseSchemaRef: 'DetectResponse', requestExample: REQ, responseExample: detectExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL detection + reasoning + prioritized actions', operationId: 'lookup', priceUsdc: 0.04, oneCall: true,
    requestSchemaRef: 'DetectRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ, responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'transaction-pattern-detector', title: 'Transaction Pattern Detector API', version: '1.0.0',
  description: 'Deterministic AML transaction-pattern detector. From a caller-supplied, time-ordered transaction sequence it flags structuring, layering / rapid pass-through, high-velocity bursts, round-tripping, and amount anomalies, returning per-pattern evidence, an aml_pattern_score (0-100), and an allow/review/block verdict. Analyzes the transactions you supply — no chain fetch. No LLM, nothing stored.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
