import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };
const provenance = { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } };
const chainFields = { source_provenance: provenance, cache_ttl_seconds: { type: 'integer' }, cache_recommended: { type: 'boolean' }, recommended_next_api: { type: 'string' }, recommended_next_endpoint: { type: 'string' }, automation_safe: { type: 'boolean' } };

const eventItem = { type: 'object', properties: { event_id: { type: 'string' }, name: { type: 'string' }, category: { type: 'string' }, date: { type: 'string', format: 'date' }, time: { type: 'string' }, venue: { type: 'string' }, address: { type: 'string' }, price_range: { type: 'string' }, ticket_url: { type: 'string' }, is_free: { type: 'boolean' }, distance_miles: { type: 'number' }, attendee_estimate: { type: 'integer' } } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Event Search API',
      version: '2.0.0',
      description: 'Search local and virtual events, estimate attendee profiles, and discover business networking opportunities for sales and event intelligence agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { search: '$0.003', details: '$0.002', 'category-filter': '$0.002', 'execution-gate': '$0.001', discover: '$0.006', 'attendee-profile-estimate': '$0.004', batch: '$0.008' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/event-search' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/search': {
        post: {
          operationId: 'searchEvents',
          summary: 'Search events by location, category, and date range',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' }, category: { type: 'string' }, date_from: { type: 'string', format: 'date' }, date_to: { type: 'string', format: 'date' }, radius_miles: { type: 'number', minimum: 1, maximum: 100 } } } } } },
          responses: { '200': { description: 'Event search results', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, location: { type: 'string' }, events: { type: 'array', items: eventItem }, total_found: { type: 'integer' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/details': {
        post: {
          operationId: 'getEventDetails',
          summary: 'Get full event details including organizer, capacity, and tags',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['event_id'], properties: { event_id: { type: 'string' } } } } } },
          responses: { '200': { description: 'Event details', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, event_id: { type: 'string' }, details: { type: 'object', properties: { name: { type: 'string' }, category: { type: 'string' }, description: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' }, end_time: { type: 'string' }, venue: { type: 'string' }, address: { type: 'string' }, organizer: { type: 'string' }, website: { type: 'string' }, ticket_url: { type: 'string' }, price_min: { type: 'number' }, price_max: { type: 'number' }, is_free: { type: 'boolean' }, capacity: { type: 'integer' }, attendee_estimate: { type: 'integer' }, tags: { type: 'array', items: { type: 'string' } }, age_restriction: { type: 'string' } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/category-filter': {
        post: {
          operationId: 'categoryFilter',
          summary: 'Filter events strictly by category in a location',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location', 'category'], properties: { location: { type: 'string' }, category: { type: 'string' } } } } } },
          responses: { '200': { description: 'Category-filtered events', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, location: { type: 'string' }, category: { type: 'string' }, events: { type: 'array', items: eventItem }, total_found: { type: 'integer' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, blocking_flags: actions, next_api: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } },
        },
      },
      '/discover': {
        post: {
          operationId: 'discoverEvents',
          summary: 'ONE-CALL: full event intelligence — search + breakdown + best picks',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' }, category: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full event intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, location: { type: 'string' }, top_events: { type: 'array', items: eventItem }, category_breakdown: { type: 'object', properties: { music: { type: 'integer' }, sports: { type: 'integer' }, arts: { type: 'integer' }, business: { type: 'integer' }, food: { type: 'integer' } } }, best_free_pick: { type: 'object', properties: { name: { type: 'string' }, reason: { type: 'string' } } }, best_premium_pick: { type: 'object', properties: { name: { type: 'string' }, reason: { type: 'string' } } }, upcoming_this_week: { type: 'integer' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/attendee-profile-estimate': {
        post: {
          operationId: 'attendeeProfileEstimate',
          summary: 'Estimate attendee demographics, networking value, and business relevance for an event',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { event_id: { type: 'string' }, event_name: { type: 'string' }, category: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Attendee profile estimate',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      event_id: { type: 'string' },
                      attendee_profile: { type: 'object', properties: { estimated_count: { type: 'integer' }, age_distribution: { type: 'object', additionalProperties: { type: 'number' } }, professional_mix: { type: 'object', properties: { executives: { type: 'number' }, managers: { type: 'number' }, individual_contributors: { type: 'number' }, students: { type: 'number' } } }, interests: { type: 'array', items: { type: 'string' } }, income_bracket: { type: 'string' } } },
                      networking_value: { type: 'number', minimum: 0, maximum: 1 },
                      business_relevance: { type: 'number', minimum: 0, maximum: 1 },
                      audience_quality: { type: 'number', minimum: 0, maximum: 1 },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/batch': {
        post: {
          operationId: 'batchSearch',
          summary: 'Batch search events for multiple locations (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['locations'], properties: { locations: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch event results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { location: { type: 'string' }, events: { type: 'array', items: eventItem }, total_found: { type: 'integer' } } } }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
