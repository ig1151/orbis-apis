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

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Text Summarizer API',
      version: '2.0.0',
      description: 'Summarize, condense, and analyze text with bullet points, TL;DR, decision summaries, and sentiment for content and research agents',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 200, requests_per_month: 6000 },
        pay_per_call: { summarize: '$0.002', bullets: '$0.002', tldr: '$0.001', 'execution-gate': '$0.001', analyze: '$0.005', 'decision-summary': '$0.003', batch: '$0.008' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/text-summarizer' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/summarize': {
        post: {
          operationId: 'summarizeText',
          summary: 'Summarize text into a concise paragraph',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, max_words: { type: 'integer', minimum: 20, maximum: 500 }, summary_mode: { type: 'string', enum: ['concise', 'detailed', 'executive'] } } } } } },
          responses: {
            '200': {
              description: 'Text summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      summary: { type: 'object', properties: { paragraph: { type: 'string' }, word_count: { type: 'integer' }, compression_ratio: { type: 'number', minimum: 0, maximum: 1 }, reading_time_seconds: { type: 'integer' }, key_points: { type: 'array', items: { type: 'string' } } } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/bullets': {
        post: {
          operationId: 'bulletSummary',
          summary: 'Extract key bullet points from text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, max_bullets: { type: 'integer', minimum: 3, maximum: 20 } } } } } },
          responses: {
            '200': {
              description: 'Bullet points',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      bullets: { type: 'array', items: { type: 'string' } },
                      key_entities: { type: 'array', items: { type: 'string' } },
                      themes: { type: 'array', items: { type: 'string' } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/tldr': {
        post: {
          operationId: 'tldrSummary',
          summary: 'Generate a one-sentence TL;DR for any text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'TL;DR result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      tldr: { type: 'string' },
                      one_liner: { type: 'string' },
                      tweet_version: { type: 'string' },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
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
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Gate result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { ...traceFields, execution_ready: { type: 'boolean' }, blocking_flags: actions, next_api: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy },
                  },
                },
              },
            },
          },
        },
      },
      '/analyze': {
        post: {
          operationId: 'analyzeText',
          summary: 'ONE-CALL: summary + bullets + TL;DR + sentiment + key entities',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Full text intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      summary: { type: 'string' },
                      bullets: { type: 'array', items: { type: 'string' } },
                      tldr: { type: 'string' },
                      sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
                      key_entities: { type: 'array', items: { type: 'string' } },
                      topics: { type: 'array', items: { type: 'string' } },
                      reading_time_seconds: { type: 'integer' },
                      word_count: { type: 'integer' },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/decision-summary': {
        post: {
          operationId: 'decisionSummary',
          summary: 'Extract decisions, action items, and next steps from text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Decision summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      decisions: { type: 'array', items: { type: 'object', properties: { decision: { type: 'string' }, owner: { type: 'string' }, deadline: { type: 'string' } } } },
                      action_items: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] }, assigned_to: { type: 'string' } } } },
                      next_steps: { type: 'array', items: { type: 'string' } },
                      open_questions: { type: 'array', items: { type: 'string' } },
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
          operationId: 'batchSummarize',
          summary: 'Batch summarize multiple texts (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, max_words: { type: 'integer' } }, required: ['text'] }, minItems: 1, maxItems: 10 } } } } } },
          responses: {
            '200': {
              description: 'Batch summaries',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      batch_count: { type: 'integer' },
                      results: { type: 'array', items: { type: 'object', properties: { summary: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' } }, tldr: { type: 'string' }, success: { type: 'boolean' }, error: { type: 'string' } } } },
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
