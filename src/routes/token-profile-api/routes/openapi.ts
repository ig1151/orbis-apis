import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';
import { intelExample, lookupExample } from './examples';

const VERDICT_ENUM = ['allow', 'review', 'caution'];
const strArr = { type: 'array', items: { type: 'string' } };
const numNull = { type: ['number', 'null'] };
const intNull = { type: ['integer', 'null'] };
const boolNull = { type: ['boolean', 'null'] };
const strNull = { type: ['string', 'null'] };

const TokenRequest = {
  type: 'object', additionalProperties: false, required: ['address'],
  properties: {
    address: { type: 'string', description: 'Token contract/mint address: EVM (0x + 40 hex) or Solana (base58 mint). Chain is inferred from the format if "chain" is omitted.' },
    chain: { type: 'string', description: 'Optional chain hint, e.g. ethereum, bsc, polygon, arbitrum, optimism, base, avalanche, fantom, solana. Inferred from the address when omitted (defaults EVM 0x → ethereum).' },
  },
};

const TopPair = {
  type: ['object', 'null'], additionalProperties: false,
  properties: { dex: strNull, pair_url: strNull, liquidity_usd: numNull, volume_24h_usd: numNull, price_usd: numNull },
};
const Identity = {
  type: 'object', additionalProperties: false,
  required: ['name', 'symbol', 'categories', 'market_cap_rank', 'coingecko_id', 'coingecko_listed', 'explorer_url', 'homepage', 'twitter'],
  properties: { name: strNull, symbol: strNull, categories: strArr, market_cap_rank: intNull, coingecko_id: strNull, coingecko_listed: { type: 'boolean' }, explorer_url: { type: 'string' }, homepage: strNull, twitter: strNull },
};
const Market = {
  type: 'object', additionalProperties: false,
  required: ['price_usd', 'market_cap_usd', 'fdv_usd', 'volume_24h_usd', 'ath_usd', 'ath_change_pct', 'price_change_24h_pct', 'dex_price_usd', 'price_deviation_pct'],
  properties: { price_usd: numNull, market_cap_usd: numNull, fdv_usd: numNull, volume_24h_usd: numNull, ath_usd: numNull, ath_change_pct: numNull, price_change_24h_pct: numNull, dex_price_usd: numNull, price_deviation_pct: numNull },
};
const Supply = {
  type: 'object', additionalProperties: false,
  required: ['circulating', 'total', 'max', 'circulating_pct', 'fdv_mc_ratio', 'onchain_total', 'decimals'],
  properties: { circulating: numNull, total: numNull, max: numNull, circulating_pct: numNull, fdv_mc_ratio: numNull, onchain_total: numNull, decimals: intNull },
};
const Liquidity = {
  type: 'object', additionalProperties: false,
  required: ['total_dex_liquidity_usd', 'pairs_found', 'top_pair', 'liquidity_to_mcap_ratio', 'oldest_pair_age_days'],
  properties: { total_dex_liquidity_usd: numNull, pairs_found: { type: 'integer', minimum: 0 }, top_pair: { $ref: '#/components/schemas/TopPair' }, liquidity_to_mcap_ratio: numNull, oldest_pair_age_days: intNull },
};
const Contract = {
  type: 'object', additionalProperties: false,
  required: ['verified_source', 'is_proxy', 'contract_name', 'compiler', 'deployer', 'mint_authority_renounced', 'freeze_authority_none'],
  properties: {
    verified_source: { ...boolNull, description: 'EVM: whether the contract source is verified on the explorer. Null on Solana (N/A).' },
    is_proxy: boolNull, contract_name: strNull, compiler: strNull, deployer: strNull,
    mint_authority_renounced: { ...boolNull, description: 'Solana: whether the SPL mint authority is renounced (cannot mint more). Null on EVM (N/A).' },
    freeze_authority_none: { ...boolNull, description: 'Solana: whether the SPL freeze authority is unset. Null on EVM (N/A).' },
  },
};
const Holders = {
  type: 'object', additionalProperties: false, required: ['available', 'holder_count', 'source'],
  properties: { available: { type: 'boolean', description: 'False where no real indexed holder source exists (e.g. EVM without a paid explorer tier) — holder_count is then null, NEVER fabricated.' }, holder_count: intNull, source: strNull },
};
const SourceFetch = {
  type: 'object', additionalProperties: false, required: ['source', 'status', 'latency_ms', 'detail'],
  properties: { source: { type: 'string' }, status: { type: 'string', enum: ['ok', 'failed', 'timeout'] }, latency_ms: { type: 'integer', minimum: 0 }, detail: { type: 'string' } },
};
const Unavailable = {
  type: 'object', additionalProperties: false, required: ['source', 'status', 'detail'],
  properties: { source: { type: 'string' }, status: { type: 'string' }, detail: { type: 'string' } },
};
const Reasoning = {
  type: 'object', additionalProperties: false, required: ['why_result_generated', 'key_factors', 'invalidators'],
  properties: { why_result_generated: { type: 'string' }, key_factors: strArr, invalidators: strArr },
};

