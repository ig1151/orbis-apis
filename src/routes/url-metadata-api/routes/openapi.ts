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
    info: { title: 'URL Metadata API', version: '1.0.0', description: 'Fetch URL metadata, extract Open Graph tags, analyze link safety, and generate link previews for agents and content pipelines', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 500 }, pay_per_call: { fetch: '$0.002', 'og-tags': '$0.002', analyze: '$0.003', 'execution-gate': '$0.001', 'url-intelligence': '$0.006', 'link-preview': '$0.002', batch: '$0.015' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/url-metadata' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/fetch': { post: { operationId: 'fetchMetadata', summary: 'Fetch URL metadata (title, description, author)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string', format: 'uri' } } } } } }, responses: { '200': { description: 'URL metadata', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, url: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, content_type: { type: 'string' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/og-tags': { post: { operationId: 'extractOgTags', summary: 'Extract Open Graph and social meta tags', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string', format: 'uri' } } } } } }, responses: { '200': { description: 'OG tags', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, og: { type: 'object' }, twitter: { type: 'object' }, missing_tags: { type: 'array', items: { type: 'string' } }, ...chainFields, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyzeUrl', summary: 'Analyze URL quality and safety', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string', format: 'uri' } } } } } }, responses: { '200': { description: 'Safety analysis', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, safety_score: { type: 'number' }, is_safe: { type: 'boolean' }, malware_indicator: { type: 'boolean' }, phishing_indicator: { type: 'boolean' }, ...chainFields, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, ...chainFields, privacy } } } } } } } },
      '/url-intelligence': { post: { operationId: 'urlIntelligence', summary: 'ONE-CALL: metadata + OG tags + safety + preview', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string', format: 'uri' }, purpose: { type: 'string' } } } } } }, responses: { '200': { description: 'Full URL intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, title: { type: 'string' }, description: { type: 'string' }, og_image: { type: 'string' }, is_safe: { type: 'boolean' }, social_preview: { type: 'object' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } } } },
      '/link-preview': { post: { operationId: 'generateLinkPreview', summary: 'Generate rich link preview card', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string', format: 'uri' } } } } } }, responses: { '200': { description: 'Link preview', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, preview: { type: 'object' }, embed_html: { type: 'string' }, ...chainFields, privacy } } } } } } } },
      '/batch': { post: { operationId: 'batchUrls', summary: 'Batch fetch metadata for up to 10 URLs', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['urls'], properties: { urls: { type: 'array', items: { type: 'string' }, maxItems: 10 } } } } } }, responses: { '200': { description: 'Batch results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object' } }, ...chainFields } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
