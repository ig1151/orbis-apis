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
      title: 'Crypto Price API',
      version: '1.0.0',
      description: 'Real-time crypto prices, OHLC history, and market cap data for DeFi agents, portfolio trackers, and autonomous trading workflows.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { price: '$0.001', ohlc: '$0.002', 'market-cap': '$0.002', 'execution-gate': '$0.001', lookup: '$0.004' },
      },
      'x-financial-disclaimer': 'For informational purposes only. Crypto markets are highly volatile. Not financial advice. Verify data independently before use in trading workflows.',
      'x-paper-mode-recommended': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/crypto-price' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/price': {
        post: {
          operationId: 'cryptoPrice',
          summary: 'Real-time crypto price — USD, 24h change, volume, ATH',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string', example: 'BTC' } } } } } },
          responses: {
            '200': { description: 'Crypto price', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, symbol: { type: 'string' }, price: { type: 'object' }, signal: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] }, financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing symbol' }, '500': { description: 'Failed' },
          },
        },
      },
      '/ohlc': {
        post: {
          operationId: 'cryptoOHLC',
          summary: 'OHLC history — open, high, low, close, volume by interval',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string' }, from_date: { type: 'string' }, to_date: { type: 'string' }, interval: { type: 'string', default: '1d', enum: ['1h', '4h', '1d', '1w'] } } } } } },
          responses: {
            '200': { description: 'OHLC data', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, symbol: { type: 'string' }, interval: { type: 'string' }, ohlc: { type: 'array', items: { type: 'object' } }, summary: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing symbol' }, '500': { description: 'Failed' },
          },
        },
      },
      '/market-cap': {
        post: {
          operationId: 'cryptoMarketCap',
          summary: 'Market cap data — rank, dominance, supply, FDV',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Market cap', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, symbol: { type: 'string' }, market_cap: { type: 'object' }, category: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing symbol' }, '500': { description: 'Failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check before crypto price workflow',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, financial_disclaimer: { type: 'string' }, confidence_per_section: confidence, privacy } } } } },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'lookup',
          summary: 'ONE-CALL: full crypto intelligence — price + market cap + technicals + on-chain signals',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string' } } } } } },
          responses: {
            '200': { description: 'Full crypto intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, symbol: { type: 'string' }, price: { type: 'object' }, market_cap: { type: 'object' }, technicals: { type: 'object' }, on_chain: { type: 'object' }, signal: { type: 'string' }, investment_grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] }, financial_disclaimer: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } },
            '400': { description: 'Missing symbol' }, '500': { description: 'Failed' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
