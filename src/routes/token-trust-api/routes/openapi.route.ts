import { Router, Request, Response } from 'express';
export const openapiRouter = Router();
export const docsRouter = Router();
openapiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Token Trust API',
      version: '1.0.0',
      description: 'Trust scoring for crypto tokens based on on-chain metrics and community signals.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/score': 0.005, '/check': 0.005, '/check/batch': 0.015 },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/token-trust' }],
    paths: {
      '/score': { post: { operationId: 'scoreToken', summary: 'Score token trustworthiness (alias for /check)', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: {
          contract: { type: 'string', description: 'Token contract address' },
          chain: { type: 'string', enum: ['ethereum', 'bsc', 'solana'], default: 'ethereum' },
        }}}}},
        responses: { '200': { description: 'Trust score', content: { 'application/json': { schema: { type: 'object', properties: {
          contract: { type: 'string' }, chain: { type: 'string' }, trust_score: { type: 'number' },
          risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          factors: { type: 'object' }, confidence_per_section: { type: 'object' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string' },
        }}}}}}}},
      '/check': { post: { operationId: 'checkToken', summary: 'Check token trust score', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: {
          contract: { type: 'string' }, chain: { type: 'string', enum: ['ethereum', 'bsc', 'solana'] },
        }}}}},
        responses: { '200': { description: 'Trust check result' }}}},
      '/check/batch': { post: { operationId: 'batchCheckTokens', summary: 'Batch check up to 10 tokens', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['tokens'], properties: {
          tokens: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'object' } },
        }}}}},
        responses: { '200': { description: 'Batch trust results' }}}},
    },
  });
});
docsRouter.get('/', (_req: Request, res: Response) => {
  res.send("<h1>Token Trust API Docs</h1><p><a href='/token-trust/openapi.json'>OpenAPI Spec</a></p>");
});
