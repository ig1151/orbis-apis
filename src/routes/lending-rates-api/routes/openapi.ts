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

const rateItem = {
  type: 'object', properties: {
    protocol: { type: 'string' },
    apy: { type: 'number' },
    apy_7d_avg: { type: 'number' },
    apy_30d_avg: { type: 'number' },
    utilization_pct: { type: 'number', minimum: 0, maximum: 100 },
    total_supplied_usd: { type: 'number' },
    supply_cap_usd: { type: 'number' },
    rate_trend: { type: 'string', enum: ['rising', 'falling', 'stable'] },
    protocol_tvl_usd: { type: 'number' },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Lending Rates API', version: '1.0.0',
      description: 'Compare DeFi lending rates across Aave, Compound, Spark, Morpho, and other protocols. Find the best yield for any asset with trend analysis and protocol risk context.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { rates: '$0.003', compare: '$0.003', lookup: '$0.008' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify rates on-chain before depositing.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/lending-rates' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'lendingRatesDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, capabilities',
          security: [],
          responses: { '200': { description: 'Discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/rates': {
        post: {
          operationId: 'lendingRatesGet',
          summary: 'Current lending rates for an asset across DeFi protocols',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['asset'], properties: { asset: { type: 'string', description: 'Asset symbol (e.g. USDC, ETH, WBTC)' }, chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'optimism'] } } } } },
          },
          responses: {
            '200': {
              description: 'Lending rates across protocols',
              content: { 'application/json': { schema: { type: 'object', properties: { ...traceFields, asset: { type: 'string' }, chain: { type: 'string' }, rates: { type: 'array', items: rateItem }, best_rate: { type: 'object', properties: { protocol: { type: 'string' }, apy: { type: 'number' } } }, market_avg_apy: { type: 'number' }, rate_spread_pct: { type: 'number' }, financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' }, confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy } } } },
            },
            '400': { description: 'Missing asset' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/compare': {
        post: {
          operationId: 'lendingRatesCompare',
          summary: 'Side-by-side protocol comparison with risk-adjusted yield',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['asset'], properties: { asset: { type: 'string' }, chain: { type: 'string', default: 'ethereum' }, protocols: { type: 'array', items: { type: 'string' }, description: 'Protocol names to compare (defaults to top 5)' } } } } },
          },
          responses: {
            '200': {
              description: 'Protocol comparison with risk context',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, asset: { type: 'string' }, chain: { type: 'string' },
                      comparison: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            protocol: { type: 'string' }, apy: { type: 'number' }, risk_score: { type: 'number' },
                            risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
                            risk_adjusted_yield: { type: 'number' }, audit_status: { type: 'string', enum: ['audited', 'partially_audited', 'unaudited'] },
                            insurance_available: { type: 'boolean' }, min_deposit_usd: { type: 'number' },
                            withdrawal_delay_hours: { type: 'number' }, notable_risks: { type: 'array', items: { type: 'string' } },
                          },
                        },
                      },
                      best_yield: { type: 'object', properties: { protocol: { type: 'string' }, apy: { type: 'number' } } },
                      best_risk_adjusted: { type: 'object', properties: { protocol: { type: 'string' }, risk_adjusted_yield: { type: 'number' } } },
                      recommendation: { type: 'string' },
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
          operationId: 'lendingRatesLookup',
          summary: 'ONE-CALL: best rate + trend + protocol risk + recommendation for an asset',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['asset'], properties: { asset: { type: 'string' }, chain: { type: 'string', default: 'ethereum' } } } } },
          },
          responses: {
            '200': {
              description: 'Full lending intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, asset: { type: 'string' }, chain: { type: 'string' },
                      rates_snapshot: { type: 'array', items: { type: 'object', properties: { protocol: { type: 'string' }, apy: { type: 'number' }, risk_level: { type: 'string', enum: ['low', 'medium', 'high'] }, utilization_pct: { type: 'number' }, rate_trend: { type: 'string', enum: ['rising', 'falling', 'stable'] } } } },
                      rate_trend: { type: 'object', properties: { direction: { type: 'string', enum: ['rising', 'falling', 'stable'] }, '30d_change_bps': { type: 'number' }, driver: { type: 'string' }, outlook: { type: 'string' } } },
                      protocol_risk: { type: 'array', items: { type: 'object', properties: { protocol: { type: 'string' }, risk_score: { type: 'number' }, top_risk_factor: { type: 'string' }, audit_count: { type: 'integer' }, insurance_available: { type: 'boolean' } } } },
                      recommendation: { type: 'object', properties: { action: { type: 'string', enum: ['deposit_now', 'wait', 'diversify', 'avoid'] }, best_protocol: { type: 'string' }, expected_apy: { type: 'number' }, rationale: { type: 'string' }, alternative: { type: 'string' } } },
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
