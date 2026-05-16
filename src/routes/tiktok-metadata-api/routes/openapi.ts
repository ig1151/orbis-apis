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
      title: 'TikTok Metadata API',
      version: '2.0.0',
      description: 'Extract TikTok video and creator metadata, track audio trends, and identify viral content for influencer and content marketing agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 200, requests_per_month: 6000 }, pay_per_call: { video: '$0.002', user: '$0.002', trending: '$0.003', 'execution-gate': '$0.001', 'tiktok-intelligence': '$0.006', 'audio-trend': '$0.004', batch: '$0.008' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/tiktok-metadata' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/video': {
        post: {
          operationId: 'getVideoMetadata',
          summary: 'Get TikTok video metadata and engagement',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { video_url: { type: 'string' }, video_id: { type: 'string' } } } } } },
          responses: { '200': { description: 'TikTok video metadata', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, video_id: { type: 'string' }, video: { type: 'object', properties: { description: { type: 'string' }, author_username: { type: 'string' }, author_display_name: { type: 'string' }, author_followers: { type: 'integer' }, published_at: { type: 'string', format: 'date-time' }, duration_seconds: { type: 'integer' }, view_count: { type: 'integer' }, like_count: { type: 'integer' }, comment_count: { type: 'integer' }, share_count: { type: 'integer' }, hashtags: { type: 'array', items: { type: 'string' } }, audio_id: { type: 'string' }, audio_name: { type: 'string' }, is_trending: { type: 'boolean' }, trending_rank: { type: 'integer' } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/user': {
        post: {
          operationId: 'getUserProfile',
          summary: 'Get TikTok creator profile and stats',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' } } } } } },
          responses: { '200': { description: 'TikTok user profile', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, username: { type: 'string' }, profile: { type: 'object', properties: { display_name: { type: 'string' }, bio: { type: 'string' }, verified: { type: 'boolean' }, followers: { type: 'integer' }, following: { type: 'integer' }, likes_received: { type: 'integer' }, video_count: { type: 'integer' }, avg_views_per_video: { type: 'number' }, niche: { type: 'string' }, primary_audience_age: { type: 'string', enum: ['13-17', '18-24', '25-34', '35+'] }, top_hashtags: { type: 'array', items: { type: 'string' } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/trending': {
        post: {
          operationId: 'getTrending',
          summary: 'Get trending TikTok videos, hashtags, and sounds',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { category: { type: 'string' }, region: { type: 'string' } } } } } },
          responses: { '200': { description: 'Trending content', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, category: { type: 'string' }, region: { type: 'string' }, trending_videos: { type: 'array', items: { type: 'object', properties: { video_id: { type: 'string' }, description: { type: 'string' }, author: { type: 'string' }, view_count: { type: 'integer' }, like_count: { type: 'integer' }, hashtags: { type: 'array', items: { type: 'string' } }, trending_rank: { type: 'integer' } } } }, trending_hashtags: { type: 'array', items: { type: 'object', properties: { hashtag: { type: 'string' }, video_count: { type: 'integer' }, view_count: { type: 'integer' } } } }, trending_sounds: { type: 'array', items: { type: 'object', properties: { audio_name: { type: 'string' }, audio_id: { type: 'string' }, video_count: { type: 'integer' } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, blocking_flags: actions, next_api: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } },
        },
      },
      '/tiktok-intelligence': {
        post: {
          operationId: 'tiktokIntelligence',
          summary: 'ONE-CALL: profile + top videos + content patterns + brand fit',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full TikTok intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, username: { type: 'string' }, profile: { type: 'object', properties: { followers: { type: 'integer' }, avg_views: { type: 'number' }, niche: { type: 'string' }, verified: { type: 'boolean' } } }, top_videos: { type: 'array', items: { type: 'object', properties: { video_id: { type: 'string' }, description: { type: 'string' }, view_count: { type: 'integer' }, viral_score: { type: 'number' } } } }, content_patterns: { type: 'object', properties: { best_hashtags: { type: 'array', items: { type: 'string' } }, best_posting_time: { type: 'string' }, avg_duration_seconds: { type: 'number' } } }, brand_fit_score: { type: 'number', minimum: 0, maximum: 1 }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/audio-trend': {
        post: {
          operationId: 'audioTrend',
          summary: 'Analyze TikTok audio trend velocity and viral probability',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { audio_id: { type: 'string' }, audio_name: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Audio trend analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, audio_id: { type: 'string' }, audio_name: { type: 'string' },
                      trend_data: { type: 'object', properties: { video_count: { type: 'integer' }, total_views: { type: 'integer' }, trend_velocity: { type: 'number', minimum: 0, maximum: 1 }, viral_probability: { type: 'number', minimum: 0, maximum: 1 }, peak_date: { type: 'string', format: 'date' }, trend_stage: { type: 'string', enum: ['emerging', 'peak', 'declining', 'evergreen'] }, top_niches_using: { type: 'array', items: { type: 'string' } }, avg_views_per_video: { type: 'number' } } },
                      usage_by_creators: { type: 'object', properties: { nano: { type: 'number' }, micro: { type: 'number' }, macro: { type: 'number' }, mega: { type: 'number' } } },
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
          summary: 'Batch fetch TikTok video metadata (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['video_ids'], properties: { video_ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch TikTok video results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { video_id: { type: 'string' }, author: { type: 'string' }, view_count: { type: 'integer' }, like_count: { type: 'integer' }, hashtags: { type: 'array', items: { type: 'string' } }, is_trending: { type: 'boolean' } } } }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
