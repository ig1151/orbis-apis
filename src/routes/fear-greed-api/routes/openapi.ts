import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const indexSchema = {
  type: 'object', properties: {
    value: { type: 'number', minimum: 0, maximum: 100 },
    label: { type: 'string', enum: ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'] },
    previous_day: { type: 'number' }, previous_week: { type: 'number' }, previous_month: { type: 'number' },
    change_24h: { type: 'number' }, trend: { type: 'string', enum: ['improving', 'deteriorating', 'stable'] },
  }
};

const driverSchema = {
  type: 'array', items: {
    type: 'object', properties: {
      factor: { type: 'string' }, weight_pct: { type: 'number' },
      current_reading: { type: 'string' }, sentiment: { type: 'string', enum: ['bearish', 'neutral', 'bullish'] },
    }
  }
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Fear & Greed Index API',
      version: '1.0.0',
      description: 'Crypto and market Fear & Greed Index — current value, history, and drivers for sentiment-aware trading agents and portfolio managers.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { current: '$0.002', history: '$0.003', lookup: '$0.004' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-paper-mode-recommended': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/fear-greed' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'fearGreedDiscovery',
          summary: 'API discovery — name, version, available endpoints',
          security: [],
          responses: { '200': { description: 'Discovery info' } },
        },
      },
      '/current': {
        post: {
          operationId: 'fearGreedCurrent',
          summary: 'Current Fear & Greed Index — value, label, drivers, market context, and signal',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { asset: { type: 'string', default: 'crypto', enum: ['crypto', 'stocks', 'global'] } } } } } },
          responses: {
            '200': {
              description: 'Current index with drivers and trade signal',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      asset: { type: 'string' },
                      index: indexSchema,
                      drivers: driverSchema,
                      market_context: { type: 'string' },
                      signal: { type: 'string', enum: ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'] },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/history': {
        post: {
          operationId: 'fearGreedHistory',
          summary: 'Historical Fear & Greed values — daily readings, summary stats, and streak analysis',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { days: { type: 'integer', minimum: 1, maximum: 365, default: 30 }, asset: { type: 'string', default: 'crypto' } } } } } },
          responses: {
            '200': {
              description: 'Historical readings with summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      asset: { type: 'string' },
                      period_days: { type: 'integer' },
                      history: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            date: { type: 'string', format: 'date' },
                            value: { type: 'number', minimum: 0, maximum: 100 },
                            label: { type: 'string' },
                          },
                        },
                      },
                      summary: {
                        type: 'object', properties: {
                          avg_value: { type: 'number' }, avg_label: { type: 'string' },
                          days_in_fear: { type: 'integer' }, days_in_greed: { type: 'integer' },
                          min_value: { type: 'number' }, max_value: { type: 'number' },
                          current_streak: { type: 'string' },
                        },
                      },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'fearGreedLookup',
          summary: 'ONE-CALL: current index + 30d history + contrarian opportunity signal',
          'x-one-call': true,
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { asset: { type: 'string', default: 'crypto' } } } } } },
          responses: {
            '200': {
              description: 'Full sentiment intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      asset: { type: 'string' },
                      index: indexSchema,
                      drivers: driverSchema,
                      '30d_summary': {
                        type: 'object', properties: {
                          avg_value: { type: 'number' }, days_in_fear: { type: 'integer' },
                          days_in_greed: { type: 'integer' }, current_streak: { type: 'string' },
                        },
                      },
                      market_context: { type: 'string' },
                      signal: { type: 'string', enum: ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'] },
                      contrarian_opportunity: { type: 'boolean' },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '500': { description: 'Internal error' },
          },
        },
      },
    },
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
    },
  });
});

export default router;
