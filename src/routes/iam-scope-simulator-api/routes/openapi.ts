import { buildAplusSpec, specRouter, AplusEndpoint } from '../../_aplus/scaffold';
import { EnvelopeOk, ExecutionMetadata, confSections, Tail, discoverySchema } from '../../_aplus/specparts';

const DecidingStatement = {
  type: ['object', 'null'], required: ['index', 'sid', 'effect'], additionalProperties: false,
  properties: { index: { type: 'integer' }, sid: { type: ['string', 'null'] }, effect: { type: 'string', enum: ['Allow', 'Deny'] } },
};
const Evaluated = {
  type: 'object',
  required: ['action', 'resource', 'decision', 'allowed', 'matched_allow', 'matched_deny', 'deciding_statement', 'reason'],
  additionalProperties: false,
  properties: {
    action: { type: 'string' }, resource: { type: 'string' },
    decision: { type: 'string', enum: ['Allow', 'Deny', 'ImplicitDeny'] }, allowed: { type: 'boolean' },
    matched_allow: { type: 'array', items: { type: 'integer' } }, matched_deny: { type: 'array', items: { type: 'integer' } },
    deciding_statement: DecidingStatement, reason: { type: 'string' },
  },
};
const SimCore = {
  type: 'object',
  required: ['evaluated', 'request_count', 'allow_count', 'deny_count', 'statement_count'],
  properties: {
    evaluated: { type: 'array', items: Evaluated },
    request_count: { type: 'integer', minimum: 0 }, allow_count: { type: 'integer', minimum: 0 },
    deny_count: { type: 'integer', minimum: 0 }, statement_count: { type: 'integer', minimum: 0 },
  },
};
const StatementIn = {
  type: 'object', required: ['effect', 'actions', 'resources'], additionalProperties: false,
  properties: {
    effect: { type: 'string', enum: ['Allow', 'Deny'] },
    actions: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
    resources: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
    sid: { type: 'string' },
  },
};
const RequestIn = { type: 'object', required: ['action', 'resource'], additionalProperties: false, properties: { action: { type: 'string' }, resource: { type: 'string' } } };
const SimulateRequest = {
  type: 'object', required: ['policies'], additionalProperties: false,
  properties: {
    policies: { type: 'array', items: StatementIn, minItems: 1 },
    request: RequestIn,
    requests: { type: 'array', items: RequestIn },
  },
};

const CORE = {
  evaluated: [{ action: 's3:GetObject', resource: 'arn:aws:s3:::bucket/file.txt', decision: 'Allow', allowed: true, matched_allow: [0], matched_deny: [], deciding_statement: { index: 0, sid: 'AllowS3', effect: 'Allow' }, reason: 'Allowed by statement AllowS3 with no matching Deny.' }],
  request_count: 1, allow_count: 1, deny_count: 0, statement_count: 2,
};
const CHAIN = [
  { api: 'oauth-scope-diff', reason: 'Compare the OAuth scopes a token carries against what these actions require.' },
  { api: 'jwt-claim-policy-validator', reason: 'Validate the identity claims of the principal making the request.' },
];
const INVALIDATORS = [
  'This models Effect/Action/Resource with * and ? globs only — it does NOT evaluate Conditions, NotAction/NotResource, Principals, permission boundaries, SCPs, or session policies, all of which can change the real decision.',
  'Action matching is case-insensitive and resource matching is case-sensitive glob; provider-specific ARN semantics (e.g. path-aware matching) are not modeled.',
  'A simulated Allow is necessary but not sufficient — the live authorizer may deny via mechanisms outside the supplied statements.',
];
const TAIL = {
  confidence_score: 0.9, confidence_per_section: { evaluation: 1 },
  recommended_actions_priority_order: [
    'Decision: Allow for s3:GetObject on arn:aws:s3:::bucket/file.txt. Allowed by statement AllowS3 with no matching Deny.',
    'Confirm no Conditions or boundary policies further restrict this at runtime.',
    'Re-simulate after any policy edit; least-privilege beats broad wildcards.',
  ],
  chain_to: CHAIN, privacy: { data_stored: false, retention: 'none' }, execution_metadata: { model: 'deterministic', automation_safe: true },
};

