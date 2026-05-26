import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const holderItem = {
  type: 'object', properties: {
    rank: { type: 'integer' },
    address: { type: 'string' },
    label: { type: 'string' },
    type: { type: 'string', enum: ['exchange', 'team', 'dao', 'whale', 'retail', 'contract'] },
    pct_supply: { type: 'number', minimum: 0, maximum: 100 },
    change_30d_pct: { type: 'number' },
    behavior: { type: 'string', enum: ['accumulating', 'distributing', 'holding'] },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Token Holder Distribution API',
      version: '1.0.0',
      description: 'Analyze token holder distribution — whale concentration, top holder behavior, decentralization trends, and sell pressure risk. Built for due diligence, tokenomics analysis, and risk-aware trading agents.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { analyze: '$0.003', trend: '$0.003', lookup: '$0.006' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-paper-mode-recommended': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/token-holder-distribution' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'tokenHolderDiscovery',
          summary: 'API discovery — name, version, available endpoints',
          security: [],
          responses: { '200': { description: 'Discovery info' } },
        },
      },
      '/analyze': {
        post: {
          operationId: 'tokenHolderAnalyze',
          summary: 'Snapshot of token holder distribution — whale %, top-10 concentration, segment breakdown',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string', description: 'Token name or contract address (e.g. ETH, UNI, LINK)' },
                    chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'solana'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Holder distribution snapshot with concentration risk',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' },
                      chain: { type: 'string' },
                      total_holders: { type: 'integer' },
                      distribution: { type: 'object', properties: { top_1_pct_supply: { type: 'number' }, top_10_pct_supply: { type: 'number' }, top_50_pct_supply: { type: 'number' }, retail_holders_pct: { type: 'number' }, exchange_held_pct: { type: 'number' }, locked_pct: { type: 'number' } } },
                      top_holders: { type: 'array', items: holderItem },
                      holder_segments: { type: 'array', items: { type: 'object', properties: { range: { type: 'string' }, count: { type: 'integer' }, pct_of_supply: { type: 'number' }, type: { type: 'string' } } } },
                      concentration_risk: { type: 'object', properties: { gini_coefficient: { type: 'number', minimum: 0, maximum: 1 }, risk_level: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, risk_note: { type: 'string' }, sell_pressure_risk: { type: 'string' } } },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing token' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/trend': {
        post: {
          operationId: 'tokenHolderTrend',
          summary: 'Holder distribution trend — growth rate, decentralization direction, whale behavior over time',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string' },
                    chain: { type: 'string', default: 'ethereum' },
                    days: { type: 'integer', default: 30, minimum: 7, maximum: 365 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Historical holder distribution trends',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' },
                      chain: { type: 'string' },
                      period_days: { type: 'integer' },
                      holder_count_trend: { type: 'array', items: { type: 'object', properties: { date: { type: 'string', format: 'date' }, total_holders: { type: 'integer' }, new_holders: { type: 'integer' }, lost_holders: { type: 'integer' } } } },
                      concentration_trend: { type: 'array', items: { type: 'object', properties: { date: { type: 'string', format: 'date' }, top_10_pct_supply: { type: 'number' }, whale_count: { type: 'integer' } } } },
                      trend_summary: { type: 'object', properties: { holder_growth_rate_pct: { type: 'number' }, holder_trend: { type: 'string' }, decentralization_trend: { type: 'string' }, whale_activity: { type: 'string' }, retail_adoption: { type: 'string' } } },
                      key_events: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' }, impact: { type: 'string' } } } },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing token' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'tokenHolderLookup',
          summary: 'ONE-CALL: snapshot + trend + concentration risk + investment signal for a token',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string' },
                    chain: { type: 'string', default: 'ethereum' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Complete token holder distribution intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      token: { type: 'string' },
                      chain: { type: 'string' },
                      snapshot: { type: 'object', properties: { total_holders: { type: 'integer' }, top_10_pct_supply: { type: 'number' }, top_50_pct_supply: { type: 'number' }, whale_count: { type: 'integer' }, retail_pct_supply: { type: 'number' }, exchange_pct_supply: { type: 'number' } } },
                      top_holders: { type: 'array', items: holderItem },
                      trend_30d: { type: 'object', properties: { holder_count_change: { type: 'integer' }, holder_trend: { type: 'string' }, whale_trend: { type: 'string' }, decentralization_trend: { type: 'string' } } },
                      concentration_risk: { type: 'object', properties: { risk_level: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, gini_coefficient: { type: 'number' }, key_risks: { type: 'array', items: { type: 'string' } }, sell_pressure_risk: { type: 'string' } } },
                      investment_signal: { type: 'object', properties: { signal: { type: 'string', enum: ['bullish', 'neutral', 'bearish'] }, conviction: { type: 'string' }, key_insight: { type: 'string' }, watch_list: { type: 'array', items: { type: 'string' } } } },
                      financial_disclaimer: { type: 'string' },
                      paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing token' },
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
