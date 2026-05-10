import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Market Snapshot API',
      version: '1.0.0',
      description: 'Real-time stock market quotes, watchlists, search, compare and execution gating for autonomous agents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/quote': 0.001, '/watchlist': 0.002, '/search': 0.001, '/compare': 0.002, '/execution-gate': 0.002 },
      disclaimer: 'For informational purposes only. Not financial advice.',
      execution_gate_required: true,
      paper_mode_recommended: true,
      privacy: { data_stored: false, retention: 'none' },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/market-snapshot' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/quote': {
        get: { operationId: 'getQuote', summary: 'Get real-time stock quote', 'x-agent-callable': true,
          parameters: [{ name: 'symbol', in: 'query', required: true, schema: { type: 'string' }, description: 'Ticker(s) e.g. AAPL or AAPL,MSFT,GOOG' }],
          responses: { '200': { description: 'Quote data', content: { 'application/json': { schema: { type: 'object', properties: {
            success: { type: 'boolean' },
            data: { type: 'object', properties: {
              symbol: { type: 'string' }, name: { type: 'string' }, exchange: { type: 'string' },
              currency: { type: 'string' }, price: { type: 'number' }, open: { type: 'number' },
              high: { type: 'number' }, low: { type: 'number' }, previous_close: { type: 'number' },
              change: { type: 'number' }, change_pct: { type: 'string' }, volume: { type: 'integer' },
              is_market_open: { type: 'boolean' },
              fifty_two_week: { type: 'object', properties: { low: { type: 'string' }, high: { type: 'string' }, low_change_percent: { type: 'string' }, high_change_percent: { type: 'string' } } },
              timestamp: { type: 'string', format: 'date-time' },
              confidence_per_section: { type: 'object', properties: { quote: { type: 'number', minimum: 0, maximum: 1 } } },
            }},
            latency_ms: { type: 'number' },
            disclaimer: { type: 'string' },
          }}}}}}},
        post: { operationId: 'postQuote', summary: 'Get quote via POST body', 'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: {
            symbol: { type: 'string', description: 'Single ticker e.g. AAPL' },
            symbols: { type: 'array', items: { type: 'string' }, description: 'Multiple tickers' },
          } } } } },
          responses: { '200': { description: 'Quote data', content: { 'application/json': { schema: { type: 'object', properties: {
            success: { type: 'boolean' },
            data: { type: 'object', properties: {
              symbol: { type: 'string' }, price: { type: 'number' }, change: { type: 'number' },
              change_pct: { type: 'string' }, volume: { type: 'integer' }, is_market_open: { type: 'boolean' },
              confidence_per_section: { type: 'object', properties: { quote: { type: 'number' } } },
            } },
            latency_ms: { type: 'number' }, disclaimer: { type: 'string' },
          } } } } } } },
      },
      '/watchlist': { get: { operationId: 'getWatchlist', summary: 'Get quotes for a watchlist of tickers', 'x-agent-callable': true,
        parameters: [{ name: 'symbols', in: 'query', required: true, schema: { type: 'string' }, description: 'Comma-separated tickers' }],
        responses: { '200': { description: 'Watchlist quotes', content: { 'application/json': { schema: { type: 'object', properties: {
          success: { type: 'boolean' },
          count: { type: 'integer' },
          data: { type: 'object', additionalProperties: { type: 'object' } },
          latency_ms: { type: 'number' },
        }}}}}}}},
      '/search': { get: { operationId: 'searchSymbol', summary: 'Search for ticker symbols by company name or partial ticker', 'x-agent-callable': true,
        parameters: [{ name: 'query', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Search results', content: { 'application/json': { schema: { type: 'object', properties: {
          success: { type: 'boolean' },
          query: { type: 'string' },
          count: { type: 'integer' },
          data: { type: 'array', items: { type: 'object', properties: {
            symbol: { type: 'string' }, name: { type: 'string' }, exchange: { type: 'string' },
            type: { type: 'string' }, currency: { type: 'string' },
          }}},
          latency_ms: { type: 'number' },
        }}}}}}}},
      '/compare': { post: { operationId: 'compareSymbols', summary: 'Compare multiple tickers side by side ranked by performance', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbols'], properties: {
          symbols: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 10 },
        }}}}},
        responses: { '200': { description: 'Comparison ranked by performance', content: { 'application/json': { schema: { type: 'object', properties: {
          success: { type: 'boolean' },
          count: { type: 'integer' },
          winner: { type: 'string', description: 'Top performing ticker' },
          ranked: { type: 'array', items: { type: 'object', properties: {
            rank: { type: 'integer' }, symbol: { type: 'string' }, price: { type: 'number' },
            change_pct: { type: 'string' }, volume: { type: 'integer' },
          }}},
          disclaimer: { type: 'string' },
          confidence_per_section: { type: 'object', properties: { comparison: { type: 'number' } } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string' },
          latency_ms: { type: 'number' },
        }}}}}}}},
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate autonomous trading actions based on live market conditions', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol', 'action'], properties: {
          symbol: { type: 'string' }, action: { type: 'string', enum: ['buy', 'sell', 'hold'] },
          threshold_pct: { type: 'number', default: 3, description: 'Max allowed change % before blocking' },
        }}}}},
        responses: { '200': { description: 'Execution gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          success: { type: 'boolean' },
          symbol: { type: 'string' },
          action: { type: 'string' },
          execute: { type: 'boolean' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          quote: { type: 'object' },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'string' },
          disclaimer: { type: 'string' },
          latency_ms: { type: 'number' },
        }}}}}}}},
      '/health': { get: { operationId: 'health', summary: 'Health check', responses: { '200': { description: 'OK' } } } },
    },
  });
});
export default router;
