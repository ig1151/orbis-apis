import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Voice Intelligence API',
      version: '1.0.0',
      description: 'AI-powered voice and call intelligence for autonomous agents — analyze transcripts, extract action items, score sentiment, detect objections, summarize calls, profile speakers, generate coaching insights, and extract meeting intelligence',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/voice-intelligence' }],
    paths: {
      '/analyze-transcript': {
        post: {
          operationId: 'analyzeTranscript',
          summary: 'Analyze call/meeting transcript for sentiment, key themes, conversation dynamics, and actionable insights',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['transcript'],
                  properties: {
                    transcript: { type: 'string' },
                    call_type: { type: 'string', enum: ['sales', 'support', 'interview', 'meeting'] },
                    participants: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' } } } },
                    duration_minutes: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Transcript analysis result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      call_type: { type: 'string' },
                      duration_minutes: { type: 'number', nullable: true },
                      overall_sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
                      sentiment_score: { type: 'number', minimum: 0, maximum: 1 },
                      key_themes: actions,
                      talk_ratio: { type: 'object', additionalProperties: { type: 'number' } },
                      conversation_flow: { type: 'string', enum: ['structured', 'chaotic', 'one_sided'] },
                      engagement_level: { type: 'string', enum: ['high', 'medium', 'low'] },
                      key_moments: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            timestamp_approx: { type: 'string' },
                            moment_type: { type: 'string', enum: ['decision', 'objection', 'commitment', 'question', 'insight'] },
                            description: { type: 'string' },
                          },
                        },
                      },
                      next_steps_mentioned: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing transcript' },
            '500': { description: 'Analysis failed' },
          },
        },
      },
      '/extract-action-items': {
        post: {
          operationId: 'extractActionItems',
          summary: 'Extract all action items, commitments and follow-ups from a transcript with owners, deadlines, and priority',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['transcript'],
                  properties: {
                    transcript: { type: 'string' },
                    participants: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' } } } },
                    meeting_date: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Extracted action items result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      action_items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            action: { type: 'string' },
                            owner: { type: 'string', nullable: true },
                            deadline: { type: 'string', nullable: true },
                            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                            context: { type: 'string' },
                            confidence: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      decisions_made: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            decision: { type: 'string' },
                            decided_by: { type: 'string' },
                            context: { type: 'string' },
                          },
                        },
                      },
                      questions_unresolved: actions,
                      commitments: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            commitment: { type: 'string' },
                            committed_by: { type: 'string' },
                            to_whom: { type: 'string', nullable: true },
                          },
                        },
                      },
                      total_action_items: { type: 'number' },
                      high_priority_count: { type: 'number' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing transcript' },
            '500': { description: 'Extraction failed' },
          },
        },
      },
      '/sentiment-score': {
        post: {
          operationId: 'sentimentScore',
          summary: 'Score emotional tone and sentiment at overall and per-speaker level with emotional peaks and rapport score',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['transcript'],
                  properties: {
                    transcript: { type: 'string' },
                    speaker_labels: { type: 'object', additionalProperties: { type: 'string' } },
                    segment_level: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Sentiment scoring result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      overall_sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
                      overall_score: { type: 'number', minimum: 0, maximum: 1 },
                      per_speaker: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            speaker: { type: 'string' },
                            sentiment: { type: 'string' },
                            score: { type: 'number', minimum: 0, maximum: 1 },
                            emotion_profile: {
                              type: 'object',
                              properties: {
                                enthusiasm: { type: 'number', minimum: 0, maximum: 1 },
                                frustration: { type: 'number', minimum: 0, maximum: 1 },
                                confidence: { type: 'number', minimum: 0, maximum: 1 },
                                uncertainty: { type: 'number', minimum: 0, maximum: 1 },
                              },
                            },
                          },
                        },
                      },
                      sentiment_timeline: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            segment: { type: 'string' },
                            sentiment: { type: 'string' },
                            score: { type: 'number', minimum: 0, maximum: 1 },
                            notable: { type: 'boolean' },
                          },
                        },
                      },
                      emotional_peaks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: { type: 'string', enum: ['positive', 'negative'] },
                            trigger: { type: 'string' },
                            speaker: { type: 'string' },
                          },
                        },
                      },
                      rapport_score: { type: 'number', minimum: 0, maximum: 1 },
                      tension_moments: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing transcript' },
            '500': { description: 'Sentiment scoring failed' },
          },
        },
      },
      '/objection-detect': {
        post: {
          operationId: 'objectionDetect',
          summary: 'Detect and classify all objections, concerns, and hesitations with handling quality and coaching summary',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['transcript'],
                  properties: {
                    transcript: { type: 'string' },
                    context: { type: 'string', enum: ['sales', 'support', 'negotiation'] },
                    product_or_service: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Objection detection result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      objections_found: { type: 'number' },
                      objections: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            objection_text: { type: 'string' },
                            type: { type: 'string', enum: ['price', 'timing', 'need', 'authority', 'competition', 'trust', 'feature'] },
                            severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                            handled_well: { type: 'boolean' },
                            response_quality: { type: 'string', enum: ['good', 'adequate', 'poor', 'unaddressed'] },
                            better_response_suggestion: { type: 'string' },
                          },
                        },
                      },
                      buying_signals: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            signal: { type: 'string' },
                            strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
                          },
                        },
                      },
                      deal_risk_score: { type: 'number', minimum: 0, maximum: 1 },
                      overall_objection_handling_score: { type: 'number', minimum: 0, maximum: 100 },
                      patterns: actions,
                      coaching_summary: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing transcript' },
            '500': { description: 'Objection detection failed' },
          },
        },
      },
      '/call-summary': {
        post: {
          operationId: 'callSummary',
          summary: 'Generate structured call summary with executive overview, key discussion points, outcomes and next steps',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['transcript'],
                  properties: {
                    transcript: { type: 'string' },
                    call_type: { type: 'string' },
                    max_length: { type: 'number' },
                    focus_areas: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Call summary result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      executive_summary: { type: 'string' },
                      key_discussion_points: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            topic: { type: 'string' },
                            summary: { type: 'string' },
                            outcome: { type: 'string', nullable: true },
                          },
                        },
                      },
                      decisions_reached: actions,
                      action_items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            action: { type: 'string' },
                            owner: { type: 'string' },
                            deadline: { type: 'string' },
                          },
                        },
                      },
                      open_issues: actions,
                      relationship_status: { type: 'string' },
                      call_effectiveness_score: { type: 'number', minimum: 0, maximum: 100 },
                      follow_up_urgency: { type: 'string', enum: ['high', 'medium', 'low'] },
                      recommended_follow_up_message: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing transcript' },
            '500': { description: 'Summary generation failed' },
          },
        },
      },
      '/speaker-profile': {
        post: {
          operationId: 'speakerProfile',
          summary: 'Build a communication profile for a speaker based on language patterns, style, and behaviors in the transcript',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['transcript', 'speaker_name'],
                  properties: {
                    transcript: { type: 'string' },
                    speaker_name: { type: 'string' },
                    role: { type: 'string' },
                    context: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Speaker profile result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      speaker_name: { type: 'string' },
                      communication_style: { type: 'string' },
                      traits: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            trait: { type: 'string' },
                            evidence: { type: 'string' },
                            strength: { type: 'string', enum: ['high', 'medium', 'low'] },
                          },
                        },
                      },
                      vocabulary_complexity: { type: 'string', enum: ['low', 'medium', 'high', 'technical'] },
                      dominant_behaviors: { type: 'array', items: { type: 'string', enum: ['assertive', 'questioning', 'listening', 'deflecting', 'leading', 'agreeing'] } },
                      persuasion_style: { type: 'string', enum: ['logical', 'emotional', 'social', 'authoritative'] },
                      rapport_indicators: { type: 'string', enum: ['high', 'medium', 'low'] },
                      areas_for_improvement: actions,
                      strengths: actions,
                      preferred_engagement_approach: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing transcript or speaker_name' },
            '500': { description: 'Profile generation failed' },
          },
        },
      },
      '/coaching-insights': {
        post: {
          operationId: 'coachingInsights',
          summary: 'Generate coaching feedback for a specified role — wins, skill gaps, missed opportunities, and practice scenarios',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['transcript', 'role_to_coach'],
                  properties: {
                    transcript: { type: 'string' },
                    role_to_coach: { type: 'string' },
                    context: { type: 'string' },
                    goals: { type: 'array', items: { type: 'string' } },
                    skill_areas: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Coaching insights result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      role_to_coach: { type: 'string' },
                      overall_performance_score: { type: 'number', minimum: 0, maximum: 100 },
                      wins: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            behavior: { type: 'string' },
                            impact: { type: 'string' },
                            quote: { type: 'string' },
                          },
                        },
                      },
                      improvement_areas: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            area: { type: 'string' },
                            severity: { type: 'string', enum: ['critical', 'important', 'minor'] },
                            example_from_transcript: { type: 'string' },
                            recommended_technique: { type: 'string' },
                          },
                        },
                      },
                      missed_opportunities: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            opportunity: { type: 'string' },
                            what_to_do: { type: 'string' },
                          },
                        },
                      },
                      talk_time_assessment: { type: 'string' },
                      questioning_quality: { type: 'number', minimum: 0, maximum: 100 },
                      questioning_assessment: { type: 'string' },
                      listening_indicators: { type: 'string', enum: ['high', 'medium', 'low'] },
                      priority_coaching_focus: actions,
                      practice_scenarios: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            scenario: { type: 'string' },
                            objective: { type: 'string' },
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
            '400': { description: 'Missing transcript or role_to_coach' },
            '500': { description: 'Coaching insights generation failed' },
          },
        },
      },
      '/meeting-intelligence': {
        post: {
          operationId: 'meetingIntelligence',
          summary: 'Extract full meeting intelligence — effectiveness, alignment, decisions, blockers, and follow-ups tailored to meeting type',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['transcript', 'meeting_type'],
                  properties: {
                    transcript: { type: 'string' },
                    meeting_type: { type: 'string', enum: ['standup', 'planning', 'retrospective', 'sales', 'executive', 'one_on_one'] },
                    attendees: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' } } } },
                    meeting_date: { type: 'string' },
                    agenda: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Meeting intelligence result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      meeting_type: { type: 'string' },
                      effectiveness_score: { type: 'number', minimum: 0, maximum: 100 },
                      time_well_spent: { type: 'boolean' },
                      agenda_coverage: { type: 'string' },
                      key_decisions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            decision: { type: 'string' },
                            impact: { type: 'string', enum: ['high', 'medium', 'low'] },
                            owner: { type: 'string' },
                          },
                        },
                      },
                      blockers_identified: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            blocker: { type: 'string' },
                            owner: { type: 'string' },
                            urgency: { type: 'string', enum: ['high', 'medium', 'low'] },
                          },
                        },
                      },
                      alignment_score: { type: 'number', minimum: 0, maximum: 1 },
                      participation_balance: { type: 'string', enum: ['balanced', 'dominated', 'passive'] },
                      meeting_health: { type: 'string', enum: ['productive', 'unfocused', 'dominated', 'efficient'] },
                      recommended_changes_for_next_meeting: actions,
                      follow_up_items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            item: { type: 'string' },
                            owner: { type: 'string' },
                            due: { type: 'string' },
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
            '400': { description: 'Missing transcript or meeting_type' },
            '500': { description: 'Meeting intelligence extraction failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'voiceExecutionGate',
          summary: 'Evaluate whether the intended follow-up action is appropriate based on call context and stage',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['call_context', 'intended_action'],
                  properties: {
                    call_context: { type: 'string' },
                    intended_action: { type: 'string' },
                    risk_threshold: { type: 'number' },
                    call_stage: { type: 'string' },
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
                      risk_score: { type: 'number', minimum: 0, maximum: 1 },
                      blocking_flags: actions,
                      warnings: actions,
                      recommended_action: { type: 'string', enum: ['proceed', 'modify', 'delay', 'escalate'] },
                      timing_recommendation: { type: 'string' },
                      chain_to: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing call_context or intended_action' },
            '500': { description: 'Gate check failed' },
          },
        },
      },
    },
  });
});

export default router;
