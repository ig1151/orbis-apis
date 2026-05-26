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
    dev_wallet_pct: { type: 'number', minimum: 0, maximum: 100 },
  },
};

const viralitySchema = {
  type: 'object', properties: {
    score: { type: 'number', minimum: 0, maximum: 100 },
    tier: { type: 'string', enum: ['viral', 'trending', 'growing', 'fading', 'dead'] },
    momentum: { type: 'string', enum: ['accelerating', 'decelerating', 'stable'] },
    drivers: { type: 'array', items: { type: 'string' } },
    peak_reached: { type: 'boolean' },
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
      title: 'Meme Coin Intelligence API',
      version: '1.0.0',
      description: 'Virality scores, rugpull risk assessment, momentum analysis, and social signals for meme coins. Built for trading agents and portfolio managers that need fast, structured meme coin intelligence.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': true,
      'x-execution-gate-required': true,
      'x-paper-mode-recommended': true,
      'x402-compatible': true,
      'x-agent-marketplace-ready': true,
      'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { score: '$0.003', trending: '$0.004', lookup: '$0.008' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Meme coins are extremely high risk — can go to zero instantly.',
      'x-execution-gate-note': 'Signals include ride/exit/avoid/strong_buy. Human approval required before executing on any output.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/meme-coin-intelligence' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'memeCoinDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/score': {
        post: {
          operationId: 'memeCoinScore',
          summary: 'Virality + rugpull risk score for a meme coin — momentum, social signals, contract safety',
          'x-human-approval-required': true,
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
                      token: { type: 'string' }, chain: { type: 'string' },
                      virality_score: viralitySchema,
                      rugpull_risk: rugpullRiskSchema,
                      social_signal: {
                        type: 'object', properties: {
                          twitter_mentions_24h: { type: 'integer' },
                          sentiment: { type: 'string', enum: ['very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish'] },
                          influencer_mentions: { type: 'integer' },
                          community_size_estimate: { type: 'integer' },
                          viral_narrative: { type: 'string' },
                        },
                      },
                      momentum_score: {
                        type: 'object', properties: {
                          score: { type: 'number', minimum: 0, maximum: 100 },
                          price_action: { type: 'string', enum: ['parabolic', 'rising', 'consolidating', 'falling', 'crashed'] },
                          volume_trend: { type: 'string', enum: ['surging', 'rising', 'stable', 'declining'] },
                          fomo_indicator: { type: 'string', enum: ['extreme', 'high', 'moderate', 'low'] },
                        },
                      },
                      recommendation: { type: 'string', enum: ['ride', 'watch', 'avoid', 'exit'] },
                      recommendation_rationale: { type: 'string' },
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
                            virality_score: { type: 'number', minimum: 0, maximum: 100 },
                            rugpull_risk_level: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'minimal'] },
                            momentum: { type: 'string', enum: ['accelerating', 'decelerating', 'stable'] },
                            price_change_24h_pct: { type: 'number' },
                            volume_change_24h_pct: { type: 'number' },
                            social_buzz: { type: 'string', enum: ['extremely_high', 'high', 'moderate', 'low'] },
                            narrative: { type: 'string' },
                            stage: { type: 'string', enum: ['early', 'mid', 'peak', 'fading'] },
                          },
                        },
                      },
                      market_summary: {
                        type: 'object', properties: {
                          meme_season_indicator: { type: 'number', minimum: 0, maximum: 100 },
                          dominant_chains: { type: 'array', items: { type: 'string' } },
                          dominant_narratives: { type: 'array', items: { type: 'string' } },
                          avg_rugpull_risk: { type: 'string', enum: ['high', 'medium', 'low'] },
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
          operationId: 'memeCoinLookup',
          summary: 'ONE-CALL: full meme coin intelligence — virality, rugpull risk, momentum, lifecycle stage, entry window',
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
                    chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'bsc', 'solana', 'arbitrum'] },
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
                      token: { type: 'string' }, chain: { type: 'string' },
                      virality: viralitySchema,
                      rugpull_risk: rugpullRiskSchema,
                      social: {
                        type: 'object', properties: {
                          sentiment: { type: 'string', enum: ['very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish'] },
                          influencer_mentions: { type: 'integer' },
                          viral_narrative: { type: 'string' },
                          trending_rank: { type: 'integer' },
                        },
                      },
                      momentum: {
                        type: 'object', properties: {
                          score: { type: 'number', minimum: 0, maximum: 100 },
                          price_action: { type: 'string', enum: ['parabolic', 'rising', 'consolidating', 'falling', 'crashed'] },
                          volume_trend: { type: 'string', enum: ['surging', 'rising', 'stable', 'declining'] },
                          fomo_indicator: { type: 'string', enum: ['extreme', 'high', 'moderate', 'low'] },
                        },
                      },
                      lifecycle_stage: { type: 'string', enum: ['launch', 'early_adoption', 'viral_peak', 'distribution', 'fading', 'dead'] },
                      entry_window: {
                        type: 'object', properties: {
                          status: { type: 'string', enum: ['open', 'closing', 'closed', 'too_early'] },
                          optimal_entry: { type: 'string' },
                          target_exit: { type: 'string' },
                          max_hold_recommendation: { type: 'string' },
                        },
                      },
                      aggregate_signal: {
                        type: 'object', properties: {
                          signal: { type: 'string', enum: ['strong_buy', 'buy', 'watch', 'avoid', 'exit'] },
                          conviction: { type: 'string', enum: ['high', 'medium', 'low'] },
                          key_risk: { type: 'string' },
                          key_catalyst: { type: 'string' },
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
