import { Router, Request, Response } from 'express';
export const openapiRouter = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
openapiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Lead Quality API', version: '2.0.0', description: 'Score lead quality across fit, intent and data completeness dimensions. Returns structured quality scores for sales pipeline prioritization.', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { score: '$0.005', batch: '$0.012' }, high_volume: { score: '$0.003', batch: '$0.007' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/lead-quality' }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': { post: { operationId: 'scoreLeadQuality', summary: 'Score lead quality across fit, intent and data completeness dimensions', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['lead'], properties: { lead: { type: 'object', properties: { email: { type: 'string' }, name: { type: 'string' }, company: { type: 'string' }, title: { type: 'string' }, industry: { type: 'string' } } }, icp: { type: 'object' }, scoring_weights: { type: 'object' } } } } } }, responses: { '200': { description: 'Lead quality score', content: { 'application/json': { schema: { type: 'object', properties: { overall_score: { type: 'number', minimum: 0, maximum: 1 }, grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] }, dimensions: { type: 'object', properties: { fit_score: { type: 'number', minimum: 0, maximum: 1 }, intent_score: { type: 'number', minimum: 0, maximum: 1 }, data_completeness: { type: 'number', minimum: 0, maximum: 1 }, engagement_score: { type: 'number', minimum: 0, maximum: 1 } } }, strengths: actions, weaknesses: actions, recommended_action: { type: 'string', enum: ['prioritize', 'nurture', 'deprioritize', 'disqualify'] }, next_best_action: { type: 'string' }, dimension_explanations: { type: 'object', properties: { fit: { type: 'string' }, intent: { type: 'string' }, data_completeness: { type: 'string' }, engagement: { type: 'string' } } }, improvement_suggestions: { type: 'array', items: { type: 'string' } }, confidence_per_section: confidence, privacy } } } } }, '400': { description: 'Missing lead' }, '500': { description: 'Scoring failed' } } } },
      '/batch': { post: { operationId: 'scoreLeadsBatch', summary: 'Batch score multiple leads for pipeline prioritization', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['leads'], properties: { leads: { type: 'array', items: { type: 'object' }, maxItems: 50 }, icp: { type: 'object' } } } } } }, responses: { '200': { description: 'Batch scores', content: { 'application/json': { schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } }, average_score: { type: 'number' }, grade_distribution: { type: 'object' }, privacy } } } } }, '400': { description: 'Missing leads' }, '500': { description: 'Batch failed' } } } }
    }
  });
});

export const docsRouter = openapiRouter;
