import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };
const provenance = { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } };
const chainFields = { source_provenance: provenance, cache_ttl_seconds: { type: 'integer' }, cache_recommended: { type: 'boolean' }, recommended_next_api: { type: 'string' }, recommended_next_endpoint: { type: 'string' }, automation_safe: { type: 'boolean' } };

const piiItem = { type: 'object', properties: { type: { type: 'string', enum: ['EMAIL', 'PHONE', 'SSN', 'CREDIT_CARD', 'IP_ADDRESS', 'DATE_OF_BIRTH', 'NAME', 'ADDRESS', 'PASSPORT', 'BANK_ACCOUNT', 'OTHER'] }, value: { type: 'string' }, redacted_value: { type: 'string' }, start_char: { type: 'integer' }, end_char: { type: 'integer' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, risk_level: { type: 'string', enum: ['high', 'medium', 'low'] } } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'PII Detection API',
      version: '2.0.0',
      description: 'Detect and redact personally identifiable information, classify sensitivity, and generate compliance reports for GDPR, HIPAA, and CCPA automation agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 500, requests_per_month: 15000 }, pay_per_call: { detect: '$0.001', redact: '$0.001', classify: '$0.001', 'execution-gate': '$0.001', 'pii-intelligence': '$0.005', 'compliance-report': '$0.005', batch: '$0.008' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/pii-detection' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/detect': {
        post: {
          operationId: 'detectPII',
          summary: 'Detect PII entities in text with type and confidence',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, types: { type: 'array', items: { type: 'string' } } } } } } },
          responses: { '200': { description: 'PII detection result', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, pii_found: { type: 'boolean' }, pii_count: { type: 'integer' }, pii_items: { type: 'array', items: piiItem }, risk_level: { type: 'string', enum: ['high', 'medium', 'low', 'none'] }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/redact': {
        post: {
          operationId: 'redactPII',
          summary: 'Detect and redact PII from text, returning sanitized output',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, redaction_style: { type: 'string', enum: ['mask', 'replace', 'remove'] }, types: { type: 'array', items: { type: 'string' } } } } } } },
          responses: { '200': { description: 'Redacted text', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, original_length: { type: 'integer' }, redacted_text: { type: 'string' }, redacted_count: { type: 'integer' }, redacted_types: { type: 'array', items: { type: 'string' } }, redaction_map: { type: 'array', items: { type: 'object', properties: { original: { type: 'string' }, replacement: { type: 'string' }, type: { type: 'string' } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/classify': {
        post: {
          operationId: 'classifyPII',
          summary: 'Classify PII sensitivity level and regulatory applicability',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } },
          responses: { '200': { description: 'PII classification', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, sensitivity_level: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'none'] }, applicable_regulations: { type: 'array', items: { type: 'string', enum: ['GDPR', 'HIPAA', 'CCPA', 'COPPA', 'PCI_DSS'] } }, data_categories: { type: 'array', items: { type: 'string' } }, requires_consent: { type: 'boolean' }, cross_border_risk: { type: 'boolean' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
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
      '/pii-intelligence': {
        post: {
          operationId: 'piiIntelligence',
          summary: 'ONE-CALL: detect + redact + classify + regulatory risk summary',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full PII intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, pii_found: { type: 'boolean' }, pii_count: { type: 'integer' }, risk_level: { type: 'string', enum: ['high', 'medium', 'low', 'none'] }, redacted_text: { type: 'string' }, pii_items: { type: 'array', items: piiItem }, sensitivity_level: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'none'] }, applicable_regulations: { type: 'array', items: { type: 'string' } }, requires_consent: { type: 'boolean' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/compliance-report': {
        post: {
          operationId: 'complianceReport',
          summary: 'Generate a structured compliance report with PII inventory and remediation steps',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, regulations: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Compliance report',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      compliance_status: { type: 'string', enum: ['compliant', 'at_risk', 'non_compliant'] },
                      pii_inventory: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, count: { type: 'integer' }, risk_level: { type: 'string', enum: ['high', 'medium', 'low'] }, regulation_relevance: { type: 'array', items: { type: 'string' } } } } },
                      violated_regulations: { type: 'array', items: { type: 'string' } },
                      remediation_steps: { type: 'array', items: { type: 'string' } },
                      retention_recommendation: { type: 'string' },
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
          summary: 'Batch detect PII in multiple texts (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['texts'], properties: { texts: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch PII detection results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { text_snippet: { type: 'string' }, pii_found: { type: 'boolean' }, pii_count: { type: 'integer' }, risk_level: { type: 'string', enum: ['high', 'medium', 'low', 'none'] } } } }, total_pii_found: { type: 'integer' }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
