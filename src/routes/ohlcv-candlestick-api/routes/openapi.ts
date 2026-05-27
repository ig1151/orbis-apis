import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const candleItem = {
  type: 'object', properties: {
    timestamp: { type: 'string', format: 'date-time' },
    open: { type: 'number' }, high: { type: 'number' }, low: { type: 'number' }, close: { type: 'number' },
    volume: { type: 'number' },
    candle_type: { type: 'string', enum: ['bullish', 'bearish', 'doji', 'hammer', 'shooting_star', 'engulfing'] },
  },
};

const tfSummary = {
  type: 'object', properties: {
    open: { type: 'number' }, high: { type: 'number' }, low: { type: 'number' }, close: { type: 'number' },
    volume: { type: 'number' },
    trend: { type: 'string', enum: ['uptrend', 'downtrend', 'sideways'] },
    candle_count: { type: 'number' },
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
      title: 'OHLCV Candlestick API',
      version: '1.0.0',
      description: 'Retrieve OHLCV candlestick data, multi-timeframe summaries, and full candlestick intelligence with trend and pattern detection for trading agents.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { candles: '$0.003', aggregate: '$0.003', lookup: '$0.008' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'near-real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/ohlcv-candlestick' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'ohlcvCandlestickDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/candles': {
        post: {
          operationId: 'ohlcvCandlesGet',
          summary: 'OHLCV data for a symbol and timeframe',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair symbol (e.g. BTC/USDT, ETH/USDT)' },
                    timeframe: { type: 'string', default: '1h', enum: ['1m', '5m', '15m', '1h', '4h', '1d'] },
                    exchange: { type: 'string', default: 'binance', enum: ['binance', 'coinbase', 'kraken', 'bybit', 'okx'] },
                    limit: { type: 'integer', default: 50, minimum: 1, maximum: 500 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'OHLCV candle series with trend summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, exchange: { type: 'string' }, timeframe: { type: 'string' },
                      candles: { type: 'array', items: candleItem },
                      summary: {
                        type: 'object', properties: {
                          current_price: { type: 'number' }, price_change_pct: { type: 'number' },
                          highest_high: { type: 'number' }, lowest_low: { type: 'number' },
                          avg_volume: { type: 'number' },
                          trend_direction: { type: 'string', enum: ['uptrend', 'downtrend', 'sideways'] },
                          trend_strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
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
      '/aggregate': {
        post: {
          operationId: 'ohlcvAggregateGet',
          summary: 'Multi-timeframe OHLCV summary for a symbol',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair symbol' },
                    exchange: { type: 'string', default: 'binance', enum: ['binance', 'coinbase', 'kraken', 'bybit', 'okx'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Multi-timeframe OHLCV summary with trend alignment',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, exchange: { type: 'string' },
                      timeframes: {
                        type: 'object', properties: {
                          '15m': tfSummary, '1h': tfSummary, '4h': tfSummary, '1d': tfSummary,
                        },
                      },
                      alignment: {
                        type: 'object', properties: {
                          trend_alignment: { type: 'string', enum: ['aligned_bullish', 'aligned_bearish', 'mixed', 'conflicted'] },
                          dominant_timeframe: { type: 'string' },
                          confluence_score: { type: 'number', minimum: 0, maximum: 100 },
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
          operationId: 'ohlcvCandlestickLookup',
          summary: 'ONE-CALL: full candlestick intelligence + trend + pattern detection',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Trading pair symbol (e.g. BTC/USDT)' },
                    exchange: { type: 'string', default: 'binance', enum: ['binance', 'coinbase', 'kraken', 'bybit', 'okx'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full candlestick intelligence with patterns, trend, and signal',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, exchange: { type: 'string' },
                      current_candle: {
                        type: 'object', properties: {
                          timeframe: { type: 'string' },
                          open: { type: 'number' }, high: { type: 'number' }, low: { type: 'number' },
                          close: { type: 'number' }, volume: { type: 'number' },
                          candle_type: { type: 'string', enum: ['bullish', 'bearish', 'doji', 'hammer', 'shooting_star', 'engulfing'] },
                          body_pct: { type: 'number' }, wick_ratio: { type: 'number' },
                        },
                      },
                      pattern_detection: {
                        type: 'object', properties: {
                          patterns_found: {
                            type: 'array', items: {
                              type: 'object', properties: {
                                pattern: { type: 'string' }, timeframe: { type: 'string' },
                                reliability: { type: 'string', enum: ['high', 'medium', 'low'] },
                                implication: { type: 'string', enum: ['bullish', 'bearish', 'continuation', 'reversal'] },
                              },
                            },
                          },
                          dominant_pattern: { type: 'string' },
                          pattern_signal: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                        },
                      },
                      trend_analysis: {
                        type: 'object', properties: {
                          short_term: { type: 'string', enum: ['uptrend', 'downtrend', 'sideways'] },
                          medium_term: { type: 'string', enum: ['uptrend', 'downtrend', 'sideways'] },
                          long_term: { type: 'string', enum: ['uptrend', 'downtrend', 'sideways'] },
                          trend_alignment: { type: 'string', enum: ['aligned', 'mixed', 'conflicted'] },
                          key_levels: {
                            type: 'object', properties: {
                              support: { type: 'number' }, resistance: { type: 'number' }, pivot: { type: 'number' },
                            },
                          },
                        },
                      },
                      aggregate_signal: {
                        type: 'object', properties: {
                          signal: { type: 'string', enum: ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'] },
                          conviction: { type: 'string', enum: ['high', 'medium', 'low'] },
                          entry_zone: { type: 'string' },
                          invalidation_level: { type: 'number' },
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
