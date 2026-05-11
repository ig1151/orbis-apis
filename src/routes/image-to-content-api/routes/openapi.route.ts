import { Router, Request, Response } from 'express';
export const openapiRouter = Router();
openapiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Image to Content API',
      version: '1.0.0',
      description: 'Convert images to structured content using AI vision — captions, tags, metadata, OCR and face analysis.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/analyze': 0.005, '/batch': 0.015, '/jobs/{jobId}': 0.0005 },
      privacy: { data_stored: false, retention: 'none', note: 'Images processed in memory only, not stored' },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/image-to-content' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', 'x-agent-callable': true,
      responses: { '200': { description: 'API info', content: { 'application/json': { schema: { type: 'object', properties: {
        title: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
        endpoints: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['ok'] },
      } } } } } } } },
      '/analyze': { post: { operationId: 'analyzeImage', summary: 'Analyze an image and extract structured content', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['image'], properties: {
          image: { type: 'string', description: 'Base64-encoded image string' },
          image_format: { type: 'string', enum: ['jpeg', 'png', 'gif', 'webp'], description: 'Image format' },
          modules: { type: 'array', items: { type: 'string', enum: ['caption', 'summary', 'tags', 'metadata', 'ocr', 'faces'] }, default: ['caption', 'summary', 'tags', 'metadata'] },
          language: { type: 'string', default: 'en', description: 'Output language code' },
          max_tags: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          caption_style: { type: 'string', enum: ['brief', 'detailed', 'seo'], default: 'detailed' },
          async: { type: 'boolean', default: false },
        }}}}},
        responses: { '200': { description: 'Structured image content', content: { 'application/json': { schema: { type: 'object', properties: {
          caption: { type: 'string', description: 'AI-generated image caption' },
          summary: { type: 'string', description: 'Detailed image description' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Extracted tags' },
          metadata: { type: 'object', properties: {
            width: { type: 'integer' }, height: { type: 'integer' },
            format: { type: 'string' }, file_size_bytes: { type: 'integer' },
            color_palette: { type: 'array', items: { type: 'string' } },
          }},
          ocr: { type: 'object', properties: { text: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, language_detected: { type: 'string' } } },
          faces: { type: 'array', items: { type: 'object', properties: {
            emotion: { type: 'string' }, age_range: { type: 'string' },
            profile_score: { type: 'integer', minimum: 0, maximum: 100 },
            improvement_suggestions: { type: 'array', items: { type: 'string' } },
            safety_note: { type: 'string', description: 'Face detection is used for aesthetic profile scoring only. This API does not identify individuals, verify identity, infer protected characteristics, or perform biometric recognition of any kind.' },
          }}},
          confidence_per_section: { type: 'object', properties: {
            caption: { type: 'number' }, tags: { type: 'number' }, ocr: { type: 'number' }, faces: { type: 'number' },
          }},
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        }}}}}}}},
      '/batch': { post: { operationId: 'batchAnalyze', summary: 'Batch analyze up to 20 images', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['images'], properties: {
          images: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'object', required: ['image'], properties: {
            image: { type: 'string' }, image_format: { type: 'string' }, modules: { type: 'array', items: { type: 'string' } },
          }}},
        }}}}},
        responses: { '200': { description: 'Batch results', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          batch_id: { type: 'string' },
          total: { type: 'integer' },
          succeeded: { type: 'integer' },
          failed: { type: 'integer' },
          results: { type: 'array', items: { type: 'object', properties: { index: { type: 'integer' }, success: { type: 'boolean' }, caption: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, error: { type: 'string', nullable: true } } } },
          latency_ms: { type: 'number' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        }}}}}}}},
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate image processing based on content safety', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['image'], properties: {
          image: { type: 'string' }, safety_check: { type: 'boolean', default: true },
          max_cost: { type: 'number' },
        }}}}},
        responses: { '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          execute: { type: 'boolean' }, confidence: { type: 'number', minimum: 0, maximum: 1 },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
        }}}}}}}},
      '/jobs/{jobId}': { get: { operationId: 'getJob', summary: 'Poll async job status', 'x-agent-callable': true,
        parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Job status', content: { 'application/json': { schema: { type: 'object', properties: {
          job_id: { type: 'string' }, status: { type: 'string', enum: ['pending', 'processing', 'success', 'error'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
          result: { type: 'object', properties: { caption: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, confidence_per_section: { type: 'object' } } }, error: { type: 'string', nullable: true },
        }}}}}}}},
    },
  });
});
