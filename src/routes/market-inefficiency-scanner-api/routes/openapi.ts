import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const INEFFICIENCY_TYPE_ENUM = ['price_lag', 'orderbook_imbalance', 'liquidity_gap', 'arbitrage_window', 'wash_trading_distortion'];
const ACTIONABILITY_ENUM = ['immediate', 'building', 'fading'];
const ROOT_CAUSE_ENUM = ['market_microstructure', 'information_asymmetry', 'liquidity_mismatch', 'coordinated_activity'];
const RISK_LEVEL_ENUM = ['low', 'medium', 'high'];
const MARKET_ENUM = ['crypto', 'nft', 'defi'];
const TIMEFRAME_ENUM = ['1m', '5m', '15m', '1h'];
const STRUCTURAL_ENUM = ['structural', 'temporary'];
const RECURRENCE_ENUM = ['high', 'medium', 'low'];
const COMPETITION_ENUM = ['high', 'medium', 'low'];
const DIFFICULTY_ENUM = ['easy', 'moderate', 'hard'];
const SEVERITY_ENUM = ['high', 'medium', 'low'];

const inefficiencySignalItem = {
  type: 'object', properties: {
    type: { type: 'string', enum: INEFFICIENCY_TYPE_ENUM },
    symbol: { type: 'string' }, venue: { type: 'string' },
    magnitude_pct: { type: 'number' }, confidence_pct: { type: 'number' },
    estimated_duration_seconds: { type: 'number' },
    actionability: { type: 'string', enum: ACTIONABILITY_ENUM },
    market_segment: { type: 'string', enum: ['spot', 'perp', 'defi', 'nft'] },
    description: { type: 'string' },
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
    'x-paper-mode-recommended': { type: 'boolean' },
    'x-execution-gate-required': { type: 'boolean' },
    'x-human-approval-required': { type: 'boolean' },
    'x-latency-tier': { type: 'string' },
    execution_modes: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Market Inefficiency Scanner API',
      version: '1.0.0',
      description: 'Broad market inefficiency detection — price discovery lag between venues, order book imbalances, temporary mispricings, and structural market microstructure gaps.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.006', signals: '$0.008', lookup: '$0.02' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/market-inefficiency-scanner' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'marketInefficiencyScannerDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/scan': {
        post: {
          operationId: 'marketInefficiencyScannerScan',
          summary: 'Scan for market inefficiency signals across crypto, NFT, and DeFi',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    market: { type: 'string', default: 'crypto', enum: MARKET_ENUM },
                    timeframe: { type: 'string', default: '5m', enum: TIMEFRAME_ENUM },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Market inefficiency signals with type, magnitude, and actionability',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      market: { type: 'string', enum: MARKET_ENUM }, timeframe: { type: 'string', enum: TIMEFRAME_ENUM },
                      inefficiency_signals: { type: 'array', items: inefficiencySignalItem },
                      scan_summary: {
                        type: 'object', properties: {
                          total_signals: { type: 'integer' }, immediate_count: { type: 'integer' },
                          highest_magnitude_signal: { type: 'string' }, dominant_inefficiency_type: { type: 'string' },
                          market_efficiency_score: { type: 'number' },
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
      '/signals': {
        post: {
          operationId: 'marketInefficiencyScannerSignals',
          summary: 'Ranked inefficiency signals with actionability rating',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    min_confidence: { type: 'number', default: 70, minimum: 0, maximum: 100, description: 'Minimum confidence percentage to surface' },
                    limit: { type: 'integer', default: 10, minimum: 1, maximum: 50, description: 'Maximum signals to return' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ranked inefficiency signals with exploitation difficulty and profit estimate',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      min_confidence: { type: 'number' }, limit: { type: 'integer' },
                      signals: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            rank: { type: 'integer' },
                            type: { type: 'string', enum: INEFFICIENCY_TYPE_ENUM },
                            symbol: { type: 'string' }, venue_a: { type: 'string' }, venue_b: { type: 'string' },
                            magnitude_pct: { type: 'number' }, confidence_pct: { type: 'number' },
                            estimated_duration_seconds: { type: 'number' },
                            actionability: { type: 'string', enum: ACTIONABILITY_ENUM },
                            exploitation_difficulty: { type: 'string', enum: DIFFICULTY_ENUM },
                            estimated_profit_pct: { type: 'number' }, min_capital_usd: { type: 'number' },
                          },
                        },
                      },
                      signal_distribution: {
                        type: 'object', properties: {
                          by_type: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, count: { type: 'integer' } } } },
                          by_actionability: { type: 'object', properties: { immediate: { type: 'integer' }, building: { type: 'integer' }, fading: { type: 'integer' } } },
                          total_signals: { type: 'integer' },
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
          operationId: 'marketInefficiencyScannerLookup',
          summary: 'ONE-CALL: full inefficiency analysis with root cause and exploitation strategy',
          'x-one-call': true,
          'x-execution-gate-required': true,
          'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['symbol'],
                  properties: {
                    symbol: { type: 'string', description: 'Token or asset symbol to analyze for inefficiencies' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full market inefficiency analysis with root cause and exploitation strategy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      primary_inefficiency: {
                        type: 'object', properties: {
                          type: { type: 'string', enum: INEFFICIENCY_TYPE_ENUM },
                          magnitude_pct: { type: 'number' }, confidence_pct: { type: 'number' },
                          detected_venues: { type: 'array', items: { type: 'string' } },
                          duration_so_far_seconds: { type: 'number' }, estimated_remaining_seconds: { type: 'number' },
                        },
                      },
                      root_cause: { type: 'string', enum: ROOT_CAUSE_ENUM },
                      root_cause_analysis: {
                        type: 'object', properties: {
                          primary_driver: { type: 'string' },
                          contributing_factors: { type: 'array', items: { type: 'string' } },
                          structural_or_temporary: { type: 'string', enum: STRUCTURAL_ENUM },
                          recurrence_likelihood: { type: 'string', enum: RECURRENCE_ENUM },
                        },
                      },
                      profit_window: {
                        type: 'object', properties: {
                          profit_window_seconds: { type: 'number' },
                          urgency: { type: 'string', enum: ACTIONABILITY_ENUM },
                          competition_level: { type: 'string', enum: COMPETITION_ENUM },
                          estimated_profit_pct: { type: 'number' },
                        },
                      },
                      exploitation_strategy: {
                        type: 'object', properties: {
                          strategy: { type: 'string' }, steps: { type: 'array', items: { type: 'string' } },
                          required_capital_usd: { type: 'number' }, recommended_venues: { type: 'array', items: { type: 'string' } },
                          execution_time_target_ms: { type: 'number' }, risk_level: { type: 'string', enum: RISK_LEVEL_ENUM },
                        },
                      },
                      risk_factors: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            factor: { type: 'string' }, severity: { type: 'string', enum: SEVERITY_ENUM }, probability_pct: { type: 'number' },
                          },
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
            '400': { description: 'Missing symbol' }, '500': { description: 'Internal error' },
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
