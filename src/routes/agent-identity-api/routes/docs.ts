import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Agent Identity API',
    version: '1.0.0',
    description: 'KYA (Know Your Agent) — generate, verify, and score AI agent identities and reputation for the agentic economy. Built for autonomous AI agents operating on x402 and Agentic.Market.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://agent-identity-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/v1/identity/generate': {
      post: {
        summary: 'Generate a signed agent identity proof',
        operationId: 'generateIdentity',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'description', 'capabilities'],
                properties: {
                  name: { type: 'string', description: 'Agent name' },
                  description: { type: 'string', description: 'What this agent does' },
                  capabilities: { type: 'array', items: { type: 'string' }, description: 'List of capabilities (e.g. web-search, trading, code-execution)' },
                  walletAddress: { type: 'string', description: 'EVM wallet address for onchain reputation' },
                  framework: { type: 'string', enum: ['langchain', 'autogen', 'crewai', 'custom', 'openai', 'anthropic', 'other'] },
                  operator: { type: 'string', description: 'Organization or person operating this agent' },
                  ttlDays: { type: 'number', default: 90, description: 'Identity validity in days' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Agent identity created with signed proof' } },
      },
    },
    '/v1/identity/verify': {
      post: {
        summary: 'Verify an agent identity proof',
        operationId: 'verifyIdentity',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['proof'],
                properties: { proof: { type: 'string', description: 'JWT proof from generate endpoint' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Verification result with identity details' } },
      },
    },
    '/v1/reputation/{agentId}': {
      get: {
        summary: 'Get agent reputation score based on onchain activity',
        operationId: 'getReputation',
        parameters: [
          { name: 'agentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Reputation score with trust level and AI summary' } },
      },
    },
    '/v1/identity/lookup/{agentId}': {
      get: {
        summary: 'Look up a registered agent profile',
        operationId: 'lookupIdentity',
        parameters: [
          { name: 'agentId', in: 'path', required: true, schema: { type: 'string' }, description: 'Agent ID or wallet address' },
        ],
        responses: { 200: { description: 'Agent profile without proof token' } },
      },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Agent Identity API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
