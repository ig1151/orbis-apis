import { Router } from 'express';
const router = Router();

const errorSchema = { type: 'object', properties: { error: { type: 'string' } } };
const commonErrors = {
  400: { description: 'Bad Request — missing required fields', content: { 'application/json': { schema: errorSchema } } },
  401: { description: 'Unauthorized — missing or invalid API key', content: { 'application/json': { schema: errorSchema } } },
  422: { description: 'Validation Error — invalid email format, malformed batch array, or missing domain/email', content: { 'application/json': { schema: errorSchema } } },
  429: { description: 'Rate limit exceeded', content: { 'application/json': { schema: errorSchema } } },
  500: { description: 'Server error', content: { 'application/json': { schema: errorSchema } } },
};

router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Agent Email Intelligence API',
      version: '1.0.0',
      description: 'Email verification, risk scoring, enrichment, domain health, batch processing, and execution-gated workflows for autonomous agents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-monetization-grade': 'A+',
      'x-pricing': {
        '/verify': 0.001,
        '/risk-score': 0.003,
        '/enrich': 0.004,
        '/domain-health': 0.002,
        '/batch-verify': 0.004,
        '/execution-gate': 0.002,
        '/analyze-email': 0.006,
      },
      'x-rate-limits': { free: '100 req/day', builder: '50000 req/day', execution: '250000 req/day' },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/email-intelligence', description: 'Production' }],
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } },
      schemas: { Error: errorSchema },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/verify': { post: { summary: 'Verify email — format, deliverability, disposable detection, domain reputation', tags: ['Verification'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', example: 'john@acme.com' } }, required: ['email'] }, examples: { business: { value: { email: 'john@acme.com' } }, disposable: { value: { email: 'user@mailinator.com' } } } } } }, responses: { 200: { description: 'valid, status, deliverability, is_disposable, risk_score, confidence', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, email: { type: 'string' }, data: { type: 'object', properties: { valid: { type: 'boolean' }, status: { type: 'string', enum: ['valid','invalid','risky','unknown'] }, deliverability: { type: 'string', enum: ['high','medium','low'] }, is_disposable: { type: 'boolean' }, is_free_provider: { type: 'boolean' }, is_business_email: { type: 'boolean' }, is_role_based: { type: 'boolean' }, risk_score: { type: 'number' }, confidence: { type: 'number' } } }, latency_ms: { type: 'number' } } } } } }, ...commonErrors } } },
      '/risk-score': { post: { summary: 'Score email for fraud risk and get allow/block recommendation', tags: ['Risk'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, context: { type: 'string' } }, required: ['email'] }, examples: { basic: { value: { email: 'user@tempmail.com', context: 'signup form' } } } } } }, responses: { 200: { description: 'risk_score, fraud_signals, allow, recommended_action', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, data: { type: 'object', properties: { risk_score: { type: 'number', minimum: 0, maximum: 100 }, risk_level: { type: 'string', enum: ['critical','high','medium','low'] }, fraud_signals: { type: 'array', items: { type: 'string' } }, allow: { type: 'boolean' }, block_reason: { type: 'string', nullable: true }, recommended_action: { type: 'string', enum: ['allow','flag','block','verify'] }, confidence: { type: 'number' } } } } } } } }, ...commonErrors } } },
      '/enrich': { post: { summary: 'Enrich email with company, industry, seniority and LinkedIn query', tags: ['Enrichment'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, context: { type: 'string' } }, required: ['email'] }, examples: { basic: { value: { email: 'john.smith@acme.com' } } } } } }, responses: { 200: { description: 'company_name, industry, seniority, linkedin_search_query, crm_ready', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, data: { type: 'object', properties: { email_type: { type: 'string', enum: ['personal','business','role','disposable','unknown'] }, company_name: { type: 'string', nullable: true }, company_domain: { type: 'string' }, industry_guess: { type: 'string' }, seniority_guess: { type: 'string' }, linkedin_search_query: { type: 'string' }, crm_ready: { type: 'boolean' } } } } } } } }, ...commonErrors } } },
      '/domain-health': { post: { summary: 'Heuristic domain health check — estimates MX/SPF/DMARC likelihood. Does not perform live DNS lookups.', tags: ['Verification'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { domain: { type: 'string' }, email: { type: 'string' } }, examples: { domain: { value: { domain: 'acme.com' } }, email: { value: { email: 'john@acme.com' } } } } } } }, responses: { 200: { description: 'health_score, reputation, deliverability, MX/SPF/DMARC likelihood', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, domain: { type: 'string' }, data: { type: 'object', properties: { health_score: { type: 'number', minimum: 0, maximum: 100 }, reputation: { type: 'string', enum: ['excellent','good','neutral','poor','unknown'] }, likely_has_mx: { type: 'boolean' }, likely_has_spf: { type: 'boolean' }, likely_has_dmarc: { type: 'boolean' }, deliverability: { type: 'string', enum: ['high','medium','low'] }, recommended_action: { type: 'string' } } } } } } } }, ...commonErrors } } },
      '/batch-verify': { post: { summary: 'Batch verify up to 50 emails for validity, risk and CRM readiness', tags: ['Verification'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { emails: { type: 'array', items: { type: 'string' }, maxItems: 50 } }, required: ['emails'] }, examples: { basic: { value: { emails: ['john@acme.com','user@mailinator.com','info@company.com'] } } } } } }, responses: { 200: { description: 'total, valid, crm_ready, high_risk counts with per-email results', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, total: { type: 'number' }, valid: { type: 'number' }, invalid: { type: 'number' }, crm_ready: { type: 'number' }, high_risk: { type: 'number' }, results: { type: 'array', items: { type: 'object' } }, latency_ms: { type: 'number' } } } } } }, ...commonErrors } } },
      '/execution-gate': { post: { summary: 'Gate autonomous email workflows — returns execute bool, blocking flags, next API', tags: ['Execution'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, action: { type: 'string', description: 'Intended action e.g. send|store|enrich' }, context: { type: 'string' }, risk_threshold: { type: 'number', default: 50 } }, required: ['email'] } } } }, responses: { 200: { description: 'execution_ready, blocking_flags, risk_score, next_api, metadata', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, email: { type: 'string' }, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, next_endpoint: { type: 'string' }, data: { type: 'object', properties: { execute: { type: 'boolean' }, valid: { type: 'boolean' }, risk_score: { type: 'number' }, risk_level: { type: 'string' }, blocking_flags: { type: 'array', items: { type: 'string' } }, confidence: { type: 'number' } } }, metadata: { type: 'object', properties: { latency_ms: { type: 'number' }, estimated_cost: { type: 'number' }, timestamp: { type: 'string' } } } } } } } }, ...commonErrors } } },
      '/analyze-email': { post: { summary: 'ONE-CALL: Full email intelligence — verify + risk + enrich + gate', tags: ['Intelligence', 'Execution'], 'x-agent-callable': true, 'x-one-call-workflow': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, context: { type: 'string' } }, required: ['email'] }, examples: { business: { value: { email: 'john.smith@acme.com', context: 'CRM enrichment' } }, risky: { value: { email: 'user@tempmail.com', context: 'signup verification' } } } } } }, responses: { 200: { description: 'Complete email intelligence with execution gate', content: { 'application/json': { schema: { type: 'object', properties: { endpoint: { type: 'string' }, email: { type: 'string' }, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, next_endpoint: { type: 'string' }, data: { type: 'object', properties: { valid: { type: 'boolean' }, risk_score: { type: 'number' }, risk_level: { type: 'string' }, is_disposable: { type: 'boolean' }, is_business_email: { type: 'boolean' }, company_name: { type: 'string', nullable: true }, crm_ready: { type: 'boolean' }, allow: { type: 'boolean' }, blocking_flags: { type: 'array', items: { type: 'string' } }, execute: { type: 'boolean' }, confidence: { type: 'number' } } }, metadata: { type: 'object', properties: { latency_ms: { type: 'number' }, estimated_cost: { type: 'number' }, timestamp: { type: 'string' } } } } } } } }, ...commonErrors } } },
    },
  });
});

export default router;
