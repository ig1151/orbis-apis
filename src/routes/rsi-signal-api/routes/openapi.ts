import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const rsiZoneEnum = { type: 'string', enum: ['overbought', 'oversold', 'neutral', 'extreme_overbought', 'extreme_oversold'] };
const divergenceTypeEnum = { type: 'string', enum: ['bullish_regular', 'bearish_regular', 'bullish_hidden', 'bearish_hidden', 'none'] };

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
      title: 'RSI Signal API',
      version: '1.0.0',
      description: 'Get RSI values, divergence detection, overbought/oversold alerts across the market, and full RSI intelligence with trade implications for trading agents.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { rsi: '$0.003', alerts: '$0.003', lookup: '$0.008' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'near-real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/rsi-signal' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'rsiSignalDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/rsi': {
        post: {
          operationId: 'rsiSignalGet',
          summary: 'Current RSI value, zone, and divergence detection for a symbol',
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
              description: 'RSI value with zone classification and divergence analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, exchange: { type: 'string' }, timeframe: { type: 'string' },
                      rsi: {
                        type: 'object', properties: {
                          period: { type: 'integer' }, value: { type: 'number' },
                          rsi_zone: rsiZoneEnum,
                          overbought_threshold: { type: 'number' }, oversold_threshold: { type: 'number' },
                          previous_value: { type: 'number' },
                          trend: { type: 'string', enum: ['rising', 'falling', 'flat'] },
                        },
                      },
                      divergence: {
                        type: 'object', properties: {
                          divergence_detected: { type: 'boolean' },
                          divergence_type: divergenceTypeEnum,
                          price_action: { type: 'string' }, rsi_action: { type: 'string' },
                          significance: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
                          bars_confirmed: { type: 'number' },
                        },
                      },
                      rsi_history: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            timestamp: { type: 'string', format: 'date-time' },
                            value: { type: 'number' }, zone: rsiZoneEnum,
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
      '/alerts': {
        post: {
          operationId: 'rsiSignalAlerts',
          summary: 'Overbought/oversold RSI alerts across the market',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    timeframe: { type: 'string', default: '1h', enum: ['5m', '15m', '1h', '4h', '1d'] },
                    threshold: { type: 'number', default: 70, description: 'RSI threshold — values above trigger overbought, below 100-threshold triggers oversold' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Market-wide RSI alerts with overbought/oversold summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      timeframe: { type: 'string' }, threshold: { type: 'number' },
                      alerts: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            symbol: { type: 'string' }, exchange: { type: 'string' },
                            rsi_value: { type: 'number' }, rsi_zone: rsiZoneEnum,
                            price: { type: 'number' }, volume_24h_usd: { type: 'number' },
                            divergence_present: { type: 'boolean' },
                            signal: { type: 'string', enum: ['potential_reversal', 'continuation', 'watch'] },
                            alert_strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
                          },
                        },
                      },
                      summary: {
                        type: 'object', properties: {
                          total_overbought: { type: 'integer' }, total_oversold: { type: 'integer' },
                          extreme_readings: { type: 'integer' },
                          market_bias: { type: 'string', enum: ['overbought_dominant', 'oversold_dominant', 'balanced'] },
                          mean_rsi: { type: 'number' },
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
          operationId: 'rsiSignalLookup',
          summary: 'ONE-CALL: RSI + divergence + multi-timeframe + trade signal',
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
              description: 'Full RSI intelligence with divergence, multi-timeframe analysis, and trade signal',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, timeframe: { type: 'string' },
                      rsi_state: {
                        type: 'object', properties: {
                          value: { type: 'number' }, rsi_zone: rsiZoneEnum,
                          trend: { type: 'string', enum: ['rising', 'falling', 'flat'] },
                          distance_from_50: { type: 'number' },
                          speed_of_change: { type: 'string', enum: ['fast', 'moderate', 'slow'] },
                        },
                      },
                      divergence_analysis: {
                        type: 'object', properties: {
                          divergence_detected: { type: 'boolean' },
                          divergence_type: divergenceTypeEnum,
                          confirmation_bars: { type: 'number' },
                          strength: { type: 'string', enum: ['strong', 'moderate', 'weak', 'none'] },
                          expected_reaction: { type: 'string' },
                        },
                      },
                      multi_timeframe_rsi: {
                        type: 'object', properties: {
                          '15m': { type: 'number' }, '1h': { type: 'number' },
                          '4h': { type: 'number' }, '1d': { type: 'number' },
                          alignment: { type: 'string', enum: ['all_overbought', 'all_oversold', 'rising', 'falling', 'mixed'] },
                        },
                      },
                      trade_signal: {
                        type: 'object', properties: {
                          signal: { type: 'string', enum: ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'] },
                          trigger: { type: 'string', enum: ['divergence', 'zone_extreme', 'momentum_shift', 'none'] },
                          entry_timing: { type: 'string', enum: ['now', 'wait_for_confirmation', 'avoid'] },
                          stop_suggestion: { type: 'number' }, key_insight: { type: 'string' },
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
