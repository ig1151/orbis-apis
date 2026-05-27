import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const EXCHANGE_ENUM = ['binance', 'coinbase', 'bybit', 'okx', 'kraken'];
const LOOP_QUALITY_ENUM = ['A+', 'A', 'B', 'C'];
const SIDE_ENUM = ['buy', 'sell'];
const COMPLEXITY_ENUM = ['simple', 'medium', 'complex'];

const legSchema = {
  type: 'object', properties: {
    pair: { type: 'string' }, side: { type: 'string', enum: SIDE_ENUM }, price: { type: 'number' },
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
    'x-paper-mode-recommended': { type: 'boolean' },
    'x-execution-gate-required': { type: 'boolean' },
    'x-human-approval-required': { type: 'boolean' },
    'x-latency-tier': { type: 'string' },
    execution_modes: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Triangular Arbitrage API',
      version: '1.0.0',
      description: 'Find triangular arbitrage loops within a single exchange — three-leg trades that return more than started with. Returns profit after fees, execution order, and viability window.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': true, 'x-execution-gate-required': true,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.004', paths: '$0.005', lookup: '$0.012' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/triangular-arbitrage' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'triangularArbitrageDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/scan': {
        post: {
          operationId: 'triangularArbitrageScan',
          summary: 'Scan for viable triangular loops for a base currency',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['base_currency'],
                  properties: {
                    base_currency: { type: 'string', description: 'Starting currency (e.g. BTC, ETH, USDT)' },
                    exchange: { type: 'string', default: 'binance', enum: EXCHANGE_ENUM },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Viable triangular loops with profit and viability window',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      base_currency: { type: 'string' }, exchange: { type: 'string', enum: EXCHANGE_ENUM },
                      viable_loops: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            path: { type: 'string' }, leg_a: legSchema, leg_b: legSchema, leg_c: legSchema,
                            gross_profit_pct: { type: 'number' }, trading_fees_pct: { type: 'number' },
                            net_profit_after_fees_pct: { type: 'number' }, viability_window_seconds: { type: 'number' },
                            loop_quality: { type: 'string', enum: LOOP_QUALITY_ENUM }, viable: { type: 'boolean' },
                          },
                        },
                      },
                      market_conditions: {
                        type: 'object', properties: {
                          total_loops_checked: { type: 'integer' }, viable_count: { type: 'integer' },
                          best_net_profit_pct: { type: 'number' }, exchange_fee_tier: { type: 'number' },
                          fee_tier_label: { type: 'string', enum: ['standard', 'vip1', 'vip2', 'vip3'] },
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
            '400': { description: 'Missing base_currency' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/paths': {
        post: {
          operationId: 'triangularArbitragePaths',
          summary: 'All detected arb paths on an exchange ranked by net profit',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['exchange'],
                  properties: {
                    exchange: { type: 'string', enum: EXCHANGE_ENUM, description: 'Exchange to scan for triangular paths' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'All triangular arb paths ranked by net profit',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      exchange: { type: 'string', enum: EXCHANGE_ENUM },
                      paths: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            rank: { type: 'integer' }, path: { type: 'string' }, base_currency: { type: 'string' },
                            gross_profit_pct: { type: 'number' }, net_profit_after_fees_pct: { type: 'number' },
                            viability_window_seconds: { type: 'number' }, trade_volume_limit_usd: { type: 'number' },
                            execution_complexity: { type: 'string', enum: COMPLEXITY_ENUM },
                            loop_quality: { type: 'string', enum: LOOP_QUALITY_ENUM },
                          },
                        },
                      },
                      exchange_summary: {
                        type: 'object', properties: {
                          total_paths_found: { type: 'integer' }, profitable_paths: { type: 'integer' },
                          best_path: { type: 'string' }, avg_net_profit_pct: { type: 'number' },
                          market_efficiency_score: { type: 'number' },
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
            '400': { description: 'Missing exchange' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'triangularArbitrageLookup',
          summary: 'ONE-CALL: best triangular loop with exact execution sequence',
          'x-one-call': true,
          'x-execution-gate-required': true,
          'x-human-approval-required': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['base_currency'],
                  properties: {
                    base_currency: { type: 'string', description: 'Starting currency (e.g. BTC, ETH, USDT)' },
                    exchange: { type: 'string', default: 'binance', enum: EXCHANGE_ENUM },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full triangular arb intelligence with execution sequence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      base_currency: { type: 'string' }, exchange: { type: 'string', enum: EXCHANGE_ENUM },
                      best_loop: {
                        type: 'object', properties: {
                          path: { type: 'string' }, gross_profit_pct: { type: 'number' },
                          trading_fees_pct: { type: 'number' }, net_profit_after_fees_pct: { type: 'number' },
                          viability_window_seconds: { type: 'number' }, loop_quality: { type: 'string', enum: LOOP_QUALITY_ENUM },
                        },
                      },
                      execution_sequence: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            step: { type: 'integer' }, action: { type: 'string', enum: SIDE_ENUM },
                            pair: { type: 'string' }, side: { type: 'string', enum: ['maker', 'taker'] },
                            estimated_price: { type: 'number' }, expected_slippage_pct: { type: 'number' },
                            time_budget_ms: { type: 'number' },
                          },
                        },
                      },
                      trade_sizing: {
                        type: 'object', properties: {
                          optimal_size_usd: { type: 'number' }, min_profitable_size_usd: { type: 'number' },
                          max_before_slippage_usd: { type: 'number' }, expected_profit_at_optimal_usd: { type: 'number' },
                        },
                      },
                      execution_timeline: {
                        type: 'object', properties: {
                          total_execution_ms: { type: 'number' }, leg_1_ms: { type: 'number' },
                          leg_2_ms: { type: 'number' }, leg_3_ms: { type: 'number' },
                          window_closes_in_seconds: { type: 'number' },
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
            '400': { description: 'Missing base_currency' }, '500': { description: 'Internal error' },
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
