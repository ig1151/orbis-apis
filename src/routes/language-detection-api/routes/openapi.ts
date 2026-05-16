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

const langResult = {
  type: 'object',
  properties: {
    language_code: { type: 'string' },
    language_name: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    script: { type: 'string' },
    region: { type: 'string' },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Language Detection API',
      version: '2.0.0',
      description: 'Detect language, dialect, script, and mixed-language content for routing, translation, and content intelligence agents',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 500, requests_per_month: 15000 },
        pay_per_call: { detect: '$0.001', batch: '$0.003', confidence: '$0.002', 'execution-gate': '$0.001', analyze: '$0.004', 'mixed-language-analysis': '$0.003', 'batch-primary': '$0.003' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/language-detection' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/detect': {
        post: {
          operationId: 'detectLanguage',
          summary: 'Detect the primary language of a text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Language detection result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', required: ['trace_id', 'computed_at', 'success'],
                    properties: {
                      ...traceFields,
                      detected: langResult,
                      alternatives: { type: 'array', items: langResult },
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
          operationId: 'batchDetect',
          summary: 'Batch detect languages for multiple texts (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['texts'], properties: { texts: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } } } } } },
          responses: {
            '200': {
              description: 'Batch detection results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      results: { type: 'array', items: { type: 'object', properties: { text_snippet: { type: 'string' }, detected: langResult, success: { type: 'boolean' } } } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/confidence': {
        post: {
          operationId: 'languageConfidence',
          summary: 'Get confidence scores for all candidate languages',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Language confidence breakdown',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      primary: langResult,
                      all_candidates: { type: 'array', items: langResult },
                      is_ambiguous: { type: 'boolean' },
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
          operationId: 'analyzeLanguage',
          summary: 'ONE-CALL: detect language + script + dialect + formality + routing suggestion',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Full language intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      detected: langResult,
                      dialect: { type: 'string' },
                      formality: { type: 'string', enum: ['formal', 'informal', 'mixed'] },
                      script: { type: 'string' },
                      is_mixed: { type: 'boolean' },
                      routing_suggestion: { type: 'object', properties: { translate_to: { type: 'string' }, next_api: { type: 'string' } } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/mixed-language-analysis': {
        post: {
          operationId: 'mixedLanguageAnalysis',
          summary: 'Detect and map multiple languages within a single text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Mixed language map',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      is_mixed: { type: 'boolean' },
                      language_segments: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, language_code: { type: 'string' }, language_name: { type: 'string' }, char_start: { type: 'integer' }, char_end: { type: 'integer' } } } },
                      dominant_language: langResult,
                      language_distribution: { type: 'object', additionalProperties: { type: 'number' } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/batch-primary': {
        post: {
          operationId: 'batchPrimary',
          summary: 'Return only primary language code for bulk text routing (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['texts'], properties: { texts: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } } } } } },
          responses: {
            '200': {
              description: 'Batch primary languages',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      results: { type: 'array', items: { type: 'object', properties: { language_code: { type: 'string' }, language_name: { type: 'string' }, confidence: { type: 'number' } } } },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
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
