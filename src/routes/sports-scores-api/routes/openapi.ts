import { Router, Request, Response } from 'express';
const router = Router();
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string' }, success: { type: 'boolean' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: { title: 'Sports Scores API', version: '1.0.0', description: 'Get live and historical sports scores, team schedules, and league standings for sports intelligence, betting analysis, and fan engagement automation', 'x-agent-callable': true, 'x-mcp-compatible': true, 'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scores: '$0.002', schedule: '$0.002', standings: '$0.002', 'execution-gate': '$0.001', lookup: '$0.004' } } },
    servers: [{ url: 'https://orbis-apis.onrender.com/sports-scores' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/scores': { post: { operationId: 'getScores', summary: 'Get live or historical scores for a sport', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport'], properties: { sport: { type: 'string' }, date: { type: 'string' }, team: { type: 'string' } } } } } }, responses: { '200': { description: 'Scores', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, games: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/schedule': { post: { operationId: 'getSchedule', summary: 'Get team schedule for a season', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['team'], properties: { team: { type: 'string' }, season: { type: 'string' } } } } } }, responses: { '200': { description: 'Team schedule', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, schedule: { type: 'array', items: { type: 'object' } }, record: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/standings': { post: { operationId: 'getStandings', summary: 'Get league standings', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport', 'league'], properties: { sport: { type: 'string' }, league: { type: 'string' } } } } } }, responses: { '200': { description: 'League standings', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, standings: { type: 'array', items: { type: 'object' } }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Execution readiness check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport'], properties: { sport: { type: 'string' }, objective: { type: 'string' } } } } } }, responses: { '200': { description: 'Gate result', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, execution_ready: { type: 'boolean' }, next_api: { type: 'string' }, blocking_flags: actions, confidence_per_section: confidence, privacy } } } } } } } },
      '/lookup': { post: { operationId: 'lookup', summary: 'ONE-CALL: full sports intelligence — scores + schedule + standings', 'x-one-call': true, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sport'], properties: { sport: { type: 'string' }, team: { type: 'string' }, date: { type: 'string' } } } } } }, responses: { '200': { description: 'Full sports intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, scores_today: { type: 'array', items: { type: 'object' } }, team_info: { type: 'object' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
