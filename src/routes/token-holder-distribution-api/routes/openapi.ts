import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const holderItem = {
  type: 'object', properties: {
    rank: { type: 'integer' },
    address: { type: 'string' },
    label: { type: 'string' },
    type: { type: 'string', enum: ['exchange', 'team', 'dao', 'whale', 'retail', 'contract'] },
    balance: { type: 'number' },
    pct_supply: { type: 'number', minimum: 0, maximum: 100 },
    change_30d_pct: { type: 'number' },
    behavior: { type: 'string', enum: ['accumulating', 'distributing', 'holding'] },
  },
};

const concentrationRisk = {
  type: 'object', properties: {
    gini_coefficient: { type: 'number', minimum: 0, maximum: 1 },
    risk_level: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
    risk_note: { type: 'string' },
    sell_pressure_risk: { type: 'string', enum: ['high', 'medium', 'low'] },
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
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Token Holder Distribution API',
      version: '1.0.0',
      description: 'Analyze token holder distribution — whale concentration, top holder behavior, decentralization trends, and sell pressure risk. Built for due diligence, tokenomics analysis, and risk-aware trading agents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-execution-gate-required': false,
      'x-paper-mode-recommended': true,
      'x402-compatible': true,
      'x-agent-marketplace-ready': true,
      'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { analyze: '$0.003', trend: '$0.003', lookup: '$0.008' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/token-holder-distribution' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'tokenHolderDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/analyze': {
        post: {
          operationId: 'tokenHolderAnalyze',
          summary: 'Snapshot of token holder distribution — whale %, top-10 concentration, segment breakdown, sell pressure risk',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string', description: 'Token name or contract address (e.g. ETH, UNI, LINK)' },
                    chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'solana'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Holder distribution snapshot with concentration risk',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' }, chain: { type: 'string' },
                      total_holders: { type: 'integer' },
                      distribution: {
                        type: 'object', properties: {
                          top_1_pct_supply: { type: 'number' }, top_10_pct_supply: { type: 'number' },
                          top_50_pct_supply: { type: 'number' }, top_100_pct_supply: { type: 'number' },
                          retail_holders_pct: { type: 'number' }, exchange_held_pct: { type: 'number' },
                          contract_held_pct: { type: 'number' }, locked_pct: { type: 'number' },
                        },
                      },
                      top_holders: { type: 'array', items: holderItem },
                      holder_segments: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            range: { type: 'string' }, count: { type: 'integer' },
                            pct_of_supply: { type: 'number' },
                            type: { type: 'string', enum: ['whale', 'large', 'medium', 'small', 'micro'] },
                          },
                        },
                      },
                      concentration_risk: concentrationRisk,
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
      '/trend': {
        post: {
          operationId: 'tokenHolderTrend',
          summary: 'Holder distribution trend — growth rate, decentralization direction, whale behavior over time',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string' },
                    chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'solana'] },
                    days: { type: 'integer', default: 30, minimum: 7, maximum: 365 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Historical holder distribution trends',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' }, chain: { type: 'string' }, period_days: { type: 'integer' },
                      holder_count_trend: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            date: { type: 'string', format: 'date' },
                            total_holders: { type: 'integer' }, new_holders: { type: 'integer' }, lost_holders: { type: 'integer' },
                          },
                        },
                      },
                      concentration_trend: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            date: { type: 'string', format: 'date' },
                            top_10_pct_supply: { type: 'number' }, whale_count: { type: 'integer' },
                          },
                        },
                      },
                      trend_summary: {
                        type: 'object', properties: {
                          holder_growth_rate_pct: { type: 'number' },
                          holder_trend: { type: 'string', enum: ['growing', 'shrinking', 'stable'] },
                          decentralization_trend: { type: 'string', enum: ['improving', 'worsening', 'stable'] },
                          whale_activity: { type: 'string', enum: ['accumulating', 'distributing', 'neutral'] },
                          retail_adoption: { type: 'string', enum: ['increasing', 'decreasing', 'stable'] },
                        },
                      },
                      key_events: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            date: { type: 'string', format: 'date' },
                            event: { type: 'string' },
                            impact: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                          },
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
      '/lookup': {
        post: {
          operationId: 'tokenHolderLookup',
          summary: 'ONE-CALL: snapshot + 30d trend + concentration risk + investment signal for a token',
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
                    chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'solana'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Complete token holder distribution intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' }, chain: { type: 'string' },
                      snapshot: {
                        type: 'object', properties: {
                          total_holders: { type: 'integer' },
                          top_10_pct_supply: { type: 'number' }, top_50_pct_supply: { type: 'number' },
                          whale_count: { type: 'integer' }, retail_pct_supply: { type: 'number' },
                          exchange_pct_supply: { type: 'number' }, locked_pct: { type: 'number' },
                        },
                      },
                      top_holders: { type: 'array', items: holderItem },
                      trend_30d: {
                        type: 'object', properties: {
                          holder_count_change: { type: 'integer' },
                          holder_trend: { type: 'string', enum: ['growing', 'shrinking', 'stable'] },
                          whale_trend: { type: 'string', enum: ['accumulating', 'distributing', 'neutral'] },
                          decentralization_trend: { type: 'string', enum: ['improving', 'worsening', 'stable'] },
                        },
                      },
                      concentration_risk: concentrationRisk,
                      investment_signal: {
                        type: 'object', properties: {
                          signal: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] },
                          conviction: { type: 'string', enum: ['high', 'medium', 'low'] },
                          key_insight: { type: 'string' },
                          watch_list: { type: 'array', items: { type: 'string', description: 'Address or condition to monitor' } },
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
