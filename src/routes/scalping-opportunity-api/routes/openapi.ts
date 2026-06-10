import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const setupTypeEnum = { type: 'string', enum: ['momentum_scalp', 'reversal_scalp', 'range_scalp', 'breakout_scalp', 'orderbook_scalp'] };
const directionEnum = { type: 'string', enum: ['long', 'short'] };
const exchangeEnum = { type: 'string', enum: ['binance', 'coinbase', 'bybit', 'okx', 'kraken'] };

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
    execution_modes: { type: 'array', items: { type: 'string' } },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Scalping Opportunity API',
      version: '1.0.0',
      description: 'Find live scalping setups for a symbol, scan the market for the best scalping opportunities right now, and get full scalping intelligence with entry/target/stop and risk assessment for trading agents.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { opportunities: '$0.004', scan: '$0.005', lookup: '$0.015' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/scalping-opportunity' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'scalpingOpportunityDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/opportunities': {
        post: {
          operationId: 'scalpingOpportunitiesGet',
          summary: 'Live scalping setups for a specific symbol',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair symbol (e.g. BTC/USDT)' },
                    exchange: { ...exchangeEnum, default: 'binance' },
                    timeframe: { type: 'string', default: '5m', enum: ['1m', '3m', '5m', '15m'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Scalping setups with market conditions assessment',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, exchange: { type: 'string' }, timeframe: { type: 'string' },
                      scalping_setups: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            setup_type: setupTypeEnum, direction: directionEnum,
                            entry_price: { type: 'number' }, target_price: { type: 'number' }, stop_loss: { type: 'number' },
                            expected_move_pct: { type: 'number' }, risk_reward: { type: 'number' },
                            time_in_trade_minutes: { type: 'number' },
                            setup_quality: { type: 'string', enum: ['A+', 'A', 'B', 'C'] },
                            confidence_pct: { type: 'number' }, key_trigger: { type: 'string' },
                          },
                        },
                      },
                      market_conditions: {
                        type: 'object', properties: {
                          current_price: { type: 'number' }, spread_pct: { type: 'number' },
                          liquidity_score: { type: 'number' }, volatility_suitable: { type: 'boolean' },
                          volume_above_avg: { type: 'boolean' }, scalping_friendly: { type: 'boolean' },
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
      '/scan': {
        post: {
          operationId: 'scalpingOpportunityScan',
          summary: 'Scan the market for best scalping setups right now',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    exchange: { ...exchangeEnum, default: 'binance' },
                    min_score: { type: 'number', default: 70, minimum: 0, maximum: 100 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Top scalping setups across the market with overview',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      exchange: { type: 'string' }, min_score: { type: 'number' },
                      top_setups: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            symbol: { type: 'string' }, setup_type: setupTypeEnum, direction: directionEnum,
                            score: { type: 'number' }, entry_price: { type: 'number' },
                            target_price: { type: 'number' }, stop_loss: { type: 'number' },
                            risk_reward: { type: 'number' }, volume_ratio: { type: 'number' },
                            spread_pct: { type: 'number' },
                            urgency: { type: 'string', enum: ['immediate', 'soon', 'available'] },
                            key_reason: { type: 'string' },
                          },
                        },
                      },
                      market_overview: {
                        type: 'object', properties: {
                          total_opportunities_found: { type: 'integer' },
                          best_symbol: { type: 'string' }, avg_risk_reward: { type: 'number' },
                          market_phase: { type: 'string', enum: ['trending', 'ranging', 'volatile'] },
                          scalping_conditions: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'] },
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
            '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'scalpingOpportunityLookup',
          summary: 'ONE-CALL: top scalping setup + precise levels + orderbook intel + risk assessment',
          'x-one-call': true,
          'x-execution-gate-required': true,
          'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair symbol (e.g. BTC/USDT)' },
                    exchange: { ...exchangeEnum, default: 'binance' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full scalping intelligence with precise levels, orderbook data, and risk scoring',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, exchange: { type: 'string' },
                      best_setup: {
                        type: 'object', properties: {
                          setup_type: setupTypeEnum, direction: directionEnum,
                          score: { type: 'number' }, confidence_pct: { type: 'number' },
                          time_sensitivity: { type: 'string', enum: ['immediate', 'within_5m', 'within_15m', 'no_rush'] },
                        },
                      },
                      precise_levels: {
                        type: 'object', properties: {
                          entry_price: { type: 'number' },
                          entry_zone_low: { type: 'number' }, entry_zone_high: { type: 'number' },
                          target_1: { type: 'number' }, target_2: { type: 'number' },
                          stop_loss: { type: 'number' }, invalidation_price: { type: 'number' },
                          risk_reward_ratio: { type: 'number' }, max_loss_pct: { type: 'number' },
                        },
                      },
                      orderbook_intel: {
                        type: 'object', properties: {
                          bid_ask_spread_pct: { type: 'number' },
                          depth_bid_usd: { type: 'number' }, depth_ask_usd: { type: 'number' },
                          large_orders_nearby: { type: 'boolean' },
                          liquidity_grade: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                          slippage_estimate_pct: { type: 'number' },
                        },
                      },
                      risk_assessment: {
                        type: 'object', properties: {
                          overall_risk: { type: 'string', enum: ['low', 'medium', 'high', 'extreme'] },
                          volatility_risk: { type: 'string', enum: ['low', 'medium', 'high'] },
                          liquidity_risk: { type: 'string', enum: ['low', 'medium', 'high'] },
                          market_condition_risk: { type: 'string', enum: ['low', 'medium', 'high'] },
                          recommended_position_size_pct: { type: 'number' },
                          max_trades_simultaneously: { type: 'integer' },
                        },
                      },
                      execution_checklist: {
                        type: 'object', properties: {
                          spread_acceptable: { type: 'boolean' }, volume_sufficient: { type: 'boolean' },
                          momentum_aligned: { type: 'boolean' }, no_major_news_pending: { type: 'boolean' },
                          readiness_score: { type: 'number', minimum: 0, maximum: 5 },
                        },
                      },
                      reasoning: {
                        type: 'object', properties: {
                          why_signal_generated: { type: 'string' },
                          key_factors: { type: 'array', items: { type: 'string' } },
                          invalidators: { type: 'array', items: { type: 'string' } },
                        },
                      },
                      latency_ms: { type: 'number', description: 'Signal computation time in milliseconds' },
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
