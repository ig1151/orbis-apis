import { Router, Request, Response } from 'express';
const router = Router();

const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };
const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };

const testCaseSchema = {
  type: 'object',
  properties: {
    test_id: { type: 'string' },
    description: { type: 'string' },
    input: { type: 'object', additionalProperties: true },
    expected_output: { type: 'object', additionalProperties: true },
    priority: { type: 'string', enum: ['high', 'medium', 'low'] },
    edge_case: { type: 'boolean' },
  },
};

const anyValueOneOf = {
  oneOf: [
    { type: 'string' },
    { type: 'object', additionalProperties: true },
  ],
};

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'QA Testing API',
      version: '1.0.0',
      description: 'Automate QA workflows with AI: test workflows, detect regressions, validate API chains, validate outputs, generate test cases, and run full test suites.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        test_workflow: 0.007,
        detect_regression: 0.007,
        test_api_chain: 0.008,
        validate_output: 0.006,
        generate_test_cases: 0.007,
        run_suite: 0.008,
        execution_gate: 0.001,
        test: 0.014,
        high_volume_discount: '~35% off',
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/qa-testing' }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      schemas: {
        TestCase: testCaseSchema,
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': {
        get: {
          operationId: 'getOpenApiSpec',
          summary: 'OpenAPI 3.1.0 specification for the QA Testing API',
          responses: { '200': { description: 'OpenAPI spec returned as JSON' } },
        },
      },
      '/test-workflow': {
        post: {
          operationId: 'testWorkflow',
          summary: 'Run a QA test against a described workflow or sequence of steps',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['workflow_description'],
                  properties: {
                    workflow_description: {
                      oneOf: [
                        { type: 'string', description: 'Workflow description as free text' },
                        {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              step: { type: 'string' },
                              action: { type: 'string' },
                              expected: { type: 'string' },
                            },
                          },
                          description: 'Structured workflow steps array',
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Workflow test results with step-level pass/fail and issues',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      overall_pass: { type: 'boolean' },
                      pass_rate_pct: { type: 'number' },
                      step_results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'string' },
                            passed: { type: 'boolean' },
                            issue: { type: 'string' },
                            severity: { type: 'string', enum: ['blocker', 'critical', 'major', 'minor'] },
                          },
                        },
                      },
                      blockers: actions,
                      warnings: actions,
                      test_coverage_pct: { type: 'number' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing workflow_description' },
            '500': { description: 'Workflow test failed' },
          },
        },
      },
      '/detect-regression': {
        post: {
          operationId: 'detectRegression',
          summary: 'Compare baseline and current outputs to detect regressions and breaking changes',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['baseline_output', 'current_output'],
                  properties: {
                    baseline_output: anyValueOneOf,
                    current_output: anyValueOneOf,
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Regression detection result with diff analysis and severity',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      regression_detected: { type: 'boolean' },
                      regression_severity: { type: 'string', enum: ['breaking', 'major', 'minor', 'none'] },
                      changed_fields: actions,
                      breaking_changes: actions,
                      new_fields: actions,
                      removed_fields: actions,
                      value_changes: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field: { type: 'string' },
                            baseline_value: { type: 'string' },
                            current_value: { type: 'string' },
                            change_type: { type: 'string', enum: ['type_change', 'value_change', 'range_violation', 'enum_violation'] },
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
            '400': { description: 'Missing baseline_output or current_output' },
            '500': { description: 'Regression detection failed' },
          },
        },
      },
      '/test-api-chain': {
        post: {
          operationId: 'testApiChain',
          summary: 'Validate a chain of API calls for contract compliance and data flow correctness',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['api_chain'],
                  properties: {
                    api_chain: {
                      oneOf: [
                        { type: 'string', description: 'API chain description as free text' },
                        {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              endpoint: { type: 'string' },
                              request: { type: 'object', additionalProperties: true },
                              expected_response: { type: 'object', additionalProperties: true },
                            },
                          },
                          description: 'Structured API chain as array of call objects',
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'API chain test results with per-call validation and contract check',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      chain_passed: { type: 'boolean' },
                      pass_rate_pct: { type: 'number' },
                      call_results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            endpoint: { type: 'string' },
                            passed: { type: 'boolean' },
                            contract_violations: actions,
                            data_flow_issues: actions,
                            latency_estimate_ms: { type: 'number' },
                          },
                        },
                      },
                      integration_issues: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing api_chain' },
            '500': { description: 'API chain test failed' },
          },
        },
      },
      '/validate-output': {
        post: {
          operationId: 'validateOutput',
          summary: 'Validate an output against a schema or expectations definition',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['output', 'schema_or_expectations'],
                  properties: {
                    output: anyValueOneOf,
                    schema_or_expectations: anyValueOneOf,
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Validation result with field-level compliance and violation details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      valid: { type: 'boolean' },
                      violation_count: { type: 'number' },
                      violations: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field: { type: 'string' },
                            violation_type: { type: 'string', enum: ['missing_required', 'type_mismatch', 'value_out_of_range', 'enum_violation', 'extra_field'] },
                            expected: { type: 'string' },
                            actual: { type: 'string' },
                          },
                        },
                      },
                      compliance_pct: { type: 'number' },
                      schema_coverage_pct: { type: 'number' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing output or schema_or_expectations' },
            '500': { description: 'Validation failed' },
          },
        },
      },
      '/generate-test-cases': {
        post: {
          operationId: 'generateTestCases',
          summary: 'Generate comprehensive test cases from an endpoint spec with configurable test type',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['endpoint_spec', 'test_type'],
                  properties: {
                    endpoint_spec: anyValueOneOf,
                    test_type: { type: 'string', enum: ['unit', 'integration', 'edge_case', 'load', 'security'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Generated test cases with priority and edge case flags',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      test_cases: { type: 'array', items: testCaseSchema },
                      test_count: { type: 'number' },
                      edge_case_count: { type: 'number' },
                      coverage_estimate_pct: { type: 'number' },
                      untested_paths: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing endpoint_spec or test_type' },
            '500': { description: 'Test case generation failed' },
          },
        },
      },
      '/run-suite': {
        post: {
          operationId: 'runSuite',
          summary: 'Run a full test suite and return per-test results with aggregate pass rate',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['test_suite'],
                  properties: {
                    test_suite: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          actual: anyValueOneOf,
                          expected: anyValueOneOf,
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
              description: 'Suite run results with per-test pass/fail and aggregate metrics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      suite_passed: { type: 'boolean' },
                      pass_rate_pct: { type: 'number' },
                      tests_passed: { type: 'number' },
                      tests_failed: { type: 'number' },
                      tests_total: { type: 'number' },
                      test_results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            passed: { type: 'boolean' },
                            diff_summary: { type: 'string' },
                            violations: actions,
                          },
                        },
                      },
                      flaky_tests: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing test_suite' },
            '500': { description: 'Suite run failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Validate spec or workflow readiness for QA testing and recommend the optimal endpoint',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['spec_or_workflow'],
                  properties: {
                    spec_or_workflow: anyValueOneOf,
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Execution gate result with recommended QA testing endpoint',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      execution_ready: { type: 'boolean' },
                      recommended_endpoint: { type: 'string' },
                      next_api: { type: 'string' },
                      next_endpoint: { type: 'string' },
                      blocking_flags: actions,
                      flag_definitions: { type: 'object', additionalProperties: { type: 'string' } },
                      confidence_per_section: confidence,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing spec_or_workflow' },
            '500': { description: 'Gate check failed' },
          },
        },
      },
      '/test': {
        post: {
          operationId: 'test',
          summary: 'ONE-CALL: full QA workflow — generate test cases, run suite, and detect regressions in one step',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['spec_or_workflow'],
                  properties: {
                    spec_or_workflow: anyValueOneOf,
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full QA report: generated test cases, suite results, and regression summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      overall_pass: { type: 'boolean' },
                      pass_rate_pct: { type: 'number' },
                      regression_detected: { type: 'boolean' },
                      valid: { type: 'boolean' },
                      test_cases_generated: { type: 'number' },
                      tests_passed: { type: 'number' },
                      tests_failed: { type: 'number' },
                      blockers: actions,
                      warnings: actions,
                      test_cases: { type: 'array', items: testCaseSchema },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing spec_or_workflow' },
            '500': { description: 'QA test failed' },
          },
        },
      },
    },
  });
});

export default router;
