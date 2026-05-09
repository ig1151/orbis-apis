import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Outreach Execution API',
      version: '1.0.0',
      description: 'AI-powered autonomous outreach execution for sales and marketing agents — compose messages, personalize templates, build sequences, optimize timing, run A/B tests, classify responses, analyze campaigns, handle objections, and gate outreach execution',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/outreach-execution' }],
    paths: {
      '/compose-message': {
        post: {
          operationId: 'composeMessage',
          summary: 'Compose a personalized outreach message tailored to recipient role, company and message type',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipient', 'message_type', 'purpose'],
                  properties: {
                    recipient: { type: 'object', required: ['name', 'company', 'role', 'industry'], properties: { name: { type: 'string' }, company: { type: 'string' }, role: { type: 'string' }, industry: { type: 'string' } } },
                    message_type: { type: 'string', enum: ['cold_email', 'follow_up', 'linkedin', 'sms', 'voicemail_script'] },
                    purpose: { type: 'string' },
                    sender_context: { type: 'string' },
                    tone: { type: 'string', enum: ['professional', 'warm', 'direct', 'consultative'] },
                    max_words: { type: 'number' },
                    previous_touchpoints: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Composed outreach message with personalization elements and send recommendations',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      subject: { type: 'string', nullable: true },
                      message_body: { type: 'string' },
                      ps_line: { type: 'string', nullable: true },
                      message_type: { type: 'string' },
                      word_count: { type: 'number' },
                      personalization_elements: actions,
                      tone_match: { type: 'string', enum: ['professional', 'warm', 'direct', 'consultative'] },
                      cta: { type: 'string' },
                      expected_reply_rate: { type: 'string', enum: ['high', 'medium', 'low'] },
                      send_timing_recommendation: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing recipient, message_type, or purpose' },
            '500': { description: 'Message composition failed' },
          },
        },
      },
      '/personalize': {
        post: {
          operationId: 'personalizeTemplate',
          summary: 'Personalize an outreach template for a specific recipient with deep contextual hooks',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['template', 'recipient'],
                  properties: {
                    template: { type: 'string' },
                    recipient: {
                      type: 'object',
                      required: ['name', 'company', 'role', 'industry'],
                      properties: {
                        name: { type: 'string' },
                        company: { type: 'string' },
                        role: { type: 'string' },
                        industry: { type: 'string' },
                        pain_points: { type: 'array', items: { type: 'string' } },
                        recent_news: { type: 'string' },
                      },
                    },
                    sender: { type: 'object', properties: { name: { type: 'string' }, company: { type: 'string' }, value_prop: { type: 'string' } } },
                    personalization_depth: { type: 'string', enum: ['light', 'moderate', 'deep'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Personalized message with hooks, scores, and recommended CTA',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      personalized_message: { type: 'string' },
                      subject_line: { type: 'string' },
                      personalizations: { type: 'array', items: { type: 'object', properties: { placeholder: { type: 'string' }, replacement: { type: 'string' }, source: { type: 'string' } } } },
                      relevance_score: { type: 'number', minimum: 0, maximum: 100 },
                      personalization_score: { type: 'number', minimum: 0, maximum: 100 },
                      hooks_used: { type: 'array', items: { type: 'object', properties: { hook: { type: 'string' }, type: { type: 'string', enum: ['news', 'pain_point', 'mutual_connection', 'industry_trend', 'company_milestone'] } } } },
                      recommended_cta: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing template or recipient' },
            '500': { description: 'Personalization failed' },
          },
        },
      },
      '/sequence-builder': {
        post: {
          operationId: 'sequenceBuilder',
          summary: 'Build a complete multi-touch outreach sequence across channels with timing and strategy',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prospect', 'goal', 'channels'],
                  properties: {
                    prospect: { type: 'object', required: ['name', 'company', 'role', 'industry'], properties: { name: { type: 'string' }, company: { type: 'string' }, role: { type: 'string' }, industry: { type: 'string' } } },
                    goal: { type: 'string' },
                    channels: { type: 'array', items: { type: 'string', enum: ['email', 'linkedin', 'phone', 'sms'] } },
                    num_touchpoints: { type: 'number' },
                    sender_context: { type: 'string' },
                    product_or_service: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full outreach sequence with touchpoints, strategy, and timing recommendations',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      sequence_id: { type: 'string' },
                      goal: { type: 'string' },
                      total_touchpoints: { type: 'number' },
                      touchpoints: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            channel: { type: 'string' },
                            day: { type: 'number' },
                            subject: { type: 'string', nullable: true },
                            message: { type: 'string' },
                            cta: { type: 'string' },
                            if_no_response: { type: 'string' },
                          },
                        },
                      },
                      sequence_strategy: { type: 'string' },
                      exit_conditions: actions,
                      expected_reply_rate: { type: 'string' },
                      optimal_timing: { type: 'object', properties: { best_days: actions, best_times: actions } },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing prospect, goal, or channels' },
            '500': { description: 'Sequence build failed' },
          },
        },
      },
      '/timing-optimize': {
        post: {
          operationId: 'timingOptimize',
          summary: 'Determine optimal send time for outreach based on recipient profile and message type',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recipient_profile', 'message_type'],
                  properties: {
                    recipient_profile: {
                      type: 'object',
                      required: ['industry', 'role', 'timezone', 'company_size'],
                      properties: {
                        industry: { type: 'string' },
                        role: { type: 'string' },
                        timezone: { type: 'string' },
                        company_size: { type: 'string' },
                      },
                    },
                    message_type: { type: 'string' },
                    urgency: { type: 'string', enum: ['high', 'medium', 'low'] },
                    previous_open_times: { type: 'array', items: { type: 'string' } },
                    platform: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Optimal send time with alternatives, avoid windows, and follow-up schedule',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      recommended_send_time: { type: 'string' },
                      timezone: { type: 'string' },
                      day_of_week: { type: 'string' },
                      hour_of_day: { type: 'string' },
                      rationale: { type: 'string' },
                      alternative_times: { type: 'array', items: { type: 'object', properties: { time: { type: 'string' }, score: { type: 'number', minimum: 0, maximum: 100 }, rationale: { type: 'string' } } } },
                      avoid_times: { type: 'array', items: { type: 'object', properties: { time: { type: 'string' }, reason: { type: 'string' } } } },
                      follow_up_schedule: { type: 'array', items: { type: 'object', properties: { follow_up_number: { type: 'number' }, days_after: { type: 'number' }, recommended_time: { type: 'string' } } } },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing recipient_profile or message_type' },
            '500': { description: 'Timing optimization failed' },
          },
        },
      },
      '/ab-test': {
        post: {
          operationId: 'abTest',
          summary: 'Analyze outreach message variants for A/B testing with predicted performance and test strategy',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['variants', 'test_goal'],
                  properties: {
                    variants: { type: 'array', items: { type: 'object', required: ['id', 'message'], properties: { id: { type: 'string' }, subject: { type: 'string' }, message: { type: 'string' } } } },
                    test_goal: { type: 'string' },
                    recipient_segment: { type: 'string' },
                    success_metric: { type: 'string', enum: ['open_rate', 'reply_rate', 'click_rate'] },
                    sample_size: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'A/B test analysis with winner prediction, variant scores, and test recommendations',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      recommended_winner: { type: 'string' },
                      predicted_winner_score: { type: 'number', minimum: 0, maximum: 100 },
                      variant_analysis: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            predicted_open_rate: { type: 'string' },
                            predicted_reply_rate: { type: 'string' },
                            strengths: actions,
                            weaknesses: actions,
                            score: { type: 'number', minimum: 0, maximum: 100 },
                          },
                        },
                      },
                      key_differentiators: { type: 'array', items: { type: 'object', properties: { element: { type: 'string' }, impact: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                      test_recommendations: {
                        type: 'object',
                        properties: {
                          min_sample_size: { type: 'number' },
                          test_duration_days: { type: 'number' },
                          success_metric: { type: 'string' },
                          statistical_significance_target: { type: 'number' },
                        },
                      },
                      hypothesis: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing variants or test_goal' },
            '500': { description: 'A/B test analysis failed' },
          },
        },
      },
      '/response-classify': {
        post: {
          operationId: 'responseClassify',
          summary: 'Classify inbound outreach responses by interest level, intent, sentiment, and next action',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['response_text', 'original_outreach'],
                  properties: {
                    response_text: { type: 'string' },
                    original_outreach: { type: 'string' },
                    channel: { type: 'string' },
                    context: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Response classification with intent, signals, objections, and recommended next action',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      classification: { type: 'string', enum: ['interested', 'not_interested', 'timing', 'referral', 'auto_reply', 'unsubscribe', 'neutral', 'objection'] },
                      interest_level: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
                      sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                      intent: { type: 'string', enum: ['schedule_meeting', 'request_info', 'decline', 'negotiate', 'passed_to_other', 'no_intent'] },
                      key_signals: { type: 'array', items: { type: 'object', properties: { signal: { type: 'string' }, interpretation: { type: 'string' } } } },
                      objections: { type: 'array', items: { type: 'object', properties: { objection: { type: 'string' }, suggested_response: { type: 'string' } } } },
                      urgency: { type: 'string', enum: ['high', 'medium', 'low'] },
                      recommended_next_action: { type: 'string' },
                      response_template: { type: 'string' },
                      follow_up_in_days: { type: 'number', nullable: true },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing response_text or original_outreach' },
            '500': { description: 'Response classification failed' },
          },
        },
      },
      '/campaign-analytics': {
        post: {
          operationId: 'campaignAnalytics',
          summary: 'Analyze outreach campaign performance with benchmark comparison, issue detection, and optimizations',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['campaign_name', 'metrics'],
                  properties: {
                    campaign_name: { type: 'string' },
                    metrics: {
                      type: 'object',
                      required: ['sent', 'delivered', 'opened', 'replied', 'bounced', 'unsubscribed'],
                      properties: {
                        sent: { type: 'number' },
                        delivered: { type: 'number' },
                        opened: { type: 'number' },
                        clicked: { type: 'number' },
                        replied: { type: 'number' },
                        bounced: { type: 'number' },
                        unsubscribed: { type: 'number' },
                      },
                    },
                    segment: { type: 'string' },
                    time_period: { type: 'string' },
                    benchmarks: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Campaign analytics with rates, grades, benchmark comparisons, and optimization recommendations',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      campaign_name: { type: 'string' },
                      delivery_rate: { type: 'number', minimum: 0, maximum: 1 },
                      open_rate: { type: 'number', minimum: 0, maximum: 1 },
                      click_rate: { type: 'number', minimum: 0, maximum: 1, nullable: true },
                      reply_rate: { type: 'number', minimum: 0, maximum: 1 },
                      bounce_rate: { type: 'number', minimum: 0, maximum: 1 },
                      unsubscribe_rate: { type: 'number', minimum: 0, maximum: 1 },
                      performance_grade: { type: 'string', enum: ['A+', 'A', 'B', 'C', 'D'] },
                      vs_benchmarks: { type: 'array', items: { type: 'object', properties: { metric: { type: 'string' }, your_rate: { type: 'string' }, benchmark: { type: 'string' }, delta: { type: 'string' }, assessment: { type: 'string', enum: ['above', 'at', 'below'] } } } },
                      issues_detected: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, recommendation: { type: 'string' } } } },
                      top_performing_elements: actions,
                      optimizations: { type: 'array', items: { type: 'object', properties: { optimization: { type: 'string' }, expected_impact: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing campaign_name or metrics' },
            '500': { description: 'Campaign analytics failed' },
          },
        },
      },
      '/objection-handle': {
        post: {
          operationId: 'objectionHandle',
          summary: 'Generate empathetic, compelling responses to sales objections with reframe strategy and proof points',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['objection', 'context', 'prospect_profile'],
                  properties: {
                    objection: { type: 'string' },
                    context: { type: 'string', description: 'Product or service being sold' },
                    prospect_profile: { type: 'object', required: ['role', 'industry', 'company_size'], properties: { role: { type: 'string' }, industry: { type: 'string' }, company_size: { type: 'string' } } },
                    previous_conversation: { type: 'string' },
                    objection_type: { type: 'string' },
                    constraints: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Objection handling with response message, reframe strategy, proof points, and deal risk assessment',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      objection_type: { type: 'string', enum: ['price', 'timing', 'need', 'authority', 'competition', 'trust', 'feature', 'risk'] },
                      response_message: { type: 'string' },
                      reframe_strategy: { type: 'string' },
                      supporting_points: { type: 'array', items: { type: 'object', properties: { point: { type: 'string' }, strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] } } } },
                      proof_points: { type: 'array', items: { type: 'object', properties: { type: { type: 'string', enum: ['case_study', 'stat', 'testimonial'] }, content: { type: 'string' } } } },
                      follow_up_question: { type: 'string' },
                      escalation_needed: { type: 'boolean' },
                      deal_risk: { type: 'string', enum: ['high', 'medium', 'low'] },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing objection, context, or prospect_profile' },
            '500': { description: 'Objection handling failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'outreachExecutionGate',
          summary: 'Gate outreach execution by checking compliance risks, spam signals, timing, and strategic fit',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['outreach_action', 'recipient_context'],
                  properties: {
                    outreach_action: { type: 'string' },
                    recipient_context: { type: 'string' },
                    risk_threshold: { type: 'number', minimum: 0, maximum: 1 },
                    compliance_check: { type: 'boolean' },
                    campaign_context: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Execution gate decision with risk score, compliance flags, and recommended action',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      execute: { type: 'boolean' },
                      confidence: { type: 'number', minimum: 0, maximum: 1 },
                      risk_score: { type: 'number', minimum: 0, maximum: 1 },
                      compliance_flags: actions,
                      spam_risk: { type: 'string', enum: ['high', 'medium', 'low'] },
                      blocking_flags: actions,
                      warnings: actions,
                      recommended_action: { type: 'string', enum: ['send', 'modify', 'delay', 'skip'] },
                      modification_suggestions: actions,
                      chain_to: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing outreach_action or recipient_context' },
            '500': { description: 'Execution gate check failed' },
          },
        },
      },
    },
  });
});

export default router;
