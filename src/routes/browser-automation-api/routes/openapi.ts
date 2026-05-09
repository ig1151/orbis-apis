import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Browser Automation API',
      version: '1.0.0',
      description: 'AI-powered browser automation for autonomous agents — open sessions, click, type, extract, upload, download, wait, screenshot, manage sessions and run multi-step workflows',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': { free_tier: { requests_per_day: 100, requests_per_month: 3000 }, pay_per_call: { open: '$0.004', click: '$0.003', type: '$0.003', extract: '$0.005', upload: '$0.005', download: '$0.005', wait: '$0.002', screenshot: '$0.004', session: '$0.004', run_workflow: '$0.015', execution_gate: '$0.002', replan_workflow: '$0.008', evaluate_state: '$0.005', resume_workflow: '$0.005' } },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/browser-automation' }],
    components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' } } },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/': { get: { operationId: 'browserAutomationDiscovery', summary: 'API discovery — returns name, version, endpoints and capabilities', responses: { '200': { description: 'API discovery info' } } } },
      '/open': {
        post: {
          operationId: 'browserOpen',
          summary: 'Open a browser session for a URL with viewport config, load strategy and initial state capture',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'session_id'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    session_id: { type: 'string' },
                    browser_context: {
                      type: 'object',
                      properties: {
                        viewport: { type: 'string' },
                        user_agent: { type: 'string' },
                        locale: { type: 'string' },
                      },
                    },
                    wait_for: { type: 'string', enum: ['load', 'networkidle', 'domcontentloaded'] },
                    proxy: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Browser session opened',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      url: { type: 'string', format: 'uri' },
                      status: { type: 'string', enum: ['opened', 'failed', 'redirected'] },
                      final_url: { type: 'string', format: 'uri' },
                      page_title: { type: 'string' },
                      load_strategy: { type: 'string' },
                      initial_state: {
                        type: 'object',
                        properties: {
                          dom_ready: { type: 'boolean' },
                          scripts_loaded: { type: 'boolean' },
                          network_idle: { type: 'boolean' },
                        },
                      },
                      session_config: {
                        type: 'object',
                        properties: {
                          viewport: { type: 'string' },
                          user_agent: { type: 'string' },
                          cookies_enabled: { type: 'boolean' },
                        },
                      },
                      estimated_load_ms: { type: 'number' },
                      next_recommended_action: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing url or session_id' },
            '500': { description: 'Session open failed' },
          },
        },
      },
      '/click': {
        post: {
          operationId: 'browserClick',
          summary: 'Generate precise click instructions with multi-strategy selectors and post-click state prediction',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['session_id', 'target'],
                  properties: {
                    session_id: { type: 'string' },
                    target: { type: 'string' },
                    click_type: { type: 'string', enum: ['single', 'double', 'right'] },
                    wait_after_ms: { type: 'number' },
                    verify_navigation: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Click instructions generated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      target: { type: 'string' },
                      click_type: { type: 'string', enum: ['single', 'double', 'right'] },
                      selector_strategies: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            strategy: { type: 'string', enum: ['css', 'xpath', 'text', 'aria'] },
                            selector: { type: 'string' },
                            confidence: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      pre_click_checks: actions,
                      post_click_state: {
                        type: 'object',
                        properties: {
                          navigation_expected: { type: 'boolean' },
                          modal_expected: { type: 'boolean' },
                          dom_change_expected: { type: 'boolean' },
                        },
                      },
                      wait_recommendation: { type: 'string' },
                      fallback_action: { type: 'string' },
                      risk: { type: 'string', enum: ['safe', 'caution', 'destructive'] },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing session_id or target' },
            '500': { description: 'Click instruction generation failed' },
          },
        },
      },
      '/type': {
        post: {
          operationId: 'browserType',
          summary: 'Generate typing instructions with timing, special character handling and form validation support',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['session_id', 'target', 'text'],
                  properties: {
                    session_id: { type: 'string' },
                    target: { type: 'string' },
                    text: { type: 'string' },
                    clear_first: { type: 'boolean' },
                    humanlike_delay: { type: 'boolean' },
                    submit_after: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Typing instructions generated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      target: { type: 'string' },
                      text_length: { type: 'number' },
                      selector: { type: 'string' },
                      clear_first: { type: 'boolean' },
                      typing_method: { type: 'string', enum: ['direct', 'clipboard', 'chunk'] },
                      chunk_size: { type: 'number' },
                      delay_between_chars_ms: { type: 'number' },
                      special_chars_handling: actions,
                      validation_triggers: actions,
                      submit_instruction: { type: 'string', nullable: true },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing session_id, target or text' },
            '500': { description: 'Type instruction generation failed' },
          },
        },
      },
      '/extract': {
        post: {
          operationId: 'browserExtract',
          summary: 'Generate DOM extraction instructions with selectors, schema, pagination and dynamic content handling',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['session_id', 'extraction_goal'],
                  properties: {
                    session_id: { type: 'string' },
                    extraction_goal: { type: 'string' },
                    scope: { type: 'string', enum: ['full_page', 'visible', 'specific_element'] },
                    output_format: { type: 'string', enum: ['json', 'markdown', 'text', 'table'] },
                    target_element: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Extraction instructions generated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      extraction_goal: { type: 'string' },
                      extraction_strategy: { type: 'string' },
                      target_selectors: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            label: { type: 'string' },
                            selector: { type: 'string' },
                            type: { type: 'string', enum: ['text', 'attribute', 'html', 'list'] },
                          },
                        },
                      },
                      schema: { type: 'object' },
                      pagination_handling: {
                        type: 'object',
                        properties: {
                          detected: { type: 'boolean' },
                          strategy: { type: 'string' },
                        },
                      },
                      dynamic_content_wait: { type: 'string' },
                      output_format: { type: 'string', enum: ['json', 'markdown', 'text', 'table'] },
                      estimated_records: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing session_id or extraction_goal' },
            '500': { description: 'Extraction instruction generation failed' },
          },
        },
      },
      '/upload': {
        post: {
          operationId: 'browserUpload',
          summary: 'Generate file upload instructions with activation steps, progress monitoring and error recovery',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['session_id', 'file_field', 'file_description'],
                  properties: {
                    session_id: { type: 'string' },
                    file_field: { type: 'string' },
                    file_description: { type: 'string' },
                    file_type: { type: 'string' },
                    file_size_mb: { type: 'number' },
                    multi_file: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Upload instructions generated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      file_field: { type: 'string' },
                      upload_method: { type: 'string', enum: ['input_click', 'drag_drop', 'api'] },
                      file_input_selector: { type: 'string' },
                      activation_steps: actions,
                      progress_monitor: {
                        type: 'object',
                        properties: {
                          selector: { type: 'string' },
                          check_interval_ms: { type: 'number' },
                        },
                      },
                      confirmation_check: { type: 'string' },
                      size_limit_handling: { type: 'string' },
                      error_recovery: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing session_id, file_field or file_description' },
            '500': { description: 'Upload instruction generation failed' },
          },
        },
      },
      '/download': {
        post: {
          operationId: 'browserDownload',
          summary: 'Generate file download instructions with event interception, progress and integrity verification',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['session_id', 'download_trigger'],
                  properties: {
                    session_id: { type: 'string' },
                    download_trigger: { type: 'string' },
                    expected_file_type: { type: 'string' },
                    wait_timeout_ms: { type: 'number' },
                    save_path: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Download instructions generated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      trigger_selector: { type: 'string' },
                      download_method: { type: 'string', enum: ['click', 'api_intercept', 'direct_url'] },
                      pre_download_steps: actions,
                      intercept_config: {
                        type: 'object',
                        properties: {
                          event: { type: 'string' },
                          timeout_ms: { type: 'number' },
                        },
                      },
                      progress_check: { type: 'string' },
                      completion_verification: { type: 'string' },
                      expected_filename_pattern: { type: 'string' },
                      fallback_strategy: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing session_id or download_trigger' },
            '500': { description: 'Download instruction generation failed' },
          },
        },
      },
      '/wait': {
        post: {
          operationId: 'browserWait',
          summary: 'Generate intelligent wait instructions with strategy selection, polling config and timeout handling',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['session_id', 'wait_for'],
                  properties: {
                    session_id: { type: 'string' },
                    wait_for: { type: 'string' },
                    timeout_ms: { type: 'number' },
                    poll_interval_ms: { type: 'number' },
                    condition_type: { type: 'string', enum: ['element', 'network', 'text', 'custom'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Wait instructions generated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      wait_strategy: {
                        type: 'string',
                        enum: ['element_visible', 'element_hidden', 'text_present', 'network_idle', 'custom_condition'],
                      },
                      condition_selector: { type: 'string', nullable: true },
                      timeout_ms: { type: 'number' },
                      poll_interval_ms: { type: 'number' },
                      condition_check: { type: 'string' },
                      on_timeout: { type: 'string', enum: ['retry', 'skip', 'abort'] },
                      alternative_conditions: actions,
                      estimated_wait_ms: { type: 'number' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing session_id or wait_for' },
            '500': { description: 'Wait instruction generation failed' },
          },
        },
      },
      '/screenshot': {
        post: {
          operationId: 'browserScreenshot',
          summary: 'Generate screenshot capture and visual analysis instructions with key element identification',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['session_id'],
                  properties: {
                    session_id: { type: 'string' },
                    scope: { type: 'string', enum: ['full_page', 'viewport', 'element'] },
                    element_selector: { type: 'string' },
                    analyze: { type: 'boolean' },
                    highlight_elements: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Screenshot instructions generated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      capture_scope: { type: 'string', enum: ['full_page', 'viewport', 'element'] },
                      capture_instructions: actions,
                      visual_analysis: {
                        type: 'object',
                        properties: {
                          page_type: { type: 'string' },
                          key_elements: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                element: { type: 'string' },
                                location_hint: { type: 'string' },
                                actionable: { type: 'boolean' },
                              },
                            },
                          },
                          errors_visible: actions,
                          forms_detected: { type: 'number' },
                          navigation_detected: { type: 'boolean' },
                        },
                      },
                      state_assessment: { type: 'string' },
                      recommended_next_action: { type: 'string' },
                      anomalies: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing session_id' },
            '500': { description: 'Screenshot instruction generation failed' },
          },
        },
      },
      '/session': {
        post: {
          operationId: 'browserSession',
          summary: 'Manage browser sessions — create, persist, restore, close or list with auth and storage state',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['action'],
                  properties: {
                    action: { type: 'string', enum: ['create', 'persist', 'restore', 'close', 'list'] },
                    session_id: { type: 'string' },
                    session_name: { type: 'string' },
                    context: {
                      type: 'object',
                      properties: {
                        cookies: { type: 'array', items: { type: 'object' } },
                        local_storage: { type: 'object' },
                        auth_state: { type: 'object' },
                      },
                    },
                    ttl_minutes: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Session management result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      action: { type: 'string', enum: ['create', 'persist', 'restore', 'close', 'list'] },
                      session_id: { type: 'string' },
                      session_status: { type: 'string', enum: ['active', 'persisted', 'restored', 'closed'] },
                      auth_preserved: { type: 'boolean' },
                      cookies_count: { type: 'number' },
                      storage_keys_count: { type: 'number' },
                      session_age_minutes: { type: 'number' },
                      ttl_remaining_minutes: { type: 'number', nullable: true },
                      persistence_method: { type: 'string', enum: ['in_memory', 'serialized', 'token'] },
                      restore_instructions: actions,
                      cleanup_steps: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing action or session_id' },
            '500': { description: 'Session management failed' },
          },
        },
      },
      '/run-workflow': {
        post: {
          operationId: 'browserRunWorkflow',
          summary: 'ONE-CALL: execute a complete multi-step browser workflow with validation, checkpoints and rollback',
          'x-one-call': true,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['workflow', 'session_id', 'goal'],
                  properties: {
                    workflow: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          step: { type: 'number' },
                          action: { type: 'string' },
                          target: { type: 'string' },
                          value: { type: 'string' },
                        },
                      },
                    },
                    session_id: { type: 'string' },
                    goal: { type: 'string' },
                    on_error: { type: 'string', enum: ['abort', 'skip', 'retry'] },
                    timeout_ms: { type: 'number' },
                    checkpoint_after_steps: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Workflow execution plan generated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      goal: { type: 'string' },
                      total_steps: { type: 'number' },
                      estimated_duration_ms: { type: 'number' },
                      validated_steps: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            action: { type: 'string' },
                            selector: { type: 'string' },
                            value: { type: 'string' },
                            verification: { type: 'string' },
                            on_failure: { type: 'string' },
                          },
                        },
                      },
                      checkpoints: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            after_step: { type: 'number' },
                            state_check: { type: 'string' },
                          },
                        },
                      },
                      risk_assessment: { type: 'string', enum: ['low', 'medium', 'high'] },
                      rollback_steps: actions,
                      success_criteria: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },

            '400': { description: 'Missing workflow, session_id or goal' },
            '500': { description: 'Workflow planning failed' },
          },
        },
      },
      '/replan-workflow': { post: { operationId: 'browserReplanWorkflow', summary: 'Autonomously replan a browser workflow after failure with alternative strategy generation', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['session_id', 'failed_step', 'goal'], properties: { session_id: { type: 'string' }, original_workflow: { type: 'array', items: { type: 'object' } }, failed_step: { type: 'object' }, failure_reason: { type: 'string' }, goal: { type: 'string' } } } } } }, responses: { '200': { description: 'Replanned workflow' }, '400': { description: 'Missing required fields' }, '500': { description: 'Replan failed' } } } },
      '/evaluate-state': { post: { operationId: 'browserEvaluateState', summary: 'Evaluate current browser state against goal with loop-continuation decision', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['session_id', 'goal', 'current_state'], properties: { session_id: { type: 'string' }, goal: { type: 'string' }, current_state: { type: 'object' }, completed_steps: { type: 'number' }, expected_state: { type: 'object' } } } } } }, responses: { '200': { description: 'State evaluation result' }, '400': { description: 'Missing required fields' }, '500': { description: 'Evaluation failed' } } } },
      '/resume-workflow': { post: { operationId: 'browserResumeWorkflow', summary: 'Resume a paused or interrupted browser workflow from a checkpoint', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['session_id', 'workflow_id', 'goal'], properties: { session_id: { type: 'string' }, workflow_id: { type: 'string' }, goal: { type: 'string' }, checkpoint: { type: 'object' }, remaining_steps: { type: 'number' } } } } } }, responses: { '200': { description: 'Workflow resumed' }, '400': { description: 'Missing required fields' }, '500': { description: 'Resume failed' } } } },
      '/execution-gate': { post: { operationId: 'browserExecutionGate', summary: 'Gate autonomous browser action execution with risk scoring, destructive action detection and human-approval routing', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['browser_action', 'action_context'], properties: { browser_action: { type: 'string' }, action_context: { type: 'object' }, risk_threshold: { type: 'number', minimum: 0, maximum: 1 }, require_human_approval: { type: 'boolean' } } } } } }, responses: { '200': { description: 'Execution gate decision', content: { 'application/json': { schema: { type: 'object', properties: { execute: { type: 'boolean' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, risk_score: { type: 'number', minimum: 0, maximum: 1 }, risk_level: { type: 'string', enum: ['high', 'medium', 'low'] }, destructive_action: { type: 'boolean' }, credential_interaction: { type: 'boolean' }, financial_interaction: { type: 'boolean' }, blocking_flags: actions, warnings: actions, human_approval_required: { type: 'boolean' }, recommended_action: { type: 'string', enum: ['proceed', 'require_approval', 'block'] }, safe_to_execute: { type: 'boolean' }, chain_to: actions, privacy } } } } }, '400': { description: 'Missing browser_action or action_context' }, '500': { description: 'Gate check failed' } } } },
    },
  });
});

export default router;
