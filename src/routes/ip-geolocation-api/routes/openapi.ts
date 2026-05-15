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
      title: 'IP Geolocation API',
      version: '1.0.0',
      description: 'IP address geolocation, risk scoring, and bulk lookups for fraud detection, personalization, and access control agent workflows.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { lookup: '$0.001', risk: '$0.002', bulk: '$0.008', 'execution-gate': '$0.001', analyze: '$0.004' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/ip-geolocation' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/lookup': {
        post: {
          operationId: 'ipLookup',
          summary: 'Geolocate IP — country, city, lat/lon, ISP, connection type',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ip'], properties: { ip: { type: 'string', example: '8.8.8.8' } } } } } },
          responses: {
            '200': { description: 'IP geolocation', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, ip: { type: 'string' }, geo: { type: 'object' }, network: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing ip' }, '500': { description: 'Failed' },
          },
        },
      },
      '/risk': {
        post: {
          operationId: 'ipRisk',
          summary: 'IP risk score — VPN, Tor, proxy, bot, malicious, blacklist status',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ip'], properties: { ip: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Risk assessment', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, ip: { type: 'string' }, risk: { type: 'object' }, reputation: { type: 'object' }, recommendation: { type: 'string', enum: ['allow', 'flag', 'block', 'captcha'] }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing ip' }, '500': { description: 'Failed' },
          },
        },
      },
      '/bulk': {
        post: {
          operationId: 'ipBulk',
          summary: 'Bulk IP geolocation for up to 50 IPs',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ips'], properties: { ips: { type: 'array', items: { type: 'string' }, maxItems: 50 } } } } } },
          responses: {
            '200': { description: 'Bulk results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, total: { type: 'number' }, results: { type: 'array', items: { type: 'object' } }, summary: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing or oversized ips' }, '500': { description: 'Failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check before IP geolocation workflow',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { ip: { type: 'string' }, ips: { type: 'array', items: { type: 'string' } }, objective: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } },
          },
        },
      },
      '/analyze': {
        post: {
          operationId: 'analyze',
          summary: 'ONE-CALL: full IP intelligence — geo + network + risk + reputation + recommendation',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ip'], properties: { ip: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Full IP intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, ip: { type: 'string' }, geo: { type: 'object' }, network: { type: 'object' }, risk: { type: 'object' }, reputation: { type: 'object' }, recommendation: { type: 'string' }, use_cases: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing ip' }, '500': { description: 'Failed' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
