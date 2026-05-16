import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };
const provenance = { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } };
const chainFields = {
  source_provenance: provenance,
  cache_ttl_seconds: { type: 'integer' },
  cache_recommended: { type: 'boolean' },
  recommended_next_api: { type: 'string' },
  recommended_next_endpoint: { type: 'string' },
  automation_safe: { type: 'boolean' },
};

const placeItem = {
  type: 'object',
  properties: {
    place_id: { type: 'string' },
    name: { type: 'string' },
    address: { type: 'string' },
    type: { type: 'string' },
    rating: { type: 'number', minimum: 0, maximum: 5 },
    lat: { type: 'number' },
    lng: { type: 'number' },
    open_now: { type: 'boolean' },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Maps Places API',
      version: '2.0.0',
      description: 'Search places by query or category, get detailed place info, and find nearby points of interest for location-aware agents and logistics workflows',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { 'search-place': '$0.002', 'place-details': '$0.002', nearby: '$0.003', 'travel-time': '$0.003', 'execution-gate': '$0.001', lookup: '$0.005', batch: '$0.009' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/maps-places' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/search-place': {
        post: {
          operationId: 'searchPlace',
          summary: 'Search places by text query',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string', description: 'Text search query (e.g. coffee shop, dentist)' },
                    location: { type: 'string', description: 'Location context for search' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Places found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      query: { type: 'string' },
                      places: { type: 'array', items: placeItem },
                      total_found: { type: 'integer' },
                      ...chainFields,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/place-details': {
        post: {
          operationId: 'placeDetails',
          summary: 'Get full details for a place by ID',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['place_id'],
                  properties: { place_id: { type: 'string', description: 'Unique place identifier' } },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Place details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      place_id: { type: 'string' },
                      details: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' }, address: { type: 'string' }, phone: { type: 'string' },
                          website: { type: 'string' }, lat: { type: 'number' }, lng: { type: 'number' },
                          type: { type: 'string' },
                          hours: { type: 'object', additionalProperties: { type: 'string' } },
                          rating: { type: 'number', minimum: 0, maximum: 5 },
                          review_count: { type: 'integer' },
                          price_level: { type: 'integer', minimum: 0, maximum: 4 },
                          photos: { type: 'array', items: { type: 'string' } },
                          amenities: { type: 'array', items: { type: 'string' } },
                          walkability_score: { type: 'number', minimum: 0, maximum: 1 },
                          parking_availability: { type: 'string', enum: ['street', 'garage', 'lot', 'valet', 'none'] },
                        },
                      },
                      ...chainFields,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/nearby': {
        post: {
          operationId: 'nearbyPlaces',
          summary: 'Find nearby points of interest by type',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['location', 'type'],
                  properties: {
                    location: { type: 'string', description: 'Center location for search' },
                    type: { type: 'string', description: 'Place type (e.g. restaurant, hotel, gas_station)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Nearby places',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      location: { type: 'string' },
                      type: { type: 'string' },
                      places: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            place_id: { type: 'string' }, name: { type: 'string' }, address: { type: 'string' },
                            distance_meters: { type: 'number' }, rating: { type: 'number' }, open_now: { type: 'boolean' },
                          },
                        },
                      },
                      total_found: { type: 'integer' },
                      ...chainFields,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/travel-time': {
        post: {
          operationId: 'travelTime',
          summary: 'Calculate travel time between two points by mode of transport',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['origin', 'destination'],
                  properties: {
                    origin: { type: 'string', description: 'Starting address or coordinates' },
                    destination: { type: 'string', description: 'Destination address or coordinates' },
                    mode: { type: 'string', enum: ['driving', 'walking', 'transit'], description: 'Mode of transport', default: 'driving' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Travel time result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      origin: { type: 'string' },
                      destination: { type: 'string' },
                      mode: { type: 'string', enum: ['driving', 'walking', 'transit'] },
                      travel: {
                        type: 'object',
                        properties: {
                          duration_minutes: { type: 'number' },
                          distance_km: { type: 'number' },
                          distance_miles: { type: 'number' },
                          route_summary: { type: 'string' },
                          traffic_condition: { type: 'string', enum: ['light', 'moderate', 'heavy'] },
                          estimated_arrival: { type: 'string' },
                          alternative_routes: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, duration_minutes: { type: 'number' }, distance_km: { type: 'number' } } } },
                        },
                      },
                      ...chainFields,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, objective: { type: 'string' } } },
              },
            },
          },
          responses: {
            '200': {
              description: 'Gate result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, ...chainFields, confidence_per_section: confidence, privacy },
                  },
                },
              },
            },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'lookup',
          summary: 'ONE-CALL: full place intelligence — search + details + nearby',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, location: { type: 'string' } } },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full place intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      query: { type: 'string' },
                      top_places: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            place_id: { type: 'string' }, name: { type: 'string' }, address: { type: 'string' },
                            type: { type: 'string' }, rating: { type: 'number' }, lat: { type: 'number' }, lng: { type: 'number' },
                            hours: { type: 'string' }, phone: { type: 'string' }, website: { type: 'string' },
                            walkability_score: { type: 'number', minimum: 0, maximum: 1 },
                            parking_availability: { type: 'string', enum: ['street', 'garage', 'lot', 'valet', 'none'] },
                          },
                        },
                      },
                      nearby_alternatives: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' }, distance_meters: { type: 'number' } } } },
                      best_match: { type: 'object', properties: { place_id: { type: 'string' }, name: { type: 'string' }, reason: { type: 'string' } } },
                      ...chainFields,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
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
          summary: 'Batch search places for multiple queries (max 10)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['queries'],
                  properties: { queries: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Batch place search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      batch_count: { type: 'integer' },
                      results: { type: 'array', items: { type: 'object', properties: { query: { type: 'string' }, places: { type: 'array', items: placeItem }, total_found: { type: 'integer' } } } },
                      ...chainFields,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
