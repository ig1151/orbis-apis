import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Computer Use API',
      version: '1.0.0',
      description: 'AI-powered desktop automation intelligence for autonomous agents — analyze screens, generate automation scripts, locate UI elements, detect workflows, identify errors, audit accessibility, plan tasks and gate execution safety',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/computer-use' }],
    paths: {
      '/analyze-screen': {
        post: {
          operationId: 'analyzeScreen',
          summary: 'Analyze screen state and recommend the best next action toward an objective',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['screen_description', 'objective'], properties: { screen_description: { type: 'string' }, objective: { type: 'string' }, app_context: { type: 'string' }, os: { type: 'string', enum: ['windows', 'mac', 'linux'] }, previous_steps: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Screen analysis result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                current_state: { type: 'string' },
                app_detected: { type: 'string' },
                screen_type: { type: 'string', enum: ['dialog', 'form', 'menu', 'document', 'browser', 'terminal', 'desktop', 'error'] },
                interactive_elements: { type: 'array', items: { type: 'object', properties: { element_type: { type: 'string', enum: ['button', 'input', 'checkbox', 'dropdown', 'link'] }, label: { type: 'string' }, location_hint: { type: 'string' }, likely_action: { type: 'string' } } } },
                recommended_next_action: { type: 'object', properties: { action: { type: 'string', enum: ['click', 'type', 'scroll', 'keypress', 'wait', 'screenshot'] }, target: { type: 'string' }, value: { type: 'string', nullable: true }, reason: { type: 'string' } } },
                objective_progress: { type: 'string' },
                blockers: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing screen_description or objective' }, '500': { description: 'Analysis failed' },
          },
        },
      },
      '/generate-automation': {
        post: {
          operationId: 'generateAutomation',
          summary: 'Generate complete step-by-step desktop automation with error handling and rollback',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['task_description', 'application'], properties: { task_description: { type: 'string' }, application: { type: 'string' }, os: { type: 'string', enum: ['windows', 'mac', 'linux'] }, constraints: { type: 'array', items: { type: 'string' } }, user_skill_level: { type: 'string', enum: ['beginner', 'intermediate', 'expert'] } } } } } },
          responses: {
            '200': {
              description: 'Automation script result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                task_description: { type: 'string' },
                application: { type: 'string' },
                automation_steps: { type: 'array', items: { type: 'object', properties: { step_number: { type: 'number' }, action: { type: 'string' }, target: { type: 'string' }, value: { type: 'string', nullable: true }, wait_after_ms: { type: 'number' }, verify: { type: 'string' }, error_handling: { type: 'string' } } } },
                total_steps: { type: 'number' },
                estimated_duration_seconds: { type: 'number' },
                prerequisites: actions,
                risk_assessment: { type: 'string', enum: ['low', 'medium', 'high'] },
                reversible: { type: 'boolean' },
                rollback_steps: { type: 'array', items: { type: 'string' }, nullable: true },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing task_description or application' }, '500': { description: 'Automation generation failed' },
          },
        },
      },
      '/find-element': {
        post: {
          operationId: 'findElement',
          summary: 'Locate a UI element on screen with multiple ranked locator strategies',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['element_description', 'screen_context'], properties: { element_description: { type: 'string' }, screen_context: { type: 'string' }, element_type: { type: 'string', enum: ['button', 'input', 'text', 'image', 'menu', 'checkbox'] }, search_area: { type: 'string' }, fallback_strategies: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Element locator result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                element_found: { type: 'boolean' },
                locator_strategies: { type: 'array', items: { type: 'object', properties: { strategy: { type: 'string', enum: ['text', 'aria_label', 'class', 'id', 'position', 'image'] }, locator: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, requires_scroll: { type: 'boolean' } } } },
                element_description: { type: 'string' },
                closest_match: { type: 'string' },
                disambiguation_needed: { type: 'boolean' },
                disambiguation_question: { type: 'string', nullable: true },
                fallback_if_not_found: { type: 'string' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing element_description or screen_context' }, '500': { description: 'Element search failed' },
          },
        },
      },
      '/workflow-detect': {
        post: {
          operationId: 'workflowDetect',
          summary: 'Detect workflow patterns from action sequences and suggest optimizations',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['steps_taken', 'goal_context'], properties: { steps_taken: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, target: { type: 'string' }, timestamp: { type: 'string' } } } }, goal_context: { type: 'string' }, app: { type: 'string' }, outcome: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Workflow detection result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                workflow_detected: { type: 'string' },
                workflow_type: { type: 'string', enum: ['data_entry', 'navigation', 'form_filling', 'file_management', 'communication', 'research', 'custom'] },
                goal_inferred: { type: 'string' },
                pattern_confidence: { type: 'number', minimum: 0, maximum: 1 },
                automation_potential: { type: 'string', enum: ['high', 'medium', 'low'] },
                optimizations: { type: 'array', items: { type: 'object', properties: { current_steps: actions, optimized_steps: actions, time_saved_pct: { type: 'number' } } } },
                reusable_components: { type: 'array', items: { type: 'object', properties: { component: { type: 'string' }, description: { type: 'string' } } } },
                similar_workflows: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing steps_taken or goal_context' }, '500': { description: 'Workflow detection failed' },
          },
        },
      },
      '/error-detect': {
        post: {
          operationId: 'errorDetect',
          summary: 'Detect UI errors and anomalies by comparing current screen to expected state',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['screen_description', 'expected_state'], properties: { screen_description: { type: 'string' }, expected_state: { type: 'string' }, app_context: { type: 'string' }, error_history: { type: 'array', items: { type: 'string' } }, severity_threshold: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] } } } } } },
          responses: {
            '200': {
              description: 'Error detection result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                error_detected: { type: 'boolean' },
                error_type: { type: 'string', enum: ['dialog', 'crash', 'freeze', 'unexpected_navigation', 'form_validation', 'permission', 'timeout', 'none'] },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                error_description: { type: 'string' },
                divergence_from_expected: { type: 'string' },
                recovery_actions: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] }, risk: { type: 'string', enum: ['safe', 'caution', 'risky'] } } } },
                auto_recoverable: { type: 'boolean' },
                escalation_needed: { type: 'boolean' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing screen_description or expected_state' }, '500': { description: 'Error detection failed' },
          },
        },
      },
      '/accessibility-audit': {
        post: {
          operationId: 'accessibilityAudit',
          summary: 'Audit application screen for WCAG violations, keyboard traps and screen reader issues',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['screen_description', 'application'], properties: { screen_description: { type: 'string' }, application: { type: 'string' }, wcag_level: { type: 'string', enum: ['A', 'AA', 'AAA'] }, focus_areas: { type: 'array', items: { type: 'string', enum: ['keyboard', 'screen_reader', 'color', 'motion', 'cognitive'] } } } } } } },
          responses: {
            '200': {
              description: 'Accessibility audit result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                accessibility_score: { type: 'number', minimum: 0, maximum: 100 },
                wcag_level_met: { type: 'string' },
                violations: { type: 'array', items: { type: 'object', properties: { criterion: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'serious', 'moderate', 'minor'] }, description: { type: 'string' }, element: { type: 'string' }, fix: { type: 'string' } } } },
                warnings: actions,
                passing_criteria: actions,
                keyboard_navigation: { type: 'string', enum: ['good', 'adequate', 'poor'] },
                screen_reader_compatibility: { type: 'string', enum: ['good', 'adequate', 'poor'] },
                color_contrast_issues: { type: 'number' },
                recommendations: { type: 'array', items: { type: 'object', properties: { recommendation: { type: 'string' }, impact: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing screen_description or application' }, '500': { description: 'Accessibility audit failed' },
          },
        },
      },
      '/task-planner': {
        post: {
          operationId: 'taskPlanner',
          summary: 'Plan a multi-phase computer task with steps, app dependencies and risk factors',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['goal', 'current_context'], properties: { goal: { type: 'string' }, current_context: { type: 'string' }, available_apps: { type: 'array', items: { type: 'string' } }, constraints: { type: 'array', items: { type: 'string' } }, time_limit_minutes: { type: 'number' } } } } } },
          responses: {
            '200': {
              description: 'Task plan result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                goal: { type: 'string' },
                plan_id: { type: 'string' },
                phases: { type: 'array', items: { type: 'object', properties: { phase_number: { type: 'number' }, name: { type: 'string' }, objective: { type: 'string' }, steps: { type: 'array', items: { type: 'object', properties: { step: { type: 'string' }, app: { type: 'string' }, action_type: { type: 'string' }, estimated_seconds: { type: 'number' } } } }, success_criteria: { type: 'string' } } } },
                total_phases: { type: 'number' },
                total_estimated_minutes: { type: 'number' },
                required_apps: actions,
                dependencies: { type: 'array', items: { type: 'object', properties: { phase: { type: 'number' }, depends_on: { type: 'array', items: { type: 'number' } } } } },
                risk_factors: { type: 'array', items: { type: 'object', properties: { risk: { type: 'string' }, mitigation: { type: 'string' } } } },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing goal or current_context' }, '500': { description: 'Task planning failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'computerExecutionGate',
          summary: 'Evaluate whether a desktop action is safe to execute — assesses risk, reversibility and permissions',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['desktop_action', 'system_context'], properties: { desktop_action: { type: 'string' }, system_context: { type: 'string' }, risk_threshold: { type: 'number', minimum: 0, maximum: 1 }, requires_admin: { type: 'boolean' }, affects_files: { type: 'boolean' } } } } } },
          responses: {
            '200': {
              description: 'Execution gate result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                execute: { type: 'boolean' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                risk_score: { type: 'number', minimum: 0, maximum: 1 },
                requires_admin: { type: 'boolean' },
                affects_system_files: { type: 'boolean' },
                reversible: { type: 'boolean' },
                blocking_flags: actions,
                warnings: actions,
                recommended_action: { type: 'string', enum: ['proceed', 'run_as_admin', 'confirm_first', 'sandbox_first', 'cancel'] },
                chain_to: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing desktop_action or system_context' }, '500': { description: 'Gate check failed' },
          },
        },
      },
    },
  });
});

export default router;
