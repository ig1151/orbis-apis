import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const AWAKENING_TYPE_ENUM = ['transfer_out', 'transfer_in', 'swap', 'nft_purchase', 'defi_interaction'];
const DESTINATION_TYPE_ENUM = ['exchange', 'defi_protocol', 'unknown_wallet', 'burn'];
const WATCH_LEVEL_ENUM = ['critical', 'high', 'medium', 'low'];
const IMPACT_ENUM = ['high', 'medium', 'low'];

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
      title: 'Dormant Wallet Awakening API',
      version: '1.0.0',
      description: 'Alert when long-dormant crypto wallets make their first on-chain movement after months or years. Correlate awakening events with market conditions, token holdings, and historical significance.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': false, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.005', alerts: '$0.004', lookup: '$0.015' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'near-real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/dormant-wallet-awakening' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'dormantWalletAwakeningDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/scan': {
        post: {
          operationId: 'dormantWalletAwakeningScan',
          summary: 'Scan for recently awakened dormant wallets',
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { type: 'object', properties: {
              chain: { type: 'string', default: 'ethereum' },
              min_dormancy_days: { type: 'integer', default: 180, minimum: 30 },
              min_balance_usd: { type: 'number', default: 10000, minimum: 0 },
            } } } },
          },
          responses: {
            '200': { description: 'Recently awakened dormant wallets', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                awakened_wallets: { type: 'array', items: { type: 'object', properties: {
                  address: { type: 'string' }, dormancy_days: { type: 'number' },
                  awakening_type: { type: 'string', enum: AWAKENING_TYPE_ENUM },
                  balance_usd: { type: 'number' }, significance_score: { type: 'number' },
                  primary_holdings: { type: 'array', items: { type: 'string' } },
                } } },
                financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
              },
            } } } },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/alerts': {
        post: {
          operationId: 'dormantWalletAwakeningAlerts',
          summary: 'High-significance dormant wallet awakening alerts',
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { type: 'object', properties: {
              min_balance_usd: { type: 'number', default: 100000, description: 'Minimum wallet balance in USD' },
              min_dormancy_days: { type: 'integer', default: 365, description: 'Minimum days dormant to alert' },
            } } } },
          },
          responses: {
            '200': { description: 'High-significance awakening alerts', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                alerts: { type: 'array', items: { type: 'object', properties: {
                  address: { type: 'string' }, chain: { type: 'string' },
                  dormancy_days: { type: 'number' }, balance_usd: { type: 'number' },
                  awakening_type: { type: 'string', enum: AWAKENING_TYPE_ENUM },
                  destination_type: { type: 'string', enum: DESTINATION_TYPE_ENUM },
                  market_impact_potential: { type: 'string', enum: IMPACT_ENUM },
                  amount_moved_usd: { type: 'number' },
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
          operationId: 'dormantWalletAwakeningLookup',
          summary: 'ONE-CALL: full dormant wallet profile with movement analysis',
          'x-one-call': true, 'x-execution-gate-required': false, 'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: {
              address: { type: 'string', description: 'Wallet address to analyze' },
            } } } },
          },
          responses: {
            '200': { description: 'Full dormant wallet awakening analysis', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                dormancy_profile: { type: 'object', properties: {
                  total_dormancy_days: { type: 'number' }, dormant_since: { type: 'string', format: 'date-time' },
                  historically_significant: { type: 'boolean' }, estimated_wallet_age_years: { type: 'number' },
                } },
                significance_analysis: { type: 'object', properties: {
                  significance_score: { type: 'number' },
                  watch_level: { type: 'string', enum: WATCH_LEVEL_ENUM },
                  reasons: { type: 'array', items: { type: 'string' } },
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
