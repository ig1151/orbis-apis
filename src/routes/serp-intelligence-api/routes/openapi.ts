import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'SERP Intelligence API',
      version: '1.0.0',
      description: 'AI-powered SERP analysis, keyword intelligence, ranking signals and search visibility optimization for autonomous agents',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/serp-intelligence' }],
    paths: {
      '/analyze-serp': {
        post: {
          operationId: 'analyzeSerp',
          summary: 'Full SERP analysis for a keyword with difficulty, intent and ranking signals',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['keyword'], properties: { keyword: { type: 'string' }, domain: { type: 'string' }, location: { type: 'string', default: 'US' }, search_engine: { type: 'string', default: 'google' } } } } } },
          responses: {
            '200': {
              description: 'SERP analysis result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                keyword: { type: 'string' },
                serp_overview: { type: 'object', properties: { difficulty: { type: 'number' }, commercial_intent: { type: 'string', enum: ['low','medium','high'] }, local_intent: { type: 'boolean' }, informational_intent: { type: 'boolean' }, serp_features: { type: 'array', items: { type: 'string' } } } },
                top_ranking_signals: { type: 'array', items: { type: 'object', properties: { signal: { type: 'string' }, weight: { type: 'string', enum: ['high','medium','low'] }, explanation: { type: 'string' } } } },
                content_type_distribution: { type: 'object', properties: { articles: { type: 'number' }, product_pages: { type: 'number' }, guides: { type: 'number' }, videos: { type: 'number' } } },
                ranking_opportunity: { type: 'object', properties: { score: { type: 'number' }, grade: { type: 'string' }, quick_wins: { type: 'array', items: { type: 'string' } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing keyword' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/keyword-intelligence': {
        post: {
          operationId: 'keywordIntelligence',
          summary: 'Keyword difficulty, volume, CPC, intent and long-tail opportunities',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['keyword'], properties: { keyword: { type: 'string' }, niche: { type: 'string' }, competitors: { type: 'array', items: { type: 'string' }, maxItems: 3 } } } } } },
          responses: {
            '200': {
              description: 'Keyword intelligence result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                keyword: { type: 'string' },
                search_volume: { type: 'object', properties: { estimated_monthly: { type: 'number' }, trend: { type: 'string', enum: ['rising','stable','declining'] }, seasonality: { type: 'string' } } },
                difficulty: { type: 'object', properties: { score: { type: 'number' }, label: { type: 'string', enum: ['easy','medium','hard','very_hard'] }, domain_authority_needed: { type: 'number' } } },
                intent: { type: 'object', properties: { primary: { type: 'string', enum: ['informational','navigational','commercial','transactional'] }, secondary: { type: 'string' }, buyer_stage: { type: 'string', enum: ['awareness','consideration','decision'] } } },
                cpc_estimate: { type: 'object', properties: { low: { type: 'string' }, avg: { type: 'string' }, high: { type: 'string' } } },
                related_keywords: { type: 'array', items: { type: 'object', properties: { keyword: { type: 'string' }, volume: { type: 'string' }, difficulty: { type: 'number' } } } },
                long_tail_opportunities: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing keyword' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/ranking-signals': {
        post: {
          operationId: 'rankingSignals',
          summary: 'On-page, off-page and technical ranking signals for a keyword',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['keyword'], properties: { keyword: { type: 'string' }, url: { type: 'string' }, industry: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Ranking signals result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                keyword: { type: 'string' },
                on_page_signals: { type: 'array', items: { type: 'object', properties: { signal: { type: 'string' }, importance: { type: 'string', enum: ['critical','high','medium','low'] }, status: { type: 'string', enum: ['present','missing','needs_improvement'] }, action: { type: 'string' } } } },
                off_page_signals: { type: 'array', items: { type: 'object', properties: { signal: { type: 'string' }, importance: { type: 'string' }, benchmark: { type: 'string' } } } },
                technical_signals: { type: 'array', items: { type: 'object', properties: { signal: { type: 'string' }, importance: { type: 'string' }, action: { type: 'string' } } } },
                content_signals: { type: 'object', properties: { ideal_length: { type: 'number' }, heading_structure: { type: 'string' }, schema_recommended: actions, media_types: actions } },
                overall_score: { type: 'number' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing keyword' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/competitor-gap': {
        post: {
          operationId: 'competitorGap',
          summary: 'Keyword and content gap analysis vs competitors',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['domain','competitors'], properties: { domain: { type: 'string' }, competitors: { type: 'array', items: { type: 'string' }, maxItems: 3 }, niche: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Competitor gap analysis result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                domain: { type: 'string' },
                gap_summary: { type: 'object', properties: { total_gaps_estimated: { type: 'number' }, opportunity_score: { type: 'number' }, urgency: { type: 'string', enum: ['high','medium','low'] } } },
                keyword_gaps: { type: 'array', items: { type: 'object', properties: { keyword: { type: 'string' }, competitor_has: actions, volume: { type: 'string' }, difficulty: { type: 'number' }, opportunity: { type: 'string' } } } },
                content_gaps: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, gap_type: { type: 'string', enum: ['missing','thin','outdated'] }, priority: { type: 'string', enum: ['high','medium','low'] } } } },
                quick_wins: { type: 'array', items: { type: 'object', properties: { keyword: { type: 'string' }, reason: { type: 'string' }, estimated_traffic: { type: 'string' } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing domain or competitors' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/content-opportunities': {
        post: {
          operationId: 'contentOpportunities',
          summary: 'Content cluster opportunities and SERP feature targets',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['topic'], properties: { topic: { type: 'string' }, domain: { type: 'string' }, target_audience: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Content opportunities result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                topic: { type: 'string' },
                opportunity_score: { type: 'number' },
                content_formats: { type: 'array', items: { type: 'object', properties: { format: { type: 'string' }, priority: { type: 'string', enum: ['high','medium','low'] }, rationale: { type: 'string' } } } },
                cluster_opportunities: { type: 'array', items: { type: 'object', properties: { cluster_topic: { type: 'string' }, pillar_page: { type: 'string' }, supporting_pages: actions } } },
                serp_feature_opportunities: { type: 'array', items: { type: 'object', properties: { feature: { type: 'string' }, target_keyword: { type: 'string' }, content_requirement: { type: 'string' } } } },
                content_calendar_suggestions: { type: 'array', items: { type: 'object', properties: { week: { type: 'number' }, content_type: { type: 'string' }, title_idea: { type: 'string' }, target_keyword: { type: 'string' } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing topic' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/featured-snippet': {
        post: {
          operationId: 'featuredSnippet',
          summary: 'Featured snippet eligibility scoring and optimization requirements',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['keyword'], properties: { keyword: { type: 'string' }, current_content: { type: 'string' }, content_type: { type: 'string', default: 'article' } } } } } },
          responses: {
            '200': {
              description: 'Featured snippet analysis result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                keyword: { type: 'string' },
                snippet_type: { type: 'string', enum: ['paragraph','list','table','video'] },
                eligibility_score: { type: 'number' },
                optimization_requirements: { type: 'array', items: { type: 'object', properties: { requirement: { type: 'string' }, priority: { type: 'string', enum: ['critical','high','medium'] }, current_status: { type: 'string', enum: ['met','not_met','unknown'] } } } },
                ideal_answer_structure: { type: 'object', properties: { format: { type: 'string' }, ideal_length: { type: 'number' }, key_elements: actions } },
                sample_optimized_content: { type: 'string' },
                voice_search_fit: { type: 'object', properties: { score: { type: 'number' }, conversational_keywords: actions } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing keyword' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/local-pack-signals': {
        post: {
          operationId: 'localPackSignals',
          summary: 'Local pack ranking factors, GMB optimization and review strategy',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['keyword','location'], properties: { keyword: { type: 'string' }, location: { type: 'string' }, business_name: { type: 'string' }, category: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Local pack signals result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                keyword: { type: 'string' },
                location: { type: 'string' },
                local_pack_difficulty: { type: 'number' },
                ranking_factors: { type: 'array', items: { type: 'object', properties: { factor: { type: 'string' }, weight: { type: 'string', enum: ['critical','high','medium','low'] }, action: { type: 'string' } } } },
                gmb_optimization: { type: 'array', items: { type: 'object', properties: { element: { type: 'string' }, status: { type: 'string', enum: ['optimized','needs_work','missing'] }, tip: { type: 'string' } } } },
                citation_requirements: { type: 'object', properties: { estimated_citations_needed: { type: 'number' }, top_directories: actions, consistency_importance: { type: 'string' } } },
                review_strategy: { type: 'object', properties: { target_count: { type: 'number' }, target_rating: { type: 'number' }, response_template: { type: 'string' } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing keyword or location' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/search-intent': {
        post: {
          operationId: 'searchIntent',
          summary: 'Deep search intent classification with user journey and conversion analysis',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['keyword'], properties: { keyword: { type: 'string' }, industry: { type: 'string' }, current_page_type: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Search intent analysis result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                keyword: { type: 'string' },
                intent_classification: { type: 'object', properties: { primary_intent: { type: 'string', enum: ['informational','navigational','commercial','transactional'] }, confidence: { type: 'number' }, micro_intent: { type: 'string' } } },
                user_journey_stage: { type: 'object', properties: { stage: { type: 'string', enum: ['awareness','consideration','decision','retention'] }, persona: { type: 'string' }, pain_points: actions } },
                content_alignment: { type: 'object', properties: { ideal_page_type: { type: 'string' }, ideal_cta: { type: 'string' }, alignment_score: { type: 'number' }, mismatch_penalty: { type: 'string', enum: ['none','low','medium','high'] } } },
                conversion_potential: { type: 'object', properties: { score: { type: 'number' }, barriers: actions, accelerators: actions } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing keyword' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Execution readiness check with blocking flags and next API chaining',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['keyword'], properties: { keyword: { type: 'string' }, domain: { type: 'string' }, objective: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Execution gate result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                execution_ready: { type: 'boolean' },
                keyword: { type: 'string' },
                domain: { type: 'string', nullable: true },
                objective: { type: 'string' },
                next_api: { type: 'string' },
                next_endpoint: { type: 'string' },
                blocking_flags: { type: 'array', items: { type: 'string' } },
                flag_definitions: { type: 'object', additionalProperties: { type: 'string' } },
                confidence_per_section: confidence,
                privacy,
              } } } },
            },
            '400': { description: 'Missing keyword' }, '500': { description: 'Gate check failed' },
          },
        },
      },
      '/analyze-search-visibility': {
        post: {
          operationId: 'analyzeSearchVisibility',
          summary: 'ONE-CALL: full search visibility workflow',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['keyword'], properties: { keyword: { type: 'string' }, domain: { type: 'string' }, location: { type: 'string', default: 'US' }, niche: { type: 'string' }, competitors: { type: 'array', items: { type: 'string' }, maxItems: 3 } } } } } },
          responses: {
            '200': {
              description: 'Full search visibility report',
              content: { 'application/json': { schema: { type: 'object', properties: {
                keyword: { type: 'string' },
                executive_summary: { type: 'object', properties: { visibility_score: { type: 'number' }, grade: { type: 'string' }, top_priority: { type: 'string' }, estimated_traffic_potential: { type: 'string' } } },
                serp_overview: { type: 'object', properties: { difficulty: { type: 'number' }, commercial_intent: { type: 'string' }, serp_features_present: actions } },
                keyword_intelligence: { type: 'object', properties: { estimated_monthly_volume: { type: 'number' }, trend: { type: 'string' }, intent: { type: 'string' }, cpc_avg: { type: 'string' } } },
                ranking_signals: { type: 'array', items: { type: 'object', properties: { signal: { type: 'string' }, importance: { type: 'string' }, status: { type: 'string' } } } },
                content_opportunities: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, title: { type: 'string' }, priority: { type: 'string' } } } },
                quick_wins: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, impact: { type: 'string' }, effort: { type: 'string' } } } },
                competitive_position: { type: 'object', properties: { gap_count: { type: 'number' }, opportunity_score: { type: 'number' }, immediate_actions: actions } },
                execution_plan: { type: 'array', items: { type: 'object', properties: { phase: { type: 'number' }, action: { type: 'string' }, timeline: { type: 'string' } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing keyword' }, '500': { description: 'Analysis failed' },
          },
        },
      },
    },
  });
});

export default router;
