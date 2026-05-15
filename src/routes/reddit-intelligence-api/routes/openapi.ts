import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Reddit Intelligence API',
      version: '1.0.0',
      description: 'AI-powered Reddit analysis — subreddit sentiment, keyword tracking, complaint detection, virality scoring, buying intent, topic clustering, and competitor mentions. ONE-CALL monitor endpoint for full community intelligence.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { analyze_subreddit: '$0.007', track_keywords: '$0.005', detect_complaints: '$0.006', score_virality: '$0.005', buying_intent: '$0.007', topic_clusters: '$0.006', competitor_mentions: '$0.006', execution_gate: '$0.001', monitor: '$0.012' },
        high_volume: { analyze_subreddit: '$0.004', detect_complaints: '$0.004', buying_intent: '$0.005', topic_clusters: '$0.004', competitor_mentions: '$0.004', monitor: '$0.008' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/reddit-intelligence', description: 'Production' }],
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
      schemas: {
        PrivacyBlock: {
          type: 'object',
          properties: {
            data_stored: { type: 'boolean' },
            retention: { type: 'string' },
          },
        },
        TraceFields: {
          type: 'object',
          properties: {
            trace_id: { type: 'string', description: 'Unique trace ID (rid_<ts>_<random>)' },
            computed_at: { type: 'string', format: 'date-time' },
            confidence_per_section: { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 1 } },
            recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
            privacy: { '$ref': '#/components/schemas/PrivacyBlock' },
          },
        },
        PostsInput: {
          oneOf: [
            { type: 'string', description: 'Raw post text or concatenated posts' },
            { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, upvotes: { type: 'number' }, comments: { type: 'number' } }, required: ['title'] }, description: 'Array of post objects' },
          ],
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'redditIntelligenceDiscovery',
          summary: 'API discovery — returns name, version, endpoints and capabilities',
          responses: { '200': { description: 'API discovery info' } },
        },
      },
      '/analyze-subreddit': {
        post: {
          operationId: 'analyzeSubreddit',
          summary: 'Analyze a subreddit for sentiment, top topics, pain points, and community health signals',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['subreddit'],
                  properties: {
                    subreddit: { type: 'string', description: 'Subreddit name without r/' },
                    posts: { '$ref': '#/components/schemas/PostsInput' },
                    timeframe: { type: 'string', enum: ['24h', '7d', '30d', '90d'], default: '7d' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Subreddit analysis',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          subreddit: { type: 'string' },
                          member_sentiment: { type: 'string', enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'] },
                          sentiment_score: { type: 'number', minimum: -100, maximum: 100 },
                          top_topics: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, post_count: { type: 'number' }, sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] }, velocity: { type: 'string', enum: ['rising', 'stable', 'falling'] } } } },
                          pain_points: { type: 'array', items: { type: 'string' } },
                          praised_aspects: { type: 'array', items: { type: 'string' } },
                          trending_products: { type: 'array', items: { type: 'string' } },
                          emerging_themes: { type: 'array', items: { type: 'string' } },
                          community_health: { type: 'string', enum: ['thriving', 'active', 'declining', 'toxic'] },
                          posting_velocity: { type: 'string', enum: ['high', 'medium', 'low'] },
                          engagement_quality: { type: 'string', enum: ['high', 'medium', 'low'] },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing subreddit' },
            '500': { description: 'Analysis failed' },
          },
        },
      },
      '/track-keywords': {
        post: {
          operationId: 'trackKeywords',
          summary: 'Track keyword mentions, velocity, and sentiment across Reddit discussions',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['keywords'],
                  properties: {
                    keywords: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
                    posts: { '$ref': '#/components/schemas/PostsInput' },
                    subreddits: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Keyword tracking results',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          keywords: { type: 'array', items: { type: 'object', properties: { keyword: { type: 'string' }, mention_count: { type: 'number' }, velocity: { type: 'string', enum: ['rising', 'stable', 'falling'] }, sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] }, sentiment_score: { type: 'number', minimum: -100, maximum: 100 }, top_subreddits: { type: 'array', items: { type: 'string' } }, related_keywords: { type: 'array', items: { type: 'string' } } } } },
                          overall_velocity: { type: 'string', enum: ['rising', 'stable', 'falling'] },
                          spike_detected: { type: 'boolean' },
                          spike_reason: { type: 'string' },
                          trending_combinations: { type: 'array', items: { type: 'string' } },
                          sentiment_shift: { type: 'string', enum: ['improving', 'stable', 'deteriorating'] },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing keywords' },
            '500': { description: 'Tracking failed' },
          },
        },
      },
      '/detect-complaints': {
        post: {
          operationId: 'detectComplaints',
          summary: 'Detect recurring complaints, pain points, and frustrations in Reddit posts with NPS estimate',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['posts'],
                  properties: {
                    posts: { '$ref': '#/components/schemas/PostsInput' },
                    product_or_brand: { type: 'string' },
                    subreddit: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Complaint detection results',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          complaints: { type: 'array', items: { type: 'object', properties: { complaint: { type: 'string' }, frequency: { type: 'string', enum: ['high', 'medium', 'low'] }, mention_count: { type: 'number' }, severity: { type: 'string', enum: ['critical', 'major', 'minor'] }, category: { type: 'string', enum: ['product', 'support', 'pricing', 'ux', 'performance', 'reliability', 'other'] }, sample_quotes: { type: 'array', items: { type: 'string' } } } } },
                          top_complaint: { type: 'string' },
                          complaint_volume_trend: { type: 'string', enum: ['increasing', 'stable', 'decreasing'] },
                          unresolved_issues: { type: 'array', items: { type: 'string' } },
                          feature_requests: { type: 'array', items: { type: 'string' } },
                          churn_risk_signals: { type: 'array', items: { type: 'string' } },
                          nps_estimate: { type: 'number', minimum: -100, maximum: 100 },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing posts' },
            '500': { description: 'Detection failed' },
          },
        },
      },
      '/score-virality': {
        post: {
          operationId: 'scoreVirality',
          summary: 'Score the virality potential of a Reddit post with predicted engagement and emotional triggers',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    post_title: { type: 'string' },
                    post_content: { type: 'string' },
                    subreddit: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Virality score and analysis',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          virality_score: { type: 'number', minimum: 0, maximum: 100 },
                          virality_level: { type: 'string', enum: ['viral', 'high', 'medium', 'low', 'minimal'] },
                          predicted_upvote_ratio: { type: 'number', minimum: 0, maximum: 1 },
                          predicted_comment_count: { type: 'string' },
                          virality_factors: { type: 'array', items: { type: 'string' } },
                          risk_factors: { type: 'array', items: { type: 'string' } },
                          best_posting_time: { type: 'string' },
                          related_subreddits: { type: 'array', items: { type: 'string' } },
                          headline_strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
                          emotional_trigger: { type: 'string' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'post_title or post_content required' },
            '500': { description: 'Scoring failed' },
          },
        },
      },
      '/buying-intent': {
        post: {
          operationId: 'detectBuyingIntent',
          summary: 'Detect buying intent signals in Reddit discussions with purchase stage and decision triggers',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['posts'],
                  properties: {
                    posts: { '$ref': '#/components/schemas/PostsInput' },
                    product_category: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Buying intent analysis',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          buying_intent_score: { type: 'number', minimum: 0, maximum: 100 },
                          intent_level: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
                          intent_signals: { type: 'array', items: { type: 'object', properties: { signal: { type: 'string' }, type: { type: 'string', enum: ['asking_for_recommendations', 'comparing_products', 'price_checking', 'ready_to_buy', 'research_phase'] }, strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] }, quote: { type: 'string' } } } },
                          purchase_stage: { type: 'string', enum: ['awareness', 'consideration', 'decision', 'post_purchase'] },
                          price_sensitivity: { type: 'string', enum: ['high', 'medium', 'low'] },
                          preferred_channels: { type: 'array', items: { type: 'string' } },
                          objections: { type: 'array', items: { type: 'string' } },
                          decision_triggers: { type: 'array', items: { type: 'string' } },
                          estimated_purchase_timeline: { type: 'string', enum: ['immediate', '1-2 weeks', '1 month', '3+ months'] },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing posts' },
            '500': { description: 'Intent analysis failed' },
          },
        },
      },
      '/topic-clusters': {
        post: {
          operationId: 'clusterTopics',
          summary: 'Cluster Reddit posts into semantic topic groups and identify dominant, emerging, and declining themes',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['posts'],
                  properties: {
                    posts: { '$ref': '#/components/schemas/PostsInput' },
                    subreddit: { type: 'string' },
                    max_clusters: { type: 'number', minimum: 2, maximum: 20, default: 8 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Topic clusters',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          clusters: { type: 'array', items: { type: 'object', properties: { cluster_name: { type: 'string' }, post_count: { type: 'number' }, sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] }, keywords: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' }, trending: { type: 'boolean' } } } },
                          dominant_cluster: { type: 'string' },
                          emerging_clusters: { type: 'array', items: { type: 'string' } },
                          declining_clusters: { type: 'array', items: { type: 'string' } },
                          cross_cluster_themes: { type: 'array', items: { type: 'string' } },
                          total_posts_analyzed: { type: 'number' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing posts' },
            '500': { description: 'Clustering failed' },
          },
        },
      },
      '/competitor-mentions': {
        post: {
          operationId: 'analyzeCompetitorMentions',
          summary: 'Analyze competitor mentions and brand comparisons in Reddit discussions with switching intent signals',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['posts'],
                  properties: {
                    posts: { '$ref': '#/components/schemas/PostsInput' },
                    brand: { type: 'string' },
                    competitors: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Competitor mention analysis',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          brand_sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                          brand_score: { type: 'number', minimum: -100, maximum: 100 },
                          competitor_mentions: { type: 'array', items: { type: 'object', properties: { competitor: { type: 'string' }, mention_count: { type: 'number' }, sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] }, score: { type: 'number', minimum: -100, maximum: 100 }, vs_brand: { type: 'string', enum: ['preferred', 'equal', 'not_preferred'] } } } },
                          brand_vs_competitors: { type: 'string', enum: ['leading', 'competitive', 'lagging'] },
                          common_comparisons: { type: 'array', items: { type: 'string' } },
                          brand_strengths_vs_competitors: { type: 'array', items: { type: 'string' } },
                          brand_weaknesses_vs_competitors: { type: 'array', items: { type: 'string' } },
                          switching_intent: { type: 'string', enum: ['high', 'medium', 'low'] },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing posts' },
            '500': { description: 'Analysis failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'redditExecutionGate',
          summary: 'Validate Reddit input readiness and recommend the best analysis endpoint',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    posts: { '$ref': '#/components/schemas/PostsInput' },
                    subreddit: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Execution gate result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      execution_ready: { type: 'boolean' },
                      subreddit: { type: 'string' },
                      post_count: { type: 'number' },
                      recommended_endpoint: { type: 'string' },
                      next_api: { type: 'string' },
                      next_endpoint: { type: 'string' },
                      blocking_flags: { type: 'array', items: { type: 'string' } },
                      flag_definitions: { type: 'object', additionalProperties: { type: 'string' } },
                      trace_id: { type: 'string' },
                      confidence_per_section: { type: 'object', additionalProperties: { type: 'number' } },
                      privacy: { '$ref': '#/components/schemas/PrivacyBlock' },
                      computed_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing posts or subreddit' },
          },
        },
      },
      '/monitor': {
        post: {
          operationId: 'monitorReddit',
          summary: 'ONE-CALL: full Reddit intelligence — sentiment, complaints, trends, buying intent, and competitor signals in one response',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['posts'],
                  properties: {
                    posts: { '$ref': '#/components/schemas/PostsInput' },
                    subreddit: { type: 'string' },
                    brand: { type: 'string' },
                    keywords: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
                    product_category: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full Reddit intelligence',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          overall_sentiment: { type: 'string', enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'] },
                          sentiment_score: { type: 'number', minimum: -100, maximum: 100 },
                          top_trends: { type: 'array', items: { type: 'string' } },
                          top_complaints: { type: 'array', items: { type: 'string' } },
                          buying_intent_score: { type: 'number', minimum: 0, maximum: 100 },
                          purchase_stage: { type: 'string', enum: ['awareness', 'consideration', 'decision', 'post_purchase'] },
                          viral_topics: { type: 'array', items: { type: 'string' } },
                          competitor_signals: { type: 'array', items: { type: 'string' } },
                          emerging_opportunities: { type: 'array', items: { type: 'string' } },
                          risk_signals: { type: 'array', items: { type: 'string' } },
                          recommended_actions: { type: 'array', items: { type: 'string' } },
                          one_line_summary: { type: 'string' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing posts' },
            '500': { description: 'Monitor failed' },
          },
        },
      },
    },
  });
});

export default router;
