import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const ACTION_ENUM = ['buy', 'sell'];
const URGENCY_ENUM = ['immediate', 'valid_30m', 'valid_1h', 'stale'];
const COPY_CONFIDENCE_ENUM = ['high', 'medium', 'low'];
const STRATEGY_ENUM = ['degen', 'conservative', 'arbitrageur', 'swing_trader', 'yield_farmer', 'sniper'];
const RISK_ENUM = ['low', 'medium', 'high'];

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
      title: 'Wallet Copy Trading API',
      version: '1.0.0',
      description: 'Copy trade signals from top-performing on-chain wallets. Returns recent trades, entry/exit timing, position sizing guidance, leaderboard rankings, and risk-adjusted copy plan.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': true,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { signals: '$0.004', leaderboard: '$0.004', lookup: '$0.015' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'near-real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/wallet-copy-trading' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'walletCopyTradingDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/signals': {
        post: {
          operationId: 'walletCopyTradingSignals',
          summary: 'Recent trades from a wallet to copy with timing and sizing',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: {
              address: { type: 'string', description: 'Wallet address to get copy signals from' },
              chain: { type: 'string', default: 'ethereum' },
              lookback_hours: { type: 'integer', default: 24, minimum: 1, maximum: 168 },
            } } } },
          },
          responses: {
            '200': { description: 'Copy trade signals with urgency and sizing', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                signals: { type: 'array', items: { type: 'object', properties: {
                  tx_hash: { type: 'string' }, action: { type: 'string', enum: ACTION_ENUM },
                  token: { type: 'string' }, amount_usd: { type: 'number' },
                  copy_urgency: { type: 'string', enum: URGENCY_ENUM },
                  copy_confidence: { type: 'string', enum: COPY_CONFIDENCE_ENUM },
                  suggested_copy_size_usd: { type: 'number' }, still_actionable: { type: 'boolean' },
                  price_moved_since_pct: { type: 'number' },
                } } },
                financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
              },
            } } } },
            '400': { description: 'Missing address' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/leaderboard': {
        post: {
          operationId: 'walletCopyTradingLeaderboard',
          summary: 'Top wallets ranked by copy-trade alpha and suitability',
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { type: 'object', properties: {
              chain: { type: 'string', default: 'ethereum' },
              strategy: { type: 'string', enum: STRATEGY_ENUM },
            } } } },
          },
          responses: {
            '200': { description: 'Copy trade leaderboard ranked by alpha', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                leaderboard: { type: 'array', items: { type: 'object', properties: {
                  rank: { type: 'integer' }, address: { type: 'string' },
                  copy_trade_alpha_30d_pct: { type: 'number' }, win_rate_pct: { type: 'number' },
                  suitability_score: { type: 'number' }, strategy: { type: 'string', enum: STRATEGY_ENUM },
                  lag_tolerance_minutes: { type: 'number' }, caution: { type: 'string' },
                } } },
                financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
              },
            } } } },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'walletCopyTradingLookup',
          summary: 'ONE-CALL: full copy trading plan with position sizing and risk limits',
          'x-one-call': true, 'x-execution-gate-required': true, 'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: {
              address: { type: 'string' },
              portfolio_size_usd: { type: 'number', description: 'Your portfolio size for sizing recommendations' },
            } } } },
          },
          responses: {
            '200': { description: 'Full copy trading plan with risk assessment', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                copy_plan: { type: 'object', properties: {
                  recommended_allocation_pct: { type: 'number' }, max_position_size_usd: { type: 'number' },
                  copy_ratio: { type: 'number' }, lag_tolerance_minutes: { type: 'number' },
                  stop_loss_per_trade_pct: { type: 'number' }, daily_loss_limit_usd: { type: 'number' },
                } },
                historical_copy_performance: { type: 'object', properties: {
                  simulated_30d_roi_pct: { type: 'number' }, simulated_win_rate_pct: { type: 'number' },
                  max_copy_drawdown_pct: { type: 'number' }, avg_lag_impact_pct: { type: 'number' },
                } },
                risk_assessment: { type: 'object', properties: {
                  overall_risk: { type: 'string', enum: ['low', 'medium', 'high', 'degen'] },
                  timing_dependency: { type: 'string', enum: ['low', 'medium', 'critical'] },
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
            '400': { description: 'Missing address' }, '500': { description: 'Internal error' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
