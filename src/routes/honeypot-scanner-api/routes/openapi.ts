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

const contractFlagItem = {
  type: 'object', properties: {
    flag: { type: 'string' },
    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
    description: { type: 'string' },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Honeypot Scanner API', version: '1.0.0',
      description: 'Detect honeypot contracts, rug pull mechanisms, and malicious token patterns. Analyze smart contract flags, ownership risk, liquidity lock status, and sell restrictions before trading.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': true,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.003', risk: '$0.004', lookup: '$0.008' } },
      'x-financial-disclaimer': 'For informational purposes only. AI safety analysis is not a guarantee. Always verify on-chain before trading.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/honeypot-scanner' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'honeypotScannerDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, capabilities',
          security: [],
          responses: { '200': { description: 'Discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/scan': {
        post: {
          operationId: 'honeypotScan',
          summary: 'Scan a contract for honeypot flags, sell restrictions, and buy/sell simulation',
          'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: { contract: { type: 'string', description: 'Token contract address' }, chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'bsc', 'polygon', 'arbitrum', 'solana'] } } } } },
          },
          responses: {
            '200': {
              description: 'Honeypot scan result with sell restrictions and contract flags',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, contract: { type: 'string' }, chain: { type: 'string' },
                      is_honeypot: { type: 'boolean' }, honeypot_confidence: { type: 'number', minimum: 0, maximum: 1 },
                      sell_restrictions: { type: 'object', properties: { can_sell: { type: 'boolean' }, sell_tax_pct: { type: 'number' }, buy_tax_pct: { type: 'number' }, transfer_pausable: { type: 'boolean' }, blacklist_function: { type: 'boolean' }, max_transaction_limit: { type: 'boolean' } } },
                      contract_flags: { type: 'array', items: contractFlagItem },
                      simulation_result: { type: 'object', properties: { buy_success: { type: 'boolean' }, sell_success: { type: 'boolean' }, net_loss_pct: { type: 'number' }, failure_reason: { type: 'string' } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing contract' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/risk': {
        post: {
          operationId: 'honeypotRisk',
          summary: 'Full risk score with ownership analysis, LP lock status, and rug pull vectors',
          'x-human-approval-required': false,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: { contract: { type: 'string' }, chain: { type: 'string', default: 'ethereum' } } } } },
          },
          responses: {
            '200': {
              description: 'Contract risk analysis with rug vectors',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, contract: { type: 'string' }, chain: { type: 'string' },
                      risk_score: { type: 'number', minimum: 0, maximum: 100 },
                      risk_level: { type: 'string', enum: ['safe', 'low', 'medium', 'high', 'critical'] },
                      ownership_risk: { type: 'object', properties: { is_renounced: { type: 'boolean' }, owner_address: { type: 'string' }, owner_can_mint: { type: 'boolean' }, owner_can_pause: { type: 'boolean' }, owner_can_blacklist: { type: 'boolean' }, multisig: { type: 'boolean' } } },
                      liquidity_risk: { type: 'object', properties: { lp_locked: { type: 'boolean' }, lock_duration_days: { type: 'number' }, lock_platform: { type: 'string' }, lp_burned_pct: { type: 'number' }, top_lp_holder_pct: { type: 'number' } } },
                      rug_vectors: { type: 'array', items: { type: 'object', properties: { vector: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, present: { type: 'boolean' }, description: { type: 'string' } } } },
                      audit: { type: 'object', properties: { audited: { type: 'boolean' }, auditor: { type: 'string' }, critical_issues_found: { type: 'integer' } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing contract' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'honeypotLookup',
          summary: 'ONE-CALL: honeypot verdict + rug risk + safety checklist + trade recommendation',
          'x-one-call': true, 'x-human-approval-required': false, 'x-execution-gate-required': true,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['contract'], properties: { contract: { type: 'string' }, chain: { type: 'string', default: 'ethereum' } } } } },
          },
          responses: {
            '200': {
              description: 'Full honeypot and safety assessment',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, contract: { type: 'string' }, chain: { type: 'string' },
                      verdict: { type: 'object', properties: { is_honeypot: { type: 'boolean' }, is_safe: { type: 'boolean' }, overall_risk: { type: 'string', enum: ['safe', 'low', 'medium', 'high', 'critical'] }, trade_recommendation: { type: 'string', enum: ['safe_to_trade', 'caution', 'avoid', 'do_not_buy'] } } },
                      honeypot_check: { type: 'object', properties: { is_honeypot: { type: 'boolean' }, confidence: { type: 'number' }, can_sell: { type: 'boolean' }, sell_tax_pct: { type: 'number' }, buy_tax_pct: { type: 'number' } } },
                      rug_risk: { type: 'object', properties: { score: { type: 'number' }, risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }, lp_locked: { type: 'boolean' }, owner_renounced: { type: 'boolean' }, top_risk_factors: { type: 'array', items: { type: 'string' } } } },
                      safety_checklist: { type: 'array', items: { type: 'object', properties: { check: { type: 'string' }, status: { type: 'string', enum: ['pass', 'warn', 'fail'] }, detail: { type: 'string' } } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing contract' }, '500': { description: 'Internal error' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
