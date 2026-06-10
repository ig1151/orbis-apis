import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const PROTOCOL_ENUM = ['aave_v3', 'aave_v2', 'dydx', 'balancer', 'maker', 'euler'];
const CHAIN_ENUM = ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc'];
const COMPLEXITY_ENUM = ['simple', 'multi-hop', 'complex'];
const MEV_RISK_ENUM = ['high', 'medium', 'low'];
const ARB_TYPE_ENUM = ['dex_price_gap', 'liquidation', 'stablecoin_depeg', 'triangular'];
const ATOMIC_ENUM = ['same_block', 'same_transaction'];

const protocolItem = {
  type: 'object', properties: {
    protocol: { type: 'string', enum: PROTOCOL_ENUM }, available_liquidity_usd: { type: 'number' },
    fee_pct: { type: 'number' }, max_loan_usd: { type: 'number' },
    supported_tokens: { type: 'array', items: { type: 'string' } },
    atomic_requirement: { type: 'string', enum: ATOMIC_ENUM },
    gas_overhead_usd: { type: 'number' }, reliability_score: { type: 'number' },
    contract_audited: { type: 'boolean' }, notes: { type: 'string' },
  },
};

const executionStepItem = {
  type: 'object', properties: {
    step: { type: 'integer' }, action: { type: 'string' }, protocol: { type: 'string' },
    input_token: { type: 'string' }, output_token: { type: 'string' },
    estimated_slippage_pct: { type: 'number' }, gas_cost_usd: { type: 'number' }, note: { type: 'string' },
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
      title: 'Flash Loan Opportunity API',
      version: '1.0.0',
      description: 'Flash loan arbitrage opportunity detection across Aave, dYdX, and Balancer. Identifies executable arb paths that can be wrapped in a flash loan for zero-capital execution.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': true,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { protocols: '$0.005', scan: '$0.01', lookup: '$0.025' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/flash-loan-opportunity' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'flashLoanOpportunityDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/protocols': {
        post: {
          operationId: 'flashLoanOpportunityProtocols',
          summary: 'Available flash loan protocols with liquidity and fees',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    chain: { type: 'string', default: 'ethereum', enum: CHAIN_ENUM },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Flash loan protocols with liquidity, fees, and comparison',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      chain: { type: 'string', enum: CHAIN_ENUM },
                      protocols: { type: 'array', items: protocolItem },
                      protocol_comparison: {
                        type: 'object', properties: {
                          cheapest_fee: { type: 'string' }, most_liquidity: { type: 'string' },
                          fastest: { type: 'string' }, recommended: { type: 'string' },
                        },
                      },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions,
                      chain_to, privacy,
                    },
                  },
                },
              },
            },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/scan': {
        post: {
          operationId: 'flashLoanOpportunityScan',
          summary: 'Detected flash loan arb opportunities with net profit',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    chain: { type: 'string', default: 'ethereum', enum: CHAIN_ENUM },
                    min_profit_usd: { type: 'number', default: 50, minimum: 0, description: 'Minimum net profit in USD to surface' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Flash loan arb opportunities with protocol, path, and net profit',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      chain: { type: 'string', enum: CHAIN_ENUM }, min_profit_usd: { type: 'number' },
                      opportunities: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            protocol: { type: 'string', enum: PROTOCOL_ENUM }, arb_path: { type: 'string' },
                            required_loan_usd: { type: 'number' }, estimated_profit_usd: { type: 'number' },
                            flash_loan_fee_usd: { type: 'number' }, gas_cost_usd: { type: 'number' },
                            net_profit_usd: { type: 'number' }, complexity: { type: 'string', enum: COMPLEXITY_ENUM },
                            mev_risk: { type: 'string', enum: MEV_RISK_ENUM },
                            success_probability_pct: { type: 'number' }, window_seconds: { type: 'number' },
                          },
                        },
                      },
                      market_summary: {
                        type: 'object', properties: {
                          total_opportunities: { type: 'integer' }, best_net_profit_usd: { type: 'number' },
                          simplest_opportunity: { type: 'string' }, most_profitable: { type: 'string' },
                        },
                      },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions,
                      chain_to, privacy,
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
          operationId: 'flashLoanOpportunityLookup',
          summary: 'ONE-CALL: full flash loan execution plan with step-by-step execution',
          'x-one-call': true,
          'x-execution-gate-required': true,
          'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['arb_type'],
                  properties: {
                    arb_type: { type: 'string', enum: ARB_TYPE_ENUM, description: 'Type of arbitrage to wrap in flash loan' },
                    token: { type: 'string', description: 'Optional: specific token to focus the arb on' },
                    chain: { type: 'string', default: 'ethereum', enum: CHAIN_ENUM },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full flash loan execution plan with step-by-step instructions and MEV risk',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      arb_type: { type: 'string', enum: ARB_TYPE_ENUM }, chain: { type: 'string', enum: CHAIN_ENUM },
                      recommended_protocol: { type: 'string', enum: PROTOCOL_ENUM },
                      loan_details: {
                        type: 'object', properties: {
                          protocol: { type: 'string' }, loan_token: { type: 'string' },
                          loan_amount_usd: { type: 'number' }, flash_loan_fee_pct: { type: 'number' },
                          flash_loan_fee_usd: { type: 'number' }, repayment_amount_usd: { type: 'number' },
                        },
                      },
                      step_by_step_execution: { type: 'array', items: executionStepItem },
                      contract_calls_needed: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            call: { type: 'string' }, contract: { type: 'string' },
                            function_signature: { type: 'string' }, purpose: { type: 'string' },
                          },
                        },
                      },
                      profit_summary: {
                        type: 'object', properties: {
                          gross_profit_usd: { type: 'number' }, flash_loan_fee_usd: { type: 'number' },
                          total_gas_usd: { type: 'number' }, net_profit_usd: { type: 'number' }, roi_pct: { type: 'number' },
                        },
                      },
                      mev_risk: { type: 'string', enum: MEV_RISK_ENUM },
                      mev_mitigation: {
                        type: 'object', properties: {
                          use_flashbots: { type: 'boolean' }, private_mempool_recommended: { type: 'boolean' },
                          bundle_strategy: { type: 'string' }, front_run_likelihood_pct: { type: 'number' },
                        },
                      },
                      failure_scenarios: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            scenario: { type: 'string' }, probability_pct: { type: 'number' },
                            consequence: { type: 'string' }, mitigation: { type: 'string' },
                          },
                        },
                      },
                      estimated_gas_units: { type: 'number' },
                      reasoning: {
                        type: 'object', properties: {
                          why_signal_generated: { type: 'string' },
                          key_factors: { type: 'array', items: { type: 'string' } },
                          invalidators: { type: 'array', items: { type: 'string' } },
                        },
                      },
                      latency_ms: { type: 'number', description: 'Signal computation time in milliseconds' },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions,
                      chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing arb_type' }, '500': { description: 'Internal error' },
          },
        },
      },
    },
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
    },
  });
});

export default router;
