import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const ilSchema = {
  type: 'object', properties: {
    pct: { type: 'number', description: 'Negative number, e.g. -3.45' },
    usd: { type: 'number', nullable: true },
    vs_hodl_usd: { type: 'number', nullable: true },
    explanation: { type: 'string' },
  },
};

const requestBodyBase = {
  required: ['token_a', 'token_b', 'entry_price_a', 'entry_price_b'],
  properties: {
    token_a: { type: 'string', example: 'ETH' },
    token_b: { type: 'string', example: 'USDC' },
    entry_price_a: { type: 'number', description: 'Price of token A when LP position was opened' },
    entry_price_b: { type: 'number', description: 'Price of token B when LP position was opened' },
    liquidity_usd: { type: 'number', description: 'Total USD value deposited into the LP (optional)' },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Impermanent Loss API',
      version: '1.0.0',
      description: 'Calculate and simulate impermanent loss for AMM liquidity pool positions. Supports x*y=k constant product formula, multi-scenario simulation, and exit recommendations for DeFi LP agents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { calculate: '$0.003', simulate: '$0.004', lookup: '$0.005' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/impermanent-loss' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: { operationId: 'ilDiscovery', summary: 'API discovery', security: [], responses: { '200': { description: 'Discovery info' } } },
      },
      '/calculate': {
        post: {
          operationId: 'ilCalculate',
          summary: 'Calculate current impermanent loss for an AMM LP position using x*y=k formula',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: [...requestBodyBase.required, 'current_price_a', 'current_price_b'],
                  properties: {
                    ...requestBodyBase.properties,
                    current_price_a: { type: 'number', description: 'Current price of token A' },
                    current_price_b: { type: 'number', description: 'Current price of token B' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'IL calculation with hodl comparison and break-even analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      pair: { type: 'string' },
                      entry: { type: 'object', properties: { price_a: { type: 'number' }, price_b: { type: 'number' }, ratio: { type: 'number' } } },
                      current: { type: 'object', properties: { price_a: { type: 'number' }, price_b: { type: 'number' }, ratio: { type: 'number' } } },
                      price_change: { type: 'object', properties: { token_a_pct: { type: 'number' }, token_b_pct: { type: 'number' } } },
                      impermanent_loss: ilSchema,
                      hodl_value_usd: { type: 'number', nullable: true },
                      lp_value_usd: { type: 'number', nullable: true },
                      break_even_fees_needed_usd: { type: 'number', nullable: true },
                      recommendation: { type: 'string', enum: ['hold', 'exit', 'monitor'] },
                      financial_disclaimer: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing required fields' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/simulate': {
        post: {
          operationId: 'ilSimulate',
          summary: 'Simulate impermanent loss across price change scenarios — LP vs HODL comparison',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: requestBodyBase.required,
                  properties: {
                    ...requestBodyBase.properties,
                    scenarios: { type: 'array', items: { type: 'string' }, example: ['-50%', '-25%', '0%', '+25%', '+50%', '+100%', '+200%'], description: 'Price change % scenarios for token A relative to token B' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Scenario simulation results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      pair: { type: 'string' },
                      scenarios: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            price_change_pct: { type: 'number' }, il_pct: { type: 'number' },
                            il_usd: { type: 'number', nullable: true }, lp_value_usd: { type: 'number', nullable: true },
                            hodl_value_usd: { type: 'number', nullable: true }, fee_needed_to_break_even_usd: { type: 'number', nullable: true },
                          },
                        },
                      },
                      summary: { type: 'string' },
                      financial_disclaimer: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing required fields' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'ilLookup',
          summary: 'ONE-CALL: IL calculation + scenarios + position value + exit recommendation',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: [...requestBodyBase.required, 'current_price_a', 'current_price_b'],
                  properties: {
                    ...requestBodyBase.properties,
                    current_price_a: { type: 'number' },
                    current_price_b: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full IL intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      pair: { type: 'string' },
                      impermanent_loss: ilSchema,
                      position: { type: 'object', properties: { lp_value_usd: { type: 'number', nullable: true }, hodl_value_usd: { type: 'number', nullable: true }, net_vs_hodl_usd: { type: 'number', nullable: true } } },
                      scenarios: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, price_change_pct: { type: 'number' }, il_pct: { type: 'number' } } } },
                      break_even_fee_needed_usd: { type: 'number', nullable: true },
                      recommendation: { type: 'string', enum: ['hold', 'exit', 'monitor'] },
                      financial_disclaimer: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing required fields' },
            '500': { description: 'Internal error' },
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
