import { Router, Request, Response } from 'express';
const router = Router();

const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Meta Strategy API',
    version: '2.0.0',
    description: 'Multi-symbol crypto strategy scanner. Scans up to 5 symbols in parallel, ranks by signal strength, identifies best buy/sell opportunities, and generates a unified portfolio narrative.',
    'x-agent-callable': true,
    'x-mcp-compatible': true,
    'x-human-approval-required': true,
    'x-pricing': { '/scan': 0.01, '/execution-gate': 0.002 },
    privacy: { data_stored: false, retention: 'none' },
    disclaimer: 'For informational purposes only. Not financial advice.',
  },
  servers: [{ url: 'https://orbis-apis.onrender.com/meta-strategy' }],
  security: [{ ApiKeyAuth: [] }],
  components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  paths: {
    '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
    '/scan': {
      get: {
        summary: 'Scan multiple symbols, rank by signal strength, return best opportunities with portfolio narrative',
        operationId: 'scan',
        'x-agent-callable': true,
        parameters: [{
          name: 'symbols', in: 'query', required: false,
          schema: { type: 'string', default: 'BTC,ETH,SOL,ARB,SUI' },
          description: 'Comma-separated symbols (max 5). Valid: BTC,ETH,SOL,BNB,ARB,OP,AVAX,MATIC,LINK,UNI,DOGE,SUI,APT,SEI,INJ,TIA,ATOM,DOT,NEAR,FET',
        }],
        responses: {
          '200': {
            description: 'Ranked signals with best buy/sell, market bias, and portfolio narrative',
            content: { 'application/json': { schema: { type: 'object', properties: {
              success: { type: 'boolean' },
              data: { type: 'object', properties: {
                scannedSymbols: { type: 'array', items: { type: 'string' } },
                scannedCount: { type: 'integer' },
                successCount: { type: 'integer' },
                marketBias: { type: 'string', enum: ['RISK_ON', 'RISK_OFF', 'MIXED', 'NEUTRAL'] },
                portfolioNarrative: { type: 'string', description: 'AI-generated portfolio strategy narrative' },
                topOpportunity: { type: 'object', properties: {
                  symbol: { type: 'string' },
                  decision: { type: 'string', enum: ['BUY','STRONG_BUY','SELL','STRONG_SELL','HOLD'] },
                  signalScore: { type: 'number', minimum: -100, maximum: 100 },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  riskLevel: { type: 'string', enum: ['low','medium','high'] },
                  reasoning: { type: 'string' },
                  keyFactors: { type: 'array', items: { type: 'string' } },
                  price: { type: 'number', nullable: true },
                  changePercent24h: { type: 'number', nullable: true },
                  rank: { type: 'integer' },
                }},
                ranked: { type: 'array', items: { type: 'object', properties: {
                  symbol: { type: 'string' },
                  decision: { type: 'string', enum: ['BUY','STRONG_BUY','SELL','STRONG_SELL','HOLD'] },
                  signalScore: { type: 'number', minimum: -100, maximum: 100 },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  riskLevel: { type: 'string', enum: ['low','medium','high'] },
                  invalidatedIf: { type: 'string', nullable: true },
                  reasoning: { type: 'string' },
                  keyFactors: { type: 'array', items: { type: 'string' } },
                  price: { type: 'number', nullable: true },
                  changePercent24h: { type: 'number', nullable: true },
                  rank: { type: 'integer' },
                }}},
                buySignals: { type: 'array', items: { type: 'object' } },
                sellSignals: { type: 'array', items: { type: 'object' } },
                holdSignals: { type: 'array', items: { type: 'object' } },
                bestBuy: { type: 'object', nullable: true },
                bestSell: { type: 'object', nullable: true },
                analyzedAt: { type: 'string', format: 'date-time' },
              }},
              confidence_per_section: { type: 'object', properties: { signals: { type: 'number' }, narrative: { type: 'number' }, ranking: { type: 'number' } } },
              recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
              chain_to: { type: 'array', items: { type: 'string' } },
              privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
            } } } },
          },
          '400': { description: 'Invalid symbols' },
          '503': { description: 'All strategy calls failed' },
        },
      },
      post: {
        summary: 'POST variant of scan — same as GET with body params',
        operationId: 'scanPost',
        'x-agent-callable': true,
        requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: {
          symbols: { type: 'string', description: 'Comma-separated symbols (max 5)' },
        }}}}},
        responses: { '200': { description: 'Ranked signals' } },
      },
    },
    '/execution-gate': {
      post: {
        summary: 'Gate portfolio action based on market bias and signal confidence',
        operationId: 'executionGate',
        'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['action'], properties: {
          symbols: { type: 'string', default: 'BTC,ETH,SOL,ARB,SUI' },
          action: { type: 'string', description: 'Intended portfolio action' },
          min_confidence: { type: 'number', minimum: 0, maximum: 1, default: 0.5 },
          required_bias: { type: 'string', enum: ['RISK_ON','RISK_OFF','MIXED','NEUTRAL','any'], default: 'any' },
        }}}}},
        responses: { '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          execute: { type: 'boolean' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          market_bias: { type: 'string' },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          top_opportunity: { type: 'object', nullable: true },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        } } } } } },
      },
    },
  },
};

router.get('/, (_req: Request, res: Response) => { res.json(openApiSpec); });
router.get('/docs', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html><html><head><title>Meta Strategy API — Docs</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({ url: '/meta-strategy/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: 'BaseLayout' });</script></body></html>`);
});

export default router;
