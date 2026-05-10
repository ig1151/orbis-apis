import { Router, Request, Response } from 'express';
export const openapiRouter = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
openapiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Lead Enrichment API', version: '2.0.0', description: 'Enrich leads with firmographic, demographic, technographic and contact data. Returns structured lead profiles with source confidence scoring.', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { enrich: '$0.006', batch: '$0.015' }, high_volume: { enrich: '$0.004', batch: '$0.009' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/lead-enrichment' }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': { post: { operationId: 'enrichLead', summary: 'Enrich a lead with firmographic, demographic, technographic and contact data', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' }, name: { type: 'string' }, company: { type: 'string' }, enrich_fields: { type: 'array', items: { type: 'string' } } } } } } }, responses: { '200': { description: 'Enriched lead', content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, name: { type: 'string' }, title: { type: 'string' }, company: { type: 'string' }, company_size: { type: 'string' }, industry: { type: 'string' }, location: { type: 'string' }, linkedin_url: { type: 'string', nullable: true }, phone: { type: 'string', nullable: true }, technologies: actions, social_profiles: { type: 'object' }, data_quality_score: { type: 'number', minimum: 0, maximum: 1 }, sources: actions, source_confidence: { type: 'object', additionalProperties: { type: 'number' } }, last_verified_at: { type: 'string', format: 'date-time' }, field_freshness: { type: 'object', additionalProperties: { type: 'string' } }, chain_to: { type: 'array', items: { type: 'string' } }, recommended_actions_priority_order: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, privacy } } } } }, '400': { description: 'Missing email' }, '500': { description: 'Enrichment failed' } } } },
      '/batch': { post: { operationId: 'enrichLeadsBatch', summary: 'Batch enrich multiple leads in one request', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['leads'], properties: { leads: { type: 'array', items: { type: 'object', properties: { email: { type: 'string' }, name: { type: 'string' }, company: { type: 'string' } } }, maxItems: 20 } } } } } }, responses: { '200': { description: 'Batch enrichment results', content: { 'application/json': { schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } }, total: { type: 'number' }, success_count: { type: 'number' }, privacy } } } } }, '400': { description: 'Missing leads' }, '500': { description: 'Batch failed' } } } }
    }
  });
});
