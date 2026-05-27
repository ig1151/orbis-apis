import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const tickerItem = {
  type: 'object', properties: {
    exchange: { type: 'string' },
    bid: { type: 'number' }, ask: { type: 'number' }, last: { type: 'number' },
    volume_24h: { type: 'number' }, volume_usd_24h: { type: 'number' },
    price_change_pct_24h: { type: 'number' },
    market_share_pct: { type: 'number' },
    latency_ms: { type: 'number' },
  },
};

const discoverySchema = {
  type: 'object', properties: {
    name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
    docs_url: { type: 'string', format: 'uri' }, openapi_url: { type: 'string', format: 'uri' },
    health: { type: 'string' },
    auth: { type: 'object', properties: { type: { type: 'string' }, header: { type: 'string' }, docs: { type: 'string' } } },
    endpoints: { type: 'array', items: { type: 'object', properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
    pricing: { type: 'object', properties: { free_tier: { type: 'object', properties: { requests_per_day: { type: 'integer' }, requests_per_month: { type: 'integer' } } }, pay_per_call: { type: 'object', additionalProperties: { type: 'string' } } } },
    agent_capabilities: { type: 'array', items: { type: 'string' } },
    x402_compatible: { type: 'boolean' }, paper_mode_recommended: { type: 'boolean' },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Multi-Exchange Ticker API',
      version: '1.0.0',
      description: 'Fetch real-time price and volume ticker data across multiple exchanges, compare spreads, and get unified best-price recommendations for trading agents.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { ticker: '$0.003', compare: '$0.003', lookup: '$0.008' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/multi-exchange-ticker' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'multiExchangeTickerDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/ticker': {
        post: {
          operationId: 'multiExchangeTickerGet',
          summary: 'Price and volume for a symbol across all major exchanges',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair (e.g. BTC/USDT, ETH/USDT)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ticker data across all exchanges with global stats',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      tickers: { type: 'array', items: tickerItem },
                      global_stats: {
                        type: 'object', properties: {
                          total_volume_usd_24h: { type: 'number' },
                          highest_price: { type: 'number' }, lowest_price: { type: 'number' },
                          price_spread_pct: { type: 'number' },
                          most_liquid_exchange: { type: 'string' },
                        },
                      },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions,
                      chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing symbol' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/compare': {
        post: {
          operationId: 'multiExchangeTickerCompare',
          summary: 'Side-by-side exchange comparison with spread and cost analysis',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair to compare across exchanges' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Exchange comparison with spread analysis and arbitrage detection',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      comparison: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            exchange: { type: 'string' },
                            bid: { type: 'number' }, ask: { type: 'number' },
                            spread_usd: { type: 'number' }, spread_pct: { type: 'number' },
                            depth_bid_usd: { type: 'number' }, depth_ask_usd: { type: 'number' },
                            fee_taker_pct: { type: 'number' }, effective_cost_pct: { type: 'number' },
                            rank_for_buying: { type: 'integer' }, rank_for_selling: { type: 'integer' },
                          },
                        },
                      },
                      spread_analysis: {
                        type: 'object', properties: {
                          tightest_spread_exchange: { type: 'string' },
                          widest_spread_exchange: { type: 'string' },
                          avg_spread_pct: { type: 'number' },
                          arbitrage_opportunity: { type: 'boolean' },
                          arb_profit_pct: { type: 'number' },
                        },
                      },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions,
                      chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing symbol' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'multiExchangeTickerLookup',
          summary: 'ONE-CALL: unified ticker + best price + spread analysis + trade recommendation',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair symbol (e.g. BTC/USDT)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full multi-exchange intelligence with best execution and arbitrage alert',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      unified_price: {
                        type: 'object', properties: {
                          mid_price: { type: 'number' }, vwap_24h: { type: 'number' },
                          price_volatility_24h_pct: { type: 'number' },
                          momentum: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                        },
                      },
                      best_execution: {
                        type: 'object', properties: {
                          best_exchange_to_buy: { type: 'string' },
                          best_exchange_to_sell: { type: 'string' },
                          best_bid: { type: 'number' }, best_ask: { type: 'number' },
                          effective_spread_pct: { type: 'number' }, reasoning: { type: 'string' },
                        },
                      },
                      exchange_rankings: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            exchange: { type: 'string' }, score: { type: 'number' },
                            liquidity_grade: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                            recommended_for: { type: 'string' },
                          },
                        },
                      },
                      arbitrage_alert: {
                        type: 'object', properties: {
                          detected: { type: 'boolean' },
                          buy_exchange: { type: 'string' }, sell_exchange: { type: 'string' },
                          gross_profit_pct: { type: 'number' }, net_profit_pct: { type: 'number' },
                          viability: { type: 'string', enum: ['viable', 'marginal', 'not_viable'] },
                        },
                      },
                      recommendation: {
                        type: 'object', properties: {
                          action: { type: 'string', enum: ['buy', 'sell', 'hold', 'wait'] },
                          preferred_exchange: { type: 'string' },
                          urgency: { type: 'string', enum: ['immediate', 'normal', 'low'] },
                          key_insight: { type: 'string' },
                        },
                      },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions,
                      chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing symbol' }, '500': { description: 'Internal error' },
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
