import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const crossoverTypeEnum = { type: 'string', enum: ['bullish_signal_cross', 'bearish_signal_cross', 'bullish_zero_cross', 'bearish_zero_cross', 'none'] };

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
      title: 'MACD Signal API',
      version: '1.0.0',
      description: 'Get MACD line, signal line, and histogram values, detect crossovers, and receive full MACD intelligence with momentum and trade signals for trading agents.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { macd: '$0.003', crossovers: '$0.004', lookup: '$0.010' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/macd-signal' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'macdSignalDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/macd': {
        post: {
          operationId: 'macdSignalGet',
          summary: 'Current MACD line, signal line, and histogram for a symbol',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair symbol (e.g. BTC/USDT)' },
                    timeframe: { type: 'string', default: '1h', enum: ['5m', '15m', '1h', '4h', '1d'] },
                    exchange: { type: 'string', default: 'binance', enum: ['binance', 'coinbase', 'kraken', 'bybit', 'okx'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'MACD state with momentum assessment',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, exchange: { type: 'string' }, timeframe: { type: 'string' },
                      macd: {
                        type: 'object', properties: {
                          fast_period: { type: 'integer' }, slow_period: { type: 'integer' }, signal_period: { type: 'integer' },
                          macd_line: { type: 'number' }, signal_line: { type: 'number' }, histogram: { type: 'number' },
                          histogram_color: { type: 'string', enum: ['green', 'red'] },
                          histogram_trend: { type: 'string', enum: ['expanding', 'contracting', 'flat'] },
                          position: { type: 'string', enum: ['above_zero', 'below_zero'] },
                          macd_vs_signal: { type: 'string', enum: ['macd_above', 'macd_below', 'crossing'] },
                        },
                      },
                      momentum: {
                        type: 'object', properties: {
                          strength: { type: 'string', enum: ['strong_bullish', 'bullish', 'neutral', 'bearish', 'strong_bearish'] },
                          acceleration: { type: 'string', enum: ['accelerating', 'decelerating', 'flat'] },
                          zero_line_distance: { type: 'number' },
                        },
                      },
                      macd_history: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            timestamp: { type: 'string', format: 'date-time' },
                            macd_line: { type: 'number' }, signal_line: { type: 'number' }, histogram: { type: 'number' },
                          },
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
      '/crossovers': {
        post: {
          operationId: 'macdSignalCrossovers',
          summary: 'Recent and upcoming MACD crossover signals for a symbol',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair symbol (e.g. BTC/USDT)' },
                    timeframe: { type: 'string', default: '1h', enum: ['5m', '15m', '1h', '4h', '1d'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Recent crossovers, pending crossover prediction, and historical stats',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, timeframe: { type: 'string' },
                      recent_crossovers: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            crossover_type: crossoverTypeEnum,
                            timestamp: { type: 'string', format: 'date-time' },
                            price_at_crossover: { type: 'number' }, bars_ago: { type: 'number' },
                            outcome: { type: 'string', enum: ['profitable', 'unprofitable', 'pending'] },
                            max_move_pct: { type: 'number' },
                          },
                        },
                      },
                      pending_crossover: {
                        type: 'object', properties: {
                          likely: { type: 'boolean' }, type: crossoverTypeEnum,
                          bars_estimated: { type: 'number' }, probability_pct: { type: 'number' },
                          trigger_conditions: { type: 'string' },
                        },
                      },
                      crossover_stats: {
                        type: 'object', properties: {
                          win_rate_last_10: { type: 'number' },
                          avg_move_after_cross_pct: { type: 'number' },
                          best_performing_type: { type: 'string' },
                          false_signal_rate_pct: { type: 'number' },
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
          operationId: 'macdSignalLookup',
          summary: 'ONE-CALL: MACD state + crossover + momentum + trade signal',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair symbol (e.g. BTC/USDT)' },
                    timeframe: { type: 'string', default: '1h', enum: ['5m', '15m', '1h', '4h', '1d'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full MACD intelligence with multi-timeframe analysis and trade signal',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, timeframe: { type: 'string' },
                      macd_state: {
                        type: 'object', properties: {
                          macd_line: { type: 'number' }, signal_line: { type: 'number' }, histogram: { type: 'number' },
                          histogram_bars_direction: { type: 'number' },
                          position: { type: 'string', enum: ['above_zero', 'below_zero'] },
                          crossover_status: { type: 'string', enum: ['just_crossed_bullish', 'just_crossed_bearish', 'macd_above_signal', 'macd_below_signal'] },
                        },
                      },
                      momentum_assessment: {
                        type: 'object', properties: {
                          current_momentum: { type: 'string', enum: ['strong_bullish', 'bullish', 'fading_bullish', 'neutral', 'fading_bearish', 'bearish', 'strong_bearish'] },
                          momentum_shift_detected: { type: 'boolean' },
                          histogram_trend: { type: 'string', enum: ['expanding_positive', 'contracting_positive', 'expanding_negative', 'contracting_negative'] },
                          divergence_from_price: { type: 'boolean' },
                        },
                      },
                      multi_timeframe_macd: {
                        type: 'object', properties: {
                          '15m': { type: 'object', properties: { above_zero: { type: 'boolean' }, bullish_cross: { type: 'boolean' }, histogram_expanding: { type: 'boolean' } } },
                          '1h': { type: 'object', properties: { above_zero: { type: 'boolean' }, bullish_cross: { type: 'boolean' }, histogram_expanding: { type: 'boolean' } } },
                          '4h': { type: 'object', properties: { above_zero: { type: 'boolean' }, bullish_cross: { type: 'boolean' }, histogram_expanding: { type: 'boolean' } } },
                          '1d': { type: 'object', properties: { above_zero: { type: 'boolean' }, bullish_cross: { type: 'boolean' }, histogram_expanding: { type: 'boolean' } } },
                        },
                      },
                      trade_signal: {
                        type: 'object', properties: {
                          signal: { type: 'string', enum: ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'] },
                          trigger: { type: 'string', enum: ['signal_crossover', 'zero_crossover', 'histogram_reversal', 'divergence'] },
                          entry_timing: { type: 'string', enum: ['now', 'wait_for_crossover', 'wait_for_zero_cross', 'avoid'] },
                          conviction: { type: 'string', enum: ['high', 'medium', 'low'] },
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