const schemas = {
  EnvelopeOk, ExecutionMetadata, ConfidencePerSection: confSections('evaluation'), _Tail: Tail,
  DecidingStatement, Evaluated, SimCore, StatementIn, RequestIn, SimulateRequest, DiscoveryResponse: discoverySchema(),
  SimulateResponse: { allOf: [{ $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SimCore' }, { $ref: '#/components/schemas/_Tail' }], unevaluatedProperties: false },
  LookupResponse: {
    allOf: [
      { $ref: '#/components/schemas/EnvelopeOk' }, { $ref: '#/components/schemas/SimCore' },
      { type: 'object', required: ['reasoning'], properties: { reasoning: { $ref: '#/components/schemas/Reasoning' } } },
      { $ref: '#/components/schemas/_Tail' },
    ], unevaluatedProperties: false,
  },
};

const env = { trace_id: 'iam-1780000000000', request_id: 'iam-1780000000000', computed_at: '2026-06-12T12:00:00.000Z', success: true, latency_ms: 0 };
const reqEx = {
  policies: [
    { effect: 'Allow', actions: ['s3:*'], resources: ['arn:aws:s3:::bucket/*'], sid: 'AllowS3' },
    { effect: 'Deny', actions: ['s3:DeleteObject'], resources: ['*'], sid: 'DenyDelete' },
  ],
  request: { action: 's3:GetObject', resource: 'arn:aws:s3:::bucket/file.txt' },
};
const disc = {
  name: 'IAM Scope Simulator API', version: '1.0.0',
  description: 'Deterministic IAM-style policy simulator. Evaluates AWS-flavored allow/deny statements (action + resource with * and ? wildcards) against action/resource requests using standard precedence: explicit Deny wins, else Allow grants, else implicit deny. Models Effect/Action/Resource only. No LLM, no live IAM calls.',
  openapi_url: 'https://orbis-apis.onrender.com/iam-scope-simulator/openapi.json',
  auth: { type: 'apiKey', header: 'X-API-Key' },
  endpoints: [
    { method: 'POST', path: '/simulate', summary: 'Simulate policy decision(s)', price_usdc: 0.007 },
    { method: 'POST', path: '/lookup', summary: 'ONE-CALL simulate + reasoning', price_usdc: 0.014 },
  ],
  pricing: [
    { path: '/simulate', price_usdc: 0.007, currency: 'USDC' },
    { path: '/lookup', price_usdc: 0.014, currency: 'USDC' },
  ],
  x402_compatible: true,
};
const endpoints: AplusEndpoint[] = [
  { method: 'get', path: '/', summary: 'Service discovery', operationId: 'discover', responseSchemaRef: 'DiscoveryResponse', responseExample: disc },
  {
    method: 'post', path: '/simulate', summary: 'Simulate policy decision(s)', operationId: 'simulate', priceUsdc: 0.007,
    requestSchemaRef: 'SimulateRequest', responseSchemaRef: 'SimulateResponse', requestExample: reqEx,
    responseExample: { ...env, ...CORE, ...TAIL },
  },
  {
    method: 'post', path: '/lookup', summary: 'ONE-CALL simulate + reasoning', operationId: 'lookup', priceUsdc: 0.014, oneCall: true,
    requestSchemaRef: 'SimulateRequest', responseSchemaRef: 'LookupResponse', requestExample: reqEx,
    responseExample: {
      ...env, ...CORE,
      reasoning: {
        why_result_generated: '2 statement(s) evaluated against 1 request(s): 1 Allow, 0 deny.',
        key_factors: ['Precedence: explicit Deny > Allow > implicit deny.', 'First request → Allow (Allowed by statement AllowS3 with no matching Deny.)', 'Matched allow stmts: [0], deny stmts: [].'],
        invalidators: INVALIDATORS,
      },
      ...TAIL,
    },
  },
];

export const spec = buildAplusSpec({
  slug: 'iam-scope-simulator', title: 'IAM Scope Simulator API', version: '1.0.0',
  description: 'Deterministic IAM-style policy simulator. Evaluates AWS-flavored allow/deny statements against action/resource requests using standard precedence (explicit Deny wins). Models Effect/Action/Resource only. No LLM, no live IAM calls.',
  endpoints, schemas, infoExtensions: { 'x-security-rubric': true, 'x-human-approval-required': false },
});

export default specRouter(spec);
