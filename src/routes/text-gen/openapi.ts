import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Text Generation API',
      version: '1.0.0',
      description: 'Multi-provider text generation with automatic Anthropic and OpenAI fallback. One API, maximum uptime.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/generate': 0.002 },
      privacy: { data_stored: false, retention: 'none' },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/text-gen' }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/generate': { post: { operationId: 'generateText', summary: 'Generate text with AI using Anthropic or OpenAI with automatic fallback', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['prompt'], properties: {
          prompt: { type: 'string', minLength: 1, maxLength: 10000, description: 'Input prompt' },
          provider: { type: 'string', enum: ['openai', 'anthropic', 'auto'], default: 'auto', description: 'AI provider preference' },
          system_prompt: { type: 'string', maxLength: 2000, description: 'Optional system instructions' },
          max_tokens: { type: 'integer', minimum: 1, maximum: 4000, default: 1000 },
          temperature: { type: 'number', minimum: 0, maximum: 2, default: 0.7 },
        }}}}},
        responses: { '200': { description: 'Generated text', content: { 'application/json': { schema: { type: 'object', properties: {
          success: { type: 'boolean' },
          text: { type: 'string', description: 'Generated text output' },
          provider: { type: 'string', description: 'Model used for generation' },
          metadata: { type: 'object', properties: {
            latency_ms: { type: 'number' },
            estimated_cost: { type: 'number' },
            model: { type: 'string' },
            tokens_used: { type: 'integer' },
            prompt_tokens: { type: 'integer' },
            completion_tokens: { type: 'integer' },
          }},
          execution_ready: { type: 'boolean' },
          confidence_per_section: { type: 'object', properties: { generation: { type: 'number', minimum: 0, maximum: 1 }, safety: { type: 'number', minimum: 0, maximum: 1 } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string', description: 'Suggested next endpoint e.g. ai-output-safety/check' },
          privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        }}}}}}}},
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate text generation based on prompt safety and budget', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['prompt'], properties: {
          prompt: { type: 'string' },
          max_cost: { type: 'number', description: 'Max allowed cost in USDC' },
          safety_check: { type: 'boolean', default: true },
        }}}}},
        responses: { '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          execute: { type: 'boolean' },
          confidence: { type: 'number' },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          estimated_cost: { type: 'number' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string' },
        }}}}}}}},
    },
  });
});
export default router;
