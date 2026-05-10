import { Router, Request, Response } from 'express';
import { skillCount } from '../store/skills';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Agent Skills API',
    version: '2.0.0',
    description: 'AI agent skill registry — register, discover, match, compose and route agent capabilities for autonomous workflows. Pre-seeded with OrbisAPI skills. Built for autonomous AI agents on x402 and Agentic.Market.',
    'x-agent-callable': true,
    'x-mcp-compatible': true,
    'x-pricing': {
      free_tier: { requests_per_day: 100, requests_per_month: 3000 },
      pay_per_call: { register: '$0.004', discover: '$0.003', match: '$0.005', compose: '$0.007', trending: '$0.002', detail: '$0.002' },
      high_volume: { match: '$0.003', compose: '$0.004' }
    },
  },
  servers: [{ url: 'https://orbis-apis.onrender.com/agent-skills' }],
  components: {
    securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
    schemas: {
      Skill: {
        type: 'object',
        properties: {
          skill_id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          tags: actions,
          input_schema: { type: 'object' },
          output_schema: { type: 'object' },
          version: { type: 'string' },
          author: { type: 'string' },
          endpoint: { type: 'string', format: 'uri' },
          pricing: { type: 'object', properties: { per_call_usdc: { type: 'number' } } },
          invocation_count: { type: 'number' },
          rating: { type: 'number', minimum: 0, maximum: 5 },
          created_at: { type: 'string', format: 'date-time' },
        }
      },
      Privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } }
    }
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/register': {
      post: {
        operationId: 'registerSkill',
        summary: 'Register a new agent skill in the marketplace with schema, pricing and capability metadata',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name', 'description', 'endpoint'], properties: { name: { type: 'string' }, description: { type: 'string' }, category: { type: 'string' }, tags: actions, endpoint: { type: 'string', format: 'uri' }, input_schema: { type: 'object' }, output_schema: { type: 'object' }, pricing: { type: 'object', properties: { per_call_usdc: { type: 'number' } } }, version: { type: 'string' }, author: { type: 'string' } } } } }
        },
        responses: {
          '200': { description: 'Skill registered', content: { 'application/json': { schema: { type: 'object', properties: { skill_id: { type: 'string' }, name: { type: 'string' }, status: { type: 'string', enum: ['registered', 'pending_review'] }, endpoint: { type: 'string', format: 'uri' }, created_at: { type: 'string', format: 'date-time' }, confidence_per_section: confidence, privacy } } } } },
          '400': { description: 'Missing required fields' },
          '500': { description: 'Registration failed' }
        }
      }
    },
    '/discover': {
      get: {
        operationId: 'discoverSkillsGet',
        summary: 'Discover available agent skills by query, category or tags',
        parameters: [
          { name: 'query', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'number' } }
        ],
        responses: {
          '200': { description: 'Skills discovered', content: { 'application/json': { schema: { type: 'object', properties: { skills: { type: 'array', items: { '$ref': '#/components/schemas/Skill' } }, total: { type: 'number' }, query: { type: 'string' }, confidence_per_section: confidence, privacy } } } } },
          '500': { description: 'Discovery failed' }
        }
      },
      post: {
        operationId: 'discoverSkillsPost',
        summary: 'Discover available agent skills by query, category or tags',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { query: { type: 'string' }, category: { type: 'string' }, tags: actions, limit: { type: 'number' } } } } } },
        responses: {
          '200': { description: 'Skills discovered', content: { 'application/json': { schema: { type: 'object', properties: { skills: { type: 'array', items: { '$ref': '#/components/schemas/Skill' } }, total: { type: 'number' }, confidence_per_section: confidence, privacy } } } } },
          '500': { description: 'Discovery failed' }
        }
      }
    },
    '/match': {
      post: {
        operationId: 'matchSkill',
        summary: 'Match the best skills from the registry to a specific agent request with confidence scoring',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['task'], properties: { task: { type: 'string' }, context: { type: 'object' }, max_results: { type: 'number' }, min_confidence: { type: 'number', minimum: 0, maximum: 1 } } } } }
        },
        responses: {
          '200': { description: 'Skills matched', content: { 'application/json': { schema: { type: 'object', properties: { task: { type: 'string' }, matches: { type: 'array', items: { type: 'object', properties: { skill: { '$ref': '#/components/schemas/Skill' }, match_score: { type: 'number', minimum: 0, maximum: 1 }, match_reason: { type: 'string' }, estimated_cost_usdc: { type: 'number' } } } }, recommended_skill_id: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
          '400': { description: 'Missing task' },
          '500': { description: 'Match failed' }
        }
      }
    },
    '/compose': {
      post: {
        operationId: 'composeSkills',
        summary: 'Given a task, return an ordered sequence of skills with dependencies, duration estimates and execution order',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['task'], properties: { task: { type: 'string' }, context: { type: 'object' }, max_steps: { type: 'number' }, budget_usdc: { type: 'number' } } } } }
        },
        responses: {
          '200': { description: 'Skill composition plan', content: { 'application/json': { schema: { type: 'object', properties: { task: { type: 'string' }, steps: { type: 'array', items: { type: 'object', properties: { step: { type: 'number' }, skill_id: { type: 'string' }, skill_name: { type: 'string' }, input_from: { type: 'string', nullable: true }, estimated_duration_ms: { type: 'number' }, estimated_cost_usdc: { type: 'number' }, required: { type: 'boolean' } } } }, total_estimated_cost_usdc: { type: 'number' }, total_estimated_duration_ms: { type: 'number' }, parallel_opportunities: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
          '400': { description: 'Missing task' },
          '500': { description: 'Composition failed' }
        }
      }
    },
    '/trending': {
      get: {
        operationId: 'trendingSkills',
        summary: 'Get trending agent skills ranked by recent invocation count and rating',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'number' } }],
        responses: {
          '200': { description: 'Trending skills', content: { 'application/json': { schema: { type: 'object', properties: { skills: { type: 'array', items: { '$ref': '#/components/schemas/Skill' } }, period: { type: 'string' }, total_skills: { type: 'number' }, privacy } } } } },
          '500': { description: 'Failed to fetch trending' }
        }
      }
    },
    '/:skillId': {
      get: {
        operationId: 'getSkillDetail',
        summary: 'Get full details for a specific skill including schema, pricing and usage stats',
        parameters: [{ name: 'skillId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Skill details', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Skill' } } } },
          '404': { description: 'Skill not found' },
          '500': { description: 'Failed to fetch skill' }
        }
      }
    },
    '/execution-gate': {
      post: {
        operationId: 'skillExecutionGate',
        summary: 'Gate skill execution based on trust score, pricing limits and capability validation',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['skill_id', 'agent_id'], properties: { skill_id: { type: 'string' }, agent_id: { type: 'string' }, budget_usdc: { type: 'number' }, context: { type: 'object' } } } } }
        },
        responses: {
          '200': { description: 'Execution gate decision', content: { 'application/json': { schema: { type: 'object', properties: { execute: { type: 'boolean' }, skill_id: { type: 'string' }, agent_id: { type: 'string' }, trust_score: { type: 'number', minimum: 0, maximum: 1 }, budget_sufficient: { type: 'boolean' }, estimated_cost_usdc: { type: 'number' }, blocking_flags: actions, recommended_action: { type: 'string', enum: ['proceed', 'require_approval', 'block'] }, confidence_per_section: confidence, privacy } } } } },
          '400': { description: 'Missing required fields' },
          '500': { description: 'Gate check failed' }
        }
      }
    }
  }
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