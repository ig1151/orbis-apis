import { Router, Request, Response } from 'express';
import { skillCount } from '../store/skills';
const router = Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Agent Skills API',
    version: '1.0.0',
    description: 'AI agent skill registry — register, discover, and AI-match agent capabilities for the agentic economy. Pre-seeded with OrbisAPI skills. Built for autonomous AI agents on x402 and Agentic.Market.',
    contact: { url: 'https://orbisapi.com' },
  },
  servers: [{ url: 'https://agent-skills-api.onrender.com' }],
  paths: {
    '/v1/health': { get: { summary: 'Health check with skill count', responses: { 200: { description: 'OK' } } } },
    '/v1/skills/register': {
      post: {
        summary: 'Register a new agent skill',
        operationId: 'registerSkill',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'description', 'category', 'capabilities', 'endpoint'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  capabilities: { type: 'array', items: { type: 'string' } },
                  endpoint: { type: 'string' },
                  method: { type: 'string', enum: ['GET', 'POST'] },
                  inputs: { type: 'array' },
                  outputs: { type: 'array' },
                  pricingType: { type: 'string', enum: ['free', 'per_call', 'subscription'] },
                  pricePerCall: { type: 'number' },
                  tags: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Skill registered with skillId' } },
      },
    },
    '/v1/skills/discover': {
      get: {
        summary: 'Discover skills by keyword, category, or tags',
        operationId: 'discoverSkills',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search query' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category' },
          { name: 'tags', in: 'query', schema: { type: 'string' }, description: 'Comma-separated tags' },
          { name: 'limit', in: 'query', schema: { type: 'number', default: 10 } },
        ],
        responses: { 200: { description: 'List of matching skills' } },
      },
    },
    '/v1/skills/trending': {
      get: {
        summary: 'Most invoked skills in the last 24h',
        operationId: 'trendingSkills',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'number', default: 10 } }],
        responses: { 200: { description: 'Trending skills by invocation count' } },
      },
    },
    '/v1/skills/{skillId}': {
      get: {
        summary: 'Get full skill detail by ID',
        operationId: 'getSkill',
        parameters: [{ name: 'skillId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Full skill detail' } },
      },
    },
    '/v1/skills/match': {
      post: {
        summary: 'AI-powered skill matching — describe what you need, get best match',
        operationId: 'matchSkill',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['request'],
                properties: {
                  request: { type: 'string', description: 'Natural language description of what you need' },
                  limit: { type: 'number', default: 3 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Ranked skill matches with AI explanation' } },
      },
    },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Agent Skills API',
    version: '1.0.0',
    description: 'AI agent skill registry — register, discover, and match agent capabilities for the agentic economy',
    registeredSkills: skillCount(),
    docs: '/docs',
    openapi: '/openapi.json',
    health: '/v1/health',
    endpoints: {
      discover: 'GET /v1/skills/discover?q=trading',
      trending: 'GET /v1/skills/trending',
      detail: 'GET /v1/skills/:skillId',
      register: 'POST /v1/skills/register',
      match: 'POST /v1/skills/match',
    },
    source: 'https://orbisapi.com',
  });
});

router.get('/openapi.json', (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Agent Skills API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;