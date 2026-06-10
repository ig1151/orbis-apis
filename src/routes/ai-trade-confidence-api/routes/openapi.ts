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

const signalFactors = {
  type: 'object', properties: {
    technical_score: { type: 'number', minimum: 0, maximum: 100 },
    fundamental_score: { type: 'number', minimum: 0, maximum: 100 },
    sentiment_score: { type: 'number', minimum: 0, maximum: 100 },
    on_chain_score: { type: 'number', minimum: 0, maximum: 100 },
    macro_score: { type: 'number', minimum: 0, maximum: 100 },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'AI Trade Confidence API', version: '1.0.0',
      description: 'Score the confidence of any trade signal using AI multi-factor analysis. Validate trade setups with technical, fundamental, and sentiment signal alignment before execution.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': true,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { score: '$0.003', validate: '$0.005', lookup: '$0.010' } },
      'x-financial-disclaimer': 'For informational purposes only. Human review required before any trade execution. Not financial advice.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/ai-trade-confidence' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'aiTradeConfidenceDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, capabilities',
          security: [],
          responses: { '200': { description: 'Discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/score': {
        post: {
          operationId: 'aiTradeScore',
          summary: 'AI confidence score for a directional trade signal',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['asset', 'direction'], properties: {
                    asset: { type: 'string', description: 'Asset to trade (e.g. BTC, ETH, SOL)' },
                    direction: { type: 'string', enum: ['long', 'short', 'buy', 'sell'] },
                    timeframe: { type: 'string', default: '4h', enum: ['15m', '1h', '4h', '1d', '1w'] },
                    signal_source: { type: 'string', description: 'Where the signal came from (e.g. RSI oversold, breakout, whale accumulation)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Trade confidence score with factor breakdown',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, asset: { type: 'string' }, direction: { type: 'string' }, timeframe: { type: 'string' },
                      confidence_score: { type: 'number', minimum: 0, maximum: 100 },
                      confidence_level: { type: 'string', enum: ['very_high', 'high', 'moderate', 'low', 'very_low'] },
                      signal_factors: signalFactors,
                      top_supporting_factors: { type: 'array', items: { type: 'string' } },
                      top_contradicting_factors: { type: 'array', items: { type: 'string' } },
                      verdict: { type: 'string', enum: ['strong_signal', 'valid_signal', 'weak_signal', 'conflicted', 'fade'] },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing asset or direction' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/validate': {
        post: {
          operationId: 'aiTradeValidate',
          summary: 'Validate a full trade setup with R:R, confluence, and key level analysis',
          'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['asset', 'direction'], properties: {
                    asset: { type: 'string' }, direction: { type: 'string', enum: ['long', 'short', 'buy', 'sell'] },
                    entry_price: { type: 'number', description: 'Planned entry price' },
                    stop_loss: { type: 'number', description: 'Stop loss price' },
                    take_profit: { type: 'number', description: 'Take profit target' },
                    timeframe: { type: 'string', default: '4h' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Trade setup validation with risk-reward and confluence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, asset: { type: 'string' }, direction: { type: 'string' },
                      entry_price: { type: 'number' }, stop_loss: { type: 'number' }, take_profit: { type: 'number' },
                      timeframe: { type: 'string' },
                      setup_quality: { type: 'object', properties: { score: { type: 'number' }, grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] }, issues: { type: 'array', items: { type: 'string' } }, strengths: { type: 'array', items: { type: 'string' } } } },
                      risk_reward: { type: 'object', properties: { ratio: { type: 'number' }, risk_pct: { type: 'number' }, reward_pct: { type: 'number' }, acceptable: { type: 'boolean' }, note: { type: 'string' } } },
                      confluence_analysis: { type: 'object', properties: { aligned_signals: { type: 'array', items: { type: 'string' } }, conflicting_signals: { type: 'array', items: { type: 'string' } }, confluence_score: { type: 'number' }, verdict: { type: 'string', enum: ['high_confluence', 'moderate', 'low_confluence', 'conflicted'] } } },
                      key_levels: { type: 'object', properties: { support: { type: 'number' }, resistance: { type: 'number' }, invalidation: { type: 'number' } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing asset or direction' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'aiTradeLookup',
          summary: 'ONE-CALL: confidence score + setup validation + risk + go/no-go verdict',
          'x-one-call': true, 'x-human-approval-required': false, 'x-execution-gate-required': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['asset', 'direction'], properties: {
                    asset: { type: 'string' }, direction: { type: 'string', enum: ['long', 'short', 'buy', 'sell'] },
                    entry_price: { type: 'number' }, stop_loss: { type: 'number' }, take_profit: { type: 'number' },
                    timeframe: { type: 'string', default: '4h' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full trade confidence analysis with go/no-go verdict',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, asset: { type: 'string' }, direction: { type: 'string' }, timeframe: { type: 'string' },
                      confidence_score: { type: 'number', minimum: 0, maximum: 100 },
                      confidence_level: { type: 'string', enum: ['very_high', 'high', 'moderate', 'low', 'very_low'] },
                      signal_factors: signalFactors,
                      setup_validation: { type: 'object', properties: { grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] }, risk_reward_ratio: { type: 'number' }, confluence_verdict: { type: 'string', enum: ['high', 'moderate', 'low', 'conflicted'] } } },
                      risk_assessment: { type: 'object', properties: { risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'very_high'] }, key_risks: { type: 'array', items: { type: 'string' } }, max_recommended_position_pct: { type: 'number' } } },
                      go_no_go: { type: 'object', properties: { verdict: { type: 'string', enum: ['execute', 'wait', 'reduce_size', 'pass'] }, conviction: { type: 'string', enum: ['high', 'medium', 'low'] }, rationale: { type: 'string' }, conditions_to_improve: { type: 'array', items: { type: 'string' } } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing asset or direction' }, '500': { description: 'Internal error' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
