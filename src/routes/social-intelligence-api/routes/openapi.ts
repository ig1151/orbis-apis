import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Social Intelligence API',
      version: '1.0.0',
      description: 'AI-powered social media intelligence for autonomous agents — analyze posts, monitor brands, score influencers, detect trends, assess competitors, derive audience insights, predict content performance, map sentiment timelines, evaluate social proof, and gate social actions',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/social-intelligence' }],
    paths: {
      '/analyze-post': {
        post: {
          operationId: 'analyzePost',
          summary: 'Analyze a social media post for sentiment, virality, engagement quality, topic classification, and brand safety',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['post_content'], properties: { post_content: { type: 'string' }, platform: { type: 'string' }, author_handle: { type: 'string' }, engagement_data: { type: 'object' } } } } } },
          responses: {
            '200': {
              description: 'Post analysis result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
                sentiment_score: { type: 'number', minimum: 0, maximum: 1 },
                virality_score: { type: 'number', minimum: 0, maximum: 100 },
                engagement_quality: { type: 'string', enum: ['high', 'medium', 'low'] },
                topics: actions,
                hashtag_suggestions: actions,
                brand_safe: { type: 'boolean' },
                toxicity_score: { type: 'number', minimum: 0, maximum: 1 },
                key_themes: actions,
                audience_resonance: { type: 'string' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing post_content' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/brand-monitor': {
        post: {
          operationId: 'brandMonitor',
          summary: 'Monitor brand presence, reputation, sentiment, and competitive positioning across social platforms',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['brand_name'], properties: { brand_name: { type: 'string' }, competitors: { type: 'array', items: { type: 'string' } }, platforms: { type: 'array', items: { type: 'string' } }, sentiment_threshold: { type: 'number' }, keywords: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Brand monitoring result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                brand_name: { type: 'string' },
                overall_sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
                sentiment_score: { type: 'number', minimum: 0, maximum: 1 },
                mention_volume_estimate: { type: 'number' },
                reputation_score: { type: 'number', minimum: 0, maximum: 100 },
                risk_flags: { type: 'array', items: { type: 'object', properties: { risk: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, recommendation: { type: 'string' } } } },
                competitor_comparison: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, sentiment_score: { type: 'number', minimum: 0, maximum: 1 }, estimated_share: { type: 'number' } } } },
                trending_topics: actions,
                recommended_response: { type: 'string' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing brand_name' }, '500': { description: 'Monitoring failed' },
          },
        },
      },
      '/influencer-score': {
        post: {
          operationId: 'influencerScore',
          summary: 'Score influencer value for brand partnerships — authenticity, engagement quality, audience fit, and brand safety',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['handle', 'platform'], properties: { handle: { type: 'string' }, platform: { type: 'string' }, follower_count: { type: 'number' }, recent_posts: { type: 'array', items: { type: 'object' } }, niche: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Influencer score result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                handle: { type: 'string' },
                platform: { type: 'string' },
                authenticity_score: { type: 'number', minimum: 0, maximum: 100 },
                engagement_quality: { type: 'string', enum: ['high', 'medium', 'low'] },
                estimated_reach_quality: { type: 'string', enum: ['broad', 'niche', 'micro'] },
                brand_fit_score: { type: 'number', minimum: 0, maximum: 100 },
                risk_indicators: actions,
                content_themes: actions,
                audience_demographics: { type: 'object', properties: { age_range: { type: 'string' }, gender_skew: { type: 'string' }, interest_categories: actions } },
                partnership_recommendation: { type: 'string', enum: ['recommended', 'conditional', 'avoid'] },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing handle or platform' }, '500': { description: 'Scoring failed' },
          },
        },
      },
      '/trend-detect': {
        post: {
          operationId: 'trendDetect',
          summary: 'Detect trending topics, hashtags, and emerging conversations in an industry or niche',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['industry'], properties: { industry: { type: 'string' }, region: { type: 'string' }, time_window: { type: 'string' }, platforms: { type: 'array', items: { type: 'string' } }, competitor_handles: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Trend detection result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                industry: { type: 'string' },
                trending_topics: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, momentum: { type: 'string', enum: ['rising', 'peak', 'declining'] }, relevance_score: { type: 'number', minimum: 0, maximum: 1 }, estimated_volume: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                trending_hashtags: { type: 'array', items: { type: 'object', properties: { tag: { type: 'string' }, usage_context: { type: 'string' }, recommended: { type: 'boolean' } } } },
                emerging_conversations: actions,
                sentiment_landscape: { type: 'object', properties: { overall: { type: 'string', enum: ['positive', 'negative', 'mixed'] }, key_drivers: actions } },
                content_opportunities: { type: 'array', items: { type: 'object', properties: { opportunity: { type: 'string' }, format: { type: 'string', enum: ['video', 'text', 'image', 'thread'] }, timing: { type: 'string', enum: ['now', 'soon', 'future'] } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing industry' }, '500': { description: 'Trend detection failed' },
          },
        },
      },
      '/competitor-social': {
        post: {
          operationId: 'competitorSocial',
          summary: 'Analyze competitor social media strategy, positioning, strengths, weaknesses, and content gaps',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['competitor_name', 'your_brand'], properties: { competitor_name: { type: 'string' }, your_brand: { type: 'string' }, competitor_handle: { type: 'string' }, platforms: { type: 'array', items: { type: 'string' } }, industry: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Competitor social analysis result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                competitor_name: { type: 'string' },
                your_brand: { type: 'string' },
                content_strategy: { type: 'object', properties: { posting_frequency: { type: 'string', enum: ['high', 'medium', 'low'] }, content_mix: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, percentage: { type: 'number' } } } }, tone: { type: 'string' } } },
                positioning: { type: 'object', properties: { key_messages: actions, differentiators: actions, target_audience: { type: 'string' } } },
                strengths: actions,
                weaknesses: actions,
                content_gaps_you_can_exploit: actions,
                engagement_benchmarks: { type: 'object', properties: { estimated_avg_engagement: { type: 'string', enum: ['high', 'medium', 'low'] } } },
                strategic_recommendations: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing competitor_name or your_brand' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/audience-insights': {
        post: {
          operationId: 'audienceInsights',
          summary: 'Derive audience demographics, psychographics, content preferences, and engagement patterns for a brand or topic',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['brand_or_topic'], properties: { brand_or_topic: { type: 'string' }, platform: { type: 'string' }, demographic_focus: { type: 'string' }, sample_content: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Audience insights result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                brand_or_topic: { type: 'string' },
                audience_profile: { type: 'object', properties: { age_range: { type: 'string' }, gender_split: { type: 'string' }, location_focus: { type: 'string' }, income_level: { type: 'string' } } },
                psychographics: { type: 'object', properties: { values: actions, interests: actions, lifestyle_markers: actions, pain_points: actions } },
                content_preferences: { type: 'object', properties: { formats: { type: 'array', items: { type: 'object', properties: { format: { type: 'string' }, preference: { type: 'string', enum: ['high', 'medium', 'low'] } } } }, topics: actions, tone: { type: 'string' }, posting_times: actions } },
                engagement_drivers: { type: 'array', items: { type: 'object', properties: { driver: { type: 'string' }, impact: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                segments: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, size: { type: 'string', enum: ['large', 'medium', 'small'] }, description: { type: 'string' } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing brand_or_topic' }, '500': { description: 'Insights failed' },
          },
        },
      },
      '/content-performance': {
        post: {
          operationId: 'contentPerformance',
          summary: 'Predict content engagement, reach, and goal achievement with improvement suggestions and hashtag strategy',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content', 'platform'], properties: { content: { type: 'string' }, platform: { type: 'string' }, target_audience: { type: 'string' }, campaign_goal: { type: 'string' }, brand_voice: { type: 'string' }, historical_benchmarks: { type: 'object' } } } } } },
          responses: {
            '200': {
              description: 'Content performance prediction result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                predicted_engagement_rate: { type: 'string', enum: ['high', 'medium', 'low'] },
                predicted_reach: { type: 'string', enum: ['viral', 'high', 'medium', 'low'] },
                performance_score: { type: 'number', minimum: 0, maximum: 100 },
                strengths: actions,
                weaknesses: actions,
                improvement_suggestions: { type: 'array', items: { type: 'object', properties: { suggestion: { type: 'string' }, expected_impact: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                optimal_posting_time: { type: 'string' },
                hashtag_strategy: { type: 'object', properties: { recommended_tags: actions, count: { type: 'number' } } },
                cta_effectiveness: { type: 'object', properties: { score: { type: 'number', minimum: 0, maximum: 100 }, suggestion: { type: 'string' } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing content or platform' }, '500': { description: 'Prediction failed' },
          },
        },
      },
      '/sentiment-timeline': {
        post: {
          operationId: 'sentimentTimeline',
          summary: 'Map sentiment trajectory through key events with inflection points, recovery patterns, and 30-day forecast',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['brand_or_topic', 'events'], properties: { brand_or_topic: { type: 'string' }, events: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' }, description: { type: 'string' } } } }, time_range: { type: 'string' }, platforms: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Sentiment timeline result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                brand_or_topic: { type: 'string' },
                overall_trend: { type: 'string', enum: ['improving', 'stable', 'declining', 'volatile'] },
                baseline_sentiment: { type: 'number', minimum: 0, maximum: 1 },
                current_sentiment: { type: 'number', minimum: 0, maximum: 1 },
                sentiment_events: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' }, sentiment_impact: { type: 'number', minimum: -1, maximum: 1 }, recovery_time_days: { type: 'number' }, lesson: { type: 'string' } } } },
                inflection_points: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, type: { type: 'string', enum: ['positive', 'negative'] }, magnitude: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                recovery_patterns: actions,
                forecast: { type: 'object', properties: { next_30_days: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing brand_or_topic or events' }, '500': { description: 'Timeline mapping failed' },
          },
        },
      },
      '/social-proof': {
        post: {
          operationId: 'socialProof',
          summary: 'Extract and assess social proof signals, trust indicators, testimonial quality, and credibility gaps',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['brand_name'], properties: { brand_name: { type: 'string' }, product_or_service: { type: 'string' }, industry: { type: 'string' }, review_samples: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Social proof assessment result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                brand_name: { type: 'string' },
                social_proof_score: { type: 'number', minimum: 0, maximum: 100 },
                trust_signals: { type: 'array', items: { type: 'object', properties: { signal: { type: 'string' }, strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] }, evidence: { type: 'string' } } } },
                testimonial_quality: { type: 'object', properties: { authenticity: { type: 'string', enum: ['high', 'medium', 'low'] }, specificity: { type: 'string', enum: ['high', 'medium', 'low'] }, diversity: { type: 'string', enum: ['high', 'medium', 'low'] } } },
                credibility_indicators: { type: 'array', items: { type: 'object', properties: { indicator: { type: 'string' }, type: { type: 'string', enum: ['achievement', 'partnership', 'media', 'community'] }, impact: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                gaps: actions,
                recommendations: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing brand_name' }, '500': { description: 'Assessment failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'socialExecutionGate',
          summary: 'Gate social media actions based on brand risk, timing, strategic fit — returns proceed/modify/delay/cancel',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['social_action', 'brand_context'], properties: { social_action: { type: 'string' }, brand_context: { type: 'string' }, risk_threshold: { type: 'number' }, platform: { type: 'string' }, content_preview: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Execution gate result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                execute: { type: 'boolean' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                risk_score: { type: 'number', minimum: 0, maximum: 1 },
                blocking_flags: actions,
                warnings: actions,
                recommended_action: { type: 'string', enum: ['proceed', 'modify', 'delay', 'cancel'] },
                modifications_needed: actions,
                optimal_timing: { type: 'string', nullable: true },
                chain_to: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing social_action or brand_context' }, '500': { description: 'Gate check failed' },
          },
        },
      },
    },
  });
});

export default router;