const ProfileCore = {
  type: 'object',
  required: ['address', 'chain', 'chain_family', 'identity', 'market', 'supply', 'liquidity', 'contract', 'holders', 'flags', 'trust_score', 'trust_tier', 'verdict', 'sources_used', 'unavailable_sources', 'source_fetches', 'data_unavailable', 'risk_disclaimer'],
  properties: {
    address: { type: 'string' }, chain: { type: 'string' }, chain_family: { type: 'string', enum: ['evm', 'solana'] },
    identity: { $ref: '#/components/schemas/Identity' },
    market: { $ref: '#/components/schemas/Market' },
    supply: { $ref: '#/components/schemas/Supply' },
    liquidity: { $ref: '#/components/schemas/Liquidity' },
    contract: { $ref: '#/components/schemas/Contract' },
    holders: { $ref: '#/components/schemas/Holders' },
    flags: strArr,
    trust_score: { ...numNull, minimum: 0, maximum: 100 },
    trust_tier: { type: 'string', description: 'trusted | neutral | caution | high_risk | unknown' },
    verdict: { type: 'string', enum: VERDICT_ENUM },
    sources_used: strArr,
    unavailable_sources: { type: 'array', items: { $ref: '#/components/schemas/Unavailable' } },
    source_fetches: { type: 'array', items: { $ref: '#/components/schemas/SourceFetch' } },
    data_unavailable: { type: 'boolean' },
    risk_disclaimer: { type: 'string' },
  },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('fetch', 'market', 'contract', 'fusion', 'interpretation'), _Tail: Tail,
  TokenRequest, TopPair, Identity, Market, Supply, Liquidity, Contract, Holders, SourceFetch, Unavailable, Reasoning, ProfileCore, DiscoveryResponse: discoverySchema(),
  ProfileResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ProfileCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/ProfileCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const REQ = { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chain: 'ethereum' };

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse' },
  {
    method: 'post', path: '/intel', summary: 'Fetch live token signals and fuse into one profile + trust verdict', operationId: 'intel', priceUsdc: 0.05,
    requestSchemaRef: 'TokenRequest', responseSchemaRef: 'ProfileResponse', requestExample: REQ, responseExample: intelExample,
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL profile + reasoning + prioritized actions', operationId: 'lookup', priceUsdc: 0.09, oneCall: true,
    requestSchemaRef: 'TokenRequest', responseSchemaRef: 'LookupResponse', requestExample: REQ, responseExample: lookupExample,
  },
];

export const spec = buildAplusSpec({
  slug: 'token-profile', title: 'Token Profile API', version: '1.0.0',
  description: 'Orchestrated one-call token intelligence grounded in REAL data. Give it a token contract (EVM incl. BNB Chain, or Solana); it fetches identity/market/supply from CoinGecko, DEX liquidity/price/age from DexScreener, and contract verification/supply/authority from the chain explorer (Etherscan V2 / Solana RPC), all in parallel, and fuses them into one dossier plus a deterministic trust score, tier, and allow/review/caution verdict. No LLM fabrication; holder concentration is shown only where a real source exists. Always HTTP 200 with partial results.',
  endpoints, schemas, infoExtensions: { 'x-human-approval-required': false },
});

export default specRouter(spec);
