import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const CHAIN_ENUM = ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'solana'];
const LIQUIDITY_QUALITY_ENUM = ['deep', 'adequate', 'thin', 'illiquid'];
const TVL_TREND_ENUM = ['growing', 'stable', 'declining'];
const VERDICT_ENUM = ['recommended', 'acceptable', 'suboptimal', 'avoid'];

const chainLiquidityItem = {
  type: 'object', properties: {
    chain: { type: 'string', enum: CHAIN_ENUM },
    total_liquidity_usd: { type: 'number' }, primary_pool: { type: 'string' },
    slippage_1k_usd_pct: { type: 'number' }, slippage_10k_usd_pct: { type: 'number' },
    slippage_100k_usd_pct: { type: 'number' }, slippage_1m_usd_pct: { type: 'number' },
    max_trade_without_10pct_slippage_usd: { type: 'number' },
    liquidity_quality: { type: 'string', enum: LIQUIDITY_QUALITY_ENUM },
    tvl_trend_7d: { type: 'string', enum: TVL_TREND_ENUM },
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
    'x-paper-mode-recommended': { type: 'boolean' }, 'x-execution-gate-required': { type: 'boolean' },
    'x-human-approval-required': { type: 'boolean' }, 'x-latency-tier': { type: 'string' },
    execution_modes: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Cross-Chain Liquidity API',
      version: '1.0.0',
      description: 'Liquidity depth analysis for a token across Ethereum, Base, Arbitrum, Polygon, BSC, and Solana. Returns slippage estimates, optimal chain selection, and TVL trends.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': false, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { depth: '$0.004', compare: '$0.005', lookup: '$0.015' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'near-real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/cross-chain-liquidity' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'crossChainLiquidityDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/depth': {
        post: {
          operationId: 'crossChainLiquidityDepth',
          summary: 'Liquidity depth for an asset across all supported chains',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: {
              symbol: { type: 'string', description: 'Token symbol to analyze liquidity for' },
            } } } },
          },
          responses: {
            '200': { description: 'Liquidity depth by chain with slippage tiers', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                symbol: { type: 'string' },
                chains: { type: 'array', items: chainLiquidityItem },
                depth_summary: { type: 'object', properties: {
                  deepest_chain: { type: 'string' }, total_cross_chain_liquidity_usd: { type: 'number' },
                  best_for_large_trades: { type: 'string' }, best_for_small_trades: { type: 'string' },
                } },
                financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
              },
            } } } },
            '400': { description: 'Missing symbol' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/compare': {
        post: {
          operationId: 'crossChainLiquidityCompare',
          summary: 'Side-by-side chain liquidity comparison with slippage tiers',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: {
              symbol: { type: 'string' },
              trade_size_usd: { type: 'number', default: 10000, minimum: 100, description: 'Trade size to model slippage for' },
            } } } },
          },
          responses: {
            '200': { description: 'Side-by-side chain comparison for a specific trade size', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                symbol: { type: 'string' }, trade_size_usd: { type: 'number' },
                comparison: { type: 'array', items: { type: 'object', properties: {
                  rank: { type: 'integer' }, chain: { type: 'string', enum: CHAIN_ENUM },
                  slippage_at_trade_size_pct: { type: 'number' }, gas_cost_usd: { type: 'number' },
                  net_cost_pct: { type: 'number' }, liquidity_quality: { type: 'string', enum: LIQUIDITY_QUALITY_ENUM },
                  verdict: { type: 'string', enum: VERDICT_ENUM },
                } } },
                recommendation: { type: 'object', properties: {
                  best_chain: { type: 'string' }, reason: { type: 'string' },
                  expected_slippage_pct: { type: 'number' }, total_cost_pct: { type: 'number' },
                } },
                financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
              },
            } } } },
            '400': { description: 'Missing symbol' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'crossChainLiquidityLookup',
          summary: 'ONE-CALL: optimal chain for a trade size with execution recommendation',
          'x-one-call': true, 'x-execution-gate-required': false, 'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['symbol', 'trade_size_usd'], properties: {
              symbol: { type: 'string', description: 'Token to trade' },
              trade_size_usd: { type: 'number', description: 'Trade size in USD for routing analysis' },
            } } } },
          },
          responses: {
            '200': { description: 'Optimal chain routing with split strategy if beneficial', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                symbol: { type: 'string' }, trade_size_usd: { type: 'number' },
                optimal_chain: { type: 'string', enum: CHAIN_ENUM },
                optimal_route: { type: 'object', properties: {
                  chain: { type: 'string' }, dex: { type: 'string' },
                  slippage_pct: { type: 'number' }, gas_cost_usd: { type: 'number' },
                  total_cost_pct: { type: 'number' }, expected_output_usd: { type: 'number' },
                } },
                split_strategy: { type: 'object', properties: {
                  recommended: { type: 'boolean' }, reason: { type: 'string' },
                  savings_vs_single_chain_pct: { type: 'number' },
                  splits: { type: 'array', items: { type: 'object', properties: {
                    chain: { type: 'string' }, amount_usd: { type: 'number' },
                    slippage_pct: { type: 'number' }, gas_cost_usd: { type: 'number' },
                  } } },
                } },
                reasoning: { type: 'object', properties: {
                  why_signal_generated: { type: 'string' },
                  key_factors: { type: 'array', items: { type: 'string' } },
                  invalidators: { type: 'array', items: { type: 'string' } },
                } },
                latency_ms: { type: 'number' },
                financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
              },
            } } } },
            '400': { description: 'Missing symbol or trade_size_usd' }, '500': { description: 'Internal error' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
