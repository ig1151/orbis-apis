import { Router, Request, Response } from 'express';
const router = Router();
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Stablecoin Yield API',
      version: '1.0.0',
      description: 'Find the best stablecoin yield opportunities across 500+ DeFi protocols. Powered by DeFiLlama data.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/top': 0.002, '/best': 0.002, '/rates': 0.002, '/compare': 0.002 },
      disclaimer: 'For informational purposes only. Not financial advice. DeFi protocols carry smart contract risk.',
      execution_gate_required: true,
      paper_mode_recommended: true,
      privacy: { data_stored: false, retention: 'none' },
    
    'x-human-approval-required': false,},
    servers: [{ url: 'https://orbis-apis.onrender.com/stablecoin-yield' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/top': { get: { operationId: 'getTopYields', summary: 'Get top stablecoin yield opportunities with AI recommendation', 'x-agent-callable': true,
        parameters: [
          { name: 'token', in: 'query', required: false, schema: { type: 'string', enum: ['USDC', 'USDT', 'DAI'], default: 'USDC' } },
          { name: 'chain', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'minTvl', in: 'query', required: false, schema: { type: 'number', default: 5000000 } },
          { name: 'riskTolerance', in: 'query', required: false, schema: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' } },
        ],
        responses: { '200': { description: 'Top yield pools', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          success: { type: 'boolean' },
          data: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            token: { type: 'string' }, chain: { type: 'string', nullable: true },
            topPools: { type: 'array', items: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
              protocol: { type: 'string' }, chain: { type: 'string' }, symbol: { type: 'string' },
              apy: { type: 'number' }, tvlUsd: { type: 'number' }, riskScore: { type: 'number' },
              apyReward: { type: 'number', nullable: true },
            } } },
            aiRecommendation: { type: 'string' },
            riskAdjustedBest: { type: 'object', nullable: true },
            highestApy: { type: 'object', nullable: true },
            analyzedAt: { type: 'string', format: 'date-time' },
            confidence_per_section: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' }, pools: { type: 'number' }, ai_recommendation: { type: 'number' } } },
            recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
            chain_to: { type: 'array', items: { type: 'string' } },
          } },
          disclaimer: { type: 'string' },
        } } } } } } } },
      '/best': { get: { operationId: 'getBestYield', summary: 'Get risk-adjusted best yield recommendation', 'x-agent-callable': true,
        parameters: [
          { name: 'token', in: 'query', schema: { type: 'string', default: 'USDC' } },
          { name: 'chain', in: 'query', schema: { type: 'string' } },
          { name: 'riskTolerance', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' } },
        ],
        responses: { '200': { description: 'Best yield recommendation', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          success: { type: 'boolean' },
          data: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            token: { type: 'string' }, chain: { type: 'string', nullable: true },
            riskAdjustedBest: { type: 'object', nullable: true, properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
              protocol: { type: 'string' }, chain: { type: 'string' },
              apy: { type: 'number' }, tvlUsd: { type: 'number' }, riskScore: { type: 'number' },
            } },
            highestApy: { type: 'object', nullable: true, properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' }, protocol: { type: 'string' }, apy: { type: 'number' } } },
            aiRecommendation: { type: 'string' },
            confidence_per_section: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' }, recommendation: { type: 'number' } } },
            recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
            chain_to: { type: 'array', items: { type: 'string' } },
          } },
          disclaimer: { type: 'string' },
        } } } } } } } },
      '/rates': { get: { operationId: 'getRates', summary: 'Get yield rates across protocols', 'x-agent-callable': true,
        parameters: [
          { name: 'token', in: 'query', schema: { type: 'string' } },
          { name: 'chain', in: 'query', schema: { type: 'string' } },
          { name: 'minTvl', in: 'query', schema: { type: 'number' } },
        ],
        responses: { '200': { description: 'Protocol yield rates', content: { 'application/json': { schema: { type: 'object', properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          success: { type: 'boolean' },
          data: { type: 'object', properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            token: { type: 'string' }, chain: { type: 'string', nullable: true },
            pools: { type: 'array', items: { type: 'object', properties: {
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' }, description: 'Ordered list of recommended next actions for the agent' },
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
              protocol: { type: 'string' }, chain: { type: 'string' }, symbol: { type: 'string' },
              apy: { type: 'number' }, tvlUsd: { type: 'number' }, riskScore: { type: 'number' },
            } } },
            count: { type: 'integer' }, analyzedAt: { type: 'string', format: 'date-time' },
          } },
          disclaimer: { type: 'string' },
        } } } } } } } },
      '/compare': { get: { operationId: 'compareYields', summary: 'Compare yields across stablecoins side by side', 'x-agent-callable': true,
        responses: { '200': { description: 'Yield comparison', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          success: { type: 'boolean' },
          data: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            stablecoins: { type: 'array', items: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
              token: { type: 'string' }, best_apy: { type: 'number' }, best_protocol: { type: 'string' },
              pool_count: { type: 'integer' }, avg_apy: { type: 'number' },
            } } },
            winner: { type: 'string' },
            confidence_per_section: { type: 'object' },
            chain_to: { type: 'array', items: { type: 'string' } },
          } },
          disclaimer: { type: 'string' },
        } } } } } } } },
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate yield deployment based on protocol risk and TVL confidence', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['protocol', 'token', 'amount'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          protocol: { type: 'string' }, token: { type: 'string' }, amount: { type: 'number' },
          max_risk_score: { type: 'number', default: 50 }, min_tvl: { type: 'number', default: 5000000 },
        } } } } },
        responses: { '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          execute: { type: 'boolean' }, confidence: { type: 'number', minimum: 0, maximum: 1 },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } }, disclaimer: { type: 'string' },
        } } } } } } } },
    },
  });
});
router.get('/docs', (_req: Request, res: Response) => {
  res.send("<h1>Stablecoin Yield API Docs</h1><p><a href='/stablecoin-yield/openapi.json'>OpenAPI Spec</a></p>");
});
router.get('/', (_req, res) => res.json({ name: 'stablecoin-yield', health: 'ok' }));
export default router;
