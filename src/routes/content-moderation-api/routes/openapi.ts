import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };
const provenance = { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } };
const chainFields = { source_provenance: provenance, cache_ttl_seconds: { type: 'integer' }, cache_recommended: { type: 'boolean' }, recommended_next_api: { type: 'string' }, recommended_next_endpoint: { type: 'string' }, automation_safe: { type: 'boolean' } };

const flagItem = { type: 'object', properties: { category: { type: 'string', enum: ['hate_speech', 'violence', 'sexual', 'spam', 'harassment', 'self_harm', 'dangerous', 'misinformation'] }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, score: { type: 'number', minimum: 0, maximum: 1 }, excerpt: { type: 'string' } } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Content Moderation API',
      version: '2.0.0',
      description: 'Moderate text content, classify violations, score toxicity, and enforce custom policies for trust, safety, and compliance automation agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 500, requests_per_month: 15000 }, pay_per_call: { moderate: '$0.001', classify: '$0.001', 'toxicity-score': '$0.001', 'execution-gate': '$0.001', 'moderation-intelligence': '$0.005', 'policy-check': '$0.004', batch: '$0.008' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/content-moderation' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/moderate': {
        post: {
          operationId: 'moderateContent',
          summary: 'Moderate text content and return flags with safe/unsafe verdict',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Moderation result', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, is_safe: { type: 'boolean' }, overall_severity: { type: 'string', enum: ['high', 'medium', 'low', 'none'] }, flags: { type: 'array', items: flagItem }, action_recommended: { type: 'string', enum: ['allow', 'review', 'block', 'remove'] }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/classify': {
        post: {
          operationId: 'classifyContent',
          summary: 'Classify content into violation categories with scores',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } },
          responses: { '200': { description: 'Classification result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, categories: { type: 'object', properties: { hate_speech: { type: 'number', minimum: 0, maximum: 1 }, violence: { type: 'number', minimum: 0, maximum: 1 }, sexual: { type: 'number', minimum: 0, maximum: 1 }, spam: { type: 'number', minimum: 0, maximum: 1 }, harassment: { type: 'number', minimum: 0, maximum: 1 }, self_harm: { type: 'number', minimum: 0, maximum: 1 }, dangerous: { type: 'number', minimum: 0, maximum: 1 }, misinformation: { type: 'number', minimum: 0, maximum: 1 } } }, primary_category: { type: 'string' }, primary_score: { type: 'number', minimum: 0, maximum: 1 }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/toxicity-score': {
        post: {
          operationId: 'toxicityScore',
          summary: 'Score overall toxicity and sub-dimensions of text',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } },
          responses: { '200': { description: 'Toxicity scores', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, toxicity_score: { type: 'number', minimum: 0, maximum: 1 }, dimensions: { type: 'object', properties: { insult: { type: 'number' }, profanity: { type: 'number' }, threat: { type: 'number' }, identity_attack: { type: 'number' }, sexually_explicit: { type: 'number' } } }, verdict: { type: 'string', enum: ['toxic', 'borderline', 'clean'] }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
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
      '/moderation-intelligence': {
        post: {
          operationId: 'moderationIntelligence',
          summary: 'ONE-CALL: moderate + classify + toxicity + risk summary',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full moderation intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, is_safe: { type: 'boolean' }, overall_risk: { type: 'string', enum: ['high', 'medium', 'low', 'none'] }, toxicity_score: { type: 'number', minimum: 0, maximum: 1 }, primary_violation: { type: 'string' }, flags: { type: 'array', items: flagItem }, action_recommended: { type: 'string', enum: ['allow', 'review', 'block', 'remove'] }, edit_suggestions: { type: 'array', items: { type: 'string' } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/policy-check': {
        post: {
          operationId: 'policyCheck',
          summary: 'Check content against custom policies and return violation details with edit suggestions',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, policies: { type: 'array', items: { type: 'string' } }, policy_mode: { type: 'string', enum: ['strict', 'standard', 'lenient'] } } } } } },
          responses: {
            '200': {
              description: 'Policy check result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      policy_mode: { type: 'string', enum: ['strict', 'standard', 'lenient'] },
                      is_compliant: { type: 'boolean' },
                      risk_score: { type: 'number', minimum: 0, maximum: 1 },
                      severity: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
                      violated_policies: { type: 'array', items: { type: 'object', properties: { policy: { type: 'string' }, reason: { type: 'string' }, excerpt: { type: 'string' } } } },
                      edit_suggestions: { type: 'array', items: { type: 'string' } },
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
          operationId: 'batchModerate',
          summary: 'Batch moderate multiple texts (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['texts'], properties: { texts: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch moderation results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { text_snippet: { type: 'string' }, is_safe: { type: 'boolean' }, overall_severity: { type: 'string', enum: ['high', 'medium', 'low', 'none'] }, action_recommended: { type: 'string' } } } }, safe_count: { type: 'integer' }, flagged_count: { type: 'integer' }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
