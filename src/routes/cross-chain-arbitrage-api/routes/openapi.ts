import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const CHAIN_ENUM = ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'solana'];
const BRIDGE_PROTOCOL_ENUM = ['stargate', 'across', 'hop', 'layerzero', 'wormhole', 'synapse'];
const PRICE_RISK_ENUM = ['low', 'medium', 'high'];
const SECURITY_RATING_ENUM = ['battle_tested', 'audited', 'experimental'];

const chainPriceItem = {
  type: 'object', properties: {
    chain: { type: 'string', enum: CHAIN_ENUM }, price_usd: { type: 'number' },
    liquidity_usd: { type: 'number' }, gas_cost_usd: { type: 'number' },
    dex_protocol: { type: 'string' }, price_impact_pct: { type: 'number' },
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
      title: 'Cross-Chain Arbitrage API',
      version: '1.0.0',
      description: 'Price differences for a token across chains (Ethereum, Base, Arbitrum, Polygon, BSC, Solana), accounting for bridge costs, gas on each chain, and bridge latency.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': true, 'x-execution-gate-required': true,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.006', routes: '$0.006', lookup: '$0.018' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/cross-chain-arbitrage' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'crossChainArbitrageDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/scan': {
        post: {
          operationId: 'crossChainArbitrageScan',
          summary: 'Cross-chain price scan for a token across all supported chains',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Token symbol (e.g. ETH, WBTC, LINK)' },
                    chains: { type: 'array', items: { type: 'string', enum: CHAIN_ENUM }, description: 'Chains to scan (default: all)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Cross-chain price comparison with bridge cost estimate',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      chain_prices: { type: 'array', items: chainPriceItem },
                      best_buy_chain: { type: 'string', enum: CHAIN_ENUM }, best_sell_chain: { type: 'string', enum: CHAIN_ENUM },
                      raw_spread_pct: { type: 'number' }, bridge_cost_estimate_usd: { type: 'number' },
                      net_profit_after_bridge_usd: { type: 'number' }, bridge_latency_minutes: { type: 'number' },
                      viable: { type: 'boolean' },
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
      '/routes': {
        post: {
          operationId: 'crossChainArbitrageRoutes',
          summary: 'All profitable cross-chain routes ranked by net profit after all costs',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Token symbol to find routes for' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ranked cross-chain routes with full cost breakdown',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      routes: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            rank: { type: 'integer' }, buy_chain: { type: 'string', enum: CHAIN_ENUM },
                            sell_chain: { type: 'string', enum: CHAIN_ENUM },
                            bridge_protocol: { type: 'string', enum: BRIDGE_PROTOCOL_ENUM },
                            buy_price: { type: 'number' }, sell_price: { type: 'number' }, raw_spread_pct: { type: 'number' },
                            bridge_cost_usd: { type: 'number' }, buy_chain_gas_usd: { type: 'number' },
                            sell_chain_gas_usd: { type: 'number' }, net_profit_after_all_costs_usd: { type: 'number' },
                            bridge_latency_minutes: { type: 'number' },
                            price_risk_during_bridge: { type: 'string', enum: PRICE_RISK_ENUM },
                            min_position_usd: { type: 'number' },
                          },
                        },
                      },
                      route_summary: {
                        type: 'object', properties: {
                          total_routes_found: { type: 'integer' }, profitable_routes: { type: 'integer' },
                          best_net_profit_usd: { type: 'number' }, fastest_route_minutes: { type: 'number' },
                          safest_route: { type: 'string' },
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
          operationId: 'crossChainArbitrageLookup',
          summary: 'ONE-CALL: full cross-chain arb with bridge recommendation and execution steps',
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
                    symbol: { type: 'string', description: 'Token symbol to analyze for cross-chain arb' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full cross-chain arb intelligence with bridge and execution steps',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      best_route: {
                        type: 'object', properties: {
                          buy_chain: { type: 'string', enum: CHAIN_ENUM }, sell_chain: { type: 'string', enum: CHAIN_ENUM },
                          bridge_protocol: { type: 'string', enum: BRIDGE_PROTOCOL_ENUM },
                          buy_price: { type: 'number' }, sell_price: { type: 'number' }, raw_spread_pct: { type: 'number' },
                          bridge_cost_usd: { type: 'number' }, gas_total_usd: { type: 'number' },
                          net_profit_after_all_costs_usd: { type: 'number' }, bridge_latency_minutes: { type: 'number' },
                          execution_window_minutes: { type: 'number' },
                        },
                      },
                      bridge_recommendation: {
                        type: 'object', properties: {
                          protocol: { type: 'string', enum: BRIDGE_PROTOCOL_ENUM }, rationale: { type: 'string' },
                          bridge_fee_usd: { type: 'number' },
                          security_rating: { type: 'string', enum: SECURITY_RATING_ENUM },
                          supported_token: { type: 'boolean' },
                        },
                      },
                      execution_steps: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            step: { type: 'integer' }, action: { type: 'string' }, chain: { type: 'string' },
                            estimated_time_minutes: { type: 'number' }, estimated_cost_usd: { type: 'number' },
                          },
                        },
                      },
                      latency_risk: {
                        type: 'object', properties: {
                          bridge_latency_minutes: { type: 'number' },
                          price_volatility_risk: { type: 'string', enum: PRICE_RISK_ENUM },
                          max_acceptable_spread_for_this_latency_pct: { type: 'number' },
                          hedge_strategy: { type: 'string' },
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
