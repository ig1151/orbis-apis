import { Router } from 'express';
const router = Router();

router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Agent Market Signal & Portfolio Intelligence API',
      version: '2.0.0',
      description: 'Real-time stock market intelligence for autonomous agents. Score tickers, detect market events, rank watchlists, analyze portfolio risk, monitor positions, stream live prices, and gate autonomous trading actions.',
      'x-agent-callable': true,
      'x-monetization-grade': 'A+',
      'x-pricing': {
        '/score-ticker': 0.004,
        '/detect-market-event': 0.004,
        '/rank-watchlist': 0.005,
        '/portfolio-risk': 0.006,
        '/monitor-watchlist': 0.004,
        '/execution-gate': 0.005,
        '/register-webhook': 0.002,
        '/stream': 0.003,
        '/monitor-status': 0.001,
        '/monitor-cancel': 0.001,
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/market-signal-v2', description: 'Production' }],
    paths: {
      '/score-ticker': { post: { summary: 'Score a ticker for signal strength, momentum, volatility and recommended action', tags: ['Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { ticker: { type: 'string' }, context: { type: 'string' } }, required: ['ticker'] } } } }, responses: { 200: { description: 'signal_score, momentum, volatility, trend, recommended_action, risk_level' } } } },
      '/detect-market-event': { post: { summary: 'Detect market events: gap, volume spike, breakout, breakdown, reversal', tags: ['Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { ticker: { type: 'string' }, context: { type: 'string' } }, required: ['ticker'] } } } }, responses: { 200: { description: 'event_detected, event_type, severity, alert_level, description' } } } },
      '/rank-watchlist': { post: { summary: 'Rank watchlist tickers by signal strength — returns top pick and avoid', tags: ['Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { tickers: { type: 'array', items: { type: 'string' } }, criteria: { type: 'string' } }, required: ['tickers'] } } } }, responses: { 200: { description: 'ranked list with signal_score, momentum, recommendation, top_pick, avoid' } } } },
      '/portfolio-risk': { post: { summary: 'Analyze portfolio risk, concentration, PnL and recommended actions', tags: ['Intelligence'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { holdings: { type: 'array', items: { type: 'object', properties: { ticker: { type: 'string' }, shares: { type: 'number' }, avg_cost: { type: 'number' } } } }, context: { type: 'string' } }, required: ['holdings'] } } } }, responses: { 200: { description: 'overall_risk, risk_score, total_pnl, holdings_analysis, recommended_actions' } } } },
      '/monitor-watchlist': { post: { summary: 'Monitor watchlist for price alerts and surface movers', tags: ['Monitoring'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { tickers: { type: 'array', items: { type: 'string' } }, alert_threshold: { type: 'number' }, context: { type: 'string' } }, required: ['tickers'] } } } }, responses: { 200: { description: 'alerts, movers, alert_count, market_pulse, recommended_action' } } } },
      '/execution-gate': { post: { summary: 'Gate autonomous trading actions — returns execute bool, blocking flags, next API', tags: ['Execution'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { ticker: { type: 'string' }, action: { type: 'string', enum: ['buy', 'sell', 'hold'] }, context: { type: 'string' }, signal_threshold: { type: 'number' } }, required: ['ticker', 'action'] } } } }, responses: { 200: { description: 'execution_ready, next_api, next_endpoint, blocking_flags, signal_score, metadata' } } } },
      '/register-webhook': { post: { summary: 'Register webhook for price alerts when tickers move beyond threshold', tags: ['Webhooks'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { tickers: { type: 'array', items: { type: 'string' } }, webhook_url: { type: 'string' }, alert_threshold: { type: 'number' } }, required: ['tickers', 'webhook_url'] } } } }, responses: { 200: { description: 'Webhook registered with id, tickers, alert_threshold, status' } } } },
      '/stream': { get: { summary: 'SSE stream — real-time price pulses and webhook firing on big moves', tags: ['Streaming'], 'x-agent-callable': true, parameters: [ { name: 'tickers', in: 'query', required: true, schema: { type: 'string' }, description: 'Comma-separated ticker symbols' }, { name: 'interval_ms', in: 'query', required: false, schema: { type: 'number', default: 15000 }, description: 'Polling interval in ms (min 10000)' } ], responses: { 200: { description: 'SSE stream. Events: connected | pulse | error', content: { 'text/event-stream': { schema: { type: 'string' } } } } } } },
      '/monitor-status': { post: { summary: 'Check status of a registered monitor', tags: ['Webhooks'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } } }, responses: { 200: { description: 'Monitor status with trigger_count and tickers' } } } },
      '/monitor-cancel': { post: { summary: 'Cancel an active monitor', tags: ['Webhooks'], 'x-agent-callable': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } } }, responses: { 200: { description: 'Monitor cancelled' } } } },
    },
  });
});

export default router;
