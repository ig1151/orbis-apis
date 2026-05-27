import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const chainEnum = { type: 'string', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'solana'] };
const whaleTierEnum = { type: 'string', enum: ['mega_whale', 'whale', 'large_holder'] };
const signalStrengthEnum = { type: 'string', enum: ['strong', 'moderate', 'weak'] };

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
    execution_modes: { type: 'array', items: { type: 'string' } },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Whale Entry Signal API',
      version: '1.0.0',
      description: 'Detect whale accumulation entry signals for specific tokens, scan the market for active whale entry patterns, and get full whale entry intelligence with confidence scoring for trading agents.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { signals: '$0.004', scan: '$0.005', lookup: '$0.015' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/whale-entry-signal' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'whaleEntrySignalDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/signals': {
        post: {
          operationId: 'whaleEntrySignalGet',
          summary: 'Whale accumulation entry signals for a specific token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['token'],
                  properties: {
                    token: { type: 'string', description: 'Token symbol or address (e.g. ETH, BTC, PEPE)' },
                    chain: { ...chainEnum, default: 'ethereum' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Whale entry signals with accumulation pattern analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' }, chain: { type: 'string' },
                      entry_signals: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            signal_type: { type: 'string', enum: ['accumulation_zone', 'dip_buy', 'stealth_accumulation', 'ot_wallet_entry', 'exchange_withdrawal', 'large_otc'] },
                            detected_at: { type: 'string', format: 'date-time' },
                            whale_tier: whaleTierEnum,
                            estimated_usd: { type: 'number' }, entry_price: { type: 'number' },
                            signal_strength: signalStrengthEnum,
                            on_chain_evidence: { type: 'string' },
                            follow_through_probability_pct: { type: 'number' },
                          },
                        },
                      },
                      accumulation_pattern: {
                        type: 'object', properties: {
                          pattern_active: { type: 'boolean' },
                          pattern_type: { type: 'string', enum: ['steady_accumulation', 'aggressive_buy', 'dip_hunting', 'range_loading', 'none'] },
                          duration_days: { type: 'number' }, estimated_total_usd: { type: 'number' },
                          price_impact: { type: 'string', enum: ['suppressed', 'neutral', 'pushed_up'] },
                        },
                      },
                      current_signal: {
                        type: 'object', properties: {
                          overall_signal: { type: 'string', enum: ['strong_entry', 'entry', 'watch', 'no_signal'] },
                          confidence_pct: { type: 'number' }, key_evidence: { type: 'string' },
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
            '400': { description: 'Missing token' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/scan': {
        post: {
          operationId: 'whaleEntrySignalScan',
          summary: 'Scan the market for active whale entry patterns',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    chain: { ...chainEnum, default: 'ethereum' },
                    min_confidence: { type: 'number', default: 70, minimum: 0, maximum: 100 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Market-wide whale entry patterns with aggregate intel',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      chain: { type: 'string' }, min_confidence: { type: 'number' },
                      whale_entry_patterns: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            token: { type: 'string' }, token_address: { type: 'string' }, chain: { type: 'string' },
                            pattern_type: { type: 'string', enum: ['steady_accumulation', 'aggressive_buy', 'dip_hunting', 'range_loading'] },
                            confidence_pct: { type: 'number' }, estimated_usd_accumulated: { type: 'number' },
                            accumulation_start: { type: 'string', format: 'date-time' },
                            whale_count: { type: 'integer' },
                            price_action: { type: 'string', enum: ['rising', 'falling', 'sideways'] },
                            entry_window_open: { type: 'boolean' },
                            signal: { type: 'string', enum: ['bullish', 'neutral'] },
                          },
                        },
                      },
                      market_intel: {
                        type: 'object', properties: {
                          total_patterns_found: { type: 'integer' },
                          highest_confidence_token: { type: 'string' },
                          aggregate_usd_accumulating: { type: 'number' },
                          sector_breakdown: { type: 'array', items: { type: 'object', properties: { sector: { type: 'string' }, count: { type: 'integer' } } } },
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
          operationId: 'whaleEntrySignalLookup',
          summary: 'ONE-CALL: whale entry intelligence + confidence + recommended action',
          'x-one-call': true,
          'x-execution-gate-required': true,
          'x-human-approval-required': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['token'],
                  properties: {
                    token: { type: 'string', description: 'Token symbol or address (e.g. ETH, BTC, PEPE)' },
                    chain: { ...chainEnum, default: 'ethereum' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full whale entry intelligence with on-chain evidence and recommended action',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' }, chain: { type: 'string' },
                      whale_entry_summary: {
                        type: 'object', properties: {
                          entry_signal_active: { type: 'boolean' },
                          signal_type: { type: 'string', enum: ['accumulation_zone', 'dip_buy', 'stealth_accumulation', 'ot_wallet_entry', 'none'] },
                          whale_count_accumulating: { type: 'integer' },
                          total_usd_accumulated_24h: { type: 'number' },
                          entry_quality: { type: 'string', enum: ['A+', 'A', 'B', 'C', 'none'] },
                        },
                      },
                      on_chain_evidence: {
                        type: 'object', properties: {
                          large_transactions_24h: { type: 'integer' },
                          net_exchange_flow_usd: { type: 'number' },
                          exchange_withdrawals_usd: { type: 'number' }, exchange_deposits_usd: { type: 'number' },
                          wallet_concentration_change: { type: 'string', enum: ['increasing', 'decreasing', 'flat'] },
                          top_buyer_type: { type: 'string', enum: ['institutional', 'whale', 'smart_money', 'unknown'] },
                        },
                      },
                      price_context: {
                        type: 'object', properties: {
                          current_price: { type: 'number' },
                          distance_from_52w_low_pct: { type: 'number' }, distance_from_ath_pct: { type: 'number' },
                          recent_drawdown_pct: { type: 'number' },
                          accumulation_range: { type: 'object', properties: { low: { type: 'number' }, high: { type: 'number' } } },
                        },
                      },
                      risk_factors: {
                        type: 'object', properties: {
                          unlock_event_approaching: { type: 'boolean' }, large_holder_count: { type: 'integer' },
                          concentration_risk: { type: 'string', enum: ['high', 'medium', 'low'] },
                          liquidity_depth_usd: { type: 'number' },
                        },
                      },
                      recommended_action: {
                        type: 'object', properties: {
                          action: { type: 'string', enum: ['follow_whales', 'watch', 'wait', 'avoid'] },
                          entry_zone: { type: 'string' }, stop_suggestion: { type: 'string' },
                          confidence_pct: { type: 'number' }, key_insight: { type: 'string' },
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
            '400': { description: 'Missing token' }, '500': { description: 'Internal error' },
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
