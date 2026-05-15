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
      title: 'FX Rates API',
      version: '1.0.0',
      description: 'Foreign exchange rate conversion, latest multi-currency rates, and historical FX data for finance agents and international payment workflows.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { convert: '$0.001', latest: '$0.001', historical: '$0.002', 'execution-gate': '$0.001', lookup: '$0.004' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/fx-rates' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/convert': {
        post: {
          operationId: 'fxConvert',
          summary: 'Convert currency amount — rate, bid/ask, spread',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['from', 'to', 'amount'], properties: { from: { type: 'string', example: 'USD' }, to: { type: 'string', example: 'EUR' }, amount: { type: 'number', example: 100 } } } } } },
          responses: {
            '200': { description: 'Conversion result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, from: { type: 'string' }, to: { type: 'string' }, amount: { type: 'number' }, converted_amount: { type: 'number' }, rate: { type: 'number' }, spread_pct: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing fields' }, '500': { description: 'Failed' },
          },
        },
      },
      '/latest': {
        post: {
          operationId: 'fxLatest',
          summary: 'Latest mid-market rates for 20 major currencies',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { base: { type: 'string', default: 'USD' } } } } } },
          responses: {
            '200': { description: 'Latest rates', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, base: { type: 'string' }, rates: { type: 'object', additionalProperties: { type: 'number' } }, rate_timestamp: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '500': { description: 'Failed' },
          },
        },
      },
      '/historical': {
        post: {
          operationId: 'fxHistorical',
          summary: 'Historical FX rate for a currency pair on a specific date',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['from_currency', 'to_currency', 'date'], properties: { from_currency: { type: 'string' }, to_currency: { type: 'string' }, date: { type: 'string', example: '2025-01-15' } } } } } },
          responses: {
            '200': { description: 'Historical rate', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, from_currency: { type: 'string' }, to_currency: { type: 'string' }, date: { type: 'string' }, rate: { type: 'number' }, open: { type: 'number' }, high: { type: 'number' }, low: { type: 'number' }, close: { type: 'number' }, context: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing fields' }, '500': { description: 'Failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check before FX workflow',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, base: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'lookup',
          summary: 'ONE-CALL: full FX intelligence — rate + historical context + technical signals',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['from', 'to'], properties: { from: { type: 'string' }, to: { type: 'string' }, amount: { type: 'number' } } } } } },
          responses: {
            '200': { description: 'Full FX intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, from: { type: 'string' }, to: { type: 'string' }, current_rate: { type: 'object' }, converted_amount: { type: 'number' }, historical_context: { type: 'object' }, technical_signals: { type: 'object' }, macro_factors: actions, volatility_score: { type: 'number' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing fields' }, '500': { description: 'Failed' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
