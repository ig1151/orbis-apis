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
      title: 'Social Profile Lookup API',
      version: '2.0.0',
      description: 'Lookup social profiles, analyze engagement, map audiences, and build buyer personas for influencer marketing and sales intelligence agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { lookup: '$0.003', 'engagement-stats': '$0.003', 'audience-analysis': '$0.004', 'execution-gate': '$0.001', 'profile-intelligence': '$0.007', 'persona-analysis': '$0.005', batch: '$0.010' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/social-profile-lookup' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/lookup': {
        post: {
          operationId: 'lookupProfile',
          summary: 'Look up a social profile by username and platform',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' }, platform: { type: 'string', enum: ['twitter', 'instagram', 'linkedin', 'tiktok', 'all'] } } } } } },
          responses: { '200': { description: 'Profile data', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, username: { type: 'string' }, platform: { type: 'string' }, profile: { type: 'object', properties: { display_name: { type: 'string' }, bio: { type: 'string' }, location: { type: 'string' }, website: { type: 'string' }, verified: { type: 'boolean' }, followers: { type: 'integer' }, following: { type: 'integer' }, posts_count: { type: 'integer' }, joined_date: { type: 'string', format: 'date' }, profile_url: { type: 'string' }, avatar_url: { type: 'string' } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/engagement-stats': {
        post: {
          operationId: 'engagementStats',
          summary: 'Get engagement statistics and rate for a profile',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' }, platform: { type: 'string' } } } } } },
          responses: { '200': { description: 'Engagement stats', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, username: { type: 'string' }, engagement: { type: 'object', properties: { avg_likes_per_post: { type: 'number' }, avg_comments_per_post: { type: 'number' }, avg_shares_per_post: { type: 'number' }, engagement_rate: { type: 'number', minimum: 0, maximum: 1 }, engagement_tier: { type: 'string', enum: ['nano', 'micro', 'macro', 'mega'] }, best_posting_times: { type: 'array', items: { type: 'string' } }, top_content_types: { type: 'array', items: { type: 'string' } }, recent_trend: { type: 'string', enum: ['growing', 'declining', 'stable'] } } }, audience_quality_score: { type: 'number', minimum: 0, maximum: 1 }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/audience-analysis': {
        post: {
          operationId: 'audienceAnalysis',
          summary: 'Analyze audience demographics and quality for a profile',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' }, platform: { type: 'string' } } } } } },
          responses: { '200': { description: 'Audience analysis', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, username: { type: 'string' }, audience: { type: 'object', properties: { size: { type: 'integer' }, gender_split: { type: 'object', properties: { male: { type: 'number' }, female: { type: 'number' }, other: { type: 'number' } } }, age_distribution: { type: 'object', additionalProperties: { type: 'number' } }, top_locations: { type: 'array', items: { type: 'string' } }, top_interests: { type: 'array', items: { type: 'string' } }, fake_follower_pct: { type: 'number', minimum: 0, maximum: 1 }, authentic_reach: { type: 'integer' } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
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
      '/profile-intelligence': {
        post: {
          operationId: 'profileIntelligence',
          summary: 'ONE-CALL: profile + engagement + audience + persona archetype',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' }, platform: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full profile intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, username: { type: 'string' }, profile: { type: 'object', properties: { display_name: { type: 'string' }, bio: { type: 'string' }, followers: { type: 'integer' }, verified: { type: 'boolean' } } }, engagement: { type: 'object', properties: { engagement_rate: { type: 'number' }, avg_likes: { type: 'number' }, trend: { type: 'string', enum: ['growing', 'stable', 'declining'] } } }, audience_summary: { type: 'object', properties: { top_locations: { type: 'array', items: { type: 'string' } }, top_interests: { type: 'array', items: { type: 'string' } }, fake_pct: { type: 'number' } } }, persona_archetype: { type: 'string', enum: ['thought-leader', 'entertainer', 'educator', 'influencer', 'brand'] }, outreach_score: { type: 'number', minimum: 0, maximum: 1 }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/persona-analysis': {
        post: {
          operationId: 'personaAnalysis',
          summary: 'Build buyer persona and outreach recommendations for a social profile',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' }, platform: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Persona analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, username: { type: 'string' },
                      archetype: { type: 'string', enum: ['thought-leader', 'entertainer', 'educator', 'influencer', 'brand', 'activist'] },
                      buyer_persona: { type: 'object', properties: { persona_name: { type: 'string' }, job_title_estimate: { type: 'string' }, industry_estimate: { type: 'string' }, pain_points: { type: 'array', items: { type: 'string' } }, motivations: { type: 'array', items: { type: 'string' } }, preferred_content_types: { type: 'array', items: { type: 'string' } } } },
                      outreach_recommendations: { type: 'array', items: { type: 'object', properties: { channel: { type: 'string' }, message_tone: { type: 'string' }, best_timing: { type: 'string' }, expected_response_rate: { type: 'number' } } } },
                      decision_maker_probability: { type: 'number', minimum: 0, maximum: 1 },
                      influencer_tier: { type: 'string', enum: ['nano', 'micro', 'macro', 'mega'] },
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
          operationId: 'batchLookup',
          summary: 'Batch lookup social profiles (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['usernames'], properties: { usernames: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch profiles', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { username: { type: 'string' }, display_name: { type: 'string' }, followers: { type: 'integer' }, engagement_rate: { type: 'number' }, verified: { type: 'boolean' }, platform: { type: 'string' } } } }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
