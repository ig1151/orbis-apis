import { Router, Request, Response } from 'express';
export const openapiRouter = Router();
export const docsRouter = Router();
openapiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Token Trust API',
      version: '1.0.0',
      description: 'Trust scoring for crypto tokens based on on-chain metrics, contract analysis and community signals.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/score': 0.005, '/check': 0.005, '/check/batch': 0.015 },
      disclaimer: 'For informational purposes only. Not financial advice.',
      privacy: { data_stored: false, retention: 'none' },
    
    'x-human-approval-required': true,},
    servers: [{ url: 'https://orbis-apis.onrender.com/token-trust' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/score': { post: { operationId: 'scoreToken', summary: 'Score token trustworthiness (alias for /check)', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          contract: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$', description: 'Token contract address' },
          chain: { type: 'string', enum: ['ethereum', 'bsc', 'solana'], default: 'ethereum' },
        }}}}},
        responses: { '200': { description: 'Token trust score', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          contract: { type: 'string' }, chain: { type: 'string' },
          trust_score: { type: 'number', minimum: 0, maximum: 100, description: 'Trust score 0-100, higher is safer' },
          risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          factors: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            contract_verified: { type: 'boolean' }, liquidity_score: { type: 'number' },
            holder_distribution: { type: 'number' }, community_score: { type: 'number' },
            age_days: { type: 'integer' }, honeypot_risk: { type: 'boolean' },
          }},
          chain_specific_notes: { type: 'array', items: { type: 'string' }, description: 'Chain-specific risk notes' },
          confidence_per_section: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            contract: { type: 'number' }, liquidity: { type: 'number' }, community: { type: 'number' },
          }},
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          disclaimer: { type: 'string' },
        }}}}}}}},
      '/check': { post: { operationId: 'checkToken', summary: 'Check token trust score', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          contract: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$', description: 'Token contract address' },
          chain: { type: 'string', enum: ['ethereum', 'bsc', 'solana'], default: 'ethereum' },
        }}}}},
        responses: { '200': { description: 'Trust check result', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          contract: { type: 'string' }, chain: { type: 'string' },
          trust_score: { type: 'number', minimum: 0, maximum: 100 },
          risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          factors: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            contract_verified: { type: 'boolean' }, liquidity_score: { type: 'number' },
            holder_distribution: { type: 'number' }, community_score: { type: 'number' },
            age_days: { type: 'integer' }, honeypot_risk: { type: 'boolean' },
          }},
          chain_specific_notes: { type: 'array', items: { type: 'string' } },
          confidence_per_section: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' }, contract: { type: 'number' }, liquidity: { type: 'number' } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } }, disclaimer: { type: 'string' },
        }}}}}}}},
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate token interaction based on trust score', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract', 'action'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          contract: { type: 'string' }, chain: { type: 'string', default: 'ethereum' },
          action: { type: 'string' }, min_trust_score: { type: 'number', default: 60 },
        }}}}},
        responses: { '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          execute: { type: 'boolean' }, trust_score: { type: 'number' }, confidence: { type: 'number', minimum: 0, maximum: 1 },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } }, disclaimer: { type: 'string' },
        }}}}}}}},
      '/check/batch': { post: { operationId: 'batchCheckTokens', summary: 'Batch check up to 10 token trust scores', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['tokens'], properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          tokens: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'object', required: ['contract'], properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
            contract: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
            chain: { type: 'string', enum: ['ethereum', 'bsc', 'solana'] },
          }}},
        }}}}},
        responses: { '200': { description: 'Batch trust results', content: { 'application/json': { schema: { type: 'object', properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          batch_id: { type: 'string' }, total: { type: 'integer' },
          results: { type: 'array', items: { type: 'object' } },
          latency_ms: { type: 'number' },
        }}}}}}}},
    },
  });
});
docsRouter.get('/', (_req: Request, res: Response) => {
  res.send("<h1>Token Trust API</h1><p><a href='/token-trust/openapi.json'>OpenAPI Spec</a></p>");
});
