import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const STRATEGY_ENUM = ['degen', 'conservative', 'arbitrageur', 'swing_trader', 'yield_farmer', 'sniper'];
const WALLET_TYPE_ENUM = ['whale', 'smart_money', 'bot', 'retail', 'institutional'];
const EXPERIENCE_ENUM = ['novice', 'intermediate', 'expert', 'elite'];
const SUITABILITY_ENUM = ['excellent', 'good', 'fair', 'poor'];
const MARKET_CAP_ENUM = ['micro', 'small', 'mid', 'large'];
const CONCENTRATION_ENUM = ['concentrated', 'diversified'];
const RISK_ENUM = ['low', 'medium', 'high', 'degen'];

const walletItem = {
  type: 'object', properties: {
    address: { type: 'string' }, rank: { type: 'integer' },
    roi_30d_pct: { type: 'number' }, roi_90d_pct: { type: 'number' },
    win_rate_pct: { type: 'number' }, total_trades_30d: { type: 'integer' },
    avg_hold_hours: { type: 'number' }, pnl_30d_usd: { type: 'number' },
    max_drawdown_pct: { type: 'number' },
    strategy: { type: 'string', enum: STRATEGY_ENUM },
    wallet_type: { type: 'string', enum: WALLET_TYPE_ENUM },
    top_token: { type: 'string' }, last_active: { type: 'string', format: 'date-time' },
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
      title: 'Smart Wallet Discovery API',
      version: '1.0.0',
      description: 'Discover high-performing on-chain wallets by ROI, win rate, strategy, and trade history. Identify smart money, arbitrageurs, snipers, and consistent alpha generators.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': false, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.005', filter: '$0.005', lookup: '$0.015' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'near-real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/smart-wallet-discovery' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'smartWalletDiscoveryDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/scan': {
        post: {
          operationId: 'smartWalletDiscoveryScan',
          summary: 'Scan for top-performing wallets by ROI and win rate',
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { type: 'object', properties: {
              chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc'] },
              limit: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
              min_roi_30d_pct: { type: 'number', default: 20, description: 'Minimum 30-day ROI percentage' },
            } } } },
          },
          responses: {
            '200': { description: 'Top-performing wallets ranked by alpha', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                wallets: { type: 'array', items: walletItem },
                scan_summary: { type: 'object', properties: { total_wallets_analyzed: { type: 'integer' }, qualifying_count: { type: 'integer' }, avg_roi_pct: { type: 'number' }, top_strategy: { type: 'string' } } },
                financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
              },
            } } } },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/filter': {
        post: {
          operationId: 'smartWalletDiscoveryFilter',
          summary: 'Filter smart wallets by strategy, ROI, drawdown, and hold time',
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { type: 'object', properties: {
              chain: { type: 'string', default: 'ethereum' },
              strategy: { type: 'string', enum: STRATEGY_ENUM },
              min_win_rate_pct: { type: 'number', default: 60 },
              max_drawdown_pct: { type: 'number', default: 30 },
              min_roi_30d_pct: { type: 'number', default: 0 },
            } } } },
          },
          responses: {
            '200': { description: 'Filtered wallets with copy-trade suitability', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                wallets: { type: 'array', items: { type: 'object', properties: {
                  address: { type: 'string' }, roi_30d_pct: { type: 'number' }, win_rate_pct: { type: 'number' },
                  max_drawdown_pct: { type: 'number' }, strategy: { type: 'string', enum: STRATEGY_ENUM },
                  wallet_type: { type: 'string', enum: WALLET_TYPE_ENUM },
                  consistency_score: { type: 'number' }, copy_trade_suitability: { type: 'string', enum: SUITABILITY_ENUM },
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
          operationId: 'smartWalletDiscoveryLookup',
          summary: 'ONE-CALL: full smart wallet profile with strategy, top trades, and risk metrics',
          'x-one-call': true, 'x-execution-gate-required': false, 'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: {
              address: { type: 'string', description: 'Wallet address to profile' },
            } } } },
          },
          responses: {
            '200': { description: 'Full smart wallet intelligence profile', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                address: { type: 'string' },
                wallet_classification: { type: 'object', properties: {
                  wallet_type: { type: 'string', enum: WALLET_TYPE_ENUM },
                  strategy: { type: 'string', enum: STRATEGY_ENUM },
                  experience_level: { type: 'string', enum: EXPERIENCE_ENUM },
                  classification_confidence_pct: { type: 'number' },
                } },
                performance_metrics: { type: 'object', properties: {
                  roi_7d_pct: { type: 'number' }, roi_30d_pct: { type: 'number' }, roi_90d_pct: { type: 'number' },
                  win_rate_pct: { type: 'number' }, max_drawdown_pct: { type: 'number' }, sharpe_ratio: { type: 'number' },
                  total_trades: { type: 'integer' }, pnl_30d_usd: { type: 'number' },
                } },
                token_preferences: { type: 'object', properties: {
                  most_traded_tokens: { type: 'array', items: { type: 'string' } },
                  preferred_market_cap: { type: 'string', enum: MARKET_CAP_ENUM },
                  sector_focus: { type: 'array', items: { type: 'string' } },
                } },
                copy_trade_assessment: { type: 'object', properties: {
                  suitability: { type: 'string', enum: SUITABILITY_ENUM },
                  recommended_size_multiplier: { type: 'number' },
                  lag_tolerance_minutes: { type: 'number' },
                  risk_of_following: { type: 'string', enum: ['low', 'medium', 'high'] },
                  cautions: { type: 'array', items: { type: 'string' } },
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
