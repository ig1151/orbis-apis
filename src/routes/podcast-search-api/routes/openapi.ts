import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };
const provenance = { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } };
const chainFields = { source_provenance: provenance, cache_ttl_seconds: { type: 'integer' }, cache_recommended: { type: 'boolean' }, recommended_next_api: { type: 'string' }, recommended_next_endpoint: { type: 'string' }, automation_safe: { type: 'boolean' } };

const podcastItem = { type: 'object', properties: { podcast_id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, host: { type: 'string' }, category: { type: 'string' }, language: { type: 'string' }, episode_count: { type: 'integer' }, subscribers: { type: 'integer' }, rating: { type: 'number', minimum: 0, maximum: 5 }, rss_url: { type: 'string' }, website: { type: 'string' } } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Podcast Search API',
      version: '2.0.0',
      description: 'Search podcasts, get episode details, extract quotes, and analyze guests for media research, advertising, and content intelligence agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { search: '$0.003', 'episode-details': '$0.003', 'podcast-details': '$0.003', 'execution-gate': '$0.001', 'podcast-intelligence': '$0.006', 'quote-extraction': '$0.005', batch: '$0.010' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/podcast-search' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/search': {
        post: {
          operationId: 'searchPodcasts',
          summary: 'Search podcasts by topic, host, or keyword',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, category: { type: 'string' }, language: { type: 'string' } } } } } },
          responses: { '200': { description: 'Podcast search results', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, query: { type: 'string' }, podcasts: { type: 'array', items: podcastItem }, total_found: { type: 'integer' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/episode-details': {
        post: {
          operationId: 'getEpisodeDetails',
          summary: 'Get full episode details including guests and topics',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { episode_id: { type: 'string' }, podcast_id: { type: 'string' } } } } } },
          responses: { '200': { description: 'Episode details', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, episode_id: { type: 'string' }, episode: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, published_at: { type: 'string', format: 'date-time' }, duration_seconds: { type: 'integer' }, episode_number: { type: 'integer' }, guests: { type: 'array', items: { type: 'string' } }, topics: { type: 'array', items: { type: 'string' } }, audio_url: { type: 'string' }, transcript_available: { type: 'boolean' }, downloads: { type: 'integer' }, rating: { type: 'number' } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/podcast-details': {
        post: {
          operationId: 'getPodcastDetails',
          summary: 'Get full podcast details including recent episodes and notable guests',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['podcast_id'], properties: { podcast_id: { type: 'string' } } } } } },
          responses: { '200': { description: 'Podcast details', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, podcast_id: { type: 'string' }, podcast: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, host: { type: 'string' }, category: { type: 'string' }, language: { type: 'string' }, episode_count: { type: 'integer' }, subscribers: { type: 'integer' }, rating: { type: 'number' }, started_date: { type: 'string', format: 'date' }, last_episode_date: { type: 'string', format: 'date' }, publish_frequency: { type: 'string', enum: ['daily', 'weekly', 'biweekly', 'monthly'] }, rss_url: { type: 'string' }, website: { type: 'string' }, recent_episodes: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, published: { type: 'string' }, duration_seconds: { type: 'integer' } } } }, notable_guests: { type: 'array', items: { type: 'string' } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, blocking_flags: actions, next_api: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } },
        },
      },
      '/podcast-intelligence': {
        post: {
          operationId: 'podcastIntelligence',
          summary: 'ONE-CALL: search + top podcasts + trending topics + advertising fit',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full podcast intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, query: { type: 'string' }, top_podcasts: { type: 'array', items: podcastItem }, trending_topics: { type: 'array', items: { type: 'string' } }, notable_guests_found: { type: 'array', items: { type: 'string' } }, best_for_advertising: { type: 'object', properties: { podcast_id: { type: 'string' }, reason: { type: 'string' } } }, best_for_research: { type: 'object', properties: { podcast_id: { type: 'string' }, reason: { type: 'string' } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/quote-extraction': {
        post: {
          operationId: 'quoteExtraction',
          summary: 'Extract notable quotes, guest entities, and controversial segments from a podcast episode',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { episode_id: { type: 'string' }, podcast_id: { type: 'string' }, topic: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Quote extraction',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, episode_id: { type: 'string' },
                      quotes: { type: 'array', items: { type: 'object', properties: { quote: { type: 'string' }, speaker: { type: 'string' }, timestamp_seconds: { type: 'integer' }, topic: { type: 'string' }, shareability_score: { type: 'number', minimum: 0, maximum: 1 } } } },
                      topics: { type: 'array', items: { type: 'string' } },
                      guest_entities: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, organization: { type: 'string' }, role: { type: 'string' } } } },
                      controversial_segments: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, timestamp_seconds: { type: 'integer' }, controversy_score: { type: 'number', minimum: 0, maximum: 1 } } } },
                      key_insights: { type: 'array', items: { type: 'string' } },
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
          summary: 'Batch search podcasts for multiple queries (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['queries'], properties: { queries: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch podcast results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { query: { type: 'string' }, podcasts: { type: 'array', items: podcastItem }, total_found: { type: 'integer' } } } }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
