import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const providerSchema = {
  type: 'array', items: {
    type: 'object', properties: {
      name: { type: 'string' }, type: { type: 'string', enum: ['exchange', 'liquid_staking', 'self_custody', 'pool'] },
      apy: { type: 'number' }, fee_pct: { type: 'number' }, liquid: { type: 'boolean' },
      risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
    },
  },
};

const stakingCoreSchema = {
  type: 'object', properties: {
    native_apy: { type: 'number' }, real_apy_after_inflation: { type: 'number' },
    reward_token: { type: 'string' }, lock_up_days: { type: 'integer', nullable: true },
    unbonding_days: { type: 'integer', nullable: true }, min_stake: { type: 'number', nullable: true },
    compounding: { type: 'boolean' }, slash_risk: { type: 'string', enum: ['low', 'medium', 'high', 'none'] },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Staking Rewards API',
      version: '1.0.0',
      description: 'Staking APY rates, provider comparison, reward estimates, and network health for PoS assets. Built for yield-seeking agents, portfolio managers, and DeFi automation workflows.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { rates: '$0.003', estimate: '$0.003', compare: '$0.004', lookup: '$0.006' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/staking-rewards' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: { operationId: 'stakingDiscovery', summary: 'API discovery', security: [], responses: { '200': { description: 'Discovery info' } } },
      },
      '/rates': {
        post: {
          operationId: 'stakingRates',
          summary: 'Staking rates — native APY, real APY after inflation, providers, lock-up, and slash risk',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string', example: 'ETH' } } } } } },
          responses: {
            '200': {
              description: 'Staking rates with provider breakdown',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      staking: stakingCoreSchema,
                      providers: providerSchema,
                      best_option: { type: 'string' },
                      financial_disclaimer: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing symbol' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/estimate': {
        post: {
          operationId: 'stakingEstimate',
          summary: 'Estimate staking rewards — tokens earned, USD value, daily income, and 4 price scenarios',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol', 'amount'], properties: { symbol: { type: 'string' }, amount: { type: 'number', description: 'Number of tokens to stake' }, duration_days: { type: 'integer', default: 365 }, provider: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Reward estimate with daily breakdown and price scenarios',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      amount_staked: { type: 'number' }, duration_days: { type: 'integer' }, provider: { type: 'string' },
                      estimate: {
                        type: 'object', properties: {
                          apy: { type: 'number' }, rewards_tokens: { type: 'number' }, rewards_usd: { type: 'number' },
                          principal_usd: { type: 'number' }, total_value_usd: { type: 'number' },
                          daily_rewards_tokens: { type: 'number' }, daily_rewards_usd: { type: 'number' },
                        },
                      },
                      scenarios: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            price_change: { type: 'string' }, total_value_usd: { type: 'number' }, net_return_pct: { type: 'number' },
                          },
                        },
                      },
                      financial_disclaimer: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing symbol or amount' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/compare': {
        post: {
          operationId: 'stakingCompare',
          summary: 'Compare staking yields across up to 15 PoS assets — ranked by risk-adjusted APY',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbols'], properties: { symbols: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 15 } } } } } },
          responses: {
            '200': {
              description: 'Ranked staking comparison',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      results: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            symbol: { type: 'string' }, best_apy: { type: 'number' },
                            real_apy_after_inflation: { type: 'number' }, best_provider: { type: 'string' },
                            lock_up_days: { type: 'integer', nullable: true },
                            liquid_option_available: { type: 'boolean' },
                            slash_risk: { type: 'string', enum: ['low', 'medium', 'high', 'none'] },
                            rank: { type: 'integer' },
                          },
                        },
                      },
                      best_yield: { type: 'string' },
                      best_risk_adjusted: { type: 'string' },
                      financial_disclaimer: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Invalid input' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'stakingLookup',
          summary: 'ONE-CALL: rates + provider comparison + reward estimate + network health',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string' }, amount: { type: 'number', description: 'Optional: include for reward estimate' } } } } } },
          responses: {
            '200': {
              description: 'Full staking intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      staking: stakingCoreSchema,
                      providers: providerSchema,
                      estimate_1yr: {
                        type: 'object', nullable: true, properties: {
                          amount: { type: 'number' }, rewards_tokens: { type: 'number' }, rewards_usd: { type: 'number' },
                        },
                      },
                      best_option: { type: 'string' },
                      network_health: {
                        type: 'object', properties: {
                          validators: { type: 'integer' }, staking_ratio_pct: { type: 'number' },
                          decentralization: { type: 'string', enum: ['high', 'medium', 'low'] },
                        },
                      },
                      financial_disclaimer: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing symbol' },
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
