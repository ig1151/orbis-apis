import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Shopify Analyzer API',
      version: '1.0.0',
      description: 'AI-powered Shopify store analysis, product intelligence, conversion optimization and ecommerce growth signals for autonomous agents',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/shopify-analyzer' }],
    paths: {
      '/analyze-store': {
        post: {
          operationId: 'analyzeStore',
          summary: 'Full store analysis with market position, strengths, weaknesses and growth potential',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url'], properties: { store_url: { type: 'string' }, niche: { type: 'string' }, competitors: { type: 'array', items: { type: 'string' }, maxItems: 3 } } } } } },
          responses: { '200': { description: 'Store overview, market position, strengths/weaknesses and growth potential' }, '400': { description: 'Missing store_url' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/product-intelligence': {
        post: {
          operationId: 'productIntelligence',
          summary: 'Product demand, pricing, listing quality and upsell opportunities',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['product_name', 'category'], properties: { product_name: { type: 'string' }, category: { type: 'string' }, price_point: { type: 'string' }, store_url: { type: 'string' } } } } } },
          responses: { '200': { description: 'Market demand, pricing analysis, listing quality and upsell opportunities' }, '400': { description: 'Missing product_name or category' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/conversion-audit': {
        post: {
          operationId: 'conversionAudit',
          summary: 'CVR benchmark, conversion killers, checkout friction and trust signal gaps',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url'], properties: { store_url: { type: 'string' }, current_cvr: { type: 'string' }, traffic_source: { type: 'string' }, niche: { type: 'string' } } } } } },
          responses: { '200': { description: 'CVR benchmarks, conversion killers, checkout friction and trust signals' }, '400': { description: 'Missing store_url' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/competitor-stores': {
        post: {
          operationId: 'competitorStores',
          summary: 'Competitive landscape, top competitors and exploitable market gaps',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url', 'niche'], properties: { store_url: { type: 'string' }, niche: { type: 'string' }, price_range: { type: 'string' } } } } } },
          responses: { '200': { description: 'Competitive landscape, top competitors, gaps and advantages' }, '400': { description: 'Missing store_url or niche' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/seo-audit': {
        post: {
          operationId: 'seoAudit',
          summary: 'Shopify SEO score, technical issues, content gaps and collection optimization',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url'], properties: { store_url: { type: 'string' }, niche: { type: 'string' }, target_keywords: { type: 'array', items: { type: 'string' }, maxItems: 5 } } } } } },
          responses: { '200': { description: 'SEO score, technical issues, content gaps, collection optimization and backlink strategy' }, '400': { description: 'Missing store_url' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/pricing-strategy': {
        post: {
          operationId: 'pricingStrategy',
          summary: 'Pricing model, bundle opportunities, discount strategy and psychological pricing',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['products', 'niche'], properties: { products: { type: 'array', items: { type: 'object' } }, niche: { type: 'string' }, business_model: { type: 'string' }, target_margin: { type: 'string' } } } } } },
          responses: { '200': { description: 'Pricing model, product pricing, bundle opportunities, discount and psychological tactics' }, '400': { description: 'Missing products or niche' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/ad-intelligence': {
        post: {
          operationId: 'adIntelligence',
          summary: 'Channel recommendations, audience segments, creative angles and budget allocation',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url', 'niche'], properties: { store_url: { type: 'string' }, niche: { type: 'string' }, budget: { type: 'string' }, current_roas: { type: 'string' } } } } } },
          responses: { '200': { description: 'Channel recommendations, audience segments, creative angles, budget allocation and retargeting strategy' }, '400': { description: 'Missing store_url or niche' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/growth-signals': {
        post: {
          operationId: 'growthSignals',
          summary: 'Growth score, top levers, expansion opportunities and retention signals',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url'], properties: { store_url: { type: 'string' }, niche: { type: 'string' }, current_revenue: { type: 'string' }, goals: { type: 'string' } } } } } },
          responses: { '200': { description: 'Growth score, levers, expansion opportunities, retention and scaling readiness' }, '400': { description: 'Missing store_url' }, '500': { description: 'Analysis failed' } },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check with blocking flags and next API chaining',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url'], properties: { store_url: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: { '200': { description: 'Execution readiness, blocking flags and next API recommendation' }, '400': { description: 'Missing store_url' }, '500': { description: 'Gate check failed' } },
        },
      },
      '/analyze-shopify-store': {
        post: {
          operationId: 'analyzeShopifyStore',
          summary: 'ONE-CALL: full Shopify workflow — store health, issues, growth levers, ads, quick wins and 90-day plan',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url'], properties: { store_url: { type: 'string' }, niche: { type: 'string' }, budget: { type: 'string' }, competitors: { type: 'array', items: { type: 'string' }, maxItems: 3 }, goals: { type: 'string' } } } } } },
          responses: { '200': { description: 'Full store report: health scores, issues, growth levers, competitive position, quick wins and 90-day plan' }, '400': { description: 'Missing store_url' }, '500': { description: 'Analysis failed' } },
        },
      },
    },
  });
});

export default router;
