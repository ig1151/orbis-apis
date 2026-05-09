import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Agent Observability & Telemetry API',
      version: '1.0.0',
      description: 'Full-stack observability and telemetry for autonomous agents — log tool calls, trace workflows, replay sessions, analyze costs, diagnose failures, score performance, detect anomalies, and gate execution based on live signals',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: {
          'log-tool-call': 0.003, 'trace-workflow': 0.006, 'replay-agent': 0.008,
          'cost-analysis': 0.005, 'failure-analysis': 0.007, 'performance-score': 0.005,
          'anomaly-detect': 0.006, 'ingest-event': 0.002, 'session-summary': 0.006,
          'error-budget': 0.005, 'slo-report': 0.007, 'export-traces': 0.004,
          'webhook-alert': 0.003, 'monitor-agent-session': 0.018, 'execution-gate': 0.002,
        },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/agent-observability' }],
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
      '/log-tool-call': {
        post: {
          operationId: 'logToolCall',
          summary: 'Log and enrich a tool call with classification, anomaly detection, cost efficiency and telemetry benchmarks',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agent_id', 'tool_name', 'input', 'output'],
                  properties: {
                    agent_id: { type: 'string' },
                    tool_name: { type: 'string' },
                    input: { type: 'object' },
                    output: { type: 'object' },
                    duration_ms: { type: 'number' },
                    session_id: { type: 'string' },
                    success: { type: 'boolean' },
                    cost_usdc: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Enriched tool call log entry with telemetry',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      log_id: { type: 'string' },
                      agent_id: { type: 'string' },
                      tool_name: { type: 'string' },
                      call_type: { type: 'string', enum: ['api', 'function', 'browser', 'database', 'llm'] },
                      duration_ms: { type: 'number' },
                      success: { type: 'boolean' },
                      cost_usdc: { type: 'number' },
                      efficiency_score: { type: 'number', minimum: 0, maximum: 100 },
                      anomaly_detected: { type: 'boolean' },
                      anomaly_flags: actions,
                      input_size_tokens: { type: 'number' },
                      output_size_tokens: { type: 'number' },
                      session_id: { type: 'string' },
                      timestamp: { type: 'string', format: 'date-time' },
                      telemetry: {
                        type: 'object',
                        properties: {
                          p50_benchmark_ms: { type: 'number' },
                          cost_percentile: { type: 'string' },
                          retry_count: { type: 'number' },
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
            '400': { description: 'Missing agent_id, tool_name, input, or output' },
            '500': { description: 'Log processing failed' },
          },
        },
      },
      '/trace-workflow': {
        post: {
          operationId: 'traceWorkflow',
          summary: 'Trace a multi-step workflow identifying bottlenecks, cost hotspots, failures and optimization opportunities',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['workflow_id', 'steps'],
                  properties: {
                    workflow_id: { type: 'string' },
                    steps: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          step: { type: 'number' },
                          tool: { type: 'string' },
                          duration_ms: { type: 'number' },
                          success: { type: 'boolean' },
                          cost_usdc: { type: 'number' },
                        },
                      },
                    },
                    agent_id: { type: 'string' },
                    goal: { type: 'string' },
                    total_duration_ms: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Workflow trace analysis with bottlenecks and optimization opportunities',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      workflow_id: { type: 'string' },
                      agent_id: { type: 'string' },
                      goal: { type: 'string' },
                      total_steps: { type: 'number' },
                      successful_steps: { type: 'number' },
                      failed_steps: { type: 'number' },
                      total_duration_ms: { type: 'number' },
                      total_cost_usdc: { type: 'number' },
                      bottlenecks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            tool: { type: 'string' },
                            duration_ms: { type: 'number' },
                            pct_of_total: { type: 'number' },
                            recommendation: { type: 'string' },
                          },
                        },
                      },
                      cost_breakdown: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            tool: { type: 'string' },
                            cost_usdc: { type: 'number' },
                            pct_of_total: { type: 'number' },
                          },
                        },
                      },
                      failure_analysis: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            tool: { type: 'string' },
                            likely_cause: { type: 'string' },
                          },
                        },
                      },
                      optimization_opportunities: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            opportunity: { type: 'string' },
                            estimated_savings: { type: 'string' },
                          },
                        },
                      },
                      workflow_health: { type: 'string', enum: ['healthy', 'degraded', 'failing'] },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing workflow_id or steps' },
            '500': { description: 'Workflow trace failed' },
          },
        },
      },
      '/replay-agent': {
        post: {
          operationId: 'replayAgent',
          summary: 'Replay an agent session step-by-step with decision path reconstruction, failure points and divergence analysis',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['session_id', 'steps'],
                  properties: {
                    session_id: { type: 'string' },
                    steps: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string' },
                          action: { type: 'string' },
                          tool: { type: 'string' },
                          input: { type: 'object' },
                          output: { type: 'object' },
                          success: { type: 'boolean' },
                        },
                      },
                    },
                    replay_from_step: { type: 'number' },
                    highlight_failures: { type: 'boolean' },
                    compare_to_session: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Agent session replay report with decision path and insights',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      replay_id: { type: 'string' },
                      total_steps: { type: 'number' },
                      replayed_steps: { type: 'number' },
                      decision_path: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            action: { type: 'string' },
                            reasoning: { type: 'string' },
                            alternatives_considered: actions,
                          },
                        },
                      },
                      failure_points: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            failure_type: { type: 'string' },
                            root_cause: { type: 'string' },
                            prevention: { type: 'string' },
                          },
                        },
                      },
                      key_decisions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            decision: { type: 'string' },
                            impact: { type: 'string', enum: ['high', 'medium', 'low'] },
                          },
                        },
                      },
                      session_summary: { type: 'string' },
                      divergence_analysis: { type: 'string', nullable: true },
                      replay_insights: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing session_id or steps' },
            '500': { description: 'Session replay failed' },
          },
        },
      },
      '/cost-analysis': {
        post: {
          operationId: 'costAnalysis',
          summary: 'Analyze agent cost patterns with burn rate, tool breakdown, anomalies and optimization opportunities',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agent_id', 'usage_records'],
                  properties: {
                    agent_id: { type: 'string' },
                    usage_records: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          tool: { type: 'string' },
                          calls: { type: 'number' },
                          cost_usdc: { type: 'number' },
                          period: { type: 'string' },
                        },
                      },
                    },
                    budget_usdc: { type: 'number' },
                    compare_period: { type: 'string' },
                    breakdown_by: { type: 'string', enum: ['tool', 'session', 'goal'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Cost analysis with burn rate and optimization opportunities',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      agent_id: { type: 'string' },
                      total_cost_usdc: { type: 'number' },
                      budget_usdc: { type: 'number', nullable: true },
                      budget_utilization_pct: { type: 'number' },
                      burn_rate: {
                        type: 'object',
                        properties: {
                          daily_usdc: { type: 'number' },
                          monthly_projected_usdc: { type: 'number' },
                        },
                      },
                      cost_by_tool: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            tool: { type: 'string' },
                            cost_usdc: { type: 'number' },
                            calls: { type: 'number' },
                            avg_cost_per_call: { type: 'number' },
                            pct_of_total: { type: 'number' },
                          },
                        },
                      },
                      cost_anomalies: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            tool: { type: 'string' },
                            expected_usdc: { type: 'number' },
                            actual_usdc: { type: 'number' },
                            deviation_pct: { type: 'number' },
                          },
                        },
                      },
                      optimization_opportunities: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            opportunity: { type: 'string' },
                            estimated_monthly_savings_usdc: { type: 'number' },
                            effort: { type: 'string', enum: ['low', 'medium', 'high'] },
                          },
                        },
                      },
                      efficiency_score: { type: 'number', minimum: 0, maximum: 100 },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing agent_id or usage_records' },
            '500': { description: 'Cost analysis failed' },
          },
        },
      },
      '/failure-analysis': {
        post: {
          operationId: 'failureAnalysis',
          summary: 'Diagnose agent failures with root causes, pattern detection, critical failure identification and remediation steps',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['failures'],
                  properties: {
                    failures: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string' },
                          tool: { type: 'string' },
                          error: { type: 'string' },
                          input: { type: 'object' },
                          context: { type: 'string' },
                        },
                      },
                    },
                    agent_id: { type: 'string' },
                    session_id: { type: 'string' },
                    include_patterns: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Failure diagnosis with root causes, patterns and remediation steps',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      total_failures: { type: 'number' },
                      failure_types: {
                        type: 'object',
                        properties: {
                          api_error: { type: 'number' },
                          timeout: { type: 'number' },
                          validation: { type: 'number' },
                          auth: { type: 'number' },
                          logic: { type: 'number' },
                          unknown: { type: 'number' },
                        },
                      },
                      root_causes: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            failure_index: { type: 'number' },
                            root_cause: { type: 'string' },
                            category: { type: 'string' },
                            confidence: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      patterns: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            pattern: { type: 'string' },
                            frequency: { type: 'string', enum: ['high', 'medium', 'low'] },
                            affected_tools: actions,
                            recommendation: { type: 'string' },
                          },
                        },
                      },
                      critical_failures: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            index: { type: 'number' },
                            why_critical: { type: 'string' },
                          },
                        },
                      },
                      remediation_steps: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            for_pattern: { type: 'string' },
                            steps: actions,
                          },
                        },
                      },
                      mttr_estimate: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing failures' },
            '500': { description: 'Failure analysis failed' },
          },
        },
      },
      '/performance-score': {
        post: {
          operationId: 'performanceScore',
          summary: 'Score agent performance across reliability, speed, cost efficiency and task completion with benchmark comparison',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agent_id', 'metrics'],
                  properties: {
                    agent_id: { type: 'string' },
                    metrics: {
                      type: 'object',
                      properties: {
                        success_rate: { type: 'number' },
                        avg_latency_ms: { type: 'number' },
                        cost_per_task_usdc: { type: 'number' },
                        tasks_completed: { type: 'number' },
                        tasks_failed: { type: 'number' },
                      },
                    },
                    benchmark: { type: 'object' },
                    evaluation_period: { type: 'string' },
                    goal_context: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Agent performance scorecard with grade and benchmark comparison',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      agent_id: { type: 'string' },
                      overall_score: { type: 'number', minimum: 0, maximum: 100 },
                      grade: { type: 'string', enum: ['A+', 'A', 'B', 'C', 'D'] },
                      dimension_scores: {
                        type: 'object',
                        properties: {
                          reliability: { type: 'number', minimum: 0, maximum: 100 },
                          speed: { type: 'number', minimum: 0, maximum: 100 },
                          cost_efficiency: { type: 'number', minimum: 0, maximum: 100 },
                          task_completion: { type: 'number', minimum: 0, maximum: 100 },
                        },
                      },
                      vs_benchmark: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            metric: { type: 'string' },
                            agent_value: { type: 'string' },
                            benchmark_value: { type: 'string' },
                            delta: { type: 'string' },
                            assessment: { type: 'string', enum: ['above', 'at', 'below'] },
                          },
                        },
                      },
                      strengths: actions,
                      weaknesses: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            area: { type: 'string' },
                            recommendation: { type: 'string' },
                          },
                        },
                      },
                      optimization_priority: actions,
                      projected_improvement: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing agent_id or metrics' },
            '500': { description: 'Performance scoring failed' },
          },
        },
      },
      '/anomaly-detect': {
        post: {
          operationId: 'anomalyDetect',
          summary: 'Detect behavioral anomalies in agent activity with risk classification, security flags and recommended response action',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agent_id', 'recent_behavior'],
                  properties: {
                    agent_id: { type: 'string' },
                    recent_behavior: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string' },
                          action: { type: 'string' },
                          tool: { type: 'string' },
                          duration_ms: { type: 'number' },
                          cost_usdc: { type: 'number' },
                          success: { type: 'boolean' },
                        },
                      },
                    },
                    baseline_behavior: {
                      type: 'array',
                      items: { type: 'object' },
                    },
                    sensitivity: { type: 'string', enum: ['high', 'medium', 'low'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Anomaly detection report with risk level and recommended action',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      agent_id: { type: 'string' },
                      anomalies_detected: { type: 'number' },
                      anomalies: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            timestamp: { type: 'string' },
                            action: { type: 'string' },
                            type: { type: 'string', enum: ['cost_spike', 'latency_spike', 'failure_cluster', 'unusual_tool', 'off_hours', 'repetition'] },
                            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                            description: { type: 'string' },
                            baseline_expected: { type: 'string' },
                            actual: { type: 'string' },
                          },
                        },
                      },
                      risk_level: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
                      security_flags: actions,
                      reliability_flags: actions,
                      recommended_action: { type: 'string', enum: ['monitor', 'investigate', 'pause_agent', 'alert_human'] },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing agent_id or recent_behavior' },
            '500': { description: 'Anomaly detection failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'observabilityExecutionGate',
          summary: 'Gate agent execution based on live observability signals — performance health, budget, anomaly status and risk score',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agent_id', 'action', 'observability_context'],
                  properties: {
                    agent_id: { type: 'string' },
                    action: { type: 'string' },
                    observability_context: { type: 'object' },
                    performance_threshold: { type: 'number' },
                    cost_budget_remaining_usdc: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Execution gate decision with blocking flags, warnings and recommended action',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      execute: { type: 'boolean' },
                      confidence: { type: 'number', minimum: 0, maximum: 1 },
                      performance_healthy: { type: 'boolean' },
                      budget_available: { type: 'boolean' },
                      anomaly_free: { type: 'boolean' },
                      risk_score: { type: 'number', minimum: 0, maximum: 1 },
                      blocking_flags: actions,
                      warnings: actions,
                      recommended_action: { type: 'string', enum: ['proceed', 'throttle', 'pause', 'alert_and_proceed', 'stop'] },
                      chain_to: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing agent_id, action, or observability_context' },
            '500': { description: 'Gate check failed' },
          },
        },
      },
      '/ingest-event': {
        post: {
          operationId: 'ingestEvent',
          summary: 'Ingest and normalize an agent observability event with anomaly detection and structured telemetry',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['event_type', 'agent_id', 'payload'],
                  properties: {
                    event_type: { type: 'string', enum: ['tool_call', 'llm_request', 'error', 'state_change', 'user_interaction', 'checkpoint'] },
                    agent_id: { type: 'string' },
                    payload: { type: 'object' },
                    session_id: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    severity: { type: 'string', enum: ['debug', 'info', 'warning', 'error', 'critical'] },
                    tags: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ingested event with normalized payload and anomaly flag',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      event_id: { type: 'string' },
                      event_type: { type: 'string' },
                      agent_id: { type: 'string' },
                      ingested: { type: 'boolean' },
                      normalized_payload: { type: 'object' },
                      session_id: { type: 'string' },
                      timestamp_utc: { type: 'string', format: 'date-time' },
                      severity: { type: 'string' },
                      anomaly_flag: { type: 'boolean' },
                      anomaly_reason: { type: 'string', nullable: true },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing event_type, agent_id, or payload' },
            '500': { description: 'Event ingestion failed' },
          },
        },
      },
      '/session-summary': {
        post: {
          operationId: 'sessionSummary',
          summary: 'Summarize an agent session from its event log with cost, timeline, key decisions and outcome',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['session_id', 'events'],
                  properties: {
                    session_id: { type: 'string' },
                    events: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          event_type: { type: 'string' },
                          timestamp: { type: 'string', format: 'date-time' },
                          agent_id: { type: 'string' },
                        },
                      },
                    },
                    include_cost: { type: 'boolean' },
                    include_timeline: { type: 'boolean' },
                    output_format: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Session summary with timeline, costs, and outcome',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      duration_ms: { type: 'number' },
                      total_events: { type: 'number' },
                      agents_involved: actions,
                      tool_calls_made: { type: 'number' },
                      llm_requests_made: { type: 'number' },
                      errors_encountered: { type: 'number' },
                      success_rate: { type: 'number' },
                      cost_usd: { type: 'number' },
                      tokens_used: { type: 'number' },
                      timeline: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            timestamp: { type: 'string', format: 'date-time' },
                            event_type: { type: 'string' },
                            agent_id: { type: 'string' },
                            summary: { type: 'string' },
                          },
                        },
                      },
                      key_decisions: actions,
                      outcome: { type: 'string', enum: ['success', 'partial', 'failure', 'unknown'] },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing session_id or events' },
            '500': { description: 'Session summary failed' },
          },
        },
      },
      '/error-budget': {
        post: {
          operationId: 'errorBudget',
          summary: 'Calculate error budget status with burn rate, projected exhaustion, and recommended action',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['service_name', 'slo_target', 'window_days'],
                  properties: {
                    service_name: { type: 'string' },
                    slo_target: { type: 'number' },
                    window_days: { type: 'number' },
                    current_error_rate: { type: 'number' },
                    incidents: { type: 'array', items: { type: 'object' } },
                    budget_policy: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Error budget analysis with burn rate and projection',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      service_name: { type: 'string' },
                      slo_target: { type: 'number' },
                      window_days: { type: 'number' },
                      error_budget_total_minutes: { type: 'number' },
                      error_budget_remaining_minutes: { type: 'number' },
                      error_budget_consumed_pct: { type: 'number' },
                      burn_rate: { type: 'number' },
                      burn_rate_status: { type: 'string', enum: ['healthy', 'elevated', 'critical', 'exhausted'] },
                      projected_exhaustion_days: { type: 'number' },
                      incidents_in_window: { type: 'number' },
                      recommended_action: { type: 'string', enum: ['maintain', 'throttle', 'alert', 'freeze_deploys', 'incident'] },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing service_name, slo_target, or window_days' },
            '500': { description: 'Error budget calculation failed' },
          },
        },
      },
      '/slo-report': {
        post: {
          operationId: 'sloReport',
          summary: 'Generate a comprehensive SLO compliance report with health status, trends, and top recommendations',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['service_name', 'slo_definitions', 'measurement_window_days'],
                  properties: {
                    service_name: { type: 'string' },
                    slo_definitions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          target: { type: 'number' },
                          metric: { type: 'string' },
                          current_value: { type: 'number' },
                        },
                      },
                    },
                    measurement_window_days: { type: 'number' },
                    include_recommendations: { type: 'boolean' },
                    breakdown_by: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'SLO compliance report with per-SLO status and overall health',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      service_name: { type: 'string' },
                      window_days: { type: 'number' },
                      slos: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            target: { type: 'number' },
                            current: { type: 'number' },
                            status: { type: 'string', enum: ['met', 'at_risk', 'breached'] },
                            remaining_budget_minutes: { type: 'number' },
                            trend: { type: 'string', enum: ['improving', 'stable', 'degrading'] },
                          },
                        },
                      },
                      overall_health: { type: 'string', enum: ['green', 'yellow', 'red'] },
                      slos_met: { type: 'number' },
                      slos_at_risk: { type: 'number' },
                      slos_breached: { type: 'number' },
                      top_recommendations: actions,
                      report_generated_at: { type: 'string', format: 'date-time' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing service_name, slo_definitions, or measurement_window_days' },
            '500': { description: 'SLO report generation failed' },
          },
        },
      },
      '/export-traces': {
        post: {
          operationId: 'exportTraces',
          summary: 'Export agent session traces in json, otlp, jaeger, zipkin or csv format with size estimate and instructions',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['session_ids', 'format'],
                  properties: {
                    session_ids: { type: 'array', items: { type: 'string' } },
                    format: { type: 'string', enum: ['json', 'otlp', 'jaeger', 'zipkin', 'csv'] },
                    include_payloads: { type: 'boolean' },
                    compress: { type: 'boolean' },
                    date_range: {
                      type: 'object',
                      properties: {
                        start: { type: 'string', format: 'date-time' },
                        end: { type: 'string', format: 'date-time' },
                      },
                    },
                    filter_by_agent: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Trace export manifest with instructions and sample trace',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      export_id: { type: 'string' },
                      sessions_exported: { type: 'number' },
                      format: { type: 'string' },
                      total_spans: { type: 'number' },
                      total_events: { type: 'number' },
                      export_instructions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            action: { type: 'string' },
                          },
                        },
                      },
                      sample_trace: { type: 'object' },
                      file_size_estimate_kb: { type: 'number' },
                      compressed: { type: 'boolean' },
                      payloads_included: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing session_ids or format' },
            '500': { description: 'Trace export failed' },
          },
        },
      },
      '/webhook-alert': {
        post: {
          operationId: 'webhookAlert',
          summary: 'Configure and validate a webhook alert for an agent with test payload generation',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['alert_condition', 'webhook_url', 'agent_id'],
                  properties: {
                    alert_condition: { type: 'string', enum: ['error_rate', 'latency_spike', 'anomaly', 'cost_threshold', 'slo_breach', 'agent_down'] },
                    webhook_url: { type: 'string' },
                    agent_id: { type: 'string' },
                    threshold: { type: 'number' },
                    cooldown_ms: { type: 'number' },
                    payload_template: { type: 'object' },
                    severity_filter: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Webhook alert configuration with validation result and test payload',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      webhook_id: { type: 'string' },
                      alert_condition: { type: 'string' },
                      agent_id: { type: 'string' },
                      webhook_url: { type: 'string' },
                      configuration: {
                        type: 'object',
                        properties: {
                          threshold: { type: 'number' },
                          cooldown_ms: { type: 'number' },
                          severity_filter: actions,
                        },
                      },
                      payload_template: { type: 'object' },
                      test_payload: { type: 'object' },
                      activation_status: { type: 'string', enum: ['active', 'pending', 'invalid'] },
                      validation_errors: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing alert_condition, webhook_url, or agent_id' },
            '500': { description: 'Webhook alert configuration failed' },
          },
        },
      },
      '/monitor-agent-session': {
        post: {
          operationId: 'monitorAgentSession',
          summary: 'Flagship: Comprehensive real-time monitoring of an agent session with performance, anomalies, SLO compliance, cost and failure analysis',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agent_id', 'session_id', 'events'],
                  properties: {
                    agent_id: { type: 'string' },
                    session_id: { type: 'string' },
                    events: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          event_type: { type: 'string' },
                          timestamp: { type: 'string', format: 'date-time' },
                          agent_id: { type: 'string' },
                        },
                      },
                    },
                    slo_targets: { type: 'array', items: { type: 'object' } },
                    alert_thresholds: { type: 'object' },
                    include_replay: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Comprehensive session monitoring report with health, anomalies, SLOs, cost and failure analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      run_id: { type: 'string' },
                      agent_id: { type: 'string' },
                      session_id: { type: 'string' },
                      session_summary: {
                        type: 'object',
                        properties: {
                          duration_ms: { type: 'number' },
                          total_events: { type: 'number' },
                          outcome: { type: 'string' },
                          cost_usd: { type: 'number' },
                        },
                      },
                      performance_score: { type: 'number' },
                      anomalies_detected: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: { type: 'string' },
                            severity: { type: 'string' },
                            at_event: { type: 'number' },
                            description: { type: 'string' },
                          },
                        },
                      },
                      slo_status: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            target: { type: 'number' },
                            actual: { type: 'number' },
                            status: { type: 'string' },
                          },
                        },
                      },
                      failure_analysis: {
                        type: 'object',
                        properties: {
                          failures: { type: 'number' },
                          root_causes: actions,
                          prevention: actions,
                        },
                      },
                      cost_analysis: {
                        type: 'object',
                        properties: {
                          total_usd: { type: 'number' },
                          by_tool: { type: 'object' },
                          optimization_potential_usd: { type: 'number' },
                        },
                      },
                      alerts_triggered: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            condition: { type: 'string' },
                            severity: { type: 'string' },
                            at_ms: { type: 'number' },
                          },
                        },
                      },
                      replay_available: { type: 'boolean' },
                      overall_health: { type: 'string', enum: ['green', 'yellow', 'red'] },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing agent_id, session_id, or events' },
            '500': { description: 'Session monitoring failed' },
          },
        },
      },
    },
  });
});

export default router;
