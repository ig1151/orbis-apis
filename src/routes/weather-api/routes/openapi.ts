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
      title: 'Weather API',
      version: '1.0.0',
      description: 'Current conditions, multi-day forecasts, and severe weather alerts for location-aware agents, logistics workflows, and event planning automation.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { current: '$0.001', forecast: '$0.002', alerts: '$0.001', 'execution-gate': '$0.001', analyze: '$0.004' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/weather' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/current': {
        post: {
          operationId: 'currentWeather',
          summary: 'Current weather — temperature, humidity, wind, UV index, condition',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string', example: 'New York' } } } } } },
          responses: {
            '200': { description: 'Current conditions', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, location: { type: 'string' }, resolved_location: { type: 'object' }, current: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing location' }, '500': { description: 'Failed' },
          },
        },
      },
      '/forecast': {
        post: {
          operationId: 'weatherForecast',
          summary: '7-day forecast — high/low, precipitation, sunrise/sunset',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' } } } } } },
          responses: {
            '200': { description: '7-day forecast', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, location: { type: 'string' }, forecast: { type: 'array', items: { type: 'object' } }, weekly_summary: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing location' }, '500': { description: 'Failed' },
          },
        },
      },
      '/alerts': {
        post: {
          operationId: 'weatherAlerts',
          summary: 'Severe weather alerts — type, severity, effective times, instructions',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Weather alerts', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, location: { type: 'string' }, alerts: { type: 'array', items: { type: 'object' } }, alert_count: { type: 'number' }, highest_severity: { type: 'string' }, all_clear: { type: 'boolean' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing location' }, '500': { description: 'Failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check before weather workflow',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } },
          },
        },
      },
      '/analyze': {
        post: {
          operationId: 'analyze',
          summary: 'ONE-CALL: full weather intelligence — current + 3-day forecast + alerts + operational impact',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['location'], properties: { location: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Full weather analysis', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, location: { type: 'string' }, resolved_location: { type: 'object' }, current: { type: 'object' }, forecast_3day: { type: 'array', items: { type: 'object' } }, alerts: { type: 'array', items: { type: 'object' } }, all_clear: { type: 'boolean' }, operational_impact: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing location' }, '500': { description: 'Failed' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
