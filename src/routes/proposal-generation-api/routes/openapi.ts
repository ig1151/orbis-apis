import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Proposal & Document Generation API',
      version: '1.0.0',
      description: 'AI-powered proposal and document generation for autonomous agents — generate proposals, executive summaries, pricing tables, SOWs, RFP responses, case studies, document scoring, personalization and execution gating',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/proposal-generation' }],
    paths: {
      '/generate-proposal': {
        post: {
          operationId: 'generateProposal',
          summary: 'Generate a complete business proposal with executive summary, approach, team, pricing and next steps',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['client_name', 'problem_statement', 'solution_description'],
                  properties: {
                    client_name: { type: 'string' },
                    problem_statement: { type: 'string' },
                    solution_description: { type: 'string' },
                    pricing: { type: 'object' },
                    timeline: { type: 'string' },
                    team: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' } } } },
                    case_studies: { type: 'array', items: { type: 'object' } },
                    tone: { type: 'string', enum: ['formal', 'consultative', 'startup'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Generated proposal document',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      proposal_id: { type: 'string' },
                      client_name: { type: 'string' },
                      executive_summary: { type: 'string' },
                      problem_statement: { type: 'string' },
                      proposed_solution: { type: 'string' },
                      approach_and_methodology: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            phase: { type: 'string' },
                            description: { type: 'string' },
                            duration: { type: 'string' },
                            deliverables: actions,
                          },
                        },
                      },
                      timeline_overview: { type: 'string' },
                      team_section: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            role: { type: 'string' },
                            relevant_experience: { type: 'string' },
                          },
                        },
                      },
                      pricing_section: {
                        type: 'object',
                        properties: {
                          investment_summary: { type: 'string' },
                          line_items: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                item: { type: 'string' },
                                price: { type: 'string' },
                                description: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                      case_study_references: actions,
                      next_steps: actions,
                      call_to_action: { type: 'string' },
                      word_count: { type: 'number' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing required fields' },
            '500': { description: 'Proposal generation failed' },
          },
        },
      },
      '/executive-summary': {
        post: {
          operationId: 'generateExecutiveSummary',
          summary: 'Generate a compelling executive summary with key takeaways, value proposition and clarity scores',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['document_content', 'summary_purpose'],
                  properties: {
                    document_content: { type: 'string' },
                    summary_purpose: { type: 'string', enum: ['proposal', 'report', 'plan', 'brief'] },
                    max_words: { type: 'number' },
                    audience: { type: 'string' },
                    key_highlights: actions,
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Executive summary result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      executive_summary: { type: 'string' },
                      key_takeaways: actions,
                      decision_needed: { type: 'string', nullable: true },
                      value_proposition: { type: 'string' },
                      risks_highlighted: actions,
                      word_count: { type: 'number' },
                      reading_time_minutes: { type: 'number' },
                      audience_fit_score: { type: 'number', minimum: 0, maximum: 100 },
                      clarity_score: { type: 'number', minimum: 0, maximum: 100 },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing document_content or summary_purpose' },
            '500': { description: 'Executive summary generation failed' },
          },
        },
      },
      '/pricing-table': {
        post: {
          operationId: 'buildPricingTable',
          summary: 'Build professional pricing table with tiered options, ROI justification and competitive positioning',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['service_or_product', 'cost_inputs'],
                  properties: {
                    service_or_product: { type: 'string' },
                    cost_inputs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          item: { type: 'string' },
                          cost: { type: 'number' },
                          type: { type: 'string', enum: ['fixed', 'variable', 'recurring'] },
                        },
                      },
                    },
                    margin_target: { type: 'number' },
                    competitor_pricing: { type: 'array', items: { type: 'object' } },
                    discount_tiers: { type: 'array', items: { type: 'object' } },
                    currency: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Pricing table result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      pricing_tiers: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            tier_name: { type: 'string' },
                            price: { type: 'string' },
                            billing: { type: 'string', enum: ['monthly', 'annual', 'one_time'] },
                            features: actions,
                            recommended: { type: 'boolean' },
                            target_customer: { type: 'string' },
                          },
                        },
                      },
                      total_cost_base: { type: 'number' },
                      recommended_margin: { type: 'number' },
                      price_justification: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            point: { type: 'string' },
                            value_delivered: { type: 'string' },
                          },
                        },
                      },
                      roi_statement: { type: 'string' },
                      competitive_position: { type: 'string', enum: ['premium', 'competitive', 'value'] },
                      discount_recommendations: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            scenario: { type: 'string' },
                            discount_pct: { type: 'number' },
                            conditions: { type: 'string' },
                          },
                        },
                      },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing service_or_product or cost_inputs' },
            '500': { description: 'Pricing table generation failed' },
          },
        },
      },
      '/sow': {
        post: {
          operationId: 'generateSOW',
          summary: 'Generate a formal Statement of Work with scope, deliverables, acceptance criteria, timeline and payment schedule',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['project_name', 'scope_description', 'deliverables'],
                  properties: {
                    project_name: { type: 'string' },
                    scope_description: { type: 'string' },
                    deliverables: actions,
                    timeline: { type: 'object' },
                    assumptions: actions,
                    exclusions: actions,
                    payment_terms: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Statement of Work document',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      sow_id: { type: 'string' },
                      project_name: { type: 'string' },
                      project_overview: { type: 'string' },
                      scope_of_work: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            item: { type: 'string' },
                            description: { type: 'string' },
                            acceptance_criteria: { type: 'string' },
                          },
                        },
                      },
                      deliverables: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            deliverable: { type: 'string' },
                            format: { type: 'string' },
                            due: { type: 'string' },
                            acceptance_criteria: { type: 'string' },
                          },
                        },
                      },
                      out_of_scope: actions,
                      assumptions: actions,
                      timeline: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            milestone: { type: 'string' },
                            date: { type: 'string' },
                            owner: { type: 'string' },
                          },
                        },
                      },
                      payment_schedule: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            milestone: { type: 'string' },
                            amount_pct: { type: 'number' },
                            trigger: { type: 'string' },
                          },
                        },
                      },
                      change_order_process: { type: 'string' },
                      legal_notes: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing project_name, scope_description or deliverables' },
            '500': { description: 'SOW generation failed' },
          },
        },
      },
      '/rfp-response': {
        post: {
          operationId: 'generateRFPResponse',
          summary: 'Generate a compelling RFP response addressing requirements, highlighting differentiators and identifying gaps',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['rfp_content', 'your_company', 'capabilities'],
                  properties: {
                    rfp_content: { type: 'string' },
                    your_company: { type: 'string' },
                    capabilities: actions,
                    differentiators: actions,
                    case_studies: { type: 'array', items: { type: 'object' } },
                    team_bios: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'RFP response document',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      rfp_response_id: { type: 'string' },
                      requirements_addressed: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            requirement: { type: 'string' },
                            our_response: { type: 'string' },
                            evidence: { type: 'string', nullable: true },
                            strength: { type: 'string', enum: ['strong', 'adequate', 'gap'] },
                          },
                        },
                      },
                      executive_summary: { type: 'string' },
                      differentiators_highlighted: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            differentiator: { type: 'string' },
                            relevance_to_rfp: { type: 'string' },
                          },
                        },
                      },
                      gaps_identified: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            gap: { type: 'string' },
                            mitigation: { type: 'string' },
                          },
                        },
                      },
                      win_themes: actions,
                      recommended_pricing_approach: { type: 'string' },
                      submission_checklist: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            item: { type: 'string' },
                            status: { type: 'string', enum: ['included', 'missing', 'partial'] },
                          },
                        },
                      },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing rfp_content, your_company or capabilities' },
            '500': { description: 'RFP response generation failed' },
          },
        },
      },
      '/case-study': {
        post: {
          operationId: 'generateCaseStudy',
          summary: 'Transform raw case study inputs into compelling narrative with challenge, solution, results and proof points',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['client_name', 'challenge', 'solution', 'results'],
                  properties: {
                    client_name: { type: 'string' },
                    challenge: { type: 'string' },
                    solution: { type: 'string' },
                    results: actions,
                    industry: { type: 'string' },
                    timeline: { type: 'string' },
                    quote: { type: 'string' },
                    metrics: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          metric: { type: 'string' },
                          before: { type: 'string' },
                          after: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Case study document',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      case_study_id: { type: 'string' },
                      headline: { type: 'string' },
                      client_overview: { type: 'string' },
                      challenge_narrative: { type: 'string' },
                      solution_narrative: { type: 'string' },
                      results_narrative: { type: 'string' },
                      metrics_highlight: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            metric: { type: 'string' },
                            improvement: { type: 'string' },
                            formatted: { type: 'string' },
                          },
                        },
                      },
                      pull_quote: { type: 'string' },
                      lessons_learned: actions,
                      reusability_score: { type: 'number', minimum: 0, maximum: 100 },
                      ideal_prospect_match: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing client_name, challenge, solution or results' },
            '500': { description: 'Case study generation failed' },
          },
        },
      },
      '/document-score': {
        post: {
          operationId: 'scoreDocument',
          summary: 'Score document on clarity, persuasiveness, completeness, professionalism and audience fit with improvement recommendations',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['document_content', 'document_type'],
                  properties: {
                    document_content: { type: 'string' },
                    document_type: { type: 'string', enum: ['proposal', 'sow', 'report', 'contract', 'email'] },
                    audience: { type: 'string' },
                    goals: actions,
                    rubric: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Document score result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      overall_score: { type: 'number', minimum: 0, maximum: 100 },
                      grade: { type: 'string', enum: ['A+', 'A', 'B', 'C', 'D'] },
                      dimension_scores: {
                        type: 'object',
                        properties: {
                          clarity: { type: 'number', minimum: 0, maximum: 100 },
                          persuasiveness: { type: 'number', minimum: 0, maximum: 100 },
                          completeness: { type: 'number', minimum: 0, maximum: 100 },
                          professionalism: { type: 'number', minimum: 0, maximum: 100 },
                          audience_fit: { type: 'number', minimum: 0, maximum: 100 },
                        },
                      },
                      strengths: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            aspect: { type: 'string' },
                            example: { type: 'string' },
                          },
                        },
                      },
                      weaknesses: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            aspect: { type: 'string' },
                            recommendation: { type: 'string' },
                            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                          },
                        },
                      },
                      missing_sections: actions,
                      language_issues: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            issue: { type: 'string' },
                            fix: { type: 'string' },
                          },
                        },
                      },
                      reading_level: { type: 'string' },
                      estimated_close_rate_impact: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing document_content or document_type' },
            '500': { description: 'Document scoring failed' },
          },
        },
      },
      '/personalize-document': {
        post: {
          operationId: 'personalizeDocument',
          summary: 'Personalize a document template for a specific recipient with tailored examples, tone and value propositions',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['template_content', 'recipient_profile'],
                  properties: {
                    template_content: { type: 'string' },
                    recipient_profile: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        company: { type: 'string' },
                        role: { type: 'string' },
                        industry: { type: 'string' },
                        pain_points: actions,
                      },
                    },
                    tone: { type: 'string' },
                    personalization_depth: { type: 'string', enum: ['light', 'moderate', 'deep'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Personalized document result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      personalized_content: { type: 'string' },
                      personalizations_made: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            original: { type: 'string' },
                            replacement: { type: 'string' },
                            reason: { type: 'string' },
                          },
                        },
                      },
                      personalization_score: { type: 'number', minimum: 0, maximum: 100 },
                      relevance_score: { type: 'number', minimum: 0, maximum: 100 },
                      pain_points_addressed: actions,
                      tone_match: { type: 'number', minimum: 0, maximum: 100 },
                      recommended_additional_personalizations: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing template_content or recipient_profile' },
            '500': { description: 'Document personalization failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'proposalExecutionGate',
          summary: 'Evaluate whether a document is ready to send or needs revision based on completeness, quality and risk factors',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['document_type', 'document_context'],
                  properties: {
                    document_type: { type: 'string' },
                    document_context: { type: 'string' },
                    completeness_threshold: { type: 'number', minimum: 0, maximum: 1 },
                    quality_threshold: { type: 'number', minimum: 0, maximum: 1 },
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
                      execute: { type: 'boolean' },
                      confidence: { type: 'number', minimum: 0, maximum: 1 },
                      ready_to_send: { type: 'boolean' },
                      blocking_issues: actions,
                      warnings: actions,
                      quality_score: { type: 'number', minimum: 0, maximum: 100 },
                      recommended_action: { type: 'string', enum: ['send', 'revise', 'personalize_first', 'legal_review'] },
                      chain_to: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing document_type or document_context' },
            '500': { description: 'Execution gate check failed' },
          },
        },
      },
    },
  });
});

export default router;
