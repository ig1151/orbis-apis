import { Router } from 'express';
const router = Router();

const errorSchema = { type: 'object', properties: { error: { type: 'string' } } };
const commonErrors = {
  400: { description: 'Bad Request', content: { 'application/json': { schema: errorSchema } } },
  500: { description: 'Server error', content: { 'application/json': { schema: errorSchema } } },
};

router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Agent PDF Extraction API',
      version: '1.0.0',
      description: 'PDF to structured JSON extraction for invoices, contracts, receipts, resumes and custom documents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-monetization-grade': 'A+',
      'x-pricing': {
        '/extract-invoice': 0.005,
        '/extract-contract': 0.006,
        '/extract-receipt': 0.003,
        '/extract-resume': 0.004,
        '/extract-custom': 0.005,
        '/classify-document': 0.002,
        '/execution-gate': 0.004,
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/pdf-extraction', description: 'Production' }],
    paths: {
      '/extract-invoice': { post: { summary: 'Extract invoice data to structured JSON', tags: ['Document Extraction'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string', description: 'PDF text content' }, context: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'invoice_number, vendor, client, line_items, total, confidence' }, ...commonErrors } } },
      '/extract-contract': { post: { summary: 'Extract contract key terms to structured JSON', tags: ['Document Extraction'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, context: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'parties, dates, value, obligations, risk_flags, confidence' }, ...commonErrors } } },
      '/extract-receipt': { post: { summary: 'Extract receipt purchase data to structured JSON', tags: ['Document Extraction'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, context: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'merchant, items, total, payment_method, category, confidence' }, ...commonErrors } } },
      '/extract-resume': { post: { summary: 'Extract resume/CV to structured JSON', tags: ['Document Extraction'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, context: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'name, experience, skills, education, seniority_level, confidence' }, ...commonErrors } } },
      '/extract-custom': { post: { summary: 'Extract any fields using a custom schema', tags: ['Document Extraction'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, schema: { type: 'object', description: 'Key-value map of field names to types e.g. {"company": "string", "amount": "number"}' }, context: { type: 'string' } }, required: ['text', 'schema'] } } } }, responses: { 200: { description: 'Extracted fields matching schema, confidence, missing_fields' }, ...commonErrors } } },
      '/classify-document': { post: { summary: 'Classify document type and recommend extractor', tags: ['Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'document_type, confidence, recommended_extractor, pii_detected, summary' }, ...commonErrors } } },
      '/execution-gate': { post: { summary: 'Gate autonomous document processing actions', tags: ['Execution'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, action: { type: 'string' }, context: { type: 'string' } }, required: ['text'] } } } }, responses: { 200: { description: 'execution_ready, next_api, blocking_flags, pii_detected, data_quality, metadata' }, ...commonErrors } } },
    },
  });
});

export default router;
