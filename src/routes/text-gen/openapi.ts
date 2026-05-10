import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Text Generation API',
      version: '1.0.0',
      description: 'Multi-provider text generation with automatic Anthropic and OpenAI fallback.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/generate': 0.002 },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/text-gen' }],
    paths: {
      '/generate': {
        post: {
          operationId: 'generateText',
          summary: 'Generate text with AI',
          'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['prompt'], properties: {
            prompt: { type: 'string', minLength: 1, maxLength: 10000 },
            provider: { type: 'string', enum: ['openai', 'anthropic', 'auto'], default: 'auto' },
            system_prompt: { type: 'string', maxLength: 2000 },
            max_tokens: { type: 'integer', minimum: 1, maximum: 4000, default: 1000 },
            temperature: { type: 'number', minimum: 0, maximum: 2, default: 0.7 },
          }}}}},
          responses: { '200': { description: 'Generated text', content: { 'application/json': { schema: { type: 'object', properties: {
            success: { type: 'boolean' },
            text: { type: 'string' },
            provider: { type: 'string' },
            metadata: { type: 'object', properties: { latency_ms: { type: 'number' }, estimated_cost: { type: 'number' }, model: { type: 'string' } } },
            execution_ready: { type: 'boolean' },
            next_api: { type: 'string' },
            next_endpoint: { type: 'string' },
            confidence_per_section: { type: 'object', properties: { generation: { type: 'number' } } },
          }}}}}},
        },
      },
    },
  });
});
export default router;
