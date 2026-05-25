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
      title: 'Fear & Greed Index API',
      version: '1.0.0',
      description: 'Crypto and market Fear & Greed Index — current value, history, and drivers for sentiment-aware trading agents and portfolio managers.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 100 }, pay_per_call: { current: '$0.002', history: '$0.003', lookup: '$0.004' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/fear-greed' }],
    paths: {
      '/current': { post: { operationId: 'fearGreedCurrent', summary: 'Current Fear & Greed Index — value, label, drivers, and signal', requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { asset: { type: 'string', default: 'crypto' } } } } } }, responses: { '200': { description: 'Current index', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, index: { type: 'object' }, drivers: { type: 'array', items: { type: 'object' } }, signal: { type: 'string' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, privacy } } } } } } } },
      '/history': { post: { operationId: 'fearGreedHistory', summary: 'Historical Fear & Greed values — daily readings and summary stats', requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { days: { type: 'integer', default: 30 }, asset: { type: 'string', default: 'crypto' } } } } } }, responses: { '200': { description: 'History', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, history: { type: 'array', items: { type: 'object' } }, summary: { type: 'object' }, confidence_per_section: confidence, privacy } } } } } } } },
      '/lookup': { post: { operationId: 'fearGreedLookup', summary: 'ONE-CALL: current index + 30d history + contrarian signal', 'x-one-call': true, requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { asset: { type: 'string', default: 'crypto' } } } } } }, responses: { '200': { description: 'Full sentiment intelligence', content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, index: { type: 'object' }, drivers: { type: 'array' }, '30d_summary': { type: 'object' }, signal: { type: 'string' }, contrarian_opportunity: { type: 'boolean' }, confidence_per_section: confidence, privacy } } } } } } } },
    },
  });
});

export default router;
