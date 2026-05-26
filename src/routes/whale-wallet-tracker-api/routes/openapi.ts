import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const whaleClassification = {
  type: 'object', properties: {
    is_whale: { type: 'boolean' },
    tier: { type: 'string', enum: ['mega_whale', 'whale', 'large_holder', 'mid_holder', 'retail'] },
    estimated_portfolio_usd: { type: 'number' },
    rank_percentile: { type: 'number' },
  },
};

const movementItem = {
  type: 'object', properties: {
    action: { type: 'string', enum: ['buy', 'sell', 'transfer', 'accumulate', 'distribute'] },
    token: { type: 'string' },
    amount_usd: { type: 'number' },
    timestamp: { type: 'string', format: 'date-time' },
    market_impact: { type: 'string', enum: ['high', 'medium', 'low'] },
    signal: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
    note: { type: 'string' },
  },
};

const discoverySchema = {
  type: 'object', properties: {
    name: { type: 'string' },
    version: { type: 'string' },
    description: { type: 'string' },
    docs_url: { type: 'string', format: 'uri' },
    openapi_url: { type: 'string', format: 'uri' },
    health: { type: 'string' },
    auth: { type: 'object', properties: { type: { type: 'string' }, header: { type: 'string' }, docs: { type: 'string' } } },
    endpoints: { type: 'array', items: { type: 'object', properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
    pricing: { type: 'object', properties: { free_tier: { type: 'object', properties: { requests_per_day: { type: 'integer' }, requests_per_month: { type: 'integer' } } }, pay_per_call: { type: 'object', additionalProperties: { type: 'string' } } } },
    agent_capabilities: { type: 'array', items: { type: 'string' } },
    x402_compatible: { type: 'boolean' },
    paper_mode_recommended: { type: 'boolean' },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Whale Wallet Tracker API',
      version: '1.0.0',
      description: 'Track large on-chain wallet movements, identify whale accumulation/distribution patterns, and surface entry/exit signals for trading agents and portfolio managers.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-execution-gate-required': false,
      'x-paper-mode-recommended': true,
      'x402-compatible': true,
      'x-agent-marketplace-ready': true,
      'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { track: '$0.003', scan: '$0.004', lookup: '$0.008' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/whale-wallet-tracker' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'whaleWalletDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: {
            '200': {
              description: 'Full discovery payload',
              content: { 'application/json': { schema: discoverySchema } },
            },
          },
        },
      },
      '/track': {
        post: {
          operationId: 'whaleWalletTrack',
          summary: 'Track a specific wallet — whale classification, recent activity, holdings, and entry/exit signals',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['address'],
                  properties: {
                    address: { type: 'string', description: 'Wallet address to track' },
                    chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'solana'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Whale wallet profile with activity and signals',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      address: { type: 'string' },
                      chain: { type: 'string' },
                      whale_classification: whaleClassification,
                      recent_activity: { type: 'array', items: movementItem },
                      holdings_snapshot: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            token: { type: 'string' }, amount: { type: 'number' },
                            value_usd: { type: 'number' }, pct_portfolio: { type: 'number' },
                          },
                        },
                      },
                      behavior_patterns: {
                        type: 'object', properties: {
                          trading_style: { type: 'string', enum: ['accumulator', 'distributor', 'swing_trader', 'long_term_holder'] },
                          avg_hold_days: { type: 'number' }, win_rate_pct: { type: 'number' },
                          recent_bias: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                        },
                      },
                      entry_exit_signals: {
                        type: 'object', properties: {
                          current_signal: { type: 'string', enum: ['accumulating', 'distributing', 'holding', 'repositioning'] },
                          signal_strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
                          notable_observation: { type: 'string' },
                        },
                      },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing address' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/scan': {
        post: {
          operationId: 'whaleWalletScan',
          summary: 'Scan for recent large whale movements across the market',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'solana', 'all'] },
                    min_usd: { type: 'number', default: 1000000, description: 'Minimum transaction value in USD' },
                    limit: { type: 'integer', default: 10, minimum: 1, maximum: 50 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Recent whale movements with market summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      chain: { type: 'string' },
                      min_usd_threshold: { type: 'number' },
                      movements: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            wallet_address: { type: 'string' },
                            whale_tier: { type: 'string', enum: ['mega_whale', 'whale', 'large_holder'] },
                            action: { type: 'string', enum: ['buy', 'sell', 'transfer', 'accumulate', 'distribute'] },
                            token: { type: 'string' }, amount_usd: { type: 'number' },
                            timestamp: { type: 'string', format: 'date-time' },
                            market_impact: { type: 'string', enum: ['high', 'medium', 'low'] },
                            signal: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                            note: { type: 'string' },
                          },
                        },
                      },
                      market_summary: {
                        type: 'object', properties: {
                          net_whale_flow_usd: { type: 'number' },
                          dominant_action: { type: 'string', enum: ['accumulating', 'distributing', 'mixed'] },
                          top_tokens_by_flow: { type: 'array', items: { type: 'string' } },
                          overall_signal: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                        },
                      },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
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
          operationId: 'whaleWalletLookup',
          summary: 'ONE-CALL: top whale wallets + recent moves + concentration risk + aggregate signal for a token',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string', description: 'Token symbol or address (e.g. ETH, BTC, PEPE)' },
                    chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'solana'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full whale intelligence for a token',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' },
                      chain: { type: 'string' },
                      top_whale_wallets: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            address: { type: 'string' },
                            tier: { type: 'string', enum: ['mega_whale', 'whale', 'large_holder'] },
                            holdings_usd: { type: 'number' },
                            pct_supply: { type: 'number', minimum: 0, maximum: 100 },
                            recent_action: { type: 'string', enum: ['accumulating', 'distributing', 'holding'] },
                            action_strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
                          },
                        },
                      },
                      recent_movements: { type: 'array', items: movementItem },
                      concentration_risk: {
                        type: 'object', properties: {
                          top_10_pct_supply: { type: 'number' },
                          top_50_pct_supply: { type: 'number' },
                          risk_level: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                          risk_note: { type: 'string' },
                          sell_pressure_risk: { type: 'string', enum: ['high', 'medium', 'low'] },
                        },
                      },
                      aggregate_signal: {
                        type: 'object', properties: {
                          signal: { type: 'string', enum: ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'] },
                          whale_consensus: { type: 'string', enum: ['accumulating', 'distributing', 'mixed'] },
                          short_term_outlook: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                          key_insight: { type: 'string' },
                        },
                      },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
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
