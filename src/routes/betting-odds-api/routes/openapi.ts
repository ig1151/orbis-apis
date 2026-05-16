import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Betting Odds API', version: '1.0.0', description: 'Get real-time betting odds, track line movements, and find the best price across bookmakers for sports analytics, arbitrage detection, and odds intelligence agents', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-disclaimer': 'For informational purposes only. Not gambling advice.', 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { odds: '$0.003', 'line-movement': '$0.004', 'best-price': '$0.003', 'execution-gate': '$0.001', analyze: '$0.006' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/betting-odds' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/odds': { post: { operationId: 'getOdds', summary: 'Get betting odds across bookmakers', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport', 'event_id'], properties: { sport: { type: 'string' }, event_id: { type: 'string' } } } } } }, responses: { '200': { description: 'Betting odds', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, odds: { type: 'array', items: { type: 'object' } }, implied_probabilities: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/line-movement': { post: { operationId: 'lineMovement', summary: 'Track betting line movement over time', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport', 'event_id'], properties: { sport: { type: 'string' }, event_id: { type: 'string' } } } } } }, responses: { '200': { description: 'Line movement', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, line_history: { type: 'array', items: { type: 'object' } }, movement_summary: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/best-price': { post: { operationId: 'bestPrice', summary: 'Find best price across bookmakers for a market', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport', 'event_id', 'market'], properties: { sport: { type: 'string' }, event_id: { type: 'string' }, market: { type: 'string' } } } } } }, responses: { '200': { description: 'Best prices', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, best_prices: { type: 'array', items: { type: 'object' } }, arbitrage_opportunity: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport'], properties: { sport: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/analyze': { post: { operationId: 'analyze', summary: 'ONE-CALL: full odds analysis — odds + line movement + arbitrage', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport', 'event_id'], properties: { sport: { type: 'string' }, event_id: { type: 'string' } } } } } }, responses: { '200': { description: 'Full odds analysis', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, odds_comparison: { type: 'array', items: { type: 'object' } }, value_bets: { type: 'array', items: { type: 'object' } }, arbitrage_check: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
