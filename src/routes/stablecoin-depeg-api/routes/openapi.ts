import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const pegSchema = {
  type: 'object', properties: {
    target: { type: 'number' }, current_price: { type: 'number' },
    deviation_pct: { type: 'number' }, deviation_direction: { type: 'string', enum: ['above', 'below', 'on_peg'] },
    is_depegged: { type: 'boolean' }, depeg_threshold_pct: { type: 'number' },
  },
};

const riskSchema = {
  type: 'object', properties: {
    score: { type: 'number', minimum: 0, maximum: 100 },
    level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    collateral_ratio: { type: 'number', nullable: true },
    collateral_type: { type: 'string', enum: ['fiat-backed', 'crypto-backed', 'algorithmic', 'hybrid'] },
    reserve_transparency: { type: 'string', enum: ['high', 'medium', 'low', 'unknown'] },
    audit_status: { type: 'string', enum: ['audited', 'unaudited', 'partial'] },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Stablecoin Depeg Risk API',
      version: '1.0.0',
      description: 'Monitor stablecoin peg stability, collateral health, and depeg risk. Built for DeFi agents, risk managers, and autonomous trading workflows that hold or interact with stablecoins.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { check: '$0.003', monitor: '$0.004', lookup: '$0.005' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/stablecoin-depeg' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: { operationId: 'depegDiscovery', summary: 'API discovery', security: [], responses: { '200': { description: 'Discovery info' } } },
      },
      '/check': {
        post: {
          operationId: 'depegCheck',
          summary: 'Stablecoin peg check — deviation, risk score, collateral, recommendation',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string', example: 'USDT' } } } } } },
          responses: {
            '200': {
              description: 'Depeg risk result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      peg: pegSchema,
                      risk: riskSchema,
                      history: {
                        type: 'object', properties: {
                          largest_depeg_30d_pct: { type: 'number' },
                          depeg_events_90d: { type: 'integer' },
                          days_since_last_depeg: { type: 'integer', nullable: true },
                        },
                      },
                      recommendation: { type: 'string', enum: ['safe', 'monitor', 'reduce_exposure', 'exit'] },
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
            '400': { description: 'Missing symbol' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/monitor': {
        post: {
          operationId: 'depegMonitor',
          summary: 'Batch stablecoin monitoring — up to 20 symbols with alerts',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbols'], properties: { symbols: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 } } } } } },
          responses: {
            '200': {
              description: 'Batch monitoring results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      total: { type: 'integer' },
                      results: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            symbol: { type: 'string' }, current_price: { type: 'number' },
                            deviation_pct: { type: 'number' }, risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                            recommendation: { type: 'string' }, is_depegged: { type: 'boolean' },
                          },
                        },
                      },
                      alerts: { type: 'array', items: { type: 'string' } },
                      market_health: { type: 'string', enum: ['stable', 'stressed', 'crisis'] },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      chain_to,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Invalid input' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'depegLookup',
          summary: 'ONE-CALL: full depeg intelligence — peg, risk, history, issuer, market',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Full stablecoin intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      symbol: { type: 'string' },
                      peg: pegSchema,
                      risk: riskSchema,
                      history: { type: 'object', properties: { largest_depeg_30d_pct: { type: 'number' }, depeg_events_90d: { type: 'integer' } } },
                      issuer: { type: 'object', properties: { name: { type: 'string' }, jurisdiction: { type: 'string' }, regulated: { type: 'boolean' } } },
                      market: { type: 'object', properties: { market_cap_usd: { type: 'number' }, volume_24h_usd: { type: 'number' }, rank_among_stablecoins: { type: 'integer' } } },
                      recommendation: { type: 'string', enum: ['safe', 'monitor', 'reduce_exposure', 'exit'] },
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
            '400': { description: 'Missing symbol' },
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
