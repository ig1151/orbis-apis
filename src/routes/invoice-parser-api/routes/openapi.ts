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
      title: 'Invoice Parser API', version: '2.0.0',
      description: 'Parse invoices, extract line items, validate financial accuracy, and reconcile against POs for accounts payable automation',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 500, requests_per_month: 15000 }, pay_per_call: { parse: '$0.003', 'extract-line-items': '$0.003', validate: '$0.002', 'execution-gate': '$0.001', 'invoice-intelligence': '$0.008', reconcile: '$0.005', batch: '$0.020' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/invoice-parser' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/parse': { post: { operationId: 'parseInvoice', summary: 'Parse invoice and extract all structured fields', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['invoice_text'], properties: { invoice_text: { type: 'string' }, format: { type: 'string' } } } } } }, responses: { '200': { description: 'Parsed invoice', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, invoice_number: { type: 'string' }, invoice_date: { type: 'string' }, total_amount: { type: 'number' }, currency: { type: 'string' }, line_items: { type: 'array', items: { type: 'object' } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/extract-line-items': { post: { operationId: 'extractLineItems', summary: 'Extract line items from invoice', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['invoice_text'], properties: { invoice_text: { type: 'string' } } } } } }, responses: { '200': { description: 'Line items', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, line_items: { type: 'array', items: { type: 'object' } }, subtotal: { type: 'number' }, total_tax: { type: 'number' }, grand_total: { type: 'number' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } } } },
      '/validate': { post: { operationId: 'validateInvoice', summary: 'Validate invoice fields and math', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['invoice_text'], properties: { invoice_text: { type: 'string' }, po_number: { type: 'string' }, expected_amount: { type: 'number' } } } } } }, responses: { '200': { description: 'Validation result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, is_valid: { type: 'boolean' }, validation_score: { type: 'number' }, errors: { type: 'array', items: { type: 'string' } }, ...chainFields, confidence_per_section: confidence, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['invoice_text'], properties: { invoice_text: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, blocking_flags: actions, ...chainFields, confidence_per_section: confidence, privacy } } } } } } } },
      '/invoice-intelligence': { post: { operationId: 'invoiceIntelligence', summary: 'ONE-CALL: parse + validate + risk + approval recommendation', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['invoice_text'], properties: { invoice_text: { type: 'string' }, context: { type: 'string' } } } } } }, responses: { '200': { description: 'Full invoice intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, invoice_number: { type: 'string' }, vendor: { type: 'string' }, total_amount: { type: 'number' }, approval_recommendation: { type: 'string', enum: ['approve', 'review', 'reject'] }, risk_flags: { type: 'array', items: { type: 'string' } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/reconcile': { post: { operationId: 'reconcileInvoice', summary: 'Reconcile invoice against PO and budget', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['invoice_text'], properties: { invoice_text: { type: 'string' }, po_text: { type: 'string' }, budget_code: { type: 'string' } } } } } }, responses: { '200': { description: 'Reconciliation result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, reconciliation_status: { type: 'string', enum: ['matched', 'partial', 'unmatched'] }, variance: { type: 'number' }, action_required: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } } } },
      '/batch': { post: { operationId: 'batchInvoices', summary: 'Batch parse up to 10 invoices', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['invoices'], properties: { invoices: { type: 'array', items: { type: 'object', properties: { invoice_text: { type: 'string' } } }, maxItems: 10 } } } } } }, responses: { '200': { description: 'Batch results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object' } }, ...chainFields } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
