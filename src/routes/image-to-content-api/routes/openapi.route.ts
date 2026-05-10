import { Router, Request, Response } from 'express';
export const openapiRouter = Router();
openapiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Image to Content API',
      version: '1.0.0',
      description: 'Convert images to structured content using AI vision — captions, tags, and metadata.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/analyze': 0.005, '/batch': 0.015 },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/image-to-content' }],
    paths: {
      '/analyze': { post: { operationId: 'analyzeImage', summary: 'Analyze an image and extract structured content', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['image'], properties: {
          image: { type: 'string', description: 'Base64-encoded image string' },
          image_format: { type: 'string', enum: ['jpeg', 'png', 'gif', 'webp'] },
          modules: { type: 'array', items: { type: 'string', enum: ['caption', 'summary', 'tags', 'metadata', 'ocr', 'faces'] }, default: ['caption', 'summary', 'tags', 'metadata'] },
          language: { type: 'string', default: 'en' },
          max_tags: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          caption_style: { type: 'string', enum: ['brief', 'detailed', 'seo'], default: 'detailed' },
          async: { type: 'boolean', default: false },
        }}}}},
        responses: { '200': { description: 'Structured image content', content: { 'application/json': { schema: { type: 'object', properties: {
          caption: { type: 'string' }, summary: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' }, confidence_per_section: { type: 'object' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string' },
        }}}}}}}},
      '/batch': { post: { operationId: 'batchAnalyze', summary: 'Batch analyze up to 20 images', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['images'], properties: {
          images: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'object' } },
        }}}}},
        responses: { '200': { description: 'Batch results' }}}},
      '/jobs/{jobId}': { get: { operationId: 'getJob', summary: 'Poll async job status', 'x-agent-callable': true,
        parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Job status' }}}},
    },
  });
});
