import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Restaurant Search API', version: '1.0.0', description: 'Search nearby restaurants, get details and menus, and summarize reviews for travel, expense, and local business intelligence agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { nearby: '$0.003', details: '$0.002', 'reviews-summary': '$0.004', 'execution-gate': '$0.001', search: '$0.006' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/restaurant-search' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/nearby': { post: { operationId: 'searchNearby', summary: 'Search nearby restaurants by location and cuisine', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' }, cuisine: { type: 'string' }, radius_miles: { type: 'number' } } } } } }, responses: { '200': { description: 'Nearby restaurants', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, restaurants: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/details': { post: { operationId: 'getDetails', summary: 'Get restaurant details and menu highlights', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['restaurant_id'], properties: { restaurant_id: { type: 'string' } } } } } }, responses: { '200': { description: 'Restaurant details', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, details: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/reviews-summary': { post: { operationId: 'reviewsSummary', summary: 'AI-summarized reviews for a restaurant', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['restaurant_id'], properties: { restaurant_id: { type: 'string' } } } } } }, responses: { '200': { description: 'Review summary', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, review_summary: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/search': { post: { operationId: 'search', summary: 'ONE-CALL: full restaurant intelligence — nearby + details + reviews', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' }, cuisine: { type: 'string' } } } } } }, responses: { '200': { description: 'Full restaurant intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, top_restaurants: { type: 'array', items: { type: 'object' } }, best_value_pick: { type: 'object' }, best_rated_pick: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
