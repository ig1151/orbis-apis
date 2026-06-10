import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const moverItem = {
  type: 'object', properties: {
    rank: { type: 'integer' }, symbol: { type: 'string' }, name: { type: 'string' },
    price_usd: { type: 'number' }, change_pct: { type: 'number' },
    volume_24h_usd: { type: 'number' }, market_cap_usd: { type: 'number' },
    category: { type: 'string', enum: ['layer1', 'layer2', 'defi', 'meme', 'nft', 'stablecoin', 'other'] },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Top Movers API',
      version: '1.0.0',
      description: 'Real-time top crypto gainers, losers, and trending coins. Built for trading agents, market scanners, and portfolio dashboards that need to act on momentum signals.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { gainers: '$0.002', losers: '$0.002', trending: '$0.002', lookup: '$0.005' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice.',
      'x-paper-mode-recommended': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/top-movers' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: { operationId: 'moversDiscovery', summary: 'API discovery', security: [], responses: { '200': { description: 'Discovery info' } } },
      },
      '/gainers': {
        post: {
          operationId: 'topGainers',
          summary: 'Top crypto gainers — ranked by % gain with momentum, signal, and category',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, timeframe: { type: 'string', enum: ['1h', '4h', '24h', '7d'], default: '24h' }, min_market_cap_usd: { type: 'number', default: 0 } } } } } },
          responses: {
            '200': {
              description: 'Top gainers list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      timeframe: { type: 'string' },
                      gainers: {
                        type: 'array', items: {
                          allOf: [{ ...moverItem }, { type: 'object', properties: { signal: { type: 'string', enum: ['bullish', 'neutral'] }, momentum: { type: 'string', enum: ['accelerating', 'steady', 'fading'] } } }],
                        },
                      },
                      market_context: { type: 'string' },
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
      '/losers': {
        post: {
          operationId: 'topLosers',
          summary: 'Top crypto losers — ranked by % decline with recovery likelihood and cause',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, timeframe: { type: 'string', enum: ['1h', '4h', '24h', '7d'], default: '24h' }, min_market_cap_usd: { type: 'number', default: 0 } } } } } },
          responses: {
            '200': {
              description: 'Top losers list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      timeframe: { type: 'string' },
                      losers: {
                        type: 'array', items: {
                          allOf: [{ ...moverItem }, { type: 'object', properties: { signal: { type: 'string', enum: ['bearish', 'neutral'] }, recovery_likelihood: { type: 'string', enum: ['high', 'medium', 'low'] }, possible_cause: { type: 'string' } } }],
                        },
                      },
                      market_context: { type: 'string' },
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
      '/trending': {
        post: {
          operationId: 'trending',
          summary: 'Trending coins — by search volume, social mentions, and on-chain activity',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 } } } } } },
          responses: {
            '200': {
              description: 'Trending coins with trend score and drivers',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      trending: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            rank: { type: 'integer' }, symbol: { type: 'string' }, name: { type: 'string' },
                            price_usd: { type: 'number' }, change_pct_24h: { type: 'number' },
                            trend_score: { type: 'number', minimum: 0, maximum: 100 },
                            trend_drivers: { type: 'array', items: { type: 'string', enum: ['social_volume', 'search_spike', 'on_chain_activity', 'exchange_listing', 'news'] } },
                            category: { type: 'string' }, risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
                          },
                        },
                      },
                      narrative: { type: 'string' },
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
      '/lookup': {
        post: {
          operationId: 'moversLookup',
          summary: 'ONE-CALL: gainers + losers + trending + market sentiment + sector rotation',
          'x-one-call': true,
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { limit: { type: 'integer', default: 5 }, timeframe: { type: 'string', default: '24h', enum: ['1h', '4h', '24h', '7d'] } } } } } },
          responses: {
            '200': {
              description: 'Full market movers snapshot',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      timeframe: { type: 'string' },
                      gainers: { type: 'array', items: { type: 'object', properties: { rank: { type: 'integer' }, symbol: { type: 'string' }, change_pct: { type: 'number' }, price_usd: { type: 'number' }, momentum: { type: 'string' } } } },
                      losers: { type: 'array', items: { type: 'object', properties: { rank: { type: 'integer' }, symbol: { type: 'string' }, change_pct: { type: 'number' }, price_usd: { type: 'number' }, recovery_likelihood: { type: 'string' } } } },
                      trending: { type: 'array', items: { type: 'object', properties: { rank: { type: 'integer' }, symbol: { type: 'string' }, trend_score: { type: 'number' }, trend_drivers: { type: 'array', items: { type: 'string' } } } } },
                      market_sentiment: { type: 'string', enum: ['risk_on', 'risk_off', 'mixed'] },
                      sector_rotation: { type: 'string' },
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
