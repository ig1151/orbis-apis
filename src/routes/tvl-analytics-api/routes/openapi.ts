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
      title: 'TVL Analytics API', version: '1.0.0',
      description: 'Track Total Value Locked across DeFi protocols and chains. Analyze TVL growth, market share, chain dominance, and protocol health for investment research and risk assessment.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { protocol: '$0.003', chains: '$0.003', lookup: '$0.008' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. TVL data should be cross-checked with on-chain sources.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/tvl-analytics' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'tvlAnalyticsDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, capabilities',
          security: [],
          responses: { '200': { description: 'Discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/protocol': {
        post: {
          operationId: 'tvlProtocol',
          summary: 'TVL snapshot for a specific protocol with trend and market position',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['protocol'], properties: { protocol: { type: 'string', description: 'Protocol name (e.g. Aave, Uniswap, Lido, Curve)' } } } } },
          },
          responses: {
            '200': {
              description: 'Protocol TVL with trend and market position',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, protocol: { type: 'string' }, tvl_usd: { type: 'number' },
                      tvl_by_chain: { type: 'array', items: { type: 'object', properties: { chain: { type: 'string' }, tvl_usd: { type: 'number' }, pct_of_total: { type: 'number' } } } },
                      tvl_trend: { type: 'object', properties: { '24h_change_pct': { type: 'number' }, '7d_change_pct': { type: 'number' }, '30d_change_pct': { type: 'number' }, direction: { type: 'string', enum: ['growing', 'shrinking', 'stable'] }, all_time_high_usd: { type: 'number' }, ath_drawdown_pct: { type: 'number' } } },
                      market_position: { type: 'object', properties: { global_rank: { type: 'integer' }, category: { type: 'string' }, market_share_pct: { type: 'number' }, competitors: { type: 'array', items: { type: 'string' } } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing protocol' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/chains': {
        post: {
          operationId: 'tvlChains',
          summary: 'TVL breakdown by blockchain — market share, flows, and rotation signal',
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { type: 'object', properties: { category: { type: 'string', description: 'Filter by DeFi category (e.g. lending, dex, liquid-staking)' } } } } },
          },
          responses: {
            '200': {
              description: 'TVL breakdown by chain with flow summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, category: { type: 'string' }, total_defi_tvl_usd: { type: 'number' },
                      chains: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            chain: { type: 'string' }, tvl_usd: { type: 'number' }, market_share_pct: { type: 'number' },
                            '7d_change_pct': { type: 'number' }, '30d_change_pct': { type: 'number' },
                            trend: { type: 'string', enum: ['growing', 'shrinking', 'stable'] },
                            dominant_protocol: { type: 'string' }, protocol_count: { type: 'integer' },
                          },
                        },
                      },
                      flow_summary: { type: 'object', properties: { top_inflow_chain: { type: 'string' }, top_outflow_chain: { type: 'string' }, rotation_signal: { type: 'string', enum: ['moving_to_l2', 'moving_to_ethereum', 'mixed'] }, narrative: { type: 'string' } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
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
          operationId: 'tvlLookup',
          summary: 'ONE-CALL: TVL + growth trend + health score + investment signal for a protocol',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['protocol'], properties: { protocol: { type: 'string' } } } } },
          },
          responses: {
            '200': {
              description: 'Full TVL intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, protocol: { type: 'string' },
                      tvl_snapshot: { type: 'object', properties: { tvl_usd: { type: 'number' }, global_rank: { type: 'integer' }, market_share_pct: { type: 'number' }, category: { type: 'string' } } },
                      growth_trend: { type: 'object', properties: { direction: { type: 'string', enum: ['growing', 'shrinking', 'stable'] }, '7d_change_pct': { type: 'number' }, '30d_change_pct': { type: 'number' }, '90d_change_pct': { type: 'number' }, growth_quality: { type: 'string', enum: ['organic', 'incentivized', 'declining', 'recovering'] } } },
                      health_score: { type: 'object', properties: { score: { type: 'number', minimum: 0, maximum: 100 }, score_label: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'] }, factors: { type: 'object', properties: { tvl_stability: { type: 'number' }, growth_consistency: { type: 'number' }, chain_diversity: { type: 'number' }, market_position: { type: 'number' } } } } },
                      investment_signal: { type: 'object', properties: { signal: { type: 'string', enum: ['strong_buy', 'buy', 'neutral', 'sell', 'avoid'] }, rationale: { type: 'string' }, key_risk: { type: 'string' }, key_opportunity: { type: 'string' } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing protocol' }, '500': { description: 'Internal error' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
