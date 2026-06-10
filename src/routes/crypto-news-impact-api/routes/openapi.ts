import { Router, Request, Response } from 'express';
const router = Router();
router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Crypto News Impact API',
      version: '1.0.0',
      description: 'Analyze the market impact of crypto news articles using AI. Returns directional bias, impact score, affected assets and trading signal.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/analyze': 0.005 },
      disclaimer: 'For informational purposes only. Not financial advice.',
      execution_gate_required: true,
      privacy: { data_stored: false, retention: 'none' },
    
    'x-human-approval-required': false,},
    servers: [{ url: 'https://orbis-apis.onrender.com/crypto-news-impact' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/analyze': { post: { operationId: 'analyzeNewsImpact', summary: 'Analyze market impact of crypto news articles', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['asset', 'articles'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          asset: { type: 'string', description: 'Crypto asset symbol e.g. BTC, ETH' },
          topic: { type: 'string', description: 'Optional topic context' },
          articles: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'object', required: ['title'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            title: { type: 'string', minLength: 1, maxLength: 500 },
            source: { type: 'string', maxLength: 100 },
            published_at: { type: 'string', format: 'date-time' },
            url: { type: 'string', format: 'uri' },
            body: { type: 'string', maxLength: 5000 },
          }}},
        }}}}},
        responses: { '200': { description: 'News impact analysis', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          asset: { type: 'string' },
          impact_score: { type: 'number', minimum: -100, maximum: 100, description: 'Impact score: positive=bullish, negative=bearish' },
          direction: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
          magnitude: { type: 'string', enum: ['high', 'medium', 'low'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          key_themes: { type: 'array', items: { type: 'string' } },
          affected_assets: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' },
          source_credibility: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
            score: { type: 'number', minimum: 0, maximum: 1 },
            sources_analyzed: { type: 'integer' },
            verified_sources: { type: 'integer' },
          }},
          confidence_per_section: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
            impact: { type: 'number' }, direction: { type: 'number' }, credibility: { type: 'number' },
          }},
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          disclaimer: { type: 'string' },
        }}}}}}}},
      '/execution-gate': { post: { operationId: 'executionGate', summary: 'Gate trading action based on news impact analysis', 'x-agent-callable': true,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['asset', 'articles', 'intended_action'], properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          asset: { type: 'string' },
          articles: { type: 'array', items: { type: 'object' } },
          intended_action: { type: 'string', enum: ['buy', 'sell', 'hold'] },
          min_confidence: { type: 'number', default: 0.7, minimum: 0, maximum: 1 },
        }}}}},
        responses: { '200': { description: 'Execution gate decision', content: { 'application/json': { schema: { type: 'object', properties: {
          privacy: { type: 'object', description: 'Privacy metadata for this response' },
          confidence_per_section: { type: 'object', description: 'Per-section confidence scores (0-1)' },
          execute: { type: 'boolean' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          blocking_flags: { type: 'array', items: { type: 'string' } },
          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
          chain_to: { type: 'array', items: { type: 'string' } },
          disclaimer: { type: 'string' },
        }}}}}}}},
    },
  });
});
export default router;
