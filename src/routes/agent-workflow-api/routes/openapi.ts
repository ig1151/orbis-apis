import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Agent Workflow API',
      version: '2.0.0',
      description: 'Plan, execute, monitor, retry and optimize multi-step workflows for autonomous AI agents. Supports structured step tracking, retry logic, workflow optimization and pre-built templates for common agent tasks.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: { create: '$0.005', run: '$0.008', status: '$0.002', retry: '$0.004', optimize: '$0.005', decompose: '$0.006', templates: '$0.002' },
        high_volume: { run: '$0.005', decompose: '$0.004' }
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/agent-workflow' }],
    components: {
      securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
      schemas: {
        WorkflowStep: {
          type: 'object',
          properties: {
            step: { type: 'number' },
            name: { type: 'string' },
            type: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'skipped'] },
            input: { type: 'object' },
            output: { type: 'object' },
            duration_ms: { type: 'number' },
            error: { type: 'string', nullable: true },
            dependencies: { type: 'array', items: { type: 'number' } }
          }
        },
        Workflow: {
          type: 'object',
          properties: {
            workflow_id: { type: 'string' },
            name: { type: 'string' },
            goal: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
            steps: { type: 'array', items: { '$ref': '#/components/schemas/WorkflowStep' } },
            result: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time', nullable: true },
            duration_ms: { type: 'number' },
            metadata: { type: 'object' }
          }
        },
        Privacy: { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } }
      }
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/create': {
        post: {
          operationId: 'createWorkflow',
          summary: 'Define a new workflow with name, goal and step definitions',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'goal'], properties: { name: { type: 'string' }, goal: { type: 'string' }, steps: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' }, input: { type: 'object' }, dependencies: { type: 'array', items: { type: 'number' } } } } }, template: { type: 'string' }, metadata: { type: 'object' } } } } } },
          responses: {
            '200': { description: 'Workflow created', content: { 'application/json': { schema: { type: 'object', properties: { workflow_id: { type: 'string' }, name: { type: 'string' }, goal: { type: 'string' }, status: { type: 'string', enum: ['pending'] }, steps_count: { type: 'number' }, created_at: { type: 'string', format: 'date-time' }, confidence_per_section: confidence, privacy } } } } },
            '400': { description: 'Missing required fields' },
            '500': { description: 'Creation failed' }
          }
        }
      },
      '/run': {
        post: {
          operationId: 'runWorkflow',
          summary: 'Execute a workflow by goal or workflow_id — returns structured step results and metadata',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { workflow_id: { type: 'string' }, goal: { type: 'string' }, input: { type: 'object' }, template: { type: 'string' }, timeout_ms: { type: 'number' } } } } } },
          responses: {
            '200': { description: 'Workflow execution result', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Workflow' } } } },
            '400': { description: 'Missing workflow_id or goal' },
            '500': { description: 'Execution failed' }
          }
        }
      },
      '/:workflow_id/status': {
        get: {
          operationId: 'getWorkflowStatus',
          summary: 'Get current status and metadata for a workflow',
          parameters: [{ name: 'workflow_id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Workflow status', content: { 'application/json': { schema: { type: 'object', properties: { workflow_id: { type: 'string' }, status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] }, progress_pct: { type: 'number', minimum: 0, maximum: 100 }, steps_completed: { type: 'number' }, steps_total: { type: 'number' }, current_step: { type: 'string', nullable: true }, elapsed_ms: { type: 'number' }, privacy } } } } },
            '404': { description: 'Workflow not found' },
            '500': { description: 'Status check failed' }
          }
        }
      },
      '/:workflow_id/retry': {
        post: {
          operationId: 'retryWorkflow',
          summary: 'Retry a failed workflow — only available for workflows with status: failed',
          parameters: [{ name: 'workflow_id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { from_step: { type: 'number' }, override_input: { type: 'object' } } } } } },
          responses: {
            '200': { description: 'Retry initiated', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Workflow' } } } },
            '400': { description: 'Workflow not in failed state' },
            '404': { description: 'Workflow not found' },
            '500': { description: 'Retry failed' }
          }
        }
      },
      '/:workflow_id/optimize': {
        post: {
          operationId: 'optimizeWorkflow',
          summary: 'Analyze a completed workflow and return optimization suggestions with estimated improvements',
          parameters: [{ name: 'workflow_id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Optimization suggestions', content: { 'application/json': { schema: { type: 'object', properties: { workflow_id: { type: 'string' }, suggestions: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, description: { type: 'string' }, estimated_improvement_pct: { type: 'number' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] } } } }, estimated_time_saving_ms: { type: 'number' }, estimated_cost_saving_pct: { type: 'number' }, parallelizable_steps: actions, confidence_per_section: confidence, privacy } } } } },
            '404': { description: 'Workflow not found' },
            '500': { description: 'Optimization failed' }
          }
        }
      },
      '/decompose': {
        post: {
          operationId: 'decomposeGoal',
          summary: 'Decompose a goal into executable steps with type, dependencies, duration estimates and complexity rating',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['goal'], properties: { goal: { type: 'string' }, context: { type: 'object' }, max_steps: { type: 'number' }, complexity: { type: 'string', enum: ['simple', 'moderate', 'complex'] } } } } } },
          responses: {
            '200': { description: 'Decomposed workflow plan', content: { 'application/json': { schema: { type: 'object', properties: { goal: { type: 'string' }, complexity: { type: 'string', enum: ['simple', 'moderate', 'complex'] }, steps: { type: 'array', items: { type: 'object', properties: { step: { type: 'number' }, name: { type: 'string' }, type: { type: 'string' }, description: { type: 'string' }, estimated_duration_ms: { type: 'number' }, dependencies: { type: 'array', items: { type: 'number' } }, required: { type: 'boolean' } } } }, total_estimated_duration_ms: { type: 'number' }, parallel_opportunities: actions, recommended_template: { type: 'string', nullable: true }, confidence_per_section: confidence, privacy } } } } },
            '400': { description: 'Missing goal' },
            '500': { description: 'Decomposition failed' }
          }
        }
      },
      '/templates': {
        get: {
          operationId: 'listTemplates',
          summary: 'List all available workflow templates with input/output schemas and step definitions',
          responses: {
            '200': { description: 'Template list', content: { 'application/json': { schema: { type: 'object', properties: { templates: { type: 'array', items: { type: 'object', properties: { template_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, category: { type: 'string' }, steps_count: { type: 'number' }, estimated_duration_ms: { type: 'number' }, input_schema: { type: 'object' } } } }, total: { type: 'number' }, privacy } } } } },
            '500': { description: 'Failed to list templates' }
          }
        }
      },
      '/execution-gate': {
        post: {
          operationId: 'workflowExecutionGate',
          summary: 'Gate workflow execution based on complexity, cost estimate and resource availability',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['workflow_id'], properties: { workflow_id: { type: 'string' }, budget_usdc: { type: 'number' }, risk_threshold: { type: 'number', minimum: 0, maximum: 1 }, require_human_approval: { type: 'boolean' } } } } } },
          responses: {
            '200': { description: 'Gate decision', content: { 'application/json': { schema: { type: 'object', properties: { execute: { type: 'boolean' }, workflow_id: { type: 'string' }, estimated_cost_usdc: { type: 'number' }, estimated_duration_ms: { type: 'number' }, risk_level: { type: 'string', enum: ['low', 'medium', 'high'] }, blocking_flags: actions, recommended_action: { type: 'string', enum: ['proceed', 'require_approval', 'block'] }, human_approval_required: { type: 'boolean' }, confidence_per_section: confidence, privacy } } } } },
            '400': { description: 'Missing workflow_id' },
            '500': { description: 'Gate check failed' }
          }
        }
      }
    },
  });
});

export default router;
