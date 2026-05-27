import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const pricePositionEnum = { type: 'string', enum: ['above_upper', 'near_upper', 'middle', 'near_lower', 'below_lower'] };

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
      title: 'Bollinger Band Alert API',
      version: '1.0.0',
      description: 'Get Bollinger Band values, band width, and price position; detect squeezes and breakouts across the market; receive full BB intelligence with breakout probability for trading agents.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { bands: '$0.003', alerts: '$0.004', lookup: '$0.010' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/bollinger-band' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'bollingerBandDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/bands': {
        post: {
          operationId: 'bollingerBandGet',
          summary: 'Current Bollinger Band values, band width, and price position for a symbol',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair symbol (e.g. BTC/USDT)' },
                    timeframe: { type: 'string', default: '1h', enum: ['5m', '15m', '1h', '4h', '1d'] },
                    period: { type: 'integer', default: 20, minimum: 5, maximum: 200 },
                    std_dev: { type: 'number', default: 2, minimum: 0.5, maximum: 4 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Bollinger Band state with volatility and mean reversion analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, timeframe: { type: 'string' },
                      settings: { type: 'object', properties: { period: { type: 'integer' }, std_dev: { type: 'number' } } },
                      bands: {
                        type: 'object', properties: {
                          upper_band: { type: 'number' }, middle_band: { type: 'number' }, lower_band: { type: 'number' },
                          band_width: { type: 'number' }, band_width_pct: { type: 'number' },
                          current_price: { type: 'number' }, percent_b: { type: 'number' },
                          price_position: pricePositionEnum,
                          touching_upper: { type: 'boolean' }, touching_lower: { type: 'boolean' },
                        },
                      },
                      volatility: {
                        type: 'object', properties: {
                          current_volatility: { type: 'string', enum: ['high', 'normal', 'low', 'compressed'] },
                          historical_rank_pct: { type: 'number' },
                          expanding: { type: 'boolean' }, contracting: { type: 'boolean' },
                        },
                      },
                      mean_reversion: {
                        type: 'object', properties: {
                          stretched_from_mean_pct: { type: 'number' },
                          reversion_likely: { type: 'boolean' },
                          direction: { type: 'string', enum: ['to_upper', 'to_lower', 'neutral'] },
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
          operationId: 'bollingerBandAlerts',
          summary: 'Squeeze and breakout BB alerts across the market',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    timeframe: { type: 'string', default: '1h', enum: ['5m', '15m', '1h', '4h', '1d'] },
                    type: { type: 'string', default: 'both', enum: ['squeeze', 'breakout', 'both'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Market-wide Bollinger Band alerts with squeeze and breakout detection',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      timeframe: { type: 'string' }, alert_type: { type: 'string' },
                      alerts: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            symbol: { type: 'string' },
                            alert_type: { type: 'string', enum: ['squeeze', 'breakout_up', 'breakout_down', 'touch_upper', 'touch_lower', 'walk_upper', 'walk_lower'] },
                            band_width_pct: { type: 'number' }, band_width_percentile: { type: 'number' },
                            current_price: { type: 'number' }, percent_b: { type: 'number' },
                            squeeze_duration_bars: { type: 'number' }, breakout_confirmed: { type: 'boolean' },
                            volume_surge: { type: 'boolean' },
                            signal: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                            urgency: { type: 'string', enum: ['high', 'medium', 'low'] },
                          },
                        },
                      },
                      market_summary: {
                        type: 'object', properties: {
                          total_squeezes: { type: 'integer' }, total_breakouts: { type: 'integer' },
                          avg_bandwidth_pct: { type: 'number' },
                          market_volatility_state: { type: 'string', enum: ['high', 'normal', 'low', 'compressed'] },
                          most_compressed_symbol: { type: 'string' },
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
          operationId: 'bollingerBandLookup',
          summary: 'ONE-CALL: BB state + squeeze detection + breakout probability + trade signal',
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
              description: 'Full Bollinger Band intelligence with squeeze, breakout, and signal analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, timeframe: { type: 'string' },
                      bb_state: {
                        type: 'object', properties: {
                          upper_band: { type: 'number' }, middle_band: { type: 'number' }, lower_band: { type: 'number' },
                          current_price: { type: 'number' }, percent_b: { type: 'number' },
                          band_width_pct: { type: 'number' }, price_position: pricePositionEnum,
                        },
                      },
                      squeeze_analysis: {
                        type: 'object', properties: {
                          squeeze_detected: { type: 'boolean' },
                          squeeze_strength: { type: 'string', enum: ['extreme', 'strong', 'moderate', 'none'] },
                          bandwidth_percentile_20d: { type: 'number' },
                          squeeze_duration_bars: { type: 'number' }, squeeze_building: { type: 'boolean' },
                          historical_avg_move_after_squeeze_pct: { type: 'number' },
                        },
                      },
                      breakout_analysis: {
                        type: 'object', properties: {
                          breakout_detected: { type: 'boolean' },
                          breakout_direction: { type: 'string', enum: ['up', 'down', 'none'] },
                          breakout_probability_pct: { type: 'number' },
                          volume_confirmation: { type: 'boolean' },
                          expected_move_pct: { type: 'number' }, retest_likely: { type: 'boolean' },
                        },
                      },
                      mean_reversion_setup: {
                        type: 'object', properties: {
                          setup_active: { type: 'boolean' },
                          direction: { type: 'string', enum: ['buy_lower_band', 'sell_upper_band', 'none'] },
                          confluence_with_support_resistance: { type: 'boolean' },
                          target_middle_band: { type: 'number' },
                        },
                      },
                      aggregate_signal: {
                        type: 'object', properties: {
                          signal: { type: 'string', enum: ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'] },
                          primary_setup: { type: 'string', enum: ['squeeze_breakout', 'mean_reversion', 'trend_continuation', 'none'] },
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
