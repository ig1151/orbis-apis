import { Router } from 'express';
const router = Router();

const errorSchema = { type: 'object', properties: { error: { type: 'string' } } };
const commonErrors = {
  400: { description: 'Bad Request — missing or invalid input', content: { 'application/json': { schema: errorSchema } } },
  500: { description: 'Server error', content: { 'application/json': { schema: errorSchema } } },
};

const invoiceExample = { text: 'INVOICE #1234\nFrom: Acme Corp, 123 Main St\nTo: Client LLC\nDate: 2026-05-01\nDue: 2026-05-30\nItem: Consulting Services - Qty: 1 - $5000\nSubtotal: $5000\nTax: $0\nTotal: $5000\nPayment: Net 30' };
const contractExample = { text: 'SERVICE AGREEMENT\nBetween: Acme Corp (Provider) and Client LLC (Customer)\nEffective: 2026-01-01\nExpiration: 2026-12-31\nValue: $60,000 USD\nPayment Terms: Monthly\nGoverning Law: California\nThis agreement is confidential.' };
const receiptExample = { text: 'RECEIPT\nStarbucks #1234\n123 Coffee Lane\n2026-05-07 09:15\nLatte x1 $5.50\nMuffin x1 $3.25\nSubtotal: $8.75\nTax: $0.75\nTotal: $9.50\nVisa ending 4242' };
const resumeExample = { text: 'John Smith\njohn@email.com | 555-1234 | San Francisco, CA\nSenior Software Engineer\nGoogle 2020-2024: Built distributed systems serving 10M users\nSkills: Python, TypeScript, AWS, Kubernetes\nMIT BS Computer Science 2018' };

