import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'string' } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const floorSchema = {
  type: 'object', properties: {
    price_eth: { type: 'number', nullable: true }, price_usd: { type: 'number' },
    change_24h_pct: { type: 'number' }, change_7d_pct: { type: 'number' },
    ath_usd: { type: 'number' }, ath_date: { type: 'string', format: 'date' }, atl_usd: { type: 'number' },
  },
};

const volumeSchema = {
  type: 'object', properties: {
    volume_24h_eth: { type: 'number', nullable: true }, volume_24h_usd: { type: 'number' },
    volume_7d_usd: { type: 'number' }, sales_24h: { type: 'integer' },
  },
};

const marketSchema = {
  type: 'object', properties: {
    total_supply: { type: 'integer' }, owners: { type: 'integer' },
    unique_owners_pct: { type: 'number' }, listed_pct: { type: 'number' }, market_cap_usd: { type: 'number' },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'NFT Floor Price API',
      version: '1.0.0',
      description: 'NFT collection floor prices, volume, market data, and risk signals. Supports collection comparison and full intelligence including wash trading detection for NFT trading agents and portfolio trackers.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-human-approval-required': false,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { floor: '$0.003', compare: '$0.004', lookup: '$0.006' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice.',
      'x-paper-mode-recommended': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/nft-floor-price' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: { operationId: 'nftDiscovery', summary: 'API discovery', security: [], responses: { '200': { description: 'Discovery info' } } },
      },
      '/floor': {
        post: {
          operationId: 'nftFloor',
          summary: 'NFT floor price — current price, 24h/7d change, volume, supply, listed%, and signal',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['collection'], properties: { collection: { type: 'string', example: 'Bored Ape Yacht Club', description: 'Collection name or contract address' }, chain: { type: 'string', default: 'ethereum', enum: ['ethereum', 'polygon', 'solana', 'base'] } } } } } },
          responses: {
            '200': {
              description: 'Floor price, volume, market stats, and trade signal',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      collection: { type: 'string' }, chain: { type: 'string' },
                      floor: floorSchema, volume: volumeSchema, market: marketSchema,
                      signal: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
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
            '400': { description: 'Missing collection' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/compare': {
        post: {
          operationId: 'nftCompare',
          summary: 'Compare floor prices across up to 10 NFT collections — ranked by floor, volume, market cap',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['collections'], properties: { collections: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 10 }, chain: { type: 'string', default: 'ethereum' } } } } } },
          responses: {
            '200': {
              description: 'Ranked comparison with best value and momentum picks',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      chain: { type: 'string' },
                      results: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            collection: { type: 'string' }, floor_usd: { type: 'number' },
                            change_24h_pct: { type: 'number' }, volume_24h_usd: { type: 'number' },
                            market_cap_usd: { type: 'number' }, rank: { type: 'integer' },
                          },
                        },
                      },
                      best_value: { type: 'string' }, strongest_momentum: { type: 'string' },
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
            '400': { description: 'Invalid input' },
            '500': { description: 'Internal error' },
          },
        },
      },
      '/lookup': {
        post: {
          operationId: 'nftLookup',
          summary: 'ONE-CALL: floor + volume + market + rarity + wash trading risk + investment grade',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['collection'], properties: { collection: { type: 'string' }, chain: { type: 'string', default: 'ethereum' } } } } } },
          responses: {
            '200': {
              description: 'Full NFT collection intelligence with investment grade',
              content: {
                'application/json': {
                  schema: {
                    type: 'object', properties: {
                      ...traceFields,
                      collection: { type: 'string' }, chain: { type: 'string' },
                      floor: floorSchema, volume: volumeSchema, market: marketSchema,
                      rarity: { type: 'object', properties: { trait_count: { type: 'integer', nullable: true }, rarest_trait: { type: 'string', nullable: true } } },
                      risk: {
                        type: 'object', properties: {
                          wash_trading_suspected: { type: 'boolean' },
                          whale_concentration_pct: { type: 'number' },
                          risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
                        },
                      },
                      signal: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                      investment_grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
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
            '400': { description: 'Missing collection' },
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
