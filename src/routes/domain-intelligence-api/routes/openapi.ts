import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Domain Intelligence API',
      version: '1.0.0',
      description: 'WHOIS data, technology stack detection, and company identification from domain names for autonomous research and enrichment workflows.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { whois: '$0.002', 'tech-stack': '$0.003', 'company-from-domain': '$0.003', 'execution-gate': '$0.001', lookup: '$0.006' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/domain-intelligence' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/whois': {
        post: {
          operationId: 'whoisLookup',
          summary: 'WHOIS data — registrar, dates, name servers, registrant country',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['domain'], properties: { domain: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'WHOIS result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, domain: { type: 'string' }, whois: { type: 'object' }, domain_age_days: { type: 'number' }, risk_signals: actions, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing domain' }, '500': { description: 'Failed' },
          },
        },
      },
      '/tech-stack': {
        post: {
          operationId: 'techStack',
          summary: 'Technology stack detection — CMS, CDN, analytics, hosting, CRM',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['domain'], properties: { domain: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Tech stack', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, domain: { type: 'string' }, tech_stack: { type: 'object' }, stack_maturity: { type: 'string', enum: ['startup', 'growing', 'enterprise'] }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing domain' }, '500': { description: 'Failed' },
          },
        },
      },
      '/company-from-domain': {
        post: {
          operationId: 'companyFromDomain',
          summary: 'Identify company from domain — name, industry, headcount range, HQ',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['domain'], properties: { domain: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Company identification', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, domain: { type: 'string' }, company: { type: 'object' }, match_confidence: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing domain' }, '500': { description: 'Failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check before domain intelligence workflow',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['domain'], properties: { domain: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'lookup',
          summary: 'ONE-CALL: full domain intelligence — WHOIS + tech stack + company identification',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['domain'], properties: { domain: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Full domain intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, domain: { type: 'string' }, whois: { type: 'object' }, tech_stack: { type: 'object' }, company: { type: 'object' }, risk_signals: actions, risk_score: { type: 'number' }, domain_quality: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing domain' }, '500': { description: 'Failed' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
