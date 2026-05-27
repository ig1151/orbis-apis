import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const STABLECOIN_ENUM = ['USDC', 'USDT', 'DAI', 'FRAX'];
const VENUE_TYPE_ENUM = ['dex', 'cex'];
const PEG_RISK_ENUM = ['safe', 'caution', 'high_risk', 'critical'];
const URGENCY_ENUM = ['immediate', 'building', 'fading'];
const PEG_MECHANISM_ENUM = ['fiat_backed', 'algorithmic', 'crypto_backed', 'hybrid'];

const venueItemSchema = {
  type: 'object', properties: {
    venue: { type: 'string' }, venue_type: { type: 'string', enum: VENUE_TYPE_ENUM },
    price: { type: 'number' }, deviation_from_peg_pct: { type: 'number' },
    volume_24h_usd: { type: 'number' }, liquidity_usd: { type: 'number' },
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
      title: 'Stablecoin Arbitrage API',
      version: '1.0.0',
      description: 'Stablecoin price deviations across DEX pools and CEX for USDC, USDT, DAI, FRAX — risk-minimal arbitrage opportunities from peg slippage.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { spreads: '$0.004', alerts: '$0.004', lookup: '$0.012' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'near-real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/stablecoin-arbitrage' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'stablecoinArbitrageDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/spreads': {
        post: {
          operationId: 'stablecoinArbitrageSpreads',
          summary: 'Price spreads for stablecoins across DEX and CEX venues',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stablecoin: { type: 'string', enum: STABLECOIN_ENUM, description: 'Filter to specific stablecoin (optional)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Stablecoin price spreads with best buy/sell venues',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      stablecoins: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            stablecoin: { type: 'string', enum: STABLECOIN_ENUM },
                            peg_target: { type: 'number' },
                            venues: { type: 'array', items: venueItemSchema },
                            max_spread_pct: { type: 'number' }, best_buy_venue: { type: 'string' },
                            best_buy_price: { type: 'number' }, best_sell_venue: { type: 'string' },
                            best_sell_price: { type: 'number' }, arb_viable: { type: 'boolean' },
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
            '500': { description: 'Internal error' },
          },
        },
      },
      '/alerts': {
        post: {
          operationId: 'stablecoinArbitrageAlerts',
          summary: 'Stablecoin arb alerts above spread threshold',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    min_spread_pct: { type: 'number', default: 0.1, minimum: 0.05, description: 'Minimum spread percentage to alert on' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Stablecoin arb alerts with urgency and peg risk',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      min_spread_pct: { type: 'number' },
                      alerts: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            stablecoin: { type: 'string', enum: STABLECOIN_ENUM },
                            buy_venue: { type: 'string' }, buy_venue_type: { type: 'string', enum: VENUE_TYPE_ENUM },
                            sell_venue: { type: 'string' }, sell_venue_type: { type: 'string', enum: VENUE_TYPE_ENUM },
                            buy_price: { type: 'number' }, sell_price: { type: 'number' }, spread_pct: { type: 'number' },
                            estimated_profit_pct: { type: 'number' }, min_trade_size_usd: { type: 'number' },
                            urgency: { type: 'string', enum: URGENCY_ENUM },
                            peg_risk: { type: 'string', enum: ['safe', 'caution', 'high_risk'] },
                          },
                        },
                      },
                      market_context: {
                        type: 'object', properties: {
                          total_alerts: { type: 'integer' }, best_spread_pct: { type: 'number' },
                          best_stablecoin: { type: 'string' }, safest_opportunity: { type: 'string' },
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
          operationId: 'stablecoinArbitrageLookup',
          summary: 'ONE-CALL: best stablecoin spread trade with peg risk context',
          'x-one-call': true,
          'x-execution-gate-required': true,
          'x-human-approval-required': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['stablecoin'],
                  properties: {
                    stablecoin: { type: 'string', enum: STABLECOIN_ENUM, description: 'Stablecoin to analyze (USDC, USDT, DAI, FRAX)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full stablecoin arb intelligence with peg risk and execution plan',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      stablecoin: { type: 'string', enum: STABLECOIN_ENUM },
                      best_trade: {
                        type: 'object', properties: {
                          entry_venue: { type: 'string' }, entry_venue_type: { type: 'string', enum: VENUE_TYPE_ENUM },
                          exit_venue: { type: 'string' }, exit_venue_type: { type: 'string', enum: VENUE_TYPE_ENUM },
                          entry_price: { type: 'number' }, exit_price: { type: 'number' },
                          gross_spread_pct: { type: 'number' }, estimated_fees_pct: { type: 'number' },
                          net_profit_after_fees_pct: { type: 'number' }, min_profitable_size_usd: { type: 'number' },
                        },
                      },
                      peg_risk_context: {
                        type: 'object', properties: {
                          current_price: { type: 'number' }, deviation_from_peg_pct: { type: 'number' },
                          peg_risk_level: { type: 'string', enum: PEG_RISK_ENUM },
                          depeg_probability_pct: { type: 'number' },
                          peg_mechanism: { type: 'string', enum: PEG_MECHANISM_ENUM },
                          recent_peg_events: { type: 'string' }, safe_to_arb: { type: 'boolean' },
                        },
                      },
                      execution_plan: {
                        type: 'object', properties: {
                          step_1: { type: 'string' }, step_2: { type: 'string' }, step_3: { type: 'string' },
                          total_time_seconds: { type: 'number' }, recommended_size_usd: { type: 'number' },
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
            '400': { description: 'Missing stablecoin' }, '500': { description: 'Internal error' },
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
