import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Market Intelligence API',
      version: '2.0.0',
      description: 'Unified autonomous market reasoning. Combines market snapshot, alpha signals, token trust and sentiment scoring into a single intelligence decision layer.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-execution-gate-required': true,
      'x-paper-mode-recommended': true,
      'x-pricing': { '/analyze/{ticker}': 0.005, '/execution-gate': 0.002 },
      privacy: { data_stored: false, retention: 'none' },
      disclaimer: 'For informational purposes only. Not financial advice.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/market-intelligence' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', 'x-agent-callable': true,
      responses: { '200': { description: 'API info', content: { 'application/json': { schema: { type: 'object', required: ['title', 'version', 'status'], properties: {
        title: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
        status: { type: 'string', enum: ['ok'] },
        privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        endpoints: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, method: { type: 'string' }, price_usdc: { type: 'number' }, description: { type: 'string' } } } },
      } } } } } } } },
      '/analyze/{ticker}': {
        get: {
          operationId: 'analyzeMarket',
          summary: 'Get unified market intelligence for a crypto asset — price, trust, signals and decision',
          'x-agent-callable': true,
          'x-human-approval-required': false,
          'x-execution-gate-required': true,
          'x-paper-mode-recommended': true,
          parameters: [{ name: 'ticker', in: 'path', required: true, schema: { type: 'string', enum: ['BTC','ETH','SOL','BNB','ARB','OP','AVAX','MATIC','LINK','UNI','DOGE','SUI','APT','INJ','ATOM','NEAR'] }, description: 'Crypto asset symbol' }],
          responses: {
            '200': { description: 'Market intelligence result', content: { 'application/json': { schema: { type: 'object', required: ['ticker', 'decision', 'overall_score', 'confidence', 'analyzed_at'], properties: {
              ticker: { type: 'string' },
              decision: { type: 'string', enum: ['BUY','STRONG_BUY','SELL','STRONG_SELL','HOLD'], description: 'Autonomous trading decision' },
              overall_score: { type: 'number', minimum: -100, maximum: 100, description: 'Composite intelligence score' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              risk_level: { type: 'string', enum: ['low','medium','high'] },
              market_data: { type: 'object', properties: {
                price: { type: 'number' },
                change_24h: { type: 'number' },
                volume_24h: { type: 'number' },
                market_cap: { type: 'number' },
              }},
              trust_score: { type: 'object', properties: {
                score: { type: 'number', minimum: 0, maximum: 100 },
                honeypot_risk: { type: 'string', enum: ['none','low','medium','high'] },
                contract_verified: { type: 'boolean' },
              }},
              signal_summary: { type: 'object', properties: {
                alpha_signal: { type: 'string' },
                sentiment: { type: 'string', enum: ['bullish','bearish','neutral'] },
                onchain_signal: { type: 'string' },
              }},
              reasoning: { type: 'string', description: 'Human-readable decision reasoning' },
              key_factors: { type: 'array', items: { type: 'string' } },
              invalidated_if: { type: 'string', nullable: true },
              confidence_per_section: { type: 'object', properties: { market: { type: 'number' }, trust: { type: 'number' }, signals: { type: 'number' } } },
              recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
              chain_to: { type: 'array', items: { type: 'string' } },
              privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
              analyzed_at: { type: 'string', format: 'date-time' },
            } } } } },
            '400': { description: 'Invalid ticker' },
            '404': { description: 'Asset not found' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Gate autonomous action based on market intelligence score and confidence',
          'x-agent-callable': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ticker','action'], properties: {
            ticker: { type: 'string' },
            action: { type: 'string' },
            min_confidence: { type: 'number', minimum: 0, maximum: 1, default: 0.6 },
            min_score: { type: 'number', minimum: -100, maximum: 100, default: 20 },
            max_risk: { type: 'string', enum: ['low','medium','high'], default: 'medium' },
          }}}}},
          responses: { '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', required: ['execute', 'confidence'], properties: {
            execute: { type: 'boolean' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            blocking_flags: { type: 'array', items: { type: 'string' } },
            intelligence_summary: { type: 'object', properties: { ticker: { type: 'string' }, decision: { type: 'string' }, overall_score: { type: 'number' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, risk_level: { type: 'string' } } },
            recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
            chain_to: { type: 'array', items: { type: 'string' } },
            privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
          } } } } } },
        },
      },
    },
  });
});

export default router;
