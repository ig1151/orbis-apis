import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Web Navigation API',
      version: '1.0.0',
      description: 'AI-powered web navigation API for autonomous agents. Navigate URLs, extract structured data, perform live search, follow link graphs, run adaptive crawls, handle anti-bot challenges, diff page content, and gate navigation actions.',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: {
          navigate: 0.005,
          'extract-structured-data': 0.006,
          'live-search': 0.005,
          'follow-links': 0.006,
          'adaptive-crawl': 0.008,
          'anti-bot-handling': 0.004,
          'content-diff': 0.005,
          'browser-session': 0.003,
          screenshot: 0.003,
          'form-detect': 0.004,
          'submit-form-gated': 0.005,
          'download-assets': 0.004,
          'navigate-and-extract': 0.015,
          'execution-gate': 0.002,
        },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/web-navigation' }],
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
      '/navigate': {
        post: {
          operationId: 'navigate',
          summary: 'Navigate a URL with a goal and extract structured page intelligence',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'goal'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    goal: { type: 'string' },
                    extract: { type: 'array', items: { type: 'string' } },
                    follow_redirects: { type: 'boolean' },
                    wait_for: { type: 'string', enum: ['load', 'networkidle', 'domcontentloaded'] },
                    render_js: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Navigation result with page intelligence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      url: { type: 'string' },
                      final_url: { type: 'string' },
                      goal: { type: 'string' },
                      page_type: { type: 'string' },
                      page_title: { type: 'string' },
                      page_summary: { type: 'string' },
                      navigation_status: { type: 'string', enum: ['success', 'redirect', 'blocked', 'error'] },
                      content_extracted: { type: 'object', additionalProperties: true },
                      links_found: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            url: { type: 'string' },
                            text: { type: 'string' },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      forms_found: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            action: { type: 'string' },
                            fields: { type: 'array', items: { type: 'string' } },
                          },
                        },
                      },
                      render_required: { type: 'boolean' },
                      next_navigation_options: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing url or goal' },
          },
        },
      },
      '/extract-structured-data': {
        post: {
          operationId: 'extractStructuredData',
          summary: 'Extract structured data from a page according to a target schema',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'schema', 'page_content'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    schema: { type: 'object', additionalProperties: true },
                    page_content: { type: 'string' },
                    extraction_method: { type: 'string', enum: ['ai', 'css', 'xpath', 'regex'] },
                    pagination: { type: 'boolean' },
                    max_pages: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Structured extraction result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      url: { type: 'string' },
                      extracted_data: { type: 'object', additionalProperties: true },
                      extraction_confidence: { type: 'number', minimum: 0, maximum: 1 },
                      fields_extracted: { type: 'number' },
                      fields_missing: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field: { type: 'string' },
                            reason: { type: 'string' },
                          },
                        },
                      },
                      pagination_detected: { type: 'boolean' },
                      total_pages_estimate: { type: 'number' },
                      data_quality: {
                        type: 'object',
                        properties: {
                          completeness: { type: 'number', minimum: 0, maximum: 1 },
                          accuracy_signals: actions,
                          anomalies: actions,
                        },
                      },
                      extraction_method_used: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing url, schema, or page_content' },
          },
        },
      },
      '/live-search': {
        post: {
          operationId: 'liveSearch',
          summary: 'Generate optimized search queries and structure result data',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query', 'search_engine'],
                  properties: {
                    query: { type: 'string' },
                    search_engine: { type: 'string', enum: ['google', 'bing', 'duckduckgo', 'brave'] },
                    result_type: { type: 'string', enum: ['web', 'news', 'images', 'videos', 'shopping'] },
                    date_filter: { type: 'string', enum: ['any', 'day', 'week', 'month', 'year'] },
                    limit: { type: 'number' },
                    region: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Structured search results with insights',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      search_engine: { type: 'string' },
                      optimized_query: { type: 'string' },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            title: { type: 'string' },
                            url: { type: 'string' },
                            snippet: { type: 'string' },
                            domain: { type: 'string' },
                            date: { type: 'string', nullable: true },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                            result_type: { type: 'string' },
                          },
                        },
                      },
                      total_results_estimate: { type: 'number' },
                      featured_snippet: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          content: { type: 'string' },
                          source: { type: 'string' },
                        },
                      },
                      related_searches: actions,
                      knowledge_panel: { type: 'object', nullable: true, additionalProperties: true },
                      search_quality_score: { type: 'number', minimum: 0, maximum: 100 },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing query or search_engine' },
          },
        },
      },
      '/follow-links': {
        post: {
          operationId: 'followLinks',
          summary: 'Generate a crawl plan following links from a seed URL toward a goal',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['seed_url', 'goal', 'max_depth'],
                  properties: {
                    seed_url: { type: 'string', format: 'uri' },
                    goal: { type: 'string' },
                    max_depth: { type: 'number' },
                    link_filter: { type: 'string' },
                    domain_restrict: { type: 'boolean' },
                    max_pages: { type: 'number' },
                    exclude_patterns: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Prioritized crawl plan with link graph',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      seed_url: { type: 'string' },
                      goal: { type: 'string' },
                      crawl_plan: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            url: { type: 'string' },
                            depth: { type: 'number' },
                            priority: { type: 'number', minimum: 0, maximum: 1 },
                            reason: { type: 'string' },
                            extract_goal: { type: 'string' },
                          },
                        },
                      },
                      total_urls_to_visit: { type: 'number' },
                      estimated_duration_ms: { type: 'number' },
                      link_prioritization_strategy: { type: 'string' },
                      domain_scope: { type: 'string' },
                      exclusions_applied: actions,
                      expected_data_yield: { type: 'string' },
                      crawl_health_checks: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing seed_url, goal, or max_depth' },
          },
        },
      },
      '/adaptive-crawl': {
        post: {
          operationId: 'adaptiveCrawl',
          summary: 'Generate adaptive crawling strategy for dynamic content and anti-bot challenges',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['start_url', 'extraction_goal'],
                  properties: {
                    start_url: { type: 'string', format: 'uri' },
                    extraction_goal: { type: 'string' },
                    adapt_to: { type: 'array', items: { type: 'string', enum: ['infinite_scroll', 'js_rendering', 'captcha', 'rate_limits', 'pagination'] } },
                    max_pages: { type: 'number' },
                    output_format: { type: 'string', enum: ['json', 'csv', 'markdown'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Adaptive crawl strategy with step sequence',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      start_url: { type: 'string' },
                      extraction_goal: { type: 'string' },
                      challenges_detected: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            challenge: { type: 'string' },
                            severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                            mitigation: { type: 'string' },
                          },
                        },
                      },
                      crawl_strategy: {
                        type: 'object',
                        properties: {
                          rendering: { type: 'string' },
                          scroll_handling: { type: 'string' },
                          rate_limit_strategy: { type: 'string' },
                          session_required: { type: 'boolean' },
                        },
                      },
                      step_sequence: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            action: { type: 'string' },
                            purpose: { type: 'string' },
                            fallback: { type: 'string' },
                          },
                        },
                      },
                      estimated_pages: { type: 'number' },
                      estimated_duration_ms: { type: 'number' },
                      data_completeness_estimate: { type: 'number', minimum: 0, maximum: 1 },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing start_url or extraction_goal' },
          },
        },
      },
      '/anti-bot-handling': {
        post: {
          operationId: 'antiBotHandling',
          summary: 'Generate ethical anti-bot handling strategies for a challenge',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'challenge_type'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    challenge_type: { type: 'string', enum: ['captcha', 'rate_limit', 'ip_block', 'cloudflare', 'js_challenge', 'cookie_wall'] },
                    context: { type: 'string' },
                    previous_attempts: { type: 'number' },
                    headers_sent: { type: 'object', additionalProperties: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ethical anti-bot handling strategy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      url: { type: 'string' },
                      challenge_type: { type: 'string' },
                      challenge_severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                      recommended_strategy: { type: 'string' },
                      behavioral_recommendations: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            behavior: { type: 'string' },
                            reason: { type: 'string' },
                          },
                        },
                      },
                      timing_strategy: {
                        type: 'object',
                        properties: {
                          initial_delay_ms: { type: 'number' },
                          backoff_factor: { type: 'number' },
                          max_delay_ms: { type: 'number' },
                          jitter: { type: 'boolean' },
                        },
                      },
                      header_recommendations: { type: 'object', additionalProperties: { type: 'string' } },
                      robots_txt_compliant: { type: 'boolean' },
                      ethical_notes: actions,
                      escalation_needed: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing url or challenge_type' },
          },
        },
      },
      '/content-diff': {
        post: {
          operationId: 'contentDiff',
          summary: 'Detect and analyze content changes between two page versions',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'previous_content', 'current_content'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    previous_content: { type: 'string' },
                    current_content: { type: 'string' },
                    diff_type: { type: 'string', enum: ['semantic', 'structural', 'text', 'data'] },
                    monitor_elements: { type: 'array', items: { type: 'string' } },
                    alert_threshold: { type: 'number', minimum: 0, maximum: 1 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Content diff analysis with change classification',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      url: { type: 'string' },
                      change_detected: { type: 'boolean' },
                      change_magnitude: { type: 'string', enum: ['none', 'minor', 'moderate', 'major', 'complete'] },
                      change_score: { type: 'number', minimum: 0, maximum: 1 },
                      changes: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            element: { type: 'string' },
                            change_type: { type: 'string', enum: ['added', 'removed', 'modified', 'moved'] },
                            old_value: { type: 'string' },
                            new_value: { type: 'string' },
                            significance: { type: 'string', enum: ['high', 'medium', 'low'] },
                          },
                        },
                      },
                      structural_changes: { type: 'boolean' },
                      content_changes: { type: 'boolean' },
                      data_changes: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field: { type: 'string' },
                            old_value: { type: 'string' },
                            new_value: { type: 'string' },
                          },
                        },
                      },
                      alert_triggered: { type: 'boolean' },
                      monitoring_recommendation: { type: 'string' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing url, previous_content, or current_content' },
          },
        },
      },
      '/browser-session': {
        post: {
          operationId: 'browserSession',
          summary: 'Configure and warm up a browser session for autonomous web navigation',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['session_goal', 'browser'],
                  properties: {
                    session_goal: { type: 'string' },
                    browser: { type: 'string', enum: ['chromium', 'firefox', 'webkit'] },
                    viewport: {
                      type: 'object',
                      properties: {
                        width: { type: 'number' },
                        height: { type: 'number' },
                      },
                    },
                    user_agent: { type: 'string' },
                    cookies: { type: 'array', items: { type: 'object', additionalProperties: true } },
                    timeout_ms: { type: 'number' },
                    auth_required: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Browser session configuration and warmup plan',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      session_id: { type: 'string' },
                      browser: { type: 'string' },
                      session_goal: { type: 'string' },
                      viewport: {
                        type: 'object',
                        properties: { width: { type: 'number' }, height: { type: 'number' } },
                      },
                      user_agent: { type: 'string' },
                      auth_required: { type: 'boolean' },
                      auth_method: { type: 'string', nullable: true },
                      estimated_duration_ms: { type: 'number' },
                      warmup_steps: actions,
                      session_config: {
                        type: 'object',
                        properties: {
                          timeout_ms: { type: 'number' },
                          retry_on_failure: { type: 'boolean' },
                          screenshot_on_error: { type: 'boolean' },
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
            '400': { description: 'Missing session_goal or browser' },
          },
        },
      },
      '/screenshot': {
        post: {
          operationId: 'screenshot',
          summary: 'Plan and configure a screenshot capture for a URL',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'purpose'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    purpose: { type: 'string', enum: ['analysis', 'diff', 'archival', 'evidence', 'debug'] },
                    selector: { type: 'string' },
                    full_page: { type: 'boolean' },
                    format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                    viewport: {
                      type: 'object',
                      properties: { width: { type: 'number' }, height: { type: 'number' } },
                    },
                    wait_for: { type: 'string' },
                    delay_ms: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Screenshot capture plan with analysis hints',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      url: { type: 'string', format: 'uri' },
                      purpose: { type: 'string' },
                      capture_instructions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            action: { type: 'string' },
                            selector: { type: 'string', nullable: true },
                          },
                        },
                      },
                      recommended_viewport: {
                        type: 'object',
                        properties: { width: { type: 'number' }, height: { type: 'number' } },
                      },
                      format: { type: 'string' },
                      full_page: { type: 'boolean' },
                      estimated_file_size_kb: { type: 'number' },
                      analysis_hints: actions,
                      diff_baseline_recommended: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing url or purpose' },
          },
        },
      },
      '/form-detect': {
        post: {
          operationId: 'formDetect',
          summary: 'Detect and analyze all forms on a page including fields, validation, and CAPTCHA',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'page_content'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    page_content: { type: 'string' },
                    form_purpose: { type: 'string' },
                    detect_hidden: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Detected forms with field analysis',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      url: { type: 'string', format: 'uri' },
                      forms_detected: { type: 'number' },
                      forms: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            form_id: { type: 'string' },
                            action: { type: 'string' },
                            method: { type: 'string', enum: ['GET', 'POST'] },
                            purpose: { type: 'string' },
                            fields: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  name: { type: 'string' },
                                  type: { type: 'string' },
                                  label: { type: 'string' },
                                  required: { type: 'boolean' },
                                  placeholder: { type: 'string', nullable: true },
                                  options: { type: 'array', items: { type: 'string' } },
                                },
                              },
                            },
                            submit_button: { type: 'string' },
                            validation_present: { type: 'boolean' },
                          },
                        },
                      },
                      auth_forms: { type: 'number' },
                      search_forms: { type: 'number' },
                      captcha_detected: { type: 'boolean' },
                      multi_step: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing url or page_content' },
          },
        },
      },
      '/submit-form-gated': {
        post: {
          operationId: 'submitFormGated',
          summary: 'Gate a form submission with risk scoring, validation, and step planning',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'form_id', 'field_values', 'submission_purpose'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    form_id: { type: 'string' },
                    field_values: { type: 'object', additionalProperties: { type: 'string' } },
                    submission_purpose: { type: 'string' },
                    dry_run: { type: 'boolean' },
                    risk_threshold: { type: 'number', minimum: 0, maximum: 1 },
                    validate_before_submit: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Form submission gate decision with validation and step plan',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      url: { type: 'string', format: 'uri' },
                      form_id: { type: 'string' },
                      submission_approved: { type: 'boolean' },
                      risk_score: { type: 'number', minimum: 0, maximum: 1 },
                      blocking_flags: actions,
                      validation_result: {
                        type: 'object',
                        properties: {
                          valid: { type: 'boolean' },
                          errors: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                field: { type: 'string' },
                                error: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                      submission_steps: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            action: { type: 'string' },
                            field: { type: 'string', nullable: true },
                            value: { type: 'string', nullable: true },
                          },
                        },
                      },
                      expected_response: { type: 'string' },
                      rollback_possible: { type: 'boolean' },
                      dry_run: { type: 'boolean' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing url, form_id, field_values, or submission_purpose' },
          },
        },
      },
      '/download-assets': {
        post: {
          operationId: 'downloadAssets',
          summary: 'Plan and prioritize asset downloads from a URL with safety gating',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'asset_types'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    asset_types: {
                      type: 'array',
                      items: { type: 'string', enum: ['images', 'documents', 'scripts', 'stylesheets', 'videos', 'data'] },
                    },
                    max_size_mb: { type: 'number' },
                    filename_pattern: { type: 'string' },
                    deduplicate: { type: 'boolean' },
                    follow_pagination: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Asset download plan with blocked assets and size estimates',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      url: { type: 'string', format: 'uri' },
                      assets_found: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            url: { type: 'string', format: 'uri' },
                            type: { type: 'string' },
                            filename: { type: 'string' },
                            size_kb: { type: 'number' },
                            mime_type: { type: 'string' },
                            download_approved: { type: 'boolean' },
                            reason: { type: 'string' },
                          },
                        },
                      },
                      total_size_kb: { type: 'number' },
                      download_plan: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            priority: { type: 'number' },
                            url: { type: 'string', format: 'uri' },
                            filename: { type: 'string' },
                          },
                        },
                      },
                      blocked_assets: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            url: { type: 'string', format: 'uri' },
                            reason: { type: 'string' },
                          },
                        },
                      },
                      estimated_duration_ms: { type: 'number' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing url or asset_types' },
          },
        },
      },
      '/navigate-and-extract': {
        post: {
          operationId: 'navigateAndExtract',
          summary: 'Flagship one-call endpoint: navigate, detect forms and assets, follow links, and extract structured data',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'extraction_goal'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    extraction_goal: { type: 'string' },
                    schema: { type: 'object', additionalProperties: true },
                    follow_links: { type: 'boolean' },
                    max_pages: { type: 'number' },
                    handle_auth: { type: 'boolean' },
                    output_format: { type: 'string', enum: ['json', 'csv', 'markdown'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Full navigation and extraction result with structured data',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      run_id: { type: 'string' },
                      url: { type: 'string', format: 'uri' },
                      extraction_goal: { type: 'string' },
                      navigation_status: { type: 'string', enum: ['success', 'partial', 'blocked', 'error'] },
                      pages_visited: { type: 'number' },
                      structured_data: { type: 'object', additionalProperties: true },
                      raw_findings: actions,
                      forms_detected: { type: 'number' },
                      assets_found: { type: 'number' },
                      links_followed: actions,
                      challenges_encountered: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: { type: 'string' },
                            mitigation: { type: 'string' },
                            resolved: { type: 'boolean' },
                          },
                        },
                      },
                      data_completeness: { type: 'number', minimum: 0, maximum: 1 },
                      total_duration_ms: { type: 'number' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing url or extraction_goal' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'webNavigationExecutionGate',
          summary: 'Gate web navigation actions for safety, compliance, and ethical crawling',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['navigation_action', 'url'],
                  properties: {
                    navigation_action: { type: 'string' },
                    url: { type: 'string', format: 'uri' },
                    risk_threshold: { type: 'number', minimum: 0, maximum: 1 },
                    check_robots_txt: { type: 'boolean' },
                    rate_limit_check: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Navigation gate decision with compliance details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      execute: { type: 'boolean' },
                      confidence: { type: 'number', minimum: 0, maximum: 1 },
                      robots_txt_compliant: { type: 'boolean' },
                      rate_limit_safe: { type: 'boolean' },
                      legal_risk: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
                      blocking_flags: actions,
                      warnings: actions,
                      recommended_action: { type: 'string', enum: ['proceed', 'slow_down', 'check_robots', 'deny'] },
                      crawl_delay_recommended_ms: { type: 'number' },
                      chain_to: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing navigation_action or url' },
          },
        },
      },
    },
  });
});

export default router;
