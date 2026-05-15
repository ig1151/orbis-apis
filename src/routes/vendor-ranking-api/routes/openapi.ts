import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Vendor Ranking API',
      version: '1.0.0',
      description: 'AI-powered vendor evaluation — rank vendors, score individual vendors, head-to-head comparisons, review analysis, risk assessment, requirements matching, and full due diligence. ONE-CALL evaluate endpoint for complete procurement intelligence.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { rank_vendors: '$0.008', score_vendor: '$0.006', compare_vendors: '$0.007', check_reviews: '$0.006', assess_risk: '$0.007', match_requirements: '$0.007', due_diligence: '$0.009', execution_gate: '$0.001', evaluate: '$0.015' },
        high_volume: { rank_vendors: '$0.005', score_vendor: '$0.004', compare_vendors: '$0.005', assess_risk: '$0.005', due_diligence: '$0.006', evaluate: '$0.010' },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/vendor-ranking', description: 'Production' }],
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
            trace_id: { type: 'string', description: 'Unique trace ID (vnd_<ts>_<random>)' },
            computed_at: { type: 'string', format: 'date-time' },
            confidence_per_section: { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 1 } },
            recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
            privacy: { '$ref': '#/components/schemas/PrivacyBlock' },
          },
        },
        VendorsInput: {
          oneOf: [
            { type: 'string', description: 'Comma-separated vendor names or descriptive text' },
            { type: 'array', items: { type: 'string' }, description: 'Array of vendor names' },
            { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, pricing: { type: 'string' }, website: { type: 'string' } }, required: ['name'] }, description: 'Array of vendor objects with details' },
          ],
        },
        VendorScores: {
          type: 'object',
          properties: {
            pricing: { type: 'number', minimum: 0, maximum: 100 },
            reliability: { type: 'number', minimum: 0, maximum: 100 },
            support: { type: 'number', minimum: 0, maximum: 100 },
            features: { type: 'number', minimum: 0, maximum: 100 },
            integrations: { type: 'number', minimum: 0, maximum: 100 },
            geographic_fit: { type: 'number', minimum: 0, maximum: 100 },
            security: { type: 'number', minimum: 0, maximum: 100 },
            scalability: { type: 'number', minimum: 0, maximum: 100 },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'vendorRankingDiscovery',
          summary: 'API discovery — returns name, version, endpoints and capabilities',
          responses: { '200': { description: 'API discovery info' } },
        },
      },
      '/rank-vendors': {
        post: {
          operationId: 'rankVendors',
          summary: 'Rank multiple vendors across weighted criteria for a specific use case and budget',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['vendors'],
                  properties: {
                    vendors: { '$ref': '#/components/schemas/VendorsInput' },
                    criteria: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
                    use_case: { type: 'string' },
                    budget: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Vendor rankings',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          rankings: { type: 'array', items: { type: 'object', properties: { rank: { type: 'number' }, vendor: { type: 'string' }, overall_score: { type: 'number', minimum: 0, maximum: 100 }, scores: { '$ref': '#/components/schemas/VendorScores' }, pros: { type: 'array', items: { type: 'string' } }, cons: { type: 'array', items: { type: 'string' } }, best_for: { type: 'string' }, avoid_if: { type: 'string' } } } },
                          top_pick: { type: 'string' },
                          runner_up: { type: 'string' },
                          best_value: { type: 'string' },
                          ranking_rationale: { type: 'string' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing vendors' },
            '500': { description: 'Ranking failed' },
          },
        },
      },
      '/score-vendor': {
        post: {
          operationId: 'scoreVendor',
          summary: 'Score a single vendor across all dimensions with grade, strengths, weaknesses, and recommended tier',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['vendor'],
                  properties: {
                    vendor: { type: 'string' },
                    vendor_data: { oneOf: [{ type: 'string' }, { type: 'object' }], description: 'Optional additional vendor data' },
                    use_case: { type: 'string' },
                    criteria: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Vendor score',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          vendor: { type: 'string' },
                          overall_score: { type: 'number', minimum: 0, maximum: 100 },
                          grade: { type: 'string', enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', 'D', 'F'] },
                          scores: { '$ref': '#/components/schemas/VendorScores' },
                          strengths: { type: 'array', items: { type: 'string' } },
                          weaknesses: { type: 'array', items: { type: 'string' } },
                          red_flags: { type: 'array', items: { type: 'string' } },
                          green_flags: { type: 'array', items: { type: 'string' } },
                          recommended_tier: { type: 'string', enum: ['enterprise', 'mid-market', 'smb', 'startup'] },
                          price_range: { type: 'string' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing vendor' },
            '500': { description: 'Scoring failed' },
          },
        },
      },
      '/compare-vendors': {
        post: {
          operationId: 'compareVendors',
          summary: 'Head-to-head vendor comparison with per-criterion scores, winner verdict, and conditional guidance',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['vendor_a', 'vendor_b'],
                  properties: {
                    vendor_a: { oneOf: [{ type: 'string' }, { type: 'object' }] },
                    vendor_b: { oneOf: [{ type: 'string' }, { type: 'object' }] },
                    use_case: { type: 'string' },
                    criteria: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Head-to-head comparison',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          winner: { type: 'string' },
                          verdict: { type: 'string', enum: ['clear_winner', 'slight_edge', 'too_close', 'depends_on_use_case'] },
                          comparison: { type: 'array', items: { type: 'object', properties: { criterion: { type: 'string' }, vendor_a_score: { type: 'number', minimum: 0, maximum: 100 }, vendor_b_score: { type: 'number', minimum: 0, maximum: 100 }, winner: { type: 'string' }, notes: { type: 'string' } } } },
                          vendor_a_wins_on: { type: 'array', items: { type: 'string' } },
                          vendor_b_wins_on: { type: 'array', items: { type: 'string' } },
                          choose_vendor_a_if: { type: 'array', items: { type: 'string' } },
                          choose_vendor_b_if: { type: 'array', items: { type: 'string' } },
                          price_difference: { type: 'string' },
                          migration_complexity: { type: 'string', enum: ['easy', 'moderate', 'hard'] },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing vendor_a or vendor_b' },
            '500': { description: 'Comparison failed' },
          },
        },
      },
      '/check-reviews': {
        post: {
          operationId: 'checkVendorReviews',
          summary: 'Analyze vendor reviews for trust score, fake review risk, top praise, and top complaints',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['vendor'],
                  properties: {
                    vendor: { type: 'string' },
                    reviews: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, rating: { type: 'number' }, source: { type: 'string' }, date: { type: 'string' } } } }] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Review analysis',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          vendor: { type: 'string' },
                          avg_rating: { type: 'number', minimum: 0, maximum: 5 },
                          review_count_estimate: { type: 'number' },
                          sentiment: { type: 'string', enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'] },
                          trust_score: { type: 'number', minimum: 0, maximum: 100 },
                          top_praise: { type: 'array', items: { type: 'string' } },
                          top_complaints: { type: 'array', items: { type: 'string' } },
                          red_flags_from_reviews: { type: 'array', items: { type: 'string' } },
                          fake_review_risk: { type: 'string', enum: ['high', 'medium', 'low'] },
                          review_authenticity_score: { type: 'number', minimum: 0, maximum: 100 },
                          recency_bias: { type: 'string', enum: ['recent_worse', 'consistent', 'recent_better'] },
                          recommended_sources: { type: 'array', items: { type: 'string' } },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing vendor' },
            '500': { description: 'Review check failed' },
          },
        },
      },
      '/assess-risk': {
        post: {
          operationId: 'assessVendorRisk',
          summary: 'Assess vendor risk across financial, operational, legal, security, and compliance dimensions with exit complexity',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['vendor'],
                  properties: {
                    vendor: { type: 'string' },
                    vendor_data: { oneOf: [{ type: 'string' }, { type: 'object' }] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Vendor risk assessment',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          vendor: { type: 'string' },
                          overall_risk: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'minimal'] },
                          risk_score: { type: 'number', minimum: 0, maximum: 100 },
                          risks: { type: 'array', items: { type: 'object', properties: { risk: { type: 'string' }, category: { type: 'string', enum: ['financial', 'operational', 'legal', 'strategic', 'security', 'compliance', 'concentration'] }, severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, likelihood: { type: 'string', enum: ['high', 'medium', 'low'] }, mitigation: { type: 'string' } } } },
                          vendor_stability: { type: 'string', enum: ['stable', 'uncertain', 'at_risk'] },
                          single_vendor_dependency_risk: { type: 'string', enum: ['high', 'medium', 'low'] },
                          data_security_risk: { type: 'string', enum: ['high', 'medium', 'low'] },
                          compliance_risk: { type: 'string', enum: ['high', 'medium', 'low'] },
                          exit_complexity: { type: 'string', enum: ['easy', 'moderate', 'hard', 'locked_in'] },
                          red_flags: { type: 'array', items: { type: 'string' } },
                          due_diligence_items: { type: 'array', items: { type: 'string' } },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing vendor' },
            '500': { description: 'Risk assessment failed' },
          },
        },
      },
      '/match-requirements': {
        post: {
          operationId: 'matchVendorRequirements',
          summary: 'Match vendors against specific requirements and score fit, identifying met, missing, and partial requirements',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['vendors', 'requirements'],
                  properties: {
                    vendors: { '$ref': '#/components/schemas/VendorsInput' },
                    requirements: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }, { type: 'object' }] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Requirements match results',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          matches: { type: 'array', items: { type: 'object', properties: { vendor: { type: 'string' }, fit_score: { type: 'number', minimum: 0, maximum: 100 }, requirements_met: { type: 'array', items: { type: 'string' } }, requirements_missing: { type: 'array', items: { type: 'string' } }, partial_requirements: { type: 'array', items: { type: 'string' } }, recommendation: { type: 'string', enum: ['strong_fit', 'good_fit', 'partial_fit', 'poor_fit'] } } } },
                          best_match: { type: 'string' },
                          no_perfect_match: { type: 'boolean' },
                          gap_analysis: { type: 'string' },
                          custom_requirements_feasibility: { type: 'string', enum: ['high', 'medium', 'low'] },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing vendors or requirements' },
            '500': { description: 'Match failed' },
          },
        },
      },
      '/due-diligence': {
        post: {
          operationId: 'vendorDueDiligence',
          summary: 'Comprehensive vendor due diligence — financial health, product quality, support, contract risks, and procurement recommendation',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['vendor'],
                  properties: {
                    vendor: { type: 'string' },
                    vendor_data: { oneOf: [{ type: 'string' }, { type: 'object' }] },
                    use_case: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Due diligence report',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          vendor: { type: 'string' },
                          due_diligence_score: { type: 'number', minimum: 0, maximum: 100 },
                          recommendation: { type: 'string', enum: ['proceed', 'proceed_with_caution', 'negotiate', 'avoid'] },
                          financial_health: { type: 'object', properties: { assessment: { type: 'string' }, score: { type: 'number', minimum: 0, maximum: 100 }, concerns: { type: 'array', items: { type: 'string' } } } },
                          product_quality: { type: 'object', properties: { assessment: { type: 'string' }, score: { type: 'number', minimum: 0, maximum: 100 }, concerns: { type: 'array', items: { type: 'string' } } } },
                          support_quality: { type: 'object', properties: { assessment: { type: 'string' }, score: { type: 'number', minimum: 0, maximum: 100 }, concerns: { type: 'array', items: { type: 'string' } } } },
                          contract_risks: { type: 'array', items: { type: 'string' } },
                          pricing_transparency: { type: 'string', enum: ['high', 'medium', 'low'] },
                          sla_strength: { type: 'string', enum: ['strong', 'adequate', 'weak', 'unknown'] },
                          reference_check_recommended: { type: 'boolean' },
                          pilot_recommended: { type: 'boolean' },
                          negotiation_leverage: { type: 'array', items: { type: 'string' } },
                          deal_breakers: { type: 'array', items: { type: 'string' } },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing vendor' },
            '500': { description: 'Due diligence failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'vendorExecutionGate',
          summary: 'Validate vendor input readiness and recommend the best evaluation endpoint',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    vendors: { '$ref': '#/components/schemas/VendorsInput' },
                    vendor: { type: 'string' },
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
                      vendor_count: { type: 'number' },
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
            '400': { description: 'Missing vendors or vendor' },
          },
        },
      },
      '/evaluate': {
        post: {
          operationId: 'evaluateVendors',
          summary: 'ONE-CALL: full vendor evaluation — rankings, risk, reviews, requirements match, and procurement recommendation',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['vendors'],
                  properties: {
                    vendors: { '$ref': '#/components/schemas/VendorsInput' },
                    use_case: { type: 'string' },
                    requirements: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }, { type: 'object' }] },
                    budget: { type: 'string' },
                    criteria: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full vendor evaluation',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { '$ref': '#/components/schemas/TraceFields' },
                      {
                        type: 'object',
                        properties: {
                          top_pick: { type: 'string' },
                          runner_up: { type: 'string' },
                          avoid: { type: 'array', items: { type: 'string' } },
                          rankings: { type: 'array', items: { type: 'object', properties: { rank: { type: 'number' }, vendor: { type: 'string' }, overall_score: { type: 'number', minimum: 0, maximum: 100 }, grade: { type: 'string', enum: ['A+', 'A', 'B', 'C', 'D', 'F'] }, pros: { type: 'array', items: { type: 'string' } }, cons: { type: 'array', items: { type: 'string' } }, risk_level: { type: 'string', enum: ['low', 'medium', 'high'] } } } },
                          procurement_recommendation: { type: 'string' },
                          negotiation_tips: { type: 'array', items: { type: 'string' } },
                          red_flags: { type: 'array', items: { type: 'string' } },
                          total_cost_of_ownership_note: { type: 'string' },
                          pilot_suggestion: { type: 'string' },
                          one_line_summary: { type: 'string' },
                        },
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Missing vendors' },
            '500': { description: 'Evaluation failed' },
          },
        },
      },
    },
  });
});

export default router;
