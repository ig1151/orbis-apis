import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const rugpullRiskSchema = {
  type: 'object', properties: {
    risk_score: { type: 'number', minimum: 0, maximum: 100 },
    risk_level: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'minimal'] },
    red_flags: { type: 'array', items: { type: 'string' } },
    green_flags: { type: 'array', items: { type: 'string' } },
    contract_verified: { type: 'boolean' },
    liquidity_locked: { type: 'boolean' },
    dev_wallet_pct: { type: 'number' },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Meme Coin Intelligence API',
      version: '1.0.0',
      description: 'Virality scores, rugpull risk assessment, momentum analysis, and social signals for meme coins. Built for trading agents and portfolio managers that need fast, structured meme coin intelligence.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { score: '$0.003', trending: '$0.004', lookup: '$0.006' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Meme coins are extremely high risk — can go to zero instantly.',
      'x-paper-mode-recommended': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/meme-coin-intelligence' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'memeCoinDiscovery',
          summary: 'API discovery — name, version, available endpoints',
          security: [],
          responses: { '200': { description: 'Discovery info' } },
        },
      },
      '/score': {
        post: {
          operationId: 'memeCoinScore',
          summary: 'Virality + rugpull risk score for a meme coin — momentum, social signals, contract safety',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string', description: 'Token name or contract address (e.g. PEPE, SHIB, DOGE)' },
                    chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'bsc', 'solana', 'arbitrum'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full meme coin risk and virality assessment',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' },
                      chain: { type: 'string' },
                      virality_score: { type: 'object', properties: { score: { type: 'number' }, tier: { type: 'string' }, momentum: { type: 'string' }, drivers: { type: 'array', items: { type: 'string' } }, peak_reached: { type: 'boolean' } } },
                      rugpull_risk: rugpullRiskSchema,
                      social_signal: { type: 'object', properties: { sentiment: { type: 'string' }, influencer_mentions: { type: 'integer' }, community_size_estimate: { type: 'integer' }, viral_narrative: { type: 'string' } } },
                      momentum_score: { type: 'object', properties: { score: { type: 'number' }, price_action: { type: 'string' }, volume_trend: { type: 'string' }, fomo_indicator: { type: 'string' } } },
                      recommendation: { type: 'string', enum: ['ride', 'watch', 'avoid', 'exit'] },
                      recommendation_rationale: { type: 'string' },
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
      '/trending': {
        post: {
          operationId: 'memeCoinTrending',
          summary: 'Trending meme coins right now — ranked by virality with risk summary',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    chain: { type: 'string', default: 'all', enum: ['all', 'ethereum', 'base', 'bsc', 'solana'] },
                    limit: { type: 'integer', default: 10, minimum: 1, maximum: 50 },
                    min_virality: { type: 'number', default: 50, minimum: 0, maximum: 100 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Trending meme coins with virality and risk scores',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      chain: { type: 'string' },
                      trending: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            token: { type: 'string' }, chain: { type: 'string' },
                            virality_score: { type: 'number' }, rugpull_risk_level: { type: 'string' },
                            momentum: { type: 'string' }, price_change_24h_pct: { type: 'number' },
                            social_buzz: { type: 'string' }, narrative: { type: 'string' },
                            stage: { type: 'string', enum: ['early', 'mid', 'peak', 'fading'] },
                          },
                        },
                      },
                      market_summary: { type: 'object', properties: { meme_season_indicator: { type: 'number' }, dominant_chains: { type: 'array', items: { type: 'string' } }, dominant_narratives: { type: 'array', items: { type: 'string' } }, avg_rugpull_risk: { type: 'string' } } },
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
          operationId: 'memeCoinLookup',
          summary: 'ONE-CALL: full meme coin intelligence — virality, rugpull risk, momentum, lifecycle stage, entry window',
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
                    chain: { type: 'string', default: 'ethereum' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Complete meme coin intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' },
                      chain: { type: 'string' },
                      virality: { type: 'object', properties: { score: { type: 'number' }, tier: { type: 'string' }, momentum: { type: 'string' }, peak_reached: { type: 'boolean' } } },
                      rugpull_risk: rugpullRiskSchema,
                      social: { type: 'object', properties: { sentiment: { type: 'string' }, influencer_mentions: { type: 'integer' }, viral_narrative: { type: 'string' }, trending_rank: { type: 'integer' } } },
                      momentum: { type: 'object', properties: { score: { type: 'number' }, price_action: { type: 'string' }, volume_trend: { type: 'string' }, fomo_indicator: { type: 'string' } } },
                      lifecycle_stage: { type: 'string', enum: ['launch', 'early_adoption', 'viral_peak', 'distribution', 'fading', 'dead'] },
                      entry_window: { type: 'object', properties: { status: { type: 'string', enum: ['open', 'closing', 'closed', 'too_early'] }, optimal_entry: { type: 'string' }, target_exit: { type: 'string' }, max_hold_recommendation: { type: 'string' } } },
                      aggregate_signal: { type: 'object', properties: { signal: { type: 'string', enum: ['strong_buy', 'buy', 'watch', 'avoid', 'exit'] }, conviction: { type: 'string' }, key_risk: { type: 'string' }, key_catalyst: { type: 'string' } } },
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
