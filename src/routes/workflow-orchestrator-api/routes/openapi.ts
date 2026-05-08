import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Workflow Orchestrator API',
      version: '1.0.0',
      description: 'AI-powered multi-step agent workflow orchestration — build, execute, retry, parallelize and monitor complex agent workflows across any combination of Orbis APIs with full cost estimation and health tracking',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/workflow-orchestrator' }],
    paths: {
      '/build-workflow': {
        post: {
          operationId: 'buildWorkflow',
          summary: 'Build a multi-step agent workflow from a goal with steps, cost estimate and parallel opportunities',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['goal'], properties: { goal: { type: 'string' }, available_apis: { type: 'array', items: { type: 'string' } }, constraints: { type: 'object' }, context: { type: 'string' }, max_steps: { type: 'number' } } } } } },
          responses: {
            '200': {
              description: 'Built workflow plan',
              content: { 'application/json': { schema: { type: 'object', properties: {
                workflow_id: { type: 'string' },
                goal: { type: 'string' },
                steps: { type: 'array', items: { type: 'object', properties: { step_number: { type: 'number' }, api: { type: 'string' }, endpoint: { type: 'string' }, purpose: { type: 'string' }, inputs_from_prev: actions, outputs_to_next: actions, estimated_cost: { type: 'number' }, estimated_ms: { type: 'number' } } } },
                total_steps: { type: 'number' },
                estimated_total_cost: { type: 'number' },
                estimated_total_ms: { type: 'number' },
                parallel_opportunities: { type: 'array', items: { type: 'object', properties: { steps: { type: 'array', items: { type: 'number' } }, reason: { type: 'string' } } } },
                critical_path: { type: 'array', items: { type: 'number' } },
                fallback_strategies: { type: 'array', items: { type: 'object', properties: { step: { type: 'number' }, fallback: { type: 'string' } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing goal' }, '500': { description: 'Build failed' },
          },
        },
      },
      '/execute-workflow': {
        post: {
          operationId: 'executeWorkflow',
          summary: 'Execute a multi-step workflow with per-step result tracking and overall output',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['workflow_id', 'steps'], properties: { workflow_id: { type: 'string' }, steps: { type: 'array', items: { type: 'object', properties: { step_number: { type: 'number' }, api: { type: 'string' }, endpoint: { type: 'string' }, payload: { type: 'object' } } } }, dry_run: { type: 'boolean' } } } } } },
          responses: {
            '200': {
              description: 'Workflow execution result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                workflow_id: { type: 'string' },
                execution_id: { type: 'string' },
                dry_run: { type: 'boolean' },
                status: { type: 'string', enum: ['completed', 'partial', 'failed'] },
                steps_executed: { type: 'number' },
                steps_total: { type: 'number' },
                results: { type: 'array', items: { type: 'object', properties: { step_number: { type: 'number' }, api: { type: 'string' }, status: { type: 'string', enum: ['success', 'failed', 'skipped'] }, output_summary: { type: 'string' }, error: { type: 'string' } } } },
                overall_output: { type: 'object' },
                execution_time_ms: { type: 'number' },
                total_cost: { type: 'number' },
                next_steps: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing workflow_id or steps' }, '500': { description: 'Execution failed' },
          },
        },
      },
      '/retry-failed-step': {
        post: {
          operationId: 'retryFailedStep',
          summary: 'Determine retry strategy for a failed workflow step with root cause analysis',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['workflow_id', 'execution_id', 'failed_step', 'error_message'], properties: { workflow_id: { type: 'string' }, execution_id: { type: 'string' }, failed_step: { type: 'number' }, error_message: { type: 'string' }, attempt_number: { type: 'number' }, max_attempts: { type: 'number' } } } } } },
          responses: {
            '200': {
              description: 'Retry strategy result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                workflow_id: { type: 'string' },
                failed_step: { type: 'number' },
                retry_recommended: { type: 'boolean' },
                strategy: { type: 'string', enum: ['immediate', 'backoff', 'alternative', 'skip', 'abort'] },
                delay_ms: { type: 'number' },
                max_attempts: { type: 'number' },
                alternative_step: { type: 'object', nullable: true, properties: { api: { type: 'string' }, endpoint: { type: 'string' }, reason: { type: 'string' } } },
                root_cause_analysis: { type: 'string' },
                prevention_tips: actions,
                escalation_required: { type: 'boolean' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing required fields' }, '500': { description: 'Retry analysis failed' },
          },
        },
      },
      '/parallel-execution': {
        post: {
          operationId: 'parallelExecution',
          summary: 'Plan and execute parallel workflow branches with merge strategy and speedup estimation',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['workflow_id', 'parallel_branches'], properties: { workflow_id: { type: 'string' }, parallel_branches: { type: 'array', items: { type: 'object', properties: { branch_id: { type: 'string' }, steps: { type: 'array', items: { type: 'object' } } } } }, merge_strategy: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Parallel execution plan',
              content: { 'application/json': { schema: { type: 'object', properties: {
                workflow_id: { type: 'string' },
                branches_planned: { type: 'number' },
                execution_plan: { type: 'array', items: { type: 'object', properties: { branch_id: { type: 'string' }, steps: { type: 'number' }, estimated_ms: { type: 'number' }, dependencies: actions } } },
                merge_strategy: { type: 'string', enum: ['first_complete', 'all_complete', 'majority', 'weighted'] },
                expected_speedup: { type: 'number' },
                resource_contention: { type: 'array', items: { type: 'object', properties: { resource: { type: 'string' }, branches: actions, resolution: { type: 'string' } } } },
                merge_logic: { type: 'string' },
                estimated_total_ms: { type: 'number' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing workflow_id or parallel_branches' }, '500': { description: 'Parallel planning failed' },
          },
        },
      },
      '/cost-estimator': {
        post: {
          operationId: 'costEstimator',
          summary: 'Estimate cost and time for a workflow before execution with optimization opportunities',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['workflow_steps'], properties: { workflow_steps: { type: 'array', items: { type: 'object', properties: { api: { type: 'string' }, endpoint: { type: 'string' }, calls_per_run: { type: 'number' } } } }, runs_per_month: { type: 'number' }, context: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Cost estimation result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                per_run_cost: { type: 'number' },
                per_run_time_ms: { type: 'number' },
                monthly_cost: { type: 'number' },
                cost_breakdown: { type: 'array', items: { type: 'object', properties: { step: { type: 'string' }, api: { type: 'string' }, endpoint: { type: 'string' }, cost_per_call: { type: 'number' }, calls: { type: 'number' }, subtotal: { type: 'number' } } } },
                optimization_opportunities: { type: 'array', items: { type: 'object', properties: { change: { type: 'string' }, savings_per_run: { type: 'number' }, tradeoff: { type: 'string' } } } },
                cost_tier: { type: 'string', enum: ['ultra_low', 'low', 'medium', 'high'] },
                roi_indicators: { type: 'array', items: { type: 'object', properties: { metric: { type: 'string' }, expected_value: { type: 'string' } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing workflow_steps' }, '500': { description: 'Cost estimation failed' },
          },
        },
      },
      '/workflow-health': {
        post: {
          operationId: 'workflowHealth',
          summary: 'Analyze health, success rate, bottlenecks and alerts for a workflow',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['workflow_id'], properties: { workflow_id: { type: 'string' }, execution_history: { type: 'array', items: { type: 'object' } }, current_status: { type: 'string' }, metrics: { type: 'object' } } } } } },
          responses: {
            '200': {
              description: 'Workflow health analysis',
              content: { 'application/json': { schema: { type: 'object', properties: {
                workflow_id: { type: 'string' },
                health_score: { type: 'number', minimum: 0, maximum: 100 },
                status: { type: 'string', enum: ['healthy', 'degraded', 'critical', 'unknown'] },
                success_rate: { type: 'number', minimum: 0, maximum: 1 },
                avg_execution_time_ms: { type: 'number' },
                failure_patterns: { type: 'array', items: { type: 'object', properties: { pattern: { type: 'string' }, frequency: { type: 'number' }, impact: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                bottlenecks: { type: 'array', items: { type: 'object', properties: { step: { type: 'string' }, avg_ms: { type: 'number' }, recommendation: { type: 'string' } } } },
                alerts: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['critical', 'warning', 'info'] }, message: { type: 'string' }, action: { type: 'string' } } } },
                trend: { type: 'string', enum: ['improving', 'stable', 'degrading'] },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing workflow_id' }, '500': { description: 'Health analysis failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'workflowExecutionGate',
          summary: 'Gate workflow execution based on readiness, resource constraints and risk score',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['workflow_context', 'intended_workflow'], properties: { workflow_context: { type: 'object' }, intended_workflow: { type: 'string' }, resource_constraints: { type: 'object' } } } } } },
          responses: {
            '200': {
              description: 'Execution gate result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                execute: { type: 'boolean' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                blocking_flags: actions,
                warnings: actions,
                risk_score: { type: 'number', minimum: 0, maximum: 1 },
                recommended_action: { type: 'string' },
                chain_to: actions,
                resource_check: { type: 'object', properties: { sufficient: { type: 'boolean' }, missing: actions } },
                retry_after: { type: 'string', nullable: true },
                privacy,
              } } } },
            },
            '400': { description: 'Missing workflow_context or intended_workflow' }, '500': { description: 'Gate check failed' },
          },
        },
      },
      '/run-workflow': {
        post: {
          operationId: 'runWorkflow',
          summary: 'ONE-CALL: build and execute a complete multi-step workflow from a goal',
          'x-one-call': true,
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['goal'], properties: { goal: { type: 'string' }, context: { type: 'string' }, available_apis: { type: 'array', items: { type: 'string' } }, dry_run: { type: 'boolean' } } } } } },
          responses: {
            '200': {
              description: 'Full workflow build and execution result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                workflow_id: { type: 'string' },
                goal: { type: 'string' },
                built_steps: { type: 'number' },
                execution_id: { type: 'string' },
                status: { type: 'string', enum: ['completed', 'partial', 'failed'] },
                step_results: { type: 'array', items: { type: 'object', properties: { step: { type: 'number' }, api: { type: 'string' }, status: { type: 'string', enum: ['success', 'failed', 'skipped'] }, summary: { type: 'string' } } } },
                final_output: { type: 'object' },
                total_cost: { type: 'number' },
                total_time_ms: { type: 'number' },
                success_rate: { type: 'number', minimum: 0, maximum: 1 },
                next_workflow_suggestions: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing goal' }, '500': { description: 'Workflow run failed' },
          },
        },
      },
    },
  });
});

export default router;
