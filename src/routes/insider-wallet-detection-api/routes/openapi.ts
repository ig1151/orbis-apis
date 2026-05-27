import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const PATTERN_TYPE_ENUM = ['pre_announcement_buy', 'coordinated_accumulation', 'early_exit', 'recurring_alpha'];
const RISK_LEVEL_ENUM = ['confirmed', 'probable', 'possible'];
const URGENCY_ENUM = ['immediate', 'high', 'medium', 'monitor'];
const EVENT_TYPE_ENUM = ['listing', 'partnership', 'upgrade', 'airdrop', 'other'];

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
      title: 'Insider Wallet Detection API',
      version: '1.0.0',
      description: 'Detect wallets that consistently buy tokens before major announcements, listings, or price events. Identify coordinated accumulation, recurring alpha, and early-exit patterns.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': false, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.006', alerts: '$0.005', lookup: '$0.018' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'near-real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/insider-wallet-detection' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'insiderWalletDetectionDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/scan': {
        post: {
          operationId: 'insiderWalletDetectionScan',
          summary: 'Scan for wallets with insider-pattern buying behavior',
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { type: 'object', properties: {
              chain: { type: 'string', default: 'ethereum' },
              lookback_days: { type: 'integer', default: 30, minimum: 7, maximum: 90 },
            } } } },
          },
          responses: {
            '200': { description: 'Insider-pattern wallets with confidence scores', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                insider_wallets: { type: 'array', items: { type: 'object', properties: {
                  address: { type: 'string' }, pattern_type: { type: 'string', enum: PATTERN_TYPE_ENUM },
                  pattern_count_in_period: { type: 'integer' }, avg_days_before_event: { type: 'number' },
                  avg_roi_pct: { type: 'number' }, tokens_involved: { type: 'array', items: { type: 'string' } },
                  confidence_pct: { type: 'number' }, risk_level: { type: 'string', enum: RISK_LEVEL_ENUM },
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
          operationId: 'insiderWalletDetectionAlerts',
          summary: 'Live alerts when insider-pattern wallets accumulate a token',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: {
              token: { type: 'string', description: 'Token symbol to monitor for insider accumulation' },
              chain: { type: 'string', default: 'ethereum' },
            } } } },
          },
          responses: {
            '200': { description: 'Live insider accumulation alerts', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                alerts: { type: 'array', items: { type: 'object', properties: {
                  wallet_address: { type: 'string' }, pattern_type: { type: 'string', enum: PATTERN_TYPE_ENUM },
                  amount_usd: { type: 'number' }, wallet_historical_accuracy_pct: { type: 'number' },
                  avg_gain_after_pattern_pct: { type: 'number' }, urgency: { type: 'string', enum: URGENCY_ENUM },
                } } },
                financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
              },
            } } } },
            '400': { description: 'Missing token' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'insiderWalletDetectionLookup',
          summary: 'ONE-CALL: full insider analysis for a wallet or token',
          'x-one-call': true, 'x-execution-gate-required': false, 'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: {
              address: { type: 'string', description: 'Wallet address to analyze for insider patterns' },
              token: { type: 'string', description: 'Token to analyze for insider accumulation' },
            } } } },
          },
          responses: {
            '200': { description: 'Full insider analysis with statistical significance', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                insider_profile: { type: 'object', properties: {
                  is_insider_wallet: { type: 'boolean' }, insider_confidence_pct: { type: 'number' },
                  primary_pattern: { type: 'string', enum: PATTERN_TYPE_ENUM },
                  pattern_count: { type: 'integer' },
                } },
                statistical_analysis: { type: 'object', properties: {
                  avg_roi_pct: { type: 'number' }, hit_rate_pct: { type: 'number' },
                  false_positive_rate_pct: { type: 'number' }, p_value: { type: 'number' },
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
            '400': { description: 'Missing address or token' }, '500': { description: 'Internal error' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
