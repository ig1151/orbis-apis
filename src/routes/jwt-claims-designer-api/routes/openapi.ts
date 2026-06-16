import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema, CellValue } from '../../_aplus/specparts';
import { designExample, lookupExample } from './examples';

const TOKEN_ENUM = ['access', 'id', 'refresh'];
const SUBJECT_ENUM = ['user', 'service'];
const ALG_ENUM = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512'];

const RegisteredClaim = {
  type: 'object', required: ['claim', 'include', 'required', 'value_or_format', 'rationale'], additionalProperties: false,
  properties: {
    claim: { type: 'string' }, include: { type: 'boolean' }, required: { type: 'boolean' },
    value_or_format: { type: 'string' }, rationale: { type: 'string' },
  },
};
const CustomClaim = {
  type: 'object', required: ['claim', 'value_or_format', 'rationale'], additionalProperties: false,
  properties: { claim: { type: 'string' }, value_or_format: { type: 'string' }, rationale: { type: 'string' } },
};
const AlgorithmAdvice = {
  type: 'object', required: ['provided', 'recommended', 'avoid', 'note'], additionalProperties: false,
  properties: {
    provided: { type: ['string', 'null'] },
    recommended: { type: 'array', items: { type: 'string' } },
    avoid: { type: 'array', items: { type: 'string' } },
    note: { type: 'string' },
  },
};
const DesignCore = {
  type: 'object', required: ['token_type', 'subject_type', 'recommended_ttl_seconds', 'registered_claims', 'custom_claims', 'example_payload', 'algorithm', 'security_recommendations', 'anti_patterns'],
  properties: {
    token_type: { type: 'string', enum: TOKEN_ENUM },
    subject_type: { type: 'string', enum: SUBJECT_ENUM },
    recommended_ttl_seconds: { type: 'integer', minimum: 1 },
    registered_claims: { type: 'array', items: RegisteredClaim },
    custom_claims: { type: 'array', items: CustomClaim },
    example_payload: { type: 'object', additionalProperties: CellValue, description: 'A concrete example claims object with placeholder values.' },
    algorithm: AlgorithmAdvice,
    security_recommendations: { type: 'array', items: { type: 'string' } },
    anti_patterns: { type: 'array', items: { type: 'string' } },
  },
};
const DesignRequest = {
  type: 'object', required: ['token_type', 'issuer', 'audience'], additionalProperties: false,
  properties: {
    token_type: { type: 'string', enum: TOKEN_ENUM },
    issuer: { type: 'string', description: 'The "iss" value.' },
    audience: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], description: 'The "aud" value (string or array).' },
    subject_type: { type: 'string', enum: SUBJECT_ENUM, description: 'Whether the subject is a user or a service (default user).' },
    scopes: { type: 'array', items: { type: 'string' }, description: 'Scopes to embed (access tokens).' },
    ttl_seconds: { type: 'integer', minimum: 1, maximum: 31536000, description: 'Override the default TTL for this token type.' },
    algorithm: { type: 'string', enum: ALG_ENUM, description: 'Intended signing algorithm (triggers tailored advice).' },
  },
};

const designReq = {
  token_type: 'access', issuer: 'https://auth.example.com', audience: ['https://api.example.com'],
  subject_type: 'user', scopes: ['read:orders', 'write:orders'], ttl_seconds: 900, algorithm: 'HS256',
};

const disc = {
  name: 'JWT Claims Designer API', version: '1.0.0',
  description: 'Deterministic JWT claims designer. From a token profile (type/issuer/audience/scopes/TTL/alg) it generates a recommended registered + custom claim set, TTLs, an example payload, signing-algorithm advice, and security recommendations. Generates a design — does not decode or validate. No LLM, nothing stored.',
  openapi_url: 'https://orbis-apis.onrender.com/jwt-claims-designer/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/design', summary: 'Design a recommended JWT claim set', price_usdc: 0.008 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL design + reasoning', price_usdc: 0.014 },
  ],
  pricing: [
    { path: '/design', price_usdc: 0.008, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
  ],
  x402_compatible: true,
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('claims', 'recommendations'), _Tail: Tail,
  RegisteredClaim, CustomClaim, AlgorithmAdvice, DesignCore, DesignRequest, DiscoveryResponse: discoverySchema(),
  DesignResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DesignCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/DesignCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  { method: 'post', path: '/design', summary: 'Design a recommended JWT claim set', operationId: 'design', priceUsdc: 0.008, requestSchemaRef: 'DesignRequest', responseSchemaRef: 'DesignResponse', requestExample: designReq, responseExample: designExample },
  { method: 'post', path: '/lookup', summary: 'ONE-CALL design + reasoning', operationId: 'lookup', priceUsdc: 0.014, oneCall: true, requestSchemaRef: 'DesignRequest', responseSchemaRef: 'LookupResponse', requestExample: designReq, responseExample: lookupExample },
];

export const spec = buildAplusSpec({
  slug: 'jwt-claims-designer', title: 'JWT Claims Designer API', version: '1.0.0',
  description: 'Deterministic JWT claims designer — token profile → recommended registered+custom claims, TTLs, example payload, signing-alg advice, security recs. Generates a design (not decode/validate). No LLM.',
  endpoints, schemas, infoExtensions: { 'x-security-tool': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
