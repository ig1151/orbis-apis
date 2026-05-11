import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Shopify Analyzer API',
      version: '1.0.0',
      description: 'AI-powered Shopify store analysis, product intelligence, conversion optimization and ecommerce growth signals for autonomous agents',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { '/analyze': 0.008, '/seo-audit': 0.005, '/pricing-strategy': 0.005, '/ad-intelligence': 0.006, '/growth-signals': 0.005, '/execution-gate': 0.002, '/analyze-shopify-store': 0.02 },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/shopify-analyzer' }],
    security: [{ ApiKeyAuth: [] }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    paths: {
      '/': { get: { summary: 'API discovery', operationId: 'discovery', responses: { '200': { description: 'API info' } } } },
      '/analyze-store': {
        post: {
          operationId: 'analyzeStore',
          summary: 'Full store analysis with market position, strengths, weaknesses and growth potential',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url'], properties: { store_url: { type: 'string' }, niche: { type: 'string' }, competitors: { type: 'array', items: { type: 'string' }, maxItems: 3 } } } } } },
          responses: {
            '200': {
              description: 'Store analysis result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                store_url: { type: 'string' },
                store_overview: { type: 'object', properties: { niche: { type: 'string' }, maturity: { type: 'string', enum: ['new','growing','established'] }, estimated_monthly_revenue: { type: 'string' }, brand_strength: { type: 'number' } } },
                strengths: actions,
                weaknesses: actions,
                market_position: { type: 'object', properties: { score: { type: 'number' }, positioning: { type: 'string' }, differentiation: { type: 'string' } } },
                growth_potential: { type: 'object', properties: { score: { type: 'number' }, primary_opportunity: { type: 'string' }, estimated_upside: { type: 'string' } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing store_url' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/product-intelligence': {
        post: {
          operationId: 'productIntelligence',
          summary: 'Product demand, pricing, listing quality and upsell opportunities',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['product_name','category'], properties: { product_name: { type: 'string' }, category: { type: 'string' }, price_point: { type: 'string' }, store_url: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Product intelligence result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                product_name: { type: 'string' },
                market_demand: { type: 'object', properties: { score: { type: 'number' }, trend: { type: 'string', enum: ['rising','stable','declining'] }, seasonality: { type: 'string' } } },
                pricing_analysis: { type: 'object', properties: { current: { type: 'string' }, recommended: { type: 'string' }, competitor_range: { type: 'string' }, price_sensitivity: { type: 'string', enum: ['low','medium','high'] } } },
                listing_quality: { type: 'object', properties: { score: { type: 'number' }, title_score: { type: 'number' }, description_score: { type: 'number' }, image_recommendations: actions } },
                upsell_opportunities: { type: 'array', items: { type: 'object', properties: { product: { type: 'string' }, relevance: { type: 'number' }, revenue_impact: { type: 'string' } } } },
                winning_factors: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing product_name or category' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/conversion-audit': {
        post: {
          operationId: 'conversionAudit',
          summary: 'CVR benchmark, conversion killers, checkout friction and trust signal gaps',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url'], properties: { store_url: { type: 'string' }, current_cvr: { type: 'string' }, traffic_source: { type: 'string' }, niche: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Conversion audit result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                store_url: { type: 'string' },
                cvr_benchmark: { type: 'object', properties: { industry_avg: { type: 'string' }, top_quartile: { type: 'string' }, gap: { type: 'string' } } },
                conversion_killers: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, impact: { type: 'string', enum: ['high','medium','low'] }, fix: { type: 'string' } } } },
                checkout_friction: { type: 'array', items: { type: 'object', properties: { friction_point: { type: 'string' }, severity: { type: 'string', enum: ['critical','high','medium'] }, solution: { type: 'string' } } } },
                trust_signals: { type: 'object', properties: { score: { type: 'number' }, missing: actions, quick_wins: actions } },
                mobile_experience: { type: 'object', properties: { score: { type: 'number' }, issues: actions, priority_fixes: actions } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing store_url' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/competitor-stores': {
        post: {
          operationId: 'competitorStores',
          summary: 'Competitive landscape, top competitors and exploitable market gaps',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url','niche'], properties: { store_url: { type: 'string' }, niche: { type: 'string' }, price_range: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Competitor stores result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                store_url: { type: 'string' },
                competitive_landscape: { type: 'object', properties: { density: { type: 'string', enum: ['low','medium','high','saturated'] }, avg_competitor_rating: { type: 'number' }, market_maturity: { type: 'string', enum: ['emerging','growing','mature'] } } },
                top_competitors: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, strengths: actions, weaknesses: actions, est_revenue: { type: 'string' }, threat_level: { type: 'string', enum: ['high','medium','low'] } } } },
                gaps_to_exploit: { type: 'array', items: { type: 'object', properties: { gap: { type: 'string' }, opportunity_size: { type: 'string' }, difficulty: { type: 'string', enum: ['easy','medium','hard'] } } } },
                competitive_advantages: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing store_url or niche' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/seo-audit': {
        post: {
          operationId: 'seoAudit',
          summary: 'Shopify SEO score, technical issues, content gaps and collection optimization',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url'], properties: { store_url: { type: 'string' }, niche: { type: 'string' }, target_keywords: { type: 'array', items: { type: 'string' }, maxItems: 5 } } } } } },
          responses: {
            '200': {
              description: 'SEO audit result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                store_url: { type: 'string' },
                seo_score: { type: 'number' },
                technical_issues: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, priority: { type: 'string', enum: ['critical','high','medium'] }, fix: { type: 'string' } } } },
                content_gaps: { type: 'array', items: { type: 'object', properties: { keyword: { type: 'string' }, volume: { type: 'string' }, difficulty: { type: 'number' }, page_needed: { type: 'string' } } } },
                collection_optimization: { type: 'array', items: { type: 'object', properties: { collection: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } } } },
                schema_opportunities: actions,
                backlink_strategy: { type: 'object', properties: { current_estimate: { type: 'string' }, target: { type: 'string' }, top_sources: actions } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing store_url' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/pricing-strategy': {
        post: {
          operationId: 'pricingStrategy',
          summary: 'Pricing model, bundle opportunities, discount strategy and psychological pricing',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['products','niche'], properties: { products: { type: 'array', items: { type: 'object' } }, niche: { type: 'string' }, business_model: { type: 'string' }, target_margin: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Pricing strategy result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                pricing_model: { type: 'object', properties: { recommended: { type: 'string' }, rationale: { type: 'string' } } },
                product_pricing: { type: 'array', items: { type: 'object', properties: { product: { type: 'string' }, current: { type: 'string' }, recommended: { type: 'string' }, reasoning: { type: 'string' } } } },
                bundle_opportunities: { type: 'array', items: { type: 'object', properties: { bundle: { type: 'string' }, price: { type: 'string' }, margin_impact: { type: 'string' }, conversion_lift: { type: 'string' } } } },
                discount_strategy: { type: 'object', properties: { recommended_discount_depth: { type: 'string' }, frequency: { type: 'string' }, urgency_tactics: actions } },
                psychological_pricing: { type: 'array', items: { type: 'object', properties: { tactic: { type: 'string' }, example: { type: 'string' }, impact: { type: 'string' } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing products or niche' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/ad-intelligence': {
        post: {
          operationId: 'adIntelligence',
          summary: 'Channel recommendations, audience segments, creative angles and budget allocation',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url','niche'], properties: { store_url: { type: 'string' }, niche: { type: 'string' }, budget: { type: 'string' }, current_roas: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Ad intelligence result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                store_url: { type: 'string' },
                channel_recommendations: { type: 'array', items: { type: 'object', properties: { channel: { type: 'string' }, priority: { type: 'string', enum: ['high','medium','low'] }, estimated_roas: { type: 'string' }, rationale: { type: 'string' } } } },
                audience_segments: { type: 'array', items: { type: 'object', properties: { segment: { type: 'string' }, size: { type: 'string' }, cpm_estimate: { type: 'string' }, conversion_rate: { type: 'string' } } } },
                creative_angles: { type: 'array', items: { type: 'object', properties: { angle: { type: 'string' }, format: { type: 'string' }, hook: { type: 'string' } } } },
                budget_allocation: { type: 'array', items: { type: 'object', properties: { channel: { type: 'string' }, percentage: { type: 'number' }, rationale: { type: 'string' } } } },
                retargeting_strategy: { type: 'object', properties: { segments: actions, window_days: { type: 'number' }, message_sequence: actions } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing store_url or niche' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/growth-signals': {
        post: {
          operationId: 'growthSignals',
          summary: 'Growth score, top levers, expansion opportunities and retention signals',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url'], properties: { store_url: { type: 'string' }, niche: { type: 'string' }, current_revenue: { type: 'string' }, goals: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Growth signals result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                store_url: { type: 'string' },
                growth_score: { type: 'number' },
                top_growth_levers: { type: 'array', items: { type: 'object', properties: { lever: { type: 'string' }, impact: { type: 'string', enum: ['high','medium','low'] }, effort: { type: 'string', enum: ['low','medium','high'] }, timeline: { type: 'string' } } } },
                expansion_opportunities: { type: 'array', items: { type: 'object', properties: { opportunity: { type: 'string' }, type: { type: 'string', enum: ['product','market','channel','model'] }, revenue_potential: { type: 'string' } } } },
                retention_signals: { type: 'object', properties: { score: { type: 'number' }, ltv_estimate: { type: 'string' }, churn_risks: actions, loyalty_tactics: actions } },
                scaling_readiness: { type: 'object', properties: { score: { type: 'number' }, blockers: actions, enablers: actions } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing store_url' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check with blocking flags and next API chaining',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url'], properties: { store_url: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Execution gate result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                execution_ready: { type: 'boolean' },
                store_url: { type: 'string' },
                objective: { type: 'string' },
                next_api: { type: 'string' },
                next_endpoint: { type: 'string' },
                blocking_flags: { type: 'array', items: { type: 'string' } },
                flag_definitions: { type: 'object', additionalProperties: { type: 'string' } },
                confidence_per_section: confidence,
                privacy,
              } } } },
            },
            '400': { description: 'Missing store_url' }, '500': { description: 'Gate check failed' },
          },
        },
      },
      '/analyze-shopify-store': {
        post: {
          operationId: 'analyzeShopifyStore',
          summary: 'ONE-CALL: full Shopify workflow — store health, issues, growth levers, ads, quick wins and 90-day plan',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['store_url'], properties: { store_url: { type: 'string' }, niche: { type: 'string' }, budget: { type: 'string' }, competitors: { type: 'array', items: { type: 'string' }, maxItems: 3 }, goals: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Full Shopify store analysis report',
              content: { 'application/json': { schema: { type: 'object', properties: {
                store_url: { type: 'string' },
                executive_summary: { type: 'object', properties: { overall_score: { type: 'number' }, grade: { type: 'string' }, top_priority: { type: 'string' }, revenue_opportunity: { type: 'string' } } },
                store_health: { type: 'object', properties: { conversion_score: { type: 'number' }, seo_score: { type: 'number' }, brand_score: { type: 'number' }, product_score: { type: 'number' } } },
                top_issues: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, impact: { type: 'string', enum: ['high','medium','low'] }, fix: { type: 'string' } } } },
                growth_levers: { type: 'array', items: { type: 'object', properties: { lever: { type: 'string' }, impact: { type: 'string' }, effort: { type: 'string' } } } },
                competitive_position: { type: 'object', properties: { score: { type: 'number' }, key_gaps: actions, advantages: actions } },
                ad_recommendations: { type: 'array', items: { type: 'object', properties: { channel: { type: 'string' }, priority: { type: 'string' }, budget_allocation: { type: 'string' } } } },
                quick_wins: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, revenue_impact: { type: 'string' }, effort: { type: 'string' } } } },
                '90_day_plan': { type: 'array', items: { type: 'object', properties: { phase: { type: 'number' }, action: { type: 'string' }, timeline: { type: 'string' }, expected_outcome: { type: 'string' } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing store_url' }, '500': { description: 'Analysis failed' },
          },
        },
      },
    },
  });
});

export default router;
