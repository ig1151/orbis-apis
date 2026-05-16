import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };
const provenance = { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } };
const chainFields = { source_provenance: provenance, cache_ttl_seconds: { type: 'integer' }, cache_recommended: { type: 'boolean' }, recommended_next_api: { type: 'string' }, recommended_next_endpoint: { type: 'string' }, automation_safe: { type: 'boolean' } };

const contactItem = { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' }, organization: { type: 'string' }, is_sender: { type: 'boolean' } } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Email Parser API',
      version: '2.0.0',
      description: 'Parse emails, extract contacts and action items, categorize threads, and build CRM intelligence for sales, support, and workflow automation agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 500, requests_per_month: 15000 }, pay_per_call: { parse: '$0.001', 'extract-contacts': '$0.001', categorize: '$0.001', 'execution-gate': '$0.001', 'email-intelligence': '$0.005', 'crm-intelligence': '$0.005', batch: '$0.008' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/email-parser' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/parse': {
        post: {
          operationId: 'parseEmail',
          summary: 'Parse email content and extract structured fields',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' }, format: { type: 'string', enum: ['raw', 'html', 'plain'] } } } } } },
          responses: { '200': { description: 'Parsed email', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, subject: { type: 'string' }, from: contactItem, to: { type: 'array', items: contactItem }, cc: { type: 'array', items: contactItem }, date: { type: 'string', format: 'date-time' }, body_plain: { type: 'string' }, body_html: { type: 'string' }, has_attachments: { type: 'boolean' }, attachment_names: { type: 'array', items: { type: 'string' } }, thread_id: { type: 'string' }, in_reply_to: { type: 'string' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/extract-contacts': {
        post: {
          operationId: 'extractContacts',
          summary: 'Extract all contacts and their roles from an email',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } } } } },
          responses: { '200': { description: 'Extracted contacts', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, contacts: { type: 'array', items: contactItem }, unique_domains: { type: 'array', items: { type: 'string' } }, primary_contact: contactItem, contact_count: { type: 'integer' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/categorize': {
        post: {
          operationId: 'categorizeEmail',
          summary: 'Categorize email by intent, urgency, and department routing',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } } } } },
          responses: { '200': { description: 'Email category', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, category: { type: 'string', enum: ['sales', 'support', 'billing', 'legal', 'hr', 'marketing', 'operations', 'other'] }, intent: { type: 'string', enum: ['inquiry', 'complaint', 'request', 'confirmation', 'follow_up', 'proposal', 'rejection', 'other'] }, urgency: { type: 'string', enum: ['high', 'medium', 'low'] }, sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] }, suggested_routing: { type: 'string' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, blocking_flags: actions, next_api: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } },
        },
      },
      '/email-intelligence': {
        post: {
          operationId: 'emailIntelligence',
          summary: 'ONE-CALL: parse + categorize + contacts + action items + reply draft',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full email intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, subject: { type: 'string' }, from: contactItem, category: { type: 'string' }, intent: { type: 'string' }, urgency: { type: 'string', enum: ['high', 'medium', 'low'] }, sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] }, action_items: { type: 'array', items: { type: 'string' } }, key_dates: { type: 'array', items: { type: 'string' } }, reply_draft: { type: 'string' }, contacts: { type: 'array', items: contactItem }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/crm-intelligence': {
        post: {
          operationId: 'crmIntelligence',
          summary: 'Extract CRM-ready intelligence: tasks, deadlines, stakeholders, deal stage, and customer sentiment',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' }, crm_context: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'CRM intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      tasks: { type: 'array', items: { type: 'object', properties: { task: { type: 'string' }, owner: { type: 'string' }, due_date: { type: 'string', format: 'date' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                      deadlines: { type: 'array', items: { type: 'object', properties: { description: { type: 'string' }, date: { type: 'string', format: 'date' } } } },
                      stakeholders: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] }, influence_level: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                      deal_stage: { type: 'string', enum: ['awareness', 'consideration', 'negotiation', 'closed_won', 'closed_lost', 'unknown'] },
                      customer_sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
                      next_best_action: { type: 'string' },
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
          operationId: 'batchParse',
          summary: 'Batch parse multiple emails (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['emails'], properties: { emails: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch email parse results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { subject: { type: 'string' }, from_email: { type: 'string' }, category: { type: 'string' }, urgency: { type: 'string' }, action_items: { type: 'array', items: { type: 'string' } } } } }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
