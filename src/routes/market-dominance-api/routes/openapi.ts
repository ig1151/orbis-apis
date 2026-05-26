import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const dominanceAssetSchema = {
  type: 'object', properties: {
    pct: { type: 'number', minimum: 0, maximum: 100 },
    change_24h: { type: 'number' }, change_7d: { type: 'number' },
    trend: { type: 'string', enum: ['rising', 'falling', 'stable'] },
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
      title: 'Market Dominance API',
      version: '1.0.0',
      description: 'Track BTC, ETH, and altcoin market dominance in real time — detect phase transitions (BTC season, alt season, etc.), rotation signals, and portfolio allocation implications.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-execution-gate-required': true,
      'x-paper-mode-recommended': true,
      'x402-compatible': true,
      'x-agent-marketplace-ready': true,
      'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { current: '$0.002', history: '$0.003', lookup: '$0.005' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Portfolio allocation bias fields are informational only — do not execute trades based solely on API output.',
      'x-execution-gate-note': 'Returns portfolio allocation bias (increase/decrease/hold). Use as macro context filter only, not a direct trade signal.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/market-dominance' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'marketDominanceDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/current': {
        post: {
          operationId: 'marketDominanceCurrent',
          summary: 'Current BTC/ETH/alt dominance — market phase classification and rotation signals',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: {} } } } },
          responses: {
            '200': {
              description: 'Current dominance breakdown with phase classification',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      dominance: {
                        type: 'object', properties: {
                          btc: dominanceAssetSchema,
                          eth: dominanceAssetSchema,
                          stablecoins: dominanceAssetSchema,
                          altcoins: dominanceAssetSchema,
                          defi: { type: 'object', properties: { pct: { type: 'number' }, change_24h: { type: 'number' } } },
                          top_10_excl_btc_eth: { type: 'object', properties: { pct: { type: 'number' }, change_24h: { type: 'number' } } },
                        },
                      },
                      total_market_cap_usd: { type: 'number' },
                      market_phase: {
                        type: 'object', properties: {
                          phase: { type: 'string', enum: ['btc_season', 'eth_season', 'alt_season', 'defi_season', 'stable_season', 'mixed'] },
                          confidence: { type: 'number', minimum: 0, maximum: 1 },
                          description: { type: 'string' },
                        },
                      },
                      rotation_signals: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            from: { type: 'string' }, to: { type: 'string' },
                            strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
                            signal: { type: 'string' },
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
            '500': { description: 'Internal error' },
          },
        },
      },
      '/history': {
        post: {
          operationId: 'marketDominanceHistory',
          summary: 'Historical dominance data — trend analysis and phase transitions over time',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    days: { type: 'integer', default: 30, minimum: 1, maximum: 365 },
                    assets: { type: 'array', items: { type: 'string', enum: ['btc', 'eth', 'altcoins', 'stablecoins', 'defi'] }, default: ['btc', 'eth', 'altcoins'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Historical dominance with trend analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      period_days: { type: 'integer' },
                      assets: { type: 'array', items: { type: 'string' } },
                      history: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            date: { type: 'string', format: 'date' },
                            btc_pct: { type: 'number' }, eth_pct: { type: 'number' },
                            altcoins_pct: { type: 'number' }, stablecoins_pct: { type: 'number' },
                            total_market_cap_usd: { type: 'number' },
                            phase: { type: 'string', enum: ['btc_season', 'eth_season', 'alt_season', 'mixed'] },
                          },
                        },
                      },
                      trend_analysis: {
                        type: 'object', properties: {
                          btc_trend: { type: 'string', enum: ['rising', 'falling', 'consolidating'] },
                          eth_trend: { type: 'string', enum: ['rising', 'falling', 'consolidating'] },
                          alt_trend: { type: 'string', enum: ['rising', 'falling', 'consolidating'] },
                          dominant_phase_period: { type: 'string' },
                          phase_transitions: {
                            type: 'array', items: {
                              type: 'object', properties: {
                                date: { type: 'string', format: 'date' },
                                from: { type: 'string' }, to: { type: 'string' }, catalyst: { type: 'string' },
                              },
                            },
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
            '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'marketDominanceLookup',
          summary: 'ONE-CALL: dominance + phase + rotation signals + portfolio allocation implications',
          'x-one-call': true,
          'x-execution-gate-required': true,
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: {} } } } },
          responses: {
            '200': {
              description: 'Complete market dominance intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      dominance: {
                        type: 'object', properties: {
                          btc_pct: { type: 'number' }, eth_pct: { type: 'number' },
                          alts_pct: { type: 'number' }, stablecoins_pct: { type: 'number' },
                          change_7d: { type: 'object', properties: { btc: { type: 'number' }, eth: { type: 'number' }, alts: { type: 'number' } } },
                        },
                      },
                      market_phase: {
                        type: 'object', properties: {
                          phase: { type: 'string', enum: ['btc_season', 'eth_season', 'alt_season', 'mixed'] },
                          duration_days: { type: 'integer' },
                          phase_strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
                          next_rotation_probability: {
                            type: 'object', properties: {
                              to: { type: 'string' }, probability_pct: { type: 'number' }, timeframe: { type: 'string' },
                            },
                          },
                        },
                      },
                      rotation_signals: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            signal: { type: 'string' },
                            direction: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                            affected_assets: { type: 'array', items: { type: 'string' } },
                            strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
                          },
                        },
                      },
                      portfolio_implications: {
                        type: 'object',
                        description: 'Informational macro bias only — not a direct allocation instruction. Verify with additional analysis before acting.',
                        properties: {
                          btc_allocation_bias: { type: 'string', enum: ['increase', 'decrease', 'hold'] },
                          eth_allocation_bias: { type: 'string', enum: ['increase', 'decrease', 'hold'] },
                          alt_allocation_bias: { type: 'string', enum: ['increase', 'decrease', 'hold'] },
                          stablecoin_allocation_bias: { type: 'string', enum: ['increase', 'decrease', 'hold'] },
                          rationale: { type: 'string' },
                          allocation_disclaimer: { type: 'string' },
                        },
                      },
                      key_levels: {
                        type: 'object', properties: {
                          btc_dominance_key_support: { type: 'number' },
                          btc_dominance_key_resistance: { type: 'number' },
                          alt_season_threshold_pct: { type: 'number' },
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
    },
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
    },
  });
});

export default router;
