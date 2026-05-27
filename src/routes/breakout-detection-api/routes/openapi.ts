import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const breakoutSetupItem = {
  type: 'object', properties: {
    setup_type: { type: 'string', enum: ['resistance_breakout', 'support_breakdown', 'range_breakout', 'flag_breakout', 'triangle_breakout', 'channel_breakout'] },
    direction: { type: 'string', enum: ['bullish', 'bearish'] },
    key_level: { type: 'number' }, current_price: { type: 'number' },
    distance_to_level_pct: { type: 'number' }, volume_confirmation: { type: 'boolean' },
    setup_quality: { type: 'string', enum: ['A+', 'A', 'B', 'C'] },
    maturity: { type: 'string', enum: ['forming', 'ready', 'triggered', 'failed'] },
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
    execution_modes: { type: 'array', items: { type: 'string' } },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Breakout Detection API',
      version: '1.0.0',
      description: 'Detect breakout setups, surface active breakout signals across the market, and provide full breakout analysis with entry and invalidation levels for trading agents.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.004', signals: '$0.004', lookup: '$0.012' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/breakout-detection' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'breakoutDetectionDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/scan': {
        post: {
          operationId: 'breakoutDetectionScan',
          summary: 'Scan for breakout setups for a specific symbol',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair symbol (e.g. BTC/USDT)' },
                    timeframe: { type: 'string', default: '1h', enum: ['15m', '1h', '4h', '1d'] },
                    exchange: { type: 'string', default: 'binance', enum: ['binance', 'coinbase', 'kraken', 'bybit', 'okx'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Breakout setups with key levels and volume profile',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, exchange: { type: 'string' }, timeframe: { type: 'string' },
                      breakout_setups: { type: 'array', items: breakoutSetupItem },
                      key_levels: {
                        type: 'object', properties: {
                          major_resistance: { type: 'number' }, major_support: { type: 'number' },
                          range_high: { type: 'number' }, range_low: { type: 'number' },
                          consolidation_days: { type: 'number' },
                        },
                      },
                      volume_profile: {
                        type: 'object', properties: {
                          avg_volume_20d: { type: 'number' }, current_volume: { type: 'number' },
                          volume_surge: { type: 'boolean' },
                          volume_trend: { type: 'string', enum: ['increasing', 'decreasing', 'flat'] },
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
      '/signals': {
        post: {
          operationId: 'breakoutDetectionSignals',
          summary: 'Active breakout signals across the market',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    timeframe: { type: 'string', default: '1h', enum: ['15m', '1h', '4h', '1d'] },
                    min_confidence: { type: 'number', default: 70, minimum: 0, maximum: 100 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Active market-wide breakout signals with context',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      timeframe: { type: 'string' }, min_confidence: { type: 'number' },
                      signals: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            symbol: { type: 'string' }, exchange: { type: 'string' },
                            breakout_type: { type: 'string', enum: ['resistance_breakout', 'support_breakdown', 'range_breakout', 'flag_breakout', 'triangle_breakout'] },
                            direction: { type: 'string', enum: ['bullish', 'bearish'] },
                            breakout_level: { type: 'number' }, current_price: { type: 'number' },
                            confidence_pct: { type: 'number' }, volume_confirmed: { type: 'boolean' },
                            age_minutes: { type: 'number' }, target_pct: { type: 'number' }, stop_pct: { type: 'number' },
                          },
                        },
                      },
                      market_context: {
                        type: 'object', properties: {
                          total_signals_found: { type: 'integer' },
                          bullish_count: { type: 'integer' }, bearish_count: { type: 'integer' },
                          market_bias: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                          highest_confidence_symbol: { type: 'string' },
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
          operationId: 'breakoutDetectionLookup',
          summary: 'ONE-CALL: breakout analysis + confirmation checklist + entry/invalidation levels',
          'x-one-call': true,
          'x-execution-gate-required': true,
          'x-human-approval-required': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair symbol (e.g. BTC/USDT)' },
                    timeframe: { type: 'string', default: '1h', enum: ['15m', '1h', '4h', '1d'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full breakout intelligence with trade levels and probability',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, timeframe: { type: 'string' },
                      primary_setup: {
                        type: 'object', properties: {
                          setup_type: { type: 'string', enum: ['resistance_breakout', 'support_breakdown', 'range_breakout', 'flag_breakout', 'triangle_breakout', 'channel_breakout'] },
                          direction: { type: 'string', enum: ['bullish', 'bearish'] },
                          breakout_level: { type: 'number' }, current_price: { type: 'number' },
                          status: { type: 'string', enum: ['pre_breakout', 'breaking_out', 'confirmed', 'failed'] },
                          volume_confirmation: { type: 'boolean' }, momentum_confirmation: { type: 'boolean' },
                        },
                      },
                      confirmation_checklist: {
                        type: 'object', properties: {
                          price_above_level: { type: 'boolean' }, volume_above_average: { type: 'boolean' },
                          momentum_positive: { type: 'boolean' }, no_immediate_resistance: { type: 'boolean' },
                          candle_closed_above: { type: 'boolean' }, confirmation_score: { type: 'number' },
                        },
                      },
                      trade_levels: {
                        type: 'object', properties: {
                          entry_price: { type: 'number' },
                          entry_zone_low: { type: 'number' }, entry_zone_high: { type: 'number' },
                          target_1: { type: 'number' }, target_2: { type: 'number' }, target_3: { type: 'number' },
                          invalidation_level: { type: 'number' }, stop_loss: { type: 'number' },
                          risk_reward_ratio: { type: 'number' },
                        },
                      },
                      breakout_probability: {
                        type: 'object', properties: {
                          probability_pct: { type: 'number' }, expected_move_pct: { type: 'number' },
                          false_breakout_risk: { type: 'string', enum: ['high', 'medium', 'low'] },
                          time_to_resolve_hours: { type: 'number' },
                        },
                      },
                      aggregate_signal: {
                        type: 'object', properties: {
                          signal: { type: 'string', enum: ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'] },
                          conviction: { type: 'string', enum: ['high', 'medium', 'low'] },
                          key_insight: { type: 'string' },
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
