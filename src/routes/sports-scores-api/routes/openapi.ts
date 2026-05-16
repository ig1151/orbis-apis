import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };
const provenance = { type: 'object', properties: { provider: { type: 'string' }, retrieved_at: { type: 'string', format: 'date-time' }, freshness_score: { type: 'number', minimum: 0, maximum: 1 } } };
const chainFields = { source_provenance: provenance, cache_ttl_seconds: { type: 'integer' }, cache_recommended: { type: 'boolean' }, recommended_next_api: { type: 'string' }, recommended_next_endpoint: { type: 'string' }, automation_safe: { type: 'boolean' } };

const gameItem = { type: 'object', properties: { game_id: { type: 'string' }, home_team: { type: 'string' }, away_team: { type: 'string' }, home_score: { type: 'integer' }, away_score: { type: 'integer' }, status: { type: 'string', enum: ['live', 'final', 'scheduled'] }, period: { type: 'string' }, time_remaining: { type: 'string' }, start_time: { type: 'string', format: 'date-time' }, venue: { type: 'string' } } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Sports Scores API',
      version: '2.0.0',
      description: 'Live scores, game details, team stats, and AI-powered game predictions for sports analytics and betting intelligence agents',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 500, requests_per_month: 15000 }, pay_per_call: { 'live-scores': '$0.002', 'game-details': '$0.002', 'team-stats': '$0.003', 'execution-gate': '$0.001', 'sports-intelligence': '$0.005', 'game-prediction': '$0.004', batch: '$0.008' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/sports-scores' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/live-scores': {
        post: {
          operationId: 'getLiveScores',
          summary: 'Get live and recent scores for a sport and league',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport'], properties: { sport: { type: 'string' }, league: { type: 'string' }, date: { type: 'string', format: 'date' } } } } } },
          responses: { '200': { description: 'Live scores', content: { 'application/json': { schema: { type: 'object', required: ['trace_id', 'computed_at', 'success'], properties: { ...traceFields, sport: { type: 'string' }, league: { type: 'string' }, games: { type: 'array', items: gameItem }, total_games: { type: 'integer' }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/game-details': {
        post: {
          operationId: 'getGameDetails',
          summary: 'Get full game details including stats and scoring events',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['game_id'], properties: { game_id: { type: 'string' } } } } } },
          responses: { '200': { description: 'Game details', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, game_id: { type: 'string' }, details: { type: 'object', properties: { home_team: { type: 'string' }, away_team: { type: 'string' }, home_score: { type: 'integer' }, away_score: { type: 'integer' }, status: { type: 'string', enum: ['live', 'final', 'scheduled'] }, period: { type: 'string' }, venue: { type: 'string' }, attendance: { type: 'integer' }, scoring_events: { type: 'array', items: { type: 'object', properties: { time: { type: 'string' }, team: { type: 'string' }, player: { type: 'string' }, event_type: { type: 'string' }, score_after: { type: 'string' } } } }, team_stats: { type: 'object', additionalProperties: { type: 'object' } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/team-stats': {
        post: {
          operationId: 'getTeamStats',
          summary: 'Get season statistics for a team',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['team', 'sport'], properties: { team: { type: 'string' }, sport: { type: 'string' }, season: { type: 'string' } } } } } },
          responses: { '200': { description: 'Team stats', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, team: { type: 'string' }, sport: { type: 'string' }, stats: { type: 'object', properties: { wins: { type: 'integer' }, losses: { type: 'integer' }, draws: { type: 'integer' }, win_rate: { type: 'number', minimum: 0, maximum: 1 }, points_scored_avg: { type: 'number' }, points_allowed_avg: { type: 'number' }, home_record: { type: 'string' }, away_record: { type: 'string' }, current_streak: { type: 'string' }, top_performers: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, position: { type: 'string' }, stat: { type: 'string' }, value: { type: 'number' } } } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
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
      '/sports-intelligence': {
        post: {
          operationId: 'sportsIntelligence',
          summary: 'ONE-CALL: live scores + standings + top performers + injury alerts',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport'], properties: { sport: { type: 'string' }, league: { type: 'string' }, context: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full sports intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, sport: { type: 'string' }, live_games: { type: 'array', items: gameItem }, top_performers_today: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, team: { type: 'string' }, stat: { type: 'string' }, value: { type: 'number' } } } }, standings_snapshot: { type: 'array', items: { type: 'object', properties: { rank: { type: 'integer' }, team: { type: 'string' }, wins: { type: 'integer' }, losses: { type: 'integer' }, win_rate: { type: 'number' } } } }, notable_injuries: { type: 'array', items: { type: 'object', properties: { player: { type: 'string' }, team: { type: 'string' }, status: { type: 'string' } } } }, ...chainFields, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } },
        },
      },
      '/game-prediction': {
        post: {
          operationId: 'gamePrediction',
          summary: 'AI-powered win probability and score prediction for upcoming game',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['home_team', 'away_team', 'sport'], properties: { home_team: { type: 'string' }, away_team: { type: 'string' }, sport: { type: 'string' }, game_date: { type: 'string', format: 'date' } } } } } },
          responses: {
            '200': {
              description: 'Game prediction',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      home_team: { type: 'string' }, away_team: { type: 'string' }, sport: { type: 'string' },
                      prediction: { type: 'object', properties: { winner: { type: 'string', enum: ['home', 'away', 'draw'] }, win_probability: { type: 'object', properties: { home: { type: 'number' }, away: { type: 'number' }, draw: { type: 'number' } } }, predicted_score: { type: 'object', properties: { home: { type: 'integer' }, away: { type: 'integer' } } }, confidence: { type: 'number', minimum: 0, maximum: 1 } } },
                      team_momentum: { type: 'object', additionalProperties: { type: 'object', properties: { last_5: { type: 'string' }, momentum_score: { type: 'number' } } } },
                      key_factors: { type: 'array', items: { type: 'string' } },
                      injury_impact: { type: 'array', items: { type: 'string' } },
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
          operationId: 'batchScores',
          summary: 'Batch fetch scores for multiple games (max 10)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['games'], properties: { games: { type: 'array', items: { type: 'object', properties: { game_id: { type: 'string' } }, required: ['game_id'] }, minItems: 1, maxItems: 10 } } } } } },
          responses: { '200': { description: 'Batch scores', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, batch_count: { type: 'integer' }, results: { type: 'array', items: gameItem }, ...chainFields } } } } } },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
