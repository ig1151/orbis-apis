import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const TX_TYPE_ENUM = ['transfer', 'swap', 'bridge', 'stake', 'unstake'];
const DIRECTION_ENUM = ['to_exchange', 'from_exchange', 'wallet_to_wallet', 'to_defi', 'from_defi'];
const IMPACT_ENUM = ['high', 'medium', 'low', 'negligible'];
const INTENT_ENUM = ['sell', 'stake', 'bridge', 'accumulate', 'unknown'];
const DESTINATION_TYPE_ENUM = ['exchange', 'defi_protocol', 'cold_storage', 'burn', 'unknown'];
const WALLET_TYPE_ENUM = ['exchange', 'defi_protocol', 'known_whale', 'smart_money', 'unknown'];
const FLOW_ENUM = ['selling_pressure', 'accumulation', 'neutral'];
const URGENCY_ENUM = ['critical', 'high', 'medium', 'low'];

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
      title: 'Whale Transaction API',
      version: '1.0.0',
      description: 'Real-time large on-chain transfer alerts for crypto whales. Track whale movements by token, chain, and threshold with exchange flow analysis and market impact estimation.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': false, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { feed: '$0.004', alerts: '$0.004', lookup: '$0.015' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/whale-transaction' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'whaleTransactionDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/feed': {
        post: {
          operationId: 'whaleTransactionFeed',
          summary: 'Real-time whale transactions above a USD threshold',
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { type: 'object', properties: {
              chain: { type: 'string', default: 'ethereum' },
              min_usd: { type: 'number', default: 500000, minimum: 10000 },
              limit: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            } } } },
          },
          responses: {
            '200': { description: 'Real-time whale transaction feed', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                transactions: { type: 'array', items: { type: 'object', properties: {
                  tx_hash: { type: 'string' }, token: { type: 'string' }, amount_usd: { type: 'number' },
                  tx_type: { type: 'string', enum: TX_TYPE_ENUM },
                  from_type: { type: 'string', enum: WALLET_TYPE_ENUM },
                  to_type: { type: 'string', enum: WALLET_TYPE_ENUM },
                  market_impact: { type: 'string', enum: IMPACT_ENUM },
                  minutes_ago: { type: 'number' },
                } } },
                feed_summary: { type: 'object', properties: {
                  total_transactions: { type: 'integer' }, total_volume_usd: { type: 'number' },
                  exchange_inflows_usd: { type: 'number' }, exchange_outflows_usd: { type: 'number' },
                  net_exchange_flow_usd: { type: 'number' }, dominant_token: { type: 'string' },
                } },
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
          operationId: 'whaleTransactionAlerts',
          summary: 'Whale movement alerts for a specific token',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: {
              token: { type: 'string', description: 'Token symbol to monitor for whale movements' },
              min_usd: { type: 'number', default: 100000, minimum: 1000 },
            } } } },
          },
          responses: {
            '200': { description: 'Whale alerts with market impact and direction', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                alerts: { type: 'array', items: { type: 'object', properties: {
                  tx_hash: { type: 'string' }, amount_usd: { type: 'number' },
                  tx_type: { type: 'string', enum: TX_TYPE_ENUM },
                  direction: { type: 'string', enum: DIRECTION_ENUM },
                  urgency: { type: 'string', enum: URGENCY_ENUM },
                  price_impact_pct: { type: 'number' }, hours_ago: { type: 'number' },
                } } },
                token_whale_summary: { type: 'object', properties: {
                  net_exchange_flow_usd: { type: 'number' }, signal_bias: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                  whale_count_active: { type: 'integer' }, largest_single_tx_usd: { type: 'number' },
                } },
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
          operationId: 'whaleTransactionLookup',
          summary: 'ONE-CALL: full whale transaction analysis with wallet context and market impact',
          'x-one-call': true, 'x-execution-gate-required': false, 'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: {
              tx_hash: { type: 'string', description: 'Transaction hash to analyze' },
              address: { type: 'string', description: 'Whale wallet address to analyze' },
            } } } },
          },
          responses: {
            '200': { description: 'Full whale transaction analysis with market impact', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                wallet_context: { type: 'object', properties: {
                  wallet_type: { type: 'string', enum: WALLET_TYPE_ENUM },
                  total_holdings_usd: { type: 'number' }, pct_of_holdings_moved: { type: 'number' },
                } },
                market_impact_analysis: { type: 'object', properties: {
                  immediate_impact: { type: 'string', enum: IMPACT_ENUM },
                  exchange_flow_implication: { type: 'string', enum: FLOW_ENUM },
                  estimated_price_impact_pct: { type: 'number' },
                } },
                destination_analysis: { type: 'object', properties: {
                  destination_type: { type: 'string', enum: DESTINATION_TYPE_ENUM },
                  likely_intent: { type: 'string', enum: INTENT_ENUM },
                  time_to_market_impact_hours: { type: 'number' },
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
            '400': { description: 'Missing tx_hash or address' }, '500': { description: 'Internal error' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
