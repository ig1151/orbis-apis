import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Maps Places API', version: '1.0.0', description: 'Search places by query or category, get detailed place info, and find nearby points of interest for location-aware agents and logistics workflows', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { 'search-place': '$0.002', 'place-details': '$0.002', nearby: '$0.003', 'execution-gate': '$0.001', lookup: '$0.005' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/maps-places' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/search-place': { post: { operationId: 'searchPlace', summary: 'Search places by text query', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, location: { type: 'string' } } } } } }, responses: { '200': { description: 'Places found', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, places: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/place-details': { post: { operationId: 'placeDetails', summary: 'Get full details for a place by ID', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['place_id'], properties: { place_id: { type: 'string' } } } } } }, responses: { '200': { description: 'Place details', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, details: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/nearby': { post: { operationId: 'nearbyPlaces', summary: 'Find nearby points of interest by type', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location', 'type'], properties: { location: { type: 'string' }, type: { type: 'string' } } } } } }, responses: { '200': { description: 'Nearby places', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, places: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/lookup': { post: { operationId: 'lookup', summary: 'ONE-CALL: full place intelligence — search + details + nearby', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, location: { type: 'string' } } } } } }, responses: { '200': { description: 'Full place intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, top_places: { type: 'array', items: { type: 'object' } }, best_match: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
