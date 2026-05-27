import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const CHAIN_ENUM = ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'solana', 'optimism'];
const CONGESTION_ENUM = ['low', 'moderate', 'high', 'very_high'];
const GAS_STRATEGY_ENUM = ['standard', 'fast', 'aggressive'];
const ARB_TYPE_ENUM = ['dex_price_gap', 'triangular', 'stablecoin_spread', 'flash_loan'];
const FRONT_RUN_RISK_ENUM = ['low', 'medium', 'high'];
const URGENCY_ENUM = ['immediate', 'building', 'fading'];

const gasStrategyDetail = {
  type: 'object', properties: {
    gwei: { type: 'number' }, cost_usd: { type: 'number' }, confirm_seconds: { type: 'number' },
    front_run_risk: { type: 'string', enum: FRONT_RUN_RISK_ENUM },
  },
};

const profitScenario = {
  type: 'object', properties: {
    gross_profit_usd: { type: 'number' }, gas_cost_usd: { type: 'number' },
    net_profit_usd: { type: 'number' }, viable: { type: 'boolean' },
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
      title: 'Gas-Adjusted Arbitrage API',
      version: '1.0.0',
      description: 'Gas-net profitability analysis for any arbitrage opportunity. Given a price gap, trade size, and chain — returns true net profit after gas (current gwei), slippage, and protocol fees.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { estimate: '$0.004', scan: '$0.005', lookup: '$0.015' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/gas-adjusted-arbitrage' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'gasAdjustedArbitrageDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/estimate': {
        post: {
          operationId: 'gasAdjustedArbitrageEstimate',
          summary: 'Gas cost estimate for a trade on a specific chain',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['chain', 'trade_size_usd'],
                  properties: {
                    chain: { type: 'string', enum: CHAIN_ENUM, description: 'Blockchain to estimate gas on' },
                    trade_size_usd: { type: 'number', description: 'Total trade size in USD' },
                    num_transactions: { type: 'integer', default: 2, minimum: 1, maximum: 10, description: 'Number of on-chain transactions in the arb' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Gas cost estimate with break-even spread calculation',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      chain: { type: 'string', enum: CHAIN_ENUM }, trade_size_usd: { type: 'number' },
                      num_transactions: { type: 'integer' }, gas_cost_usd: { type: 'number' },
                      gas_gwei_current: { type: 'number' }, gas_gwei_fast: { type: 'number' },
                      gas_gwei_standard: { type: 'number' }, time_to_confirm_seconds: { type: 'number' },
                      gas_units_per_tx: { type: 'number' }, min_spread_needed_pct_to_profit: { type: 'number' },
                      gas_as_pct_of_trade: { type: 'number' },
                      chain_context: {
                        type: 'object', properties: {
                          chain_native_token: { type: 'string' }, native_token_price_usd: { type: 'number' },
                          block_time_seconds: { type: 'number' }, congestion_level: { type: 'string', enum: CONGESTION_ENUM },
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
            '400': { description: 'Missing chain or trade_size_usd' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/scan': {
        post: {
          operationId: 'gasAdjustedArbitrageScan',
          summary: 'All arb opportunities on a chain ranked by net profit after gas',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    chain: { type: 'string', default: 'ethereum', enum: CHAIN_ENUM },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ranked arb opportunities with gas-adjusted net profit',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      chain: { type: 'string', enum: CHAIN_ENUM }, current_gas_gwei: { type: 'number' },
                      opportunities: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            arb_type: { type: 'string', enum: ARB_TYPE_ENUM },
                            symbol: { type: 'string' }, gross_spread_pct: { type: 'number' },
                            gas_cost_usd: { type: 'number' }, slippage_estimate_pct: { type: 'number' },
                            protocol_fee_pct: { type: 'number' }, net_profit_usd_per_10k: { type: 'number' },
                            break_even_spread_pct: { type: 'number' }, viable: { type: 'boolean' },
                            urgency: { type: 'string', enum: URGENCY_ENUM },
                          },
                        },
                      },
                      chain_summary: {
                        type: 'object', properties: {
                          total_scanned: { type: 'integer' }, gas_profitable_count: { type: 'integer' },
                          best_net_profit_usd: { type: 'number' }, avg_break_even_spread_pct: { type: 'number' },
                          recommended_min_trade_usd: { type: 'number' },
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
          operationId: 'gasAdjustedArbitrageLookup',
          summary: 'ONE-CALL: gas-adjusted analysis with optimal gas strategy and profit scenarios',
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
                    symbol: { type: 'string', description: 'Token symbol to analyze' },
                    chain: { type: 'string', default: 'ethereum', enum: CHAIN_ENUM },
                    trade_size_usd: { type: 'number', description: 'Trade size in USD for profit scenario modeling' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full gas-adjusted arb intelligence with optimal strategy and profit scenarios',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, chain: { type: 'string', enum: CHAIN_ENUM },
                      current_gas_environment: {
                        type: 'object', properties: {
                          gas_gwei: { type: 'number' },
                          gas_trend: { type: 'string', enum: ['rising', 'falling', 'stable'] },
                          congestion: { type: 'string', enum: CONGESTION_ENUM },
                          recommended_timing: { type: 'string' },
                        },
                      },
                      optimal_gas_strategy: { type: 'string', enum: GAS_STRATEGY_ENUM },
                      gas_strategy_analysis: {
                        type: 'object', properties: {
                          standard: gasStrategyDetail, fast: gasStrategyDetail, aggressive: gasStrategyDetail,
                        },
                      },
                      break_even_spread_pct: { type: 'number' },
                      net_profit_scenarios: {
                        type: 'object', properties: {
                          small_position_1k_usd: profitScenario,
                          medium_position_10k_usd: profitScenario,
                          large_position_50k_usd: profitScenario,
                        },
                      },
                      fee_breakdown: {
                        type: 'object', properties: {
                          gas_cost_usd: { type: 'number' }, protocol_fee_pct: { type: 'number' },
                          slippage_estimate_pct: { type: 'number' }, total_cost_pct: { type: 'number' },
                          gross_spread_required_to_profit_pct: { type: 'number' },
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
