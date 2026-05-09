import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Multi-Agent Coordination API',
      version: '1.0.0',
      description: 'AI-powered multi-agent coordination for autonomous systems — create teams, assign tasks, route work, merge results, reach consensus, escalate issues, evaluate agents, manage shared state, and gate coordination actions',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: {
          'create-team': 0.006, 'assign-task': 0.005, 'route-work': 0.006,
          'merge-results': 0.007, 'consensus': 0.008, 'escalate': 0.005,
          'evaluate-agent': 0.007, 'shared-state': 0.004, 'execution-gate': 0.002,
          'create-plan': 0.005, 'update-task-status': 0.003, 'retry-task': 0.004,
          'resolve-conflict': 0.007, 'agent-heartbeat': 0.002, 'run-agent-team': 0.015,
        },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/multi-agent' }],
    components: {
      schemas: {
        Privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } },
        ConfidencePerSection: { type: 'object', additionalProperties: { type: 'number' } },
        RecommendedActions: { type: 'array', items: { type: 'string' } },
      },
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/create-team': {
        post: {
          operationId: 'createTeam',
          summary: 'Design a multi-agent team structure with roles, communication protocols and coordination hierarchy',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['team_name', 'goal', 'agents'],
                  properties: {
                    team_name: { type: 'string' },
                    goal: { type: 'string' },
                    agents: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          role: { type: 'string' },
                          capabilities: { type: 'array', items: { type: 'string' } },
                        },
                      },
                    },
                    coordination_style: { type: 'string', enum: ['hierarchical', 'flat', 'consensus'] },
                    shared_memory: { type: 'boolean' },
                    max_parallel_tasks: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Team structure result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      team_id: { type: 'string' },
                      team_name: { type: 'string' },
                      goal: { type: 'string' },
                      coordination_style: { type: 'string', enum: ['hierarchical', 'flat', 'consensus'] },
                      agents: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            role: { type: 'string' },
                            primary_responsibilities: actions,
                            reports_to: { type: 'string', nullable: true },
                            communicates_with: actions,
                          },
                        },
                      },
                      planner_agent: { type: 'string' },
                      executor_agents: actions,
                      evaluator_agent: { type: 'string', nullable: true },
                      capability_gaps: actions,
                      communication_protocol: {
                        type: 'object',
                        properties: {
                          channel: { type: 'string' },
                          frequency: { type: 'string' },
                          format: { type: 'string' },
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
            '400': { description: 'Missing team_name, goal, or agents' },
            '500': { description: 'Team creation failed' },
          },
        },
      },
      '/assign-task': {
        post: {
          operationId: 'assignTask',
          summary: 'Assign a task to the optimal agent based on capabilities, load and role fit with subtask breakdown',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['team_id', 'task', 'available_agents'],
                  properties: {
                    team_id: { type: 'string' },
                    task: { type: 'string' },
                    available_agents: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          role: { type: 'string' },
                          current_load: { type: 'number' },
                          capabilities: { type: 'array', items: { type: 'string' } },
                        },
                      },
                    },
                    priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                    deadline: { type: 'string' },
                    dependencies: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Task assignment result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      task_id: { type: 'string' },
                      task: { type: 'string' },
                      assigned_to: { type: 'string' },
                      assignment_reason: { type: 'string' },
                      priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                      subtasks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            subtask: { type: 'string' },
                            assigned_to: { type: 'string' },
                            estimated_ms: { type: 'number' },
                            depends_on: actions,
                          },
                        },
                      },
                      total_estimated_ms: { type: 'number' },
                      load_after_assignment: { type: 'object', additionalProperties: { type: 'object', properties: { load_pct: { type: 'number' } } } },
                      backup_agent: { type: 'string', nullable: true },
                      escalation_trigger: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing team_id, task, or available_agents' },
            '500': { description: 'Task assignment failed' },
          },
        },
      },
      '/route-work': {
        post: {
          operationId: 'routeWork',
          summary: 'Route a work item to the best available agent based on specialization, availability and load',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['work_item', 'team_id', 'agent_roster'],
                  properties: {
                    work_item: { type: 'string' },
                    team_id: { type: 'string' },
                    agent_roster: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          role: { type: 'string' },
                          specialization: { type: 'string' },
                          availability: { type: 'string' },
                        },
                      },
                    },
                    routing_strategy: { type: 'string', enum: ['capability', 'load', 'round_robin', 'priority'] },
                    context: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Work routing result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      work_item_id: { type: 'string' },
                      routed_to: { type: 'string' },
                      routing_strategy: { type: 'string', enum: ['capability', 'load', 'round_robin', 'priority'] },
                      routing_score: { type: 'number', minimum: 0, maximum: 1 },
                      routing_reasoning: { type: 'string' },
                      alternative_agents: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            score: { type: 'number', minimum: 0, maximum: 1 },
                            reason: { type: 'string' },
                          },
                        },
                      },
                      estimated_start: { type: 'string' },
                      estimated_completion: { type: 'string' },
                      queue_position: { type: 'number' },
                      load_balanced: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing work_item, team_id, or agent_roster' },
            '500': { description: 'Work routing failed' },
          },
        },
      },
      '/merge-results': {
        post: {
          operationId: 'mergeResults',
          summary: 'Merge outputs from multiple agents into a coherent unified result with conflict resolution',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['results', 'merge_goal'],
                  properties: {
                    results: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          agent_id: { type: 'string' },
                          task: { type: 'string' },
                          output: { type: 'string' },
                          confidence: { type: 'number', minimum: 0, maximum: 1 },
                        },
                      },
                    },
                    merge_goal: { type: 'string' },
                    merge_strategy: { type: 'string', enum: ['union', 'intersection', 'weighted', 'consensus'] },
                    conflict_resolution: { type: 'string', enum: ['highest_confidence', 'majority', 'escalate'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Merged result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      merge_id: { type: 'string' },
                      merge_goal: { type: 'string' },
                      merged_output: { type: 'string' },
                      merge_strategy: { type: 'string', enum: ['union', 'intersection', 'weighted', 'consensus'] },
                      agreements: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            point: { type: 'string' },
                            agents_agreeing: actions,
                            confidence: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      conflicts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            point: { type: 'string' },
                            positions: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  agent_id: { type: 'string' },
                                  position: { type: 'string' },
                                },
                              },
                            },
                            resolution: { type: 'string' },
                            resolution_method: { type: 'string' },
                          },
                        },
                      },
                      contributing_agents: actions,
                      coverage_score: { type: 'number', minimum: 0, maximum: 1 },
                      merge_confidence: { type: 'number', minimum: 0, maximum: 1 },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing results or merge_goal' },
            '500': { description: 'Merge failed' },
          },
        },
      },
      '/consensus': {
        post: {
          operationId: 'consensus',
          summary: 'Facilitate consensus among agents with voting weights, agreement analysis and conflict resolution',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['proposals', 'decision_topic'],
                  properties: {
                    proposals: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          agent_id: { type: 'string' },
                          proposal: { type: 'string' },
                          rationale: { type: 'string' },
                        },
                      },
                    },
                    decision_topic: { type: 'string' },
                    consensus_threshold: { type: 'number', minimum: 0, maximum: 1 },
                    voting_weights: { type: 'object', additionalProperties: { type: 'number' } },
                    rounds: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Consensus result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      decision_topic: { type: 'string' },
                      consensus_reached: { type: 'boolean' },
                      consensus_level: { type: 'number', minimum: 0, maximum: 1 },
                      winning_proposal: { type: 'string', nullable: true },
                      vote_breakdown: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            agent_id: { type: 'string' },
                            proposal_supported: { type: 'string' },
                            weight: { type: 'number' },
                            reasoning: { type: 'string' },
                          },
                        },
                      },
                      areas_of_agreement: actions,
                      areas_of_disagreement: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            point: { type: 'string' },
                            positions: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  agent_id: { type: 'string' },
                                  position: { type: 'string' },
                                },
                              },
                            },
                          },
                        },
                      },
                      recommended_resolution: { type: 'string' },
                      next_round_needed: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing proposals or decision_topic' },
            '500': { description: 'Consensus process failed' },
          },
        },
      },
      '/escalate': {
        post: {
          operationId: 'escalate',
          summary: 'Process an escalation request and determine the escalation path, target and resolution approach',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['issue', 'team_id', 'escalation_reason'],
                  properties: {
                    issue: { type: 'string' },
                    team_id: { type: 'string' },
                    escalation_reason: { type: 'string' },
                    failed_agents: { type: 'array', items: { type: 'string' } },
                    attempts: { type: 'integer' },
                    severity: { type: 'string', enum: ['critical', 'high', 'medium'] },
                    context: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Escalation result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      escalation_id: { type: 'string' },
                      issue: { type: 'string' },
                      severity: { type: 'string', enum: ['critical', 'high', 'medium'] },
                      escalate_to: {
                        type: 'object',
                        properties: {
                          type: { type: 'string', enum: ['human', 'senior_agent', 'team_lead'] },
                          id: { type: 'string' },
                          role: { type: 'string' },
                        },
                      },
                      escalation_message: { type: 'string' },
                      context_summary: { type: 'string' },
                      failed_attempts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            agent: { type: 'string' },
                            reason: { type: 'string' },
                            timestamp: { type: 'string' },
                          },
                        },
                      },
                      recommended_resolution: { type: 'string' },
                      estimated_resolution_time: { type: 'string' },
                      human_required: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing issue, team_id, or escalation_reason' },
            '500': { description: 'Escalation processing failed' },
          },
        },
      },
      '/evaluate-agent': {
        post: {
          operationId: 'evaluateAgent',
          summary: 'Evaluate agent performance across tasks with dimension scores, strengths and improvement areas',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agent_id', 'task_history'],
                  properties: {
                    agent_id: { type: 'string' },
                    task_history: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          task: { type: 'string' },
                          outcome: { type: 'string' },
                          duration_ms: { type: 'number' },
                          success: { type: 'boolean' },
                        },
                      },
                    },
                    evaluation_period: { type: 'string' },
                    benchmark_against: { type: 'array', items: { type: 'string' } },
                    dimensions: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Agent evaluation result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      agent_id: { type: 'string' },
                      evaluation_period: { type: 'string' },
                      overall_score: { type: 'number', minimum: 0, maximum: 100 },
                      grade: { type: 'string', enum: ['A+', 'A', 'B', 'C', 'D'] },
                      dimension_scores: {
                        type: 'object',
                        properties: {
                          accuracy: { type: 'number', minimum: 0, maximum: 100 },
                          speed: { type: 'number', minimum: 0, maximum: 100 },
                          reliability: { type: 'number', minimum: 0, maximum: 100 },
                          specialization_fit: { type: 'number', minimum: 0, maximum: 100 },
                          collaboration: { type: 'number', minimum: 0, maximum: 100 },
                        },
                      },
                      task_success_rate: { type: 'number', minimum: 0, maximum: 1 },
                      avg_duration_ms: { type: 'number' },
                      strengths: actions,
                      improvement_areas: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            area: { type: 'string' },
                            recommendation: { type: 'string' },
                          },
                        },
                      },
                      ranking_vs_peers: { type: 'string', nullable: true },
                      recommended_role_adjustments: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing agent_id or task_history' },
            '500': { description: 'Evaluation failed' },
          },
        },
      },
      '/shared-state': {
        post: {
          operationId: 'sharedState',
          summary: 'Manage shared state between agents — read, write, merge or snapshot with conflict detection',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['team_id', 'action', 'state_key'],
                  properties: {
                    team_id: { type: 'string' },
                    action: { type: 'string', enum: ['read', 'write', 'merge', 'snapshot'] },
                    state_key: { type: 'string' },
                    value: {},
                    merge_strategy: { type: 'string' },
                    ttl_seconds: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Shared state result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      team_id: { type: 'string' },
                      state_key: { type: 'string' },
                      action: { type: 'string', enum: ['read', 'write', 'merge', 'snapshot'] },
                      current_value: {},
                      previous_value: {},
                      conflict_detected: { type: 'boolean' },
                      conflict_resolution: { type: 'string', nullable: true },
                      last_modified_by: { type: 'string' },
                      last_modified_at: { type: 'string' },
                      version: { type: 'integer' },
                      ttl_remaining_seconds: { type: 'number', nullable: true },
                      subscribers: actions,
                      state_health: { type: 'string', enum: ['consistent', 'stale', 'conflicted'] },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing team_id, action, or state_key' },
            '500': { description: 'State management failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'multiAgentExecutionGate',
          summary: 'Gate a multi-agent coordination action based on team readiness, consensus, risk and authority',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['coordination_action', 'team_context'],
                  properties: {
                    coordination_action: { type: 'string' },
                    team_context: { type: 'object' },
                    risk_threshold: { type: 'number', minimum: 0, maximum: 1 },
                    require_consensus: { type: 'boolean' },
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
                      team_ready: { type: 'boolean' },
                      consensus_met: { type: 'boolean' },
                      risk_score: { type: 'number', minimum: 0, maximum: 1 },
                      blocking_flags: actions,
                      warnings: actions,
                      recommended_action: { type: 'string', enum: ['proceed', 'wait_for_consensus', 'escalate', 'abort'] },
                      chain_to: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing coordination_action or team_context' },
            '500': { description: 'Gate check failed' },
          },
        },
      },
      '/create-plan': {
        post: {
          operationId: 'createPlan',
          summary: 'Create a phased execution plan for a multi-agent team with critical path and risk analysis',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['goal', 'team_id'],
                  properties: {
                    goal: { type: 'string' },
                    team_id: { type: 'string' },
                    phases: { type: 'array', items: { type: 'object' } },
                    dependencies: { type: 'array', items: { type: 'string' } },
                    deadline: { type: 'string' },
                    priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Plan creation result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      plan_id: { type: 'string' },
                      goal: { type: 'string' },
                      team_id: { type: 'string' },
                      phases: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            phase: { type: 'integer' },
                            name: { type: 'string' },
                            tasks: { type: 'array', items: { type: 'string' } },
                            parallel: { type: 'boolean' },
                            duration_estimate_ms: { type: 'number' },
                          },
                        },
                      },
                      total_tasks: { type: 'integer' },
                      critical_path: { type: 'array', items: { type: 'string' } },
                      risk_flags: { type: 'array', items: { type: 'string' } },
                      dependencies_mapped: { type: 'integer' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing goal or team_id' },
            '500': { description: 'Plan creation failed' },
          },
        },
      },
      '/update-task-status': {
        post: {
          operationId: 'updateTaskStatus',
          summary: 'Update a task status, validate the transition, and identify unblocked downstream tasks',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['task_id', 'status', 'agent_id'],
                  properties: {
                    task_id: { type: 'string' },
                    status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'failed', 'blocked', 'cancelled'] },
                    agent_id: { type: 'string' },
                    result: {},
                    error: { type: 'string' },
                    retry_count: { type: 'integer' },
                    metadata: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Task status update result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      task_id: { type: 'string' },
                      previous_status: { type: 'string' },
                      new_status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'failed', 'blocked', 'cancelled'] },
                      agent_id: { type: 'string' },
                      transition_valid: { type: 'boolean' },
                      downstream_tasks_unblocked: { type: 'array', items: { type: 'string' } },
                      plan_progress_pct: { type: 'number', minimum: 0, maximum: 100 },
                      requires_escalation: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing task_id, status, or agent_id' },
            '500': { description: 'Task status update failed' },
          },
        },
      },
      '/retry-task': {
        post: {
          operationId: 'retryTask',
          summary: 'Evaluate whether to retry a failed task and compute retry strategy with backoff and agent selection',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['task_id', 'agent_id', 'failure_reason'],
                  properties: {
                    task_id: { type: 'string' },
                    agent_id: { type: 'string' },
                    failure_reason: { type: 'string' },
                    max_retries: { type: 'integer' },
                    backoff_strategy: { type: 'string', enum: ['exponential', 'linear', 'fixed'] },
                    alternative_agent: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Retry plan result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      task_id: { type: 'string' },
                      retry_approved: { type: 'boolean' },
                      retry_number: { type: 'integer' },
                      assigned_agent: { type: 'string' },
                      backoff_ms: { type: 'number' },
                      strategy: { type: 'string' },
                      modifications: { type: 'array', items: { type: 'string' } },
                      abort_recommended: { type: 'boolean' },
                      abort_reason: { type: 'string', nullable: true },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing task_id, agent_id, or failure_reason' },
            '500': { description: 'Retry planning failed' },
          },
        },
      },
      '/resolve-conflict': {
        post: {
          operationId: 'resolveConflict',
          summary: 'Resolve a conflict between agents by selecting a winning output and providing a rationale',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['conflict_type', 'agents_involved', 'conflicting_outputs'],
                  properties: {
                    conflict_type: { type: 'string', enum: ['data', 'priority', 'resource', 'opinion', 'timing'] },
                    agents_involved: { type: 'array', items: { type: 'string' } },
                    conflicting_outputs: { type: 'array', items: { type: 'object' } },
                    resolution_strategy: { type: 'string', enum: ['highest_confidence', 'majority', 'arbiter', 'merge'] },
                    arbiter_agent: { type: 'string' },
                    context: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Conflict resolution result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      conflict_type: { type: 'string', enum: ['data', 'priority', 'resource', 'opinion', 'timing'] },
                      resolution: { type: 'string' },
                      winning_output: { type: 'object' },
                      rationale: { type: 'string' },
                      agents_involved: { type: 'array', items: { type: 'string' } },
                      resolution_strategy_used: { type: 'string' },
                      confidence_in_resolution: { type: 'number', minimum: 0, maximum: 1 },
                      dissenting_views: { type: 'array', items: { type: 'string' } },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing conflict_type, agents_involved, or conflicting_outputs' },
            '500': { description: 'Conflict resolution failed' },
          },
        },
      },
      '/agent-heartbeat': {
        post: {
          operationId: 'agentHeartbeat',
          summary: 'Process an agent heartbeat and return health score, alerts and recommended action',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agent_id', 'status'],
                  properties: {
                    agent_id: { type: 'string' },
                    status: { type: 'string', enum: ['healthy', 'degraded', 'overloaded', 'idle', 'offline'] },
                    current_task: { type: 'string' },
                    memory_mb: { type: 'number' },
                    tokens_used: { type: 'integer' },
                    uptime_ms: { type: 'number' },
                    error_rate: { type: 'number', minimum: 0, maximum: 1 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Agent heartbeat assessment',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      agent_id: { type: 'string' },
                      status: { type: 'string', enum: ['healthy', 'degraded', 'overloaded', 'idle', 'offline'] },
                      health_score: { type: 'number', minimum: 0, maximum: 100 },
                      alerts: { type: 'array', items: { type: 'string' } },
                      recommended_action: { type: 'string', enum: ['continue', 'throttle', 'reassign', 'restart', 'retire'] },
                      workload_assessment: { type: 'string' },
                      estimated_capacity_pct: { type: 'number', minimum: 0, maximum: 100 },
                      next_check_ms: { type: 'number' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing agent_id or status' },
            '500': { description: 'Heartbeat processing failed' },
          },
        },
      },
      '/run-agent-team': {
        post: {
          operationId: 'runAgentTeam',
          summary: 'Orchestrate a full multi-agent team run: assemble, plan, execute, merge and report',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['goal', 'context'],
                  properties: {
                    goal: { type: 'string' },
                    context: { type: 'string' },
                    team_size: { type: 'integer' },
                    available_agents: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, role: { type: 'string' }, capabilities: { type: 'array', items: { type: 'string' } } } } },
                    max_parallel_tasks: { type: 'integer' },
                    budget_tokens: { type: 'integer' },
                    dry_run: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Agent team run result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      run_id: { type: 'string' },
                      goal: { type: 'string' },
                      team_assembled: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            agent_id: { type: 'string' },
                            role: { type: 'string' },
                            assigned_tasks: { type: 'array', items: { type: 'string' } },
                          },
                        },
                      },
                      execution_plan: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            phase: { type: 'integer' },
                            tasks: { type: 'array', items: { type: 'string' } },
                            parallel: { type: 'boolean' },
                          },
                        },
                      },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            task: { type: 'string' },
                            agent: { type: 'string' },
                            status: { type: 'string', enum: ['success', 'failed', 'skipped'] },
                            output_summary: { type: 'string' },
                          },
                        },
                      },
                      final_output: { type: 'object' },
                      total_tokens_used: { type: 'integer' },
                      total_cost_usd: { type: 'number' },
                      success_rate: { type: 'number', minimum: 0, maximum: 1 },
                      duration_ms: { type: 'number' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing goal or context' },
            '500': { description: 'Agent team run failed' },
          },
        },
      },
    },
  });
});

export default router;
