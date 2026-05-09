import { Router, Request, Response } from 'express';
const router = Router();

const privacy = { type: 'object', properties: { data_stored: { type: 'boolean' }, retention: { type: 'string' } } };
const confidence = { type: 'object', additionalProperties: { type: 'number' } };
const actions = { type: 'array', items: { type: 'string' } };

router.get('/', (_req: Request, res: Response) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Enterprise Retrieval API',
      version: '1.0.0',
      description: 'AI-powered enterprise data retrieval across Slack, Gmail, Drive, Notion, HubSpot, Salesforce, GitHub, Linear, Jira and more — universal search, document retrieval, thread analysis, CRM queries, calendar intelligence and governance gating',
      'x-agent-callable': true,
      'x-mcp-compatible': true,
      'x-pricing': {
        free_tier: { requests_per_day: 100, requests_per_month: 3000 },
        pay_per_call: {
          'search': 0.007,
          'retrieve-document': 0.006,
          'retrieve-thread': 0.007,
          'query-email': 0.005,
          'query-crm': 0.008,
          'query-calendar': 0.005,
          'query-notion': 0.006,
          'query-slack': 0.006,
          'query-drive': 0.005,
          'query-github': 0.006,
          'query-jira': 0.005,
          'query-linear': 0.005,
          'query-salesforce': 0.007,
          'query-hubspot': 0.007,
          'enterprise-briefing': 0.018,
          'execution-gate': 0.002,
        },
      },
    },
    servers: [{ url: 'https://orbis-apis.onrender.com/enterprise-retrieval' }],
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
      '/search': {
        post: {
          operationId: 'enterpriseSearch',
          summary: 'Universal enterprise search across Slack, Gmail, Drive, Notion, HubSpot, Salesforce, GitHub, Linear, Jira and more',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query', 'sources'],
                  properties: {
                    query: { type: 'string' },
                    sources: { type: 'array', items: { type: 'string', enum: ['slack', 'gmail', 'drive', 'notion', 'hubspot', 'salesforce', 'github', 'linear', 'jira', 'all'] } },
                    filters: { type: 'object', properties: { date_range: { type: 'object' }, author: { type: 'string' }, type: { type: 'string' } } },
                    limit: { type: 'number' },
                    semantic: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Enterprise search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      sources_searched: actions,
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            source: { type: 'string' },
                            title: { type: 'string' },
                            snippet: { type: 'string' },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                            url: { type: 'string' },
                            date: { type: 'string' },
                            author: { type: 'string' },
                            type: { type: 'string' },
                          },
                        },
                      },
                      total_results: { type: 'number' },
                      search_strategy: { type: 'string', enum: ['keyword', 'semantic', 'hybrid'] },
                      source_query_map: { type: 'object', additionalProperties: { type: 'string' } },
                      filters_applied: { type: 'object' },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing query or sources' },
            '500': { description: 'Search failed' },
          },
        },
      },
      '/retrieve-document': {
        post: {
          operationId: 'retrieveDocument',
          summary: 'Retrieve and extract a document from Drive, Notion, Confluence, SharePoint or Dropbox with metadata and section extraction',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['document_id', 'source'],
                  properties: {
                    document_id: { type: 'string' },
                    source: { type: 'string', enum: ['drive', 'notion', 'confluence', 'sharepoint', 'dropbox'] },
                    include_metadata: { type: 'boolean' },
                    format: { type: 'string', enum: ['raw', 'markdown', 'structured'] },
                    sections: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Document retrieval result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      document_id: { type: 'string' },
                      source: { type: 'string' },
                      title: { type: 'string' },
                      content: { type: 'string' },
                      format: { type: 'string' },
                      metadata: {
                        type: 'object',
                        properties: {
                          created_at: { type: 'string' },
                          modified_at: { type: 'string' },
                          author: { type: 'string' },
                          collaborators: actions,
                          version: { type: 'string' },
                          permissions: { type: 'string' },
                        },
                      },
                      sections_extracted: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            heading: { type: 'string' },
                            content: { type: 'string' },
                          },
                        },
                      },
                      word_count: { type: 'number' },
                      summary: { type: 'string' },
                      key_entities: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing document_id or source' },
            '500': { description: 'Document retrieval failed' },
          },
        },
      },
      '/retrieve-thread': {
        post: {
          operationId: 'retrieveThread',
          summary: 'Retrieve and analyze a Slack, Gmail, Teams or Discord thread with participants, decisions and action items',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['thread_id', 'source'],
                  properties: {
                    thread_id: { type: 'string' },
                    source: { type: 'string', enum: ['slack', 'gmail', 'teams', 'discord'] },
                    include_reactions: { type: 'boolean' },
                    summarize: { type: 'boolean' },
                    participant_filter: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Thread retrieval result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      thread_id: { type: 'string' },
                      source: { type: 'string' },
                      subject: { type: 'string', nullable: true },
                      participants: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            role: { type: 'string' },
                          },
                        },
                      },
                      message_count: { type: 'number' },
                      date_range: {
                        type: 'object',
                        properties: {
                          start: { type: 'string' },
                          end: { type: 'string' },
                        },
                      },
                      messages: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            author: { type: 'string' },
                            timestamp: { type: 'string' },
                            content: { type: 'string' },
                            is_key_message: { type: 'boolean' },
                          },
                        },
                      },
                      key_decisions: actions,
                      action_items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            item: { type: 'string' },
                            owner: { type: 'string', nullable: true },
                          },
                        },
                      },
                      summary: { type: 'string' },
                      sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral', 'mixed'] },
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing thread_id or source' },
            '500': { description: 'Thread retrieval failed' },
          },
        },
      },
      '/query-email': {
        post: {
          operationId: 'queryEmail',
          summary: 'Query Gmail with optimal search syntax, rank results, and extract structured email data with attachment summary',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string' },
                    folder: { type: 'string' },
                    sender: { type: 'string' },
                    date_range: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } },
                    has_attachments: { type: 'boolean' },
                    limit: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Email query result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      search_syntax: { type: 'string' },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            subject: { type: 'string' },
                            sender: { type: 'string' },
                            date: { type: 'string' },
                            snippet: { type: 'string' },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                            has_attachments: { type: 'boolean' },
                            labels: actions,
                          },
                        },
                      },
                      total_matches: { type: 'number' },
                      suggested_refinements: actions,
                      thread_grouping: { type: 'number' },
                      attachment_summary: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            filename: { type: 'string' },
                            type: { type: 'string' },
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
            '400': { description: 'Missing query' },
            '500': { description: 'Email query failed' },
          },
        },
      },
      '/query-crm': {
        post: {
          operationId: 'queryCRM',
          summary: 'Query HubSpot, Salesforce or Pipedrive CRM with object relationships, data quality checks and CRM-specific syntax',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query', 'crm'],
                  properties: {
                    query: { type: 'string' },
                    crm: { type: 'string', enum: ['hubspot', 'salesforce', 'pipedrive'] },
                    object_type: { type: 'string', enum: ['contact', 'deal', 'company', 'activity'] },
                    filters: { type: 'object' },
                    fields: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'CRM query result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      crm: { type: 'string' },
                      object_type: { type: 'string' },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            type: { type: 'string' },
                            fields: { type: 'object' },
                            related_objects: actions,
                            last_modified: { type: 'string' },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      total_records: { type: 'number' },
                      query_syntax: { type: 'string' },
                      relationships_found: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            from: { type: 'string' },
                            to: { type: 'string' },
                            type: { type: 'string' },
                          },
                        },
                      },
                      data_quality_issues: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing query or crm' },
            '500': { description: 'CRM query failed' },
          },
        },
      },
      '/query-calendar': {
        post: {
          operationId: 'queryCalendar',
          summary: 'Query calendar events and surface scheduling intelligence — patterns, conflicts, availability and upcoming deadlines',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string' },
                    calendar_id: { type: 'string' },
                    date_range: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } },
                    attendee: { type: 'string' },
                    include_recurring: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Calendar query result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      events: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            start: { type: 'string' },
                            end: { type: 'string' },
                            attendees: actions,
                            location: { type: 'string', nullable: true },
                            description_snippet: { type: 'string' },
                            is_recurring: { type: 'boolean' },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      total_events: { type: 'number' },
                      scheduling_insights: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            insight: { type: 'string' },
                            type: { type: 'string', enum: ['availability', 'pattern', 'conflict'] },
                          },
                        },
                      },
                      busiest_periods: actions,
                      upcoming_deadlines: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing query' },
            '500': { description: 'Calendar query failed' },
          },
        },
      },
      '/query-notion': {
        post: {
          operationId: 'queryNotion',
          summary: 'Query Notion pages and databases, extract structured properties, and rank results by relevance',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string' },
                    workspace_id: { type: 'string' },
                    page_type: { type: 'string', enum: ['page', 'database', 'all'] },
                    filters: { type: 'object' },
                    limit: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Notion query result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            type: { type: 'string', enum: ['page', 'database'] },
                            url: { type: 'string' },
                            properties: { type: 'object' },
                            content_snippet: { type: 'string' },
                            last_edited: { type: 'string' },
                            created_by: { type: 'string' },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      total_results: { type: 'number' },
                      databases_searched: actions,
                      property_types_found: actions,
                      related_pages: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing query' },
            '500': { description: 'Notion query failed' },
          },
        },
      },
      '/query-slack': {
        post: {
          operationId: 'querySlack',
          summary: 'Query Slack messages and channels, identify top contributors, key links and action items',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string' },
                    channels: { type: 'array', items: { type: 'string' } },
                    date_range: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } },
                    from_user: { type: 'string' },
                    limit: { type: 'number' },
                    include_threads: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Slack query result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      messages: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            channel: { type: 'string' },
                            author: { type: 'string' },
                            timestamp: { type: 'string' },
                            text: { type: 'string' },
                            thread_ts: { type: 'string', nullable: true },
                            reactions: actions,
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                            permalink: { type: 'string' },
                          },
                        },
                      },
                      total_messages: { type: 'number' },
                      channels_searched: actions,
                      top_contributors: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            user: { type: 'string' },
                            message_count: { type: 'number' },
                          },
                        },
                      },
                      key_links: actions,
                      action_items_found: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing query' },
            '500': { description: 'Slack query failed' },
          },
        },
      },
      '/query-drive': {
        post: {
          operationId: 'queryDrive',
          summary: 'Query Google Drive for files and folders, extract metadata, and surface recent activity and storage insights',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string' },
                    folder_id: { type: 'string' },
                    file_type: { type: 'string', enum: ['doc', 'sheet', 'slide', 'pdf', 'all'] },
                    owner: { type: 'string' },
                    date_range: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Drive query result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      files: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            type: { type: 'string' },
                            owner: { type: 'string' },
                            modified_at: { type: 'string' },
                            size_bytes: { type: 'number' },
                            shared_with: actions,
                            folder_path: { type: 'string' },
                            snippet: { type: 'string' },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                            url: { type: 'string' },
                          },
                        },
                      },
                      total_files: { type: 'number' },
                      storage_used_mb: { type: 'number' },
                      shared_files_count: { type: 'number' },
                      recent_activity: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            file: { type: 'string' },
                            action: { type: 'string' },
                            by: { type: 'string' },
                            when: { type: 'string' },
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
            '400': { description: 'Missing query' },
            '500': { description: 'Drive query failed' },
          },
        },
      },
      '/query-github': {
        post: {
          operationId: 'queryGitHub',
          summary: 'Search GitHub repos for issues, PRs, commits, and code with optimal search syntax and permission scope checks',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string' },
                    repos: { type: 'array', items: { type: 'string' } },
                    filters: { type: 'string', enum: ['issues', 'prs', 'commits', 'code', 'all'] },
                    date_range: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } },
                    limit: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'GitHub search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      repos_searched: actions,
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: { type: 'string', enum: ['issue', 'pr', 'commit', 'code'] },
                            title: { type: 'string' },
                            url: { type: 'string', format: 'uri' },
                            author: { type: 'string' },
                            date: { type: 'string' },
                            status: { type: 'string' },
                            snippet: { type: 'string' },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      total_results: { type: 'number' },
                      open_issues: { type: 'number' },
                      open_prs: { type: 'number' },
                      query_syntax: { type: 'string' },
                      permission_checked: { type: 'boolean' },
                      source_permission_scope: { type: 'string', enum: ['user', 'org', 'public'] },
                      citations: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing query' },
            '500': { description: 'GitHub query failed' },
          },
        },
      },
      '/query-jira': {
        post: {
          operationId: 'queryJira',
          summary: 'Search Jira issues across projects with JQL synthesis, status grouping and permission scope checks',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string' },
                    projects: { type: 'array', items: { type: 'string' } },
                    issue_types: { type: 'array', items: { type: 'string' } },
                    statuses: { type: 'array', items: { type: 'string' } },
                    assignee: { type: 'string' },
                    date_range: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } },
                    limit: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Jira search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      projects_searched: actions,
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            key: { type: 'string' },
                            summary: { type: 'string' },
                            status: { type: 'string' },
                            assignee: { type: 'string' },
                            priority: { type: 'string' },
                            type: { type: 'string' },
                            updated: { type: 'string' },
                            url: { type: 'string', format: 'uri' },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      total_results: { type: 'number' },
                      by_status: { type: 'object', additionalProperties: { type: 'number' } },
                      query_syntax: { type: 'string' },
                      permission_checked: { type: 'boolean' },
                      source_permission_scope: { type: 'string', enum: ['user', 'project', 'workspace'] },
                      citations: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing query' },
            '500': { description: 'Jira query failed' },
          },
        },
      },
      '/query-linear': {
        post: {
          operationId: 'queryLinear',
          summary: 'Search Linear issues across teams with state grouping, cycle coverage and permission scope checks',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string' },
                    teams: { type: 'array', items: { type: 'string' } },
                    states: { type: 'array', items: { type: 'string' } },
                    assignee: { type: 'string' },
                    priority: { type: 'string' },
                    date_range: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } },
                    limit: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Linear search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      teams_searched: actions,
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            state: { type: 'string' },
                            assignee: { type: 'string' },
                            priority: { type: 'string' },
                            cycle: { type: 'string', nullable: true },
                            url: { type: 'string', format: 'uri' },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      total_results: { type: 'number' },
                      by_state: { type: 'object', additionalProperties: { type: 'number' } },
                      cycles_covered: actions,
                      permission_checked: { type: 'boolean' },
                      source_permission_scope: { type: 'string', enum: ['user', 'team', 'workspace'] },
                      citations: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing query' },
            '500': { description: 'Linear query failed' },
          },
        },
      },
      '/query-salesforce': {
        post: {
          operationId: 'querySalesforce',
          summary: 'Search Salesforce CRM objects with SOQL generation, relationship mapping, redactions and permission scope checks',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string' },
                    objects: { type: 'array', items: { type: 'string', enum: ['Lead', 'Contact', 'Account', 'Opportunity', 'Case'] } },
                    fields: { type: 'array', items: { type: 'string' } },
                    filters: { type: 'object' },
                    limit: { type: 'number' },
                    include_related: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Salesforce search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      objects_searched: actions,
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            object: { type: 'string' },
                            id: { type: 'string' },
                            name: { type: 'string' },
                            fields: { type: 'object' },
                            url: { type: 'string', format: 'uri' },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      total_results: { type: 'number' },
                      soql_generated: { type: 'string' },
                      relationships_found: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            from: { type: 'string' },
                            to: { type: 'string' },
                            type: { type: 'string' },
                          },
                        },
                      },
                      permission_checked: { type: 'boolean' },
                      source_permission_scope: { type: 'string', enum: ['user', 'profile', 'org'] },
                      redactions_applied: actions,
                      citations: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing query' },
            '500': { description: 'Salesforce query failed' },
          },
        },
      },
      '/query-hubspot': {
        post: {
          operationId: 'queryHubSpot',
          summary: 'Search HubSpot CRM objects with association mapping, pipeline stage detection, redactions and permission scope checks',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string' },
                    object_types: { type: 'array', items: { type: 'string', enum: ['contacts', 'companies', 'deals', 'tickets', 'emails'] } },
                    properties: { type: 'array', items: { type: 'string' } },
                    filters: { type: 'object' },
                    associations: { type: 'array', items: { type: 'string' } },
                    limit: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'HubSpot search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      object_types_searched: actions,
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            object_type: { type: 'string' },
                            id: { type: 'string' },
                            name: { type: 'string' },
                            properties: { type: 'object' },
                            associations: { type: 'object' },
                            url: { type: 'string', format: 'uri' },
                            relevance_score: { type: 'number', minimum: 0, maximum: 1 },
                          },
                        },
                      },
                      total_results: { type: 'number' },
                      pipeline_stages_found: actions,
                      associations_mapped: { type: 'number' },
                      permission_checked: { type: 'boolean' },
                      source_permission_scope: { type: 'string', enum: ['user', 'team', 'portal'] },
                      redactions_applied: actions,
                      citations: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing query' },
            '500': { description: 'HubSpot query failed' },
          },
        },
      },
      '/enterprise-briefing': {
        post: {
          operationId: 'enterpriseBriefing',
          summary: 'Generate a comprehensive enterprise briefing on a topic by synthesizing data across multiple sources — the flagship one-call cross-source intelligence endpoint',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['topic', 'sources'],
                  properties: {
                    topic: { type: 'string' },
                    sources: { type: 'array', items: { type: 'string', enum: ['slack', 'gmail', 'drive', 'notion', 'hubspot', 'salesforce', 'github', 'linear', 'jira', 'all'] } },
                    depth: { type: 'string', enum: ['quick', 'standard', 'deep'] },
                    date_range: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } },
                    output_format: { type: 'string', enum: ['structured', 'markdown', 'raw'] },
                    include_citations: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Enterprise briefing result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      briefing_id: { type: 'string' },
                      topic: { type: 'string' },
                      sources_searched: actions,
                      executive_summary: { type: 'string' },
                      key_findings: actions,
                      decisions_found: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            decision: { type: 'string' },
                            date: { type: 'string' },
                            source: { type: 'string' },
                            owner: { type: 'string' },
                          },
                        },
                      },
                      action_items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            task: { type: 'string' },
                            owner: { type: 'string' },
                            due: { type: 'string', nullable: true },
                            source: { type: 'string' },
                          },
                        },
                      },
                      open_questions: actions,
                      people_involved: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            role: { type: 'string' },
                            mentions: { type: 'number' },
                          },
                        },
                      },
                      timeline: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            date: { type: 'string' },
                            event: { type: 'string' },
                            source: { type: 'string' },
                          },
                        },
                      },
                      citations: actions,
                      permission_checked: { type: 'boolean' },
                      redactions_applied: actions,
                      confidence_per_section: confidence,
                      recommended_actions_priority_order: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing topic or sources' },
            '500': { description: 'Briefing generation failed' },
          },
        },
      },
      '/execution-gate': {
        post: {
          operationId: 'retrievalExecutionGate',
          summary: 'Gate enterprise data retrieval based on data sensitivity, requester authority and compliance requirements',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['retrieval_action', 'data_sensitivity'],
                  properties: {
                    retrieval_action: { type: 'string' },
                    data_sensitivity: { type: 'string', enum: ['public', 'internal', 'confidential', 'restricted'] },
                    requester_role: { type: 'string' },
                    purpose: { type: 'string' },
                    compliance_framework: { type: 'string' },
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
                      sensitivity_level: { type: 'string' },
                      access_granted: { type: 'boolean' },
                      blocking_reason: { type: 'string', nullable: true },
                      compliance_flags: actions,
                      data_handling_requirements: actions,
                      audit_required: { type: 'boolean' },
                      recommended_action: { type: 'string', enum: ['proceed', 'request_approval', 'anonymize_first', 'deny'] },
                      chain_to: actions,
                      privacy,
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing retrieval_action or data_sensitivity' },
            '500': { description: 'Gate check failed' },
          },
        },
      },
    },
  });
});

export default router;
