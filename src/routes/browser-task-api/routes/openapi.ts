import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Browser Task API',
      version: '1.0.0',
      description: 'Agent-ready browser task API — search, extract and summarize the web with structured output.',
    },
    servers: [{ url: 'https://browser-task-api.onrender.com' }],
    paths: {
      '/v1/browser-task': {
        post: {
          summary: 'Run a browser task',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['goal', 'task_type'],
                  properties: {
                    goal: { type: 'string' },
                    task_type: { type: 'string', enum: ['search_and_extract', 'visit_and_summarize', 'extract_table'] },
                    url: { type: 'string', format: 'uri' },
                    query: { type: 'string' },
                    output_schema: { type: 'object' },
                    max_results: { type: 'integer', default: 3 },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Task result with trace' } },
        },
      },
      '/v1/tasks': {
        get: { summary: 'List supported task types', responses: { '200': { description: 'Task types' } } },
      },
      '/v1/health': {
        get: { summary: 'Health check', responses: { '200': { description: 'OK' } } },
      },
      '/v1/intelligence/autofill': {
        post: {
          operationId: 'autofill',
          summary: 'Generate autofill instructions for a web form',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['page_context', 'field_data'],
                  properties: {
                    page_context: { type: 'string', description: 'Description or HTML snippet of the form' },
                    field_data: { type: 'object', description: 'Key-value pairs of data to fill into the form' },
                    form_type: { type: 'string', enum: ['checkout', 'signup', 'contact', 'search', 'custom'] },
                    smart_fill: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Autofill instructions with confidence scores',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          task_id: { type: 'string' },
                          fill_instructions: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                field_selector: { type: 'string' },
                                field_label: { type: 'string' },
                                value: { type: 'string' },
                                action: { type: 'string', enum: ['type', 'select', 'check', 'upload'] },
                                confidence: { type: 'number', minimum: 0, maximum: 1 },
                              },
                            },
                          },
                          unmapped_fields: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                field: { type: 'string' },
                                reason: { type: 'string' },
                              },
                            },
                          },
                          validation_checks: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                field: { type: 'string' },
                                rule: { type: 'string' },
                              },
                            },
                          },
                          estimated_completion_rate: { type: 'number', minimum: 0, maximum: 1 },
                          warnings: { type: 'array', items: { type: 'string' } },
                          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
                          confidence_per_section: { type: 'object' },
                          privacy: {
                            type: 'object',
                            properties: {
                              data_stored: { type: 'boolean' },
                              retention: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/v1/intelligence/click-path': {
        post: {
          operationId: 'clickPath',
          summary: 'Generate an optimal click path to achieve a goal on a page',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['goal', 'page_context'],
                  properties: {
                    goal: { type: 'string', description: 'What the user wants to achieve' },
                    page_context: { type: 'string', description: 'Description of current page state' },
                    starting_url: { type: 'string', format: 'uri' },
                    constraints: { type: 'array', items: { type: 'string' }, description: 'Things to avoid' },
                    max_steps: { type: 'integer', minimum: 1, maximum: 50 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Step-by-step click path with risk analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          task_id: { type: 'string' },
                          steps: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                step_number: { type: 'integer' },
                                action: { type: 'string', enum: ['click', 'scroll', 'hover', 'wait', 'type', 'navigate'] },
                                target: { type: 'string' },
                                value: { type: 'string', nullable: true },
                                verification: { type: 'string' },
                                fallback: { type: 'string' },
                              },
                            },
                          },
                          total_steps: { type: 'integer' },
                          estimated_duration_seconds: { type: 'number' },
                          risk_points: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                step: { type: 'integer' },
                                risk: { type: 'string' },
                                mitigation: { type: 'string' },
                              },
                            },
                          },
                          success_criteria: { type: 'array', items: { type: 'string' } },
                          confidence_per_section: { type: 'object' },
                          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
                          privacy: {
                            type: 'object',
                            properties: {
                              data_stored: { type: 'boolean' },
                              retention: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/v1/intelligence/capture-structured-data': {
        post: {
          operationId: 'captureStructuredData',
          summary: 'Extract structured data from page content according to a target schema',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['page_content', 'data_schema'],
                  properties: {
                    page_content: { type: 'string', description: 'Raw page content, text, or HTML' },
                    data_schema: { type: 'object', description: 'Target schema to extract into' },
                    extraction_hints: { type: 'array', items: { type: 'string' } },
                    fallback_values: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Extracted structured data with quality metrics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          task_id: { type: 'string' },
                          extracted_data: { type: 'object', description: 'Object matching the provided schema' },
                          extraction_confidence: { type: 'number', minimum: 0, maximum: 1 },
                          fields_extracted: { type: 'integer' },
                          fields_missing: { type: 'array', items: { type: 'string' } },
                          fields_defaulted: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                field: { type: 'string' },
                                default_used: { type: 'string' },
                              },
                            },
                          },
                          data_quality_issues: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                field: { type: 'string' },
                                issue: { type: 'string' },
                              },
                            },
                          },
                          confidence_per_section: { type: 'object' },
                          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
                          privacy: {
                            type: 'object',
                            properties: {
                              data_stored: { type: 'boolean' },
                              retention: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/v1/intelligence/screenshot-analysis': {
        post: {
          operationId: 'screenshotAnalysis',
          summary: 'Analyze a screenshot description to identify UI elements, issues, and suggested actions',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['screenshot_description', 'analysis_goal'],
                  properties: {
                    screenshot_description: { type: 'string', description: 'Describe what is in the screenshot' },
                    analysis_goal: { type: 'string' },
                    context: { type: 'string' },
                    extract_elements: { type: 'array', items: { type: 'string' }, description: 'Types of elements to find' },
                    check_for: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Screenshot analysis with elements, issues, and action suggestions',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          task_id: { type: 'string' },
                          analysis_result: { type: 'string' },
                          elements_found: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                element_type: { type: 'string' },
                                description: { type: 'string' },
                                location_hint: { type: 'string' },
                                actionable: { type: 'boolean' },
                              },
                            },
                          },
                          issues_detected: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                issue: { type: 'string' },
                                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                                recommended_fix: { type: 'string' },
                              },
                            },
                          },
                          extracted_information: { type: 'object' },
                          suggested_actions: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                action: { type: 'string' },
                                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                                selector_hint: { type: 'string' },
                              },
                            },
                          },
                          page_type: { type: 'string' },
                          confidence_per_section: { type: 'object' },
                          recommended_actions_priority_order: { type: 'array', items: { type: 'string' } },
                          privacy: {
                            type: 'object',
                            properties: {
                              data_stored: { type: 'boolean' },
                              retention: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/v1/intelligence/execution-gate': {
        post: {
          operationId: 'executionGate',
          summary: 'Evaluate whether a browser action is safe to execute',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['browser_action', 'page_context'],
                  properties: {
                    browser_action: { type: 'string', description: 'The browser action to evaluate' },
                    page_context: { type: 'string', description: 'Description of current page state' },
                    risk_threshold: { type: 'number', minimum: 0, maximum: 1 },
                    requires_auth: { type: 'boolean' },
                    irreversible: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Safety evaluation with risk score and recommended action',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          task_id: { type: 'string' },
                          execute: { type: 'boolean' },
                          confidence: { type: 'number', minimum: 0, maximum: 1 },
                          risk_score: { type: 'number', minimum: 0, maximum: 1 },
                          irreversible: { type: 'boolean' },
                          blocking_flags: { type: 'array', items: { type: 'string' } },
                          warnings: { type: 'array', items: { type: 'string' } },
                          recommended_action: { type: 'string', enum: ['proceed', 'confirm_first', 'abort', 'alternative_approach'] },
                          safer_alternative: { type: 'string', nullable: true },
                          chain_to: { type: 'array', items: { type: 'string' } },
                          privacy: {
                            type: 'object',
                            properties: {
                              data_stored: { type: 'boolean' },
                              retention: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
});

export default router;
