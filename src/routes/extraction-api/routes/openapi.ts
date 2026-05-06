import { Router } from 'express';
const router = Router();

const intelligenceResponse = {
  type: 'object',
  properties: {
    endpoint: { type: 'string' },
    url: { type: 'string', nullable: true },
    data: { type: 'object' },
    latency_ms: { type: 'number' },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

const executionGateResponse = {
  type: 'object',
  properties: {
    endpoint: { type: 'string' },
    url: { type: 'string', nullable: true },
    execution_ready: { type: 'boolean' },
    next_api: { type: 'string' },
    next_endpoint: { type: 'string' },
    data: {
      type: 'object',
      properties: {
        execute: { type: 'boolean' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        alert_level: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
        reason: { type: 'string' },
        signals_found: { type: 'number' },
        top_signal: { type: 'string' },
        risk_level: { type: 'string', enum: ['high', 'medium', 'low'] },
        blocking_flags: { type: 'array', items: { type: 'string' } },
        next_api: { type: 'string' },
        next_endpoint: { type: 'string' },
        recommended_action: { type: 'string' },
      },
    },
    metadata: {
      type: 'object',
      properties: {
        latency_ms: { type: 'number' },
        estimated_cost: { type: 'number' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  },
};

router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Agent Intelligence Extraction & Monitoring API',
      version: '2.0.0',
      description: 'Extract structured intelligence from any URL or text. Pull entities, signals, and opportunities. Detect page changes, register monitoring, and gate autonomous agent execution.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/extraction', description: 'Production' }],
    paths: {
      '/extract/lead':     { post: { summary: 'Extract lead contact info from text', tags: ['Document Extraction'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'Extracted lead data', content: { 'application/json': { schema: intelligenceResponse } } } } } },
      '/extract/invoice':  { post: { summary: 'Extract invoice fields from text', tags: ['Document Extraction'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'Extracted invoice data', content: { 'application/json': { schema: intelligenceResponse } } } } } },
      '/extract/resume':   { post: { summary: 'Extract resume/CV structured data', tags: ['Document Extraction'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'Extracted resume data', content: { 'application/json': { schema: intelligenceResponse } } } } } },
      '/extract/contract': { post: { summary: 'Extract contract key terms', tags: ['Document Extraction'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'Extracted contract data', content: { 'application/json': { schema: intelligenceResponse } } } } } },
      '/extract/receipt':  { post: { summary: 'Extract receipt purchase data', tags: ['Document Extraction'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'Extracted receipt data', content: { 'application/json': { schema: intelligenceResponse } } } } } },
      '/extract/custom':   { post: { summary: 'Extract any fields with a custom schema', tags: ['Document Extraction'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, schema: { type: 'object' }, context: { type: 'string' } }, required: ['text', 'schema'] } } } }, responses: { 200: { description: 'Custom extracted data', content: { 'application/json': { schema: intelligenceResponse } } } } } },
      '/extract-entities': {
        post: {
          summary: 'Extract people, companies, prices, events and locations from any URL or text',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, text: { type: 'string' } } } } } },
          responses: { 200: { description: 'Extracted entities', content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              endpoint: { type: 'string' },
              url: { type: 'string', nullable: true },
              data: { type: 'object', properties: {
                people: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, context: { type: 'string' } } } },
                companies: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' }, context: { type: 'string' } } } },
                prices: { type: 'array', items: { type: 'object', properties: { value: { type: 'string' }, currency: { type: 'string' }, context: { type: 'string' } } } },
                events: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, date: { type: 'string' }, context: { type: 'string' } } } },
                locations: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' } } } },
                topics: { type: 'array', items: { type: 'string' } },
              } },
              latency_ms: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          } } } } },
        },
      },
      '/extract-signals': {
        post: {
          summary: 'Extract actionable intelligence signals from content',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, text: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { 200: { description: 'Signals with type, strength, action and alert_level', content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              endpoint: { type: 'string' },
              data: { type: 'object', properties: {
                signals: { type: 'array', items: { type: 'object', properties: { signal: { type: 'string' }, type: { type: 'string', enum: ['hiring','funding','partnership','product_launch','regulatory','competitive','market','sentiment'] }, strength: { type: 'string', enum: ['high','medium','low'] }, action: { type: 'string' }, confidence: { type: 'number' } } } },
                summary: { type: 'string' },
                alert_level: { type: 'string', enum: ['high','medium','low'] },
                recommended_action: { type: 'string' },
              } },
              latency_ms: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          } } } } },
        },
      },
      '/detect-change': {
        post: {
          summary: 'Compare current page state vs cached baseline',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, baseline: { type: 'string' } }, required: ['url'] } } } },
          responses: { 200: { description: 'Change detection result', content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              endpoint: { type: 'string' },
              url: { type: 'string' },
              data: { type: 'object', properties: {
                changed: { type: 'boolean' },
                change_type: { type: 'string', enum: ['none','minor','significant','critical'] },
                changes: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, old_value: { type: 'string' }, new_value: { type: 'string' }, significance: { type: 'string', enum: ['high','medium','low'] } } } },
                summary: { type: 'string' },
                alert_level: { type: 'string', enum: ['none','low','medium','high'] },
              } },
              latency_ms: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          } } } } },
        },
      },
      '/monitor-page': {
        post: {
          summary: 'Register a URL for monitoring',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, watch_for: { type: 'string' }, webhook_url: { type: 'string' } }, required: ['url'] } } } },
          responses: { 200: { description: 'Monitor registered with watch_targets', content: { 'application/json': { schema: intelligenceResponse } } } },
        },
      },
      '/extract-opportunities': {
        post: {
          summary: 'Surface ranked opportunities from any content',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, text: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { 200: { description: 'Ranked opportunities', content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              endpoint: { type: 'string' },
              data: { type: 'object', properties: {
                opportunities: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, type: { type: 'string' }, description: { type: 'string' }, urgency: { type: 'string', enum: ['high','medium','low'] }, effort: { type: 'string', enum: ['high','medium','low'] }, potential_value: { type: 'string', enum: ['high','medium','low'] }, action: { type: 'string' }, confidence: { type: 'number' } } } },
                top_opportunity: { type: 'string' },
                summary: { type: 'string' },
                total_found: { type: 'number' },
              } },
              latency_ms: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          } } } } },
        },
      },
      '/monitor-topic': {
        post: {
          summary: 'Watch a topic across multiple URLs',
          tags: ['Intelligence'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { topic: { type: 'string' }, urls: { type: 'array', items: { type: 'string' } }, context: { type: 'string' } }, required: ['topic'] } } } },
          responses: { 200: { description: 'Topic intelligence with sentiment, trend, signals', content: { 'application/json': { schema: intelligenceResponse } } } },
        },
      },
      '/execution-gate': {
        post: {
          summary: 'Determine whether extracted intelligence should trigger an autonomous action',
          tags: ['Intelligence', 'Execution'],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, text: { type: 'string' }, context: { type: 'string' }, action_threshold: { type: 'string' } } } } } },
          responses: { 200: { description: 'Execution gate decision', content: { 'application/json': { schema: executionGateResponse } } } },
        },
      },
    },
  });
});

export default router;
