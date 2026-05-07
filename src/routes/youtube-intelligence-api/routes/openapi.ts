import { Router } from 'express';
const router = Router();

const errorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    details: { type: 'string' },
  },
};

const commonErrors = {
  400: { description: 'Bad Request — missing or invalid input', content: { 'application/json': { schema: errorSchema } } },
  401: { description: 'Unauthorized — missing or invalid API key', content: { 'application/json': { schema: errorSchema } } },
  429: { description: 'Rate limit exceeded', content: { 'application/json': { schema: errorSchema } } },
  500: { description: 'Internal server error', content: { 'application/json': { schema: errorSchema } } },
};

router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Agent YouTube Intelligence API',
      version: '1.0.0',
      description: 'YouTube video summarization, entity extraction, channel analysis, action item extraction, content scoring, and execution-gated workflows for autonomous agents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-monetization-grade': 'A+',
      'x-pricing': {
        '/summarize': 0.004,
        '/extract-entities': 0.004,
        '/analyze-channel': 0.005,
        '/extract-action-items': 0.004,
        '/score-content': 0.003,
        '/execution-gate': 0.004,
        '/analyze-video': 0.008,
      },
      'x-rate-limits': {
        free: '100 requests/day',
        builder: '50000 requests/day',
        execution: '250000 requests/day',
      },
      'x-uptime': '99.9%',
      'x-avg-latency-ms': 5000,
      'x-agent-use-cases': [
        'Research agents summarizing video content into CRM notes',
        'Content agents extracting entities and topics for knowledge graphs',
        'Sales agents analyzing channel authority before outreach',
        'Education agents extracting action items from tutorial videos',
        'QA agents scoring content quality before ingestion',
      ],
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/youtube-intelligence', description: 'Production' }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key', description: 'API key for authentication' },
      },
      schemas: { Error: errorSchema },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/summarize': {
        post: {
          summary: 'Summarize a YouTube video',
          description: 'Fetches video metadata and returns a structured summary including topics, audience, content type, and action items.',
          tags: ['Intelligence'],
          'x-agent-callable': true,
          'x-agent-use-case': 'Research agents summarizing video content into CRM notes or knowledge bases',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string', description: 'YouTube URL or video ID', example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }, context: { type: 'string', description: 'Optional goal context', example: 'Summarize for CRM entry' } }, required: ['url'] }, example: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', context: 'Research for CRM' } } },
          },
          responses: {
            200: {
              description: 'Video summary with topics, audience, content type and action items',
              content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, video_id: { type: 'string' }, data: { type: 'object', properties: { title: { type: 'string' }, channel: { type: 'string' }, summary: { type: 'string' }, key_topics: { type: 'array', items: { type: 'string' } }, target_audience: { type: 'string' }, content_type: { type: 'string', enum: ['tutorial', 'review', 'news', 'interview', 'entertainment', 'educational', 'marketing', 'other'] }, estimated_value: { type: 'string', enum: ['high', 'medium', 'low'] }, action_items: { type: 'array', items: { type: 'string' } }, tags: { type: 'array', items: { type: 'string' } } } }, latency_ms: { type: 'number' }, timestamp: { type: 'string' } } }, example: { endpoint: 'summarize', video_id: 'dQw4w9WgXcQ', data: { title: 'Rick Astley - Never Gonna Give You Up', channel: 'Rick Astley', summary: 'Official 4K remaster of the iconic 1987 hit.', content_type: 'entertainment', estimated_value: 'medium', key_topics: ['1980s pop', 'Rickrolling'], action_items: ['Listen to full discography'], tags: ['music', 'viral'] }, latency_ms: 4200 } } },
            },
            ...commonErrors,
          },
        },
      },
      '/extract-entities': {
        post: {
          summary: 'Extract entities from a YouTube video',
          description: 'Extracts named entities including people, companies, products, technologies, and locations from video metadata.',
          tags: ['Intelligence'],
          'x-agent-callable': true,
          'x-agent-use-case': 'Content agents building knowledge graphs from video content',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, context: { type: 'string' } }, required: ['url'] } } } },
          responses: { 200: { description: 'Extracted entities: people, companies, products, technologies, locations, topics', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, data: { type: 'object', properties: { people: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, context: { type: 'string' } } } }, companies: { type: 'array', items: { type: 'object' } }, products: { type: 'array', items: { type: 'object' } }, technologies: { type: 'array', items: { type: 'object' } }, locations: { type: 'array', items: { type: 'object' } }, topics: { type: 'array', items: { type: 'string' } } } } } } } } }, ...commonErrors },
        },
      },
      '/analyze-channel': {
        post: {
          summary: 'Analyze a YouTube channel',
          description: 'Analyzes channel authority, niche, content strategy, and agent use cases.',
          tags: ['Intelligence'],
          'x-agent-callable': true,
          'x-agent-use-case': 'Sales agents evaluating channel authority before partnership outreach',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { channel_url: { type: 'string', example: 'https://www.youtube.com/@mkbhd' }, context: { type: 'string' } }, required: ['channel_url'] } } } },
          responses: { 200: { description: 'Channel intelligence: niche, authority, content strategy, agent use cases', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, data: { type: 'object', properties: { channel_name: { type: 'string' }, niche: { type: 'string' }, estimated_authority: { type: 'string', enum: ['high', 'medium', 'low'] }, content_strategy: { type: 'string' }, target_audience: { type: 'string' }, topics_covered: { type: 'array', items: { type: 'string' } }, agent_use_cases: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } } } } } } } }, ...commonErrors },
        },
      },
      '/extract-action-items': {
        post: {
          summary: 'Extract action items and CRM notes from a video',
          description: 'Extracts actionable intelligence, takeaways, tools mentioned, and a CRM-ready note.',
          tags: ['Intelligence'],
          'x-agent-callable': true,
          'x-agent-use-case': 'Sales and project management agents converting meeting recordings into action items',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, context: { type: 'string' } }, required: ['url'] } } } },
          responses: { 200: { description: 'action_items, key_takeaways, tools_mentioned, resources, crm_note', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, data: { type: 'object', properties: { action_items: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] }, category: { type: 'string' }, estimated_effort: { type: 'string' } } } }, key_takeaways: { type: 'array', items: { type: 'string' } }, tools_mentioned: { type: 'array', items: { type: 'string' } }, crm_note: { type: 'string' } } } } } } } }, ...commonErrors },
        },
      },
      '/score-content': {
        post: {
          summary: 'Score video content quality and credibility',
          description: 'Scores video across quality, authority, engagement potential, and research value.',
          tags: ['Intelligence'],
          'x-agent-callable': true,
          'x-agent-use-case': 'QA agents scoring content quality before ingestion into training data or knowledge bases',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, context: { type: 'string' } }, required: ['url'] } } } },
          responses: { 200: { description: 'overall_score, content_grade, credibility_signals, red_flags, recommended_use', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, data: { type: 'object', properties: { overall_score: { type: 'number', minimum: 0, maximum: 100 }, content_grade: { type: 'string', enum: ['A+', 'A', 'B+', 'B', 'C', 'D'] }, engagement_potential: { type: 'string', enum: ['high', 'medium', 'low'] }, use_for_research: { type: 'boolean' }, sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'mixed'] }, credibility_signals: { type: 'array', items: { type: 'string' } }, red_flags: { type: 'array', items: { type: 'string' } }, recommended_use: { type: 'string' } } } } } } } }, ...commonErrors },
        },
      },
      '/execution-gate': {
        post: {
          summary: 'Gate autonomous content processing actions',
          description: 'Determines whether agent should process this video content. Returns execute bool, blocking flags, safety metadata, and next API.',
          tags: ['Execution'],
          'x-agent-callable': true,
          'x-agent-use-case': 'Autonomous content pipelines gating video ingestion based on quality and safety',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, action: { type: 'string', description: 'Intended action e.g. ingest|summarize|train' }, context: { type: 'string' } }, required: ['url'] } } } },
          responses: { 200: { description: 'execution_ready, blocking_flags, content_safe, next_api, metadata', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, next_endpoint: { type: 'string' }, data: { type: 'object', properties: { execute: { type: 'boolean' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, content_quality: { type: 'string', enum: ['high', 'medium', 'low'] }, risk_level: { type: 'string', enum: ['high', 'medium', 'low'] }, blocking_flags: { type: 'array', items: { type: 'string' } }, content_safe: { type: 'boolean' }, recommended_action: { type: 'string' } } }, metadata: { type: 'object', properties: { latency_ms: { type: 'number' }, estimated_cost: { type: 'number' }, timestamp: { type: 'string' } } } } } } } }, ...commonErrors },
        },
      },
      '/analyze-video': {
        post: {
          summary: 'Full one-call video intelligence — summarize + entities + score + gate',
          description: 'One-call workflow combining summarization, entity extraction, content scoring, action items, safety metadata, and execution gating into a single response.',
          tags: ['Intelligence', 'Execution'],
          'x-agent-callable': true,
          'x-one-call-workflow': true,
          'x-agent-use-case': 'Research agents that need complete video intelligence in a single API call',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string', description: 'YouTube URL or video ID' }, context: { type: 'string', description: 'Optional goal context' } }, required: ['url'] }, example: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', context: 'Research for CRM entry' } } } },
          responses: { 200: { description: 'Complete video intelligence: summary, entities, scores, action items, safety, execution gate', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, video_id: { type: 'string' }, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, next_endpoint: { type: 'string' }, data: { type: 'object', properties: { title: { type: 'string' }, channel: { type: 'string' }, summary: { type: 'string' }, content_type: { type: 'string' }, overall_score: { type: 'number' }, content_grade: { type: 'string' }, action_items: { type: 'array', items: { type: 'object' } }, entities: { type: 'object' }, safety: { type: 'object', properties: { copyright_risk: { type: 'string', enum: ['high', 'medium', 'low'] }, content_safe: { type: 'boolean' }, age_restricted: { type: 'boolean' }, transcript_likely_available: { type: 'boolean' } } }, execute: { type: 'boolean' }, blocking_flags: { type: 'array', items: { type: 'string' } }, crm_note: { type: 'string' } } }, metadata: { type: 'object', properties: { latency_ms: { type: 'number' }, estimated_cost: { type: 'number' }, timestamp: { type: 'string' } } } } } } } }, ...commonErrors },
        },
      },
    },
  });
});

export default router;
