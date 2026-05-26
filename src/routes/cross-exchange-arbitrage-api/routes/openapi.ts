import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const opportunitySchema = {
  type: 'object', properties: {
    buy_exchange: { type: 'string' }, sell_exchange: { type: 'string' },
    raw_spread_pct: { type: 'number' }, trading_fee_pct: { type: 'number' },
    net_profit_pct: { type: 'number' }, estimated_profit_usd: { type: 'number' },
    execution_time_min: { type: 'number' }, risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
    viability: { type: 'string', enum: ['excellent', 'good', 'marginal', 'risky'] },
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
      'x-human-approval-required': false,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.003', opportunities: '$0.005', lookup: '$0.006' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Arbitrage prices are time-sensitive — always verify independently before executing.',
      'x-paper-mode-recommended': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/cross-exchange-arbitrage' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'crossExchangeArbitrageDiscovery',
          summary: 'API discovery — name, version, available endpoints',
          security: [],
          responses: { '200': { description: 'Discovery info' } },
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
                    exchanges: { type: 'array', items: { type: 'string' }, description: 'List of exchanges to compare (defaults to top 8)' },
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
                      prices: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            exchange: { type: 'string' }, bid: { type: 'number' }, ask: { type: 'number' },
                            mid: { type: 'number' }, spread_pct: { type: 'number' },
                            volume_24h_usd: { type: 'number' }, liquidity: { type: 'string' },
                            withdrawal_fee_usd: { type: 'number' }, withdrawal_time_min: { type: 'number' },
                          },
                        },
                      },
                      best_buy: { type: 'object', properties: { exchange: { type: 'string' }, price: { type: 'number' } } },
                      best_sell: { type: 'object', properties: { exchange: { type: 'string' }, price: { type: 'number' } } },
                      raw_spread_pct: { type: 'number' },
                      total_fees_pct: { type: 'number' },
                      net_profit_pct: { type: 'number' },
                      viable: { type: 'boolean' },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
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
                      opportunities: { type: 'array', items: { ...opportunitySchema, properties: { ...opportunitySchema.properties, token: { type: 'string' }, required_capital_usd: { type: 'number' }, risk_factors: { type: 'array', items: { type: 'string' } } } } },
                      market_summary: { type: 'object', properties: { total_opportunities: { type: 'integer' }, avg_net_profit_pct: { type: 'number' }, best_token: { type: 'string' }, best_exchange_pair: { type: 'string' } } },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
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
          summary: 'ONE-CALL: full arbitrage analysis for a token — prices, best route, alternatives, risk assessment, verdict',
          'x-one-call': true,
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
                      token: { type: 'string' },
                      capital_usd: { type: 'number' },
                      price_matrix: { type: 'array', items: { type: 'object', properties: { exchange: { type: 'string' }, price: { type: 'number' }, liquidity: { type: 'string' }, spread_pct: { type: 'number' } } } },
                      best_opportunity: { type: 'object', properties: { buy_exchange: { type: 'string' }, sell_exchange: { type: 'string' }, raw_spread_pct: { type: 'number' }, all_fees_pct: { type: 'number' }, net_profit_pct: { type: 'number' }, estimated_profit_usd: { type: 'number' }, execution_time_min: { type: 'number' }, max_viable_order_usd: { type: 'number' } } },
                      alternative_routes: { type: 'array', items: { type: 'object', properties: { buy: { type: 'string' }, sell: { type: 'string' }, net_profit_pct: { type: 'number' }, note: { type: 'string' } } } },
                      risk_assessment: { type: 'object', properties: { price_risk: { type: 'string' }, liquidity_risk: { type: 'string' }, execution_risk: { type: 'string' }, overall_risk: { type: 'string' }, key_risks: { type: 'array', items: { type: 'string' } } } },
                      verdict: { type: 'string', enum: ['execute', 'watch', 'pass'] },
                      verdict_rationale: { type: 'string' },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
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
