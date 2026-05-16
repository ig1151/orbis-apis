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

const restaurantItem = {
  type: 'object',
  properties: {
    restaurant_id: { type: 'string' },
    name: { type: 'string' },
    cuisine: { type: 'string' },
    rating: { type: 'number', minimum: 0, maximum: 5 },
    price_range: { type: 'string', enum: ['$', '$$', '$$$', '$$$$'] },
    distance_miles: { type: 'number' },
    address: { type: 'string' },
    is_open: { type: 'boolean' },
    likely_wait_time_minutes: { type: 'integer', minimum: 0 },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Restaurant Search API',
      version: '2.0.0',
      description: 'Search nearby restaurants, get details and menus, and summarize reviews for travel, expense, and local business intelligence agents',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { nearby: '$0.003', details: '$0.002', 'reviews-summary': '$0.004', 'menu-analysis': '$0.004', 'reservation-availability': '$0.003', 'execution-gate': '$0.001', search: '$0.006', batch: '$0.009' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/restaurant-search' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/nearby': {
        post: {
          operationId: 'searchNearby',
          summary: 'Search nearby restaurants by location and cuisine',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['location'],
                  properties: {
                    location: { type: 'string', description: 'City, address or coordinates' },
                    cuisine: { type: 'string', description: 'Cuisine type filter (e.g. Italian, Thai)' },
                    radius_miles: { type: 'number', minimum: 0.1, maximum: 50, description: 'Search radius in miles' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Nearby restaurants',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      location: { type: 'string' },
                      restaurants: { type: 'array', items: restaurantItem },
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
      '/details': {
        post: {
          operationId: 'getDetails',
          summary: 'Get restaurant details and menu highlights',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['restaurant_id'],
                  properties: { restaurant_id: { type: 'string', description: 'Unique restaurant identifier' } },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Restaurant details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      restaurant_id: { type: 'string' },
                      details: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' }, cuisine: { type: 'string' }, address: { type: 'string' },
                          phone: { type: 'string' }, website: { type: 'string' },
                          hours: { type: 'object', additionalProperties: { type: 'string' } },
                          rating: { type: 'number', minimum: 0, maximum: 5 },
                          review_count: { type: 'integer' },
                          price_range: { type: 'string', enum: ['$', '$$', '$$$', '$$$$'] },
                          features: { type: 'array', items: { type: 'string' } },
                          menu_highlights: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, price: { type: 'string' }, description: { type: 'string' } } } },
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
      '/reviews-summary': {
        post: {
          operationId: 'reviewsSummary',
          summary: 'AI-summarized reviews for a restaurant',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['restaurant_id'],
                  properties: { restaurant_id: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Review summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      restaurant_id: { type: 'string' },
                      review_summary: {
                        type: 'object',
                        properties: {
                          overall_sentiment: { type: 'string', enum: ['positive', 'negative', 'mixed'] },
                          average_rating: { type: 'number', minimum: 0, maximum: 5 },
                          total_reviews: { type: 'integer' },
                          highlights: { type: 'array', items: { type: 'string' } },
                          complaints: { type: 'array', items: { type: 'string' } },
                          top_dishes_mentioned: { type: 'array', items: { type: 'string' } },
                          summary_paragraph: { type: 'string' },
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
      '/menu-analysis': {
        post: {
          operationId: 'menuAnalysis',
          summary: 'Analyze restaurant menu for dietary options, pricing, and top items',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['restaurant_id'],
                  properties: { restaurant_id: { type: 'string', description: 'Unique restaurant identifier' } },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Menu analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      restaurant_id: { type: 'string' },
                      menu_analysis: {
                        type: 'object',
                        properties: {
                          categories: { type: 'array', items: { type: 'string' } },
                          item_count: { type: 'integer' },
                          price_range_low: { type: 'string' },
                          price_range_high: { type: 'string' },
                          dietary_options: { type: 'array', items: { type: 'string', enum: ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher'] } },
                          top_rated_items: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, price: { type: 'string' }, rating: { type: 'number' }, description: { type: 'string' } } } },
                          seasonal_items: { type: 'array', items: { type: 'string' } },
                          chef_specials: { type: 'array', items: { type: 'string' } },
                        },
                      },
                      value_score: { type: 'number', minimum: 0, maximum: 1 },
                      menu_diversity_score: { type: 'number', minimum: 0, maximum: 1 },
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
      '/reservation-availability': {
        post: {
          operationId: 'reservationAvailability',
          summary: 'Check reservation availability for a party size and date',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['restaurant_id', 'party_size', 'date'],
                  properties: {
                    restaurant_id: { type: 'string' },
                    party_size: { type: 'integer', minimum: 1, maximum: 50, description: 'Number of guests' },
                    date: { type: 'string', format: 'date', description: 'Reservation date (YYYY-MM-DD)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Reservation availability',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      restaurant_id: { type: 'string' },
                      party_size: { type: 'integer' },
                      date: { type: 'string' },
                      availability: {
                        type: 'object',
                        properties: {
                          available: { type: 'boolean' },
                          available_times: { type: 'array', items: { type: 'string' } },
                          recommended_time: { type: 'string' },
                          reservation_url: { type: 'string' },
                          deposit_required: { type: 'boolean' },
                          deposit_amount: { type: 'string' },
                          cancellation_policy: { type: 'string' },
                        },
                      },
                      wait_time_if_walk_in_minutes: { type: 'integer', minimum: 0 },
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
                schema: {
                  type: 'object',
                  required: ['location'],
                  properties: { location: { type: 'string' }, objective: { type: 'string' } },
                },
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
                    properties: {
                      ...traceFields,
                      execution_ready: { type: 'boolean' },
                      next_api: { type: 'string' },
                      blocking_flags: actions,
                      ...chainFields,
                      confidence_per_section: confidence,
                      privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/search': {
        post: {
          operationId: 'search',
          summary: 'ONE-CALL: full restaurant intelligence — nearby + details + reviews',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['location'],
                  properties: {
                    location: { type: 'string' },
                    cuisine: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full restaurant intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      location: { type: 'string' },
                      top_restaurants: { type: 'array', items: restaurantItem },
                      category_breakdown: { type: 'object', properties: { fine_dining: { type: 'integer' }, casual: { type: 'integer' }, fast_food: { type: 'integer' }, cafes: { type: 'integer' } } },
                      best_value_pick: { type: 'object', properties: { name: { type: 'string' }, reason: { type: 'string' } } },
                      best_rated_pick: { type: 'object', properties: { name: { type: 'string' }, reason: { type: 'string' } } },
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
          operationId: 'batchNearby',
          summary: 'Batch search restaurants for multiple locations (max 10)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['locations'],
                  properties: {
                    locations: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10, description: 'List of locations to search' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Batch restaurant results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      batch_count: { type: 'integer' },
                      results: { type: 'array', items: { type: 'object', properties: { location: { type: 'string' }, restaurants: { type: 'array', items: restaurantItem }, total_found: { type: 'integer' } } } },
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
