import { Router } from 'express';
const router = Router();

router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Agent Intelligence Extraction & Monitoring API',
      version: '2.0.0',
      description: 'Extract structured intelligence from any URL or text. Pull entities, signals, and opportunities. Detect page changes and register monitoring — built for autonomous agent workflows.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/extraction', description: 'Production' }],
    paths: {
      '/extract/lead':     { post: { summary: 'Extract lead contact info from text', tags: ['Document Extraction'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'Extracted lead data' } } } },
      '/extract/invoice':  { post: { summary: 'Extract invoice fields from text', tags: ['Document Extraction'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'Extracted invoice data' } } } },
      '/extract/resume':   { post: { summary: 'Extract resume/CV structured data', tags: ['Document Extraction'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'Extracted resume data' } } } },
      '/extract/contract': { post: { summary: 'Extract contract key terms', tags: ['Document Extraction'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'Extracted contract data' } } } },
      '/extract/receipt':  { post: { summary: 'Extract receipt purchase data', tags: ['Document Extraction'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'Extracted receipt data' } } } },
      '/extract/custom':   { post: { summary: 'Extract any fields with a custom schema', tags: ['Document Extraction'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, schema: { type: 'object' }, context: { type: 'string' } }, required: ['text', 'schema'] } } } }, responses: { 200: { description: 'Custom extracted data' } } } },
      '/extract-entities': {
        post: {
          summary: 'Extract people, companies, prices, events and locations from any URL or text',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string', description: 'URL to fetch and extract from' }, text: { type: 'string', description: 'Raw text to extract from' } } } } } },
          responses: { 200: { description: 'Extracted entities including people, companies, prices, events, locations, topics' } },
        },
      },
      '/extract-signals': {
        post: {
          summary: 'Extract actionable intelligence signals from content',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, text: { type: 'string' }, context: { type: 'string', description: 'Optional goal/context for signal extraction' } } } } } },
          responses: { 200: { description: 'Signals with type, strength, action and alert_level' } },
        },
      },
      '/detect-change': {
        post: {
          summary: 'Compare current page state vs cached baseline and return what changed',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, baseline: { type: 'string', description: 'Optional previous snapshot to compare against' } }, required: ['url'] } } } },
          responses: { 200: { description: 'Change detection result with change_type and alert_level' } },
        },
      },
      '/monitor-page': {
        post: {
          summary: 'Register a URL for monitoring — captures baseline and defines watch targets',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, watch_for: { type: 'string', description: 'What to watch for e.g. price changes' }, webhook_url: { type: 'string', description: 'Webhook to notify on change' } }, required: ['url'] } } } },
          responses: { 200: { description: 'Monitor registered with watch_targets and check_frequency_recommendation' } },
        },
      },
      '/extract-opportunities': {
        post: {
          summary: 'Surface ranked opportunities from any content',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, text: { type: 'string' }, context: { type: 'string', description: 'Optional goal context' } } } } } },
          responses: { 200: { description: 'Ranked opportunities with urgency, effort, value and action' } },
        },
      },
      '/execution-gate': {
        post: {
          summary: 'Determine whether extracted intelligence should trigger an autonomous action',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, text: { type: 'string' }, context: { type: 'string' }, action_threshold: { type: 'string' } } } } } },
          responses: { 200: { description: 'execution_ready bool, next_api, next_endpoint, blocking_flags, confidence' } },
        },
      },
      '/monitor-topic': {
        post: {
          summary: 'Watch a topic across multiple URLs — returns signals, sentiment, trend and narrative',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { topic: { type: 'string' }, urls: { type: 'array', items: { type: 'string' }, description: 'Up to 5 URLs to analyze' }, context: { type: 'string' } }, required: ['topic'] } } } },
          responses: { 200: { description: 'Topic intelligence with sentiment, trend, signals and narrative_summary' } },
        },
      },
    },
  });
});

export default router;
