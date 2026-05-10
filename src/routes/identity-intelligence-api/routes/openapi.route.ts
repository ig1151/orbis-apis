import { Router, Request, Response } from 'express';
export const openapiRouter = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
openapiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Identity Intelligence API', version: '2.0.0', description: 'Analyze and verify identities with fraud detection, KYC signals, trust scoring and risk classification. Returns structured identity profiles with confidence per dimension.', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { analyze: '$0.006', batch: '$0.015' }, high_volume: { analyze: '$0.004', batch: '$0.009' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/identity-intelligence' }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': { post: { operationId: 'analyzeIdentity', summary: 'Analyze and verify an identity with fraud detection, KYC signals and trust scoring', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identity'], properties: { identity: { type: 'object', properties: { email: { type: 'string', format: 'email' }, name: { type: 'string' }, phone: { type: 'string' }, ip_address: { type: 'string' }, device_fingerprint: { type: 'string' } } }, check_types: { type: 'array', items: { type: 'string', enum: ['fraud', 'kyc', 'trust', 'risk', 'all'] } } } } } } }, responses: { '200': { description: 'Identity analysis result', content: { 'application/json': { schema: { type: 'object', properties: { identity_id: { type: 'string' }, trust_score: { type: 'number', minimum: 0, maximum: 1 }, risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }, fraud_signals: actions, kyc_signals: { type: 'object', properties: { email_verified: { type: 'boolean' }, phone_verified: { type: 'boolean' }, identity_verified: { type: 'boolean' } } }, recommended_action: { type: 'string', enum: ['approve', 'review', 'reject', 'challenge'] }, fraud_score: { type: 'number', minimum: 0, maximum: 1 }, identity_confidence: { type: 'number', minimum: 0, maximum: 1 }, challenge_required: { type: 'boolean' }, recommended_challenge: { type: 'string', enum: ['none', 'otp', 'document', 'biometric'], nullable: true }, chain_to: { type: 'array', items: { type: 'string' } }, recommended_actions_priority_order: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, privacy } } } } }, '400': { description: 'Missing identity' }, '500': { description: 'Analysis failed' } } } },
      '/batch': { post: { operationId: 'analyzeIdentitiesBatch', summary: 'Batch analyze multiple identities', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identities'], properties: { identities: { type: 'array', items: { type: 'object' }, maxItems: 20 }, check_types: { type: 'array', items: { type: 'string' } } } } } } }, responses: { '200': { description: 'Batch results', content: { 'application/json': { schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } }, total: { type: 'number' }, high_risk_count: { type: 'number' }, privacy } } } } }, '400': { description: 'Missing identities' }, '500': { description: 'Batch failed' } } } }
    }
  });
});

export const docsRouter = openapiRouter;
