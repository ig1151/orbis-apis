import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const NETWORK_ENUM = ['ethereum', 'solana', 'cosmos', 'polkadot', 'avalanche'];
const STATUS_ENUM = ['active', 'inactive', 'jailed', 'tombstoned'];
const SLASHING_RISK_ENUM = ['low', 'medium', 'high', 'critical'];
const SLASH_TYPE_ENUM = ['double_sign', 'downtime', 'equivocation'];
const RECOMMENDATION_ENUM = ['safe', 'monitor', 'avoid'];
const DELEGATION_ENUM = ['strong_buy', 'buy', 'hold', 'reduce', 'avoid'];

const validatorItem = {
  type: 'object', properties: {
    validator_address: { type: 'string' }, name: { type: 'string' },
    status: { type: 'string', enum: STATUS_ENUM },
    uptime_30d_pct: { type: 'number' }, uptime_90d_pct: { type: 'number' },
    commission_pct: { type: 'number' }, effective_apr_pct: { type: 'number' },
    total_staked_usd: { type: 'number' }, delegator_count: { type: 'integer' },
    slashing_count_all_time: { type: 'integer' }, self_stake_pct: { type: 'number' },
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
      title: 'Validator Activity API',
      version: '1.0.0',
      description: 'Track validator performance, uptime, commission, slashing history, and risk scores across Ethereum, Solana, Cosmos, Polkadot, and Avalanche. Supports staking decisions and delegation optimization.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': false, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { performance: '$0.004', slashing: '$0.005', lookup: '$0.015' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'near-real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/validator-activity' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'validatorActivityDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/performance': {
        post: {
          operationId: 'validatorActivityPerformance',
          summary: 'Validator performance metrics, uptime, and APR',
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { type: 'object', properties: {
              network: { type: 'string', default: 'ethereum', enum: NETWORK_ENUM },
              limit: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            } } } },
          },
          responses: {
            '200': { description: 'Validator performance rankings', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                validators: { type: 'array', items: validatorItem },
                network_summary: { type: 'object', properties: {
                  total_active_validators: { type: 'integer' }, avg_uptime_pct: { type: 'number' },
                  avg_commission_pct: { type: 'number' }, avg_effective_apr_pct: { type: 'number' },
                } },
                financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
              },
            } } } },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/slashing': {
        post: {
          operationId: 'validatorActivitySlashing',
          summary: 'Slashing events, risk scores, and jailed validators',
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { type: 'object', properties: {
              network: { type: 'string', default: 'ethereum', enum: NETWORK_ENUM },
              include_jailed: { type: 'boolean', default: true },
            } } } },
          },
          responses: {
            '200': { description: 'Slashing events and validator risk scores', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                slashing_events: { type: 'array', items: { type: 'object', properties: {
                  validator_address: { type: 'string' }, validator_name: { type: 'string' },
                  slash_type: { type: 'string', enum: SLASH_TYPE_ENUM },
                  amount_slashed_usd: { type: 'number' }, status_after: { type: 'string', enum: STATUS_ENUM },
                } } },
                risk_scores: { type: 'array', items: { type: 'object', properties: {
                  validator_address: { type: 'string' }, name: { type: 'string' },
                  slashing_risk: { type: 'string', enum: SLASHING_RISK_ENUM },
                  recommendation: { type: 'string', enum: RECOMMENDATION_ENUM },
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
          operationId: 'validatorActivityLookup',
          summary: 'ONE-CALL: full validator profile with risk rating and delegation recommendation',
          'x-one-call': true, 'x-execution-gate-required': false, 'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['validator_address'], properties: {
              validator_address: { type: 'string', description: 'Validator address or identity' },
              network: { type: 'string', default: 'ethereum', enum: NETWORK_ENUM },
            } } } },
          },
          responses: {
            '200': { description: 'Full validator profile with delegation recommendation', content: { 'application/json': { schema: {
              type: 'object', properties: {
                ...traceFields,
                risk_assessment: { type: 'object', properties: {
                  overall_risk: { type: 'string', enum: SLASHING_RISK_ENUM },
                  slashing_risk: { type: 'string', enum: SLASHING_RISK_ENUM },
                  uptime_risk: { type: 'string', enum: SLASHING_RISK_ENUM },
                  risk_factors: { type: 'array', items: { type: 'string' } },
                } },
                delegation_recommendation: { type: 'object', properties: {
                  recommendation: { type: 'string', enum: DELEGATION_ENUM },
                  rationale: { type: 'string' }, suggested_max_allocation_pct: { type: 'number' },
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
            '400': { description: 'Missing validator_address' }, '500': { description: 'Internal error' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
