import { Router } from 'express';
const router = Router();

router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Agent YouTube Intelligence API',
      version: '1.0.0',
      description: 'YouTube video summarization, entity extraction, channel analysis, action item extraction, content scoring, and execution-gated content workflows for autonomous agents.',
      'x-agent-callable': true,
      'x-monetization-grade': 'A',
      'x-pricing': {
        '/summarize': 0.004,
        '/extract-entities': 0.004,
        '/analyze-channel': 0.005,
        '/extract-action-items': 0.004,
        '/score-content': 0.003,
        '/execution-gate': 0.004,
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/youtube-intelligence', description: 'Production' }],
    paths: {
      '/summarize': { post: { summary: 'Summarize a YouTube video — returns topics, audience, content type, action items', tags: ['Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string', description: 'YouTube URL or video ID' }, context: { type: 'string' } }, required: ['url'] } } } }, responses: { 200: { description: 'summary, key_topics, content_type, action_items, tags' } } } },
      '/extract-entities': { post: { summary: 'Extract people, companies, products, technologies from video', tags: ['Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, context: { type: 'string' } }, required: ['url'] } } } }, responses: { 200: { description: 'people, companies, products, technologies, locations, topics' } } } },
      '/analyze-channel': { post: { summary: 'Analyze a YouTube channel — niche, authority, content strategy', tags: ['Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { channel_url: { type: 'string' }, context: { type: 'string' } }, required: ['channel_url'] } } } }, responses: { 200: { description: 'niche, authority, content_strategy, topics_covered, agent_use_cases' } } } },
      '/extract-action-items': { post: { summary: 'Extract action items, takeaways, tools, and CRM notes from video', tags: ['Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, context: { type: 'string' } }, required: ['url'] } } } }, responses: { 200: { description: 'action_items, key_takeaways, tools_mentioned, crm_note' } } } },
      '/score-content': { post: { summary: 'Score video content quality, credibility, and research value', tags: ['Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, context: { type: 'string' } }, required: ['url'] } } } }, responses: { 200: { description: 'overall_score, content_grade, credibility_signals, recommended_use' } } } },
      '/execution-gate': { post: { summary: 'Gate autonomous content processing actions', tags: ['Execution'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, action: { type: 'string' }, context: { type: 'string' } }, required: ['url'] } } } }, responses: { 200: { description: 'execution_ready, next_api, blocking_flags, content_safe, metadata' } } } },
    },
  });
});

export default router;
