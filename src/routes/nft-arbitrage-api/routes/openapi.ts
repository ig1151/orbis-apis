import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const chain_to = { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } };
const traceFields = { trace_id: { type: 'string' }, computed_at: { type: 'string', format: 'date-time' }, success: { type: 'boolean' } };

const MARKETPLACE_ENUM = ['opensea', 'blur', 'looksrare', 'x2y2'];
const CHAIN_ENUM = ['ethereum', 'polygon'];
const RARITY_TIER_ENUM = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const LIQUIDITY_RISK_ENUM = ['low', 'medium', 'high'];
const URGENCY_ENUM = ['immediate', 'building', 'fading'];

const marketplaceFloorItem = {
  type: 'object', properties: {
    marketplace: { type: 'string', enum: MARKETPLACE_ENUM },
    floor_price_eth: { type: 'number' }, floor_price_usd: { type: 'number' },
    listing_count: { type: 'integer' }, marketplace_fee_pct: { type: 'number' },
    royalty_pct: { type: 'number' }, total_cost_pct: { type: 'number' }, volume_24h_eth: { type: 'number' },
  },
};

const discoverySchema = {
  type: 'object', properties: {
    name: { type: 'string' }, version: { type: 'string' }, description: { type: 'string' },
    docs_url: { type: 'string', format: 'uri' }, openapi_url: { type: 'string', format: 'uri' },
    health: { type: 'string' },
    auth: { type: 'object', properties: { type: { type: 'string' }, header: { type: 'string' }, docs: { type: 'string' } } },
    endpoints: { type: 'array', items: { type: 'object', properties: { method: { type: 'string' }, path: { type: 'string' }, summary: { type: 'string' }, price_usdc: { type: 'number' } } } },
    pricing: { type: 'object', properties: { free_tier: { type: 'object', properties: { requests_per_day: { type: 'integer' }, requests_per_month: { type: 'integer' } } }, pay_per_call: { type: 'object', additionalProperties: { type: 'string' } } } },
    agent_capabilities: { type: 'array', items: { type: 'string' } },
    x402_compatible: { type: 'boolean' }, paper_mode_recommended: { type: 'boolean' },
    'x-paper-mode-recommended': { type: 'boolean' },
    'x-execution-gate-required': { type: 'boolean' },
    'x-human-approval-required': { type: 'boolean' },
    'x-latency-tier': { type: 'string' },
    execution_modes: { type: 'array', items: { type: 'string' } },
    chain_to: { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, reason: { type: 'string' } } } },
  },
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'NFT Arbitrage API',
      version: '1.0.0',
      description: 'NFT floor price and individual item price gaps across OpenSea, Blur, LooksRare, and X2Y2 — arbitrage from marketplace fee differences and price discovery lag.',
      'x-agent-callable': true, 'x-mcp-compatible': true,
      'x-human-approval-required': false, 'x-execution-gate-required': false,
      'x-paper-mode-recommended': true, 'x402-compatible': true,
      'x-agent-marketplace-ready': true, 'x-pay-per-call-optimized': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { scan: '$0.005', opportunities: '$0.005', lookup: '$0.015' } },
      'x-financial-disclaimer': 'For informational purposes only. Not financial advice. Verify independently before use in trading workflows.',
      'x-latency-tier': 'near-real-time',
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/nft-arbitrage' }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'nftArbitrageDiscovery',
          summary: 'API discovery — name, version, endpoints, pricing, auth, agent capabilities',
          security: [],
          responses: { '200': { description: 'Full discovery payload', content: { 'application/json': { schema: discoverySchema } } } },
        },
      },
      '/scan': {
        post: {
          operationId: 'nftArbitrageScan',
          summary: 'Floor price spread scan across NFT marketplaces for a collection',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['collection'],
                  properties: {
                    collection: { type: 'string', description: 'Collection slug or contract address (e.g. boredapeyachtclub)' },
                    chain: { type: 'string', default: 'ethereum', enum: CHAIN_ENUM },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'NFT floor price spread across marketplaces with arb viability',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      collection: { type: 'string' }, chain: { type: 'string', enum: CHAIN_ENUM },
                      marketplace_floors: { type: 'array', items: marketplaceFloorItem },
                      best_buy_marketplace: { type: 'string', enum: MARKETPLACE_ENUM },
                      best_sell_marketplace: { type: 'string', enum: MARKETPLACE_ENUM },
                      floor_spread_pct: { type: 'number' }, estimated_profit_eth: { type: 'number' },
                      marketplace_fees_pct: { type: 'number' }, arb_viable: { type: 'boolean' },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions,
                      chain_to, privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing collection' }, '500': { description: 'Internal error' },
          },
        },
      },
      '/opportunities': {
        post: {
          operationId: 'nftArbitrageOpportunities',
          summary: 'Market-wide NFT arb opportunities ranked by estimated profit',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    min_spread_pct: { type: 'number', default: 2.0, minimum: 0.5, description: 'Minimum floor spread percentage to surface' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Market-wide NFT arb opportunities with profit estimates',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      min_spread_pct: { type: 'number' },
                      opportunities: {
                        type: 'array', items: {
                          type: 'object', properties: {
                            collection: { type: 'string' }, collection_address: { type: 'string' },
                            chain: { type: 'string', enum: CHAIN_ENUM },
                            buy_marketplace: { type: 'string', enum: MARKETPLACE_ENUM },
                            sell_marketplace: { type: 'string', enum: MARKETPLACE_ENUM },
                            buy_floor_eth: { type: 'number' }, sell_floor_eth: { type: 'number' },
                            floor_spread_pct: { type: 'number' }, estimated_profit_eth: { type: 'number' },
                            estimated_profit_usd: { type: 'number' }, liquidity_score: { type: 'number' },
                            gas_estimate_eth: { type: 'number' }, net_profit_after_gas_eth: { type: 'number' },
                            urgency: { type: 'string', enum: URGENCY_ENUM },
                          },
                        },
                      },
                      market_overview: {
                        type: 'object', properties: {
                          total_opportunities: { type: 'integer' }, best_collection: { type: 'string' },
                          avg_spread_pct: { type: 'number' }, best_net_profit_eth: { type: 'number' },
                        },
                      },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions,
                      chain_to, privacy,
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
          operationId: 'nftArbitrageLookup',
          summary: 'ONE-CALL: full NFT arb with item analysis, rarity, gas, and liquidity risk',
          'x-one-call': true,
          'x-execution-gate-required': true,
          'x-human-approval-required': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object', required: ['collection'],
                  properties: {
                    collection: { type: 'string', description: 'Collection slug or contract address' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full NFT arb intelligence with item, rarity, gas, and liquidity analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ...traceFields,
                      collection: { type: 'string' },
                      best_opportunity: {
                        type: 'object', properties: {
                          buy_marketplace: { type: 'string', enum: MARKETPLACE_ENUM },
                          sell_marketplace: { type: 'string', enum: MARKETPLACE_ENUM },
                          buy_floor_eth: { type: 'number' }, sell_floor_eth: { type: 'number' },
                          floor_spread_pct: { type: 'number' }, marketplace_fees_pct: { type: 'number' },
                          estimated_profit_eth: { type: 'number' },
                        },
                      },
                      item_analysis: {
                        type: 'object', properties: {
                          best_item_for_arb: { type: 'string' }, item_price_eth: { type: 'number' },
                          rarity_rank: { type: 'integer' }, rarity_tier: { type: 'string', enum: RARITY_TIER_ENUM },
                          rarity_premium_pct: { type: 'number' }, listing_freshness_seconds: { type: 'number' },
                          estimated_resale_time_hours: { type: 'number' },
                        },
                      },
                      rarity_adjustment: {
                        type: 'object', properties: {
                          floor_item_spread_pct: { type: 'number' }, rarity_adjusted_spread_pct: { type: 'number' },
                          rarity_increases_profit: { type: 'boolean' }, note: { type: 'string' },
                        },
                      },
                      gas_estimate: {
                        type: 'object', properties: {
                          buy_gas_eth: { type: 'number' }, sell_gas_eth: { type: 'number' },
                          total_gas_eth: { type: 'number' }, total_gas_usd: { type: 'number' },
                          net_profit_after_gas_eth: { type: 'number' },
                        },
                      },
                      liquidity_risk: {
                        type: 'object', properties: {
                          collection_volume_24h_eth: { type: 'number' }, avg_time_to_sell_hours: { type: 'number' },
                          bid_depth_eth: { type: 'number' },
                          liquidity_risk_level: { type: 'string', enum: LIQUIDITY_RISK_ENUM },
                          illiquidity_risk: { type: 'string' },
                        },
                      },
                      reasoning: {
                        type: 'object', properties: {
                          why_signal_generated: { type: 'string' },
                          key_factors: { type: 'array', items: { type: 'string' } },
                          invalidators: { type: 'array', items: { type: 'string' } },
                        },
                      },
                      latency_ms: { type: 'number', description: 'Signal computation time in milliseconds' },
                      financial_disclaimer: { type: 'string' }, paper_mode_recommended: { type: 'boolean' },
                      confidence_per_section: confidence, recommended_actions_priority_order: actions,
                      chain_to, privacy,
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
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
    },
  });
});

export default router;
