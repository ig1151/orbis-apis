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
    info: {
      title: 'YouTube Metadata API',
      version: '2.0.0',
      description: 'Extract YouTube video and channel metadata, analyze thumbnails, detect sponsors, and build content intelligence for research and marketing agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 200, requests_per_month: 6000 }, pay_per_call: { video: '$0.002', channel: '$0.003', search: '$0.003', 'execution-gate': '$0.001', 'youtube-intelligence': '$0.006', 'thumbnail-analysis': '$0.004', batch: '$0.008' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/youtube-metadata' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/video': {
        post: {
          operationId: 'getVideoMetadata',
          summary: 'Get metadata for a YouTube video',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { video_url: { type: 'string' }, video_id: { type: 'string' } } } } } },
          responses: { '200': { description: 'Video metadata', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, video_id: { type: 'string' }, video: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, channel: { type: 'string' }, channel_id: { type: 'string' }, published_at: { type: 'string', format: 'date-time' }, duration_seconds: { type: 'integer' }, view_count: { type: 'integer' }, like_count: { type: 'integer' }, comment_count: { type: 'integer' }, category: { type: 'string' }, language: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, thumbnail_url: { type: 'string' }, is_live: { type: 'boolean' }, is_short: { type: 'boolean' } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/channel': {
        post: {
          operationId: 'getChannelMetadata',
          summary: 'Get metadata for a YouTube channel',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { channel_url: { type: 'string' }, channel_id: { type: 'string' } } } } } },
          responses: { '200': { description: 'Channel metadata', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, channel_id: { type: 'string' }, channel: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, created_at: { type: 'string' }, subscriber_count: { type: 'integer' }, video_count: { type: 'integer' }, total_views: { type: 'integer' }, country: { type: 'string' }, niche: { type: 'string' }, verified: { type: 'boolean' }, upload_frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] }, top_categories: { type: 'array', items: { type: 'string' } }, recent_videos: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, views: { type: 'integer' }, published: { type: 'string' } } } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/search': {
        post: {
          operationId: 'searchVideos',
          summary: 'Search YouTube videos by query and category',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, category: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 50 } } } } } },
          responses: { '200': { description: 'Search results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, query: { type: 'string' }, results: { type: 'array', items: { type: 'object', properties: { video_id: { type: 'string' }, title: { type: 'string' }, channel: { type: 'string' }, view_count: { type: 'integer' }, like_count: { type: 'integer' }, duration_seconds: { type: 'integer' }, published_at: { type: 'string' }, relevance_score: { type: 'number', minimum: 0, maximum: 1 } } } }, total_results: { type: 'integer' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['video_url'], properties: { video_url: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, blocking_flags: actions, next_api: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } },
        },
      },
      '/youtube-intelligence': {
        post: {
          operationId: 'youtubeIntelligence',
          summary: 'ONE-CALL: video + channel + content themes + sponsor signals',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['video_url'], properties: { video_url: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full YouTube intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, video_url: { type: 'string' }, video: { type: 'object', properties: { title: { type: 'string' }, channel: { type: 'string' }, views: { type: 'integer' }, likes: { type: 'integer' }, duration_seconds: { type: 'integer' } } }, channel_summary: { type: 'object', properties: { subscriber_count: { type: 'integer' }, niche: { type: 'string' }, upload_frequency: { type: 'string' } } }, content_themes: { type: 'array', items: { type: 'string' } }, audience_sentiment: { type: 'string', enum: ['positive', 'negative', 'mixed'] }, seo_keywords: { type: 'array', items: { type: 'string' } }, monetization_signals: { type: 'object', properties: { has_sponsors: { type: 'boolean' }, sponsor_names: { type: 'array', items: { type: 'string' } }, estimated_cpm: { type: 'number' } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/thumbnail-analysis': {
        post: {
          operationId: 'thumbnailAnalysis',
          summary: 'Analyze YouTube thumbnail for CTR score, sponsor mentions, and audience sentiment',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { video_url: { type: 'string' }, video_id: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Thumbnail analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, video_id: { type: 'string' },
                      thumbnail: { type: 'object', properties: { url: { type: 'string' }, content_topics: { type: 'array', items: { type: 'string' } }, faces_detected: { type: 'integer' }, text_overlay: { type: 'string' }, dominant_colors: { type: 'array', items: { type: 'string' } }, emotional_tone: { type: 'string', enum: ['exciting', 'calm', 'urgent', 'informative', 'humorous'] }, ctr_score: { type: 'number', minimum: 0, maximum: 1 } } },
                      sponsor_mentions: { type: 'array', items: { type: 'string' } },
                      audience_sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
                      clickbait_score: { type: 'number', minimum: 0, maximum: 1 },
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
          operationId: 'batchVideos',
          summary: 'Batch fetch metadata for multiple YouTube videos (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['video_ids'], properties: { video_ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch video metadata', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { video_id: { type: 'string' }, title: { type: 'string' }, channel: { type: 'string' }, view_count: { type: 'integer' }, like_count: { type: 'integer' }, duration_seconds: { type: 'integer' }, published_at: { type: 'string' } } } }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
