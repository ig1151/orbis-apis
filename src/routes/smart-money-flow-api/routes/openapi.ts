import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const discoverySchema = {
  type: 'object', properties: {
    name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
    docs_url: { type: 'string', format: 'uri' }, openapi_url: { type: 'string', format: 'uri' }, health: { type: 'string' },
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
      title: 'Smart Money Flow API',
      version: '1.0.0',
      description: 'Track institutional and smart-money capital flows on-chain — identify where sophisticated investors are deploying capital, sector rotation signals, and top wallet activity for trading agents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-execution-gate-required': false,
      'x-paper-mode-recommended': true,
      'x402-compatible': true,
      'x-agent-marketplace-ready': true,
      'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { flows: '$0.003', wallets: '$0.004', lookup: '$0.010' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/smart-money-flow' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'smartMoneyDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/flows': {
        post: {
          operationId: 'smartMoneyFlows',
          summary: 'Current smart money capital flows by sector — rotation direction and momentum signals',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'solana', 'all'] },
                    sector: { type: 'string', description: 'Filter by sector (defi, nft, layer2, gaming, meme, etc.)' },
                    timeframe: { type: 'string', default: '24h', enum: ['1h', '6h', '24h', '7d', '30d'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Smart money flows by sector with rotation context',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      chain: { type: 'string' }, timeframe: { type: 'string' },
                      flows: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            sector: { type: 'string', enum: ['defi', 'nft', 'layer2', 'gaming', 'meme', 'infrastructure', 'staking', 'lending'] },
                            net_flow_usd: { type: 'number' },
                            direction: { type: 'string', enum: ['inflow', 'outflow', 'neutral'] },
                            top_tokens: { type: 'array', items: { type: 'string' } },
                            notable_wallets: { type: 'integer' },
                            momentum: { type: 'string', enum: ['accelerating', 'decelerating', 'stable'] },
                            signal: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                          },
                        },
                      },
                      total_smart_money_volume_usd: { type: 'number' },
                      dominant_rotation: {
                        type: 'object', properties: {
                          from_sector: { type: 'string' }, to_sector: { type: 'string' },
                          magnitude: { type: 'string', enum: ['large', 'moderate', 'small'] },
                          context: { type: 'string' },
                        },
                      },
                      market_regime: { type: 'string', enum: ['risk_on', 'risk_off', 'selective', 'mixed'] },
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
      '/wallets': {
        post: {
          operationId: 'smartMoneyWallets',
          summary: 'Top smart money wallets — recent positions, ROI, win rate, and current thesis',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    chain: { type: 'string', default: 'ethereum' },
                    limit: { type: 'integer', default: 10, minimum: 1, maximum: 50 },
                    strategy: { type: 'string', description: 'Filter by strategy (momentum, value, arbitrage, etc.)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Top smart money wallets with positions and thesis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      chain: { type: 'string' },
                      wallets: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            address: { type: 'string' },
                            label: { type: 'string' },
                            category: { type: 'string', enum: ['institution', 'fund', 'protocol', 'dao', 'whale', 'insider'] },
                            roi_30d_pct: { type: 'number' },
                            roi_90d_pct: { type: 'number' },
                            win_rate_pct: { type: 'number', minimum: 0, maximum: 100 },
                            recent_positions: {
                              type: 'array', items: {
                                type: 'object', properties: {
                                  token: { type: 'string' },
                                  action: { type: 'string', enum: ['opened', 'increased', 'reduced', 'closed'] },
                                  size_usd: { type: 'number' },
                                },
                              },
                            },
                            current_thesis: { type: 'string' },
                            risk_appetite: { type: 'string', enum: ['high', 'medium', 'low'] },
                          },
                        },
                      },
                      summary: {
                        type: 'object', properties: {
                          consensus_bet: { type: 'string' },
                          consensus_chain: { type: 'string' },
                          divergence_rate_pct: { type: 'number' },
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
          operationId: 'smartMoneyLookup',
          summary: 'ONE-CALL: smart money position + top holders + rotation context + aggregate signal for a token',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string', description: 'Token symbol or name (e.g. ETH, SOL, LINK)' },
                    chain: { type: 'string', default: 'ethereum' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full smart money intelligence for a token',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' }, chain: { type: 'string' },
                      smart_money_position: {
                        type: 'object', properties: {
                          net_flow_7d_usd: { type: 'number' }, net_flow_30d_usd: { type: 'number' },
                          direction: { type: 'string', enum: ['accumulating', 'distributing', 'neutral'] },
                          unique_smart_wallets: { type: 'integer' },
                          avg_entry_price_usd: { type: 'number' },
                        },
                      },
                      top_holders: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            address: { type: 'string' },
                            category: { type: 'string', enum: ['institution', 'fund', 'whale', 'protocol'] },
                            position_usd: { type: 'number' },
                            action_30d: { type: 'string', enum: ['increased', 'decreased', 'unchanged'] },
                          },
                        },
                      },
                      rotation_context: {
                        type: 'object', properties: {
                          money_coming_from: { type: 'string' }, catalyst: { type: 'string' },
                          rotation_strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
                        },
                      },
                      aggregate_signal: {
                        type: 'object', properties: {
                          signal: { type: 'string', enum: ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'] },
                          smart_money_consensus: { type: 'string', enum: ['bullish', 'bearish', 'mixed'] },
                          conviction_level: { type: 'string', enum: ['high', 'medium', 'low'] },
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
