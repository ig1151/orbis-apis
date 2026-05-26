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

const borrowRateItem = {
  type: 'object', properties: {
    protocol: { type: 'string' },
    variable_apr: { type: 'number' },
    stable_apr: { type: 'number' },
    rate_mode_available: { type: 'array', items: { type: 'string', enum: ['variable', 'stable'] } },
    utilization_pct: { type: 'number', minimum: 0, maximum: 100 },
    total_borrowed_usd: { type: 'number' },
    borrow_cap_usd: { type: 'number' },
    rate_trend: { type: 'string', enum: ['rising', 'falling', 'stable'] },
    optimal_utilization_pct: { type: 'number' },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Borrowing Rates API', version: '1.0.0',
      description: 'Compare DeFi borrowing costs across Aave, Compound, Spark, and other protocols. Find the cheapest borrow for any asset with liquidation risk context and optimization strategies.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { rates: '$0.003', optimize: '$0.004', lookup: '$0.008' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify liquidation thresholds before borrowing.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/borrowing-rates' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'borrowingRatesDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, capabilities',
          security: [],
          responses: { '200': { description: 'Discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/rates': {
        post: {
          operationId: 'borrowingRatesGet',
          summary: 'Current borrowing rates for an asset across DeFi protocols',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['asset'], properties: { asset: { type: 'string', description: 'Asset to borrow (e.g. USDC, DAI, ETH)' }, chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism'] } } } } },
          },
          responses: {
            '200': {
              description: 'Borrowing rates across protocols',
              content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, asset: { type: 'string' }, chain: { type: 'string' }, borrow_rates: { type: 'array', items: borrowRateItem }, cheapest_variable: { type: 'object', properties: { protocol: { type: 'string' }, apr: { type: 'number' } } }, cheapest_stable: { type: 'object', properties: { protocol: { type: 'string' }, apr: { type: 'number' } } }, market_avg_variable_apr: { type: 'number' }, financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy } } } },
            },
            '400': { description: 'Missing asset' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/optimize': {
        post: {
          operationId: 'borrowingRatesOptimize',
          summary: 'Find cheapest borrow strategy with collateral and liquidation risk analysis',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['asset'], properties: {
                    asset: { type: 'string', description: 'Asset to borrow' },
                    collateral: { type: 'string', description: 'Collateral asset (e.g. ETH, wBTC)', default: 'ETH' },
                    borrow_amount_usd: { type: 'number', default: 10000 },
                    chain: { type: 'string', default: 'ethereum' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Optimized borrow strategies with risk assessment',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, asset: { type: 'string' }, collateral: { type: 'string' },
                      borrow_amount_usd: { type: 'number' }, chain: { type: 'string' },
                      strategies: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            protocol: { type: 'string' }, rate_mode: { type: 'string', enum: ['variable', 'stable'] },
                            apr: { type: 'number' }, annual_cost_usd: { type: 'number' },
                            ltv_pct: { type: 'number' }, liquidation_threshold_pct: { type: 'number' },
                            safe_ltv_pct: { type: 'number' }, health_factor_at_safe_ltv: { type: 'number' },
                            min_collateral_usd: { type: 'number' }, liquidation_risk: { type: 'string', enum: ['low', 'medium', 'high'] },
                          },
                        },
                      },
                      best_strategy: { type: 'object', properties: { protocol: { type: 'string' }, rate_mode: { type: 'string' }, apr: { type: 'number' }, annual_cost_usd: { type: 'number' } } },
                      risk_summary: { type: 'object', properties: { main_risk: { type: 'string' }, liquidation_note: { type: 'string' } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing asset' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'borrowingRatesLookup',
          summary: 'ONE-CALL: cheapest borrow + collateral options + liquidation risk + strategy for an asset',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['asset'], properties: { asset: { type: 'string' }, collateral: { type: 'string', default: 'ETH' }, chain: { type: 'string', default: 'ethereum' } } } } },
          },
          responses: {
            '200': {
              description: 'Full borrowing intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, asset: { type: 'string' }, collateral: { type: 'string' }, chain: { type: 'string' },
                      rates_snapshot: { type: 'array', items: { type: 'object', properties: { protocol: { type: 'string' }, variable_apr: { type: 'number' }, stable_apr: { type: 'number' }, utilization_pct: { type: 'number' }, rate_trend: { type: 'string', enum: ['rising', 'falling', 'stable'] } } } },
                      collateral_options: { type: 'array', items: { type: 'object', properties: { collateral_asset: { type: 'string' }, ltv_pct: { type: 'number' }, liquidation_threshold_pct: { type: 'number' }, liquidation_bonus_pct: { type: 'number' }, quality: { type: 'string', enum: ['blue_chip', 'mid_cap', 'volatile'] } } } },
                      rate_trend: { type: 'object', properties: { direction: { type: 'string', enum: ['rising', 'falling', 'stable'] }, '30d_change_bps': { type: 'number' }, driver: { type: 'string' } } },
                      liquidation_risk_assessment: { type: 'object', properties: { risk_level: { type: 'string', enum: ['low', 'medium', 'high'] }, key_factors: { type: 'array', items: { type: 'string' } }, recommended_max_ltv_pct: { type: 'number' } } },
                      strategy: { type: 'object', properties: { action: { type: 'string', enum: ['borrow_now', 'wait_for_lower_rates', 'use_stable', 'avoid'] }, best_protocol: { type: 'string' }, best_rate_mode: { type: 'string', enum: ['variable', 'stable'] }, apr: { type: 'number' }, rationale: { type: 'string' } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing asset' }, '500': { description: 'Internal error' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
