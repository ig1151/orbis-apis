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
    info: { title: 'Markdown Cleaner API', version: '1.0.0', description: 'Clean, format, lint and extract structure from Markdown documents for documentation pipelines and LLM ingestion', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 500 }, pay_per_call: { clean: '$0.002', format: '$0.002', lint: '$0.002', 'execution-gate': '$0.001', 'markdown-intelligence': '$0.006', 'extract-structure': '$0.003', batch: '$0.012' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/markdown-cleaner' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/clean': { post: { operationId: 'cleanMarkdown', summary: 'Clean and normalize markdown', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['markdown'], properties: { markdown: { type: 'string' }, style: { type: 'string' } } } } } }, responses: { '200': { description: 'Cleaned markdown', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, cleaned_markdown: { type: 'string' }, changes_made: { type: 'array', items: { type: 'string' } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/format': { post: { operationId: 'formatMarkdown', summary: 'Format markdown to standard style', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['markdown'], properties: { markdown: { type: 'string' }, standard: { type: 'string' } } } } } }, responses: { '200': { description: 'Formatted markdown', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, formatted_markdown: { type: 'string' }, standard_applied: { type: 'string' }, ...chainFields, privacy } } } } } } } },
      '/lint': { post: { operationId: 'lintMarkdown', summary: 'Lint markdown for issues', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['markdown'], properties: { markdown: { type: 'string' } } } } } }, responses: { '200': { description: 'Lint results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, lint_score: { type: 'number' }, issues: { type: 'array', items: { type: 'object' } }, error_count: { type: 'integer' }, passed: { type: 'boolean' }, ...chainFields, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['markdown'], properties: { markdown: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, ...chainFields, privacy } } } } } } } },
      '/markdown-intelligence': { post: { operationId: 'markdownIntelligence', summary: 'ONE-CALL: clean + format + lint + analyze', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['markdown'], properties: { markdown: { type: 'string' }, purpose: { type: 'string' } } } } } }, responses: { '200': { description: 'Full markdown intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, cleaned_markdown: { type: 'string' }, lint_score: { type: 'number' }, content_type: { type: 'string' }, quality_assessment: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } } } },
      '/extract-structure': { post: { operationId: 'extractStructure', summary: 'Extract document structure and TOC', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['markdown'], properties: { markdown: { type: 'string' } } } } } }, responses: { '200': { description: 'Document structure', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, table_of_contents: { type: 'array', items: { type: 'object' } }, sections: { type: 'array', items: { type: 'object' } }, ...chainFields, privacy } } } } } } } },
      '/batch': { post: { operationId: 'batchMarkdown', summary: 'Batch lint up to 5 markdown items', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object' }, maxItems: 5 } } } } } }, responses: { '200': { description: 'Batch results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object' } }, ...chainFields } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
