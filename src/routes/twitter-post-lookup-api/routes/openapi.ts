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
      title: 'Twitter Post Lookup API',
      version: '2.0.0',
      description: 'Lookup tweets, analyze engagement, summarize threads, and track viral momentum for brand monitoring and social intelligence agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 200, requests_per_month: 6000 }, pay_per_call: { tweet: '$0.002', 'user-tweets': '$0.003', 'engagement-analysis': '$0.003', 'execution-gate': '$0.001', 'twitter-intelligence': '$0.006', 'thread-summary': '$0.004', batch: '$0.008' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/twitter-post-lookup' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/tweet': {
        post: {
          operationId: 'getTweet',
          summary: 'Get tweet metadata and engagement by URL or ID',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { tweet_url: { type: 'string' }, tweet_id: { type: 'string' } } } } } },
          responses: { '200': { description: 'Tweet data', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, tweet_id: { type: 'string' }, tweet: { type: 'object', properties: { text: { type: 'string' }, author_username: { type: 'string' }, author_display_name: { type: 'string' }, author_followers: { type: 'integer' }, verified: { type: 'boolean' }, posted_at: { type: 'string', format: 'date-time' }, likes: { type: 'integer' }, retweets: { type: 'integer' }, replies: { type: 'integer' }, bookmarks: { type: 'integer' }, impressions: { type: 'integer' }, hashtags: { type: 'array', items: { type: 'string' } }, mentions: { type: 'array', items: { type: 'string' } }, is_thread: { type: 'boolean' }, thread_length: { type: 'integer' } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/user-tweets': {
        post: {
          operationId: 'getUserTweets',
          summary: 'Fetch recent tweets for a user',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 100 }, since_date: { type: 'string', format: 'date' } } } } } },
          responses: { '200': { description: 'User tweets', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, username: { type: 'string' }, tweets: { type: 'array', items: { type: 'object', properties: { tweet_id: { type: 'string' }, text: { type: 'string' }, posted_at: { type: 'string' }, likes: { type: 'integer' }, retweets: { type: 'integer' }, replies: { type: 'integer' }, impressions: { type: 'integer' }, hashtags: { type: 'array', items: { type: 'string' } } } } }, total_fetched: { type: 'integer' }, top_hashtags: { type: 'array', items: { type: 'string' } }, avg_engagement_rate: { type: 'number' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/engagement-analysis': {
        post: {
          operationId: 'engagementAnalysis',
          summary: 'Analyze engagement metrics for a tweet',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { tweet_id: { type: 'string' }, tweet_url: { type: 'string' } } } } } },
          responses: { '200': { description: 'Engagement analysis', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, tweet_id: { type: 'string' }, engagement: { type: 'object', properties: { likes: { type: 'integer' }, retweets: { type: 'integer' }, replies: { type: 'integer' }, bookmarks: { type: 'integer' }, impressions: { type: 'integer' }, engagement_rate: { type: 'number' }, viral_score: { type: 'number', minimum: 0, maximum: 1 }, reply_sentiment: { type: 'string', enum: ['positive', 'negative', 'mixed', 'neutral'] }, top_engagers: { type: 'array', items: { type: 'object', properties: { username: { type: 'string' }, followers: { type: 'integer' }, verified: { type: 'boolean' } } } } } }, performance_vs_author_avg: { type: 'number' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
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
      '/twitter-intelligence': {
        post: {
          operationId: 'twitterIntelligence',
          summary: 'ONE-CALL: top tweets + engagement summary + topics + posting pattern',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'], properties: { username: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full Twitter intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, username: { type: 'string' }, top_tweets: { type: 'array', items: { type: 'object', properties: { tweet_id: { type: 'string' }, text: { type: 'string' }, likes: { type: 'integer' }, viral_score: { type: 'number' } } } }, engagement_summary: { type: 'object', properties: { avg_likes: { type: 'number' }, avg_retweets: { type: 'number' }, avg_engagement_rate: { type: 'number' }, trend: { type: 'string', enum: ['growing', 'stable', 'declining'] } } }, top_topics: { type: 'array', items: { type: 'string' } }, posting_pattern: { type: 'object', properties: { peak_days: { type: 'array', items: { type: 'string' } }, peak_hours: { type: 'array', items: { type: 'string' } }, avg_per_week: { type: 'number' } } }, influence_score: { type: 'number', minimum: 0, maximum: 1 }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/thread-summary': {
        post: {
          operationId: 'threadSummary',
          summary: 'Summarize a Twitter thread with virality score and momentum direction',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { tweet_id: { type: 'string' }, tweet_url: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Thread summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, tweet_id: { type: 'string' },
                      thread: { type: 'object', properties: { length: { type: 'integer' }, summary: { type: 'string' }, key_points: { type: 'array', items: { type: 'string' } }, total_likes: { type: 'integer' }, total_retweets: { type: 'integer' }, total_impressions: { type: 'integer' }, virality_score: { type: 'number', minimum: 0, maximum: 1 }, momentum_direction: { type: 'string', enum: ['accelerating', 'stable', 'declining'] }, peak_engagement_tweet: { type: 'object', properties: { tweet_id: { type: 'string' }, text: { type: 'string' }, likes: { type: 'integer' } } } } },
                      audience_reaction: { type: 'string', enum: ['positive', 'negative', 'mixed', 'divided'] },
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
          operationId: 'batchTweets',
          summary: 'Batch lookup multiple tweets (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['tweet_ids'], properties: { tweet_ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch tweet results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { tweet_id: { type: 'string' }, text_snippet: { type: 'string' }, likes: { type: 'integer' }, retweets: { type: 'integer' }, author: { type: 'string' }, posted_at: { type: 'string' } } } }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