router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Agent PDF Extraction API',
      version: '1.0.0',
      description: 'PDF to structured JSON extraction for invoices, contracts, receipts, resumes and custom documents. Built for autonomous document processing agents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-monetization-grade': 'A+',
      'x-pricing': {
        '/classify-document': 0.002,
        '/extract-invoice': 0.005,
        '/extract-contract': 0.006,
        '/extract-receipt': 0.003,
        '/extract-resume': 0.004,
        '/extract-custom': 0.005,
        '/execution-gate': 0.004,
        '/analyze-document': 0.008,
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/pdf-extraction', description: 'Production' }],
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } },
      schemas: { Error: errorSchema },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/classify-document': {
        post: {
          summary: 'Classify document type and recommend the right extractor',
          tags: ['Intelligence'],
          'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }, examples: { invoice: { value: invoiceExample }, contract: { value: contractExample } } } } },
          responses: {
            200: { description: 'Document classification result', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, data: { type: 'object', properties: { document_type: { type: 'string', enum: ['invoice','contract','receipt','resume','report','letter','form','proposal','agreement','other'] }, sub_type: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, language: { type: 'string' }, has_tables: { type: 'boolean' }, has_signatures: { type: 'boolean' }, is_scanned: { type: 'boolean' }, recommended_extractor: { type: 'string', enum: ['extract-invoice','extract-contract','extract-receipt','extract-resume','extract-custom'] }, key_entities: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' }, pii_detected: { type: 'boolean' } } }, latency_ms: { type: 'number' }, timestamp: { type: 'string' } } }, example: { endpoint: 'classify-document', data: { document_type: 'invoice', confidence: 0.98, recommended_extractor: 'extract-invoice', pii_detected: false, summary: 'Invoice from Acme Corp to Client LLC for consulting services.' }, latency_ms: 1200 } } } },
            ...commonErrors,
          },
        },
      },
      '/extract-invoice': {
        post: {
          summary: 'Extract invoice data to structured JSON',
          tags: ['Document Extraction'],
          'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, context: { type: 'string' } }, required: ['text'] }, examples: { basic: { value: invoiceExample } } } } },
          responses: {
            200: { description: 'Structured invoice data', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, data: { type: 'object', properties: { invoice_number: { type: 'string' }, vendor_name: { type: 'string' }, vendor_address: { type: 'string' }, vendor_email: { type: 'string' }, client_name: { type: 'string' }, client_address: { type: 'string' }, issue_date: { type: 'string' }, due_date: { type: 'string' }, currency: { type: 'string' }, subtotal: { type: 'number' }, tax_amount: { type: 'number' }, total_amount: { type: 'number' }, line_items: { type: 'array', items: { type: 'object', properties: { description: { type: 'string' }, quantity: { type: 'number' }, unit_price: { type: 'number' }, total: { type: 'number' } } } }, payment_terms: { type: 'string' }, payment_method: { type: 'string' }, confidence: { type: 'number' }, missing_fields: { type: 'array', items: { type: 'string' } } } }, latency_ms: { type: 'number' } } }, example: { endpoint: 'extract-invoice', data: { invoice_number: '1234', vendor_name: 'Acme Corp', client_name: 'Client LLC', total_amount: 5000, currency: 'USD', confidence: 0.97 }, latency_ms: 3200 } } } },
            ...commonErrors,
          },
        },
      },
      '/extract-contract': {
        post: {
          summary: 'Extract contract key terms to structured JSON',
          tags: ['Document Extraction'],
          'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, context: { type: 'string' } }, required: ['text'] }, examples: { basic: { value: contractExample } } } } },
          responses: { 200: { description: 'parties, dates, value, obligations, risk_flags, confidence', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, data: { type: 'object', properties: { contract_type: { type: 'string' }, parties: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, address: { type: 'string' } } } }, effective_date: { type: 'string' }, expiration_date: { type: 'string' }, value: { type: 'number' }, currency: { type: 'string' }, governing_law: { type: 'string' }, key_obligations: { type: 'array', items: { type: 'object' } }, risk_flags: { type: 'array', items: { type: 'string' } }, confidentiality: { type: 'boolean' }, non_compete: { type: 'boolean' }, auto_renewal: { type: 'boolean' }, confidence: { type: 'number' } } } } } } } }, ...commonErrors },
        },
      },
      '/extract-receipt': {
        post: {
          summary: 'Extract receipt purchase data to structured JSON',
          tags: ['Document Extraction'],
          'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, context: { type: 'string' } }, required: ['text'] }, examples: { basic: { value: receiptExample } } } } },
          responses: { 200: { description: 'merchant, items, total, payment_method, category', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, data: { type: 'object', properties: { merchant_name: { type: 'string' }, date: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, quantity: { type: 'number' }, unit_price: { type: 'number' }, total: { type: 'number' } } } }, subtotal: { type: 'number' }, tax: { type: 'number' }, total: { type: 'number' }, currency: { type: 'string' }, payment_method: { type: 'string' }, category: { type: 'string', enum: ['restaurant','retail','grocery','travel','entertainment','other'] }, confidence: { type: 'number' } } } } } } } }, ...commonErrors },
        },
      },
      '/extract-resume': {
        post: {
          summary: 'Extract resume/CV to structured JSON',
          tags: ['Document Extraction'],
          'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, context: { type: 'string' } }, required: ['text'] }, examples: { basic: { value: resumeExample } } } } },
          responses: { 200: { description: 'name, experience, skills, education, seniority_level, confidence', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, data: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, location: { type: 'string' }, summary: { type: 'string' }, skills: { type: 'array', items: { type: 'string' } }, experience: { type: 'array', items: { type: 'object' } }, education: { type: 'array', items: { type: 'object' } }, total_years_experience: { type: 'number' }, seniority_level: { type: 'string', enum: ['intern','junior','mid','senior','lead','executive'] }, top_skills: { type: 'array', items: { type: 'string' } }, confidence: { type: 'number' } } } } } } } }, ...commonErrors },
        },
      },
      '/extract-custom': {
        post: {
          summary: 'Extract any fields using a custom schema definition',
          tags: ['Document Extraction'],
          'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, schema: { type: 'object', description: 'Field name to type map e.g. {"company": "string", "amount": "number"}', example: { company: 'string', amount: 'number', date: 'string' } }, context: { type: 'string' } }, required: ['text', 'schema'] }, examples: { basic: { value: { text: 'Order from TechSupplies Inc. Amount: $1,250. Date: May 7 2026.', schema: { company: 'string', amount: 'number', date: 'string' } } } } } } },
          responses: { 200: { description: 'Extracted fields matching schema, confidence, missing_fields', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, schema: { type: 'object' }, data: { type: 'object', properties: { confidence: { type: 'number' }, missing_fields: { type: 'array', items: { type: 'string' } } } }, latency_ms: { type: 'number' } } } } } }, ...commonErrors },
        },
      },
      '/execution-gate': {
        post: {
          summary: 'Gate autonomous document processing — returns execute bool, PII detection, data quality',
          tags: ['Execution'],
          'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, action: { type: 'string', description: 'Intended action e.g. store|forward|process' }, context: { type: 'string' } }, required: ['text'] } } } },
          responses: { 200: { description: 'execution_ready, blocking_flags, pii_detected, data_quality, next_api, metadata', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, next_endpoint: { type: 'string' }, data: { type: 'object', properties: { execute: { type: 'boolean' }, confidence: { type: 'number' }, document_type: { type: 'string' }, risk_level: { type: 'string', enum: ['high','medium','low'] }, blocking_flags: { type: 'array', items: { type: 'string' } }, data_quality: { type: 'string', enum: ['high','medium','low'] }, pii_detected: { type: 'boolean' }, financial_data_detected: { type: 'boolean' }, recommended_action: { type: 'string' } } }, metadata: { type: 'object', properties: { latency_ms: { type: 'number' }, estimated_cost: { type: 'number' }, timestamp: { type: 'string' } } } } } } } }, ...commonErrors },
        },
      },
      '/analyze-document': {
        post: {
          summary: 'ONE-CALL: Full document intelligence — classify + extract + gate in one request',
          tags: ['Intelligence', 'Execution'],
          'x-agent-callable': true,
          'x-one-call-workflow': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, context: { type: 'string' } }, required: ['text'] }, examples: { invoice: { value: { ...invoiceExample, context: 'Process for accounting system' } } } } } },
          responses: { 200: { description: 'Complete document intelligence: type, extracted_data, risk_flags, PII, execution gate', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, next_endpoint: { type: 'string' }, data: { type: 'object', properties: { document_type: { type: 'string' }, confidence: { type: 'number' }, summary: { type: 'string' }, extracted_data: { type: 'object' }, risk_flags: { type: 'array', items: { type: 'string' } }, pii_detected: { type: 'boolean' }, financial_data_detected: { type: 'boolean' }, data_quality: { type: 'string' }, execute: { type: 'boolean' }, blocking_flags: { type: 'array', items: { type: 'string' } } } }, metadata: { type: 'object', properties: { latency_ms: { type: 'number' }, estimated_cost: { type: 'number' }, timestamp: { type: 'string' } } } } } } } }, ...commonErrors },
        },
      },
    },
  });
});

export default router;
