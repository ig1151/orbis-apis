import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { verdictExample, lookupExample } from './examples';

const VERDICT_ENUM = ['allow', 'review', 'block'];
const strArr = { type: 'array', items: { type: 'string' } };

const VerdictRequest = {
  type: 'object', additionalProperties: false, required: ['address'],
  properties: {
    address: { type: 'string', description: 'Wallet address: EVM (0x + 40 hex), Solana (base58), or Bitcoin. Chain is inferred from the format if "chain" is omitted.' },
    chain: { type: 'string', description: 'Optional chain hint, e.g. ethereum, bsc, polygon, arbitrum, optimism, base, avalanche, solana, bitcoin. Inferred from the address when omitted.' },
  },
};

const Sanctions = {
  type: ['object', 'null'], additionalProperties: false,
  properties: {
    checked: { type: 'boolean' }, listed: { type: 'boolean' },
    source: { type: 'string' }, list_size: { type: ['integer', 'null'] }, detail: { type: 'string' },
  },
};
const Onchain = {
  type: ['object', 'null'], additionalProperties: false,
  properties: {
    checked: { type: 'boolean' },
    exists: { type: ['boolean', 'null'] },
    is_contract: { type: ['boolean', 'null'], description: 'Contract-vs-EOA flag. Populated where the provider exposes it (e.g. Solana); may be null on EVM, where the heuristic relies on balance/age/history rather than an extra getCode call.' },
    native_balance: { type: ['number', 'null'] }, native_symbol: { type: ['string', 'null'] },
    tx_count: { type: ['integer', 'null'], description: 'Recent transaction/signature count where the provider returns it (e.g. Solana recent signatures); may be null on EVM, where account age + balance + history drive the heuristic instead of a separate txlist call.' },
    age_days: { type: ['integer', 'null'] },
    risk_score: { type: ['number', 'null'] }, flags: { type: 'array', items: { type: 'string' } },
    provider: { type: 'string' }, detail: { type: 'string' },
  },
};

const SourceFetch = {
  type: 'object', additionalProperties: false, required: ['source', 'status', 'latency_ms', 'detail'],
  properties: {
    source: { type: 'string' },
    status: { type: 'string', enum: ['ok', 'failed', 'timeout'] },
    latency_ms: { type: 'integer', minimum: 0 },
    detail: { type: 'string' },
  },
};
const Unavailable = {
  type: 'object', additionalProperties: false, required: ['source', 'status', 'detail'],
  properties: { source: { type: 'string' }, status: { type: 'string' }, detail: { type: 'string' } },
};
const Contribution = {
  type: 'object', additionalProperties: false, required: ['source', 'risk', 'weight', 'weighted', 'note'],
  properties: { source: { type: 'string' }, risk: { type: 'number' }, weight: { type: 'number' }, weighted: { type: 'number' }, note: { type: 'string' } },
};
const Fetched = {
  type: 'object', additionalProperties: false, required: ['sanctions', 'onchain', 'address_risk', 'reputation', 'balance'],
  properties: {
    sanctions: { $ref: '#/components/schemas/Sanctions' },
    onchain: { $ref: '#/components/schemas/Onchain' },
    address_risk: {
      type: ['object', 'null'], additionalProperties: false,
      properties: { risk_score: { type: 'number' }, risk_level: { type: ['string', 'null'] }, is_sanctioned: { type: 'boolean' }, is_mixer: { type: 'boolean' }, illicit_exposure_pct: { type: ['number', 'null'] } },
    },
    reputation: {
      type: ['object', 'null'], additionalProperties: false,
      properties: { score: { type: 'number' }, rating: { type: ['string', 'null'] } },
    },
    balance: {
      type: ['object', 'null'], additionalProperties: false,
      properties: { native_balance_usd: { type: ['number', 'null'] }, native_symbol: { type: ['string', 'null'] }, last_activity: { type: ['string', 'null'] } },
    },
  },
};

const VerdictCore = {
  type: 'object',
  required: ['address', 'chain', 'chain_family', 'composite_risk_score', 'trust_tier', 'verdict', 'hard_block', 'is_sanctioned', 'sources_used', 'unavailable_sources', 'source_fetches', 'fetched', 'contributions', 'data_unavailable', 'risk_disclaimer'],
  properties: {
    address: { type: 'string' }, chain: { type: 'string' },
    chain_family: { type: 'string', enum: ['evm', 'solana', 'bitcoin'] },
    composite_risk_score: { type: ['number', 'null'], minimum: 0, maximum: 100 },
    trust_tier: { type: 'string', description: 'trusted | neutral | caution | high_risk | unknown' },
    verdict: { type: 'string', enum: VERDICT_ENUM },
    hard_block: { type: 'boolean' },
    is_sanctioned: { type: 'boolean', description: 'Real OFAC SDN list match (authoritative). Forces a hard block when true.' },
    sources_used: strArr,
    unavailable_sources: { type: 'array', items: { $ref: '#/components/schemas/Unavailable' } },
    source_fetches: { type: 'array', items: { $ref: '#/components/schemas/SourceFetch' } },
    fetched: { $ref: '#/components/schemas/Fetched' },
    contributions: { type: 'array', items: { $ref: '#/components/schemas/Contribution' } },
    data_unavailable: { type: 'boolean' },
    risk_disclaimer: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('fetch', 'sanctions', 'fusion', 'interpretation'), _Tail: Tail,
  VerdictRequest, Sanctions, Onchain, SourceFetch, Unavailable, Contribution, Fetched, VerdictCore, DiscoveryResponse: discoverySchema(),
  VerdictResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/VerdictCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/VerdictCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chain: 'ethereum' };

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/verdict', summary: 'Fetch live wallet signals and fuse into one verdict', operationId: 'verdict', priceUsdc: 0.06,
    requestSchemaRef: 'VerdictRequest', responseSchemaRef: 'VerdictResponse', requestExample: REQ, responseExample: verdictExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL verdict + reasoning + prioritized actions', operationId: 'lookup', priceUsdc: 0.10, oneCall: true,
    requestSchemaRef: 'VerdictRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ, responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'wallet-verdict', title: 'Wallet Verdict API', version: '1.1.0',
  description: 'Orchestrated one-call wallet risk verdict grounded in REAL data. Give it an address (EVM incl. BNB Chain, Solana, or Bitcoin); it checks the live OFAC SDN sanctions list and fetches on-chain heuristics (balance / tx count / contract / age), plus AML-risk + reputation + balance for EVM, all in parallel, and fuses them into one composite risk score, trust tier, and allow/review/block verdict. `is_sanctioned` is a real OFAC fact, not an LLM guess. Returns partial results if a source is slow or down, and is always HTTP 200 so agent loops never hang.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
