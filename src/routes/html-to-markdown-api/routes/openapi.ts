import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };
const provenance = { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } };
const chainFields = { source_provenance: provenance, cache_ttl_seconds: { type: 'integer' }, cache_recommended: { type: 'boolean' }, recommended_next_api: { type: 'string' }, recommended_next_endpoint: { type: 'string' }, automation_safe: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'HTML to Markdown API', version: '1.0.0', description: 'Convert HTML to clean Markdown, extract content sections and simplify pages for LLM ingestion and content pipelines', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 500 }, pay_per_call: { convert: '$0.003', clean: '$0.002', extract: '$0.003', 'execution-gate': '$0.001', 'html-intelligence': '$0.008', simplify: '$0.002', batch: '$0.015' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/html-to-markdown' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/convert': { post: { operationId: 'convertHtml', summary: 'Convert HTML to clean Markdown', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['html'], properties: { html: { type: 'string' }, options: { type: 'object' } } } } } }, responses: { '200': { description: 'Converted Markdown', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, markdown: { type: 'string' }, compression_ratio: { type: 'number' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/clean': { post: { operationId: 'cleanMarkdown', summary: 'Clean and normalize converted Markdown', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['markdown'], properties: { markdown: { type: 'string' } } } } } }, responses: { '200': { description: 'Cleaned Markdown', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, cleaned_markdown: { type: 'string' }, issues_fixed: { type: 'array', items: { type: 'string' } }, ...chainFields, privacy } } } } } } } },
      '/extract': { post: { operationId: 'extractContent', summary: 'Extract structured content sections from HTML', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['html'], properties: { html: { type: 'string' }, sections: { type: 'string' } } } } } }, responses: { '200': { description: 'Extracted content', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, title: { type: 'string' }, main_content: { type: 'string' }, headings: { type: 'array', items: { type: 'string' } }, links: { type: 'array', items: { type: 'object' } }, ...chainFields, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['html'], properties: { html: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, ...chainFields, privacy } } } } } } } },
      '/html-intelligence': { post: { operationId: 'htmlIntelligence', summary: 'ONE-CALL: convert + clean + extract + analyze', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['html'], properties: { html: { type: 'string' }, purpose: { type: 'string' } } } } } }, responses: { '200': { description: 'Full HTML intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, markdown: { type: 'string' }, title: { type: 'string' }, content_type: { type: 'string' }, quality_score: { type: 'number' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } } } },
      '/simplify': { post: { operationId: 'simplifyHtml', summary: 'Simplify HTML to plain readable text', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['html'], properties: { html: { type: 'string' }, target_format: { type: 'string' } } } } } }, responses: { '200': { description: 'Simplified text', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, plain_text: { type: 'string' }, simplified_markdown: { type: 'string' }, readability_score: { type: 'number' }, ...chainFields, privacy } } } } } } } },
      '/batch': { post: { operationId: 'batchConvert', summary: 'Batch convert up to 5 HTML items', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object' }, maxItems: 5 } } } } } }, responses: { '200': { description: 'Batch results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object' } }, ...chainFields } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
