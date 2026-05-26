import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const priceRowSchema = {
  type: 'object', properties: {
    exchange: { type: 'string' },
    bid: { type: 'number' }, ask: { type: 'number' }, mid: { type: 'number' },
    spread_pct: { type: 'number' }, volume_24h_usd: { type: 'number' },
    liquidity: { type: 'string', enum: ['high', 'medium', 'low'] },
    withdrawal_fee_usd: { type: 'number' }, deposit_time_min: { type: 'number' }, withdrawal_time_min: { type: 'number' },
  },
};

const opportunitySchema = {
  type: 'object', properties: {
    token: { type: 'string' },
    buy_exchange: { type: 'string' }, sell_exchange: { type: 'string' },
    buy_price: { type: 'number' }, sell_price: { type: 'number' },
    raw_spread_pct: { type: 'number' }, trading_fee_pct: { type: 'number' },
    withdrawal_fee_usd: { type: 'number' }, net_profit_pct: { type: 'number' },
    required_capital_usd: { type: 'number' }, estimated_profit_usd: { type: 'number' },
    execution_time_min: { type: 'number' },
    risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
    risk_factors: { type: 'array', items: { type: 'string' } },
    viability: { type: 'string', enum: ['excellent', 'good', 'marginal', 'risky'] },
  },
};

const discoverySchema = {
  type: 'object', properties: {
    name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
    docs_url: { type: 'string', format: 'uri' }, openapi_url: { type: 'string', format: 'uri' }, health: { type: 'string' },
    auth: { type: 'object', properties: { type: { type: 'string' }, header: { type: 'string' }, docs: { type: 'string' } } },
    endpoints: { type: 'array', items: { type: 'object', properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
    pricing: { type: 'object', properties: { free_tier: { type: 'object', properties: { requests_per_day: { type: 'integer' }, requests_per_month: { type: 'integer' } } }, pay_per_call: { type: 'object', additionalProperties: { type: 'string' } } } },
    agent_capabilities: { type: 'array', items: { type: 'string' } },
    x402_compatible: { type: 'boolean' }, paper_mode_recommended: { type: 'boolean' },
    execution_gate_required: { type: 'boolean' },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Cross-Exchange Arbitrage API',
      version: '1.0.0',
      description: 'Detect price gaps across centralized exchanges (Binance, Coinbase, Kraken, OKX, Bybit, etc.) and calculate net profit opportunities after all fees. Built for arbitrage bots, trading agents, and quant strategies.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': true,
      'x-execution-gate-required': true,
      'x-paper-mode-recommended': true,
      'x402-compatible': true,
      'x-agent-marketplace-ready': true,
      'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.003', opportunities: '$0.005', lookup: '$0.010' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Arbitrage prices are time-sensitive — always verify independently before executing.',
      'x-execution-gate-note': 'Returns execute/watch/pass verdicts. Human approval required before acting on any output. Prices may be stale.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/cross-exchange-arbitrage' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'crossExchangeArbitrageDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/scan': {
        post: {
          operationId: 'crossExchangeArbitrageScan',
          summary: 'Price comparison across exchanges for a token — bids, asks, fees, and net spread',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string', description: 'Token symbol (e.g. BTC, ETH, SOL)' },
                    exchanges: { type: 'array', items: { type: 'string' }, description: 'Exchanges to compare (defaults to top 8: Binance, Coinbase, Kraken, OKX, Bybit, Bitfinex, Huobi, KuCoin)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Price matrix with arbitrage spread and fee breakdown',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' },
                      prices: { type: 'array', items: priceRowSchema },
                      best_buy: { type: 'object', properties: { exchange: { type: 'string' }, price: { type: 'number' } } },
                      best_sell: { type: 'object', properties: { exchange: { type: 'string' }, price: { type: 'number' } } },
                      raw_spread_pct: { type: 'number' },
                      total_fees_pct: { type: 'number' },
                      net_profit_pct: { type: 'number' },
                      viable: { type: 'boolean' },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
                      human_approval_required: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing token' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/opportunities': {
        post: {
          operationId: 'crossExchangeArbitrageOpportunities',
          summary: 'Top arbitrage opportunities across the market — ranked by net profit after all fees',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    min_profit_pct: { type: 'number', default: 0.3, description: 'Minimum net profit percentage after fees' },
                    limit: { type: 'integer', default: 10, minimum: 1, maximum: 50 },
                    include_fees: { type: 'boolean', default: true },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ranked arbitrage opportunities with profit estimates',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      min_profit_pct: { type: 'number' },
                      opportunities: { type: 'array', items: opportunitySchema },
                      market_summary: {
                        type: 'object', properties: {
                          total_opportunities: { type: 'integer' },
                          avg_net_profit_pct: { type: 'number' },
                          best_token: { type: 'string' },
                          best_exchange_pair: { type: 'string' },
                        },
                      },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
                      human_approval_required: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
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
          operationId: 'crossExchangeArbitrageLookup',
          summary: 'ONE-CALL: full arbitrage analysis — prices, best route, alternatives, risk assessment, execute/watch/pass verdict',
          'x-one-call': true,
          'x-human-approval-required': true,
          'x-execution-gate-required': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string' },
                    capital_usd: { type: 'number', default: 10000, description: 'Available capital in USD for profit calculation' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Complete arbitrage intelligence for a token',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' }, capital_usd: { type: 'number' },
                      price_matrix: { type: 'array', items: priceRowSchema },
                      best_opportunity: {
                        type: 'object', properties: {
                          buy_exchange: { type: 'string' }, sell_exchange: { type: 'string' },
                          raw_spread_pct: { type: 'number' }, all_fees_pct: { type: 'number' },
                          net_profit_pct: { type: 'number' }, estimated_profit_usd: { type: 'number' },
                          execution_time_min: { type: 'number' }, max_viable_order_usd: { type: 'number' },
                        },
                      },
                      alternative_routes: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            buy: { type: 'string' }, sell: { type: 'string' },
                            net_profit_pct: { type: 'number' }, note: { type: 'string' },
                          },
                        },
                      },
                      risk_assessment: {
                        type: 'object', properties: {
                          price_risk: { type: 'string', enum: ['low', 'medium', 'high'] },
                          liquidity_risk: { type: 'string', enum: ['low', 'medium', 'high'] },
                          execution_risk: { type: 'string', enum: ['low', 'medium', 'high'] },
                          overall_risk: { type: 'string', enum: ['low', 'medium', 'high'] },
                          key_risks: { type: 'array', items: { type: 'string' } },
                        },
                      },
                      verdict: { type: 'string', enum: ['execute', 'watch', 'pass'] },
                      verdict_rationale: { type: 'string' },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
                      human_approval_required: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing token' },
            '500': { description: 'Internal error' },
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
