import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const DIRECTION_ENUM = ['buy_dex_sell_cex', 'buy_cex_sell_dex'];
const VIABILITY_ENUM = ['viable', 'marginal', 'not_viable'];
const CHAIN_ENUM = ['ethereum', 'base', 'arbitrum', 'bsc'];
const DEX_PROTOCOL_ENUM = ['uniswap_v3', 'uniswap_v2', 'curve', 'balancer', 'sushiswap', 'pancakeswap'];
const CEX_ENUM = ['binance', 'coinbase', 'kraken', 'bybit', 'okx'];
const SEVERITY_ENUM = ['high', 'medium', 'low'];

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
      title: 'DEX vs CEX Arbitrage API',
      version: '1.0.0',
      description: 'Detect price gaps between DEX pools and CEX order books for the same token, accounting for DEX liquidity depth, CEX bid/ask, and net profit after estimated swap fees.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': true, 'x-execution-gate-required': true,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.004', alerts: '$0.005', lookup: '$0.012' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/dex-cex-arbitrage' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'dexCexArbitrageDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/scan': {
        post: {
          operationId: 'dexCexArbitrageScan',
          summary: 'DEX vs CEX price gap scan for a specific token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Token symbol (e.g. ETH, WBTC, ARB)' },
                    chain: { type: 'string', default: 'ethereum', enum: CHAIN_ENUM },
                    exchange: { type: 'string', default: 'binance', enum: CEX_ENUM },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'DEX vs CEX price gap with viability assessment',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' }, chain: { type: 'string', enum: CHAIN_ENUM }, exchange: { type: 'string', enum: CEX_ENUM },
                      dex_price: { type: 'number' }, cex_price: { type: 'number' }, gap_pct: { type: 'number' },
                      direction: { type: 'string', enum: DIRECTION_ENUM },
                      estimated_profit_usdc: { type: 'number' }, liquidity_depth_usd: { type: 'number' },
                      fee_estimate_pct: { type: 'number' }, viability: { type: 'string', enum: VIABILITY_ENUM },
                      dex_details: {
                        type: 'object', properties: {
                          pool_address: { type: 'string' },
                          dex_protocol: { type: 'string', enum: DEX_PROTOCOL_ENUM },
                          pool_fee_tier_pct: { type: 'number' }, price_impact_pct: { type: 'number' }, tvl_usd: { type: 'number' },
                        },
                      },
                      cex_details: {
                        type: 'object', properties: {
                          best_bid: { type: 'number' }, best_ask: { type: 'number' }, spread_pct: { type: 'number' },
                          order_book_depth_usd: { type: 'number' }, maker_fee_pct: { type: 'number' }, taker_fee_pct: { type: 'number' },
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
          operationId: 'dexCexArbitrageAlerts',
          summary: 'Active DEX/CEX arb opportunities above gap threshold',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    min_gap_pct: { type: 'number', default: 0.5, minimum: 0.1, description: 'Minimum price gap percentage to surface' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Active DEX/CEX arbitrage opportunities with urgency',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      min_gap_pct: { type: 'number' },
                      opportunities: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            symbol: { type: 'string' }, chain: { type: 'string', enum: CHAIN_ENUM },
                            dex_protocol: { type: 'string', enum: DEX_PROTOCOL_ENUM }, cex: { type: 'string', enum: CEX_ENUM },
                            dex_price: { type: 'number' }, cex_price: { type: 'number' }, gap_pct: { type: 'number' },
                            direction: { type: 'string', enum: DIRECTION_ENUM },
                            estimated_profit_usdc: { type: 'number' }, liquidity_depth_usd: { type: 'number' },
                            viability: { type: 'string', enum: VIABILITY_ENUM },
                            urgency: { type: 'string', enum: ['immediate', 'building', 'fading'] },
                            detected_ago_seconds: { type: 'number' },
                          },
                        },
                      },
                      market_summary: {
                        type: 'object', properties: {
                          total_opportunities: { type: 'integer' }, viable_count: { type: 'integer' },
                          best_gap_pct: { type: 'number' }, best_symbol: { type: 'string' }, most_active_chain: { type: 'string' },
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
          operationId: 'dexCexArbitrageLookup',
          summary: 'ONE-CALL: full DEX/CEX arb analysis with execution checklist',
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
                    symbol: { type: 'string', description: 'Token symbol (e.g. ETH, WBTC, ARB)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full DEX/CEX arb intelligence with execution checklist and risk factors',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      best_opportunity: {
                        type: 'object', properties: {
                          dex_protocol: { type: 'string', enum: DEX_PROTOCOL_ENUM },
                          dex_chain: { type: 'string', enum: CHAIN_ENUM },
                          cex: { type: 'string', enum: CEX_ENUM },
                          dex_price: { type: 'number' }, cex_price: { type: 'number' },
                          direction: { type: 'string', enum: DIRECTION_ENUM },
                          raw_gap_pct: { type: 'number' }, fee_estimate_pct: { type: 'number' },
                          gas_estimate_usd: { type: 'number' }, net_profit_after_fees_usd: { type: 'number' },
                          viability: { type: 'string', enum: VIABILITY_ENUM },
                        },
                      },
                      execution_checklist: {
                        type: 'object', properties: {
                          liquidity_sufficient: { type: 'boolean' }, price_impact_acceptable: { type: 'boolean' },
                          gas_within_budget: { type: 'boolean' }, cex_withdrawal_open: { type: 'boolean' },
                          no_bridge_needed: { type: 'boolean' }, readiness_score: { type: 'number' },
                        },
                      },
                      risk_factors: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            risk: { type: 'string' }, severity: { type: 'string', enum: SEVERITY_ENUM }, mitigation: { type: 'string' },
                          },
                        },
                      },
                      net_profit_scenarios: {
                        type: 'object', properties: {
                          small_position_1k_usd: { type: 'number' },
                          medium_position_10k_usd: { type: 'number' },
                          large_position_50k_usd: { type: 'number' },
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
