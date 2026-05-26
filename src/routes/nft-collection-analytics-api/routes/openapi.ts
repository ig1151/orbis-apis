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

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'NFT Collection Analytics API', version: '1.0.0',
      description: 'Analyze NFT collection floor price, volume, holder distribution, whale activity, and market cycle stage. Surface trending collections and investment signals for NFT trading agents.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { collection: '$0.003', trending: '$0.004', lookup: '$0.008' } },
      'x-financial-disclaimer': 'For informational purposes only. NFT markets are highly speculative. Not financial advice.',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/nft-collection-analytics' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'nftCollectionDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, capabilities',
          security: [],
          responses: { '200': { description: 'Discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/collection': {
        post: {
          operationId: 'nftCollection',
          summary: 'Floor price, volume, holder metrics, and supply data for an NFT collection',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['collection'], properties: { collection: { type: 'string', description: 'Collection name or contract address (e.g. Bored Ape Yacht Club, CryptoPunks)' }, chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'base', 'polygon', 'solana'] } } } } },
          },
          responses: {
            '200': {
              description: 'NFT collection metrics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, collection: { type: 'string' }, chain: { type: 'string' },
                      floor_price: { type: 'object', properties: { eth: { type: 'number' }, usd: { type: 'number' }, '24h_change_pct': { type: 'number' }, '7d_change_pct': { type: 'number' }, '30d_change_pct': { type: 'number' }, all_time_high_eth: { type: 'number' } } },
                      volume: { type: 'object', properties: { '24h_usd': { type: 'number' }, '7d_usd': { type: 'number' }, '30d_usd': { type: 'number' }, total_usd: { type: 'number' }, trend: { type: 'string', enum: ['rising', 'falling', 'stable'] } } },
                      holders: { type: 'object', properties: { total: { type: 'integer' }, unique: { type: 'integer' }, top_10_pct_supply: { type: 'number' }, whale_count: { type: 'integer' }, avg_items_per_holder: { type: 'number' }, distribution_score: { type: 'number' } } },
                      supply: { type: 'object', properties: { total: { type: 'integer' }, listed: { type: 'integer' }, listed_pct: { type: 'number' } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing collection' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/trending': {
        post: {
          operationId: 'nftTrending',
          summary: 'Trending NFT collections ranked by volume momentum',
          requestBody: {
            required: false,
            content: { 'application/json': { schema: { type: 'object', properties: { chain: { type: 'string', default: 'ethereum' }, category: { type: 'string', description: 'Filter by category (art, gaming, pfp, utility)' }, limit: { type: 'integer', default: 10, minimum: 1, maximum: 50 } } } } },
          },
          responses: {
            '200': {
              description: 'Trending collections with momentum scores',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, chain: { type: 'string' }, category: { type: 'string' },
                      trending: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            collection: { type: 'string' }, floor_eth: { type: 'number' }, floor_usd: { type: 'number' },
                            '24h_volume_usd': { type: 'number' }, '24h_floor_change_pct': { type: 'number' },
                            momentum_score: { type: 'number', minimum: 0, maximum: 100 },
                            trend: { type: 'string', enum: ['exploding', 'rising', 'stable', 'cooling'] },
                            category: { type: 'string' }, notable: { type: 'string' },
                          },
                        },
                      },
                      market_summary: { type: 'object', properties: { overall_nft_sentiment: { type: 'string', enum: ['hot', 'warm', 'cool', 'cold'] }, dominant_category: { type: 'string' }, avg_volume_change_24h_pct: { type: 'number' } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
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
          operationId: 'nftLookup',
          summary: 'ONE-CALL: full collection intelligence with cycle stage and investment signal',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['collection'], properties: { collection: { type: 'string' }, chain: { type: 'string', default: 'ethereum' } } } } },
          },
          responses: {
            '200': {
              description: 'Complete NFT collection intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields, collection: { type: 'string' }, chain: { type: 'string' },
                      market_metrics: { type: 'object', properties: { floor_eth: { type: 'number' }, floor_usd: { type: 'number' }, '24h_volume_usd': { type: 'number' }, '30d_volume_usd': { type: 'number' }, 'floor_7d_change_pct': { type: 'number' } } },
                      holder_analysis: { type: 'object', properties: { total_holders: { type: 'integer' }, top_10_pct_supply: { type: 'number' }, whale_activity: { type: 'string', enum: ['accumulating', 'distributing', 'holding'] }, distribution_health: { type: 'string', enum: ['healthy', 'concentrated', 'risky'] } } },
                      market_cycle: { type: 'object', properties: { stage: { type: 'string', enum: ['discovery', 'accumulation', 'hype', 'distribution', 'decline', 'dormant'] }, momentum: { type: 'string', enum: ['rising', 'peaking', 'falling', 'bottoming'] }, cycle_note: { type: 'string' } } },
                      investment_signal: { type: 'object', properties: { signal: { type: 'string', enum: ['strong_buy', 'buy', 'neutral', 'sell', 'avoid'] }, conviction: { type: 'string', enum: ['high', 'medium', 'low'] }, rationale: { type: 'string' }, key_risk: { type: 'string' }, entry_note: { type: 'string' } } },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions, chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing collection' }, '500': { description: 'Internal error' },
          },
        },
      },
    },
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
  });
});

export default router;
