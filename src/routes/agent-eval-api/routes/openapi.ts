import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Agent Eval API',
      version: '1.0.0',
      description: 'AI-powered agent evaluation for autonomous systems — benchmark responses, detect hallucinations, check consistency, audit bias, score task completion, trace reasoning, assess safety, compare models, and gate deployment',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/agent-eval' }],
    paths: {
      '/benchmark': {
        post: {
          operationId: 'benchmark',
          summary: 'Benchmark agent response for accuracy, relevance, completeness, reasoning quality and task adherence',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agent_response', 'task', 'expected_behavior'], properties: { agent_response: { type: 'string' }, task: { type: 'string' }, expected_behavior: { type: 'string' }, rubric: { type: 'object' }, domain: { type: 'string' }, baseline_response: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Benchmark result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                overall_score: { type: 'number', minimum: 0, maximum: 100 },
                grade: { type: 'string', enum: ['A+', 'A', 'B', 'C', 'D', 'F'] },
                dimension_scores: { type: 'object', properties: { accuracy: { type: 'number', minimum: 0, maximum: 100 }, relevance: { type: 'number', minimum: 0, maximum: 100 }, completeness: { type: 'number', minimum: 0, maximum: 100 }, reasoning_quality: { type: 'number', minimum: 0, maximum: 100 }, task_adherence: { type: 'number', minimum: 0, maximum: 100 }, conciseness: { type: 'number', minimum: 0, maximum: 100 } } },
                strengths: actions,
                failures: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, description: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'major', 'minor'] } } } },
                comparison_to_expected: { type: 'string' },
                pass: { type: 'boolean' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_response, task, or expected_behavior' },
            '500': { description: 'Benchmark failed' },
          },
        },
      },
      '/hallucination-detect': {
        post: {
          operationId: 'hallucinationDetect',
          summary: 'Detect hallucinations, fabrications and unsupported claims compared to source context',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agent_response', 'source_context'], properties: { agent_response: { type: 'string' }, source_context: { type: 'string' }, domain: { type: 'string' }, claims: { type: 'array', items: { type: 'string' } }, strict_mode: { type: 'boolean' } } } } } },
          responses: {
            '200': {
              description: 'Hallucination detection result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                hallucination_risk: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
                hallucination_score: { type: 'number', minimum: 0, maximum: 1 },
                suspected_hallucinations: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, type: { type: 'string', enum: ['fabricated', 'unsupported', 'conflicting', 'partially_correct'] }, evidence_in_source: { type: 'string', nullable: true }, confidence: { type: 'number', minimum: 0, maximum: 1 } } } },
                supported_claims: actions,
                uncertain_claims: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, reason_uncertain: { type: 'string' } } } },
                recommendation: { type: 'string', enum: ['use_with_caution', 'verify_before_use', 'reject', 'safe_to_use'] },
                sources_used_correctly: { type: 'boolean' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_response or source_context' },
            '500': { description: 'Hallucination detection failed' },
          },
        },
      },
      '/consistency-check': {
        post: {
          operationId: 'consistencyCheck',
          summary: 'Check consistency across multiple agent responses for contradictions, style drift and behavioral issues',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['responses'], properties: { responses: { type: 'array', items: { type: 'object', properties: { prompt: { type: 'string' }, response: { type: 'string' } } } }, check_type: { type: 'string', enum: ['factual', 'stylistic', 'behavioral', 'all'] }, expected_behavior: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Consistency check result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                consistency_score: { type: 'number', minimum: 0, maximum: 100 },
                consistent: { type: 'boolean' },
                inconsistencies: { type: 'array', items: { type: 'object', properties: { response_a_index: { type: 'number' }, response_b_index: { type: 'number' }, type: { type: 'string', enum: ['factual', 'stylistic', 'behavioral', 'contradictory'] }, description: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                behavioral_patterns: { type: 'array', items: { type: 'object', properties: { pattern: { type: 'string' }, frequency: { type: 'string', enum: ['high', 'medium', 'low'] }, desirable: { type: 'boolean' } } } },
                style_drift_detected: { type: 'boolean' },
                reliability_score: { type: 'number', minimum: 0, maximum: 100 },
                recommendations: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing responses' },
            '500': { description: 'Consistency check failed' },
          },
        },
      },
      '/bias-audit': {
        post: {
          operationId: 'biasAudit',
          summary: 'Audit agent responses for bias across political, gender, racial, cultural and professional dimensions',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agent_responses', 'audit_dimensions'], properties: { agent_responses: { type: 'array', items: { type: 'string' } }, audit_dimensions: { type: 'array', items: { type: 'string', enum: ['political', 'gender', 'racial', 'cultural', 'professional'] } }, context: { type: 'string' }, sample_prompts: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Bias audit result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                overall_bias_risk: { type: 'string', enum: ['high', 'medium', 'low', 'minimal'] },
                bias_score: { type: 'number', minimum: 0, maximum: 1 },
                dimension_results: { type: 'array', items: { type: 'object', properties: { dimension: { type: 'string' }, risk_level: { type: 'string', enum: ['high', 'medium', 'low', 'none'] }, examples: { type: 'array', items: { type: 'object', properties: { response_excerpt: { type: 'string' }, bias_type: { type: 'string' }, explanation: { type: 'string' } } } } } } },
                systematic_patterns: actions,
                unfair_treatment_detected: { type: 'boolean' },
                recommendations: { type: 'array', items: { type: 'object', properties: { recommendation: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                safe_for_deployment: { type: 'boolean' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_responses or audit_dimensions' },
            '500': { description: 'Bias audit failed' },
          },
        },
      },
      '/task-completion': {
        post: {
          operationId: 'taskCompletion',
          summary: 'Evaluate completeness and correctness of agent task execution with gap analysis',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['task_description', 'agent_output'], properties: { task_description: { type: 'string' }, agent_output: { type: 'string' }, success_criteria: { type: 'array', items: { type: 'string' } }, context: { type: 'string' }, expected_outputs: { type: 'array', items: { type: 'string' } } } } } } },
          responses: {
            '200': {
              description: 'Task completion evaluation result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                completion_rate: { type: 'number', minimum: 0, maximum: 1 },
                completed: { type: 'boolean' },
                criteria_results: { type: 'array', items: { type: 'object', properties: { criterion: { type: 'string' }, met: { type: 'boolean' }, score: { type: 'number', minimum: 0, maximum: 100 }, evidence: { type: 'string' } } } },
                gaps: { type: 'array', items: { type: 'object', properties: { gap: { type: 'string' }, importance: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
                extra_work_done: actions,
                quality_of_completion: { type: 'string', enum: ['excellent', 'good', 'adequate', 'poor'] },
                efficiency_score: { type: 'number', minimum: 0, maximum: 100 },
                task_understanding_score: { type: 'number', minimum: 0, maximum: 100 },
                retry_recommended: { type: 'boolean' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing task_description or agent_output' },
            '500': { description: 'Task completion evaluation failed' },
          },
        },
      },
      '/reasoning-trace': {
        post: {
          operationId: 'reasoningTrace',
          summary: 'Analyze reasoning chain quality including logical consistency, fallacies, assumptions and conclusion soundness',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agent_response', 'task'], properties: { agent_response: { type: 'string' }, task: { type: 'string' }, expected_reasoning_steps: { type: 'array', items: { type: 'string' } }, domain: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Reasoning trace analysis result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                reasoning_quality_score: { type: 'number', minimum: 0, maximum: 100 },
                reasoning_steps_detected: { type: 'array', items: { type: 'object', properties: { step: { type: 'string' }, valid: { type: 'boolean' }, logical_basis: { type: 'string' }, potential_error: { type: 'string', nullable: true } } } },
                logical_fallacies: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, location: { type: 'string' }, explanation: { type: 'string' } } } },
                assumptions_made: { type: 'array', items: { type: 'object', properties: { assumption: { type: 'string' }, stated: { type: 'boolean' }, valid: { type: 'boolean' } } } },
                conclusion_supported: { type: 'boolean' },
                reasoning_type: { type: 'string', enum: ['deductive', 'inductive', 'abductive', 'analogical', 'mixed'] },
                transparency_score: { type: 'number', minimum: 0, maximum: 100 },
                recommendations: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_response or task' },
            '500': { description: 'Reasoning trace analysis failed' },
          },
        },
      },
      '/safety-score': {
        post: {
          operationId: 'safetyScore',
          summary: 'Score agent response for safety across harmful content, privacy, legal, misinformation and disclaimers',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agent_response'], properties: { agent_response: { type: 'string' }, context: { type: 'string' }, deployment_context: { type: 'string', enum: ['customer_facing', 'internal', 'automated'] }, sensitivity_level: { type: 'string', enum: ['high', 'medium', 'low'] } } } } } },
          responses: {
            '200': {
              description: 'Safety score result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                overall_safety_score: { type: 'number', minimum: 0, maximum: 100 },
                safe_to_deploy: { type: 'boolean' },
                risk_level: { type: 'string', enum: ['high', 'medium', 'low', 'safe'] },
                safety_dimensions: { type: 'object', properties: { harmful_content: { type: 'number', minimum: 0, maximum: 100 }, privacy_risk: { type: 'number', minimum: 0, maximum: 100 }, legal_risk: { type: 'number', minimum: 0, maximum: 100 }, misinformation_risk: { type: 'number', minimum: 0, maximum: 100 }, appropriate_disclaimers: { type: 'number', minimum: 0, maximum: 100 } } },
                flags: { type: 'array', items: { type: 'object', properties: { flag: { type: 'string' }, type: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, recommendation: { type: 'string' } } } },
                blocked_categories: actions,
                suggestions: actions,
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_response' },
            '500': { description: 'Safety scoring failed' },
          },
        },
      },
      '/compare-responses': {
        post: {
          operationId: 'compareResponses',
          summary: 'Compare multiple AI model responses to the same task and rank by quality with head-to-head analysis',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['responses', 'task'], properties: { responses: { type: 'array', items: { type: 'object', properties: { model: { type: 'string' }, response: { type: 'string' } } } }, task: { type: 'string' }, evaluation_criteria: { type: 'array', items: { type: 'string' } }, preferred_style: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Response comparison result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                task: { type: 'string' },
                ranking: { type: 'array', items: { type: 'object', properties: { rank: { type: 'number' }, model: { type: 'string' }, overall_score: { type: 'number', minimum: 0, maximum: 100 }, summary: { type: 'string' } } } },
                head_to_head: { type: 'array', items: { type: 'object', properties: { criterion: { type: 'string' }, winner: { type: 'string' }, scores: { type: 'object', additionalProperties: { type: 'number' } } } } },
                best_response: { type: 'object', properties: { model: { type: 'string' }, reason: { type: 'string' }, score: { type: 'number', minimum: 0, maximum: 100 } } },
                response_analysis: { type: 'array', items: { type: 'object', properties: { model: { type: 'string' }, strengths: actions, weaknesses: actions, unique_contributions: actions } } },
                ensemble_recommendation: { type: 'string' },
                confidence_per_section: confidence,
                recommended_actions_priority_order: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing responses or task' },
            '500': { description: 'Response comparison failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'agentExecutionGate',
          summary: 'Gate agent deployment based on quality, safety and reliability signals with blocking flags',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['agent_context', 'intended_deployment'], properties: { agent_context: { type: 'string' }, intended_deployment: { type: 'string' }, quality_threshold: { type: 'number', minimum: 0, maximum: 1 }, safety_threshold: { type: 'number', minimum: 0, maximum: 1 }, use_case: { type: 'string' } } } } } },
          responses: {
            '200': {
              description: 'Execution gate result',
              content: { 'application/json': { schema: { type: 'object', properties: {
                execute: { type: 'boolean' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                ready_for_deployment: { type: 'boolean' },
                blocking_flags: actions,
                warnings: actions,
                quality_gate: { type: 'string', enum: ['passed', 'failed', 'conditional'] },
                safety_gate: { type: 'string', enum: ['passed', 'failed', 'conditional'] },
                recommended_action: { type: 'string', enum: ['deploy', 'test_further', 'retrain', 'reject'] },
                chain_to: actions,
                privacy,
              } } } },
            },
            '400': { description: 'Missing agent_context or intended_deployment' },
            '500': { description: 'Gate check failed' },
          },
        },
      },
    },
  });
});

export default router;
