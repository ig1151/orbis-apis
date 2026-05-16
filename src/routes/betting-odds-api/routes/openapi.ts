import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };
const provenance = { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } };
const chainFields = { source_provenance: provenance, cache_ttl_seconds: { type: 'integer' }, cache_recommended: { type: 'boolean' }, recommended_next_api: { type: 'string' }, recommended_next_endpoint: { type: 'string' }, automation_safe: { type: 'boolean' } };

const oddsItem = { type: 'object', properties: { bookmaker: { type: 'string' }, home_odds: { type: 'number' }, away_odds: { type: 'number' }, draw_odds: { type: 'number' }, home_american: { type: 'integer' }, away_american: { type: 'integer' }, implied_home_prob: { type: 'number', minimum: 0, maximum: 1 }, implied_away_prob: { type: 'number', minimum: 0, maximum: 1 }, last_updated: { type: 'string', format: 'date-time' }, is_live: { type: 'boolean' } } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Betting Odds API',
      version: '2.0.0',
      description: 'Real-time odds comparison, line movement tracking, arbitrage detection, and value bet discovery for sports betting intelligence agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 200, requests_per_month: 6000 }, pay_per_call: { odds: '$0.002', 'line-movement': '$0.003', comparison: '$0.003', 'execution-gate': '$0.001', 'betting-intelligence': '$0.006', arbitrage: '$0.005', batch: '$0.008' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/betting-odds' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/odds': {
        post: {
          operationId: 'getOdds',
          summary: 'Get betting odds for a sport and event',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport'], properties: { sport: { type: 'string' }, event_id: { type: 'string' }, market: { type: 'string', enum: ['moneyline', 'spread', 'totals', 'props'] } } } } } },
          responses: { '200': { description: 'Betting odds', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, sport: { type: 'string' }, event_id: { type: 'string' }, market: { type: 'string' }, odds: { type: 'array', items: oddsItem }, consensus_line: { type: 'object', properties: { home: { type: 'number' }, away: { type: 'number' } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/line-movement': {
        post: {
          operationId: 'lineMovement',
          summary: 'Track line movement history and sharp money signals',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['event_id', 'sport'], properties: { event_id: { type: 'string' }, sport: { type: 'string' } } } } } },
          responses: { '200': { description: 'Line movement', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, event_id: { type: 'string' }, opening_line: { type: 'object', properties: { home: { type: 'number' }, away: { type: 'number' }, timestamp: { type: 'string' } } }, current_line: { type: 'object', properties: { home: { type: 'number' }, away: { type: 'number' }, timestamp: { type: 'string' } } }, movement_history: { type: 'array', items: { type: 'object', properties: { timestamp: { type: 'string' }, home: { type: 'number' }, away: { type: 'number' }, reason: { type: 'string' } } } }, sharp_money_indicator: { type: 'string', enum: ['home', 'away', 'balanced'] }, public_betting_pct: { type: 'object', properties: { home: { type: 'number' }, away: { type: 'number' } } }, steam_moves: { type: 'array', items: { type: 'object', properties: { time: { type: 'string' }, direction: { type: 'string', enum: ['home', 'away'] }, magnitude: { type: 'string', enum: ['small', 'medium', 'large'] } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/comparison': {
        post: {
          operationId: 'compareOdds',
          summary: 'Compare odds across all bookmakers for best value',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['event_id', 'sport'], properties: { event_id: { type: 'string' }, sport: { type: 'string' }, market: { type: 'string' } } } } } },
          responses: { '200': { description: 'Odds comparison', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, event_id: { type: 'string' }, best_home_odds: { type: 'object', properties: { bookmaker: { type: 'string' }, odds: { type: 'number' }, american: { type: 'integer' } } }, best_away_odds: { type: 'object', properties: { bookmaker: { type: 'string' }, odds: { type: 'number' }, american: { type: 'integer' } } }, bookmaker_matrix: { type: 'array', items: { type: 'object', properties: { bookmaker: { type: 'string' }, home: { type: 'number' }, away: { type: 'number' }, vig: { type: 'number' } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport'], properties: { sport: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, blocking_flags: actions, next_api: { type: 'string' }, ...chainFields, confidence_per_section: confidence, privacy } } } } } },
        },
      },
      '/betting-intelligence': {
        post: {
          operationId: 'bettingIntelligence',
          summary: 'ONE-CALL: best bets + arbitrage + line movement alerts',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport'], properties: { sport: { type: 'string' }, event_id: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full betting intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, sport: { type: 'string' }, best_bets: { type: 'array', items: { type: 'object', properties: { event: { type: 'string' }, pick: { type: 'string' }, odds: { type: 'number' }, confidence: { type: 'number' }, reasoning: { type: 'string' } } } }, arbitrage_opportunities: { type: 'array', items: { type: 'object', properties: { event: { type: 'string' }, arb_pct: { type: 'number' }, legs: { type: 'array', items: { type: 'string' } }, guaranteed_profit_pct: { type: 'number' } } } }, line_movements_alert: { type: 'array', items: { type: 'object', properties: { event: { type: 'string' }, direction: { type: 'string', enum: ['home', 'away'] }, significance: { type: 'string', enum: ['high', 'medium', 'low'] } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/arbitrage': {
        post: {
          operationId: 'findArbitrage',
          summary: 'Find guaranteed-profit arbitrage opportunities across bookmakers',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport'], properties: { sport: { type: 'string' }, event_id: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Arbitrage opportunities',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, sport: { type: 'string' }, arbitrage_found: { type: 'boolean' },
                      opportunities: { type: 'array', items: { type: 'object', properties: { event_id: { type: 'string' }, event_name: { type: 'string' }, arb_percentage: { type: 'number' }, guaranteed_profit_pct: { type: 'number' }, legs: { type: 'array', items: { type: 'object', properties: { bookmaker: { type: 'string' }, pick: { type: 'string' }, odds: { type: 'number' }, stake_pct: { type: 'number' } } } }, expires_estimated: { type: 'string', format: 'date-time' } } } },
                      value_bets: { type: 'array', items: { type: 'object', properties: { event: { type: 'string' }, pick: { type: 'string' }, fair_odds: { type: 'number' }, market_odds: { type: 'number' }, edge_pct: { type: 'number' } } } },
                      market_inefficiency_score: { type: 'number', minimum: 0, maximum: 1 },
                      ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy,
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/batch': {
        post: {
          operationId: 'batchOdds',
          summary: 'Batch fetch odds for multiple events (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['events'], properties: { events: { type: 'array', items: { type: 'object', properties: { event_id: { type: 'string' }, sport: { type: 'string' } }, required: ['event_id', 'sport'] }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch odds results', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: { type: 'object', properties: { event_id: { type: 'string' }, sport: { type: 'string' }, best_home_odds: { type: 'number' }, best_away_odds: { type: 'number' }, consensus_pick: { type: 'string' }, arb_available: { type: 'boolean' } } } }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
