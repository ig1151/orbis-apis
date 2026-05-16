import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Event Search API', version: '1.0.0', description: 'Search local and virtual events, get venue details, and find ticket links for travel planning, sales prospecting, and community intelligence agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { events: '$0.003', venue: '$0.002', 'ticket-links': '$0.002', 'execution-gate': '$0.001', search: '$0.005' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/event-search' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/events': { post: { operationId: 'searchEvents', summary: 'Search events by location, date, and category', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' }, date: { type: 'string' }, category: { type: 'string' } } } } } }, responses: { '200': { description: 'Events found', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, events: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/venue': { post: { operationId: 'getVenue', summary: 'Get venue details by venue ID', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['venue_id'], properties: { venue_id: { type: 'string' } } } } } }, responses: { '200': { description: 'Venue details', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, venue: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/ticket-links': { post: { operationId: 'ticketLinks', summary: 'Find ticket purchase links for an event', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['event_id'], properties: { event_id: { type: 'string' } } } } } }, responses: { '200': { description: 'Ticket links', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, ticket_sources: { type: 'array', items: { type: 'object' } }, best_price: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/search': { post: { operationId: 'search', summary: 'ONE-CALL: full event intelligence — events + venue + tickets', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' }, date: { type: 'string' }, category: { type: 'string' } } } } } }, responses: { '200': { description: 'Full event intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, top_events: { type: 'array', items: { type: 'object' } }, featured_event: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
