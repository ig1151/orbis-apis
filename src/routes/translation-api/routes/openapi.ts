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
      title: 'Translation API',
      version: '2.0.0',
      description: 'Translate text, detect languages, enforce glossaries, and localize content with cultural adaptation for global automation agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 500, requests_per_month: 15000 }, pay_per_call: { translate: '$0.002', 'detect-language': '$0.001', 'glossary-translate': '$0.003', 'execution-gate': '$0.001', 'translate-document': '$0.005', localization: '$0.004', batch: '$0.008' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/translation' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/translate': {
        post: {
          operationId: 'translateText',
          summary: 'Translate text to a target language',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text', 'target_language'], properties: { text: { type: 'string' }, target_language: { type: 'string' }, source_language: { type: 'string' } } } } } },
          responses: { '200': { description: 'Translation result', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, source_language: { type: 'string' }, target_language: { type: 'string' }, translation: { type: 'object', properties: { original: { type: 'string' }, translated: { type: 'string' }, alternative_translations: { type: 'array', items: { type: 'string' } }, formality_level: { type: 'string', enum: ['formal', 'informal', 'neutral'] } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/detect-language': {
        post: {
          operationId: 'detectLanguage',
          summary: 'Detect the language of input text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } },
          responses: { '200': { description: 'Language detection', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, detected: { type: 'object', properties: { language_code: { type: 'string' }, language_name: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, script: { type: 'string' }, dialect: { type: 'string' } } }, alternatives: { type: 'array', items: { type: 'object', properties: { language_code: { type: 'string' }, language_name: { type: 'string' }, confidence: { type: 'number' } } } }, is_mixed: { type: 'boolean' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/glossary-translate': {
        post: {
          operationId: 'glossaryTranslate',
          summary: 'Translate with enforced glossary terms',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text', 'target_language'], properties: { text: { type: 'string' }, target_language: { type: 'string' }, glossary: { type: 'array', items: { type: 'object', properties: { source: { type: 'string' }, target: { type: 'string' } } } } } } } } },
          responses: { '200': { description: 'Glossary translation', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, target_language: { type: 'string' }, translation: { type: 'object', properties: { original: { type: 'string' }, translated: { type: 'string' }, glossary_terms_applied: { type: 'array', items: { type: 'string' } }, glossary_terms_not_found: { type: 'array', items: { type: 'string' } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, blocking_flags: actions, next_api: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } },
        },
      },
      '/translate-document': {
        post: {
          operationId: 'translateDocument',
          summary: 'ONE-CALL: translate full document with quality scoring and cultural adaptation',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text', 'target_language'], properties: { text: { type: 'string' }, target_language: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Document translation', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, source_language: { type: 'string' }, target_language: { type: 'string' }, translated_text: { type: 'string' }, source_language_detected: { type: 'string' }, word_count: { type: 'integer' }, translation_quality_score: { type: 'number', minimum: 0, maximum: 1 }, culturally_adapted: { type: 'boolean' }, formality_preserved: { type: 'boolean' }, glossary_issues: { type: 'array', items: { type: 'string' } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/localization': {
        post: {
          operationId: 'localizeContent',
          summary: 'Localize content with cultural adaptation, idiom changes, and brand voice preservation',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text', 'target_language'], properties: { text: { type: 'string' }, target_language: { type: 'string' }, target_region: { type: 'string' }, brand_voice: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Localized content',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, target_language: { type: 'string' }, target_region: { type: 'string' },
                      localized: { type: 'object', properties: { text: { type: 'string' }, tone_preserved: { type: 'boolean' }, tone_type: { type: 'string', enum: ['formal', 'conversational', 'professional', 'casual'] }, cultural_adaptations: { type: 'array', items: { type: 'string' } }, idiomatic_changes: { type: 'array', items: { type: 'string' } }, date_format_adapted: { type: 'boolean' }, currency_adapted: { type: 'boolean' } } },
                      brand_voice_score: { type: 'number', minimum: 0, maximum: 1 },
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
          operationId: 'batchTranslate',
          summary: 'Batch translate multiple texts (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, target_language: { type: 'string' } }, required: ['text', 'target_language'] }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch translations', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { original: { type: 'string' }, translated: { type: 'string' }, target_language: { type: 'string' }, confidence: { type: 'number' } } } }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
